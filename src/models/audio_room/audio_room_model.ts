import mongoose, { Document, Model, Schema } from "mongoose";
import { ActivityZoneState, DatabaseNames } from "../../core/Utils/enums";
import { IAudioRoomService } from "../../services/audio_room/audio_room_service";

export interface IAudioSeat {
  member?: IMemberDetails;
  available: boolean;
}

export interface IRoomMessage {
  name: string;
  avatar: string;
  uid: string;
  userId: number;
  country: string;
  _id: mongoose.Schema.Types.ObjectId | string;
  currentBackground: string;
  currentTag: string;
  currentLevel: number;
  text: string;
  equippedStoreItems: Record<string, string>;
}

export interface IMemberDetails {
  name: string;
  avatar: string;
  uid: string;
  userId: number;
  country?: string;
  currentBackground: string;
  currentTag: string;
  currentLevel: number;
  _id: mongoose.Schema.Types.ObjectId | string;
  equippedStoreItems?: Record<string, string>;
}

export interface IBannedUser {
  user: IMemberDetails;
  banType: ActivityZoneState;
  bannedTill: string;
}

export interface IAudioRoom {
  title: string;
  numberOfSeats: number;
  announcement?: string;
  roomId: string;
  roomPhoto?: string;
  admins: (mongoose.Schema.Types.ObjectId | string)[];
  hostSeat: IAudioSeat;
  seats: Map<string, IAudioSeat>;
  messages: IRoomMessage[];
  members: Map<string, true>;
  membersArray: (mongoose.Schema.Types.ObjectId | string)[];
  bannedUsers: IBannedUser[];
  mutedUsers: Map<string, true>;
  chatPrivacy: string;
  allowedUsersToChat: Map<string, true>;
  password: string; // for room entry
  isHostPresent: boolean; // to check if the host is present in the room
  isLocked: boolean; // private or public
  hostId: mongoose.Schema.Types.ObjectId | string; // to track the host
}

export interface IAudioRoomDocument extends IAudioRoom, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IAudioRoomModel extends Model<IAudioRoomDocument> {}

const RoomMessageSchema = new Schema<IRoomMessage>(
  {
    name: { type: String, required: true },
    avatar: { type: String, required: true },
    uid: { type: String, required: true },
    userId: { type: Number, required: true },
    country: { type: String },
    _id: { type: Schema.Types.ObjectId, required: true },
    currentBackground: { type: String, required: true },
    currentTag: { type: String, required: true },
    currentLevel: { type: Number, required: true },
    text: { type: String, required: true },
    equippedStoreItems: { type: Map, of: String },
  },
  { _id: false },
);

const MemberDetailsSchema = new Schema<IMemberDetails>(
  {
    name: { type: String, required: true },
    avatar: { type: String, required: true },
    uid: { type: String, required: true },
    userId: { type: Number, required: true },
    country: { type: String },
    currentBackground: { type: String },
    currentTag: { type: String },
    currentLevel: { type: Number },
    _id: { type: Schema.Types.ObjectId, required: true },
    equippedStoreItems: { type: Map, of: String },
  },
  { _id: false },
);
const bannedUserSchema = new Schema<IBannedUser>(
  {
    user: MemberDetailsSchema,
    banType: {
      type: String,
      enum: Object.values(ActivityZoneState),
      required: true,
    },
    bannedTill: { type: String },
  },
  { _id: false },
);

const AudioSeatSchema = new Schema<IAudioSeat>(
  {
    member: {
      type: MemberDetailsSchema,
    },
    available: { type: Boolean, default: true },
  },
  { _id: false },
);

const AudioRoomSchema = new Schema<IAudioRoomDocument>(
  {
    title: { type: String, required: true },
    numberOfSeats: { type: Number, required: true },
    announcement: String,
    roomId: { type: String, unique: true, required: true },
    roomPhoto: String,
    admins: [{ type: Schema.Types.ObjectId, ref: DatabaseNames.User }],
    hostSeat: {
      type: AudioSeatSchema,
      default: () => ({ available: true }),
    },
    seats: { type: Map, of: AudioSeatSchema, default: new Map() },
    messages: [{ type: RoomMessageSchema }],
    members: { type: Map, of: Boolean, default: new Map() },
    membersArray: [{ type: Schema.Types.ObjectId, ref: DatabaseNames.User }],
    bannedUsers: [{ type: bannedUserSchema }],
    mutedUsers: { type: Map, of: Boolean, default: new Map() },
    chatPrivacy: { type: String, default: "any" },
    allowedUsersToChat: { type: Map, of: Boolean, default: new Map() },
    password: { type: String, default: "" },
    isHostPresent: { type: Boolean, default: true },
    isLocked: { type: Boolean, default: false },
    hostId: {
      type: Schema.Types.ObjectId,
      ref: DatabaseNames.User,
      required: true,
    },
  },
  { timestamps: true },
);

// Auto-create or update the seats map whenever numberOfSeats changes
AudioRoomSchema.pre("save", function (next) {
  if (this.isNew || this.isModified("numberOfSeats")) {
    // Add any missing seats up to the new limit
    for (let i = 1; i <= this.numberOfSeats; i++) {
      const seatKey = `seat-${i}`;
      if (!this.seats.has(seatKey)) {
        this.seats.set(seatKey, { available: true });
      }
    }

    // Remove any extra seats beyond the new limit
    for (const key of Array.from(this.seats.keys())) {
      if (key.startsWith("seat-")) {
        const seatNumber = parseInt(key.replace("seat-", ""), 10);
        if (!isNaN(seatNumber) && seatNumber > this.numberOfSeats) {
          this.seats.delete(key);
        }
      }
    }
  }
  next();
});

const AudioRoomModel = mongoose.model<IAudioRoomDocument, IAudioRoomModel>(
  DatabaseNames.AudioRoom,
  AudioRoomSchema,
  DatabaseNames.AudioRoom,
);

export default AudioRoomModel;
