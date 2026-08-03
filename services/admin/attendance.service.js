import prisma from "#prisma/prisma.js";

const ATTENDANCE_STATUSES = [
  "HADIR", "TERLAMBAT", "ABSEN", "SAKIT",
  "CUTI", "IZIN", "LIBUR", "BELUM_ABSEN", "LEMBUR",
];

const userSelect = { id: true, username: true, photoUrl: true, role: true };

export async function getAttendanceStatusService({ userId, date }) {
  if (!userId || !date) throw new Error("userId dan date wajib diisi");
  return prisma.attendance.findUnique({
    where: { userId_date: { userId, date } },
  });
}

export async function manualClockInService({ userId, date, status, reason }) {
  if (!userId) throw new Error("Karyawan wajib dipilih");
  if (!date) throw new Error("Tanggal wajib diisi");
  if (!status || !ATTENDANCE_STATUSES.includes(status)) {
    throw new Error("Status tidak valid");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Karyawan tidak ditemukan");

  const existing = await prisma.attendance.findUnique({
    where: { userId_date: { userId, date } },
  });

  if (existing?.clockIn) {
    throw new Error("Karyawan sudah memiliki clock in pada tanggal ini");
  }

  return prisma.attendance.upsert({
    where: { userId_date: { userId, date } },
    update: {
      status,
      clockIn: new Date(),
      clockInSelfieUrl: "ClockIn Manual",
      reason: reason || null,
    },
    create: {
      userId,
      date,
      status,
      clockIn: new Date(),
      clockInSelfieUrl: "ClockIn Manual",
      reason: reason || null,
    },
    include: { user: { select: userSelect } },
  });
}

export async function manualClockOutService({ userId, date }) {
  if (!userId) throw new Error("Karyawan wajib dipilih");
  if (!date) throw new Error("Tanggal wajib diisi");

  const attendance = await prisma.attendance.findUnique({
    where: { userId_date: { userId, date } },
  });

  if (!attendance) throw new Error("Data attendance tidak ditemukan untuk tanggal ini");
  if (!attendance.clockIn) throw new Error("Karyawan belum melakukan clock in pada tanggal ini");
  if (attendance.clockOut) throw new Error("Karyawan sudah melakukan clock out pada tanggal ini");

  return prisma.attendance.update({
    where: { userId_date: { userId, date } },
    data: {
      clockOut: new Date(),
      clockOutSelfieUrl: "ClockOut Manual",
    },
    include: { user: { select: userSelect } },
  });
}