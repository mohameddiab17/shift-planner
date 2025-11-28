import express from "express";
import { protect, adminOnly, adminOrAbove } from "../middleware/authMiddleware.js";
import {
  createTeam,
  addMember,
  removeMember,
  getMyTeams,
  getMyTeam,
  getTeamById,
  updateTeam,
  deleteTeam,
  bulkAddMembers
} from "../controllers/teamController.js";

const router = express.Router();

// Team management routes (Admin only)
router.post("/", protect, adminOnly, createTeam);
router.post("/add-member", protect, adminOnly, addMember);
router.post("/remove-member", protect, adminOnly, removeMember);
router.post("/bulk-add-members", protect, adminOnly, bulkAddMembers);
router.get("/my-teams", protect, adminOnly, getMyTeams);
router.get("/:id", protect, adminOnly, getTeamById);
router.put("/:id", protect, adminOnly, updateTeam);
router.delete("/:id", protect, adminOnly, deleteTeam);

// Employee routes
router.get("/my-team", protect, getMyTeam);

export default router;