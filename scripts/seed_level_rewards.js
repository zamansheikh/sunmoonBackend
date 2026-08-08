const fs = require("fs");
const path = require("path");

// ═══════════════════════════════════════════════════════════════════════════
//  CONFIGURATION — edit these values before running the script
// ═══════════════════════════════════════════════════════════════════════════

const MIN_COIN = 5000;        // level 1 gets this amount
const MAX_COIN = 160000000;      // last level gets this amount
const TOTAL_LEVELS = 200;     // creates configs from level 1 to this number

const ADMIN_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NmQyM2Q2ZjlhYzQ1ZWRiNzY1MDM0NyIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1MTk4MzM2NH0.TUGVYYwrqElNFpXZHM1trOc91rBDKW3vZA1N5BlIM8M";

const API_BASE_URL = "http://localhost:8000";
const DELAY_MS = 500;
const MAX_RETRIES = 3;

// ═══════════════════════════════════════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(prefix, message) {
  const timestamp = new Date().toISOString().slice(11, 19);
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

function calculateCoinReward(level) {
  if (TOTAL_LEVELS === 1) return MIN_COIN;
  return Math.round(MIN_COIN + (MAX_COIN - MIN_COIN) * (level - 1) / (TOTAL_LEVELS - 1));
}

// ═══════════════════════════════════════════════════════════════════════════
//  UPLOAD
// ═══════════════════════════════════════════════════════════════════════════

async function createRewardConfig(level, coinReward, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/level-rewards`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ADMIN_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ level, coinReward }),
      });

      const body = await response.json().catch(() => ({}));

      if (response.ok) {
        return { success: true, status: response.status, body };
      }

      if (response.status === 409) {
        return { success: true, status: 409, body, skipped: true };
      }

      if (attempt < retries) {
        const wait = attempt * 2000;
        log("RETRY", `Level ${level} failed (${response.status}), retrying in ${wait / 1000}s... (attempt ${attempt}/${retries})`);
        await sleep(wait);
        continue;
      }

      return { success: false, status: response.status, body };
    } catch (error) {
      if (attempt < retries) {
        const wait = attempt * 2000;
        log("RETRY", `Level ${level} error (${error.message}), retrying in ${wait / 1000}s... (attempt ${attempt}/${retries})`);
        await sleep(wait);
        continue;
      }

      return { success: false, status: 0, body: { message: error.message } };
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  log("INFO", "Level Reward Seed Script");
  log("INFO", `API: ${API_BASE_URL}`);
  log("INFO", `Levels: 1 → ${TOTAL_LEVELS} | Min: ${MIN_COIN} | Max: ${MAX_COIN}`);
  log("INFO", "---");

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (let level = 1; level <= TOTAL_LEVELS; level++) {
    const coinReward = calculateCoinReward(level);
    const progress = `[${level}/${TOTAL_LEVELS}]`;

    log("CREATE", `${progress} Level ${level} → ${coinReward.toLocaleString()} coins`);

    const result = await createRewardConfig(level, coinReward);

    if (result.skipped) {
      skipped++;
      log("SKIP", `${progress} Level ${level} — already exists`);
    } else if (result.success) {
      created++;
      log("OK", `${progress} Level ${level} — created`);
    } else {
      failed++;
      log("FAIL", `${progress} Level ${level} — ${result.status}: ${JSON.stringify(result.body)}`);
    }

    if (level < TOTAL_LEVELS) {
      await sleep(DELAY_MS);
    }
  }

  log("INFO", "---");
  log("INFO", "DONE");
  log("INFO", `Created: ${created} | Skipped: ${skipped} | Failed: ${failed} | Total: ${TOTAL_LEVELS}`);

  // Print preview
  log("INFO", "---");
  log("INFO", "Preview of distribution:");
  const previewLevels = [1, 2, 3, Math.ceil(TOTAL_LEVELS / 4), Math.ceil(TOTAL_LEVELS / 2), Math.ceil(TOTAL_LEVELS * 3 / 4), TOTAL_LEVELS];
  for (const lvl of previewLevels) {
    if (lvl <= TOTAL_LEVELS) {
      log("INFO", `  Level ${lvl.toString().padStart(3)} → ${calculateCoinReward(lvl).toLocaleString().padStart(10)} coins`);
    }
  }
}

main();
