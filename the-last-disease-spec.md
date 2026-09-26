# The Last Disease: Full Application Spec

Sep 26, 2026 · @Ben

## 1. Overview

The Last Disease is a zero-player simulation that answers one question: in what year will AI-driven medicine eradicate diseases faster than new ones are discovered? That year is the crossover, and it ends the game. The viewer picks one input, how AI grows, then watches decades of research, trials, pandemics, breakthroughs, and regulation play out on a live graph.

This spec describes a complete web application: a React front end that animates runs in the browser, a TypeScript back end that saves, shares, and batch-runs simulations, and a shared simulation engine used by both. A working single-file prototype already exists. This spec reproduces it exactly and adds persistence, sharing, and Monte Carlo analysis.

### How to use this spec in Google Antigravity

1. Start a new workspace and paste this entire document into the Agent Manager as the task, in Planning mode.
2. Tell the agent: "Build this application exactly as specified. Sections 3 to 5 are normative: implement every formula and constant as written. Follow the build plan in Section 10 milestone by milestone, and run the Section 9 tests before moving on."
3. Review the agent's implementation plan artifact before approving it. Check that it keeps the simulation engine in a shared package with no UI or server dependencies.
4. After each milestone, use the browser subagent to open the app and compare it against the screenshots described in Section 6.

### Scope for version 1

- One setup input (growth shape), with everything else adjustable in a Settings panel.
- A deterministic, seeded simulation engine that runs identically in the browser and on the server.
- A main multi-variable line graph, two supporting charts, live stats, an event log, and an end-of-run results modal.
- Saving and sharing runs by link, and a batch endpoint that runs hundreds of seeds and returns outcome distributions.
- Light and dark themes, mobile-first responsive layout, and keyboard and screen reader support.

Out of scope for version 1: user accounts, multiplayer, and editing the disease catalog through the UI.

## 2. Tech stack and architecture

The app is a TypeScript monorepo with three packages. The simulation engine is pure, deterministic TypeScript with zero dependencies, so the browser can animate a run year by year while the server replays the exact same run from a seed.

| Layer | Choice | Why |
| --- | --- | --- |
| Monorepo | pnpm workspaces | One install, shared types across packages |
| Engine | `packages/engine`, plain TypeScript, no dependencies | Runs in browser, Node, and a Web Worker unchanged |
| Front end | `apps/web`: React 18, Vite, TypeScript, CSS Modules | Fast dev loop; charts drawn on HTML canvas by hand |
| Back end | `apps/api`: Node 20, Fastify, TypeScript, Zod validation | Small, fast, typed request schemas |
| Database | PostgreSQL 16 via Drizzle ORM (SQLite allowed for local dev) | Stores saved runs and batch results |
| Batch work | Node `worker_threads` pool inside the API | Monte Carlo runs without blocking requests |
| Tests | Vitest (engine and API), Playwright (UI) | Same runner for unit and calibration tests |
| Fonts | Schibsted Grotesk from Google Fonts, system-ui fallback | Matches the prototype |

Do not add a charting library. Every chart is drawn with the Canvas 2D API so the look matches the prototype exactly.

### Folder layout

```
the-last-disease/
  packages/engine/src/
    rng.ts            mulberry32 + Box-Muller gaussian
    catalog.ts        disease types, families, named diseases
    params.ts         Params type, DEFAULTS, ranges, presets
    init.ts           createSim(params) -> SimState
    step.ts           step(state) -> void (one simulated year)
    metrics.ts        recompute(state): counts, burden, averted
    format.ts         fmtBig and number formatting
    index.ts          public API
  apps/web/src/
    App.tsx, components/, charts/, hooks/useSimulation.ts, styles/tokens.css
  apps/api/src/
    server.ts, routes/runs.ts, routes/batch.ts, workers/batchWorker.ts, db/schema.ts
```

### Data flow

1. The viewer picks a growth shape and presses Start run. The front end builds a `Params` object from the choice plus current Settings, and picks a seed if none is set.
2. The front end calls `createSim(params)` and then `step(state)` on a timer, 1 to 10 simulated years per second. After each step it redraws the graph, stats, and log from `state.hist` and `state.events`.
3. When the run ends, the front end shows the results modal. Save posts `{params, seed}` to the API, which replays the run server-side to verify it and stores the summary. The returned share link reloads the same run anywhere.
4. The Monte Carlo view posts params and a seed count to the batch endpoint, which runs every seed in worker threads and returns crossover-year and escape-velocity distributions.

### Engine API contract

```
createSim(params: Params): SimState
step(state: SimState): void            // advances exactly one year, mutates state
runToEnd(params: Params): RunSummary   // loops step until state.done
summarize(state: SimState): RunSummary
```

`SimState.hist` is an array of one `YearRecord` per year, starting with 2026. `SimState.events` is the log, newest first, capped at 60 entries. The engine must never read the clock, `Math.random`, or the DOM: all randomness comes from the seeded generator.

## 3. Simulation data model and initialization

The world holds about 42,150 individual diseases: 17,000 known in 2026, a pool of undiscovered ones (25,000 by default), and 150 reserve slots for future pandemics. Each disease moves through five stages, and every number below is normative.

### Random numbers

All randomness uses mulberry32 seeded with `params.seed` (a seed of 0 means "pick a random seed from 1 to 1,000,000 and record it"). Gaussian draws use Box-Muller.

```
function mulberry32(a) { return function() {
  a |= 0; a = a + 0x6D2B79F5 | 0;
  let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296; } }
gauss(): u, v = rnd() re-drawn while 0; return sqrt(-2 ln u) * cos(2 pi v)
```

The order of random draws matters for reproducibility. Implement initialization and each step in exactly the order written in Sections 3 and 4.

### Disease record

Store diseases as parallel typed arrays of length N for speed, not as objects.

| Field | Type | Meaning |
| --- | --- | --- |
| type | Uint8 | Index into the six disease types |
| fam | Uint8 | Global family index, 0 to 23 |
| stage | Uint8 | 0 undiscovered, 1 research, 2 clinical trials, 3 global rollout, 4 eradicated |
| kind | Uint8 | 0 known in 2026, 1 undiscovered pool, 2 pandemic reserve |
| prog | Float64 | Research discoveries accumulated |
| diff | Float64 | Discoveries needed to enter trials |
| burden | Float64 | Healthy life years (DALYs) lost per year |
| timer | Float64 | Years left in trials or rollout |
| nameIdx | Int16 | Index into the named disease list, or -1 |

### Disease types and families

Total global burden is 2.5 billion DALYs per year. Each type gets a fixed share. Families are listed in order, and each has one platform technology used by spillover breakthroughs.

