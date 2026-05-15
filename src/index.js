import { ChatAgent } from './agent.js';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const agent = new ChatAgent();

console.log('Simple Chat Agent (type "exit" to quit, "clear" to reset)');
console.log('--------------------------------------------------');

const chatLoop = () => {
  rl.question('You: ', (input) => {
    if (input.toLowerCase() === 'exit') {
      rl.close();
      return;
    }

    if (input.toLowerCase() === 'clear') {
      agent.clearHistory();
      console.log('Conversation history cleared.');
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