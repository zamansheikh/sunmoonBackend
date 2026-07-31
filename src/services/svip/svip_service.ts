import { ClientSession, Types } from "mongoose";
import { RepositoryProviders } from "../../core/providers/repository_providers";
import { IUserSvipRepository } from "../../repository/svip/user_svip_repository";
import { SvipConfigService } from "../admin/svip_config_service";
import { IUserSvipDocument } from "../../models/svip/user_svip_model";
import { IMyBucketRepository } from "../../repository/store/my_bucket_repository";
import { IStoreCategoryRepository } from "../../repository/store/store_category_repository";
import { IStoreItemRepository } from "../../repository/store/store_item_repository";
import { ISvipConfig, IPremiumTier } from "../../models/admin/svip_config_model";

/**
 * Resolved level: maps a 1-based level number to its tier info and category.
 */
interface ResolvedLevel {
  level: number;
  milestoneCoins: number;
  categoryName: string;
  tierNumber: number;
}

/**
 * Service that handles unified VIP→SVIP level upgrades when users recharge
 * coins and manages month-end retention/downgrade logic.
 *
 * Progression is sequential: VIP tiers first (levels 1 → vipTiers.length),
 * then SVIP tiers (levels vipTiers.length+1 → total).
 *
 * Store items are matched dynamically by categoryId + tierNumber — no
 * storeItemId is stored in the config.
 */
export class SvipService {
  private static get userSvipRepo(): IUserSvipRepository {
    return RepositoryProviders.userSvipRepositoryProvider;
  }

  private static get bucketRepo(): IMyBucketRepository {
    return RepositoryProviders.myBucketRepositoryProvider;
  }

  private static get categoryRepo(): IStoreCategoryRepository {
    return RepositoryProviders.storeCategoryRepositoryProvider;
  }

  private static get storeItemRepo(): IStoreItemRepository {
    return RepositoryProviders.storeItemRepositoryProvider;
  }

  // ────────────────────────────────────────────────────────────────────────
  //  Helpers
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Resolves a 1-based level number into tier info + category.
   * Returns null if level is invalid (0 or exceeds total tiers).
   */
  private static resolveLevel(
    config: ISvipConfig,
    level: number,
  ): ResolvedLevel | null {
    if (level < 1) return null;

    const vipCount = config.vipTiers.length;
    if (level <= vipCount) {
      const tier = config.vipTiers[level - 1];
      return {
        level,
        milestoneCoins: tier.milestoneCoins,
        categoryName: config.vipCategoryName,
        tierNumber: tier.tier,
      };
    }

    const svipIndex = level - vipCount - 1;
    if (svipIndex >= 0 && svipIndex < config.svipTiers.length) {
      const tier = config.svipTiers[svipIndex];
      return {
        level,
        milestoneCoins: tier.milestoneCoins,
        categoryName: config.svipCategoryName,
        tierNumber: tier.tier,
      };
    }

    return null;
  }

  /**
   * Builds the full ordered list of levels (1-based) from config.
   * Levels 1 → vipTiers.length = VIP, then vipTiers.length+1 → total = SVIP.
   */
  private static buildAllLevels(
    config: ISvipConfig,
  ): { level: number; milestoneCoins: number }[] {
    const levels: { level: number; milestoneCoins: number }[] = [];

    for (let i = 0; i < config.vipTiers.length; i++) {
      levels.push({ level: i + 1, milestoneCoins: config.vipTiers[i].milestoneCoins });
    }
    for (let i = 0; i < config.svipTiers.length; i++) {
      levels.push({
        level: config.vipTiers.length + i + 1,
        milestoneCoins: config.svipTiers[i].milestoneCoins,
      });
    }

    return levels;
  }

  /**
   * Returns the max level from config (total number of VIP + SVIP tiers).
   */
  static getMaxLevel(config: ISvipConfig): number {
    return config.vipTiers.length + config.svipTiers.length;
  }

