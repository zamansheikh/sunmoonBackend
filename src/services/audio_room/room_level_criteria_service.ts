import { ROOM_LEVEL_CRITERIA } from "../../core/Utils/constants";
import {
  IRoomLevelCriteria,
  IRoomLevelCriteriaDocument,
} from "../../models/audio_room/room_level_criteria_model";
import { IRoomLevelCriteriaRepository } from "../../repository/audio_room/room_level_criteria_repository";
import { RepositoryProviders } from "../../core/providers/repository_providers";

/**
 * Service interface for managing Audio Room Level Criteria.
 * Implements synchronization between the Database and the In-Memory array
 * to ensure high performance and zero-touch for existing business logic.
 */
export interface IRoomLevelCriteriaService {
  /** Fetch all levels sorted by level number */
  getAllLevels(): Promise<IRoomLevelCriteriaDocument[]>;

  /** Create or update a specific level configuration */
  upsertLevel(
    level: number,
    data: Partial<IRoomLevelCriteria>,
  ): Promise<IRoomLevelCriteriaDocument>;

  /** Remove a specific level configuration */
  deleteLevel(level: number): Promise<IRoomLevelCriteriaDocument | null>;

  /** Syncs the current database state to the global ROOM_LEVEL_CRITERIA array */
  syncToMemory(): Promise<void>;
}

export class RoomLevelCriteriaService implements IRoomLevelCriteriaService {
  /**
   * Bootstraps the room level criteria from the database.
   * This is intended to be called once during server startup.
   */
  static async bootstrap(): Promise<void> {
    const repository = RepositoryProviders.roomLevelCriteriaRepositoryProvider;
    const service = new RoomLevelCriteriaService(repository);
    await service.syncToMemory();
    console.log("✅ Room Level Criteria synchronized from database.");
  }

  private repository: IRoomLevelCriteriaRepository;

  constructor(repository: IRoomLevelCriteriaRepository) {
    this.repository = repository;
  }

  async getAllLevels(): Promise<IRoomLevelCriteriaDocument[]> {
    return await this.repository.getAllSorted();
  }

  async upsertLevel(
    level: number,
    data: Partial<IRoomLevelCriteria>,
  ): Promise<IRoomLevelCriteriaDocument> {
    const result = await this.repository.upsert(level, data);
    // Refresh the in-memory array so changes take effect immediately
    await this.syncToMemory();
    return result;
  }

  async deleteLevel(level: number): Promise<IRoomLevelCriteriaDocument | null> {
    const result = await this.repository.delete(level);
    // Refresh the in-memory array so changes take effect immediately
    await this.syncToMemory();
    return result;
  }

  /**
   * Performs an in-place update of the ROOM_LEVEL_CRITERIA array in constants.ts.
   * This ensures that all services (RoomSupportService, Cron Jobs, etc.)
   * use the latest admin-configured values without needing a server restart.
   */
  async syncToMemory(): Promise<void> {
    const levels = await this.repository.getAllSorted();

    // Map Mongoose documents to the expected interface
    const formattedLevels = levels.map((doc) => ({
      level: doc.level,
      roomVisitor: doc.roomVisitor,
      roomTransactions: doc.roomTransactions,
      totalRewardCoin: doc.totalRewardCoin,
      ownerCoin: doc.ownerCoin,
      partnerCoin: doc.partnerCoin,
      numberOfPartners: doc.numberOfPartners,
    }));

    // Clear and populate the exported array reference
    ROOM_LEVEL_CRITERIA.length = 0;
    if (formattedLevels.length > 0) {
      // Clear and populate the exported array reference
      ROOM_LEVEL_CRITERIA.length = 0;
      ROOM_LEVEL_CRITERIA.push(...formattedLevels);
    }
  }
}
