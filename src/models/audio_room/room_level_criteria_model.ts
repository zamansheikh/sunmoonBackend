import mongoose, { Document, Model, Schema } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

/**
 * Interface representing the criteria for a specific audio room level.
 * These values determine the requirements and rewards for the room support system.
 */
export interface IRoomLevelCriteria {
  level: number;
  roomVisitor: number;
  roomTransactions: number;
  totalRewardCoin: number;
  ownerCoin: number;
  partnerCoin: number;
  numberOfPartners: number;
}

export interface IRoomLevelCriteriaDocument
  extends IRoomLevelCriteria, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IRoomLevelCriteriaModel extends Model<IRoomLevelCriteriaDocument> {}

const RoomLevelCriteriaSchema = new Schema<
  IRoomLevelCriteriaDocument,
  IRoomLevelCriteriaModel
>(
  {
    level: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    roomVisitor: { type: Number, required: true },
    roomTransactions: { type: Number, required: true },
    totalRewardCoin: { type: Number, required: true },
    ownerCoin: { type: Number, required: true },
    partnerCoin: { type: Number, required: true },
    numberOfPartners: { type: Number, required: true },
  },
  {
    timestamps: true,
    collection: DatabaseNames.RoomLevelCriteria,
  },
);

const RoomLevelCriteriaModel = mongoose.model<
  IRoomLevelCriteriaDocument,
  IRoomLevelCriteriaModel
>(
  DatabaseNames.RoomLevelCriteria,
  RoomLevelCriteriaSchema,
  DatabaseNames.RoomLevelCriteria,
);

export default RoomLevelCriteriaModel;
