// controllers/overtime.controller.js
import {
  getOvertimeApproversService,
  createOvertimeService,
  getMyOvertimesService,
} from "#services/overtime.service";
import { getIO } from "#socket/socket";
import { deleteFiles, getPublicUrl } from "#utils/fileManager";

function withAttachmentUrls(req) {
  return function (overtime) {
    return {
      ...overtime,
      attachmentUrls: (overtime.attachmentUrls || []).map(function (url) {
        return getPublicUrl(req, url);
      }),
    };
  };
}

export async function getOvertimeApproversController(req, res) {
  try {
    const approvers = await getOvertimeApproversService();
    res.json(approvers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function createOvertimeController(req, res) {
  try {
    const { startDate, endDate, startTime, endTime, title, reason, compensationType } = req.body;
    const isRange = req.body.isRange === "true" || req.body.isRange === true;

    let approverIds = [];
    try {
      approverIds = JSON.parse(req.body.approverIds || "[]");
    } catch {
      throw new Error("Format approverIds tidak valid");
    }

    const attachmentUrls = (req.files || []).map(function (file) {
      return `${req.uploadSubPath}/${file.filename}`;
    });

    const overtime = await createOvertimeService({
      userId: req.user.id,
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
      req, // dilempar biar service bisa panggil getPublicUrl
    });

    getIO().emit("overtimeStatusChanged", {
      overtimeId: overtime.id,
      status: overtime.status,
      approvedCount: overtime.approvals.filter(function (a) {
        return a.status === "approved";
      }).length,
      totalApprovers: overtime.approvals.length,
    });

    res.status(201).json(withAttachmentUrls(req)(overtime));
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

export async function getMyOvertimesController(req, res) {
  try {
    const overtimes = await getMyOvertimesService(req.user.id);
    res.json(overtimes.map(withAttachmentUrls(req)));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}