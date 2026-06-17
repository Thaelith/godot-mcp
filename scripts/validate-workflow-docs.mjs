#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schemaModulePath = path.join(repoRoot, 'build', 'tools', 'schemas.js');
const workflowDocsPath = path.join(repoRoot, 'docs', 'workflows.md');

if (!existsSync(schemaModulePath)) {
  throw new Error('Missing build/tools/schemas.js. Run npm run build before validating workflow docs.');
}

if (!existsSync(workflowDocsPath)) {
  throw new Error('Missing docs/workflows.md.');
}

const { TOOL_SCHEMAS } = await import(pathToFileURL(schemaModulePath).href);

if (!Array.isArray(TOOL_SCHEMAS)) {
  throw new Error('build/tools/schemas.js did not export TOOL_SCHEMAS as an array');
}

const toolSchemas = new Map(TOOL_SCHEMAS.map((tool) => [tool.name, tool]));
const workflowMarkdown = readFileSync(workflowDocsPath, 'utf8');
const jsonBlocks = extractJsonBlocks(workflowMarkdown);
const failures = [];
const warnings = [];
let validatedExamples = 0;

for (const block of jsonBlocks) {
  let parsed;
  try {
    parsed = JSON.parse(block.source);
  } catch (error) {
    failures.push(formatFailure(block.index, null, `JSON parse failed: ${error.message}`));
    continue;
  }

  if (!looksLikeToolsCall(parsed)) {
    continue;
  }

  const toolName = parsed.params?.name;
  if (parsed.method !== 'tools/call') {
    failures.push(formatFailure(block.index, toolName, 'MCP example method must be "tools/call".'));
    continue;
  }
  if (!isPlainObject(parsed.params)) {
    failures.push(formatFailure(block.index, toolName, 'params must be an object.'));
    continue;
  }
  if (typeof parsed.params.name !== 'string') {
    failures.push(formatFailure(block.index, toolName, 'params.name must be a string.'));
    continue;
  }
  if (!isPlainObject(parsed.params.arguments)) {
    failures.push(formatFailure(block.index, toolName, 'params.arguments must be an object.'));
    continue;
  }

  const tool = toolSchemas.get(toolName);
  if (!tool) {
    failures.push(formatFailure(block.index, toolName, 'params.name does not match a registered MCP tool.'));
    continue;
  }

  validateToolArguments(block.index, tool, parsed.params.arguments, failures);
  validatedExamples += 1;
}

collectToolMentionWarnings(workflowMarkdown, toolSchemas, warnings);

for (const warning of warnings) {
  console.warn(`WARNING ${warning}`);
}

if (failures.length > 0) {
  console.error('Workflow docs validation failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Validated ${validatedExamples} workflow MCP examples from ${jsonBlocks.length} JSON code blocks.`);

function extractJsonBlocks(markdown) {
  const blocks = [];
  const pattern = /```json\s*\r?\n([\s\S]*?)\r?\n```/g;
  let match;
  let index = 1;

  while ((match = pattern.exec(markdown)) !== null) {
    blocks.push({
      index,
      source: match[1],
    });
    index += 1;
  }

  return blocks;
}

function looksLikeToolsCall(value) {
  if (!isPlainObject(value)) {
    return false;
  }
  return value.method === 'tools/call' || isPlainObject(value.params) || typeof value.params?.name === 'string';
}

function validateToolArguments(blockIndex, tool, args, failures) {
  const inputSchema = isPlainObject(tool.inputSchema) ? tool.inputSchema : {};
  const properties = isPlainObject(inputSchema.properties) ? inputSchema.properties : {};
  const required = Array.isArray(inputSchema.required) ? inputSchema.required : [];

  for (const property of required) {
    if (!Object.prototype.hasOwnProperty.call(args, property)) {
      failures.push(formatFailure(blockIndex, tool.name, `Missing required argument "${property}".`));
    }
  }

  for (const [property, value] of Object.entries(args)) {
    const schema = properties[property];
    if (!schema) {
      continue;
    }
    const expectedType = simpleSchemaType(schema);
    if (!expectedType) {
      continue;
    }
    if (!matchesSimpleType(value, expectedType)) {
      failures.push(
        formatFailure(blockIndex, tool.name, `Argument "${property}" should be ${expectedType}, got ${describeValueType(value)}.`)
      );
    }
  }
}

function simpleSchemaType(schema) {
  if (!isPlainObject(schema)) {
    return null;
  }
  if (typeof schema.type === 'string') {
    return ['string', 'number', 'boolean', 'object', 'array'].includes(schema.type) ? schema.type : null;
  }
  return null;
}

function matchesSimpleType(value, expectedType) {
  if (expectedType === 'array') {
    return Array.isArray(value);
  }
  if (expectedType === 'object') {
    return isPlainObject(value);
  }
  return typeof value === expectedType;
}

function describeValueType(value) {
  if (Array.isArray(value)) {
    return 'array';
  }
  if (value === null) {
    return 'null';
  }
  return typeof value;
}

function collectToolMentionWarnings(markdown, schemas, warnings) {
  const mentionedTools = new Set();
  const mentionPattern = /`([a-z][a-z0-9_]+)`/g;
  let match;

  while ((match = mentionPattern.exec(markdown)) !== null) {
    if (schemas.has(match[1])) {
      mentionedTools.add(match[1]);
    }
  }

  const exampleToolNames = new Set();
  for (const block of jsonBlocks) {
    try {
      const parsed = JSON.parse(block.source);
      if (looksLikeToolsCall(parsed) && typeof parsed.params?.name === 'string') {
        exampleToolNames.add(parsed.params.name);
      }
    } catch {
      // Parse failures are reported separately.
    }
  }

  for (const toolName of [...mentionedTools].sort()) {
    if (!exampleToolNames.has(toolName)) {
      warnings.push(`Tool \`${toolName}\` is mentioned in docs/workflows.md but has no MCP JSON example.`);
    }
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function formatFailure(blockIndex, toolName, reason) {
  return `block ${blockIndex}${toolName ? ` (${toolName})` : ''}: ${reason}`;
}
