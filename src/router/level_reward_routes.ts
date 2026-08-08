import express from "express";
import { authenticate } from "../core/middlewares/auth_middleware";
import LevelRewardConfigModel from "../models/levelReward/level_reward_config_model";
import LevelRewardClaimModel from "../models/levelReward/level_reward_claim_model";
import LevelRewardConfigRepository from "../repository/levelReward/level_reward_config_repository";
import LevelRewardClaimRepository from "../repository/levelReward/level_reward_claim_repository";
import LevelRewardService from "../services/levelReward/level_reward_service";
import LevelRewardController from "../controllers/levelReward/level_reward_controller";

const router = express.Router();

const configRepository = new LevelRewardConfigRepository(LevelRewardConfigModel);
const claimRepository = new LevelRewardClaimRepository(LevelRewardClaimModel);
const levelRewardService = new LevelRewardService(configRepository, claimRepository);
const levelRewardController = new LevelRewardController(levelRewardService);

router.post(
  "/:level/claim",
  authenticate(),
  levelRewardController.claimReward,
);

export default router;
