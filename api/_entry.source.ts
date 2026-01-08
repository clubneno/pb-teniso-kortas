// This file is the source for api/index.js
// It's prefixed with underscore so Vercel doesn't detect it as an API route
// The actual API is built by esbuild from server/api-entry.ts -> api/index.js
export { default } from "../server/api-entry";
