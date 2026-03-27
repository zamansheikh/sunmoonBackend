import mongoose, { Document, Model, Schema, Types } from "mongoose";
import { DatabaseNames, FamilyJoinMode } from "../../core/Utils/enums";

/**
 * Interface representing the data structure of a Family.
 */
export interface IFamily {
  name: string;
  introduction: string;
  joinMode?: FamilyJoinMode;
  minLevel?: number;
  ownerId: Types.ObjectId | string;
  memberCount?: number;
  totalGifts?: number;
  lastUpdatedAt?: Date;
  lastEmptyAt?: Date;
}

/**
 * Interface representing the Mongoose document for a Family.
 */
export interface IFamilyDocument extends IFamily, Document {
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface representing the Mongoose model for a Family.
 */
export interface IFamilyModel extends Model<IFamilyDocument> {}

const familySchema = new Schema<IFamilyDocument>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    introduction: {
      type: String,
      required: true,
    },
    joinMode: {
      type: String,
      enum: Object.values(FamilyJoinMode),
      default: FamilyJoinMode.Free,
    },
    minLevel: {
      type: Number,
      default: 0,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: DatabaseNames.User,
      required: true,
    },
    memberCount: {
      type: Number,
      default: 0,
      index: true,
    },
    totalGifts: {
      type: Number,
      default: 0,
      index: true,
    }, // cached sum
    lastUpdatedAt: {
      type: Date,
      default: Date.now,
    }, // for weekly update limit
    lastEmptyAt: {
      type: Date,
    }, // for auto-deletion
    createdAt: {
      type: Date,
      default: Date.now,
      expires: "30d",
    }, // optional soft TTL
  },
  {
    timestamps: true,
  },
);

// Explicitly ensure the createdAt index handles TTL if not handled by schema option
// familySchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days in seconds

const FamilyModel = mongoose.model<IFamilyDocument, IFamilyModel>(
  DatabaseNames.Family,
  familySchema,
  DatabaseNames.Family,
);

export default FamilyModel;