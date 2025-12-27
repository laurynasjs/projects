.PHONY: help install dev-install clean test lint format run dev ui build docker-build docker-run

# Default target
.DEFAULT_GOAL := help

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

help: ## Show this help message
	@echo "$(BLUE)AI Meal Planner - Available Commands$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-20s$(NC) %s\n", $$1, $$2}'

install: ## Install production dependencies using uv
	@echo "$(BLUE)Installing production dependencies...$(NC)"
	uv pip install -e .

dev-install: ## Install development dependencies using uv
	@echo "$(BLUE)Installing development dependencies...$(NC)"
	uv pip install -e ".[dev]"
	playwright install chromium

sync: ## Sync dependencies with uv
	@echo "$(BLUE)Syncing dependencies...$(NC)"
	uv pip sync

clean: ## Clean up cache and build artifacts
	@echo "$(YELLOW)Cleaning up...$(NC)"
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".mypy_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "htmlcov" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name ".coverage" -delete 2>/dev/null || true
	@echo "$(GREEN)Cleanup complete!$(NC)"

test: ## Run tests with pytest
	@echo "$(BLUE)Running tests...$(NC)"
	pytest

test-cov: ## Run tests with coverage report
	@echo "$(BLUE)Running tests with coverage...$(NC)"
	pytest --cov --cov-report=html --cov-report=term

lint: ## Run linting checks (ruff + mypy)
	@echo "$(BLUE)Running linters...$(NC)"
	ruff check .
	mypy .

format: ## Format code with black and ruff
	@echo "$(BLUE)Formatting code...$(NC)"
	black .
	ruff check --fix .

format-check: ## Check code formatting without making changes
	@echo "$(BLUE)Checking code formatting...$(NC)"
	black --check .
	ruff check .

run: ## Run the ADK FastAPI server (production)
	@echo "$(BLUE)Starting ADK server...$(NC)"
	cd backend && uv run uvicorn main:app --host 0.0.0.0 --port 8008

dev: ## Run the ADK server in development mode with auto-reload
	@echo "$(BLUE)Starting ADK server in development mode...$(NC)"
	cd backend && uv run uvicorn main:app --host 0.0.0.0 --port 8008 --reload

ui: ## Launch ADK development UI
	@echo "$(BLUE)Launching ADK development UI...$(NC)"
	@echo "$(YELLOW)Note: ADK UI requires adk CLI. Using direct Python instead.$(NC)"
	cd backend && python main.py

eval: ## Run agent evaluation
	@echo "$(BLUE)Running agent evaluation...$(NC)"
	@echo "$(YELLOW)Note: Evaluation requires adk CLI. Skipping for now.$(NC)"

# Extension commands
ext-install: ## Install extension dependencies
	@echo "$(BLUE)Installing extension dependencies...$(NC)"
	cd extension && npm install

ext-build: ## Build extension
	@echo "$(BLUE)Building extension...$(NC)"
	cd extension && npm run build

ext-watch: ## Watch and rebuild extension on changes
	@echo "$(BLUE)Watching extension for changes...$(NC)"
	cd extension && npm run watch

ext-clean: ## Clean extension build artifacts
	@echo "$(BLUE)Cleaning extension build...$(NC)"
	cd extension && rm -rf dist/

shell: ## Start IPython shell with project context
	@echo "$(BLUE)Starting IPython shell...$(NC)"
	ipython

check: format-check lint test ## Run all checks (format, lint, test)
	@echo "$(GREEN)All checks passed!$(NC)"

setup: ## Initial setup - install uv, dependencies, and playwright
	@echo "$(BLUE)Setting up project...$(NC)"
	@command -v uv >/dev/null 2>&1 || { echo "$(RED)uv not found. Installing...$(NC)"; curl -LsSf https://astral.sh/uv/install.sh | sh; }
	@echo "$(GREEN)uv installed!$(NC)"
	$(MAKE) dev-install
	$(MAKE) ext-install
	@echo "$(GREEN)Setup complete!$(NC)"

setup-all: setup ## Alias for setup
	@echo "$(GREEN)Full setup complete!$(NC)"

build-all: ## Build both backend and extension
	@echo "$(BLUE)Building entire project...$(NC)"
	$(MAKE) ext-build
	@echo "$(GREEN)Build complete!$(NC)"

dev-all: ## Run both backend and extension in development mode
	@echo "$(BLUE)Starting full development environment...$(NC)"
	@echo "$(YELLOW)Note: This will run backend in foreground. Run 'make ext-watch' in another terminal.$(NC)"
	$(MAKE) dev

venv: ## Create virtual environment using uv
	@echo "$(BLUE)Creating virtual environment...$(NC)"
	uv venv
	@echo "$(GREEN)Virtual environment created! Activate with: source .venv/bin/activate$(NC)"

upgrade: ## Upgrade all dependencies
	@echo "$(BLUE)Upgrading dependencies...$(NC)"
	uv pip install --upgrade -e ".[dev]"

freeze: ## Show installed packages
	@echo "$(BLUE)Installed packages:$(NC)"
	uv pip list

docker-build: ## Build Docker image
	@echo "$(BLUE)Building Docker image...$(NC)"
	docker build -t ai-meal-planner:latest .

docker-run: ## Run Docker container
	@echo "$(BLUE)Running Docker container...$(NC)"
	docker run -p 8000:8000 --env-file .env ai-meal-planner:latest

docker-dev: ## Run Docker container in development mode
	@echo "$(BLUE)Running Docker container in development mode...$(NC)"
	docker run -p 8000:8000 -v $(PWD):/app --env-file .env ai-meal-planner:latest

logs: ## Show application logs (if running in background)
	@echo "$(BLUE)Showing logs...$(NC)"
	tail -f logs/app.log

migrate-flask: ## Migrate old Flask app data (if needed)
	@echo "$(YELLOW)Migrating from Flask to ADK...$(NC)"
	python scripts/migrate_flask.py

.PHONY: install-uv
install-uv: ## Install uv package manager
	@echo "$(BLUE)Installing uv...$(NC)"
	curl -LsSf https://astral.sh/uv/install.sh | sh
	@echo "$(GREEN)uv installed! Restart your shell or run: source ~/.bashrc$(NC)"
