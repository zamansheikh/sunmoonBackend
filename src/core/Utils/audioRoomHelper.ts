import { StatusCodes } from "http-status-codes";
import AppError from "../errors/app_errors";
import { IAudioRoomDocument } from "../../models/audio_room/audio_room_model";

//  singleton class for AudioRoom Helper functionality
export class AudioRoomHelper {
  private static instance: AudioRoomHelper;

  private constructor() {}

  public static getInstance(): AudioRoomHelper {
    if (!AudioRoomHelper.instance) {
      AudioRoomHelper.instance = new AudioRoomHelper();
    }
    return AudioRoomHelper.instance;
  }

  public checkAuthorityInAudioRoom(
    myId: string,
    room: IAudioRoomDocument,
    authorityLevel: number,
    targetId?: string,
  ): void {
    /**
     * myId -> who is taking action, usually taken from token
     * authorityLevel -> authority level of the myId
     * 0 -> host
     * 1 -> admin
     * room -> the current Audio room, where the action is taking place
     */
    if (room.hostId.toString() === myId) return;
    if (
      authorityLevel === 1 &&
      room.admins.some((admin) => admin.toString() === myId) &&
      targetId &&
      targetId != room.hostId.toString() &&
      !room.admins.some((admin) => admin.toString() === targetId)
    )
      return;
    throw new AppError(
      StatusCodes.FORBIDDEN,
      "You are not authorized to take this action",
    );
  }

  public checkUserOnSeat(targetId: string, room: IAudioRoomDocument): void {

    // Check host seat
    if (room.hostSeat?.member?._id?.toString() === targetId) return;

    // Check other seats
    for (const seat of room.seats.values()) {
      if (seat.member?._id?.toString() === targetId) return;
    }

    throw new AppError(StatusCodes.FORBIDDEN, "You are not on a seat");
  }
}
