import mongoose, { Document, Model, Schema } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

export interface IRoomSupport {
  roomId: string;
  uniqueUsers: (mongoose.Types.ObjectId | string)[]; // Acted as a Set via $addToSet in repository
  roomTransaction: number;
  roomLevel?: number;
  roomPartners?: (mongoose.Types.ObjectId | string)[];
}

export interface IRoomSupportDocument extends IRoomSupport, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IRoomSupportModel extends Model<IRoomSupportDocument> {}

const RoomSupportSchema = new Schema<IRoomSupportDocument, IRoomSupportModel>(
  {
    roomId: { type: String, required: true, unique: true },
    uniqueUsers: [{ type: Schema.Types.ObjectId, ref: DatabaseNames.User }], // Set of unique user IDs
    roomTransaction: { type: Number, default: 0 },
    roomLevel: { type: Number, default: 0 },
    roomPartners: [{ type: Schema.Types.ObjectId, ref: DatabaseNames.User }],
  },
  { timestamps: true },
);

const RoomSupportModel = mongoose.model<
  IRoomSupportDocument,
  IRoomSupportModel
>(DatabaseNames.RoomSupport, RoomSupportSchema, DatabaseNames.RoomSupport);

export default RoomSupportModel;
