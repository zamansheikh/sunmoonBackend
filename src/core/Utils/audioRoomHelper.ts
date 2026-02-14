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
    targetId: string,
    room: IAudioRoomDocument,
    authorityLevel: number,
  ): void {
    /**
     * targetId -> who is taking action, usually taken from token
     * authorityLevel -> authority level of the targetId
     * 0 -> host
     * 1 -> admin
     * room -> the current Audio room, where the action is taking place
     */
    if (room.hostId == targetId) return;
    if (authorityLevel == 1 && room.admins.includes(targetId)) return;
    throw new AppError(
      StatusCodes.FORBIDDEN,
      "You are not authorized to take this action",
    );
  }

  public checkUserOnSeat(targetId: string, room: IAudioRoomDocument): void {
    if (room.hostId == targetId) return;
    for (const [seatKey, seat] of Object.entries(room.seats)) {
      console.log(seatKey, seat);

      if (seat.member == targetId) return;
    }
    throw new AppError(StatusCodes.FORBIDDEN, "You are not on a seat");
  }
}
