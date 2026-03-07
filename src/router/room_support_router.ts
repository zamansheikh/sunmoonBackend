import { Router } from "express";
import { RoomSupportController } from "../controllers/room_support_controller";
import { RoomSupportService } from "../services/audio_room/room_support_service";
import { RoomSupportRepository } from "../repository/audio_room/room_support_repository";
import RoomSupportModel from "../models/audio_room/room_support_model";
import { authenticate } from "../core/middlewares/auth_middleware";

const router = Router();

const roomSupportRepository = new RoomSupportRepository(RoomSupportModel);
const roomSupportService = new RoomSupportService(roomSupportRepository);
const roomSupportController = new RoomSupportController(roomSupportService);

router
  .route("/:roomId")
  .get(authenticate(), roomSupportController.getMyRoomSupportDetails);

router
  .route("/:roomId/partners/:partnerId")
  .post(authenticate(), roomSupportController.addRoomPartners)
  .delete(authenticate(), roomSupportController.removeRoomPartners);

export default router;
