import { OpenRouter } from '@openrouter/sdk';
import dotenv from 'dotenv';

dotenv.config();

export class ChatAgent {
  constructor() {
    this.agent = new OpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    });
    this.history = [];
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
      return assistantMessage;
    } catch (error) {
      console.error('Error in chat:', error);
      throw error;
    }
  }

  clearHistory() {
    this.history = [];
  }
}