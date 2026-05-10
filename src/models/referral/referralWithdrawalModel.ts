import { Schema, model, Document, Model, Types } from "mongoose";
import { DatabaseNames, StatusTypes, WithdrawAccountTypes } from "../../core/Utils/enums";

export interface IReferralWithdrawal {
  /** The user requesting the withdrawal */
  user: Types.ObjectId;
  /** Amount of coins requested for withdrawal */
  amount: number;
  /** Current status of the withdrawal request (pending, accepted, rejected) */
  status: StatusTypes;
  /** The type of account where the payout will be sent */
  accountType: WithdrawAccountTypes;
  /** The specific account number or details for the payout */
  accountNumber: string;
  /** Optional note from the admin (e.g., rejection reason or transaction ID) */
  adminRemark?: string;
}

export interface IReferralWithdrawalDocument extends IReferralWithdrawal, Document {}

const referralWithdrawalSchema = new Schema<IReferralWithdrawalDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: DatabaseNames.User, required: true, index: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: Object.values(StatusTypes),
      default: StatusTypes.pending,
    },
    accountType: {
      type: String,
      enum: Object.values(WithdrawAccountTypes),
      required: true,
    },
    accountNumber: { type: String, required: true },
    adminRemark: { type: String },
  },
  { timestamps: true }
);

export const ReferralWithdrawalModel: Model<IReferralWithdrawalDocument> = model<IReferralWithdrawalDocument>(
  DatabaseNames.ReferralWithdrawal,
  referralWithdrawalSchema
);
