import { Request, Response } from "express";
import { IRoomLevelCriteriaService } from "../../services/audio_room/room_level_criteria_service";
import catchAsync from "../../core/Utils/catch_async";

/**
 * Controller for managing Audio Room Level Criteria (Admin only).
 * Handles HTTP requests and delegates business logic to the RoomLevelCriteriaService.
 */
export class RoomLevelCriteriaController {
  private service: IRoomLevelCriteriaService;

  constructor(service: IRoomLevelCriteriaService) {
    this.service = service;
  }

  /**
   * GET /admin/room-level-criteria
   * Retrieves all room level criteria documents.
   */
  getAllLevels = catchAsync(async (req: Request, res: Response) => {
    const levels = await this.service.getAllLevels();
    res.status(200).json({
      status: "success",
      data: levels,
    });
  });

  /**
   * POST /admin/room-level-criteria
   * Creates or updates a level configuration based on the provided body.
   */
  upsertLevel = catchAsync(async (req: Request, res: Response) => {
    // Expecting 'level' in the body along with other criteria fields
    const { level, ...data } = req.body;
    const result = await this.service.upsertLevel(Number(level), data);
    res.status(200).json({
      status: "success",
      data: result,
    });
  });

  /**
   * DELETE /admin/room-level-criteria/:level
   * Removes a specific level configuration.
   */
  deleteLevel = catchAsync(async (req: Request, res: Response) => {
    const { level } = req.params;
    const result = await this.service.deleteLevel(Number(level));
    res.status(200).json({
      status: "success",
      data: result,
    });
  });
}
