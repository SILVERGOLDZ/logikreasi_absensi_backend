import { Router } from "express";
import { changePasswordController, getUsers, updateProfileController, updateProfilePhotoController } from "#controllers/user.controller";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

// Fix ESM __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Konfigurasi Multer
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../public/uploads/profile');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

// Routes ===========================================================================================================================
router.get("/", getUsers);
router.put("/profile", updateProfileController);
router.post("/profile-photo", upload.single('photo'), updateProfilePhotoController);
router.put("/change-password", changePasswordController);

export default router;