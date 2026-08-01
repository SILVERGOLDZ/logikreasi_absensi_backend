// controllers/leave.controller.js
import {
  getApproversService,
  createLeaveService,
  getMyLeavesService,
} from "#services/leave.service";
import { getIO } from "#socket/socket";
import { deleteFiles, getPublicUrl } from "#utils/fileManager";

function withAttachmentUrls(req) {
  return function (leave) {
    return {
      ...leave,
      attachmentUrls: (leave.attachmentUrls || []).map(function (url) {
        return getPublicUrl(req, url);
      }),
    };
  };
}

export async function getApproversController(req, res) {
  try {
    const approvers = await getApproversService();
    res.json(approvers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function createLeaveController(req, res) {
  try {
    const { startDate, endDate, type, title, reason } = req.body;

    let approverIds = [];
    try {
      approverIds = JSON.parse(req.body.approverIds || "[]");
    } catch {
      throw new Error("Format approverIds tidak valid");
    }

    const attachmentUrls = (req.files || []).map(function (file) {
      return `${req.uploadSubPath}/${file.filename}`;
    });

    const leave = await createLeaveService({
      userId: req.user.id,
      startDate,
      endDate,
      type,
      title,
      reason,
      approverIds,
      attachmentUrls,
      req, // dilempar biar service bisa panggil getPublicUrl
    });

    getIO().emit("leaveStatusChanged", {
      leaveId: leave.id,
      status: leave.status,
      approvedCount: leave.approvals.filter(function (a) {
        return a.status === "approved";
      }).length,
      totalApprovers: leave.approvals.length,
    });

    res.status(201).json(withAttachmentUrls(req)(leave));
  } catch (err) {
    if (req.files?.length) {
      await deleteFiles(
        req.files.map(function (f) {
          return f.path;
        })
      );
    }
    res.status(400).json({ message: err.message });
  }
}

export async function getMyLeavesController(req, res) {
  try {
    const leaves = await getMyLeavesService(req.user.id);
    res.json(leaves.map(withAttachmentUrls(req)));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}