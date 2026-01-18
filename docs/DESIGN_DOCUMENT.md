# IntelliDoc Reader - Design Document

## 📋 Executive Summary

**IntelliDoc Reader** is a fast, lightweight document reader application with embedded LLM capabilities that acts as an intelligent research assistant. It supports multiple document formats, persistent annotations, intelligent Q&A, and automatic code generation for computer science papers.

---

## 🎯 Core Features

### 1. Document Reading
- PDF, EPUB, DOCX, TXT, Markdown, LaTeX support
- Fast rendering with lazy loading
- Multi-tab document viewing
- Dark/Light theme support

### 2. LLM-Powered Intelligence
- **Professor Mode**: Explains complex concepts in detail
- **Q&A System**: Answers questions about document content
- **Context-Aware**: Understands the full document context
- **Code Generation**: Auto-generates code snippets for CS papers

### 3. Annotation System
- Inline sentence highlighting (multiple colors)
- Margin notes attached to specific text ranges
- Persistent storage (notes tied to document hash)
- Export annotations to Markdown/JSON

### 4. Smart Detection
- Auto-detect document category (CS, Physics, Math, etc.)
- Enable code generation for CS-related papers
- Suggest relevant resources and references

### 5. Multi-Provider LLM Support
- **Local Models**: llama.cpp for offline processing (Mistral, Llama, CodeLlama)
- **OpenAI**: GPT-4, GPT-4 Turbo, GPT-4o, GPT-3.5 Turbo
- **Google Gemini**: Gemini 1.5 Pro, Gemini 1.5 Flash, Gemini 2.0
- **Anthropic Claude**: Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku
- **Groq**: Ultra-fast inference (Llama 3, Mixtral)
- **Ollama**: Local model server integration
- **Custom API**: OpenAI-compatible endpoints

### 6. Document Editing
Support editing across all document types with format-appropriate capabilities:

#### PDF Editing
- **Text Editing**: Add, edit, delete text
- **Annotations**: Highlights, sticky notes, stamps
- **Shapes**: Rectangles, circles, lines, arrows
- **Images**: Insert images and signatures
- **Page Management**: Insert, delete, rotate pages
- **Redaction**: Securely black out sensitive content
- **Links & Bookmarks**: Add hyperlinks and navigation
- **Form Filling**: Fill PDF form fields
- **Utilities**: Merge, split, compress, convert to/from images

#### Plain Text & Markdown Editing
- **Full Text Editing**: Insert, modify, delete text with undo/redo
- **Markdown Preview**: Live preview with syntax highlighting
- **Formatting Shortcuts**: Bold, italic, headers, lists, code blocks
- **Find & Replace**: Regex-supported search and replace
- **Word Count & Statistics**: Real-time word/character/line counts

#### DOCX Editing
- **Rich Text Editing**: Modify text with formatting preservation
- **Style Support**: Apply and modify paragraph/character styles
- **Image Handling**: Insert, resize, move images
- **Table Editing**: Modify existing tables, add rows/columns
- **Track Changes**: View and accept/reject changes

#### LaTeX Editing
- **Source Editing**: Full LaTeX source code editing
- **Syntax Highlighting**: LaTeX-aware highlighting
- **Auto-completion**: Command and environment completion
- **Math Preview**: Inline math equation preview
- **Compile Support**: Integration with local LaTeX compiler

#### EPUB Editing
- **Content Editing**: Modify chapter text and formatting
- **Metadata Editing**: Update title, author, cover image
- **TOC Management**: Edit table of contents structure
- **Style Editing**: Modify embedded CSS styles

#### Cross-Format Features
- **Export/Convert**: Convert between supported formats
- **Batch Operations**: Apply changes to multiple files
- **Template Support**: Save and apply document templates
- **Version History**: Track and restore previous versions

### 7. Voice Interaction & AI Reading Assistant

A hands-free, voice-enabled reading and note-taking experience powered by LLM.

#### Voice Note-Taking
- **Voice Commands**: Say "Note down: [your note]" to add annotations
- **Cursor-Aware Placement**: Notes attach to current cursor/reading position
- **Natural Language Processing**: Intelligent parsing of voice commands
- **Multi-language Support**: Voice input in multiple languages
- **Punctuation & Formatting**: Auto-punctuation and markdown formatting from speech

#### LLM Reading Aloud (Text-to-Speech)
- **Document Narration**: LLM reads document content with natural voice
- **Synchronized Cursor**: Visual cursor/highlight follows along with speech
- **Adjustable Speed**: Control reading pace (0.5x to 2.0x)
- **Voice Selection**: Multiple voice options (male/female, accents)
- **Smart Pausing**: Auto-pause at section breaks, user interruption

#### Voice Chat with AI Assistant
- **Conversational Mode**: Ask questions and receive spoken answers
- **Context Retention**: Maintains conversation context across sessions
- **Wake Word Detection**: "Hey IntelliDoc" to activate voice mode
- **Push-to-Talk Option**: Manual voice activation for noisy environments
- **Hybrid Chat**: Seamlessly switch between text and voice interaction

#### Reading Position Sync
- **Word-Level Highlighting**: Highlight words as they're spoken
- **Sentence Tracking**: Track current sentence being read
- **Auto-Scroll**: Document automatically scrolls during reading
- **Bookmark Voice Position**: Save and resume reading position
- **Speed-Synchronized Animation**: Smooth highlight animation matching speech rate

#### Voice Interaction Technology Stack

| Component | Cloud Options | Local/Offline Options |
|-----------|--------------|----------------------|
| **Speech-to-Text (STT)** | AWS Transcribe, Google Speech-to-Text, Azure Speech, Deepgram, AssemblyAI | Whisper.cpp, Vosk, DeepSpeech |
| **Text-to-Speech (TTS)** | AWS Polly, Google Cloud TTS, Azure Neural TTS, ElevenLabs, OpenAI TTS | Piper TTS, Coqui TTS, eSpeak-ng |
| **LLM Backend** | AWS Bedrock, OpenAI, Anthropic, Google Vertex AI | llama.cpp, Ollama |
| **Voice Activity Detection** | WebRTC VAD | Silero VAD, RNNoise |
| **Wake Word Detection** | - | Porcupine, OpenWakeWord |

#### Recommended Voice Technology Combinations

**Option 1: AWS Full Stack (Enterprise)**
```
STT: AWS Transcribe Streaming
TTS: AWS Polly Neural Voices
LLM: AWS Bedrock (Claude, Llama)
Pros: Unified billing, low latency, enterprise support
```

**Option 2: Best-of-Breed Cloud (Premium Quality)**
```
STT: Deepgram Nova-2 (fastest, most accurate)
TTS: ElevenLabs (most natural voices)
LLM: OpenAI GPT-4o / Anthropic Claude
Pros: Best quality per component
```

**Option 3: Hybrid (Privacy-Focused)**
```
STT: Whisper.cpp (local)
TTS: Piper TTS (local)
LLM: Ollama + Cloud fallback
Pros: Offline capable, privacy-preserving
```

**Option 4: Fully Offline**
```
STT: Whisper.cpp with whisper-small/medium model
TTS: Piper TTS with en_US-lessac-medium
LLM: llama.cpp with Mistral 7B / Llama 3 8B
Pros: Complete offline operation, no API costs
```

---

## 🔧 Technology Recommendation

### **Architecture Decision: Tauri vs Electron vs Hybrid**

Given the complexity of features (voice interaction, multi-format editing, LLM integration), here's a detailed analysis:

