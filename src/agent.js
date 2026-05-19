import { OpenRouter } from '@openrouter/sdk';
import dotenv from 'dotenv';
import { existsSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

dotenv.config();

export class ChatAgent {
  constructor() {
    this.agent = new OpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    });
    this.history = [];
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    this.historyFile = join(__dirname, '..', 'history', 'default-history.json');
    this.loadHistory();
  }

  async chat(message) {
    this.history.push({ role: 'user', content: message });
    try {
      const response = await this.agent.chat.send({
        chatRequest: {
          messages: this.history,
          model: 'nvidia/nemotron-3-super-120b-a12b:free',
          temperature: 0.7,
          max_tokens: 10000
        }
      });
      const assistantMessage = response.choices[0].message.content;
      this.history.push({ role: 'assistant', content: assistantMessage });
      this.saveHistory();
      return assistantMessage;
    } catch (error) {
      console.error('Error in chat:', error);
      throw error;
    }
  }

  clearHistory() {
    this.history = [];
    this.saveHistory();
  }

  loadHistory() {
    if (existsSync(this.historyFile)) {
      try {
        const data = readFileSync(this.historyFile, 'utf8');
        this.history = JSON.parse(data);
        console.log(`Loaded ${this.history.length} messages from history`);
      } catch (error) {
        console.warn('Could not load chat history:', error.message);
        this.history = [];
      }
    } else {
      console.log('No history file found, starting with empty history');
    }
  }

  saveHistory() {
    try {
      writeFileSync(this.historyFile, JSON.stringify(this.history, null, 2));
      console.log(`Saved ${this.history.length} messages to history`);
    } catch (error) {
      console.warn('Could not save chat history:', error.message);
    }
  }
}