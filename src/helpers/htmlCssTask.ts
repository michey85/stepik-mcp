import { z } from 'zod';

export const htmlCssTestSchema = z.object({
  type: z
    .enum([
      'hasElement',
      'checkContent',
      'checkClass',
      'checkAttribute',
      'checkCssStyle',
      'checkSource',
      'checkValidityOfSources',
    ])
    .describe('The check to run against the selector'),
  data: z
    .record(z.string(), z.string())
    .describe(
      'Check parameters, all string-valued: hasElement -> {childSel} (descendant tag, "" for none); ' +
        'checkContent -> {contentExpression} (exact text, or "/regex/flags"); ' +
        'checkClass -> {className}; ' +
        'checkAttribute -> {attr, attrValue}; ' +
        'checkCssStyle -> {ruleName, value}; ' +
        'checkSource -> {sourceType: "html"|"css", sourceExpression: "/regex/flags"}; ' +
        'checkValidityOfSources -> {sourceType: "html"|"css"|"html + css"}',
    ),
});

export const htmlCssChecklistItemSchema = z.object({
  name: z.string().describe('Checklist item label shown to the student'),
  selector: z
    .string()
    .describe(
      'DOM selector: a bare tag name, #id, .class, or tag.class/tag#id — no descendant/combinator selectors, ' +
        'and no :nth-child. ":first-child"/":last-child" work outside <body>. Use "" for checks not tied to one element (checkSource, checkValidityOfSources).',
    ),
  tests: z
    .array(htmlCssTestSchema)
    .min(1)
    .describe('One or more checks run against this selector'),
});
