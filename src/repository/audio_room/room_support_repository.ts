import AppError from "../../core/errors/app_errors";
import RoomSupportModel, {
  IRoomSupport,
  IRoomSupportDocument,
  IRoomSupportModel,
} from "../../models/audio_room/room_support_model";

export interface IRoomSupportRepository {
  create(data: Partial<IRoomSupport>): Promise<IRoomSupportDocument>;
  getByRoomId(roomId: string): Promise<IRoomSupportDocument | null>;
  update(
    roomId: string,
    data: Partial<IRoomSupport>,
  ): Promise<IRoomSupportDocument>;
  addUniqueUser(roomId: string, userId: string): Promise<IRoomSupportDocument>;
  incrementTransaction(
    roomId: string,
    amount: number,
  ): Promise<IRoomSupportDocument>;
  delete(roomId: string): Promise<IRoomSupportDocument | null>;
  clearRoomSupport(): Promise<void>;
}

export class RoomSupportRepository implements IRoomSupportRepository {
  Model: IRoomSupportModel;

  constructor(model: IRoomSupportModel) {
    this.Model = model;
  }

  async create(data: Partial<IRoomSupport>): Promise<IRoomSupportDocument> {
    return await this.Model.create(data);
  }

  async getByRoomId(roomId: string): Promise<IRoomSupportDocument | null> {
    return await this.Model.findOne({ roomId });
  }

  async update(
    roomId: string,
    data: Partial<IRoomSupport>,
  ): Promise<IRoomSupportDocument> {
    const res = await this.Model.findOneAndUpdate(
      { roomId },
      { $set: data },
      { new: true, upsert: true },
    );
    if (!res) throw new AppError(404, "Room support record not found");
    return res;
  }

  /** Adds a userId to uniqueUsers only if it is not already present ($addToSet). */
  async addUniqueUser(
    roomId: string,
    userId: string,
  ): Promise<IRoomSupportDocument> {
    const res = await this.Model.findOneAndUpdate(
      { roomId },
      { $addToSet: { uniqueUsers: userId } },
      { new: true, upsert: true },
    );
    if (!res) throw new AppError(404, "Room support record not found");
    return res;
  }

  /** Atomically increments roomTransaction by the given amount. */
  async incrementTransaction(
    roomId: string,
    amount: number,
  ): Promise<IRoomSupportDocument> {
    const res = await this.Model.findOneAndUpdate(
      { roomId },
      { $inc: { roomTransaction: amount } },
      { new: true, upsert: true },
    );
    if (!res) throw new AppError(404, "Room support record not found");
    return res;
  }

  async delete(roomId: string): Promise<IRoomSupportDocument | null> {
    return await this.Model.findOneAndDelete({ roomId });
  }

  async clearRoomSupport(): Promise<void> {
    await this.Model.deleteMany({});
  }
}
