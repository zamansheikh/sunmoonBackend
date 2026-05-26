import express from "express";
import ReferralController from "../controllers/referral/referral_controller";
import { authenticate } from "../core/middlewares/auth_middleware";
import { UserRoles } from "../core/Utils/enums";
import { ReferralConfigRepository } from "../repository/referral/referral_config_repository";
import { ReferralConfigModel } from "../models/referral/referralConfigModel";
import { ReferralService } from "../services/referral/referral_service";
import { ReferralRepository } from "../repository/referral/referral_repository";
import { ReferralModel } from "../models/referral/referralModel";
import { ReferralWalletRepository } from "../repository/referral/referral_wallet_repository";
import { ReferralWalletModel } from "../models/referral/referralWalletModel";
import { ReferralWithdrawalRepository } from "../repository/referral/referral_withdrawal_repository";
import { ReferralWithdrawalModel } from "../models/referral/referralWithdrawalModel";
import UserRepository from "../repository/users/user_repository";
import User from "../models/user/user_model";
import UserStatsRepository from "../repository/users/userstats_repository";
import UserStats from "../models/userstats/userstats_model";

const router = express.Router();

const referralRepository = new ReferralRepository(ReferralModel);
const walletRepository = new ReferralWalletRepository(ReferralWalletModel);
const withdrawalRepository = new ReferralWithdrawalRepository(
  ReferralWithdrawalModel,
);
const configRepository = new ReferralConfigRepository(ReferralConfigModel);
const userRepository = new UserRepository(User);
const userStatsRepository = new UserStatsRepository(UserStats);

const referralService = new ReferralService(
  referralRepository,
  walletRepository,
  withdrawalRepository,
  configRepository,
  userRepository,
  userStatsRepository,
);
const referralController = new ReferralController(referralService);

// User Routes
router.get("/dashboard", authenticate(), referralController.getReferralDashboard);
router.post("/withdraw", authenticate(), referralController.requestWithdrawal);

// Admin Routes
router
  .route("/config")
  .post(
    authenticate([UserRoles.Admin, UserRoles.SubAdmin]),
    referralController.createOrUpdateConfig,
  )
  .get(authenticate([UserRoles.Admin, UserRoles.SubAdmin]), referralController.getConfig);

router
  .route("/config/:id")
  .put(authenticate([UserRoles.Admin, UserRoles.SubAdmin]), referralController.updateConfig)
  .delete(authenticate([UserRoles.Admin, UserRoles.SubAdmin]), referralController.deleteConfig);

export default router;