| Criteria | Tauri (Rust) | Electron | Hybrid Approach |
|----------|--------------|----------|-----------------|
| **Binary Size** | ~3-5 MB ✅ | ~150 MB ❌ | ~3-5 MB ✅ (Tauri backend) |
| **Memory Usage** | Low (~100-200 MB) ✅ | High (~300-500 MB) ❌ | Low (~150-300 MB) ✅ |
| **Startup Time** | Fast (~1-2s) ✅ | Slow (~3-5s) ❌ | Fast (~1-2s) ✅ |
| **Native Libraries** | Easy (Rust FFI) ✅ | Difficult (Native modules) ❌ | Easy (Rust backend) ✅ |
| **Audio APIs** | Requires cpal/rodio ⚠️ | Built-in Web Audio ✅ | Rust backend + JS bridge ⚠️ |
| **Voice Libraries** | Native integration ✅ | Node.js modules ⚠️ | Native Rust ✅ |
| **LLM Integration** | Native llama.cpp ✅ | Node.js bindings ⚠️ | Native Rust ✅ |
| **PDF Editing** | Native libraries ✅ | PDF.js (limited) ⚠️ | Native Rust ✅ |
| **Development Speed** | Moderate ⚠️ | Fast ✅ | Moderate ⚠️ |
| **Maturity** | Growing (v2.0) ⚠️ | Mature ✅ | Best of both ✅ |
| **Ecosystem** | Smaller ⚠️ | Huge ✅ | Flexible ✅ |
| **Security** | Sandboxed ✅ | Less secure ❌ | Sandboxed ✅ |
| **Performance** | Excellent ✅ | Good ⚠️ | Excellent ✅ |

### **Recommended: Stick with Tauri + Rust**

Despite the complexity, **Tauri remains the better choice** for this application because:

1. **Native Library Integration**
   - Whisper.cpp, Piper TTS, llama.cpp all have excellent Rust bindings
   - Electron would require native Node.js modules (more complex)
   - Direct FFI is cleaner and more performant

2. **Resource Efficiency**
   - Voice processing and LLM inference are CPU/memory intensive
   - Smaller binary and lower memory overhead matter for offline operation
   - Electron's ~150MB overhead is significant for a local-first app

3. **Performance-Critical Features**
   - Real-time audio capture/processing (low latency)
   - Document parsing (large files)
   - LLM inference (memory bandwidth)
   - All benefit from Rust's performance

4. **Security & Privacy**
   - Local-first: all data stays on device
   - Tauri's sandboxing provides better security
   - Important for handling sensitive documents

5. **Bundle Management**
   - Voice models (Whisper ~142MB, Piper ~10-20MB each)
   - LLM models (2-7GB)
   - Already large - adding 150MB Electron is wasteful

### **When to Consider Electron**

Consider Electron only if:
- You need specific Node.js-only libraries
- You have existing Electron expertise
- Browser compatibility is more important than size/performance
- You need to deploy to platforms without native WebView support

### **Hybrid Approach (If Needed)**

If Tauri proves too limiting in specific areas:

```
┌─────────────────────────────────────────────────┐
│  Frontend (Electron/WebView)                    │
│  - UI rendering (React)                         │
│  - Basic interactions                           │
└─────────────────┬───────────────────────────────┘
                  │ IPC
┌─────────────────▼───────────────────────────────┐
│  Rust Backend (Standalone Service)              │
│  - Voice processing (Whisper, Piper)            │
│  - LLM inference (llama.cpp)                    │
│  - Document parsing/editing                     │
│  - Heavy computation                            │
└─────────────────────────────────────────────────┘
```

**This is overkill for this project** - Tauri already provides the IPC bridge efficiently.

### Why Tauri + Rust?

1. **Performance**: Rust backend provides C/C++ level performance with memory safety
2. **Lightweight**: Uses native WebView instead of bundling Chromium (~3MB vs ~150MB)
3. **Security**: Rust's ownership model prevents memory vulnerabilities
4. **Modern UI**: Web technologies (React/Solid) for beautiful, responsive UI
5. **Easy LLM Integration**: llama.cpp bindings available in Rust
6. **PDF Handling**: `pdf-rs`, `lopdf`, `pdfium` bindings available
7. **Voice Libraries**: Excellent Rust support for Whisper, Piper, cpal, rodio

### **Managing Complexity: Best Practices**

The complexity is manageable with good architecture:

#### 1. **Separate Concerns**
```
Frontend (React)     ↔  IPC  ↔  Rust Backend
- UI rendering       ←→       - Voice processing
- User interactions  ←→       - LLM inference
- State display      ←→       - Document parsing
```

#### 2. **Incremental Implementation**
- **Phase 1**: Basic document reading (Tauri works great)
- **Phase 2**: Add annotations (simple IPC)
- **Phase 3**: Add LLM (native libraries easier in Rust)
- **Phase 4**: Add voice (native audio APIs better in Rust)
- **Phase 5**: Add editing (native libraries available)

#### 3. **Leverage Existing Crates**
- Audio: `cpal` (cross-platform), `rodio` (playback)
- Voice: `whisper-rs` (Whisper bindings), Piper (CLI or direct)
- LLM: `llama-cpp-rs`, `candle` (PyTorch-like)
- PDF: `lopdf`, `pdf-rs`, `pdfium-render`

#### 4. **Simplify IPC with Event System**
```rust
// Emit events instead of complex request/response
app.emit("voice:transcription", &result).unwrap();
app.emit("voice:reading_position", &position).unwrap();
```

#### 5. **Use TypeScript for Type Safety**
```typescript
// Frontend has full type safety with Tauri's generated types
import { invoke } from '@tauri-apps/api/core';
const result = await invoke<VoiceCommand>('parse_voice_command', { text });
```

#### 6. **Prototype Complex Features First**
- Test audio capture/playback with simple examples
- Validate Whisper/Piper integration before full implementation
- Ensure Tauri IPC meets performance needs

### **Complexity Comparison**

| Feature | Tauri Approach | Electron Approach |
|---------|---------------|-------------------|
| Audio Capture | `cpal` (Rust) - Direct system API | `navigator.mediaDevices` - Browser API |
| STT (Whisper) | `whisper-rs` - Native bindings | `@xenova/whisper` - WebAssembly |
| TTS (Piper) | Process spawn or direct | Node.js child_process |
| LLM (llama.cpp) | `llama-cpp-rs` - Native | `llama.cpp` Node bindings |
| PDF Editing | `lopdf`/`pdf-rs` - Native | `pdf-lib` - JavaScript |
| IPC | Type-safe Rust ↔ TS | JavaScript ↔ JavaScript |

**Tauri complexity is upfront (Rust learning curve) but pays off in:**
- Better performance
- Smaller bundle
- More maintainable long-term
- Native library integration

**Electron seems easier initially but:**
- WebAssembly performance limits
- Native module complications
- Larger bundle size
- Security concerns

### Alternative: Pure Rust with Iced/Dioxus

For maximum performance and smallest binary:
- **Iced**: Elm-inspired GUI library, ~5MB binary
- **Dioxus**: React-like syntax for native apps

### **Final Recommendation: Stick with Tauri**

**Despite the complexity, Tauri is the right choice because:**

✅ **Native libraries are easier in Rust**
   - Whisper, Piper, llama.cpp all have better Rust support than Node.js
   - Direct FFI is simpler than native Node modules
   - Better performance for CPU-intensive tasks

✅ **Complexity is manageable**
   - Well-defined IPC interface (type-safe)
   - Clear separation of concerns
   - Mature Tauri v2.0 with good documentation

✅ **Resource efficiency matters**
   - Voice models are already large (100-500MB)
   - LLM models are huge (2-7GB)
   - Electron's 150MB overhead is wasteful

✅ **Performance is critical**
   - Real-time audio processing needs low latency
   - LLM inference benefits from native performance
   - Document parsing handles large files better

✅ **Local-first privacy**
   - All processing stays on-device
   - Tauri's sandboxing is more secure
   - No unnecessary network stack

**The complexity is worth it for:**
- 30x smaller binary size
- 3-5x lower memory usage
- 2-3x faster startup
- Better long-term maintainability

