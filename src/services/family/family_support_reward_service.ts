import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import { RepositoryProviders } from "../../core/providers/repository_providers";
import {
  IFamilySupportReward,
  IFamilySupportRewardDocument,
} from "../../models/family/family_support_reward_model";
import { IFamilySupportRewardRepository } from "../../repository/family/family_support_reward_repository";

const DEFAULT_FAMILY_SUPPORT_REWARDS: IFamilySupportReward[] = [
  { level: 1, targetPoints: 96000000, totalBonus: 6720000, leaderCut: 480000, top1Cut: 1920000, top2Cut: 1440000, top3Cut: 960000, top4To10Cut: 137000, top11To15Cut: 115200, top16To20Cut: 76800, minContributionRequired: 1200000 },
  { level: 2, targetPoints: 180000000, totalBonus: 12600000, leaderCut: 900000, top1Cut: 3600000, top2Cut: 2700000, top3Cut: 1800000, top4To10Cut: 257000, top11To15Cut: 216000, top16To20Cut: 144000, minContributionRequired: 1200000 },
  { level: 3, targetPoints: 360000000, totalBonus: 28800000, leaderCut: 2160000, top1Cut: 8640000, top2Cut: 6480000, top3Cut: 4320000, top4To10Cut: 514000, top11To15Cut: 432000, top16To20Cut: 288000, minContributionRequired: 1200000 },
  { level: 4, targetPoints: 600000000, totalBonus: 52800000, leaderCut: 4080000, top1Cut: 16320000, top2Cut: 12240000, top3Cut: 8160000, top4To10Cut: 857000, top11To15Cut: 720000, top16To20Cut: 480000, minContributionRequired: 1200000 },
  { level: 5, targetPoints: 900000000, totalBonus: 79200000, leaderCut: 6120000, top1Cut: 24480000, top2Cut: 18360000, top3Cut: 12240000, top4To10Cut: 1280000, top11To15Cut: 1080000, top16To20Cut: 720000, minContributionRequired: 1200000 },
  { level: 6, targetPoints: 1320000000, totalBonus: 116160000, leaderCut: 8976000, top1Cut: 35900000, top2Cut: 26920000, top3Cut: 17950000, top4To10Cut: 1880000, top11To15Cut: 1580000, top16To20Cut: 1050000, minContributionRequired: 1200000 },
  { level: 7, targetPoints: 1800000000, totalBonus: 158400000, leaderCut: 12240000, top1Cut: 48960000, top2Cut: 36720000, top3Cut: 24480000, top4To10Cut: 2570000, top11To15Cut: 2160000, top16To20Cut: 1440000, minContributionRequired: 1200000 },
  { level: 8, targetPoints: 3000000000, totalBonus: 264000000, leaderCut: 20400000, top1Cut: 81600000, top2Cut: 61200000, top3Cut: 40800000, top4To10Cut: 4280000, top11To15Cut: 3600000, top16To20Cut: 2400000, minContributionRequired: 1200000 },
  { level: 9, targetPoints: 6000000000, totalBonus: 528000000, leaderCut: 40800000, top1Cut: 163200000, top2Cut: 122400000, top3Cut: 81600000, top4To10Cut: 8570000, top11To15Cut: 7200000, top16To20Cut: 4800000, minContributionRequired: 1200000 },
  { level: 10, targetPoints: 12000000000, totalBonus: 1056000000, leaderCut: 81600000, top1Cut: 326400000, top2Cut: 244800000, top3Cut: 163200000, top4To10Cut: 17140000, top11To15Cut: 14400000, top16To20Cut: 9600000, minContributionRequired: 1200000 },
];

export interface IFamilySupportRewardService {
  getAllRewards(): Promise<IFamilySupportRewardDocument[]>;
  getRewardByLevel(level: number): Promise<IFamilySupportRewardDocument>;
  updateRewardByLevel(
    level: number,
    data: Partial<IFamilySupportReward>,
  ): Promise<IFamilySupportRewardDocument>;
}

export class FamilySupportRewardService implements IFamilySupportRewardService {
  private repository: IFamilySupportRewardRepository =
    RepositoryProviders.familySupportRewardRepositoryProvider;

  static async bootstrap(): Promise<void> {
    const repo = RepositoryProviders.familySupportRewardRepositoryProvider;
    const existing = await repo.getAll();
    if (existing.length === 0) {
      await repo.seedIfEmpty(DEFAULT_FAMILY_SUPPORT_REWARDS);
      console.log("🌱 Family Support Rewards seeded in database from defaults.");
    }
  }

  async getAllRewards(): Promise<IFamilySupportRewardDocument[]> {
    return await this.repository.getAll();
  }

  async getRewardByLevel(level: number): Promise<IFamilySupportRewardDocument> {
    this.validateLevel(level);
    const reward = await this.repository.getByLevel(level);
    if (!reward) {
      throw new AppError(
        StatusCodes.NOT_FOUND,
        `Family support reward for level ${level} not found`,
      );
    }
    return reward;
  }

  async updateRewardByLevel(
    level: number,
    data: Partial<IFamilySupportReward>,
  ): Promise<IFamilySupportRewardDocument> {
    this.validateLevel(level);

    const allowedFields = [
      "targetPoints",
      "totalBonus",
      "leaderCut",
      "top1Cut",
      "top2Cut",
      "top3Cut",
      "top4To10Cut",
      "top11To15Cut",
      "top16To20Cut",
      "minContributionRequired",
    ];

    const updateData: Partial<IFamilySupportReward> = {};
    for (const field of allowedFields) {
      if (data[field as keyof IFamilySupportReward] !== undefined) {
        const value = data[field as keyof IFamilySupportReward] as number;
        if (typeof value !== "number" || value < 0) {
          throw new AppError(
            StatusCodes.BAD_REQUEST,
            `${field} must be a non-negative number`,
          );
        }
        (updateData as any)[field] = value;
      }
    }

    if (Object.keys(updateData).length === 0) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "No valid fields provided for update",
      );
    }

    const existing = await this.repository.getByLevel(level);
    if (!existing) {
      throw new AppError(
        StatusCodes.NOT_FOUND,
        `Family support reward for level ${level} not found`,
      );
    }

    const updated = await this.repository.updateByLevel(level, updateData);
    if (!updated) {
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to update family support reward",
      );
    }

    return updated;
  }

  private validateLevel(level: number): void {
    if (!Number.isInteger(level) || level < 1 || level > 10) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Level must be an integer between 1 and 10",
      );
    }
  }
}
