import mongoose, { Document, Model, Schema } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

export interface IXpConfig {
  xpLevels: number[];
  giftSendXp: number;
  svipMultipliers: { minLevel: number; multiplier: number }[];
}

export interface IXpConfigDocument extends IXpConfig, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IXpConfigModel extends Model<IXpConfigDocument> {}

const XpConfigSchema = new Schema<IXpConfigDocument, IXpConfigModel>(
  {
    xpLevels: {
      type: [Number],
      required: true,
    },
    giftSendXp: {
      type: Number,
      required: true,
    },
    svipMultipliers: {
      type: [
        {
          minLevel: { type: Number, required: true },
          multiplier: { type: Number, required: true },
        },
      ],
      required: true,
    },
  },
  {
    timestamps: true,
    collection: DatabaseNames.XpConfig,
  },
);

const XpConfigModel = mongoose.model<IXpConfigDocument, IXpConfigModel>(
  DatabaseNames.XpConfig,
  XpConfigSchema,
  DatabaseNames.XpConfig,
);

export default XpConfigModel;
