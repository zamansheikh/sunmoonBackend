import express from "express";
import { XpConfigController } from "../controllers/admin/xp_config_controller";
import { authenticate } from "../core/middlewares/auth_middleware";
import { UserRoles } from "../core/Utils/enums";

const router = express.Router();

const xpConfigController = new XpConfigController();

/**
 * Admin XP Configuration Routes
 * Mounted at: /api/admin/xp-config
 */

router
  .route("/")
  .get(authenticate([UserRoles.Admin]), xpConfigController.getConfig)
  .post(authenticate([UserRoles.Admin]), xpConfigController.updateConfig);

export default router;
