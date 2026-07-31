import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import AppError from "../core/errors/app_errors";
import catchAsync from "../core/Utils/catch_async";
import { SvipConfigService } from "../services/admin/svip_config_service";
import { SvipService } from "../services/svip/svip_service";

export class SvipController {
  // ── Admin: get SVIP/VIP config ─────────────────────────────────────────
  getConfig = catchAsync(async (req: Request, res: Response) => {
    const config = await SvipConfigService.getConfig();
    res.status(StatusCodes.OK).json({
      status: "success",
      data: config,
    });
  });

  // ── Admin: update SVIP/VIP config ──────────────────────────────────────
  updateConfig = catchAsync(async (req: Request, res: Response) => {
    const { vipTiers, svipTiers, retentionThreshold, vipCategoryName, svipCategoryName } = req.body;

    const updateData: Record<string, any> = {};

    if (vipTiers !== undefined) {
      this.validateTiers(vipTiers, "vipTiers");
      updateData.vipTiers = vipTiers;
    }

    if (svipTiers !== undefined) {
      this.validateTiers(svipTiers, "svipTiers");
      updateData.svipTiers = svipTiers;
    }

    // Cross-validation: last VIP milestone must be < first SVIP milestone
    const effectiveVipTiers = updateData.vipTiers ?? (await SvipConfigService.getConfig())?.vipTiers;
    const effectiveSvipTiers = updateData.svipTiers ?? (await SvipConfigService.getConfig())?.svipTiers;

    if (
      effectiveVipTiers &&
      effectiveVipTiers.length > 0 &&
      effectiveSvipTiers &&
      effectiveSvipTiers.length > 0
    ) {
      const lastVip = effectiveVipTiers[effectiveVipTiers.length - 1];
      const firstSvip = effectiveSvipTiers[0];
      if (lastVip.milestoneCoins >= firstSvip.milestoneCoins) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          `Last VIP tier milestone (${lastVip.milestoneCoins}) must be less than first SVIP tier milestone (${firstSvip.milestoneCoins})`,
        );
      }
    }

    if (retentionThreshold !== undefined) {
      if (
        typeof retentionThreshold !== "number" ||
        retentionThreshold <= 0 ||
        retentionThreshold > 1
      ) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          "retentionThreshold must be a number between 0 and 1",
        );
      }
      updateData.retentionThreshold = retentionThreshold;
    }

    if (vipCategoryName !== undefined) {
      if (typeof vipCategoryName !== "string" || vipCategoryName.trim().length === 0) {
        throw new AppError(StatusCodes.BAD_REQUEST, "vipCategoryName must be a non-empty string");
      }
      updateData.vipCategoryName = vipCategoryName.trim();
    }

    if (svipCategoryName !== undefined) {
      if (typeof svipCategoryName !== "string" || svipCategoryName.trim().length === 0) {
        throw new AppError(StatusCodes.BAD_REQUEST, "svipCategoryName must be a non-empty string");
      }
      updateData.svipCategoryName = svipCategoryName.trim();
    }

    if (Object.keys(updateData).length === 0) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "At least one field is required (vipTiers, svipTiers, retentionThreshold, vipCategoryName, svipCategoryName)",
      );
    }

    const config = await SvipConfigService.updateConfig(updateData);
    res.status(StatusCodes.OK).json({
      status: "success",
      data: config,
    });
  });

  // ── User: get own premium status ────────────────────────────────────────
  getMySvipStatus = catchAsync(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id || (req as any).user?._id;
    if (!userId) {
      throw new AppError(StatusCodes.UNAUTHORIZED, "Authentication required");
    }
    const status = await SvipService.getUserStatus(userId);
    res.status(StatusCodes.OK).json({
      status: "success",
      data: status,
    });
  });

  // ── Admin: get any user's premium status ────────────────────────────────
  getUserSvipStatus = catchAsync(async (req: Request, res: Response) => {
    const { userId } = req.params;
    if (!userId) {
      throw new AppError(StatusCodes.BAD_REQUEST, "userId is required");
    }
    const status = await SvipService.getUserStatus(userId);
    res.status(StatusCodes.OK).json({
      status: "success",
      data: status,
    });
  });

  // ── Admin: list users by level ──────────────────────────────────────────
  getUsersByLevel = catchAsync(async (req: Request, res: Response) => {
    const level = Number(req.query.level);
    if (!level || level < 1) {
      throw new AppError(StatusCodes.BAD_REQUEST, "level is required and must be a positive number");
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const result = await SvipService.getUsersByLevel(level, page, limit);
    res.status(StatusCodes.OK).json({
      status: "success",
      data: result,
    });
  });

  // ── Validation helpers ──────────────────────────────────────────────────

  private validateTiers(tiers: any[], fieldName: string): void {
    if (!Array.isArray(tiers) || tiers.length === 0) {
      throw new AppError(StatusCodes.BAD_REQUEST, `${fieldName} must be a non-empty array`);
    }
    for (const t of tiers) {
      if (
        typeof t.tier !== "number" ||
        typeof t.milestoneCoins !== "number" ||
        t.tier < 1 ||
        t.milestoneCoins <= 0
      ) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          `Each tier in ${fieldName} must have a positive tier number and milestoneCoins`,
        );
      }
    }
    // Validate strictly ascending milestones
    for (let i = 1; i < tiers.length; i++) {
      if (tiers[i].milestoneCoins <= tiers[i - 1].milestoneCoins) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          `${fieldName} milestones must be strictly ascending: ` +
          `tier ${tiers[i - 1].tier} (${tiers[i - 1].milestoneCoins}) must be less than ` +
          `tier ${tiers[i].tier} (${tiers[i].milestoneCoins})`,
        );
      }
    }
  }
}
