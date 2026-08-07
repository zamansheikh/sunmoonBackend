import AppError from "../../core/errors/app_errors";
import { StatusCodes } from "http-status-codes";
import LevelTagModel, {
  ILevelTag,
  ILevelTagDocument,
  ILevelTagModel,
} from "../../models/levelTag/level_tag_model";

export interface ILevelTagRepository {
  create(data: ILevelTag): Promise<ILevelTagDocument>;
  findAll(): Promise<ILevelTagDocument[]>;
  findById(id: string): Promise<ILevelTagDocument | null>;
  findByLevel(level: number): Promise<ILevelTagDocument | null>;
  update(id: string, data: Partial<ILevelTag>): Promise<ILevelTagDocument>;
}

export default class LevelTagRepository implements ILevelTagRepository {
  Model: ILevelTagModel;

  constructor(Model: ILevelTagModel) {
    this.Model = Model;
  }

  async create(data: ILevelTag): Promise<ILevelTagDocument> {
    const levelTag = new this.Model(data);
    return await levelTag.save();
  }

  async findAll(): Promise<ILevelTagDocument[]> {
    return await this.Model.find().sort({ level: 1 });
  }

  async findById(id: string): Promise<ILevelTagDocument | null> {
    return await this.Model.findById(id);
  }

  async findByLevel(level: number): Promise<ILevelTagDocument | null> {
    return await this.Model.findOne({ level });
  }

  async update(id: string, data: Partial<ILevelTag>): Promise<ILevelTagDocument> {
    const updated = await this.Model.findByIdAndUpdate(id, data, { new: true });
    if (!updated) throw new AppError(StatusCodes.NOT_FOUND, "Level tag not found");
    return updated;
  }
}
