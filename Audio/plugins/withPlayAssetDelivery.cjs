const { withDangerousMod, withSettingsGradle, withAppBuildGradle } = require('expo/config-plugins');
const { buildCatalog, writeOutputs, preparePacks, gradleBlocks, withBlock } = require('../tools/catalog.cjs');

module.exports = function withPlayAssetDelivery(config) {
  let catalog;
  const getCatalog = (root) => catalog ??= buildCatalog(root);
  config = withSettingsGradle(config, (mod) => {
    if (mod.modResults.language !== 'groovy') throw new Error('PAD plugin requires Groovy Gradle');
    mod.modResults.contents = withBlock(mod.modResults.contents, gradleBlocks(getCatalog(mod.modRequest.projectRoot)).settings);
    return mod;
  });
  config = withAppBuildGradle(config, (mod) => {
    if (mod.modResults.language !== 'groovy') throw new Error('PAD plugin requires Groovy Gradle');
    mod.modResults.contents = withBlock(mod.modResults.contents, gradleBlocks(getCatalog(mod.modRequest.projectRoot)).app);
    return mod;
  });
  return withDangerousMod(config, ['android', (mod) => {
    const root = mod.modRequest.projectRoot;
    const current = getCatalog(root);
    writeOutputs(root, current);
    preparePacks(root, mod.modRequest.platformProjectRoot, current);
    return mod;
  }]);
};
