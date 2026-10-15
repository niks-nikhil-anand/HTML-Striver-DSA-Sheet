// Interactive local setup. The PIN is masked and is never written to disk or logs.
import { readFile, writeFile, chmod } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { emitKeypressEvents } from "node:readline";
import { hashPin } from "../lib/auth/pin";

async function ask(label: string): Promise<string> {
  if (!process.stdin.isTTY) throw new Error("Run this command in an interactive terminal to choose your PIN privately.");
  process.stdout.write(label);
  emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true); process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = "";
    const finish = () => { process.stdin.off("keypress", onKey); process.stdin.setRawMode(false); process.stdin.pause(); process.stdout.write("\n"); };
    const onKey = (text: string, key: { name?: string; ctrl?: boolean }) => {
      if (key.ctrl && key.name === "c") { finish(); reject(new Error("Setup cancelled")); }
      else if (key.name === "return" && value.length === 4) { finish(); resolve(value); }
      else if (key.name === "backspace" && value.length) { value = value.slice(0,-1); process.stdout.write("\b \b"); }
      else if (/^\d+$/.test(text ?? "") && value.length < 4) { const digits = text.slice(0,4-value.length); value += digits; process.stdout.write("•".repeat(digits.length)); }
    };
    process.stdin.on("keypress", onKey);
  });
}
async function main() {
  const pin = await ask("Choose a four-digit PIN: ");
  const confirmation = await ask("Confirm your PIN: ");
  if (pin !== confirmation) throw new Error("PINs did not match. Nothing was changed.");
  const path = ".env";
  const current = await readFile(path, "utf8").catch(() => "");
  const owner = current.match(/^OWNER_USER_ID=["']?([^\s"'\r\n]+)/m)?.[1] ?? current.match(/^DEV_USER_ID=["']?([^\s"'\r\n]+)/m)?.[1] ?? "dev-user";
  const values = { OWNER_USER_ID: owner, APP_PIN_HASH: hashPin(pin), SESSION_SECRET: randomBytes(48).toString("base64url") };
  let next = current;
  for (const [key, value] of Object.entries(values)) {
    const line = `${key}="${value}"`;
    next = new RegExp(`^${key}=.*$`, "m").test(next) ? next.replace(new RegExp(`^${key}=.*$`, "m"), line) : `${next.trimEnd()}\n${line}\n`;
  }
  await writeFile(path, next, { mode: 0o600 }); await chmod(path, 0o600);
  console.log("PIN configured in .env. Your PIN was not stored. Restart the app, or copy OWNER_USER_ID, APP_PIN_HASH and SESSION_SECRET to Vercel and redeploy. Changing the PIN invalidates existing sessions.");
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
