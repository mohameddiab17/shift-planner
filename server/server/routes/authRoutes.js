import express from "express";
import {
  registerCompany,
  loginUser,
  refreshAccessToken,
  logoutUser,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/register", registerCompany);
router.post("/login", loginUser);
router.get("/refresh", refreshAccessToken);
router.post("/logout", logoutUser);

export default router;
