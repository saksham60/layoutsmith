export const DEFAULT_BEDROCK_MODEL =
  process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20240620';

export type BedrockModelId = typeof DEFAULT_BEDROCK_MODEL;
