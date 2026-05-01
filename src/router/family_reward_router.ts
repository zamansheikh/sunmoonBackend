import express from "express";
import { authenticate } from "../core/middlewares/auth_middleware";
import { UserRoles } from "../core/Utils/enums";
import FamilyRewardController from "../controllers/family/family_reward_controller";
import { FamilyRewardService } from "../services/family/family_reward_services";

const router = express.Router();

const service = new FamilyRewardService();
const controller = new FamilyRewardController(service);

// Admin routes (require admin role)
router
  .route("/admin")
  .post(authenticate([UserRoles.Admin]), controller.createReward)
  .get(authenticate([UserRoles.Admin]), controller.getAllRewards);

router
  .route("/admin/:id")
  .put(authenticate([UserRoles.Admin]), controller.updateReward)
  .delete(authenticate([UserRoles.Admin]), controller.deleteReward);

// Public route for app UI
router
  .route("/list")
  .get(authenticate(), controller.getRewardList);

export default router;
