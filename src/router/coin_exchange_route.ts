import express from "express";
import { CoinExchangeService } from "../services/coin_exchange/coin_exchange_service";
import { CoinExchangeController } from "../controllers/coin_exchange/coin_exchange_controller";

const router = express.Router();

const service = new CoinExchangeService();
const controller = new CoinExchangeController(service);

export default router;
