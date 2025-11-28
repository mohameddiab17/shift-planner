import express from "express";
import { protect, employeeOrAbove } from "../middleware/authMiddleware.js";
import {
  clockIn,
  clockOut,
  startBreak,
  endBreak,
  getMyAttendance,
  getTeamAttendance,
  getAttendanceSummary
} from "../controllers/attendanceController.js";

const router = express.Router();

// Employee routes
router.post("/clock-in", protect, employeeOrAbove, clockIn);
router.post("/clock-out", protect, employeeOrAbove, clockOut);
router.post("/break/start", protect, employeeOrAbove, startBreak);
router.post("/break/end", protect, employeeOrAbove, endBreak);
router.get("/my-attendance", protect, employeeOrAbove, getMyAttendance);
router.get("/my-summary", protect, employeeOrAbove, getAttendanceSummary);

router.get("/team/:teamId", protect, getTeamAttendance);

export default router;