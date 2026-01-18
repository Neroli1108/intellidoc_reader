import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  X,
  Send,
  Bot,
  User,
  GraduationCap,
  Zap,
  FileText,
  Code,
  Loader2,
  Copy,
  Check,
} from "lucide-react";

interface Document {
  id: string;
  title: string;
  pages: Page[];
  category: string;
}

interface Page {
  text: string;
}

interface ChatPanelProps {
  document: Document;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  mode?: "quick" | "explain" | "code";
}

type QueryMode = "quick_answer" | "explain" | "summarize" | "generate_code";

export function ChatPanel({ document, onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<"quick" | "explain">("explain");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Get document context (first few pages or current page)
      const context = document.pages
        .slice(0, 3)
        .map((p) => p.text)
        .join("\n\n");

      const queryMode: QueryMode = mode === "explain" ? "explain" : "quick_answer";

      const response = await invoke<{ answer: string }>("query_llm", {
        question: userMessage.content,
        context,
        mode: queryMode,
      });

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.answer,
        timestamp: new Date(),
        mode,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Failed to query LLM:", error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleGenerateCode = async () => {
    if (document.category !== "computerscience") return;

    setIsLoading(true);
    try {
      const context = document.pages.map((p) => p.text).join("\n\n");

      const response = await invoke<{ code: string; description: string }>(
        "generate_code",
        {
          request: {
            description: document.title,
            context,
            language: "python",
            framework: "pytorch",
            section_reference: null,
          },
        }
      );

      const codeMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: `**Generated Code Implementation**\n\n\`\`\`python\n${response.code}\n\`\`\``,
        timestamp: new Date(),
        mode: "code",
      };

      setMessages((prev) => [...prev, codeMessage]);
    } catch (error) {
      console.error("Failed to generate code:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <aside className="w-80 flex flex-col bg-white dark:bg-stone-900 border-l border-stone-200 dark:border-stone-800 animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-medium text-stone-800 dark:text-stone-200 text-sm">
              AI Assistant
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-500">
              {mode === "explain" ? "Professor Mode" : "Quick Answer"}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
        >
          <X className="w-5 h-5 text-stone-500" />
        </button>
      </div>

      {/* Mode Toggle */}
      <div className="px-4 py-2 border-b border-stone-200 dark:border-stone-800">
        <div className="flex rounded-lg bg-stone-100 dark:bg-stone-800 p-1">
          <button
            onClick={() => setMode("explain")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              mode === "explain"
                ? "bg-white dark:bg-stone-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            Professor
          </button>
          <button
            onClick={() => setMode("quick")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              mode === "quick"
                ? "bg-white dark:bg-stone-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Quick
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <Bot className="w-12 h-12 mx-auto mb-3 text-stone-300 dark:text-stone-600" />
            <p className="text-sm text-stone-500 dark:text-stone-500 mb-4">
              Ask me anything about this document!
            </p>
            <div className="space-y-2">
              <SuggestionButton
                onClick={() => setInput("What is the main contribution of this paper?")}
                icon={<FileText className="w-4 h-4" />}
              >
                Main contribution
              </SuggestionButton>
              <SuggestionButton
                onClick={() => setInput("Explain the methodology used")}
                icon={<GraduationCap className="w-4 h-4" />}
              >
                Explain methodology
              </SuggestionButton>
              {document.category === "computerscience" && (
                <SuggestionButton
                  onClick={handleGenerateCode}
                  icon={<Code className="w-4 h-4" />}
                >
                  Generate code
                </SuggestionButton>
              )}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`relative group ${
                  message.role === "user"
                    ? "chat-bubble-user"
                    : "chat-bubble-assistant"
                }`}
              >
                {message.role === "assistant" && (
                  <button
                    onClick={() => copyToClipboard(message.content, message.id)}
                    className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-stone-200 dark:hover:bg-stone-700 transition-all"
                  >
                    {copiedId === message.id ? (
                      <Check className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-stone-400" />
                    )}
                  </button>
                )}
                <div className="text-sm whitespace-pre-wrap">
                  {formatMessage(message.content)}
                </div>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="chat-bubble-assistant flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
              <span className="text-sm text-stone-500">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-stone-200 dark:border-stone-800">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about the document..."
            rows={2}
            className="w-full px-4 py-3 pr-12 text-sm rounded-xl bg-stone-100 dark:bg-stone-800 border border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-stone-900 outline-none resize-none transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 bottom-2 p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-stone-300 dark:disabled:bg-stone-700 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
        <p className="mt-2 text-xs text-stone-400 dark:text-stone-500 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </aside>
  );
}

// Suggestion button component
function SuggestionButton({
  children,
  icon,
  onClick,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-stone-600 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg transition-colors"
    >
      {icon}
      {children}
    </button>
  );
}

// Format message with markdown-like syntax
function formatMessage(content: string): React.ReactNode {
  // Simple formatting for bold and code blocks
  const parts = content.split(/(\*\*.*?\*\*|```[\s\S]*?```)/g);

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("```") && part.endsWith("```")) {
      const code = part.slice(3, -3).replace(/^\w+\n/, ""); // Remove language tag
      return (
        <pre key={i} className="code-block mt-2 mb-2">
          <code>{code}</code>
        </pre>
      );
    }
    return part;
  });
}
