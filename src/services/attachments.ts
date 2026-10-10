import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getAccessToken } from './auth.js';

const ATTACHMENTS_URL = 'https://stepik.org/api/attachments';
const STEPIK_ORIGIN = 'https://stepik.org';

interface RawAttachment {
  id: number;
  name: string;
  size: number;
  course: number | null;
  lesson: number | null;
  file: string;
}

interface AttachmentsResponse {
  attachments: RawAttachment[];
  meta?: { has_next?: boolean };
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
  return {
    id: raw.id,
    name: raw.name,
    size: raw.size,
    lesson: raw.lesson,
    url: new URL(raw.file, STEPIK_ORIGIN).toString(),
  };
}

export async function uploadLessonAttachment(
  params: UploadLessonAttachmentParams,
): Promise<Attachment> {
  if (!path.isAbsolute(params.filePath)) {
    throw new Error(`filePath must be absolute, got "${params.filePath}"`);
  }

  const content = await readFile(params.filePath);
  const form = new FormData();
  form.append('lesson', String(params.lessonId));
  form.append(
    'file',
    new Blob([content]),
    params.fileName ?? path.basename(params.filePath),
  );

  const accessToken = await getAccessToken();
  // No explicit Content-Type: fetch sets multipart/form-data with the boundary.
  const response = await fetch(ATTACHMENTS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
    body: form,
  });

  if (!response.ok) {
    throw new Error(
      `HTTP error! status: ${response.status} ${await response.text()}`,
    );
  }

  const data: AttachmentsResponse = await response.json();
  return toAttachment(data.attachments[0]);
}

export async function getLessonAttachments(
  lessonId: number,
): Promise<Attachment[]> {
  const accessToken = await getAccessToken();
  const result: Attachment[] = [];

  let page = 1;
  let hasNext = true;
  while (hasNext) {
    const response = await fetch(
      `${ATTACHMENTS_URL}?lesson=${lessonId}&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `HTTP error! status: ${response.status} ${await response.text()}`,
      );
    }

    const data: AttachmentsResponse = await response.json();
    result.push(...data.attachments.map(toAttachment));
    hasNext = data.meta?.has_next === true;
    page += 1;
  }

  return result;
}

export async function deleteAttachment(attachmentId: number): Promise<void> {
  const accessToken = await getAccessToken();

  const response = await fetch(`${ATTACHMENTS_URL}/${attachmentId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(
      `HTTP error! status: ${response.status} ${await response.text()}`,
    );
  }
}
