import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import {
  deleteFileFromCloudinary,
  uploadFileToCloudinary,
} from "../../core/Utils/upload_file_cloudinary";
import { CloudinaryFolder } from "../../core/Utils/enums";
import { IMedal, IMedalDocument } from "../../models/medal/medal_model";
import { IMedalRepository } from "../../repository/medal/medal_repository";

export interface IMedalService {
  createMedal(
    name: string,
    level: number,
    icon: Express.Multer.File,
    description?: string,
  ): Promise<IMedalDocument>;
  getAllMedals(): Promise<IMedalDocument[]>;
  getMedalById(id: string): Promise<IMedalDocument>;
  getMedalByLevel(level: number): Promise<IMedalDocument | null>;
  updateMedal(
    id: string,
    data: Partial<IMedal>,
    icon?: Express.Multer.File,
  ): Promise<IMedalDocument>;
  deleteMedal(id: string): Promise<IMedalDocument>;
}

export default class MedalService implements IMedalService {
  MedalRepository: IMedalRepository;

  constructor(MedalRepository: IMedalRepository) {
    this.MedalRepository = MedalRepository;
  }

  async createMedal(
    name: string,
    level: number,
    icon: Express.Multer.File,
    description?: string,
  ): Promise<IMedalDocument> {
    const existing = await this.MedalRepository.findByLevel(level);
    if (existing) {
      throw new AppError(
        StatusCodes.CONFLICT,
        "A medal already exists for this level",
      );
    }

    const iconUrl = await uploadFileToCloudinary({
      folder: CloudinaryFolder.MedalAssets,
      file: icon,
    });
    if (!iconUrl) {
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to upload medal icon",
      );
    }

    const medalData: IMedal = {
      name,
      level,
      icon: iconUrl,
      description,
    };

    return await this.MedalRepository.create(medalData);
  }

  async getAllMedals(): Promise<IMedalDocument[]> {
    return await this.MedalRepository.findAll();
  }

  async getMedalById(id: string): Promise<IMedalDocument> {
    const medal = await this.MedalRepository.findById(id);
    if (!medal) {
      throw new AppError(StatusCodes.NOT_FOUND, "Medal not found");
    }
    return medal;
  }

  async getMedalByLevel(level: number): Promise<IMedalDocument | null> {
    return await this.MedalRepository.findByLevel(level);
  }

  async updateMedal(
    id: string,
    data: Partial<IMedal>,
    icon?: Express.Multer.File,
  ): Promise<IMedalDocument> {
    const existing = await this.MedalRepository.findById(id);
    if (!existing) {
      throw new AppError(StatusCodes.NOT_FOUND, "Medal not found");
    }

    if (data.level && data.level !== existing.level) {
      const levelConflict = await this.MedalRepository.findByLevel(data.level);
      if (levelConflict && levelConflict._id?.toString() !== id) {
        throw new AppError(
          StatusCodes.CONFLICT,
          "A medal already exists for this level",
        );
      }
    }

    if (icon) {
      await deleteFileFromCloudinary(existing.icon);
      const iconUrl = await uploadFileToCloudinary({
        folder: CloudinaryFolder.MedalAssets,
        file: icon,
      });
      if (!iconUrl) {
        throw new AppError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          "Failed to upload medal icon",
        );
      }
      data.icon = iconUrl;
    }

    return await this.MedalRepository.update(id, data);
  }

  async deleteMedal(id: string): Promise<IMedalDocument> {
    const medal = await this.MedalRepository.findById(id);
    if (!medal) {
      throw new AppError(StatusCodes.NOT_FOUND, "Medal not found");
    }
    await deleteFileFromCloudinary(medal.icon);
    return await this.MedalRepository.delete(id);
  }
}
