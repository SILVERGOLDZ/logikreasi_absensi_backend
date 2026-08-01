import prisma from "#prisma/prisma.js";
import { getPublicUrl } from "#utils/fileManager";
import { notifyAllUsers } from "./notification.service.js";

export async function getPaginatedAnnouncements(userId, page, limit) {
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.announcement.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { id: true, username: true } },
        reads: { where: { userId }, select: { id: true } },
      },
    }),
    prisma.announcement.count(),
  ]);

  const data = items.map((item) => ({
    id: item.id,
    title: item.title,
    content: item.content,
    createdByName: item.createdBy?.username ?? "-",
    createdAt: item.createdAt,
    isRead: item.reads.length > 0,
  }));

  return { data, page, limit, total, hasMore: skip + items.length < total };
};

export async function getUnreadCount(userId) {
  return prisma.announcement.count({
    where: {
      reads: { none: { userId } },
    },
  });
};

export async function markAllAsRead(userId) {
  const unread = await prisma.announcement.findMany({
    where: { reads: { none: { userId } } },
    select: { id: true },
  });

  if (unread.length === 0) return { marked: 0 };

  await prisma.announcementRead.createMany({
    data: unread.map((a) => ({ userId, announcementId: a.id })),
    skipDuplicates: true,
  });

  return { marked: unread.length };
};

export async function getAnnouncementDetail (id) {
  const item = await prisma.announcement.findUnique({
    where: { id },
    include: { createdBy: { select: { id: true, username: true } } },
  });

  if (!item) return null;

  return {
    id: item.id,
    title: item.title,
    content: item.content,
    createdByName: item.createdBy?.username ?? "-",
    createdAt: item.createdAt,
  };
};

export async function markAsRead(userId, announcementId) {
  await prisma.announcementRead.upsert({
    where: { userId_announcementId: { userId, announcementId } },
    update: {},
    create: { userId, announcementId },
  });
};

export async function createAnnouncement(createdById, title, content, req) {
  const announcement = await prisma.announcement.create({
    data: { title, content, createdById },
    include: { createdBy: { select: { id: true, username: true, photoUrl: true } } },
  });

  notifyAllUsers({
    title: "Logikreasi memiliki Pengumuman Baru",
    body: announcement.title,
    imageUrl: getPublicUrl(req, announcement.createdBy?.photoUrl?.replace(/^\/?uploads\//, '')),
    data: { type: "announcement", announcementId: String(announcement.id) },
  }).catch((err) =>
    console.error("notifyUsers gagal:", err.message)
  );

  return {
    id: announcement.id,
    title: announcement.title,
    content: announcement.content,
    createdByName: announcement.createdBy?.username ?? "-",
    createdAt: announcement.createdAt,
    isRead: false,
  };
}