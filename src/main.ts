import { runRainEngine } from "./automation/rain-engine.js";
import { log } from "./util/log.js";

runRainEngine().catch((err) => {
  log("error", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
