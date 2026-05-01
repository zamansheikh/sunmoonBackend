import { Request, Response } from "express";
import catchAsync from "../../core/Utils/catch_async";
import sendResponse from "../../core/Utils/send_response";
import AppError from "../../core/errors/app_errors";
import { StatusCodes } from "http-status-codes";
import {
  validateFieldExistance,
  validateNumber,
} from "../../core/Utils/helper_functions";
import { IFamilyRewardService } from "../../services/family/family_reward_services";
import { IFamilyRewardConfig } from "../../models/family/family_reward_model";

interface IFamilyRewardConfigInput extends Partial<IFamilyRewardConfig> {
  rank?: number;
}

export default class FamilyRewardController {
  private service: IFamilyRewardService;

  constructor(service: IFamilyRewardService) {
    this.service = service;
  }

  /** Create a new reward configuration */
  createReward = catchAsync(async (req: Request, res: Response) => {
    const data = req.body as IFamilyRewardConfigInput;

    // Basic presence validation
    validateFieldExistance(data.items, "items");
    validateFieldExistance(data.starRating, "starRating");
    validateFieldExistance(data.label, "label");

    // Items validation – must be an array of objects with itemId
    if (!Array.isArray(data.items) || data.items.length === 0) {
      throw new AppError(StatusCodes.BAD_REQUEST, "items must be a non-empty array");
    }

    data.items.forEach((itm, idx) => {
      if (!itm.itemId) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          `items[${idx}].itemId is required`,
        );
      }
      if (itm.duration !== undefined) {
        validateNumber(itm.duration, `items[${idx}].duration`);
      }
    });

    // Rank handling – either rank or startRank/endRank must be provided
    if (
      data.rank === undefined &&
      (data.startRank === undefined || data.endRank === undefined)
    ) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Provide either 'rank' or both 'startRank' and 'endRank'",
      );
    }

    if (data.rank !== undefined) {
      validateNumber(data.rank, "rank");
    } else {
      validateNumber(data.startRank!, "startRank");
      validateNumber(data.endRank!, "endRank");
    }

    const created = await this.service.createRewardConfig({
      rank: data.rank,
      startRank: data.startRank,
      endRank: data.endRank,
      items: data.items,
      starRating: data.starRating!,
      label: data.label!,
    });

    sendResponse(res, {
      statusCode: StatusCodes.CREATED,
      success: true,
      result: created,
      message: "Reward configuration created",
    });
  });

  /** Get all reward configs for admin panel */
  getAllRewards = catchAsync(async (_req: Request, res: Response) => {
    const configs = await this.service.getAdminRewardConfigs();
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: configs,
    });
  });

  /** Update an existing reward config */
  updateReward = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const data = req.body as IFamilyRewardConfigInput;

    // If items are provided, validate the same way as in create
    if (data.items !== undefined) {
      if (!Array.isArray(data.items)) {
        throw new AppError(StatusCodes.BAD_REQUEST, "items must be an array");
      }
      data.items.forEach((itm, idx) => {
        if (!itm.itemId) {
          throw new AppError(
            StatusCodes.BAD_REQUEST,
            `items[${idx}].itemId is required`,
          );
        }
        if (itm.duration !== undefined) {
          validateNumber(itm.duration, `items[${idx}].duration`);
        }
      });
    }

    // Rank validation – optional but if any rank fields appear they must be numbers
    if (data.rank !== undefined) validateNumber(data.rank, "rank");
    if (data.startRank !== undefined) validateNumber(data.startRank, "startRank");
    if (data.endRank !== undefined) validateNumber(data.endRank, "endRank");

    if (data.starRating !== undefined) validateNumber(data.starRating, "starRating");
    if (data.label !== undefined) validateFieldExistance(data.label, "label");

    const updated = await this.service.updateRewardConfig(id, {
      rank: data.rank,
      startRank: data.startRank,
      endRank: data.endRank,
      items: data.items,
      starRating: data.starRating,
      label: data.label,
    });

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: updated,
      message: "Reward configuration updated",
    });
  });

  /** Delete a reward config */
  deleteReward = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const deleted = await this.service.deleteRewardConfig(id);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: deleted,
      message: "Reward configuration deleted",
    });
  });

  /** Public endpoint for the app to list rewards */
  getRewardList = catchAsync(async (_req: Request, res: Response) => {
    const list = await this.service.getPublicRewardDisplay();
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: list,
    });
  });
}

