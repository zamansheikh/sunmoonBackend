import { model, Model, Schema } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

export interface IRecentVisitedRoom {
  userId: string;
  roomId: string;
  visitedAt: Date;
  expireAt: Date;
}

export interface IRecentVisitedRoomDocument
  extends IRecentVisitedRoom, Document {}

export interface IRecentVisitedRoomModel extends Model<IRecentVisitedRoomDocument> {}

const recentVisitedRoomSchema = new Schema<
  IRecentVisitedRoomDocument,
  IRecentVisitedRoomModel
>(
  {
    userId: { type: String, required: true },
    roomId: { type: String, required: true },
    visitedAt: { type: Date, default: Date.now() },
    expireAt: { type: Date, default: Date.now() + 30 * 24 * 60 * 60 * 1000 }, // 1 month validity
  },
  { timestamps: true },
);

const RecentVisitedRoomModel = model<
  IRecentVisitedRoomDocument,
  IRecentVisitedRoomModel
>(
  DatabaseNames.RecentVisitedRoom,
  recentVisitedRoomSchema,
  DatabaseNames.RecentVisitedRoom,
);

export default RecentVisitedRoomModel;
