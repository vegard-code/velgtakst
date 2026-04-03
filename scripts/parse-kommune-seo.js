#!/usr/bin/env node
// Parser script: reads batch markdown files and appends new entries to kommune-seo-content.ts

const fs = require('fs');
const path = require('path');

const BASE = 'C:/Users/vegar/AppData/Roaming/Claude/local-agent-mode-sessions/54b41aab-506b-42ad-bc98-a359f8198cf0/e40b4baa-657b-463e-befe-def27821eb9c';

const BATCH_FILES = [
  `${BASE}/local_738d441c-7a61-40e1-b978-8453d8569908/outputs/takstmann-kommune-seo-content.md`,
  `${BASE}/local_278cc17a-4274-4d1a-956f-acdeaf18f0de/outputs/innlandet-kommuner-seo-content.md`,
  `${BASE}/local_5dbbf502-5f9b-41b0-9be2-8209765054f7/outputs/takstmann-kommune-seo-telemark-agder.md`,
  `${BASE}/local_bc702cd1-a770-410b-b084-9178f6aadc33/outputs/takstmann_kommune_content.md`,
  `${BASE}/local_9f99982b-0001-4114-a057-78d294dc1921/outputs/more-og-romsdal-kommuner.md`,
  `${BASE}/local_9f99982b-0001-4114-a057-78d294dc1921/outputs/trondelag-kommuner.md`,
  `${BASE}/local_effb0b14-b8c1-40ca-9773-6802b96d21e1/outputs/takstmann-kommune-content-nordland-troms-finnmark.md`,
];

const TS_FILE = path.join(__dirname, '../src/data/kommune-seo-content.ts');

// Read existing slugs to avoid duplicates
const existingContent = fs.readFileSync(TS_FILE, 'utf-8');
const existingSlugs = new Set();
const existingSlugMatches = existingContent.matchAll(/^  "([a-z][a-z0-9-]*)": \{/gm);
for (const m of existingSlugMatches) {
  existingSlugs.add(m[1]);
}
console.log(`Found ${existingSlugs.size} existing entries:`, [...existingSlugs].join(', '));

function escapeStr(s) {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, ' ')
    .trim();
}

function parseKommuneBlocks(content) {
  // Split on --- lines to get blocks, then find ones with ## headings
  const blocks = content.split(/\n---+\n/);
  const results = [];

  for (const block of blocks) {
    const lines = block.split('\n');
    let slug = null;
    let kommuneName = null;
    let intro = '';
    const sections = [];
    const faqItems = [];

    let i = 0;

    // Find ## heading
    while (i < lines.length) {
      const line = lines[i].trim();
      if (line.startsWith('## ')) {
        kommuneName = line.replace(/^## /, '').trim();
        i++;
        break;
      }
      i++;
    }

    if (!kommuneName) continue;

    // Find SLUG:
    while (i < lines.length) {
      const line = lines[i].trim();
      if (line.startsWith('SLUG:')) {
        slug = line.replace(/^SLUG:\s*/, '').trim();
        i++;
        break;
      }
      i++;
    }

    if (!slug) continue;

    // Find INTRO: and collect intro text
    let inIntro = false;
    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();
      if (trimmed === 'INTRO:') {
        inIntro = true;
        i++;
        continue;
      }
      if (inIntro) {
        if (trimmed.startsWith('### ') || trimmed.startsWith('## ')) {
          break;
        }
        intro += (intro ? ' ' : '') + trimmed;
        i++;
        continue;
      }
      i++;
    }

    // Parse ### sections and FAQ
    let currentSectionHeading = null;
    let currentSectionContent = [];
    let inFaq = false;
    let currentQuestion = null;
    let currentAnswer = [];

    function flushSection() {
      if (currentSectionHeading && currentSectionContent.length > 0) {
        const content = currentSectionContent.join(' ').trim();
        if (content) {
          sections.push({ heading: currentSectionHeading, content });
        }
      }
      currentSectionHeading = null;
      currentSectionContent = [];
    }

    function flushFaq() {
      if (currentQuestion && currentAnswer.length > 0) {
        faqItems.push({
          sporsmal: currentQuestion,
          svar: currentAnswer.join(' ').trim()
        });
      }
      currentQuestion = null;
      currentAnswer = [];
    }

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed.startsWith('### FAQ')) {
        flushSection();
        inFaq = true;
        i++;
        continue;
      }

      if (trimmed.startsWith('### ')) {
        if (inFaq) {
          flushFaq();
        } else {
          flushSection();
        }
        inFaq = false;
        currentSectionHeading = trimmed.replace(/^### /, '').trim();
        currentSectionContent = [];
        i++;
        continue;
      }

      if (inFaq) {
        // FAQ: **Question?** on one line, then answer lines
        if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
          flushFaq();
          currentQuestion = trimmed.replace(/^\*\*/, '').replace(/\*\*$/, '').trim();
          currentAnswer = [];
        } else if (currentQuestion && trimmed) {
          currentAnswer.push(trimmed);
        }
      } else if (currentSectionHeading !== null) {
        if (trimmed) {
          currentSectionContent.push(trimmed);
        }
      }

      i++;
    }

    if (inFaq) {
      flushFaq();
    } else {
      flushSection();
    }

    results.push({ slug, kommuneName, intro: intro.trim(), sections, faqItems });
  }

  return results;
}

