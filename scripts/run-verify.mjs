#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const mode = process.argv[2];
const allowedModes = new Set(['none', 'required']);

if (!allowedModes.has(mode)) {
  console.error('Usage: node scripts/run-verify.mjs <none|required>');
  process.exit(1);
}

const steps = [
  {
    label: 'Build',
    args: ['run', 'build'],
  },
  {
    label: 'Check generated tool docs',
    args: ['run', 'check:docs'],
  },
  {
    label: 'Check workflow docs',
    args: ['run', 'check:workflows'],
  },
  {
    label: 'Check package contents',
    args: ['run', 'check:package'],
  },
  {
    label: 'Smoke tests',
    args: ['run', 'smoke'],
    env: {
      SMOKE_GODOT_MODE: mode,
    },
  },
];

for (const step of steps) {
  console.log(`\n== ${step.label} ==`);
  const command = process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : 'npm';
  const args = process.platform === 'win32'
    ? ['/d', '/s', '/c', `npm ${step.args.join(' ')}`]
    : step.args;
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: {
      ...process.env,
      ...(step.env || {}),
    },
  });

  if (result.error) {
    console.error(`Failed to run ${step.label}: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`${step.label} failed with exit code ${result.status}.`);
    process.exit(result.status || 1);
  }
}

console.log(`\nVerification completed successfully with SMOKE_GODOT_MODE=${mode}.`);
