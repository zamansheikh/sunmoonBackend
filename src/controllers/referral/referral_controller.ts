import { Request, Response } from "express";
import { ReferralService } from "../../services/referral/referral_service";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../core/Utils/catch_async";
import sendResponse from "../../core/Utils/send_response";
import {
  validateReferralConfig,
  validateReferralConfigUpdate,
} from "../../core/Utils/helper_functions";

class ReferralController {
  private referralService: ReferralService;

  constructor(referralService: ReferralService) {
    this.referralService = referralService;
  }

  createOrUpdateConfig = catchAsync(async (req: Request, res: Response) => {
    validateReferralConfig(req.body);
    const configData = req.body;
    const config = await this.referralService.createOrUpdateConfig(configData);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: config,
      message: "Referral configuration saved successfully.",
    });
  });

  getConfig = catchAsync(async (req: Request, res: Response) => {
    const config = await this.referralService.getConfig();
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: config,
      message: "Referral configuration retrieved successfully.",
    });
  });

  updateConfig = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    validateReferralConfigUpdate(req.body);
    const config = await this.referralService.updateConfig(id, req.body);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: config,
      message: "Referral configuration updated successfully.",
    });
  });

  deleteConfig = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.referralService.deleteConfig(id);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: null,
      message: "Referral configuration deleted successfully.",
    });
  });

  getReferralDashboard = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any).id;
    const dashboardData = await this.referralService.getReferralDashboard(userId);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: dashboardData,
      message: "Referral dashboard data retrieved successfully.",
    });
  });

  requestWithdrawal = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any).id;
    const withdrawal = await this.referralService.requestWithdrawal(userId);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: withdrawal,
      message: "Referral balance successfully transferred to main wallet.",
    });
  });
}

export default ReferralController;
