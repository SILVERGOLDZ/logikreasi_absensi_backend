// utils/fileManager.js
import fs from 'fs';
import fs_promises from 'fs/promises';
import path from 'path';
import { BASE_UPLOAD_DIR } from '../middleware/upload.js';

/**
 * Terima path absolut ATAU path relatif terhadap BASE_UPLOAD_DIR,
 * selalu kembalikan path absolut yang aman (tidak bisa keluar dari BASE_UPLOAD_DIR).
 */
const resolveSafePath = (filePath) => {
  const absolute = path.isAbsolute(filePath)
    ? filePath
    : path.join(BASE_UPLOAD_DIR, filePath);

  const normalized = path.normalize(absolute);

  if (!normalized.startsWith(BASE_UPLOAD_DIR)) {
    throw new Error('Path tidak valid / mencoba keluar dari folder uploads');
  }

  return normalized;
};

/** Cek apakah file ada */
export const fileExists = (filePath) => {
  try {
    const target = resolveSafePath(filePath);
    return fs.existsSync(target);
  } catch {
    return false;
  }
};

/** Hapus satu file. Aman dipanggil walau file tidak ada (tidak throw). */
export const deleteFile = async (filePath) => {
  if (!filePath) return { deleted: false, reason: 'path kosong' };

  try {
    const target = resolveSafePath(filePath);
    if (!fs.existsSync(target)) {
      return { deleted: false, reason: 'file tidak ditemukan', path: target };
    }
    await fs_promises.unlink(target);
    console.log(`🗑️  File dihapus: ${target}`);
    return { deleted: true, path: target };
  } catch (err) {
    console.error(`❌ Gagal hapus file ${filePath}:`, err.message);
    return { deleted: false, reason: err.message };
  }
};

/** Hapus banyak file sekaligus */
export const deleteFiles = async (filePaths = []) => {
  return Promise.all(filePaths.map((p) => deleteFile(p)));
};

/** Hapus seluruh folder (misal folder user saat akun dihapus) */
export const deleteFolder = async (folderPath) => {
  try {
    const target = resolveSafePath(folderPath);
    if (!fs.existsSync(target)) {
      return { deleted: false, reason: 'folder tidak ditemukan' };
    }
    await fs_promises.rm(target, { recursive: true, force: true });
    console.log(`🗑️  Folder dihapus: ${target}`);
    return { deleted: true, path: target };
  } catch (err) {
    console.error(`❌ Gagal hapus folder ${folderPath}:`, err.message);
    return { deleted: false, reason: err.message };
  }
};

/**
 * Ganti file lama dengan file baru: hapus file lama (jika ada), file baru
 * biasanya sudah tersimpan oleh multer di req.file, 
 *
 * @param {string} oldFilePath - path lama (relatif atau absolut), boleh null/undefined
 * @param {string} newFilePath - path baru yang sudah tersimpan multer (hanya untuk logging/return)
 */
export const replaceFile = async (oldFilePath, newFilePath) => {
  const result = { newPath: newFilePath, oldFileDeleted: false };

  if (oldFilePath) {
    const del = await deleteFile(oldFilePath);
    result.oldFileDeleted = del.deleted;
  }

  return result;
};

/** List semua file dalam sebuah folder (relatif terhadap BASE_UPLOAD_DIR) */
export const listFiles = async (folderPath) => {
  try {
    const target = resolveSafePath(folderPath);
    if (!fs.existsSync(target)) return [];
    return await fs_promises.readdir(target);
  } catch (err) {
    console.error(`❌ Gagal list folder ${folderPath}:`, err.message);
    return [];
  }
};

/** Bangun URL publik dari path file di disk, misal untuk dikirim ke frontend */
export const getPublicUrl = (req, filePath) => {
  if (!filePath) return null;
  const target = resolveSafePath(filePath);
  const relative = path
    .relative(path.join(BASE_UPLOAD_DIR, '..'), target) // relatif dari folder 'public'
    .split(path.sep)
    .join('/');
  return `${req.protocol}://${req.get('host')}/${relative}`;
};

export default {
  fileExists,
  deleteFile,
  deleteFiles,
  deleteFolder,
  replaceFile,
  listFiles,
  getPublicUrl,
};