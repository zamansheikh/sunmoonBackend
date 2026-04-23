import { StatusCodes } from "http-status-codes";
import AppError from "../errors/app_errors";
import AudioRoomModel, {
  IAudioRoomDocument,
  IMemberDetails,
  IRoomMessage,
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
import { RepositoryProviders } from "../providers/repository_providers";
import { ROOM_LEVEL_CRITERIA } from "../Utils/constants";
import { IRoomSupportDocument } from "../../models/audio_room/room_support_model";
import {
  checkBoughtSvip,
  checkBoughtVip,
  getEquippedItemObjects,
  getMyBucketItems,
} from "../Utils/helper_functions";

//  singleton class for AudioRoom Helper functionality
export class AudioRoomHelper {
  private static instance: AudioRoomHelper;
  // important repositories
  private roomSupportRepository =
    RepositoryProviders.roomSupportRepositoryProvider;
  public audioRoomRepository = new AudioRoomRepository(AudioRoomModel);
  public recentVisitedRoomRepository = new RecentVisitedRoomRepository(
    RecentVisitedRoomModel,
  );
  public currentRoomMemberRepository = new CurrentRoomMemberRepository(
    CurrentRoomMemberModel,
  );
  private userRepository = RepositoryProviders.userRepositoryProvider;
  private bucketRepository = RepositoryProviders.myBucketRepositoryProvider;
  private storeCategoryRepository =
    RepositoryProviders.storeCategoryRepositoryProvider;

  private constructor() {}

  public static getInstance(): AudioRoomHelper {
    if (!AudioRoomHelper.instance) {
      AudioRoomHelper.instance = new AudioRoomHelper();
    }
    return AudioRoomHelper.instance;
  }

  public async addUniqueUserToRoomSupport(roomId: string, userId: string) {
    /** this function is to add a unique user to the room support
     * and to check if the room is ready for the next level or not
     * @param roomId -> room id
     * @param userId -> user id
     */
    const res = await this.roomSupportRepository.addUniqueUser(roomId, userId);
    await this.roomSupportLevelUp(res);
  }

  public async addTransactionToRoomSupport(roomId: string, amount: number) {
    /** this function is to add a transaction to the room support
     * and to check if the room is ready for the next level or not
     * @param roomId -> room id
     * @param amount -> amount to be added
     */
    const res = await this.roomSupportRepository.incrementTransaction(
      roomId,
      amount,
    );
    await this.roomSupportLevelUp(res);
  }

  public async roomSupportLevelUp(support: IRoomSupportDocument) {
    /** this function is to check if the room is ready for the next level or not
     * if yes then it will increment the level of the room
     * @param support -> room support document
     * the condition is checked against ROOM_LEVEL_CRITERIA constant
     * and the criteria includes roomTransactions and uniqueUsers
     */
    const level: number = support.roomLevel || 0;
    if (level == 0) return;

    if (
      support.roomTransaction >=
        ROOM_LEVEL_CRITERIA[level - 1].roomTransactions &&
      support.uniqueUsers.length >= ROOM_LEVEL_CRITERIA[level - 1].roomVisitor
    ) {
      await this.roomSupportRepository.incrementLevel(support.roomId);
    }
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
    if (targetId && myId.toString() == targetId?.toString()) return;
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

  public generateMemberDetails(userObj: any): IMemberDetails {
    return {
      _id: userObj._id as string,
      name: userObj.name as string,
      avatar: userObj.avatar as string,
      uid: userObj.uid as string,
      userId: userObj.userId as number,
      country: userObj.country as string,
      currentBackground: userObj.currentLevelBackground as string,
      currentTag: userObj.currentLevelTag as string,
      currentLevel: userObj.level as number,
      equippedStoreItems: userObj.equippedStoreItems as Record<string, string>,
      svipItem: userObj.svipItem as Record<string, string>,
      vipItem: userObj.vipItem as Record<string, string>,
    };
  }

  public generateRoomMessage(userObj: any, text: string): IRoomMessage {
    return {
      _id: userObj._id as string,
      name: userObj.name as string,
      avatar: userObj.avatar as string,
      uid: userObj.uid as string,
      userId: userObj.userId as number,
      country: (userObj.country as string) || "",
      currentBackground: userObj.currentLevelBackground as string,
      currentTag: userObj.currentLevelTag as string,
      currentLevel: userObj.level as number,
      text: text,
      equippedStoreItems: userObj.equippedStoreItems as Record<string, string>,
      svipItem: userObj.svipItem as Record<string, string>,
      vipItem: userObj.vipItem as Record<string, string>,
    };
  }

  public async prepareUserData(userId: string): Promise<Record<string, any>> {
    try {
      const user = await this.userRepository.findUserById(userId);
      if (!user) {
        throw new AppError(StatusCodes.NOT_FOUND, "User not found");
      }
      const userObj = user.toObject();
      (userObj as any).equippedStoreItems = await getEquippedItemObjects(
        this.bucketRepository,
        this.storeCategoryRepository,
        userId,
      );
      (userObj as any).svipItem = await checkBoughtSvip(
        userId,
        this.bucketRepository,
      );
      (userObj as any).vipItem = await checkBoughtVip(
        userId,
        this.bucketRepository,
      );
      return userObj;
    } catch (err) {
      throw err;
    }
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
