import express from "express";
import AppResellerController from "../controllers/app_reseller_controller";
import AppResellerService from "../services/app_reseller/app_reseller_service";
import UserRepository from "../repository/users/user_repository";
import User from "../models/user/user_model";
import { authenticate } from "../core/middlewares/auth_middleware";
import { UserRoles } from "../core/Utils/enums";

const router = express.Router();

const userRepository = new UserRepository(User);
const appResellerService = new AppResellerService(userRepository);
const appResellerController = new AppResellerController(appResellerService);

// Route to update a user's role (only between "user" and "re-seller")
router
  .route("/change-role")
  .put(
    authenticate([UserRoles.Admin, UserRoles.SubAdmin]),
    appResellerController.updateUserRole,
  );

export default router;
