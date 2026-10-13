# Resume Intelligence Platform (RIP) — UI/UX Design Specification

**Purpose of this document:** a complete, buildable design direction for the RIP frontend, written so a coding agent (Claude Code, Cursor, etc.) can implement it directly. Every visual decision below is grounded in what RIP actually does — it should be handed to the agent as-is, not summarized.

---

## 1. Design Concept — "The Diagnostic Scan"

RIP's entire value proposition is **explainability** — not just a score, but *why* that score, shown like a scan revealing what's underneath. So the whole UI is built around a single governing metaphor: **a diagnostic instrument reading a resume**, the way a scanner, radar, or oscilloscope reads a signal.

This is deliberate and specific to this product — not a generic "AI SaaS" look. Concretely, this means:
- Score displays behave like **instrument readouts**, not decorative progress rings
- The core "Analyze Resume" action triggers **one bold, orchestrated scan animation** — this is the single memorable moment of the whole app, everything else stays calm and disciplined around it
- Data (scores, percentages, keyword matches) is rendered in **monospace**, because it's actual measured output, not a stylistic label
- Flagged issues appear as **annotations pointing at specific parts of the resume**, like a scan report, not a generic list of bullet points in a card

**Explicitly avoid:** cream background + serif display (overused AI-generated default), black background + neon-green/acid accent (also overused), identical rounded SaaS cards with soft grey shadows everywhere, ALL-CAPS eyebrow labels above every section, em-dash-separated meta text, a `→` tacked onto every button label. None of that is banned because it's inherently bad — it's avoided because it's the *default* every AI-generated app reaches for, and this product is specifically about precision and signal, not generic softness.

---

## 2. Design Tokens

### 2.1 Color — "Instrument Panel" palette

| Token | Hex | Role |
|---|---|---|
| `bg-primary` | `#12151A` | Main background — deep graphite, not pure black |
| `bg-surface` | `#1B1F26` | Elevated surfaces (panels, the resume "document" area) |
| `signal-cyan` | `#5FE0D8` | Primary accent — the "scan line," active states, primary actions. Phosphor/radar-inspired, not a generic brand blue |
| `alert-amber` | `#F2A93B` | Point deductions, warnings, "needs attention" states |
| `confirm-green` | `#7ED9A6` | Passed checks, matched keywords, strengths |
| `text-primary` | `#EDEDEF` | Main text on dark backgrounds |
| `text-muted` | `#8B909C` | Secondary text, timestamps, helper copy |

Rationale: cyan reads as "signal/scan," amber and green carry real functional meaning (deduction vs. strength) rather than decoration — a person should be able to understand resume health from color alone, glanced quickly, the way you'd read a real diagnostic panel.

### 2.2 Typography

- **Display/headings:** `Space Grotesk` — geometric, slightly technical character without being cold. Used for page titles, section headers.
- **Body text:** `Inter` — clean, highly legible at small sizes, disappears into the background so content leads.
- **Data/numbers/scores/keywords:** `JetBrains Mono` — used specifically and only for actual measured values (scores, percentages, extracted keywords, dates). This is functional, not decorative — it signals "this is measured output" every time it appears.

Type scale (rem, 16px base): `0.8125 / 0.875 / 1 / 1.25 / 1.75 / 2.5 / 3.5`. Body line length capped under 80 characters throughout — this is a text-heavy, document-centric product.

### 2.3 Spacing & shape

- 8px base spacing unit
- Radius: **sharp, mostly square corners (2–4px)** on data panels and the resume document view — reinforces the "instrument/report" feel; reserve a slightly larger radius (8px) only for interactive buttons and input fields, so the one soft element stands out as "this is touchable"
- Borders over shadows: use 1px `signal-cyan`-tinted borders at low opacity to separate panels, rather than soft drop shadows — shadows read as "generic SaaS card," borders read as "instrument panel"

### 2.4 Motion principles

- **One signature animation**: the scan sequence (Section 4.1). This is the app's single bold moment — do not scatter smaller versions of it elsewhere.
- Everywhere else: motion only responds to a person's action (clicking, expanding, confirming) — no automatic fade-slide-up entrances on scroll, no hover effects on every card. If it doesn't confirm what just changed, cut it.
- Respect `prefers-reduced-motion` — the scan animation should degrade to an instant reveal, not a stripped-down version of itself.

---

## 3. Recommended Stack

- **React** + **Tailwind CSS** (utility classes map cleanly to the token system above)
- **Framer Motion** — for the scan sequence and score count-up; its layout animations suit this "state transition" heavy UI better than CSS keyframes alone
- **Recharts** or a custom SVG for the score meter (Section 4.2) — custom SVG recommended for the exact "instrument needle" look
- Plain component structure — no need for a heavy UI kit (shadcn adds a generic look this design is deliberately avoiding); build components directly against the token system above

---

## 4. Signature Interactions

