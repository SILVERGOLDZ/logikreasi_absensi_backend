import {
  manualClockInService,
  manualClockOutService,
  getAttendanceStatusService,
} from "#services/admin/attendance.service";
import { getIO } from "#socket/socket";

export async function getAttendanceStatusController(req, res) {
  try {
    const { userId, date } = req.query;
    if (!userId || !date) {
      return res.status(400).json({ message: "userId dan date wajib diisi" });
    }
    const attendance = await getAttendanceStatusService({
      userId: Number(userId),
      date: String(date),
    });
    res.json(attendance);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

export async function manualClockInController(req, res) {
  try {
    const { userId, date, status, reason } = req.body;
    const attendance = await manualClockInService({
      userId: Number(userId),
      date,
      status,
      reason,
    });

    getIO().emit("attendanceChanged", {
      action: "clockIn",
      userId: attendance.user.id,
      username: attendance.user.username,
      photoUrl: attendance.user.photoUrl,
      role: attendance.user.role,
    });

    res.json({ message: "Clock in manual berhasil", attendance });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

export async function manualClockOutController(req, res) {
  try {
    const { userId, date } = req.body;
    const attendance = await manualClockOutService({
      userId: Number(userId),
      date,
    });

    getIO().emit("attendanceChanged", {
      action: "clockOut",
      userId: attendance.user.id,
      username: attendance.user.username,
      photoUrl: attendance.user.photoUrl,
      role: attendance.user.role,
    });

    res.json({ message: "Clock out manual berhasil", attendance });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}