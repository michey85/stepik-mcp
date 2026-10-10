import { getAccessToken } from '../auth.js';
import {
  assertBlockName,
  createStepSource,
  fetchStepSource,
  StepSource,
  updateStepSource,
} from './client.js';

export interface MatchingPair {
  first: string;
  second: string;
}

export interface CreateMatchingStepParams {
  lessonId: number;
  position: number;
  question: string;
  pairs: MatchingPair[];
  preserveFirstsOrder?: boolean;
  isHtmlEnabled?: boolean;
  feedbackCorrect?: string;
  feedbackWrong?: string;
  points?: number;
}

export interface UpdateMatchingStepParams {
  stepId: number;
  position?: number;
  question?: string;
  pairs?: MatchingPair[];
  preserveFirstsOrder?: boolean;
  isHtmlEnabled?: boolean;
  feedbackCorrect?: string;
  feedbackWrong?: string;
  points?: number;
}

export async function createMatchingStep(
  params: CreateMatchingStepParams,
): Promise<StepSource> {
  const accessToken = await getAccessToken();

  return createStepSource(accessToken, {
    lesson: params.lessonId,
    position: params.position,
    cost: params.points ?? 1,
    block: {
      name: 'matching',
      text: params.question,
      source: {
        pairs: params.pairs,
        preserve_firsts_order: params.preserveFirstsOrder ?? true,
        is_html_enabled: params.isHtmlEnabled ?? true,
      },
      feedback_correct: params.feedbackCorrect,
      feedback_wrong: params.feedbackWrong,
    },
  });
}

export async function updateMatchingStep(
  params: UpdateMatchingStepParams,
): Promise<StepSource> {
  const accessToken = await getAccessToken();
  const current = await fetchStepSource(accessToken, params.stepId);
  assertBlockName(current, 'matching', 'a matching step');
  const { source } = current.block;

  return updateStepSource(accessToken, params.stepId, {
    lesson: current.lesson,
    position: params.position ?? current.position,
    cost: params.points ?? current.cost,
    block: {
      name: 'matching',
      text: params.question ?? current.block.text,
      source: {
        ...source,
        pairs: params.pairs ?? source.pairs,
        preserve_firsts_order:
          params.preserveFirstsOrder ?? source.preserve_firsts_order,
        is_html_enabled: params.isHtmlEnabled ?? source.is_html_enabled,
      },
      feedback_correct:
        params.feedbackCorrect ?? current.block.feedback_correct,
      feedback_wrong: params.feedbackWrong ?? current.block.feedback_wrong,
    },
  });
}
