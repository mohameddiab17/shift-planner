import User from "../models/userModel.js";
import Company from "../models/companyModel.js";
import jwt from "jsonwebtoken";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/token.js";

// REGISTER A COMPANY + ADMIN
export const registerCompany = async (req, res) => {
  try {
    const { companyName, name, email, password } = req.body;

    const company = await Company.create({ name: companyName });

    const admin = await User.create({
      name,
      email,
      password,
      role: "admin",
      company: company._id,
    });

    const accessToken = generateAccessToken(admin);
    const refreshToken = generateRefreshToken(admin);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    });

    res.status(201).json({
      message: "Company & Admin registered",
      accessToken,
      user: admin,
      company,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// LOGIN (Admin or Employee)
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).populate("company");
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const match = await user.matchPassword(password);
    if (!match) return res.status(400).json({ message: "Invalid credentials" });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    });

    res.json({
      accessToken,
      user,
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// REFRESH TOKEN → Return NEW access token
export const refreshAccessToken = async (req, res) => {
  const token = req.cookies.refreshToken;

  if (!token) return res.status(401).json({ message: "No refresh token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: "Invalid refresh token" });

    const newAccessToken = generateAccessToken(user);

    res.json({ accessToken: newAccessToken });

  } catch (err) {
    return res.status(401).json({ message: "Refresh token expired or invalid" });
  }
};


// LOGOUT
export const logoutUser = async (req, res) => {
  res.clearCookie("refreshToken");
  res.json({ message: "Logged out" });
};
