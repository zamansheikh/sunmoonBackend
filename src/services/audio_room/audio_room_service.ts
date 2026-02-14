import AppError from "../../core/errors/app_errors";
import SingletonSocketServer from "../../core/sockets/singleton_socket_server";
import { AudioRoomHelper } from "../../core/Utils/audioRoomHelper";
import {
  ALLOWED_MESSAGES_COUNT,
  ROCKET_MILESTONES,
} from "../../core/Utils/constants";
import { AudioRoomChannels } from "../../core/Utils/enums";
import { getEquipedItemObjects } from "../../core/Utils/helper_functions";
import {
  IAudioRoom,
  IAudioRoomDocument,
  IAudioSeat,
  IMemberDetails,
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
  joinAudioSeat(
    userId: string,
    roomId: string,
    seatKey: string,
  ): Promise<IAudioRoomDocument>;
  leaveAudioSeat(
    userId: string,
    roomId: string,
    seatKey: string,
  ): Promise<IAudioRoomDocument>;
  makeAudioAdmin(
    myId: string,
    targetId: string,
    roomId: string,
  ): Promise<IAudioRoomDocument>;
  removeAudioAdmin(
    myId: string,
    targetId: string,
    roomId: string,
  ): Promise<IAudioRoomDocument>;
  removeFromSeat(
    myId: string,
    targetId: string,
    roomId: string,
    seatKey: string,
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
    const existingRoom = await this.audioRoomRepository.checkRoomExisistance(
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
    let audioRoom = await this.audioRoomRepository.checkRoomExisistance(roomId);
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
    // prepare user info
    const userInfo: IMemberDetails = {
      _id: userObj._id as string,
      name: userObj.name as string,
      avatar: userObj.avatar as string,
      uid: userObj.uid as string,
      userId: userObj.userId as number,
      country: userObj.country as string,
      currentBackground: userObj.currentLevelBackground as string,
      currentTag: userObj.currentLevelTag as string,
      currentLevel: userObj.level as number,
      equipedStoreItems: userObj.equipedStoreItems as Record<string, string>,
    };
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
          $set: {
            [`members.${userId}`]: true,
            [`uniqueUsers.${userId}`]: true,
          },
          $push: {
            membersArray: userId,
            messages: {
              $each: [joinMessage],
              $slice: -ALLOWED_MESSAGES_COUNT,
            },
          },
        },
      );
    }

    // unique users tracking
    audioRoom.uniqueUsers.set(userId, true);

    // emit join event to the room
    const socketInstance = SingletonSocketServer.getInstance();
    socketInstance.emitToRoom(roomId, AudioRoomChannels.UserJoined, userInfo);
    socketInstance.emitToRoom(
      roomId,
      AudioRoomChannels.AudioRoomMessage,
      joinMessage,
    );

    return await this.audioRoomRepository.getAudioRoomById(roomId);
  }

  async joinAudioSeat(
    userId: string,
    roomId: string,
    seatKey: string,
  ): Promise<IAudioRoomDocument> {
    // client side data validation
    const user = await this.userRepository.findUserById(userId);
    if (!user) {
      throw new AppError(404, "User not found");
    }
    const userObj = user.toObject();
    userObj.equipedStoreItems = await getEquipedItemObjects(
      this.bucketRepository,
      this.categoryRepository,
      userId!,
    );
    const audioRoom =
      await this.audioRoomRepository.checkRoomExisistance(roomId);
    if (!audioRoom) {
      throw new AppError(404, "Audio room not found");
    }
    if (!audioRoom.members.has(userId)) {
      throw new AppError(403, "User not in the room");
    }
    // seat validation
    // only host can sit in host seat
    if (seatKey == "hostSeat" && audioRoom.hostId != userId) {
      throw new AppError(403, "you are not authorized to sit in host seat");
    }
    // for other seats
    const seat = audioRoom.seats.get(seatKey);
    if (!seat && seatKey !== "hostSeat") {
      throw new AppError(404, "Seat not found");
    }
    if (seat && (!seat.available || seat.member)) {
      throw new AppError(403, "Seat is not available");
    }
    // check if the user is seated on any other seat
    const isUserAlreadySeated =
      audioRoom.hostSeat.member?._id?.toString() === userId ||
      Array.from(audioRoom.seats.values()).some(
        (seat) => seat.member?._id?.toString() === userId,
      );

    if (isUserAlreadySeated) {
      throw new AppError(403, "User is already seated");
    }

    // prepare socket data -> userInfo
    const userInfo: IMemberDetails = {
      _id: userObj._id as string,
      name: userObj.name as string,
      avatar: userObj.avatar as string,
      uid: userObj.uid as string,
      userId: userObj.userId as number,
      country: userObj.country as string,
      currentBackground: userObj.currentLevelBackground as string,
      currentTag: userObj.currentLevelTag as string,
      currentLevel: userObj.level as number,
      equipedStoreItems: userObj.equipedStoreItems as Record<string, string>,
    };

    // socket emit to the whole room
    const socketInstance = SingletonSocketServer.getInstance();
    socketInstance.emitToRoom(roomId, AudioRoomChannels.AudioSeatJoined, {
      seatKey,
      userInfo,
    });
    // account for host seat
    // user seated

    await this.audioRoomRepository.findByIdAndUpdate(audioRoom._id as string, {
      $set: {
        [`${seatKey == "hostSeat" ? seatKey : `seats.${seatKey}`}`]: {
          available: true,
          member: userInfo,
        },
      },
    });

    return await this.audioRoomRepository.getAudioRoomById(roomId);
  }

  async leaveAudioSeat(
    userId: string,
    roomId: string,
    seatKey: string,
  ): Promise<IAudioRoomDocument> {
    // client side data validation
    const user = await this.userRepository.findUserById(userId);
    if (!user) {
      throw new AppError(404, "User not found");
    }
    const audioRoom =
      await this.audioRoomRepository.checkRoomExisistance(roomId);
    if (!audioRoom) {
      throw new AppError(404, "Audio room not found");
    }
    if (!audioRoom.members.has(userId)) {
      throw new AppError(403, "User not in the room");
    }

    // seatKey validation
    const seat = audioRoom.seats.get(seatKey);
    if (!seat && seatKey !== "hostSeat") {
      throw new AppError(404, "Seat not found");
    }
    // check if the user is seated
    const isUserAlreadySeated =
      audioRoom.hostSeat.member?._id?.toString() === userId ||
      Array.from(audioRoom.seats.values()).some(
        (seat) => seat.member?._id?.toString() === userId,
      );
    if (!isUserAlreadySeated) {
      throw new AppError(403, "User not seated");
    }
    if (
      (seatKey == "hostSeat" &&
        audioRoom.hostSeat.member?._id?.toString() != userId) ||
      (seat && seat.member?._id?.toString() != userId)
    ) {
      throw new AppError(403, `you are not seated in ${seatKey}`);
    }

    // update the audio room
    await this.audioRoomRepository.findByIdAndUpdate(audioRoom._id as string, {
      $set: {
        [`${seatKey == "hostSeat" ? seatKey : `seats.${seatKey}`}`]: {
          available: true,
          member: null,
        },
      },
    });

    // send leave event to the room
    const socketInstance = SingletonSocketServer.getInstance();
    socketInstance.emitToRoom(roomId, AudioRoomChannels.AudioSeatLeft, {
      seatKey,
      member: {},
    });

    return await this.audioRoomRepository.getAudioRoomById(roomId);
  }

  async makeAudioAdmin(
    myId: string,
    targetId: string,
    roomId: string,
  ): Promise<IAudioRoomDocument> {
    // host cant be admin
    if (myId == targetId) {
      throw new AppError(403, "You are the host");
    }
    // client side data validation
    const audioRoom =
      await this.audioRoomRepository.checkRoomExisistance(roomId);
    if (!audioRoom) {
      throw new AppError(404, "Audio room not found");
    }
    const user = await this.userRepository.findUserById(myId);
    const targetUser = await this.userRepository.findUserById(targetId);
    if (!user || !targetUser) {
      throw new AppError(404, "User not found");
    }
    // check authority validation for host only
    const audioHelper = AudioRoomHelper.getInstance();
    audioHelper.checkAuthorityInAudioRoom(myId, audioRoom, 0); // 0 -> host level authorrity
    audioHelper.checkUserOnSeat(targetId, audioRoom); // user must be on a seat to be made admin
    // update audio room admins
    await this.audioRoomRepository.findByIdAndUpdate(audioRoom._id as string, {
      $push: {
        admins: targetId,
      },
    });
    // new admin profile info
    const targetUserObj = targetUser.toObject();
    targetUserObj.equipedStoreItems = await getEquipedItemObjects(
      this.bucketRepository,
      this.categoryRepository,
      targetId,
    );
    const adminInfo: IMemberDetails = {
      _id: targetUserObj._id as string,
      name: targetUserObj.name as string,
      avatar: targetUserObj.avatar as string,
      uid: targetUserObj.uid as string,
      userId: targetUserObj.userId as number,
      country: targetUserObj.country as string,
      currentBackground: targetUserObj.currentLevelBackground as string,
      currentTag: targetUserObj.currentLevelTag as string,
      currentLevel: targetUserObj.level as number,
      equipedStoreItems: targetUserObj.equipedStoreItems as Record<
        string,
        string
      >,
    };
    // send event to the room
    const socketInstance = SingletonSocketServer.getInstance();
    socketInstance.emitToRoom(roomId, AudioRoomChannels.audioAdminUpdates, {
      isAdded: true,
      admins: adminInfo,
    });
    return await this.audioRoomRepository.getAudioRoomById(roomId);
  }

  async removeAudioAdmin(
    myId: string,
    targetId: string,
    roomId: string,
  ): Promise<IAudioRoomDocument> {
    // client side data validation
    const audioRoom =
      await this.audioRoomRepository.checkRoomExisistance(roomId);
    if (!audioRoom) {
      throw new AppError(404, "Audio room not found");
    }
    const user = await this.userRepository.findUserById(myId);
    if (!user) {
      throw new AppError(404, "User not found");
    }
    // check authority validation for host only
    const audioHelper = AudioRoomHelper.getInstance();
    audioHelper.checkAuthorityInAudioRoom(myId, audioRoom, 0); // 0 -> host level authorrity
    if (!audioRoom.admins.includes(targetId)) {
      throw new AppError(404, "User is not an admin");
    }
    // update audio room admins
    await this.audioRoomRepository.findByIdAndUpdate(audioRoom._id as string, {
      $pull: {
        admins: targetId,
      },
    });
    // send event to the room
    const socketInstance = SingletonSocketServer.getInstance();
    socketInstance.emitToRoom(roomId, AudioRoomChannels.audioAdminUpdates, {
      isAdded: false,
      admins: targetId,
    });
    return await this.audioRoomRepository.getAudioRoomById(roomId);
  }

  async removeFromSeat(
    myId: string,
    targetId: string,
    roomId: string,
    seatKey: string,
  ): Promise<IAudioRoomDocument> {
    // client side data validation
    const audioRoom =
      await this.audioRoomRepository.checkRoomExisistance(roomId);
    if (!audioRoom) {
      throw new AppError(404, "Audio room not found");
    }
    const user = await this.userRepository.findUserById(myId);
    if (!user) {
      throw new AppError(404, "User not found");
    }
    // check authority validation for host only
    const audioHelper = AudioRoomHelper.getInstance();
    audioHelper.checkAuthorityInAudioRoom(myId, audioRoom, 1, targetId); // 0 -> host level authority
    if (!audioRoom.seats.has(seatKey)) {
      throw new AppError(404, "Seat not found");
    }
    const seat = audioRoom.seats.get(seatKey);
    if (!seat) {
      throw new AppError(404, "Seat not found");
    }
    if (seat.member?._id?.toString() !== targetId) {
      throw new AppError(404, "User is not on this seat");
    }
    // update audio room seats
    await this.audioRoomRepository.findByIdAndUpdate(audioRoom._id as string, {
      $pull: {
        seats: seatKey,
      },
    });
    // send event to the room
    const socketInstance = SingletonSocketServer.getInstance();
    socketInstance.emitToRoom(roomId, AudioRoomChannels.audioSeatUpdates, {
      isAdded: false,
      seatKey: seatKey,
    });
    return await this.audioRoomRepository.getAudioRoomById(roomId);
  }
}
