import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import {
  IMedal,
  IMedalDocument,
  IMedalModel,
} from "../../models/medal/medal_model";

export interface IMedalRepository {
  create(data: IMedal): Promise<IMedalDocument>;
  findAll(): Promise<IMedalDocument[]>;
  findById(id: string): Promise<IMedalDocument | null>;
  findByLevel(level: number): Promise<IMedalDocument | null>;
  update(id: string, data: Partial<IMedal>): Promise<IMedalDocument>;
  delete(id: string): Promise<IMedalDocument>;
}

export default class MedalRepository implements IMedalRepository {
  Model: IMedalModel;

  constructor(Model: IMedalModel) {
    this.Model = Model;
  }

  async create(data: IMedal): Promise<IMedalDocument> {
    const medal = new this.Model(data);
    return await medal.save();
  }

  async findAll(): Promise<IMedalDocument[]> {
    return await this.Model.find().sort({ level: 1 });
  }

  async findById(id: string): Promise<IMedalDocument | null> {
    return await this.Model.findById(id);
  }

  async findByLevel(level: number): Promise<IMedalDocument | null> {
    return await this.Model.findOne({ level });
  }

  async update(id: string, data: Partial<IMedal>): Promise<IMedalDocument> {
    const updated = await this.Model.findByIdAndUpdate(id, data, {
      new: true,
    });
    if (!updated) {
      throw new AppError(StatusCodes.NOT_FOUND, "Medal not found");
    }
    return updated;
  }

  async delete(id: string): Promise<IMedalDocument> {
    const deleted = await this.Model.findByIdAndDelete(id);
    if (!deleted) {
      throw new AppError(StatusCodes.NOT_FOUND, "Medal not found");
    }
    return deleted;
  }
}
