process.env.UV_THREADPOOL_SIZE = "8";
import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import path from 'path';         
import { fileURLToPath } from 'url';
import { Server } from "socket.io";

import { authenticate } from "#middleware/authenticate";
import authRoute from "#routes/auth.route";
import attendanceRoute from "#routes/attendance.route";
import userRoute from "#routes/user.route";
import adminRoute from "#routes/admin.route"
import { initSocket } from "./socket/socket.js";
import { isAdmin } from "#middleware/auth.admin";
import announcementRoute from "#routes/announcement.route";
import holidayRoute from "#routes/holiday.route";
import leaveRoute from "#routes/leave.route";
import notificationRoute from "#routes/notification.route";
import overtimeRoute from "#routes/overtime.route";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const server = http.createServer(app);


// Socket init
const io = initSocket(server);

// RULES
app.use(cors({
  origin: true,

  credentials: true,
}));

app.use(express.json());

// ROUTES
app.use("/api/auth", authRoute);
app.use("/api", authenticate);
app.use("/api/attendance", attendanceRoute);
app.use("/api/announcement", announcementRoute);
app.use("/api/admin/holiday", isAdmin, holidayRoute);
app.use("/api/user", userRoute);
app.use("/api/leave", leaveRoute);
app.use("/api/overtime", overtimeRoute);
app.use("/api/admin", isAdmin, adminRoute);
app.use("/api/notification", notificationRoute);

// uploads

const attachmentFolders = ['leave-attachments', 'overtime-attachments'];

attachmentFolders.forEach((folder) => {
  app.use(
    `/uploads/${folder}`,
    express.static(path.join(__dirname, 'public/uploads', folder), {
      setHeaders: (res, filePath) => {
        const filename = path.basename(filePath);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      },
    })
  );
});

app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));


// MAIN
const PORT = process.env.PORT || 3001;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`🌐 Accessible via network: http://192.168.99.43:${PORT}`);
});