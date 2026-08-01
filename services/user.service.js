import prisma from "#prisma/prisma.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import bcrypt from "bcrypt";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_DIR = path.join(__dirname, "../public/uploads/profile");

export async function updateProfile(userId, username) {
  return prisma.user.update({
    where: { id: userId },
    data: { username },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      photoUrl: true,
    },
  });
}

export async function updateProfilePhoto(userId, photoUrl) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { photoUrl: true },
  });

  // Hapus foto lama
  if (user?.photoUrl) {
    const oldFile = path.join(
      UPLOAD_DIR,
      path.basename(user.photoUrl)
    );

    try {
      await fs.unlink(oldFile);
    } catch {
      // Abaikan jika file tidak ada
    }
  }

//   const photoUrl = `/uploads/profile/${filename}`;

  return prisma.user.update({
    where: { id: userId },
    data: { photoUrl },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      photoUrl: true,
    },
  });
}

// USER =======================================================

export async function getAllUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      username: true,
      photoUrl: true,
      role: true,
    },
    orderBy: {
      username: "asc",
    },
  });
}

export async function changePassword(userId, oldPassword, newPassword) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, password: true },
  });

  if (!user) {
    const err = new Error("User tidak ditemukan");
    err.statusCode = 404;
    throw err;
  }

  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) {
    const err = new Error("Password lama salah");
    err.statusCode = 400;
    throw err;
  }

  const hashed = await bcrypt.hash(newPassword, 10);

  return prisma.user.update({
    where: { id: userId },
    data: { password: hashed },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
    },
  });
}

