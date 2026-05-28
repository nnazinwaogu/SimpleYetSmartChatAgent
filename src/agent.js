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
    // Load system prompt from environment
    this.systemPrompt = process.env.SYSTEM_PROMPT || '';
    this.persona = process.env.PERSONA || '';
    this.temperature = 0.7;
    this.maxTokens = 5000;
    //Legacy history file startup injection, Agent should now start with empty history (which automatically saves) and only load when user explicitly uses /load command
    /*const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    this.historyFile = join(__dirname, '..', 'history', 'default-history.json');
    this.loadHistory();*/
  }

  /**
   * Estimate token count for the messages in the conversation history, excluding system prompt and persona 
   * Uses rough approximation: ~4 characters per token for English text
   * @returns {number} Estimated token count
   */
  estimateMessageTokenCount() {
    let totalChars = 0;
    for (const message of this.history) {
      totalChars += message.content.length;
      // Add overhead for role formatting (approximately 10 chars per message)
      totalChars += 10;
    }
    return Math.ceil(totalChars / 4);
  }

  /**
   * Estimate token count for system prompt
   * @returns {number} Estimated token count for system prompt
   */
  estimateSystemPromptTokenCount() {
    if (!this.systemPrompt) return 0;
    // Same rough approximation as estimateTokenCount
    return Math.ceil((this.systemPrompt.length + 10) / 4);
  }

  /**
   * Estimate token count for persona
   * @returns {number} Estimated token count for persona
   */
  estimatePersonaTokenCount() {
    if (!this.persona) return 0;
    // Same rough approximation as estimateTokenCount
    return Math.ceil((this.persona.length + 10) / 4);
  }

  /**
   * Estimate the total token count for the conversation history
   * Uses rough approximation: ~4 characters per token for English text
   * @returns {number} Estimated token count
   */
  estimateTotalTokenCount() {
    return this.estimateMessageTokenCount() + this.estimateSystemPromptTokenCount() + this.estimatePersonaTokenCount();
  }

  /**
   * Get the context window size for the current model
   * @returns {number} Context window size in tokens
   */
  getContextWindow() {
    // Context window sizes for supported models
    const modelContextWindows = {
      'nvidia/nemotron-3-super-120b-a12b:free': 262144,
      // Add other models as needed
    };
    return modelContextWindows[this.model] || 8192; // Default to 8192 if model not found
  }

  async chat(message) {
    this.history.push({ role: 'user', content: message });
    try {
      // Prepare messages array: system prompt (if set) + history
      const messagesForAPI = [];
      if (this.systemPrompt && this.persona) {
        const combinedPrompt = `${this.systemPrompt}\n\n${this.persona}`;
        messagesForAPI.push({ role: 'system', content: combinedPrompt });
      }
      messagesForAPI.push(...this.history);

      const response = await this.agent.chat.send({
        chatRequest: {
          messages: messagesForAPI,
          model: this.model,
          temperature: this.temperature,
          max_tokens: this.maxTokens
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