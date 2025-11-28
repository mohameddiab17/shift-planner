import express from "express";
import { protect, adminOrAbove, employeeOrAbove } from "../middleware/authMiddleware.js";
import {
  createTimeOff,
  getMyTimeOff,
  getTeamTimeOff,
  getPendingRequests,
  updateRequestStatus,
  getTimeOffStatistics,
  deleteTimeOff,
  getTimeOffBalance
} from "../controllers/timeOffController.js";

const router = express.Router();

// Employee routes
router.post("/", protect, employeeOrAbove, createTimeOff);
router.get("/my-requests", protect, employeeOrAbove, getMyTimeOff);
router.get("/my-balance", protect, employeeOrAbove, getTimeOffBalance);
router.delete("/:id", protect, employeeOrAbove, deleteTimeOff);

// Admin routes
router.get("/team", protect, adminOrAbove, getTeamTimeOff);
router.get("/pending", protect, adminOrAbove, getPendingRequests);
router.get("/statistics", protect, adminOrAbove, getTimeOffStatistics);
router.patch("/:id/status", protect, adminOrAbove, updateRequestStatus);

export default router;