### 4.1 The Scan Sequence (the one big moment)

Trigger: user clicks "Analyze Resume."

1. The resume document (rendered as plain text/outline, not the actual PDF) sits in the center panel.
2. A thin `signal-cyan` line sweeps top-to-bottom across the document once, over ~1.2s.
3. As the line passes each section (contact info, experience, projects, skills), that section briefly highlights.
4. Once the sweep completes, deduction annotations fade in one at a time (staggered ~150ms apart, not simultaneous), each as a small tag pointing to the relevant line — e.g. a tag reading `−5 Missing GitHub Profile` pointing at the contact section.
5. The overall score counts up numerically (not a sudden jump) in the score meter (4.2), finishing exactly as the last annotation lands.

This is the entire "wow" moment of the app. Everything else in the UI should be calm by comparison.

### 4.2 The Score Meter (used for ATS Score and Match Score)

Not a generic circular progress ring. Render as a **horizontal signal meter** — like a VU meter or radar signal strength bar — with segmented ticks, a needle or fill indicator, and the numeric score in `JetBrains Mono` beside it. Color of the fill transitions along the palette: amber below 50, cyan 50–75, green above 75 — reinforcing the instrument-reading metaphor established in the palette.

### 4.3 Keyword Radar (JD Matching view)

Matched keywords appear as small pill tags in `confirm-green`, gently pulsing once on appearance (not looping). Missing/required keywords appear in `text-muted` with a dashed border — visually "detected but absent," not styled as an error, just as a gap to fill.

---

## 5. Page-by-Page Specification

### 5.1 Login / Register
Minimal, centered, single column. No marketing copy — this is a tool, not a landing page. `bg-surface` panel on `bg-primary` background. Plain fields, no floating labels (avoid the "clever" default — labels sit above fields, always visible).

### 5.2 Dashboard
```
┌─────────────────────────────────────────────┐
│  RIP                              [+ New]    │
├─────────────────────────────────────────────┤
│  Your Resumes                                │
│  ┌───────────────┐  ┌───────────────┐        │
│  │ Backend - Juspay│ │ Frontend - Zoho │      │
│  │ Last ATS: 74    │ │ Last ATS: 61    │      │
│  └───────────────┘  └───────────────┘        │
└─────────────────────────────────────────────┘
```
Left-aligned, no hero banner. Each resume tile shows its most recent ATS score using a compact version of the signal meter, not just a bare number — consistency of the instrument metaphor matters here.

### 5.3 Resume Builder
Two-column layout: form fields on the left (structured, one section expanded at a time — education, experience, projects, skills), live-rendered resume preview on the right, updating as the user types. No modal-heavy flows — everything editable inline.

### 5.4 ATS Score Report (the core screen — gets the most design attention)
```
┌──────────────────────┬────────────────────┐
│                       │  ATS SCORE          │
│   [resume outline     │  ▓▓▓▓▓▓▓▓░░  68     │
│    with scan-line     │                      │
│    annotations        │  DEDUCTIONS          │
│    pointing at         │  −5  Missing GitHub  │
│    flagged lines]     │  −10 No metrics      │
│                       │  −8  Table formatting│
│                       │                      │
│                       │  RECOMMENDATIONS      │
│                       │  → Add GitHub link    │
└──────────────────────┴────────────────────┘
```
This is where the scan animation plays on load. Annotations are clickable — clicking one scrolls/highlights the corresponding resume section, reinforcing "this score is explained, not asserted."

### 5.5 Resume Success Simulator (JD Match)
Side-by-side: resume outline on the left, pasted/uploaded JD on the right, with the keyword radar (4.3) as a connecting strip between them showing matched vs. missing terms. Match score uses the same signal meter component from 4.2 — visual consistency across every "score" in the app is important, it's the same instrument reading different signals.

### 5.6 Project Impact Enhancer
Simple before/after comparison: original description on top (muted), role-tailored version below (`text-primary`, with the changed emphasis words subtly underlined in `signal-cyan` — not bold, not highlighted background, just a thin underline, so it draws attention without shouting).

---

## 6. Voice & Copy

- Buttons state exactly what happens: "Analyze Resume," "Save Changes," not "Submit" or "Go."
- Deduction reasons are stated plainly and specifically — "Missing GitHub Profile," not "Your resume could be improved."
- Empty states are instructional, not apologetic: "No resumes yet — create one to get started," not "Oops, nothing here!"
- No exclamation marks in system copy. This is a diagnostic tool, not a cheerleader.

---

## 7. Accessibility & Responsiveness

- All color-coded meaning (amber/green/cyan) must also carry a text label — never rely on color alone for score status
- Visible keyboard focus rings using `signal-cyan` at full opacity
- Mobile: the two-column ATS Report and Simulator views stack vertically, with the score meter pinned near the top rather than buried after a long resume outline
- Respect `prefers-reduced-motion` as noted in Section 2.4
