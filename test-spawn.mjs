import { query } from '@anthropic-ai/claude-agent-sdk';

export async function runTest() {
  console.log('Testing HOME set to USERPROFILE...');
  const q1 = query({ 
    prompt: "Hello", 
    options: { 
      allowedTools: [], 
      effort: 'low',
      env: { ...process.env, HOME: process.env.USERPROFILE }
    } 
  });
  
  try {
    for await (const msg of q1) {
        if (msg.type === 'assistant') {
          console.log('[Claude]', msg.text || msg.content);
        }
    }
    console.log('Test completed successfully!');
  } catch(e) {
    console.error('Test Failed:', e);
  }
}

runTest();
