#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const DEFAULT_OUTPUT = "tools/i18n-hardcoded-text.csv";
const SOURCE_DIRS = ["app", "src"];
const UI_PROPS = [
  "text",
  "title",
  "subtitle",
  "label",
  "placeholder",
  "accessibilityLabel",
];
const OBJECT_KEYS = ["message", "title", "description"];
const POLISH_CHARS = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/;
const DOUBLE_QUOTED = String.raw`"(?:\\.|[^"\\])*"`;
const SINGLE_QUOTED = String.raw`'(?:\\.|[^'\\])*'`;
const TEMPLATE_QUOTED = String.raw`\`(?:\\.|[^\`\\])*\``;
const ANY_STRING_LITERAL = `(${DOUBLE_QUOTED}|${SINGLE_QUOTED}|${TEMPLATE_QUOTED})`;

const args = process.argv.slice(2);
const outputArgIndex = args.findIndex((arg) => arg === "--output" || arg === "-o");
const outputPath =
  outputArgIndex >= 0 && args[outputArgIndex + 1]
    ? args[outputArgIndex + 1]
    : DEFAULT_OUTPUT;
const includeTests = args.includes("--include-tests");

function walkFiles(dir) {
  const absDir = path.join(ROOT, dir);
  if (!fs.existsSync(absDir)) return [];

  const result = [];
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    const absPath = path.join(absDir, entry.name);
    const relPath = path.relative(ROOT, absPath).replace(/\\/g, "/");

    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      if (!includeTests && (entry.name === "__tests__" || entry.name === "__mocks__")) continue;
      result.push(...walkFiles(relPath));
      continue;
    }

    if (!/\.(ts|tsx|js|jsx)$/.test(entry.name)) continue;
    if (!includeTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(entry.name)) continue;
    result.push(relPath);
  }
  return result;
}

function lineColumnForIndex(source, index) {
  let line = 1;
  let lastLineStart = 0;
  for (let i = 0; i < index; i += 1) {
    if (source.charCodeAt(i) === 10) {
      line += 1;
      lastLineStart = i + 1;
    }
  }
  return { line, column: index - lastLineStart + 1 };
}

function decodeQuoted(value) {
  try {
    return JSON.parse(value);
  } catch {
    return value.slice(1, -1);
  }
}

function normalizeText(value) {
  return value
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripJsxTags(value) {
  return value.replace(/<\/?[A-Z][^>]*>/g, " ");
}

function stripJsxExpressions(value) {
  let result = "";
  let depth = 0;
  let quote = "";
  let escaped = false;

  for (let i = 0; i < value.length; i += 1) {
    const chr = value[i];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (chr === "\\") {
        escaped = true;
      } else if (chr === quote) {
        quote = "";
      }
      continue;
    }

    if (depth > 0 && (chr === '"' || chr === "'" || chr === "`")) {
      quote = chr;
      continue;
    }

    if (chr === "{") {
      depth += 1;
      result += " ";
      continue;
    }

    if (chr === "}" && depth > 0) {
      depth -= 1;
      result += " ";
      continue;
    }

    if (depth === 0) {
      result += chr;
    }
  }

  return result;
}

function stripTemplateExpressions(value) {
  return value.replace(/\$\{[^}]*\}/g, "{{value}}");
}

