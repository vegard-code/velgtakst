// @ts-check
/**
 * Parses takstmann_alle_50_kommuner.md and generates src/data/kommune-seo-content.ts
 * Run with: node scripts/generate-kommune-seo.js
 */

const fs = require('fs');
const path = require('path');

const SOURCE_FILE = path.join(__dirname, '../../../../takstmann_alle_50_kommuner.md');
const OUTPUT_FILE = path.join(__dirname, '../src/data/kommune-seo-content.ts');

// Mapping from kommune display name → slug (from kommuner.ts)
const NAME_TO_SLUG = {
  'Oslo': 'oslo',
  'Bergen': 'bergen',
  'Trondheim': 'trondheim',
  'Stavanger': 'stavanger',
  'Bærum': 'barum',
  'Kristiansand': 'kristiansand',
  'Drammen': 'drammen',
  'Asker': 'asker',
  'Lillestrøm': 'lillestrom',
  'Fredrikstad': 'fredrikstad',
  'Sandnes': 'sandnes',
  'Tromsø': 'tromso',
  'Sandefjord': 'sandefjord',
  'Nordre Follo': 'nordre-follo',
  'Sarpsborg': 'sarpsborg',
  'Tønsberg': 'tonsberg',
  'Ålesund': 'aalesund',
  'Skien': 'skien',
  'Bodø': 'bodo',
  'Moss': 'moss',
  'Lørenskog': 'lorenskog',
  'Larvik': 'larvik',
  'Indre Østfold': 'indre-ostfold',
  'Arendal': 'arendal',
  'Ullensaker': 'ullensaker',
  'Karmøy': 'karmoy',
  'Øygarden': 'oygarden',
  'Haugesund': 'haugesund',
  'Porsgrunn': 'porsgrunn',
  'Ringsaker': 'ringsaker',
  'Hamar': 'hamar',
  'Molde': 'molde',
  'Halden': 'halden',
  'Ringerike': 'ringerike',
  'Gjøvik': 'gjovik',
  'Askøy': 'askoy',
  'Alver': 'alver',
  'Sola': 'sola',
  'Kongsberg': 'kongsberg',
  'Lillehammer': 'lillehammer',
  'Lier': 'lier',
  'Eidsvoll': 'eidsvoll',
  'Horten': 'horten',
  'Færder': 'faerder',
  'Holmestrand': 'holmestrand',
  'Bjørnafjorden': 'os-vestland',
  'Nittedal': 'nittedal',
  'Rana': 'rana',
  'Grimstad': 'grimstad',
  'Harstad': 'harstad',
};

// Reverse map for finding nearby kommune slugs in text
const ALL_KNOWN_NAMES = Object.keys(NAME_TO_SLUG);

/**
 * Remove markdown bold markers and strip metadata-style prefixes
 */
function cleanLine(line) {
  return line.replace(/\*\*(.*?)\*\*/g, '$1').trim();
}

/**
 * Extract a field value from a line like "SEO_TITLE: value" or "**SEO_TITLE:** value"
 */
function extractFieldValue(line, fieldName) {
  const cleaned = cleanLine(line);
  const re = new RegExp(`^${fieldName}:?\\s*(.+)`);
  const m = cleaned.match(re);
  return m ? m[1].trim() : null;
}

/**
 * Try to find known kommune names mentioned in text.
 * Returns array of slugs.
 */
function findNearbyKommuner(text) {
  const found = [];
  for (const name of ALL_KNOWN_NAMES) {
    if (text.includes(name)) {
      found.push(NAME_TO_SLUG[name]);
    }
  }
  return found;
}

/**
 * Parse a single kommune block
 */
