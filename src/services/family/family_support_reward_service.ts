import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import { RepositoryProviders } from "../../core/providers/repository_providers";
import {
  IFamilySupportReward,
  IFamilySupportRewardDocument,
} from "../../models/family/family_support_reward_model";
import { IFamilySupportRewardRepository } from "../../repository/family/family_support_reward_repository";

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
