/**
 * Disease types, families, named diseases, and fixed constants.
 * All values are normative from the spec — do not modify to make tests pass.
 */

// ── Fixed constants ──────────────────────────────────────────────────────────

export const TOTAL_BURDEN = 2.5e9;       // 2.5 billion DALYs/yr
export const BASELINE_LE = 73.3;
export const LE_GAIN_CAP = 16.7;         // disease-only ceiling: 73.3 + 16.7 = 90
export const PANDEMIC_RESERVE = 150;
export const START_YEAR = 2026;
export const END_YEAR = 2300;
export const MAX_EVENTS = 60;
export const TOTAL_FAMILIES = 24;

// ── Type metadata ────────────────────────────────────────────────────────────

export interface TypeInfo {
  name: string;
  known: number;
  poolShare: number;
  burdenShare: number;
  medianDiff: number;
  familyCount: number;
  familyStartIdx: number;
}

export const TYPE_INFO: readonly TypeInfo[] = [
  /*0*/ { name: 'Infectious',       known: 2500,  poolShare: 0.10, burdenShare: 0.25, medianDiff: 7,  familyCount: 6, familyStartIdx: 0  },
  /*1*/ { name: 'Genetic and rare', known: 8000,  poolShare: 0.80, burdenShare: 0.03, medianDiff: 9,  familyCount: 7, familyStartIdx: 6  },
  /*2*/ { name: 'Chronic',          known: 3000,  poolShare: 0,    burdenShare: 0.55, medianDiff: 28, familyCount: 6, familyStartIdx: 13 },
  /*3*/ { name: 'Neuro and mental', known: 1500,  poolShare: 0,    burdenShare: 0.12, medianDiff: 40, familyCount: 3, familyStartIdx: 19 },
  /*4*/ { name: 'Autoimmune',       known: 700,   poolShare: 0,    burdenShare: 0.02, medianDiff: 22, familyCount: 1, familyStartIdx: 22 },
  /*5*/ { name: 'Other',            known: 1300,  poolShare: 0.10, burdenShare: 0.03, medianDiff: 12, familyCount: 1, familyStartIdx: 23 },
];

// ── Family metadata ──────────────────────────────────────────────────────────

export interface FamilyInfo {
  name: string;
  platform: string;
  typeIdx: number;
}

export const FAMILIES: readonly FamilyInfo[] = [
  // Type 0 — Infectious (6 families, global indices 0-5)
  { name: 'respiratory virus',          platform: 'a universal respiratory vaccine',    typeIdx: 0 },
  { name: 'hemorrhagic and arboviral',  platform: 'a broad-spectrum antiviral',         typeIdx: 0 },
  { name: 'bacterial',                  platform: 'engineered phage therapy',           typeIdx: 0 },
  { name: 'parasitic',                  platform: 'gene-drive vector control',          typeIdx: 0 },
  { name: 'fungal',                     platform: 'an antifungal peptide platform',     typeIdx: 0 },
  { name: 'chronic viral',              platform: 'in-vivo viral excision',             typeIdx: 0 },
  // Type 1 — Genetic and rare (7 families, global indices 6-12)
  { name: 'metabolic',                      platform: 'in-vivo base editing',               typeIdx: 1 },
  { name: 'lysosomal storage',              platform: 'next-generation enzyme replacement',  typeIdx: 1 },
  { name: 'neuromuscular',                  platform: 'an antisense oligo platform',         typeIdx: 1 },
  { name: 'inherited blood',                platform: 'one-shot gene editing',               typeIdx: 1 },
  { name: 'mitochondrial',                  platform: 'mitochondrial gene therapy',          typeIdx: 1 },
  { name: 'skeletal and connective tissue', platform: 'prime editing',                       typeIdx: 1 },
  { name: 'ciliopathy and rare syndrome',   platform: 'programmable tRNA therapy',           typeIdx: 1 },
  // Type 2 — Chronic (6 families, global indices 13-18)
  { name: 'cardiovascular',        platform: 'cardiometabolic gene silencing',     typeIdx: 2 },
  { name: 'solid tumor',           platform: 'personalized cancer vaccines',       typeIdx: 2 },
  { name: 'blood cancer',          platform: 'in-vivo CAR-T',                     typeIdx: 2 },
  { name: 'metabolic and endocrine', platform: 'beta-cell regeneration',           typeIdx: 2 },
  { name: 'chronic respiratory',   platform: 'lung tissue regeneration',           typeIdx: 2 },
  { name: 'kidney and liver',      platform: 'an organ-regeneration platform',     typeIdx: 2 },
  // Type 3 — Neuro and mental (3 families, global indices 19-21)
  { name: 'neurodegenerative',       platform: 'a brain-shuttle delivery system',      typeIdx: 3 },
  { name: 'psychiatric',             platform: 'precision circuit neuromodulation',    typeIdx: 3 },
  { name: 'epilepsy and neurological', platform: 'neural gene regulation',             typeIdx: 3 },
  // Type 4 — Autoimmune (1 family, global index 22)
  { name: 'autoimmune', platform: 'immune-reset therapy', typeIdx: 4 },
  // Type 5 — Other (1 family, global index 23)
  { name: 'eye, skin and musculoskeletal', platform: 'regenerative tissue engineering', typeIdx: 5 },
];

// ── Named diseases ───────────────────────────────────────────────────────────
// Indices 0-32 in the disease array. Burden in DALYs (raw).

export interface NamedDiseaseInfo {
  name: string;
  typeIdx: number;
  familyGlobalIdx: number;
  burden: number;    // in DALYs
  difficulty: number;
}

