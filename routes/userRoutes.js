import express from "express";
import { protect, adminOnly, adminOrAbove } from "../middleware/authMiddleware.js";
import { 
  getUsers, 
  createEmployee, 
  getMe, 
  updateUser, 
  deactivateUser, 
  changeUserRole,
  getUserById 
} from "../controllers/userController.js";

const router = express.Router();

// Admin routes
router.get("/", protect, adminOnly, getUsers);
router.post("/create-employee", protect, adminOrAbove, createEmployee);
router.get("/:id", protect, getUserById);
router.put("/:id", protect, updateUser);
router.patch("/:id/deactivate", protect, adminOnly, deactivateUser);
router.patch("/:id/role", protect, adminOnly, changeUserRole);

// User routes
router.get("/me", protect, getMe);

export default router;