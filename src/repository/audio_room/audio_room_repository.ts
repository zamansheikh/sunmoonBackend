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
}

export class AudioRoomRepository implements IAudioRoomRepository {
  audioRoomModel: IAudioRoomModel;
  bucketRepository: IMyBucketRepository;
  categoryRepository: IStoreCategoryRepository;
  constructor(
    audioRoomModel: IAudioRoomModel,
    bucketRepository: IMyBucketRepository,
    categoryRepository: IStoreCategoryRepository,
  ) {
    this.audioRoomModel = audioRoomModel;
    this.bucketRepository = bucketRepository;
    this.categoryRepository = categoryRepository;
  }
  async createAudioRoom(audioRoom: IAudioRoom): Promise<IAudioRoomDocument> {
    const created = await this.audioRoomModel.create(audioRoom);
    // Populate both hostId and membersArray
    await created.populate([
      {
        path: "hostId",
        select: USER_POPULATED_INFORMATIONS,
      },
      {
        path: "membersArray",
        select: USER_POPULATED_INFORMATIONS,
      },
    ]);
    const obj = created.toObject();
    const host = obj.hostId as any;
    if (host && host._id) {
      host.equippedStoreItems = await getEquippedItemObjects(
        this.bucketRepository,
        this.categoryRepository,
        host._id.toString(),
      );
    }
    if (obj.membersArray && obj.membersArray.length > 0) {
      await Promise.all(
        obj.membersArray.map(async (member: any) => {
          if (member && member._id) {
            member.equippedStoreItems = await getEquippedItemObjects(
              this.bucketRepository,
              this.categoryRepository,
              member._id.toString(),
            );
          }
        }),
      );
    }
    return obj as any;
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
      {
        $addFields: {
          membersArray: "$membersArrayInfo", // ← just copy the array reference
        },
      },
      {
        $project: {
          membersArrayInfo: 0,
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
        $match: {},
      },
      lookupRichUser("hostId", "hostId"),
      {
        $unwind: {
          path: "$hostId",
          preserveNullAndEmptyArrays: true,
        },
      },
      lookupEnrichedUsersArray("membersArray", "membersArrayInfo"),

      {
        $addFields: {
          membersArray: "$membersArrayInfo", // ← just copy the array reference
        },
      },
      {
        $project: {
          membersArrayInfo: 0,
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
}
