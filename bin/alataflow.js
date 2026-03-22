#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const PLUGIN_ROOT = join(dirname(__filename), '..');

const command = process.argv[2];

switch (command) {
  case 'setup': setup(); break;
  case 'verify': verify(); break;
  case 'path': console.log(PLUGIN_ROOT); break;
  default: help(); break;
}

function setup() {
  const isProject = process.argv.includes('--project');
  const settingsPath = isProject
    ? join(process.cwd(), '.claude', 'settings.json')
    : join(homedir(), '.claude', 'settings.json');

  let settings = {};
  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
    } catch {
      console.error('Failed to parse ' + settingsPath);
      process.exit(1);
    }
  } else {
    mkdirSync(dirname(settingsPath), { recursive: true });
  }

  if (!settings.plugins) settings.plugins = [];

  const already = settings.plugins.includes(PLUGIN_ROOT);
  if (already) {
    console.log('AlataFlow is already configured.');
    console.log('  Plugin path: ' + PLUGIN_ROOT);
    console.log('  Settings:    ' + settingsPath);
    return;
  }

  settings.plugins.push(PLUGIN_ROOT);
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');

  const scope = isProject ? 'project' : 'global';
  console.log('[ok] Added AlataFlow to ' + scope + ' Claude Code settings.');
  console.log('  Plugin path: ' + PLUGIN_ROOT);
  console.log('  Settings:    ' + settingsPath);
  console.log('');
  console.log('Restart Claude Code to activate.');
}

function verify() {
  console.log('Running AlataFlow runtime tests...');
  console.log('Plugin root: ' + PLUGIN_ROOT);
  console.log('');
  try {
    execSync('node --test runtime/*.test.js', {
      stdio: 'inherit',
      cwd: PLUGIN_ROOT,
      shell: true,
    });
    console.log('');
    console.log('[ok] All tests passed.');
  } catch {
    console.log('');
    console.error('[fail] Some tests failed. See output above.');
    process.exit(1);
  }
}

function help() {
  console.log('AlataFlow - Structured AI workflow plugin for Claude Code');
  console.log('');
  console.log('Usage: alataflow <command>');
  console.log('');
  console.log('Commands:');
  console.log('  setup            Add AlataFlow to global Claude Code settings');
  console.log('  setup --project  Add AlataFlow to current project settings');
  console.log('  verify           Run runtime tests to verify installation');
  console.log('  path             Print the plugin directory path');
  console.log('');
  console.log('Quick start:');
  console.log('  npm i -g alataflow');
  console.log('  alataflow setup');
  console.log('  # restart Claude Code');
}
