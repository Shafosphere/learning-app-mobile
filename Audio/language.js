// Shared by the Node generator and the React Native runtime.
function audioLanguageKey(locale) {
  if (typeof locale !== 'string' || !/^[a-z]{2,8}(?:[-_][a-z0-9]{1,8})*$/i.test(locale)) {
    throw new Error(`Invalid audio language: ${locale}`);
  }
  return locale.split(/[-_]/)[0].toLowerCase();
}
module.exports = { audioLanguageKey };
