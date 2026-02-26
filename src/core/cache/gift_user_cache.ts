import { IGiftDocument } from "../../entities/admin/gift_interface";
import GiftRecordModel from "../../models/gifts/gift_record_model";
import Gifts from "../../models/gifts/gifts_model";
import { GiftRecordRepository } from "../../repository/gifts/gift_record_repository";
import { GiftRepository } from "../../repository/gifts/gifts_repositories";

export class GiftUserCache {
  private static instance: GiftUserCache | null = null;

  private giftCache = new Map<string, { data: any; expiry: number }>();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hour = 1 day

  // 📌 repositories
  public giftRepository = new GiftRepository(Gifts);
  public giftRecordRepository = new GiftRecordRepository(GiftRecordModel);

  private constructor() {}

  public static getInstance(): GiftUserCache {
    if (GiftUserCache.instance === null) {
      GiftUserCache.instance = new GiftUserCache();
    }
    return GiftUserCache.instance;
  }

  public async getGift(giftId: string): Promise<IGiftDocument | null> {
    const cached = this.giftCache.get(giftId);
    if (cached && cached.expiry > Date.now()) return cached.data;
    const gift = await this.giftRepository.getGiftById(giftId);
    if (!gift) return null;
    this.giftCache.set(giftId, {
      data: gift,
      expiry: Date.now() + this.CACHE_TTL,
    });
    return gift;
  }
}
