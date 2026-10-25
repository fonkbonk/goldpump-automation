import { solveGoldPumpTurnstile, capMonsterBalance } from "../src/captcha/capmonster.js";

const bal = await capMonsterBalance();
console.log("CapMonster balance:", bal);

console.log("Solving GoldPump Turnstile (CapMonster)…");
const t0 = Date.now();
const token = await solveGoldPumpTurnstile();
console.log(`OK in ${((Date.now() - t0) / 1000).toFixed(1)}s, token length ${token.length}`);
