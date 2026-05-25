import { IXpConfig } from "../../models/admin/xp_config_model";
import { IXpConfigRepository } from "../../repository/admin/xp_config_repository";
import { RepositoryProviders } from "../../core/providers/repository_providers";

/**
 * Default XP configuration used to seed the database on first deploy.
 * Defined here — NOT imported from constants.ts — so the admin DB document
 * is always the single source of truth for XP calculations.
 */
const DEFAULT_XP_CONFIG: IXpConfig = {
  xpLevels: [
    160, 325, 460, 625, 805, 995, 1175, 1382, 1618, 1937,
    2332, 2892, 3602, 4442, 5427, 6630, 8010, 9517, 11215, 13022,
    15009, 17269, 19567, 22254, 25207, 28410, 31810, 35427, 39228, 43278,
    47614, 52126, 56982, 62180, 67928, 73928, 80356, 87202, 97002, 107203,
    123767, 145890, 174319, 210897, 254555, 304540, 363509, 431094, 500617, 580602,
    670860, 772069,
  ],
  giftSendXp: 600,
  svipMultipliers: [
    { minLevel: 0, multiplier: 1.0 },
    { minLevel: 2, multiplier: 1.2 },
    { minLevel: 7, multiplier: 1.3 },
    { minLevel: 9, multiplier: 1.4 },
  ],
};

/**
 * Service for managing XP Configuration.
 *
 * Caching strategy:
 *   - Uses a static in-memory cache (`configCache`) that is lazily loaded
 *     from the database on first access.
 *   - Bootstrap eagerly warms the cache on server startup.
 *   - Admin updates immediately refresh the cache.
 *   - Result: near-zero read time on every gift send, zero network I/O.
 *
 * All methods are static. No instance is ever created — XpHelper and the
 * controller both call XpConfigService.getConfig() / updateConfig() directly.
 */
export class XpConfigService {
  /** In-memory cache — null until first load or after restart. */
  private static configCache: IXpConfig | null = null;

  /** Lazily-resolved repository reference. */
  private static get repository(): IXpConfigRepository {
    return RepositoryProviders.xpConfigRepositoryProvider;
  }

  /**
   * Bootstraps the XP configuration from the database.
   * Seeds defaults on first deploy; warms the in-memory cache on every startup.
   * Should be called once during server startup after DB connection.
   */
  static async bootstrap(): Promise<void> {
    const dbConfig = await XpConfigService.repository.getConfig();
    if (!dbConfig) {
      // First deploy — seed defaults into DB
      await XpConfigService.repository.updateConfig(DEFAULT_XP_CONFIG);
      console.log("🌱 XP Configuration seeded in database from defaults.");
    }

    // Warm the in-memory cache so the first gift send never hits the DB
    await XpConfigService.getConfig();
    console.log("✅ XP Configuration cache warmed.");
  }

  /**
   * Returns the XP configuration from the in-memory cache.
   * If the cache is empty (null), it lazy-loads from the database first.
   * Subsequent calls return immediately with zero I/O.
   */
  static async getConfig(): Promise<IXpConfig | null> {
    if (XpConfigService.configCache) {
      return XpConfigService.configCache;
    }

    // Lazy load from DB — only happens once (or after a server restart)
    const dbConfig = await XpConfigService.repository.getConfig();
    if (dbConfig) {
      XpConfigService.configCache = {
        xpLevels: dbConfig.xpLevels,
        giftSendXp: dbConfig.giftSendXp,
        svipMultipliers: dbConfig.svipMultipliers,
      };
    }
    return XpConfigService.configCache;
  }

  /**
   * Updates the XP configuration in the database and immediately refreshes
   * the in-memory cache. The new values are instantly visible to XpHelper.
   *
   * @param data Partial configuration data to update.
   * @returns The updated configuration object (from the refreshed cache).
   */
  static async updateConfig(data: Partial<IXpConfig>): Promise<IXpConfig> {
    const updated = await XpConfigService.repository.updateConfig(data);

    const result: IXpConfig = {
      xpLevels: updated.xpLevels,
      giftSendXp: updated.giftSendXp,
      svipMultipliers: updated.svipMultipliers,
    };
    XpConfigService.configCache = result;

    return result;
  }
}
