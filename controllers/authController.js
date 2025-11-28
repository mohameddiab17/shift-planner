import User from "../models/userModel.js";
import Company from "../models/companyModel.js";
import jwt from "jsonwebtoken";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/token.js";

// REGISTER SUPER ADMIN + COMPANY (First Setup)
export const registerCompany = async (req, res) => {
  try {
    const { companyName, name, email, password } = req.body;

    // Check duplicate email
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "Email already in use" });
    }

    // Create company
    const company = await Company.create({ name: companyName });

    // Create super admin of this company
    const superAdmin = await User.create({
      name,
      email,
      password,
      role: "superAdmin",
      company: company._id,
      active: true,
    });

    const accessToken = generateAccessToken(superAdmin);
    const refreshToken = generateRefreshToken(superAdmin);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    });

    return res.status(201).json({
      message: "Company Registered + Super Admin Created",
      accessToken,
      user: superAdmin,
      company,
    });
  } catch (err) {
    console.error("registerCompany error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// LOGIN (Any User: Super Admin, Admin, Employee)
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).populate("company");
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!user.active) {
      return res.status(403).json({ message: "User account is inactive" });
    }

    const match = await user.matchPassword(password);
    if (!match) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Set refresh token in cookies
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    });

    return res.json({
      message: "Logged in successfully",
      accessToken,
      user,
    });
  } catch (err) {
    console.error("loginUser error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// REFRESH TOKEN → NEW ACCESS TOKEN
export const refreshAccessToken = async (req, res) => {
  const token = req.cookies.refreshToken;

  if (!token) {
    return res.status(401).json({ message: "No refresh token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    if (!user.active) {
      return res.status(403).json({ message: "User account is inactive" });
    }

    const newAccessToken = generateAccessToken(user);

    return res.json({ accessToken: newAccessToken });
  } catch (err) {
    console.error("refreshAccessToken error:", err);
    return res.status(401).json({ message: "Refresh token expired or invalid" });
  }
};

// LOGOUT (Clear Refresh Token)
export const logoutUser = async (req, res) => {
  try {
    res.clearCookie("refreshToken");
    return res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("logoutUser error:", err);
    return res.status(500).json({ message: err.message });
  }
};