| Index | Type | Known in 2026 | Pool share | Burden share | Median difficulty | Families (platform technology) |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Infectious | 2,500 | 0.10 | 0.25 | 7 | respiratory virus (a universal respiratory vaccine); hemorrhagic and arboviral (a broad-spectrum antiviral); bacterial (engineered phage therapy); parasitic (gene-drive vector control); fungal (an antifungal peptide platform); chronic viral (in-vivo viral excision) |
| 1 | Genetic and rare | 8,000 | 0.80 | 0.03 | 9 | metabolic (in-vivo base editing); lysosomal storage (next-generation enzyme replacement); neuromuscular (an antisense oligo platform); inherited blood (one-shot gene editing); mitochondrial (mitochondrial gene therapy); skeletal and connective tissue (prime editing); ciliopathy and rare syndrome (programmable tRNA therapy) |
| 2 | Chronic | 3,000 | 0 | 0.55 | 28 | cardiovascular (cardiometabolic gene silencing); solid tumor (personalized cancer vaccines); blood cancer (in-vivo CAR-T); metabolic and endocrine (beta-cell regeneration); chronic respiratory (lung tissue regeneration); kidney and liver (an organ-regeneration platform) |
| 3 | Neuro and mental | 1,500 | 0 | 0.12 | 40 | neurodegenerative (a brain-shuttle delivery system); psychiatric (precision circuit neuromodulation); epilepsy and neurological (neural gene regulation) |
| 4 | Autoimmune | 700 | 0 | 0.02 | 22 | autoimmune (immune-reset therapy) |
| 5 | Other | 1,300 | 0.10 | 0.03 | 12 | eye, skin and musculoskeletal (regenerative tissue engineering) |

Global family index = the sum of family counts of all earlier types plus the family's position within its type. There are 24 families.

### Named diseases

These 33 diseases are created first, in this order, at array indices 0 to 32. Their names appear in the event log. Burden is in millions of DALYs per year.

| # | Name | Type | Family | Burden (M) | Difficulty |
| --- | --- | --- | --- | --- | --- |
| 0 | Ischemic heart disease | Chronic | cardiovascular | 190 | 60 |
| 1 | Stroke | Chronic | cardiovascular | 160 | 60 |
| 2 | COPD | Chronic | chronic respiratory | 80 | 50 |
| 3 | Diabetes | Chronic | metabolic and endocrine | 75 | 45 |
| 4 | Lung cancer | Chronic | solid tumor | 50 | 70 |
| 5 | Chronic kidney disease | Chronic | kidney and liver | 45 | 45 |
| 6 | Cirrhosis | Chronic | kidney and liver | 45 | 35 |
| 7 | Colorectal cancer | Chronic | solid tumor | 25 | 50 |
| 8 | Breast cancer | Chronic | solid tumor | 20 | 45 |
| 9 | Stomach cancer | Chronic | solid tumor | 22 | 50 |
| 10 | Liver cancer | Chronic | solid tumor | 16 | 60 |
| 11 | Asthma | Chronic | chronic respiratory | 21 | 30 |
| 12 | Leukemia | Chronic | blood cancer | 12 | 40 |
| 13 | Pancreatic cancer | Chronic | solid tumor | 11 | 85 |
| 14 | Lower respiratory infections | Infectious | respiratory virus | 100 | 20 |
| 15 | Diarrheal diseases | Infectious | bacterial | 60 | 10 |
| 16 | Tuberculosis | Infectious | bacterial | 45 | 20 |
| 17 | HIV/AIDS | Infectious | chronic viral | 40 | 35 |
| 18 | Malaria | Infectious | parasitic | 45 | 25 |
| 19 | Dengue | Infectious | hemorrhagic and arboviral | 3 | 15 |
| 20 | Measles | Infectious | respiratory virus | 4 | 5 |
| 21 | Hepatitis B | Infectious | chronic viral | 10 | 18 |
| 22 | Alzheimer's disease | Neuro and mental | neurodegenerative | 35 | 90 |
| 23 | Depression | Neuro and mental | psychiatric | 55 | 60 |
| 24 | Anxiety disorders | Neuro and mental | psychiatric | 45 | 55 |
| 25 | Schizophrenia | Neuro and mental | psychiatric | 15 | 80 |
| 26 | Parkinson's disease | Neuro and mental | neurodegenerative | 7 | 70 |
| 27 | Epilepsy | Neuro and mental | epilepsy and neurological | 14 | 45 |
| 28 | Multiple sclerosis | Neuro and mental | neurodegenerative | 2 | 50 |
| 29 | Lupus | Autoimmune | autoimmune | 1 | 45 |
| 30 | Rheumatoid arthritis | Autoimmune | autoimmune | 3.5 | 40 |
| 31 | Sickle cell disease | Genetic and rare | inherited blood | 8 | 12 |
| 32 | Cystic fibrosis | Genetic and rare | metabolic | 0.3 | 10 |

All named diseases start at stage 1 with kind 0.

### Initialization order

1. Create the 33 named diseases. Track the burden and count used per type.
2. For each type in index order, create the remaining generic known diseases, n = known count minus named count. First draw all n Zipf weights, then create the diseases:

```latex
w_i = \frac{0.5 + u_i}{(i+1)^{1.15}}, \quad \text{burden}_i = \max\left(50,\ R_t \cdot \frac{w_i}{\sum_j w_j}\right), \quad R_t = s_t \cdot 2.5\times10^{9} - \text{named burden}_t
```

```latex
\text{diff}_i = \max\left(1,\ m_t \cdot e^{1.0\,z}\right), \quad z \sim N(0,1)
```

Here u is a uniform draw, s is the type's burden share, and m is its median difficulty. The family is drawn with `pickFam`: family index within type = min(n_f - 1, floor(n_f × u^1.4)), which skews toward the first families. Per disease the draw order is family, then difficulty. Stage 1, kind 0.

3. Create the undiscovered pool, `params.pool` diseases. For each: draw u; type = Genetic if u < 0.8, Infectious if u < 0.9, else Other. Then family by `pickFam`, then burden = 2000 × e^(1.2z), then difficulty = max(1, 0.8 × m × e^(0.7z)). Stage 0, kind 1.
4. Create 150 pandemic reserve slots: Infectious, family respiratory virus if u < 0.7 else hemorrhagic and arboviral, burden 0, difficulty 8, stage 0, kind 2.
5. Give the 17,000 known diseases a head start, in array order: prog = diff × 0.85 × u^1.5. Then draw q: if q < 0.03, move to stage 2 with timer 1 + 7u; else if q < 0.036, move to stage 3 with timer 1 + 7u.
6. Force Measles (index 20) into stage 3 with timer 4, since it is already close to eradication.
7. Compute the display order used by any per-disease visual: shuffle indices with Fisher-Yates, then stable-sort by family, then by diff / (1 + log10(burden + 10)).
8. Set year 2026, AI capability C = 1, regulation = reg0 / 100, life expectancy 73.3, and push the first `YearRecord` (Section 4, step 13) with erad = 0, newF = 0, T = 8, p = 0.1, and D = human + aiBase.

