import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import { RepositoryProviders } from "../../core/providers/repository_providers";
import { IFamilyRewardRepository } from "../../repository/family/family_reward_repository";
import {
  IFamilyRewardConfig,
  IFamilyRewardConfigDocument,
} from "../../models/family/family_reward_model";
import { isValidObjectId } from "mongoose";

export interface IFamilyRewardService {
  createRewardConfig(data: {
    rank?: number;
    startRank?: number;
    endRank?: number;
    items: IFamilyRewardConfig["items"];
    starRating: number;
    label: string;
  }): Promise<IFamilyRewardConfigDocument>;

  updateRewardConfig(
    id: string,
    data: Partial<{
      rank?: number;
      startRank?: number;
      endRank?: number;
      items: IFamilyRewardConfig["items"];
      starRating: number;
      label: string;
    }>,
  ): Promise<IFamilyRewardConfigDocument>;

  deleteRewardConfig(id: string): Promise<IFamilyRewardConfigDocument>;

  getAdminRewardConfigs(): Promise<IFamilyRewardConfigDocument[]>;

  getPublicRewardDisplay(): Promise<
    {
      label: string;
      starRating: number;
      rankDisplay: string;
      items: IFamilyRewardConfig["items"];
    }[]
  >;
}

export class FamilyRewardService implements IFamilyRewardService {
  private rewardRepository: IFamilyRewardRepository =
    RepositoryProviders.familyRewardRepositoryProvider;
  private storeItemRepository = RepositoryProviders.storeItemRepositoryProvider;

  /**
   * Creates a new reward configuration.
   * Accepts either a single `rank` (e.g., rank: 1) or a range (`startRank` + `endRank`).
   * If a single rank is provided, both startRank and endRank are set to that value.
   * Validates that the range does not overlap with any existing configuration.
   */
  async createRewardConfig(data: {
    rank?: number;
    startRank?: number;
    endRank?: number;
    items: IFamilyRewardConfig["items"];
    starRating: number;
    label: string;
  }): Promise<IFamilyRewardConfigDocument> {
    const { startRank, endRank } = this.resolveRankRange(data);

    // Validate the range does not overlap with existing configs
    const overlap = await this.rewardRepository.checkOverlappingRange(
      startRank,
      endRank,
    );
    if (overlap) {
      throw new AppError(
        StatusCodes.CONFLICT,
        `This rank range (${startRank}-${endRank}) overlaps with existing config "${overlap.label}" (${overlap.startRank}-${overlap.endRank})`,
      );
    }

    // check if the provided itemids are valid
    await this.validateItemIds(data.items);

    const config: IFamilyRewardConfig = {
      startRank,
      endRank,
      items: data.items,
      starRating: data.starRating,
      label: data.label,
    };

    return await this.rewardRepository.createOrUpdateRewardConfig(config);
  }

  /**
   * Updates an existing reward configuration.
   * The admin can change the rank range (e.g., shrink 4-10 to 5-10 after making rank 4 independent).
   * Validates that the new range does not overlap with other configs (excluding itself).
   */
  async updateRewardConfig(
    id: string,
    data: Partial<{
      rank?: number;
      startRank?: number;
      endRank?: number;
      items: IFamilyRewardConfig["items"];
      starRating: number;
      label: string;
    }>,
  ): Promise<IFamilyRewardConfigDocument> {
    // Step 1: Ensure the config exists
    const existing = await this.rewardRepository.getConfigById(id);
    if (!existing) {
      throw new AppError(
        StatusCodes.NOT_FOUND,
        `Reward config with id ${id} not found`,
      );
    }

    // Step 2: Resolve new rank range
    const { startRank, endRank } = this.resolveRankRange(data, existing);

    // Step 3: Check for overlaps with OTHER configs (excluding this one)
    const overlap = await this.rewardRepository.checkOverlappingRange(
      startRank,
      endRank,
      id,
    );
    if (overlap) {
      throw new AppError(
        StatusCodes.CONFLICT,
        `This rank range (${startRank}-${endRank}) overlaps with existing config "${overlap.label}" (${overlap.startRank}-${overlap.endRank})`,
      );
    }

    // Step 4: Validate items if provided
    if (data.items) {
      await this.validateItemIds(data.items);
    }

    // Step 5: Build update object with only provided fields
    const updateData: Partial<IFamilyRewardConfig> = {
      startRank,
      endRank,
    };
    if (data.items !== undefined) updateData.items = data.items;
    if (data.starRating !== undefined) updateData.starRating = data.starRating;
    if (data.label !== undefined) updateData.label = data.label;

    Object.assign(existing, updateData);
    return await existing.save();
  }

