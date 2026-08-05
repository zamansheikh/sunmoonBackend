import { Model, Types } from "mongoose";
import { IReferralDocument } from "../../models/referral/referralModel";

export interface IReferralRepository {
  createReferral(data: Partial<IReferralDocument>): Promise<IReferralDocument>;
  getReferralByReferee(refereeId: string | Types.ObjectId): Promise<IReferralDocument | null>;
  getReferralsByReferrer(referrerId: string | Types.ObjectId): Promise<IReferralDocument[]>;
  getReferralsByReferrerPaginated(referrerId: string | Types.ObjectId, limit: number, skip: number): Promise<IReferralDocument[]>;
  getReferralsCountByReferrer(referrerId: string | Types.ObjectId): Promise<number>;
  updateReferral(refereeId: string | Types.ObjectId, update: Record<string, any>): Promise<IReferralDocument | null>;
  updateRechargeAtomic(
    refereeId: string | Types.ObjectId,
    rechargeAmount: number,
    threshold: number,
  ): Promise<IReferralDocument | null>;
  deleteByUser(userId: string | Types.ObjectId): Promise<void>;
  deleteByReferrer(userId: string | Types.ObjectId): Promise<void>;
}

export class ReferralRepository implements IReferralRepository {
  constructor(private referralModel: Model<IReferralDocument>) {}

  async createReferral(data: Partial<IReferralDocument>): Promise<IReferralDocument> {
    return await this.referralModel.create(data);
  }

  async getReferralByReferee(refereeId: string | Types.ObjectId): Promise<IReferralDocument | null> {
    return await this.referralModel.findOne({ referee: refereeId });
  }

  async getReferralsByReferrer(referrerId: string | Types.ObjectId): Promise<IReferralDocument[]> {
    return await this.referralModel.find({ referrer: referrerId }).populate("referee", "name avatar userId");
  }

  async getReferralsByReferrerPaginated(referrerId: string | Types.ObjectId, limit: number, skip: number): Promise<IReferralDocument[]> {
    return await this.referralModel.find({ referrer: referrerId })
      .populate("referee", "name avatar userId")
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });
  }

  async getReferralsCountByReferrer(referrerId: string | Types.ObjectId): Promise<number> {
    return await this.referralModel.countDocuments({ referrer: referrerId });
  }

  async updateReferral(refereeId: string | Types.ObjectId, update: Record<string, any>): Promise<IReferralDocument | null> {
    return await this.referralModel.findOneAndUpdate({ referee: refereeId }, update, { new: true });
  }

  async updateRechargeAtomic(
    refereeId: string | Types.ObjectId,
    rechargeAmount: number,
    threshold: number,
  ): Promise<IReferralDocument | null> {
    return await this.referralModel.findOneAndUpdate(
      {
        referee: refereeId,
        isRechargeRewardGiven: false,
      },
      {
        $inc: { totalRechargedAmount: rechargeAmount },
        $set: {
          isRechargeMilestoneReached: true,
          isRechargeRewardGiven: true,
        },
      },
      { new: true },
    );
  }

  async deleteByUser(userId: string | Types.ObjectId): Promise<void> {
    await this.referralModel.deleteMany({ referee: userId });
  }

  async deleteByReferrer(userId: string | Types.ObjectId): Promise<void> {
    await this.referralModel.deleteMany({ referrer: userId });
  }
}