## 4. Yearly simulation step

One call to `step(state)` advances one year through 14 sub-steps, always in this order. Symbols: t = year − 2026 before incrementing, R = current regulation from 0 (laissez-faire) to 1 (strict), u = a fresh uniform draw from the seeded generator.

### Step 1: AI capability

The growth rate compounds with the acceleration setting and is scaled by regulation. Balanced regulation (R = 0.5) leaves it unchanged; strict rules cut it to 0.35×; hands-off rules raise it to 1.25×.

```latex
g = \frac{g_0}{100}\left(1 + \frac{acc}{100}\right)^{t} \cdot M(R), \qquad M(R) = \begin{cases} 1.25 - 0.5R & R < 0.5 \\ 1 - 1.3(R - 0.5) & R \ge 0.5 \end{cases}
```

Save C_old = C. Then, by growth shape:

- **Exponential:** C = min(10^300, C × (1 + g)).
- **Exponential with plateaus:** keep a ceiling K (initially `ceiling`, default 100) and a counter plLeft.
  - If plLeft > 0 (stalled): C = C × (1 + 0.03g), then plLeft −= 1. If plLeft reaches 0: K = C × 10^(1 + u), close the current plateau with end year = year + 1, and log "Breakthrough after N years: a new AI paradigm restarts exponential growth".
  - Otherwise: C = C × (1 + g). If C ≥ K: set C = K, plLeft = max(1, round(plen × (0.5 + u))), open a plateau record [year + 1, null], and log "AI progress stalls at X× today. A plateau begins".

Log entries written in this step carry the year before it is incremented. Then set year = year + 1.

### Step 2: Regulation feedback

Fast AI growth raises public alarm, which tightens rules. Last year's eradications build trust, which loosens them. Rules also drift randomly and revert toward the starting climate.

```latex
\rho = \ln\frac{C}{C_{old}}, \quad alarm = \max(-0.02,\ 0.07(\rho - 0.33)), \quad trust = 0.03\min\left(1, \frac{E_{last}}{400}\right)
```

```latex
R \leftarrow \mathrm{clamp}_{[0,1]}\left(R + 0.068\,\frac{vol}{100}(2u - 1) + 0.06\left(\frac{reg_0}{100} - R\right) + alarm - trust\right)
```

At most once every 6 years, log one political event, checked in this order: alarm > 0.03 → "Public alarm at the pace of AI pushes lawmakers to tighten rules"; trust > 0.02 → "A wave of cures builds public trust, and regulators ease up"; alarm < −0.01 and R < reg0/100 → "AI progress stalls and oversight quietly loosens".

### Step 3: Pipeline speed

AI progress P and the compaction factor c drive trial length T, trial success probability p, and rollout time L. Strict regulation slows compaction.

```latex
P = \frac{\ln C}{\ln 10000}, \qquad c = 1 - e^{-2.2\max(0,P)(1 - 0.7R)}
```

```latex
T = 0.4 + 7.6(1 - c)\ \text{years}, \qquad p = 0.1 + 0.8c, \qquad L = 1 + 7(1 - c)\ \text{years}
```

### Step 4: Research capacity

A pandemic diverts 30% of research for 2 years. If diversion > 0, div = 0.7 and diversion −= 1; otherwise div = 1.

```latex
AI = aiBase \cdot C \cdot div, \quad D_{aging} = AI \cdot \frac{aging}{100}, \quad D = human \cdot div + AI\left(1 - \frac{aging}{100}\right)
```

The displayed "Discoveries per year" is D + D_aging.

### Step 5: Research allocation weights

Only stage 1 diseases receive research. Weights depend on the research priority setting.

| Priority | Exponent γ | Type multipliers (types 0 to 5) | Effective discoveries D_d |
| --- | --- | --- | --- |
| Biggest killers first (default) | 0.8 / (1 + 0.4 max(0, P)) | 1, 1, 1, 1, 1, 1 | D |
| Neglected and rare | 0 | 1, 4, 0.6, 0.6, 2, 2 | D |
| Platform technology | 0.5 / (1 + max(0, P)) | 1, 1, 1, 1, 1, 1 | 0.7D |
| Aging first | 0.5 / (1 + max(0, P)) | 1, 1, 1, 1, 1, 1 | D |

```latex
W_i = (\text{burden}_i + 1)^{\gamma} \cdot \text{typeMult}_{type_i}, \qquad W = \sum_{stage_i = 1} W_i
```

The shrinking exponent means neglected, low-burden diseases get a larger share as AI makes research cheap.

### Step 6: Pipeline pass

Loop i from 0 to N − 1 once, using stage as it stands when i is reached. Count eradications this year (E).

- **Stage 1, research:** prog += D_d × W_i / W × (0.6 + 0.8u). If prog ≥ diff: stage 2, timer = T × (0.7 + 0.6u), halved for Genetic diseases under the rare priority.
- **Stage 2, trials:** timer −= 1. If timer ≤ 0, succeed if u < p (plus 0.15 for Genetic diseases under the rare priority): stage 3, timer = L × (0.7 + 0.6u). On failure: stage 1, prog = 0.5 × diff.
- **Stage 3, rollout:** Infectious diseases first check resistance: if u < (res / 100)(1 − 0.6c), go back to stage 1 with prog = 0.6 × diff, count it, log it if named, and skip the rest. Otherwise timer −= 1; if timer ≤ 0, stage 4 (eradicated), E += 1, and log "NAME eradicated" if named.

### Step 7: New disease discovery

While undiscovered pool diseases remain, detection accumulates fractionally and speeds up with AI, slowing as the pool empties.

```latex
acc_{det} \mathrel{+}= newBase \cdot C^{\beta/100} \cdot \frac{poolLeft}{pool}, \qquad n = \min(poolLeft, \lfloor acc_{det} \rfloor), \quad acc_{det} \mathrel{-}= n
```

Build the candidate list of pool diseases still at stage 0, in index order. Pick n of them without replacement: index q = floor(u × length), swap-remove. Each moves to stage 1. Add n to newF (new diseases this year) and subtract n from poolLeft.

### Step 8: Pandemic

