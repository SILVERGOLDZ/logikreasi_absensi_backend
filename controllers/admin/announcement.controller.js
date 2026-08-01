import { createAnnouncement } from "#services/announcement.service";
import { getIO } from "../../socket/socket.js";

export async function createAnnouncementAdminController(req, res) {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: "Title dan content wajib diisi" });
    }

    const announcement = await createAnnouncement(req.user.id, title, content, req);

    getIO().emit("newAnnouncement", announcement);

    res.status(201).json(announcement);
  } catch (err) {
    console.error("Gagal membuat pengumuman:", err);
    res.status(500).json({ message: "Gagal membuat pengumuman" });
  }
}