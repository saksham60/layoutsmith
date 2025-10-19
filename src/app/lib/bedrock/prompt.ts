type Brief = Record<string, unknown>;

/** Build a consistent prompt asking for clean, modular React + TS + Tailwind */
export function buildPrompt(briefs: Brief[], designLanguage = 'React + TypeScript + Tailwind, accessible') {
  const system = [
    {
      type: 'text',
      text:
        `You are a senior frontend engineer. Generate clean, production-ready components.\n` +
        `- Use ${designLanguage}\n` +
        `- Prefer semantic HTML, ARIA where appropriate\n` +
        `- Keep components modular with clear props\n` +
        `- NO extra commentary in the output — just code for each component\n` +
        `- Return results as JSON: [{"name":"...", "code":"```tsx\\n...\\n```"}]\n`,
    },
  ];

  const user = [
    {
      type: 'text',
      text:
        `Convert these Figma node briefs into components.\n` +
        `Each brief contains name, type (FRAME/COMPONENT), size, fills, text, layout, and hierarchy.\n\n` +
        `BRIEFS:\n` + JSONstringify(briefs, null, 2),
    },
  ];

  return { system, user };
}
