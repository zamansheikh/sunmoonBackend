const fs = require("fs");
const path = require("path");

// ═══════════════════════════════════════════════════════════════════════════
//  CONFIGURATION — edit these values before running the script
// ═══════════════════════════════════════════════════════════════════════════

// Set to "SVIP" or "VIP" — everything else derives from this
const TYPE = "VIP";

const ADMIN_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NmQyM2Q2ZjlhYzQ1ZWRiNzY1MDM0NyIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1MTk4MzM2NH0.TUGVYYwrqElNFpXZHM1trOc91rBDKW3vZA1N5BlIM8M";

const TIER_CONFIGS = [
  { tier: 1, price: 10_00_000, validity: 30 },
  { tier: 2, price: 20_00_000, validity: 30 },
  { tier: 3, price: 40_00_000, validity: 30 },
  { tier: 4, price: 60_00_000, validity: 30 },
  { tier: 5, price: 80_00_000, validity: 30 },
  { tier: 6, price: 1_00_00_000, validity: 30 },
  { tier: 7, price: 1_20_00_000, validity: 30 },
  { tier: 8, price: 1_40_00_000, validity: 30 },
  { tier: 9, price: 1_60_00_000, validity: 30 },
];

const API_BASE_URL = "http://localhost:8000";
const START_TIER = 1;
const END_TIER = 9;

// ═══════════════════════════════════════════════════════════════════════════
//  TYPE-DERIVED CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const BUNDLE_CATEGORIES_BY_TYPE = {
  SVIP: ["entry", "frame", "label", "medal", "mic-effect", "name-field", "room-card", "text-bubble"],
  VIP:  ["entry", "frame", "label", "medal", "mic-effect", "name-field", "room-card", "shawl", "text-bubble"],
};

const FOLDER_NAME_BY_TYPE = { SVIP: "svip-files", VIP: "vip-files" };
const FOLDER_REGEX_BY_TYPE = { SVIP: /^svip\s+(\d+)$/i, VIP: /^vip(\d+)$/i };

// ═══════════════════════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const SCRIPT_DIR = __dirname;
const ASSETS_DIR = path.join(SCRIPT_DIR, FOLDER_NAME_BY_TYPE[TYPE]);
const BUNDLE_CATEGORIES = BUNDLE_CATEGORIES_BY_TYPE[TYPE];

const API_ENDPOINTS = {
  categories: `${API_BASE_URL}/api/store/categories`,
  items: `${API_BASE_URL}/api/store/items/batch`,
};

const AUTH_HEADERS = {
  Authorization: `Bearer ${ADMIN_TOKEN}`,
  "Content-Type": "application/json",
};

// ═══════════════════════════════════════════════════════════════════════════
//  UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getTierConfig(tier) {
  return TIER_CONFIGS.find((t) => t.tier === tier) || { price: 0, validity: 30 };
}

