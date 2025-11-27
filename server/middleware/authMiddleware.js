import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

export const protect = async (req, res, next) => {
  let token = req.headers.authorization?.split(" ")[1];

  if (!token)
    return res.status(401).json({ message: "Not authorized, no token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(401).json({ message: "User no longer exists" });

    req.user = user;

    next();

  } catch (err) {
    res.status(401).json({ message: "Not authorized, token failed" });
  }
};

// OWNER ONLY
export const ownerOnly = (req, res, next) => {
  if (req.user.role !== "owner")
    return res.status(403).json({ message: "Owners only" });
  next();
};

// ADMIN ONLY
export const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Admins only" });
  next();
};

// ADMIN OR OWNER
export const adminOrAbove = (req, res, next) => {
  if (!["owner", "admin"].includes(req.user.role))
    return res.status(403).json({ message: "Admin or above required" });
  next();
};

// TEAM LEADER OR ABOVE
export const teamLeaderOrAbove = (req, res, next) => {
  if (!["owner", "admin", "team_leader"].includes(req.user.role))
    return res.status(403).json({ message: "Team leader or above required" });
  next();
};
