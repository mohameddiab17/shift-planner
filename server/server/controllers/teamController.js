import Team from "../models/teamModel.js";
import User from "../models/userModel.js";

// CREATE TEAM (ADMIN ONLY)
export const createTeam = async (req, res) => {
  const { name } = req.body;
  try {
    const companyId = req.user.company;

    if (!companyId)
      return res.status(400).json({ message: "User has no company assigned" });

    // Company-scoped uniqueness
    const existing = await Team.findOne({ name, company: companyId });
    if (existing)
      return res
        .status(400)
        .json({ message: "A team with this name already exists for this company" });

    const team = await Team.create({
      name,
      company: companyId,
      admin: req.user._id,
      members: [], // initialize empty array
    });

    return res.status(201).json(team);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ADD MEMBER TO TEAM
export const addMember = async (req, res) => {
  const { teamId, userId } = req.body;

  try {
    // 1) Get team
    const team = await Team.findById(teamId);
    if (!team)
      return res.status(404).json({ message: "Team not found" });

    // 2) Ensure team belongs to same company
    if (team.company.toString() !== req.user.company.toString()) {
      return res.status(403).json({
        message: "You cannot modify a team from another company",
      });
    }

    // 3) Only the team admin can add members
    if (team.admin.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Only the team admin can add members" });
    }

    // 4) Fetch user
    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ message: "User not found" });

    // 5) Ensure user belongs to same company
    if (user.company.toString() !== req.user.company.toString()) {
      return res.status(403).json({
        message: "User is not part of your company",
      });
    }

    // 6) Prevent duplicates
    if (!team.members.some((m) => m.toString() === userId.toString())) {
      team.members.push(userId);
      await team.save();
    }

    // 7) Connect user -> team
    user.team = team._id;
    await user.save();

    return res.json({
      message: "Member added successfully",
      team,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


// GET ALL TEAMS IN MY COMPANY (Admin Only)

export const getMyTeams = async (req, res) => {
  try {
    const companyId = req.user.company;

    const teams = await Team.find({ company: companyId })
      .populate("members", "name email role")
      .populate("admin", "name email");

    return res.json(teams);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// GET MY TEAM (Employee Route)
export const getMyTeam = async (req, res) => {
  try {
    const team = await Team.findOne({
      members: req.user._id,
      company: req.user.company,
    })
      .populate("members", "name email role")
      .populate("admin", "name email");

    if (!team)
      return res.status(404).json({ message: "You are not assigned to any team" });

    return res.json(team);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
