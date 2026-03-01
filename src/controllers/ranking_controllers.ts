import { Request, Response } from "express";
import catchAsync from "../core/Utils/catch_async";
import { IRankingService } from "../services/ranking/ranking_service";
import { RankingPeriods } from "../core/Utils/enums";
import AppError from "../core/errors/app_errors";
import { sendResponseEnhanced } from "../core/Utils/send_response";

export class RankingController {
  Service: IRankingService;
  constructor(service: IRankingService) {
    this.Service = service;
  }

  getSenderRanking = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.user!;
    const { period } = req.query;
    if (
      !period ||
      !Object.values(RankingPeriods).includes(period as RankingPeriods)
    ) {
      throw new AppError(
        400,
        "Period is required in the params and must be one of daily, weekly, monthly",
      );
    }
    const senderRanking = await this.Service.getSenderRanking(
      id,
      period as RankingPeriods,
    );
    sendResponseEnhanced(res, senderRanking);
  });

  getReceiverRanking = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.user!;
    const { period } = req.query;
    if (
      !period ||
      !Object.values(RankingPeriods).includes(period as RankingPeriods)
    ) {
      throw new AppError(
        400,
        "Period is required in the params and must be one of daily, weekly, monthly",
      );
    }
    const receiverRanking = await this.Service.getReceiverRanking(
      id,
      period as RankingPeriods,
    );
    sendResponseEnhanced(res, receiverRanking);
  });

  getRoomRanking = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.user!;
    const { period } = req.query;
    if (
      !period ||
      !Object.values(RankingPeriods).includes(period as RankingPeriods)
    ) {
      throw new AppError(
        400,
        "Period is required in the params and must be one of daily, weekly, monthly",
      );
    }
    const roomRanking = await this.Service.getRoomRanking(
      id,
      period as RankingPeriods,
    );
    sendResponseEnhanced(res, roomRanking);
  });
}