function generateEntry(slug, kommuneName, intro, sections, faqItems) {
  const seoTitle = `Takstmann ${kommuneName} | Finn og bestill takstmann i ${kommuneName}`;
  const metaDescription = `Finn takstmann i ${kommuneName} for tilstandsrapport, verditakst, skadetakst og overtakelse. Sammenlign profiler og bestill direkte.`;
  const h1 = `Takstmann i ${kommuneName}`;
  const naerliggendeText = `${kommuneName} har nærliggende kommuner med egne boligmarkeder og takstmenn som dekker regionen.`;

  let out = `  "${slug}": {\n`;
  out += `    "seoTitle": "${escapeStr(seoTitle)}",\n`;
  out += `    "metaDescription": "${escapeStr(metaDescription)}",\n`;
  out += `    "h1": "${escapeStr(h1)}",\n`;
  out += `    "intro": "${escapeStr(intro)}",\n`;
  out += `    "sections": [\n`;
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    out += `      {\n`;
    out += `        "heading": "${escapeStr(s.heading)}",\n`;
    out += `        "content": "${escapeStr(s.content)}"\n`;
    out += `      }${i < sections.length - 1 ? ',' : ''}\n`;
  }
  out += `    ],\n`;
  out += `    "faqItems": [\n`;
  for (let i = 0; i < faqItems.length; i++) {
    const f = faqItems[i];
    out += `      {\n`;
    out += `        "sporsmal": "${escapeStr(f.sporsmal)}",\n`;
    out += `        "svar": "${escapeStr(f.svar)}"\n`;
    out += `      }${i < faqItems.length - 1 ? ',' : ''}\n`;
  }
  out += `    ],\n`;
  out += `    "naerliggendeText": "${escapeStr(naerliggendeText)}",\n`;
  out += `    "naerliggendeKommuner": []\n`;
  out += `  }`;

  return out;
}

// Parse all batches
const allKommuner = [];
for (const file of BATCH_FILES) {
  console.log(`\nParsing: ${path.basename(file)}`);
  const content = fs.readFileSync(file, 'utf-8');
  const kommuner = parseKommuneBlocks(content);
  console.log(`  Found ${kommuner.length} kommuner`);
  for (const k of kommuner) {
    console.log(`    ${k.slug}: sections=${k.sections.length}, faq=${k.faqItems.length}, intro=${k.intro.length > 0 ? 'OK' : 'MISSING'}`);
  }
  allKommuner.push(...kommuner);
}

// Filter duplicates and existing
const seen = new Set();
const newKommuner = [];
const skipped = [];
for (const k of allKommuner) {
  if (existingSlugs.has(k.slug)) {
    skipped.push(`${k.slug} (already exists)`);
  } else if (seen.has(k.slug)) {
    skipped.push(`${k.slug} (duplicate in batch files)`);
  } else {
    seen.add(k.slug);
    newKommuner.push(k);
  }
}

console.log(`\nSkipped: ${skipped.length} entries`);
if (skipped.length > 0) console.log(' ', skipped.join(', '));
console.log(`New entries to add: ${newKommuner.length}`);

// Generate the new TS entries
const newEntries = newKommuner
  .map(k => generateEntry(k.slug, k.kommuneName, k.intro, k.sections, k.faqItems))
  .join(',\n');

// Append before the closing };
const updated = existingContent.replace(
  /\n\};\s*$/,
  `,\n${newEntries}\n};\n`
);

if (updated === existingContent) {
  console.error('ERROR: Could not find the closing }; to replace!');
  process.exit(1);
}

fs.writeFileSync(TS_FILE, updated, 'utf-8');

// Count final entries
const finalMatches = [...updated.matchAll(/^  "[a-z][a-z0-9-]*": \{/gm)];
console.log(`\nDone! Total entries in file: ${finalMatches.length}`);
console.log(`(was ${existingSlugs.size}, added ${newKommuner.length})`);
