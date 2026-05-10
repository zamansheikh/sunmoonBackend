import { Model, Types } from "mongoose";
import { IReferralWithdrawalDocument } from "../../models/referral/referralWithdrawalModel";

export interface IReferralWithdrawalRepository {
  createWithdrawal(data: Partial<IReferralWithdrawalDocument>): Promise<IReferralWithdrawalDocument>;
  getWithdrawalsByUser(userId: string | Types.ObjectId): Promise<IReferralWithdrawalDocument[]>;
}

export class ReferralWithdrawalRepository implements IReferralWithdrawalRepository {
  constructor(private withdrawalModel: Model<IReferralWithdrawalDocument>) {}

  async createWithdrawal(data: Partial<IReferralWithdrawalDocument>): Promise<IReferralWithdrawalDocument> {
    return await this.withdrawalModel.create(data);
  }

  async getWithdrawalsByUser(userId: string | Types.ObjectId): Promise<IReferralWithdrawalDocument[]> {
    return await this.withdrawalModel.find({ user: userId }).sort({ createdAt: -1 });
  }
}
