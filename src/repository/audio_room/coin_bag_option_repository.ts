import AppError from "../../core/errors/app_errors";
import {
  ICoinBagOptions,
  ICoinBagOptionsModel,
} from "../../models/audio_room/coin_bag_option_model";

export interface ICoinBagOptionRepository {
  create(data: ICoinBagOptions): Promise<ICoinBagOptions>;
  get(): Promise<ICoinBagOptions>;
  update(data: ICoinBagOptions): Promise<ICoinBagOptions | null>;
}

export class CoinBagOptionRepository implements ICoinBagOptionRepository {
  Model: ICoinBagOptionsModel;
  constructor(model: ICoinBagOptionsModel) {
    this.Model = model;
  }
  async create(data: ICoinBagOptions): Promise<ICoinBagOptions> {
    const existing = await this.Model.findOne();
    if (existing) {
      throw new AppError(400, "Coin bag options already exist");
    }
    const created = await this.Model.create(data);
    return created;
  }
  async get(): Promise<ICoinBagOptions> {
    const result = await this.Model.findOne();
    if (!result) throw new AppError(404, "Coin bag options not found");
    return result;
  }
  async update(data: ICoinBagOptions): Promise<ICoinBagOptions | null> {
    const result = await this.Model.findOneAndUpdate({}, data, { new: true });
    if (!result) throw new AppError(404, "Coin bag options not found");
    return result;
  }
}
