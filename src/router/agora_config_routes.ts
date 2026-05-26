import express from "express";
import { AgoraConfigService } from "../services/agora/agora_config_service";
import { AgoraConfigController } from "../controllers/agora/agora_config_controller";
import { authenticate } from "../core/middlewares/auth_middleware";
import { UserRoles } from "../core/Utils/enums";

const router = express.Router();

const service = new AgoraConfigService();
const controller = new AgoraConfigController(service);

router
  .route("/")
  .post(authenticate([UserRoles.Admin, UserRoles.SubAdmin]), controller.create)
  .get(authenticate([UserRoles.Admin, UserRoles.SubAdmin]), controller.getAll);

router
  .route("/:id")
  .get(authenticate([UserRoles.Admin, UserRoles.SubAdmin]), controller.getById)
  .put(authenticate([UserRoles.Admin, UserRoles.SubAdmin]), controller.update)
  .delete(authenticate([UserRoles.Admin, UserRoles.SubAdmin]), controller.delete);

export default router;
