import mongoose from "mongoose";
import { DateHelper } from "../../core/helper_classes/date_helper";
import { DatabaseNames, RankingPeriods } from "../../core/Utils/enums";
import {
  lookupRichUser,
  userWithEquippedItemsPipeline,
} from "../../core/Utils/helper_pipelines";
import { IMemberDetails } from "../../models/audio_room/audio_room_model";
import {
  IGiftRecord,
  IGiftRecordModel,
} from "../../models/gifts/gift_record_model";

export interface IRanking {
  amount: number;
  memberDetails: IMemberDetails;
}

export interface IGiftRecordRepository {
  createGiftRecord(giftRecord: IGiftRecord): Promise<boolean>;
  getSenderRanking(period: RankingPeriods): Promise<IRanking[]>;
  getMySendAmount(myId: string, period: RankingPeriods): Promise<IRanking>;
  getReceiverRanking(myId: string, period: RankingPeriods): Promise<IRanking[]>;
  getMyReceiveAmount(myId: string, period: RankingPeriods): Promise<IRanking>;
}

export class GiftRecordRepository implements IGiftRecordRepository {
  Model: IGiftRecordModel;
  constructor(model: IGiftRecordModel) {
    this.Model = model;
  }
  async createGiftRecord(giftRecord: IGiftRecord): Promise<boolean> {
    try {
      // determine ttl -> always currents months last date.
      const currentMonthLastDate = DateHelper.getEndOfMonth(new Date());
      const newGiftRecord = new this.Model({
        ...giftRecord,
        expireAt: currentMonthLastDate,
      });
      await newGiftRecord.save();
      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  async getSenderRanking(period: RankingPeriods): Promise<IRanking[]> {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (period === RankingPeriods.Daily) {
      startDate = DateHelper.getStartOfDay(now);
      endDate = DateHelper.getEndOfDay(now);
    } else if (period === RankingPeriods.Weekly) {
      startDate = DateHelper.getStartOfWeek(now);
      endDate = DateHelper.getEndOfWeek(now);
    } else {
      startDate = DateHelper.getStartOfMonth(now);
      endDate = DateHelper.getEndOfMonth(now);
    }

    const ranking: IRanking[] = await this.Model.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: "$senderId",
          amount: { $sum: "$totalCoinCost" },
        },
      },
      { $sort: { amount: -1 } },
      { $limit: 100 },
      lookupRichUser("_id", "memberDetails"),
      { $unwind: "$memberDetails" },
      {
        $project: {
          _id: 0,
          memberDetails: 1,
          amount: 1,
        },
      },
    ]);

    return ranking;
  }

  async getMySendAmount(
    myId: string,
    period: RankingPeriods,
  ): Promise<IRanking> {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (period === RankingPeriods.Daily) {
      startDate = DateHelper.getStartOfDay(now);
      endDate = DateHelper.getEndOfDay(now);
    } else if (period === RankingPeriods.Weekly) {
      startDate = DateHelper.getStartOfWeek(now);
      endDate = DateHelper.getEndOfWeek(now);
    } else {
      startDate = DateHelper.getStartOfMonth(now);
      endDate = DateHelper.getEndOfMonth(now);
    }

    const ranking: IRanking[] = await this.Model.aggregate([
      {
        $match: {
          senderId: new mongoose.Types.ObjectId(myId),
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: "$senderId",
          amount: { $sum: "$totalCoinCost" },
        },
      },
      lookupRichUser("_id", "memberDetails"),
      { $unwind: "$memberDetails" },
      {
        $project: {
          _id: 0,
          memberDetails: 1,
          amount: 1,
        },
      },
    ]);

    if (ranking.length > 0) {
      return ranking[0];
    }

    // Fallback: Fetch user details even if no coins were sent in this period
    const userDetails = await this.Model.db
      .model(DatabaseNames.User)
      .aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(myId) } },
        ...userWithEquippedItemsPipeline("dummy").slice(1),
      ]);

    return {
      amount: 0,
      memberDetails: userDetails[0] || ({} as any),
    };
  }

  async getMyReceiveAmount(
    myId: string,
    period: RankingPeriods,
  ): Promise<IRanking> {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (period === RankingPeriods.Daily) {
      startDate = DateHelper.getStartOfDay(now);
      endDate = DateHelper.getEndOfDay(now);
    } else if (period === RankingPeriods.Weekly) {
      startDate = DateHelper.getStartOfWeek(now);
      endDate = DateHelper.getEndOfWeek(now);
    } else {
      startDate = DateHelper.getStartOfMonth(now);
      endDate = DateHelper.getEndOfMonth(now);
    }

    const ranking: IRanking[] = await this.Model.aggregate([
      {
        $match: {
          receiverId: new mongoose.Types.ObjectId(myId),
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: "$receiverId",
          amount: { $sum: "$totalDiamonds" },
        },
      },
      lookupRichUser("_id", "memberDetails"),
      { $unwind: "$memberDetails" },
      {
        $project: {
          _id: 0,
          memberDetails: 1,
          amount: 1,
        },
      },
    ]);

    if (ranking.length > 0) {
      return ranking[0];
    }

    // Fallback: Fetch user details even if no coins were received in this period
    const userDetails = await this.Model.db
      .model(DatabaseNames.User)
      .aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(myId) } },
        ...userWithEquippedItemsPipeline("dummy").slice(1),
      ]);

    return {
      amount: 0,
      memberDetails: userDetails[0] || ({} as any),
    };
  }

  async getReceiverRanking(
    myId: string,
    period: RankingPeriods,
  ): Promise<IRanking[]> {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (period === RankingPeriods.Daily) {
      startDate = DateHelper.getStartOfDay(now);
      endDate = DateHelper.getEndOfDay(now);
    } else if (period === RankingPeriods.Weekly) {
      startDate = DateHelper.getStartOfWeek(now);
      endDate = DateHelper.getEndOfWeek(now);
    } else {
      startDate = DateHelper.getStartOfMonth(now);
      endDate = DateHelper.getEndOfMonth(now);
    }

    const ranking: IRanking[] = await this.Model.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: "$receiverId",
          amount: { $sum: "$totalDiamonds" },
        },
      },
      { $sort: { amount: -1 } },
      { $limit: 100 },
      lookupRichUser("_id", "memberDetails"),
      { $unwind: "$memberDetails" },
      {
        $project: {
          _id: 0,
          memberDetails: 1,
          amount: 1,
        },
      },
    ]);

    return ranking;
  }
}
