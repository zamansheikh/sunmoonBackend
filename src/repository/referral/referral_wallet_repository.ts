import { Model, Types } from "mongoose";
import { IReferralWalletDocument } from "../../models/referral/referralWalletModel";

export interface IReferralWalletRepository {
  getWallet(userId: string | Types.ObjectId): Promise<IReferralWalletDocument | null>;
  createWallet(userId: string | Types.ObjectId): Promise<IReferralWalletDocument>;
  updateWalletBalance(userId: string | Types.ObjectId, amount: number, isEarning: boolean): Promise<IReferralWalletDocument | null>;
}

export class ReferralWalletRepository implements IReferralWalletRepository {
  constructor(private walletModel: Model<IReferralWalletDocument>) {}

  async getWallet(userId: string | Types.ObjectId): Promise<IReferralWalletDocument | null> {
    return await this.walletModel.findOne({ user: userId });
  }

  async createWallet(userId: string | Types.ObjectId): Promise<IReferralWalletDocument> {
    return await this.walletModel.create({ user: userId });
  }

  async updateWalletBalance(userId: string | Types.ObjectId, amount: number, isEarning: boolean): Promise<IReferralWalletDocument | null> {
    const update: any = { $inc: { currentBalance: amount } };
    if (isEarning) {
      update.$inc.totalEarned = amount;
    } else {
      update.$inc.totalWithdrawn = Math.abs(amount);
      update.$inc.currentBalance = -Math.abs(amount);
    }
    
    return await this.walletModel.findOneAndUpdate(
      { user: userId },
      update,
      { new: true, upsert: true }
    );
  }
}
