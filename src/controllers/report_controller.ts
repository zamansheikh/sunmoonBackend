import { Request, Response } from "express";
import catchAsync from "../core/Utils/catch_async";
import { sendResponseEnhanced } from "../core/Utils/send_response";
import Report from "../models/reports/report_model";
import AppError from "../core/errors/app_errors";

/// POST /api/reports
/// Creates a new user report (Google Play UGC moderation — Issue #10).
/// Duplicate reports from the same reporter for the same session are silently
/// accepted (idempotent) to avoid noisy error handling on the client.
export const createReport = catchAsync(
  async (req: Request, res: Response) => {
    const { reportedUserId, type, reason, streamId, roomId } = req.body;
    const reporterId = req.user!.id;

    if (!reportedUserId || !type || !reason) {
      throw new AppError(400, "reportedUserId, type, and reason are required");
    }

    if (reporterId === reportedUserId) {
      throw new AppError(400, "You cannot report yourself");
    }

    // Idempotency: check for a duplicate report in the same stream / room
    const duplicateQuery: Record<string, unknown> = {
      reporterId,
      reportedUserId,
    };
    if (streamId) duplicateQuery.streamId = streamId;
    if (roomId) duplicateQuery.roomId = roomId;

    const existing = await Report.findOne(duplicateQuery);
    if (existing) {
      // Already reported — return silently so the client sees success
      return sendResponseEnhanced(res, existing);
    }

    const report = await Report.create({
      reporterId,
      reportedUserId,
      type,
      reason,
      ...(streamId ? { streamId } : {}),
      ...(roomId ? { roomId } : {}),
    });

    sendResponseEnhanced(res, report);
  }
);
