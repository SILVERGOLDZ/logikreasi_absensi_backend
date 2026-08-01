// services/overtime.service.js
import prisma from "#prisma/prisma.js";
import { APPROVER_ROLES } from "#config/roles";
import { notifyUsers } from "./notification.service.js";
import { getPublicUrl } from "#utils/fileManager";

const approverSelect = { id: true, username: true, role: true, photoUrl: true };

export async function getOvertimeApproversService() {
  return prisma.user.findMany({
    where: { role: { in: APPROVER_ROLES } },
    select: approverSelect,
    orderBy: { username: "asc" },
  });
}

export async function createOvertimeService({
  userId,
  isRange,
  startDate,
  endDate,
  startTime,
  endTime,
  title,
  reason,
  compensationType,
  approverIds,
  attachmentUrls,
  req, // dibutuhkan untuk getPublicUrl
}) {
  if (!approverIds || approverIds.length === 0) {
    throw new Error("Minimal pilih 1 approver");
  }
  if (!title || !title.trim()) {
    throw new Error("Judul pengajuan wajib diisi");
  }
  if (!reason || !reason.trim()) {
    throw new Error("Alasan wajib diisi");
  }
  if (!compensationType || !compensationType.trim()) {
    throw new Error("Jenis kompensasi wajib diisi");
  }
  if (!startDate) {
    throw new Error("Tanggal wajib diisi");
  }
  if (!startTime || !endTime) {
    throw new Error("Waktu mulai dan selesai wajib diisi");
  }

  const finalEndDate = isRange ? endDate : startDate;
  if (isRange && !finalEndDate) {
    throw new Error("Tanggal selesai wajib diisi untuk rentang tanggal");
  }
  if (new Date(startDate) > new Date(finalEndDate)) {
    throw new Error("Tanggal mulai tidak boleh setelah tanggal selesai");
  }

  const overtime = await prisma.overtime.create({
    data: {
      userId,
      isRange: !!isRange,
      startDate,
      endDate: finalEndDate,
      startTime,
      endTime,
      title: title.trim(),
      reason: reason.trim(),
      compensationType: compensationType.trim(),
      attachmentUrls: attachmentUrls || [],
      status: "pending",
      approvals: {
        create: approverIds.map(function (approverId) {
          return { approverId, status: "pending" };
        }),
      },
    },
    include: {
      approvals: { include: { approver: { select: approverSelect } } },
      user: { select: approverSelect },
    },
  });

  const actor = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true, photoUrl: true },
  });

  notifyUsers(
    overtime.approvals.map((a) => a.approverId),
    {
      title: "Pengajuan Lembur Baru",
      body: `${actor?.username ?? "Karyawan"} mengajukan lembur: ${overtime.title}`,
      imageUrl: getPublicUrl(req, actor?.photoUrl?.replace(/^\/?uploads\//, '')),
      data: { type: "overtime_submitted", overtimeId: String(overtime.id) },
    }
  ).catch((err) =>
    console.error("NotifyUsers gagal:", err.message)
  );

  return overtime;
}

export async function getMyOvertimesService(userId) {
  return prisma.overtime.findMany({
    where: { userId },
    include: {
      approvals: { include: { approver: { select: approverSelect } } },
    },
    orderBy: { startDate: "desc" },
  });
}