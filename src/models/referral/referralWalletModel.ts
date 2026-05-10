import { Schema, model, Document, Model, Types } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

export interface IReferralWallet {
  /** The user who owns the wallet */
  user: Types.ObjectId;
  /** Current withdrawable balance */
  currentBalance: number;
  /** Total referral coins earned over the lifetime of the account */
  totalEarned: number;
  /** Total referral coins successfully withdrawn over the lifetime of the account */
  totalWithdrawn: number;
}

export interface IReferralWalletDocument extends IReferralWallet, Document {}

const referralWalletSchema = new Schema<IReferralWalletDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: DatabaseNames.User, required: true, unique: true },
    currentBalance: { type: Number, default: 0 },
    totalEarned: { type: Number, default: 0 },
    totalWithdrawn: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const ReferralWalletModel: Model<IReferralWalletDocument> = model<IReferralWalletDocument>(
  DatabaseNames.ReferralWallet,
  referralWalletSchema
);
