import Company from "../models/companyModel.js";
import User from "../models/userModel.js";

// GET COMPANY INFO (company_admin + employee)
export const getMyCompany = async (req, res) => {
  try {
    const companyId = req.user.company;

    if (!companyId) {
      return res.status(400).json({ message: "User has no company assigned" });
    }

    const company = await Company.findById(companyId);

    if (!company) return res.status(404).json({ message: "Company not found" });

    return res.json(company);
  } catch (err) {
    console.error("getMyCompany error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// UPDATE COMPANY (company_admin only)
export const updateCompany = async (req, res) => {
  try {
    const companyId = req.user.company;
    
    // Check if user is admin of this company
    if (!["superAdmin", "admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only company admin can update the company" });
    }

    const { name, address, metadata, billingEmail, billingCycle, plan } = req.body;

    // Build update object
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (metadata !== undefined) updateData.metadata = metadata;
    if (billingEmail !== undefined) updateData.billingEmail = billingEmail;
    if (billingCycle !== undefined) updateData.billingCycle = billingCycle;
    if (plan !== undefined) updateData.plan = plan;

    const updatedCompany = await Company.findByIdAndUpdate(
      companyId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedCompany) {
      return res.status(404).json({ message: "Company not found" });
    }

    return res.json({
      message: "Company updated successfully",
      company: updatedCompany
    });
  } catch (err) {
    console.error("updateCompany error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// SUPER ADMIN — GET ALL COMPANIES
export const getAllCompanies = async (req, res) => {
  try {
    if (req.user.role !== "superAdmin") {
      return res.status(403).json({ message: "Only super admin can access all companies" });
    }

    const { page = 1, limit = 10, search, active } = req.query;

    // Build query
    let query = {};
    
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    if (active !== undefined) {
      query.active = active === 'true';
    }

    const companies = await Company.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Company.countDocuments(query);

    // Get stats for each company
    const companiesWithStats = await Promise.all(
      companies.map(async (company) => {
        const employeeCount = await User.countDocuments({ 
          company: company._id, 
          role: "employee",
          active: true 
        });
        
        const adminCount = await User.countDocuments({ 
          company: company._id, 
          role: "admin",
          active: true 
        });

        return {
          ...company.toObject(),
          stats: {
            employees: employeeCount,
            admins: adminCount,
            totalUsers: employeeCount + adminCount
          }
        };
      })
    );

    return res.json({
      companies: companiesWithStats,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (err) {
    console.error("getAllCompanies error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// SUPER ADMIN — GET COMPANY BY ID
export const getCompanyById = async (req, res) => {
  try {
    if (req.user.role !== "superAdmin") {
      return res.status(403).json({ message: "Only super admin can access company details" });
    }

    const { id } = req.params;

    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    // Get company users
    const users = await User.find({ company: id })
      .select("name email role active createdAt")
      .sort({ createdAt: -1 });

    // Get company stats
    const stats = {
      totalUsers: users.length,
      activeUsers: users.filter(user => user.active).length,
      admins: users.filter(user => user.role === "admin").length,
      employees: users.filter(user => user.role === "employee").length
    };

    return res.json({
      company,
      users,
      stats
    });
  } catch (err) {
    console.error("getCompanyById error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// SUPER ADMIN — DEACTIVATE/ACTIVATE A COMPANY
export const deactivateCompany = async (req, res) => {
  try {
    if (req.user.role !== "superAdmin") {
      return res.status(403).json({ message: "Only super admin can deactivate companies" });
    }

    const { id } = req.params;
    const { active } = req.body;

    const company = await Company.findById(id);
    if (!company) return res.status(404).json({ message: "Company not found" });

    company.active = active !== undefined ? active : !company.active;
    await company.save();

    // Deactivate/activate all users inside company
    await User.updateMany({ company: id }, { active: company.active });

    return res.json({ 
      message: `Company ${company.active ? 'activated' : 'deactivated'} successfully`,
      company: {
        _id: company._id,
        name: company.name,
        active: company.active
      }
    });
  } catch (err) {
    console.error("deactivateCompany error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// SUPER ADMIN — DELETE COMPANY
export const deleteCompany = async (req, res) => {
  try {
    if (req.user.role !== "superAdmin") {
      return res.status(403).json({ message: "Only super admin can delete companies" });
    }

    const { id } = req.params;

    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    // Delete all users associated with this company
    await User.deleteMany({ company: id });

    // Delete the company
    await Company.findByIdAndDelete(id);

    return res.json({ 
      message: "Company and all associated users deleted successfully" 
    });
  } catch (err) {
    console.error("deleteCompany error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// GET COMPANY STATISTICS
export const getCompanyStatistics = async (req, res) => {
  try {
    const companyId = req.user.company;

    if (!["superAdmin", "admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only admins can view company statistics" });
    }

    // Get basic company info
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    // Get user statistics
    const userStats = await User.aggregate([
      {
        $match: { company: companyId }
      },
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
          active: { $sum: { $cond: ["$active", 1, 0] } }
        }
      }
    ]);

    // Get today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayAttendance = await require('../models/attendanceModel.js').default.aggregate([
      {
        $match: { 
          company: companyId,
          date: { $gte: today }
        }
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    // Get pending time off requests
    const pendingRequests = await require('../models/timeOffModel.js').default.countDocuments({
      company: companyId,
      status: "pending"
    });

    const stats = {
      company: {
        name: company.name,
        plan: company.plan,
        active: company.active,
        createdAt: company.createdAt
      },
      users: userStats.reduce((acc, stat) => {
        acc[stat._id] = { total: stat.count, active: stat.active };
        return acc;
      }, {}),
      todayAttendance: todayAttendance.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      pendingRequests
    };

    return res.json(stats);
  } catch (err) {
    console.error("getCompanyStatistics error:", err);
    return res.status(500).json({ message: err.message });
  }
};