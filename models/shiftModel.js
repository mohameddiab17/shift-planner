import mongoose from "mongoose";

const shiftSchema = new mongoose.Schema(
  {
    // The company this shift belongs to
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    // The employee assigned to the shift
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Optional team (employee may or may not belong to a team)
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      default: null,
    },

    // Start and end times of the shift
    startDateTime: {
      type: Date,
      required: true,
    },

    endDateTime: {
      type: Date,
      required: true,
    },

    // Admin who created the shift
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Shift status
    status: {
      type: String,
      enum: ["assigned", "started", "paused", "completed", "cancelled"],
      default: "assigned",
    },

    // Notes for admin or employee
    notes: { type: String },

    // Time tracking
    startedAt: Date,
    endedAt: Date,

    // Breaks → useful for real attendance
    breaks: [
      {
        start: Date,
        end: Date,
      },
    ],

    // Auto-calculated (future feature)
    totalWorkedMinutes: {
      type: Number,
      default: 0,
    },

    overtimeMinutes: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);


// Prevent overlapping shifts per employee
shiftSchema.index({
  employee: 1,
  startDateTime: 1,
  endDateTime: 1,
});

// Query all company shifts quickly
shiftSchema.index({
  company: 1,
  startDateTime: 1,
});

// Query team shifts quickly
shiftSchema.index({
  team: 1,
  startDateTime: 1,
});

const Shift = mongoose.model("Shift", shiftSchema);
export default Shift;
