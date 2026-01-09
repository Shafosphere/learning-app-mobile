const svgTransformer = require("react-native-svg-transformer");

module.exports.transform = async ({ src, filename, options }) => {
  if (filename?.endsWith(".svgx")) {
    return svgTransformer.transform({
      src,
      filename: filename.replace(/\.svgx$/, ".svg"),
      options,
    });
  }

  return svgTransformer.transform({ src, filename, options });
};

module.exports.getCacheKey = svgTransformer.getCacheKey;
