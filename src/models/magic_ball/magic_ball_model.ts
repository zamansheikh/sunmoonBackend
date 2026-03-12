import { Document, Model, Schema, model } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

export interface IMagicBallMilestone {
  message: string;
  rewardCoin: number;
  milestone: number;
}

export interface IMagicBall {
  category: string;
  logo: string;
  milestones: IMagicBallMilestone[];
}

export interface IMagicBallDocument extends IMagicBall, Document {
    createdAt: Date;
    updatedAt: Date;
}

export interface IMagicBallModel extends Model<IMagicBallDocument> {}

const MagicBallMilestoneSchema = new Schema<IMagicBallMilestone>({
  message: { type: String, required: true },
  rewardCoin: { type: Number, required: true },
  milestone: { type: Number, required: true },
}, { _id: false });

const MagicBallSchema = new Schema<IMagicBallDocument>({
  category: { type: String, required: true, unique: true },
  logo: { type: String, required: true },
  milestones: [MagicBallMilestoneSchema],
}, { timestamps: true });

export const MagicBallModel = model<IMagicBallDocument, IMagicBallModel>(DatabaseNames.MagicBall, MagicBallSchema);


