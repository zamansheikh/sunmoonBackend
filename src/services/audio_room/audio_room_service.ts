import AppError from "../../core/errors/app_errors";
import SingletonSocketServer from "../../core/sockets/singleton_socket_server";
import { AudioRoomHelper } from "../../core/Utils/audioRoomHelper";
import {
  ALLOWED_MESSAGES_COUNT,
  ROCKET_MILESTONES,
} from "../../core/Utils/constants";
import { ActivityZoneState, AudioRoomChannels } from "../../core/Utils/enums";
import { getEquippedItemObjects } from "../../core/Utils/helper_functions";
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
  muteUnmuteUser(
    myId: string,
    targetId: string,
    roomId: string,
  ): Promise<IAudioRoomDocument>;
  leaveAudioRoom(userId: string, roomId: string): Promise<IAudioRoomDocument>;
  sendRoomWideMessage(
    myId: string,
    roomId: string,
    message: string,
  ): Promise<IAudioRoomDocument>;
  lockUnlockSeat(
    myId: string,
    roomId: string,
    seatKey: string,
  ): Promise<IAudioRoomDocument>;
  updateRoomTitle(
    myId: string,
    roomId: string,
    title: string,
  ): Promise<IAudioRoomDocument>;
  updateRoomAnnouncement(
    myId: string,
    roomId: string,
    announcement: string,
  ): Promise<IAudioRoomDocument>;
  updateRoomPhoto(
    myId: string,
    roomId: string,
    roomPhoto: string,
  ): Promise<IAudioRoomDocument>;
  clearChat(myId: string, roomId: string): Promise<IAudioRoomDocument>;
  searchAudioRoom(userId: number): Promise<IAudioRoomDocument>;
  getMyAudioRoom(myId: string): Promise<IAudioRoomDocument>;
  lockAllSeats(myId: string, roomId: string): Promise<IAudioRoomDocument>;
  unlockAllSeats(myId: string, roomId: string): Promise<IAudioRoomDocument>;
  banUser(
    myId: string,
    targetId: string,
    roomId: string,
    banType: ActivityZoneState,
    bannedTill?: string,
  ): Promise<IAudioRoomDocument>;
  unbanUser(
    myId: string,
    targetId: string,
    roomId: string,
  ): Promise<IAudioRoomDocument>;
  updateRoomPassword({
    myId,
    roomId,
    password,
  }: {
    myId: string;
    roomId: string;
    password: string;
  }): Promise<IAudioRoomDocument>;
  updateSeatCount(myId: string, roomId: string, seatCount: number): Promise<IAudioRoomDocument>;
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
    userObj.equippedStoreItems = await getEquippedItemObjects(
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
      equippedStoreItems: userObj.equippedStoreItems as Record<string, string>,
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
      equippedStoreItems: userObj.equippedStoreItems as Record<string, string>,
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
    socketInstance.emitToRoom(roomId, AudioRoomChannels.AudioRoomMessage, {
      message: joinMessage,
    });

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
    userObj.equippedStoreItems = await getEquippedItemObjects(
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
      equippedStoreItems: userObj.equippedStoreItems as Record<string, string>,
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
    targetUserObj.equippedStoreItems = await getEquippedItemObjects(
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
      equippedStoreItems: targetUserObj.equippedStoreItems as Record<
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
    console.log(myId, targetId, roomId, seatKey);

    // admin cant be removed from the seat
    if (seatKey == "hostSeat") {
      throw new AppError(403, "cannot remove from host seat");
    }
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
      $set: {
        [`seats.${seatKey}`]: {
          available: true,
          member: null,
        },
      },
    });

    // send event to the room
    const socketInstance = SingletonSocketServer.getInstance();
    socketInstance.emitToRoom(roomId, AudioRoomChannels.AudioSeatLeft, {
      seatKey: seatKey,
      member: {},
    });
    return await this.audioRoomRepository.getAudioRoomById(roomId);
  }

  async muteUnmuteUser(
    myId: string,
    targetId: string,
    roomId: string,
  ): Promise<IAudioRoomDocument> {
    //client side data validation
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
    audioHelper.checkUserOnSeat(targetId, audioRoom);

    if (!audioRoom.mutedUsers.has(targetId)) {
      await this.audioRoomRepository.findByIdAndUpdate(
        audioRoom._id as string,
        {
          $set: {
            [`mutedUsers.${targetId}`]: true,
          },
        },
      );
    } else {
      await this.audioRoomRepository.findByIdAndUpdate(
        audioRoom._id as string,
        {
          $unset: {
            [`mutedUsers.${targetId}`]: "",
          },
        },
      );
    }

    // send event to the room
    const socketInstance = SingletonSocketServer.getInstance();
    socketInstance.emitToRoom(roomId, AudioRoomChannels.muteUnmuteUser, {
      mutedUsers: Array.from(audioRoom.mutedUsers.keys()).push(targetId),
    });
    return await this.audioRoomRepository.getAudioRoomById(roomId);
  }

  async leaveAudioRoom(
    userId: string,
    roomId: string,
  ): Promise<IAudioRoomDocument> {
    const audioRoom =
      await this.audioRoomRepository.checkRoomExisistance(roomId);
    if (!audioRoom) {
      throw new AppError(404, "Audio room not found");
    }
    const socketInstance = SingletonSocketServer.getInstance();
    const updatedRoom = await socketInstance.handleAudioRoomDisconnection(
      userId,
      audioRoom,
      this.userRepository,
      this.bucketRepository,
      this.categoryRepository,
    );
    return updatedRoom;
  }

  async sendRoomWideMessage(
    myId: string,
    roomId: string,
    message: string,
  ): Promise<IAudioRoomDocument> {
    // client side data validation
    const audioRoom =
      await this.audioRoomRepository.checkRoomExisistance(roomId);
    if (!audioRoom) {
      throw new AppError(404, "Audio room not found");
    }
    if (!audioRoom.members.has(myId)) {
      throw new AppError(403, "You are not a member of this audio room");
    }
    const user = await this.userRepository.findUserById(myId);
    if (!user) {
      throw new AppError(404, "User not found");
    }
    // prepare message body
    const userObj = user.toObject();
    userObj.equippedStoreItems = await getEquippedItemObjects(
      this.bucketRepository,
      this.categoryRepository,
      userObj.equippedStoreItems,
    );
    const messageBody: IRoomMessage = {
      _id: user._id as string,
      name: user.name as string,
      avatar: user.avatar as string,
      country: user.country as string,
      currentBackground: user.currentLevelBackground as string,
      equippedStoreItems: userObj.equippedStoreItems,
      currentLevel: user.level as number,
      currentTag: user.currentLevelTag as string,
      text: message,
      uid: user.uid as string,
      userId: user.userId as number,
    };
    await this.audioRoomRepository.findByIdAndUpdate(audioRoom._id as string, {
      $push: {
        messages: {
          $each: [messageBody],
          $slice: -ALLOWED_MESSAGES_COUNT,
        },
      },
    });
    const socketInstance = SingletonSocketServer.getInstance();
    socketInstance.emitToRoom(roomId, AudioRoomChannels.AudioRoomMessage, {
      message: messageBody,
    });
    const updatedRoom = await this.audioRoomRepository.getAudioRoomById(roomId);
    return updatedRoom;
  }

  async clearChat(myId: string, roomId: string): Promise<IAudioRoomDocument> {
    const audioRoom =
      await this.audioRoomRepository.checkRoomExisistance(roomId);
    if (!audioRoom) {
      throw new AppError(404, "Audio room not found");
    }
    const helperInstance = AudioRoomHelper.getInstance();
    helperInstance.checkAuthorityInAudioRoom(myId, audioRoom, 1);
    await this.audioRoomRepository.findByIdAndUpdate(audioRoom._id as string, {
      $set: {
        messages: [],
      },
    });
    const updatedRoom = await this.audioRoomRepository.getAudioRoomById(roomId);
    const socketInstance = SingletonSocketServer.getInstance();
    socketInstance.emitToRoom(roomId, AudioRoomChannels.AudioRoomDetails, {
      audioRoom: updatedRoom,
    });
    return updatedRoom;
  }

  async getMyAudioRoom(myId: string): Promise<IAudioRoomDocument> {
    const user = await this.userRepository.findUserById(myId);
    if (!user) {
      throw new AppError(404, "User not found");
    }
    const audioRoom = await this.audioRoomRepository.getAudioRoomByHostId(
      user._id as string,
    );

    if (!audioRoom) {
      throw new AppError(404, "Audio room not found");
    }
    return await this.audioRoomRepository.getAudioRoomById(audioRoom);
  }

  async searchAudioRoom(userId: number): Promise<IAudioRoomDocument> {
    const targetUser = await this.userRepository.findUserByShortId(userId);
    if (!targetUser) {
      throw new AppError(404, "User not found");
    }
    const audioRoomId = await this.audioRoomRepository.getAudioRoomByHostId(
      targetUser._id as string,
    );
    if (!audioRoomId) {
      throw new AppError(404, "Audio room not found");
    }
    return await this.audioRoomRepository.getAudioRoomById(audioRoomId);
  }

  async updateRoomTitle(
    myId: string,
    roomId: string,
    title: string,
  ): Promise<IAudioRoomDocument> {
    const audioRoom =
      await this.audioRoomRepository.checkRoomExisistance(roomId);
    if (!audioRoom) {
      throw new AppError(404, "Audio room not found");
    }
    const helperInstance = AudioRoomHelper.getInstance();
    helperInstance.checkAuthorityInAudioRoom(myId, audioRoom, 1);
    await this.audioRoomRepository.findByIdAndUpdate(audioRoom._id as string, {
      $set: {
        title: title,
      },
    });
    const updatedRoom = await this.audioRoomRepository.getAudioRoomById(roomId);
    const socketInstance = SingletonSocketServer.getInstance();
    socketInstance.emitToRoom(roomId, AudioRoomChannels.AudioRoomDetails, {
      audioRoom: updatedRoom,
    });
    return updatedRoom;
  }

  async updateRoomAnnouncement(
    myId: string,
    roomId: string,
    announcement: string,
  ): Promise<IAudioRoomDocument> {
    const audioRoom =
      await this.audioRoomRepository.checkRoomExisistance(roomId);
    if (!audioRoom) {
      throw new AppError(404, "Audio room not found");
    }
    const helperInstance = AudioRoomHelper.getInstance();
    helperInstance.checkAuthorityInAudioRoom(myId, audioRoom, 1);
    await this.audioRoomRepository.findByIdAndUpdate(audioRoom._id as string, {
      $set: {
        announcement: announcement,
      },
    });
    const updatedRoom = await this.audioRoomRepository.getAudioRoomById(roomId);
    const socketInstance = SingletonSocketServer.getInstance();
    socketInstance.emitToRoom(roomId, AudioRoomChannels.AudioRoomDetails, {
      audioRoom: updatedRoom,
    });
    return updatedRoom;
  }

  async lockUnlockSeat(
    myId: string,
    roomId: string,
    seatKey: string,
  ): Promise<IAudioRoomDocument> {
    const audioRoom =
      await this.audioRoomRepository.checkRoomExisistance(roomId);
    if (!audioRoom) throw new AppError(404, "Audio Room Not Found");

    // only host or admin can lock/unlock seats
    const audioHelper = AudioRoomHelper.getInstance();
    audioHelper.checkAuthorityInAudioRoom(myId, audioRoom, 1);

    // host seat cannot be locked
    if (seatKey === "hostSeat") {
      throw new AppError(403, "Cannot lock/unlock the host seat");
    }

    const seat = audioRoom.seats.get(seatKey);
    if (!seat) {
      throw new AppError(404, "Seat not found");
    }

    // toggle: if currently available -> lock it (available: false), if locked -> unlock it (available: true)
    const newAvailability = !seat.available;

    // if locking a seat that has a member, remove the member first
    const updateQuery: any = {
      $set: {
        [`seats.${seatKey}.available`]: newAvailability,
      },
    };
    if (!newAvailability && seat.member) {
      updateQuery.$set[`seats.${seatKey}.member`] = null;
      // notify the room that the user left the seat
      const socketInstance = SingletonSocketServer.getInstance();
      socketInstance.emitToRoom(roomId, AudioRoomChannels.AudioSeatLeft, {
        seatKey,
        member: {},
      });
    }

    await this.audioRoomRepository.findByIdAndUpdate(
      audioRoom._id as string,
      updateQuery,
    );

    const updatedRoom = await this.audioRoomRepository.getAudioRoomById(roomId);
    const socketInstance = SingletonSocketServer.getInstance();
    socketInstance.emitToRoom(roomId, AudioRoomChannels.AudioRoomDetails, {
      audioRoom: updatedRoom,
    });
    return updatedRoom;
  }

  async lockAllSeats(
    myId: string,
    roomId: string,
  ): Promise<IAudioRoomDocument> {
    const audioRoom =
      await this.audioRoomRepository.checkRoomExisistance(roomId);
    if (!audioRoom) throw new AppError(404, "Audio Room Not Found");

    const audioHelper = AudioRoomHelper.getInstance();
    audioHelper.checkAuthorityInAudioRoom(myId, audioRoom, 1);

    const updateQuery: any = { $set: {} };
    const socketInstance = SingletonSocketServer.getInstance();

    for (const [key, seat] of audioRoom.seats.entries()) {
      updateQuery.$set[`seats.${key}.available`] = false;
      // remove seated members
      if (seat.member) {
        updateQuery.$set[`seats.${key}.member`] = null;
        socketInstance.emitToRoom(roomId, AudioRoomChannels.AudioSeatLeft, {
          seatKey: key,
          member: {},
        });
      }
    }

    await this.audioRoomRepository.findByIdAndUpdate(
      audioRoom._id as string,
      updateQuery,
    );

    const updatedRoom = await this.audioRoomRepository.getAudioRoomById(roomId);
    socketInstance.emitToRoom(roomId, AudioRoomChannels.AudioRoomDetails, {
      audioRoom: updatedRoom,
    });
    return updatedRoom;
  }

  async unlockAllSeats(
    myId: string,
    roomId: string,
  ): Promise<IAudioRoomDocument> {
    const audioRoom =
      await this.audioRoomRepository.checkRoomExisistance(roomId);
    if (!audioRoom) throw new AppError(404, "Audio Room Not Found");

    const audioHelper = AudioRoomHelper.getInstance();
    audioHelper.checkAuthorityInAudioRoom(myId, audioRoom, 1);

    const updateQuery: any = { $set: {} };

    for (const key of audioRoom.seats.keys()) {
      updateQuery.$set[`seats.${key}.available`] = true;
    }

    await this.audioRoomRepository.findByIdAndUpdate(
      audioRoom._id as string,
      updateQuery,
    );

    const updatedRoom = await this.audioRoomRepository.getAudioRoomById(roomId);
    const socketInstance = SingletonSocketServer.getInstance();
    socketInstance.emitToRoom(roomId, AudioRoomChannels.AudioRoomDetails, {
      audioRoom: updatedRoom,
    });
    return updatedRoom;
  }

  async updateRoomPhoto(
    myId: string,
    roomId: string,
    roomPhoto: string,
  ): Promise<IAudioRoomDocument> {
    const audioRoom =
      await this.audioRoomRepository.checkRoomExisistance(roomId);
    if (!audioRoom) throw new AppError(404, "Audio Room Not Found");

    const helperInstance = AudioRoomHelper.getInstance();
    helperInstance.checkAuthorityInAudioRoom(myId, audioRoom, 1);

    await this.audioRoomRepository.findByIdAndUpdate(audioRoom._id as string, {
      $set: {
        roomPhoto: roomPhoto,
      },
    });

    const updatedRoom = await this.audioRoomRepository.getAudioRoomById(roomId);
    const socketInstance = SingletonSocketServer.getInstance();
    socketInstance.emitToRoom(roomId, AudioRoomChannels.AudioRoomDetails, {
      audioRoom: updatedRoom,
    });
    return updatedRoom;
  }

  async banUser(
    myId: string,
    targetId: string,
    roomId: string,
    banType: ActivityZoneState,
    bannedTill?: string,
  ): Promise<IAudioRoomDocument> {
    // can't ban yourself
    if (myId === targetId) {
      throw new AppError(403, "You cannot ban yourself");
    }
    // validate room
    const audioRoom =
      await this.audioRoomRepository.checkRoomExisistance(roomId);
    if (!audioRoom) {
      throw new AppError(404, "Audio room not found");
    }
    // authority check (host or admin)
    const audioHelper = AudioRoomHelper.getInstance();
    audioHelper.checkAuthorityInAudioRoom(myId, audioRoom, 1, targetId);

    // validate target user
    const targetUser = await this.userRepository.findUserById(targetId);
    if (!targetUser) {
      throw new AppError(404, "User not found");
    }

    // validate banType
    if (!Object.values(ActivityZoneState).includes(banType)) {
      throw new AppError(400, "Invalid ban type");
    }
    if (banType === ActivityZoneState.temporaryBlock && !bannedTill) {
      throw new AppError(400, "bannedTill is required for temporary ban");
    }

    // build member details for the banned user entry
    const targetUserObj = targetUser.toObject();
    targetUserObj.equippedStoreItems = await getEquippedItemObjects(
      this.bucketRepository,
      this.categoryRepository,
      targetId,
    );
    const memberDetails: IMemberDetails = {
      _id: targetUserObj._id as string,
      name: targetUserObj.name as string,
      avatar: targetUserObj.avatar as string,
      uid: targetUserObj.uid as string,
      userId: targetUserObj.userId as number,
      country: targetUserObj.country as string,
      currentBackground: targetUserObj.currentLevelBackground as string,
      currentTag: targetUserObj.currentLevelTag as string,
      currentLevel: targetUserObj.level as number,
      equippedStoreItems: targetUserObj.equippedStoreItems as Record<
        string,
        string
      >,
    };

    // check if already banned → update, otherwise push
    const existingBan = audioRoom.bannedUsers.find(
      (b) => b.user._id?.toString() === targetId,
    );
    if (existingBan) {
      // update existing ban entry
      await this.audioRoomRepository.findByIdAndUpdate(
        audioRoom._id as string,
        {
          $set: {
            "bannedUsers.$[elem].banType": banType,
            "bannedUsers.$[elem].bannedTill": bannedTill || "",
          },
        },
      );
    } else {
      // push new ban entry
      await this.audioRoomRepository.findByIdAndUpdate(
        audioRoom._id as string,
        {
          $push: {
            bannedUsers: {
              user: memberDetails,
              banType,
              bannedTill: bannedTill || "",
            },
          },
        },
      );
    }

    // emit instance
    const socketInstance = SingletonSocketServer.getInstance();

    // remove target from seats
    const updateQuery: any = { $unset: {} };
    let seatRemoved = false;
    // check host seat
    if (audioRoom.hostSeat.member?._id?.toString() === targetId) {
      updateQuery.$set = { hostSeat: { available: true, member: null } };
      seatRemoved = true;
      socketInstance.emitToRoom(roomId, AudioRoomChannels.AudioSeatLeft, {
        seatKey: "hostSeat",
        member: {},
      });
    }
    // check regular seats
    for (const [key, seat] of audioRoom.seats.entries()) {
      if (seat.member?._id?.toString() === targetId) {
        if (!updateQuery.$set) updateQuery.$set = {};
        updateQuery.$set[`seats.${key}`] = { available: true, member: null };
        socketInstance.emitToRoom(roomId, AudioRoomChannels.AudioSeatLeft, {
          seatKey: `seats.${key}`,
          member: {},
        });
      }
    }

    // remove from members
    if (!updateQuery.$unset) updateQuery.$unset = {};
    updateQuery.$unset[`members.${targetId}`] = "";

    // also pull from membersArray
    if (!updateQuery.$pull) updateQuery.$pull = {};
    updateQuery.$pull["membersArray"] = targetId;

    // clean up empty $unset / $set
    if (Object.keys(updateQuery.$unset).length === 0) delete updateQuery.$unset;

    await this.audioRoomRepository.findByIdAndUpdate(
      audioRoom._id as string,
      updateQuery,
    );

    const updatedRoom = await this.audioRoomRepository.getAudioRoomById(roomId);
    socketInstance.emitToRoom(roomId, AudioRoomChannels.BanUser, {
      bannedUsers: updatedRoom.bannedUsers,
    });
    socketInstance.emitToRoom(roomId, AudioRoomChannels.AudioRoomDetails, {
      audioRoom: updatedRoom,
    });
    return updatedRoom;
  }

  async unbanUser(
    myId: string,
    targetId: string,
    roomId: string,
  ): Promise<IAudioRoomDocument> {
    // can't unban yourself
    if (myId === targetId) {
      throw new AppError(403, "You cannot unban yourself");
    }
    // validate room
    const audioRoom =
      await this.audioRoomRepository.checkRoomExisistance(roomId);
    if (!audioRoom) {
      throw new AppError(404, "Audio room not found");
    }
    // authority check (host or admin)
    const audioHelper = AudioRoomHelper.getInstance();
    audioHelper.checkAuthorityInAudioRoom(myId, audioRoom, 1, targetId);

    // check if target is actually banned
    const isBanned = audioRoom.bannedUsers.some(
      (b) => b.user._id?.toString() === targetId,
    );
    if (!isBanned) {
      throw new AppError(404, "User is not banned");
    }

    // remove from bannedUsers
    await this.audioRoomRepository.findByIdAndUpdate(audioRoom._id as string, {
      $pull: {
        bannedUsers: { "user._id": targetId },
      },
    });

    // emit socket events
    const updatedRoom = await this.audioRoomRepository.getAudioRoomById(roomId);
    const socketInstance = SingletonSocketServer.getInstance();
    socketInstance.emitToRoom(roomId, AudioRoomChannels.UnBanUser, {
      bannedUsers: updatedRoom.bannedUsers,
    });
    socketInstance.emitToRoom(roomId, AudioRoomChannels.AudioRoomDetails, {
      audioRoom: updatedRoom,
    });
    return updatedRoom;
  }

  async updateRoomPassword({
    myId,
    roomId,
    password,
  }: {
    myId: string;
    roomId: string;
    password: string;
  }): Promise<IAudioRoomDocument> {
    const audioRoom =
      await this.audioRoomRepository.checkRoomExisistance(roomId);
    if (!audioRoom) {
      throw new AppError(404, "Audio room not found");
    }
    const helperInstance = AudioRoomHelper.getInstance();
    helperInstance.checkAuthorityInAudioRoom(myId, audioRoom, 1);

    // if password is empty string → unlock the room
    // if password has a value → lock the room with the password
    const isLocked = password !== "";

    await this.audioRoomRepository.findByIdAndUpdate(audioRoom._id as string, {
      $set: {
        password: password,
        isLocked: isLocked,
      },
    });

    const updatedRoom = await this.audioRoomRepository.getAudioRoomById(roomId);
    const socketInstance = SingletonSocketServer.getInstance();
    socketInstance.emitToRoom(roomId, AudioRoomChannels.AudioRoomDetails, {
      audioRoom: updatedRoom,
    });
    return updatedRoom;
  }

  async updateSeatCount(myId: string, roomId: string, seatCount: number): Promise<IAudioRoomDocument> {
    
  }
}
