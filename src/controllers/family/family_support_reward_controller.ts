import { Request, Response } from "express";
import catchAsync from "../../core/Utils/catch_async";
import sendResponse from "../../core/Utils/send_response";
import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import { validateNumber } from "../../core/Utils/helper_functions";
import { IFamilySupportRewardService } from "../../services/family/family_support_reward_service";
import { IFamilySupportReward } from "../../models/family/family_support_reward_model";

export default class FamilySupportRewardController {
  private service: IFamilySupportRewardService;

  constructor(service: IFamilySupportRewardService) {
    this.service = service;
  }

  getAllRewards = catchAsync(async (_req: Request, res: Response) => {
    const rewards = await this.service.getAllRewards();
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: rewards,
      message: "Family support rewards fetched successfully",
    });
  });

  getRewardByLevel = catchAsync(async (req: Request, res: Response) => {
    const level = parseInt(req.params.level, 10);
    const reward = await this.service.getRewardByLevel(level);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: reward,
      message: "Family support reward fetched successfully",
    });
  });

  updateRewardByLevel = catchAsync(async (req: Request, res: Response) => {
    const level = parseInt(req.params.level, 10);
    if (isNaN(level) || level < 1 || level > 10) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Level must be an integer between 1 and 10",
      );
    }

    const {
      targetPoints,
      totalBonus,
      leaderCut,
      top1Cut,
      top2Cut,
      top3Cut,
      top4To10Cut,
      top11To15Cut,
      top16To20Cut,
      minContributionRequired,
    } = req.body;

    if (targetPoints !== undefined) validateNumber(targetPoints, "targetPoints");
    if (totalBonus !== undefined) validateNumber(totalBonus, "totalBonus");
    if (leaderCut !== undefined) validateNumber(leaderCut, "leaderCut");
    if (top1Cut !== undefined) validateNumber(top1Cut, "top1Cut");
    if (top2Cut !== undefined) validateNumber(top2Cut, "top2Cut");
    if (top3Cut !== undefined) validateNumber(top3Cut, "top3Cut");
    if (top4To10Cut !== undefined) validateNumber(top4To10Cut, "top4To10Cut");
    if (top11To15Cut !== undefined)
      validateNumber(top11To15Cut, "top11To15Cut");
    if (top16To20Cut !== undefined)
      validateNumber(top16To20Cut, "top16To20Cut");
    if (minContributionRequired !== undefined)
      validateNumber(minContributionRequired, "minContributionRequired");

    if (Object.keys(req.body).length === 0) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "No fields provided for update",
      );
    }

    const updated = await this.service.updateRewardByLevel(level, req.body);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: updated,
      message: "Family support reward updated successfully",
    });
  });
}
