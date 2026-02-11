import AppError from "../../core/errors/app_errors";
import SingletonSocketServer from "../../core/sockets/singleton_socket_server";
import { ROCKET_MILESTONES } from "../../core/Utils/constants";
import { AudioRoomChannels } from "../../core/Utils/enums";
import { getEquipedItemObjects } from "../../core/Utils/helper_functions";
import {
  IAudioRoom,
  IAudioRoomDocument,
  IAudioSeat,
  IRoomMessage,
} from "../../models/audio_room/audio_room_model";
import { IAudioRoomRepository } from "../../repository/audio_room/audio_room_repository";
import { IMyBucketRepository } from "../../repository/store/my_bucket_repository";
import { IStoreCategoryRepository } from "../../repository/store/store_category_repository";
import { IUserRepository } from "../../repository/users/user_repository";

export interface IAudioRoomService {
  createAudioRoom(audioRoom: Partial<IAudioRoom>): Promise<IAudioRoomDocument>;
  getAudioRoomById(roomId: string): Promise<IAudioRoomDocument | null>;
  getAllAudioRooms(): Promise<IAudioRoomDocument[]>;
  joinAudioRoom(
    roomId: string,
    userId: string,
    password?: string,
  ): Promise<IAudioRoomDocument>;
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
    const user = await this.userRepository.findUserById(hostId! as string);
    if (!user) {
      throw new AppError(404, "User not found");
    }

    // prepare seats data
    const seats: Map<string, IAudioSeat> = new Map();
    for (let i = 1; i <= numberOfSeats!; i++) {
      seats.set(`seat-${i}`, { available: true });
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
      hostTotalSendGift: 0,
      hostTotalRecievedGift: 0,
      roomTotalTransaction: 0,
      hostSeat: { available: true },
      premiumSeat: { available: true },
      seats: seats,
      messages: [],
      members: new Map([[hostId!.toString(), true]]),
      membersArray: [hostId!],
      bannedUsers: [],
      mutedUsers: new Map(),
      chatPrivacy: "any",
      allowedUsersToChat: new Map(),
      password: "",
      isHostPresent: true,
      isLocked: false,
      hostId: hostId!,
      uniqueUsers: new Map([[hostId!.toString(), true]]), // to track unique users
      roomLevel: 0,
      roomPartners: [],
    };

    //socket instance
    const socketInstance = SingletonSocketServer.getInstance();
    // include the users socket to the roomId socket.join(roomId);
    socketInstance.joinRoomSocket(hostId! as string, roomId!);
    // send create room event
    socketInstance.emitToRoom(
      roomId!,
      AudioRoomChannels.NewAudioRoomCreated,
      socketInstance.roomSearializer(audioRoomDocument),
    );

    // save audio room
    return await this.audioRoomRepository.createAudioRoom(audioRoomDocument);
  }
  async getAudioRoomById(roomId: string): Promise<IAudioRoomDocument | null> {
    const result = await this.audioRoomRepository.getAudioRoomById(roomId);
    if (!result) {
      throw new AppError(404, "Audio room not found");
    }
    return result;
  }

  async getAllAudioRooms(): Promise<IAudioRoomDocument[]> {
    const result = await this.audioRoomRepository.getAllAudioRooms();
    return result;
  }

  async joinAudioRoom(
    roomId: string,
    userId: string,
    password?: string,
  ): Promise<IAudioRoomDocument> {
    // client data validation
    let audioRoom = await this.audioRoomRepository.getAudioRoomById(roomId);
    if (!audioRoom) {
      throw new AppError(404, "Audio room not found");
    }
    const user = await this.userRepository.findUserById(userId);
    if (!user) {
      throw new AppError(404, "User not found");
    }

    // prepare user data
    const userObj = user.toObject();
    userObj.equipedStoreItems = await getEquipedItemObjects(
      this.bucketRepository,
      this.categoryRepository,
      userId!,
    );

    // check for room lock status and password matching
    if (audioRoom.isLocked) {
      if (!password) {
        throw new AppError(401, "Password required");
      }
      if (password !== audioRoom.password) {
        throw new AppError(401, "Incorrect password");
      }
    }
    // prepare join room message
    const joinMessage: IRoomMessage = {
      _id: userObj._id as string,
      name: userObj.name as string,
      avatar: userObj.avatar as string,
      uid: userObj.uid as string,
      userId: userObj.userId as number,
      country: userObj.country as string,
      currentBackground: userObj.currentLevelBackground as string,
      currentTag: userObj.currentLevelTag as string,
      currentLevel: userObj.level as number,
      text: "joined the room",
      equipedStoreItems: userObj.equipedStoreItems as Record<string, string>,
    };

    // handle if the user already in the room
    const userAlreadyInRoom = audioRoom.members.has(userId);
    if (!userAlreadyInRoom) {
      audioRoom = await this.audioRoomRepository.findByIdAndUpdate(
        audioRoom._id as string,
        {
          $set: { [`members.${userId}`]: true },
          $push: { membersArray: userId },
        },
      );
    }

    // unique users tracking
    audioRoom.uniqueUsers.set(userId, true);

    // emit join event to the room
    const socketInstance = SingletonSocketServer.getInstance();
    socketInstance.emitToRoom(
      roomId,
      AudioRoomChannels.UserJoined,
      joinMessage,
    );

    return audioRoom;
  }
}
