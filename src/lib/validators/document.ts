import { z } from 'zod';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const fileSchema = z
  .instanceof(File)
  .refine(file => file.size <= MAX_FILE_SIZE, {
    message: 'File size must be less than 10MB',
  })
  .refine(file => ACCEPTED_FILE_TYPES.includes(file.type), {
    message: 'File must be a PDF, image, or Word document',
  });
