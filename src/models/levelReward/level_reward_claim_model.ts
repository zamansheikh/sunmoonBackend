import mongoose, { Document, Model } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

export interface ILevelRewardClaim {
  userId: mongoose.Types.ObjectId;
  level: number;
  claimedAt: Date;
}

export interface ILevelRewardClaimDocument extends ILevelRewardClaim, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface ILevelRewardClaimModel extends Model<ILevelRewardClaimDocument> {}

const levelRewardClaimSchema = new mongoose.Schema<ILevelRewardClaimDocument, ILevelRewardClaimModel>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: DatabaseNames.User,
      required: true,
    },
    level: { type: Number, required: true },
    claimedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

levelRewardClaimSchema.index({ userId: 1, level: 1 }, { unique: true });

const LevelRewardClaimModel = mongoose.model<ILevelRewardClaimDocument, ILevelRewardClaimModel>(
  DatabaseNames.LevelRewardClaims,
  levelRewardClaimSchema,
  DatabaseNames.LevelRewardClaims,
);

export default LevelRewardClaimModel;
