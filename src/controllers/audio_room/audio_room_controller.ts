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
    throw new AppError(500, "Something went wrong");
  });

  updateAudioRoom = catchAsync(async (req: Request, res: Response) => {
    throw new AppError(500, "Something went wrong");
  });

  deleteAudioRoom = catchAsync(async (req: Request, res: Response) => {
    throw new AppError(500, "Something went wrong");
  });

  getAllAudioRooms = catchAsync(async (req: Request, res: Response) => {
    throw new AppError(500, "Something went wrong");
  });
}
