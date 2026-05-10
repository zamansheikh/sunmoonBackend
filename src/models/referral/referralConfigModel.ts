import mongoose from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

export interface IReferralConfig {
    inviteReward: number;              // e.g., 1,000,000 coins
    rechargeThreshold: number;         // e.g., 200,000 coins
    rechargeReward: number;            // e.g., 5,000 coins
    giftCommissionPercentage: number;  // e.g., 5 (%)
}

export interface IReferralConfigDocument extends IReferralConfig, mongoose.Document {
    createdAt: Date;
    updatedAt: Date;
}

export interface IReferralConfigModel extends mongoose.Model<IReferralConfigDocument> {}

const ReferralConfigSchema = new mongoose.Schema<IReferralConfigDocument, IReferralConfigModel>(
    {
        inviteReward: {
            type: Number,
            required: true,
            default: 1000000,
        },
        rechargeThreshold: {
            type: Number,
            required: true,
            default: 200000,
        },
        rechargeReward: {
            type: Number,
            required: true,
            default: 1000000,
        },
        giftCommissionPercentage: {
            type: Number,
            required: true,
            default: 5,
        },
    },
    { timestamps: true }
);

export const ReferralConfigModel = mongoose.model<IReferralConfigDocument, IReferralConfigModel>(
    DatabaseNames.ReferralConfig,
    ReferralConfigSchema,
    DatabaseNames.ReferralConfig
);
