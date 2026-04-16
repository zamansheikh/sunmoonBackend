import { Document, model, Model, Schema } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

export interface ICoinBagOptions {
  coinOptions: number[];
  userCountOptions: number[];
}

export interface ICoinBagOptionsDocument extends Document, ICoinBagOptions {
  createdAt: Date;
  updatedAt: Date;
}

export interface ICoinBagOptionsModel extends Model<ICoinBagOptionsDocument> {}

const CoinBagOptionSchema = new Schema<ICoinBagOptionsDocument>(
  {
    coinOptions: { type: [Number], required: true },
    userCountOptions: { type: [Number], required: true },
  },
  { timestamps: true },
);

const CoinBagOptionModel = model<ICoinBagOptionsDocument, ICoinBagOptionsModel>(
  DatabaseNames.CoinBagOptions,
  CoinBagOptionSchema,
  DatabaseNames.CoinBagOptions,
);

export default CoinBagOptionModel;
