import AppError from "../../core/errors/app_errors";
import { IMyBucketRepository } from "../store/my_bucket_repository";
import { IStoreCategoryRepository } from "../store/store_category_repository";
import {
  IAudioRoom,
  IAudioRoomDocument,
  IAudioRoomModel,
} from "../../models/audio_room/audio_room_model";
import { QueryBuilder } from "../../core/Utils/query_builder";
import { DatabaseNames } from "../../core/Utils/enums";
import {
  lookupEnrichedUsersArray,
  lookupRichUser,
} from "../../core/Utils/helper_pipelines";
import { USER_POPULATED_INFORMATIONS } from "../../core/Utils/constants";
import { getEquippedItemObjects } from "../../core/Utils/helper_functions";

export interface IAudioRoomRepository {
  createAudioRoom(audioRoom: IAudioRoom): Promise<IAudioRoomDocument>;
  getAudioRoomById(roomId: string): Promise<IAudioRoomDocument>;
  checkRoomExisistance(roomId: string): Promise<IAudioRoomDocument | null>;
  getAudioRoomByHostId(hostId: string): Promise<string | null>;
  updateAudioRoom(
    roomId: string,
    audioRoom: Partial<IAudioRoom>,
  ): Promise<IAudioRoomDocument>;
  findByIdAndUpdate(
    id: string,
    data: Record<string, any>,
    options?: Record<string, any>,
  ): Promise<IAudioRoomDocument>;
  deleteAudioRoom(roomId: string): Promise<IAudioRoomDocument>;
  getAllAudioRooms(): Promise<IAudioRoomDocument[]>;
  isMemberInAnyRoom(userId: string): Promise<IAudioRoomDocument | null>;
  getRoomsByRoomIds(roomIds: string[]): Promise<IAudioRoomDocument[]>;
}

