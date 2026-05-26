import { Request, Response } from "express";
import catchAsync from "../core/Utils/catch_async";
import sendResponse from "../core/Utils/send_response";
import { StatusCodes } from "http-status-codes";
import { IAppResellerService } from "../services/app_reseller/app_reseller_service";
import { UserRoles } from "../core/Utils/enums";
import AppError from "../core/errors/app_errors";

export default class AppResellerController {
  Service: IAppResellerService;

  constructor(service: IAppResellerService) {
    this.Service = service;
  }

  updateUserRole = catchAsync(async (req: Request, res: Response) => {
    const { userId, role } = req.body;

    if (!userId) {
      throw new AppError(StatusCodes.BAD_REQUEST, "userId is required");
    }

    if (!role) {
      throw new AppError(StatusCodes.BAD_REQUEST, "role is required");
    }

    // Validate the role value against allowed roles
    if (![UserRoles.User, UserRoles.Reseller].includes(role as UserRoles)) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `Invalid role. Allowed values: "${UserRoles.User}" or "${UserRoles.Reseller}"`,
      );
    }

    const result = await this.Service.updateUserRole(userId, role as UserRoles);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: [result],
      message: `User role updated successfully to "${role}"`,
    });
  });
}
