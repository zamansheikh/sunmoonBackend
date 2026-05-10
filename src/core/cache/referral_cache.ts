import RedisConfig from "../config/redis_config";
import { IReferralConfig, IReferralConfigDocument } from "../../models/referral/referralConfigModel";

export class ReferralCache {
  private static instance: ReferralCache | null = null;
  private redis = RedisConfig.getInstance();

  private readonly KEYS = {
    CONFIG: "referral:config",
    REFERRER_MAPPING: (refereeId: string) => `referral:mapping:${refereeId}`,
  };

  private readonly TTL = {
    CONFIG: 3600, // 1 hour
    MAPPING: 86400 * 7, // 1 week
  };

  private constructor() {}

  public static getInstance(): ReferralCache {
    if (!ReferralCache.instance) {
      ReferralCache.instance = new ReferralCache();
    }
    return ReferralCache.instance;
  }

  // --- Config Cache ---

  async setConfig(config: IReferralConfig | IReferralConfigDocument): Promise<void> {
    try {
      await this.redis.set(this.KEYS.CONFIG, JSON.stringify(config), {
        EX: this.TTL.CONFIG,
      });
    } catch (err) {
      console.error("[ReferralCache] Failed to set config:", err);
    }
  }

  /** Returns a plain config object (not a Mongoose Document) from cache */
  async getConfig(): Promise<IReferralConfig | null> {
    try {
      const data = await this.redis.get(this.KEYS.CONFIG);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.error("[ReferralCache] Failed to get config:", err);
      return null;
    }
  }

  async invalidateConfig(): Promise<void> {
    try {
      await this.redis.del(this.KEYS.CONFIG);
    } catch (err) {
      console.error("[ReferralCache] Failed to invalidate config:", err);
    }
  }

  // --- Referrer Mapping Cache ---

  async setReferrerId(refereeId: string, referrerId: string): Promise<void> {
    try {
      await this.redis.set(this.KEYS.REFERRER_MAPPING(refereeId), referrerId, {
        EX: this.TTL.MAPPING,
      });
    } catch (err) {
      console.error("[ReferralCache] Failed to set referrer mapping:", err);
    }
  }

  async getReferrerId(refereeId: string): Promise<string | null> {
    try {
      return await this.redis.get(this.KEYS.REFERRER_MAPPING(refereeId));
    } catch (err) {
      console.error("[ReferralCache] Failed to get referrer mapping:", err);
      return null;
    }
  }
}
