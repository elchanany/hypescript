import "server-only";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Config } from "./config";

let client: S3Client | null = null;

function r2() {
  const config = getR2Config();
  if (!config) throw new Error("r2_not_configured");
  client ||= new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });
  return { client, config };
}

export function safeObjectName(name: string): string {
  const extension = name.toLowerCase().match(/\.[a-z0-9]{1,10}$/)?.[0] || "";
  return `${crypto.randomUUID()}${extension}`;
}

export function assetObjectKey(userId: string, projectId: string, name: string): string {
  return `users/${userId}/projects/${projectId}/assets/${safeObjectName(name)}`;
}

export function renderObjectKey(userId: string, projectId: string, jobId: string): string {
  return `users/${userId}/projects/${projectId}/renders/${jobId}.mp4`;
}

export async function signUpload(key: string, contentType: string) {
  const { client: s3, config } = r2();
  return getSignedUrl(s3, new PutObjectCommand({ Bucket: config.bucket, Key: key, ContentType: contentType }), { expiresIn: 15 * 60 });
}

export async function signDownload(key: string, filename?: string) {
  const { client: s3, config } = r2();
  return getSignedUrl(s3, new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ResponseContentDisposition: filename ? `attachment; filename*=UTF-8''${encodeURIComponent(filename)}` : undefined,
  }), { expiresIn: 10 * 60 });
}

export async function headObject(key: string) {
  const { client: s3, config } = r2();
  return s3.send(new HeadObjectCommand({ Bucket: config.bucket, Key: key }));
}

export async function deleteObject(key: string) {
  const { client: s3, config } = r2();
  await s3.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
}

export async function checkR2() {
  const { client: s3, config } = r2();
  await s3.send(new HeadBucketCommand({ Bucket: config.bucket }));
}
