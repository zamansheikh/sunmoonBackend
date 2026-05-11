import RoomLevelCriteriaModel, {
  IRoomLevelCriteria,
  IRoomLevelCriteriaDocument,
  IRoomLevelCriteriaModel,
} from "../../models/audio_room/room_level_criteria_model";

export interface IRoomLevelCriteriaRepository {
  /**
   * Fetches all room level criteria sorted by level in ascending order.
   * This is crucial for correctly populating the in-memory array.
   */
  getAllSorted(): Promise<IRoomLevelCriteriaDocument[]>;
  
  /**
   * Creates or updates a room level criteria document.
   * @param level The level number to upsert.
   * @param data The criteria data.
   */
  upsert(level: number, data: Partial<IRoomLevelCriteria>): Promise<IRoomLevelCriteriaDocument>;
  
  /**
   * Deletes a specific room level criteria.
   * @param level The level number to delete.
   */
  delete(level: number): Promise<IRoomLevelCriteriaDocument | null>;
}

export class RoomLevelCriteriaRepository implements IRoomLevelCriteriaRepository {
  private Model: IRoomLevelCriteriaModel;

  constructor(model: IRoomLevelCriteriaModel) {
    this.Model = model;
  }

  async getAllSorted(): Promise<IRoomLevelCriteriaDocument[]> {
    return await this.Model.find().sort({ level: 1 });
  }

  async upsert(
    level: number,
    data: Partial<IRoomLevelCriteria>
  ): Promise<IRoomLevelCriteriaDocument> {
    return await this.Model.findOneAndUpdate(
      { level },
      { $set: data },
      { new: true, upsert: true }
    ) as IRoomLevelCriteriaDocument;
  }

  async delete(level: number): Promise<IRoomLevelCriteriaDocument | null> {
    return await this.Model.findOneAndDelete({ level });
  }
}
