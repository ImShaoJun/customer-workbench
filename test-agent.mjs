import { query } from '@anthropic-ai/claude-agent-sdk';

export async function runTest() {
  console.log('Testing string prompt...');
  const q1 = query({ 
    prompt: "Hello Claude, what is 2+2?", 
    options: { 
      allowedTools: [], 
      effort: 'low',
      env: process.env
    } 
  });
  for await (const msg of q1) {
    console.log(msg.type);
    if (msg.type === 'assistant' || msg.type === 'partial_assistant') {
      console.log(msg.content || msg.text || msg.delta?.text);
    }
  }

  console.log('\nTesting async generator prompt...');
  async function* promptGen() {
    yield {
      role: 'user',
      content: [{ type: 'text', text: "What is 3+3?" }]
    };
  }
  const q2 = query({ prompt: promptGen(), options: { effort: 'low' } });
  for await (const msg of q2) {
    console.log(msg.type);
  }
  console.log('Done test.');
}

runTest().catch(console.error);
