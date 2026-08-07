import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import { uploadFileToNimbus, deleteFileFromNimbus } from "../../core/Utils/nimbus_client";
import { ILevelTagRepository } from "../../repository/levelTag/level_tag_repository";
import { ILevelTagDocument } from "../../models/levelTag/level_tag_model";

export interface ILevelTagService {
  createLevelTag(level: number, file: Express.Multer.File): Promise<ILevelTagDocument>;
  getAllLevelTags(): Promise<ILevelTagDocument[]>;
  getLevelTagById(id: string): Promise<ILevelTagDocument>;
  updateLevelTag(
    id: string,
    data: { level?: number },
    file?: Express.Multer.File,
  ): Promise<ILevelTagDocument>;
}

export default class LevelTagService implements ILevelTagService {
  LevelTagRepository: ILevelTagRepository;

  constructor(LevelTagRepository: ILevelTagRepository) {
    this.LevelTagRepository = LevelTagRepository;
  }

  async createLevelTag(level: number, file: Express.Multer.File): Promise<ILevelTagDocument> {
    const existing = await this.LevelTagRepository.findByLevel(level);
    if (existing) {
      throw new AppError(StatusCodes.CONFLICT, `Level ${level} already has a tag`);
    }

    const asset = await uploadFileToNimbus({ file });

    return await this.LevelTagRepository.create({
      level,
      tagFile: asset.url ?? "",
      tagFileId: asset._id,
    });
  }

  async getAllLevelTags(): Promise<ILevelTagDocument[]> {
    return await this.LevelTagRepository.findAll();
  }

  async getLevelTagById(id: string): Promise<ILevelTagDocument> {
    const levelTag = await this.LevelTagRepository.findById(id);
    if (!levelTag) throw new AppError(StatusCodes.NOT_FOUND, "Level tag not found");
    return levelTag;
  }

  async updateLevelTag(
    id: string,
    data: { level?: number },
    file?: Express.Multer.File,
  ): Promise<ILevelTagDocument> {
    const existing = await this.LevelTagRepository.findById(id);
    if (!existing) throw new AppError(StatusCodes.NOT_FOUND, "Level tag not found");

    if (data.level !== undefined && data.level !== existing.level) {
      const conflict = await this.LevelTagRepository.findByLevel(data.level);
      if (conflict) {
        throw new AppError(StatusCodes.CONFLICT, `Level ${data.level} already has a tag`);
      }
    }

    const updateData: Partial<{ level: number; tagFile: string; tagFileId: string }> = {};

    if (data.level !== undefined) {
      updateData.level = data.level;
    }

    if (file) {
      await deleteFileFromNimbus(existing.tagFileId);
      const asset = await uploadFileToNimbus({ file });
      updateData.tagFile = asset.url ?? "";
      updateData.tagFileId = asset._id;
    }

    return await this.LevelTagRepository.update(id, updateData);
  }
}
