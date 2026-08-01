// services/admin/overtime.service.js
import prisma from "#prisma/prisma.js";
import { notifyUser } from "#services/notification.service";
import { getIO } from "#socket/socket";
import { getPublicUrl } from "#utils/fileManager";

const approverSelect = { id: true, username: true, role: true, photoUrl: true };

const overtimeInclude = {
  user: { select: approverSelect },
  approvals: { include: { approver: { select: approverSelect } } },
};

export async function getPendingOvertimeApprovalsService(approverId) {
  const rows = await prisma.overtimeApproval.findMany({
    where: { approverId, status: "pending", overtime: { status: "pending" } },
    include: { overtime: { include: overtimeInclude } },
    orderBy: { id: "desc" },
  });
  return rows.map(function (r) {
    return r.overtime;
  });
}

export async function getOvertimeApprovalHistoryService(approverId) {
  const rows = await prisma.overtimeApproval.findMany({
    where: { approverId, NOT: { status: "pending" } },
    include: { overtime: { include: overtimeInclude } },
    orderBy: { approvedAt: "desc" },
  });
  return rows.map(function (r) {
    return r.overtime;
  });
}

function getDateRange(startDate, endDate) {
  const dates = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const yyyy = current.getUTCFullYear();
    const mm = String(current.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(current.getUTCDate()).padStart(2, "0");
    dates.push(`${yyyy}-${mm}-${dd}`);
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

// ASUMSI: Attendance.status diisi string bebas seperti pada leave (status: leave.type).
// Untuk lembur dipakai value tetap "LEMBUR". Sesuaikan kalau Attendance.status pakai enum
// (lihat catatan di prisma/overtime.prisma).
async function syncApprovedOvertimeToAttendance(overtime) {
  const dates = getDateRange(overtime.startDate, overtime.endDate);
  const reasonText = `${overtime.title} (${overtime.startTime}-${overtime.endTime}, ${overtime.compensationType})`;

  await Promise.all(
    dates.map(function (dateStr) {
      return prisma.attendance.upsert({
        where: { userId_date: { userId: overtime.userId, date: dateStr } },
        update: { status: "LEMBUR", reason: reasonText },
        create: {
          userId: overtime.userId,
          date: dateStr,
          status: "LEMBUR",
          reason: reasonText,
        },
      });
    })
  );
}

async function recalculateOvertimeStatus(overtimeId) {
  const overtime = await prisma.overtime.findUnique({
    where: { id: overtimeId },
    include: { approvals: true },
  });

  const hasRejected = overtime.approvals.some(function (a) {
    return a.status === "rejected";
  });
  const allApproved = overtime.approvals.every(function (a) {
    return a.status === "approved";
  });

  const newStatus = hasRejected ? "rejected" : allApproved ? "approved" : "pending";

  if (newStatus !== overtime.status) {
    await prisma.overtime.update({
      where: { id: overtimeId },
      data: { status: newStatus },
    });

    if (newStatus === "approved") {
      await syncApprovedOvertimeToAttendance(overtime);
    }
  }

  return prisma.overtime.findUnique({
    where: { id: overtimeId },
    include: overtimeInclude,
  });
}

function emitOvertimeChanged(overtime) {
  const io = getIO();
  if (!io) return;
  io.emit("overtimeStatusChanged", {
    overtimeId: overtime.id,
    status: overtime.status,
    approvedCount: overtime.approvals.filter(function (a) {
      return a.status === "approved";
    }).length,
    totalApprovers: overtime.approvals.length,
  });
}

export async function approveOvertimeService({ overtimeId, approverId, note, req }) {
  await prisma.overtimeApproval.update({
    where: { overtimeId_approverId: { overtimeId, approverId } },
    data: { status: "approved", note, approvedAt: new Date() },
  });

  const overtime = await recalculateOvertimeStatus(overtimeId);
  emitOvertimeChanged(overtime);

  const approver = await prisma.user.findUnique({
    where: { id: approverId },
    select: { username: true, photoUrl: true },
  });

  notifyUser(overtime.userId, {
    title: "Lembur Disetujui",
    body: `${approver?.username ?? "Approver"} menyetujui pengajuan lembur kamu.`,
    imageUrl: getPublicUrl(req, approver?.photoUrl?.replace(/^\/?uploads\//, '')),
    data: { type: "overtime_approved", overtimeId: String(overtime.id) },
  }).catch((err) =>
    console.error("notifyUsers gagal:", err.message)
  );

  return overtime;
}

export async function rejectOvertimeService({ overtimeId, approverId, note, req }) {
  await prisma.overtimeApproval.update({
    where: { overtimeId_approverId: { overtimeId, approverId } },
    data: { status: "rejected", note, approvedAt: new Date() },
  });

  const overtime = await recalculateOvertimeStatus(overtimeId);
  emitOvertimeChanged(overtime);

  const approver = await prisma.user.findUnique({
    where: { id: approverId },
    select: { username: true, photoUrl: true },
  });

  notifyUser(overtime.userId, {
    title: "Lembur Ditolak",
    body: `${approver?.username ?? "Approver"} menolak pengajuan lembur kamu.`,
    imageUrl: getPublicUrl(req, approver?.photoUrl?.replace(/^\/?uploads\//, '')),
    data: { type: "overtime_rejected", overtimeId: String(overtime.id) },
  }).catch((err) =>
    console.error("notifyUsers gagal:", err.message)
  );

  return overtime;
}