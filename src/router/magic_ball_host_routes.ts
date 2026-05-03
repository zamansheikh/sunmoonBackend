import express from "express";
import { authenticate } from "../core/middlewares/auth_middleware";
import { MagicBallHostController } from "../controllers/magic_ball_host_controller";
import { MagicBallHostService } from "../services/magic_ball/magic_ball_host_service";

const router = express.Router();

const service = new MagicBallHostService();
const controller = new MagicBallHostController(service);

router.get("/", authenticate(), controller.getAllMagicBall);

export default router;
