import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
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
  date: { 
    type: Date, 
    required: true 
  },
  clockIn: { 
    type: Date, 
    required: true 
  },
  clockOut: { 
    type: Date 
  },
  breaks: [{
    start: Date,
    end: Date,
    duration: Number // in minutes
  }],
  totalWorked: { 
    type: Number, 
    default: 0 
  }, // in minutes
  overtime: { 
    type: Number, 
    default: 0 
  }, // in minutes
  lateMinutes: { 
    type: Number, 
    default: 0 
  },
  status: {
    type: String,
    enum: ["present", "absent", "late", "half-day"],
    default: "present"
  },
  notes: String
}, { timestamps: true });

// Index for quick queries
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });
attendanceSchema.index({ company: 1, date: 1 });

// Pre-save middleware to calculate durations
attendanceSchema.pre("save", function(next) {
  // Calculate total worked minutes
  if (this.clockIn && this.clockOut) {
    const workedMs = this.clockOut - this.clockIn;
    this.totalWorked = Math.floor(workedMs / (1000 * 60)); // Convert to minutes
    
    // Subtract break durations
    if (this.breaks && this.breaks.length > 0) {
      const totalBreakMs = this.breaks.reduce((total, breakItem) => {
        if (breakItem.start && breakItem.end) {
          return total + (breakItem.end - breakItem.start);
        }
        return total;
      }, 0);
      
      const totalBreakMinutes = Math.floor(totalBreakMs / (1000 * 60));
      this.totalWorked = Math.max(0, this.totalWorked - totalBreakMinutes);
    }
  }
  
  // Calculate break durations
  if (this.breaks && this.breaks.length > 0) {
    this.breaks.forEach(breakItem => {
      if (breakItem.start && breakItem.end) {
        const breakMs = breakItem.end - breakItem.start;
        breakItem.duration = Math.floor(breakMs / (1000 * 60));
      }
    });
  }
  
  next();
});

export default mongoose.model("Attendance", attendanceSchema);