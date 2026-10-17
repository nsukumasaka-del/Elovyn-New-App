import { pbkdf2Sync, randomBytes } from "node:crypto";
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
    const iterations = 100_000;
    const rounds = 6;
    const salt = randomBytes(16).toString("hex");
    let derived = Buffer.from(password, "utf8");
    for (let round = 0; round < rounds; round += 1) {
      derived = pbkdf2Sync(derived, Buffer.from(salt, "hex"), iterations, 32, "sha256");
    }
    password = "";
    console.log(`pbkdf2-chain$${iterations}$${rounds}$${salt}$${derived.toString("hex")}`);
    return;
  }
  if (character === "\u007f") {
    password = password.slice(0, -1);
    return;
  }
  password += character;
});