With probability pand / 100: pick a random reserve slot still at stage 0. It becomes stage 1 with burden = (5 + 75u₁u₂) million and diff = 6 + 10u. newF += 1, diversion = 2, R = max(0, R − 0.2). Log "A novel FAMILY pandemic breaks out. Research is diverted and emergency rules loosen".

### Step 9: Safety scare

With probability 0.25(1 − R) × min(1, max(0, P)): scan diseases in index order, and each stage 3 disease moves back to stage 2 with timer = T when u < 0.05, up to 40. If any moved: count the scare, R = min(1, R + 0.18), and log "Safety scare: K AI-designed therapies pulled back into trials. Regulators tighten".

### Step 10: Platform breakthrough

With probability (spill / 100) × min(0.85, pm × (0.04 + 0.12 max(0, P))), where pm = 3 under the platform priority and 1 otherwise: pick a random family not yet used and mark it used. Every stage 1 member, and every undiscovered pool member, gets prog += boost × diff, with boost 0.9 under the platform priority and 0.7 otherwise. Log "Platform breakthrough: PLATFORM unlocks K FAMILY diseases", counting only stage 1 members.

### Step 11: Surprise breakthrough

With probability (surprise / 100) × 0.2, draw u. If u < 0.5: pick a stage 1 disease with probability proportional to burden, set prog = diff, stage 2, timer = 0.7T, and log "Surprise result: a lab fast-tracks NAME into trials". Otherwise, only if not on a plateau: C = 1.3C and log "Surprise: an unexpected architecture jump boosts AI capability 30%".

### Step 12: Milestones and aging

If floor(log10 C) exceeds the last milestone and is at least 1, log "AI research capability passes X× today". Then aging research adds life expectancy directly, capped at 2.5 years per year:

```latex
\Delta_{aging} = \min\left(2.5,\ 0.012\sqrt{D_{aging}}\,(0.2 + 0.8c)\right), \qquad agingGain \mathrel{+}= \Delta_{aging}
```

### Step 13: Burden, life expectancy, and the year record

Recompute counts per stage, total burden, and averted burden over every discovered disease. Longer lives raise the burden of chronic and neuro diseases (types 2 and 3) unless aging itself is being treated. Rollout counts half; eradicated counts fully. Use the life expectancy from before this step.

```latex
ageMult = 1 + 0.03\max(0, LE - 73.3 - agingGain)\cdot\max\left(0, 1 - \frac{agingGain}{10}\right)
```

```latex
B_{tot} = \sum_{stage \ge 1} b_i m_i, \qquad B_{avert} = \sum_{stage=3} 0.5\,b_i m_i + \sum_{stage=4} b_i m_i, \qquad LE = 73.3 + 16.7\frac{B_{avert}}{B_{tot}} + agingGain
```

Healthy years gained accumulates B_avert every year. Push a `YearRecord`: y, erad (E), newF, LE, dLE, dAg, C, reg (R), rem (stages 1 to 3), eradCum (stage 4), healthy, T, p, D.

### Step 14: End conditions

Once there are at least 3 records, compare 3-year averages of the last three records:

- **Escape velocity:** first year the average dAg ≥ 1. Log "Longevity escape velocity: aging research now adds more than one year of life per year". The run continues.
- **Crossover:** first year the average erad > average newF and average erad > 0. Log "Crossover: cures now outpace newly found diseases". If `endAtCross`, the run is done.
- **Full eradication:** stages 1 to 3 are empty and poolLeft = 0. Log "Every known disease is eradicated" and end.
- **Time limit:** the run ends at year 2300.

## 5. Parameter reference

Every parameter below is a field of `Params`, is editable in the Settings panel, and is validated with the same ranges on the server. Changes apply to the running simulation immediately, except `pool` and `seed`, which apply on the next run.

| Group | Key | Settings label | Default | Range, step | Display format | Hint shown under the control |
| --- | --- | --- | --- | --- | --- | --- |
| AI progress | g0 | Model improvement rate | 35 | 5 to 150, 1 | "35% per year" | How much AI research capability improves each year. |
| AI progress | acc | Acceleration | 1 | 0 to 20, 0.5 | "1% per year" | How fast the improvement rate itself speeds up, such as AI helping build better AI. |
| AI progress | growth | Growth shape (radio) | exp | exp, waves | Exponential / Exponential with plateaus | none |
| AI progress | ceiling | First plateau (slider stores log10) | 100 | 10^1 to 10^6, 0.5 in log10 | "100× today" | Where AI first stalls when plateaus are on. Each later plateau hits somewhere 10 to 100 times higher. |
| AI progress | plen | Typical plateau length | 5 | 1 to 20, 1 | "5 years" | Each plateau lasts between half and one and a half times this long. |
| AI progress | aiBase | AI discoveries in 2026 | 20 | 5 to 200, 5 | "20 per year" | none |
| AI progress | human | Human baseline discoveries | 50 | 10 to 200, 5 | "50 per year" | Close to today's roughly 50 new drug approvals a year in the US. |
| Regulation | reg0 | Starting climate | 50 | 0 to 100, 1 | "Moderate, 50" (below 25 Laissez-faire, above 75 Strict) | Strict rules can cut AI growth to about a third and slow trial reform, but prevent safety scares. Hands-off rules speed both up by as much as a quarter. |
| Regulation | vol | Political volatility | 50 | 0 to 100, 1 | "50%" | How much regulation swings on its own from year to year. |
| Diseases | newBase | New diseases found in 2026 | 200 | 0 to 1,000, 10 | "200 per year" | none |
| Diseases | beta | AI boost to finding diseases | 35 | 0 to 100, 1 | "0.35" | Detection grows with AI capability raised to this power. 0 means no boost, 1 means it keeps pace with AI. |
| Diseases | pool | Undiscovered diseases out there | 25,000 | 5,000 to 100,000, 1,000 | "25,000" | Applies on your next new run. |
| Diseases | priority | Research priority (select) | killers | killers, rare, platforms, aging | Biggest killers first / Neglected and rare / Platform technology / Aging first | none |
| Diseases | res | Resistance chance | 4 | 0 to 20, 0.5 | "4% per year" | Chance an infectious disease adapts during rollout and sends researchers back to the lab. |
| Events | spill | Platform breakthroughs | 100 | 0 to 200, 5 | "100% of normal" | One technology advancing a whole disease family at once. |
| Events | pand | Pandemic chance | 3 | 0 to 20, 0.5 | "3% per year" | none |
| Events | surprise | Surprise breakthroughs | 100 | 0 to 200, 5 | "100% of normal" | none |
| Aging and ending | aging | AI effort on aging itself | 10 | 0 to 50, 1 | "10% of AI research" | Needed for longevity escape velocity. Curing diseases alone caps life expectancy near 90. |
| Aging and ending | endAtCross | Stop at the crossover (checkbox) | true | boolean | checkbox | none |
| Aging and ending | seed | Run seed (number input) | 0 | integer ≥ 0 | number | 0 picks a random run. Reuse a number to replay the same luck. Applies on your next new run. |

