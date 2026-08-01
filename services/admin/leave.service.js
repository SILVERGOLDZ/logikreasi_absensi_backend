// services/admin/leave.service.js
import prisma from "#prisma/prisma.js";
import { notifyUser } from "#services/notification.service";
import { getIO } from "#socket/socket";
import { getPublicUrl } from "#utils/fileManager";

const approverSelect = { id: true, username: true, role: true, photoUrl: true };

const leaveInclude = {
  user: { select: approverSelect },
  approvals: { include: { approver: { select: approverSelect } } },
};

export async function getPendingApprovalsService(approverId) {
  const rows = await prisma.leaveApproval.findMany({
    where: { approverId, status: "pending", leave: { status: "pending" } },
    include: { leave: { include: leaveInclude } },
    orderBy: { id: "desc" },
  });
  return rows.map(function (r) {
    return r.leave;
  });
}

export async function getApprovalHistoryService(approverId) {
  const rows = await prisma.leaveApproval.findMany({
    where: { approverId, NOT: { status: "pending" } },
    include: { leave: { include: leaveInclude } },
    orderBy: { approvedAt: "desc" },
  });
  return rows.map(function (r) {
    return r.leave;
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

async function syncApprovedLeaveToAttendance(leave) {
  const dates = getDateRange(leave.startDate, leave.endDate);

  await Promise.all(
    dates.map(function (dateStr) {
      return prisma.attendance.upsert({
        where: { userId_date: { userId: leave.userId, date: dateStr } },
        update: { status: leave.type, reason: leave.reason },
        create: {
          userId: leave.userId,
          date: dateStr,
          status: leave.type,
          reason: leave.reason,
        },
      });
    })
  );
}

async function recalculateLeaveStatus(leaveId) {
  const leave = await prisma.leave.findUnique({
    where: { id: leaveId },
    include: { approvals: true },
  });

  const hasRejected = leave.approvals.some(function (a) {
    return a.status === "rejected";
  });
  const allApproved = leave.approvals.every(function (a) {
    return a.status === "approved";
  });

  const newStatus = hasRejected ? "rejected" : allApproved ? "approved" : "pending";

  if (newStatus !== leave.status) {
    await prisma.leave.update({
      where: { id: leaveId },
      data: { status: newStatus },
    });

    if (newStatus === "approved") {
      await syncApprovedLeaveToAttendance(leave);
    }
  }

  return prisma.leave.findUnique({
    where: { id: leaveId },
    include: leaveInclude,
  });
}

function emitLeaveChanged(leave) {
  const io = getIO();
  if (!io) return;
  io.emit("leaveStatusChanged", {
    leaveId: leave.id,
    status: leave.status,
    approvedCount: leave.approvals.filter(function (a) {
      return a.status === "approved";
    }).length,
    totalApprovers: leave.approvals.length,
  });
}

export async function approveLeaveService({ leaveId, approverId, note, req }) {
  await prisma.leaveApproval.update({
    where: { leaveId_approverId: { leaveId, approverId } },
    data: { status: "approved", note, approvedAt: new Date() },
  });

  const leave = await recalculateLeaveStatus(leaveId);
  emitLeaveChanged(leave);

  const approver = await prisma.user.findUnique({
    where: { id: approverId },
    select: { username: true, photoUrl: true },
  });

  notifyUser(leave.userId, {
    title: "Cuti Disetujui",
    body: `${approver?.username ?? "Approver"} menyetujui pengajuan cuti kamu.`,
    imageUrl: getPublicUrl(req, approver?.photoUrl?.replace(/^\/?uploads\//, '')),
    data: { type: "leave_approved", leaveId: String(leave.id) },
  }).catch((err) =>
    console.error("notifyUsers gagal:", err.message)
  );

  return leave;
}

export async function rejectLeaveService({ leaveId, approverId, note, req }) {
  await prisma.leaveApproval.update({
    where: { leaveId_approverId: { leaveId, approverId } },
    data: { status: "rejected", note, approvedAt: new Date() },
  });

  const leave = await recalculateLeaveStatus(leaveId);
  emitLeaveChanged(leave);

  const approver = await prisma.user.findUnique({
    where: { id: approverId },
    select: { username: true, photoUrl: true },
  });

  notifyUser(leave.userId, {
    title: "Cuti Ditolak",
    body: `${approver?.username ?? "Approver"} menolak pengajuan cuti kamu.`,
    imageUrl: getPublicUrl(req, approver?.photoUrl?.replace(/^\/?uploads\//, '')),
    data: { type: "leave_rejected", leaveId: String(leave.id) },
  }).catch((err) =>
    console.error("notifyUsers gagal:", err.message)
  );

  return leave;
}