import { ChatAgent } from './agent.js';
import readline from 'readline';
import { existsSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const agent = new ChatAgent();

console.log('Simple Chat Agent ("/clear" to reset history, "/save <filename>" to save, "/load <filename>" to load, "/exit" to quit)');
console.log('--------------------------------------------------');

const chatLoop = () => {
  rl.question('You: ', (input) => {
    if (input.toLowerCase() === '/exit') {
      rl.close();
      return;
    }

    if (input.toLowerCase() === '/clear') {
      agent.clearHistory();
      console.log('Conversation history cleared.');
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
        console.log(`Loaded conversation from '${jsonFilename}' (${agent.history.length} messages)`);
      } catch (error) {
        console.error(`Could not load conversation: ${error.message}`);
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