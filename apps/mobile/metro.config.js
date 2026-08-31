const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Metro's watcher (Windows falls back to Node's fs.watch, no Watchman) crawls the whole
// workspace root for monorepo resolution. apps/web's Next.js dev server constantly creates
// and deletes directories under .next/static/chunks (per-route, e.g. the `[username]`
// dynamic-route chunk dir) while its own dev server runs — Metro's fs.watch on Windows
// throws an uncaught ENOENT when a watched directory disappears mid-watch, killing the whole
// process. Block .next output from Metro's crawl entirely; mobile never needs to resolve
// anything from it.
config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList)
    ? config.resolver.blockList
    : [config.resolver.blockList].filter(Boolean)),
  /apps[\\/]web[\\/]\.next[\\/].*/,
];

module.exports = withNativeWind(config, { input: "./src/global.css", inlineRem: 16 });
