import AppError from "../../core/errors/app_errors";
import RecentVisitedRoomModel, {
  IRecentVisitedRoom,
  IRecentVisitedRoomDocument,
  IRecentVisitedRoomModel,
} from "../../models/audio_room/recent_visited_room_model";

export interface IRecentVisitedRoomRepository {
  create(
    data: Partial<IRecentVisitedRoom>,
  ): Promise<IRecentVisitedRoomDocument>;
  update(
    id: string,
    data: Partial<IRecentVisitedRoom>,
  ): Promise<IRecentVisitedRoomDocument>;
  getCombo(
    userId: string,
    roomId: string,
  ): Promise<IRecentVisitedRoomDocument | null>;
}

export class RecentVisitedRoomRepository implements IRecentVisitedRoomRepository {
  Model: IRecentVisitedRoomModel;

  constructor(model: IRecentVisitedRoomModel) {
    this.Model = model;
  }

  async create(
    data: Partial<IRecentVisitedRoom>,
  ): Promise<IRecentVisitedRoomDocument> {
    const exisitngCombo = await this.getCombo(data.userId!, data.roomId!);
    if (exisitngCombo) {
      return await this.update(exisitngCombo._id as string, {
        expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        visitedAt: new Date(),
      });
    }
    return await this.Model.create(data);
  }
  async update(
    id: string,
    data: Partial<IRecentVisitedRoom>,
  ): Promise<IRecentVisitedRoomDocument> {
    const res = await this.Model.findByIdAndUpdate(id, data, {
      new: true,
    });
    if (!res) throw new AppError(404, "Recent visited room not found");
    return res;
  }
  async getCombo(
    userId: string,
    roomId: string,
  ): Promise<IRecentVisitedRoomDocument | null> {
    return await RecentVisitedRoomModel.findOne({ userId, roomId });
  }
}