**If you're concerned about development time:**
- Start with basic features (documents, annotations)
- Add voice/LLM incrementally
- Use existing crates (don't reinvent the wheel)
- The Rust learning curve pays off long-term

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            INTELLIDOC READER                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         FRONTEND (WebView/Iced)                      │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐  │   │
│  │  │   Document   │ │  Annotation  │ │    Chat      │ │   Notes    │  │   │
│  │  │   Viewer     │ │   Overlay    │ │   Panel      │ │   Sidebar  │  │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    │ IPC (Inter-Process Communication)      │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         RUST BACKEND CORE                            │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐  │   │
│  │  │   Document   │ │  Annotation  │ │     LLM      │ │   Storage  │  │   │
│  │  │   Parser     │ │   Manager    │ │    Engine    │ │   Manager  │  │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         DATA LAYER                                   │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                 │   │
│  │  │   SQLite     │ │  Local LLM   │ │    File      │                 │   │
│  │  │   Database   │ │   Models     │ │   System     │                 │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🖥️ Frontend UI Design

### Main Window Layout

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  ≡  IntelliDoc Reader                                          ─  □  ✕         │
├──────────────────────────────────────────────────────────────────────────────────┤
│  [📁 Open] [💾 Save] [📑 Export] │ [🔍 Search] │ [🌙 Theme] │ [⚙️ Settings]      │
├──────────────────────────────────────────────────────────────────────────────────┤
│  📄 paper1.pdf  │  📄 paper2.pdf  │  ＋                                          │
├─────────────────┼───────────────────────────────────────────┼────────────────────┤
│                 │                                           │                    │
│   📑 OUTLINE    │         DOCUMENT VIEWER                   │   💬 AI ASSISTANT │
│                 │                                           │                    │
│   ├─ Abstract   │  ┌─────────────────────────────────────┐  │  ┌──────────────┐ │
│   ├─ 1. Intro   │  │                                     │  │  │ Professor    │ │
│   │   ├─ 1.1    │  │   [Highlighted text appears here]   │  │  │ Mode  ✓      │ │
│   │   └─ 1.2    │  │   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │  │  └──────────────┘ │
│   ├─ 2. Method  │  │                                     │  │                    │
│   │   ├─ 2.1    │  │   This paper presents a novel...   │ ◄── 📝 "Key point   │
│   │   └─ 2.2    │  │                                     │  │      about the    │
│   ├─ 3. Results │  │   The transformer architecture...  │ ◄── 📝  methodology" │
│   └─ 4. Concl.  │  │                                     │  │                    │
│                 │  │   ┌─────────────────────────────┐   │  │  ──────────────── │
│   ──────────    │  │   │  🎨 Highlight  📝 Note     │   │  │                    │
│                 │  │   │  🔗 Link      ❌ Cancel    │   │  │  Ask me anything: │
│   📊 METADATA   │  │   └─────────────────────────────┘   │  │  ┌──────────────┐ │
│                 │  │                                     │  │  │ What is the  │ │
│   Type: CS/AI   │  └─────────────────────────────────────┘  │  │ main contrib │ │
│   Pages: 12     │                                           │  │ ution?       │ │
│   Year: 2024    │  ◀─────────── Page 3 of 12 ───────────▶  │  └──────────────┘ │
│                 │                                           │  [🚀 Ask]         │
│   [🔬 Generate  │                                           │                    │
│    Code]        │                                           │  ──────────────── │
│                 │                                           │                    │
│                 │                                           │  📜 Chat History  │
│                 │                                           │                    │
│                 │                                           │  You: Explain     │
│                 │                                           │  the attention    │
│                 │                                           │  mechanism        │
│                 │                                           │                    │
│                 │                                           │  🤖: The attention│
│                 │                                           │  mechanism allows │
│                 │                                           │  the model to...  │
│                 │                                           │                    │
├─────────────────┴───────────────────────────────────────────┴────────────────────┤
│  📊 Ready │ Words: 8,432 │ Reading Time: ~25 min │ 🤖 LLM: Loaded │ GPU: ✓      │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Annotation Popup (Context Menu)

```
                    ┌─────────────────────────────────────┐
                    │  📝 Add Annotation                  │
                    ├─────────────────────────────────────┤
                    │                                     │
                    │  Highlight Color:                   │
                    │  [🟡] [🟢] [🔵] [🟣] [🔴]          │
                    │                                     │
                    │  Note:                              │
                    │  ┌─────────────────────────────┐   │
                    │  │ This explains the key       │   │
                    │  │ concept of...               │   │
                    │  │                             │   │
                    │  └─────────────────────────────┘   │
                    │                                     │
                    │  [💾 Save]  [❌ Cancel]             │
                    │                                     │
                    └─────────────────────────────────────┘
```

### Code Generation Panel (CS Papers)

```
┌──────────────────────────────────────────────────────────────────┐
│  🔬 Code Generation - Detected: Computer Science / Deep Learning │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Select implementation type:                                     │
│                                                                  │
│  ○ Full implementation    ◉ Core algorithm    ○ Pseudocode      │
│                                                                  │
│  Language: [Python ▼]  Framework: [PyTorch ▼]                   │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ # Auto-generated implementation of Self-Attention          │ │
│  │ # Based on: "Attention Is All You Need" (Section 3.2)      │ │
│  │                                                            │ │
│  │ import torch                                               │ │
│  │ import torch.nn as nn                                      │ │
│  │ import torch.nn.functional as F                            │ │
│  │                                                            │ │
│  │ class MultiHeadAttention(nn.Module):                       │ │
│  │     def __init__(self, d_model, num_heads):                │ │
│  │         super().__init__()                                 │ │
│  │         self.d_model = d_model                             │ │
│  │         self.num_heads = num_heads                         │ │
│  │         self.d_k = d_model // num_heads                    │ │
│  │         ...                                                │ │
│  │                                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  [📋 Copy]  [💾 Save as .py]  [🔄 Regenerate]  [📖 Explain]     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Voice Interaction Panel

```
┌──────────────────────────────────────────────────────────────────┐
│  🎙️ Voice Assistant                                    [⚙️ Settings]│
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    ~~~~~~~~ ▂▃▅▇▅▃▂ ~~~~~~~~              │ │
│  │                    Audio Waveform Visualization            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│           🔴 Recording...  "Note down: This is important..."    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  [🎤 Push to Talk]    [▶️ Read Aloud]    [⏹️ Stop]       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Reading Controls:                                               │
│  ◀◀  ◀  [▶️ Play]  ▶  ▶▶     Speed: [1.0x ▼]                   │
│  ─────●──────────────────────  Voice: [Sarah ▼]                 │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│  📜 Voice History                                                │
│  ──────────────────────                                          │
│  🎤 You: "Note down: The attention mechanism allows..."          │
│     ✓ Added note at page 3, paragraph 2                          │
│                                                                  │
│  🔊 AI: Reading page 3...                                        │
│     "The transformer architecture relies on self-attention..."   │
│                                                                  │
│  🎤 You: "Explain the multi-head attention"                      │
│  🤖 AI: "Multi-head attention allows the model to jointly        │
│         attend to information from different representation..."  │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│  Voice Commands:                                                 │
│  • "Note down: [text]" - Add annotation at cursor                │
│  • "Read from here" - Start reading aloud                        │
│  • "Explain this" - Explain selected text                        │
│  • "Summarize" - Summarize current section                       │
│  • "Ask: [question]" - Ask the AI assistant                      │
└──────────────────────────────────────────────────────────────────┘
```

### Reading Cursor Synchronization (Document View)

```
┌──────────────────────────────────────────────────────────────────┐
│                      DOCUMENT VIEWER                             │
│                                                                  │
│  The transformer architecture was introduced in the landmark     │
│  paper "Attention Is All You Need" (Vaswani et al., 2017).      │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ ▶ [The self-attention mechanism] allows the model to       │ │
│  │   ═══════════════════════════                              │ │
│  │   jointly attend to information from different positions   │ │
│  │   in the input sequence.                                   │ │
│  └────────────────────────────────────────────────────────────┘ │
│        ↑                                                         │
│    Currently reading (highlighted + cursor indicator)            │
│                                                                  │
│  The key innovation is computing attention weights in parallel   │
│  rather than sequentially, which enables significantly faster    │
│  training on modern hardware.                                    │
│                                                    ──────────────│
│                                                    📝 Note added │
│                                                    "Important    │
│                                                     concept!"    │
│                                                    ──────────────│
│                                                                  │
│  ◀─────────────── Page 3 of 12 ───────────────▶   🔊 Reading... │
└──────────────────────────────────────────────────────────────────┘
```

### Voice Settings Modal

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚙️ Voice Settings                                         [✕]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Speech Recognition (STT)                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Provider: [Local (Whisper) ▼]                          │   │
│  │                                                         │   │
│  │  ○ Local (Whisper.cpp) - Offline, Private               │   │
│  │  ○ OpenAI Whisper - Cloud, High Accuracy                │   │
│  │  ○ AWS Transcribe - Enterprise, Low Latency             │   │
│  │  ○ Deepgram - Real-time, Best Speed                     │   │
│  │  ○ Google Speech - Multi-language                       │   │
│  │                                                         │   │
│  │  Model Size: [Medium ▼]  (Tiny | Base | Small | Medium) │   │
│  │  Language: [English (US) ▼]                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Text-to-Speech (TTS)                                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Provider: [ElevenLabs ▼]                               │   │
│  │                                                         │   │
│  │  ○ Local (Piper) - Offline, Fast                        │   │
│  │  ○ AWS Polly Neural - Natural, Reliable                 │   │
│  │  ○ ElevenLabs - Most Natural, Premium                   │   │
│  │  ○ OpenAI TTS - Good Quality, Simple                    │   │
│  │  ○ Azure Neural - Enterprise, Many Voices               │   │
│  │                                                         │   │
│  │  Voice: [Sarah - American Female ▼]        [▶️ Preview] │   │
│  │  Speed: [────●────] 1.0x                                │   │
│  │  Pitch: [────●────] Normal                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Interaction Settings                                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  [✓] Enable wake word: "Hey IntelliDoc"                 │   │
│  │  [✓] Auto-punctuation                                   │   │
│  │  [✓] Noise suppression                                  │   │
│  │  [ ] Continuous listening mode                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  API Keys (for cloud providers)                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  OpenAI:     [••••••••••••••••••••] [Show]              │   │
│  │  ElevenLabs: [••••••••••••••••••••] [Show]              │   │
│  │  AWS:        [Configure AWS Credentials...]              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│                              [Cancel]  [💾 Save Settings]       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 Module Design

### 1. Document Parser Module

```rust
// src/document/parser.rs

pub enum DocumentType {
    PDF,
    EPUB,
    DOCX,
    TXT,
    Markdown,
    LaTeX,
}

pub struct Document {
    pub id: String,           // SHA-256 hash for identification
    pub doc_type: DocumentType,
    pub title: String,
    pub authors: Vec<String>,
    pub content: Vec<Page>,
    pub metadata: Metadata,
    pub category: Category,   // Auto-detected: CS, Physics, etc.
}

pub struct Page {
    pub number: u32,
    pub text: String,
    pub paragraphs: Vec<Paragraph>,
    pub images: Vec<Image>,
}

pub struct Paragraph {
    pub id: String,
    pub text: String,
    pub bounding_box: BoundingBox,
    pub annotations: Vec<AnnotationRef>,
}
```

### 2. Annotation Manager Module

```rust
// src/annotation/manager.rs

pub struct Annotation {
    pub id: Uuid,
    pub document_id: String,    // Links to document hash
    pub page_number: u32,
    pub text_range: TextRange,
    pub highlight_color: Option<Color>,
    pub note: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

pub struct TextRange {
    pub start_offset: usize,
    pub end_offset: usize,
    pub paragraph_id: String,
}

impl AnnotationManager {
    pub fn add_annotation(&mut self, annotation: Annotation) -> Result<()>;
    pub fn get_annotations(&self, document_id: &str) -> Vec<Annotation>;
    pub fn update_annotation(&mut self, id: Uuid, update: AnnotationUpdate) -> Result<()>;
    pub fn delete_annotation(&mut self, id: Uuid) -> Result<()>;
    pub fn export_to_markdown(&self, document_id: &str) -> String;
}
```

### 3. LLM Engine Module (Multi-Provider)

```rust
// src/llm/providers.rs

/// Available LLM providers
pub enum LLMProvider {
    Local,      // llama.cpp
    OpenAI,     // GPT-4, GPT-4o, GPT-3.5
    Gemini,     // Google Gemini
    Anthropic,  // Claude 3
    Groq,       // Fast inference
    Ollama,     // Local server
    Custom,     // OpenAI-compatible
}

/// Provider configuration
pub struct ProviderConfig {
    pub provider: LLMProvider,
    pub api_key: Option<String>,
    pub api_url: Option<String>,
    pub model: String,
    pub max_tokens: u32,
    pub temperature: f32,
}

/// LLM client trait for all providers
#[async_trait]
pub trait LLMClient: Send + Sync {
    async fn chat(&self, messages: Vec<ChatMessage>, config: &ProviderConfig) -> Result<String>;
    async fn stream_chat(&self, messages: Vec<ChatMessage>, config: &ProviderConfig) -> Result<Receiver<String>>;
}

/// Implementations for each provider
impl OpenAIClient { /* GPT models */ }
impl GeminiClient { /* Gemini models */ }
impl AnthropicClient { /* Claude models */ }
// Uses OpenAI-compatible API for Groq, Ollama, Custom
```

```rust
// src/llm/engine.rs

pub struct LLMEngine {
    provider: Box<dyn LLMClient>,
    config: ProviderConfig,
    system_prompt: String,
}

pub enum QueryMode {
    Explain,        // Professor mode - detailed explanation
    QuickAnswer,    // Brief, direct answer
    CodeGenerate,   // Generate implementation code
    Summarize,      // Summarize selected text
}

impl LLMEngine {
    pub fn new(config: ProviderConfig) -> Self;
    
    pub async fn query(
        &self, 
        question: &str, 
        context: &DocumentContext,
        mode: QueryMode
    ) -> Result<Response>;
    
    pub async fn explain_like_professor(
        &self,
        text: &str,
        document: &Document
    ) -> Result<String>;
    
    pub async fn generate_code(
        &self,
        paper_content: &str,
        language: ProgrammingLanguage,
        framework: Option<Framework>
    ) -> Result<CodeSnippet>;
    
    pub fn detect_category(&self, document: &Document) -> Category;
}
```

### 4. Document Editor Module

```rust
// src/document/editor.rs

/// Common edit operations for all document types
pub enum CommonEditOperation {
    InsertText { position: TextPosition, text: String },
    DeleteText { range: TextRange },
    ReplaceText { range: TextRange, new_text: String },
    SetFormat { range: TextRange, format: TextFormat },
    InsertImage { position: TextPosition, image_path: String },
    FindReplace { pattern: String, replacement: String, use_regex: bool },
}

/// PDF-specific edit operations
pub enum PDFEditOperation {
    AddText { page: u32, x: f32, y: f32, text: String, font_size: f32, color: String },
    AddImage { page: u32, x: f32, y: f32, width: f32, height: f32, image_path: String },
    AddHighlight { page: u32, x: f32, y: f32, width: f32, height: f32, color: String },
    AddAnnotation { page: u32, x: f32, y: f32, content: String },
    AddShape { page: u32, shape_type: ShapeType, bounds: BoundingBox },
    AddLine { page: u32, x1: f32, y1: f32, x2: f32, y2: f32, stroke_width: f32 },
    DeletePage { page: u32 },
    InsertPage { after_page: u32, width: f32, height: f32 },
    RotatePage { page: u32, degrees: i32 },
    AddWatermark { text: String, opacity: f32, position: WatermarkPosition },
    Redact { page: u32, x: f32, y: f32, width: f32, height: f32 },
    AddSignature { page: u32, signature_image: String, bounds: BoundingBox },
    FillFormField { field_name: String, value: String },
    AddLink { page: u32, url: String, bounds: BoundingBox },
    AddBookmark { title: String, page: u32 },
}

/// Text/Markdown-specific edit operations
pub enum TextEditOperation {
    Common(CommonEditOperation),
    InsertHeading { position: TextPosition, level: u8, text: String },
    InsertCodeBlock { position: TextPosition, language: String, code: String },
    InsertLink { position: TextPosition, text: String, url: String },
    InsertList { position: TextPosition, items: Vec<String>, ordered: bool },
    InsertTable { position: TextPosition, rows: Vec<Vec<String>> },
    ToggleBold { range: TextRange },
    ToggleItalic { range: TextRange },
}

/// DOCX-specific edit operations
pub enum DOCXEditOperation {
    Common(CommonEditOperation),
    ApplyStyle { range: TextRange, style_name: String },
    InsertTable { position: TextPosition, rows: u32, cols: u32 },
    ModifyTable { table_id: String, operation: TableOperation },
    InsertPageBreak { position: TextPosition },
    SetPageMargins { top: f32, bottom: f32, left: f32, right: f32 },
    AcceptChange { change_id: String },
    RejectChange { change_id: String },
}

/// LaTeX-specific edit operations
pub enum LaTeXEditOperation {
    Common(CommonEditOperation),
    InsertEnvironment { position: TextPosition, env_name: String, content: String },
    InsertCommand { position: TextPosition, command: String, args: Vec<String> },
    WrapInMath { range: TextRange, display_mode: bool },
    InsertCitation { position: TextPosition, cite_key: String },
    InsertReference { position: TextPosition, label: String },
}

/// EPUB-specific edit operations
pub enum EPUBEditOperation {
    Common(CommonEditOperation),
    ModifyMetadata { field: MetadataField, value: String },
    UpdateTOC { entries: Vec<TOCEntry> },
    ModifyCSS { stylesheet_id: String, css: String },
    ReorderChapters { new_order: Vec<String> },
    SetCoverImage { image_path: String },
}

/// Unified document editor trait
#[async_trait]
pub trait DocumentEditor: Send + Sync {
    fn document_type(&self) -> DocumentType;
    fn can_edit(&self) -> bool;
    fn undo(&mut self) -> Option<()>;
    fn redo(&mut self) -> Option<()>;
    fn has_unsaved_changes(&self) -> bool;
    async fn save(&mut self) -> Result<()>;
    async fn save_as(&self, path: &str) -> Result<()>;
}

/// PDF Editor implementation
pub struct PDFEditor {
    source_path: String,
    operations: Vec<PDFEditOperation>,
    undo_stack: Vec<PDFEditOperation>,
    config: EditorConfig,
}

impl DocumentEditor for PDFEditor { /* ... */ }

impl PDFEditor {
    pub fn new(path: &str) -> Result<Self>;
    pub fn add_operation(&mut self, op: PDFEditOperation);
}

/// Text/Markdown Editor implementation
pub struct TextEditor {
    source_path: String,
    content: String,
    operations: Vec<TextEditOperation>,
    undo_stack: Vec<TextEditOperation>,
    is_markdown: bool,
}

impl DocumentEditor for TextEditor { /* ... */ }

impl TextEditor {
    pub fn new(path: &str) -> Result<Self>;
    pub fn get_content(&self) -> &str;
    pub fn render_markdown_preview(&self) -> String;
    pub fn get_word_count(&self) -> WordStats;
}

/// DOCX Editor implementation
pub struct DOCXEditor {
    source_path: String,
    operations: Vec<DOCXEditOperation>,
    undo_stack: Vec<DOCXEditOperation>,
}

impl DocumentEditor for DOCXEditor { /* ... */ }

/// PDF utilities
impl PDFUtils {
    pub async fn merge(inputs: &[&str], output: &str) -> Result<()>;
    pub async fn split(input: &str, ranges: &[(u32, u32)], prefix: &str) -> Result<Vec<String>>;
    pub async fn compress(input: &str, output: &str, quality: u8) -> Result<()>;
    pub async fn to_images(input: &str, output_dir: &str, format: ImageFormat) -> Result<Vec<String>>;
    pub async fn from_images(images: &[&str], output: &str) -> Result<()>;
}

/// Document conversion utilities
impl ConversionUtils {
    pub async fn markdown_to_pdf(input: &str, output: &str) -> Result<()>;
    pub async fn markdown_to_docx(input: &str, output: &str) -> Result<()>;
    pub async fn docx_to_pdf(input: &str, output: &str) -> Result<()>;
    pub async fn latex_to_pdf(input: &str, output: &str) -> Result<()>;
    pub async fn txt_to_markdown(input: &str, output: &str) -> Result<()>;
}
```

### 5. Voice Interaction Module

```rust
// src/voice/mod.rs

use async_trait::async_trait;
use tokio::sync::mpsc;

/// Voice provider configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceConfig {
    pub stt_provider: STTProvider,
    pub tts_provider: TTSProvider,
    pub voice_id: String,
    pub language: String,
    pub reading_speed: f32,        // 0.5 to 2.0
    pub wake_word_enabled: bool,
    pub wake_word: String,         // e.g., "Hey IntelliDoc"
    pub auto_punctuation: bool,
    pub noise_suppression: bool,
}

/// Speech-to-Text provider options
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum STTProvider {
    // Cloud providers
    AWSTranscribe { region: String },
    GoogleSpeech { project_id: String },
    AzureSpeech { region: String },
    Deepgram { model: String },      // nova-2, enhanced, base
    AssemblyAI,
    OpenAIWhisper,                   // Cloud Whisper API
    // Local providers
    WhisperCpp { model_path: String, model_size: WhisperModel },
    Vosk { model_path: String },
}

/// Text-to-Speech provider options
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TTSProvider {
    // Cloud providers
    AWSPolly { voice_id: String, engine: PollyEngine },
    GoogleTTS { voice_name: String, speaking_rate: f32 },
    AzureNeural { voice_name: String },
    ElevenLabs { voice_id: String, stability: f32, clarity: f32 },
    OpenAITTS { voice: String, model: String },
    // Local providers
    PiperTTS { model_path: String },
    CoquiTTS { model_name: String },
    ESpeakNG { voice: String },
}

/// Whisper model sizes for local STT
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum WhisperModel {
    Tiny,       // ~75MB, fastest
    Base,       // ~142MB
    Small,      // ~466MB
    Medium,     // ~1.5GB
    Large,      // ~3GB, most accurate
}

/// AWS Polly engine types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PollyEngine {
    Standard,
    Neural,
    Generative, // Most natural, highest cost
}

