# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- Install dependencies: `npm install`
- Start the chat agent: `npm start` or `node src/index.js`
- Clear conversation history during runtime:
  - Type `/clear` to delete the last message
  - Type `/clear all` to reset the entire conversation history
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

The agent maintains conversation history in memory to provide context-aware responses. Each user message is added to the history, and the entire history is sent with each API call to the OpenRouter service. Conversation history is persisted to disk between sessions to maintain context across application restarts.

## Configuration

The agent requires an OpenRouter API key stored in `.env`:
```
OPENROUTER_API_KEY=your_actual_api_key_here
```

Copy `.env.example` to `.env` and add your API key to get started.

## Model Configuration

The agent currently uses:
- Model: `nvidia/nemotron-3-super-120b-a12b:free` (NVIDIA's free model via OpenRouter)
- Temperature: 0.7 (balanced creativity and consistency)
- Max tokens: 10000 (limits response length)

These parameters are hardcoded in `src/agent.js` lines 27-31.