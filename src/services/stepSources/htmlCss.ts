import { getAccessToken } from '../auth.js';
import {
  createStepSource,
  fetchStepSource,
  StepSource,
  updateStepSource,
} from './client.js';

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

export async function createHtmlCssStep(
  params: CreateHtmlCssStepParams,
): Promise<StepSource> {
  const accessToken = await getAccessToken();

  return createStepSource(accessToken, {
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
  });
}

export async function updateHtmlCssStep(
  params: UpdateHtmlCssStepParams,
): Promise<StepSource> {
  const accessToken = await getAccessToken();
  const current = await fetchStepSource(accessToken, params.stepId);
  const { source } = current.block;

  return updateStepSource(accessToken, params.stepId, {
    lesson: current.lesson,
    position: params.position ?? current.position,
    cost: params.points ?? current.cost,
    block: {
      name: 'html',
      text: params.question ?? current.block.text,
      source: {
        html_template: params.htmlTemplate ?? source.html_template,
        css_template: params.cssTemplate ?? source.css_template,
        checklist: params.checklist ?? source.checklist,
      },
    },
  });
}
