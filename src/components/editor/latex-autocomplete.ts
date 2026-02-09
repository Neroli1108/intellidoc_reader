import {
  autocompletion,
  CompletionContext,
  CompletionResult,
  Completion,
  snippetCompletion,
} from "@codemirror/autocomplete";
import { Extension } from "@codemirror/state";

// LaTeX command database with categories
const LATEX_COMMANDS: Array<{
  label: string;
  detail?: string;
  info?: string;
  snippet?: string;
  category: 'basic' | 'math' | 'text' | 'structure' | 'reference';
  mathOnly?: boolean;
}> = [
  // Document structure
  { label: "\\documentclass", detail: "Document class", snippet: "\\documentclass{${1:article}}", category: "structure" },
  { label: "\\usepackage", detail: "Import package", snippet: "\\usepackage{${1:package}}", category: "structure" },
  { label: "\\title", detail: "Document title", snippet: "\\title{${1:Title}}", category: "structure" },
  { label: "\\author", detail: "Document author", snippet: "\\author{${1:Author}}", category: "structure" },
  { label: "\\date", detail: "Document date", snippet: "\\date{${1:\\today}}", category: "structure" },
  { label: "\\maketitle", detail: "Render title", category: "structure" },
  { label: "\\tableofcontents", detail: "Table of contents", category: "structure" },

  // Sections
  { label: "\\section", detail: "Section", snippet: "\\section{${1:Title}}", category: "structure" },
  { label: "\\subsection", detail: "Subsection", snippet: "\\subsection{${1:Title}}", category: "structure" },
  { label: "\\subsubsection", detail: "Subsubsection", snippet: "\\subsubsection{${1:Title}}", category: "structure" },
  { label: "\\paragraph", detail: "Paragraph", snippet: "\\paragraph{${1:Title}}", category: "structure" },
  { label: "\\chapter", detail: "Chapter (book/report)", snippet: "\\chapter{${1:Title}}", category: "structure" },

  // Text formatting
  { label: "\\textbf", detail: "Bold text", snippet: "\\textbf{${1:text}}", category: "text" },
  { label: "\\textit", detail: "Italic text", snippet: "\\textit{${1:text}}", category: "text" },
  { label: "\\texttt", detail: "Typewriter text", snippet: "\\texttt{${1:text}}", category: "text" },
  { label: "\\textsc", detail: "Small caps", snippet: "\\textsc{${1:text}}", category: "text" },
  { label: "\\underline", detail: "Underlined text", snippet: "\\underline{${1:text}}", category: "text" },
  { label: "\\emph", detail: "Emphasized text", snippet: "\\emph{${1:text}}", category: "text" },
  { label: "\\textrm", detail: "Roman text", snippet: "\\textrm{${1:text}}", category: "text" },
  { label: "\\textsf", detail: "Sans-serif text", snippet: "\\textsf{${1:text}}", category: "text" },

  // References
  { label: "\\label", detail: "Create label", snippet: "\\label{${1:label}}", category: "reference" },
  { label: "\\ref", detail: "Reference", snippet: "\\ref{${1:label}}", category: "reference" },
  { label: "\\pageref", detail: "Page reference", snippet: "\\pageref{${1:label}}", category: "reference" },
  { label: "\\cite", detail: "Citation", snippet: "\\cite{${1:key}}", category: "reference" },
  { label: "\\footnote", detail: "Footnote", snippet: "\\footnote{${1:text}}", category: "reference" },
  { label: "\\bibliography", detail: "Bibliography", snippet: "\\bibliography{${1:bibfile}}", category: "reference" },
  { label: "\\bibliographystyle", detail: "Bib style", snippet: "\\bibliographystyle{${1:plain}}", category: "reference" },

  // Math - basic
  { label: "\\frac", detail: "Fraction", snippet: "\\frac{${1:num}}{${2:denom}}", category: "math", mathOnly: true },
  { label: "\\sqrt", detail: "Square root", snippet: "\\sqrt{${1:x}}", category: "math", mathOnly: true },
  { label: "\\sum", detail: "Summation", snippet: "\\sum_{${1:i=1}}^{${2:n}}", category: "math", mathOnly: true },
  { label: "\\prod", detail: "Product", snippet: "\\prod_{${1:i=1}}^{${2:n}}", category: "math", mathOnly: true },
  { label: "\\int", detail: "Integral", snippet: "\\int_{${1:a}}^{${2:b}}", category: "math", mathOnly: true },
  { label: "\\lim", detail: "Limit", snippet: "\\lim_{${1:x \\to \\infty}}", category: "math", mathOnly: true },
  { label: "\\partial", detail: "Partial derivative", category: "math", mathOnly: true },
  { label: "\\nabla", detail: "Nabla (gradient)", category: "math", mathOnly: true },

  // Math - operators
  { label: "\\times", detail: "Multiplication", category: "math", mathOnly: true },
  { label: "\\div", detail: "Division", category: "math", mathOnly: true },
  { label: "\\pm", detail: "Plus-minus", category: "math", mathOnly: true },
  { label: "\\mp", detail: "Minus-plus", category: "math", mathOnly: true },
  { label: "\\cdot", detail: "Center dot", category: "math", mathOnly: true },
  { label: "\\leq", detail: "Less than or equal", category: "math", mathOnly: true },
  { label: "\\geq", detail: "Greater than or equal", category: "math", mathOnly: true },
  { label: "\\neq", detail: "Not equal", category: "math", mathOnly: true },
  { label: "\\approx", detail: "Approximately", category: "math", mathOnly: true },
  { label: "\\equiv", detail: "Equivalent", category: "math", mathOnly: true },
  { label: "\\subset", detail: "Subset", category: "math", mathOnly: true },
  { label: "\\supset", detail: "Superset", category: "math", mathOnly: true },
  { label: "\\in", detail: "Element of", category: "math", mathOnly: true },
  { label: "\\notin", detail: "Not element of", category: "math", mathOnly: true },
  { label: "\\cup", detail: "Union", category: "math", mathOnly: true },
  { label: "\\cap", detail: "Intersection", category: "math", mathOnly: true },
  { label: "\\forall", detail: "For all", category: "math", mathOnly: true },
  { label: "\\exists", detail: "Exists", category: "math", mathOnly: true },
  { label: "\\infty", detail: "Infinity", category: "math", mathOnly: true },

  // Math - arrows
  { label: "\\to", detail: "Right arrow", category: "math", mathOnly: true },
  { label: "\\rightarrow", detail: "Right arrow", category: "math", mathOnly: true },
  { label: "\\leftarrow", detail: "Left arrow", category: "math", mathOnly: true },
  { label: "\\Rightarrow", detail: "Double right arrow", category: "math", mathOnly: true },
  { label: "\\Leftarrow", detail: "Double left arrow", category: "math", mathOnly: true },
  { label: "\\leftrightarrow", detail: "Left-right arrow", category: "math", mathOnly: true },
  { label: "\\mapsto", detail: "Maps to", category: "math", mathOnly: true },

  // Math - functions
  { label: "\\sin", detail: "Sine", category: "math", mathOnly: true },
  { label: "\\cos", detail: "Cosine", category: "math", mathOnly: true },
  { label: "\\tan", detail: "Tangent", category: "math", mathOnly: true },
  { label: "\\log", detail: "Logarithm", category: "math", mathOnly: true },
  { label: "\\ln", detail: "Natural log", category: "math", mathOnly: true },
  { label: "\\exp", detail: "Exponential", category: "math", mathOnly: true },
  { label: "\\max", detail: "Maximum", category: "math", mathOnly: true },
  { label: "\\min", detail: "Minimum", category: "math", mathOnly: true },
  { label: "\\sup", detail: "Supremum", category: "math", mathOnly: true },
  { label: "\\inf", detail: "Infimum", category: "math", mathOnly: true },

  // Math - formatting
  { label: "\\mathbf", detail: "Bold math", snippet: "\\mathbf{${1:x}}", category: "math", mathOnly: true },
  { label: "\\mathit", detail: "Italic math", snippet: "\\mathit{${1:x}}", category: "math", mathOnly: true },
  { label: "\\mathcal", detail: "Calligraphic", snippet: "\\mathcal{${1:A}}", category: "math", mathOnly: true },
  { label: "\\mathbb", detail: "Blackboard bold", snippet: "\\mathbb{${1:R}}", category: "math", mathOnly: true },
  { label: "\\mathrm", detail: "Roman math", snippet: "\\mathrm{${1:text}}", category: "math", mathOnly: true },
  { label: "\\hat", detail: "Hat accent", snippet: "\\hat{${1:x}}", category: "math", mathOnly: true },
  { label: "\\bar", detail: "Bar accent", snippet: "\\bar{${1:x}}", category: "math", mathOnly: true },
  { label: "\\vec", detail: "Vector arrow", snippet: "\\vec{${1:x}}", category: "math", mathOnly: true },
  { label: "\\tilde", detail: "Tilde accent", snippet: "\\tilde{${1:x}}", category: "math", mathOnly: true },
  { label: "\\dot", detail: "Dot accent", snippet: "\\dot{${1:x}}", category: "math", mathOnly: true },
  { label: "\\ddot", detail: "Double dot", snippet: "\\ddot{${1:x}}", category: "math", mathOnly: true },

  // Math - brackets
  { label: "\\left(", detail: "Left paren (auto-size)", category: "math", mathOnly: true },
  { label: "\\right)", detail: "Right paren (auto-size)", category: "math", mathOnly: true },
  { label: "\\left[", detail: "Left bracket (auto-size)", category: "math", mathOnly: true },
  { label: "\\right]", detail: "Right bracket (auto-size)", category: "math", mathOnly: true },
  { label: "\\left\\{", detail: "Left brace (auto-size)", category: "math", mathOnly: true },
  { label: "\\right\\}", detail: "Right brace (auto-size)", category: "math", mathOnly: true },

  // Math - matrices
  { label: "\\begin{matrix}", detail: "Matrix (no brackets)", snippet: "\\begin{matrix}\n${1:a} & ${2:b} \\\\\\\n${3:c} & ${4:d}\n\\end{matrix}", category: "math", mathOnly: true },
  { label: "\\begin{pmatrix}", detail: "Matrix (parens)", snippet: "\\begin{pmatrix}\n${1:a} & ${2:b} \\\\\\\n${3:c} & ${4:d}\n\\end{pmatrix}", category: "math", mathOnly: true },
  { label: "\\begin{bmatrix}", detail: "Matrix (brackets)", snippet: "\\begin{bmatrix}\n${1:a} & ${2:b} \\\\\\\n${3:c} & ${4:d}\n\\end{bmatrix}", category: "math", mathOnly: true },

  // Basic commands
  { label: "\\newline", detail: "New line", category: "basic" },
  { label: "\\newpage", detail: "New page", category: "basic" },
  { label: "\\hspace", detail: "Horizontal space", snippet: "\\hspace{${1:1cm}}", category: "basic" },
  { label: "\\vspace", detail: "Vertical space", snippet: "\\vspace{${1:1cm}}", category: "basic" },
  { label: "\\noindent", detail: "No indent", category: "basic" },
  { label: "\\centering", detail: "Center content", category: "basic" },
  { label: "\\includegraphics", detail: "Include image", snippet: "\\includegraphics[width=${1:0.8}\\textwidth]{${2:image}}", category: "basic" },
  { label: "\\caption", detail: "Caption", snippet: "\\caption{${1:caption}}", category: "basic" },
  { label: "\\item", detail: "List item", category: "basic" },
];

