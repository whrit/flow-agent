import chalk from 'chalk';
import path from 'path';
import os from 'os';
import { readFile, writeFile } from 'fs/promises';
import { mkdirAsync } from '../../node-compat.js';

const FLOW_AGENT_MCP_JSON_CONFIG = {
  command: 'npx',
  args: ['flow-agent@alpha', 'mcp', 'start', '--transport', 'stdio'],
  type: 'stdio',
  restartOnExit: true,
};

const FLOW_AGENT_MCP_TOML_BLOCK = `[mcp_servers.flow-agent]
command = "npx"
args = ["flow-agent@alpha", "mcp", "start", "--transport", "stdio"]
type = "stdio"
restart_on_exit = true`;

export function isAutoMcpEnabled(flags = {}) {
  if (!flags || !Object.prototype.hasOwnProperty.call(flags, 'auto-mcp')) {
    return true;
  }

  const rawValue = flags['auto-mcp'];
  if (typeof rawValue === 'string') {
    return !['false', '0', 'no', 'off'].includes(rawValue.toLowerCase());
  }

  return Boolean(rawValue);
}

export async function ensureMcpServerReady({ provider, flags = {}, verbose = false }) {
  if (!isAutoMcpEnabled(flags)) {
    if (verbose) {
      console.log(chalk.gray('Skipping MCP auto-setup (--auto-mcp=false)'));
    }
    return { skipped: true };
  }

  try {
    if (provider === 'codex') {
      const configDir = path.join(os.homedir(), '.codex');
      const configPath = path.join(configDir, 'config.toml');
      await mkdirAsync(configDir, { recursive: true });

      let configText = '';
      try {
        configText = await readFile(configPath, 'utf8');
      } catch {
        configText = '';
      }

      let migratedText = configText;
      let mutated = false;

      if (migratedText.includes('mcp_servers.claude-flow')) {
        migratedText = migratedText.replace(/mcp_servers\.claude-flow/g, 'mcp_servers.flow-agent');
        mutated = true;
      }

      if (migratedText.includes('claude-flow@alpha')) {
        migratedText = migratedText.replace(/claude-flow@alpha/g, 'flow-agent@alpha');
        mutated = true;
      }

      if (mutated) {
        await writeFile(configPath, migratedText, 'utf8');
        configText = migratedText;
        console.log(chalk.cyan('🔁 Updated Codex config to use flow-agent MCP server entries'));
      }

      if (configText.includes('[mcp_servers.flow-agent]')) {
        if (verbose) {
          console.log(chalk.gray('Flow-Agent MCP server already configured for Codex CLI'));
        }
        return { ensured: true, configPath };
      }

      const sanitized = configText.trimEnd();
      const nextContent = sanitized ? `${sanitized}\n\n${FLOW_AGENT_MCP_TOML_BLOCK}\n` : `${FLOW_AGENT_MCP_TOML_BLOCK}\n`;
      await writeFile(configPath, nextContent, 'utf8');
      console.log(chalk.cyan(`⚙️  Added Flow-Agent MCP server entry to ${configPath}`));
      return { ensured: true, configPath };
    }

    const claudeConfigDir = path.join(os.homedir(), '.config', 'claude');
    const claudeConfigPath = path.join(claudeConfigDir, 'config.json');
    await mkdirAsync(claudeConfigDir, { recursive: true });

    let jsonConfig = {};
    try {
      const content = await readFile(claudeConfigPath, 'utf8');
      jsonConfig = JSON.parse(content || '{}');
    } catch {
      jsonConfig = {};
    }

    if (!jsonConfig.mcpServers) {
      jsonConfig.mcpServers = {};
    }

    let updated = false;

    if (jsonConfig.mcpServers['claude-flow'] && !jsonConfig.mcpServers['flow-agent']) {
      jsonConfig.mcpServers['flow-agent'] = jsonConfig.mcpServers['claude-flow'];
      delete jsonConfig.mcpServers['claude-flow'];
      updated = true;
    }

    if (!jsonConfig.mcpServers['flow-agent']) {
      jsonConfig.mcpServers['flow-agent'] = { ...FLOW_AGENT_MCP_JSON_CONFIG };
      updated = true;
    }

    if (updated) {
      await writeFile(claudeConfigPath, JSON.stringify(jsonConfig, null, 2));
      console.log(chalk.cyan(`⚙️  Updated Claude config at ${claudeConfigPath} with Flow-Agent MCP server`));
    } else if (verbose) {
      console.log(chalk.gray('Flow-Agent MCP server already configured for Claude Code'));
    }

    return { ensured: true, configPath: claudeConfigPath };
  } catch (error) {
    throw new Error(`Failed to ensure MCP server configuration (${provider}): ${error.message}`);
  }
}
