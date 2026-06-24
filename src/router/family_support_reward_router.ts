import express from "express";
import { authenticate } from "../core/middlewares/auth_middleware";
import { UserRoles } from "../core/Utils/enums";
import FamilySupportRewardController from "../controllers/family/family_support_reward_controller";
import { FamilySupportRewardService } from "../services/family/family_support_reward_service";

const router = express.Router();

const service = new FamilySupportRewardService();
const controller = new FamilySupportRewardController(service);

router
  .route("/")
  .get(
    authenticate([UserRoles.Admin, UserRoles.SubAdmin]),
    controller.getAllRewards,
  );

router
  .route("/:level")
  .get(
    authenticate([UserRoles.Admin, UserRoles.SubAdmin]),
    controller.getRewardByLevel,
  )
  .put(
    authenticate([UserRoles.Admin, UserRoles.SubAdmin]),
    controller.updateRewardByLevel,
  );

export default router;
