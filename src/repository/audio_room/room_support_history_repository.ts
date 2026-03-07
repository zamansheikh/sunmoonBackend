import AppError from "../../core/errors/app_errors";
import RoomSupportHistoryModel, {
  IRoomSupportHistory,
  IRoomSupportHistoryDocument,
  IRoomSupportHistoryModel,
} from "../../models/audio_room/room_support_history_model";

export interface IRoomSupportHistoryRepository {
  create(data: IRoomSupportHistory): Promise<IRoomSupportHistoryDocument>;
  getByRoomId(roomId: string): Promise<IRoomSupportHistoryDocument | null>;
  deleteByRoomId(roomId: string): Promise<void>;
  getAll(): Promise<IRoomSupportHistoryDocument[]>;
}

export class RoomSupportHistoryRepository implements IRoomSupportHistoryRepository {
  Model: IRoomSupportHistoryModel;

  constructor(model: IRoomSupportHistoryModel) {
    this.Model = model;
  }

  async create(
    data: IRoomSupportHistory,
  ): Promise<IRoomSupportHistoryDocument> {
    const existing = await this.getByRoomId(data.roomId);
    if (existing) {
      await this.deleteByRoomId(data.roomId);
    }
    const created = await this.Model.create(data);
    if (!created) throw new AppError(500, "Failed to create room support history");
    return created;
  }

  async getByRoomId(
    roomId: string,
  ): Promise<IRoomSupportHistoryDocument | null> {
    return await this.Model.findOne({ roomId });
  }

  async getAll(): Promise<IRoomSupportHistoryDocument[]> {
    return await this.Model.find({}).sort({ createdAt: -1 });
  }

  async deleteByRoomId(roomId: string): Promise<void> {
    await this.Model.deleteOne({ roomId });
  }
}
