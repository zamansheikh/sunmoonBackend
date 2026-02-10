import mongoose, { Document, Model, Schema } from "mongoose";
import { ActivityZoneState, DatabaseNames } from "../../core/Utils/enums";

export interface IAudioSeat {
  member: any;
  available: boolean;
}

export interface IMemberDetails {
  name: string;
  avatar: string;
  uid: string;
  userId: number;
  country: string;
  currentBackground: string;
  currentTag: string;
  currentLevel: number;
  _id: mongoose.Schema.Types.ObjectId | string;
  equipedStoreItems: Record<string, string>;
  totalGiftSent: number;
  isMuted?: boolean;
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
  currentRocketLevel?: number; // eg: level 1 to level 5
  currentRocketFuel?: number; // eg : 5,00,000 - fromt gift coins
  currentRocketMilestone: number; // eg: 10,00,000 - constant set according to business logic
  admins: string[];
  hostDetails: IMemberDetails;
  hostTotalSendGift: number; // host sent amount (used for ranking)
  hostTotalRecievedGift: number; // host recieved amount (used to display the gifts)
  roomTotalTransaction: number; // total amount exchanged in the room
  hostSeat: IAudioSeat;
  premiumSeat: IAudioSeat;
  seats: Map<string, IAudioSeat>;
  messages: IRoomMessage[];
  members: Map<string, true>;
  membersDetails: IMemberDetails[];
  bannedUsers: Map<string, true>;
  mutedUsers: Map<string, true>;
  ranking: IMemberDetails[];
  chatPrivacy: string;
  allowedUsersToChat: Map<string, true>;
  password: string; // for room entry
  isHostPresent: boolean; // to check if the host is present in the room
  isLocked: boolean; // private or public
  hostId: string; // to track the host
  uniqueUsers: Map<string, true>; // to track the unique users _id in the room
  roomLevel: number; // to track the room level (used for room support reward)
  roomPartners: IMemberDetails[]; // to track the room partners (used for room support reward)
}

export interface IAudioRoomDocument extends IAudioRoom, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IAudioRoomModel extends Model<IAudioRoomDocument> {}

const AudioSeatSchema = new Schema(
  {
    member: { type: Schema.Types.Mixed, default: {} },
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
    hostDetails: { type: Schema.Types.Mixed, default: {} },
    hostTotalSendGift: { type: Number, default: 0 },
    hostTotalRecievedGift: { type: Number, default: 0 },
    roomTotalTransaction: { type: Number, default: 0 },
    hostSeat: {
      type: AudioSeatSchema,
      default: () => ({ member: {}, available: true }),
    },
    premiumSeat: {
      type: AudioSeatSchema,
      default: () => ({ member: {}, available: true }),
    },
    seats: { type: Map, of: AudioSeatSchema, default: new Map() },
    messages: [{ type: Schema.Types.Mixed }],
    members: { type: Map, of: Boolean, default: new Map() },
    membersDetails: [{ type: Schema.Types.Mixed }],
    bannedUsers: { type: Map, of: Boolean, default: new Map() },
    mutedUsers: { type: Map, of: Boolean, default: new Map() },
    ranking: [{ type: Schema.Types.Mixed }],
    chatPrivacy: { type: String, default: "any" },
    allowedUsersToChat: { type: Map, of: Boolean, default: new Map() },
    password: { type: String, default: "" },
    isHostPresent: { type: Boolean, default: true },
    isLocked: { type: Boolean, default: false },
    hostId: { type: String, required: true },
    uniqueUsers: { type: Map, of: Boolean, default: new Map() },
    roomLevel: { type: Number, default: 0 },
    roomPartners: [{ type: Schema.Types.Mixed }],
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
        this.seats.set(seatKey, { member: {}, available: true });
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
