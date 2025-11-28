import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    address: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Company = mongoose.model("Company", companySchema);
export default Company;
