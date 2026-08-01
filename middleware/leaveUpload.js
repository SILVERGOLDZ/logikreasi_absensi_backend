import { createUploader } from '#middleware/upload';

export const leaveUpload = createUploader({
  subPath: 'leave-attachments',
  prefix: 'attachment',
  allowedTypes: ['application/pdf'],
  useUserId: true,
});