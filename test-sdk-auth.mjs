import { query } from '@anthropic-ai/claude-agent-sdk';

async function test() {
  console.log('--- Testing SDK Auth ---');
  console.log('Current PATH:', process.env.PATH?.substring(0, 150) + '...');
  
  try {
    const q = query({
      prompt: "Hello, just a quick test.",
      options: {
        systemPrompt: "You are a helpful assistant.",
        allowedTools: ['Read'],
        permissionMode: 'acceptEdits'
      }
    });

    for await (const msg of q) {
      if (msg.type === 'assistant') {
        let contentText = '';
        if (msg.text) contentText += msg.text;
        if (msg.content) {
             contentText += typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
        }
        console.log('Claude says:', contentText.substring(0, 50));
        break; // Just need to know if it starts
      }
    }
    console.log('--- Test Success ---');
  } catch (err) {
    console.error('--- Test Failed ---');
    console.error(err);
  }
}

test();
