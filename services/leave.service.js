// services/leave.service.js
import prisma from "#prisma/prisma.js";
import { APPROVER_ROLES } from "#config/roles";
import { notifyUsers } from "./notification.service.js";
import { getPublicUrl } from "#utils/fileManager";

const approverSelect = { id: true, username: true, role: true, photoUrl: true };

export async function getApproversService() {
  return prisma.user.findMany({
    where: { role: { in: APPROVER_ROLES } },
    select: approverSelect,
    orderBy: { username: "asc" },
  });
}

export async function createLeaveService({
  userId,
  startDate,
  endDate,
  type,
  title,
  reason,
  approverIds,
  attachmentUrls,
  req, // dibutuhkan untuk getPublicUrl
}) {
  if (!approverIds || approverIds.length === 0) {
    throw new Error("Minimal pilih 1 approver");
  }
  if (!["CUTI", "IZIN"].includes(type)) {
    throw new Error("Tipe pengajuan tidak valid");
  }
  if (!title || !title.trim()) {
    throw new Error("Judul pengajuan wajib diisi");
  }
  if (!reason || !reason.trim()) {
    throw new Error("Alasan wajib diisi");
  }
  if (!startDate || !endDate) {
    throw new Error("Tanggal mulai dan selesai wajib diisi");
  }
  if (new Date(startDate) > new Date(endDate)) {
    throw new Error("Tanggal mulai tidak boleh setelah tanggal selesai");
  }

  const leave = await prisma.leave.create({
    data: {
      userId,
      startDate,
      endDate,
      type,
      title: title.trim(),
      reason: reason.trim(),
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
    leave.approvals.map((a) => a.approverId),
    {
      title: "Pengajuan Cuti Baru",
      body: `${actor?.username ?? "Karyawan"} mengajukan ${
        type === "CUTI" ? "cuti" : "izin"
      }: ${leave.title}`,
      imageUrl: getPublicUrl(req, actor?.photoUrl?.replace(/^\/?uploads\//, '')),
      data: { type: "leave_submitted", leaveId: String(leave.id) },
    }
  ).catch((err) =>
    console.error("NotifyUsers gagal:", err.message)
  );

  return leave;
}

export async function getMyLeavesService(userId) {
  return prisma.leave.findMany({
    where: { userId },
    include: {
      approvals: { include: { approver: { select: approverSelect } } },
    },
    orderBy: { startDate: "desc" },
  });
}