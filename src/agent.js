import { OpenRouter } from '@openrouter/sdk';
import dotenv from 'dotenv';
import { existsSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import axios from 'axios';
import { convert } from 'html-to-text';

dotenv.config();

export class ChatAgent {
  static TOOLS = [
    {
      type: 'function',
      function: {
        name: 'web_search',
        description: 'Search the web using DuckDuckGo. Returns summaries and relevant links for a given query.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query string'
            }
          },
          required: ['query']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'web_fetch',
        description: 'Fetch and read the content of a web page or article from a URL. Returns the text content of the page.',
        parameters: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'The URL of the web page to fetch'
            }
          },
          required: ['url']
        }
      }
    }
  ];

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
   * Search the web using DuckDuckGo Instant Answer API
   * @param {string} query - The search query
   * @returns {Promise<string>} Search results as formatted text
   */
  async webSearch(query) {
    try {
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
      const response = await axios.get(url, { timeout: 10000 });
      const data = response.data;
      const results = [];

      // Extract AbstractText
      if (data.AbstractText) {
        results.push(`Abstract: ${data.AbstractText}`);
      }

      // Extract Answer
      if (data.Answer) {
        results.push(`Answer: ${data.Answer}`);
      }

      // Extract RelatedTopics (top 5)
      if (data.RelatedTopics && data.RelatedTopics.length > 0) {
        const topics = data.RelatedTopics.slice(0, 5).map(t => {
          // Topics can be nested (has sub-items with `Topics` array) or flat
          if (t.Topics) {
            return t.Topics.slice(0, 3).map(sub => sub.Text).join('\n');
          }
          return t.Text;
        }).filter(Boolean).join('\n');
        if (topics) {
          results.push(`Related topics:\n${topics}`);
        }
      }

      // Extract the source URL
      if (data.AbstractURL) {
        results.push(`Source: ${data.AbstractURL}`);
      } else if (data.Results && data.Results.length > 0) {
        const firstResultUrl = data.Results[0].FirstURL;
        if (firstResultUrl) {
          results.push(`Source: ${firstResultUrl}`);
        }
      }

      const resultText = results.join('\n\n');
      return resultText || `No results found for "${query}".`;
    } catch (error) {
      return `Error searching for "${query}": ${error.message}`;
    }
  }

  /**
   * Fetch and extract text content from a URL
   * @param {string} targetUrl - The URL to fetch
   * @returns {Promise<string>} Extracted text content
   */
  async webFetch(targetUrl) {
    try {
      // Validate URL to prevent SSRF / internal network access
      let parsedUrl;
      try {
        parsedUrl = new URL(targetUrl);
      } catch {
        return `Error: Invalid URL format: "${targetUrl}"`;
      }

      const hostname = parsedUrl.hostname.toLowerCase();

      // Block private/reserved IP ranges
      if (hostname === 'localhost' ||
          hostname === '127.0.0.1' ||
          hostname === '0.0.0.0' ||
          hostname.startsWith('10.') ||
          hostname.startsWith('172.16.') ||
          hostname.startsWith('192.168.') ||
          hostname.endsWith('.local') ||
          hostname.endsWith('.internal')) {
        return `Error: Cannot fetch from internal or private network address: ${hostname}`;
      }

      const response = await axios.get(targetUrl, {
        timeout: 15000,
        responseType: 'text',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml'
        }
      });

      const html = response.data;
      const text = convert(html, {
        wordwrap: 120,
        selectors: [
          { selector: 'script', format: 'skip' },
          { selector: 'style', format: 'skip' },
          { selector: 'nav', format: 'skip' },
          { selector: 'footer', format: 'skip' },
          { selector: 'header', format: 'skip' }
        ]
      });

      // Truncate to approximately 3000 characters
      const maxLength = 3000;
      const truncated = text.length > maxLength
        ? text.substring(0, maxLength) + '\n\n[Content truncated...]'
        : text;

      return truncated || `No readable content found at ${targetUrl}.`;
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        return `Error: Request timed out while fetching ${targetUrl}`;
      } else if (error.response) {
        return `Error fetching ${targetUrl}: HTTP ${error.response.status} ${error.response.statusText}`;
      }
      return `Error fetching ${targetUrl}: ${error.message}`;
    }
  }

  /**
   * Estimate token count for the messages in the conversation history, excluding system prompt and persona
   * Uses rough approximation: ~4 characters per token for English text
   * @returns {number} Estimated token count
   */
  estimateMessageTokenCount() {
    let totalChars = 0;
    for (const message of this.history) {
      // For tool-call messages, content may be null; count toolCalls JSON length
      if (message.content) {
        totalChars += message.content.length;
      }
      if (message.toolCalls) {
        totalChars += JSON.stringify(message.toolCalls).length;
      }
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

    const MAX_TOOL_ITERATIONS = 10;
    let iterationCount = 0;

    try {
      while (iterationCount < MAX_TOOL_ITERATIONS) {
        iterationCount++;

        // Prepare messages array: system prompt + persona + history
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
            max_tokens: this.maxTokens,
            tools: ChatAgent.TOOLS,
            parallelToolCalls: true
          }
        });

        const choice = response.choices[0];
        const assistantMessage = choice.message;

        // Check if the model wants to make tool calls
        if (assistantMessage.toolCalls && assistantMessage.toolCalls.length > 0) {
          // Add assistant message with toolCalls to history
          this.history.push({
            role: 'assistant',
            content: null,
            toolCalls: assistantMessage.toolCalls
          });

          // Execute all tool calls in parallel
          const toolResults = await Promise.all(
            assistantMessage.toolCalls.map(async (toolCall) => {
              const { name, arguments: argsString } = toolCall.function;
              let args;
              try {
                args = JSON.parse(argsString);
              } catch (parseError) {
                return {
                  role: 'tool',
                  toolCallId: toolCall.id,
                  content: `Error: Invalid JSON arguments for tool "${name}": ${argsString}`
                };
              }

              let result;
              try {
                switch (name) {
                  case 'web_search':
                    result = await this.webSearch(args.query);
                    break;
                  case 'web_fetch':
                    result = await this.webFetch(args.url);
                    break;
                  default:
                    result = `Error: Unknown tool "${name}"`;
                }
              } catch (toolError) {
                result = `Error executing tool "${name}": ${toolError.message}`;
              }

              return {
                role: 'tool',
                toolCallId: toolCall.id,
                content: result
              };
            })
          );

          // Add all tool results to history
          this.history.push(...toolResults);

          // Continue the loop to send tool results back to the model
        } else {
          // No tool calls — this is a final text response
          const content = assistantMessage.content || '';
          this.history.push({ role: 'assistant', content });
          this.saveHistory();
          return content;
        }
      }

      // If we hit the iteration limit, return a fallback message
      const fallbackMessage = `I've reached the maximum number of tool use iterations (${MAX_TOOL_ITERATIONS}). Please try simplifying your request or ask a more specific question.`;
      this.history.push({ role: 'assistant', content: fallbackMessage });
      this.saveHistory();
      return fallbackMessage;

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