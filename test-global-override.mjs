import { query } from '@anthropic-ai/claude-agent-sdk';
import { spawn } from 'child_process';

export async function runTest() {
  console.log('Testing spawning global claude.cmd directly...');
  const q1 = query({ 
    prompt: "What is 1+1? Reply with just the number.", 
    options: { 
      allowedTools: [], 
      effort: 'low',
      spawnClaudeCodeProcess: (options) => {
        const args = options.args.slice(1); // remove cli.js
        console.log('Spawning:', 'claude.cmd', args.join(' '));
        return spawn('claude.cmd', args, {
          cwd: options.cwd,
          env: { ...process.env, ...options.env },
          signal: options.signal,
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: true
        });
      }
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
