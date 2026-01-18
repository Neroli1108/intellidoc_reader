# 📚 IntelliDoc Reader

<div align="center">

![IntelliDoc Reader](https://img.shields.io/badge/Version-0.1.0--alpha-blue)
![Rust](https://img.shields.io/badge/Rust-1.75+-orange)
![License](https://img.shields.io/badge/License-MIT-green)
![Platform](https://img.shields.io/badge/Platform-Windows%20|%20macOS%20|%20Linux-lightgrey)

**A fast, lightweight document reader with embedded AI assistant**

*Read papers like a professor is sitting beside you*

</div>

---

## ✨ Features

### 📖 Universal Document Support
- **PDF** - Full rendering with search and zoom
- **EPUB** - E-book format support
- **DOCX** - Microsoft Word documents
- **Markdown** - With live preview
- **LaTeX** - Academic paper format

### 🤖 AI-Powered Intelligence
- **Professor Mode** - Get detailed explanations of complex concepts
- **Smart Q&A** - Ask questions about the document content
- **Context-Aware** - AI understands your current reading position
- **Code Generation** - Auto-generate implementation code for CS papers

### 📝 Smart Annotations
- **Highlighting** - 5 color options for marking text
- **Margin Notes** - Add notes beside any sentence
- **Persistent Storage** - Notes stay with documents forever
- **Export** - Export annotations to Markdown or JSON

### ⚡ Performance
- **~5MB binary** - Incredibly lightweight
- **<100ms startup** - Opens instantly
- **Low memory** - Uses native WebView
- **Offline** - All AI processing runs locally

---

## 🖥️ Screenshot

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ≡  IntelliDoc Reader                                       ─  □  ✕    │
├──────────────────────────────────────────────────────────────────────────┤
│  📁 Open │ 💾 Save │ 🔍 Search │ 🌙 Theme                                │
├──────────────────────────────────────────────────────────────────────────┤
│   OUTLINE    │        DOCUMENT                │   AI ASSISTANT          │
│              │                                │                         │
│   ├─ Intro   │   [Your document renders      │   🎓 Professor Mode     │
│   ├─ Method  │    here with highlights       │                         │
│   └─ Results │    and annotations]           │   Ask me anything...    │
│              │                                │                         │
└──────────────┴────────────────────────────────┴─────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

Before running the project, ensure you have the following installed:

1. **Rust 1.75+**
   ```bash
   # Install Rust (if not installed)
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   
   # Or on Windows, download from https://rustup.rs/
   
   # Verify installation
   rustc --version  # Should be 1.75 or higher
   cargo --version
   ```

2. **Node.js 18+** 
   ```bash
   # Check Node.js version
   node --version  # Should be 18.0 or higher
   npm --version
   ```

3. **pnpm** (recommended) or npm
   ```bash
   # Install pnpm globally
   npm install -g pnpm
   
   # Or use npm (if you prefer)
   # npm works too, but pnpm is faster
   ```

4. **System Dependencies** (for Tauri)

   **Windows:**
   - Microsoft Visual C++ Build Tools
   - WebView2 (usually pre-installed on Windows 10/11)

   **macOS:**
   - Xcode Command Line Tools: `xcode-select --install`

   **Linux (Debian/Ubuntu):**
   ```bash
   sudo apt update
   sudo apt install libwebkit2gtk-4.1-dev \
     build-essential \
     curl \
     wget \
     file \
     libxdo-dev \
     libssl-dev \
     libayatana-appindicator3-dev \
     librsvg2-dev
   ```

### Installation & Running

#### Step 1: Clone the repository

```bash
# If you have the repo locally, navigate to it
cd D:\side_projects\intellidoc-reader

# Or clone from git (when available)
# git clone https://github.com/yourusername/intellidoc-reader.git
# cd intellidoc-reader
```

#### Step 2: Install dependencies

```bash
# Install frontend dependencies (React, Vite, etc.)
pnpm install

# Or with npm:
# npm install
```

#### Step 3: Run in development mode

```bash
# Start development server (builds frontend + Rust backend)
pnpm tauri dev

# Or with npm:
# npm run tauri:dev
```

This command will:
- ✅ Install Rust dependencies (first time only - may take a few minutes)
- ✅ Start Vite dev server on `http://localhost:5173`
- ✅ Build Rust backend in debug mode
- ✅ Launch the Tauri application window

**Note:** First build may take 5-10 minutes as Cargo compiles all dependencies.

#### Step 4: Build for production

```bash
# Create optimized production build
pnpm tauri build

# Or with npm:
# npm run tauri:build
```

Output location:
- **Windows**: `src-tauri/target/release/bundle/msi/IntelliDoc Reader_0.1.0_x64_en-US.msi`
- **macOS**: `src-tauri/target/release/bundle/macos/IntelliDoc Reader.app`
- **Linux**: `src-tauri/target/release/bundle/appimage/intellidoc-reader_0.1.0_amd64.AppImage`

### Optional: Download LLM Models

For local LLM features (if implemented):

```bash
# Create models directory
mkdir -p src-tauri/models

# Download recommended model (Mistral 7B Q4) - ~4GB
cd src-tauri/models
curl -L -o mistral-7b-q4.gguf \
  https://huggingface.co/TheBloke/Mistral-7B-v0.1-GGUF/resolve/main/mistral-7b-v0.1.Q4_K_M.gguf

# Or download manually from:
# https://huggingface.co/TheBloke/Mistral-7B-v0.1-GGUF
```

### Optional: Download Voice Models

For voice interaction features:

```bash
# Create voice models directory
mkdir -p src-tauri/voice_models/whisper
mkdir -p src-tauri/voice_models/piper

# Download Whisper base model (~142MB)
cd src-tauri/voice_models/whisper
curl -L -o ggml-base.bin \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin

# Download Piper voice (example - US English female)
cd ../piper
# Download from: https://huggingface.co/rhasspy/piper-voices
```

---

## 🔧 Development Commands

```bash
# Development
pnpm tauri dev          # Run in development mode
pnpm dev                # Run Vite dev server only (frontend)
pnpm build              # Build frontend only

# Rust commands (optional, for backend development)
cd src-tauri
cargo build             # Build Rust backend only
cargo check             # Check Rust code without building
cargo test              # Run Rust tests
cargo clippy            # Lint Rust code

# Linting & Formatting
pnpm lint               # Lint TypeScript/React code
pnpm format             # Format code with Prettier
```

---

## 🐛 Troubleshooting

### Issue: "Command 'pnpm' not found"

**Solution:**
```bash
# Install pnpm globally
npm install -g pnpm

# Or use npm instead
npm install
npm run tauri:dev
```

### Issue: Rust/Cargo not found

**Solution:**
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Verify
cargo --version
```

### Issue: Build fails with "linker not found"

**Windows Solution:**
- Install [Microsoft Visual C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)

**Linux Solution:**
```bash
sudo apt install build-essential
```

**macOS Solution:**
```bash
xcode-select --install
```

### Issue: "WebView2 not found" (Windows)

**Solution:**
- WebView2 should be pre-installed on Windows 10/11
- If missing, download from: https://developer.microsoft.com/microsoft-edge/webview2/

### Issue: Port 5173 already in use

**Solution:**
```bash
# Kill process using port 5173
# Windows:
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# macOS/Linux:
lsof -ti:5173 | xargs kill -9

# Or change port in vite.config.ts
```

### Issue: Slow first build

**This is normal!** First Rust build compiles many dependencies and can take 5-15 minutes. Subsequent builds are much faster (~10-30 seconds).

### Issue: Type errors in TypeScript

**Solution:**
```bash
# Clean and reinstall
rm -rf node_modules
pnpm install

# Regenerate Tauri types
pnpm tauri dev  # Types are auto-generated
```

---

## 📁 Project Structure

```
intellidoc-reader/
├── src/                      # Frontend (React + TypeScript)
│   ├── components/          # React components
│   ├── stores/              # State management (Zustand)
│   └── main.tsx             # Entry point
│
├── src-tauri/               # Backend (Rust)
│   ├── src/
│   │   ├── commands/        # Tauri IPC commands
│   │   ├── document/        # Document parsing & editing
│   │   ├── annotation/      # Annotation management
│   │   ├── llm/             # LLM integration
│   │   ├── voice/           # Voice interaction
│   │   └── storage/         # SQLite database
│   └── Cargo.toml           # Rust dependencies
│
├── package.json             # Frontend dependencies
├── vite.config.ts           # Vite configuration
└── README.md               # This file
```

---

## 🎯 Next Steps

1. **Open a document** - Use `Ctrl+O` or File → Open
2. **Try annotations** - Select text and add highlights/notes
3. **Test AI features** - Ask questions in the chat panel
4. **Configure LLM** - Go to Settings → LLM to set up local or cloud models

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+O` | Open document |
| `Ctrl+S` | Save annotations |
| `Ctrl+H` | Highlight selection |
| `Ctrl+N` | Add note to selection |
| `Ctrl+Enter` | Send message to AI |
| `Ctrl+G` | Generate code (CS papers) |
| `Ctrl+F` | Search in document |
| `Ctrl+/` | Toggle dark mode |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│              Frontend (React/Solid)             │
│  Document Viewer │ Annotations │ Chat Panel    │
└─────────────────────┬───────────────────────────┘
                      │ Tauri IPC
┌─────────────────────┴───────────────────────────┐
│              Rust Backend                        │
│  Document Parser │ LLM Engine │ Storage Manager │
└─────────────────────┬───────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────┐
│              Data Layer                          │
│  SQLite DB │ Local LLM Models │ File System     │
└─────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
intellidoc_reader/
├── src-tauri/           # Rust backend
│   ├── src/
│   │   ├── commands/    # Tauri IPC commands
│   │   ├── document/    # Document parsing
│   │   ├── annotation/  # Annotation management
│   │   ├── llm/         # LLM integration
│   │   └── storage/     # Data persistence
│   └── models/          # Local LLM models
├── src/                 # Frontend
│   ├── components/      # React components
│   ├── hooks/           # Custom hooks
│   └── stores/          # State management
└── docs/                # Documentation
```

---

## 🔧 Configuration

Create a `config.toml` in your user data directory:

```toml
[llm]
model = "mistral-7b-q4.gguf"
context_length = 4096
temperature = 0.7

[ui]
theme = "dark"
font_size = 14
show_outline = true

[annotations]
default_color = "yellow"
auto_save = true
```

---

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) first.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Tauri](https://tauri.app/) - The lightweight app framework
- [llama.cpp](https://github.com/ggerganov/llama.cpp) - Local LLM inference
- [pdfium](https://pdfium.googlesource.com/pdfium/) - PDF rendering engine

---

<div align="center">

**Made with ❤️ for researchers and learners**

[Documentation](docs/DESIGN_DOCUMENT.md) · [Report Bug](issues) · [Request Feature](issues)

</div>
