import User from "../models/userModel.js";

// GET ALL USERS IN COMPANY
export const getUsers = async (req, res) => {
  try {
    const users = await User.find({ company: req.user.company }).select("-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// CREATE EMPLOYEE
export const createEmployee = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const finalRole = role || "employee";

    if (!req.user.company) {
      return res.status(400).json({ message: "User has no company assigned" });
    }

    // Permission check
    if (finalRole === "super_admin" || (finalRole === "admin" && req.user.role !== "super_admin")) {
      return res.status(403).json({ message: "Not authorized to create this role" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || "employee",
      company: req.user.company,
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      company: user.company,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// GET PROFILE
export const getMe = async (req, res) => {
  res.json(req.user);
};
