import { getAccessToken } from '../auth.js';
import {
  assertBlockName,
  createStepSource,
  fetchStepSource,
  StepSource,
  updateStepSource,
} from './client.js';

export interface CreateSortingStepParams {
  lessonId: number;
  position: number;
  question: string;
  options: string[];
  isHtmlEnabled?: boolean;
  feedbackCorrect?: string;
  feedbackWrong?: string;
  points?: number;
}

export interface UpdateSortingStepParams {
  stepId: number;
  position?: number;
  question?: string;
  options?: string[];
  isHtmlEnabled?: boolean;
  feedbackCorrect?: string;
  feedbackWrong?: string;
  points?: number;
}

export async function createSortingStep(
  params: CreateSortingStepParams,
): Promise<StepSource> {
  const accessToken = await getAccessToken();

  return createStepSource(accessToken, {
    lesson: params.lessonId,
    position: params.position,
    cost: params.points ?? 1,
    block: {
      name: 'sorting',
      text: params.question,
      source: {
        options: params.options.map((text) => ({ text })),
        is_html_enabled: params.isHtmlEnabled ?? true,
      },
      feedback_correct: params.feedbackCorrect,
      feedback_wrong: params.feedbackWrong,
    },
  });
}

export async function updateSortingStep(
  params: UpdateSortingStepParams,
): Promise<StepSource> {
  const accessToken = await getAccessToken();
  const current = await fetchStepSource(accessToken, params.stepId);
  assertBlockName(current, 'sorting', 'a sorting step');
  const { source } = current.block;

  return updateStepSource(accessToken, params.stepId, {
    lesson: current.lesson,
    position: params.position ?? current.position,
    cost: params.points ?? current.cost,
    block: {
      name: 'sorting',
      text: params.question ?? current.block.text,
      source: {
        ...source,
        options: params.options
          ? params.options.map((text) => ({ text }))
          : source.options,
        is_html_enabled: params.isHtmlEnabled ?? source.is_html_enabled,
      },
      feedback_correct:
        params.feedbackCorrect ?? current.block.feedback_correct,
      feedback_wrong: params.feedbackWrong ?? current.block.feedback_wrong,
    },
  });
}
