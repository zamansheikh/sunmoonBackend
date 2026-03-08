import { Request, Response } from "express";
import catchAsync from "../core/Utils/catch_async";
import sendResponse from "../core/Utils/send_response";
import { IRoomSupportService } from "../services/audio_room/room_support_service";
import { validateFieldExistance } from "../core/Utils/helper_functions";

export class RoomSupportController {
  Service: IRoomSupportService;
  constructor(Service: IRoomSupportService) {
    this.Service = Service;
  }

  getMyRoomSupportDetails = catchAsync(async (req: Request, res: Response) => {
    const roomId = req.params.roomId;
    validateFieldExistance(roomId, "roomId");
    const result = await this.Service.getMyRoomSupportDetails(roomId);

    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Room support details fetched successfully",
      result: result,
    });
  });

  addRoomPartners = catchAsync(async (req: Request, res: Response) => {
    const { roomId, partnerId } = req.params;
    validateFieldExistance(roomId, "roomId");
    validateFieldExistance(partnerId, "partnerId");
    const result = await this.Service.addRoomPartners(roomId, partnerId);

    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Room partner added successfully",
      result: result,
    });
  });

  removeRoomPartners = catchAsync(async (req: Request, res: Response) => {
    const { roomId, partnerId } = req.params;
    validateFieldExistance(roomId, "roomId");
    validateFieldExistance(partnerId, "partnerId");
    const result = await this.Service.removeRoomPartners(roomId, partnerId);

    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Room partner removed successfully",
      result: result,
    });
  });

  getMyRoomPartners = catchAsync(async (req: Request, res: Response) => {
    const { roomId } = req.params;
    validateFieldExistance(roomId, "roomId");
    const result = await this.Service.getMyRoomPartners(roomId);

    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Room partners fetched successfully",
      result: result,
    });
  });
}
