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

    // Company legal information
    legalName: {
      type: String,
      trim: true,
      default: ""
    },

    // Contact information
    email: {
      type: String,
      trim: true,
      lowercase: true
    },

    phone: {
      type: String,
      trim: true
    },

    website: {
      type: String,
      trim: true
    },

    // Location information
    address: { 
      type: String, 
      trim: true 
    },

    city: {
      type: String,
      trim: true
    },

    country: {
      type: String,
      trim: true,
      default: "Egypt"
    },

    // Company logo
    logo: {
      type: String, // URL for company logo
      default: null
    },

    // Company industry/sector
    industry: {
      type: String,
      trim: true,
      default: ""
    },

    // Company size
    size: {
      type: String,
      enum: ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"],
      default: "1-10"
    },

    // Company settings
    settings: {
      timezone: {
        type: String,
        default: "Africa/Cairo"
      },
      currency: {
        type: String,
        default: "EGP"
      },
      language: {
        type: String,
        default: "ar"
      },
      dateFormat: {
        type: String,
        default: "DD/MM/YYYY"
      },
      timeFormat: {
        type: String,
        enum: ["12h", "24h"],
        default: "24h"
      },
      weekStart: {
        type: String,
        enum: ["sunday", "monday"],
        default: "sunday"
      }
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
    billingEmail: { 
      type: String, 
      trim: true 
    },

    billingCycle: { 
      type: String, 
      enum: ["monthly", "yearly"],
      default: "monthly"
    },

    // Subscription management
    subscription: {
      status: {
        type: String,
        enum: ["active", "canceled", "past_due", "unpaid"],
        default: "active"
      },
      currentPeriodStart: Date,
      currentPeriodEnd: Date,
      cancelAtPeriodEnd: {
        type: Boolean,
        default: false
      }
    }
  },
  { timestamps: true }
);

// Index for active companies
companySchema.index({ active: 1 });

// Index for search by industry
companySchema.index({ industry: 1 });

// Index for subscription status
companySchema.index({ "subscription.status": 1 });

// Virtual for company display name
companySchema.virtual('displayName').get(function() {
  return this.legalName || this.name;
});

// Virtual for subscription status
companySchema.virtual('isSubscriptionActive').get(function() {
  return this.subscription.status === "active" && 
         (!this.subscription.currentPeriodEnd || 
          this.subscription.currentPeriodEnd > new Date());
});

// Method to check if company can add more users
companySchema.methods.canAddUser = function() {
  const planLimits = {
    free: 10,
    pro: 50,
    enterprise: 1000
  };
  
  // This would need actual user count from database
  return true; // Simplified for now
};

// Method to get company settings with defaults
companySchema.methods.getSettings = function() {
  const defaultSettings = {
    timezone: "Africa/Cairo",
    currency: "EGP", 
    language: "ar",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "24h",
    weekStart: "sunday"
  };

  return { ...defaultSettings, ...this.settings };
};

// Static method to get active companies
companySchema.statics.getActiveCompanies = function() {
  return this.find({ active: true })
    .select('name email phone industry size plan subscription.status')
    .sort({ name: 1 });
};

// Static method to find companies by industry
companySchema.statics.findByIndustry = function(industry) {
  return this.find({ 
    industry: new RegExp(industry, 'i'),
    active: true 
  });
};

// Ensure virtual fields are serialized
companySchema.set('toJSON', { virtuals: true });

const Company = mongoose.model("Company", companySchema);
export default Company;