const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// @tanstack/react-query v5 ships a "modern" ESM build that uses explicit .js
// extension imports (e.g. `import ... from "./queryOptions.js"`). Metro can't
// traverse these because it strips extensions during resolution.
//
// Expo SDK 54 enables `unstable_enablePackageExports` by default, which causes
// Metro to pick the `"import"` export condition → build/modern/index.js.
//
// Disabling it makes Metro fall back to the top-level `"react-native"` field
// in @tanstack/react-query's package.json, which points to src/index.ts — a
// CJS-compatible entry that Metro handles correctly.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
