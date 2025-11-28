import Team from "../models/teamModel.js";
import User from "../models/userModel.js";
import Shift from "../models/shiftModel.js";

// CREATE TEAM (Allowed: super_admin, company_admin)
export const createTeam = async (req, res) => {
  try {
    const companyId = req.user.company;

    if (!companyId)
      return res.status(400).json({ message: "User has no company assigned" });

    // Only admins can create teams
    if (!["superAdmin", "admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only admins can create teams" });
    }

    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: "Team name is required" });

    // Company scoped uniqueness
    const existing = await Team.findOne({ name, company: companyId });
    if (existing)
      return res.status(400).json({
        message: "A team with this name already exists in your company",
      });

    const team = await Team.create({
      name,
      description: description || "",
      company: companyId,
      members: [],
    });

    return res.status(201).json({
      message: "Team created successfully",
      team,
    });
  } catch (err) {
    console.error("createTeam error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// ADD MEMBER TO TEAM (Allowed: super_admin, company_admin)
export const addMember = async (req, res) => {
  try {
    const { teamId, userId } = req.body;

    // Admin check
    if (!["superAdmin", "admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only admins can add members" });
    }

    const companyId = req.user.company;

    // 1) Get team
    const team = await Team.findById(teamId);
    if (!team)
      return res.status(404).json({ message: "Team not found" });

    // 2) Team must belong to same company
    if (team.company.toString() !== companyId.toString()) {
      return res.status(403).json({
        message: "Cannot modify a team from another company",
      });
    }

    // 3) Fetch user
    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ message: "User not found" });

    // Must belong to same company
    if (user.company.toString() !== companyId.toString()) {
      return res.status(403).json({ message: "User not in your company" });
    }

    if (user.role !== "employee") {
      return res.status(400).json({
        message: "Only employees can be added to teams",
      });
    }

    if (!user.active) {
      return res.status(400).json({
        message: "Cannot add inactive employee to team",
      });
    }

    // 4) Prevent duplicate membership
    if (!team.members.includes(userId)) {
      team.members.push(userId);
      await team.save();
    }

    // Attach team to the user
    user.team = team._id;
    await user.save();

    return res.json({
      message: "Member added successfully",
      team: await Team.findById(teamId).populate("members", "name email role active"),
    });
  } catch (err) {
    console.error("addMember error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// REMOVE MEMBER FROM TEAM (Allowed: super_admin, company_admin)
export const removeMember = async (req, res) => {
  try {
    const { teamId, userId } = req.body;

    // Admin check
    if (!["superAdmin", "admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only admins can remove members" });
    }

    const companyId = req.user.company;

    // 1) Get team
    const team = await Team.findById(teamId);
    if (!team)
      return res.status(404).json({ message: "Team not found" });

    // 2) Team must belong to same company
    if (team.company.toString() !== companyId.toString()) {
      return res.status(403).json({
        message: "Cannot modify a team from another company",
      });
    }

    // 3) Remove member from team
    team.members = team.members.filter(memberId => memberId.toString() !== userId);
    await team.save();

    // 4) Remove team reference from user
    await User.findByIdAndUpdate(userId, { team: null });

    return res.json({
      message: "Member removed successfully",
      team: await Team.findById(teamId).populate("members", "name email role active"),
    });
  } catch (err) {
    console.error("removeMember error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// GET ALL TEAMS IN MY COMPANY (Allowed: super_admin, company_admin)
export const getMyTeams = async (req, res) => {
  try {
    const companyId = req.user.company;

    if (!["superAdmin", "admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Admins only" });
    }

    const teams = await Team.find({ company: companyId })
      .populate("members", "name email role active")
      .sort({ createdAt: -1 });

    // Get team statistics
    const teamsWithStats = await Promise.all(
      teams.map(async (team) => {
        const activeMembers = team.members.filter(member => member.active).length;
        const todayShifts = await Shift.countDocuments({
          team: team._id,
          startDateTime: {
            $gte: new Date().setHours(0, 0, 0, 0),
            $lt: new Date().setHours(23, 59, 59, 999)
          }
        });

        return {
          ...team.toObject(),
          stats: {
            totalMembers: team.members.length,
            activeMembers,
            todayShifts
          }
        };
      })
    );

    return res.json(teamsWithStats);
  } catch (err) {
    console.error("getMyTeams error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// GET MY TEAM (Allowed: employee)
export const getMyTeam = async (req, res) => {
  try {
    const userId = req.user._id;
    const companyId = req.user.company;

    const team = await Team.findOne({
      members: userId,
      company: companyId,
    })
      .populate("members", "name email role active")
      .sort({ createdAt: -1 });

    if (!team)
      return res.status(404).json({ message: "You are not assigned to any team" });

    return res.json(team);
  } catch (err) {
    console.error("getMyTeam error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// GET TEAM BY ID
export const getTeamById = async (req, res) => {
  try {
    const companyId = req.user.company;
    const { id } = req.params;

    if (!["superAdmin", "admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only admins can view team details" });
    }

    const team = await Team.findById(id)
      .populate("members", "name email role active phone position department")
      .populate("company", "name");

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    if (team.company._id.toString() !== companyId.toString()) {
      return res.status(403).json({ message: "Not allowed" });
    }

    // Get team statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayShifts, upcomingShifts, attendanceStats] = await Promise.all([
      // Today's shifts
      Shift.countDocuments({
        team: team._id,
        startDateTime: {
          $gte: today,
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      }),
      // Upcoming shifts (next 7 days)
      Shift.countDocuments({
        team: team._id,
        startDateTime: {
          $gte: new Date(),
          $lt: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
        }
      }),
      // Attendance stats
      require('../models/attendanceModel.js').default.aggregate([
        {
          $match: {
            company: companyId,
            employee: { $in: team.members.map(m => m._id) },
            date: { $gte: today }
          }
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const teamWithStats = {
      ...team.toObject(),
      stats: {
        totalMembers: team.members.length,
        activeMembers: team.members.filter(m => m.active).length,
        todayShifts,
        upcomingShifts,
        attendance: attendanceStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {})
      }
    };

    return res.json(teamWithStats);
  } catch (err) {
    console.error("getTeamById error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// UPDATE TEAM
export const updateTeam = async (req, res) => {
  try {
    const companyId = req.user.company;
    const { id } = req.params;
    const { name, description } = req.body;

    if (!["superAdmin", "admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only admins can update teams" });
    }

    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    if (team.company.toString() !== companyId.toString()) {
      return res.status(403).json({ message: "Not allowed" });
    }

    // Check for duplicate name
    if (name && name !== team.name) {
      const existing = await Team.findOne({ 
        name, 
        company: companyId,
        _id: { $ne: id }
      });
      if (existing) {
        return res.status(400).json({ message: "Team name already exists" });
      }
      team.name = name;
    }

    if (description !== undefined) team.description = description;

    await team.save();

    const updatedTeam = await Team.findById(id)
      .populate("members", "name email role active");

    return res.json({
      message: "Team updated successfully",
      team: updatedTeam
    });
  } catch (err) {
    console.error("updateTeam error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// DELETE TEAM
export const deleteTeam = async (req, res) => {
  try {
    const companyId = req.user.company;
    const { id } = req.params;

    if (!["superAdmin", "admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only admins can delete teams" });
    }

    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    if (team.company.toString() !== companyId.toString()) {
      return res.status(403).json({ message: "Not allowed" });
    }

    // Remove team reference from all members
    await User.updateMany(
      { team: id },
      { $unset: { team: "" } }
    );

    // Delete the team
    await Team.findByIdAndDelete(id);

    return res.json({ 
      message: "Team deleted successfully" 
    });
  } catch (err) {
    console.error("deleteTeam error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// BULK ADD MEMBERS TO TEAM
export const bulkAddMembers = async (req, res) => {
  try {
    const { teamId, userIds } = req.body;

    if (!["superAdmin", "admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only admins can add members" });
    }

    const companyId = req.user.company;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    if (team.company.toString() !== companyId.toString()) {
      return res.status(403).json({ message: "Not allowed" });
    }

    // Validate all users
    const users = await User.find({ 
      _id: { $in: userIds },
      company: companyId,
      role: "employee",
      active: true
    });

    if (users.length !== userIds.length) {
      return res.status(400).json({ 
        message: "Some users are invalid, inactive, or not employees" 
      });
    }

    // Add members to team (avoid duplicates)
    const newMembers = userIds.filter(userId => 
      !team.members.includes(userId)
    );

    team.members.push(...newMembers);
    await team.save();

    // Update users' team references
    await User.updateMany(
      { _id: { $in: newMembers } },
      { team: teamId }
    );

    const updatedTeam = await Team.findById(teamId)
      .populate("members", "name email role active");

    return res.json({
      message: `${newMembers.length} members added successfully`,
      team: updatedTeam,
      addedCount: newMembers.length
    });
  } catch (err) {
    console.error("bulkAddMembers error:", err);
    return res.status(500).json({ message: err.message });
  }
};