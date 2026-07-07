import { UIMessage } from "ai";
import { getModelByValue } from "./model";
import { parseThinkingContent } from "./chat-utils";

export function exportChatToMarkdown(
  messages: UIMessage[],
  modelValue: string
): { filename: string; content: string } {
  const model = getModelByValue(modelValue);
  const modelLabel = model?.label || modelValue;
  const exportDate = new Date().toLocaleString();

  let markdownContent = `# Chat Export\n\n`;
  markdownContent += `**Model:** ${modelLabel}\n`;
  markdownContent += `**Export Date:** ${exportDate}\n\n`;
  markdownContent += `---\n\n`;

  messages.forEach((m) => {
    const timestamp = m.createdAt ? new Date(m.createdAt).toLocaleString() : "N/A";

    if (m.role === "user") {
      markdownContent += `## User (${timestamp})\n\n`;
      m.parts.forEach((part) => {
        if (part.type === "text") {
          markdownContent += `${part.text}\n\n`;
        } else if (part.type === "file" && part.mediaType?.startsWith("image/")) {
          // For images, just add a placeholder as base64 images are not directly embeddable in portable markdown
          markdownContent += `![Image attached: ${part.mediaType}]\n\n`;
        }
      });
    } else if (m.role === "assistant") {
      markdownContent += `## Assistant (${timestamp})\n\n`;
      m.parts.forEach((part) => {
        if (part.type === "reasoning") {
          markdownContent += `### Thinking...\n\n`;
          markdownContent += `${part.text}\n\n`;
        } else if (part.type === "text") {
          const parsed = parseThinkingContent(part.text);
          if (parsed.hasReasoning) {
            parsed.reasoning.forEach((reasoningText) => {
              markdownContent += `### Thinking...\n\n`;
              markdownContent += `${reasoningText}\n\n`;
            });
          }
          if (parsed.cleanText) {
            markdownContent += `${parsed.cleanText}\n\n`;
          }
        }
      });
    }
    markdownContent += `---\n\n`;
  });

  const filename = `chat-export-${new Date().toISOString().replace(/[:.]/g, "-")}.md`;

  return { filename, content: markdownContent };
}

// Helper to trigger download
export function downloadMarkdownFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
