import prisma from "#prisma/prisma.js";
import { notifyAllUsers } from "./notification.service.js";

function toDateOnly(str) {
  // "yyyy-MM-dd" -> Date object (UTC, jam 00:00) untuk keperluan iterasi
  const [y, m, d] = str.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatDateOnly(date) {
  return date.toISOString().slice(0, 10); // yyyy-MM-dd
}

function generateDateRange(startDate, endDate) {
  const start = toDateOnly(startDate);
  const end = toDateOnly(endDate);

  if (end < start) {
    throw new Error("Tanggal akhir tidak boleh sebelum tanggal mulai");
  }

  const dates = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(formatDateOnly(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

// startDate wajib, endDate opsional (kalau tidak ada, sama dengan startDate -> single day)
export async function createHoliday({
  startDate,
  endDate,
  reason,
  title,
  content,
  createdById,
}) {
  const dates = generateDateRange(startDate, endDate || startDate);

  // Cek konflik: tanggal yang sudah jadi holiday aktif tidak boleh dibuat ulang
  const existing = await prisma.holiday.findMany({
    where: { date: { in: dates }, isCancelled: false },
    select: { date: true },
  });

  if (existing.length > 0) {
    const conflictDates = existing.map((e) => e.date).join(", ");
    throw new Error(
      `Tanggal berikut sudah menjadi hari libur: ${conflictDates}`,
    );
  }

  return prisma.$transaction(async (tx) => {
    const announcement = await tx.announcement.create({
      data: {
        title,
        content,
        status: "ACTIVE",
        createdById,
      },
      include: { createdBy: { select: { id: true, username: true } } },
    });

    await tx.holiday.createMany({
      data: dates.map((date) => ({
        date,
        reason,
        createdById,
        announcementId: announcement.id,
      })),
    });

    const holidays = await tx.holiday.findMany({
      where: { announcementId: announcement.id },
      orderBy: { date: "asc" },
    });

    notifyAllUsers({
      title: "Logikreasi memiliki Pengumuman Baru",
      body: announcement.title,
      data: { type: "announcement", announcementId: String(announcement.id)},
    }).catch((err) =>
        console.error("notifyAllUsers gagal:", err.message)
      );

    return {
      announcement: {
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        createdByName: announcement.createdBy?.username ?? "-",
        createdAt: announcement.createdAt,
        isRead: false,
      },
      holidays,
    };
  });
}

export async function cancelHoliday(id) {
  const holiday = await prisma.holiday.findUnique({
    where: { id: Number(id) },
  });
  if (!holiday) throw new Error("Data libur tidak ditemukan");
  if (holiday.isCancelled)
    throw new Error("Data libur sudah dibatalkan sebelumnya");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.holiday.update({
      where: { id: holiday.id },
      data: { isCancelled: true },
      include: { announcement: true },
    });

    if (updated.announcementId) {
      const remainingActive = await tx.holiday.count({
        where: { announcementId: updated.announcementId, isCancelled: false },
      });

      if (remainingActive === 0) {
        await tx.announcement.update({
          where: { id: updated.announcementId },
          data: { status: "CANCELLED" },
        });
      }
    }

    return {
      updated,
      date: holiday.date,
    };
  });
}

// List untuk halaman admin (management), bisa difilter per bulan
export async function listHolidays({ year, month }) {
  const where = {};
  if (year && month) {
    const prefix = `${year}-${String(month).padStart(2, "0")}`;
    where.date = { startsWith: prefix };
  }

  return prisma.holiday.findMany({
    where,
    include: {
      announcement: {
        select: { id: true, title: true, content: true, status: true },
      },
      createdBy: { select: { id: true, username: true } },
    },
    orderBy: { date: "asc" },
  });
}

// Dipakai oleh attendance.service (kalender publik) untuk ambil holiday aktif 1 bulan
export async function getHolidaysForMonth(year, month) {
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  return prisma.holiday.findMany({
    where: { 
      date: { 
        startsWith: prefix 
      },
      isCancelled: false, 
    }, // termasuk yang cancelled, biar UI bisa coret
    orderBy: { date: "asc" },
  });
}