  // ────────────────────────────────────────────────────────────────────────
  //  Track a recharge event — called from creditRegularUserCoins()
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Called after a user receives coins. Tracks the recharge toward premium
   * milestones and upgrades the user's level if a milestone is crossed.
   *
   * Must be called **inside the same transaction** as the coin transfer.
   *
   * Uses `$inc` for `monthlyRechargeCoins` so concurrent recharges never
   * overwrite each other.
   *
   * @returns The updated (or newly created) user premium document.
   */
  static async trackRecharge(
    userId: string,
    coins: number,
    session: ClientSession,
  ): Promise<IUserSvipDocument> {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // ── 1. Handle month boundary — reset counter if needed ────────────
    const existing = await SvipService.userSvipRepo.findByUserId(
      userId,
      session,
    );

    let levelAtStartOfMonth = existing?.levelStartOfMonth ?? 0;
    let currentLevel = existing?.currentLevel ?? 0;

    if (existing && (existing.month !== currentMonth || existing.year !== currentYear)) {
      // New month: start fresh, keep the level as start-of-month
      levelAtStartOfMonth = existing.currentLevel;
      // Reset counter to 0 so the $inc below starts from zero
      await SvipService.userSvipRepo.upsert(
        userId,
        {
          monthlyRechargeCoins: 0,
          levelStartOfMonth: levelAtStartOfMonth,
          month: currentMonth,
          year: currentYear,
        },
        session,
      );
    }

    // ── 2. Atomically add coins ───────────────────────────────────────
    const svipRecord = await SvipService.userSvipRepo.incMonthlyRecharge(
      userId,
      coins,
      currentLevel,
      levelAtStartOfMonth,
      currentMonth,
      currentYear,
      session,
    );

    // ── 3. Check milestones — did we cross any? ───────────────────────
    const config = await SvipConfigService.getConfig();
    if (config) {
      const allLevels = SvipService.buildAllLevels(config);

      // Find highest level where monthlyRechargeCoins >= milestoneCoins
      // Check levels in order: VIP first, then SVIP
      let highestQualifiedLevel = svipRecord.currentLevel;
      for (const lvl of allLevels) {
        if (svipRecord.monthlyRechargeCoins >= lvl.milestoneCoins) {
          if (lvl.level > highestQualifiedLevel) {
            highestQualifiedLevel = lvl.level;
          }
        }
      }

      // ── 4. Upgrade level if a milestone was crossed ─────────────────
      if (highestQualifiedLevel > svipRecord.currentLevel) {
        await SvipService.userSvipRepo.setLevel(
          userId,
          highestQualifiedLevel,
          session,
        );
        (svipRecord as any).currentLevel = highestQualifiedLevel;
      }

      // ── 5. Auto-grant the corresponding store item to bucket ────────
      await SvipService.syncBucketWithLevel(
        userId,
        highestQualifiedLevel,
        session,
      );
    }

    return svipRecord;
  }

  // ────────────────────────────────────────────────────────────────────────
  //  Bucket sync helper — called from trackRecharge and runMonthlyRetention
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Creates or updates the user's bucket item to match their current level.
   *
   * - Dynamically searches the store by categoryId + tierNumber.
   - If the store item is not found → logs a warning (admin must create it).
   * - If the user already has a bucket item in this category → replaces it.
   * - If not → creates a new bucket entry with useStatus: true.
   * - If level is 0 → removes bucket items from both VIP and SVIP categories.
   *
   * This runs **inside the same transaction** as the recharge.
   */
  static async syncBucketWithLevel(
    userId: string,
    level: number,
    session?: ClientSession,
  ): Promise<void> {
    const config = await SvipConfigService.getConfig();
    if (!config) {
      console.warn("[Premium] No config loaded — cannot sync bucket item.");
      return;
    }

    // ── Level 0: remove bucket items from both categories ─────────────
    if (level < 1) {
      await SvipService.removeBucketItemForCategory(userId, config.vipCategoryName, session);
      await SvipService.removeBucketItemForCategory(userId, config.svipCategoryName, session);
      return;
    }

    // ── Resolve level to category + tierNumber ────────────────────────
    const resolved = SvipService.resolveLevel(config, level);
    if (!resolved) {
      console.warn(`[Premium] Invalid level ${level} — cannot sync bucket item.`);
      return;
    }

    // ── Find category ────────────────────────────────────────────────
    const category = await SvipService.categoryRepo.getCategoryByTitle(resolved.categoryName);
    if (!category) {
      console.warn(
        `[Premium] Category "${resolved.categoryName}" not found — cannot grant bucket item for level ${level}.`,
      );
      return;
    }
    const categoryId = (category as any)._id.toString();

    // ── Search store for matching item by categoryId + tierNumber ─────
    const storeItem = await SvipService.storeItemRepo.findByCategoryAndTierNumber(
      categoryId,
      resolved.tierNumber,
    );
    if (!storeItem) {
      console.warn(
        `[Premium] No store item found for level ${level} ` +
        `(category: "${resolved.categoryName}", tierNumber: ${resolved.tierNumber}). ` +
        `Admin must create this item in the store.`,
      );
      return;
    }

    // ── Find existing bucket item in this category ────────────────────
    const existingBucket = await SvipService.bucketRepo.findBucketByOwnerAndCategory(
      userId,
      categoryId,
      session,
    );

    if (existingBucket) {
      // Replace existing bucket item
      await SvipService.bucketRepo.updateBucket(
        (existingBucket as any)._id.toString(),
        {
          itemId: (storeItem as any)._id.toString(),
          useStatus: true,
        },
        session,
      );
    } else {
      // Create new bucket entry
      await SvipService.bucketRepo.createNewBucket(
        {
          itemId: (storeItem as any)._id as any,
          ownerId: userId,
          categoryId,
          useStatus: true,
          expireAt: new Date(2100, 0, 1),
        },
        session,
      );
    }

    // ── Remove old category bucket if level switched categories ───────
    // e.g. user went from VIP → SVIP, remove VIP bucket item
    const oldCategoryName = level <= (config.vipTiers.length)
      ? config.svipCategoryName  // was in SVIP before? (shouldn't happen normally)
      : config.vipCategoryName;  // was in VIP before — remove it

    if (oldCategoryName !== resolved.categoryName) {
      await SvipService.removeBucketItemForCategory(userId, oldCategoryName, session);
    }
  }

