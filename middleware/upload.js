// middleware/upload.js
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root folder semua upload, misal: public/uploads
export const BASE_UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');

export const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 Folder dibuat: ${dirPath}`);
  }
};

/**
 * Factory untuk membuat middleware upload sesuai kebutuhan controller.
 *
 * @param {Object} options
 * @param {string|function} options.subPath
 *        Path relatif di dalam BASE_UPLOAD_DIR, contoh: 'selfies' atau 'products/images'.
 *        Bisa juga fungsi (req, file) => string untuk path dinamis.
 * @param {string}   [options.prefix='file']     Prefix nama file yang dihasilkan.
 * @param {string[]} [options.allowedTypes=['image/']]  Mime-type prefix yang diizinkan.
 * @param {number}   [options.maxSize=5*1024*1024]       Ukuran maksimum file (bytes).
 * @param {boolean}  [options.useUserId=false]   Jika true, otomatis tambahkan req.user.id ke path.
 * @param {number}   [options.maxCount]          Jika diisi, mengembalikan .array(fieldName, maxCount) siap pakai lewat helper `.arrayField()`.
 *
 * @returns multer instance (upload.single('field'), upload.array('field', n), dst)
 */
export const createUploader = ({
  subPath = '',
  prefix = 'file',
  allowedTypes = ['image/'],
  maxSize = 5 * 1024 * 1024,
  useUserId = false,
} = {}) => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      try {
        let resolvedSubPath =
          typeof subPath === 'function' ? subPath(req, file) : subPath;

        if (useUserId) {
          const userId = req.user?.id;
          if (!userId) {
            return cb(new Error('User ID tidak ditemukan di token'), null);
          }
          resolvedSubPath = path.join(resolvedSubPath, String(userId));
        }

        const uploadDir = path.join(BASE_UPLOAD_DIR, resolvedSubPath);
        ensureDirectoryExists(uploadDir);


        req.uploadSubPath = resolvedSubPath;

        cb(null, uploadDir);
      } catch (err) {
        cb(err, null);
      }
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname).toLowerCase();
      const filename = `${prefix}-${uniqueSuffix}${ext}`;
      cb(null, filename);
    },
  });

  const fileFilter = (req, file, cb) => {
    const isAllowed = allowedTypes.some((type) => file.mimetype.startsWith(type));
    if (isAllowed) {
      cb(null, true);
    } else {
      cb(
        new Error(`Tipe file tidak diizinkan. Hanya: ${allowedTypes.join(', ')}`),
        false
      );
    }
  };

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: maxSize },
  });
};

export default createUploader;