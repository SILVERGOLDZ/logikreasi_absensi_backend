// controllers/user.controller.js
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import { updateProfile, updateProfilePhoto, changePassword } from "#services/user.service";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_DIR = path.join(__dirname, '../public/uploads/profile');

export async function updateProfileController(req, res) {
  try {
    const { username } = req.body;
    const userId = req.user.id;

    const user = await updateProfile(userId, username);

    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateProfilePhotoController(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const photoUrl = `/uploads/profile/${req.file.filename}`;
    const userId = req.user.id;

    const user = await updateProfilePhoto(userId, photoUrl);

    res.json({ message: "Photo updated successfully", photoUrl, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update photo" });
  }
}

// USER ====================================================================
import { getAllUsers } from "../services/user.service.js";

export async function getUsers(req, res) {
  try {
    const { search = "" } = req.query;
    const users = await getAllUsers(String(search));
    res.status(200).json(users);
  } catch (err) {
    console.error("Gagal ambil daftar user:", err);
    res.status(500).json({ message: "Gagal mengambil daftar user" });
  }
}

export async function changePasswordController(req, res) {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: "oldPassword dan newPassword wajib diisi" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password baru minimal 6 karakter" });
    }

    if (oldPassword === newPassword) {
      return res.status(400).json({ error: "Password baru tidak boleh sama dengan password lama" });
    }

    const user = await changePassword(userId, oldPassword, newPassword);
    res.json({ message: "Password berhasil diubah", user });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ error: err.message || "Gagal mengubah password" });
  }
}