function parseBlock(blockText) {
  const lines = blockText.split('\n');
  let i = 0;

  // Skip blank lines at start
  while (i < lines.length && lines[i].trim() === '') i++;

  if (i >= lines.length) return null;

  // Extract header metadata
  let kommuneNavn = '';
  let seoTitle = '';
  let metaDescription = '';
  let h1 = '';

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (/^KOMMUNE:\s*/.test(trimmed)) {
      kommuneNavn = trimmed.replace(/^KOMMUNE:\s*/, '').trim();
    } else if (/^(?:\*\*)?SEO_TITLE:?(?:\*\*)?\s+/.test(trimmed) || trimmed.startsWith('SEO_TITLE:')) {
      seoTitle = cleanLine(trimmed).replace(/^SEO_TITLE:?\s*/, '').trim();
    } else if (/^(?:\*\*)?META_DESCRIPTION:?(?:\*\*)?\s+/.test(trimmed) || trimmed.startsWith('META_DESCRIPTION:')) {
      metaDescription = cleanLine(trimmed).replace(/^META_DESCRIPTION:?\s*/, '').trim();
    } else if (/^(?:\*\*)?H1:?(?:\*\*)?\s+/.test(trimmed) || trimmed.startsWith('H1:')) {
      h1 = cleanLine(trimmed).replace(/^H1:?\s*/, '').trim();
    } else if (/^INTRO:|^### INTRO/.test(trimmed)) {
      i++; // skip INTRO marker line, then break to collect intro text
      break;
    } else if (/^## /.test(trimmed)) {
      break; // No explicit INTRO marker, jump straight to sections
    }
    i++;
  }

  // Skip blank lines after INTRO marker
  while (i < lines.length && lines[i].trim() === '') i++;

  // Collect intro text — everything until next ## or ### SEKSJONER
  const introLines = [];
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (/^## /.test(trimmed) || /^### SEKSJONER|^SEKSJONER:/.test(trimmed)) break;
    introLines.push(lines[i]);
    i++;
  }
  const intro = introLines.join('\n').trim();

  // Skip SEKSJONER marker if present
  if (i < lines.length && /^### SEKSJONER|^SEKSJONER:/.test(lines[i].trim())) {
    i++;
  }

  // Now parse ## sections
  const sections = [];
  const faqItems = [];
  let naerliggendeText = '';
  let inFaq = false;
  let currentFaqQuestion = '';
  let currentFaqAnswerLines = [];
  let currentSectionHeading = '';
  let currentSectionLines = [];

  function flushSection() {
    if (!currentSectionHeading) return;
    const content = currentSectionLines.join('\n').trim();
    if (content) {
      sections.push({ heading: currentSectionHeading, content });
    }
    currentSectionHeading = '';
    currentSectionLines = [];
  }

  function flushFaqItem() {
    if (!currentFaqQuestion) return;
    faqItems.push({
      sporsmal: currentFaqQuestion,
      svar: currentFaqAnswerLines.join('\n').trim(),
    });
    currentFaqQuestion = '';
    currentFaqAnswerLines = [];
  }

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (/^## /.test(trimmed)) {
      // Flush previous section or faq item
      if (inFaq) {
        flushFaqItem();
        inFaq = false;
      } else {
        flushSection();
      }

      const heading = trimmed.replace(/^## /, '').trim();

      if (/nærliggende/i.test(heading)) {
        // Collect nærliggende text
        i++;
        const nearbyLines = [];
        while (i < lines.length && !/^## |^---/.test(lines[i].trim())) {
          nearbyLines.push(lines[i]);
          i++;
        }
        naerliggendeText = nearbyLines.join('\n').trim();
        continue;
      } else if (/ofte stilte spørsmål/i.test(heading)) {
        inFaq = true;
        i++;
        continue;
      } else {
        currentSectionHeading = heading;
        currentSectionLines = [];
        i++;
        continue;
      }
    }

    if (/^### /.test(trimmed) && inFaq) {
      flushFaqItem();
      currentFaqQuestion = trimmed.replace(/^### /, '').trim();
      currentFaqAnswerLines = [];
      i++;
      continue;
    }

    if (inFaq && currentFaqQuestion) {
      // Collect answer lines
      if (trimmed !== '') {
        currentFaqAnswerLines.push(trimmed);
      } else if (currentFaqAnswerLines.length > 0) {
        // Allow blank line within answer (but don't add extra)
      }
      i++;
      continue;
    }

    if (currentSectionHeading) {
      currentSectionLines.push(line);
    }

    i++;
  }

  // Flush any remaining
  if (inFaq) {
    flushFaqItem();
  } else {
    flushSection();
  }

  if (!kommuneNavn) return null;

  const slug = NAME_TO_SLUG[kommuneNavn];
  if (!slug) {
    console.warn(`⚠ No slug found for kommune: "${kommuneNavn}"`);
    return null;
  }

  // Find nearby kommuner mentioned in nærliggende text
  const naerliggendeKommuner = findNearbyKommuner(naerliggendeText);

  return {
    slug,
    seoTitle,
    metaDescription,
    h1,
    intro,
    sections,
    faqItems,
    naerliggendeText,
    naerliggendeKommuner,
  };
}

/**
 * Main
 */
function main() {
  const source = fs.readFileSync(SOURCE_FILE, 'utf-8');

  // Split into blocks by separator lines (dashes or ---)
  // A separator is a line that is only dashes (3+) or "---"
  const rawBlocks = source.split(/\n(?:-{3,})\n/);

  const entries = {};
  let parsed = 0;
  let skipped = 0;

  for (const block of rawBlocks) {
    if (!block.includes('KOMMUNE:')) continue;
    const result = parseBlock(block);
    if (result) {
      entries[result.slug] = {
        seoTitle: result.seoTitle,
        metaDescription: result.metaDescription,
        h1: result.h1,
        intro: result.intro,
        sections: result.sections,
        faqItems: result.faqItems,
        naerliggendeText: result.naerliggendeText,
        naerliggendeKommuner: result.naerliggendeKommuner,
      };
      console.log(`✓ ${result.slug} (${result.faqItems.length} FAQ items, ${result.sections.length} sections)`);
      parsed++;
    } else {
      skipped++;
    }
  }

  console.log(`\nParsed: ${parsed}, Skipped: ${skipped}`);

  // Generate TypeScript file
  const tsContent = `// AUTO-GENERATED by scripts/generate-kommune-seo.js — do not edit manually
// Source: takstmann_alle_50_kommuner.md

export interface KommuneSEOSection {
  heading: string;
  content: string;
}

export interface KommuneSEOFaqItem {
  sporsmal: string;
  svar: string;
}

export interface KommuneSEOContent {
  seoTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;
  sections: KommuneSEOSection[];
  faqItems: KommuneSEOFaqItem[];
  naerliggendeText: string;
  naerliggendeKommuner: string[];
}

export const KOMMUNE_SEO_CONTENT: Record<string, KommuneSEOContent> = ${JSON.stringify(entries, null, 2)};
`;

  fs.writeFileSync(OUTPUT_FILE, tsContent, 'utf-8');
  console.log(`\n✅ Written to ${OUTPUT_FILE}`);
  console.log(`   ${Object.keys(entries).length} kommuner`);
}

main();
