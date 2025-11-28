import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true,
      trim: true 
    },

    email: { 
      type: String, 
      required: true, 
      unique: true, 
      index: true,
      lowercase: true,
      trim: true 
    },

    password: { 
      type: String, 
      required: true,
      minlength: 6 
    },

    // UPDATED ROLES → superAdmin | admin | employee
    role: {
      type: String,
      enum: ["superAdmin", "admin", "employee"],
      default: "employee",
      index: true
    },

    // The company this user belongs to
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: function () {
        // superAdmin has no company
        return this.role !== "superAdmin";
      },
      index: true,
    },

    // Optional team assignment
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      default: null,
    },

    phone: { 
      type: String, 
      trim: true,
      default: ""
    },

    position: { 
      type: String, 
      trim: true,
      default: ""
    },

    department: { 
      type: String, 
      trim: true,
      default: ""
    },

    hireDate: { 
      type: Date,
      default: null
    },

    avatar: { 
      type: String,  // URL for profile picture
      default: null
    },

    active: { 
      type: Boolean, 
      default: true 
    },

    // Last login tracking
    lastLogin: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  next();
});

// Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Update last login method
userSchema.methods.updateLastLogin = async function () {
  this.lastLogin = new Date();
  await this.save();
};

// Virtual for full profile (optional)
userSchema.virtual('profile').get(function() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    phone: this.phone,
    position: this.position,
    department: this.department,
    hireDate: this.hireDate,
    avatar: this.avatar,
    active: this.active,
    company: this.company,
    team: this.team,
    lastLogin: this.lastLogin
  };
});

// Ensure virtual fields are serialized
userSchema.set('toJSON', { virtuals: true });

const User = mongoose.model("User", userSchema);
export default User;