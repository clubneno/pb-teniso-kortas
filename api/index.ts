// This file is compiled by Vercel's TypeScript compiler
// It imports the bundled handler created by our build:api script
// Using createRequire for ES module compatibility with CommonJS bundled file
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const bundled = require("./bundled.cjs");
export default bundled.default || bundled;
