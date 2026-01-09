const { getDefaultConfig } = require('expo/metro-config');
module.exports = (() => {
  const config = getDefaultConfig(__dirname);
  config.resolver.sourceExts.push('svgx');
  config.transformer.babelTransformerPath = require.resolve('./svgx-transformer');
  config.resolver.assetExts.push('csv');
  return config;
})();
