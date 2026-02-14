import { Request, Response } from "express";
import catchAsync from "../../core/Utils/catch_async";
import { IAudioRoomService } from "../../services/audio_room/audio_room_service";
import AppError from "../../core/errors/app_errors";
import {
  validateFieldExistance,
  validateNumber,
} from "../../core/Utils/helper_functions";
import sendResponse from "../../core/Utils/send_response";

export class AudioRoomController {
  Service: IAudioRoomService;
  constructor(Service: IAudioRoomService) {
    this.Service = Service;
  }

  createAudioRoom = catchAsync(async (req: Request, res: Response) => {
    const myUserId = req.user!.id;
    const { roomId, title, numberOfSeats, announcement, roomPhoto } = req.body;
    validateFieldExistance(roomId, "roomId");
    validateFieldExistance(title, "title");
    validateNumber(numberOfSeats, "numberOfSeats");
    if (numberOfSeats != 6 && numberOfSeats != 8 && numberOfSeats != 12)
      throw new AppError(400, "Number of seats must be 6, 8 or 12");
    const result = await this.Service.createAudioRoom({
      roomId,
      title,
      numberOfSeats,
      announcement,
      roomPhoto,
      hostId: myUserId,
    });
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Audio room created successfully",
      result: result,
    });
  });

  getAudioRoomById = catchAsync(async (req: Request, res: Response) => {
    const roomId = req.params.roomId;
    validateFieldExistance(roomId, "roomId");
    const result = await this.Service.getAudioRoomById(roomId);
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Audio room fetched successfully",
      result: result,
    });
  });

  getAllAudioRooms = catchAsync(async (req: Request, res: Response) => {
    const result = await this.Service.getAllAudioRooms();
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Audio rooms fetched successfully",
      result: result,
    });
  });

  joinAudioRoom = catchAsync(async (req: Request, res: Response) => {
    const myUserId = req.user!.id;
    const roomId = req.params.roomId;
    validateFieldExistance(roomId, "roomId");
    const result = await this.Service.joinAudioRoom(roomId, myUserId);
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Audio room joined successfully",
      result: result,
    });
  });

  joinAudioSeat = catchAsync(async (req: Request, res: Response) => {
    const myUserId = req.user!.id;
    const roomId = req.params.roomId;
    const seatKey = req.params.seatKey;
    validateFieldExistance(roomId, "roomId");
    validateFieldExistance(seatKey, "seatKey");
    const result = await this.Service.joinAudioSeat(myUserId, roomId, seatKey);
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Audio seat joined successfully",
      result: result,
    });
  });

  leaveAudioSeat = catchAsync(async (req: Request, res: Response) => {
    const myUserId = req.user!.id;
    const roomId = req.params.roomId;
    const seatKey = req.params.seatKey;
    validateFieldExistance(roomId, "roomId");
    validateFieldExistance(seatKey, "seatKey");
    const result = await this.Service.leaveAudioSeat(myUserId, roomId, seatKey);
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Audio seat left successfully",
      result: result,
    });
  });

  createAdmin = catchAsync(async (req: Request, res: Response) => {
    const myUserId = req.user!.id;
    const roomId = req.params.roomId;
    const targetId = req.params.targetId;
    validateFieldExistance(roomId, "roomId");
    validateFieldExistance(targetId, "targetId");
    const result = await this.Service.makeAudioAdmin(
      myUserId,
      targetId,
      roomId,
    );
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Audio admin created successfully",
      result: result,
    });
  });

  removeAdmin = catchAsync(async (req: Request, res: Response) => {
    const myUserId = req.user!.id;
    const roomId = req.params.roomId;
    const targetId = req.params.targetId;
    validateFieldExistance(roomId, "roomId");
    validateFieldExistance(targetId, "targetId");
    const result = await this.Service.removeAudioAdmin(
      myUserId,
      targetId,
      roomId,
    );
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Audio admin removed successfully",
      result: result,
    });
  });
}
