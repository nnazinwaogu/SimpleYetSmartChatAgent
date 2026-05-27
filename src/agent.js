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
    this.model = 'nvidia/nemotron-3-super-120b-a12b:free';
    //Legacy history file startup injection, Agent should now start with empty history (which automatically saves) and only load when user explicitly uses /load command
    /*const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    this.historyFile = join(__dirname, '..', 'history', 'default-history.json');
    this.loadHistory();*/
  }

  /**
   * Estimate token count for the conversation history
   * Uses rough approximation: ~4 characters per token for English text
   * @returns {number} Estimated token count
   */
  estimateTokenCount() {
    let totalChars = 0;
    for (const message of this.history) {
      totalChars += message.content.length;
      // Add overhead for role formatting (approximately 10 chars per message)
      totalChars += 10;
    }
    // Rough estimate: 4 characters per token
    return Math.ceil(totalChars / 4);
  }

  /**
   * Get the context window size for the current model
   * @returns {number} Context window size in tokens
   */
  getContextWindow() {
    // Context window sizes for supported models
    const modelContextWindows = {
      'nvidia/nemotron-3-super-120b-a12b:free': 1000000,
      // Add other models as needed
    };
    return modelContextWindows[this.model] || 8192; // Default to 8192 if model not found
  }

  async chat(message) {
    this.history.push({ role: 'user', content: message });
    try {
      const response = await this.agent.chat.send({
        chatRequest: {
          messages: this.history,
          model: 'nvidia/nemotron-3-super-120b-a12b:free',
          temperature: 0.7,
          max_tokens: 5000
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

  clearLastMessage() {
    this.history.pop();
    this.saveHistory();
  }

  clearAllHistory() {
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
      // If we can't save to the default location, try a fallback in the history directory
      try {
        const fallbackFileName = `session-${Date.now()}.json`;
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        const fallbackPath = join(__dirname, '..', 'history', fallbackFileName);
        writeFileSync(fallbackPath, JSON.stringify(this.history, null, 2));
        // Update historyFile to use the fallback for future saves
        this.historyFile = fallbackPath;
        console.log(`Saved ${this.history.length} messages to fallback history: ${fallbackFileName}`);
      } catch (fallbackError) {
        console.warn('Could not save chat history to either primary or fallback location:', error.message);
      }
    }
  }
}