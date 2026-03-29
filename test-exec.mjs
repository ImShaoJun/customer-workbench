import { execSync } from 'child_process';
import os from 'os';

console.log('--- Environment Info ---');
console.log('Platform:', os.platform());
console.log('HOME:', process.env.HOME);
console.log('USERPROFILE:', process.env.USERPROFILE);
console.log('APPDATA:', process.env.APPDATA);

try {
    console.log('\n--- Where is claude? ---');
    const whereCmd = os.platform() === 'win32' ? 'where claude' : 'which claude';
    const whereOut = execSync(whereCmd, { encoding: 'utf8', env: process.env });
    console.log(whereOut.trim());
} catch (e) {
    console.log('Could not find claude in PATH via where/which.');
}

try {
    console.log('\n--- Testing Claude Version ---');
    const versionOut = execSync('claude --version', { encoding: 'utf8', env: process.env });
    console.log(versionOut.trim());
} catch (e) {
    console.log('Failed to execute claude --version.');
}
