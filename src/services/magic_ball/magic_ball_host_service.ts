import { IMagicBallRepository } from "../../repository/magic_ball/magic_ball_repository";

export class MagicBallHostService {
  Repository: IMagicBallRepository;
  constructor(repository: IMagicBallRepository) {
    this.Repository = repository;
  }

  async getAllMagicBall() {
    const result = await this.Repository.getAll();
    const response = [];
    return result;
  }
}

interface MagicBallResponse {
  logo: string;
  message: string;
  rewardCoin: number;
  milestone: number;
  myMilestone: number;
  isCompleted: boolean;
}
