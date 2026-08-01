import prisma from "#prisma/prisma.js";
import { formatInTimeZone } from "date-fns-tz";
import { getHolidaysForMonth } from "#services/holiday.service";

const TIMEZONE = "Asia/Jakarta";
const WORK_START_HOUR = 9;   // Jam mulai kerja
const WORK_START_MINUTE = 0;

// cek hari apa
const dayIndex = Number(
  formatInTimeZone(
    new Date(),
    "Asia/Jakarta",
    "i",
  )
);

const WORK_END_HOUR = dayIndex === 6? 15 : 17;

function getTodayDate() {
  const today = formatInTimeZone(new Date(), TIMEZONE, "yyyy-MM-dd");
  return today;
}

function isLate(now) {
  const hour = parseInt(formatInTimeZone(now, TIMEZONE, "HH"));
  const minute = parseInt(formatInTimeZone(now, TIMEZONE, "mm"));

  if (hour > WORK_START_HOUR) return true;
  if (hour === WORK_START_HOUR && minute > WORK_START_MINUTE) return true;
  
  return false;
}

export function getStatus(userId, today) {
  return prisma.attendance.findUnique({
    where: {
      userId_date: { userId, date: today },
    },
  });
}

export async function clockIn(userId, clockInSelfieUrl, today) {
  // const today = getTodayDate();
  const now = new Date();

  const isHoliday = await prisma.holiday.findFirst({
    where: {
      date: today,
      isCancelled: false
    },
      orderBy: {
      createdAt: "desc",
    },
  });

  if (isHoliday) throw new Error("Hari ini Libur");

  const attendance = await prisma.attendance.findUnique({
    where: { userId_date: { userId, date: today } },
  });

  // if (!attendance) throw new Error("Attendance hari ini tidak ditemukan");
  if (attendance?.clockIn) throw new Error("Anda sudah clock in");
  if (attendance?.status == 'CUTI') throw new Error("Bukankah anda sedang cuti?")

  const status = isLate(now) ? "TERLAMBAT" : "HADIR";

  return prisma.attendance.upsert({
  where: {
    userId_date: {
      userId,
      date: today,
    },
  },
  update:{
    status,
    clockIn: now,
    clockInSelfieUrl,
  },
  create:{
    userId: userId,
    date: today,
    clockIn: now,
    clockInSelfieUrl,
    status

  },
  // data: {
  //   clockIn: now,
  //   status,
  //   clockInSelfieUrl,
  // },
  include: {
    user: {
      select: {
        id: true,
        username: true,
        photoUrl: true,
        role: true,
      },
    },
  },
});
}

export async function clockOut(userId, reason, selfieUrl, today) {
  // const today = getTodayDate();
  const now = new Date();
  
  // Cek early clock out
  if (now < WORK_END_HOUR && !reason) {
    throw new Error("EARLY_CLOCK_OUT");
  }

  const attendance = await prisma.attendance.findUnique({
    where: { userId_date: { userId, date: today } },
  });

  if (!attendance) throw new Error("Attendance hari ini tidak ditemukan");
  if (!attendance.clockIn) throw new Error("Silakan clock in terlebih dahulu");
  if (attendance.clockOut) throw new Error("Anda sudah melakukan clock out");

  return prisma.attendance.update({
    where: { userId_date: { userId, date: today } },
    data: {
      clockOut: now,
      reason: reason,
      clockOutSelfieUrl: selfieUrl,
    },
    include: {
    user: {
      select: {
        id: true,
        username: true,
        photoUrl: true,
      },
    },
  },
  });
}

export async function getWorkingNow() {
  const today = getTodayDate();

  return prisma.attendance.findMany({
    where: {
      date: today,
      clockIn: {
        not: null,
      },
      clockOut: null,
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          photoUrl: true,
          role: true,
        },
      },
    },
  });
}


export async function getPresentEmployees({ search = '', page = 1, limit = 10, date }) {
  const targetDate = date || getTodayDate();
  const skip = (page - 1) * limit;

  // Tanggal di masa depan pasti belum ada yang hadir
  if (targetDate > getTodayDate()) {
    return { data: [], total: 0, page, limit, totalPages: 1 };
  }

  const where = {
    date: targetDate,
    clockIn: { not: null },
    ...(search
      ? {
          user: {
            OR: [
              { username: { contains: search, mode: 'insensitive' } },
              { role: { contains: search, mode: 'insensitive' } },
            ],
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.attendance.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, photoUrl: true, role: true } },
      },
      orderBy: { user: { username: 'asc' } },
      skip,
      take: limit,
    }),
    prisma.attendance.count({ where }),
  ]);

  return {
    data: rows.map((r) => r.user),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export async function getAbsentEmployees({ search = '', page = 1, limit = 10, date }) {
  const targetDate = date || getTodayDate();
  const skip = (page - 1) * limit;

  // Tanggal di masa depan: semua orang "belum absen", bukan "tidak hadir" -> kosongkan
  if (targetDate > getTodayDate()) {
    return { data: [], total: 0, page, limit, totalPages: 1 };
  }

  const where = {
    AND: [
      search
        ? {
            OR: [
              { username: { contains: search, mode: 'insensitive' } },
              { role: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {},
      {
        OR: [
          { attendance: { none: { date: targetDate } } },
          { attendance: { some: { date: targetDate, clockIn: null } } },
        ],
      },
    ],
  };

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { id: true, username: true, photoUrl: true, role: true },
      orderBy: { username: 'asc' },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

//data untuk kalender 1 bulan (holiday + karyawan cuti/izin)
export async function getCalendarData({ year, month }, userId) {
  const monthStr = String(month).padStart(2, "0");
  const prefix = `${year}-${monthStr}`;

  const [holidays, leaveAttendance] = await Promise.all([
    getHolidaysForMonth(year, month),
    prisma.attendance.findMany({
      where: {
        userId: userId,
        date: { startsWith: prefix },
        status: { in: ["CUTI", "IZIN"] },
      },
      include: {
        user: { select: { id: true, username: true, photoUrl: true, role: true } },
      },
      orderBy: { date: "asc" },
    }),
  ]);

  const days = {};

  for (const h of holidays) {
    days[h.date] = days[h.date] || { holiday: null, leaves: [] };
    days[h.date].holiday = {
      id: h.id,
      reason: h.reason,
      isCancelled: h.isCancelled,
    };
  }

  for (const a of leaveAttendance) {
    days[a.date] = days[a.date] || { holiday: null, leaves: [] };
    days[a.date].leaves.push({
      userId: a.user.id,
      username: a.user.username,
      photoUrl: a.user.photoUrl,
      role: a.user.role,
      status: a.status, // CUTI | IZIN
      reason: a.reason,
    });
  }

  return { year: Number(year), month: Number(month), days };
}

