import mongoose, { Document, Model, Schema, Types } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

/**
 * Interface representing a Reward Item in the configuration.
 */
export interface IFamilyRewardItem {
  itemId: Types.ObjectId | string;
  duration: number; // in days
  isExclusive?: boolean; // for special UI like the Top 1 banner
}

/**
 * Interface representing the Family Reward Configuration.
 */
export interface IFamilyRewardConfig {
  startRank: number;
  endRank: number;
  items: IFamilyRewardItem[];
  starRating: number; // 1-5
  label: string; // e.g., "TOP1 Reward"
}

/**
 * Interface representing the Mongoose document for Family Reward Configuration.
 */
export interface IFamilyRewardConfigDocument
  extends IFamilyRewardConfig, Document {
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface representing the Mongoose model for Family Reward Configuration.
 */
export interface IFamilyRewardConfigModel extends Model<IFamilyRewardConfigDocument> {}

const familyRewardConfigSchema = new Schema<IFamilyRewardConfigDocument>(
  {
    startRank: {
      type: Number,
      required: true,
      index: true,
    },
    endRank: {
      type: Number,
      required: true,
      index: true,
    },
    items: [
      {
        itemId: {
          type: Schema.Types.ObjectId,
          ref: DatabaseNames.StoreItem,
          required: true,
        },
        duration: {
          type: Number,
          default: 7,
        },
        isExclusive: {
          type: Boolean,
          default: false,
        },
      },
    ],
    starRating: {
      type: Number,
      default: 3,
      min: 1,
      max: 5,
    },
    label: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

const FamilyRewardConfigModel = mongoose.model<
  IFamilyRewardConfigDocument,
  IFamilyRewardConfigModel
>(
  DatabaseNames.FamilyRewards,
  familyRewardConfigSchema,
  DatabaseNames.FamilyRewards,
);

export default FamilyRewardConfigModel;
