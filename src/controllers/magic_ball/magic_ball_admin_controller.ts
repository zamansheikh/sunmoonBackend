import catchAsync from "../../core/Utils/catch_async";
import AppError from "../../core/errors/app_errors";
import { validateFieldExistance } from "../../core/Utils/helper_functions";
import { IMagicBallService } from "../../services/magic_ball/magic_ball_admin_service";

export class MagicBallAdminController {
  Service: IMagicBallService;
  constructor(service: IMagicBallService) {
    this.Service = service;
  }

  createMagicBall = catchAsync(async (req, res) => {
    const { category, logo, milestones } = req.body;
    validateFieldExistance(category, "category");
    validateFieldExistance(logo, "logo");
    validateFieldExistance(milestones, "milestones");
    for (let mil of milestones) {
      validateFieldExistance(mil.message, "message in milestone");
      validateFieldExistance(mil.rewardCoin, "rewardCoin in milestone");
      validateFieldExistance(mil.milestone, "milestone in milestone");
    }
    const result = await this.Service.createMagicBall({
      category,
      logo,
      milestones,
    });
    res.status(200).json({
      success: true,
      message: "Magic ball created successfully",
      data: result,
    });
  });

  getAllMagicBall = catchAsync(async (req, res) => {
    const result = await this.Service.getAllMagicBall();
    res.status(200).json({
      success: true,
      message: "Magic ball fetched successfully",
      data: result,
    });
  });

  updateMagicBall = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { category, logo, milestones } = req.body;
    
    validateFieldExistance(category, "category");
    validateFieldExistance(logo, "logo");
    validateFieldExistance(milestones, "milestones");
    for (let mil of milestones) {
      validateFieldExistance(mil.message, "message in milestone");
      validateFieldExistance(mil.rewardCoin, "rewardCoin in milestone");
      validateFieldExistance(mil.milestone, "milestone in milestone");
    }

    const result = await this.Service.updateMagicBall(id, {
      category,
      logo,
      milestones,
    });
    res.status(200).json({
      success: true,
      message: "Magic ball updated successfully",
      data: result,
    });
  });

  deleteMagicBall = catchAsync(async (req, res) => {
    const { id } = req.params;
    validateFieldExistance(id, "id");
    const result = await this.Service.deleteMagicBall(id);
    res.status(200).json({
      success: true,
      message: "Magic ball deleted successfully",
      data: result,
    });
  });

  deleteMagicBallByCategory = catchAsync(async (req, res) => {
    const { category } = req.params;
    validateFieldExistance(category, "category");
    const result = await this.Service.deleteMagicBallByCategory(category);
    res.status(200).json({
      success: true,
      message: "Magic ball deleted successfully",
      data: result,
    });
  });
}
