import mongoose, { Document, Model, Schema, Types } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

export interface IGIftRecord {
  senderId: Types.ObjectId | string;
  receiverId: Types.ObjectId | string;
  giftId: Types.ObjectId | string;
  qty: number;
  totalCoinCost: number; // gift coinPrice * qty
  totalDiamonds: number; // gift diamonds * qty
  roomId?: string;
  expireAt?: Date;
}

export interface IGiftRecordDocument extends IGIftRecord, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IGiftRecordModel extends Model<IGiftRecordDocument> {}

const giftRecordSchema = new Schema<IGiftRecordDocument>(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: DatabaseNames.User,
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: DatabaseNames.User,
    },
    giftId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: DatabaseNames.Gifts,
    },
    qty: { type: Number, required: true },
    totalCoinCost: { type: Number, required: true },
    totalDiamonds: { type: Number, required: true },
    roomId: { type: String },
    expireAt: { type: Date, required: true, expires: 1 },
  },
  { timestamps: true },
);

const GiftRecordModel = mongoose.model<IGiftRecordDocument, IGiftRecordModel>(
  DatabaseNames.GiftRecords,
  giftRecordSchema,
  DatabaseNames.GiftRecords,
);

export default GiftRecordModel;
