import { getAccessToken } from '../auth.js';
import {
  createStepSource,
  fetchStepSource,
  StepSource,
  updateStepSource,
} from './client.js';

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

  return createStepSource(accessToken, {
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
  });
}

export async function updateCodeStep(
  params: UpdateCodeStepParams,
): Promise<StepSource> {
  const accessToken = await getAccessToken();
  const current = await fetchStepSource(accessToken, params.stepId);
  const { source } = current.block;

  return updateStepSource(accessToken, params.stepId, {
    lesson: current.lesson,
    position: params.position ?? current.position,
    cost: params.points ?? current.cost,
    block: {
      name: 'code',
      text: params.question ?? current.block.text,
      source: {
        ...source,
        code: params.checkerCode ?? source.code,
        execution_time_limit:
          params.executionTimeLimit ?? source.execution_time_limit,
        execution_memory_limit:
          params.executionMemoryLimit ?? source.execution_memory_limit,
        samples_count: params.samplesCount ?? source.samples_count,
        templates_data: params.templates
          ? buildTemplatesData(params.templates)
          : source.templates_data,
      },
    },
  });
}
