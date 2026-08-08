const fs = require("fs");
const path = require("path");

// ═══════════════════════════════════════════════════════════════════════════
//  CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const ADMIN_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NmQyM2Q2ZjlhYzQ1ZWRiNzY1MDM0NyIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1MTk4MzM2NH0.TUGVYYwrqElNFpXZHM1trOc91rBDKW3vZA1N5BlIM8M";

const API_BASE_URL = "http://localhost:8000";
const FOLDER_PATH = path.join(__dirname, "level-tags");
const DELAY_MS = 2000;
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

// ═══════════════════════════════════════════════════════════════════════════
//  UPLOAD
// ═══════════════════════════════════════════════════════════════════════════

async function uploadLevelTag(level, filePath, retries = MAX_RETRIES) {
  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);

  for (let attempt = 1; attempt <= retries; attempt++) {
    const formData = new FormData();
    formData.append("level", String(level));
    formData.append("tagFile", new Blob([fileBuffer]), fileName);

    try {
      const response = await fetch(`${API_BASE_URL}/api/level-tags`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ADMIN_TOKEN}`,
        },
        body: formData,
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
  log("INFO", "Level Tags Upload Script");
  log("INFO", `API: ${API_BASE_URL}`);
  log("INFO", `Folder: ${FOLDER_PATH}`);
  log("INFO", "---");

  if (!fs.existsSync(FOLDER_PATH)) {
    log("ERROR", `Folder not found: ${FOLDER_PATH}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(FOLDER_PATH)
    .filter((f) => f.endsWith(".svga"))
    .sort((a, b) => {
      const numA = parseInt(a.replace(".svga", ""), 10);
      const numB = parseInt(b.replace(".svga", ""), 10);
      return numA - numB;
    });

  if (files.length === 0) {
    log("ERROR", "No .svga files found in folder");
    process.exit(1);
  }

  log("INFO", `Found ${files.length} .svga files`);
  log("INFO", "---");

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const level = parseInt(file.replace(".svga", ""), 10);
    const filePath = path.join(FOLDER_PATH, file);

    const progress = `[${i + 1}/${files.length}]`;
    log("UPLOAD", `${progress} Level ${level} (${file})...`);

    const result = await uploadLevelTag(level, filePath);

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

    if (i < files.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  log("INFO", "---");
  log("INFO", "DONE");
  log("INFO", `Created: ${created} | Skipped: ${skipped} | Failed: ${failed} | Total: ${files.length}`);
}

main();