Fixed constants that are not user-editable: total burden 2.5 billion DALYs per year, baseline life expectancy 73.3 years, disease-only life expectancy ceiling 73.3 + 16.7 = 90 years, 150 pandemic reserve slots, start year 2026, end year 2300, and an event log capped at 60 entries.

### Setup screen choice

The setup screen sets only `growth` (and resets `endAtCross` to true). Every other parameter keeps its current Settings value between runs.

## 6. Front-end screens and graphics

The app is a single page, max 760px wide, centered, with 16px side padding. It works first on a 390px phone and then scales up. Top to bottom it shows a header, the main graph, variable cards, controls, stats, two supporting charts, an event log, and two collapsible panels. Two modals sit on top: setup and results.

```
+------------------------------------------+
| The Last Disease               2054      |  header: title + scenario | big year
| Exponential AI growth    AI capability   |
|                          22 thousand×    |
+------------------------------------------+
| [ main line graph, 300px tall ]          |  plateau bands, crossover and
|  Escape velocity   Crossover             |  escape velocity markers, cursor
+------------------------------------------+
| hint line                                |
| [AI capability ] [Regulation    ]        |  11 toggle cards, 2 columns
| [Diseases rem. ] [Eradicated    ] ...    |  (3 columns from 620px)
| (Play) (+1 year) (New run)               |
| Years per second [1|2|4|10]              |
| stats grid, 2 columns (4 from 620px)     |
| regulation meter, full width             |
| The race: log chart                      |
| Longevity: linear chart                  |
| What happened: event log                 |
| > Settings                               |
| > How the model works                    |
+------------------------------------------+
```

### Header

Left: "The Last Disease" (1.05rem, weight 700) and below it a muted subtitle. Before the first run the subtitle reads "How long until AI cures everything?" After a run starts it shows the scenario name: "Exponential AI growth" or "Exponential AI growth with plateaus". Right: the current year in weight 800 at clamp(3rem, 15vw, 5.2rem), letter-spacing −0.05em, line-height 0.85. Under it, muted 0.8rem: "AI capability 1.0× today", using one decimal below 10 and `fmtBig` above.

`fmtBig(x)`: below 1,000 → rounded integer. Otherwise pick the unit thousand, million, billion, trillion, quadrillion, or quintillion by floor(log10(x) / 3), show one decimal below 10 with a trailing ".0" removed, otherwise round ("6.4 thousand", "22 thousand"). Beyond quintillion → "10^N".

### Main graph

The hero visual is one canvas line graph of every enabled variable, redrawn after each simulated year. It sits in a panel with 14px corners, a 1px border, and 8px/6px padding. Height 300px on phones and 360px from 620px wide. Draw at devicePixelRatio (max 3) for crisp lines.

- **X axis:** years from 2026 to max(current year, 2046), labels every 5, 10, 20, or 50 years depending on span (span over 120 → 50, over 60 → 20, over 25 → 10, else 5). Labels near the right edge align right so they are never clipped.
- **Y axis:** no labels. Draw 5 evenly spaced horizontal gridlines. Padding: left 8, right 12, bottom 20, top 18 (32 when both markers show).
- **Normalization:** each line is scaled to its own range so shapes and timing are comparable. For a log variable, transform v → log10(max(1, v)). Low bound = the variable's fixed `lo` if given, else 0. High bound = fixed `hi` if given, else the maximum transformed value in the history so far. y = top + height × (1 − (v − lo) / (hi − lo)).
- **Lines:** 2.3px, round joins, in each variable's color.
- **Plateau bands:** for each plateau [start, end or current year], fill a rectangle across the plot height in the AI capability color at 10% opacity.
- **Markers:** dashed vertical lines (4px dash, 1.3px) at the crossover year (success green, label "Crossover") and escape velocity year (accent purple, label "Escape velocity"). Labels are 11px weight 600 above the plot, flipping to right-aligned within 90px of the right edge. When both exist, Escape velocity sits on a second label row above Crossover.
- **Cursor:** pointer move or press over the canvas picks the nearest year. Draw a 1px vertical line in the ink color at 50% opacity and the year in bold 12px near the bottom. The variable cards then show values for that year. Clear the cursor on pointer leave or cancel, and on pointer up for touch. Set `touch-action: pan-y` so vertical page scrolling still works.

Hint under the graph, muted 0.8rem: "Each line is scaled to its own range. Shaded bands mark AI plateaus. Tap a variable to show or hide it, and touch the graph to read any year."

### Variable cards

Eleven toggle buttons in a 2-column grid (3 columns from 620px), 6px gaps. Each card: a 10px round dot, the name in 0.74rem, and the value below in bold 0.92rem tabular numerals. When on, the dot is filled and the border takes the variable color. When off, the dot is an outline ring and the value is at 70% opacity. Each button uses `aria-pressed`.

| Order | Record key | Name | Color token | Scale | Fixed bounds | Value format | On by default |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | C | AI capability | --v1 | log | none | "22 thousand×" (one decimal below 10) | yes |
| 2 | reg | Regulation | --v2 | linear | 0 to 1 | "52/100" | yes |
| 3 | rem | Diseases remaining | --v3 | linear | lo 0 | "33,057" | yes |
| 4 | eradCum | Eradicated | --v4 | linear | lo 0 | "6,630" | yes |
| 5 | LE | Life expectancy | --v6 | linear | lo 73 | "100.1 yrs" | yes |
| 6 | newF | New diseases per year | --v5 | linear | lo 0 | "836" | no |
| 7 | erad | Eradicated per year | --v9 | linear | lo 0 | "2,744" | no |
| 8 | healthy | Healthy years gained | --v8 | linear | lo 0 | "21 billion" | no |
| 9 | D | Discoveries per year | --v11 | log | none | "856 thousand" | no |
| 10 | T | Trial length | --v7 | linear | lo 0 | "2.0 yrs" | no |
| 11 | p | Trial success rate | --v10 | linear | 0 to 1 | "74%" | no |

### Controls

One row: Play (primary, min-width 92px, toggles to "Pause"), "+1 year" (pauses, then advances one step), and "New run" (opens the setup screen). Next row: the muted label "Years per second" and a segmented control with 1, 2 (default), 4, and 10. The animation loop runs on requestAnimationFrame, accumulates elapsed time capped at 0.25 seconds per frame, and steps once whenever accumulated time ≥ 1 / speed. After a run ends and the results modal is closed, Play and +1 year are disabled until the next run.

