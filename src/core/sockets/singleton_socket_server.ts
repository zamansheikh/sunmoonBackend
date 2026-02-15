import { Server, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import {
  IAudioRoom,
  IAudioRoomDocument,
} from "../../models/audio_room/audio_room_model";
import { AudioRoomRepository } from "../../repository/audio_room/audio_room_repository";
import UserRepository from "../../repository/users/user_repository";
import { AudioRoomChannels } from "../Utils/enums";

export default class SingletonSocketServer {
  private static instance: SingletonSocketServer;
  private io: Server;

  private onlineUsers = new Map<string, string>(); // Map<userId, socketId>
  private disconnectedUsers = new Map<
    string,
    { timeOut: NodeJS.Timeout; roomId?: string }
  >(); // Map<userId, socketId>

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
    this.io.on("connection", (socket) => {
      const userId = socket.handshake.query.userId as string;
      if (userId) {
        this.onlineUsers.set(userId, socket.id);
        console.log(`User ${userId} connected`);
      }

      socket.on("disconnect", () => {
        // remove the users when disconnected from online users
        if (userId) {
          this.onlineUsers.delete(userId);
          console.log(`User ${userId} disconnected`);
        }
        // * persist audio room connection
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

  public emitToRoom(roomId: string, event: string, data: any) {
    this.io.to(roomId).emit(event, data);
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

  public handleAudioRoomDisconnection(
    userId: string,
    room: IAudioRoomDocument,
    roomRepository: AudioRoomRepository,
    userRepository: UserRepository,
  ) {
    const isHost = room.hostId === userId;
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
      for (const seat of room.seats.values()) {
        if (seat.member?._id?.toString() === userId) {
          seat.member = undefined;
          this.emitToRoom(room.roomId, AudioRoomChannels.AudioSeatLeft, {
            seatKey: seat.seatKey,
            member: {},
          });
        }
      }
      // leave the audio room -> send roomwide message

      // disconnect from socket room
    }

    const isMember = room.members.has(userId);
    if (isMember) {
      // remove from seat if seated
      // leave the audio room -> send roomwide message
      // remove from members and member details
      // remove from muted users
      // disconnect from socket room
    }
  }
}
