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

const DEFAULT_OPTIONS: TableSource['options'] = {
  is_checkbox: false,
  is_randomize_rows: true,
  is_randomize_columns: true,
  sample_size: -1,
};

function assertUniqueNames(names: string[], label: string): void {
  const seen = new Set<string>();
  for (const name of names) {
    const key = name.trim();
    if (seen.has(key)) {
      throw new Error(
        `Duplicate ${label} '${name}': students could not tell them apart`,
      );
    }
    seen.add(key);
  }
}

// Stepik accepts a malformed table silently, so catch the mistakes up front:
// unique row/column names, one choice per column in every row, and (unless any
// answer counts as correct) exactly one correct column per row in single-choice
// mode, or at least one correct cell overall in checkbox mode.
function validateTableSource(source: TableSource): void {
  assertUniqueNames(
    source.columns.map((column) => column.name),
    'column',
  );
  assertUniqueNames(
    source.rows.map((row) => row.name),
    'row',
  );

  const columnCount = source.columns.length;
  for (const row of source.rows) {
    if (row.columns.length !== columnCount) {
      throw new Error(
        `Row '${row.name}' has ${row.columns.length} choices, but the table has ${columnCount} columns`,
      );
    }
  }
  if (source.is_always_correct) return;

  if (source.options.is_checkbox) {
    const hasCorrect = source.rows.some((row) =>
      row.columns.some((column) => column.choice),
    );
    if (!hasCorrect) {
      throw new Error(
        'The table has no correct cells; mark at least one choice as true (or set isAlwaysCorrect)',
      );
    }
    return;
  }
  for (const row of source.rows) {
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
  const source: TableSource = {
    description: params.description,
    columns: params.columns.map((name) => ({ name })),
    rows: toSourceRows(params.rows),
    options: {
      ...DEFAULT_OPTIONS,
      is_checkbox: params.isCheckbox ?? DEFAULT_OPTIONS.is_checkbox,
      is_randomize_rows:
        params.isRandomizeRows ?? DEFAULT_OPTIONS.is_randomize_rows,
      is_randomize_columns:
        params.isRandomizeColumns ?? DEFAULT_OPTIONS.is_randomize_columns,
    },
    is_always_correct: params.isAlwaysCorrect ?? false,
  };
  validateTableSource(source);
  const accessToken = await getAccessToken();

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
  // Rows hold one flag per column, so new columns would be paired with the old
  // flags; demand both instead of guessing which cells stay correct.
  if (params.columns && !params.rows) {
    throw new Error(
      'Pass rows together with columns: each row must list its choices for the new columns',
    );
  }

  const accessToken = await getAccessToken();
  const current = await fetchStepSource(accessToken, params.stepId);
  assertBlockName(current, 'table', 'a table step');
  const currentSource = current.block.source as TableSource;
  const currentOptions = { ...DEFAULT_OPTIONS, ...currentSource.options };

  const source: TableSource = {
    ...currentSource,
    description: params.description ?? currentSource.description,
    columns: params.columns
      ? params.columns.map((name) => ({ name }))
      : currentSource.columns,
    rows: params.rows ? toSourceRows(params.rows) : currentSource.rows,
    options: {
      ...currentOptions,
      is_checkbox: params.isCheckbox ?? currentOptions.is_checkbox,
      is_randomize_rows:
        params.isRandomizeRows ?? currentOptions.is_randomize_rows,
      is_randomize_columns:
        params.isRandomizeColumns ?? currentOptions.is_randomize_columns,
    },
    is_always_correct:
      params.isAlwaysCorrect ?? currentSource.is_always_correct ?? false,
  };
  // Only re-check the grid when the update touches it, so a table built in the
  // Stepik UI that breaks our stricter rules can still get text/points edits.
  const touchesGrid =
    params.rows !== undefined ||
    params.columns !== undefined ||
    params.isCheckbox !== undefined ||
    params.isAlwaysCorrect !== undefined;
  if (touchesGrid) validateTableSource(source);

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
