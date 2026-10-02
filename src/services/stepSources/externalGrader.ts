import { getAccessToken } from '../auth.js';
import {
  assertBlockName,
  createStepSource,
  fetchStepSource,
  StepSource,
  updateStepSource,
} from './client.js';

export type GraderTaskType = 'javascript' | 'nodejs' | 'react';

export interface GraderUploadFile {
  label: string;
  filename: string;
}

export interface CreateExternalGraderStepParams {
  lessonId: number;
  position: number;
  question: string;
  queueName: string;
  taskType: GraderTaskType;
  taskId: string;
  language?: string;
  template?: string;
  files?: GraderUploadFile[];
  points?: number;
}

export interface UpdateExternalGraderStepParams {
  stepId: number;
  position?: number;
  question?: string;
  queueName?: string;
  taskType?: GraderTaskType;
  taskId?: string;
  language?: string;
  template?: string;
  files?: GraderUploadFile[];
  points?: number;
}

function graderLanguage(taskType: GraderTaskType): string {
  return taskType === 'react' ? 'react' : 'javascript';
}

// Editor mode: the student types code into a text field seeded with `template`.
// Upload mode (non-empty `files`): the student uploads one file per entry.
function buildSubmissionMode(
  files: GraderUploadFile[] | undefined,
  template: string | undefined,
): Record<string, any> {
  if (files && files.length > 0) {
    return { is_text_enabled: false, files };
  }
  return { is_text_enabled: true, template: template ?? '' };
}

export async function createExternalGraderStep(
  params: CreateExternalGraderStepParams,
): Promise<StepSource> {
  const accessToken = await getAccessToken();

  return createStepSource(accessToken, {
    lesson: params.lessonId,
    position: params.position,
    cost: params.points ?? 1,
    block: {
      name: 'external-grader',
      text: params.question,
      source: {
        queue_name: params.queueName,
        language: params.language ?? graderLanguage(params.taskType),
        ...buildSubmissionMode(params.files, params.template),
        grader_payload: {
          task_type: params.taskType,
          task_id: params.taskId,
        },
      },
    },
  });
}

export async function updateExternalGraderStep(
  params: UpdateExternalGraderStepParams,
): Promise<StepSource> {
  const accessToken = await getAccessToken();
  const current = await fetchStepSource(accessToken, params.stepId);
  assertBlockName(current, 'external-grader', 'an external grader step');

  const { template, files, ...currentSource } = current.block.source;
  const currentPayload = currentSource.grader_payload ?? {};
  const submissionMode =
    params.files !== undefined
      ? buildSubmissionMode(params.files, params.template ?? template)
      : currentSource.is_text_enabled
        ? { template: params.template ?? template ?? '' }
        : { files };

  return updateStepSource(accessToken, params.stepId, {
    lesson: current.lesson,
    position: params.position ?? current.position,
    cost: params.points ?? current.cost,
    block: {
      name: 'external-grader',
      text: params.question ?? current.block.text,
      source: {
        ...currentSource,
        queue_name: params.queueName ?? currentSource.queue_name,
        language:
          params.language ??
          (params.taskType
            ? graderLanguage(params.taskType)
            : currentSource.language),
        ...submissionMode,
        grader_payload: {
          ...currentPayload,
          task_type: params.taskType ?? currentPayload.task_type,
          task_id: params.taskId ?? currentPayload.task_id,
        },
      },
    },
  });
}
