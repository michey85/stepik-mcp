import { getAccessToken } from '../auth.js';
import {
  createStepSource,
  fetchStepSource,
  StepSource,
  updateStepSource,
} from './client.js';

export interface FillBlanksOption {
  text: string;
  isCorrect: boolean;
}

export interface FillBlanksComponent {
  type: 'text' | 'input' | 'select';
  text?: string;
  options?: FillBlanksOption[];
}

export interface CreateFillBlanksStepParams {
  lessonId: number;
  position: number;
  question: string;
  components: FillBlanksComponent[];
  isCaseSensitive?: boolean;
  isDetailedFeedback?: boolean;
  isPartiallyCorrect?: boolean;
  points?: number;
}

export interface UpdateFillBlanksStepParams {
  stepId: number;
  position?: number;
  question?: string;
  components?: FillBlanksComponent[];
  isCaseSensitive?: boolean;
  isDetailedFeedback?: boolean;
  isPartiallyCorrect?: boolean;
  points?: number;
}

function buildFillBlanksComponents(
  components: FillBlanksComponent[],
): Record<string, unknown>[] {
  return components.map((component) => ({
    type: component.type,
    text: component.text ?? '',
    options: (component.options ?? []).map((option) => ({
      text: option.text,
      is_correct: option.isCorrect,
    })),
  }));
}

export async function createFillBlanksStep(
  params: CreateFillBlanksStepParams,
): Promise<StepSource> {
  const accessToken = await getAccessToken();

  return createStepSource(accessToken, {
    lesson: params.lessonId,
    position: params.position,
    cost: params.points ?? 1,
    block: {
      name: 'fill-blanks',
      text: params.question,
      source: {
        components: buildFillBlanksComponents(params.components),
        is_case_sensitive: params.isCaseSensitive ?? false,
        is_detailed_feedback: params.isDetailedFeedback ?? false,
        is_partially_correct: params.isPartiallyCorrect ?? false,
      },
    },
  });
}

export async function updateFillBlanksStep(
  params: UpdateFillBlanksStepParams,
): Promise<StepSource> {
  const accessToken = await getAccessToken();
  const current = await fetchStepSource(accessToken, params.stepId);
  const { source } = current.block;

  return updateStepSource(accessToken, params.stepId, {
    lesson: current.lesson,
    position: params.position ?? current.position,
    cost: params.points ?? current.cost,
    block: {
      name: 'fill-blanks',
      text: params.question ?? current.block.text,
      source: {
        components: params.components
          ? buildFillBlanksComponents(params.components)
          : source.components,
        is_case_sensitive: params.isCaseSensitive ?? source.is_case_sensitive,
        is_detailed_feedback:
          params.isDetailedFeedback ?? source.is_detailed_feedback,
        is_partially_correct:
          params.isPartiallyCorrect ?? source.is_partially_correct,
      },
    },
  });
}
