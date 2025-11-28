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

// SUPER ADMIN ONLY
export const superAdminOnly = (req, res, next) => {
  if (req.user.role !== "superAdmin")
    return res.status(403).json({ message: "Super Admins only" });
  next();
};

// ADMIN ONLY
export const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Admins only" });
  next();
};

// ADMIN OR SUPER ADMIN
export const adminOrAbove = (req, res, next) => {
  if (!["superAdmin", "admin"].includes(req.user.role))
    return res.status(403).json({ message: "Admin or above required" });
  next();
};

// EMPLOYEE OR ABOVE
export const employeeOrAbove = (req, res, next) => {
  if (!["superAdmin", "admin", "employee"].includes(req.user.role))
    return res.status(403).json({ message: "Employee or above required" });
  next();
};
