// controllers/admin/leave.controller.js
import {
  getPendingApprovalsService,
  getApprovalHistoryService,
  approveLeaveService,
  rejectLeaveService,
} from "#services/admin/leave.service";
import { getIO } from "#socket/socket";
import { getPublicUrl } from "#utils/fileManager";

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

export async function getPendingApprovalsController(req, res) {
  try {
    const data = await getPendingApprovalsService(req.user.id);
    res.json(data.map(withAttachmentUrls(req)));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function getApprovalHistoryController(req, res) {
  try {
    const data = await getApprovalHistoryService(req.user.id);
    res.json(data.map(withAttachmentUrls(req)));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// export async function approveLeaveController(req, res) {
//   try {
//     const leaveId = parseInt(req.params.leaveId);
//     const leave = await approveLeaveService({
//       leaveId,
//       approverId: req.user.id,
//       note: req.body.note,
//     });

//     getIO().emit("calendarChanged", { message: "new data" });

//     res.json(withAttachmentUrls(req)(leave));
//   } catch (err) {
//     res.status(400).json({ message: err.message });
//   }
// }

export async function approveLeaveController(req, res) {
  try {
    const leaveId = parseInt(req.params.leaveId);
    const leave = await approveLeaveService({
      leaveId,
      approverId: req.user.id,
      note: req.body.note,
      req,
    });

    getIO().emit("calendarChanged", { message: "new data" });

    res.json(withAttachmentUrls(req)(leave));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

export async function rejectLeaveController(req, res) {
  try {
    const leaveId = parseInt(req.params.leaveId);
    const leave = await rejectLeaveService({
      leaveId,
      approverId: req.user.id,
      note: req.body.note,
      req,
    });
    res.json(withAttachmentUrls(req)(leave));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

// export async function rejectLeaveController(req, res) {
//   try {
//     const leaveId = parseInt(req.params.leaveId);
//     const leave = await rejectLeaveService({
//       leaveId,
//       approverId: req.user.id,
//       note: req.body.note,
//     });
//     res.json(withAttachmentUrls(req)(leave));
//   } catch (err) {
//     res.status(400).json({ message: err.message });
//   }
// }