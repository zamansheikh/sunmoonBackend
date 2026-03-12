import {
  IMagicBall,
  IMagicBallDocument,
} from "../../models/magic_ball/magic_ball_model";
import { IMagicBallRepository } from "../../repository/magic_ball/magic_ball_repository";

export interface IMagicBallService {
  createMagicBall(data: IMagicBall): Promise<IMagicBall>;
  getAllMagicBall(): Promise<IMagicBallDocument[]>;
  updateMagicBall(id: string, data: Partial<IMagicBall>): Promise<IMagicBallDocument>;
  deleteMagicBall(id: string): Promise<IMagicBallDocument>;
  deleteMagicBallByCategory(category: string): Promise<IMagicBallDocument>;
}

export class MagicBallService {
  Repository: IMagicBallRepository;

  constructor(repository: IMagicBallRepository) {
    this.Repository = repository;
  }

  async createMagicBall(data: IMagicBall) {
    return await this.Repository.create(data);
  }
  async getAllMagicBall() {
    return await this.Repository.getAll();
  }
  async updateMagicBall(id: string, data: Partial<IMagicBall>) {
    return await this.Repository.update(id, data);
  }
  async deleteMagicBall(id: string) {
    return await this.Repository.delete(id);
  }
  async deleteMagicBallByCategory(category: string) {
    return await this.Repository.deleteByCategory(category);
  }
}