### Stats grid

Eight cells in a bordered grid with 1px dividers (2 columns, 4 from 620px), each with a value in bold 1.25rem and a muted 0.75rem label: Diseases remaining, Eradicated, New diseases found this year, Eradicated this year, Healthy years gained, Life expectancy ("100.3 yrs"), Discoveries this year, and Trial length, success rate ("1.7 yrs, 76%"). A ninth, full-width cell shows "Regulatory climate (45)" above an 8px bar with a gradient from the trial amber (left) to the research purple (right), a 4 × 16px ink marker at R × 100% with a 0.3s transition, and end labels "Laissez-faire" and "Strict".

### Supporting charts

Both are 170px canvas charts in bordered panels with a small key under them, labeled axes, and padding left 34, right 16, top 8, bottom 18.

- **The race** (hint: "The run ends at the crossover: the first year diseases are eradicated faster than new ones are found. Log scale."): log10(v + 1) y axis with gridlines at 0, 10, 100, then 1k, 10k, and so on. Lines: new diseases per year in --res-hi, eradicated per year in --good. Dashed green vertical line at the crossover.
- **Longevity** (hint: "Years of life added per year by aging research. Escape velocity is when this stays above 1."): linear y axis from 0 to ceil(max(2, max dAg)), gridlines every 0.5 (every 1 above 4). A dashed muted line at 1, the dAg line in the accent color, and a 4px accent dot at (escape velocity year, 1).

### Event log

Heading "What happened". A list of the 40 newest events, scrollable at max 260px, each row a 3.2em year column and the message. Colors by event kind: win → good green, weight 600; bad → bad red; plat → teal, weight 600; surp → amber; ai → default ink. The first entry of every run is "Run SEED begins with 17,000 known diseases" (kind ai).

### Settings and How the model works

Two `<details>` panels with rounded borders. Settings renders the Section 5 groups as fieldsets with accent-colored legends. Each slider row shows the label left, the formatted value right, the full-width range input below, and the hint under that. Radios render inline and wrap. How the model works holds five short paragraphs covering the disease pipeline, research allocation, events and healthy years, AI growth and plateaus, and the two-way link between regulation and AI, plus a closing caveat that the figures are rough estimates for exploring levers, not forecasts.

### Setup modal

Shown on first load and on every New run. A dimmed overlay (rgba(20, 12, 28, 0.55)) with a centered card: max 420px wide, 18px corners, scrolls within 90% of the viewport height. Title "How does AI grow?" and the hint "Pick one, then watch it play out. Everything else is adjustable in Settings." Two radio cards:

- **Exponential:** "Compounds about {g0}% a year, every year."
- **Exponential with plateaus:** "Same rate, but AI stalls for years at a time, first at {fmtBig(ceiling)}× today, until a breakthrough restarts growth."

The selected card gets an accent border. A sticky footer holds a full-width "Start run" button, which applies the choice, sets the subtitle, creates the simulation, and starts playing.

### Results modal

Opens when a run ends. A 34px round "×" button sits in the top-left corner (aria-label "Close results"); it and the Escape key close the modal so the final graph stays visible. Content: a title, the big year in good green at 3.2rem weight 800, a one-sentence summary ending with the scenario name, a two-column definition list, and buttons.

- **Title and summary by outcome:** "Crossover reached" with "After N years, diseases are now being eradicated faster than new ones are found."; "Every disease eradicated" with "N years from today."; or "Out of time" with "The simulation stops at 2300."
- **Rows:** Diseases eradicated, Still in progress, Healthy years gained, Life expectancy, Longevity escape velocity (year or "Not yet"), Pandemics, Platform breakthroughs, Safety scares, AI capability, and Run seed.
- **Buttons:** "Keep going to full eradication" (crossover only: turns off `endAtCross` and resumes), "New run", and a new "Save and share" button that posts to the API and copies the share link.

## 7. Visual design system

The look is a histology slide: a pale pink-violet background with stain-like purple, pink, amber, and teal accents in light mode, and a deep violet-black with brighter versions of the same hues in dark mode. Define every color as a CSS custom property on `:root` in `styles/tokens.css`. Canvas code reads the resolved values with `getComputedStyle` and redraws when the theme changes.

### Color tokens

| Token | Light | Dark | Used for |
| --- | --- | --- | --- |
| --bg | #F7F2F5 | #16121C | Page background, option cards |
| --panel | #FFFFFF | #1F1A27 | Charts, cards, stats cells, modals |
| --ink | #2A1B3D | #F1EAF4 | Main text, primary button fill, cursor line |
| --muted | #6E6078 | #A596AE | Secondary text, axis labels |
| --line | #E3D8E2 | #342B3F | Borders and dividers |
| --chartgrid | #EDE4EC | #2A2333 | Chart gridlines |
| --accent | #5B3A8C | #B79BE6 | Focus rings, selected speed, legends, escape velocity |
| --good | #1F8A6A | #6FD3A4 | Crossover, win events, eradicated line in the race chart |
| --bad | #C2395F | #F0628F | Bad events |
| --plat | #1F8A8A | #38B2AC | Platform events |
| --surp | #B7791F | #F2B54A | Surprise and policy events |
| --res-lo | #5B3A8C | #6D4BA3 | Strict end of the regulation meter |
| --res-hi | #D6457A | #F0628F | New diseases line in the race chart |
| --trial | #E0A030 | #F2B54A | Laissez-faire end of the regulation meter |
| --v1 | #5B3A8C | #B79BE6 | AI capability, plateau bands |
| --v2 | #B7791F | #F2B54A | Regulation |
| --v3 | #C2395F | #F0628F | Diseases remaining |
| --v4 | #1F8A6A | #6FD3A4 | Eradicated |
| --v5 | #E07B39 | #F59A5B | New diseases per year |
| --v6 | #2B7BB9 | #6FB4EE | Life expectancy |
| --v7 | #8A5A44 | #D1A68C | Trial length |
| --v8 | #9B3FB5 | #D38BEB | Healthy years gained |
| --v9 | #4F7A28 | #A6D66A | Eradicated per year |
| --v10 | #D14F9E | #F28CCB | Trial success rate |
| --v11 | #3E6E8E | #8FC1DD | Discoveries per year |

Theme rules: apply the dark values under `@media (prefers-color-scheme: dark)` guarded by `:root:not([data-theme="light"])`, and again under `:root[data-theme="dark"]`, so a future theme toggle can force either mode. Give `body` an explicit background.

### Typography

