import User from "../models/userModel.js";

// GET ALL USERS IN COMPANY
export const getUsers = async (req, res) => {
  try {
    const companyId = req.user.company;

    if (!["superAdmin", "admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only admins can view users" });
    }

    const users = await User.find({ company: companyId }).select("-password");

    return res.json(users);
  } catch (err) {
    console.error("getUsers error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// CREATE EMPLOYEE
export const createEmployee = async (req, res) => {
  try {
    const companyId = req.user.company;

    if (!companyId) {
      return res.status(400).json({ message: "User has no company assigned" });
    }

    if (!["superAdmin", "admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only admins can create employees" });
    }

    const { name, email, password, role, phone, position, department } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    // Prevent duplicate emails
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Allowed roles to create:
    const allowedRoles = ["employee", "admin"];

    if (role && !allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role assignment" });
    }

    const newUser = await User.create({
      name,
      email,
      password,
      role: role || "employee",
      company: companyId,
      phone: phone || "",
      position: position || "",
      department: department || "",
      active: true,
    });

    return res.status(201).json({
      message: "User created successfully",
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        phone: newUser.phone,
        position: newUser.position,
        department: newUser.department,
        company: newUser.company,
        active: newUser.active
      },
    });
  } catch (err) {
    console.error("createEmployee error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// GET MY PROFILE
export const getMe = async (req, res) => {
  try {
    return res.json(req.user);
  } catch (err) {
    console.error("getMe error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// UPDATE USER PROFILE
export const updateUser = async (req, res) => {
  try {
    const companyId = req.user.company;
    const { id } = req.params;
    const { name, email, phone, position, department, team } = req.body;

    // Check permissions
    const isOwner = id === req.user._id.toString();
    const isAdmin = ["superAdmin", "admin"].includes(req.user.role);
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized to update this user" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify user belongs to same company
    if (user.company.toString() !== companyId.toString()) {
      return res.status(403).json({ message: "Not allowed" });
    }

    // Prevent email duplication
    if (email && email !== user.email) {
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(400).json({ message: "Email already exists" });
      }
      user.email = email;
    }

    // Update fields
    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (position !== undefined) user.position = position;
    if (department !== undefined) user.department = department;
    if (team !== undefined) user.team = team;

    await user.save();

    const updatedUser = await User.findById(id).select("-password");

    return res.json({
      message: "User updated successfully",
      user: updatedUser
    });
  } catch (err) {
    console.error("updateUser error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// DEACTIVATE/ACTIVATE USER
export const deactivateUser = async (req, res) => {
  try {
    const companyId = req.user.company;
    const { id } = req.params;
    const { active } = req.body;

    if (!["superAdmin", "admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only admins can deactivate users" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.company.toString() !== companyId.toString()) {
      return res.status(403).json({ message: "Not allowed" });
    }

    // Prevent deactivating yourself
    if (id === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot deactivate your own account" });
    }

    user.active = active !== undefined ? active : !user.active;
    await user.save();

    return res.json({
      message: `User ${user.active ? 'activated' : 'deactivated'} successfully`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        active: user.active
      }
    });
  } catch (err) {
    console.error("deactivateUser error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// CHANGE USER ROLE
export const changeUserRole = async (req, res) => {
  try {
    const companyId = req.user.company;
    const { id } = req.params;
    const { role } = req.body;

    if (!["superAdmin", "admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only admins can change roles" });
    }

    if (!["employee", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.company.toString() !== companyId.toString()) {
      return res.status(403).json({ message: "Not allowed" });
    }

    // Prevent changing your own role
    if (id === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot change your own role" });
    }

    user.role = role;
    await user.save();

    return res.json({
      message: `User role updated to ${role}`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error("changeUserRole error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// GET USER BY ID
export const getUserById = async (req, res) => {
  try {
    const companyId = req.user.company;
    const { id } = req.params;

    const user = await User.findById(id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check permissions
    const isOwner = id === req.user._id.toString();
    const isAdmin = ["superAdmin", "admin"].includes(req.user.role);
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized to view this user" });
    }

    if (user.company.toString() !== companyId.toString()) {
      return res.status(403).json({ message: "Not allowed" });
    }

    return res.json(user);
  } catch (err) {
    console.error("getUserById error:", err);
    return res.status(500).json({ message: err.message });
  }
};