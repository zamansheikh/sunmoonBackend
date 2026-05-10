import { Model, Types, ClientSession } from "mongoose";
import { IReferralWithdrawalDocument } from "../../models/referral/referralWithdrawalModel";

export interface IReferralWithdrawalRepository {
  createWithdrawal(data: Partial<IReferralWithdrawalDocument>, session?: ClientSession): Promise<IReferralWithdrawalDocument>;
  getWithdrawalsByUser(userId: string | Types.ObjectId): Promise<IReferralWithdrawalDocument[]>;
}

export class ReferralWithdrawalRepository implements IReferralWithdrawalRepository {
  constructor(private withdrawalModel: Model<IReferralWithdrawalDocument>) {}

  async createWithdrawal(data: Partial<IReferralWithdrawalDocument>, session?: ClientSession): Promise<IReferralWithdrawalDocument> {
    const [result] = await this.withdrawalModel.create([data], { session });
    return result;
  }

  async getWithdrawalsByUser(userId: string | Types.ObjectId): Promise<IReferralWithdrawalDocument[]> {
    return await this.withdrawalModel.find({ user: userId }).sort({ createdAt: -1 });
  }
}
