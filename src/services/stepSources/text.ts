import { getAccessToken } from '../auth.js';
import {
  createStepSource,
  fetchStepSource,
  StepSource,
  updateStepSource,
} from './client.js';

export interface CreateTextStepParams {
  lessonId: number;
  position: number;
  text: string;
}

export interface UpdateTextStepParams {
  stepId: number;
  position?: number;
  text?: string;
}

export async function createTextStep(
  params: CreateTextStepParams,
): Promise<StepSource> {
  const accessToken = await getAccessToken();

  return createStepSource(accessToken, {
    lesson: params.lessonId,
    position: params.position,
    block: {
      name: 'text',
      text: params.text,
    },
  });
}

export async function updateTextStep(
  params: UpdateTextStepParams,
): Promise<StepSource> {
  const accessToken = await getAccessToken();
  const current = await fetchStepSource(accessToken, params.stepId);

  return updateStepSource(accessToken, params.stepId, {
    lesson: current.lesson,
    position: params.position ?? current.position,
    block: {
      name: 'text',
      text: params.text ?? current.block.text,
    },
  });
}
