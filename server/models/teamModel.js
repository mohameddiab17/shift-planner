import mongoose from "mongoose";

const teamSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true, 
      trim: true 
    },

    // Team belongs to ONE company
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    // All members inside the team (employees only)
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

// Unique team name within the same company
teamSchema.index({ company: 1, name: 1 }, { unique: true });

const Team = mongoose.model("Team", teamSchema);
export default Team;
