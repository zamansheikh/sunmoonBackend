import mongoose, { Document, Model } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

export interface ILevelRewardConfig {
  level: number;
  coinReward: number;
}

export interface ILevelRewardConfigDocument extends ILevelRewardConfig, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface ILevelRewardConfigModel extends Model<ILevelRewardConfigDocument> {}

const levelRewardConfigSchema = new mongoose.Schema<ILevelRewardConfigDocument, ILevelRewardConfigModel>(
  {
    level: { type: Number, required: true, unique: true },
    coinReward: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

const LevelRewardConfigModel = mongoose.model<ILevelRewardConfigDocument, ILevelRewardConfigModel>(
  DatabaseNames.LevelRewardConfigs,
  levelRewardConfigSchema,
  DatabaseNames.LevelRewardConfigs,
);

export default LevelRewardConfigModel;
