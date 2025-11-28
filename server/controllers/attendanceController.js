import Shift from "../models/shiftModel.js";
import User from "../models/userModel.js";
import Team from "../models/teamModel.js";

// CLOCK IN (start shift)
export const clockIn = async (req, res) => {
  try {
    const userId = req.user._id;
    const companyId = req.user.company;

    // Find shift assigned to user that should start now.
    const shift = await Shift.findOne({
      employee: userId,
      company: companyId,
      status: "assigned",
      startDateTime: { $lte: new Date() },
    });

    if (!shift) {
      return res.status(400).json({
        message: "No shift available to start at this time",
      });
    }

    shift.status = "started";
    shift.startedAt = new Date();

    await shift.save();

    return res.json({
      message: "Shift started successfully",
      shift,
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

    const shift = await Shift.findOne({
      employee: userId,
      company: companyId,
      status: "started",
    });

    if (!shift) {
      return res.status(400).json({
        message: "No active shift to end",
      });
    }

    shift.status = "completed";
    shift.endedAt = new Date();

    await shift.save();

    return res.json({
      message: "Shift ended successfully",
      shift,
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

    const shift = await Shift.findOne({
      employee: userId,
      company: companyId,
      status: "started",
    });

    if (!shift) {
      return res.status(400).json({
        message: "No active shift to start a break",
      });
    }

    // If already in a break
    const lastBreak = shift.breaks[shift.breaks.length - 1];
    if (lastBreak && !lastBreak.end) {
      return res.status(400).json({
        message: "You are already in a break",
      });
    }

    shift.breaks.push({
      start: new Date(),
      end: null,
    });

    await shift.save();

    return res.json({
      message: "Break started",
      shift,
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

    const shift = await Shift.findOne({
      employee: userId,
      company: companyId,
      status: "started",
    });

    if (!shift) {
      return res.status(400).json({
        message: "No active shift",
      });
    }

    const lastBreak = shift.breaks[shift.breaks.length - 1];

    if (!lastBreak || lastBreak.end) {
      return res.status(400).json({
        message: "No break to end",
      });
    }

    lastBreak.end = new Date();

    await shift.save();

    return res.json({
      message: "Break ended",
      shift,
    });
  } catch (err) {
    console.error("endBreak error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// GET MY ATTENDANCE
export const getMyAttendance = async (req, res) => {
  try {
    const userId = req.user._id;
    const companyId = req.user.company;

    const shifts = await Shift.find({
      employee: userId,
      company: companyId,
    }).sort({ startDateTime: -1 });

    return res.json(shifts);
  } catch (err) {
    console.error("getMyAttendance error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// GET TEAM ATTENDANCE (Admin only)
export const getTeamAttendance = async (req, res) => {
  try {
    const companyId = req.user.company;
    const adminId = req.user._id;
    const { teamId } = req.params;

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    if (team.company.toString() !== companyId.toString()) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (team.admin.toString() !== adminId.toString()) {
      return res.status(403).json({
        message: "Only the team admin can view attendance",
      });
    }

    const shifts = await Shift.find({ team: teamId })
      .populate("employee", "name email")
      .sort({ startDateTime: -1 });

    return res.json(shifts);
  } catch (err) {
    console.error("getTeamAttendance error:", err);
    return res.status(500).json({ message: err.message });
  }
};
