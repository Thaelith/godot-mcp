#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schemaModulePath = path.join(repoRoot, 'build', 'tools', 'schemas.js');
const outputPath = path.join(repoRoot, 'docs', 'tools.md');

const { TOOL_SCHEMAS } = await import(pathToFileURL(schemaModulePath).href);

if (!Array.isArray(TOOL_SCHEMAS)) {
  throw new Error('build/tools/schemas.js did not export TOOL_SCHEMAS as an array');
}

function oneLine(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function tableSafe(value) {
  return oneLine(value).replace(/\|/g, '\\|');
}

function schemaType(schema) {
  if (!schema || typeof schema !== 'object') {
    return '';
  }
  if (Array.isArray(schema.type)) {
    return schema.type.join(' | ');
  }
  if (schema.type === 'array') {
    return schema.items ? `array<${schemaType(schema.items) || 'unknown'}>` : 'array';
  }
  if (schema.type) {
    return schema.type;
  }
  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return typeof schema.enum[0];
  }
  if (Array.isArray(schema.anyOf)) {
    return schema.anyOf.map(schemaType).filter(Boolean).join(' | ');
  }
  if (Array.isArray(schema.oneOf)) {
    return schema.oneOf.map(schemaType).filter(Boolean).join(' | ');
  }
  return '';
}

function enumText(schema) {
  if (!Array.isArray(schema?.enum) || schema.enum.length === 0) {
    return '';
  }
  return schema.enum.map((value) => String(value)).join(', ');
}

function placeholderForProperty(name, schema) {
  if (name === 'projectPath') return '/path/to/godot-project';
  if (name === 'scenePath') return 'res://scenes/Main.tscn';
  if (name === 'assetPath') return 'res://assets/example.png';
  if (name === 'checkpointPath') return 'res://.godot_mcp/checkpoints/example/checkpoint.tscn';
  if (name === 'previewRoot') return 'res://.godot_mcp/previews';
  if (name === 'outputDir') return 'res://.godot_mcp/previews';
  if (name === 'sourcePath') return 'res://scenes/Main.tscn';
  if (name === 'intent') return {};
  if (name === 'steps') return [];
  if (name === 'updates') return [];
  if (name === 'operations') return [];
  if (name === 'properties') return {};
  if (name === 'placement') return {};

  const type = schemaType(schema);
  if (type.startsWith('array')) return [];
  if (type === 'object') return {};
  if (type === 'number' || type === 'integer') return 0;
  if (type === 'boolean') return false;
  return 'example';
}

function exampleForTool(tool) {
  const inputSchema = tool.inputSchema && typeof tool.inputSchema === 'object' ? tool.inputSchema : {};
  const properties = inputSchema.properties && typeof inputSchema.properties === 'object' ? inputSchema.properties : {};
  const required = Array.isArray(inputSchema.required) ? inputSchema.required : [];
  const example = {};

  for (const property of required) {
    example[property] = placeholderForProperty(property, properties[property] || {});
  }

  return example;
}

function renderTool(tool) {
  const inputSchema = tool.inputSchema && typeof tool.inputSchema === 'object' ? tool.inputSchema : {};
  const properties = inputSchema.properties && typeof inputSchema.properties === 'object' ? inputSchema.properties : {};
  const required = new Set(Array.isArray(inputSchema.required) ? inputSchema.required : []);
  const propertyNames = Object.keys(properties);
  const lines = [];

  lines.push(`## ${tool.name || 'unnamed_tool'}`);
  lines.push('');
  lines.push(oneLine(tool.description) || 'No description provided.');
  lines.push('');
  lines.push('Required:');
  if (required.size === 0) {
    lines.push('- None');
  } else {
    for (const property of required) {
      lines.push(`- ${property}`);
    }
  }
  lines.push('');
  lines.push('| Property | Type | Required | Enum | Description |');
  lines.push('|---|---|---:|---|---|');
  for (const property of propertyNames) {
    const schema = properties[property] || {};
    lines.push(
      `| ${property} | ${tableSafe(schemaType(schema))} | ${required.has(property) ? 'yes' : 'no'} | ${tableSafe(enumText(schema))} | ${tableSafe(schema.description)} |`
    );
  }
  lines.push('');
  lines.push('Example JSON:');
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify(exampleForTool(tool), null, 2));
  lines.push('```');
  lines.push('');

  return lines.join('\n');
}

const output = [
  '# MCP Tool Reference',
  '',
  'This file is generated from src/tools/schemas.ts. Do not edit manually.',
  '',
  `Total tools: ${TOOL_SCHEMAS.length}`,
  '',
  ...TOOL_SCHEMAS.map(renderTool),
].join('\n');

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${output.trimEnd()}\n`, 'utf8');
console.log(`Generated docs/tools.md for ${TOOL_SCHEMAS.length} tools.`);
