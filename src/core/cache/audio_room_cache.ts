import AudioRoomModel from "../../models/audio_room/audio_room_model";
import { AudioRoomRepository } from "../../repository/audio_room/audio_room_repository";
import { RepositoryProviders } from "../providers/repository_providers";

export class AudioRoomCache {
  private static instance: AudioRoomCache | null = null;

  private cachedRooms = new Map<string, number>();
  private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour
  public audioRoomRepository = RepositoryProviders.audioRoomRepositoryProvider;

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

  public invalidate(roomId: string) {
    this.cachedRooms.delete(roomId);
  }
}
