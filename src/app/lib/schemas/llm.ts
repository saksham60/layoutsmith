// src/app/lib/schemas/llm.ts
import { z } from 'zod';

/** Minimal shapes we log for each Figma node */
const FillSchema = z.object({
  type: z.string(),
  r: z.number().optional(),
  g: z.number().optional(),
  b: z.number().optional(),
  a: z.number().optional(),
  stops: z.number().optional(),
});

const TextNodeSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  characters: z.string(),
  style: z.record(z.any()).optional(),
});

const AutoLayoutSchema = z
  .object({
    layoutMode: z.string().optional(),
    primaryAxisSizingMode: z.string().optional(),
    counterAxisSizingMode: z.string().optional(),
    primaryAxisAlignItems: z.string().optional(),
    counterAxisAlignItems: z.string().optional(),
    itemSpacing: z.number().optional(),
    padding: z
      .object({
        left: z.number().optional(),
        right: z.number().optional(),
        top: z.number().optional(),
        bottom: z.number().optional(),
      })
      .optional(),
    wrap: z.string().optional(),
    counterAxisSpacing: z.number().optional(),
  })
  .nullable()
  .optional();

export const BriefSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(), // FRAME | COMPONENT | COMPONENT_SET | etc.
  size: z.object({ width: z.number(), height: z.number() }).optional(),
  position: z.object({ x: z.number(), y: z.number() }).optional(),
  visible: z.boolean().optional(),
  fills: z.array(FillSchema).optional(),
  strokes: z.array(FillSchema).optional(),
  cornerRadius: z.number().optional(),
  rectangleCornerRadii: z.array(z.number()).optional(),
  opacity: z.number().optional(),
  blendMode: z.string().optional(),
  autolayout: AutoLayoutSchema,
  text: z.array(TextNodeSchema).default([]),
  children: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        type: z.string(),
      }),
    )
    .default([]),
});

export const GenerateRequestSchema = z.object({
  brief: BriefSchema,
  modelId: z.string().default(
    process.env.BEDROCK_MODEL_ID ??
      'anthropic.claude-3-5-sonnet-20240620-v1:0',
  ),
  temperature: z.number().min(0).max(1).optional().default(0.2),
  topP: z.number().min(0).max(1).optional().default(0.9),
  maxTokens: z.number().optional().default(2000),
});

export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

export const GenerateResponseSchema = z.object({
  code: z.string(),
  modelId: z.string().optional(),
  finishReason: z.string().optional(),
  raw: z.any().optional(),
});

export type GenerateResponse = z.infer<typeof GenerateResponseSchema>;
