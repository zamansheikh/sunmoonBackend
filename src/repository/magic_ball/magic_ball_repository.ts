import AppError from "../../core/errors/app_errors";
import {
  IMagicBallDocument,
  IMagicBallModel,
} from "../../models/magic_ball/magic_ball_model";

export interface IMagicBallRepository {
  create(data: IMagicBallDocument): Promise<IMagicBallDocument>;
  getByCategory(category: string): Promise<IMagicBallDocument | null>;
  getAll(): Promise<IMagicBallDocument[]>;
  update(id: string, data: IMagicBallDocument): Promise<IMagicBallDocument>;
  delete(id: string): Promise<IMagicBallDocument>;
  deleteByCategory(category: string): Promise<IMagicBallDocument>;
}

export class MagicBallRepository implements IMagicBallRepository {
  Model: IMagicBallModel;

  constructor(model: IMagicBallModel) {
    this.Model = model;
  }

  async create(data: IMagicBallDocument) {
    const isExist = await this.Model.findOne({ category: data.category });
    if (isExist) {
      throw new AppError(400, "Category already exists");
    }
    return await this.Model.create(data);
  }

  async getByCategory(category: string) {
    return await this.Model.findOne({ category });
  }

  async getAll() {
    return await this.Model.find();
  }

  async update(id: string, data: IMagicBallDocument) {
    const res = await this.Model.findByIdAndUpdate(id, data, { new: true });
    if (!res) {
      throw new AppError(404, "Not found");
    }
    return res;
  }

  async delete(id: string) {
    const res = await this.Model.findByIdAndDelete(id);
    if (!res) {
      throw new AppError(404, "Not found");
    }
    return res;
  }

  async deleteByCategory(category: string) {
    const res = await this.Model.findOneAndDelete({ category });
    if (!res) {
      throw new AppError(404, "Not found");
    }
    return res;
  }
}
