import { Request, Response } from "express";
import { IMagicBallHostService } from "../services/magic_ball/magic_ball_host_service";
import catchAsync from "../core/Utils/catch_async";
import sendResponse from "../core/Utils/send_response";

export class MagicBallHostController {
  service: IMagicBallHostService;
  constructor(service: IMagicBallHostService) {
    this.service = service;
  }

  getAllMagicBall = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const result = await this.service.getAllMagicBall(userId);

    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Magic Ball data fetched successfully",
      result: result,
    });
  });
}