- Font: Schibsted Grotesk (weights 400, 500, 600, 700, 800) from Google Fonts with `display=swap`, falling back to system-ui, -apple-system, Segoe UI, Roboto, sans-serif. Canvas text uses the same stack.
- Base size 16px, line-height 1.45. All numbers use `font-variant-numeric: tabular-nums` so values do not jitter while animating.
- Scale: year 3 to 5.2rem/800; modal year 3.2rem/800; modal title 1.5rem; stat values 1.25rem/700; section headings 0.95rem/700; body and buttons 0.9rem; labels and hints 0.74 to 0.85rem.
- Headings and labels are sentence case, never all caps.

### Shape, spacing, and motion

- Radii: 14px main graph panel, 12px charts, stats, panels, and option cards, 10px variable cards, 18px modals, 999px buttons and the speed control.
- Buttons: min-height 40px (34px for the close button), 1px --line border, --panel fill; the primary button is --ink fill with --bg text. Disabled buttons drop to 40% opacity.
- Focus: every interactive element shows a 2px --accent outline with 2px offset on `:focus-visible`.
- Motion is minimal: only the regulation marker animates (0.3s). Respect `prefers-reduced-motion` by removing that transition.

### Layout and device rules

- Viewport meta: `width=device-width, initial-scale=1, viewport-fit=cover`. Pad `:root` with `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` so content clears phone system bars.
- Breakpoint at 620px: stats go to 4 columns, variable cards to 3, and the main graph to 360px tall.
- Wide content never scrolls the page sideways.

### Accessibility

- The main graph canvas has `role="img"` and an aria-label. The stats and variable cards carry the same numbers as text, so the graph is never the only source.
- Both modals use `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`. Opening the setup modal focuses the checked radio; opening the results modal focuses its primary button. Escape closes the results modal.
- Radio groups use `role="radiogroup"`; the speed control uses `role="group"` with `aria-pressed` on each option.
- Text and lines meet WCAG AA contrast against their backgrounds in both themes.

## 8. Back-end API, storage, and batch runs

The server never trusts results from the browser. Clients send only `params` and `seed`; the server replays the run with the shared engine, computes the summary itself, and stores it. Because the engine is deterministic, a shared link reproduces the exact run everywhere.

### Endpoints

All routes live under `/api`, accept and return JSON, and validate bodies with Zod schemas generated from the Section 5 ranges.

| Method | Path | Body or query | Returns |
| --- | --- | --- | --- |
| GET | /api/health | none | `{ ok: true, engineVersion }` |
| GET | /api/params | none | Defaults, ranges, steps, labels, and hints from Section 5, so the Settings panel is built from one source |
| POST | /api/runs | `{ params, seed }` (seed ≥ 1) | 201 `{ id, shareUrl, summary }` |
| GET | /api/runs/:id | none | `{ id, params, seed, engineVersion, summary, createdAt }` |
| GET | /api/runs | `?limit=20` (max 100) | Recent runs, newest first, summaries only |
| POST | /api/batch | `{ params, count, startSeed? }`, count 1 to 1,000 | 202 `{ jobId }` |
| GET | /api/batch/:jobId | none | `{ status, progress, result? , error? }` |

`RunSummary`: seed, outcome ("crossover", "full", or "timeout"), endYear, crossYear, levYear, fullYear, eradicated, remaining, healthyYears, lifeExpectancy, pandemics, platforms, safetyScares, resistanceEvents, plateauCount, and finalCapability.

Batch `result`: count, crossover year percentiles (p10, p25, p50, p75, p90), a crossover histogram in 1-year bins, the share of runs reaching escape velocity with its median year, mean eradicated at the end, mean healthy years gained, and the share of runs that time out at 2300.

### Storage

Use PostgreSQL with Drizzle migrations. Store params as JSON so new parameters need no migration.

| Table | Columns |
| --- | --- |
| runs | id (text, 10-char nanoid, primary key), created_at (timestamptz), engine_version (text), seed (integer), params (jsonb), summary (jsonb), cross_year (integer, nullable, indexed), lev_year (integer, nullable), full_year (integer, nullable) |
| batch_jobs | id (text primary key), created_at (timestamptz), status (queued, running, done, failed), params (jsonb), count (integer), start_seed (integer), progress (integer), result (jsonb, nullable), error (text, nullable) |

### Batch execution

- A pool of `worker_threads`, sized to CPU cores minus one (minimum 1), runs `runToEnd` for seeds startSeed through startSeed + count − 1. `endAtCross` stays as sent.
- Workers report progress every 10 runs; the job row updates progress and, when finished, stores the aggregated result.
- At most 2 jobs run at once; later jobs wait in the queue. A single run that exceeds 5 seconds fails the job with a clear error.
- Default startSeed is 1, so the same params always produce the same batch result.

### Versioning and limits

- `ENGINE_VERSION` is a semver constant in the engine package. Bump the minor version whenever any formula or constant changes. If a saved run's version differs from the current engine, the front end still replays it but shows "This run was saved with an older model version, so results may differ."
- Rate limit to 30 requests per minute per IP on POST routes. Cap request bodies at 16 KB.
- Configure with environment variables: DATABASE_URL, PORT (default 8787), PUBLIC_BASE_URL (for share links), and BATCH_MAX_CONCURRENT (default 2).

### Front-end routes that use the API

- `/` is the simulator described in Section 6.
- `/run/:id` fetches a saved run, applies its params, skips the setup modal, and plays it from 2026 at 10 years per second. A banner reads "Replaying a shared run" with a button to start a new run of your own.
- `/explore` is the Monte Carlo view. It reuses the Settings panel and the growth shape choice, adds a "Number of runs" input (default 200), and a Run batch button. While running it shows a progress bar. When done it draws a canvas histogram of crossover years in --good, a vertical median line, a stats row (median crossover, p10 to p90 range, escape velocity share and median year, timeout share), and a short sentence such as "Half of 200 runs reach the crossover by 2054."

## 9. Testing, calibration, and acceptance criteria

The engine is correct when it reproduces the prototype's golden run exactly and its 20-seed distributions land inside the calibration ranges below. These numbers come from the working prototype with default parameters.

### Golden run (exact match required)

With default params and seed 12345:

| Check | Expected value |
| --- | --- |
| Total diseases N | 42,150 |
| Stage counts right after init (stages 0 to 4) | 25,150 · 16,383 · 517 · 100 · 0 |
| Crossover year | 2054 |
| Escape velocity year | 2051 |
| Eradicated at end | 6,092 |
| Remaining (stages 1 to 3) at end | 33,942 |
| Healthy years gained, rounded | 22,594,795,676 |
| Life expectancy at end | 99.539 years (3 decimals) |
| Pandemics · platform breakthroughs · safety scares | 5 · 3 · 5 |

