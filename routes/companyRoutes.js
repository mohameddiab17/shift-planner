import express from "express";
import { protect, adminOnly, superAdminOnly } from "../middleware/authMiddleware.js";
import {
  getMyCompany,
  updateCompany,
  getAllCompanies,
  getCompanyById,
  deactivateCompany,
  deleteCompany,
  getCompanyStatistics
} from "../controllers/companyController.js";

const router = express.Router();

// Company admin routes
router.get("/me", protect, getMyCompany);
router.put("/", protect, adminOnly, updateCompany);
router.get("/statistics", protect, adminOnly, getCompanyStatistics);

// Super admin only routes
router.get("/all", protect, superAdminOnly, getAllCompanies);
router.get("/:id", protect, superAdminOnly, getCompanyById);
router.patch("/:id/deactivate", protect, superAdminOnly, deactivateCompany);
router.delete("/:id", protect, superAdminOnly, deleteCompany);

export default router;