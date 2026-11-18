const { getDefaultConfig } = require('expo/metro-config');
module.exports = (() => {
  const config = getDefaultConfig(__dirname);
  config.resolver.sourceExts.push('svgx');
  config.transformer.babelTransformerPath = require.resolve('./svgx-transformer');
  config.resolver.assetExts.push('csv');
  config.resolver.assetExts.push('db');
  config.resolver.assetExts.push('ogg');
  // Choose at graph construction time: PAD Android bundles never traverse image requires.
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    const resolved = context.resolveRequest(context, moduleName, platform);
    const usePAD = platform === 'android' && (process.env.CONTENT_IMAGES_DELIVERY === 'pad' ||
      (process.env.CONTENT_IMAGES_DELIVERY !== 'bundled' && !context.dev));
    if (usePAD && resolved.type === 'sourceFile' && resolved.filePath.endsWith('/Content/runtime/generated/bundledImages.ts')) {
      return { ...resolved, filePath: resolved.filePath.replace(/\.ts$/, '.pad.ts') };
    }
    return resolved;
  };
  return config;
})();
