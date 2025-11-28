import express from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import {
  createTeam,
  addMember,
  getMyTeams,
  getMyTeam,
} from "../controllers/teamController.js";

const router = express.Router();

router.post("/", protect, adminOnly, createTeam);
router.post("/add-member", protect, adminOnly, addMember);
router.get("/my-teams", protect, adminOnly, getMyTeams);
router.get("/my-team", protect, getMyTeam); 

export default router;
