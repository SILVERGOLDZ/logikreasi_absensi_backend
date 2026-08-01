import { getAnnouncementDetail, getPaginatedAnnouncements, getUnreadCount, markAllAsRead, markAsRead } from "#services/announcement.service";

export async function getAnnouncementsController(req, res) {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await getPaginatedAnnouncements(userId, page, limit);
    res.status(200).json(result);
  } catch (err) {
    console.error("Gagal mengambil pengumuman:", err);
    res.status(500).json({ message: "Gagal mengambil pengumuman" });
  }
};

export async function getUnreadCountController(req, res) {
  try {
    const unreadCount = await getUnreadCount(req.user.id);
    res.status(200).json({ unreadCount });
  } catch (err) {
    console.error("Gagal mengambil unread count:", err);
    res.status(500).json({ message: "Gagal mengambil unread count" });
  }
};

export async function markAllAsReadController(req, res) {
  try {
    const result = await markAllAsRead(req.user.id);
    res.status(200).json(result);
  } catch (err) {
    console.error("Gagal menandai semua pengumuman sebagai dibaca:", err);
    res.status(500).json({ message: "Gagal menandai semua pengumuman sebagai dibaca" });
  }
};

export async function getAnnouncementDetailController(req, res) {
  try {
    const userId = req.user.id;
    const id = parseInt(req.params.id);

    const announcement = await getAnnouncementDetail(id);
    if (!announcement) {
      return res.status(404).json({ message: "Pengumuman tidak ditemukan" });
    }

    // otomatis tandai sudah dibaca saat detail dibuka
    await markAsRead(userId, id);

    res.status(200).json(announcement);
  } catch (err) {
    console.error("Gagal mengambil detail pengumuman:", err);
    res.status(500).json({ message: "Gagal mengambil detail pengumuman" });
  }
};