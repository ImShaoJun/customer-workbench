import { query } from '@anthropic-ai/claude-agent-sdk';
import { spawn } from 'child_process';

export async function runTest() {
  console.log('Testing spawning npx claude-code directly...');
  const q1 = query({ 
    prompt: "Hello", 
    options: { 
      allowedTools: [], 
      effort: 'low',
      spawnClaudeCodeProcess: (options) => {
        // options.command is originally 'node'
        // options.args are like ['cli.js', '--output-format', ...]
        const originalArgs = options.args.slice(1); // Strip 'cli.js'
        const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
        const finalArgs = ['-y', '@anthropic-ai/claude-code@latest', ...originalArgs];
        
        console.log('Spawning:', command, finalArgs.join(' '));
        return spawn(command, finalArgs, {
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
