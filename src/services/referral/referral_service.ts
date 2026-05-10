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

export interface IReferralService {
  createOrUpdateConfig(config: IReferralConfig): Promise<IReferralConfigDocument>;
  getConfig(): Promise<IReferralConfigDocument | null>;
  updateConfig(id: string, config: Partial<IReferralConfig>): Promise<IReferralConfigDocument | null>;
  deleteConfig(id: string): Promise<IReferralConfigDocument | null>;
  
  handleRegistrationReferral(refereeId: string, inviteCode: string): Promise<void>;
  handleRechargeReferral(refereeId: string, rechargeAmount: number): Promise<void>;
  handleGiftCommission(refereeId: string, giftCoinValue: number): Promise<void>;
  requestWithdrawal(userId: string, amount: number, accountDetails: any): Promise<IReferralWithdrawalDocument>;
}

export class ReferralService implements IReferralService {
  private cache = ReferralCache.getInstance();

  constructor(
    private referralRepository: IReferralRepository,
    private walletRepository: IReferralWalletRepository,
    private withdrawalRepository: IReferralWithdrawalRepository,
    private configRepository: IReferralConfigRepository,
    private userRepository: IUserRepository,
  ) {}

  // --- Admin Configuration ---
  async createOrUpdateConfig(
    config: IReferralConfig,
  ): Promise<IReferralConfigDocument> {
    const newConfig = await this.configRepository.createOrUpdateConfig(config);
    await this.cache.setConfig(newConfig);
    return newConfig;
  }

  async getConfig(): Promise<IReferralConfigDocument | null> {
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
    if (!config) return;

    // 1. Find the referrer
    const referrer = await this.userRepository.findUserByShortId(
      Number(inviteCode),
    );
    if (!referrer)
      throw new AppError(
        StatusCodes.NOT_FOUND,
        "Referrer not found with this code.",
      );

    const referrerId = (referrer as any)._id.toString();

    // 2. Prevent self-referral
    if (referrerId === refereeId) return;

    // 3. Create the referral link in DB
    await this.referralRepository.createReferral({
      referrer: referrerId as any,
      referee: refereeId as any,
      inviteCode: inviteCode,
      isRegistrationRewardGiven: true,
    });

    // 4. Cache the mapping for future high-speed lookups
    await this.cache.setReferrerId(refereeId, referrerId);

    // 5. Grant reward
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
    if (!config) return;

    const referral =
      await this.referralRepository.getReferralByReferee(refereeId);
    if (!referral || referral.isRechargeRewardGiven) return;

    const newTotal = referral.totalRechargedAmount + rechargeAmount;
    const update: any = { totalRechargedAmount: newTotal };

    if (
      !referral.isRechargeMilestoneReached &&
      newTotal >= config.rechargeThreshold
    ) {
      update.isRechargeMilestoneReached = true;
      update.isRechargeRewardGiven = true;

      await this.walletRepository.updateWalletBalance(
        referral.referrer,
        config.rechargeReward,
        true,
      );
    }

    await this.referralRepository.updateReferral(refereeId, update);
  }

  /**
   * Calculates and grants percentage-based commission from friend's gifts.
   */
  async handleGiftCommission(
    refereeId: string,
    giftCoinValue: number,
  ): Promise<void> {
    const config = await this.getConfig();
    if (!config || config.giftCommissionPercentage <= 0) return;

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

    // 3. Update DB (Asynchronous updates are fine here as per our design)
    await Promise.all([
      this.referralRepository.updateReferral(refereeId, {
        $inc: { totalCommissionEarned: commission },
      } as any),
      this.walletRepository.updateWalletBalance(
        referrerId,
        commission,
        true,
      ),
    ]);
  }

  /**
   * Logic for users to request a withdrawal from their referral earnings.
   */
  async requestWithdrawal(
    userId: string,
    amount: number,
    accountDetails: any,
  ): Promise<IReferralWithdrawalDocument> {
    throw new AppError(
      StatusCodes.NOT_IMPLEMENTED,
      "Withdrawal not implemented yet.",
    );
  }
}
