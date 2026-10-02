const STEP_SOURCES_URL = 'https://stepik.org/api/step-sources';

export interface StepSource {
  id: number;
  lesson: number;
  position: number;
  block: {
    name: string;
    text: string;
  };
}

export interface RawStepSource {
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

interface StepSourcesResponse<T> {
  'step-sources': T[];
}

async function request<T>(
  url: string,
  accessToken: string,
  init: { method?: 'POST' | 'PUT'; body?: unknown } = {},
): Promise<T | undefined> {
  const response = await fetch(url, {
    method: init.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      ...(init.body !== undefined && { 'Content-Type': 'application/json' }),
    },
    body:
      init.body !== undefined
        ? JSON.stringify({ stepSource: init.body })
        : undefined,
  });

  if (!response.ok) {
    throw new Error(
      `HTTP error! status: ${response.status} ${await response.text()}`,
    );
  }

  const data: StepSourcesResponse<T> = await response.json();
  return data['step-sources'][0];
}

export async function fetchStepSource(
  accessToken: string,
  stepId: number,
): Promise<RawStepSource> {
  const stepSource = await request<RawStepSource>(
    `${STEP_SOURCES_URL}/${stepId}`,
    accessToken,
  );
  if (!stepSource) {
    throw new Error(`Step ${stepId} not found`);
  }
  return stepSource;
}

export function assertBlockName(
  stepSource: RawStepSource,
  expected: string,
  label: string,
): void {
  if (stepSource.block.name !== expected) {
    throw new Error(
      `Step ${stepSource.id} is a '${stepSource.block.name}' step, not ${label}`,
    );
  }
}

export async function createStepSource(
  accessToken: string,
  stepSource: Record<string, unknown>,
): Promise<StepSource> {
  return (await request<StepSource>(STEP_SOURCES_URL, accessToken, {
    method: 'POST',
    body: stepSource,
  }))!;
}

export async function updateStepSource(
  accessToken: string,
  stepId: number,
  stepSource: Record<string, unknown>,
): Promise<StepSource> {
  return (await request<StepSource>(
    `${STEP_SOURCES_URL}/${stepId}`,
    accessToken,
    { method: 'PUT', body: stepSource },
  ))!;
}
