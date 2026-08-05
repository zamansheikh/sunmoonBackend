import { IReferralRepository } from "../../repository/referral/referral_repository";
import { IReferralWalletRepository } from "../../repository/referral/referral_wallet_repository";
import { IReferralWithdrawalRepository } from "../../repository/referral/referral_withdrawal_repository";
import { IReferralConfigRepository } from "../../repository/referral/referral_config_repository";
import { IUserRepository } from "../../repository/users/user_repository";
import {
  IReferralConfig,
  IReferralConfigDocument,
} from "../../models/referral/referralConfigModel";
import { IReferralWithdrawalDocument } from "../../models/referral/referralWithdrawalModel";
import AppError from "../../core/errors/app_errors";
import { StatusCodes } from "http-status-codes";
import { ReferralCache } from "../../core/cache/referral_cache";
import IUserStatsRepository from "../../repository/users/userstats_repository_interface";
import mongoose from "mongoose";
import { StatusTypes, WithdrawAccountTypes } from "../../core/Utils/enums";

export interface IReferralService {
  createOrUpdateConfig(
    config: IReferralConfig,
  ): Promise<IReferralConfigDocument>;
  getConfig(): Promise<IReferralConfig | null>;
  updateConfig(
    id: string,
    config: Partial<IReferralConfig>,
  ): Promise<IReferralConfigDocument | null>;
  deleteConfig(id: string): Promise<IReferralConfigDocument | null>;

  handleRegistrationReferral(
    refereeId: string,
    inviteCode: string,
  ): Promise<void>;
  handleRechargeReferral(
    refereeId: string,
    rechargeAmount: number,
  ): Promise<void>;
  handleGiftCommission(refereeId: string, giftCoinValue: number): Promise<void>;
  requestWithdrawal(userId: string): Promise<IReferralWithdrawalDocument>;
  getReferralDashboard(userId: string): Promise<any>;
  deleteReferralData(userId: string): Promise<void>;
}

export class ReferralService implements IReferralService {
  private cache = ReferralCache.getInstance();

  constructor(
    private referralRepository: IReferralRepository,
    private walletRepository: IReferralWalletRepository,
    private withdrawalRepository: IReferralWithdrawalRepository,
    private configRepository: IReferralConfigRepository,
    private userRepository: IUserRepository,
    private userStatsRepository: IUserStatsRepository,
  ) {}

  // --- Admin Configuration ---
  async createOrUpdateConfig(
    config: IReferralConfig,
  ): Promise<IReferralConfigDocument> {
    const newConfig = await this.configRepository.createOrUpdateConfig(config);
    await this.cache.setConfig(newConfig);
    return newConfig;
  }

  async getConfig(): Promise<IReferralConfig | null> {
    // 1. Check Redis first
    const cached = await this.cache.getConfig();
    if (cached) return cached;

    // 2. Fallback to DB
    const config = await this.configRepository.getConfig();
    if (config) {
      await this.cache.setConfig(config);
    }
    return config;
  }

  async updateConfig(
    id: string,
    config: Partial<IReferralConfig>,
  ): Promise<IReferralConfigDocument | null> {
    const updated = await this.configRepository.updateConfig(id, config);
    if (updated) {
      await this.cache.setConfig(updated);
    }
    return updated;
  }

  async deleteConfig(id: string): Promise<IReferralConfigDocument | null> {
    const deleted = await this.configRepository.deleteConfig(id);
    await this.cache.invalidateConfig();
    return deleted;
  }

  // --- Core Referral Engine (The Facade Methods) ---

  /**
   * Links a new user to their referrer during registration.
   */
  async handleRegistrationReferral(
    refereeId: string,
    inviteCode: string,
  ): Promise<void> {
    const config = await this.getConfig();
    if (!config) {
      console.warn("[ReferralService] No config found — referral engine disabled.");
      return;
    }

    // 1. Check if referral already exists for this referee
    const existingReferral = await this.referralRepository.getReferralByReferee(refereeId);
    if (existingReferral) {
      console.warn(`[ReferralService] Referral already exists for referee ${refereeId}, skipping.`);
      return;
    }

    // 2. Find the referrer
    const referrer = await this.userRepository.findUserByShortId(
      Number(inviteCode),
    );
    if (!referrer)
      throw new AppError(
        StatusCodes.NOT_FOUND,
        "Referrer not found with this code.",
      );

    const referrerId = (referrer as any)._id.toString();

    // 3. Prevent self-referral
    if (referrerId === refereeId) return;

    // 4. Create the referral link in DB
    await this.referralRepository.createReferral({
      referrer: referrerId as any,
      referee: refereeId as any,
      inviteCode: inviteCode,
      isRegistrationRewardGiven: true,
    });

    // 5. Cache the mapping for future high-speed lookups
    await this.cache.setReferrerId(refereeId, referrerId);

    // 6. Grant reward
    await this.walletRepository.updateWalletBalance(
      referrerId,
      config.inviteReward,
      true,
    );
  }

  /**
   * Tracks user recharges and triggers milestone rewards.
   */
  async handleRechargeReferral(
    refereeId: string,
    rechargeAmount: number,
  ): Promise<void> {
    const config = await this.getConfig();
    if (!config) {
      console.warn("[ReferralService] No config found — referral engine disabled.");
      return;
    }

    const referral = await this.referralRepository.updateRechargeAtomic(
      refereeId,
      rechargeAmount,
      config.rechargeThreshold,
    );
    if (!referral) return;

    const totalRecharged = referral.totalRechargedAmount;
    const crossedThreshold = totalRecharged >= config.rechargeThreshold;

    if (crossedThreshold && !referral.isRechargeRewardGiven) {
      await this.walletRepository.updateWalletBalance(
        referral.referrer.toString(),
        config.rechargeReward,
        true,
      );
    }
  }

