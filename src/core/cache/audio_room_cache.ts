import AudioRoomModel from "../../models/audio_room/audio_room_model";
import { AudioRoomRepository } from "../../repository/audio_room/audio_room_repository";
import { RepositoryProviders } from "../providers/repository_providers";

interface IBasicRoomInfo {
  roomId: string;
  title: string;
  roomPhoto?: string;
  announcement?: string;
  roomLevel: number;
  hostId: string;
  ttl: number;
}

export class AudioRoomCache {
  private static instance: AudioRoomCache | null = null;

  private cachedRooms = new Map<string, number>();
  private cachedRoomInfo = new Map<string, IBasicRoomInfo>();
  private cachedHostToRoom = new Map<string, { roomId: string; ttl: number }>();
  private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour
  public audioRoomRepository = RepositoryProviders.audioRoomRepositoryProvider;
  public roomSupportRepository =
    RepositoryProviders.roomSupportRepositoryProvider;

  private constructor() {}

  public static getInstance(): AudioRoomCache {
    if (AudioRoomCache.instance === null) {
      AudioRoomCache.instance = new AudioRoomCache();
    }
    return AudioRoomCache.instance;
  }

  public async validateRoomId(roomId: string): Promise<boolean> {
    const expiry = this.cachedRooms.get(roomId);
    if (expiry && expiry > Date.now()) return true;

    const room = await this.audioRoomRepository.checkRoomExisistance(roomId);
    if (room) {
      this.cachedRooms.set(roomId, Date.now() + this.CACHE_TTL);
      return true;
    }
    return false;
  }

  public async getBasicRoomInfo(
    roomId: string,
  ): Promise<IBasicRoomInfo | null> {
    const expiry = this.cachedRoomInfo.get(roomId);
    if (expiry && expiry.ttl > Date.now()) return expiry;

    const room = await this.audioRoomRepository.checkRoomExisistance(roomId);
    if (room) {
      const support = await this.roomSupportRepository.getByRoomId(roomId);
      this.cachedRoomInfo.set(roomId, {
        roomId: room.roomId,
        title: room.title,
        roomPhoto: room.roomPhoto,
        announcement: room.announcement,
        roomLevel: support?.roomLevel || 0,
        hostId: room.hostId.toString(),
        ttl: Date.now() + this.CACHE_TTL,
      });
      return this.cachedRoomInfo.get(roomId)!;
    }
    return null;
  }

  public async getRoomIdByHostId(hostId: string): Promise<string | null> {
    const cached = this.cachedHostToRoom.get(hostId);
    if (cached && cached.ttl > Date.now()) return cached.roomId;

    const roomId = await this.audioRoomRepository.getAudioRoomByHostId(hostId);
    if (roomId) {
      this.cachedHostToRoom.set(hostId, {
        roomId: roomId,
        ttl: Date.now() + this.CACHE_TTL,
      });
      return roomId;
    }
    return null;
  }

  public invalidate(roomId: string) {
    const info = this.cachedRoomInfo.get(roomId);
    if (info) {
      this.cachedHostToRoom.delete(info.hostId);
    }
    this.cachedRooms.delete(roomId);
    this.cachedRoomInfo.delete(roomId);
  }
}
