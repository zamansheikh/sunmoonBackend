import express from "express";
import { AudioRoomController } from "../controllers/audio_room/audio_room_controller";
import { AudioRoomService } from "../services/audio_room/audio_room_service";
import { AudioRoomRepository } from "../repository/audio_room/audio_room_repository";
import AudioRoomModel from "../models/audio_room/audio_room_model";
import { authenticate } from "../core/middlewares/auth_middleware";
import UserRepository from "../repository/users/user_repository";
import User from "../models/user/user_model";
import MyBucketRepository from "../repository/store/my_bucket_repository";
import MyBucketModel from "../models/store/my_bucket_model";
import StoreCategoryRepository from "../repository/store/store_category_repository";
import StoreCategoryModel from "../models/store/store_category_model";

const router = express.Router();

const userRepository = new UserRepository(User);
const bucketRepository = new MyBucketRepository(MyBucketModel);
const categoryRepository = new StoreCategoryRepository(StoreCategoryModel);

const audioRoomRepository = new AudioRoomRepository(
  AudioRoomModel,
  bucketRepository,
  categoryRepository,
);
const audioRoomService = new AudioRoomService(
  audioRoomRepository,
  userRepository,
  bucketRepository,
  categoryRepository,
);
const audioRoomController = new AudioRoomController(audioRoomService);

router
  .route("/")
  .post(authenticate(), audioRoomController.createAudioRoom)
  .get(audioRoomController.getAllAudioRooms);

router.route("/:roomId").get(audioRoomController.getAudioRoomById);

router
  .route("/:roomId/join")
  .put(authenticate(), audioRoomController.joinAudioRoom);

router
  .route("/:roomId/join-seat/:seatKey")
  .put(authenticate(), audioRoomController.joinAudioSeat);

router
  .route("/:roomId/leave-seat/:seatKey")
  .put(authenticate(), audioRoomController.leaveAudioSeat);

export default router;
