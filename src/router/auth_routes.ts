import  express from "express";
import User from '../models/user_model';
import UserRepository from "../repository/user_repository";
import AuthService from "../services/auth_services";
import  AuthController  from "../controllers/auth_controller";



const router = express.Router();

const userRepository = new UserRepository(User);
const authService = new AuthService(userRepository);
const authController = new AuthController(authService);

// router.post("/register", )

export default router;


