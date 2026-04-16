import { Document, model, Model, Schema } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

export interface IDataPoint {
  rank: number;
  percentage: number;
}

export interface ICoinBagDistribution {
  totalUsers: number;
  dataPoints: IDataPoint[];
}

export interface ICoinBagDistributionDocument
  extends Document,
    ICoinBagDistribution {
  createdAt: Date;
  updatedAt: Date;
}

export interface ICoinBagDistributionModel
  extends Model<ICoinBagDistributionDocument> {}

const DistributionSchema = new Schema<ICoinBagDistributionDocument>(
  {
    totalUsers: {
      type: Number,
      required: true,
      unique: true,
    },
    dataPoints: [
      {
        rank: { type: Number, required: true },
        percentage: { type: Number, required: true },
      },
    ],
  },
  { timestamps: true },
);

const CoinBagDistributionModel = model<
  ICoinBagDistributionDocument,
  ICoinBagDistributionModel
>(
  DatabaseNames.CoinBagDistribution,
  DistributionSchema,
  DatabaseNames.CoinBagDistribution,
);

export default CoinBagDistributionModel;
