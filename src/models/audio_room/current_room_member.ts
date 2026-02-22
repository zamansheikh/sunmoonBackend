import mongoose, { Document, Model, Models, Schema, Types } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

export interface ICurrentRoomMember {
  userId: string | Types.ObjectId;
  roomId: string;
}

export interface ICurrentRoomMemberDocument
  extends ICurrentRoomMember, Document {}

export interface ICurrentRoomMemberModel extends Model<ICurrentRoomMemberDocument> {}

const CurrentRoomMemberSchema = new Schema<ICurrentRoomMemberDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: DatabaseNames.User,
      unique: true,
    },
    roomId: {
      type: String,
    },
  },
  { timestamps: true },
);

const CurrentRoomMemberModel: ICurrentRoomMemberModel =
  mongoose.model<ICurrentRoomMemberDocument>(
    DatabaseNames.CurrentRoomMember,
    CurrentRoomMemberSchema,
    DatabaseNames.CurrentRoomMember,
  );

export default CurrentRoomMemberModel;
