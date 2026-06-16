import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticate } from "../../shared/middleware/auth.middleware";
import { asyncHandler } from "../../shared/middleware/async-handler";
import { chat, getChat, listChats, deleteChat } from "./chat.controller";

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: "Too many chat requests, please slow down" },
});

const router = Router();

router.use(authenticate);

router.post("/", chatLimiter, asyncHandler(chat));
router.get("/", asyncHandler(listChats));
router.get("/:id", asyncHandler(getChat));
router.delete("/:id", asyncHandler(deleteChat));

export { router as chatRouter };
