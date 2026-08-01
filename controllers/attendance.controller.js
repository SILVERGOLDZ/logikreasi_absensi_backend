import { formatInTimeZone } from "date-fns-tz";

import {
  getStatus,
  clockIn,
  clockOut,
  getWorkingNow,
  getPresentEmployees,
  getAbsentEmployees,
} from "#services/attendance.service";

import { getCalendarData } from "#services/attendance.service";

import { getIO } from "../socket/socket.js";

const TIMEZONE = 'Asia/Jakarta';

const ID_DAYS = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
  "Minggu",
];

function getTodayDate() {
  const today = formatInTimeZone(new Date(), TIMEZONE, "yyyy-MM-dd");
  return today;
}


export async function statusController(req, res) {
  const today = getTodayDate();
  try {
    const attendance = await getStatus(req.user.id, today);

    const dayIndex = Number(formatInTimeZone(new Date(), TIMEZONE, "i"));

    let work_time_interval = "Jam Kerja: 09:00 - 17:00";
    if (dayIndex === 6) work_time_interval = "Jam Kerja: 09:00 - 15:00"; // Sabtu
    if (dayIndex === 7) work_time_interval = "Libur"; // Minggu

    if (attendance) {
      return res.json({
        day: ID_DAYS[dayIndex],
        date: attendance.date,
        work_time_interval: work_time_interval,
        status: attendance.status,
        clockIn: attendance.clockIn,
        clockOut: attendance.clockOut,
      })
    }

    return res.json({
        day: ID_DAYS[dayIndex],
        date: today,
        work_time_interval: work_time_interval,
        status: "BELUM ABSEN",
        clockIn: null,
        clockOut: null,
      });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function clockInController(req, res) {
  const today = getTodayDate();

  try {
    if (!req.file) {
      return res.status(400).json({ error: "Selfie wajib diunggah" });
    }

    const userId = req.user.id;
    const filename = req.file.filename;
    const clockInSelfieUrl = `/uploads/selfies/${userId}/${filename}`;

    const attendance = await clockIn(req.user.id, clockInSelfieUrl, today);

    getIO().emit("attendanceChanged", {
      action: "clockIn",
      userId: attendance.user.id,
      username: attendance.user.username,
      photoUrl: attendance.user.photoUrl,
      role: attendance.user.role,
    });

    res.json({
      message: "Berhasil Clock In",
      clockIn: attendance.clockIn,
      status: attendance.status,
      selfieUrl: attendance.clockInSelfieUrl,
    });
  } catch (err) {
    console.log("error: ", err);
    res.status(400).json({ error: err.message });
  }
}

export async function clockOutController(req, res) {
  const today = getTodayDate();
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "Selfie wajib diunggah",
      });
    }

    const selfieUrl = `/uploads/selfies/${req.user.id}/${req.file.filename}`;

    const attendance = await clockOut(req.user.id, req.body.reason, selfieUrl, today);

    getIO().emit("attendanceChanged", {
      action: "clockOut",
      userId: attendance.user.id,
    });

    res.json({
      message: "Berhasil Clock Out",
      clockOut: attendance.clockOut,
      status: attendance.status,
      clockOutSelfieUrl: attendance.clockOutSelfieUrl,
    });
  } catch (err) {
    if (err.message === "EARLY_CLOCK_OUT") {
      return res.status(409).json({
        code: "EARLY_CLOCK_OUT",
        message: "Mengapa Anda clock out lebih awal?",
      });
    }

    console.log(err);
    res.status(400).json({ error: err.message });
  }
}

export async function getWorkingController(req, res) {
  const data = await getWorkingNow();

  res.json(
    data.map((e) => ({
      userId: e.user.id,
      username: e.user.username,
      photoUrl: e.user.photoUrl,
      role: e.user.role,
    })),
  );
}

export async function getPresentController(req, res) {
  try {
    const { search = '', page = 1, limit = 10, date } = req.query;
    const result = await getPresentEmployees({
      search: String(search),
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 10,
      date: date ? String(date) : undefined,
    });
    res.status(200).json(result);
  } catch (err) {
    console.error("Gagal ambil karyawan hadir:", err);
    res.status(500).json({ message: "Gagal mengambil data karyawan hadir" });
  }
}

export async function getAbsentController(req, res) {
  try {
    const { search = '', page = 1, limit = 10, date } = req.query;
    const result = await getAbsentEmployees({
      search: String(search),
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 10,
      date: date ? String(date) : undefined,
    });
    res.status(200).json(result);
  } catch (err) {
    console.error("Gagal ambil karyawan tidak hadir:", err);
    res.status(500).json({ message: "Gagal mengambil data karyawan tidak hadir" });
  }
}

export async function getCalendarController(req, res) {
  try {
    const { year, month } = req.query;
    const userId = req.user.id;
    if (!year || !month) {
      return res.status(400).json({ error: "year dan month wajib diisi" });
    }
    const result = await getCalendarData({ year: Number(year), month: Number(month) }, userId);
    res.json(result);
  } catch (err) {
    console.error("Gagal ambil data kalender:", err);
    res.status(500).json({ error: "Gagal mengambil data kalender" });
  }
}