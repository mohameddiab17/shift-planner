import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import teamRoutes from "./routes/teamRoutes.js";
import shiftRoutes from "./routes/shiftRoutes.js";
import companyRoutes from "./routes/companyRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import timeOffRoutes from "./routes/timeOffRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";

import { notFound, errorHandler } from "./middleware/errorMiddleware.js";

dotenv.config();
connectDB();

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);      
app.use("/api/users", userRoutes);      
app.use("/api/companies", companyRoutes);
app.use("/api/teams", teamRoutes);     
app.use("/api/shifts", shiftRoutes);   
app.use("/api/attendance", attendanceRoutes);
app.use("/api/timeoff", timeOffRoutes);
app.use("/api/reports", reportRoutes);

app.get("/", (req, res) => {
  res.send("ShiftMind API Running - Smart Workforce Management System");
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () =>
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`)
);


// 🎯 Upcoming Features - ShiftMind Roadmap

// 🔄 Shift Swap System
// Employee requests shift swap → ShiftSwapRequest model (pending/approved/rejected)
// Auto-match available employees → AI-powered matching algorithm
// Manager approval workflow → Notifications + quick actions

// 📱 Real-time Employee Status  
// Live clock-in/out tracking → WebSockets for real-time updates
// Break status monitoring → Live dashboard for managers
// Location-based attendance → Optional GPS verification

// 📊 Advanced Analytics
// Predictive scheduling → AI forecasts busy periods
// Employee performance insights → Productivity scoring
// Cost optimization reports → Overtime vs hiring analysis

// 🔔 Smart Notifications
// Automated reminders → Shift reminders via email/SMS
// Approval workflows → Manager notifications for requests
// System alerts → Anomaly detection (high overtime, frequent absences)

// 🎨 Enhanced UI/UX
// Drag & drop scheduling → Interactive calendar interface
// Mobile-first design → PWA for mobile devices
// Dark mode support → Better user experience

// 💰 Billing & Subscription
// Multi-tier plans → Free, Pro, Enterprise
// Usage analytics → Track feature utilization
// Invoice management → Automated billing system

// 🔐 Advanced Security
// Role-based permissions → Granular access control
// Audit logs → Track all system changes
// Data encryption → Enhanced security measures

// 🤖 AI Features
// Auto-schedule generator → AI creates optimal schedules
// HR insights assistant → LLM-powered analysis and reports
// Predictive staffing → Forecast staffing needs based on historical data