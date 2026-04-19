import { Request, Response } from "express";
import catchAsync from "../../core/Utils/catch_async";
import CoinBagService from "../../services/audio_room/coin_bag_service";
import sendResponse from "../../core/Utils/send_response";
import {
  validateArray,
  validateNumberArray,
} from "../../dtos/sotre/store_validators";

export class CoinBagController {
  private service = CoinBagService.getInstance();

  getCoinBagOptions = catchAsync(async (req: Request, res: Response) => {
    const result = await this.service.getCoinBagOptions();
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Coin bag options fetched successfully",
      result: result,
    });
  });

  createCoinBagOptions = catchAsync(async (req: Request, res: Response) => {
    const { coinOptions, userCountOptions } = req.body;
    validateNumberArray(coinOptions, "coinOptions");
    validateNumberArray(userCountOptions, "userCountOptions");
    const result = await this.service.createCoinBagOptions({
      coinOptions,
      userCountOptions,
    });
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Coin bag options created successfully",
      result: result,
    });
  });

  updateCoinBagOptions = catchAsync(async (req: Request, res: Response) => {
    const { coinOptions, userCountOptions } = req.body;
    if (coinOptions) validateNumberArray(coinOptions, "coinOptions");
    if (userCountOptions)
      validateNumberArray(userCountOptions, "userCountOptions");
    const result = await this.service.updateCoinBagOptions({
      coinOptions,
      userCountOptions,
    });
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Coin bag options updated successfully",
      result: result,
    });
  });

  sendCoinBagToRoom = catchAsync(async (req: Request, res: Response) => {
    const { coinAmount, userCount, roomId } = req.body;
    const senderId = req.user!.id;
    await this.service.sendCoinBagToRoom(coinAmount, userCount, roomId, senderId);
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Coin bag sent to room successfully",
    });
  });

  getCoinBagStatus = catchAsync(async (req: Request, res: Response) => {
    const { roomId } = req.params;
    const result = await this.service.getCoinBagStatus(roomId);
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Coin bag status fetched successfully",
      result: result,
    });
  });

  claimCoinBag = catchAsync(async (req: Request, res: Response) => {
    const { roomId } = req.body;
    const userId = req.user!.id;
    const result = await this.service.claimCoinBag(roomId, userId);
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Coin bag claimed successfully",
      result: result,
    });
  });

  getClaimedUsers = catchAsync(async (req: Request, res: Response) => {
    const { roomId } = req.params;
    const result = await this.service.getClaimedUsers(roomId);
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Claimed users fetched successfully",
      result: result,
    });
  });
}
