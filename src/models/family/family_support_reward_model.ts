import mongoose, { Document, Model, Schema } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

/**
 * Interface representing the Family Support Reward configuration for a single level.
 */
export interface IFamilySupportReward {
  level: number;
  targetPoints: number;
  totalBonus: number;
  leaderCut: number;
  top1Cut: number;
  top2Cut: number;
  top3Cut: number;
  top4To10Cut: number;
  top11To15Cut: number;
  top16To20Cut: number;
  minContributionRequired: number;
}

/**
 * Interface representing the Mongoose document for Family Support Reward.
 */
export interface IFamilySupportRewardDocument
  extends IFamilySupportReward,
    Document {
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface representing the Mongoose model for Family Support Reward.
 */
export interface IFamilySupportRewardModel
  extends Model<IFamilySupportRewardDocument> {}

const familySupportRewardSchema = new Schema<IFamilySupportRewardDocument>(
  {
    level: {
      type: Number,
      required: true,
      unique: true,
      min: 1,
      max: 10,
    },
    targetPoints: {
      type: Number,
      required: true,
    },
    totalBonus: {
      type: Number,
      required: true,
    },
    leaderCut: {
      type: Number,
      required: true,
    },
    top1Cut: {
      type: Number,
      required: true,
    },
    top2Cut: {
      type: Number,
      required: true,
    },
    top3Cut: {
      type: Number,
      required: true,
    },
    top4To10Cut: {
      type: Number,
      required: true,
    },
    top11To15Cut: {
      type: Number,
      required: true,
    },
    top16To20Cut: {
      type: Number,
      required: true,
    },
    minContributionRequired: {
      type: Number,
      default: 1200000,
    },
  },
  {
    timestamps: true,
  },
);

const FamilySupportRewardModel = mongoose.model<
  IFamilySupportRewardDocument,
  IFamilySupportRewardModel
>(
  DatabaseNames.FamilySupportReward,
  familySupportRewardSchema,
  DatabaseNames.FamilySupportReward,
);

export default FamilySupportRewardModel;
