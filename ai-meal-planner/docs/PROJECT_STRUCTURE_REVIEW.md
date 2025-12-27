# Project Structure Review & Best Practices

## Current Structure
```
ai_planner/
├── backend/              # FastAPI backend
│   ├── agents/
│   ├── api/
│   ├── config/
│   ├── main.py
│   ├── templates/
│   ├── tests/
│   └── tools/
├── extension/            # Chrome extension
│   ├── src/
│   ├── dist/
│   └── webpack.config.js
├── frontend/             # HTML/JS frontend
│   └── index.html
├── workers/              # Background workers (?)
├── design/               # Design files (empty)
├── .env
├── pyproject.toml
├── Makefile
└── README.md
```

## Analysis

### ✅ Good Practices Already Followed

1. **Separate concerns**: Backend, frontend, and extension are separated
2. **Python packaging**: Using `pyproject.toml` (modern standard)
3. **Environment variables**: `.env` and `.env.example` present
4. **Documentation**: Multiple MD files (README, SETUP, TESTING, etc.)
5. **Makefile**: Good for common commands
6. **Backend structure**: Follows FastAPI conventions (api/, config/, tests/)

### ⚠️ Issues & Recommendations

#### 1. **Root Directory Name: `ai_planner`**
**Issue**: Uses underscore, not standard for project root
**Best Practice**: Use kebab-case for project directories
**Recommendation**: Rename to `ai-meal-planner` (matches pyproject.toml name)

#### 2. **Backend as Subdirectory**
**Current**: `backend/` contains the Python package
**Best Practice**: Python package should be at root or in `src/`
**Options**:
- **Option A (Monorepo)**: Keep as-is, good for multi-component projects
- **Option B (Standard Python)**: Move backend to `src/ai_meal_planner/`
**Recommendation**: Keep current structure (monorepo is fine for this project)

#### 3. **Empty Directories**
**Issue**: `design/` is empty, `workers/` unclear purpose
**Recommendation**: 
- Remove `design/` if not used
- Clarify `workers/` purpose or remove

#### 4. **Frontend Location**
**Current**: `frontend/` at root
**Best Practice**: For monorepo, could be `apps/frontend/` or `packages/frontend/`
**Recommendation**: Keep as-is (simple and clear)

#### 5. **Extension Location**
**Current**: `extension/` at root
**Best Practice**: Could be `apps/extension/` or `packages/extension/`
**Recommendation**: Keep as-is (simple and clear)

#### 6. **Backend Package Name**
**Current**: `backend/` directory
**Issue**: Generic name, doesn't match project
**Best Practice**: Use descriptive name matching domain
**Recommendation**: Rename to `meal_planner/` or `ai_meal_planner/`

#### 7. **Templates in Backend**
**Current**: `backend/templates/` (now unused since frontend is separate)
**Recommendation**: Remove or keep for future backend-rendered pages

#### 8. **Multiple Documentation Files**
**Current**: API_INTEGRATION.md, INTEGRATION_GUIDE.md, SETUP.md, TESTING.md
**Best Practice**: Consolidate or organize in `docs/`
**Recommendation**: Create `docs/` directory

## Recommended Structure (Option 1: Minimal Changes)

```
ai-meal-planner/                    # Rename from ai_planner
├── backend/                        # Keep as-is
│   ├── agents/
│   ├── api/
│   ├── config/
│   ├── main.py
│   ├── tests/
│   └── tools/
├── extension/                      # Keep as-is
│   ├── src/
│   └── dist/
├── frontend/                       # Keep as-is
│   └── index.html
├── docs/                           # NEW: Consolidate documentation
│   ├── api-integration.md
│   ├── integration-guide.md
│   ├── setup.md
│   └── testing.md
├── .env
├── .env.example
├── .gitignore
├── pyproject.toml
├── Makefile
└── README.md
```

## Recommended Structure (Option 2: Standard Python Package)

```
ai-meal-planner/
├── src/
│   └── ai_meal_planner/           # Main Python package
│       ├── agents/
│       ├── api/
│       ├── config/
│       ├── main.py
│       ├── tests/
│       └── tools/
├── apps/
│   ├── extension/                 # Chrome extension
│   └── frontend/                  # Web frontend
├── docs/
│   ├── api-integration.md
│   ├── integration-guide.md
│   ├── setup.md
│   └── testing.md
├── .env
├── pyproject.toml
├── Makefile
└── README.md
```

## Recommended Structure (Option 3: True Monorepo)

```
ai-meal-planner/
├── packages/
│   ├── backend/                   # Python backend
│   ├── extension/                 # Chrome extension
│   └── frontend/                  # Web frontend
├── docs/
├── .env
├── pyproject.toml
├── Makefile
└── README.md
```

## Priority Recommendations

### High Priority (Do Now)
1. ✅ **Rename root directory**: `ai_planner` → `ai-meal-planner`
2. ✅ **Create docs/ directory**: Move all .md files except README
3. ✅ **Remove empty directories**: `design/`, clarify `workers/`
4. ✅ **Update pyproject.toml**: Ensure paths match new structure

### Medium Priority (Consider)
1. **Rename backend package**: `backend/` → `ai_meal_planner/` or `meal_planner/`
2. **Remove backend/templates/**: No longer needed
3. **Add .dockerignore**: For containerization
4. **Add CHANGELOG.md**: Track version changes

### Low Priority (Future)
1. Consider moving to `src/` layout if publishing to PyPI
2. Add `scripts/` directory for utility scripts
3. Consider workspace management tool (like `pnpm` workspaces)

## Implementation Plan

### Step 1: Rename Root Directory
```bash
cd /Users/laurynas.jasiukenas/Documents/projects
mv ai_planner ai-meal-planner
```

### Step 2: Create docs/ and Move Files
```bash
cd ai-meal-planner
mkdir docs
mv API_INTEGRATION.md docs/api-integration.md
mv INTEGRATION_GUIDE.md docs/integration-guide.md
mv SETUP.md docs/setup.md
mv TESTING.md docs/testing.md
```

### Step 3: Clean Up
```bash
rm -rf design/  # If empty
# Review workers/ - keep or remove based on usage
```

### Step 4: Update References
- Update Makefile paths if needed
- Update README.md to reference docs/
- Update pyproject.toml if paths changed

## Conclusion

**Recommended Approach**: **Option 1 (Minimal Changes)**

Your current structure is actually quite good! The main improvements are:
1. Rename root directory to kebab-case
2. Organize documentation in `docs/`
3. Clean up empty/unused directories

The monorepo structure (backend/, extension/, frontend/ at root) is perfectly fine for this project and keeps things simple and clear.
