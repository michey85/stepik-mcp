import { getAccessToken } from '../auth.js';
import {
  assertBlockName,
  createStepSource,
  fetchStepSource,
  StepSource,
  updateStepSource,
} from './client.js';

export interface TableRow {
  name: string;
  choices: boolean[];
}

export interface CreateTableStepParams {
  lessonId: number;
  position: number;
  question: string;
  description: string;
  columns: string[];
  rows: TableRow[];
  isCheckbox?: boolean;
  isRandomizeRows?: boolean;
  isRandomizeColumns?: boolean;
  isAlwaysCorrect?: boolean;
  feedbackCorrect?: string;
  feedbackWrong?: string;
  points?: number;
}

export interface UpdateTableStepParams {
  stepId: number;
  position?: number;
  question?: string;
  description?: string;
  columns?: string[];
  rows?: TableRow[];
  isCheckbox?: boolean;
  isRandomizeRows?: boolean;
  isRandomizeColumns?: boolean;
  isAlwaysCorrect?: boolean;
  feedbackCorrect?: string;
  feedbackWrong?: string;
  points?: number;
}

interface TableSource {
  description: string;
  columns: { name: string }[];
  rows: { name: string; columns: { choice: boolean }[] }[];
  options: {
    is_checkbox: boolean;
    is_randomize_rows: boolean;
    is_randomize_columns: boolean;
    sample_size: number;
  };
  is_always_correct: boolean;
}

function toSourceRows(rows: TableRow[]): TableSource['rows'] {
  return rows.map((row) => ({
    name: row.name,
    columns: row.choices.map((choice) => ({ choice })),
  }));
}

// Stepik accepts a malformed table silently, so catch the mistakes up front:
// every row needs one choice per column, and in single-choice mode exactly one
// correct column (unless any answer counts as correct).
function validateTableSource(source: TableSource): void {
  const columnCount = source.columns.length;
  for (const row of source.rows) {
    if (row.columns.length !== columnCount) {
      throw new Error(
        `Row '${row.name}' has ${row.columns.length} choices, but the table has ${columnCount} columns`,
      );
    }
    if (source.options.is_checkbox || source.is_always_correct) continue;
    const correctCount = row.columns.filter((column) => column.choice).length;
    if (correctCount !== 1) {
      throw new Error(
        `Row '${row.name}' has ${correctCount} correct columns; single-choice tables need exactly one (set isCheckbox to allow several)`,
      );
    }
  }
}

export async function createTableStep(
  params: CreateTableStepParams,
): Promise<StepSource> {
  const accessToken = await getAccessToken();

  const source: TableSource = {
    description: params.description,
    columns: params.columns.map((name) => ({ name })),
    rows: toSourceRows(params.rows),
    options: {
      is_checkbox: params.isCheckbox ?? false,
      is_randomize_rows: params.isRandomizeRows ?? true,
      is_randomize_columns: params.isRandomizeColumns ?? true,
      sample_size: -1,
    },
    is_always_correct: params.isAlwaysCorrect ?? false,
  };
  validateTableSource(source);

  return createStepSource(accessToken, {
    lesson: params.lessonId,
    position: params.position,
    cost: params.points ?? 1,
    block: {
      name: 'table',
      text: params.question,
      source,
      feedback_correct: params.feedbackCorrect,
      feedback_wrong: params.feedbackWrong,
    },
  });
}

export async function updateTableStep(
  params: UpdateTableStepParams,
): Promise<StepSource> {
  const accessToken = await getAccessToken();
  const current = await fetchStepSource(accessToken, params.stepId);
  assertBlockName(current, 'table', 'a table step');
  const currentSource = current.block.source as TableSource;

  const source: TableSource = {
    ...currentSource,
    description: params.description ?? currentSource.description,
    columns: params.columns
      ? params.columns.map((name) => ({ name }))
      : currentSource.columns,
    rows: params.rows ? toSourceRows(params.rows) : currentSource.rows,
    options: {
      ...currentSource.options,
      is_checkbox: params.isCheckbox ?? currentSource.options.is_checkbox,
      is_randomize_rows:
        params.isRandomizeRows ?? currentSource.options.is_randomize_rows,
      is_randomize_columns:
        params.isRandomizeColumns ?? currentSource.options.is_randomize_columns,
    },
    is_always_correct:
      params.isAlwaysCorrect ?? currentSource.is_always_correct,
  };
  validateTableSource(source);

  return updateStepSource(accessToken, params.stepId, {
    lesson: current.lesson,
    position: params.position ?? current.position,
    cost: params.points ?? current.cost,
    block: {
      name: 'table',
      text: params.question ?? current.block.text,
      source,
      feedback_correct:
        params.feedbackCorrect ?? current.block.feedback_correct,
      feedback_wrong: params.feedbackWrong ?? current.block.feedback_wrong,
    },
  });
}