  /**
   * Removes the bucket item for a specific category (VIP or SVIP).
   */
  private static async removeBucketItemForCategory(
    userId: string,
    categoryName: string,
    session?: ClientSession,
  ): Promise<void> {
    const category = await SvipService.categoryRepo.getCategoryByTitle(categoryName);
    if (!category) return;

    const existing = await SvipService.bucketRepo.findBucketByOwnerAndCategory(
      userId,
      (category as any)._id.toString(),
      session,
    );
    if (existing) {
      await SvipService.bucketRepo.deleteBucket((existing as any)._id.toString());
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  //  Month-end retention / downgrade (called from cron)
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Runs at the end of each month. For every user with level > 0:
   *   1. Determines the effective level = max(levelStartOfMonth, currentLevel)
   *   2. Checks if monthlyRechargeCoins >= retentionThreshold × milestone
   *   3. If yes → retains level
   *   4. If no  → downgrades by 1 (never below 0)
   *   5. Resets monthlyRechargeCoins to 0 for the new month
   */
  static async runMonthlyRetention(): Promise<{
    processed: number;
    retained: number;
    downgraded: number;
  }> {
    const config = await SvipConfigService.getConfig();
    if (!config) {
      console.log("[Premium Cron] No config loaded — skipping retention.");
      return { processed: 0, retained: 0, downgraded: 0 };
    }

    const allLevels = SvipService.buildAllLevels(config);
    const maxLevel = SvipService.getMaxLevel(config);
    const activeUsers = await SvipService.userSvipRepo.findAllActiveUsers();

    const updates: {
      userId: string;
      currentLevel: number;
      levelStartOfMonth: number;
    }[] = [];

    let retained = 0;
    let downgraded = 0;

    for (const record of activeUsers) {
      // Effective level = max(level they started the month with, highest they earned during the month)
      const effectiveLevel = Math.max(
        record.levelStartOfMonth,
        record.currentLevel,
      );

      // Find the milestone for this effective level
      const levelConfig = allLevels.find((l) => l.level === effectiveLevel);
      if (!levelConfig) {
        // Unknown level — treat as level 0
        updates.push({
          userId: record.userId.toString(),
          currentLevel: 0,
          levelStartOfMonth: 0,
        });
        downgraded++;
        continue;
      }

      // Check retention: monthly recharge >= retentionThreshold × milestone
      const requiredCoins = Math.floor(
        levelConfig.milestoneCoins * config.retentionThreshold,
      );

      if (record.monthlyRechargeCoins >= requiredCoins) {
        // Retained — keep the same level
        updates.push({
          userId: record.userId.toString(),
          currentLevel: effectiveLevel,
          levelStartOfMonth: effectiveLevel,
        });
        retained++;
      } else {
        // Failed retention — downgrade by 1 (never below 0)
        const newLevel = Math.max(0, effectiveLevel - 1);
        updates.push({
          userId: record.userId.toString(),
          currentLevel: newLevel,
          levelStartOfMonth: newLevel,
        });
        downgraded++;
      }
    }

    // Persist all updates in a single bulkWrite
    if (updates.length > 0) {
      await SvipService.userSvipRepo.bulkResetForNewMonth(updates);
    }

    // ── Sync bucket items to match new levels ─────────────────────────
    // Run outside the bulkWrite — bucket operations are on a different collection.
    await Promise.all(
      updates.map((u) => SvipService.syncBucketWithLevel(u.userId, u.currentLevel)),
    );

    console.log(
      `[Premium Cron] Retention complete: ${retained} retained, ${downgraded} downgraded, ${activeUsers.length} processed.`,
    );

    return { processed: activeUsers.length, retained, downgraded };
  }

  // ────────────────────────────────────────────────────────────────────────
  //  Get user status (for API)
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Returns a user's premium dashboard: current level, progress toward next
   * milestone, retention status, current bucket item, etc.
   */
  static async getUserStatus(userId: string): Promise<{
    currentLevel: number;
    maxLevel: number;
    monthlyRechargeCoins: number;
    levelStartOfMonth: number;
    nextMilestone: { level: number; milestoneCoins: number } | null;
    progressPercent: number;
    retentionStatus: {
      requiredCoins: number;
      currentProgress: number;
      meetsRequirement: boolean;
    } | null;
    currentItem: {
      name: string | null;
      logo: string | null;
      svgaFile: string | null;
      previewFile: string | null;
    };
    isVipLevel: boolean;
  }> {
    const config = await SvipConfigService.getConfig();
    const record = await SvipService.userSvipRepo.findByUserId(userId);

    const currentLevel = record?.currentLevel ?? 0;
    const monthlyRechargeCoins = record?.monthlyRechargeCoins ?? 0;
    const levelStartOfMonth = record?.levelStartOfMonth ?? 0;
    const maxLevel = config ? SvipService.getMaxLevel(config) : 0;

    // Build all levels and find next milestone
    const allLevels = config ? SvipService.buildAllLevels(config) : [];
    const nextMilestone = allLevels.find((l) => l.level > currentLevel) ?? null;

    const progressPercent = nextMilestone
      ? Math.min(100, Math.floor((monthlyRechargeCoins / nextMilestone.milestoneCoins) * 100))
      : 100;

    // Retention status
    let retentionStatus = null;
    if (currentLevel > 0 && config) {
      const effectiveLevel = Math.max(levelStartOfMonth, currentLevel);
      const levelConfig = allLevels.find((l) => l.level === effectiveLevel);
      if (levelConfig) {
        const requiredCoins = Math.floor(
          levelConfig.milestoneCoins * config.retentionThreshold,
        );
        retentionStatus = {
          requiredCoins,
          currentProgress: monthlyRechargeCoins,
          meetsRequirement: monthlyRechargeCoins >= requiredCoins,
        };
      }
    }

    // Current bucket item details
    let currentItem: {
      name: string | null;
      logo: string | null;
      svgaFile: string | null;
      previewFile: string | null;
    } = { name: null, logo: null, svgaFile: null, previewFile: null };

    if (currentLevel > 0 && config) {
      const resolved = SvipService.resolveLevel(config, currentLevel);
      if (resolved) {
        const category = await SvipService.categoryRepo.getCategoryByTitle(resolved.categoryName);
        if (category) {
          const storeItem = await SvipService.storeItemRepo.findByCategoryAndTierNumber(
            (category as any)._id.toString(),
            resolved.tierNumber,
          );
          if (storeItem) {
            const tagBundle = storeItem.bundleFiles?.find(
              (b) => b.categoryName === "svga_tag",
            );
            currentItem = {
              name: storeItem.name,
              logo: storeItem.logo ?? null,
              svgaFile: tagBundle?.svgaFile ?? null,
              previewFile: tagBundle?.previewFile ?? null,
            };
          }
        }
      }
    }

    return {
      currentLevel,
      maxLevel,
      monthlyRechargeCoins,
      levelStartOfMonth,
      nextMilestone,
      progressPercent,
      retentionStatus,
      currentItem,
      isVipLevel: config ? currentLevel <= config.vipTiers.length && currentLevel > 0 : false,
    };
  }

  // ────────────────────────────────────────────────────────────────────────
  //  Admin: list users by level
  // ────────────────────────────────────────────────────────────────────────

  static async getUsersByLevel(
    level: number,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ pagination: any; users: IUserSvipDocument[] }> {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      SvipService.userSvipRepo.getUsersByLevel(level, skip, limit),
      SvipService.userSvipRepo.countByLevel(level),
    ]);

    return {
      pagination: {
        total,
        limit,
        page,
        totalPage: Math.ceil(total / limit),
      },
      users,
    };
  }
}
