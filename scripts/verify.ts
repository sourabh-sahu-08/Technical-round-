/// <reference types="node" />

/**
 * Verification script for Valcura assessment.
 * Starts the server, runs all checks, then shuts it down.
 *
 * Usage: npm run verify
 */

import { execSync, spawn } from "child_process";
import * as http from "http";

const BASE_URL = "http://localhost:3001";
const WEBHOOK_SECRET = "test-secret-123";

let passed = 0;
let failed = 0;

function log(label: string, ok: boolean, detail?: string) {
  const icon = ok ? "✓" : "✗";
  console.log(`  ${icon} ${label}${detail ? ` — ${detail}` : ""}`);
  ok ? passed++ : failed++;
}

async function request(
  path: string,
  body: unknown,
  headers: Record<string, string> = {}
): Promise<{ status: number; body: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const opts: http.RequestOptions = {
      hostname: "localhost",
      port: 3001,
      path,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
        ...headers,
      },
    };

    const req = http.request(opts, (res: http.IncomingMessage) => {
      let data = "";
      res.on("data", (chunk: Buffer) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode!, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode!, body: {} });
        }
      });
    });

    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log("\n=== Valcura Assessment — Verification ===\n");

  // Start server on a different port to avoid conflicts
  const server = spawn("npx", ["ts-node", "src/server.ts"], {
    env: { ...process.env, PORT: "3001", WEBHOOK_SECRET, MESSAGING_API_TOKEN: "" },
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
  });

  let serverReady = false;
  server.stdout.on("data", (data: Buffer) => {
    if (data.toString().includes("running")) serverReady = true;
  });

  // Wait for server to start
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    if (serverReady) break;
  }

  if (!serverReady) {
    console.error("Server did not start in time.");
    server.kill();
    process.exit(1);
  }

  console.log("Server started.\n--- Task 1 & 2: POST /send-template ---");

  // 1. Valid request → 202 + messageId
  const t1 = await request("/send-template", {
    to: "+919876543210",
    templateName: "appointment_reminder",
    parameters: ["Dr Sharma", "6:30 PM"],
  });
  log(
    "Valid request → 202 + messageId",
    t1.status === 202 &&
      typeof t1.body.messageId === "string" &&
      (t1.body.messageId as string).startsWith("msg_") &&
      t1.body.status === "accepted"
  );

  // 2. Missing 'to' → 400
  const t2 = await request("/send-template", {
    to: "",
    templateName: "appointment_reminder",
    parameters: [],
  });
  log("Empty 'to' → 400", t2.status === 400 && t2.body.error === "invalid_request");

  // 3. Non-array parameters → 400
  const t3 = await request("/send-template", {
    to: "+919876543210",
    templateName: "appointment_reminder",
    parameters: "not-an-array",
  });
  log("Non-array parameters → 400", t3.status === 400 && t3.body.error === "invalid_request");

  // 4. Non-string parameter item → 400
  const t4 = await request("/send-template", {
    to: "+919876543210",
    templateName: "appointment_reminder",
    parameters: ["valid", 42],
  });
  log("Non-string parameter item → 400", t4.status === 400 && t4.body.error === "invalid_request");

  console.log("\n--- Task 6: force_failure → 502 ---");

  // 5. force_failure → 502
  const t5 = await request("/send-template", {
    to: "+919876543210",
    templateName: "force_failure",
    parameters: [],
  });
  log("force_failure → 502 + provider_error", t5.status === 502 && t5.body.error === "provider_error");

  console.log("\n--- Task 4: POST /webhooks/message ---");

  // 6. Valid webhook → 200 processed
  const w1 = await request(
    "/webhooks/message",
    { eventId: "evt_001", messageId: "msg_12345", status: "delivered" },
    { "x-webhook-secret": WEBHOOK_SECRET }
  );
  log(
    "Valid webhook → 200 processed",
    w1.status === 200 && w1.body.status === "processed" && w1.body.processed === true
  );

  // 7. Wrong secret → 401
  const w2 = await request(
    "/webhooks/message",
    { eventId: "evt_002", messageId: "msg_12345", status: "delivered" },
    { "x-webhook-secret": "wrong-secret" }
  );
  log("Wrong secret → 401", w2.status === 401 && w2.body.error === "unauthorized");

  // 8. Missing secret → 401
  const w3 = await request("/webhooks/message", {
    eventId: "evt_003",
    messageId: "msg_12345",
    status: "delivered",
  });
  log("Missing secret → 401", w3.status === 401 && w3.body.error === "unauthorized");

  // 9. Invalid status → 400
  const w4 = await request(
    "/webhooks/message",
    { eventId: "evt_004", messageId: "msg_12345", status: "bounced" },
    { "x-webhook-secret": WEBHOOK_SECRET }
  );
  log("Unsupported status → 400", w4.status === 400 && w4.body.error === "invalid_webhook");

  // 10. Missing eventId → 400
  const w5 = await request(
    "/webhooks/message",
    { eventId: "", messageId: "msg_12345", status: "sent" },
    { "x-webhook-secret": WEBHOOK_SECRET }
  );
  log("Empty eventId → 400", w5.status === 400 && w5.body.error === "invalid_webhook");

  console.log("\n--- Task 5: Duplicate event protection ---");

  // 11. Second request with same eventId → duplicate
  const w6 = await request(
    "/webhooks/message",
    { eventId: "evt_001", messageId: "msg_12345", status: "delivered" },
    { "x-webhook-secret": WEBHOOK_SECRET }
  );
  log(
    "Duplicate eventId → 200 duplicate",
    w6.status === 200 && w6.body.status === "duplicate" && w6.body.processed === false
  );

  console.log("\n--- Task 3: WEBHOOK_SECRET startup validation ---");

  // 12. Server refuses to start without WEBHOOK_SECRET
  try {
    execSync("npx ts-node src/server.ts", {
      env: { ...process.env, WEBHOOK_SECRET: "", PORT: "3002" },
      timeout: 5000,
      stdio: "pipe",
      shell: true,
    } as any);
    log("Missing WEBHOOK_SECRET exits non-zero", false, "process exited 0 unexpectedly");
  } catch (err: unknown) {
    const e = err as { status?: number; stderr?: Buffer };
    const exitedNonZero = (e.status ?? 0) !== 0;
    log("Missing WEBHOOK_SECRET exits non-zero", exitedNonZero);
  }

  server.kill();

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error("Verification error:", err.message);
  process.exit(1);
});