export class AudioRoomRepository implements IAudioRoomRepository {
  audioRoomModel: IAudioRoomModel;
  constructor(audioRoomModel: IAudioRoomModel) {
    this.audioRoomModel = audioRoomModel;
  }
  async createAudioRoom(audioRoom: IAudioRoom): Promise<IAudioRoomDocument> {
    const created = await this.audioRoomModel.create(audioRoom);
    if (!created) throw new AppError(500, "Failed to create audio room");
    return created;
  }
  async getAudioRoomById(roomId: string): Promise<IAudioRoomDocument> {
    const qb = new QueryBuilder(this.audioRoomModel, {});
    const res = qb.aggregate([
      {
        $match: { roomId },
      },
      lookupRichUser("hostId", "hostId"),
      {
        $unwind: {
          path: "$hostId",
          preserveNullAndEmptyArrays: true,
        },
      },
      lookupEnrichedUsersArray("membersArray", "membersArrayInfo"),
      lookupEnrichedUsersArray("admins", "adminsInfo"),
      lookupEnrichedUsersArray("bannedFromMessages", "bannedFromMessagesInfo"),
      {
        $lookup: {
          from: DatabaseNames.GiftRecords,
          let: { currentRoomId: "$roomId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$roomId", "$$currentRoomId"] } } },
            {
              $group: {
                _id: "$receiverId",
                total: { $sum: "$totalDiamonds" },
              },
            },
          ],
          as: "giftTotals",
        },
      },
      {
        $addFields: {
          membersArray: "$membersArrayInfo", // ← just copy the array reference
          admins: "$adminsInfo",
          bannedFromMessages: "$bannedFromMessagesInfo",
          membersCount: { $size: { $ifNull: ["$membersArray", []] } },
          "hostSeat.recievedGiftValue": {
            $ifNull: [
              {
                $arrayElemAt: [
                  {
                    $map: {
                      input: {
                        $filter: {
                          input: "$giftTotals",
                          as: "gt",
                          cond: { $eq: ["$$gt._id", "$hostId._id"] },
                        },
                      },
                      in: "$$this.total",
                    },
                  },
                  0,
                ],
              },
              0,
            ],
          },
          seats: {
            $arrayToObject: {
              $map: {
                input: { $objectToArray: "$seats" },
                as: "seatEntry",
                in: {
                  k: "$$seatEntry.k",
                  v: {
                    $mergeObjects: [
                      "$$seatEntry.v",
                      {
                        recievedGiftValue: {
                          $ifNull: [
                            {
                              $arrayElemAt: [
                                {
                                  $map: {
                                    input: {
                                      $filter: {
                                        input: "$giftTotals",
                                        as: "gt",
                                        cond: {
                                          $eq: [
                                            "$$gt._id",
                                            "$$seatEntry.v.member._id",
                                          ],
                                        },
                                      },
                                    },
                                    in: "$$this.total",
                                  },
                                },
                                0,
                              ],
                            },
                            0,
                          ],
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
      {
        $project: {
          membersArrayInfo: 0,
          adminsInfo: 0,
          bannedFromMessagesInfo: 0,
          giftTotals: 0,
        },
      },
    ]);

    const result = await res.exec();
    if (result.length === 0) throw new AppError(404, "Audio room not found");
    return result[0];
  }
  async updateAudioRoom(
    roomId: string,
    audioRoom: Partial<IAudioRoom>,
  ): Promise<IAudioRoomDocument> {
    throw new Error("Method not implemented.");
  }
  async deleteAudioRoom(roomId: string): Promise<IAudioRoomDocument> {
    throw new Error("Method not implemented.");
  }
  async getAllAudioRooms(): Promise<IAudioRoomDocument[]> {
    const qb = new QueryBuilder(this.audioRoomModel, {});
    const res = qb.aggregate([
      {
        $match: {
          $or: [
            { "membersArray.0": { $exists: true } },
            { members: { $exists: true, $ne: {} } },
          ],
        },
      },
      lookupRichUser("hostId", "hostId"),
      {
        $unwind: {
          path: "$hostId",
          preserveNullAndEmptyArrays: true,
        },
      },
      lookupEnrichedUsersArray("membersArray", "membersArrayInfo"),
      lookupEnrichedUsersArray("admins", "adminsInfo"),
      lookupEnrichedUsersArray("bannedFromMessages", "bannedFromMessagesInfo"),

      {
        $addFields: {
          membersArray: "$membersArrayInfo", // ← just copy the array reference
          admins: "$adminsInfo",
          bannedFromMessages: "$bannedFromMessagesInfo",
          membersCount: { $size: { $ifNull: ["$membersArray", []] } },
        },
      },
      {
        $project: {
          membersArrayInfo: 0,
          adminsInfo: 0,
          bannedFromMessagesInfo: 0,
        },
      },
    ]);
    return await res.exec();
  }
  async findByIdAndUpdate(
    id: string,
    data: Record<string, any>,
    options?: Record<string, any>,
  ): Promise<IAudioRoomDocument> {
    const result = await this.audioRoomModel.findByIdAndUpdate(id, data, {
      new: true,
      ...options,
    });
    if (!result) throw new AppError(404, "Audio room not found");
    return result;
  }

  async checkRoomExisistance(
    roomId: string,
  ): Promise<IAudioRoomDocument | null> {
    return await this.audioRoomModel.findOne({ roomId });
  }

  async getAudioRoomByHostId(hostId: string): Promise<string | null> {
    const room = await this.audioRoomModel.findOne({ hostId }).select("roomId");
    return room ? room.roomId : null;
  }

  async isMemberInAnyRoom(userId: string): Promise<IAudioRoomDocument | null> {
    return await this.audioRoomModel.findOne({ [`members.${userId}`]: true });
  }

  async getRoomsByRoomIds(roomIds: string[]): Promise<IAudioRoomDocument[]> {
    const qb = new QueryBuilder(this.audioRoomModel, {});
    const res = qb.aggregate([
      {
        $match: { roomId: { $in: roomIds } },
      },
      lookupRichUser("hostId", "hostId"),
      {
        $unwind: {
          path: "$hostId",
          preserveNullAndEmptyArrays: true,
        },
      },
      lookupEnrichedUsersArray("membersArray", "membersArrayInfo"),
      lookupEnrichedUsersArray("admins", "adminsInfo"),
      lookupEnrichedUsersArray("bannedFromMessages", "bannedFromMessagesInfo"),
      {
        $addFields: {
          membersArray: "$membersArrayInfo",
          admins: "$adminsInfo",
          bannedFromMessages: "$bannedFromMessagesInfo",
          membersCount: { $size: { $ifNull: ["$membersArray", []] } },
        },
      },
      {
        $project: {
          membersArrayInfo: 0,
          adminsInfo: 0,
          bannedFromMessagesInfo: 0,
        },
      },
    ]);

    return await res.exec();
  }
}
