import { Request, Response } from "express";
import catchAsync from "../../core/Utils/catch_async";
import { IAudioRoomService } from "../../services/audio_room/audio_room_service";
import AppError from "../../core/errors/app_errors";
import {
  validateFieldExistance,
  validateNumber,
} from "../../core/Utils/helper_functions";
import sendResponse from "../../core/Utils/send_response";
import { ActivityZoneState } from "../../core/Utils/enums";
import { isValidObjectId } from "mongoose";

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
    const { password } = req.body;
    validateFieldExistance(roomId, "roomId");
    const result = await this.Service.joinAudioRoom(roomId, myUserId, password);
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

  removeFromSeat = catchAsync(async (req: Request, res: Response) => {
    const myUserId = req.user!.id;
    const { roomId, targetId, seatKey } = req.body;
    validateFieldExistance(roomId, "roomId");
    validateFieldExistance(targetId, "targetId");
    validateFieldExistance(seatKey, "seatKey");
    const result = await this.Service.removeFromSeat(
      myUserId,
      targetId,
      roomId,
      seatKey,
    );
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Audio seat removed successfully",
      result: result,
    });
  });

  muteUnmuteUser = catchAsync(async (req: Request, res: Response) => {
    const myUserId = req.user!.id;
    const { roomId, targetId } = req.params;
    validateFieldExistance(roomId, "roomId");
    validateFieldExistance(targetId, "targetId");
    const result = await this.Service.muteUnmuteUser(
      myUserId,
      targetId,
      roomId,
    );
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "User mute status updated successfully",
      result: result,
    });
  });

  leaveAudioRoom = catchAsync(async (req: Request, res: Response) => {
    const myUserId = req.user!.id;
    const roomId = req.params.roomId;
    validateFieldExistance(roomId, "roomId");
    const result = await this.Service.leaveAudioRoom(myUserId, roomId);
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Audio room left successfully",
      result: result,
    });
  });

  updateRoomTitle = catchAsync(async (req: Request, res: Response) => {
    const myUserId = req.user!.id;
    const { title } = req.body;
    const roomId = req.params.roomId;
    validateFieldExistance(roomId, "roomId");
    validateFieldExistance(title, "title");
    const result = await this.Service.updateRoomTitle(myUserId, roomId, title);
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Audio room title updated successfully",
      result: result,
    });
  });

  updateRoomAnnouncement = catchAsync(async (req: Request, res: Response) => {
    const myUserId = req.user!.id;
    const { announcement } = req.body;
    const roomId = req.params.roomId;
    validateFieldExistance(roomId, "roomId");
    validateFieldExistance(announcement, "announcement");
    const result = await this.Service.updateRoomAnnouncement(
      myUserId,
      roomId,
      announcement,
    );
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Audio room announcement updated successfully",
      result: result,
    });
  });

  sendRoomMessage = catchAsync(async (req: Request, res: Response) => {
    const myUserId = req.user!.id;
    const roomId = req.params.roomId;
    const { message } = req.body;
    validateFieldExistance(roomId, "roomId");
    validateFieldExistance(message, "message");
    const result = await this.Service.sendRoomWideMessage(
      myUserId,
      roomId,
      message,
    );
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Audio room message sent successfully",
      result: result,
    });
  });

  clearChatHistory = catchAsync(async (req: Request, res: Response) => {
    const myUserId = req.user!.id;
    const roomId = req.params.roomId;
    validateFieldExistance(roomId, "roomId");
    const result = await this.Service.clearChat(myUserId, roomId);
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Audio room chat history cleared successfully",
      result: result,
    });
  });

  getMyAudioRoom = catchAsync(async (req: Request, res: Response) => {
    const myUserId = req.user!.id;
    const result = await this.Service.getMyAudioRoom(myUserId);
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Audio rooms fetched successfully",
      result: result,
    });
  });

  searchAudioRoom = catchAsync(async (req: Request, res: Response) => {
    const search = req.params.shortId;
    validateNumber(search, "search");
    const result = await this.Service.searchAudioRoom(Number(search));
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Audio rooms fetched successfully",
      result: result,
    });
  });

  lockUnlockSeat = catchAsync(async (req: Request, res: Response) => {
    const myUserId = req.user!.id;
    const roomId = req.params.roomId;
    const seatKey = req.params.seatKey;
    validateFieldExistance(roomId, "roomId");
    validateFieldExistance(seatKey, "seatKey");
    const result = await this.Service.lockUnlockSeat(myUserId, roomId, seatKey);
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Seat lock status updated successfully",
      result: result,
    });
  });

  lockAllSeats = catchAsync(async (req: Request, res: Response) => {
    const myUserId = req.user!.id;
    const roomId = req.params.roomId;
    validateFieldExistance(roomId, "roomId");
    const result = await this.Service.lockAllSeats(myUserId, roomId);
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "All seats locked successfully",
      result: result,
    });
  });

  unlockAllSeats = catchAsync(async (req: Request, res: Response) => {
    const myUserId = req.user!.id;
    const roomId = req.params.roomId;
    validateFieldExistance(roomId, "roomId");
    const result = await this.Service.unlockAllSeats(myUserId, roomId);
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "All seats unlocked successfully",
      result: result,
    });
  });

  updateRoomPhoto = catchAsync(async (req: Request, res: Response) => {
    const myUserId = req.user!.id;
    const roomId = req.params.roomId;
    const { roomPhoto } = req.body;
    validateFieldExistance(roomId, "roomId");
    validateFieldExistance(roomPhoto, "roomPhoto");
    const result = await this.Service.updateRoomPhoto(
      myUserId,
      roomId,
      roomPhoto,
    );
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Audio room photo updated successfully",
      result: result,
    });
  });

  banUser = catchAsync(async (req: Request, res: Response) => {
    const myUserId = req.user!.id;
    const { roomId, targetId } = req.params;
    const { banType, bannedTill } = req.body;
    validateFieldExistance(roomId, "roomId");
    validateFieldExistance(targetId, "targetId");
    validateFieldExistance(banType, "banType");
    const result = await this.Service.banUser(
      myUserId,
      targetId,
      roomId,
      banType as ActivityZoneState,
      bannedTill,
    );
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "User banned successfully",
      result: result,
    });
  });

  unbanUser = catchAsync(async (req: Request, res: Response) => {
    const myUserId = req.user!.id;
    const { roomId, targetId } = req.params;
    validateFieldExistance(roomId, "roomId");
    validateFieldExistance(targetId, "targetId");
    const result = await this.Service.unbanUser(myUserId, targetId, roomId);
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "User unbanned successfully",
      result: result,
    });
  });

  updateRoomPassword = catchAsync(async (req: Request, res: Response) => {
    const myUserId = req.user!.id;
    const roomId = req.params.roomId;
    const { password } = req.body;
    validateFieldExistance(roomId, "roomId");
    if (password === undefined || password === null) {
      throw new AppError(400, "password is required");
    }
    const result = await this.Service.updateRoomPassword({
      myId: myUserId,
      roomId,
      password,
    });
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: password
        ? "Room locked successfully"
        : "Room unlocked successfully",
      result: result,
    });
  });

  updateSeatCount = catchAsync(async (req: Request, res: Response) => {
    const myUserId = req.user!.id;
    const roomId = req.params.roomId;
    const { seatCount } = req.body;
    validateFieldExistance(roomId, "roomId");
    validateNumber(seatCount, "seatCount");

    if (seatCount != 6 && seatCount != 8 && seatCount != 12) {
      throw new AppError(400, "Number of seats must be 6, 8 or 12");
    }

    const result = await this.Service.updateSeatCount(
      myUserId,
      roomId,
      seatCount,
    );
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Seat count updated successfully",
      result: result,
    });
  });

  setChatPrivacy = catchAsync(async (req: Request, res: Response) => {
    const myUserId = req.user!.id;
    const roomId = req.params.roomId;
    const { chatPrivacy } = req.body;
    validateFieldExistance(roomId, "roomId");
    if (!chatPrivacy) {
      throw new AppError(400, "chatPrivacy is required");
    }
    if (Array.isArray(chatPrivacy)) {
      const isValid = chatPrivacy.every((id) => isValidObjectId(id));
      if (!isValid) {
        throw new AppError(400, "Invalid user ids");
      }
    } else {
      if (chatPrivacy !== "any" && chatPrivacy !== "none") {
        throw new AppError(400, "Invalid chat privacy");
      }
    }
    const result = await this.Service.setChatPrivacy(
      myUserId,
      roomId,
      chatPrivacy,
    );
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Chat privacy updated successfully",
      result: result,
    });
  });
}
