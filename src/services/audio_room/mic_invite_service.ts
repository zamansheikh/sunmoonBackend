import { AudioRoomCache } from "../../core/cache/audio_room_cache";
import { UserCache } from "../../core/cache/user_chache";
import AppError from "../../core/errors/app_errors";
import { AudioRoomHelper } from "../../core/helper_classes/audioRoomHelper";
import { RepositoryProviders } from "../../core/providers/repository_providers";
import { RedisFolderProvider } from "../../core/redis/redis_folder_provider";
import SingletonSocketServer from "../../core/sockets/singleton_socket_server";
import { AudioRoomChannels } from "../../core/Utils/enums";
import {
  getEquippedItemObjects,
  isEmptyObject,
} from "../../core/Utils/helper_functions";
import { IMemberDetails } from "../../models/audio_room/audio_room_model";
import { MgbInvitationTrackingService } from "../magic_ball/mgb_invitation_tracking_service";

/**
 * Mic Invite Service
 *
 * This service is responsible for handling mic invites in the audio room.
 *
 * @author  Dewan Nasif
 * @version 1.0.0
 * @since 2026-03-12
 */

export class MicInviteService {
  private static instance: MicInviteService | null = null;

  private static readonly MIC_INVITE_SERVICE_FOLDER =
    RedisFolderProvider.MicInviteServiceFolderPrefix;

  // class specific variables
  private readonly invitationSessionTTL = 60 * 1000; // 1 minute
  private invitationSessions = new Map<string, IInviteSession>(); // eg: {userId: {roomId, seatKey, TTL}}

  // respositories
  private UserRepository = RepositoryProviders.userRepositoryProvider;
  private AudioRoomRepository = RepositoryProviders.audioRoomRepositoryProvider;
  private BucketRepository = RepositoryProviders.myBucketRepositoryProvider;
  private CategoryRepository =
    RepositoryProviders.storeCategoryRepositoryProvider;

  private constructor() {}

  public static getInstance(): MicInviteService {
    if (!MicInviteService.instance) {
      MicInviteService.instance = new MicInviteService();
    }
    return MicInviteService.instance;
  }

  /**
   *
   * @param roomId
   * @param userId
   * @param seatKey
   */
  public async sendMicInvite(
    myId: string,
    roomId: string,
    userId: string,
    seatKey: string,
  ): Promise<void> {
    try {
      // clear any existing session
      if (this.invitationSessions.has(userId)) {
        await this.clearInvitationSession(userId, true);
      }
      // validating client side data and store them
      const user = await UserCache.getInstance().validateUserId(userId);
      if (!user) throw new AppError(404, "User not found");
      const room = await this.AudioRoomRepository.checkRoomExisistance(roomId);
      if (!room) throw new AppError(404, "Room not found");

      // validate seatkey and check availability
      const seat = room.seats.get(seatKey);
      if (!seat) throw new AppError(404, "Seat not found");
      if (!seat.available) throw new AppError(400, "Seat is not available");
      if (!isEmptyObject(seat.member || {}))
        throw new AppError(400, "Seat is already occupied");

      // check if the user is any other seat
      const existingSeat = Array.from(room.seats.values()).find(
        (s) => s.member?._id?.toString() === userId,
      );
      if (existingSeat) throw new AppError(400, "User is already in a seat");

      // lock the seat using dot notation to avoid wiping other seat properties
      await this.AudioRoomRepository.findByIdAndUpdate(room._id as string, {
        $set: {
          [`seats.${seatKey}.available`]: false,
        },
      });

      // auto clear the invite and unlock the seat
      const timeoutId = setTimeout(async () => {
        await this.clearInvitationSession(userId, true);
      }, this.invitationSessionTTL + 2000);

      // create a session for the user.
      this.invitationSessions.set(userId, {
        inviterId: myId,
        roomDbId: room._id as string,
        roomSocketId: room.roomId, // Human-readable ID for socket emissions
        seatKey,
        TTL: Date.now() + this.invitationSessionTTL,
        timeoutId,
      });

      // send notification to the user
      SingletonSocketServer.getInstance().emitToUser(
        userId,
        AudioRoomChannels.MicInviteRequest,
        {
          message: `You have been invited to join the mic`,
          roomId: room.roomId,
          seatKey,
          userId,
        },
      );
    } catch (error) {
      throw error;
    }
  }

