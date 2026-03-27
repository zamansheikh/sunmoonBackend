import express from "express";
import FamilyController from "../controllers/family_controller";
import { FamilyService } from "../services/family/family_service";
import { authenticate } from "../core/middlewares/auth_middleware";

const router = express.Router();

const service = new FamilyService();
const controller = new FamilyController(service);

router.route("/").post(authenticate(), controller.createFamily);

export default router;
