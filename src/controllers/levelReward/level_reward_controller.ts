import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import catchAsync from "../../core/Utils/catch_async";
import sendResponse from "../../core/Utils/send_response";
import { ILevelRewardService } from "../../services/levelReward/level_reward_service";

export default class LevelRewardController {
  LevelRewardService: ILevelRewardService;

  constructor(LevelRewardService: ILevelRewardService) {
    this.LevelRewardService = LevelRewardService;
  }

  createConfig = catchAsync(async (req: Request, res: Response) => {
    const { level, coinReward } = req.body;

    if (level === undefined || coinReward === undefined) {
      throw new AppError(StatusCodes.BAD_REQUEST, "level and coinReward are required");
    }

    const config = await this.LevelRewardService.createConfig(Number(level), Number(coinReward));

    sendResponse(res, {
      statusCode: StatusCodes.CREATED,
      success: true,
      result: config,
      message: "Level reward config created successfully",
    });
  });

  getAllConfigs = catchAsync(async (req: Request, res: Response) => {
    const configs = await this.LevelRewardService.getAllConfigs();
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: configs,
      message: "Level reward configs retrieved successfully",
    });
  });

  getConfigById = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const config = await this.LevelRewardService.getConfigById(id);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: config,
      message: "Level reward config retrieved successfully",
    });
  });

  updateConfig = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { level, coinReward } = req.body;

    const data: Partial<{ level: number; coinReward: number }> = {};
    if (level !== undefined) data.level = Number(level);
    if (coinReward !== undefined) data.coinReward = Number(coinReward);

    if (Object.keys(data).length === 0) {
      throw new AppError(StatusCodes.BAD_REQUEST, "At least one field (level, coinReward) is required");
    }

    const config = await this.LevelRewardService.updateConfig(id, data);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: config,
      message: "Level reward config updated successfully",
    });
  });

  deleteConfig = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const config = await this.LevelRewardService.deleteConfig(id);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: config,
      message: "Level reward config deleted successfully",
    });
  });

  claimReward = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { level } = req.params;

    if (!level) {
      throw new AppError(StatusCodes.BAD_REQUEST, "level is required");
    }

    const result = await this.LevelRewardService.claimReward(userId, Number(level));

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: result,
      message: result.message,
    });
  });
}
