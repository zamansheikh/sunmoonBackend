import mongoose, { Document, Model, Schema, Types } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

export interface IGiftRecord {
  senderId: Types.ObjectId | string;
  receiverId: Types.ObjectId | string;
  giftId: Types.ObjectId | string;
  qty: number;
  totalCoinCost: number; // gift coinPrice * qty
  totalDiamonds: number; // gift diamonds * qty
  roomId?: string;
  familyId?: string;
  expireAt?: Date;
}

export interface IGiftRecordDocument extends IGiftRecord, Document {
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
    familyId: { type: String },
    // expireAt: { type: Date, required: true, expires: 1 },
  },
  { timestamps: true },
);

// --- Performance Indexes ---

// Single-field indexes
giftRecordSchema.index({ senderId: 1 });
giftRecordSchema.index({ receiverId: 1 });
giftRecordSchema.index({ roomId: 1 });
giftRecordSchema.index({ createdAt: -1 });

// Compound indexes for common ranking/history queries
// Speeds up "My Sent Amount" and "Sender Rankings"
giftRecordSchema.index({ senderId: 1, createdAt: -1 });

// Speeds up "My Received Amount" and "Receiver Rankings"
giftRecordSchema.index({ receiverId: 1, createdAt: -1 });

// Speeds up "Room Rankings" and "Inside Room Ranking"
giftRecordSchema.index({ roomId: 1, createdAt: -1 });

// Speeds up "My Room Contribution/Receipts"
giftRecordSchema.index({ senderId: 1, roomId: 1, createdAt: -1 });
giftRecordSchema.index({ receiverId: 1, roomId: 1, createdAt: -1 });

const GiftRecordModel = mongoose.model<IGiftRecordDocument, IGiftRecordModel>(
  DatabaseNames.GiftRecords,
  giftRecordSchema,
  DatabaseNames.GiftRecords,
);

export default GiftRecordModel;
