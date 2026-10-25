import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { upsertAccount } from "../src/db/accounts.js";
import { createGoldPumpHttp, loginAuto } from "../src/goldpump/http.js";

const rl = readline.createInterface({ input, output });

const nickname = (await rl.question("Nickname: ")).trim();
if (!nickname) {
  console.error("Nickname required");
  process.exit(1);
}

console.log(
  "\nPaste the Cookie header from goldpump.com (DevTools → Network → any api.goldpump.com request → Cookie).\n",
);
const cookie = (await rl.question("Cookie: ")).trim();
rl.close();

if (!cookie) {
  console.error("Cookie required");
  process.exit(1);
}

const http = createGoldPumpHttp(cookie);
const session = await loginAuto(http);
if (!session.authenticated) {
  console.error("Login-auto failed — cookies may be expired.");
  process.exit(1);
}

const row = upsertAccount(nickname, cookie);
console.log(
  `Saved account #${row.id} ${session.document?.username ?? nickname} (balance ${session.document?.balance ?? "?"})`,
);
