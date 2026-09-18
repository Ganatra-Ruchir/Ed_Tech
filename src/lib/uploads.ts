/**
 * Central upload policy. Keeping the allow-lists in one place means the
 * server validators and the client `accept=` strings never drift apart, and
 * widening what's accepted is a one-line change here rather than a hunt across
 * routes and forms.
 */

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB
export const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB

/** Documents, archives, images, code — everything a student might submit. */
export const DOCUMENT_EXTENSIONS = [
  ".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx",
  ".txt", ".md", ".csv", ".rtf", ".odt", ".odp", ".ods",
  ".zip", ".rar", ".7z", ".tar", ".gz",
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".heic",
  ".mp4", ".mov", ".webm", ".mp3", ".wav",
  ".ipynb", ".sql", ".json", ".xml", ".html", ".css", ".js", ".ts",
  ".py", ".java", ".c", ".cpp", ".cs", ".go", ".rs", ".rb", ".php",
] as const;

/** `accept` attribute for a document/assignment file input. */
export const DOCUMENT_ACCEPT = DOCUMENT_EXTENSIONS.join(",");

export const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif"] as const;
export const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot).toLowerCase();
}

/**
 * Validate an uploaded file for a document/assignment slot. We check by
 * extension rather than MIME type because browsers report inconsistent MIME
 * types for many document and code formats (often `application/octet-stream`),
 * which made the old `type !== "application/pdf"` check reject valid files.
 */
export function validateDocumentUpload(file: { name: string; size: number }): string | null {
  if (file.size === 0) return "File is empty";
  if (file.size > MAX_UPLOAD_BYTES) return `File exceeds the ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB limit`;
  const ext = extensionOf(file.name);
  if (!ext) return "File must have an extension";
  if (!(DOCUMENT_EXTENSIONS as readonly string[]).includes(ext)) {
    return `File type ${ext} is not allowed`;
  }
  return null;
}

export function validateAvatarUpload(file: { name: string; size: number }): string | null {
  if (file.size === 0) return "Image is empty";
  if (file.size > MAX_AVATAR_BYTES) return `Image exceeds the ${Math.round(MAX_AVATAR_BYTES / 1024 / 1024)} MB limit`;
  const ext = extensionOf(file.name);
  if (!(IMAGE_EXTENSIONS as readonly string[]).includes(ext)) {
    return "Only PNG, JPG, WEBP or GIF images are allowed";
  }
  return null;
}

/** Best-effort content type from a filename, for storage + serving. */
export function contentTypeFor(filename: string): string {
  const ext = extensionOf(filename);
  const map: Record<string, string> = {
    ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp",
    ".svg": "image/svg+xml", ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".txt": "text/plain", ".md": "text/markdown", ".csv": "text/csv",
    ".zip": "application/zip", ".json": "application/json",
    ".mp4": "video/mp4", ".mov": "video/quicktime", ".mp3": "audio/mpeg",
  };
  return map[ext] ?? "application/octet-stream";
}
