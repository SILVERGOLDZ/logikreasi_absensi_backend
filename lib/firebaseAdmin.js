// init Untuk Notifikasi

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { readFileSync } from "fs";

const serviceAccount = JSON.parse(
  readFileSync(new URL("../config/logikreasi-absensi-firebase-adminsdk-fbsvc-9438b2765b.json", import.meta.url))
);

// hindari re-init kalau file ini ke-load lebih dari sekali (hot reload, dll)
const app = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: cert(serviceAccount),
    });

export default app;