function isProbablyUserFacing(text) {
  if (!text) return false;
  if (text.length < 2) return false;
  if (/^[\s\d.,:;!?()[\]{}+\-*/\\|_#%<>=]+$/.test(text)) return false;
  if (/^#[0-9a-f]{3,8}$/i.test(text)) return false;
  if (/^[a-z0-9_.-]+\.[a-z0-9_.-]+$/i.test(text)) return false;
  if (/^[a-z][a-z0-9]*([A-Z][a-z0-9]*)+$/.test(text)) return false;
  if (/^https?:\/\//i.test(text)) return false;
  if (/^[./@~]/.test(text)) return false;
  return /[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]/.test(text);
}

function confidenceFor(text, kind) {
  if (POLISH_CHARS.test(text)) return "high";
  if (kind === "textChild" || kind === "alert") return "medium";
  return "review";
}

function fileKey(file) {
  const withoutExt = file.replace(/\.(ts|tsx|js|jsx)$/, "");
  return withoutExt
    .replace(/^src\//, "")
    .replace(/^app\//, "app/")
    .split("/")
    .filter((part) => part !== "index")
    .map((part) =>
      part
        .replace(/Screen$/, "")
        .replace(/[^A-Za-z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
        .replace(/^[A-Z]/, (chr) => chr.toLowerCase())
    )
    .join(".");
}

function slugFromText(text) {
  const ascii = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "L")
    .replace(/\{\{value\}\}/g, " value ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5);

  if (!ascii.length) return "text";
  return ascii
    .map((word, index) =>
      index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join("");
}

function suggestedKey(file, kind, propName, text) {
  const base = fileKey(file) || "app";
  const bucket = propName || kind;
  return `${base}.${bucket}.${slugFromText(text)}`;
}

function addFinding(findings, file, source, index, kind, propName, rawText, context) {
  const text = normalizeText(rawText);
  if (!isProbablyUserFacing(text)) return;
  const { line, column } = lineColumnForIndex(source, index);
  findings.push({
    file,
    line,
    column,
    kind,
    prop: propName,
    confidence: confidenceFor(text, kind),
    suggestedKey: suggestedKey(file, kind, propName, text),
    text,
    context: normalizeText(context).slice(0, 240),
  });
}

function isInsideLineComment(source, index) {
  const lineStart = source.lastIndexOf("\n", index - 1) + 1;
  const before = source.slice(lineStart, index);
  return before.includes("//");
}

function isInsideBlockComment(source, index) {
  const before = source.slice(0, index);
  return before.lastIndexOf("/*") > before.lastIndexOf("*/");
}

function isInsideComment(source, index) {
  return isInsideLineComment(source, index) || isInsideBlockComment(source, index);
}

function scanTextChildren(findings, file, source) {
  const regex = /<Text\b[^>]*>([\s\S]*?)<\/Text>/g;
  let match;
  while ((match = regex.exec(source))) {
    if (isInsideComment(source, match.index)) continue;
    const body = match[1];
    const bodyStart = match.index + match[0].indexOf(body);

    const directText = normalizeText(stripJsxExpressions(stripJsxTags(body)));
    addFinding(findings, file, source, bodyStart, "textChild", "", directText, match[0]);

    const templateRegex = /\{\s*`([\s\S]*?)`\s*\}/g;
    let templateMatch;
    while ((templateMatch = templateRegex.exec(body))) {
      addFinding(
        findings,
        file,
        source,
        bodyStart + templateMatch.index,
        "textChildTemplate",
        "",
        stripTemplateExpressions(templateMatch[1]),
        match[0]
      );
    }

    const quotedRegex = /\{\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')\s*\}/g;
    let quotedMatch;
    while ((quotedMatch = quotedRegex.exec(body))) {
      addFinding(
        findings,
        file,
        source,
        bodyStart + quotedMatch.index,
        "textChildExpression",
        "",
        decodeQuoted(quotedMatch[1]),
        match[0]
      );
    }
  }
}

function scanProps(findings, file, source) {
  const propNames = UI_PROPS.join("|");
  const stringPropRegex = new RegExp(
    `\\b(${propNames})\\s*=\\s*(${DOUBLE_QUOTED}|${SINGLE_QUOTED})`,
    "g"
  );
  let match;
  while ((match = stringPropRegex.exec(source))) {
    if (isInsideComment(source, match.index)) continue;
    addFinding(
      findings,
      file,
      source,
      match.index,
      "prop",
      match[1],
      decodeQuoted(match[2]),
      match[0]
    );
  }

  const expressionPropRegex = new RegExp(
    `\\b(${propNames})\\s*=\\s*\\{\\s*${ANY_STRING_LITERAL}\\s*\\}`,
    "g"
  );
  while ((match = expressionPropRegex.exec(source))) {
    if (isInsideComment(source, match.index)) continue;
    const literal = match[2];
    const text =
      literal.startsWith("`")
        ? stripTemplateExpressions(literal.slice(1, -1))
        : decodeQuoted(literal);
    addFinding(findings, file, source, match.index, "propExpression", match[1], text, match[0]);
  }
}

function scanAlertCalls(findings, file, source) {
  const regex = /Alert\.alert\s*\(([\s\S]*?)\)/g;
  let match;
  while ((match = regex.exec(source))) {
    if (isInsideComment(source, match.index)) continue;
    const args = match[1];
    const argsStart = match.index + match[0].indexOf(args);
    const literalRegex = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)/g;
    let literalMatch;
    while ((literalMatch = literalRegex.exec(args))) {
      const beforeLiteral = args.slice(0, literalMatch.index);
      if (/\bstyle\s*:\s*$/.test(beforeLiteral.slice(-20))) continue;
      const literal = literalMatch[1];
      const text =
        literal.startsWith("`")
          ? stripTemplateExpressions(literal.slice(1, -1))
          : decodeQuoted(literal);
      addFinding(
        findings,
        file,
        source,
        argsStart + literalMatch.index,
        "alert",
        "",
        text,
        match[0]
      );
    }
  }
}

function scanObjectFields(findings, file, source) {
  const keyNames = OBJECT_KEYS.join("|");
  const regex = new RegExp(
    `\\b(${keyNames})\\s*:\\s*${ANY_STRING_LITERAL}`,
    "g"
  );
  let match;
  while ((match = regex.exec(source))) {
    if (isInsideComment(source, match.index)) continue;
    const literal = match[2];
    const text =
      literal.startsWith("`")
        ? stripTemplateExpressions(literal.slice(1, -1))
        : decodeQuoted(literal);
    addFinding(findings, file, source, match.index, "objectField", match[1], text, match[0]);
  }
}

function dedupe(findings) {
  const seen = new Set();
  return findings.filter((finding) => {
    const key = [
      finding.file,
      finding.line,
      finding.column,
      finding.kind,
      finding.prop,
      finding.text,
    ].join("\0");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function csvEscape(value) {
  const stringValue = String(value ?? "");
  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function writeCsv(rows, target) {
  const headers = [
    "file",
    "line",
    "column",
    "kind",
    "prop",
    "confidence",
    "suggestedKey",
    "text",
    "context",
  ];
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ].join("\n");

  const absTarget = path.join(ROOT, target);
  fs.mkdirSync(path.dirname(absTarget), { recursive: true });
  fs.writeFileSync(absTarget, `${csv}\n`, "utf8");
}

const files = SOURCE_DIRS.flatMap(walkFiles);
const findings = [];

for (const file of files) {
  const source = fs.readFileSync(path.join(ROOT, file), "utf8");
  scanTextChildren(findings, file, source);
  scanProps(findings, file, source);
  scanAlertCalls(findings, file, source);
  scanObjectFields(findings, file, source);
}

const rows = dedupe(findings).sort((a, b) => {
  if (a.file !== b.file) return a.file.localeCompare(b.file);
  if (a.line !== b.line) return a.line - b.line;
  return a.column - b.column;
});

writeCsv(rows, outputPath);

const counts = rows.reduce((acc, row) => {
  acc[row.confidence] = (acc[row.confidence] ?? 0) + 1;
  return acc;
}, {});

console.log(`Scanned ${files.length} files.`);
console.log(`Found ${rows.length} hardcoded text candidates.`);
console.log(
  `Confidence: high=${counts.high ?? 0}, medium=${counts.medium ?? 0}, review=${counts.review ?? 0}.`
);
console.log(`Wrote ${outputPath}`);
