import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Copy, Check, WrapText } from "lucide-react";
import "katex/dist/katex.min.css";

interface MarkdownPreviewProps {
  content: string;
  onLineClick?: (lineNumber: number, lineText: string) => void;
}

// Code block component with copy button and wrap toggle
function CodeBlock({
  children,
  className,
  language,
}: {
  children: React.ReactNode;
  className?: string;
  language?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [wrapLines, setWrapLines] = useState(true);

  const handleCopy = useCallback(() => {
    const text = String(children).replace(/\n$/, "");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [children]);

  return (
    <div className="relative group my-4">
      {/* Header with language and controls */}
      <div className="flex items-center justify-between bg-stone-800 dark:bg-stone-900 px-4 py-2 rounded-t-lg border-b border-stone-700">
        <span className="text-xs text-stone-400 font-mono">
          {language || "text"}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWrapLines(!wrapLines)}
            className={`p-1 rounded transition-colors ${
              wrapLines
                ? "text-indigo-400 bg-indigo-500/20"
                : "text-stone-400 hover:text-stone-300"
            }`}
            title={wrapLines ? "Disable line wrap" : "Enable line wrap"}
          >
            <WrapText className="w-4 h-4" />
          </button>
          <button
            onClick={handleCopy}
            className="p-1 rounded text-stone-400 hover:text-stone-300 transition-colors"
            title="Copy code"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
      {/* Code content */}
      <pre
        className={`bg-stone-900 dark:bg-stone-950 text-stone-100 p-4 rounded-b-lg overflow-x-auto ${
          wrapLines ? "whitespace-pre-wrap break-words" : "whitespace-pre"
        }`}
        style={{ tabSize: 2 }}
      >
        <code className={`${className || ""} font-mono text-sm leading-relaxed`}>
          {children}
        </code>
      </pre>
    </div>
  );
}

export function MarkdownPreview({ content, onLineClick }: MarkdownPreviewProps) {
  return (
    <div className="markdown-preview p-8 max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Paragraphs with click support and proper wrapping
          p: ({ children, ...props }) => (
            <p
              {...props}
              className="mb-4 leading-7 text-stone-700 dark:text-stone-300 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded px-2 -mx-2 py-1 transition-colors break-words"
              onClick={(e) => {
                const text = (e.target as HTMLElement).textContent || "";
                onLineClick?.(0, text);
              }}
            >
              {children}
            </p>
          ),

          // Code blocks - properly detect fenced vs inline
          code: ({ className, children, node, ...props }) => {
            // Check if this is a code block (inside pre) or inline code
            // react-markdown wraps fenced code blocks in <pre><code>
            // For inline code, the parent is not a pre element
            const isInline = !node?.position?.start ||
              (node.position.start.line === node.position.end.line &&
               !String(children).includes('\n'));

            // Extract language from className (e.g., "language-javascript")
            const match = /language-(\w+)/.exec(className || "");
            const language = match ? match[1] : undefined;

            // If it's truly inline code (no newlines, short content)
            if (isInline && !String(children).includes('\n')) {
              return (
                <code
                  className="bg-stone-200 dark:bg-stone-700 px-1.5 py-0.5 rounded text-sm font-mono text-indigo-700 dark:text-indigo-300"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            // Fenced code block
            return (
              <CodeBlock className={className} language={language}>
                {children}
              </CodeBlock>
            );
          },

          // Pre element - just pass through, code block handles styling
          pre: ({ children }) => <>{children}</>,

          // Headings with proper sizing and anchors
          h1: ({ children }) => {
            const id = String(children).toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
            return (
              <h1 id={id} className="text-2xl font-bold text-stone-900 dark:text-stone-100 border-b border-stone-300 dark:border-stone-600 pb-3 mb-6 mt-8 first:mt-0">
                <a href={`#${id}`} className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  {children}
                </a>
              </h1>
            );
          },
          h2: ({ children }) => {
            const id = String(children).toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
            return (
              <h2 id={id} className="text-xl font-semibold text-stone-800 dark:text-stone-200 border-b border-stone-200 dark:border-stone-700 pb-2 mb-4 mt-8">
                <a href={`#${id}`} className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  {children}
                </a>
              </h2>
            );
          },
          h3: ({ children }) => {
            const id = String(children).toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
            return (
              <h3 id={id} className="text-lg font-semibold text-stone-800 dark:text-stone-200 mb-3 mt-6">
                <a href={`#${id}`} className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  {children}
                </a>
              </h3>
            );
          },
          h4: ({ children }) => (
            <h4 className="text-base font-semibold text-stone-800 dark:text-stone-200 mb-2 mt-4">
              {children}
            </h4>
          ),
          h5: ({ children }) => (
            <h5 className="text-sm font-semibold text-stone-700 dark:text-stone-300 mb-2 mt-3">
              {children}
            </h5>
          ),
          h6: ({ children }) => (
            <h6 className="text-sm font-medium text-stone-600 dark:text-stone-400 mb-2 mt-3">
              {children}
            </h6>
          ),

          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-indigo-600 dark:text-indigo-400 hover:underline hover:text-indigo-700 dark:hover:text-indigo-300"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),

          // Lists with proper nesting support
          ul: ({ children }) => (
            <ul className="list-disc space-y-1 mb-4 ml-6">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal space-y-1 mb-4 ml-6">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-stone-700 dark:text-stone-300 leading-7 pl-1">
              {children}
            </li>
          ),

          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-indigo-500 pl-4 py-1 my-4 bg-stone-50 dark:bg-stone-800/50 rounded-r italic text-stone-600 dark:text-stone-400">
              {children}
            </blockquote>
          ),

          // Horizontal rule
          hr: () => (
            <hr className="my-8 border-t border-stone-300 dark:border-stone-600" />
          ),

          // Tables with responsive wrapper
          table: ({ children }) => (
            <div className="overflow-x-auto my-6 rounded-lg border border-stone-300 dark:border-stone-600">
              <table className="min-w-full divide-y divide-stone-300 dark:divide-stone-600">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-stone-100 dark:bg-stone-800">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-stone-200 dark:divide-stone-700 bg-white dark:bg-stone-900">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-3 text-left text-sm font-semibold text-stone-900 dark:text-stone-100">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-3 text-sm text-stone-700 dark:text-stone-300">
              {children}
            </td>
          ),

          // Images
          img: ({ src, alt }) => (
            <span className="block my-4">
              <img
                src={src}
                alt={alt || ""}
                className="max-w-full h-auto rounded-lg shadow-md"
                loading="lazy"
              />
              {alt && (
                <span className="block text-center text-sm text-stone-500 dark:text-stone-400 mt-2 italic">
                  {alt}
                </span>
              )}
            </span>
          ),

          // Strong/Bold
          strong: ({ children }) => (
            <strong className="font-semibold text-stone-900 dark:text-stone-100">
              {children}
            </strong>
          ),

          // Emphasis/Italic
          em: ({ children }) => (
            <em className="italic text-stone-700 dark:text-stone-300">
              {children}
            </em>
          ),

          // Strikethrough
          del: ({ children }) => (
            <del className="line-through text-stone-500 dark:text-stone-500">
              {children}
            </del>
          ),
        }}
      >
        {content}
      </ReactMarkdown>

      {/* Custom styles for markdown-specific elements */}
      <style>{`
        .markdown-preview {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          font-size: 16px;
          line-height: 1.75;
          color: #374151;
        }

        .dark .markdown-preview {
          color: #d1d5db;
        }

        /* Ensure code blocks don't overflow container */
        .markdown-preview pre {
          max-width: 100%;
        }

        /* Proper spacing for nested lists */
        .markdown-preview ul ul,
        .markdown-preview ul ol,
        .markdown-preview ol ul,
        .markdown-preview ol ol {
          margin-top: 0.25rem;
          margin-bottom: 0.25rem;
        }

        /* Task list styling (GFM) */
        .markdown-preview input[type="checkbox"] {
          margin-right: 0.5rem;
          accent-color: #6366f1;
        }

        /* Ensure images don't overflow */
        .markdown-preview img {
          max-width: 100%;
          height: auto;
        }

        /* KaTeX math styling adjustments */
        .markdown-preview .katex-display {
          overflow-x: auto;
          overflow-y: hidden;
          padding: 0.5rem 0;
        }
      `}</style>
    </div>
  );
}

