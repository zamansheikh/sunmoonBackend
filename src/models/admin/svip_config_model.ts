import mongoose, { Document, Model, Schema } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

export interface IPremiumTier {
  /** Tier number (1-based). */
  tier: number;
  /** Coins needed in a single month to reach this tier. */
  milestoneCoins: number;
}

export interface ISvipConfig {
  /** Ordered VIP tier definitions (tier 1, 2, 3, ...). User climbs these first. */
  vipTiers: IPremiumTier[];
  /** Ordered SVIP tier definitions (tier 1, 2, 3, ...). User climbs these after maxing VIP. */
  svipTiers: IPremiumTier[];
  /** Fraction of the milestone required to retain the tier each month (e.g. 0.5). */
  retentionThreshold: number;
  /** Store category title for VIP items. Used to match store items dynamically. */
  vipCategoryName: string;
  /** Store category title for SVIP items. Used to match store items dynamically. */
  svipCategoryName: string;
}

export interface ISvipConfigDocument extends ISvipConfig, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface ISvipConfigModel extends Model<ISvipConfigDocument> {}

const SvipConfigSchema = new Schema<ISvipConfigDocument, ISvipConfigModel>(
  {
    vipTiers: {
      type: [
        {
          tier: { type: Number, required: true },
          milestoneCoins: { type: Number, required: true },
        },
      ],
      required: true,
      default: [],
    },
    svipTiers: {
      type: [
        {
          tier: { type: Number, required: true },
          milestoneCoins: { type: Number, required: true },
        },
      ],
      required: true,
      default: [],
    },
    retentionThreshold: {
      type: Number,
      required: true,
      default: 0.5,
    },
    vipCategoryName: {
      type: String,
      required: true,
      default: "VIP",
    },
    svipCategoryName: {
      type: String,
      required: true,
      default: "SVIP",
    },
  },
  {
    timestamps: true,
    collection: DatabaseNames.SvipConfig,
  },
);

const SvipConfigModel = mongoose.model<ISvipConfigDocument, ISvipConfigModel>(
  DatabaseNames.SvipConfig,
  SvipConfigSchema,
  DatabaseNames.SvipConfig,
);

export default SvipConfigModel;
