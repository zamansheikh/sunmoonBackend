import AppError from "../../core/errors/app_errors";
import { StatusCodes } from "http-status-codes";
import LevelRewardConfigModel, {
  ILevelRewardConfig,
  ILevelRewardConfigDocument,
  ILevelRewardConfigModel,
} from "../../models/levelReward/level_reward_config_model";

export interface ILevelRewardConfigRepository {
  create(data: ILevelRewardConfig): Promise<ILevelRewardConfigDocument>;
  findAll(): Promise<ILevelRewardConfigDocument[]>;
  findById(id: string): Promise<ILevelRewardConfigDocument | null>;
  findByLevel(level: number): Promise<ILevelRewardConfigDocument | null>;
  update(id: string, data: Partial<ILevelRewardConfig>): Promise<ILevelRewardConfigDocument>;
  delete(id: string): Promise<ILevelRewardConfigDocument>;
}

export default class LevelRewardConfigRepository implements ILevelRewardConfigRepository {
  Model: ILevelRewardConfigModel;

  constructor(Model: ILevelRewardConfigModel) {
    this.Model = Model;
  }

  async create(data: ILevelRewardConfig): Promise<ILevelRewardConfigDocument> {
    const config = new this.Model(data);
    return await config.save();
  }

  async findAll(): Promise<ILevelRewardConfigDocument[]> {
    return await this.Model.find().sort({ level: 1 });
  }

  async findById(id: string): Promise<ILevelRewardConfigDocument | null> {
    return await this.Model.findById(id);
  }

  async findByLevel(level: number): Promise<ILevelRewardConfigDocument | null> {
    return await this.Model.findOne({ level });
  }

  async update(id: string, data: Partial<ILevelRewardConfig>): Promise<ILevelRewardConfigDocument> {
    const updated = await this.Model.findByIdAndUpdate(id, data, { new: true });
    if (!updated) throw new AppError(StatusCodes.NOT_FOUND, "Level reward config not found");
    return updated;
  }

  async delete(id: string): Promise<ILevelRewardConfigDocument> {
    const deleted = await this.Model.findByIdAndDelete(id);
    if (!deleted) throw new AppError(StatusCodes.NOT_FOUND, "Level reward config not found");
    return deleted;
  }
}
