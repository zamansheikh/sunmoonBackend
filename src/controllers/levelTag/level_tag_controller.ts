import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import catchAsync from "../../core/Utils/catch_async";
import sendResponse from "../../core/Utils/send_response";
import { ILevelTagService } from "../../services/levelTag/level_tag_service";

export default class LevelTagController {
  LevelTagService: ILevelTagService;

  constructor(LevelTagService: ILevelTagService) {
    this.LevelTagService = LevelTagService;
  }

  createLevelTag = catchAsync(async (req: Request, res: Response) => {
    const { level } = req.body;
    const files = req.files as { tagFile?: Express.Multer.File[] };
    const tagFile = files?.tagFile?.[0];

    if (!level) {
      throw new AppError(StatusCodes.BAD_REQUEST, "level is required");
    }
    if (!tagFile) {
      throw new AppError(StatusCodes.BAD_REQUEST, "tagFile is required");
    }

    const levelTag = await this.LevelTagService.createLevelTag(Number(level), tagFile);

    sendResponse(res, {
      statusCode: StatusCodes.CREATED,
      success: true,
      result: levelTag,
      message: "Level tag created successfully",
    });
  });

  getAllLevelTags = catchAsync(async (req: Request, res: Response) => {
    const levelTags = await this.LevelTagService.getAllLevelTags();
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: levelTags,
      message: "Level tags retrieved successfully",
    });
  });

  getLevelTagById = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const levelTag = await this.LevelTagService.getLevelTagById(id);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: levelTag,
      message: "Level tag retrieved successfully",
    });
  });

  updateLevelTag = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { level } = req.body;
    const files = req.files as { tagFile?: Express.Multer.File[] };
    const tagFile = files?.tagFile?.[0];

    const updateData: { level?: number } = {};
    if (level !== undefined) {
      updateData.level = Number(level);
    }

    const levelTag = await this.LevelTagService.updateLevelTag(id, updateData, tagFile);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      result: levelTag,
      message: "Level tag updated successfully",
    });
  });
}
