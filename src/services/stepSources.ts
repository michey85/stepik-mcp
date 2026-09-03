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
  isHtmlEnabled?: boolean;
  isOptionsFeedback?: boolean;
  feedbackCorrect?: string;
  feedbackWrong?: string;
  points?: number;
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
  points?: number;
}

export interface HtmlCssCheck {
  type:
    | 'hasElement'
    | 'checkContent'
    | 'checkClass'
    | 'checkAttribute'
    | 'checkCssStyle'
    | 'checkSource'
    | 'checkValidityOfSources';
  data: Record<string, string>;
}

export interface HtmlCssChecklistItem {
  name: string;
  selector: string;
  tests: HtmlCssCheck[];
}

export interface CreateHtmlCssStepParams {
  lessonId: number;
  position: number;
  question: string;
  htmlTemplate: string;
  cssTemplate?: string;
  checklist: HtmlCssChecklistItem[];
  points?: number;
}

export interface UpdateHtmlCssStepParams {
  stepId: number;
  position?: number;
  question?: string;
  htmlTemplate?: string;
  cssTemplate?: string;
  checklist?: HtmlCssChecklistItem[];
  points?: number;
}

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

interface RawStepSource {
  id: number;
  lesson: number;
  position: number;
  cost: number;
  block: {
    name: string;
    text: string;
    source: Record<string, any>;
    feedback_correct?: string;
    feedback_wrong?: string;
  };
}

interface RawStepSourcesResponse {
  'step-sources': RawStepSource[];
}

async function fetchStepSource(stepId: number): Promise<RawStepSource> {
  const accessToken = await getAccessToken();

  const response = await fetch(`${STEP_SOURCES_URL}/${stepId}`, {
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

  const data: RawStepSourcesResponse = await response.json();
  const stepSource = data['step-sources'][0];
  if (!stepSource) {
    throw new Error(`Step ${stepId} not found`);
  }
  return stepSource;
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
        cost: params.points ?? 1,
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

export interface UpdateCodeStepParams {
  stepId: number;
  position?: number;
  question?: string;
  checkerCode?: string;
  testCases?: CodeTestCase[];
  executionTimeLimit?: number;
  executionMemoryLimit?: number;
  samplesCount?: number;
  templates?: CodeTemplate[];
  points?: number;
}

export async function updateCodeStep(
  params: UpdateCodeStepParams,
): Promise<StepSource> {
  const current = await fetchStepSource(params.stepId);
  const accessToken = await getAccessToken();

  const response = await fetch(`${STEP_SOURCES_URL}/${params.stepId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      stepSource: {
        lesson: current.lesson,
        position: params.position ?? current.position,
        cost: params.points ?? current.cost,
        block: {
          name: 'code',
          text: params.question ?? current.block.text,
          source: {
            ...current.block.source,
            code: params.checkerCode ?? current.block.source.code,
            execution_time_limit:
              params.executionTimeLimit ??
              current.block.source.execution_time_limit,
            execution_memory_limit:
              params.executionMemoryLimit ??
              current.block.source.execution_memory_limit,
            samples_count:
              params.samplesCount ?? current.block.source.samples_count,
            templates_data: params.templates
              ? buildTemplatesData(params.templates)
              : current.block.source.templates_data,
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
        cost: params.points ?? 1,
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
            preserve_order: false,
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

export async function createHtmlCssStep(
  params: CreateHtmlCssStepParams,
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
        cost: params.points ?? 1,
        block: {
          name: 'html',
          text: params.question,
          source: {
            html_template: params.htmlTemplate,
            css_template: params.cssTemplate ?? '',
            checklist: params.checklist,
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

export async function updateHtmlCssStep(
  params: UpdateHtmlCssStepParams,
): Promise<StepSource> {
  const current = await fetchStepSource(params.stepId);
  const accessToken = await getAccessToken();

  const response = await fetch(`${STEP_SOURCES_URL}/${params.stepId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      stepSource: {
        lesson: current.lesson,
        position: params.position ?? current.position,
        cost: params.points ?? current.cost,
        block: {
          name: 'html',
          text: params.question ?? current.block.text,
          source: {
            html_template:
              params.htmlTemplate ?? current.block.source.html_template,
            css_template:
              params.cssTemplate ?? current.block.source.css_template,
            checklist: params.checklist ?? current.block.source.checklist,
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

export async function updateFillBlanksStep(
  params: UpdateFillBlanksStepParams,
): Promise<StepSource> {
  const current = await fetchStepSource(params.stepId);
  const accessToken = await getAccessToken();

  const response = await fetch(`${STEP_SOURCES_URL}/${params.stepId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      stepSource: {
        lesson: current.lesson,
        position: params.position ?? current.position,
        cost: params.points ?? current.cost,
        block: {
          name: 'fill-blanks',
          text: params.question ?? current.block.text,
          source: {
            components: params.components
              ? buildFillBlanksComponents(params.components)
              : current.block.source.components,
            is_case_sensitive:
              params.isCaseSensitive ?? current.block.source.is_case_sensitive,
            is_detailed_feedback:
              params.isDetailedFeedback ??
              current.block.source.is_detailed_feedback,
            is_partially_correct:
              params.isPartiallyCorrect ??
              current.block.source.is_partially_correct,
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

export async function updateChoiceStep(
  params: UpdateChoiceStepParams,
): Promise<StepSource> {
  const current = await fetchStepSource(params.stepId);
  const accessToken = await getAccessToken();

  const response = await fetch(`${STEP_SOURCES_URL}/${params.stepId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      stepSource: {
        lesson: current.lesson,
        position: params.position ?? current.position,
        cost: params.points ?? current.cost,
        block: {
          name: 'choice',
          text: params.question ?? current.block.text,
          source: {
            options: params.options
              ? params.options.map((option) => ({
                  text: option.text,
                  is_correct: option.isCorrect,
                  feedback: option.feedback ?? '',
                }))
              : current.block.source.options,
            is_always_correct: current.block.source.is_always_correct,
            is_html_enabled:
              params.isHtmlEnabled ?? current.block.source.is_html_enabled,
            sample_size: params.options
              ? params.options.length
              : current.block.source.sample_size,
            is_multiple_choice:
              params.isMultipleChoice ??
              current.block.source.is_multiple_choice,
            preserve_order: current.block.source.preserve_order,
            is_options_feedback:
              params.isOptionsFeedback ??
              current.block.source.is_options_feedback,
          },
          feedback_correct:
            params.feedbackCorrect ?? current.block.feedback_correct,
          feedback_wrong: params.feedbackWrong ?? current.block.feedback_wrong,
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
