function imageReference(packs, dependencies, slug, value) {
  if (!value) return value;
  const required = dependencies.find(course => course.slug === slug)?.requiredImagePacks ?? [];
  if (value.startsWith('asset://')) {
    const match = /^asset:\/\/(images_[a-z0-9_]+)\/(.+)$/.exec(value);
    if (!match || !required.includes(match[1]) || !packs[match[1]]?.files[match[2]]) throw new Error(`Unknown image reference in ${slug}: ${value}`);
    return value;
  }
  const matches = required.filter(name => packs[name]?.files[value]);
  if (matches.length > 1) throw new Error(`Ambiguous image in ${slug}: ${value}`);
  if (matches.length === 1) return `asset://${matches[0]}/${value}`;
  if (required.length) throw new Error(`Image missing from required packs in ${slug}: ${value}`);
  return value;
}
module.exports = { imageReference };
