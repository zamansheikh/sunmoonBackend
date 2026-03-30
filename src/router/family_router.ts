import express from "express";
import FamilyController from "../controllers/family_controller";
import { FamilyService } from "../services/family/family_service";
import { authenticate } from "../core/middlewares/auth_middleware";

const router = express.Router();

const service = new FamilyService();
const controller = new FamilyController(service);

router.route("/").post(authenticate(), controller.createFamily);
router.route("/").put(authenticate(), controller.updateFamily);
router.route("/join/:familyId").post(authenticate(), controller.joinFamily);
router.route("/join-requests").get(authenticate(), controller.getJoinRequests);
router
  .route("/join-requests/approve/:requestId")
  .post(authenticate(), controller.approveJoinRequest);
router
  .route("/join-requests/reject/:requestId")
  .post(authenticate(), controller.rejectJoinRequest);

router.route("/join-status").get(authenticate(), controller.getJoinStatus);

router
  .route("/member/role/:userId")
  .patch(authenticate(), controller.changeMemberRole);

export default router;
