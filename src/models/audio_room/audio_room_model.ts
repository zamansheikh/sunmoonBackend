import mongoose, { Document, Model, Schema } from "mongoose";
import { ActivityZoneState, DatabaseNames } from "../../core/Utils/enums";
import { IAudioRoomService } from "../../services/audio_room/audio_room_service";

export interface IAudioSeat {
  member?: mongoose.Schema.Types.ObjectId | string;
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
  equipedStoreItems: Record<string, string>;
}

export interface IBannedUser {
  user: mongoose.Schema.Types.ObjectId | string;
  banType: ActivityZoneState;
  bannedTill: string;
}

export interface IAudioRoom {
  title: string;
  numberOfSeats: number;
  announcement?: string;
  roomId: string;
  roomPhoto?: string;
  currentRocketLevel?: number; // eg: level 1 to level 5
  currentRocketFuel?: number; // eg : 5,00,000 - fromt gift coins
  currentRocketMilestone: number; // eg: 10,00,000 - constant set according to business logic
  admins: (mongoose.Schema.Types.ObjectId | string)[];
  hostTotalSendGift: number; // host sent amount (used for ranking)
  hostTotalRecievedGift: number; // host recieved amount (used to display the gifts)
  roomTotalTransaction: number; // total amount exchanged in the room
  hostSeat: IAudioSeat;
  premiumSeat: IAudioSeat;
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
  uniqueUsers: Map<string, true>; // to track the unique users _id in the room
  roomLevel: number; // to track the room level (used for room support reward)
  roomPartners: (mongoose.Schema.Types.ObjectId | string)[]; // to track the room partners (used for room support reward)
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
    country: { type: String, required: true },
    _id: { type: Schema.Types.ObjectId, required: true },
    currentBackground: { type: String, required: true },
    currentTag: { type: String, required: true },
    currentLevel: { type: Number, required: true },
    text: { type: String, required: true },
    equipedStoreItems: { type: Map, of: String, required: true },
  },
  { _id: false },
);



const bannedUserSchema = new Schema<IBannedUser>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: DatabaseNames.User,
      required: true,
    },
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
      type: Schema.Types.ObjectId,
      ref: DatabaseNames.User,
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
    currentRocketLevel: { type: Number, default: 1 },
    currentRocketFuel: { type: Number, default: 0 },
    currentRocketMilestone: { type: Number, required: true },
    admins: [{ type: String }],
    hostTotalSendGift: { type: Number, default: 0 },
    hostTotalRecievedGift: { type: Number, default: 0 },
    roomTotalTransaction: { type: Number, default: 0 },
    hostSeat: {
      type: AudioSeatSchema,
      default: () => ({ available: true }),
    },
    premiumSeat: {
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
    uniqueUsers: { type: Map, of: Boolean, default: new Map() },
    roomLevel: { type: Number, default: 0 },
    roomPartners: [{ type: Schema.Types.ObjectId, ref: DatabaseNames.User }],
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
