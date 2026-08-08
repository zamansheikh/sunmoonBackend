import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import AppError from "../../core/errors/app_errors";
import UserModel from "../../models/user/user_model";
import UserStatsRepository from "../../repository/users/userstats_repository";
import UserStats from "../../models/userstats/userstats_model";
import { ILevelRewardConfigRepository } from "../../repository/levelReward/level_reward_config_repository";
import { ILevelRewardClaimRepository } from "../../repository/levelReward/level_reward_claim_repository";
import { ILevelRewardConfigDocument } from "../../models/levelReward/level_reward_config_model";

const userStatsRepository = new UserStatsRepository(UserStats);

export interface ILevelRewardService {
  createConfig(level: number, coinReward: number): Promise<ILevelRewardConfigDocument>;
  getAllConfigs(): Promise<ILevelRewardConfigDocument[]>;
  getConfigById(id: string): Promise<ILevelRewardConfigDocument>;
  updateConfig(id: string, data: Partial<{ level: number; coinReward: number }>): Promise<ILevelRewardConfigDocument>;
  deleteConfig(id: string): Promise<ILevelRewardConfigDocument>;
  claimReward(userId: string, level: number): Promise<{ message: string; balance: number }>;
}

export default class LevelRewardService implements ILevelRewardService {
  ConfigRepository: ILevelRewardConfigRepository;
  ClaimRepository: ILevelRewardClaimRepository;

  constructor(
    ConfigRepository: ILevelRewardConfigRepository,
    ClaimRepository: ILevelRewardClaimRepository,
  ) {
    this.ConfigRepository = ConfigRepository;
    this.ClaimRepository = ClaimRepository;
  }

  async createConfig(level: number, coinReward: number): Promise<ILevelRewardConfigDocument> {
    const existing = await this.ConfigRepository.findByLevel(level);
    if (existing) {
      throw new AppError(StatusCodes.CONFLICT, `Reward config for level ${level} already exists`);
    }
    return await this.ConfigRepository.create({ level, coinReward });
  }

  async getAllConfigs(): Promise<ILevelRewardConfigDocument[]> {
    return await this.ConfigRepository.findAll();
  }

  async getConfigById(id: string): Promise<ILevelRewardConfigDocument> {
    const config = await this.ConfigRepository.findById(id);
    if (!config) throw new AppError(StatusCodes.NOT_FOUND, "Level reward config not found");
    return config;
  }

  async updateConfig(
    id: string,
    data: Partial<{ level: number; coinReward: number }>,
  ): Promise<ILevelRewardConfigDocument> {
    const existing = await this.ConfigRepository.findById(id);
    if (!existing) throw new AppError(StatusCodes.NOT_FOUND, "Level reward config not found");

    if (data.level !== undefined && data.level !== existing.level) {
      const conflict = await this.ConfigRepository.findByLevel(data.level);
      if (conflict) {
        throw new AppError(StatusCodes.CONFLICT, `Reward config for level ${data.level} already exists`);
      }
    }

    return await this.ConfigRepository.update(id, data);
  }

  async deleteConfig(id: string): Promise<ILevelRewardConfigDocument> {
    return await this.ConfigRepository.delete(id);
  }

  async claimReward(userId: string, level: number): Promise<{ message: string; balance: number }> {
    const config = await this.ConfigRepository.findByLevel(level);
    if (!config) {
      throw new AppError(StatusCodes.NOT_FOUND, `No reward config found for level ${level}`);
    }

    const user = await UserModel.findById(userId).select("level");
    if (!user) {
      throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    }

    if ((user.level ?? 0) < level) {
      throw new AppError(StatusCodes.BAD_REQUEST, "You have not reached this level");
    }

    const existingClaim = await this.ClaimRepository.findByUserAndLevel(userId, level);
    if (existingClaim) {
      throw new AppError(StatusCodes.CONFLICT, "Already claimed");
    }

    await this.ClaimRepository.create({
      userId: user._id as mongoose.Types.ObjectId,
      level,
      claimedAt: new Date(),
    });

    const updatedStats = await userStatsRepository.updateCoins(userId, config.coinReward);

    return {
      message: "Reward claimed successfully",
      balance: updatedStats.coins ?? 0,
    };
  }
}