// Greek letters
const GREEK_LETTERS = [
  // Lowercase
  "alpha", "beta", "gamma", "delta", "epsilon", "varepsilon", "zeta", "eta",
  "theta", "vartheta", "iota", "kappa", "lambda", "mu", "nu", "xi", "pi",
  "varpi", "rho", "varrho", "sigma", "varsigma", "tau", "upsilon", "phi",
  "varphi", "chi", "psi", "omega",
  // Uppercase
  "Gamma", "Delta", "Theta", "Lambda", "Xi", "Pi", "Sigma", "Upsilon",
  "Phi", "Psi", "Omega",
];

// Environments
const ENVIRONMENTS = [
  { name: "document", detail: "Main document" },
  { name: "equation", detail: "Numbered equation" },
  { name: "equation*", detail: "Unnumbered equation" },
  { name: "align", detail: "Aligned equations" },
  { name: "align*", detail: "Aligned (unnumbered)" },
  { name: "figure", detail: "Figure float" },
  { name: "table", detail: "Table float" },
  { name: "tabular", detail: "Tabular data" },
  { name: "itemize", detail: "Bullet list" },
  { name: "enumerate", detail: "Numbered list" },
  { name: "description", detail: "Description list" },
  { name: "verbatim", detail: "Verbatim text" },
  { name: "quote", detail: "Block quote" },
  { name: "abstract", detail: "Abstract" },
  { name: "proof", detail: "Proof" },
  { name: "theorem", detail: "Theorem" },
  { name: "lemma", detail: "Lemma" },
  { name: "definition", detail: "Definition" },
  { name: "cases", detail: "Piecewise function" },
  { name: "array", detail: "Array" },
  { name: "minipage", detail: "Minipage" },
  { name: "center", detail: "Centered content" },
  { name: "flushleft", detail: "Left-aligned" },
  { name: "flushright", detail: "Right-aligned" },
];

