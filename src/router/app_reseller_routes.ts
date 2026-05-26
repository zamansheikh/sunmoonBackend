import express from "express";
import AppResellerController from "../controllers/app_reseller_controller";
import AppResellerService from "../services/app_reseller/app_reseller_service";
import UserRepository from "../repository/users/user_repository";
import User from "../models/user/user_model";
import UserStatsRepository from "../repository/users/userstats_repository";
import UserStats from "../models/userstats/userstats_model";
import CoinHistoryRepository from "../repository/coins/coinHistoryRepository";
import CoinHistoryModel from "../models/coins/coinHistoryModel";
import { authenticate } from "../core/middlewares/auth_middleware";
import { UserRoles } from "../core/Utils/enums";

const router = express.Router();

const userRepository = new UserRepository(User);
const userStatsRepository = new UserStatsRepository(UserStats);
const coinHistoryRepository = new CoinHistoryRepository(CoinHistoryModel);

const appResellerService = new AppResellerService(
  userRepository,
  userStatsRepository,
  coinHistoryRepository,
);
const appResellerController = new AppResellerController(appResellerService);

// Route to get all resellers (paginated)
router
  .route("/")
  .get(
    authenticate([UserRoles.Admin, UserRoles.SubAdmin]),
    appResellerController.getAllResellers,
  );

// Route to update a user's role (only between "user" and "re-seller")
router
  .route("/change-role")
  .put(
    authenticate([UserRoles.Admin, UserRoles.SubAdmin]),
    appResellerController.updateUserRole,
  );

// Route for resellers to give coins to app users
router
  .route("/give-coins")
  .put(
    authenticate([UserRoles.Reseller]),
    appResellerController.giveCoinsToUser,
  );

export default router;
