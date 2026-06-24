import {
  IFamilySupportReward,
  IFamilySupportRewardDocument,
  IFamilySupportRewardModel,
} from "../../models/family/family_support_reward_model";

export interface IFamilySupportRewardRepository {
  getAll(): Promise<IFamilySupportRewardDocument[]>;
  getByLevel(level: number): Promise<IFamilySupportRewardDocument | null>;
  updateByLevel(
    level: number,
    data: Partial<IFamilySupportReward>,
  ): Promise<IFamilySupportRewardDocument | null>;
}

export class FamilySupportRewardRepository
  implements IFamilySupportRewardRepository
{
  model: IFamilySupportRewardModel;

  constructor(model: IFamilySupportRewardModel) {
    this.model = model;
  }

  async getAll(): Promise<IFamilySupportRewardDocument[]> {
    return await this.model.find().sort({ level: 1 });
  }

  async getByLevel(level: number): Promise<IFamilySupportRewardDocument | null> {
    return await this.model.findOne({ level });
  }

  async updateByLevel(
    level: number,
    data: Partial<IFamilySupportReward>,
  ): Promise<IFamilySupportRewardDocument | null> {
    return await this.model.findOneAndUpdate({ level }, data, { new: true });
  }
}