interface LaTeXPreviewProps {
  content: string;
  onLineClick?: (lineNumber: number, lineText: string) => void;
}

export function LaTeXPreview({ content, onLineClick }: LaTeXPreviewProps) {
  // Convert LaTeX to a format that can be rendered
  // For full LaTeX support, we'd need a full TeX engine
  // For now, we render math expressions and basic formatting

  const processedContent = content
    // Convert LaTeX sections to markdown
    .replace(/\\section\{([^}]+)\}/g, "## $1")
    .replace(/\\subsection\{([^}]+)\}/g, "### $1")
    .replace(/\\subsubsection\{([^}]+)\}/g, "#### $1")
    .replace(/\\textbf\{([^}]+)\}/g, "**$1**")
    .replace(/\\textit\{([^}]+)\}/g, "*$1*")
    .replace(/\\emph\{([^}]+)\}/g, "*$1*")
    // Keep math environments
    .replace(/\\\[/g, "$$")
    .replace(/\\\]/g, "$$")
    .replace(/\\begin\{equation\}/g, "$$")
    .replace(/\\end\{equation\}/g, "$$")
    .replace(/\\begin\{align\}/g, "$$\\begin{aligned}")
    .replace(/\\end\{align\}/g, "\\end{aligned}$$")
    // Remove document structure commands
    .replace(/\\documentclass.*?\n/g, "")
    .replace(/\\usepackage.*?\n/g, "")
    .replace(/\\begin\{document\}/g, "")
    .replace(/\\end\{document\}/g, "")
    .replace(/\\maketitle/g, "")
    // Convert itemize/enumerate
    .replace(/\\begin\{itemize\}/g, "")
    .replace(/\\end\{itemize\}/g, "")
    .replace(/\\begin\{enumerate\}/g, "")
    .replace(/\\end\{enumerate\}/g, "")
    .replace(/\\item\s*/g, "- ");

  return <MarkdownPreview content={processedContent} onLineClick={onLineClick} />;
}
