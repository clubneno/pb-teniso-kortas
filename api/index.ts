// This file is compiled by Vercel's TypeScript compiler
// It imports the bundled handler created by our build:api script
// Using require() for CommonJS compatibility
const bundled = require("./bundled.cjs");
export default bundled.default || bundled;
