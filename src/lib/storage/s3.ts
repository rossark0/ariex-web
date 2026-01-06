import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'ariex-documents';

export async function uploadDocument(
  file: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  const key = `documents/${Date.now()}-${fileName}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: mimeType,
    })
  );

  return key;
}

export async function getDocumentUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour
}

/**
 * Generate a presigned URL for direct browser upload (PUT).
 * Returns both the S3 object key and the signed URL.
 */
export async function getPresignedPutUrl(
  fileName: string,
  mimeType: string
): Promise<{ key: string; url: string }> {
  const key = `documents/${Date.now()}-${fileName}`;
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: mimeType,
  });
  const url = await getSignedUrl(s3Client, command, { expiresIn: 60 * 5 });
  return { key, url };
}

/**
 * Generate a presigned URL to download/view an object (GET).
 */
export async function getPresignedGetUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  return getSignedUrl(s3Client, command, { expiresIn: 60 * 10 });
}

export async function deleteDocument(key: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })
  );
}
