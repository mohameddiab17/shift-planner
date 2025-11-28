import Report from "../models/reportModel.js";
import Attendance from "../models/attendanceModel.js";
import TimeOff from "../models/timeOffModel.js";
import User from "../models/userModel.js";
import Shift from "../models/shiftModel.js";
import Team from "../models/teamModel.js";

// GENERATE ATTENDANCE REPORT
export const generateAttendanceReport = async (req, res) => {
  try {
    const companyId = req.user.company;
    const userId = req.user._id;
    const { startDate, endDate, teamId, type = "summary" } = req.body;

    if (!["superAdmin", "admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only admins can generate reports" });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (isNaN(start) || isNaN(end)) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    if (start >= end) {
      return res.status(400).json({ message: "Start date must be before end date" });
    }

    // Build query
    let attendanceQuery = {
      company: companyId,
      date: { $gte: start, $lte: end }
    };

    if (teamId) {
      const team = await Team.findById(teamId);
      if (!team || team.company.toString() !== companyId.toString()) {
        return res.status(400).json({ message: "Invalid team" });
      }
      attendanceQuery.employee = { $in: team.members };
    }

    // Get attendance data
    const attendanceRecords = await Attendance.find(attendanceQuery)
      .populate("employee", "name email role team")
      .sort({ date: 1 });

    // Calculate report data based on type
    let reportData = {};
    
    switch (type) {
      case "summary":
        reportData = await generateAttendanceSummary(attendanceRecords, start, end);
        break;
      case "detailed":
        reportData = await generateDetailedAttendance(attendanceRecords, start, end);
        break;
      case "overtime":
        reportData = await generateOvertimeReport(attendanceRecords, start, end);
        break;
      default:
        reportData = await generateAttendanceSummary(attendanceRecords, start, end);
    }

    // Create report record
    const report = await Report.create({
      company: companyId,
      type: "attendance",
      period: "custom",
      startDate: start,
      endDate: end,
      title: `Attendance Report - ${start.toDateString()} to ${end.toDateString()}`,
      data: reportData,
      generatedBy: userId
    });

    return res.status(201).json({
      message: "Attendance report generated successfully",
      report
    });
  } catch (err) {
    console.error("generateAttendanceReport error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// GENERATE TIME OFF REPORT
export const generateTimeOffReport = async (req, res) => {
  try {
    const companyId = req.user.company;
    const userId = req.user._id;
    const { startDate, endDate, teamId, reportType = "summary" } = req.body;

    if (!["superAdmin", "admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only admins can generate reports" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Build query
    let timeOffQuery = {
      company: companyId,
      startDate: { $gte: start, $lte: end }
    };

    if (teamId) {
      const team = await Team.findById(teamId);
      if (!team || team.company.toString() !== companyId.toString()) {
        return res.status(400).json({ message: "Invalid team" });
      }
      timeOffQuery.employee = { $in: team.members };
    }

    // Get time off data
    const timeOffRequests = await TimeOff.find(timeOffQuery)
      .populate("employee", "name email role team")
      .populate("approvedBy", "name")
      .sort({ startDate: 1 });

    // Generate report data
    const reportData = await generateTimeOffAnalysis(timeOffRequests, start, end);

    // Create report record
    const report = await Report.create({
      company: companyId,
      type: "timeoff",
      period: "custom",
      startDate: start,
      endDate: end,
      title: `Time Off Report - ${start.toDateString()} to ${end.toDateString()}`,
      data: reportData,
      generatedBy: userId
    });

    return res.status(201).json({
      message: "Time off report generated successfully",
      report
    });
  } catch (err) {
    console.error("generateTimeOffReport error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// GENERATE PRODUCTIVITY REPORT
export const generateProductivityReport = async (req, res) => {
  try {
    const companyId = req.user.company;
    const userId = req.user._id;
    const { startDate, endDate, teamId } = req.body;

    if (!["superAdmin", "admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only admins can generate reports" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Get attendance data for productivity analysis
    let attendanceQuery = {
      company: companyId,
      date: { $gte: start, $lte: end },
      clockOut: { $exists: true } // Only completed shifts
    };

    if (teamId) {
      const team = await Team.findById(teamId);
      if (!team || team.company.toString() !== companyId.toString()) {
        return res.status(400).json({ message: "Invalid team" });
      }
      attendanceQuery.employee = { $in: team.members };
    }

    const attendanceRecords = await Attendance.find(attendanceQuery)
      .populate("employee", "name email role team")
      .sort({ date: 1 });

    // Get shift data for comparison
    const shifts = await Shift.find({
      company: companyId,
      startDateTime: { $gte: start, $lte: end },
      status: { $in: ["assigned", "started", "completed"] }
    }).populate("employee", "name email");

    // Generate productivity analysis
    const reportData = await generateProductivityAnalysis(attendanceRecords, shifts, start, end);

    // Create report record
    const report = await Report.create({
      company: companyId,
      type: "productivity",
      period: "custom",
      startDate: start,
      endDate: end,
      title: `Productivity Report - ${start.toDateString()} to ${end.toDateString()}`,
      data: reportData,
      generatedBy: userId
    });

    return res.status(201).json({
      message: "Productivity report generated successfully",
      report
    });
  } catch (err) {
    console.error("generateProductivityReport error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// GET ALL REPORTS
export const getReports = async (req, res) => {
  try {
    const companyId = req.user.company;
    const { type, period, page = 1, limit = 10 } = req.query;

    let query = { company: companyId };

    // Add filters
    if (type) query.type = type;
    if (period) query.period = period;

    const reports = await Report.find(query)
      .populate("generatedBy", "name email")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Report.countDocuments(query);

    return res.json({
      reports,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (err) {
    console.error("getReports error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// GET REPORT BY ID
export const getReportById = async (req, res) => {
  try {
    const companyId = req.user.company;
    const { id } = req.params;

    const report = await Report.findById(id)
      .populate("generatedBy", "name email")
      .populate("sharedWith", "name email");

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    // Check permissions
    const isOwner = report.generatedBy._id.toString() === req.user._id.toString();
    const isShared = report.sharedWith.some(user => user._id.toString() === req.user._id.toString());
    const isAdmin = ["superAdmin", "admin"].includes(req.user.role);

    if (!isOwner && !isShared && !isAdmin) {
      return res.status(403).json({ message: "Not authorized to view this report" });
    }

    if (report.company.toString() !== companyId.toString()) {
      return res.status(403).json({ message: "Not allowed" });
    }

    return res.json(report);
  } catch (err) {
    console.error("getReportById error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// SHARE REPORT WITH USERS
export const shareReport = async (req, res) => {
  try {
    const companyId = req.user.company;
    const { id } = req.params;
    const { userIds } = req.body;

    if (!["superAdmin", "admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only admins can share reports" });
    }

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    if (report.company.toString() !== companyId.toString()) {
      return res.status(403).json({ message: "Not allowed" });
    }

    // Verify all users belong to the same company
    const users = await User.find({ 
      _id: { $in: userIds },
      company: companyId 
    });

    if (users.length !== userIds.length) {
      return res.status(400).json({ message: "Some users not found or don't belong to your company" });
    }

    report.sharedWith = userIds;
    report.shareable = true;
    await report.save();

    return res.json({
      message: "Report shared successfully",
      sharedWith: users.map(user => ({ id: user._id, name: user.name, email: user.email }))
    });
  } catch (err) {
    console.error("shareReport error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// DELETE REPORT
export const deleteReport = async (req, res) => {
  try {
    const companyId = req.user.company;
    const { id } = req.params;

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    // Check permissions: only owner or admin can delete
    const isOwner = report.generatedBy.toString() === req.user._id.toString();
    const isAdmin = ["superAdmin", "admin"].includes(req.user.role);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized to delete this report" });
    }

    if (report.company.toString() !== companyId.toString()) {
      return res.status(403).json({ message: "Not allowed" });
    }

    await Report.findByIdAndDelete(id);

    return res.json({ message: "Report deleted successfully" });
  } catch (err) {
    console.error("deleteReport error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// GET DASHBOARD STATISTICS
export const getDashboardStats = async (req, res) => {
  try {
    const companyId = req.user.company;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Parallel data fetching for performance
    const [
      totalEmployees,
      activeShifts,
      todayAttendance,
      pendingTimeOff,
      weeklyOvertime,
      teamStats
    ] = await Promise.all([
      // Total employees
      User.countDocuments({ company: companyId, role: "employee", active: true }),
      
      // Active shifts today
      Shift.countDocuments({ 
        company: companyId, 
        status: "started",
        startDateTime: { $gte: today } 
      }),
      
      // Today's attendance summary
      Attendance.aggregate([
        {
          $match: {
            company: companyId,
            date: { $gte: today }
          }
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 }
          }
        }
      ]),
      
      // Pending time off requests
      TimeOff.countDocuments({ company: companyId, status: "pending" }),
      
      // Weekly overtime total
      Attendance.aggregate([
        {
          $match: {
            company: companyId,
            date: { $gte: weekStart },
            overtime: { $gt: 0 }
          }
        },
        {
          $group: {
            _id: null,
            totalOvertime: { $sum: "$overtime" }
          }
        }
      ]),
      
      // Team statistics
      Team.find({ company: companyId }).populate("members")
    ]);

    // Process today's attendance
    const attendanceSummary = {
      present: 0,
      late: 0,
      absent: 0
    };

    todayAttendance.forEach(item => {
      attendanceSummary[item._id] = item.count;
    });

    // Process team stats
    const teamStatistics = teamStats.map(team => ({
      id: team._id,
      name: team.name,
      memberCount: team.members.length,
      activeMembers: team.members.filter(m => m.active).length
    }));

    const stats = {
      overview: {
        totalEmployees,
        activeShifts,
        pendingTimeOff,
        weeklyOvertime: weeklyOvertime[0]?.totalOvertime || 0
      },
      attendance: attendanceSummary,
      teams: teamStatistics
    };

    return res.json(stats);
  } catch (err) {
    console.error("getDashboardStats error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// HELPER FUNCTIONS
async function generateAttendanceSummary(records, start, end) {
  const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  const employees = [...new Set(records.map(r => r.employee._id.toString()))];
  
  const summary = {
    period: { start, end, totalDays },
    totalRecords: records.length,
    totalEmployees: employees.length,
    attendanceRate: 0,
    totalWorkedHours: 0,
    totalOvertimeHours: 0,
    lateCount: 0,
    byEmployee: [],
    byDay: []
  };

  // Calculate by employee
  const employeeMap = new Map();
  
  records.forEach(record => {
    const empId = record.employee._id.toString();
    if (!employeeMap.has(empId)) {
      employeeMap.set(empId, {
        employee: record.employee,
        records: [],
        totalWorked: 0,
        overtime: 0,
        lateCount: 0
      });
    }
    
    const empData = employeeMap.get(empId);
    empData.records.push(record);
    empData.totalWorked += record.totalWorked || 0;
    empData.overtime += record.overtime || 0;
    if (record.status === "late") empData.lateCount++;
  });

  summary.byEmployee = Array.from(employeeMap.values()).map(emp => ({
    employee: emp.employee,
    totalWorkedHours: (emp.totalWorked / 60).toFixed(2),
    overtimeHours: (emp.overtime / 60).toFixed(2),
    lateCount: emp.lateCount,
    attendanceRate: ((emp.records.length / totalDays) * 100).toFixed(2)
  }));

  // Calculate totals
  summary.totalWorkedHours = (records.reduce((sum, r) => sum + (r.totalWorked || 0), 0) / 60).toFixed(2);
  summary.totalOvertimeHours = (records.reduce((sum, r) => sum + (r.overtime || 0), 0) / 60).toFixed(2);
  summary.lateCount = records.filter(r => r.status === "late").length;
  summary.attendanceRate = ((records.length / (employees.length * totalDays)) * 100).toFixed(2);

  return summary;
}

async function generateDetailedAttendance(records, start, end) {
  return {
    period: { start, end },
    records: records.map(record => ({
      date: record.date,
      employee: record.employee,
      clockIn: record.clockIn,
      clockOut: record.clockOut,
      totalWorked: record.totalWorked,
      overtime: record.overtime,
      status: record.status,
      breaks: record.breaks
    }))
  };
}

async function generateOvertimeReport(records, start, end) {
  const overtimeRecords = records.filter(r => r.overtime > 0);
  
  return {
    period: { start, end },
    totalOvertimeHours: (overtimeRecords.reduce((sum, r) => sum + r.overtime, 0) / 60).toFixed(2),
    employees: overtimeRecords.map(record => ({
      employee: record.employee,
      date: record.date,
      overtimeMinutes: record.overtime,
      overtimeHours: (record.overtime / 60).toFixed(2),
      totalWorked: record.totalWorked
    }))
  };
}

async function generateTimeOffAnalysis(requests, start, end) {
  const summary = {
    period: { start, end },
    totalRequests: requests.length,
    byStatus: {
      pending: requests.filter(r => r.status === "pending").length,
      approved: requests.filter(r => r.status === "approved").length,
      rejected: requests.filter(r => r.status === "rejected").length
    },
    byType: {},
    byEmployee: [],
    approvalRate: 0
  };

  // Calculate by type
  const types = ["annual", "sick", "unpaid", "emergency", "maternity"];
  types.forEach(type => {
    summary.byType[type] = requests.filter(r => r.type === type).length;
  });

  // Calculate by employee
  const employeeMap = new Map();
  requests.forEach(request => {
    const empId = request.employee._id.toString();
    if (!employeeMap.has(empId)) {
      employeeMap.set(empId, {
        employee: request.employee,
        requests: [],
        totalDays: 0
      });
    }
    
    const empData = employeeMap.get(empId);
    empData.requests.push(request);
    empData.totalDays += request.duration;
  });

  summary.byEmployee = Array.from(employeeMap.values());

  // Calculate approval rate
  const processed = requests.filter(r => r.status !== "pending").length;
  summary.approvalRate = processed > 0 ? 
    ((summary.byStatus.approved / processed) * 100).toFixed(2) : 0;

  return summary;
}

async function generateProductivityAnalysis(attendance, shifts, start, end) {
  const employeeProductivity = new Map();

  // Initialize employee data
  attendance.forEach(record => {
    const empId = record.employee._id.toString();
    if (!employeeProductivity.has(empId)) {
      employeeProductivity.set(empId, {
        employee: record.employee,
        totalWorked: 0,
        scheduledHours: 0,
        overtime: 0,
        lateCount: 0,
        attendanceCount: 0
      });
    }
    
    const empData = employeeProductivity.get(empId);
    empData.totalWorked += record.totalWorked || 0;
    empData.overtime += record.overtime || 0;
    if (record.status === "late") empData.lateCount++;
    empData.attendanceCount++;
  });

  // Calculate scheduled hours from shifts
  shifts.forEach(shift => {
    const empId = shift.employee._id.toString();
    if (employeeProductivity.has(empId)) {
      const shiftDuration = (shift.endDateTime - shift.startDateTime) / (1000 * 60); // minutes
      employeeProductivity.get(empId).scheduledHours += shiftDuration;
    }
  });

  // Calculate productivity metrics
  const productivityData = Array.from(employeeProductivity.values()).map(emp => {
    const workedHours = emp.totalWorked / 60;
    const scheduledHours = emp.scheduledHours / 60;
    const productivity = scheduledHours > 0 ? (workedHours / scheduledHours) * 100 : 0;
    
    return {
      employee: emp.employee,
      workedHours: workedHours.toFixed(2),
      scheduledHours: scheduledHours.toFixed(2),
      productivity: productivity.toFixed(2),
      overtimeHours: (emp.overtime / 60).toFixed(2),
      lateCount: emp.lateCount,
      attendanceRate: ((emp.attendanceCount / Math.ceil((end - start) / (1000 * 60 * 60 * 24))) * 100).toFixed(2)
    };
  });

  return {
    period: { start, end },
    employees: productivityData,
    averages: {
      avgProductivity: (productivityData.reduce((sum, emp) => sum + parseFloat(emp.productivity), 0) / productivityData.length).toFixed(2),
      avgAttendance: (productivityData.reduce((sum, emp) => sum + parseFloat(emp.attendanceRate), 0) / productivityData.length).toFixed(2)
    }
  };
}