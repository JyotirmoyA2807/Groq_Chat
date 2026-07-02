import { UIMessage, MessagePart } from "ai";

// Helper function to parse thinking content, moved from ChatSession.tsx
function parseThinkingContent(text: string) {
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

export function exportChatAsMarkdown(messages: UIMessage[], filename: string = "chat-export") {
  let markdownContent = `# Chat Export\n\n`;
  markdownContent += `Exported on: ${new Date().toLocaleString()}\n\n`;
  markdownContent += `---\n\n`;

  messages.forEach((m) => {
    const timestamp = m.createdAt ? ` (${m.createdAt.toLocaleString()})` : "";
    if (m.role === "user") {
      markdownContent += `## User${timestamp}\n\n`;
    } else if (m.role === "assistant") {
      markdownContent += `## Assistant${timestamp}\n\n`;
    } else {
      // Skip system, function, data, tool messages for export or handle differently
      return;
    }

    // Assuming 'parts' exists on UIMessage based on existing application usage
    (m.parts || []).forEach((part: MessagePart) => {
      if (part.type === "text") {
        const parsed = parseThinkingContent(part.text);
        if (parsed.hasReasoning) {
          parsed.reasoning.forEach(reasoningText => {
            markdownContent += `_Thinking..._\n\n${reasoningText}\n\n`;
          });
        }
        if (parsed.cleanText) {
          markdownContent += `${parsed.cleanText}\n\n`;
        }
      } else if (part.type === "file" && part.mediaType?.startsWith("image/")) {
        markdownContent += `![User Uploaded Image](${part.url})\n\n`;
      }
    });
    markdownContent += `---\n\n`;
  });

  const blob = new Blob([markdownContent], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
