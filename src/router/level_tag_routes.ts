import express from "express";
import { authenticate } from "../core/middlewares/auth_middleware";
import { UserRoles } from "../core/Utils/enums";
import { upload } from "../core/middlewares/multer";
import LevelTagModel from "../models/levelTag/level_tag_model";
import LevelTagRepository from "../repository/levelTag/level_tag_repository";
import LevelTagService from "../services/levelTag/level_tag_service";
import LevelTagController from "../controllers/levelTag/level_tag_controller";

const router = express.Router();

const levelTagRepository = new LevelTagRepository(LevelTagModel);
const levelTagService = new LevelTagService(levelTagRepository);
const levelTagController = new LevelTagController(levelTagService);

router
  .route("/")
  .post(
    authenticate([UserRoles.Admin, UserRoles.SubAdmin]),
    upload.fields([{ name: "tagFile", maxCount: 1 }]),
    levelTagController.createLevelTag,
  )
  .get(authenticate(), levelTagController.getAllLevelTags);

router
  .route("/:id")
  .get(authenticate(), levelTagController.getLevelTagById)
  .put(
    authenticate([UserRoles.Admin, UserRoles.SubAdmin]),
    upload.fields([{ name: "tagFile", maxCount: 1 }]),
    levelTagController.updateLevelTag,
  );

export default router;
