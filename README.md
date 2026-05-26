# Simple Chat Agent using OpenRouter Agent

A simple command-line chat agent built with OpenRouter's Agent toolkit that provides conversational AI capabilities with persistent conversation history.

## Overview

This project implements a simple yet powerful chat interface that leverages OpenRouter's API to connect with various large language models. The agent maintains conversation context, allowing for coherent, context-aware dialogues. Built with Node.js, it offers a clean command-line experience for interacting with AI models through OpenRouter's unified API.

The ChatAgent is now stateless on bootup - it starts with an empty conversation history and creates a session-specific history file (session-<timestamp>.json) on the first save, ensuring each conversation session gets its own dedicated history file.

## Features

- **Persistent Conversation History**: Maintains context across messages and automatically saves/loads history between sessions
- **Manual Save/Load Conversations**: Save conversations to specific files (`/save <filename>`) and load them later (`/load <filename>`)
- **Session Management**: Create new sessions with `/new`, list existing sessions with `/list`, and rename sessions with `/rename <old> <new>`
- **Model-Agnostic**: Communicate with agent via Openrouter API key, allowing access to various models. Currently uses NVIDIA's `nvidia/nemotron-3-super-120b-a12b:free` free model
- **Simple CLI Interface**: Clean command-line interface using Node.js readline
- **Environment Configuration**: Secure API key management via environment variables
- **Enhanced Clear Commands**: Granular control over conversation history with `/clear` (delete last message) and `/clear all` (reset entire history)
- **Lightweight**: Minimal dependencies for easy setup and deployment

## Setup

Follow these steps to get the chat agent running on your local machine:

### 1. Clone or Download the Repository

If you haven't already, obtain the project files:
```bash
# Clone the repository (if using git)
git clone <repository-url>
cd SimpleChatAgent

# Or download and extract the ZIP file
```

### 2. Install Dependencies

The project uses Node.js packages managed by npm. Install them with:
```bash
npm install
```

This will install:
- `@openrouter/sdk`: OpenRouter's official sdk toolkit
- `dotenv`: For loading environment variables from `.env` file
- (Node.js built-in `readline` module for CLI interface)

### 3. Configure Environment Variables

Create a `.env` file to store your OpenRouter API key securely:
```bash
# Copy the example file
cp .env.example .env
```

Then edit the `.env` file to add your actual API key:
```env
OPENROUTER_API_KEY=your_actual_api_key_here
```

> **Important**: Never commit your `.env` file to version control. The `.gitignore` file is already configured to exclude it.

### 4. Obtain an OpenRouter API Key

If you don't have an OpenRouter API key:
1. Visit https://openrouter.ai/keys
2. Sign up for an account
3. Generate a new API key
4. Copy the key into your `.env` file as shown above

## Usage

### Starting the Agent

Launch the chat agent using one of these methods:
```bash
# Using npm start (defined in package.json)
npm start

# Or directly with Node
node src/index.js
```

### Interacting with the Agent

Once running, you'll see a prompt where you can:
- **Type messages**: Send any message to chat with the AI agent
- **Use special commands**:
  - `/clear`: Deletes the last message from conversation history
  - `/clear all`: Clears the entire conversation history, starting fresh
  - `exit`: Terminates the application
  - `Ctrl+C`: Also terminates the application (standard keyboard interrupt)

### Example Session

```
> Hello, how are you today?
Agent: I'm doing well, thank you! How can I assist you today?
> What's the capital of France?
Agent: The capital of France is Paris.
> /save france-chat
Saved conversation to 'france-chat.json' (4 messages)
> /clear
Last message cleared.
> /clear all
Conversation history cleared.
> /load france-chat
Loaded conversation from 'france-chat.json' (0 messages)
> What was the capital we just discussed?
Agent: I have no knowledge of any previous discussions about any capitals
> /new
Started new session with empty history.
> /list
Available session files:
  1. france-chat.json
> /rename france-chat.json france-conversation.json
Renamed 'france-chat.json' to 'france-conversation.json'
> /list
Available session files:
  1. france-conversation.json
> /save new-chat
Saved conversation to 'new-chat.json' (2 messages)
```

