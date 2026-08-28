import { getAccessToken } from './auth.js';

const STEP_SOURCES_URL = 'https://stepik.org/api/step-sources';

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
  preserveOrder?: boolean;
  isHtmlEnabled?: boolean;
  isOptionsFeedback?: boolean;
  feedbackCorrect?: string;
  feedbackWrong?: string;
}

export interface StepSource {
  id: number;
  lesson: number;
  position: number;
  block: {
    name: string;
    text: string;
  };
}

interface StepSourcesResponse {
  'step-sources': StepSource[];
}

export interface CodeTestCase {
  input: string;
  output: string;
}

export interface CodeTemplate {
  language: string;
  header?: string;
  code?: string;
  footer?: string;
}

export interface CreateCodeStepParams {
  lessonId: number;
  position: number;
  question: string;
  checkerCode: string;
  testCases: CodeTestCase[];
  executionTimeLimit?: number;
  executionMemoryLimit?: number;
  samplesCount?: number;
  templates?: CodeTemplate[];
}

function buildTemplatesData(templates: CodeTemplate[]): string {
  return templates
    .map((template) =>
      [
        `::${template.language}`,
        '::header',
        template.header ?? '',
        '::code',
        template.code ?? '',
        '::footer',
        template.footer ?? '',
      ].join('\n'),
    )
    .join('\n');
}

export async function createCodeStep(
  params: CreateCodeStepParams,
): Promise<StepSource> {
  const accessToken = await getAccessToken();

  const response = await fetch(STEP_SOURCES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      stepSource: {
        lesson: params.lessonId,
        position: params.position,
        block: {
          name: 'code',
          text: params.question,
          source: {
            code: params.checkerCode,
            execution_time_limit: params.executionTimeLimit ?? 5,
            execution_memory_limit: params.executionMemoryLimit ?? 256,
            samples_count: params.samplesCount ?? 1,
            templates_data: params.templates
              ? buildTemplatesData(params.templates)
              : '',
            is_time_limit_scaled: true,
            is_memory_limit_scaled: true,
            is_run_user_code_allowed: true,
            manual_time_limits: [],
            manual_memory_limits: [],
            test_archive: [],
            test_cases: params.testCases.map((testCase) => [
              testCase.input,
              testCase.output,
            ]),
          },
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `HTTP error! status: ${response.status} ${await response.text()}`,
    );
  }

  const data: StepSourcesResponse = await response.json();
  return data['step-sources'][0];
}

export async function createChoiceStep(
  params: CreateChoiceStepParams,
): Promise<StepSource> {
  const accessToken = await getAccessToken();

  const response = await fetch(STEP_SOURCES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      stepSource: {
        lesson: params.lessonId,
        position: params.position,
        block: {
          name: 'choice',
          text: params.question,
          source: {
            options: params.options.map((option) => ({
              text: option.text,
              is_correct: option.isCorrect,
              feedback: option.feedback ?? '',
            })),
            is_always_correct: false,
            is_html_enabled: params.isHtmlEnabled ?? true,
            sample_size: params.options.length,
            is_multiple_choice: params.isMultipleChoice ?? false,
            preserve_order: params.preserveOrder ?? false,
            is_options_feedback: params.isOptionsFeedback ?? false,
          },
          feedback_correct: params.feedbackCorrect,
          feedback_wrong: params.feedbackWrong,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `HTTP error! status: ${response.status} ${await response.text()}`,
    );
  }

  const data: StepSourcesResponse = await response.json();
  return data['step-sources'][0];
}