If the init counts match but later values drift, a random draw is happening in the wrong order. Re-check Section 4 step by step, especially the pipeline loop, the `continue` after resistance, and when log calls consume no randomness.

### Calibration ranges (seeds 1 to 20)

| Scenario (change from defaults) | Crossover p10 / median / p90 | Runs reaching escape velocity | Median escape velocity year | Median eradicated | Median healthy years |
| --- | --- | --- | --- | --- | --- |
| Exponential (defaults) | 2052 / 2054 / 2056 | 100% | 2052 | 5,377 | 20.6 billion |
| Exponential with plateaus | 2057 / 2059 / 2060 | 35% | 2058 | 4,244 | 26.9 billion |
| Strict starting climate (reg0 90) | 2060 / 2064 / 2068 | 100% | 2063 | 4,121 | 22.7 billion |
| Hands-off starting climate (reg0 10) | 2050 / 2052 / 2053 | 100% | 2050 | 6,493 | 19.2 billion |
| Neglected and rare priority | 2050 / 2053 / 2055 | 85% | 2053 | 5,506 | 1.8 billion |
| Aging first (aging 35) | 2052 / 2054 / 2057 | 100% | 2049 | 5,221 | 9.8 billion |

An exact implementation matches these values. If a deliberate change moves any median by more than 2 years, bump `ENGINE_VERSION` and update this table.

### Required automated tests

- **Engine unit tests (Vitest):** mulberry32 seed 1 gives 0.6270739406, 0.0027357212, 0.5274470400, 0.9810509675, 0.9683778982 (10 decimals); `fmtBig` gives "999", "1 thousand", "6.4 thousand", "22 thousand", "1.5 million", and "10^25" for 999, 1,000, 6,400, 22,000, 1.5e6, and 1e25; initialization counts per type and kind; M(R) at R = 0, 0.5, and 1 (1.25, 1.0, 0.35); pipeline speed at C = 1 and C = 10,000 with R = 0.5.
- **Determinism:** two runs with the same params and seed produce identical `hist` arrays; the Node and browser (Playwright) builds produce the same golden summary.
- **Golden and calibration tests:** as in the two tables above. Calibration runs in CI in under 60 seconds.
- **API tests:** POST /api/runs rejects out-of-range params with 400 and field-level errors; the stored summary equals `runToEnd` output; GET /api/runs/:id round-trips; a 20-seed batch finishes with a crossover median of 2054 for defaults.
- **UI tests (Playwright, 390 × 844 and 1280 × 800, light and dark):** the setup modal appears on load; Start run plays; the year advances; toggling a variable card hides its line; the cursor updates card values; a run at 10 years per second opens the results modal; the × closes it and disables Play; Keep going resumes; New run reopens setup; the share link replays the same crossover year.

### Performance budgets

- One full default run in Node: under 150 ms (the prototype takes about 110 ms).
- One animated step plus full redraw in the browser: under 8 ms on a mid-range phone, so 10 years per second never drops frames.
- A 1,000-seed batch on a 4-core server: under 60 seconds.

### Acceptance checklist

- [ ] Golden run matches exactly and calibration medians are within range
- [ ] The main graph, cards, stats, race chart, longevity chart, and log all update every simulated year
- [ ] Plateau bands, crossover marker, and escape velocity marker render correctly
- [ ] Settings changes apply live, except pool and seed, which apply on the next run
- [ ] Save and share produces a link that replays the identical run
- [ ] The Explore page returns a histogram and percentiles for 200 runs
- [ ] Light and dark themes pass AA contrast; keyboard-only use works end to end
- [ ] No layout breaks from 320px to 1440px wide

## 10. Build plan for the agent

Build in nine milestones, engine first, and do not start a milestone until the previous one's checks pass. The engine milestone matters most: every later screen depends on it being exact.

| # | Milestone | Deliverables | Done when |
| --- | --- | --- | --- |
| 0 | Scaffold | pnpm monorepo with `packages/engine`, `apps/web`, `apps/api`; TypeScript strict mode; ESLint and Prettier; Vitest and Playwright configured; `pnpm dev` runs web and API together | Empty app loads at localhost; API health route answers |
| 1 | Engine | rng, catalog, params, init, step, metrics, format, `runToEnd`, `summarize`, `ENGINE_VERSION` | Golden run matches exactly; calibration table passes; one run under 150 ms |
| 2 | App shell | tokens.css with both themes, header, controls, speed control, animation loop hook, setup modal | Choosing a growth shape and pressing Start run animates the year counter |
| 3 | Main graph and cards | Canvas graph with normalization, plateau bands, markers, cursor; 11 variable cards | Toggling cards and scrubbing the graph work on phone and desktop |
| 4 | Stats, charts, log, panels | Stats grid and regulation meter, race chart, longevity chart, event log, Settings built from `/api/params`, How the model works | Every panel updates each year; Settings changes apply live |
| 5 | Results modal | Three outcome variants, stats list, close button and Escape, Keep going, New run | UI tests for the end of a run pass |
| 6 | Save and share | Database schema and migrations, POST and GET runs, share button, `/run/:id` replay page, version warning | A shared link replays the same crossover year in a fresh browser |
| 7 | Batch and Explore | Worker pool, job queue, batch routes, `/explore` page with histogram and percentiles | 200 default runs report a median crossover of 2054 |
| 8 | Polish and ship | Accessibility pass, reduced motion, performance budgets, Dockerfile per app, docker-compose with Postgres, README | Acceptance checklist in Section 9 is fully ticked |

### Rules for the agent

- Keep the engine free of UI, network, time, and `Math.random`. The web app may use `Math.random` only to choose a seed when the seed setting is 0.
- Never change a formula or constant from Sections 3 to 5 to make a test pass. If a test and the spec disagree, stop and report the discrepancy.
- Draw all charts with the Canvas 2D API, reading colors from CSS tokens, and redraw on resize and on theme change.
- Keep all user-facing copy exactly as written in Sections 5 and 6.
- After each milestone, open the app with the browser subagent at 390 × 844 and 1280 × 800 in both themes, capture screenshots, and include them in the walkthrough artifact.

### Prompt to paste with this spec

```
Build "The Last Disease" exactly as described in the attached spec.
Work milestone by milestone from Section 10. Sections 3-5 are normative:
implement every formula, constant, and random-draw order exactly.
Before moving past Milestone 1, show me the golden-run test output.
After each later milestone, show screenshots at 390x844 and 1280x800 in
light and dark mode, and tick the matching acceptance items in Section 9.
```
