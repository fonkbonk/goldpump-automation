import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { upsertAccount } from "../src/db/accounts.js";
import { createGoldPumpHttp, loginAuto } from "../src/goldpump/http.js";
import { normalizeCookieHeader } from "../src/util/cookie-header.js";

const rl = readline.createInterface({ input, output });

const nickname = (await rl.question("Nickname: ")).trim();
if (!nickname) {
  console.error("Nickname required");
  process.exit(1);
}

console.log(
  "\nPaste session: full Cookie header, connect.sid=..., or raw SID value (friend bots).\n",
);
const cookie = normalizeCookieHeader((await rl.question("Cookie / SID: ")).trim());
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
