import { Request, Response } from "express";
import catchAsync from "../../core/Utils/catch_async";
import sendResponse from "../../core/Utils/send_response";
import CoinBagDistributionService from "../../services/audio_room/coin_bag_distribution_service";
import {
  validateCreateCoinBagDistribution,
  validateUpdateCoinBagDistribution,
} from "../../dtos/audio_room/coin_bag_distribution_validators";
import AppError from "../../core/errors/app_errors";

export class CoinBagDistributionController {
  private service = CoinBagDistributionService.getInstance();

  create = catchAsync(async (req: Request, res: Response) => {
    const data = validateCreateCoinBagDistribution(req.body);
    const result = await this.service.create(data);
    sendResponse(res, {
      success: true,
      statusCode: 201,
      message: "Coin bag distribution created successfully",
      result,
    });
  });

  getAll = catchAsync(async (_req: Request, res: Response) => {
    const result = await this.service.getAll();
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Coin bag distributions fetched successfully",
      result,
    });
  });

  getByType = catchAsync(async (req: Request, res: Response) => {
    const type = Number(req.params.type);
    if (isNaN(type) || type < 0) {
      throw new AppError(400, "type param must be a valid non-negative number");
    }
    const result = await this.service.getByType(type);
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Coin bag distribution fetched successfully",
      result,
    });
  });

  getById = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
      throw new AppError(400, "id param is required");
    }
    const result = await this.service.getById(id);
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Coin bag distribution fetched successfully",
      result,
    });
  });

  update = catchAsync(async (req: Request, res: Response) => {
    const data = validateUpdateCoinBagDistribution(req.body);
    const result = await this.service.update(data);
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Coin bag distribution updated successfully",
      result,
    });
  });
}
