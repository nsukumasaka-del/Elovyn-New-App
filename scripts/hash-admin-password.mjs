import { randomBytes, scryptSync } from "node:crypto";
import { stdin, stdout } from "node:process";

if (!stdin.isTTY || !stdout.isTTY) {
  console.error("Run this utility in an interactive terminal so the password is not echoed.");
  process.exit(1);
}

stdout.write("Admin password: ");
stdin.setRawMode(true);
stdin.resume();
stdin.setEncoding("utf8");

let password = "";
stdin.on("data", (character) => {
  if (character === "\u0003") process.exit(1);
  if (character === "\r" || character === "\n") {
    stdin.setRawMode(false);
    stdin.pause();
    stdout.write("\n");
    const salt = randomBytes(16).toString("hex");
    const digest = scryptSync(password, salt, 64).toString("hex");
    password = "";
    console.log(`scrypt$${salt}$${digest}`);
    return;
  }
  if (character === "\u007f") {
    password = password.slice(0, -1);
    return;
  }
  password += character;
});
