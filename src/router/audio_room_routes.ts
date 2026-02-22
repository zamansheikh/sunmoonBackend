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
import { RecentVisitedRoomRepository } from "../repository/audio_room/recent_visited_room_reposiory";
import RecentVisitedRoomModel from "../models/audio_room/recent_visited_room_model";
import { CurrentRoomMemberRepository } from "../repository/audio_room/current_room_member_repository";
import CurrentRoomMemberModel from "../models/audio_room/current_room_member";

const router = express.Router();

const userRepository = new UserRepository(User);
const bucketRepository = new MyBucketRepository(MyBucketModel);
const categoryRepository = new StoreCategoryRepository(StoreCategoryModel);

const audioRoomRepository = new AudioRoomRepository(AudioRoomModel);
const recentVisitedRoomRepository = new RecentVisitedRoomRepository(
  RecentVisitedRoomModel,
);

const audioRoomService = new AudioRoomService(
  audioRoomRepository,
  userRepository,
  bucketRepository,
  categoryRepository,
  recentVisitedRoomRepository,
);

const audioRoomController = new AudioRoomController(audioRoomService);

router
  .route("/")
  .post(authenticate(), audioRoomController.createAudioRoom)
  .get(audioRoomController.getAllAudioRooms);

router
  .route("/remove-from-seat")
  .put(authenticate(), audioRoomController.removeFromSeat);

router
  .route("/my-room")
  .get(authenticate(), audioRoomController.getMyAudioRoom);

router
  .route("/recent-visits")
  .get(authenticate(), audioRoomController.getMyRecentVisitedRooms);

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

router
  .route("/:roomId/admins/:targetId")
  .put(authenticate(), audioRoomController.createAdmin)
  .delete(authenticate(), audioRoomController.removeAdmin);

router
  .route("/:roomId/mute-unmute-user/:targetId")
  .put(authenticate(), audioRoomController.muteUnmuteUser);

router
  .route("/:roomId/leave")
  .put(authenticate(), audioRoomController.leaveAudioRoom);

router
  .route("/:roomId/messages")
  .delete(authenticate(), audioRoomController.clearChatHistory)
  .post(authenticate(), audioRoomController.sendRoomMessage);

router.route("/search/:shortId").get(audioRoomController.searchAudioRoom);

router
  .route("/:roomId/update-title")
  .put(authenticate(), audioRoomController.updateRoomTitle);
router
  .route("/:roomId/update-announcement")
  .put(authenticate(), audioRoomController.updateRoomAnnouncement);

router
  .route("/:roomId/lock-unlock-seat/:seatKey")
  .put(authenticate(), audioRoomController.lockUnlockSeat);

router
  .route("/:roomId/lock-all-seats")
  .put(authenticate(), audioRoomController.lockAllSeats);

router
  .route("/:roomId/unlock-all-seats")
  .put(authenticate(), audioRoomController.unlockAllSeats);

router
  .route("/:roomId/update-room-photo")
  .put(authenticate(), audioRoomController.updateRoomPhoto);

router
  .route("/:roomId/ban-user/:targetId")
  .put(authenticate(), audioRoomController.banUser);

router
  .route("/:roomId/unban-user/:targetId")
  .put(authenticate(), audioRoomController.unbanUser);

router
  .route("/:roomId/update-password")
  .put(authenticate(), audioRoomController.updateRoomPassword);

router
  .route("/:roomId/update-seat-count")
  .put(authenticate(), audioRoomController.updateSeatCount);

router
  .route("/:roomId/chat-privacy")
  .put(authenticate(), audioRoomController.setChatPrivacy);

export default router;
