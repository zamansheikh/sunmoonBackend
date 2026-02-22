import { StatusCodes } from "http-status-codes";
import AppError from "../errors/app_errors";
import AudioRoomModel, {
  IAudioRoomDocument,
} from "../../models/audio_room/audio_room_model";
import {
  IRecentVisitedRoomRepository,
  RecentVisitedRoomRepository,
} from "../../repository/audio_room/recent_visited_room_reposiory";
import RecentVisitedRoomModel from "../../models/audio_room/recent_visited_room_model";
import CurrentRoomMemberModel from "../../models/audio_room/current_room_member";
import { CurrentRoomMemberRepository } from "../../repository/audio_room/current_room_member_repository";
import SingletonSocketServer from "../sockets/singleton_socket_server";
import { AudioRoomRepository } from "../../repository/audio_room/audio_room_repository";

//  singleton class for AudioRoom Helper functionality
export class AudioRoomHelper {
  private static instance: AudioRoomHelper;
  // important repositories
  public audioRoomRepository = new AudioRoomRepository(AudioRoomModel);
  public recentVisitedRoomRepository = new RecentVisitedRoomRepository(
    RecentVisitedRoomModel,
  );
  public currentRoomMemberRepository = new CurrentRoomMemberRepository(
    CurrentRoomMemberModel,
  );

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
      room.admins.some((admin) => admin.toString() === myId)
    ) {
      if (!targetId) return;
      if (
        targetId !== room.hostId.toString() &&
        !room.admins.some((admin) => admin.toString() === targetId)
      ) {
        return;
      }
    }
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

  // this function is to make sure, the user only joins one room only after leaving the other
  // if not done mannually this function will do it automatically, instead of throwing error
  public async handleRoomPresence(userId: string, roomId: string) {
    const socketInstance = SingletonSocketServer.getInstance();

    // ────────────────────────────────────────────────
    // 1. Try to update existing document → sets new roomId
    //    if document didn't exist → creates it (upsert)
    // ────────────────────────────────────────────────
    const updated = await this.currentRoomMemberRepository.update(
      userId,
      roomId,
    );

    const previousRoomId = updated?.roomId; // will be old value if existed

    // Case A: new user → no previous room → we're done
    if (!previousRoomId) {
      return;
    }

    // Case B: user changed room (previousRoomId !== roomId)
    if (previousRoomId === roomId) {
      return; // already in target room → nothing else to do
    }

    // ─── User was in different room ───────────────────────────────

    // Check if old room still exists (critical for cleanup)
    const oldRoomExists =
      await this.audioRoomRepository.checkRoomExisistance(previousRoomId);

    if (oldRoomExists && oldRoomExists.members.has(userId)) {
      socketInstance.handleAudioRoomDisconnection(userId, oldRoomExists);
    } else {
      socketInstance.leaveRoomSocket(userId, previousRoomId);
    }
  }
}