  /**
   * Calculates and grants percentage-based commission from friend's gifts.
   */
  async handleGiftCommission(
    refereeId: string,
    giftCoinValue: number,
  ): Promise<void> {
    const config = await this.getConfig();
    if (!config || config.giftCommissionPercentage <= 0) {
      console.warn("[ReferralService] No config found — referral engine disabled.");
      return;
    }

    // 1. Check cache for referrerId
    let referrerId = await this.cache.getReferrerId(refereeId);

    // 2. Fallback to DB if not in cache
    if (!referrerId) {
      const referral =
        await this.referralRepository.getReferralByReferee(refereeId);
      if (!referral) return;
      referrerId = referral.referrer.toString();
      await this.cache.setReferrerId(refereeId, referrerId);
    }

    const commission = Math.floor(
      (giftCoinValue * config.giftCommissionPercentage) / 100,
    );
    if (commission <= 0) return;

    // 3. Use transaction to ensure atomicity of wallet update and referral stats
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      await Promise.all([
        this.referralRepository.updateReferral(refereeId, {
          $inc: {
            totalCommissionEarned: commission,
            totalGiftValueSent: giftCoinValue,
          },
        }),
        this.walletRepository.updateWalletBalance(referrerId, commission, true, session),
      ]);

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      console.error("[ReferralService] Gift commission transaction failed:", error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Logic for users to request a withdrawal from their referral earnings.
   * This is a "Full Sweep" operation: the entire referral balance is transferred
   * to the main userStats (coins) and the referral balance becomes zero.
   */
  async requestWithdrawal(
    userId: string,
  ): Promise<IReferralWithdrawalDocument> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Get current balance INSIDE transaction to prevent race condition
      const wallet = await this.walletRepository.getWallet(userId, session);

      if (!wallet || wallet.currentBalance <= 0) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          "No balance available for withdrawal.",
        );
      }

      const withdrawAmount = wallet.currentBalance;

      // 2. Deduct entire balance from Referral Wallet
      await this.walletRepository.updateWalletBalance(
        userId,
        -withdrawAmount,
        false, // Not an earning, it's a withdrawal
        session,
      );

      // 3. Add to main UserStats coins
      await this.userStatsRepository.updateCoins(
        userId,
        withdrawAmount,
        session,
      );

      // 4. Create a completed withdrawal record
      const withdrawal = await this.withdrawalRepository.createWithdrawal(
        {
          user: userId as any,
          amount: withdrawAmount,
          accountType: WithdrawAccountTypes.Internal,
          accountNumber: "UserStats",
          status: StatusTypes.accepted,
          adminRemark: "Instant internal transfer to main coins",
        },
        session,
      );

      await session.commitTransaction();
      return withdrawal;
    } catch (error) {
      await session.abortTransaction();
      if (error instanceof AppError) throw error;
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Withdrawal sweep failed.",
      );
    } finally {
      session.endSession();
    }
  }

  async getReferralDashboard(userId: string, limit = 20, offset = 0): Promise<any> {
    // 1. Fetch all required data in parallel
    const [config, wallet, referrals, user, totalCount] = await Promise.all([
      this.getConfig(),
      this.walletRepository.getWallet(userId),
      this.referralRepository.getReferralsByReferrerPaginated(userId, limit, offset),
      this.userRepository.findUserById(userId),
      this.referralRepository.getReferralsCountByReferrer(userId),
    ]);

    if (!user) {
      throw new AppError(StatusCodes.NOT_FOUND, "User not found.");
    }

    // 2. Map and format the referee list
    const referralList = referrals.map((item: any) => ({
      nickName: item.referee?.name || "Unknown",
      id: item.referee?.userId || 0,
      rechargedAmount: item.totalRechargedAmount || 0,
      totalSentGift: item.totalGiftValueSent || 0,
      commissionEarned: item.totalCommissionEarned || 0,
    }));

    // 3. Construct the dashboard summary
    return {
      rules: config
        ? {
            inviteReward: config.inviteReward,
            rechargeThreshold: config.rechargeThreshold,
            rechargeReward: config.rechargeReward,
            giftCommissionPercentage: config.giftCommissionPercentage,
          }
        : null,
      summary: {
        inviteCode: user.userId.toString(),
        currentBalance: wallet?.currentBalance || 0,
        totalEarned: wallet?.totalEarned || 0,
        totalInvitations: totalCount,
      },
      referralList,
      pagination: {
        limit,
        offset,
        total: totalCount,
      },
    };
  }

  async deleteReferralData(userId: string): Promise<void> {
    // Delete referral links where user is referee
    await this.referralRepository.deleteByUser(userId);
    // Delete referral links where user is referrer
    await this.referralRepository.deleteByReferrer(userId);
    // Delete wallet
    await this.walletRepository.deleteWallet(userId);
    // Delete withdrawal history
    await this.withdrawalRepository.deleteWithdrawalsByUser(userId);
    // Invalidate cache
    await this.cache.invalidateMapping(userId);
  }
}
