import Shift from "../models/shiftModel.js";
import User from "../models/userModel.js";
import Team from "../models/teamModel.js";

// Helpers
const MS_IN_24H = 24 * 60 * 60 * 1000;

const parseDateWithValidation = (dateString, fieldName) => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid ${fieldName}: ${dateString}`);
  }
  return date;
};

const validateStartEnd = (startISO, endISO) => {
  try {
    const start = parseDateWithValidation(startISO, "startDateTime");
    const end = parseDateWithValidation(endISO, "endDateTime");

    if (start >= end) {
      return { ok: false, message: "startDateTime must be before endDateTime" };
    }
    if (end - start > MS_IN_24H) {
      return { ok: false, message: "Shift cannot exceed 24 hours" };
    }

    return { ok: true, start, end };
  } catch (error) {
    return { ok: false, message: error.message };
  }
};

// ===================================================
export const createShift = async (req, res) => {
  try {
    const companyId = req.user.company;
    const adminId = req.user._id;

    if (!companyId) {
      return res.status(400).json({ 
        success: false,
        message: "User has no company assigned" 
      });
    }

    const { employeeId, startDateTime, endDateTime, notes } = req.body;

    // Validate required fields
    if (!employeeId || !startDateTime || !endDateTime) {
      return res.status(400).json({
        success: false,
        message: "Employee ID, start date, and end date are required"
      });
    }

    const validation = validateStartEnd(startDateTime, endDateTime);
    if (!validation.ok) {
      return res.status(400).json({ 
        success: false,
        message: validation.message 
      });
    }
    const { start, end } = validation;

    // Check employee belongs to same company & is active employee
    const employee = await User.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ 
        success: false,
        message: "Employee not found" 
      });
    }

    if (employee.company?.toString() !== companyId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Employee does not belong to your company"
      });
    }

    if (employee.role !== "employee") {
      return res.status(400).json({
        success: false,
        message: "Shifts can only be assigned to employees"
      });
    }

    if (employee.active === false) {
      return res.status(400).json({
        success: false,
        message: "Cannot assign shift to inactive employee"
      });
    }

    // Check team (if employee has team) belongs to same company
    let team = null;
    if (employee.team) {
      team = await Team.findById(employee.team);
      if (!team || team.company.toString() !== companyId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Employee's team is not in your company"
        });
      }
    }

    // Overlap check
    const overlapping = await Shift.findOne({
      employee: employeeId,
      startDateTime: { $lt: end },
      endDateTime: { $gt: start },
    });

    if (overlapping) {
      return res.status(400).json({
        success: false,
        message: "Shift overlaps with an existing shift",
        details: {
          existingShift: {
            id: overlapping._id,
            start: overlapping.startDateTime,
            end: overlapping.endDateTime
          }
        }
      });
    }

    const shift = await Shift.create({
      company: companyId,
      employee: employeeId,
      team: team ? team._id : null,
      startDateTime: start,
      endDateTime: end,
      createdBy: adminId,
      notes: notes || "",
    });

    const populated = await Shift.findById(shift._id)
      .populate("employee", "name email role")
      .populate({
        path: "team",
        select: "name",
        options: { retainNullValues: true }
      });

    return res.status(201).json({
      success: true,
      message: "Shift created successfully",
      data: populated
    });
  } catch (err) {
    console.error("createShift error:", err);
    return res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

// ===================================================
export const getTeamShifts = async (req, res) => {
  try {
    const companyId = req.user.company;
    const { teamId } = req.params;
    const { 
      start: startISO, 
      end: endISO, 
      page = 1, 
      limit = 50 
    } = req.query;

    if (!companyId) {
      return res.status(400).json({ 
        success: false,
        message: "User has no company assigned" 
      });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ 
        success: false,
        message: "Team not found" 
      });
    }

    if (team.company.toString() !== companyId.toString()) {
      return res.status(403).json({ 
        success: false,
        message: "Not allowed" 
      });
    }

    const query = {
      team: teamId,
      company: companyId,
    };

    if (startISO && endISO) {
      try {
        const start = parseDateWithValidation(startISO, "start date");
        const end = parseDateWithValidation(endISO, "end date");
        
        query.startDateTime = { $lt: end };
        query.endDateTime = { $gt: start };
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
    }

    const shifts = await Shift.find(query)
      .populate("employee", "name email role")
      .populate({
        path: "team",
        select: "name",
        options: { retainNullValues: true }
      })
      .sort({ startDateTime: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Shift.countDocuments(query);

    return res.json({
      success: true,
      data: shifts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error("getTeamShifts error:", err);
    return res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

// ===================================================
export const getMyShifts = async (req, res) => {
  try {
    const companyId = req.user.company;
    const userId = req.user._id;
    const { 
      start: startISO, 
      end: endISO, 
      page = 1, 
      limit = 50 
    } = req.query;

    if (!companyId) {
      return res.status(400).json({ 
        success: false,
        message: "User has no company assigned" 
      });
    }

    const query = { 
      employee: userId, 
      company: companyId 
    };

    if (startISO && endISO) {
      try {
        const start = parseDateWithValidation(startISO, "start date");
        const end = parseDateWithValidation(endISO, "end date");
        
        query.startDateTime = { $lt: end };
        query.endDateTime = { $gt: start };
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
    }

    const shifts = await Shift.find(query)
      .populate({
        path: "team",
        select: "name",
        options: { retainNullValues: true }
      })
      .sort({ startDateTime: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Shift.countDocuments(query);

    return res.json({
      success: true,
      data: shifts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error("getMyShifts error:", err);
    return res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

// ===================================================
export const updateShift = async (req, res) => {
  try {
    const companyId = req.user.company;
    const { id } = req.params;

    if (!companyId) {
      return res.status(400).json({ 
        success: false,
        message: "User has no company assigned" 
      });
    }

    const { startDateTime, endDateTime, employeeId, notes, status } = req.body;

    const shift = await Shift.findById(id);
    if (!shift) {
      return res.status(404).json({ 
        success: false,
        message: "Shift not found" 
      });
    }

    if (shift.company.toString() !== companyId.toString()) {
      return res.status(403).json({ 
        success: false,
        message: "Not allowed" 
      });
    }

    // New employee validation
    let finalEmployee = shift.employee.toString();

    if (employeeId && employeeId !== finalEmployee) {
      const newEmp = await User.findById(employeeId);
      if (!newEmp) {
        return res.status(404).json({ 
          success: false,
          message: "Employee not found" 
        });
      }

      if (newEmp.company?.toString() !== companyId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Employee not in your company"
        });
      }

      if (newEmp.role !== "employee") {
        return res.status(400).json({
          success: false,
          message: "Shifts can only be assigned to employees"
        });
      }

      if (newEmp.active === false) {
        return res.status(400).json({
          success: false,
          message: "Cannot assign shift to inactive employee"
        });
      }

      // If the shift is linked to a team, ensure employee belongs to same team
      if (shift.team && (!newEmp.team || newEmp.team.toString() !== shift.team.toString())) {
        return res.status(400).json({
          success: false,
          message: "Employee is not in this team"
        });
      }

      finalEmployee = employeeId;
    }

    // Validate times if changed
    let newStart = shift.startDateTime;
    let newEnd = shift.endDateTime;

    if (startDateTime || endDateTime) {
      const startISO = startDateTime || shift.startDateTime.toISOString();
      const endISO = endDateTime || shift.endDateTime.toISOString();

      const validation = validateStartEnd(startISO, endISO);
      if (!validation.ok) {
        return res.status(400).json({ 
          success: false,
          message: validation.message 
        });
      }

      newStart = validation.start;
      newEnd = validation.end;
    }

    // Overlap check with other shifts (exclude current shift)
    const overlapping = await Shift.findOne({
      employee: finalEmployee,
      _id: { $ne: shift._id },
      startDateTime: { $lt: newEnd },
      endDateTime: { $gt: newStart },
    });

    if (overlapping) {
      return res.status(400).json({
        success: false,
        message: "Updated shift overlaps another shift",
        details: {
          existingShift: {
            id: overlapping._id,
            start: overlapping.startDateTime,
            end: overlapping.endDateTime
          }
        }
      });
    }

    // Update shift
    shift.employee = finalEmployee;
    shift.startDateTime = newStart;
    shift.endDateTime = newEnd;
    if (notes !== undefined) shift.notes = notes;
    if (status !== undefined) shift.status = status;

    await shift.save();

    const populated = await Shift.findById(shift._id)
      .populate("employee", "name email role")
      .populate({
        path: "team",
        select: "name",
        options: { retainNullValues: true }
      });

    return res.json({
      success: true,
      message: "Shift updated successfully",
      data: populated
    });
  } catch (err) {
    console.error("updateShift error:", err);
    return res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

// ===================================================
export const deleteShift = async (req, res) => {
  try {
    const companyId = req.user.company;
    const { id } = req.params;

    if (!companyId) {
      return res.status(400).json({ 
        success: false,
        message: "User has no company assigned" 
      });
    }

    const shift = await Shift.findById(id);
    if (!shift) {
      return res.status(404).json({ 
        success: false,
        message: "Shift not found" 
      });
    }

    if (shift.company.toString() !== companyId.toString()) {
      return res.status(403).json({ 
        success: false,
        message: "Not allowed" 
      });
    }

    await shift.deleteOne();

    return res.json({ 
      success: true,
      message: "Shift deleted successfully" 
    });
  } catch (err) {
    console.error("deleteShift error:", err);
    return res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

// ===================================================
// BULK SHIFTS CREATION (NEW FEATURE)
// ===================================================
export const createBulkShifts = async (req, res) => {
  try {
    const companyId = req.user.company;
    const adminId = req.user._id;
    const { shifts } = req.body;

    if (!companyId) {
      return res.status(400).json({ 
        success: false,
        message: "User has no company assigned" 
      });
    }

    if (!shifts || !Array.isArray(shifts) || shifts.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Shifts array is required and cannot be empty"
      });
    }

    const results = {
      successful: [],
      failed: []
    };

    for (const [index, shiftData] of shifts.entries()) {
      try {
        // Validate required fields
        if (!shiftData.employeeId || !shiftData.startDateTime || !shiftData.endDateTime) {
          results.failed.push({
            index,
            employeeId: shiftData.employeeId,
            error: "Missing required fields: employeeId, startDateTime, or endDateTime"
          });
          continue;
        }

        const validation = validateStartEnd(shiftData.startDateTime, shiftData.endDateTime);
        if (!validation.ok) {
          results.failed.push({
            index,
            employeeId: shiftData.employeeId,
            error: validation.message
          });
          continue;
        }

        const { start, end } = validation;

        // Check employee
        const employee = await User.findById(shiftData.employeeId);
        if (!employee) {
          results.failed.push({
            index,
            employeeId: shiftData.employeeId,
            error: "Employee not found"
          });
          continue;
        }

        if (employee.company?.toString() !== companyId.toString()) {
          results.failed.push({
            index,
            employeeId: shiftData.employeeId,
            error: "Employee does not belong to your company"
          });
          continue;
        }

        if (employee.role !== "employee") {
          results.failed.push({
            index,
            employeeId: shiftData.employeeId,
            error: "Shifts can only be assigned to employees"
          });
          continue;
        }

        if (employee.active === false) {
          results.failed.push({
            index,
            employeeId: shiftData.employeeId,
            error: "Cannot assign shift to inactive employee"
          });
          continue;
        }

        // Check team
        let team = null;
        if (employee.team) {
          team = await Team.findById(employee.team);
          if (!team || team.company.toString() !== companyId.toString()) {
            results.failed.push({
              index,
              employeeId: shiftData.employeeId,
              error: "Employee's team is not in your company"
            });
            continue;
          }
        }

        // Overlap check
        const overlapping = await Shift.findOne({
          employee: shiftData.employeeId,
          startDateTime: { $lt: end },
          endDateTime: { $gt: start },
        });

        if (overlapping) {
          results.failed.push({
            index,
            employeeId: shiftData.employeeId,
            error: "Shift overlaps with existing shift"
          });
          continue;
        }

        const shift = await Shift.create({
          company: companyId,
          employee: shiftData.employeeId,
          team: team ? team._id : null,
          startDateTime: start,
          endDateTime: end,
          createdBy: adminId,
          notes: shiftData.notes || "",
        });

        const populated = await Shift.findById(shift._id)
          .populate("employee", "name email role")
          .populate({
            path: "team",
            select: "name",
            options: { retainNullValues: true }
          });

        results.successful.push(populated);

      } catch (error) {
        results.failed.push({
          index,
          employeeId: shiftData.employeeId,
          error: error.message
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: `Bulk shift creation completed: ${results.successful.length} successful, ${results.failed.length} failed`,
      data: results
    });
  } catch (err) {
    console.error("createBulkShifts error:", err);
    return res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};