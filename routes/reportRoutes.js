import express from "express";
import { protect, adminOrAbove } from "../middleware/authMiddleware.js";
import {
  generateAttendanceReport,
  generateTimeOffReport,
  generateProductivityReport,
  getReports,
  getReportById,
  shareReport,
  deleteReport,
  getDashboardStats
} from "../controllers/reportController.js";

const router = express.Router();

// Report generation routes (Admin only)
router.post("/attendance", protect, adminOrAbove, generateAttendanceReport);
router.post("/timeoff", protect, adminOrAbove, generateTimeOffReport);
router.post("/productivity", protect, adminOrAbove, generateProductivityReport);

// Report management routes
router.get("/", protect, getReports);
router.get("/dashboard-stats", protect, getDashboardStats);
router.get("/:id", protect, getReportById);
router.post("/:id/share", protect, adminOrAbove, shareReport);
router.delete("/:id", protect, deleteReport);

export default router;