import mongoose, { Document, Model } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

export interface IMedal {
  name: string;
  level: number;
  icon: string;
  description?: string;
}

export interface IMedalDocument extends IMedal, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IMedalModel extends Model<IMedalDocument> {}

const medalSchema = new mongoose.Schema<IMedalDocument, IMedalModel>(
  {
    name: { type: String, required: true },
    level: { type: Number, required: true, unique: true },
    icon: { type: String, required: true },
    description: { type: String },
  },
  {
    timestamps: true,
  },
);

const MedalModel = mongoose.model<IMedalDocument, IMedalModel>(
  DatabaseNames.Medals,
  medalSchema,
  DatabaseNames.Medals,
);

export default MedalModel;
