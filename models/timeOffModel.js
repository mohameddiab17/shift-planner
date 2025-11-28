import mongoose from "mongoose";

const timeOffSchema = new mongoose.Schema({
  employee: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  company: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Company", 
    required: true 
  },
  type: {
    type: String,
    enum: ["annual", "sick", "unpaid", "emergency", "maternity"],
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
  duration: { 
    type: Number, 
    required: true 
  }, // in days
  reason: { 
    type: String, 
    required: true 
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  },
  approvedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  },
  approvedAt: Date,
  notes: String
}, { timestamps: true });

// Indexes for performance
timeOffSchema.index({ employee: 1, startDate: 1 });
timeOffSchema.index({ company: 1, status: 1 });
timeOffSchema.index({ company: 1, type: 1 });

// Pre-save middleware to calculate duration
timeOffSchema.pre("save", function(next) {
  if (this.startDate && this.endDate) {
    const timeDiff = this.endDate - this.startDate;
    const dayDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1; // Include both start and end days
    this.duration = dayDiff;
  }
  next();
});

// Static method to get pending requests count
timeOffSchema.statics.getPendingCount = async function(companyId) {
  return await this.countDocuments({ 
    company: companyId, 
    status: "pending" 
  });
};

export default mongoose.model("TimeOff", timeOffSchema);