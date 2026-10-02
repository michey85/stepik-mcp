import { getAccessToken } from '../auth.js';
import {
  createStepSource,
  fetchStepSource,
  StepSource,
  updateStepSource,
} from './client.js';

export interface ChoiceOption {
  text: string;
  isCorrect: boolean;
  feedback?: string;
}

export interface CreateChoiceStepParams {
  lessonId: number;
  position: number;
  question: string;
  options: ChoiceOption[];
  isMultipleChoice?: boolean;
  isHtmlEnabled?: boolean;
  isOptionsFeedback?: boolean;
  feedbackCorrect?: string;
  feedbackWrong?: string;
  points?: number;
}

export interface UpdateChoiceStepParams {
  stepId: number;
  position?: number;
  question?: string;
  options?: ChoiceOption[];
  isMultipleChoice?: boolean;
  isHtmlEnabled?: boolean;
  isOptionsFeedback?: boolean;
  feedbackCorrect?: string;
  feedbackWrong?: string;
  points?: number;
}

function buildChoiceOptions(options: ChoiceOption[]) {
  return options.map((option) => ({
    text: option.text,
    is_correct: option.isCorrect,
    feedback: option.feedback ?? '',
  }));
}

export async function createChoiceStep(
  params: CreateChoiceStepParams,
): Promise<StepSource> {
  const accessToken = await getAccessToken();

  return createStepSource(accessToken, {
    lesson: params.lessonId,
    position: params.position,
    cost: params.points ?? 1,
    block: {
      name: 'choice',
      text: params.question,
      source: {
        options: buildChoiceOptions(params.options),
        is_always_correct: false,
        is_html_enabled: params.isHtmlEnabled ?? true,
        sample_size: params.options.length,
        is_multiple_choice: params.isMultipleChoice ?? false,
        preserve_order: false,
        is_options_feedback: params.isOptionsFeedback ?? false,
      },
      feedback_correct: params.feedbackCorrect,
      feedback_wrong: params.feedbackWrong,
    },
  });
}

export async function updateChoiceStep(
  params: UpdateChoiceStepParams,
): Promise<StepSource> {
  const accessToken = await getAccessToken();
  const current = await fetchStepSource(accessToken, params.stepId);
  const { source } = current.block;

  return updateStepSource(accessToken, params.stepId, {
    lesson: current.lesson,
    position: params.position ?? current.position,
    cost: params.points ?? current.cost,
    block: {
      name: 'choice',
      text: params.question ?? current.block.text,
      source: {
        options: params.options
          ? buildChoiceOptions(params.options)
          : source.options,
        is_always_correct: source.is_always_correct,
        is_html_enabled: params.isHtmlEnabled ?? source.is_html_enabled,
        sample_size: params.options
          ? params.options.length
          : source.sample_size,
        is_multiple_choice:
          params.isMultipleChoice ?? source.is_multiple_choice,
        preserve_order: source.preserve_order,
        is_options_feedback:
          params.isOptionsFeedback ?? source.is_options_feedback,
      },
      feedback_correct:
        params.feedbackCorrect ?? current.block.feedback_correct,
      feedback_wrong: params.feedbackWrong ?? current.block.feedback_wrong,
    },
  });
}
