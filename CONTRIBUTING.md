# Contributing to IntelliDoc Reader

Thank you for your interest in contributing to IntelliDoc Reader! This document provides guidelines and information for contributors.

## Getting Started

### Prerequisites

- Rust 1.75 or higher
- Node.js 18 or higher
- pnpm (recommended) or npm
- Platform-specific dependencies (see README.md)

### Development Setup

1. Fork and clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```
4. Run in development mode:
   ```bash
   pnpm tauri dev
   ```

## Development Workflow

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions/changes

### Commit Messages

Follow conventional commits format:

```
type(scope): description

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
- `feat(highlights): add AI scheme generator`
- `fix(pdf): resolve text selection on rotated pages`
- `docs(readme): update installation instructions`

### Code Style

#### TypeScript/React

- Use functional components with hooks
- Use TypeScript strict mode
- Run `pnpm tsc --noEmit` before committing
- Keep components focused and modular

#### Rust

- Follow Rust idioms and conventions
- Run `cargo clippy` before committing
- Run `cargo test` to ensure tests pass
- Document public APIs

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Run type checking: `pnpm tsc --noEmit`
4. Run Rust checks: `cd src-tauri && cargo check && cargo test`
5. Commit with a descriptive message
6. Push and create a Pull Request
7. Wait for CI to pass
8. Request review

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] TypeScript compiles without errors
- [ ] Rust compiles without errors
- [ ] Tests pass (if applicable)
- [ ] Documentation updated (if applicable)
- [ ] Changelog updated for significant changes

## Project Structure

```
intellidoc-reader/
├── src/                      # React frontend
│   ├── components/           # UI components
│   │   ├── highlights/       # Highlight category components
│   │   ├── editor/           # CodeMirror editor components
│   │   └── ...
│   ├── stores/               # Zustand state stores
│   ├── constants/            # Constants and configs
│   └── styles/               # CSS styles
│
├── src-tauri/                # Rust backend
│   ├── src/
│   │   ├── commands/         # Tauri IPC commands
│   │   ├── document/         # Document parsing
│   │   ├── llm/              # LLM providers
│   │   ├── storage/          # SQLite database
│   │   └── voice/            # Voice features
│   └── tests/                # Rust tests
│
└── .github/                  # GitHub configuration
    └── workflows/            # CI/CD workflows
```

## Testing

### Frontend

Currently, manual testing is the primary method. Future plans include:
- Jest unit tests for utilities
- React Testing Library for components

### Backend

```bash
cd src-tauri
cargo test
```

## Areas for Contribution

### Good First Issues

- UI/UX improvements
- Documentation updates
- Bug fixes
- Test coverage

### Feature Ideas

- EPUB support
- DOCX support
- Additional LLM providers
- Export formats
- Accessibility improvements

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
