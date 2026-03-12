import express from "express";
import { MagicBallAdminController } from "../../controllers/magic_ball/magic_ball_admin_controller";
import { MagicBallService } from "../../services/magic_ball/magic_ball_admin_service";
import { RepositoryProviders } from "../../core/providers/repository_providers";
import { authenticate } from "../../core/middlewares/auth_middleware";
import { UserRoles } from "../../core/Utils/enums";

const router = express.Router();

const service = new MagicBallService(RepositoryProviders.magicBallRepositoryProvider);
const controller = new MagicBallAdminController(service);

router
  .route("/")
  .get(authenticate([UserRoles.Admin]), controller.getAllMagicBall)
  .post(authenticate([UserRoles.Admin]), controller.createMagicBall);

router
  .route("/:id")
  .put(authenticate([UserRoles.Admin]), controller.updateMagicBall)
  .delete(authenticate([UserRoles.Admin]), controller.deleteMagicBall);

router
  .route("/category/:category")
  .delete(authenticate([UserRoles.Admin]), controller.deleteMagicBallByCategory);

export default router;
