import { exec } from 'child_process';

exec('npx.cmd -y @anthropic-ai/claude-code@latest -p "今天周几啊"', {
  cwd: process.cwd(),
  env: { ...process.env }
}, (error, stdout, stderr) => {
  if (error) {
    console.error('EXEC ERROR:', error);
  }
  console.log('STDOUT:', stdout);
  console.log('STDERR:', stderr);
});
