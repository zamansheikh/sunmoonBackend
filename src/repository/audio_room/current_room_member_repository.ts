import AppError from "../../core/errors/app_errors";
import {
  ICurrentRoomMember,
  ICurrentRoomMemberDocument,
  ICurrentRoomMemberModel,
} from "../../models/audio_room/current_room_member";

export interface ICurrentRoomMemberRepository {
  create(
    data: Partial<ICurrentRoomMember>,
  ): Promise<ICurrentRoomMemberDocument>;
  update(
    id: string,
    data: Partial<ICurrentRoomMember>,
  ): Promise<ICurrentRoomMemberDocument>;
  delete(id: string): Promise<ICurrentRoomMemberDocument>;
  getByUserId(userId: string): Promise<ICurrentRoomMemberDocument | null>;
  getByRoomId(roomId: string): Promise<ICurrentRoomMemberDocument | null>;
}

export class CurrentRoomMemberRepository implements ICurrentRoomMemberRepository {
  Model: ICurrentRoomMemberModel;
  constructor(model: ICurrentRoomMemberModel) {
    this.Model = model;
  }
  async create(
    data: Partial<ICurrentRoomMember>,
  ): Promise<ICurrentRoomMemberDocument> {
    return await this.Model.create(data);
  }
  async update(
    id: string,
    data: Partial<ICurrentRoomMember>,
  ): Promise<ICurrentRoomMemberDocument> {
    const res = await this.Model.findByIdAndUpdate(id, data, { new: true });
    if (!res) throw new AppError(404, "Current room member not found");
    return res;
  }
  async delete(id: string): Promise<ICurrentRoomMemberDocument> {
    const res = await this.Model.findByIdAndDelete(id);
    if (!res) throw new AppError(404, "Current room member not found");
    return res;
  }
  async getByUserId(
    userId: string,
  ): Promise<ICurrentRoomMemberDocument | null> {
    return await this.Model.findOne({ userId });
  }
  async getByRoomId(
    roomId: string,
  ): Promise<ICurrentRoomMemberDocument | null> {
    return await this.Model.findOne({ roomId });
  }
}
