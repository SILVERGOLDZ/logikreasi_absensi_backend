import prisma from "#prisma/prisma.js";
import {
  sendMessageTo,
  sendMessageToMultiple,
  sendMessageToTopic,
  subscribeToTopic,
  unsubscribeFromTopic,
} from "#utils/fcm.helper";

export const TOPIC_ALL_USERS = "all_users";

// export async function updateUserToken(userId, token) {
//   if (!token) return null;

//   await prisma.user.updateMany({
//     where: { fcmToken: token, NOT: { id: userId } },
//     data: { fcmToken: null },
//   });

//   const user = await prisma.user.update({
//     where: { id: userId },
//     data: { fcmToken: token },
//   });

//   await subscribeToTopic(token, TOPIC_ALL_USERS);

//   return user;
// }

export async function updateUserToken(userId, token) {
  if (!token) return null;

  await prisma.user.updateMany({
    where: { fcmToken: token, NOT: { id: userId } },
    data: { fcmToken: null },
  });

  const user = await prisma.user.update({
    where: { id: userId },
    data: { fcmToken: token },
  });

  // ---------- Remove for a quick bug fix -----------------
  // fire-and-forget: jangan await, biar request tidak nunggu FCM
  // subscribeToTopic(token, TOPIC_ALL_USERS).catch((err) =>
  //   console.error("subscribeToTopic gagal:", err.message)
  // );

  return user;
}

export async function deleteUserToken(token) {
  if (!token) return null;

  // ---------- Remove for a quick bug fix -----------------
  // unsubscribeFromTopic(token, TOPIC_ALL_USERS);
  return prisma.user.updateMany({
    where: { fcmToken: token },
    data: { fcmToken: null },
  });
}

// --- Helper domain (dipanggil dari controller fitur lain) ---

export async function notifyUser(userId, payload) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.fcmToken) return;
  sendMessageTo(user.fcmToken, payload);
}

export async function notifyUsers(userIds, payload) {
  if (!userIds || userIds.length === 0) return;
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { fcmToken: true },
  });
  sendMessageToMultiple(users.map((u) => u.fcmToken), payload);
}

export async function notifyAllUsers(payload) {
  sendMessageToTopic(TOPIC_ALL_USERS, payload);
}