## How It Works

### Architecture

The agent follows a straightforward two-layer architecture:

1. **Interface Layer** (`src/index.js`):
   - Handles user input and output via Node.js `readline` module
   - Manages the main application loop
   - Processes special commands (`clear`, `exit`)
   - Routes user messages to the agent layer

2. **Agent Layer** (`src/agent.js`):
   - Encapsulates all OpenRouter API interactions
   - Maintains conversation history in memory
   - Formats requests to OpenRouter with proper parameters
   - Handles API responses and error conditions

### Conversation Management

The agent implements context-aware conversations by:
1. Storing each user message and AI response in an internal history array
2. Sending the complete conversation history with each API request
3. Allowing the model to reference previous exchanges for contextual understanding
4. Providing granular clear functions: `clearLastMessage()` to remove the last message and `clearAllHistory()` to reset the entire conversation history

### Technical Details

- **Model**: Currently uses `nvidia/nemotron-3-super-120b-a12b:free`
- **Temperature**: Set to 0.7 for balanced creativity and consistency
- **Max Tokens**: Limited to 10000 tokens per response to prevent excessively long outputs
- **API Communication**: Uses OpenRouter's standardized API endpoint for model access

## Configuration

### Environment Variables

The agent requires the following environment variable in your `.env` file:

| Variable | Description | Example |
|----------|-------------|---------|
| `OPENROUTER_API_KEY` | Your OpenRouter API key for authentication | `sk-or-...` |

### Code-Level Configuration

Default parameters are configured in `src/agent.js` (lines 20-23):
```javascript
const model = "nvidia/nemotron-3-super-120b-a12b:free";
const temperature = 0.7;
const maxTokens = 10000;
```

To modify these values:
1. Edit `src/agent.js`
2. Adjust the constants as needed
3. Restart the application for changes to take effect

## Requirements

### Software Requirements

- **Node.js**: Version 18 or higher recommended (for modern ECMAScript features)
- **npm**: Comes with Node.js, used for package management
- **OpenRouter Account**: Free tier available at https://openrouter.ai

### Hardware Requirements

- Minimal: Any modern computer capable of running Node.js
- Internet connection: Required for API calls to OpenRouter

## Troubleshooting

### Common Issues

| Symptom | Possible Cause | Solution |
|---------|----------------|----------|
| "API key invalid" or 401 errors | Missing or incorrect API key | Verify `OPENROUTER_API_KEY` in `.env` |
| Module not found errors | Dependencies not installed | Run `npm install` |
| Application hangs on start | Network connectivity issues | Check internet connection and OpenRouter status |
| Unexpected responses | Model parameters too restrictive | Adjust temperature or maxTokens in agent.js |

### Getting Help

If you encounter issues:
1. Check that your API key is valid and has credits
2. Verify Node.js version (`node --version`)
3. Ensure dependencies are installed (`ls node_modules`)
4. Consult OpenRouter's documentation at https://openrouter.ai/docs
5. Review the console output for specific error messages

## Extending the Agent

### Potential Enhancements

- ✅**Persistent History**: Save conversation history to disk between sessions
- **Model Selection**: Allow users to choose specific models via command line
- **Streaming Responses**: Implement real-time token streaming for better UX
- ✅**Additional Commands**: Add features like saving/loading conversations  
- **UI Improvements**: Colors, formatting, or even a web interface

### Contributing

Feel free to fork this repository and submit pull requests with improvements. Please:
1. Keep changes focused and well-documented
2. Follow existing code style
3. Update documentation for any new features
4. Test thoroughly before submitting

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- OpenRouter for providing the unified API to access multiple LLM providers
- The Node.js community for the robust runtime and ecosystem
-dotenv package authors for simplified environment management

---

*Happy chatting! 💬*
