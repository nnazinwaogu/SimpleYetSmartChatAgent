# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2026-05-26
### Added
- Stateless bootup for ChatAgent: starts with empty history and creates session-specific history files
- Graceful fallback in saveHistory(): when primary history file cannot be written, saves to timestamped file in history/ directory
- Updated saveHistory() mechanism: uses session-{timestamp}.json naming for fallback files and updates historyFile for future saves
- New slash commands: '/new' to start a fresh session, '/list' to view available session files

## [Unreleased] - 2026-05-22
### Added
- Granular clear commands: `/clear` to delete last message, `/clear all` to reset entire history


## [Unreleased] - 2026-05-21
### Changed
- Chat loop in index.js to recognize and handle `/clear` and `/exit` commands
- All commands in index.js to `/` commands to ensure consistency  

## [Unreleased] - 2026-05-19
### Added
- Persistent conversation history that automatically saves/loads between sessions
- Manual save/load conversation commands: `/save <filename>` and `/load <filename>`
- History storage moved to repo-relative `history/` directory (with .gitignore protection)
- Filename sanitization for save/load commands to prevent path traversal
- Automatic .json extension handling for save/load commands
- Updated welcome message to show available commands
- Enhanced documentation in README.md and CLAUDE.md
- Example session demonstrating save/load workflow

### Changed
- Modified agent.js to use repository-relative history path instead of user home directory
- Updated .gitignore to track history directory while ignoring actual history files
- Updated chat loop to recognize and handle `/save` and `/load` commands

## [Initial Commit] - 2026-05-14
- Initial commit: Set up Simple Chat Agent project with OpenRouter SDK, dependencies, and basic structure
- Created basic chat agent with OpenRouter integration
- Established two-layer architecture (index.js interface layer, agent.js agent layer)
- Implemented basic conversation history in memory
- Added clear and exit commands
- Configured environment variable support for OpenRouter API key
- Set up package.json with dependencies and start script