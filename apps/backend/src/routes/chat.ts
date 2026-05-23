import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  chat,
  getChat,
  listChats,
  deleteChat,
} from "../controllers/chatController";

const router = Router();

router.use(authenticate);

router.post("/", chat);
router.get("/", listChats);
router.get("/:id", getChat);
router.delete("/:id", deleteChat);

export default router;
