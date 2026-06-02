# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-06-02
### Added
- Web search tool (`web_search`): DuckDuckGo Instant Answer API integration for real-time web searching
- Web fetch tool (`web_fetch`): URL fetching with HTML-to-text conversion, SSRF protection, and 3000-char truncation
- Agentic loop in `chat()`: Iterative while-loop (max 10 iterations) enabling multi-step tool-using conversations
- Parallel tool execution: Model can issue multiple concurrent tool calls via `parallelToolCalls: true` and `Promise.all()`
- Static tool definitions: `ChatAgent.TOOLS` array with JSON Schemas for `web_search` and `web_fetch`
- Tool error handling: Tool errors returned as strings to the model (never thrown), enabling self-correction
- Token counting for tool-call messages: `estimateMessageTokenCount()` now accounts for `toolCalls` JSON length when content is null
- Documentation: Expanded README with web tool system section, agentic loop explanation, and usage examples

### Changed
- Dependencies: Added `axios: ^1.7.2` and `html-to-text: ^9.0.5` to `package.json`
- `.env.example`: Added web search & fetch capability line to system prompt template
- README updated to v1.0.0 with comprehensive feature documentation

## [Unreleased] - 2026-05-27
### Added
- System Prompt Feature: Added SYSTEM_PROMPT and PERSONA environment variables to configure agent behavior/personality without storing in conversation history
  - Loaded from environment variable only (no runtime slash commands)
  - Influences agent responses while keeping conversation history clean
  - Included in token count displayed by /context command for accurate context awareness

- Agent variables (agents.js): Added constants like `this.systemPrompt` and `this.temperature` for better agent configuration
- Token Estimation Functions (agent.js): Added `estimateMessageTokenCount()`, `estimateSystemPromptTokenCount()` and `estimatePersonaTokenCount()` for a more modular method of calculating context usage 
- Modular Token Calculation (index.js): Added constants `estimatedMessageTokens`, `estimatedSystemPromptTokens`, `estimatedPersonaTokens`, `estimatedTotalTokens`, in order to calculation the total token use in a more modular fashion
- New-line CLI UI Improvement (index.js): Added newline escape chars `\n` before the user and agent respone to introduce line breaks after the user message and before the agent response for a single-line gap 

### Changed
- Total Token Count Func Declaration & Implementation (agent.js): Changed `estimateTokenCount()` to `estimatedTotalTokenCount()` and changed the implementaion to call and add the results of `estimateMessageTokenCount()`, `estimateSystemPromptTokenCount()` and `estimatePersonaTokenCount()` in order to calculate the total token count
- docs`\`.gitignore: Changed the .gitignore to include a sample run .txt file in the docs folder

### Fixed
- Nemotron 3 Super Context Window Size: Fixed the default model (nvidia/nemotron-3-super-120b-a12b:free) context window size from 1M to approximately 262144K tokens

## [Unreleased] - 2026-05-26
### Added
- Stateless bootup for ChatAgent: starts with empty history and creates session-specific history files
- Graceful fallback in saveHistory(): when primary history file cannot be written, saves to timestamped file in history/ directory
- Updated saveHistory() mechanism: uses session-{timestamp}.json naming for fallback files and updates historyFile for future saves
- New slash commands: '/new' to start a fresh session, '/list' to view available session files, '/rename <old> <new>' to rename session files
- New slash command: '/context' to show current conversation history length and estimated token usage relative to model's context window

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