import { ChatAgent } from './agent.js';
import readline from 'readline';
import { existsSync, writeFileSync, readFileSync, readdirSync, renameSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const agent = new ChatAgent();

console.log('Simple Chat Agent ("/clear" to delete last message, "/clear all" to reset history, "/new" for new session, "/list" to see sessions, "/rename <old> <new>" to rename session, "/save <filename>" to save, "/load <filename>" to load, "/context" to show context usage, "/exit" to quit)');
console.log('--------------------------------------------------');

const chatLoop = () => {
  rl.question('You: ', (input) => {
    if (input.toLowerCase() === '/exit') {
      rl.close();
      return;
    }

    if (input.toLowerCase() === '/clear') {
      agent.clearLastMessage();
      console.log('Last message cleared.');
      chatLoop();
      return;
    }

    if (input.toLowerCase() === '/clear all') {
      agent.clearAllHistory();
      console.log('Conversation history cleared.');
      chatLoop();
      return;
    }

    if (input.toLowerCase() === '/new') {
      agent.historyFile = undefined; // Reset historyFile to force creation of a new session file on next save
      agent.history = []; // Clear in-memory history
      console.log('Started new session with empty history.');
      chatLoop();
      return;
    }

    if (input.toLowerCase() === '/list') {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const historyDir = join(__dirname, '..', 'history');

      try {
        const files = readdirSync(historyDir);
        const jsonFiles = files.filter(file => file.endsWith('.json') && file !== '.gitignore');

        if (jsonFiles.length === 0) {
          console.log('No session files found in history directory');
        } else {
          console.log('Available session files:');
          jsonFiles.forEach((file, index) => {
            console.log(`  ${index + 1}. ${file}`);
          });
        }
      } catch (error) {
        console.error(`Could not read history directory: ${error.message}`);
      }

      chatLoop();
      return;
    }

    if (input.toLowerCase().startsWith('/rename')) {
      const parts = input.substring(7).trim().split(/\s+/);
      if (parts.length < 2) {
        console.log('Please specify both old and new filenames: /rename <oldFilename> <newFilename>');
        chatLoop();
        return;
      }

      const oldFilename = parts[0];
      const newFilename = parts[1];

      // Sanitize filenames to prevent path traversal
      const sanitizedOldFilename = oldFilename.replace(/[\\/:*?"<>|]/g, '').replace(/\.\./g, '');
      const sanitizedNewFilename = newFilename.replace(/[\\/:*?"<>|]/g, '').replace(/\.\./g, '');

      if (!sanitizedOldFilename || !sanitizedNewFilename) {
        console.log('Invalid filename(s) provided');
        chatLoop();
        return;
      }

      // Ensure .json extension
      const oldJsonFilename = sanitizedOldFilename.endsWith('.json') ? sanitizedOldFilename : `${sanitizedOldFilename}.json`;
      const newJsonFilename = sanitizedNewFilename.endsWith('.json') ? sanitizedNewFilename : `${sanitizedNewFilename}.json`;

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const historyDir = join(__dirname, '..', 'history');
      const oldFilePath = join(historyDir, oldJsonFilename);
      const newFilePath = join(historyDir, newJsonFilename);

      try {
        if (!existsSync(oldFilePath)) {
          console.log(`File '${oldJsonFilename}' not found in history directory`);
          chatLoop();
          return;
        }

        if (existsSync(newFilePath)) {
          console.log(`File '${newJsonFilename}' already exists in history directory`);
          chatLoop();
          return;
        }

        // Rename the file
        renameSync(oldFilePath, newFilePath);

        // If the agent is currently using this file as its historyFile, update the reference
        if (agent.historyFile && agent.historyFile.endsWith(oldJsonFilename)) {
          agent.historyFile = newFilePath;
          console.log(`Renamed '${oldJsonFilename}' to '${newJsonFilename}' and updated agent history reference`);
        } else {
          console.log(`Renamed '${oldJsonFilename}' to '${newJsonFilename}'`);
        }
      } catch (error) {
        console.error(`Could not rename file: ${error.message}`);
      }

      chatLoop();
      return;
    }

    if (input.toLowerCase().startsWith('/save')) {
      const filename = input.substring(5).trim();
      if (!filename) {
        console.log('Please specify a filename: /save <filename>');
        chatLoop();
        return;
      }

      // Sanitize filename to prevent path traversal
      const sanitizedFilename = filename.replace(/[\\/:*?"<>|]/g, '').replace(/\.\./g, '');
      if (!sanitizedFilename) {
        console.log('Invalid filename provided');
        chatLoop();
        return;
      }

      // Ensure .json extension
      const jsonFilename = sanitizedFilename.endsWith('.json') ? sanitizedFilename : `${sanitizedFilename}.json`;
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const filePath = join(__dirname, '..', 'history', jsonFilename);

      try {
        writeFileSync(filePath, JSON.stringify(agent.history, null, 2));
        console.log(`Saved conversation to '${jsonFilename}' (${agent.history.length} messages)`);
      } catch (error) {
        console.error(`Could not save conversation: ${error.message}`);
      }
      chatLoop();
      return;
    }

    if (input.toLowerCase().startsWith('/load')) {
      const filename = input.substring(5).trim();
      if (!filename) {
        console.log('Please specify a filename: /load <filename>');
        chatLoop();
        return;
      }

      // Sanitize filename to prevent path traversal
      const sanitizedFilename = filename.replace(/[\\/:*?"<>|]/g, '').replace(/\.\./g, '');
      if (!sanitizedFilename) {
        console.log('Invalid filename provided');
        chatLoop();
        return;
      }

      // Ensure .json extension
      const jsonFilename = sanitizedFilename.endsWith('.json') ? sanitizedFilename : `${sanitizedFilename}.json`;
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const filePath = join(__dirname, '..', 'history', jsonFilename);

      try {
        if (!existsSync(filePath)) {
          console.log(`File '${jsonFilename}' not found in history directory`);
          chatLoop();
          return;
        }

        const data = readFileSync(filePath, 'utf8');
        const loadedHistory = JSON.parse(data);

        // Validate that loaded data is an array of message objects
        if (!Array.isArray(loadedHistory)) {
          console.log(`Invalid history file format: expected array of messages`);
          chatLoop();
          return;
        }

        agent.history = loadedHistory;
        agent.historyFile = filePath; // Update history file path to the loaded file
        console.log(`Loaded conversation from '${jsonFilename}' (${agent.history.length} messages)`);
      } catch (error) {
        console.error(`Could not load conversation: ${error.message}`);
      }
      chatLoop();
      return;
    }

    // /context command - shows current conversation history length and estimated token usage
    if (input.toLowerCase() === '/context') {
      const messageCount = agent.history.length;
      const estimatedTokens = agent.estimateTokenCount();
      const contextWindow = agent.getContextWindow();
      const usagePercentage = Math.min(100, Math.round((estimatedTokens / contextWindow) * 100));

      console.log(`Conversation history: ${messageCount} messages`);
      console.log(`Estimated tokens used: ${estimatedTokens}/${contextWindow} (${usagePercentage}%)`);

      if (usagePercentage > 90) {
        console.log('Warning: Approaching context window limit!');
      } else if (usagePercentage > 75) {
        console.log('Notice: Using significant portion of context window');
      }

      chatLoop();
      return;
    }

    agent.chat(input)
      .then(response => {
        console.log(`Agent: ${response}\n`);
        chatLoop();
      })
      .catch(error => {
        console.error('Error:', error.message);
        chatLoop();
      });
  });
};

// Handle Ctrl+C (SIGINT) to exit gracefully
process.on('SIGINT', () => {
  console.log('\nExiting...');
  rl.close();
});

chatLoop();