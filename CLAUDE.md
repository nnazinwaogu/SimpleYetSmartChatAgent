# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- Install dependencies: `npm install`
- Start the chat agent: `npm start` or `node src/index.js`
- Clear conversation history during runtime:
  - Type `/clear` to delete the last message
  - Type `/clear all` to reset the entire conversation history
  - Type `/context` to show current conversation history length and estimated token usage
  - Type `/new` to start a new session with empty history
  - Type `/list` to see available session files
  - Type `/rename <old> <new>` to rename session files
- Exit the application: type `exit` in the chat interface or press Ctrl+C

## Project Structure

```
src/
├── index.js      # Entry point - sets up readline interface and chat loop
└── agent.js      # Core agent logic - handles OpenRouter API calls and conversation history
```

Key files:
- `src/index.js`: Main application loop that handles user input/output and agent interaction
- `src/agent.js`: Encapsulates the OpenRouter API interaction and maintains conversation history
- `.env`: Environment variables (not committed) - contains OPENROUTER_API_KEY
- `.env.example`: Template for environment variables
- `package.json`: Defines dependencies and startup script

## Architecture Overview

This chat agent follows a simple two-layer architecture:
1. **Interface Layer** (`index.js`): Handles command-line interface using Node's readline module
2. **Agent Layer** (`agent.js`): Manages AI interactions via OpenRouter's SDK and conversation state

The agent maintains conversation history in memory to provide context-aware responses. Each user message is added to the history, and the entire history is sent with each API call to the OpenRouter service. 

**Stateless Bootup**: The ChatAgent now starts with an empty conversation history on bootup. Instead of automatically loading a default history file, it creates a session-specific history file (session-<timestamp>.json) on the first save, ensuring each conversation session gets its own dedicated history file. Conversation history is still persisted to disk between sessions to maintain context across application restarts.

## Configuration

The agent requires an OpenRouter API key stored in `.env`:
```
OPENROUTER_API_KEY=your_actual_api_key_here
```

Optionally, you can configure a system prompt to influence the agent's behavior/personality:
```
SYSTEM_PROMPT="You have these specific capabilities:
- Persistent conversation history: Automatically saves each turn and saves/loads between sessions, with manual control via /save <filename> and /load <filename>
- Session management: Start fresh sessions with /new, list sessions with /list, rename sessions with /rename <old> <new>
- Context awareness: Track token usage with /context (current model: nvidia/nemotron-3-super-120b-a12b:free with 262K token context)
- Message control: Delete last message with /clear, clear all history with /clear all
- Model flexibility: Works with various models via OpenRouter API (configured via environment variable)

When users ask about your capabilities, explain them clearly and helpfully. If unsure about a feature, be honest about your limitations. Focus on collaborative problem-solving and creative exploration while providing practical, actionable assistance."
```

And optionally configure a persona to define the agent's character and interaction style:
```
PERSONA="You are a creative collaborator that helps with brainstorming, problem-solving, and exploring ideas. You think outside the box while staying grounded in practicality."
```

Copy `.env.example` to `.env` and add your API key (and optional system prompt/persona) to get started.

> **Note**: The `SYSTEM_PROMPT` and `PERSONA` are loaded from environment variables only (no runtime changes via slash commands) and influence agent responses without being stored in conversation history. They are included in the token count displayed by the `/context` command.
>
> **Important**: The `SYSTEM_PROMPT` in `.env.example` contains the core capability description that should not be removed or significantly altered, as it affects core functionality. To customize the agent's behavior, you can append additional instructions to the existing prompt or modify the `PERSONA` variable to change the agent's tone and approach while retaining core functionalities.

## Model Configuration

The agent currently uses:
- Model: `nvidia/nemotron-3-super-120b-a12b:free` (NVIDIA's free model via OpenRouter)
- Temperature: 0.7 (balanced creativity and consistency)
- Max tokens: 5000 (limits response length)

These parameters are hardcoded in `src/agent.js` lines 27-31.