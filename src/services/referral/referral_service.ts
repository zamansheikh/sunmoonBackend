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
    return await this.configRepository.createOrUpdateConfig(config);
  }

  async getConfig(): Promise<IReferralConfigDocument | null> {
    return await this.configRepository.getConfig();
  }

  async updateConfig(
    id: string,
    config: Partial<IReferralConfig>,
  ): Promise<IReferralConfigDocument | null> {
    return await this.configRepository.updateConfig(id, config);
  }

  async deleteConfig(id: string): Promise<IReferralConfigDocument | null> {
    return await this.configRepository.deleteConfig(id);
  }

  // --- Core Referral Engine (The Facade Methods) ---

  /**
   * Links a new user to their referrer during registration.
   * Handles attribution and grants the initial invite reward.
   */
  async handleRegistrationReferral(
    refereeId: string,
    inviteCode: string,
  ): Promise<void> {
    const config = await this.configRepository.getConfig();
    if (!config) return; // Referral system not configured

    // 1. Find the referrer by their userId (invite code)
    const referrer = await this.userRepository.findUserByShortId(
      Number(inviteCode),
    );
    if (!referrer)
      throw new AppError(
        StatusCodes.NOT_FOUND,
        "Referrer not found with this code.",
      );

    // 2. Prevent self-referral
    if ((referrer as any)._id.toString() === refereeId) return;

    // 3. Create the referral link
    await this.referralRepository.createReferral({
      referrer: (referrer as any)._id,
      referee: refereeId as any,
      inviteCode: inviteCode,
      isRegistrationRewardGiven: true,
    });

    // 4. Grant the registration reward to the referrer's wallet
    await this.walletRepository.updateWalletBalance(
      (referrer as any)._id,
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
    const config = await this.configRepository.getConfig();
    if (!config) return;

    const referral =
      await this.referralRepository.getReferralByReferee(refereeId);
    if (!referral || referral.isRechargeRewardGiven) return;

    // Update cumulative recharge amount
    const newTotal = referral.totalRechargedAmount + rechargeAmount;
    const update: any = { totalRechargedAmount: newTotal };

    // Check if threshold is crossed for the first time
    if (
      !referral.isRechargeMilestoneReached &&
      newTotal >= config.rechargeThreshold
    ) {
      update.isRechargeMilestoneReached = true;
      update.isRechargeRewardGiven = true;

      // Credit the reward
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
    const config = await this.configRepository.getConfig();
    if (!config || config.giftCommissionPercentage <= 0) return;

    const referral =
      await this.referralRepository.getReferralByReferee(refereeId);
    if (!referral) return;

    const commission = Math.floor(
      (giftCoinValue * config.giftCommissionPercentage) / 100,
    );
    if (commission <= 0) return;

    // 1. Update cumulative commission in referral record
    await this.referralRepository.updateReferral(refereeId, {
      $inc: { totalCommissionEarned: commission },
    } as any);

    // 2. Add to referrer's wallet balance
    await this.walletRepository.updateWalletBalance(
      referral.referrer,
      commission,
      true,
    );
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
