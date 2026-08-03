import { createAnnouncement } from "#services/announcement.service";
import {
  createHoliday,
  cancelHoliday,
  listHolidays,
} from "#services/holiday.service";
import { getIO } from "../socket/socket.js";

export async function listHolidaysController(req, res) {
  try {
    const { year, month } = req.query;
    const data = await listHolidays({
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createHolidayController(req, res) {
  try {
    const { startDate, endDate, reason, title, content } = req.body;

    if (!startDate || !reason || !title || !content) {
      return res.status(400).json({
        error: "startDate, reason, title, dan content wajib diisi",
      });
    }

    const result = await createHoliday({
      startDate,
      endDate,
      reason,
      title,
      content,
      createdById: req.user.id,
    });

    getIO().emit("newAnnouncement", result.announcement);
    getIO().emit("calendarChanged", { action: "holidayCreated" });

    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function cancelHolidayController(req, res) {
  try {
    const { id } = req.params;
    const { updated, date } = await cancelHoliday(id);

    // sistem otomatis mengeluarkan pengumuman pembatalan holiday
    const announcement = await createAnnouncement(req.user.id, `${updated.announcement.title} (Dibatalkan)`, `Libur pada ${date} dibatalkan`, req);
    
    // broadcast realtime ke semua client yang terhubung
    getIO().emit("newAnnouncement", announcement);

    getIO().emit("calendarChanged", { action: "holidayCancelled" });

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
