import { Router } from "express";
import { authenticate } from "../../shared/middleware/auth.middleware";
import { asyncHandler } from "../../shared/middleware/async-handler";
import { getSettings, upsertSettings } from "./settings.controller";

const router = Router();

router.use(authenticate);

router.get("/", asyncHandler(getSettings));
router.put("/", asyncHandler(upsertSettings));

export { router as settingsRouter };
