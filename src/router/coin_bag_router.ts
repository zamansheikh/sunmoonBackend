import express from "express";
import { CoinBagController } from "../controllers/audio_room/coin_bag_controller";
import { CoinBagDistributionController } from "../controllers/audio_room/coin_bag_distribution_controller";
import { authenticate } from "../core/middlewares/auth_middleware";

const router = express.Router();

const coinBagController = new CoinBagController();
const coinBagDistributionController = new CoinBagDistributionController();

router
  .route("/options")
  .get(coinBagController.getCoinBagOptions)
  .post(authenticate(), coinBagController.createCoinBagOptions)
  .put(authenticate(), coinBagController.updateCoinBagOptions);

router.post("/send", authenticate(), coinBagController.sendCoinBagToRoom);
router.get("/status/:roomId", coinBagController.getCoinBagStatus);
router.post("/claim", authenticate(), coinBagController.claimCoinBag);

// Distribution routes
router
  .route("/distribution")
  .get(coinBagDistributionController.getAll)
  .post(authenticate(), coinBagDistributionController.create)
  .put(authenticate(), coinBagDistributionController.update);

router
  .route("/distribution/type/:type")
  .get(coinBagDistributionController.getByType);

router.route("/distribution/:id").get(coinBagDistributionController.getById);

export default router;
