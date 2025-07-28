// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

module.exports = (() => {
  // wygeneruj domyślną config dla Expo
  const config = getDefaultConfig(__dirname);

  // rozszerzenia plików, które Metro będzie traktować jako assety
  config.resolver.assetExts.push('csv');

  return config;
})();
