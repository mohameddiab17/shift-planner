import mongoose from "mongoose";

const reportSchema = new mongoose.Schema({
  company: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Company", 
    required: true 
  },
  type: {
    type: String,
    enum: ["attendance", "overtime", "productivity", "summary", "custom"],
    required: true
  },
  period: {
    type: String,
    enum: ["daily", "weekly", "monthly", "yearly", "custom"],
    required: true
  },
  startDate: { 
    type: Date, 
    required: true 
  },
  endDate: { 
    type: Date, 
    required: true 
  },
  title: {
    type: String,
    required: true
  },
  data: { 
    type: mongoose.Schema.Types.Mixed, 
    required: true 
  }, // Flexible data structure for different report types
  generatedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  isAI: { 
    type: Boolean, 
    default: false 
  }, // For future AI reports
  shareable: {
    type: Boolean,
    default: false
  },
  sharedWith: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }]
}, { timestamps: true });

// Indexes for quick retrieval and filtering
reportSchema.index({ company: 1, type: 1, startDate: 1 });
reportSchema.index({ company: 1, generatedBy: 1 });
reportSchema.index({ company: 1, isAI: 1 });

// Virtual for report period display
reportSchema.virtual("periodDisplay").get(function() {
  const periodMap = {
    daily: "daily",
    weekly: "weekly", 
    monthly: "monthly",
    yearly: "yearly",
    custom: "custom"
  };
  return periodMap[this.period] || this.period;
});

// Method to check if report is shared with user
reportSchema.methods.isSharedWith = function(userId) {
  return this.sharedWith.includes(userId) || this.generatedBy.toString() === userId.toString();
};

export default mongoose.model("Report", reportSchema);