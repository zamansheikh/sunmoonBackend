import mongoose, { Document, Schema } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

export type ReportType = "live_stream" | "audio_room" | "user_profile";

export interface IReport extends Document {
  reporterId: mongoose.Types.ObjectId;
  reportedUserId: mongoose.Types.ObjectId;
  type: ReportType;
  reason: string;
  streamId?: string;
  roomId?: string;
  status: "pending" | "reviewed" | "resolved" | "dismissed";
  createdAt: Date;
}

const reportSchema = new Schema<IReport>(
  {
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reportedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["live_stream", "audio_room", "user_profile"],
      required: true,
    },
    reason: {
      type: String,
      required: true,
      maxlength: 500,
    },
    streamId: { type: String },
    roomId: { type: String },
    status: {
      type: String,
      enum: ["pending", "reviewed", "resolved", "dismissed"],
      default: "pending",
    },
  },
  {
    timestamps: true,
    collection: DatabaseNames.Reports,
  }
);

// Prevent duplicate reports from same reporter for same user in same session
reportSchema.index({ reporterId: 1, reportedUserId: 1, streamId: 1 });
reportSchema.index({ reporterId: 1, reportedUserId: 1, roomId: 1 });
reportSchema.index({ status: 1, createdAt: -1 });

const Report = mongoose.model<IReport>("Report", reportSchema);
export default Report;
