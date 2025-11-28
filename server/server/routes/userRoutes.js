import express from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import { createEmployee, getUsers, getMe } from "../controllers/userController.js";

const router = express.Router();

router.get("/", protect, adminOnly, getUsers);
router.post("/create-employee", protect, adminOnly, createEmployee);
router.get("/me", protect, getMe);

export default router;