// Check if position is inside math mode
function isInMathMode(doc: string, pos: number): boolean {
  const before = doc.slice(0, pos);

  // Check for inline math $...$
  const dollarCount = (before.match(/(?<!\\)\$/g) || []).length;
  if (dollarCount % 2 === 1) return true;

  // Check for display math $$...$$
  const doubleDollarCount = (before.match(/(?<!\\)\$\$/g) || []).length;
  if (doubleDollarCount % 2 === 1) return true;

  // Check for \[...\] or \(...\)
  const mathEnvStart = (before.match(/\\[\[\(]/g) || []).length;
  const mathEnvEnd = (before.match(/\\[\]\)]/g) || []).length;
  if (mathEnvStart > mathEnvEnd) return true;

  // Check for math environments
  const mathEnvs = ['equation', 'equation*', 'align', 'align*', 'gather', 'gather*', 'multline', 'multline*'];
  for (const env of mathEnvs) {
    const beginCount = (before.match(new RegExp(`\\\\begin\\{${env}\\}`, 'g')) || []).length;
    const endCount = (before.match(new RegExp(`\\\\end\\{${env}\\}`, 'g')) || []).length;
    if (beginCount > endCount) return true;
  }

  return false;
}

// Check if inside verbatim or lstlisting
function isInVerbatim(doc: string, pos: number): boolean {
  const before = doc.slice(0, pos);
  const verbatimEnvs = ['verbatim', 'lstlisting', 'minted'];

  for (const env of verbatimEnvs) {
    const beginCount = (before.match(new RegExp(`\\\\begin\\{${env}\\}`, 'g')) || []).length;
    const endCount = (before.match(new RegExp(`\\\\end\\{${env}\\}`, 'g')) || []).length;
    if (beginCount > endCount) return true;
  }

  return false;
}