function log(prefix, message) {
  const timestamp = new Date().toISOString().slice(11, 19);
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

// ═══════════════════════════════════════════════════════════════════════════
//  HTTP HELPERS
// ═══════════════════════════════════════════════════════════════════════════

async function apiFetch(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.json();
  return { status: response.status, ok: response.ok, body };
}

async function getCategories() {
  return apiFetch(API_ENDPOINTS.categories, {
    headers: AUTH_HEADERS,
  });
}

async function createCategory(title) {
  return apiFetch(API_ENDPOINTS.categories, {
    method: "POST",
    headers: AUTH_HEADERS,
    body: JSON.stringify({ title }),
  });
}

async function createBatchItem(formData) {
  return apiFetch(API_ENDPOINTS.items, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ADMIN_TOKEN}`,
    },
    body: formData,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
//  STEP 1 — Fetch all existing categories
// ═══════════════════════════════════════════════════════════════════════════

async function fetchExistingCategories() {
  log("INFO", "Fetching existing categories...");

  const result = await getCategories();

  if (!result.ok) {
    throw new Error(
      `Failed to fetch categories: ${result.status} ${JSON.stringify(result.body)}`,
    );
  }

  const categories = result.body.result || [];
  log("INFO", `Found ${categories.length} existing categories.`);

  const categoryMap = {};
  for (const cat of categories) {
    categoryMap[cat.title] = cat._id;
  }

  return categoryMap;
}

// ═══════════════════════════════════════════════════════════════════════════
//  STEP 2 — Create missing categories
// ═══════════════════════════════════════════════════════════════════════════

const REQUIRED_CATEGORIES = [TYPE, ...BUNDLE_CATEGORIES];

async function ensureCategories(categoryMap) {
  log("INFO", "Ensuring all required categories exist...");

  for (const title of REQUIRED_CATEGORIES) {
    if (categoryMap[title]) {
      log("OK", `Category "${title}" already exists (id: ${categoryMap[title]})`);
      continue;
    }

    log("ACTION", `Creating category "${title}"...`);
    const result = await createCategory(title);

    if (result.ok) {
      const newId = result.body.result._id || result.body.result.id;
      categoryMap[title] = newId;
      log("OK", `Category "${title}" created (id: ${newId})`);
    } else if (result.status === 409 || result.status === 400) {
      log("WARN", `Category "${title}" may already exist: ${JSON.stringify(result.body)}`);
    } else {
      const message = `Failed to create category "${title}": ${result.status} ${JSON.stringify(result.body)}`;
      if (title === TYPE) {
        throw new Error(message);
      }
      log("WARN", message);
    }
  }

  if (!categoryMap[TYPE]) {
    throw new Error(`"${TYPE}" category is required but could not be created. Aborting.`);
  }

  log("OK", "All categories are ready.");
  return categoryMap;
}

// ═══════════════════════════════════════════════════════════════════════════
//  STEP 3 — Create items
// ═══════════════════════════════════════════════════════════════════════════

function getTierFolders() {
  const entries = fs.readdirSync(ASSETS_DIR, { withFileTypes: true });
  const tierFolders = [];
  const regex = FOLDER_REGEX_BY_TYPE[TYPE];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const match = entry.name.match(regex);
    if (match) {
      tierFolders.push({
        tier: parseInt(match[1], 10),
        folderName: entry.name,
      });
    }
  }

  tierFolders.sort((a, b) => a.tier - b.tier);
  return tierFolders;
}

function buildFilePayloads(tierDir) {
  const files = fs.readdirSync(tierDir);

  const svgaBuffers = [];
  const previewBuffers = [];
  const svgaFlags = [];
  const previewFlags = [];

  for (const category of BUNDLE_CATEGORIES) {
    const hasSvga = files.includes(`${category}.svga`);
    const hasPng = files.includes(`${category}.png`);
    const hasWebp = files.includes(`${category}.webp`);
    const hasPreview = hasPng || hasWebp;

    svgaFlags.push(hasSvga ? "1" : "0");
    previewFlags.push(hasPreview ? "1" : "0");

    if (hasSvga) {
      const filePath = path.join(tierDir, `${category}.svga`);
      svgaBuffers.push({
        buffer: fs.readFileSync(filePath),
        name: `${category}.svga`,
      });
    }

    if (hasPreview) {
      const ext = hasPng ? ".png" : ".webp";
      const filePath = path.join(tierDir, `${category}${ext}`);
      previewBuffers.push({
        buffer: fs.readFileSync(filePath),
        name: `${category}${ext}`,
      });
    }
  }

  return { svgaBuffers, previewBuffers, svgaFlags, previewFlags };
}

async function uploadTier(
  tier,
  categoryId,
  svgaBuffers,
  previewBuffers,
  svgaFlags,
  previewFlags,
  retries = 2,
) {
  const config = getTierConfig(tier);
  const formData = new FormData();

  formData.append("name", `${TYPE}-${tier}`);
  formData.append("categoryId", categoryId);
  formData.append("prices", JSON.stringify([{ validity: config.validity, price: config.price }]));
  formData.append("categoryNames", BUNDLE_CATEGORIES.join(","));
  formData.append("svgaFlags", svgaFlags.join(","));
  formData.append("previewFlags", previewFlags.join(","));

  for (const file of svgaBuffers) {
    formData.append("svgaFile", new Blob([file.buffer]), file.name);
  }

  for (const file of previewBuffers) {
    formData.append("previewFile", new Blob([file.buffer]), file.name);
  }

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    const result = await createBatchItem(formData);

    if (result.ok) {
      return { success: true, status: result.status, body: result.body };
    }

    if (result.status === 409) {
      return { success: true, status: 409, body: result.body, skipped: true };
    }

    if (attempt <= retries) {
      const wait = attempt * 2000;
      log("WARN", `${TYPE}-${tier} attempt ${attempt} failed (${result.status}). Retrying in ${wait}ms...`);
      await sleep(wait);
    } else {
      return {
        success: false,
        status: result.status,
        body: result.body,
      };
    }
  }
}

async function processAllTiers(categoryId) {
  const tierFolders = getTierFolders();
  const results = { created: 0, skipped: 0, failed: 0 };

  log("INFO", `Found ${tierFolders.length} tier folders.`);

  for (const { tier, folderName } of tierFolders) {
    if (tier < START_TIER || tier > END_TIER) {
      log("SKIP", `Tier ${TYPE}-${tier} is outside range [${START_TIER}-${END_TIER}]. Skipping.`);
      continue;
    }

    const tierDir = path.join(ASSETS_DIR, folderName);
    if (!fs.existsSync(tierDir)) {
      log("WARN", `Folder "${folderName}" not found at ${tierDir}. Skipping ${TYPE}-${tier}.`);
      results.skipped++;
      continue;
    }

    log("ACTION", `Processing ${TYPE}-${tier} from folder "${folderName}"...`);

    const { svgaBuffers, previewBuffers, svgaFlags, previewFlags } =
      buildFilePayloads(tierDir);

    log("INFO", `  svgaFlags: ${svgaFlags.join(",")}`);
    log("INFO", `  previewFlags: ${previewFlags.join(",")}`);
    log("INFO", `  svga files: ${svgaBuffers.length}, preview files: ${previewBuffers.length}`);
    log("INFO", `  price: ${getTierConfig(tier).price}, validity: ${getTierConfig(tier).validity}`);

    const result = await uploadTier(
      tier,
      categoryId,
      svgaBuffers,
      previewBuffers,
      svgaFlags,
      previewFlags,
    );

    if (result.skipped) {
      log("SKIP", `${TYPE}-${tier} already exists. Skipping.`);
      results.skipped++;
    } else if (result.success) {
      log("OK", `${TYPE}-${tier} created successfully.`);
      results.created++;
    } else {
      log("FAIL", `${TYPE}-${tier} failed: ${result.status} ${JSON.stringify(result.body)}`);
      results.failed++;
    }
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("");
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log(`║      ${TYPE} Asset Upload Script`.padEnd(54) + "║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log("");

  // ── Validate configuration ──────────────────────────────────────────

  if (!ADMIN_TOKEN) {
    console.error("[ERROR] ADMIN_TOKEN is not set. Please paste your admin token in the script.");
    process.exit(1);
  }

  if (!["SVIP", "VIP"].includes(TYPE)) {
    console.error(`[ERROR] TYPE must be "SVIP" or "VIP", got "${TYPE}".`);
    process.exit(1);
  }

  if (!fs.existsSync(ASSETS_DIR)) {
    console.error(`[ERROR] Assets directory not found: ${ASSETS_DIR}`);
    console.error(`        Please create a '${FOLDER_NAME_BY_TYPE[TYPE]}' folder next to this script`);
    console.error(`        and place the ${TYPE} tier folders inside it.`);
    process.exit(1);
  }

  // ── Step 1 & 2: Categories ──────────────────────────────────────────

  let categoryMap;
  try {
    categoryMap = await fetchExistingCategories();
    categoryMap = await ensureCategories(categoryMap);
  } catch (err) {
    console.error(`[ERROR] Category setup failed: ${err.message}`);
    process.exit(1);
  }

  const categoryId = categoryMap[TYPE];
  log("INFO", `Using ${TYPE} category ID: ${categoryId}`);

  // ── Step 3: Upload tiers ────────────────────────────────────────────

  console.log("");
  log("INFO", `Starting ${TYPE} item upload...`);
  console.log("");

  const results = await processAllTiers(categoryId);

  // ── Summary ─────────────────────────────────────────────────────────

  console.log("");
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║                     SUMMARY                         ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log(`  Created:  ${results.created}`);
  console.log(`  Skipped:  ${results.skipped}`);
  console.log(`  Failed:   ${results.failed}`);
  console.log(`  Total:    ${results.created + results.skipped + results.failed}`);
  console.log("");

  if (results.failed > 0) {
    console.log("  ⚠  Some items failed. Check the logs above for details.");
    console.log("     Fix the issues and re-run the script — it will skip existing items.");
  } else {
    console.log("  ✅  All done!");
  }
  console.log("");
}

main().catch((err) => {
  console.error(`[UNEXPECTED ERROR] ${err.message}`);
  process.exit(1);
});
