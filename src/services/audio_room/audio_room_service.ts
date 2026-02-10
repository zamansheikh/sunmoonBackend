import AppError from "../../core/errors/app_errors";
import SingletonSocketServer from "../../core/sockets/singleton_socket_server";
import { ROCKET_MILESTONES } from "../../core/Utils/constants";
import { AudioRoomChannels } from "../../core/Utils/enums";
import { getEquipedItemObjects } from "../../core/Utils/helper_functions";
import {
  IAudioRoom,
  IAudioRoomDocument,
  IAudioSeat,
  IMemberDetails,
} from "../../models/audio_room/audio_room_model";
import { IAudioRoomRepository } from "../../repository/audio_room/audio_room_repository";
import { IMyBucketRepository } from "../../repository/store/my_bucket_repository";
import { IStoreCategoryRepository } from "../../repository/store/store_category_repository";
import { IUserRepository } from "../../repository/users/user_repository";

export interface IAudioRoomService {
  createAudioRoom(audioRoom: Partial<IAudioRoom>): Promise<IAudioRoomDocument>;
  getAudioRoomById(roomId: string): Promise<IAudioRoomDocument | null>;
  updateAudioRoom(
    roomId: string,
    audioRoom: Partial<IAudioRoom>,
  ): Promise<IAudioRoomDocument>;
  deleteAudioRoom(roomId: string): Promise<IAudioRoomDocument>;
  getAllAudioRooms(): Promise<IAudioRoomDocument[]>;
}

export class AudioRoomService implements IAudioRoomService {
  audioRoomRepository: IAudioRoomRepository;
  userRepository: IUserRepository;
  bucketRepository: IMyBucketRepository;
  categoryRepository: IStoreCategoryRepository;
  constructor(
    audioRoomRepository: IAudioRoomRepository,
    userRepository: IUserRepository,
    bucketRepository: IMyBucketRepository,
    categoryRepository: IStoreCategoryRepository,
  ) {
    this.audioRoomRepository = audioRoomRepository;
    this.userRepository = userRepository;
    this.bucketRepository = bucketRepository;
    this.categoryRepository = categoryRepository;
  }

  async createAudioRoom(
    audioRoom: Partial<IAudioRoom>,
  ): Promise<IAudioRoomDocument> {
    const { hostId, title, roomId, numberOfSeats, announcement, roomPhoto } =
      audioRoom;
    const existingRoom = await this.audioRoomRepository.getAudioRoomById(
      roomId!,
    );
    // client side data validation
    if (existingRoom) {
      throw new AppError(400, "Room already exists");
    }
    const user = await this.userRepository.findUserById(hostId!);
    if (!user) {
      throw new AppError(404, "User not found");
    }

    // prepare host data
    const userObj = user.toObject();
    userObj.equipedStoreItems = await getEquipedItemObjects(
      this.bucketRepository,
      this.categoryRepository,
      hostId!,
    );
    const hostDetails: IMemberDetails = {
      name: user.name as string,
      avatar: user.avatar as string,
      uid: user.uid as string,
      userId: user.userId as number,
      country: user.country as string,
      _id: user._id as string,
      currentBackground: user.currentLevelBackground as string,
      currentTag: user.currentLevelTag as string,
      currentLevel: user.level as number,
      equipedStoreItems: userObj.equipedStoreItems as Record<string, string>,
      totalGiftSent: 0,
      isMuted: false,
    };

    // prepare seats data
    const seats: Map<string, IAudioSeat> = new Map();
    for (let i = 1; i <= numberOfSeats!; i++) {
      seats.set(`seat-${i}`, { member: {}, available: true });
    }

    // create audio room
    const audioRoomDocument: IAudioRoom = {
      title: title!,
      numberOfSeats: numberOfSeats!,
      announcement: announcement!,
      roomId: roomId!,
      roomPhoto: roomPhoto!,
      currentRocketLevel: 1,
      currentRocketFuel: 0,
      currentRocketMilestone: ROCKET_MILESTONES[0],
      admins: [],
      hostDetails: hostDetails,
      hostTotalSendGift: 0,
      hostTotalRecievedGift: 0,
      roomTotalTransaction: 0,
      hostSeat: { member: {}, available: true },
      premiumSeat: { member: {}, available: true },
      seats: seats,
      messages: [],
      members: new Map([[hostId!, true]]),
      membersDetails: [hostDetails],
      bannedUsers: new Map(),
      mutedUsers: new Map(),
      ranking: [hostDetails],
      chatPrivacy: "any",
      allowedUsersToChat: new Map(),
      password: "",
      isHostPresent: true,
      isLocked: false,
      hostId: hostId!,
      uniqueUsers: new Map([[hostId!, true]]),
      roomLevel: 0,
      roomPartners: [],
    };
    // include the users socket to the roomId socket.join(roomId);
    SingletonSocketServer.getInstance().joinRoomSocket(hostId!, roomId!);
    // send create room event
    SingletonSocketServer.getInstance().emitToRoom(
      roomId!,
      AudioRoomChannels.NewAudioRoomCreated,
      audioRoomDocument,
    );
    // save audio room
    return await this.audioRoomRepository.createAudioRoom(audioRoomDocument);
  }
  async getAudioRoomById(roomId: string): Promise<IAudioRoomDocument | null> {
    throw new Error("Method not implemented.");
  }
  async updateAudioRoom(
    roomId: string,
    audioRoom: Partial<IAudioRoom>,
  ): Promise<IAudioRoomDocument> {
    throw new Error("Method not implemented.");
  }
  async deleteAudioRoom(roomId: string): Promise<IAudioRoomDocument> {
    throw new Error("Method not implemented.");
  }
  async getAllAudioRooms(): Promise<IAudioRoomDocument[]> {
    throw new Error("Method not implemented.");
  }
}
