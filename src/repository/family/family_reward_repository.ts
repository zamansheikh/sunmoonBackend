import FamilyRewardConfigModel, {
  IFamilyRewardConfig,
  IFamilyRewardConfigDocument,
  IFamilyRewardConfigModel,
} from "../../models/family/family_reward_model";

export interface IFamilyRewardRepository {
  createOrUpdateRewardConfig(
    data: IFamilyRewardConfig,
  ): Promise<IFamilyRewardConfigDocument>;
  getAllConfigs(): Promise<IFamilyRewardConfigDocument[]>;
  getConfigById(id: string): Promise<IFamilyRewardConfigDocument | null>;
  deleteConfig(id: string): Promise<IFamilyRewardConfigDocument | null>;
  getConfigByRank(rank: number): Promise<IFamilyRewardConfigDocument | null>;
  checkOverlappingRange(
    startRank: number,
    endRank: number,
    excludeId?: string,
  ): Promise<IFamilyRewardConfigDocument | null>;
}

export default class FamilyRewardRepository implements IFamilyRewardRepository {
  Model: IFamilyRewardConfigModel;
  constructor(model: IFamilyRewardConfigModel) {
    this.Model = model;
  }

  async createOrUpdateRewardConfig(
    data: IFamilyRewardConfig,
  ): Promise<IFamilyRewardConfigDocument> {
    // If we want to handle update logic here, we can check for existing range
    const existing = await this.Model.findOne({
      startRank: data.startRank,
      endRank: data.endRank,
    });

    if (existing) {
      Object.assign(existing, data);
      return await existing.save();
    }

    const config = new this.Model(data);
    return await config.save();
  }

  async getAllConfigs(): Promise<IFamilyRewardConfigDocument[]> {
    return await this.Model.find()
      .sort({ startRank: 1 })
      .populate("items.itemId");
  }

  async getConfigById(id: string): Promise<IFamilyRewardConfigDocument | null> {
    return await this.Model.findById(id).populate("items.itemId");
  }

  async deleteConfig(id: string): Promise<IFamilyRewardConfigDocument | null> {
    return await this.Model.findByIdAndDelete(id);
  }

  async getConfigByRank(rank: number): Promise<IFamilyRewardConfigDocument | null> {
    return await this.Model.findOne({
      startRank: { $lte: rank },
      endRank: { $gte: rank },
    }).populate("items.itemId");
  }

  async checkOverlappingRange(
    startRank: number,
    endRank: number,
    excludeId?: string,
  ): Promise<IFamilyRewardConfigDocument | null> {
    const query: any = {
      $or: [
        {
          startRank: { $lte: endRank },
          endRank: { $gte: startRank },
        },
      ],
    };

    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    return await this.Model.findOne(query);
  }
}
