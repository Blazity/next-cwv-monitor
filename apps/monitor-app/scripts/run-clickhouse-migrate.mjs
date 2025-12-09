#!/usr/bin/env node
import { spawn } from 'node:child_process';

const {
  CH_MIGRATIONS_HOST = 'localhost',
  CH_MIGRATIONS_PORT = '8123',
  CH_MIGRATIONS_DATABASE = 'cwv_monitor',
  CH_MIGRATIONS_USER = 'default',
  CH_MIGRATIONS_PASSWORD = '',
  CH_MIGRATIONS_DIR = 'clickhouse/migrations'
} = process.env;

const extraArgs = process.argv.slice(2);

const args = [
  'migrate',
  '--host',
  CH_MIGRATIONS_HOST,
  '--port',
  CH_MIGRATIONS_PORT,
  '--db',
  CH_MIGRATIONS_DATABASE,
  '--user',
  CH_MIGRATIONS_USER,
  '--password',
  CH_MIGRATIONS_PASSWORD,
  '--dir',
  CH_MIGRATIONS_DIR,
  ...extraArgs
];

const child = spawn('clickhouse-migrations', args, {
  stdio: 'inherit',
  env: process.env
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
