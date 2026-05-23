import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { getSettings, upsertSettings } from "../controllers/settingsController";

const router = Router();

router.use(authenticate);

router.get("/", getSettings);
router.put("/", upsertSettings);

export default router;
