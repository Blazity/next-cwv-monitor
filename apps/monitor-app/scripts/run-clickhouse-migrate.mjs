#!/usr/bin/env node
import { spawn } from 'node:child_process';

const {
  CH_MIGRATIONS_HOST,
  CH_MIGRATIONS_PORT,
  CH_MIGRATIONS_DATABASE = 'cwv_monitor',
  CH_MIGRATIONS_USER = 'default',
  CH_MIGRATIONS_PASSWORD = ''
} = process.env;

const rawHost = CH_MIGRATIONS_HOST ?? process.env.CLICKHOUSE_HOST ?? 'localhost';
const port = CH_MIGRATIONS_PORT ?? process.env.CLICKHOUSE_PORT ?? '8123';
const hostHasProtocol = /^https?:\/\//.test(rawHost);
const resolvedHost = hostHasProtocol ? rawHost : `http://${rawHost}:${port}`;

const CH_MIGRATIONS_HOME = process.env.CH_MIGRATIONS_HOME ?? process.env.CH_MIGRATIONS_DIR ?? 'clickhouse/migrations';

const extraArgs = process.argv.slice(2);

const args = [
  'migrate',
  '--host',
  resolvedHost,
  '--db',
  CH_MIGRATIONS_DATABASE,
  '--user',
  CH_MIGRATIONS_USER,
  '--password',
  CH_MIGRATIONS_PASSWORD,
  '--migrations-home',
  CH_MIGRATIONS_HOME,
  ...extraArgs
];

const child = spawn('clickhouse-migrations', args, {
  stdio: 'inherit',
  env: process.env
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
