import fs from "node:fs/promises";
import path from "node:path";
import { put, del } from "@vercel/blob";

// Storage abstraction: uses Vercel Blob in production (when a token is
// configured) and falls back to local disk for zero-setup local development.
// Swap nothing when deploying to Vercel other than attaching a Blob store,
// which sets BLOB_READ_WRITE_TOKEN automatically.

const LOCAL_ROOT = path.join(process.cwd(), "data");

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function hasBlobToken(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export type StoredFile = {
  /** Opaque key used to fetch/delete the file later. */
  storageKey: string;
  /** Directly usable URL (public Vercel Blob URL, or local proxy route). */
  url: string;
};

export async function storeFile(params: {
  buffer: Buffer;
  filename: string;
  contentType: string;
  folder: "uploads" | "reports";
}): Promise<StoredFile> {
  const key = `${params.folder}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${sanitizeFilename(params.filename)}`;

  if (hasBlobToken()) {
    const blob = await put(key, params.buffer, {
      access: "public",
      contentType: params.contentType,
      addRandomSuffix: false,
    });
    return { storageKey: key, url: blob.url };
  }

  const filePath = path.join(LOCAL_ROOT, key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, params.buffer);
  return { storageKey: key, url: `/api/files/${key}` };
}

export async function readLocalFile(storageKey: string): Promise<Buffer> {
  const filePath = path.join(LOCAL_ROOT, storageKey);
  return fs.readFile(filePath);
}

export async function deleteFile(storageKey: string): Promise<void> {
  if (hasBlobToken()) {
    await del(storageKey);
    return;
  }
  const filePath = path.join(LOCAL_ROOT, storageKey);
  await fs.rm(filePath, { force: true });
}

export function isUsingBlobStorage(): boolean {
  return hasBlobToken();
}