interface AutocompleteOptions {
  recentCompletions?: string[];
  documentLabels?: string[];
  documentCitations?: string[];
  userMacros?: Record<string, string>;
}

// Create LaTeX completion source
function createLatexCompletionSource(options: AutocompleteOptions = {}) {
  return (context: CompletionContext): CompletionResult | null => {
    const doc = context.state.doc.toString();
    const pos = context.pos;

    // Don't complete in verbatim blocks
    if (isInVerbatim(doc, pos)) return null;

    const line = context.state.doc.lineAt(pos);
    const textBefore = line.text.slice(0, pos - line.from);

    // Check for different completion triggers
    const backslashMatch = textBefore.match(/\\([a-zA-Z]*)$/);
    const beginMatch = textBefore.match(/\\begin\{([a-zA-Z*]*)$/);
    const refMatch = textBefore.match(/\\ref\{([^}]*)$/);
    const citeMatch = textBefore.match(/\\cite\{([^}]*)$/);

    const inMath = isInMathMode(doc, pos);

    // Environment completion after \begin{
    if (beginMatch) {
      const prefix = beginMatch[1].toLowerCase();
      const from = pos - prefix.length;

      const completions: Completion[] = ENVIRONMENTS
        .filter(env => env.name.toLowerCase().startsWith(prefix))
        .map(env => ({
          label: env.name,
          detail: env.detail,
          type: "keyword",
          apply: (view, completion, from, to) => {
            const envName = completion.label;
            const snippet = `${envName}}\n\t$0\n\\end{${envName}}`;
            view.dispatch({
              changes: { from, to, insert: snippet.replace('$0', '') },
              selection: { anchor: from + envName.length + 2 },
            });
          },
        }));

      return completions.length > 0 ? { from, options: completions } : null;
    }

    // Reference completion after \ref{
    if (refMatch && options.documentLabels) {
      const prefix = refMatch[1].toLowerCase();
      const from = pos - prefix.length;

      const completions: Completion[] = options.documentLabels
        .filter(label => label.toLowerCase().startsWith(prefix))
        .map(label => ({
          label,
          detail: "Label",
          type: "variable",
        }));

      return completions.length > 0 ? { from, options: completions } : null;
    }

    // Citation completion after \cite{
    if (citeMatch && options.documentCitations) {
      const prefix = citeMatch[1].toLowerCase();
      const from = pos - prefix.length;

      const completions: Completion[] = options.documentCitations
        .filter(cite => cite.toLowerCase().startsWith(prefix))
        .map(cite => ({
          label: cite,
          detail: "Citation",
          type: "variable",
        }));

      return completions.length > 0 ? { from, options: completions } : null;
    }

    // Command completion after \
    if (backslashMatch) {
      const prefix = backslashMatch[1].toLowerCase();
      const from = pos - prefix.length - 1; // Include the backslash

      const completions: Completion[] = [];
      const recent = options.recentCompletions || [];

      // Add LaTeX commands
      for (const cmd of LATEX_COMMANDS) {
        // Skip math-only commands if not in math mode
        if (cmd.mathOnly && !inMath) continue;

        if (cmd.label.slice(1).toLowerCase().startsWith(prefix)) {
          const recentIndex = recent.indexOf(cmd.label);
          const boost = recentIndex >= 0 ? 100 - recentIndex : 0;

          if (cmd.snippet) {
            completions.push(snippetCompletion(cmd.snippet, {
              label: cmd.label,
              detail: cmd.detail,
              type: "function",
              boost,
            }));
          } else {
            completions.push({
              label: cmd.label,
              detail: cmd.detail,
              type: "function",
              boost,
            });
          }
        }
      }

      // Add Greek letters (only in math mode or always for common ones)
      for (const letter of GREEK_LETTERS) {
        if (letter.toLowerCase().startsWith(prefix)) {
          completions.push({
            label: `\\${letter}`,
            detail: "Greek letter",
            type: "constant",
          });
        }
      }

      // Add user-defined macros
      if (options.userMacros) {
        for (const [name, definition] of Object.entries(options.userMacros)) {
          if (name.slice(1).toLowerCase().startsWith(prefix)) {
            completions.push({
              label: name,
              detail: `User macro: ${definition.slice(0, 30)}${definition.length > 30 ? '...' : ''}`,
              type: "variable",
              boost: 50, // Boost user macros
            });
          }
        }
      }

      // Sort by boost (descending), then alphabetically
      completions.sort((a, b) => {
        const boostDiff = (b.boost || 0) - (a.boost || 0);
        if (boostDiff !== 0) return boostDiff;
        return a.label.localeCompare(b.label);
      });

      return completions.length > 0 ? { from, options: completions } : null;
    }

    return null;
  };
}

// Export autocomplete extension
export function createLatexAutocomplete(options: AutocompleteOptions = {}): Extension {
  return autocompletion({
    override: [createLatexCompletionSource(options)],
    activateOnTyping: true,
    maxRenderedOptions: 50,
    defaultKeymap: true,
    icons: false,
  });
}

// Re-export for external use
export { type AutocompleteOptions };
