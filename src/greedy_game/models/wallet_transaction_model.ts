import mongoose, { Document, Model, Types } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

export interface IWalletTransaction {
  userId: Types.ObjectId | string;
  currency: string;
  amount: number;
  type: string;
  idempotencyKey: string;
  description: string;
  refType: string;
  refId: string;
}

export interface IWalletTransactionDocument extends IWalletTransaction, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IWalletTransactionModel extends Model<IWalletTransactionDocument> {}

const walletTransactionSchema = new mongoose.Schema<IWalletTransactionDocument, IWalletTransactionModel>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: DatabaseNames.User,
      required: true,
      index: true,
    },
    currency: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
    },
    refType: {
      type: String,
      required: true,
    },
    refId: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const WalletTransactionModel = mongoose.model<IWalletTransactionDocument, IWalletTransactionModel>(
  DatabaseNames.WalletTransaction,
  walletTransactionSchema,
  DatabaseNames.WalletTransaction,
);

export default WalletTransactionModel;
