import { Request, Response } from "express";
import catchAsync from "../core/Utils/catch_async";
import { IFamilyService } from "../services/family/family_service";
import { StatusCodes } from "http-status-codes";
import sendResponse from "../core/Utils/send_response";
import {
  validateEnum,
  validateFieldExistance,
  validateNumber,
} from "../core/Utils/helper_functions";
import { FamilyJoinMode } from "../core/Utils/enums";
import { IFamily } from "../models/family/family_model";

export default class FamilyController {
  Service: IFamilyService;
  constructor(service: IFamilyService) {
    this.Service = service;
  }

  createFamily = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.user!;

    const { name, introduction, joinMode, minLevel, memberLimit, coverPhoto } =
      req.body;

    validateFieldExistance(name, "name");
    validateFieldExistance(introduction, "introduction");
    validateFieldExistance(joinMode, "joinMode");
    if (joinMode) {
      validateEnum(joinMode, FamilyJoinMode, "joinMode");
    }
    const familyObject: IFamily = {
      name,
      introduction,
      coverPhoto,
      joinMode,
      minLevel,
      leaderId: id,
      memberCount: 1,
      memberLimit,
      totalGifts: 0,
      lastUpdatedAt: new Date(),
      lastEmptyAt: new Date(),
    };
    const family = await this.Service.createFamily(familyObject);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: family,
      message: "Family created successfully",
    });
  });
}
