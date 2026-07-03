export function parseThinkingContent(text: string) {
  const thinkingRegex = /<think>([\s\S]*?)<\/think>/gi;
  const matches = [];
  let match;
  let cleanedText = text;

  while ((match = thinkingRegex.exec(text)) !== null) {
    matches.push({
      type: "reasoning" as const,
      text: match[1].trim(),
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  cleanedText = text.replace(thinkingRegex, "").trim();

  return {
    reasoning: matches.map((m) => m.text),
    cleanText: cleanedText,
    hasReasoning: matches.length > 0,
  };
}
