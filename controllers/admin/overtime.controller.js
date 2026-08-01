// controllers/admin/overtime.controller.js
import {
  getPendingOvertimeApprovalsService,
  getOvertimeApprovalHistoryService,
  approveOvertimeService,
  rejectOvertimeService,
} from "#services/admin/overtime.service";
import { getIO } from "#socket/socket";
import { getPublicUrl } from "#utils/fileManager";

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

export async function getPendingOvertimeApprovalsController(req, res) {
  try {
    const data = await getPendingOvertimeApprovalsService(req.user.id);
    res.json(data.map(withAttachmentUrls(req)));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function getOvertimeApprovalHistoryController(req, res) {
  try {
    const data = await getOvertimeApprovalHistoryService(req.user.id);
    res.json(data.map(withAttachmentUrls(req)));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function approveOvertimeController(req, res) {
  try {
    const overtimeId = parseInt(req.params.overtimeId);
    const overtime = await approveOvertimeService({
      overtimeId,
      approverId: req.user.id,
      note: req.body.note,
      req,
    });

    // getIO().emit("calendarChanged", { message: "new data" });
    getIO().emit("overtimeStatusChanged", { message: "new data " });

    res.json(withAttachmentUrls(req)(overtime));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

export async function rejectOvertimeController(req, res) {
  try {
    const overtimeId = parseInt(req.params.overtimeId);
    const overtime = await rejectOvertimeService({
      overtimeId,
      approverId: req.user.id,
      note: req.body.note,
      req,
    });

    getIO().emit("overtimeStatusChanged", { message: "new data " });


    res.json(withAttachmentUrls(req)(overtime));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}