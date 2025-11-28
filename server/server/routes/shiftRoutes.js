import express from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import {
  createShift,
  getTeamShifts,
  getMyShifts,
  updateShift,
  deleteShift,
} from "../controllers/shiftController.js";

const router = express.Router();

// Admin creates shift
router.post("/", protect, adminOnly, createShift);

// Admin views all shifts for a team
router.get("/team/:teamId", protect, adminOnly, getTeamShifts);

// Employee (or any logged user) views their own shifts
router.get("/me", protect, getMyShifts);

// Admin updates shift
router.put("/:id", protect, adminOnly, updateShift);

// Admin deletes shift
router.delete("/:id", protect, adminOnly, deleteShift);

export default router;
