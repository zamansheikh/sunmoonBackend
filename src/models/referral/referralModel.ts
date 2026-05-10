import { Schema, model, Document, Model, Types } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

export interface IReferral {
  /** The user who shared the invite code */
  referrer: Types.ObjectId;
  /** The new user who was invited */
  referee: Types.ObjectId;
  /** The specific invite code used during registration */
  inviteCode: string;
  /** Flag to prevent duplicate registration rewards */
  isRegistrationRewardGiven: boolean;
  /** Flag indicating if the referee has crossed the recharge threshold */
  isRechargeMilestoneReached: boolean;
  /** Flag to prevent duplicate recharge milestone rewards */
  isRechargeRewardGiven: boolean;
  /** Cumulative amount the referee has recharged since joining */
  totalRechargedAmount: number;
  /** Cumulative earnings the referrer has made from this specific friend's gifts */
  totalCommissionEarned: number;
}

export interface IReferralDocument extends IReferral, Document {}

const referralSchema = new Schema<IReferralDocument>(
  {
    referrer: { type: Schema.Types.ObjectId, ref: DatabaseNames.User, required: true, index: true },
    referee: { type: Schema.Types.ObjectId, ref: DatabaseNames.User, required: true, unique: true },
    inviteCode: { type: String, required: true },
    isRegistrationRewardGiven: { type: Boolean, default: false },
    isRechargeMilestoneReached: { type: Boolean, default: false },
    isRechargeRewardGiven: { type: Boolean, default: false },
    totalRechargedAmount: { type: Number, default: 0 },
    totalCommissionEarned: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const ReferralModel: Model<IReferralDocument> = model<IReferralDocument>(
  DatabaseNames.Referral,
  referralSchema
);
