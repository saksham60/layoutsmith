export function extractCodeBlocks(markdown: string) {
  // Matches ```<lang>\n...\n```
  const regex = /```[\s\S]*?\n([\s\S]*?)```/g;
  const blocks: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(markdown))) {
    blocks.push(m[1]);
  }
  return blocks.length ? blocks : [markdown.trim()];
}
