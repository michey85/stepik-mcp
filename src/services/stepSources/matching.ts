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
  feedbackCorrect?: string;
  feedbackWrong?: string;
  points?: number;
}

/**
 * Mirrors the validation Stepik's own matching quiz performs: `first` values
 * must be unique, and non-blank `second` values must be unique (a blank
 * `second` is legal and accepts any permutation). Violating this results in
 * an opaque HTTP error from the API, so we catch it client-side with a clear
 * message instead.
 */
function assertUniquePairs(pairs: MatchingPair[]): void {
  const firsts = pairs.map((pair) => pair.first);
  const duplicateFirst = firsts.find(
    (value, index) => firsts.indexOf(value) !== index,
  );
  if (duplicateFirst !== undefined) {
    throw new Error(
      `Ambiguous pairs: left-hand item "${duplicateFirst}" appears more than once.`,
    );
  }

  const nonBlankSeconds = pairs
    .map((pair) => pair.second)
    .filter((value) => value.trim() !== '');
  const duplicateSecond = nonBlankSeconds.find(
    (value, index) => nonBlankSeconds.indexOf(value) !== index,
  );
  if (duplicateSecond !== undefined) {
    throw new Error(
      `Ambiguous pairs: right-hand item "${duplicateSecond}" appears more than once (blank second values are the only ones allowed to repeat).`,
    );
  }
}

export async function createMatchingStep(
  params: CreateMatchingStepParams,
): Promise<StepSource> {
  assertUniquePairs(params.pairs);
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
      },
      feedback_correct: params.feedbackCorrect,
      feedback_wrong: params.feedbackWrong,
    },
  });
}

export async function updateMatchingStep(
  params: UpdateMatchingStepParams,
): Promise<StepSource> {
  if (params.pairs) {
    assertUniquePairs(params.pairs);
  }
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
          params.preserveFirstsOrder ?? source.preserve_firsts_order ?? true,
      },
      feedback_correct:
        params.feedbackCorrect ?? current.block.feedback_correct,
      feedback_wrong: params.feedbackWrong ?? current.block.feedback_wrong,
    },
  });
}
