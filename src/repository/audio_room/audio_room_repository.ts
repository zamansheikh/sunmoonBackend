import {
  IAudioRoom,
  IAudioRoomDocument,
  IAudioRoomModel,
} from "../../models/audio_room/audio_room_model";

export interface IAudioRoomRepository {
  createAudioRoom(audioRoom: IAudioRoom): Promise<IAudioRoomDocument>;
  getAudioRoomById(roomId: string): Promise<IAudioRoomDocument | null>;
  updateAudioRoom(
    roomId: string,
    audioRoom: Partial<IAudioRoom>,
  ): Promise<IAudioRoomDocument>;
  deleteAudioRoom(roomId: string): Promise<IAudioRoomDocument>;
  getAllAudioRooms(): Promise<IAudioRoomDocument[]>;
}

export class AudioRoomRepository implements IAudioRoomRepository {
  audioRoomModel: IAudioRoomModel;
  constructor(audioRoomModel: IAudioRoomModel) {
    this.audioRoomModel = audioRoomModel;
  }
  async createAudioRoom(audioRoom: IAudioRoom): Promise<IAudioRoomDocument> {
    throw new Error("Method not implemented.");
  }
  async getAudioRoomById(roomId: string): Promise<IAudioRoomDocument | null> {
    return await this.audioRoomModel.findOne({ roomId });
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
