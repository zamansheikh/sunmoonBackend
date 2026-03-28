import mongoose, { Model, Schema, Types } from "mongoose";
import { DatabaseNames, StatusTypes } from "../../core/Utils/enums";

export interface IFamilyJoinRequest {
  familyId: string | Types.ObjectId;
  userId: string | Types.ObjectId;
  status?: StatusTypes;
}

export interface IFamilyJoinRequestDocument
  extends IFamilyJoinRequest, mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IFamilyJoinRequestModel extends Model<IFamilyJoinRequestDocument> {}

const FamilyJoinRequestSchema = new Schema<IFamilyJoinRequestDocument>(
  {
    familyId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: DatabaseNames.Family,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      unique: true,
      ref: DatabaseNames.User,
    },
    status: {
      type: String,
      enum: StatusTypes,
      default: StatusTypes.pending,
    },
  },
  {
    timestamps: true,
  },
);

FamilyJoinRequestSchema.index({ familyId: 1, userId: 1 }, { unique: true });

const FamilyJoinRequestModel = mongoose.model<
  IFamilyJoinRequestDocument,
  IFamilyJoinRequestModel
>(
  DatabaseNames.FamilyJoinRequest,
  FamilyJoinRequestSchema,
  DatabaseNames.FamilyJoinRequest,
);

export default FamilyJoinRequestModel;
