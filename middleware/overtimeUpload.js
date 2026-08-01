import { createUploader } from '#middleware/upload';

export const overtimeUpload = createUploader({
  subPath: 'overtime-attachments',
  prefix: 'attachment',
  allowedTypes: ['application/pdf'],
  useUserId: true,
});