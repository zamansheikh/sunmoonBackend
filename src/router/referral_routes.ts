import express from "express";
import ReferralController from "../controllers/referral/referral_controller";
import { authenticate } from "../core/middlewares/auth_middleware";
import { UserRoles } from "../core/Utils/enums";
import { ReferralConfigRepository } from "../repository/referral/referral_config_repository";
import { ReferralConfigModel } from "../models/referral/referralConfigModel";
import { ReferralService } from "../services/referral/referral_service";

const router = express.Router();
const configRepository = new ReferralConfigRepository(ReferralConfigModel);
const referralService = new ReferralService(configRepository);
const referralController = new ReferralController(referralService);

// Admin Routes
router
  .route("/config")
  .post(authenticate([UserRoles.Admin]), referralController.createOrUpdateConfig)
  .get(authenticate([UserRoles.Admin]), referralController.getConfig);

router
  .route("/config/:id")
  .put(authenticate([UserRoles.Admin]), referralController.updateConfig)
  .delete(authenticate([UserRoles.Admin]), referralController.deleteConfig);

export default router;