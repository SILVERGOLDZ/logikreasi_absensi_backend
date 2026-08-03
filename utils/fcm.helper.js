import { getMessaging } from "firebase-admin/messaging";
import "#lib/firebaseAdmin";
import prisma from "#prisma/prisma.js";

const FCM_TIMEOUT_MS = 10000;

function withTimeout(promise, ms = FCM_TIMEOUT_MS, label = "FCM operation") {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

function buildMessage({ title, body, imageUrl, data = {} }) {
  const stringData = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, String(v)])
  );

  return {
    notification: {
      title,
      body,
      ...(imageUrl ? { imageUrl } : {}),
    },
    data: stringData,
    android: {
      priority: "high",
    },
    apns: {
      payload: {
        aps: { sound: "default", "mutable-content": 1 },
      },
      ...(imageUrl ? { fcmOptions: { imageUrl } } : {}),
    },
  };
}

function isInvalidTokenError(err) {
  return (
    err?.code === "messaging/registration-token-not-registered" ||
    err?.code === "messaging/invalid-registration-token"
  );
}

async function cleanupInvalidToken(token) {
  await prisma.user.updateMany({
    where: { fcmToken: token },
    data: { fcmToken: null },
  });
}


// export async function sendMessageTo(token, payload) {
//   if (!token) return;
//   try {
//     await getMessaging().send({ token, ...buildMessage(payload) });
//   } catch (err) {
//     if (isInvalidTokenError(err)) {
//       await cleanupInvalidToken(token);
//     } else {
//       console.error("FCM sendMessageTo error:", err);
//     }
//   }
// }

// export async function sendMessageToMultiple(tokens, payload) {
//   const validTokens = [...new Set((tokens || []).filter(Boolean))];
//   if (validTokens.length === 0) return;

//   try {
//     const response = await getMessaging().sendEachForMulticast({
//       tokens: validTokens,
//       ...buildMessage(payload),
//     });

//     await Promise.all(
//       response.responses.map(async (res, i) => {
//         if (!res.success && isInvalidTokenError(res.error)) {
//           await cleanupInvalidToken(validTokens[i]);
//         }
//       })
//     );
//   } catch (err) {
//     console.error("FCM sendMessageToMultiple error:", err);
//   }
// }

// export async function sendMessageToTopic(topic, payload) {
//   try {
//     await getMessaging().send({ topic, ...buildMessage(payload) });
//   } catch (err) {
//     console.error("FCM sendMessageToTopic error:", err);
//   }
// }

// export async function subscribeToTopic(tokenOrTokens, topic) {
//   const tokens = (Array.isArray(tokenOrTokens) ? tokenOrTokens : [tokenOrTokens]).filter(Boolean);
//   if (tokens.length === 0) return;
//   try {
//     await getMessaging().subscribeToTopic(tokens, topic);
//   } catch (err) {
//     console.error("FCM subscribeToTopic error:", err);
//   }
// }

// export async function unsubscribeFromTopic(tokenOrTokens, topic) {
//   const tokens = (Array.isArray(tokenOrTokens) ? tokenOrTokens : [tokenOrTokens]).filter(Boolean);
//   if (tokens.length === 0) return;
//   try {
//     await getMessaging().unsubscribeFromTopic(tokens, topic);
//   } catch (err) {
//     console.error("FCM unsubscribeFromTopic error:", err);
//   }
// }

export async function sendMessageTo(token, payload) {
  if (!token) return;
  try {
    await withTimeout(getMessaging().send({ token, ...buildMessage(payload) }), FCM_TIMEOUT_MS, "sendMessageTo");
  } catch (err) {
    if (isInvalidTokenError(err)) {
      await cleanupInvalidToken(token);
    } else {
      console.error("FCM sendMessageTo error:", err.message);
    }
  }
}

export async function sendMessageToMultiple(tokens, payload) {
  const validTokens = [...new Set((tokens || []).filter(Boolean))];
  if (validTokens.length === 0) return;

  try {
    const response = await withTimeout(
      getMessaging().sendEachForMulticast({ tokens: validTokens, ...buildMessage(payload) }),
      FCM_TIMEOUT_MS,
      "sendMessageToMultiple"
    );

    await Promise.all(
      response.responses.map(async (res, i) => {
        if (!res.success && isInvalidTokenError(res.error)) {
          await cleanupInvalidToken(validTokens[i]);
        }
      })
    );
  } catch (err) {
    console.error("FCM sendMessageToMultiple error:", err.message);
  }
}

export async function sendMessageToTopic(topic, payload) {
  try {
    await withTimeout(getMessaging().send({ topic, ...buildMessage(payload) }), FCM_TIMEOUT_MS, "sendMessageToTopic");
  } catch (err) {
    console.error("FCM sendMessageToTopic error:", err.message);
  }
}

export async function subscribeToTopic(tokenOrTokens, topic) {
  const tokens = (Array.isArray(tokenOrTokens) ? tokenOrTokens : [tokenOrTokens]).filter(Boolean);
  if (tokens.length === 0) return;
  try {
    await withTimeout(getMessaging().subscribeToTopic(tokens, topic), FCM_TIMEOUT_MS, "subscribeToTopic");
  } catch (err) {
    console.error("FCM subscribeToTopic error:", err.message);
  }
}

export async function unsubscribeFromTopic(tokenOrTokens, topic) {
  const tokens = (Array.isArray(tokenOrTokens) ? tokenOrTokens : [tokenOrTokens]).filter(Boolean);
  if (tokens.length === 0) return;
  try {
    await withTimeout(getMessaging().unsubscribeFromTopic(tokens, topic), FCM_TIMEOUT_MS, "unsubscribeFromTopic");
  } catch (err) {
    console.error("FCM unsubscribeFromTopic error:", err.message);
  }
}