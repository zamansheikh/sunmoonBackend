import { Server, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import AudioRoomModel, {
  IAudioRoom,
  IAudioRoomDocument,
  IRoomMessage,
} from "../../models/audio_room/audio_room_model";
import { AudioRoomRepository } from "../../repository/audio_room/audio_room_repository";
import UserRepository, {
  IUserRepository,
} from "../../repository/users/user_repository";
import { AudioRoomChannels, SocketAudioChannels } from "../Utils/enums";
import MyBucketRepository, {
  IMyBucketRepository,
} from "../../repository/store/my_bucket_repository";
import StoreCategoryRepository, {
  IStoreCategoryRepository,
} from "../../repository/store/store_category_repository";
import { getEquippedItemObjects } from "../Utils/helper_functions";
import {
  ALLOWED_MESSAGES_COUNT,
  PERSISTENT_CONNECTION_TIMEOUT,
} from "../Utils/constants";
import User from "../../models/user/user_model";
import MyBucketModel from "../../models/store/my_bucket_model";
import StoreCategoryModel from "../../models/store/store_category_model";
import { CurrentRoomMemberRepository } from "../../repository/audio_room/current_room_member_repository";
import CurrentRoomMemberModel from "../../models/audio_room/current_room_member";
import { AudioRoomHelper } from "../helper_classes/audioRoomHelper";

export default class SingletonSocketServer {
  private static instance: SingletonSocketServer;
  private io: Server;

  private onlineUsers = new Map<string, string>(); // Map<userId, socketId>
  private disconnectedUsers = new Map<
    string,
    { timeOut: NodeJS.Timeout; roomId?: string }
  >(); // Map<userId, socketId>

  // repositories
  private audioRoomRepository = new AudioRoomRepository(AudioRoomModel);
  private userRepository = new UserRepository(User);
  private bucketRepository = new MyBucketRepository(MyBucketModel);
  private categoryRepository = new StoreCategoryRepository(StoreCategoryModel);
  private currentRoomMemberRepository = new CurrentRoomMemberRepository(
    CurrentRoomMemberModel,
  );

  // Private constructor: enforce singleton usage
  private constructor(server: HttpServer) {
    this.io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });
    this.initialize();
  }

  public static async initialize(
    server: HttpServer,
  ): Promise<SingletonSocketServer> {
    if (!SingletonSocketServer.instance) {
      SingletonSocketServer.instance = new SingletonSocketServer(server);
    }
    return SingletonSocketServer.instance;
  }

  public static getInstance(): SingletonSocketServer {
    if (!SingletonSocketServer.instance) {
      throw new Error(
        "SocketServer not initialized. Call initialize(server) first.",
      );
    }
    return SingletonSocketServer.instance;
  }

  private initialize() {
    this.io.on("connection", async (socket) => {
      const userId = socket.handshake.query.userId as string;
      if (userId) {
        await this.handleUserConnect(userId, socket);
      }

      // Send Audio Emoji
      socket.on(
        AudioRoomChannels.SendEmoji,
        ({
          roomId,
          seatKey,
          emoji,
        }: {
          roomId: string;
          seatKey: string;
          emoji: string;
        }) => {
          const room = this.io.sockets.adapter.rooms.get(roomId);
          console.log(room);
          if (!room) return;
          this.emitToRoom(roomId, AudioRoomChannels.SendEmoji, {
            seatKey,
            emoji,
            sender: userId,
          });
        },
      );

      socket.on("disconnect", async () => {
        // remove the users when disconnected from online users
        if (userId) {
          this.onlineUsers.delete(userId);
          console.log(`User ${userId} disconnected`);
        }
        // * persist audio room connection
        const room = await this.audioRoomRepository.isMemberInAnyRoom(userId);
        if (room) {
          const timeOut = setTimeout(() => {
            this.disconnectedUsers.delete(userId);
            this.handleAudioRoomDisconnection(userId, room);
          }, PERSISTENT_CONNECTION_TIMEOUT);
          this.disconnectedUsers.set(userId, { timeOut, roomId: room.roomId });
        }
      });
    });
  }

  public getIO(): Server {
    return this.io;
  }

  public isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }

  public getSocketId(userId: string): string | undefined {
    return this.onlineUsers.get(userId);
  }

  public joinRoomSocket(userId: string, roomId: string) {
    const socketId = this.getSocketId(userId);
    if (socketId) {
      this.io.sockets.sockets.get(socketId)?.join(roomId);
    }
  }

  public leaveRoomSocket(userId: string, roomId: string) {
    const socketId = this.getSocketId(userId);
    if (socketId) {
      this.io.sockets.sockets.get(socketId)?.leave(roomId);
    }
  }

  public emitToUser(userId: string, event: string, data: any) {
    const socketId = this.getSocketId(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  public emitToRoom(roomId: string, event: string, data: any) {
    if (roomId == "") {
      this.io.emit(event, data);
    } else {
      this.io.to(roomId).emit(event, data);
    }
  }

  public emitToAll(event: string, data: any) {
    this.io.emit(event, data);
  }

  public roomSearializer(room: IAudioRoom) {
    return {
      title: room.title,
      numberOfSeats: room.numberOfSeats,
      announcement: room.announcement,
      roomId: room.roomId,
      roomPhoto: room.roomPhoto,
      currentRocketLevel: room.currentRocketLevel,
      currentRocketFuel: room.currentRocketFuel,
      currentRocketMilestone: room.currentRocketMilestone,
      admins: room.admins,
      hostTotalSendGift: room.hostTotalSendGift,
      hostTotalRecievedGift: room.hostTotalRecievedGift,
      roomTotalTransaction: room.roomTotalTransaction,
      hostSeat: room.hostSeat,
      seats: Object.fromEntries(room.seats),
      messages: room.messages,
      members: Object.fromEntries(room.members),
      membersArray: room.membersArray,
      bannedUsers: room.bannedUsers,
      mutedUsers: Object.fromEntries(room.mutedUsers),
      chatPrivacy: room.chatPrivacy,
      allowedUsersToChat: Object.fromEntries(room.allowedUsersToChat),
      password: room.password,
      isHostPresent: room.isHostPresent,
      isLocked: room.isLocked,
      hostId: room.hostId,
      uniqueUsers: Object.fromEntries(room.uniqueUsers),
      roomLevel: room.roomLevel,
      roomPartners: room.roomPartners,
    };
  }

  private async handleUserConnect(userId: string, socket: Socket) {
    if (this.disconnectedUsers.has(userId)) {
      const { timeOut, roomId } = this.disconnectedUsers.get(userId)!;
      clearTimeout(timeOut);
      this.disconnectedUsers.delete(userId);
      if (roomId) {
        socket.join(roomId);
      }
    } else {
      const room = await this.audioRoomRepository.isMemberInAnyRoom(userId);
      if (room) {
        socket.join(room.roomId);
      }
    }
    this.onlineUsers.set(userId, socket.id);
    console.log(`User ${userId} connected with socket ID: ${socket.id}`);
  }

  // this function here instead of being in the audio helper
  //  because its more convinent to handle the room logic here`
  // and when i wrote it here, i didnt have the audio helper
  // its a drag to move it there, if you think I am lazy, then I am
  // you can move it there if you want, but I dont think its necessary
  //  at least for me
  //  Also because this function extensivly uses the socket server
  public async handleAudioRoomDisconnection(
    userId: string,
    room: IAudioRoomDocument,
  ) {
    try {
      const helperInstance = AudioRoomHelper.getInstance();
      const isHost = room.hostId?.toString() === userId;
      const user = await this.userRepository.findUserById(userId);
      if (!user) {
        return room;
      }
      const userObj = user.toObject();
      userObj.equippedStoreItems = await getEquippedItemObjects(
        this.bucketRepository,
        this.categoryRepository,
        userId,
      );
      //leave message
      const leaveMessage: IRoomMessage = helperInstance.generateRoomMessage(
        userObj,
        "left the room",
      );
      if (isHost) {
        // remove from seat if seated
        // Check host seat
        if (room.hostSeat?.member?._id?.toString() === userId) {
          room.hostSeat.member = undefined;
          this.emitToRoom(room.roomId, AudioRoomChannels.AudioSeatLeft, {
            seatKey: "hostSeat",
            member: {},
          });
        }

        // Check other seats
        for (const [seatKey, seat] of room.seats.entries()) {
          if (seat.member?._id?.toString() === userId) {
            seat.member = undefined;
            this.emitToRoom(room.roomId, AudioRoomChannels.AudioSeatLeft, {
              seatKey: seatKey,
              member: {},
            });
          }
        }
        // remove from members and member details
        room.members.delete(userId);
        room.membersArray = room.membersArray.filter(
          (member) => member.toString() !== userId,
        );

        // send room wide leave message
        if (room.messages.length > ALLOWED_MESSAGES_COUNT)
          room.messages.shift();
        room.messages.push(leaveMessage);
        this.emitToRoom(room.roomId, AudioRoomChannels.AudioRoomMessage, {
          message: leaveMessage,
        });
        // leave the audio room -> send roomwide message
        room.isHostPresent = false;
        this.emitToRoom(room.roomId, AudioRoomChannels.UserLeft, {
          userId: userId,
          isHostPresent: false,
        });

        // a room is considered close when there are no members
        if (room.membersArray.length == 0) {
          this.emitToRoom("", AudioRoomChannels.AudioRoomClosed, {
            roomId: room.roomId,
          });
        }

        // disconnect from socket room
        const socketId = this.getSocketId(userId);
        if (socketId) {
          this.io.sockets.sockets.get(socketId)?.leave(room.roomId);
        }
      }

      const isMember = room.members.has(userId);
      if (isMember) {
        // remove from seat if seated
        for (const [seatKey, seat] of room.seats.entries()) {
          if (seat.member?._id?.toString() === userId) {
            seat.member = undefined;
            this.emitToRoom(room.roomId, AudioRoomChannels.AudioSeatLeft, {
              seatKey: seatKey,
              member: {},
            });
          }
        }
        // remove from members and member details
        room.members.delete(userId);
        room.membersArray = room.membersArray.filter(
          (member) => member.toString() !== userId,
        );
        // remove from muted users
        if (room.mutedUsers.has(userId)) {
          room.mutedUsers.delete(userId);
          this.emitToRoom(room.roomId, AudioRoomChannels.muteUnmuteUser, {
            mutedUsers: Array.from(room.mutedUsers.keys()),
          });
        }
        // send room wide leave message
        if (room.messages.length > ALLOWED_MESSAGES_COUNT)
          room.messages.shift();
        room.messages.push(leaveMessage);
        this.emitToRoom(room.roomId, AudioRoomChannels.AudioRoomMessage, {
          message: leaveMessage,
        });
        // leave the audio room -> send roomwide message
        this.emitToRoom(room.roomId, AudioRoomChannels.UserLeft, {
          userId: userId,
        });
        // a room is considered close when there are no members
        if (room.membersArray.length == 0) {
          this.emitToRoom("", AudioRoomChannels.AudioRoomClosed, {
            roomId: room.roomId,
          });
        }
        // disconnect from socket room
        const socketId = this.getSocketId(userId);
        if (socketId) {
          this.io.sockets.sockets.get(socketId)?.leave(room.roomId);
        }
      }
      return await room.save();
    } catch (error) {
      console.log("Error in handleAudioRoomDisconnection", error);
      return room;
    }
  }
}
