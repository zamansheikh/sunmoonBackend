import { Model, Types } from "mongoose";
import { IReferralDocument } from "../../models/referral/referralModel";

export interface IReferralRepository {
  createReferral(data: Partial<IReferralDocument>): Promise<IReferralDocument>;
  getReferralByReferee(refereeId: string | Types.ObjectId): Promise<IReferralDocument | null>;
  getReferralsByReferrer(referrerId: string | Types.ObjectId): Promise<IReferralDocument[]>;
  updateReferral(refereeId: string | Types.ObjectId, update: Partial<IReferralDocument>): Promise<IReferralDocument | null>;
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

  async updateReferral(refereeId: string | Types.ObjectId, update: Partial<IReferralDocument>): Promise<IReferralDocument | null> {
    return await this.referralModel.findOneAndUpdate({ referee: refereeId }, update, { new: true });
  }
}
