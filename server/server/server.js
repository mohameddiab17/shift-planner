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


app.get("/", (req, res) => {
  res.send("Shift Planner API running");
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 6000;

app.listen(PORT, () =>
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)
);



// Upcoming Features You Mentioned

// Shift swap request	New model: ShiftSwapRequest (pending/approved/rejected)
// Employee starts shift (punch in)	Shift state tracking (startedAt, endedAt)
// Employee takes break	breaks: [{ start, end }] array inside shift
// Admin sees employee live status	Redis/WebSockets or periodic status updates
// Weekly/monthly reports	Aggregation pipelines + optional caching
// Employee asks for day off	LeaveRequest model
// Admin approves/denies requests	Admin panel + event logs
// Notifications (email/push)	Event system or queue (later: Kafka, RabbitMQ)
// Shift calendar view on UI	API that returns calendar-friendly data