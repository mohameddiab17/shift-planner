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

    phone: { type: String, trim: true },

    active: { type: Boolean, default: true },
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

const User = mongoose.model("User", userSchema);
export default User;
