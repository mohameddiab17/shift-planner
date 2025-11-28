import Attendance from "../models/attendanceModel.js";
import Shift from "../models/shiftModel.js";
import User from "../models/userModel.js";
import Team from "../models/teamModel.js";

// CLOCK IN (start shift) - Create attendance record
export const clockIn = async (req, res) => {
  try {
    const userId = req.user._id;
    const companyId = req.user.company;

    // Check if already clocked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingAttendance = await Attendance.findOne({
      employee: userId,
      company: companyId,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    if (existingAttendance) {
      return res.status(400).json({
        message: "You have already clocked in today",
      });
    }

    // Find today's shift for the user
    const shift = await Shift.findOne({
      employee: userId,
      company: companyId,
      status: "assigned",
      startDateTime: { 
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    // Calculate late minutes if shift exists
    let lateMinutes = 0;
    const now = new Date();
    
    if (shift && shift.startDateTime < now) {
      lateMinutes = Math.floor((now - shift.startDateTime) / (1000 * 60));
    }

    // Create attendance record
    const attendance = await Attendance.create({
      employee: userId,
      company: companyId,
      date: today,
      clockIn: now,
      lateMinutes: lateMinutes,
      status: lateMinutes > 0 ? "late" : "present"
    });

    // Update shift status if exists
    if (shift) {
      shift.status = "started";
      shift.startedAt = now;
      await shift.save();
    }

    return res.status(201).json({
      message: "Clocked in successfully",
      attendance,
      isLate: lateMinutes > 0,
      lateMinutes
    });
  } catch (err) {
    console.error("clockIn error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// CLOCK OUT (end shift)
export const clockOut = async (req, res) => {
  try {
    const userId = req.user._id;
    const companyId = req.user.company;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find today's attendance record
    const attendance = await Attendance.findOne({
      employee: userId,
      company: companyId,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      },
      clockOut: { $exists: false }
    });

    if (!attendance) {
      return res.status(400).json({
        message: "No active attendance record found or already clocked out",
      });
    }

    const now = new Date();
    attendance.clockOut = now;

    // Calculate overtime (if worked more than 8 hours)
    const workedMs = now - attendance.clockIn;
    const workedMinutes = Math.floor(workedMs / (1000 * 60));
    const standardWorkMinutes = 8 * 60; // 8 hours
    
    if (workedMinutes > standardWorkMinutes) {
      attendance.overtime = workedMinutes - standardWorkMinutes;
    }

    await attendance.save();

    // Update shift status if exists
    const shift = await Shift.findOne({
      employee: userId,
      company: companyId,
      status: "started",
      startDateTime: { 
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    if (shift) {
      shift.status = "completed";
      shift.endedAt = now;
      await shift.save();
    }

    return res.json({
      message: "Clocked out successfully",
      attendance,
      totalWorked: attendance.totalWorked,
      overtime: attendance.overtime
    });
  } catch (err) {
    console.error("clockOut error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// START BREAK
export const startBreak = async (req, res) => {
  try {
    const userId = req.user._id;
    const companyId = req.user.company;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      employee: userId,
      company: companyId,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      },
      clockOut: { $exists: false }
    });

    if (!attendance) {
      return res.status(400).json({
        message: "No active attendance record found",
      });
    }

    // Check if already in a break
    const lastBreak = attendance.breaks[attendance.breaks.length - 1];
    if (lastBreak && !lastBreak.end) {
      return res.status(400).json({
        message: "You are already in a break",
      });
    }

    attendance.breaks.push({
      start: new Date(),
      end: null,
    });

    await attendance.save();

    return res.json({
      message: "Break started",
      attendance
    });
  } catch (err) {
    console.error("startBreak error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// END BREAK
export const endBreak = async (req, res) => {
  try {
    const userId = req.user._id;
    const companyId = req.user.company;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      employee: userId,
      company: companyId,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    if (!attendance) {
      return res.status(400).json({
        message: "No attendance record found",
      });
    }

    const lastBreak = attendance.breaks[attendance.breaks.length - 1];

    if (!lastBreak || lastBreak.end) {
      return res.status(400).json({
        message: "No active break to end",
      });
    }

    lastBreak.end = new Date();
    await attendance.save();

    return res.json({
      message: "Break ended",
      attendance,
      breakDuration: lastBreak.duration
    });
  } catch (err) {
    console.error("endBreak error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// GET MY ATTENDANCE (with date range filter)
export const getMyAttendance = async (req, res) => {
  try {
    const userId = req.user._id;
    const companyId = req.user.company;
    const { startDate, endDate } = req.query;

    let query = {
      employee: userId,
      company: companyId
    };

    // Add date range filter if provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      query.date = {
        $gte: start,
        $lte: end
      };
    }

    const attendance = await Attendance.find(query)
      .sort({ date: -1 })
      .populate("employee", "name email");

    return res.json({
      records: attendance,
      total: attendance.length,
      totalWorked: attendance.reduce((sum, record) => sum + record.totalWorked, 0),
      totalOvertime: attendance.reduce((sum, record) => sum + record.overtime, 0)
    });
  } catch (err) {
    console.error("getMyAttendance error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// GET TEAM ATTENDANCE (Admin only)
export const getTeamAttendance = async (req, res) => {
  try {
    const companyId = req.user.company;
    const { teamId, date } = req.params;

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    if (team.company.toString() !== companyId.toString()) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const attendance = await Attendance.find({
      company: companyId,
      employee: { $in: team.members },
      date: {
        $gte: targetDate,
        $lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000)
      }
    })
      .populate("employee", "name email role")
      .sort({ clockIn: -1 });

    return res.json({
      team: team.name,
      date: targetDate,
      records: attendance,
      present: attendance.filter(a => a.status === "present" || a.status === "late").length,
      absent: attendance.filter(a => a.status === "absent").length,
      late: attendance.filter(a => a.status === "late").length
    });
  } catch (err) {
    console.error("getTeamAttendance error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// GET ATTENDANCE SUMMARY (for dashboard)
export const getAttendanceSummary = async (req, res) => {
  try {
    const userId = req.user._id;
    const companyId = req.user.company;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisWeek = new Date(today);
    thisWeek.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)

    // Today's attendance
    const todayAttendance = await Attendance.findOne({
      employee: userId,
      company: companyId,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    // This week's attendance
    const weekAttendance = await Attendance.find({
      employee: userId,
      company: companyId,
      date: {
        $gte: thisWeek,
        $lte: today
      }
    });

    const summary = {
      today: {
        clockedIn: !!todayAttendance?.clockIn,
        clockInTime: todayAttendance?.clockIn,
        status: todayAttendance?.status || "absent",
        workedMinutes: todayAttendance?.totalWorked || 0
      },
      thisWeek: {
        totalDays: weekAttendance.length,
        presentDays: weekAttendance.filter(a => a.status === "present" || a.status === "late").length,
        totalWorked: weekAttendance.reduce((sum, a) => sum + a.totalWorked, 0),
        totalOvertime: weekAttendance.reduce((sum, a) => sum + a.overtime, 0)
      }
    };

    return res.json(summary);
  } catch (err) {
    console.error("getAttendanceSummary error:", err);
    return res.status(500).json({ message: err.message });
  }
};