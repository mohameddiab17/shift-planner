import TimeOff from "../models/timeOffModel.js";
import User from "../models/userModel.js";
import Team from "../models/teamModel.js";

// CREATE TIME OFF REQUEST (Employee)
export const createTimeOff = async (req, res) => {
  try {
    const userId = req.user._id;
    const companyId = req.user.company;
    const { type, startDate, endDate, reason, notes } = req.body;

    // Validation
    if (!type || !startDate || !endDate || !reason) {
      return res.status(400).json({
        message: "Type, start date, end date, and reason are required"
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Check if end date is after start date
    if (end <= start) {
      return res.status(400).json({
        message: "End date must be after start date"
      });
    }

    // Check for overlapping requests
    const overlappingRequest = await TimeOff.findOne({
      employee: userId,
      company: companyId,
      status: { $in: ["pending", "approved"] },
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } }
      ]
    });

    if (overlappingRequest) {
      return res.status(400).json({
        message: "You have an existing time off request that overlaps with these dates"
      });
    }

    // Create time off request
    const timeOff = await TimeOff.create({
      employee: userId,
      company: companyId,
      type,
      startDate: start,
      endDate: end,
      reason,
      notes: notes || "",
      status: "pending"
    });

    const populated = await TimeOff.findById(timeOff._id)
      .populate("employee", "name email");

    return res.status(201).json({
      message: "Time off request submitted successfully",
      timeOff: populated
    });
  } catch (err) {
    console.error("createTimeOff error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// GET MY TIME OFF REQUESTS (Employee)
export const getMyTimeOff = async (req, res) => {
  try {
    const userId = req.user._id;
    const companyId = req.user.company;
    const { status, type, year } = req.query;

    let query = {
      employee: userId,
      company: companyId
    };

    // Add filters if provided
    if (status) query.status = status;
    if (type) query.type = type;
    if (year) {
      const startYear = new Date(`${year}-01-01`);
      const endYear = new Date(`${year}-12-31`);
      query.startDate = { $gte: startYear, $lte: endYear };
    }

    const timeOffRequests = await TimeOff.find(query)
      .populate("employee", "name email")
      .populate("approvedBy", "name")
      .sort({ createdAt: -1 });

    // Calculate statistics
    const stats = {
      total: timeOffRequests.length,
      pending: timeOffRequests.filter(req => req.status === "pending").length,
      approved: timeOffRequests.filter(req => req.status === "approved").length,
      rejected: timeOffRequests.filter(req => req.status === "rejected").length
    };

    return res.json({
      requests: timeOffRequests,
      statistics: stats
    });
  } catch (err) {
    console.error("getMyTimeOff error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// GET TEAM TIME OFF REQUESTS (Admin/Manager)
export const getTeamTimeOff = async (req, res) => {
  try {
    const companyId = req.user.company;
    const { teamId, status } = req.query;

    // Verify team exists and belongs to company
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    if (team.company.toString() !== companyId.toString()) {
      return res.status(403).json({ message: "Not allowed" });
    }

    let query = {
      company: companyId,
      employee: { $in: team.members }
    };

    if (status) query.status = status;

    const timeOffRequests = await TimeOff.find(query)
      .populate("employee", "name email role team")
      .populate("approvedBy", "name")
      .sort({ createdAt: -1 });

    return res.json({
      team: team.name,
      requests: timeOffRequests,
      total: timeOffRequests.length
    });
  } catch (err) {
    console.error("getTeamTimeOff error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// GET ALL PENDING REQUESTS (Admin)
export const getPendingRequests = async (req, res) => {
  try {
    const companyId = req.user.company;

    if (!["superAdmin", "admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only admins can view pending requests" });
    }

    const pendingRequests = await TimeOff.find({
      company: companyId,
      status: "pending"
    })
      .populate("employee", "name email role team")
      .populate("approvedBy", "name")
      .sort({ createdAt: -1 });

    return res.json({
      requests: pendingRequests,
      count: pendingRequests.length
    });
  } catch (err) {
    console.error("getPendingRequests error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// APPROVE/REJECT TIME OFF REQUEST (Admin)
export const updateRequestStatus = async (req, res) => {
  try {
    const companyId = req.user.company;
    const adminId = req.user._id;
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!["superAdmin", "admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only admins can update request status" });
    }

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Status must be 'approved' or 'rejected'" });
    }

    const timeOff = await TimeOff.findById(id);
    if (!timeOff) {
      return res.status(404).json({ message: "Time off request not found" });
    }

    if (timeOff.company.toString() !== companyId.toString()) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (timeOff.status !== "pending") {
      return res.status(400).json({ message: "Request has already been processed" });
    }

    timeOff.status = status;
    timeOff.approvedBy = adminId;
    timeOff.approvedAt = new Date();
    if (notes) timeOff.notes = notes;

    await timeOff.save();

    const populated = await TimeOff.findById(timeOff._id)
      .populate("employee", "name email")
      .populate("approvedBy", "name");

    return res.json({
      message: `Time off request ${status} successfully`,
      timeOff: populated
    });
  } catch (err) {
    console.error("updateRequestStatus error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// GET TIME OFF STATISTICS (Admin Dashboard)
export const getTimeOffStatistics = async (req, res) => {
  try {
    const companyId = req.user.company;

    if (!["superAdmin", "admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only admins can view statistics" });
    }

    const currentYear = new Date().getFullYear();
    const startYear = new Date(`${currentYear}-01-01`);
    const endYear = new Date(`${currentYear}-12-31`);

    // Get all time off requests for the current year
    const timeOffRequests = await TimeOff.find({
      company: companyId,
      startDate: { $gte: startYear, $lte: endYear }
    }).populate("employee", "name team");

    // Calculate statistics
    const stats = {
      totalRequests: timeOffRequests.length,
      pending: timeOffRequests.filter(req => req.status === "pending").length,
      approved: timeOffRequests.filter(req => req.status === "approved").length,
      rejected: timeOffRequests.filter(req => req.status === "rejected").length,
      
      byType: {
        annual: timeOffRequests.filter(req => req.type === "annual").length,
        sick: timeOffRequests.filter(req => req.type === "sick").length,
        unpaid: timeOffRequests.filter(req => req.type === "unpaid").length,
        emergency: timeOffRequests.filter(req => req.type === "emergency").length,
        maternity: timeOffRequests.filter(req => req.type === "maternity").length
      },
      
      byMonth: Array.from({ length: 12 }, (_, i) => {
        const month = i + 1;
        const monthRequests = timeOffRequests.filter(req => 
          new Date(req.startDate).getMonth() + 1 === month
        );
        return {
          month,
          requests: monthRequests.length,
          approved: monthRequests.filter(req => req.status === "approved").length
        };
      })
    };

    return res.json(stats);
  } catch (err) {
    console.error("getTimeOffStatistics error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// DELETE TIME OFF REQUEST (Employee or Admin)
export const deleteTimeOff = async (req, res) => {
  try {
    const userId = req.user._id;
    const companyId = req.user.company;
    const { id } = req.params;

    const timeOff = await TimeOff.findById(id);
    if (!timeOff) {
      return res.status(404).json({ message: "Time off request not found" });
    }

    // Check permissions: employee can delete only their own pending requests, admin can delete any
    const isOwner = timeOff.employee.toString() === userId.toString();
    const isAdmin = ["superAdmin", "admin"].includes(req.user.role);
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not allowed to delete this request" });
    }

    // Only pending requests can be deleted by employees
    if (isOwner && timeOff.status !== "pending") {
      return res.status(400).json({ 
        message: "Cannot delete a request that has already been processed" 
      });
    }

    if (timeOff.company.toString() !== companyId.toString()) {
      return res.status(403).json({ message: "Not allowed" });
    }

    await TimeOff.findByIdAndDelete(id);

    return res.json({ 
      message: "Time off request deleted successfully" 
    });
  } catch (err) {
    console.error("deleteTimeOff error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// GET TIME OFF BALANCE (Employee)
export const getTimeOffBalance = async (req, res) => {
  try {
    const userId = req.user._id;
    const companyId = req.user.company;
    const currentYear = new Date().getFullYear();

    const startYear = new Date(`${currentYear}-01-01`);
    const endYear = new Date(`${currentYear}-12-31`);

    // Get approved time off requests for the current year
    const approvedRequests = await TimeOff.find({
      employee: userId,
      company: companyId,
      status: "approved",
      startDate: { $gte: startYear, $lte: endYear }
    });

    // Calculate balances (this is a simplified version - you might want to customize based on company policy)
    const balances = {
      annual: {
        allocated: 21, // Standard 21 days annual leave
        used: approvedRequests.filter(req => req.type === "annual")
                          .reduce((sum, req) => sum + req.duration, 0),
        remaining: 0
      },
      sick: {
        allocated: 10, // Standard 10 days sick leave
        used: approvedRequests.filter(req => req.type === "sick")
                          .reduce((sum, req) => sum + req.duration, 0),
        remaining: 0
      },
      unpaid: {
        allocated: 5, // Example limit
        used: approvedRequests.filter(req => req.type === "unpaid")
                          .reduce((sum, req) => sum + req.duration, 0),
        remaining: 0
      }
    };

    // Calculate remaining days
    balances.annual.remaining = Math.max(0, balances.annual.allocated - balances.annual.used);
    balances.sick.remaining = Math.max(0, balances.sick.allocated - balances.sick.used);
    balances.unpaid.remaining = Math.max(0, balances.unpaid.allocated - balances.unpaid.used);

    return res.json({
      year: currentYear,
      balances
    });
  } catch (err) {
    console.error("getTimeOffBalance error:", err);
    return res.status(500).json({ message: err.message });
  }
};