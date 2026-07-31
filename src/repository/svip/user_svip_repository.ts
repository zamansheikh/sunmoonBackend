import { Model, ClientSession, Types } from "mongoose";
import {
  IUserSvip,
  IUserSvipDocument,
} from "../../models/svip/user_svip_model";

export interface IUserSvipRepository {
  findByUserId(
    userId: string | Types.ObjectId,
    session?: ClientSession,
  ): Promise<IUserSvipDocument | null>;

  upsert(
    userId: string | Types.ObjectId,
    data: Partial<IUserSvip>,
    session?: ClientSession,
  ): Promise<IUserSvipDocument>;

  /**
   * Atomically increments monthlyRechargeCoins.
   * Also sets month/year/levelStartOfMonth on first creation or month boundary.
   * Uses $inc so concurrent recharges don't overwrite each other.
   */
  incMonthlyRecharge(
    userId: string | Types.ObjectId,
    coins: number,
    currentLevel: number,
    levelStartOfMonth: number,
    month: number,
    year: number,
    session?: ClientSession,
  ): Promise<IUserSvipDocument>;

  /**
   * Atomically sets the currentLevel (called after milestone check).
   * Only updates if new level > current (prevents concurrent downgrade).
   */
  setLevel(
    userId: string | Types.ObjectId,
    level: number,
    session?: ClientSession,
  ): Promise<void>;

  /**
   * Returns all users whose current level is greater than 0.
   * Used by the month-end retention cron job.
   */
  findAllActiveUsers(
    session?: ClientSession,
  ): Promise<IUserSvipDocument[]>;

  /**
   * Bulk-updates monthly tracking fields for the new month.
   * Sets monthlyRechargeCoins to 0 and adjusts levelStartOfMonth.
   */
  bulkResetForNewMonth(
    updates: {
      userId: string | Types.ObjectId;
      currentLevel: number;
      levelStartOfMonth: number;
    }[],
    session?: ClientSession,
  ): Promise<void>;

  /**
   * Returns paginated users at a specific level, with populated user details.
   */
  getUsersByLevel(
    level: number,
    skip: number,
    limit: number,
  ): Promise<IUserSvipDocument[]>;

  /**
   * Counts users at a specific level.
   */
  countByLevel(level: number): Promise<number>;
}

export class UserSvipRepository implements IUserSvipRepository {
  constructor(private model: Model<IUserSvipDocument>) {}

  async findByUserId(
    userId: string | Types.ObjectId,
    session?: ClientSession,
  ): Promise<IUserSvipDocument | null> {
    return await this.model
      .findOne({ userId })
      .session(session || null);
  }

  async upsert(
    userId: string | Types.ObjectId,
    data: Partial<IUserSvip>,
    session?: ClientSession,
  ): Promise<IUserSvipDocument> {
    return (await this.model
      .findOneAndUpdate({ userId }, { $set: data }, { new: true, upsert: true })
      .session(session || null)) as IUserSvipDocument;
  }

  async incMonthlyRecharge(
    userId: string | Types.ObjectId,
    coins: number,
    currentLevel: number,
    levelStartOfMonth: number,
    month: number,
    year: number,
    session?: ClientSession,
  ): Promise<IUserSvipDocument> {
    return (await this.model
      .findOneAndUpdate(
        { userId },
        {
          $inc: { monthlyRechargeCoins: coins },
          $setOnInsert: {
            userId,
            currentLevel,
            levelStartOfMonth,
            month,
            year,
          },
        },
        { new: true, upsert: true },
      )
      .session(session || null)) as IUserSvipDocument;
  }

  async setLevel(
    userId: string | Types.ObjectId,
    level: number,
    session?: ClientSession,
  ): Promise<void> {
    // Only update if the new level is higher — prevents a concurrent
    // slower request from downgrading a level that was just upgraded.
    await this.model
      .updateOne({ userId, currentLevel: { $lt: level } }, { $set: { currentLevel: level } })
      .session(session || null);
  }

  async findAllActiveUsers(
    session?: ClientSession,
  ): Promise<IUserSvipDocument[]> {
    return await this.model
      .find({ currentLevel: { $gt: 0 } })
      .session(session || null);
  }

  async bulkResetForNewMonth(
    updates: {
      userId: string | Types.ObjectId;
      currentLevel: number;
      levelStartOfMonth: number;
    }[],
    session?: ClientSession,
  ): Promise<void> {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const operations = updates.map((u) => ({
      updateOne: {
        filter: { userId: u.userId },
        update: {
          $set: {
            currentLevel: u.currentLevel,
            levelStartOfMonth: u.levelStartOfMonth,
            monthlyRechargeCoins: 0,
            month,
            year,
          },
        },
      },
    }));

    if (operations.length > 0) {
      await this.model.bulkWrite(operations, { session: session || undefined });
    }
  }

  async getUsersByLevel(
    level: number,
    skip: number,
    limit: number,
  ): Promise<IUserSvipDocument[]> {
    return await this.model
      .find({ currentLevel: level })
      .populate("userId", "name _id avatar")
      .skip(skip)
      .limit(limit)
      .sort({ monthlyRechargeCoins: -1 });
  }

  async countByLevel(level: number): Promise<number> {
    return await this.model.countDocuments({ currentLevel: level });
  }
}
