import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { getAccessToken } from './auth.js';
import { assertOk, authHeaders, fetchAllPages } from './stepikApi.js';

const ATTACHMENTS_URL = 'https://stepik.org/api/attachments';
const STEPIK_ORIGIN = 'https://stepik.org';

// Our own cap, so a stray video path isn't buffered into memory whole.
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

interface RawAttachment {
  id: number;
  name: string;
  size: number;
  course: number | null;
  lesson: number | null;
  file: string | null;
}

interface AttachmentsResponse {
  attachments: RawAttachment[];
}

export interface Attachment {
  id: number;
  name: string;
  size: number;
  lesson: number | null;
  url: string;
}

export interface UploadLessonAttachmentParams {
  lessonId: number;
  filePath: string;
  fileName?: string;
}

// Stepik returns `file` as a site-relative path (`/media/attachments/...`).
function toAttachment(raw: RawAttachment): Attachment {
  if (!raw.file) {
    throw new Error(`Attachment ${raw.id} has no file URL`);
  }
  return {
    id: raw.id,
    name: raw.name,
    size: raw.size,
    lesson: raw.lesson,
    url: new URL(raw.file, STEPIK_ORIGIN).toString(),
  };
}

/**
 * Uploads publish the file at a public URL, so refuse anything under a hidden
 * path segment (`~/.ssh`, `.env.local`, `~/.aws`, ...) after resolving
 * symlinks, plus non-regular files and files over MAX_UPLOAD_BYTES.
 */
async function resolveUploadPath(filePath: string): Promise<string> {
  if (!path.isAbsolute(filePath)) {
    throw new Error(`filePath must be absolute, got "${filePath}"`);
  }

  const resolved = await realpath(filePath);
  const hidden = resolved
    .split(path.sep)
    .find((segment) => segment.startsWith('.'));
  if (hidden) {
    throw new Error(
      `Refusing to upload "${resolved}": hidden path segment "${hidden}"`,
    );
  }

  const info = await stat(resolved);
  if (!info.isFile()) {
    throw new Error(`Refusing to upload "${resolved}": not a regular file`);
  }
  if (info.size > MAX_UPLOAD_BYTES) {
    throw new Error(
      `Refusing to upload "${resolved}": ${info.size} bytes exceeds the ${MAX_UPLOAD_BYTES}-byte limit`,
    );
  }

  return resolved;
}

export async function uploadLessonAttachment(
  params: UploadLessonAttachmentParams,
): Promise<Attachment> {
  const filePath = await resolveUploadPath(params.filePath);

  const content = await readFile(filePath);
  const form = new FormData();
  form.append('lesson', String(params.lessonId));
  form.append(
    'file',
    new Blob([content]),
    params.fileName ?? path.basename(filePath),
  );

  const accessToken = await getAccessToken();
  // No explicit Content-Type: fetch sets multipart/form-data with the boundary.
  const response = await fetch(ATTACHMENTS_URL, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: form,
  });
  await assertOk(response);

  const data: AttachmentsResponse = await response.json();
  const raw = data.attachments?.[0];
  if (!raw) {
    throw new Error(
      `Upload response contained no attachment: ${JSON.stringify(data)}`,
    );
  }
  return toAttachment(raw);
}

export async function getLessonAttachments(
  lessonId: number,
): Promise<Attachment[]> {
  const accessToken = await getAccessToken();
  const raws = await fetchAllPages<'attachments', RawAttachment>(
    `${ATTACHMENTS_URL}?lesson=${lessonId}`,
    'attachments',
    accessToken,
  );
  // The server applies `?lesson=`; filter again so a dropped filter can't leak
  // other lessons' files into the list.
  return raws.filter((raw) => raw.lesson === lessonId).map(toAttachment);
}

export async function deleteLessonAttachment(
  lessonId: number,
  attachmentId: number,
): Promise<void> {
  const accessToken = await getAccessToken();

  const lookup = await fetch(`${ATTACHMENTS_URL}/${attachmentId}`, {
    headers: authHeaders(accessToken),
  });
  await assertOk(lookup);
  const data: AttachmentsResponse = await lookup.json();
  const raw = data.attachments?.[0];
  if (!raw || raw.lesson !== lessonId) {
    throw new Error(
      `Attachment ${attachmentId} does not belong to lesson ${lessonId} (lesson: ${raw?.lesson ?? 'unknown'})`,
    );
  }

  const response = await fetch(`${ATTACHMENTS_URL}/${attachmentId}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  });
  await assertOk(response);
}
