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
    roomId: string,
    userId: string,
    seatKey: string,
  ): Promise<void> {
    try {
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

      // create a session for the user.
      this.invitationSessions.set(userId, {
        roomId: room._id as string,
        seatKey,
        TTL: Date.now() + this.invitationSessionTTL,
      });

      // lock the seat
      await this.AudioRoomRepository.findByIdAndUpdate(room._id as string, {
        $set: {
          [`${`seats.${seatKey}`}`]: {
            available: false,
          },
        },
      });
      // send notification to the user
      SingletonSocketServer.getInstance().emitToUser(
        userId,
        AudioRoomChannels.MicInviteRequest,
        {
          message: `You have been invited to join the mic`,
          roomId,
          seatKey,
          userId,
        },
      );
    } catch (error) {
      console.log(error);
    }
  }

  public async acceptMicInvite(userId: string): Promise<void> {
    try {
      // validate user
      const isValid = await UserCache.getInstance().validateUserId(userId);
      if (!isValid) throw new AppError(400, "Invalid user id");
      // get session
      const session: IInviteSession | undefined =
        this.invitationSessions.get(userId);
      if (!session) throw new AppError(400, "Invalid session");
      if (session.TTL < Date.now()) throw new AppError(400, "Session expired");
      this.invitationSessions.delete(userId);
      // join the user to the room
      // fetch user information
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

      // socket emit to the whole room
      const socketInstance = SingletonSocketServer.getInstance();
      socketInstance.emitToRoom(
        session.roomId,
        AudioRoomChannels.AudioSeatJoined,
        {
          seatKey: session.seatKey,
          userInfo,
        },
      );
      //update the audio room and unlock the seat again
      await this.AudioRoomRepository.findByIdAndUpdate(
        session.roomId as string,
        {
          $set: {
            [`${`seats.${session.seatKey}`}`]: {
              available: true,
              member: userInfo,
            },
          },
        },
      );
    } catch (error) {
      console.log(error);
    }
  }

  public async rejectMicInvite(userId: string): Promise<void> {
    try {
      // validate user
      const isValid = await UserCache.getInstance().validateUserId(userId);
      if (!isValid) throw new AppError(400, "Invalid user id");
      // get session
      const session: IInviteSession | undefined =
        this.invitationSessions.get(userId);
      if (!session) throw new AppError(400, "Invalid session");
      if (session.TTL < Date.now()) throw new AppError(400, "Session expired");
      this.invitationSessions.delete(userId);
      // unlock the seat
      await this.AudioRoomRepository.findByIdAndUpdate(session.roomId as string, {
        $set: {
          [`${`seats.${session.seatKey}`}`]: {
            available: true,
          },
        },
      });
    } catch (error) {
      console.log(error);
    }
  }
}

interface IInviteSession {
  roomId: string;
  seatKey: string;
  TTL: number;
}
