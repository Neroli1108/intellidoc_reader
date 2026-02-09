import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  X,
  Copy,
  Check,
  Loader2,
  Code,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface CodePanelProps {
  isOpen: boolean;
  code: string;
  language: string;
  title: string;
  documentContext: string;
  onClose: () => void;
}

interface LineExplanation {
  lineNumber: number;
  explanation: string;
}

export function CodePanel({
  isOpen,
  code,
  language,
  title,
  documentContext,
  onClose,
}: CodePanelProps) {
  const [copied, setCopied] = useState(false);
  const [explanations, setExplanations] = useState<LineExplanation[]>([]);
  const [isLoadingExplanations, setIsLoadingExplanations] = useState(false);
  const [expandedLine, setExpandedLine] = useState<number | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState(language);

  const lines = code.split("\n");

  // Generate line-by-line explanations using LLM
  useEffect(() => {
    if (!isOpen || !code || explanations.length > 0) return;

    const generateExplanations = async () => {
      setIsLoadingExplanations(true);
      try {
        const prompt = `Explain each line of the following ${selectedLanguage} code. For each non-empty, non-comment line, provide a brief explanation (1 sentence).

Format your response as numbered explanations matching line numbers:
1: explanation for line 1
2: explanation for line 2
...

Only explain lines that contain actual code (skip empty lines and pure comment lines).

Code:
\`\`\`${selectedLanguage}
${code}
\`\`\``;

        const response = await invoke<{ answer: string }>("query_llm", {
          question: prompt,
          context: documentContext.slice(0, 2000),
          mode: "quick_answer",
        });

        // Parse the explanations
        const parsed: LineExplanation[] = [];
        const explanationLines = response.answer.split("\n");

        for (const line of explanationLines) {
          const match = line.match(/^(\d+)\s*[:.\-)\]]\s*(.+)/);
          if (match) {
            const lineNum = parseInt(match[1]);
            const explanation = match[2].trim();
            if (lineNum > 0 && lineNum <= lines.length && explanation) {
              parsed.push({ lineNumber: lineNum, explanation });
            }
          }
        }

        setExplanations(parsed);
      } catch (error) {
        console.error("Failed to generate explanations:", error);
        // Generate basic explanations from comments in code
        const fallback: LineExplanation[] = [];
        lines.forEach((line, i) => {
          const trimmed = line.trim();
          if (trimmed.startsWith("#") || trimmed.startsWith("//")) {
            fallback.push({
              lineNumber: i + 1,
              explanation: trimmed.replace(/^[#/]+\s*/, ""),
            });
          }
        });
        setExplanations(fallback);
      } finally {
        setIsLoadingExplanations(false);
      }
    };

    generateExplanations();
  }, [isOpen, code, selectedLanguage]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getExplanation = (lineNum: number): string | null => {
    return explanations.find(e => e.lineNumber === lineNum)?.explanation || null;
  };

  const getLineStyle = (line: string): string => {
    const trimmed = line.trim();
    if (!trimmed) return "text-stone-400";
    if (trimmed.startsWith("#") || trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
      return "text-green-600 dark:text-green-400";
    }
    if (trimmed.startsWith("def ") || trimmed.startsWith("class ") || trimmed.startsWith("function ") || trimmed.startsWith("async ")) {
      return "text-blue-600 dark:text-blue-400 font-semibold";
    }
    if (trimmed.startsWith("import ") || trimmed.startsWith("from ") || trimmed.startsWith("require(")) {
      return "text-purple-600 dark:text-purple-400";
    }
    if (trimmed.startsWith("return ") || trimmed.startsWith("yield ")) {
      return "text-orange-600 dark:text-orange-400";
    }
    return "text-stone-800 dark:text-stone-200";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-5xl max-h-[90vh] bg-white dark:bg-stone-900 rounded-xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Code className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100">
                Generated Code
              </h2>
              <p className="text-sm text-stone-500 dark:text-stone-400 line-clamp-1">
                {title}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Language selector */}
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="px-3 py-1.5 text-sm rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300"
            >
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="rust">Rust</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="go">Go</option>
            </select>

            {/* Copy button */}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-500" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              <X className="w-5 h-5 text-stone-500" />
            </button>
          </div>
        </div>

        {/* Explanation loading indicator */}
        {isLoadingExplanations && (
          <div className="flex items-center gap-2 px-6 py-2 bg-indigo-50 dark:bg-indigo-950/30 border-b border-indigo-200 dark:border-indigo-800">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
            <span className="text-sm text-indigo-600 dark:text-indigo-400">
              Generating line-by-line explanations...
            </span>
          </div>
        )}

        {/* Code content */}
        <div className="flex-1 overflow-auto">
          <div className="font-mono text-sm">
            {lines.map((line, index) => {
              const lineNum = index + 1;
              const explanation = getExplanation(lineNum);
              const isExpanded = expandedLine === lineNum;
              const hasExplanation = !!explanation;

              return (
                <div key={index}>
                  {/* Code line */}
                  <div
                    className={`flex group ${
                      hasExplanation
                        ? "cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
                        : "hover:bg-stone-50 dark:hover:bg-stone-800/50"
                    } ${isExpanded ? "bg-indigo-50 dark:bg-indigo-950/30" : ""}`}
                    onClick={() => {
                      if (hasExplanation) {
                        setExpandedLine(isExpanded ? null : lineNum);
                      }
                    }}
                  >
                    {/* Line number */}
                    <div className="w-14 flex-shrink-0 text-right pr-4 py-1 text-stone-400 dark:text-stone-600 select-none border-r border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50">
                      {lineNum}
                    </div>

                    {/* Code */}
                    <pre className={`flex-1 px-4 py-1 overflow-x-auto ${getLineStyle(line)}`}>
                      {line || " "}
                    </pre>

                    {/* Explanation indicator */}
                    {hasExplanation && (
                      <div className="flex-shrink-0 px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-indigo-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-indigo-500" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Explanation row */}
                  {isExpanded && explanation && (
                    <div className="flex bg-indigo-50 dark:bg-indigo-950/20 border-y border-indigo-100 dark:border-indigo-900/30">
                      <div className="w-14 flex-shrink-0 border-r border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50" />
                      <div className="flex-1 px-4 py-2">
                        <p className="text-sm text-indigo-700 dark:text-indigo-300 leading-relaxed">
                          {explanation}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 flex-shrink-0">
          <div className="text-xs text-stone-500 dark:text-stone-400">
            {lines.length} lines | {explanations.length} explanations
            {explanations.length > 0 && " | Click a line to see explanation"}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setExpandedLine(null);
                // Expand all
                if (expandedLine === -1) {
                  setExpandedLine(null);
                } else {
                  setExpandedLine(-1);
                }
              }}
              className="px-3 py-1.5 text-xs rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-400 transition-colors"
            >
              {expandedLine === -1 ? "Collapse All" : "Show All Explanations"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
