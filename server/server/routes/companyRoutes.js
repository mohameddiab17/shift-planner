import express from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import Company from "../models/companyModel.js";

const router = express.Router();

router.get("/me", protect, async (req, res) => {
  const companyId = req.user.company;
  const company = await Company.findById(companyId);
  if (!company) return res.status(404).json({ message: "Company not found" });
  res.json(company);
});

export default router;
