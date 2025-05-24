// scripts/merge_curriculum_metadata.js
const fs = require("fs");
const path = require("path");

// File paths
const eventsPath = path.join(__dirname, "../public/data/events.json");
const curriculumBackupPath = path.join(__dirname, "../src/data/backup_with_curriculum_tags.json");
const outputPath = path.join(__dirname, "../public/data/events.enriched.json");

const FIELDS_TO_MERGE = [
  "levels",
  "curriculum_tags",
  "curriculum_theme_ids",
  "objective",
  "language",
  "mode",
  "source",
  "created_at"
];

// Load JSON files
const mainEvents = JSON.parse(fs.readFileSync(eventsPath, "utf-8"));
const curriculumEvents = JSON.parse(fs.readFileSync(curriculumBackupPath, "utf-8"));

// Index curriculum events by normalized key
const buildKey = (e) => `${e.title?.trim().toLowerCase()}::${e.year}`;
const curriculumMap = {};
curriculumEvents.forEach(e => {
  if (e.title && e.year) {
    curriculumMap[buildKey(e)] = e;
  }
});

let enrichedCount = 0;

const enriched = mainEvents.map(event => {
  const key = buildKey(event);
  const match = curriculumMap[key];
  if (!match) return event;

  FIELDS_TO_MERGE.forEach(field => {
    if (match[field] !== undefined) {
      event[field] = match[field];
    }
  });

  enrichedCount += 1;
  return event;
});

fs.writeFileSync(outputPath, JSON.stringify(enriched, null, 2), "utf-8");

console.log(`✅ Merged curriculum metadata into ${enrichedCount} events.`);
console.log(`📄 Output written to: ${outputPath}`);