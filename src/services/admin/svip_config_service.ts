import { ISvipConfig } from "../../models/admin/svip_config_model";
import { ISvipConfigRepository } from "../../repository/admin/svip_config_repository";
import { RepositoryProviders } from "../../core/providers/repository_providers";

/**
 * Service for managing SVIP/VIP Configuration.
 *
 * Follows the same caching pattern as XpConfigService:
 * static in-memory cache + lazy-load from DB + eager bootstrap on startup.
 *
 * IMPORTANT: No auto-seeding. Admin must create the config via API.
 * If config is missing, milestones won't be checked until it's created.
 */
export class SvipConfigService {
  private static configCache: ISvipConfig | null = null;
  private static configLoaded = false;
  private static loadingPromise: Promise<ISvipConfig | null> | null = null;

  private static get repository(): ISvipConfigRepository {
    return RepositoryProviders.svipConfigRepositoryProvider;
  }

  /** Warms the cache on startup. Warns if config is missing. */
  static async bootstrap(): Promise<void> {
    const dbConfig = await SvipConfigService.repository.getConfig();
    if (!dbConfig) {
      console.warn(
        "⚠️  SVIP/VIP Configuration not found in database. " +
        "Admin must create it via API before premium milestones will work.",
      );
    }
    await SvipConfigService.getConfig();
    console.log("✅ SVIP Configuration cache warmed.");
  }

  /** Returns the SVIP config from the in-memory cache (lazy-loaded). */
  static async getConfig(): Promise<ISvipConfig | null> {
    if (SvipConfigService.configLoaded) {
      return SvipConfigService.configCache;
    }

    if (!SvipConfigService.loadingPromise) {
      SvipConfigService.loadingPromise = (async () => {
        try {
          const dbConfig = await SvipConfigService.repository.getConfig();

          SvipConfigService.configLoaded = true;
          if (dbConfig) {
            SvipConfigService.configCache = {
              vipTiers: dbConfig.vipTiers,
              svipTiers: dbConfig.svipTiers,
              retentionThreshold: dbConfig.retentionThreshold,
              vipCategoryName: dbConfig.vipCategoryName,
              svipCategoryName: dbConfig.svipCategoryName,
            };
          }

          return SvipConfigService.configCache;
        } finally {
          SvipConfigService.loadingPromise = null;
        }
      })();
    }

    return SvipConfigService.loadingPromise;
  }

  /** Updates the config in DB and immediately refreshes the cache. */
  static async updateConfig(data: Partial<ISvipConfig>): Promise<ISvipConfig> {
    const updated = await SvipConfigService.repository.updateConfig(data);
    const result: ISvipConfig = {
      vipTiers: updated.vipTiers,
      svipTiers: updated.svipTiers,
      retentionThreshold: updated.retentionThreshold,
      vipCategoryName: updated.vipCategoryName,
      svipCategoryName: updated.svipCategoryName,
    };
    SvipConfigService.configCache = result;
    SvipConfigService.configLoaded = true;
    return result;
  }
}
