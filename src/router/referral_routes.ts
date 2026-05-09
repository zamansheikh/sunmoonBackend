import express from "express";
import ReferralController from "../controllers/referral_controller";

const router = express.Router();
const referralController = new ReferralController();

router.get("/:inviteCode", referralController.handleReferralRedirect);

export default router;