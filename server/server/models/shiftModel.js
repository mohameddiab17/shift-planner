import mongoose from "mongoose";

const shiftSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: false,
    },

    startDateTime: {
      type: Date,
      required: true,
    },
    endDateTime: {
      type: Date,
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["assigned", "started", "completed", "cancelled"],
      default: "assigned",
    },

    notes: { type: String },

    startedAt: Date,
    endedAt: Date,
    breaks: [
      {
        start: Date,
        end: Date,
      },
    ],
  },
  { timestamps: true }
);

// indexes to speed up overlap checks and queries per company
shiftSchema.index({ employee: 1, startDateTime: 1, endDateTime: 1 });
shiftSchema.index({ company: 1, startDateTime: 1 });
shiftSchema.index({ team: 1, startDateTime: 1 });

export default mongoose.model("Shift", shiftSchema);
