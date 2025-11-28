import express from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import {
  createShift,
  getTeamShifts,
  getMyShifts,
  updateShift,
  deleteShift,
  createBulkShifts
} from "../controllers/shiftController.js";

const router = express.Router();

// Admin creates single shift
router.post("/", protect, adminOnly, createShift);

// Admin creates multiple shifts (BULK)
router.post("/bulk", protect, adminOnly, createBulkShifts);

// Admin views all shifts for a team
router.get("/team/:teamId", protect, adminOnly, getTeamShifts);

// Employee (or any logged user) views their own shifts
router.get("/me", protect, getMyShifts);

// Admin updates shift
router.put("/:id", protect, adminOnly, updateShift);

// Admin deletes shift
router.delete("/:id", protect, adminOnly, deleteShift);

export default router;