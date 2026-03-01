import express from "express";
import GiftRecordModel from "../models/gifts/gift_record_model";
import { GiftRecordRepository } from "../repository/gifts/gift_record_repository";
import { RankingService } from "../services/ranking/ranking_service";
import { RankingController } from "../controllers/ranking_controllers";
import { authenticate } from "../core/middlewares/auth_middleware";

const router = express.Router();

const repository = new GiftRecordRepository(GiftRecordModel);
const service = new RankingService(repository);
const controller = new RankingController(service);

router.route("/sender").get(authenticate(), controller.getSenderRanking);
router.route("/receiver").get(authenticate(), controller.getReceiverRanking);
router.route("/room").get(authenticate(), controller.getRoomRanking);

export default router;
