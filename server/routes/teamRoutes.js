import express from "express";
import { protect, adminOnly, adminOrAbove } from "../middleware/authMiddleware.js";
import {
  createTeam,
  addMember,
  getMyTeams,
  getMyTeam,
  setTeamLeader,
} from "../controllers/teamController.js";

const router = express.Router();

router.post("/", protect, adminOrAbove, createTeam);
router.put("/set-leader", protect, adminOrAbove, setTeamLeader);
router.post("/add-member", protect, adminOrAbove, addMember);
router.get("/my-teams", protect, adminOrAbove, getMyTeams);
router.get("/my-team", protect, getMyTeam);

export default router;
