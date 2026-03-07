import mongoose, { Document, Model, Schema } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

export interface IRoomSupportHistory {
  roomId: string;
  numberOfUniqueUsers: number;
  roomTransaction: number;
  roomLevel: number;
}

export interface IRoomSupportHistoryDocument
  extends IRoomSupportHistory,
    Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IRoomSupportHistoryModel
  extends Model<IRoomSupportHistoryDocument> {}

const RoomSupportHistorySchema = new Schema<
  IRoomSupportHistoryDocument,
  IRoomSupportHistoryModel
>(
  {
    roomId: { type: String, required: true, unique: true },
    numberOfUniqueUsers: { type: Number, default: 0 },
    roomTransaction: { type: Number, default: 0 },
    roomLevel: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const RoomSupportHistoryModel = mongoose.model<
  IRoomSupportHistoryDocument,
  IRoomSupportHistoryModel
>(
  DatabaseNames.RoomSupportHistory,
  RoomSupportHistorySchema,
  DatabaseNames.RoomSupportHistory,
);

export default RoomSupportHistoryModel;
