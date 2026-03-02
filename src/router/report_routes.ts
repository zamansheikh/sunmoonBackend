import express from "express";
import { authenticate } from "../core/middlewares/auth_middleware";
import { createReport } from "../controllers/report_controller";

const router = express.Router();

// POST /api/reports — submit a content / user report
router.post("/", authenticate(), createReport);

export default router;