  /**
   * Deletes a reward configuration by its ID.
   */
  async deleteRewardConfig(id: string): Promise<IFamilyRewardConfigDocument> {
    const deleted = await this.rewardRepository.deleteConfig(id);
    if (!deleted) {
      throw new AppError(
        StatusCodes.NOT_FOUND,
        `Reward config with id ${id} not found`,
      );
    }
    return deleted;
  }

  /**
   * Returns all reward configurations for the admin panel.
   * Sorted by startRank ascending, with full item details populated.
   */
  async getAdminRewardConfigs(): Promise<IFamilyRewardConfigDocument[]> {
    return await this.rewardRepository.getAllConfigs();
  }

  /**
   * Returns a formatted list of rewards for the app UI.
   * Each entry includes a display-friendly rank label (e.g., "TOP1", "TOP4-10"),
   * star rating, and the full item details needed to render the reward cards.
   */
  async getPublicRewardDisplay(): Promise<
    {
      label: string;
      starRating: number;
      rankDisplay: string;
      items: IFamilyRewardConfig["items"];
    }[]
  > {
    const configs = await this.rewardRepository.getAllConfigs();

    return configs.map((config) => ({
      label: config.label,
      starRating: config.starRating,
      rankDisplay:
        config.startRank === config.endRank
          ? `TOP${config.startRank}`
          : `TOP${config.startRank}-${config.endRank}`,
      items: config.items,
    }));
  }

  /**
   * Helper to normalize the rank input.
   * If the admin sends a single `rank`, it becomes startRank = endRank = rank.
   * If they send `startRank` and `endRank`, those are used directly.
   */
  private resolveRankRange(
    data: {
      rank?: number;
      startRank?: number;
      endRank?: number;
    },
    fallback?: { startRank: number; endRank: number },
  ): { startRank: number; endRank: number } {
    let startRank: number | undefined;
    let endRank: number | undefined;

    if (data.rank !== undefined) {
      startRank = data.rank;
      endRank = data.rank;
    } else {
      // Use provided values or fall back to existing ones
      startRank = data.startRank ?? fallback?.startRank;
      endRank = data.endRank ?? fallback?.endRank;
    }

    if (startRank === undefined || endRank === undefined) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Either 'rank' (for single rank) or both 'startRank' and 'endRank' (for range) must be provided",
      );
    }

    if (startRank < 1) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Rank must be at least 1");
    }

    if (startRank > endRank) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `startRank (${startRank}) cannot be greater than endRank (${endRank})`,
      );
    }

    return { startRank, endRank };
  }

  /**
   * Validates that all provided item IDs exist in the store.
   */
  private async validateItemIds(
    items: IFamilyRewardConfig["items"],
  ): Promise<void> {
    if (!items || items.length === 0) return;

    for (const item of items) {
      if (!isValidObjectId(item.itemId)) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          `Store item with id ${item.itemId} is not valid`,
        );
      }
      const exists = await this.storeItemRepository.getStoreItemById(
        item.itemId.toString(),
      );
      if (!exists) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          `Store item with id ${item.itemId} not found`,
        );
      }
    }
  }
}
