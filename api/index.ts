// Vercel compiles this file directly with TypeScript
// Re-export the handler from server/api-entry.ts using relative import
import handler from "../server/api-entry";
export default handler;