/// Reading position for cursor sync
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReadingPosition {
    pub document_id: String,
    pub page: u32,
    pub paragraph_id: String,
    pub word_index: u32,
    pub character_offset: u32,
    pub timestamp_ms: u64,
}

/// Voice command types recognized by the system
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum VoiceCommand {
    /// "Note down: [content]" - Add annotation at cursor
    NoteDown { content: String },
    /// "Highlight this" - Highlight current selection/sentence
    Highlight { color: Option<String> },
    /// "Read from here" - Start reading from cursor position
    StartReading,
    /// "Stop reading" / "Pause"
    StopReading,
    /// "Skip to next section"
    SkipSection,
    /// "Go back" - Return to previous position
    GoBack,
    /// "Ask: [question]" - Query the LLM
    AskQuestion { question: String },
    /// "Explain this" - Explain current selection
    ExplainSelection,
    /// "Summarize" - Summarize current page/section
    Summarize { scope: SummarizeScope },
    /// "Speed up" / "Slow down"
    AdjustSpeed { delta: f32 },
    /// "Repeat" - Repeat last spoken content
    Repeat,
    /// Raw text (not a command)
    FreeText { text: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SummarizeScope {
    Selection,
    Page,
    Section,
    Document,
}

/// Speech-to-Text trait for all providers
#[async_trait]
pub trait SpeechToText: Send + Sync {
    /// Start listening for speech
    async fn start_listening(&mut self) -> Result<()>;
    
    /// Stop listening
    async fn stop_listening(&mut self) -> Result<()>;
    
    /// Get transcription stream
    fn transcription_stream(&self) -> mpsc::Receiver<TranscriptionResult>;
    
    /// Check if currently listening
    fn is_listening(&self) -> bool;
}

/// Transcription result from STT
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptionResult {
    pub text: String,
    pub is_final: bool,
    pub confidence: f32,
    pub timestamp_ms: u64,
    pub words: Vec<WordTiming>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WordTiming {
    pub word: String,
    pub start_ms: u64,
    pub end_ms: u64,
    pub confidence: f32,
}

/// Text-to-Speech trait for all providers
#[async_trait]
pub trait TextToSpeech: Send + Sync {
    /// Synthesize text to audio
    async fn synthesize(&self, text: &str) -> Result<AudioData>;
    
    /// Stream synthesis for long text
    async fn synthesize_stream(&self, text: &str) -> Result<mpsc::Receiver<AudioChunk>>;
    
    /// Get word timings for synchronization
    async fn get_word_timings(&self, text: &str) -> Result<Vec<WordTiming>>;
    
    /// Stop current playback
    async fn stop(&mut self) -> Result<()>;
}

#[derive(Debug, Clone)]
pub struct AudioData {
    pub samples: Vec<f32>,
    pub sample_rate: u32,
    pub channels: u8,
}

#[derive(Debug, Clone)]
pub struct AudioChunk {
    pub data: Vec<u8>,
    pub word_timings: Vec<WordTiming>,
    pub is_final: bool,
}

/// Voice command parser
pub struct VoiceCommandParser {
    config: VoiceConfig,
}

impl VoiceCommandParser {
    pub fn new(config: VoiceConfig) -> Self;
    
    /// Parse transcribed text into a voice command
    pub fn parse(&self, text: &str) -> VoiceCommand {
        let lower = text.to_lowercase();
        
        // Check for note-taking command
        if lower.starts_with("note down") || lower.starts_with("write down") {
            let content = text.split_once(':')
                .map(|(_, c)| c.trim().to_string())
                .unwrap_or_else(|| text[10..].trim().to_string());
            return VoiceCommand::NoteDown { content };
        }
        
        // Check for other commands...
        match lower.as_str() {
            "highlight this" | "highlight" => VoiceCommand::Highlight { color: None },
            "read from here" | "start reading" => VoiceCommand::StartReading,
            "stop reading" | "stop" | "pause" => VoiceCommand::StopReading,
            "explain this" | "explain" => VoiceCommand::ExplainSelection,
            "summarize" | "summarize this" => VoiceCommand::Summarize { scope: SummarizeScope::Selection },
            "speed up" | "faster" => VoiceCommand::AdjustSpeed { delta: 0.25 },
            "slow down" | "slower" => VoiceCommand::AdjustSpeed { delta: -0.25 },
            "repeat" | "say again" => VoiceCommand::Repeat,
            _ => {
                // Check for question
                if lower.starts_with("ask") || lower.ends_with("?") {
                    VoiceCommand::AskQuestion { question: text.to_string() }
                } else {
                    VoiceCommand::FreeText { text: text.to_string() }
                }
            }
        }
    }
}

/// Voice interaction manager
pub struct VoiceManager {
    config: VoiceConfig,
    stt: Box<dyn SpeechToText>,
    tts: Box<dyn TextToSpeech>,
    command_parser: VoiceCommandParser,
    current_position: Option<ReadingPosition>,
    is_reading: bool,
}

impl VoiceManager {
    pub fn new(config: VoiceConfig) -> Result<Self>;
    
    /// Start voice interaction
    pub async fn start(&mut self) -> Result<()>;
    
    /// Stop voice interaction
    pub async fn stop(&mut self) -> Result<()>;
    
    /// Read document content aloud with cursor sync
    pub async fn read_content(
        &mut self,
        content: &str,
        start_position: ReadingPosition,
        position_callback: impl Fn(ReadingPosition) + Send + 'static,
    ) -> Result<()>;
    
    /// Process voice command
    pub async fn process_command(&mut self, command: VoiceCommand) -> Result<VoiceResponse>;
    
    /// Get current reading position
    pub fn get_reading_position(&self) -> Option<&ReadingPosition>;
}

/// Response from voice command processing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceResponse {
    pub text: String,
    pub should_speak: bool,
    pub action: Option<VoiceAction>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum VoiceAction {
    AddAnnotation { position: ReadingPosition, content: String },
    AddHighlight { position: ReadingPosition, color: String },
    ScrollTo { position: ReadingPosition },
    ShowLLMResponse { response: String },
}
```

```rust
// src/voice/providers/whisper.rs - Local Whisper.cpp implementation

use whisper_rs::{WhisperContext, WhisperContextParameters, FullParams, SamplingStrategy};

pub struct WhisperSTT {
    context: WhisperContext,
    is_listening: bool,
    tx: mpsc::Sender<TranscriptionResult>,
}

impl WhisperSTT {
    pub fn new(model_path: &str, model_size: WhisperModel) -> Result<Self> {
        let params = WhisperContextParameters::default();
        let context = WhisperContext::new_with_params(model_path, params)?;
        // ...
    }
}

#[async_trait]
impl SpeechToText for WhisperSTT {
    async fn start_listening(&mut self) -> Result<()> {
        // Start audio capture and continuous transcription
        self.is_listening = true;
        // Use cpal or rodio for audio input
        // Process in real-time with Whisper
    }
    
    // ...
}
```

```rust
// src/voice/providers/aws.rs - AWS Transcribe + Polly implementation

use aws_sdk_transcribestreaming as transcribe;
use aws_sdk_polly as polly;

pub struct AWSTranscribeSTT {
    client: transcribe::Client,
    region: String,
    is_listening: bool,
}

pub struct AWSPollyTTS {
    client: polly::Client,
    voice_id: String,
    engine: PollyEngine,
}

impl AWSPollyTTS {
    pub async fn new(region: &str, voice_id: &str, engine: PollyEngine) -> Result<Self> {
        let config = aws_config::from_env()
            .region(aws_sdk_polly::config::Region::new(region.to_string()))
            .load()
            .await;
        let client = polly::Client::new(&config);
        // ...
    }
}

#[async_trait]
impl TextToSpeech for AWSPollyTTS {
    async fn synthesize(&self, text: &str) -> Result<AudioData> {
        let resp = self.client
            .synthesize_speech()
            .engine(match self.engine {
                PollyEngine::Neural => polly::types::Engine::Neural,
                PollyEngine::Standard => polly::types::Engine::Standard,
                PollyEngine::Generative => polly::types::Engine::Generative,
            })
            .voice_id(polly::types::VoiceId::from(self.voice_id.as_str()))
            .output_format(polly::types::OutputFormat::Pcm)
            .text(text)
            .send()
            .await?;
        // Convert to AudioData...
    }
    
    async fn get_word_timings(&self, text: &str) -> Result<Vec<WordTiming>> {
        // Use speech marks for word-level timing
        let resp = self.client
            .synthesize_speech()
            .text(text)
            .output_format(polly::types::OutputFormat::Json)
            .speech_mark_types(polly::types::SpeechMarkType::Word)
            .send()
            .await?;
        // Parse speech marks...
    }
}
```

### 6. Storage Manager Module

```rust
// src/storage/manager.rs

// SQLite schema for persistent storage
/*
CREATE TABLE documents (
    id TEXT PRIMARY KEY,        -- SHA-256 hash
    title TEXT,
    path TEXT,
    category TEXT,
    last_opened DATETIME,
    metadata JSON
);

CREATE TABLE annotations (
    id TEXT PRIMARY KEY,
    document_id TEXT REFERENCES documents(id),
    page_number INTEGER,
    start_offset INTEGER,
    end_offset INTEGER,
    paragraph_id TEXT,
    highlight_color TEXT,
    note TEXT,
    created_at DATETIME,
    updated_at DATETIME
);

CREATE TABLE chat_history (
    id TEXT PRIMARY KEY,
    document_id TEXT REFERENCES documents(id),
    role TEXT,                  -- 'user' or 'assistant'
    content TEXT,
    timestamp DATETIME
);
*/

impl StorageManager {
    pub fn save_annotations(&self, document_id: &str, annotations: &[Annotation]) -> Result<()>;
    pub fn load_annotations(&self, document_id: &str) -> Result<Vec<Annotation>>;
    pub fn save_chat_history(&self, document_id: &str, messages: &[ChatMessage]) -> Result<()>;
    pub fn get_recent_documents(&self, limit: usize) -> Result<Vec<DocumentInfo>>;
}
```

---

## 🔄 Data Flow Diagram

```
                                    USER INTERACTION
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND LAYER                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   Open      │    │  Select     │    │    Ask      │    │   Export    │  │
│  │   Document  │    │  Text       │    │  Question   │    │   Notes     │  │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘  │
└─────────┼──────────────────┼──────────────────┼──────────────────┼─────────┘
          │                  │                  │                  │
          ▼                  ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           IPC COMMAND LAYER                                  │
│        open_document    add_annotation    query_llm    export_annotations   │
└─────────┬──────────────────┬──────────────────┬──────────────────┬─────────┘
          │                  │                  │                  │
          ▼                  ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            RUST BACKEND                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                       │   │
│  │   ┌───────────┐      ┌───────────┐      ┌───────────┐               │   │
│  │   │  Document │ ───▶ │ Annotation│ ───▶ │    LLM    │               │   │
│  │   │  Parser   │      │  Manager  │      │   Engine  │               │   │
│  │   └─────┬─────┘      └─────┬─────┘      └─────┬─────┘               │   │
│  │         │                  │                  │                       │   │
│  │         ▼                  ▼                  ▼                       │   │
│  │   ┌─────────────────────────────────────────────────────────────┐   │   │
│  │   │                    STORAGE MANAGER                           │   │   │
│  │   │  ┌─────────┐    ┌─────────────┐    ┌─────────────────┐     │   │   │
│  │   │  │ SQLite  │    │ File System │    │ Model Cache     │     │   │   │
│  │   │  │  DB     │    │  (docs)     │    │ (LLM weights)   │     │   │   │
│  │   │  └─────────┘    └─────────────┘    └─────────────────┘     │   │   │
│  │   └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
intellidoc_reader/
├── src-tauri/                    # Rust backend
│   ├── Cargo.toml
│   ├── src/
│   │   ├── main.rs              # Entry point
│   │   ├── lib.rs               # Library exports
│   │   ├── commands/            # Tauri IPC commands
│   │   │   ├── mod.rs
│   │   │   ├── document.rs
│   │   │   ├── annotation.rs
│   │   │   ├── editor.rs        # Document editing commands
│   │   │   ├── llm.rs
│   │   │   └── voice.rs         # Voice interaction commands
│   │   ├── document/            # Document parsing & editing
│   │   │   ├── mod.rs
│   │   │   ├── parser.rs
│   │   │   ├── editor.rs        # Multi-format editor
│   │   │   ├── pdf.rs
│   │   │   ├── epub.rs
│   │   │   └── docx.rs
│   │   ├── annotation/          # Annotation management
│   │   │   ├── mod.rs
│   │   │   ├── manager.rs
│   │   │   └── export.rs
│   │   ├── llm/                 # LLM integration
│   │   │   ├── mod.rs
│   │   │   ├── engine.rs
│   │   │   ├── prompts.rs
│   │   │   └── code_gen.rs
│   │   ├── voice/               # Voice interaction
│   │   │   ├── mod.rs           # Voice manager
│   │   │   ├── commands.rs      # Voice command parser
│   │   │   ├── providers/       # STT/TTS providers
│   │   │   │   ├── mod.rs
│   │   │   │   ├── whisper.rs   # Local Whisper.cpp
│   │   │   │   ├── piper.rs     # Local Piper TTS
│   │   │   │   ├── aws.rs       # AWS Transcribe + Polly
│   │   │   │   ├── google.rs    # Google Cloud Speech
│   │   │   │   ├── azure.rs     # Azure Cognitive Services
│   │   │   │   ├── deepgram.rs  # Deepgram STT
│   │   │   │   ├── elevenlabs.rs # ElevenLabs TTS
│   │   │   │   └── openai.rs    # OpenAI Whisper + TTS
│   │   │   └── audio.rs         # Audio capture/playback
│   │   └── storage/             # Data persistence
│   │       ├── mod.rs
│   │       ├── database.rs
│   │       └── migrations/
│   ├── models/                  # Local LLM models
│   │   └── .gitkeep
│   └── voice_models/            # Local voice models
│       ├── whisper/             # Whisper STT models
│       └── piper/               # Piper TTS voices
│
├── src/                         # Frontend (React/Solid)
│   ├── index.html
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── DocumentViewer/
│   │   │   ├── index.tsx
│   │   │   ├── PageRenderer.tsx
│   │   │   ├── AnnotationOverlay.tsx
│   │   │   └── SelectionPopup.tsx
│   │   ├── Sidebar/
│   │   │   ├── Outline.tsx
│   │   │   ├── Metadata.tsx
│   │   │   └── NotesList.tsx
│   │   ├── ChatPanel/
│   │   │   ├── index.tsx
│   │   │   ├── MessageList.tsx
│   │   │   └── InputArea.tsx
│   │   ├── CodeGenerator/
│   │   │   ├── index.tsx
│   │   │   └── CodePreview.tsx
│   │   ├── VoicePanel/          # Voice interaction UI
│   │   │   ├── index.tsx        # Main voice panel
│   │   │   ├── VoiceButton.tsx  # Push-to-talk / toggle button
│   │   │   ├── Waveform.tsx     # Audio visualization
│   │   │   ├── ReadingCursor.tsx # Synchronized reading highlight
│   │   │   └── VoiceSettings.tsx # Voice provider settings
│   │   └── common/
│   │       ├── Button.tsx
│   │       ├── Modal.tsx
│   │       └── Tooltip.tsx
│   ├── hooks/
│   │   ├── useDocument.ts
│   │   ├── useAnnotations.ts
│   │   ├── useLLM.ts
│   │   ├── useVoice.ts          # Voice interaction hook
│   │   └── useAudioPlayer.ts    # Audio playback with sync
│   ├── stores/
│   │   ├── documentStore.ts
│   │   └── settingsStore.ts
│   └── styles/
│       ├── globals.css
│       └── themes/
│           ├── light.css
│           └── dark.css
│
├── docs/
│   ├── DESIGN_DOCUMENT.md       # This file
│   ├── API_REFERENCE.md
│   └── USER_GUIDE.md
│
├── assets/
│   ├── icons/
│   └── fonts/
│
├── package.json                 # Frontend dependencies
├── tauri.conf.json             # Tauri configuration
├── vite.config.ts              # Vite bundler config
└── README.md
```

---

## 🔌 LLM Integration Strategy

### Recommended Models (Local/Offline)

| Model | Size | VRAM | Use Case |
|-------|------|------|----------|
| **Llama 3.2 3B** | ~2GB | 4GB | Fast responses, basic Q&A |
| **Mistral 7B** | ~4GB | 8GB | Good balance, professor mode |
| **CodeLlama 7B** | ~4GB | 8GB | Code generation |
| **Qwen2.5 7B** | ~4GB | 8GB | Best quality, slower |

### Model Loading Strategy

```rust
pub struct ModelManager {
    qa_model: Option<LlamaModel>,      // For Q&A
    code_model: Option<LlamaModel>,    // For code generation
}

impl ModelManager {
    // Lazy loading - only load when needed
    pub async fn get_qa_model(&mut self) -> &LlamaModel {
        if self.qa_model.is_none() {
            self.qa_model = Some(load_model("mistral-7b").await);
        }
        self.qa_model.as_ref().unwrap()
    }
}
```

### System Prompts

```rust
const PROFESSOR_PROMPT: &str = r#"
You are a knowledgeable professor helping a student understand a research paper.
Your role is to:
1. Explain complex concepts in clear, accessible language
2. Provide relevant background knowledge when needed
3. Use analogies and examples to illustrate difficult ideas
4. Answer follow-up questions with patience and depth
5. Point out key insights and their significance

Current document context will be provided. Base your explanations on this content.
"#;

const CODE_GENERATOR_PROMPT: &str = r#"
You are an expert programmer tasked with implementing algorithms from research papers.
Given the paper content, generate:
1. Clean, well-documented code
2. Include references to specific sections of the paper
3. Add comments explaining the mathematical concepts
4. Follow best practices for the target language/framework
"#;
```

---

## 🗄️ Database Schema

```sql
-- SQLite Database Schema

-- Document metadata and identification
CREATE TABLE documents (
    id TEXT PRIMARY KEY,              -- SHA-256 hash of file content
    file_path TEXT NOT NULL,
    title TEXT,
    authors TEXT,                     -- JSON array
    category TEXT DEFAULT 'unknown',  -- 'cs', 'physics', 'math', etc.
    page_count INTEGER,
    word_count INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_opened DATETIME,
    metadata TEXT                     -- JSON blob for extra data
);

-- Annotations (highlights + notes)
CREATE TABLE annotations (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    paragraph_id TEXT,
    start_offset INTEGER NOT NULL,
    end_offset INTEGER NOT NULL,
    selected_text TEXT,
    highlight_color TEXT,             -- 'yellow', 'green', 'blue', 'purple', 'red'
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Chat history per document
CREATE TABLE chat_messages (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    role TEXT NOT NULL,               -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    context_page INTEGER,             -- Page number when question was asked
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Generated code snippets
CREATE TABLE code_snippets (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    language TEXT NOT NULL,
    framework TEXT,
    code TEXT NOT NULL,
    description TEXT,
    section_reference TEXT,           -- Which paper section it implements
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User settings
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_annotations_document ON annotations(document_id);
CREATE INDEX idx_chat_document ON chat_messages(document_id);
CREATE INDEX idx_code_document ON code_snippets(document_id);
CREATE INDEX idx_documents_category ON documents(category);
```

---

## 🚀 Performance Optimizations

### 1. Document Rendering
- **Virtual scrolling**: Only render visible pages
- **Lazy loading**: Load pages on-demand
- **Image caching**: Cache rendered page images
- **Web Workers**: Parse documents in background thread

### 2. LLM Optimization
- **KV Cache**: Reuse context across queries
- **Quantization**: Use 4-bit quantized models (GGUF)
- **Batch processing**: Group related queries
- **Streaming**: Stream responses for better UX

### 3. Storage
- **Connection pooling**: Reuse SQLite connections
- **Prepared statements**: Pre-compile frequent queries
- **Index optimization**: Proper indexes on hot paths
- **WAL mode**: Enable Write-Ahead Logging for concurrency

### 4. Memory Management
- **Model offloading**: Unload unused models
- **Document caching**: LRU cache for recent documents
- **Annotation batching**: Batch save operations

---

## 🎨 UI/UX Guidelines

### Design Principles
1. **Clean & Minimal**: Focus on content, not chrome
2. **Responsive**: Resize panels smoothly
3. **Keyboard-first**: Full keyboard navigation
4. **Accessible**: WCAG 2.1 AA compliance
5. **Dark mode**: First-class dark theme support

### Key Interactions
- **Double-click**: Select word
- **Triple-click**: Select paragraph
- **Ctrl+H**: Toggle highlight on selection
- **Ctrl+N**: Add note to selection
- **Ctrl+Enter**: Send message to AI
- **Ctrl+G**: Generate code (CS papers only)

### Color Palette

```css
:root {
  /* Light Theme */
  --bg-primary: #FAFAFA;
  --bg-secondary: #FFFFFF;
  --text-primary: #1A1A1A;
  --text-secondary: #666666;
  --accent: #2563EB;
  --highlight-yellow: rgba(250, 204, 21, 0.4);
  --highlight-green: rgba(34, 197, 94, 0.4);
  --highlight-blue: rgba(59, 130, 246, 0.4);
  --highlight-purple: rgba(168, 85, 247, 0.4);
  --highlight-red: rgba(239, 68, 68, 0.4);
}

[data-theme="dark"] {
  --bg-primary: #0F0F0F;
  --bg-secondary: #1A1A1A;
  --text-primary: #FAFAFA;
  --text-secondary: #A0A0A0;
  --accent: #3B82F6;
}
```

---

## 📅 Development Roadmap

### Phase 1: Core Foundation (4 weeks)
- [ ] Project setup (Tauri + React)
- [ ] PDF rendering with pdfium
- [ ] Basic document navigation
- [ ] SQLite integration
- [ ] Light/Dark theme

### Phase 2: Annotation System (3 weeks)
- [ ] Text selection handling
- [ ] Highlight functionality (5 colors)
- [ ] Note creation popup
- [ ] Annotation persistence
- [ ] Annotation sidebar list

### Phase 3: LLM Integration (4 weeks)
- [ ] llama.cpp integration
- [ ] Model download manager
- [ ] Professor mode chat
- [ ] Context-aware Q&A
- [ ] Streaming responses

### Phase 4: Code Generation (2 weeks)
- [ ] CS paper detection
- [ ] Code generation prompts
- [ ] Multi-language support
- [ ] Code export options

### Phase 5: Document Editing (3 weeks)
- [ ] PDF editing (text, annotations, shapes)
- [ ] Text/Markdown editor with preview
- [ ] DOCX basic editing
- [ ] LaTeX source editing with syntax highlight
- [ ] Format conversion utilities

### Phase 6: Voice Interaction (4 weeks)
- [ ] Audio capture infrastructure (cpal)
- [ ] Local STT integration (Whisper.cpp)
- [ ] Local TTS integration (Piper)
- [ ] Voice command parser
- [ ] Reading cursor synchronization
- [ ] Cloud provider integrations (optional)
  - [ ] AWS Transcribe + Polly
  - [ ] Google Cloud Speech
  - [ ] ElevenLabs / OpenAI TTS
- [ ] Wake word detection (optional)
- [ ] Voice note-taking ("Note down: xxx")
- [ ] Voice chat with LLM

### Phase 7: Polish & Release (3 weeks)
- [ ] Performance optimization
- [ ] Cross-platform testing
- [ ] Installer creation
- [ ] Documentation
- [ ] Beta testing

**Estimated Total Development Time: ~23 weeks**

---

## 📚 Dependencies (Rust)

```toml
[dependencies]
# Framework
tauri = { version = "2.0", features = ["shell-open"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tokio = { version = "1", features = ["full"] }
async-trait = "0.1"          # Async trait support

# Document Parsing
pdfium-render = "0.8"        # PDF rendering
epub = "2.1"                 # EPUB parsing
docx-rs = "0.4"              # DOCX parsing
pulldown-cmark = "0.10"      # Markdown parsing

# LLM
llama-cpp-rs = "0.3"         # llama.cpp bindings
tokenizers = "0.15"          # Text tokenization

# Voice - Local STT (Speech-to-Text)
whisper-rs = "0.11"          # Whisper.cpp bindings for local STT
cpal = "0.15"                # Cross-platform audio I/O
hound = "3.5"                # WAV file handling
rubato = "0.15"              # Audio resampling

# Voice - Local TTS (Text-to-Speech)
# piper-rs (or shell out to piper binary)
rodio = "0.19"               # Audio playback
symphonia = "0.5"            # Audio decoding

# Voice - Cloud Providers (optional features)
# aws-sdk-transcribestreaming = "1.0"  # AWS Transcribe
# aws-sdk-polly = "1.0"                # AWS Polly TTS
# google-cloud-speech = "0.3"          # Google Cloud Speech
# reqwest = "0.12"                     # HTTP client for APIs

# Voice - Utilities
webrtc-vad = "0.4"           # Voice Activity Detection
rnnoise-c = "0.1"            # Noise suppression

# Storage
rusqlite = { version = "0.31", features = ["bundled"] }
uuid = { version = "1.7", features = ["v4"] }
chrono = { version = "0.4", features = ["serde"] }

# Utilities
sha2 = "0.10"                # Document hashing
thiserror = "1.0"            # Error handling
tracing = "0.1"              # Logging
reqwest = { version = "0.12", features = ["json", "stream"] }  # HTTP client

[features]
default = ["local-voice"]
local-voice = ["whisper-rs", "rodio"]
aws-voice = ["aws-sdk-transcribestreaming", "aws-sdk-polly"]
google-voice = ["google-cloud-speech"]
azure-voice = []
all-voice = ["local-voice", "aws-voice", "google-voice", "azure-voice"]
```

## 📦 Frontend Dependencies (package.json)

```json
{
  "dependencies": {
    // Voice interaction
    "@anthropic-ai/sdk": "^0.24.0",
    "openai": "^4.0.0",
    
    // Audio handling
    "recordrtc": "^5.6.2",
    "wavesurfer.js": "^7.0.0",
    
    // UI utilities  
    "framer-motion": "^11.0.0"
  }
}
```

---

## 🔐 Security Considerations

1. **Sandboxed LLM**: Run model inference in isolated process
2. **Input validation**: Sanitize all user inputs
3. **File access**: Restrict to user-selected files only
4. **No telemetry**: All data stays local
5. **Secure storage**: Encrypt sensitive settings

---

## 📝 Conclusion

IntelliDoc Reader combines the power of local LLMs with a modern, lightweight document reader to create an intelligent research assistant. The Tauri + Rust architecture ensures excellent performance while maintaining a small footprint, and the modular design allows for easy extension and maintenance.

### Key Differentiators

1. **Multi-Format Editing**: Full editing support across PDF, Markdown, DOCX, LaTeX, and EPUB formats
2. **Voice Interaction**: Hands-free note-taking, document reading with synchronized cursor, and voice chat with AI
3. **Flexible Voice Providers**: Support for both local (Whisper.cpp, Piper TTS) and cloud (AWS, Google, ElevenLabs) voice services
4. **Privacy-First Design**: Fully offline operation possible with local LLM and voice models
5. **Professor Mode**: AI assistant that explains complex concepts in accessible language

The estimated development time is **~23 weeks** for a full-featured v1.0 release, with the core reading and annotation features available much sooner for early testing. Voice interaction features can be incrementally added, starting with local providers and expanding to cloud options based on user demand.
