# Scripts Directory

Utility scripts for development, testing, and deployment.

## Available Scripts

### `setup.sh`
Initial setup for development environment.
```bash
./scripts/setup.sh
```
- Installs Python dependencies
- Installs extension dependencies
- Builds extension
- Creates .env file

### `clean.sh`
Clean build artifacts and caches.
```bash
./scripts/clean.sh
```
- Removes Python cache files
- Removes extension build
- Cleans test artifacts

### `test-all.sh`
Run all tests across the project.
```bash
./scripts/test-all.sh
```
- Runs backend pytest tests
- Runs extension tests (if configured)

## Making Scripts Executable

```bash
chmod +x scripts/*.sh
```

## Usage

Most scripts can be run directly:
```bash
./scripts/setup.sh
./scripts/clean.sh
./scripts/test-all.sh
```

Or via make commands (see Makefile).
