/** @jest-environment node */
/* global __dirname, test, expect */

const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const { createInstance } = require("i18next");

const root = path.resolve(__dirname, "../../..");
const locales = {
  en: require("../../locales/en.json"),
  pl: require("../../locales/pl.json"),
};

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return ["__tests__", "__mocks__"].includes(entry.name)
        ? []
        : sourceFiles(filename);
    }
    return /\.[jt]sx?$/.test(entry.name) && !/\.(test|spec)\./.test(entry.name)
      ? [filename]
      : [];
  });
}

// Check literal keys throughout the app; dynamically constructed keys need
// coverage in their feature tests.
const calls = ["src", "app", "Audio/runtime"].flatMap((directory) =>
  sourceFiles(path.join(root, directory)).flatMap((filename) => {
    const source = ts.createSourceFile(
      filename,
      fs.readFileSync(filename, "utf8"),
      ts.ScriptTarget.Latest,
      true
    );
    const found = [];
    function visit(node) {
      if (
        ts.isCallExpression(node) &&
        ["t", "i18n.t"].includes(node.expression.getText(source))
      ) {
        const key = node.arguments[0];
        if (key && (ts.isStringLiteral(key) || ts.isNoSubstitutionTemplateLiteral(key))) {
          const { line } = source.getLineAndCharacterOfPosition(key.getStart(source));
          found.push({ key: key.text, location: `${path.relative(root, filename)}:${line + 1}` });
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
    return found;
  })
);

test.each(Object.entries(locales))(
  "all literal translation keys resolve in %s without language fallback",
  async (language, translations) => {
    const i18n = createInstance();
    await i18n.init({
      lng: language,
      fallbackLng: false,
      resources: { [language]: { translation: translations } },
    });

    expect(calls.length).toBeGreaterThan(0);
    const missing = calls.filter(({ key }) =>
      ![0, 1, 2, 5].every((count) => i18n.exists(key, { count }))
    );
    expect(missing).toEqual([]);
  }
);
