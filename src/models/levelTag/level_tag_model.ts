import mongoose, { Document, Model } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

export interface ILevelTag {
  level: number;
  tagFile: string;
  tagFileId: string;
}

export interface ILevelTagDocument extends ILevelTag, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface ILevelTagModel extends Model<ILevelTagDocument> {}

const levelTagSchema = new mongoose.Schema<ILevelTagDocument, ILevelTagModel>(
  {
    level: { type: Number, required: true, unique: true },
    tagFile: { type: String, required: true },
    tagFileId: { type: String, required: true },
  },
  { timestamps: true },
);

const LevelTagModel = mongoose.model<ILevelTagDocument, ILevelTagModel>(
  DatabaseNames.LevelTags,
  levelTagSchema,
  DatabaseNames.LevelTags,
);

export default LevelTagModel;
