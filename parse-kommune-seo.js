#!/usr/bin/env node
// Parser: takstmann_alle_50_kommuner.md → src/data/kommune-seo-content.ts

const fs = require('fs');
const path = require('path');

// Explicit mapping from kommune name (as in source file) to KOMMUNER.ts id
const KOMMUNE_NAME_TO_ID = {
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

// Extract H2 sections and their content using line-by-line parsing
function extractSections(lines) {
  const sections = [];
  let currentTitle = null;
  let currentLines = [];

  for (const line of lines) {
    if (/^##\s+/.test(line) && !/^###/.test(line)) {
      if (currentTitle !== null) {
        sections.push({ title: currentTitle, content: currentLines.join('\n').trim() });
      }
      currentTitle = line.replace(/^##\s+/, '').trim();
      currentLines = [];
    } else if (currentTitle !== null) {
      currentLines.push(line);
    }
  }
  if (currentTitle !== null) {
    sections.push({ title: currentTitle, content: currentLines.join('\n').trim() });
  }
  return sections;
}

// Extract FAQ items (### question / answer pairs) from FAQ section content
function extractFaqItems(content) {
  const items = [];
  const lines = content.split('\n');
  let currentQ = null;
  let currentLines = [];

  for (const line of lines) {
    if (/^###\s+/.test(line)) {
      if (currentQ !== null) {
        const answer = currentLines.join('\n').trim();
        if (answer) items.push({ question: currentQ, answer });
      }
      currentQ = line.replace(/^###\s+/, '').trim();
      currentLines = [];
    } else if (currentQ !== null) {
      currentLines.push(line);
    }
  }
  if (currentQ !== null) {
    const answer = currentLines.join('\n').trim();
    if (answer) items.push({ question: currentQ, answer });
  }
  return items;
}

const srcPath = path.join(__dirname, 'takstmann_alle_50_kommuner.md');
let content = fs.readFileSync(srcPath, 'utf8');

// Fix known Bergen error before parsing
content = content.replace(/specialisert/g, 'spesialisert');

// Split into blocks by separator lines (--- or many dashes)
const blocks = content.split(/^-{3,}\s*$/m).filter(b => b.trim().length > 0);

const result = {};

for (const block of blocks) {
  // Extract kommune name (handles **KOMMUNE:** bold markdown or plain KOMMUNE:)
  const kommuneMatch = block.match(/^\*{0,2}KOMMUNE:\*{0,2}\s*(.+)$/m);
  if (!kommuneMatch) continue;

  const kommuneName = kommuneMatch[1].trim();
  const slug = KOMMUNE_NAME_TO_ID[kommuneName];
  if (!slug) {
    console.warn(`WARNING: No ID mapping for kommune: "${kommuneName}"`);
    continue;
  }

  const lines = block.split('\n');

  // --- Extract INTRO ---
  let intro = '';

  // Format D: ### INTRO ... ### SEKSJONER
  const introD = block.match(/^###\s+INTRO\s*\n+([\s\S]+?)(?=\n###\s+SEKSJONER)/m);
  if (introD) {
    intro = introD[1].trim();
  } else {
    // Format A/B/C: INTRO: label followed by content until first ## or SEKSJONER:
    const introABC = block.match(/^INTRO:\s*\n([\s\S]+?)(?=\n##\s|\nSEKSJONER:)/m);
    if (introABC) {
      intro = introABC[1].trim();
    }
  }

  // --- Extract all H2 sections using line-by-line ---
  const allSections = extractSections(lines);

  // Separate FAQ section from informational sections
  const SKIP_TITLES = ['nærliggende', 'naerliggende', 'andre kommuner', 'se andre fylker'];
  const FAQ_KEYWORDS = ['spørsmål', 'sporsmal', 'ofte stilte'];

  const faqSection = allSections.find(s =>
    FAQ_KEYWORDS.some(kw => s.title.toLowerCase().includes(kw))
  );

  const sections = allSections.filter(s => {
    const lower = s.title.toLowerCase();
    return !FAQ_KEYWORDS.some(kw => lower.includes(kw)) &&
           !SKIP_TITLES.some(kw => lower.includes(kw));
  });

  // --- Extract FAQ items ---
  const faqItems = faqSection ? extractFaqItems(faqSection.content) : [];

  result[slug] = { intro, sections, faqItems };
}

// Generate TypeScript file
let ts = `// Auto-generated from takstmann_alle_50_kommuner.md
// Run: node parse-kommune-seo.js to regenerate
// DO NOT EDIT MANUALLY

export interface KommuneSEOContent {
  intro: string;
  sections: { title: string; content: string }[];
  faqItems: { question: string; answer: string }[];
}

export const kommuneSEOContent: Record<string, KommuneSEOContent> = {
`;

for (const [slug, data] of Object.entries(result)) {
  ts += `  ${JSON.stringify(slug)}: {\n`;
  ts += `    intro: ${JSON.stringify(data.intro)},\n`;
  ts += `    sections: [\n`;
  for (const s of data.sections) {
    ts += `      { title: ${JSON.stringify(s.title)}, content: ${JSON.stringify(s.content)} },\n`;
  }
  ts += `    ],\n`;
  ts += `    faqItems: [\n`;
  for (const f of data.faqItems) {
    ts += `      { question: ${JSON.stringify(f.question)}, answer: ${JSON.stringify(f.answer)} },\n`;
  }
  ts += `    ],\n`;
  ts += `  },\n`;
}

ts += `};\n`;

const outPath = path.join(__dirname, 'src/data/kommune-seo-content.ts');
fs.writeFileSync(outPath, ts);

const counts = {
  total: Object.keys(result).length,
  withIntro: Object.values(result).filter(r => r.intro.length > 0).length,
  withSections: Object.values(result).filter(r => r.sections.length > 0).length,
  withFaq: Object.values(result).filter(r => r.faqItems.length > 0).length,
};

console.log(`Generated ${counts.total} kommune entries:`);
console.log(`  - ${counts.withIntro} with intro text`);
console.log(`  - ${counts.withSections} with sections`);
console.log(`  - ${counts.withFaq} with FAQ items`);
console.log(`Output: ${outPath}`);

// Report issues
let issues = 0;
for (const [slug, data] of Object.entries(result)) {
  const problems = [];
  if (!data.intro) problems.push('NO INTRO');
  if (data.sections.length === 0) problems.push('NO SECTIONS');
  if (data.faqItems.length === 0) problems.push('NO FAQ');
  if (problems.length > 0) {
    console.log(`  ${slug}: ${problems.join(', ')}`);
    issues++;
  }
}
if (issues === 0) console.log('All entries parsed successfully!');
