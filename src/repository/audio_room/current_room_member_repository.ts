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
    userId: string,
    roomId: string,
  ): Promise<ICurrentRoomMemberDocument | null>;
  delete(userId: string): Promise<ICurrentRoomMemberDocument | null>;
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
    userId: string,
    roomId: string,
  ): Promise<ICurrentRoomMemberDocument | null> {
    const res = await this.Model.findOneAndUpdate(
      { userId }, // filter
      { $set: { roomId } }, // always set new room
      {
        upsert: true,
        returnDocument: "before", // or true in some drivers
        projection: { roomId: 1 }, // we only need old roomId
      },
    );
    return res;
  }
  async delete(userId: string): Promise<ICurrentRoomMemberDocument | null> {
    const res = await this.Model.findOneAndDelete({ userId });
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
