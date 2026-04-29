import mongoose, { Document, Model, Schema, Types } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

/**
 * Interface representing an individual reward item within a tier.
 */
export interface IRewardItem {
  name: string;
  icon: string;
  durationDays: number;
  stars: number;
  itemRef?: Types.ObjectId | string; // Reference to StoreItem if applicable
  type: string; // e.g., 'frame', 'medal', 'banner', 'room_theme', 'page_effect'
}

/**
 * Interface representing a reward tier for an activity.
 */
export interface IActivityReward {
  activityType: string; // e.g., 'family_competition', 'user_ranking'
  title: string; // e.g., 'TOP 1 Reward', 'TOP 4-10 Reward'
  minRank: number; // e.g., 1
  maxRank: number; // e.g., 1 (for Top 1), or 10 (for Top 4-10)
  rewards: IRewardItem[];
  displayOrder: number; // For sorting in the GET API
}

/**
 * Interface representing the Mongoose document for an Activity Reward.
 */
export interface IActivityRewardDocument extends IActivityReward, Document {
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface representing the Mongoose model for an Activity Reward.
 */
export interface IActivityRewardModel extends Model<IActivityRewardDocument> {}

const rewardItemSchema = new Schema<IRewardItem>(
  {
    name: { type: String, required: true },
    icon: { type: String, required: true },
    durationDays: { type: Number, default: 7 },
    stars: { type: Number, default: 3 },
    itemRef: { type: Schema.Types.ObjectId, ref: DatabaseNames.StoreItem },
    type: { type: String, required: true },
  },
  { _id: false }
);

const activityRewardSchema = new Schema<IActivityRewardDocument>(
  {
    activityType: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    minRank: {
      type: Number,
      required: true,
    },
    maxRank: {
      type: Number,
      required: true,
    },
    rewards: [rewardItemSchema],
    displayOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for easy querying by rank
activityRewardSchema.index({ activityType: 1, minRank: 1, maxRank: 1 });

const ActivityRewardModel = mongoose.model<IActivityRewardDocument, IActivityRewardModel>(
  DatabaseNames.ActivityReward,
  activityRewardSchema,
  DatabaseNames.ActivityReward
);

export default ActivityRewardModel;
