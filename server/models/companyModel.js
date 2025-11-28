import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    // Company name (unique across system)
    name: { 
      type: String, 
      required: true, 
      unique: true,
      trim: true 
    },

    // Optional info
    address: { 
      type: String, 
      trim: true 
    },

    // Optional metadata (industry, settings…)
    metadata: { 
      type: mongoose.Schema.Types.Mixed, 
      default: {} 
    },

    // Company status
    active: { 
      type: Boolean, 
      default: true 
    },

    // Company subscription plan (future feature)
    plan: {
      type: String,
      enum: ["free", "pro", "enterprise"],
      default: "free"
    },

    // Billing-related fields (optional future features)
    billingEmail: { type: String, trim: true },
    billingCycle: { 
      type: String, 
      enum: ["monthly", "yearly"],
      default: "monthly"
    },
  },
  { timestamps: true }
);

const Company = mongoose.model("Company", companySchema);
export default Company;
