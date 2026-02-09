# IntelliDoc Reader

<div align="center">

![Version](https://img.shields.io/badge/Version-0.1.0-blue)
![Rust](https://img.shields.io/badge/Rust-1.75+-orange)
![License](https://img.shields.io/badge/License-MIT-green)
![Platform](https://img.shields.io/badge/Platform-Windows%20|%20macOS%20|%20Linux-lightgrey)

**A fast, lightweight document reader with embedded AI assistant**

*Read papers like a professor is sitting beside you*

[Download](#-download) • [Features](#-features) • [Installation](#-installation) • [Configuration](#-configuration) • [Contributing](#-contributing)

</div>

---

## Download

### Pre-built Binaries

| Platform | Download |
|----------|----------|
| macOS (Apple Silicon & Intel) | [IntelliDoc-Reader-0.1.0.dmg](https://github.com/Neroli1108/intellidoc_reader/releases/latest/download/IntelliDoc-Reader-0.1.0.dmg) |
| Windows (64-bit) | [IntelliDoc-Reader-0.1.0-setup.exe](https://github.com/Neroli1108/intellidoc_reader/releases/latest/download/IntelliDoc-Reader-0.1.0-setup.exe) |
| Linux (AppImage) | [IntelliDoc-Reader-0.1.0.AppImage](https://github.com/Neroli1108/intellidoc_reader/releases/latest/download/IntelliDoc-Reader-0.1.0.AppImage) |

Or build from source - see [Installation](#-installation).

---

## Features

### Document Support
- **PDF** - Full rendering with text selection, search, and zoom
- **Markdown** - Live preview with syntax highlighting
- **LaTeX** - Academic paper format with math rendering
- **Plain Text** - Simple text file viewing

### AI-Powered Intelligence
- **Professor Mode** - Get detailed explanations of complex concepts
- **Quick Answer Mode** - Fast, concise responses
- **Code Generation** - Auto-generate implementation code from CS papers
- **Context-Aware Chat** - AI understands your current document

### Smart Annotations
- **Highlight Categories** - Organize highlights by type (Important, Definition, Example, Question, Reference)
- **Custom Categories** - Create your own with custom colors
- **AI Scheme Generator** - Generate category schemes using natural language
- **Margin Notes** - Add notes to any highlight
- **Legend Panel** - View all highlights organized by category
- **Persistent Storage** - Annotations saved locally per document

### Vim Mode
- Full Vim keybindings in the editor
- Visual mode indicator in toolbar
- Toggle on/off from toolbar

### Performance
- **~5MB binary** - Incredibly lightweight
- **<100ms startup** - Opens instantly
- **Low memory** - Uses native WebView
- **Cross-platform** - Windows, macOS, Linux

---

## Installation

### Option 1: Download Pre-built Binary

Download from the [Releases](https://github.com/Neroli1108/intellidoc_reader/releases) page.

### Option 2: Build from Source

#### Prerequisites

1. **Rust 1.75+**
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   rustc --version  # Should be 1.75 or higher
   ```

2. **Node.js 18+**
   ```bash
   node --version  # Should be 18.0 or higher
   ```

3. **pnpm** (recommended)
   ```bash
   npm install -g pnpm
   ```

4. **System Dependencies**

   **macOS:**
   ```bash
   xcode-select --install
   ```

   **Windows:**
   - [Microsoft Visual C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
   - WebView2 (pre-installed on Windows 10/11)

   **Linux (Debian/Ubuntu):**
   ```bash
   sudo apt update
   sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget \
     libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
   ```

#### Build Steps

```bash
# Clone the repository
git clone https://github.com/Neroli1108/intellidoc_reader.git
cd intellidoc-reader

# Install dependencies
pnpm install

# Run in development mode
pnpm tauri dev

# Build for production
pnpm tauri build
```

Build outputs:
- **Windows**: `src-tauri/target/release/bundle/msi/`
- **macOS**: `src-tauri/target/release/bundle/macos/`
- **Linux**: `src-tauri/target/release/bundle/appimage/`

---

## Configuration

### API Keys

IntelliDoc Reader supports multiple LLM providers. Configure your API keys:

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your API keys:
   ```bash
   # OpenAI (recommended)
   OPENAI_API_KEY=sk-your-openai-api-key-here

   # AWS Bedrock (optional)
   AWS_ACCESS_KEY_ID=your-aws-access-key-id
   AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
   AWS_REGION=us-east-1

   # Other providers (optional)
   ANTHROPIC_API_KEY=sk-ant-your-key
   GEMINI_API_KEY=your-gemini-key
   GROQ_API_KEY=gsk_your-groq-key
   ```

3. Or configure via the app: Click the **Bot icon** in the toolbar to open LLM Settings.

**Note:** Your `.env` file is gitignored and will never be committed.

### Highlight Categories

Default categories:
- **Important** (red) - Key points
- **Definition** (blue) - Terms and definitions
- **Example** (green) - Examples and illustrations
- **Question** (purple) - To revisit
- **Reference** (orange) - Citations
- **General** (yellow) - Default highlights

Create custom categories:
1. Select text in a document
2. Click **New Category** in the picker
3. Or use the AI: Type `/highlight-scheme key -> red; assumption -> green` in chat

---

## Usage

### Quick Start

1. **Open a document** - Click **Open** or drag-and-drop a PDF/Markdown file
2. **Highlight text** - Select text and choose a category
3. **Add notes** - Click on a highlight and select "Add Note"
4. **Ask AI** - Use the chat panel to ask questions about the document
5. **View Legend** - Click the **Legend** tab in the sidebar to see all highlights

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + O` | Open document |
| `Ctrl/Cmd + F` | Search in document |
| `Left/Right Arrow` | Navigate pages |
| `+/-` | Zoom in/out |
| `Ctrl/Cmd + Enter` | Send message to AI |

### AI Commands

In the chat panel, you can use:
- Natural questions: "What is the main contribution of this paper?"
- Code generation: Click "Generate Code" for CS papers
- Category schemes: `/highlight-scheme concept -> blue; example -> green`

---

## Project Structure

```
intellidoc-reader/
├── src/                      # Frontend (React + TypeScript)
│   ├── components/           # React components
│   │   ├── highlights/       # Highlight category components
│   │   ├── editor/           # CodeMirror editor
│   │   └── ...
│   ├── stores/               # State management (Zustand)
│   │   ├── annotationStore.ts
│   │   ├── categoryStore.ts
│   │   └── ...
│   └── constants/            # Color palette, etc.
│
├── src-tauri/                # Backend (Rust)
│   ├── src/
│   │   ├── commands/         # Tauri IPC commands
│   │   ├── document/         # Document parsing
│   │   ├── llm/              # LLM integration
│   │   └── storage/          # SQLite database
│   └── Cargo.toml
│
├── .env.example              # Environment template
├── package.json
└── README.md
```

---

## Development

```bash
# Development mode (hot reload)
pnpm tauri dev

# Type checking
pnpm tsc --noEmit

# Build frontend only
pnpm build

# Rust commands
cd src-tauri
cargo check      # Check without building
cargo test       # Run tests
cargo clippy     # Lint
```

---

## Troubleshooting

### "LLM Error: API key not configured"
- Configure your API key in `.env` or via Settings > LLM Settings

### Port 5173 already in use
```bash
# macOS/Linux
lsof -ti:5173 | xargs kill -9

# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

### Slow first build
This is normal. First Rust build compiles all dependencies (~5-10 min). Subsequent builds are faster (~30 sec).

### Missing system dependencies (Linux)
```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential libssl-dev
```

---

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Run `pnpm tsc --noEmit` before committing
- Keep components focused and modular
- Add comments for complex logic
- Test on multiple platforms if possible

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- [Tauri](https://tauri.app/) - Cross-platform app framework
- [PDF.js](https://mozilla.github.io/pdf.js/) - PDF rendering
- [CodeMirror](https://codemirror.net/) - Code editor
- [Zustand](https://zustand-demo.pmnd.rs/) - State management

---

<div align="center">

**Made with care for researchers and learners**

[Report Bug](https://github.com/Neroli1108/intellidoc_reader/issues) • [Request Feature](https://github.com/Neroli1108/intellidoc_reader/issues)

</div>
