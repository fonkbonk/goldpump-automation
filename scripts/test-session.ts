import { getAccountCookie, listAccounts } from "../src/db/accounts.js";
import { createGoldPumpHttp, loginAuto } from "../src/goldpump/http.js";

const accounts = listAccounts();
if (!accounts.length) {
  console.error("No accounts");
  process.exit(1);
}

for (const row of accounts) {
  const http = createGoldPumpHttp(getAccountCookie(row));
  try {
    const s = await loginAuto(http);
    console.log(
      row.nickname,
      s.authenticated ? "ok" : "not authenticated",
      s.document?.username,
      "balance",
      s.document?.balance,
    );
  } catch (e) {
    console.log(row.nickname, "error", e instanceof Error ? e.message : e);
  }
}
