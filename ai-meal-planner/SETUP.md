# Quick Setup Guide

## Project Structure (Monorepo)

```
ai_planner/                    # ROOT (you are here)
├── pyproject.toml            # Python dependencies & config
├── Makefile                  # All commands in one place
├── .env.example              # Environment variables template
├── .gitignore
├── README.md
│
├── backend/                  # ADK-powered Python backend
│   ├── main.py              # FastAPI entry point
│   ├── agents/              # ADK agents
│   ├── tools/               # Custom tools
│   ├── config/              # Configuration
│   └── tests/               # Backend tests
│
└── extension/               # Browser extension
    ├── package.json
    ├── src/
    └── dist/
```

## Initial Setup

### 1. Install uv (if not installed)
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
# Restart shell or: source ~/.bashrc
```

### 2. One-Command Setup
```bash
make setup
```

This will:
- Create virtual environment
- Install Python dependencies (ADK, Gemini, etc.)
- Install Playwright browsers
- Install extension dependencies (npm)

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

## Development Workflow

### Backend Development
```bash
# Start ADK server with auto-reload
make dev

# Or launch ADK development UI
make ui

# Run tests
make test

# Format code
make format

# Run all checks
make check
```

### Extension Development
```bash
# Build extension once
make ext-build

# Watch mode (rebuilds on changes)
make ext-watch

# Clean build artifacts
make ext-clean
```

### Full Stack Development
```bash
# Terminal 1: Backend
make dev

# Terminal 2: Extension watch
make ext-watch
```

## Common Commands

```bash
make help              # Show all available commands
make setup             # Initial setup
make dev               # Run backend in dev mode
make ui                # Launch ADK dev UI
make test              # Run tests
make lint              # Run linters
make format            # Format code
make clean             # Clean cache files
make ext-build         # Build extension
make ext-watch         # Watch extension
make build-all         # Build everything
```

## Why Root Directory?

**Benefits:**
- ✅ Single source of truth for dependencies
- ✅ One Makefile for all commands
- ✅ Easier CI/CD setup
- ✅ Unified testing and linting
- ✅ Better monorepo management
- ✅ Simpler deployment

**Structure:**
- `pyproject.toml` - Manages Python packages for entire project
- `Makefile` - Commands for both backend and extension
- `.env` - Shared environment variables
- `.gitignore` - Ignores for entire repo

## Next Steps

1. **Run setup:**
   ```bash
   make setup
   ```

2. **Configure API key:**
   ```bash
   echo "GEMINI_API_KEY=your_key_here" > .env
   ```

3. **Start development:**
   ```bash
   make dev
   ```

4. **Build extension:**
   ```bash
   make ext-build
   ```

5. **Load extension in Chrome:**
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select `extension/dist/` folder

## Troubleshooting

**uv not found:**
```bash
make install-uv
# Then restart your shell
```

**Python version issues:**
```bash
# Check version
python --version  # Should be 3.10+

# Create venv with specific version
uv venv --python 3.11
```

**Extension not building:**
```bash
cd extension
npm install
npm run build
```

**ADK not found:**
```bash
make dev-install
```
