import { UIMessage } from "ai";
import { parseThinkingContent } from "@/components/ChatSession";
import { generateChatTitle } from "./chat-history";

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString(); // e.g., "10/27/2023, 10:30:00 AM"
}

export function exportChatAsMarkdown(messages: UIMessage[], chatTitle?: string): string {
  const title = chatTitle || generateChatTitle(messages);
  let markdownContent = `# ${title}\n\n`;

  messages.forEach((m) => {
    const timestamp = m.createdAt ? formatTimestamp(m.createdAt) : "Unknown Time";
    markdownContent += `---\n\n`; // Separator for messages

    if (m.role === "user") {
      markdownContent += `## User (${timestamp})\n\n`;
      m.parts.forEach((part) => {
        if (part.type === "text") {
          markdownContent += part.text + "\n\n";
        } else if (part.type === "file" && part.mediaType?.startsWith("image/")) {
          // For images, include a link if a URL is available, otherwise a placeholder
          markdownContent += `![User Uploaded Image](${part.url || 'No image URL available'})\n\n`;
        }
      });
    } else { // role === "assistant"
      markdownContent += `## Assistant (${timestamp})\n\n`;
      m.parts.forEach((part) => {
        if (part.type === "text") {
          const parsed = parseThinkingContent(part.text);
          if (parsed.hasReasoning) {
            parsed.reasoning.forEach((reasoningText) => {
              markdownContent += `**Thinking:**\n\n${reasoningText}\n\n`;
            });
          }
          if (parsed.cleanText) {
            markdownContent += parsed.cleanText + "\n\n";
          }
        } else if (part.type === "reasoning") { // Direct reasoning part, if it ever comes separately
          markdownContent += `**Thinking:**\n\n${part.text}\n\n`;
        }
      });
    }
  });

  return markdownContent;
}

// Function to trigger download
export function downloadMarkdownFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
