# Changelog

All notable changes to IntelliDoc Reader will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-02-08

### Added

- **Document Support**
  - PDF viewing with full text selection and search
  - Markdown preview with syntax highlighting
  - LaTeX rendering with math support
  - Plain text viewing

- **AI Integration**
  - Chat panel with Professor Mode and Quick Answer Mode
  - Code generation for CS/technical papers
  - Context-aware responses based on current document
  - Support for OpenAI, AWS Bedrock, Anthropic, Gemini, and Groq

- **Highlight Categories**
  - 6 default categories: Important, Definition, Example, Question, Reference, General
  - Custom category creation with 16-color palette
  - AI-powered scheme generator (`/highlight-scheme` command)
  - Legend panel showing all highlights organized by category
  - Category manager with import/export

- **Annotations**
  - Text highlighting with category assignment
  - Underline and strikethrough annotations
  - Margin notes on highlights
  - Persistent storage per document

- **Editor Features**
  - Vim mode with visual mode indicator
  - LaTeX editing with live preview
  - Markdown editing with live preview
  - CodeMirror-based editor

- **UI/UX**
  - Dark and light theme
  - Collapsible sidebar with Outline, Info, Notes, and Legend tabs
  - Page navigation and zoom controls
  - Text-to-speech with speed control
  - Keyboard shortcuts

### Technical

- Built with Tauri 2.x for cross-platform support
- React 18 + TypeScript frontend
- Rust backend with SQLite storage
- PDF.js for PDF rendering
- Zustand for state management

---

## [Unreleased]

### Planned

- EPUB support
- DOCX support
- Export annotations to Markdown/JSON
- Document search across library
- Reading progress tracking
- Cloud sync for annotations