export const NAMED_DISEASES: readonly NamedDiseaseInfo[] = [
  /*  0 */ { name: 'Ischemic heart disease',       typeIdx: 2, familyGlobalIdx: 13, burden: 190e6,  difficulty: 60 },
  /*  1 */ { name: 'Stroke',                       typeIdx: 2, familyGlobalIdx: 13, burden: 160e6,  difficulty: 60 },
  /*  2 */ { name: 'COPD',                         typeIdx: 2, familyGlobalIdx: 17, burden: 80e6,   difficulty: 50 },
  /*  3 */ { name: 'Diabetes',                     typeIdx: 2, familyGlobalIdx: 16, burden: 75e6,   difficulty: 45 },
  /*  4 */ { name: 'Lung cancer',                  typeIdx: 2, familyGlobalIdx: 14, burden: 50e6,   difficulty: 70 },
  /*  5 */ { name: 'Chronic kidney disease',       typeIdx: 2, familyGlobalIdx: 18, burden: 45e6,   difficulty: 45 },
  /*  6 */ { name: 'Cirrhosis',                    typeIdx: 2, familyGlobalIdx: 18, burden: 45e6,   difficulty: 35 },
  /*  7 */ { name: 'Colorectal cancer',            typeIdx: 2, familyGlobalIdx: 14, burden: 25e6,   difficulty: 50 },
  /*  8 */ { name: 'Breast cancer',                typeIdx: 2, familyGlobalIdx: 14, burden: 20e6,   difficulty: 45 },
  /*  9 */ { name: 'Stomach cancer',               typeIdx: 2, familyGlobalIdx: 14, burden: 22e6,   difficulty: 50 },
  /* 10 */ { name: 'Liver cancer',                 typeIdx: 2, familyGlobalIdx: 14, burden: 16e6,   difficulty: 60 },
  /* 11 */ { name: 'Asthma',                       typeIdx: 2, familyGlobalIdx: 17, burden: 21e6,   difficulty: 30 },
  /* 12 */ { name: 'Leukemia',                     typeIdx: 2, familyGlobalIdx: 15, burden: 12e6,   difficulty: 40 },
  /* 13 */ { name: 'Pancreatic cancer',            typeIdx: 2, familyGlobalIdx: 14, burden: 11e6,   difficulty: 85 },
  /* 14 */ { name: 'Lower respiratory infections', typeIdx: 0, familyGlobalIdx: 0,  burden: 100e6,  difficulty: 20 },
  /* 15 */ { name: 'Diarrheal diseases',           typeIdx: 0, familyGlobalIdx: 2,  burden: 60e6,   difficulty: 10 },
  /* 16 */ { name: 'Tuberculosis',                 typeIdx: 0, familyGlobalIdx: 2,  burden: 45e6,   difficulty: 20 },
  /* 17 */ { name: 'HIV/AIDS',                     typeIdx: 0, familyGlobalIdx: 5,  burden: 40e6,   difficulty: 35 },
  /* 18 */ { name: 'Malaria',                      typeIdx: 0, familyGlobalIdx: 3,  burden: 45e6,   difficulty: 25 },
  /* 19 */ { name: 'Dengue',                       typeIdx: 0, familyGlobalIdx: 1,  burden: 3e6,    difficulty: 15 },
  /* 20 */ { name: 'Measles',                      typeIdx: 0, familyGlobalIdx: 0,  burden: 4e6,    difficulty: 5  },
  /* 21 */ { name: 'Hepatitis B',                  typeIdx: 0, familyGlobalIdx: 5,  burden: 10e6,   difficulty: 18 },
  /* 22 */ { name: "Alzheimer's disease",          typeIdx: 3, familyGlobalIdx: 19, burden: 35e6,   difficulty: 90 },
  /* 23 */ { name: 'Depression',                   typeIdx: 3, familyGlobalIdx: 20, burden: 55e6,   difficulty: 60 },
  /* 24 */ { name: 'Anxiety disorders',            typeIdx: 3, familyGlobalIdx: 20, burden: 45e6,   difficulty: 55 },
  /* 25 */ { name: 'Schizophrenia',                typeIdx: 3, familyGlobalIdx: 20, burden: 15e6,   difficulty: 80 },
  /* 26 */ { name: "Parkinson's disease",          typeIdx: 3, familyGlobalIdx: 19, burden: 7e6,    difficulty: 70 },
  /* 27 */ { name: 'Epilepsy',                     typeIdx: 3, familyGlobalIdx: 21, burden: 14e6,   difficulty: 45 },
  /* 28 */ { name: 'Multiple sclerosis',           typeIdx: 3, familyGlobalIdx: 19, burden: 2e6,    difficulty: 50 },
  /* 29 */ { name: 'Lupus',                        typeIdx: 4, familyGlobalIdx: 22, burden: 1e6,    difficulty: 45 },
  /* 30 */ { name: 'Rheumatoid arthritis',         typeIdx: 4, familyGlobalIdx: 22, burden: 3.5e6,  difficulty: 40 },
  /* 31 */ { name: 'Sickle cell disease',          typeIdx: 1, familyGlobalIdx: 9,  burden: 8e6,    difficulty: 12 },
  /* 32 */ { name: 'Cystic fibrosis',              typeIdx: 1, familyGlobalIdx: 6,  burden: 0.3e6,  difficulty: 10 },
];

/** Flat array of disease names indexed by nameIdx. */
export const DISEASE_NAMES: readonly string[] = NAMED_DISEASES.map(d => d.name);

/** Total known diseases across all types. */
export const TOTAL_KNOWN: number = TYPE_INFO.reduce((s, t) => s + t.known, 0); // 17,000
