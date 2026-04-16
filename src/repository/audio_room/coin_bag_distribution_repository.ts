import AppError from "../../core/errors/app_errors";
import {
  ICoinBagDistribution,
  ICoinBagDistributionModel,
} from "../../models/audio_room/coin_bag_distribution_model";

export interface ICoinBagDistributionRepository {
  create(data: ICoinBagDistribution): Promise<ICoinBagDistribution>;
  getAll(): Promise<ICoinBagDistribution[]>;
  getByType(type: number): Promise<ICoinBagDistribution>;
  getById(id: string): Promise<ICoinBagDistribution>;
  update(data: ICoinBagDistribution): Promise<ICoinBagDistribution | null>;
}

export class CoinBagDistributionRepository implements ICoinBagDistributionRepository {
  Model: ICoinBagDistributionModel;
  constructor(model: ICoinBagDistributionModel) {
    this.Model = model;
  }

  async create(data: ICoinBagDistribution) {
    const existing = await this.Model.findOne({ totalUsers: data.totalUsers });
    if (existing) {
      throw new AppError(400, "Coin bag distribution already exist");
    }
    const created = await this.Model.create(data);
    return created;
  }

  async getAll() {
    const result = await this.Model.find();
    if (!result) throw new AppError(404, "Coin bag distribution not found");
    return result;
  }

  async getByType(type: number) {
    const result = await this.Model.findOne({ type });
    if (!result) throw new AppError(404, "Coin bag distribution not found");
    return result;
  }

  async getById(id: string) {
    const result = await this.Model.findById(id);
    if (!result) throw new AppError(404, "Coin bag distribution not found");
    return result;
  }

  async update(data: ICoinBagDistribution) {
    const result = await this.Model.findOneAndUpdate(
      { totalUsers: data.totalUsers },
      data,
      { new: true },
    );
    if (!result) throw new AppError(404, "Coin bag distribution not found");
    return result;
  }
}
