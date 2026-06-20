import express, { RequestHandler } from "express";
import { StatusCodes } from "http-status-codes";
import DisconnectWebhookController from "../controllers/disconnect_webhook_controller";
import DisconnectWebhookService from "../services/disconnect_webhook_service";
import UserRepository from "../../repository/users/user_repository";
import UserStatsRepository from "../../repository/users/userstats_repository";
import User from "../../models/user/user_model";
import UserStats from "../../models/userstats/userstats_model";

const router = express.Router();

const userRepo = new UserRepository(User);
const statsRepo = new UserStatsRepository(UserStats);
const service = new DisconnectWebhookService(userRepo, statsRepo);
const controller = new DisconnectWebhookController(service);

const validateWebhookSecret: RequestHandler = (req, res, next) => {
  const secret = req.headers["x-webhook-secret"];
  if (!secret || secret !== process.env.WEBHOOK_SECRET) {
    res.status(StatusCodes.UNAUTHORIZED).json({ error: "Unauthorized" });
    return;
  }
  next();
};

router.route("/disconnect").post(validateWebhookSecret, controller.handleDisconnect);

export default router;