  public async acceptMicInvite(userId: string): Promise<void> {
    try {
      // validate user
      const isValid = await UserCache.getInstance().validateUserId(userId);
      if (!isValid) throw new AppError(400, "Invalid user id");
      // get session
      const session = this.invitationSessions.get(userId);
      if (!session) throw new AppError(400, "Invalid session");
      if (session.TTL < Date.now()) {
        await this.clearInvitationSession(userId, true);
        throw new AppError(400, "Session expired");
      }

      // 1. Fetch Room State and Re-validate
      const room = await this.AudioRoomRepository.checkRoomExisistance(
        session.roomSocketId,
      );
      if (!room) throw new AppError(404, "Room not found");

      // 2. Banned check
      if (room.bannedUsers.some((b) => b.user._id.toString() === userId)) {
        await this.clearInvitationSession(userId, true);
        throw new AppError(403, "You are banned from this room");
      }

      // 3. Check if user is already on another seat (Atomic re-check)
      const existingSeat = Array.from(room.seats.values()).find(
        (s) => s.member?._id?.toString() === userId,
      );
      if (existingSeat) {
        await this.clearInvitationSession(userId, true);
        throw new AppError(400, "User is already in a seat");
      }

      // 4. PREVENT RACE CONDITIONS: Clear session immediately before heavy IO
      const inviterId = session.inviterId;
      const timeoutId = session.timeoutId;
      const roomDbId = session.roomDbId;
      const roomSocketId = session.roomSocketId;
      const seatKey = session.seatKey;

      if (timeoutId) clearTimeout(timeoutId);
      this.invitationSessions.delete(userId);

      // 5. Join logic
      const user = await this.UserRepository.findUserById(userId);
      if (!user) {
        throw new AppError(404, "User not found");
      }
      const userObj = user.toObject();
      userObj.equippedStoreItems = await getEquippedItemObjects(
        this.BucketRepository,
        this.CategoryRepository,
        userId!,
      );
      const userInfo: IMemberDetails =
        AudioRoomHelper.getInstance().generateMemberDetails(userObj);

      // socket emit to the whole room (Using correct Socket Room ID)
      const socketInstance = SingletonSocketServer.getInstance();
      socketInstance.emitToRoom(
        roomSocketId,
        AudioRoomChannels.AudioSeatJoined,
        {
          seatKey: seatKey,
          userInfo,
        },
      );

      // update the audio room and unlock the seat again
      await this.AudioRoomRepository.findByIdAndUpdate(roomDbId, {
        $set: {
          [`seats.${seatKey}.available`]: true,
          [`seats.${seatKey}.member`]: userInfo,
        },
      });
      MgbInvitationTrackingService.getInstance().onInviteSuccess(
        inviterId,
        userId,
      );
    } catch (error) {
      throw error;
    }
  }

  public async rejectMicInvite(userId: string): Promise<void> {
    try {
      // validate user
      const isValid = await UserCache.getInstance().validateUserId(userId);
      if (!isValid) throw new AppError(400, "Invalid user id");

      // get session
      const session = this.invitationSessions.get(userId);
      if (!session) throw new AppError(400, "Invalid session");
      if (session.TTL < Date.now()) throw new AppError(400, "Session expired");

      // clear invitation and unlock seat
      await this.clearInvitationSession(userId, true);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Helper function to clear invitation session and optionally unlock seat
   * @param userId
   * @param shouldUnlockInDb
   * @private
   */
  private async clearInvitationSession(
    userId: string,
    shouldUnlockInDb: boolean = false,
  ): Promise<void> {
    const session = this.invitationSessions.get(userId);
    if (!session) return;

    // clear timer
    if (session.timeoutId) {
      clearTimeout(session.timeoutId);
    }

    // delete session from local cache
    this.invitationSessions.delete(userId);

    // unlock the seat in database using dot notation
    if (shouldUnlockInDb) {
      await this.AudioRoomRepository.findByIdAndUpdate(session.roomDbId, {
        $set: {
          [`seats.${session.seatKey}.available`]: true,
        },
      });
    }
  }
}

interface IInviteSession {
  inviterId: string;
  roomDbId: string;
  roomSocketId: string;
  seatKey: string;
  TTL: number;
  timeoutId?: NodeJS.Timeout;
}
