import mongoose from "mongoose";

const teamSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true, 
      trim: true 
    },

    description: {
      type: String,
      trim: true,
      default: ""
    },

    // Team belongs to ONE company
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    // Team leader/admin (optional)
    teamLeader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    // All members inside the team (employees only)
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Team status
    active: {
      type: Boolean,
      default: true
    },

    // Team color for UI (optional)
    color: {
      type: String,
      default: "#3B82F6" // default blue color
    },

    // Team settings
    settings: {
      maxMembers: {
        type: Number,
        default: 20
      },
      allowSelfAssignment: {
        type: Boolean,
        default: false
      }
    }
  },
  { timestamps: true }
);

// Unique team name within the same company
teamSchema.index({ company: 1, name: 1 }, { unique: true });

// Index for team leader queries
teamSchema.index({ teamLeader: 1 });

// Index for active teams
teamSchema.index({ active: 1 });

// Virtual for members count
teamSchema.virtual('membersCount').get(function() {
  return this.members.length;
});

// Virtual for active members count
teamSchema.virtual('activeMembersCount').get(function() {
  // This would need population to calculate accurately
  return this.members.length; // Simplified version
});

// Method to check if user is team leader
teamSchema.methods.isTeamLeader = function(userId) {
  return this.teamLeader && this.teamLeader.toString() === userId.toString();
};

// Method to check if team has reached max members
teamSchema.methods.hasReachedMaxMembers = function() {
  return this.members.length >= this.settings.maxMembers;
};

// Static method to get teams by company
teamSchema.statics.findByCompany = function(companyId) {
  return this.find({ company: companyId, active: true })
    .populate('teamLeader', 'name email')
    .populate('members', 'name email role active')
    .sort({ name: 1 });
};

// Ensure virtual fields are serialized
teamSchema.set('toJSON', { virtuals: true });

const Team = mongoose.model("Team", teamSchema);
export default Team;