#!/usr/bin/env tsx
// ─────────────────────────────────────────────────────────────────────────────
// Seed script — 100 realistic prompts across 10 categories
//
// Usage:
//   npm run db:seed              # insert all seed data
//   npm run db:seed -- --reset   # wipe existing data first, then seed
//
// Generates:
//   • 100 prompts with realistic bodies (multi-paragraph where appropriate)
//   • 28 tags distributed by category
//   • ~30 prompts marked as favorite
//   • Spread across 7 AI models
//   • Timestamps staggered over the past 6 months for realistic sorting
// ─────────────────────────────────────────────────────────────────────────────

import Database from "better-sqlite3";
import { ulid } from "ulid";
import path from "path";
import fs from "fs";

// ─── Bootstrap DB with migrations ────────────────────────────────────────────

const DB_PATH = process.env.DB_PATH ?? "./data/prompt-memory.db";
const resolved = path.resolve(DB_PATH);
const dir = path.dirname(resolved);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(resolved);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Ensure schema is up to date
db.exec(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version    INTEGER PRIMARY KEY,
    name       TEXT    NOT NULL,
    applied_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
`);

import { migration_001_initial } from "./migrations/001_initial";

const applied = new Set<number>(
  (db.prepare("SELECT version FROM schema_migrations").all() as { version: number }[]).map(
    (r) => r.version
  )
);
if (!applied.has(1)) {
  db.transaction(() => {
    db.exec(migration_001_initial.up);
    db.prepare("INSERT INTO schema_migrations (version, name) VALUES (?, ?)").run(
      1,
      "initial_schema"
    );
  })();
  console.log("[seed] Applied migration 1: initial_schema");
}

// ─── CLI flags ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const RESET = args.includes("--reset");

if (RESET) {
  console.log("[seed] --reset: wiping existing data...");
  db.transaction(() => {
    db.exec("DELETE FROM prompt_images");
    db.exec("DELETE FROM prompt_tags");
    db.exec("DELETE FROM prompts");
    db.exec("DELETE FROM tags");
  })();
  console.log("[seed] Tables cleared.");
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Generate an ISO timestamp N days ago with a random hour offset */
function daysAgo(days: number, hourOffset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(d.getHours() - hourOffset);
  d.setMinutes(Math.floor(Math.random() * 60));
  d.setSeconds(Math.floor(Math.random() * 60));
  return d.toISOString().replace("T", "T").replace(/\.\d{3}Z$/, ".000Z");
}

const MODELS = [
  "claude-opus-4-6",
  "claude-sonnet-4-6",
  "claude-haiku-4-5",
  "gpt-4o",
  "gpt-4-turbo",
  "gemini-2.5-pro",
  "mistral-large",
];

function pickModel(index: number): string {
  return MODELS[index % MODELS.length]!;
}

// ─── Seed data ────────────────────────────────────────────────────────────────

interface SeedPrompt {
  title: string;
  body: string;
  model: string;
  notes: string | null;
  is_favorite: boolean;
  tags: string[];
  daysAgoN: number;
}

const SEED_PROMPTS: SeedPrompt[] = [
  // ── WRITING & CONTENT (10) ──────────────────────────────────────────────

  {
    title: "Blog Post Outline Generator",
    body: `You are an expert content strategist. Given a topic and target audience, generate a detailed blog post outline.

Structure:
1. A compelling H1 title (include a power word)
2. Meta description (150–160 chars, include primary keyword)
3. Introduction hook (2–3 sentences, state the problem or promise)
4. 5–7 H2 sections, each with:
   - The H2 heading
   - 3 bullet points of what to cover
   - A suggested subheading (H3) where relevant
5. Conclusion with a clear CTA

Topic: {{topic}}
Target audience: {{audience}}
Primary keyword: {{keyword}}
Desired word count: {{word_count}}

Return the outline in Markdown format.`,
    model: pickModel(0),
    notes: "Works best with GPT-4 class models. Pair with keyword research data.",
    is_favorite: true,
    tags: ["writing", "content", "seo", "blog"],
    daysAgoN: 2,
  },
  {
    title: "Email Subject Line A/B Test Generator",
    body: `Generate 10 subject line variants for an email campaign.

For each variant provide:
- The subject line (max 50 characters)
- Preview text (max 85 characters)
- The psychological principle being used (curiosity gap, social proof, urgency, personalization, benefit-led, etc.)
- Predicted open rate tier: High / Medium / Low

Email context:
- Product/service: {{product}}
- Campaign goal: {{goal}}
- Audience segment: {{segment}}
- Tone: {{tone}}

Format as a Markdown table.`,
    model: pickModel(1),
    notes: null,
    is_favorite: false,
    tags: ["writing", "email", "marketing", "copywriting"],
    daysAgoN: 5,
  },
  {
    title: "Technical Documentation Writer",
    body: `You are a senior technical writer. Transform the following raw notes or code into polished documentation.

Requirements:
- Use clear, direct language (Flesch-Kincaid grade 10 or below)
- Include: Overview, Prerequisites, Installation, Usage, Parameters table, Examples, Troubleshooting, Changelog
- Code examples must be syntax-highlighted fenced blocks with the language tag
- Every parameter in the Parameters table must have: Name | Type | Required | Default | Description
- Add a "Common errors" section with causes and fixes for the top 3 failure modes

Input notes:
{{raw_notes}}

Output format: Markdown, suitable for a GitHub README.`,
    model: pickModel(2),
    notes: "Add a project-specific style guide to the system prompt for best results.",
    is_favorite: true,
    tags: ["writing", "documentation", "technical"],
    daysAgoN: 8,
  },
  {
    title: "Cold Outreach Email — B2B SaaS",
    body: `Write a cold outreach email for a B2B SaaS product.

Rules:
- Subject line: max 7 words, no clickbait
- Opening: reference something specific about the prospect (not generic)
- Problem: one sentence identifying a pain point they likely have
- Solution: one sentence on what we do (not a feature list)
- Social proof: one data point (customer name + result)
- CTA: single, low-friction ask (15-min call or "reply if relevant")
- Total length: under 150 words
- Tone: peer-to-peer, not salesy

Sender info: {{sender_name}}, {{sender_role}} at {{company}}
Prospect: {{prospect_name}}, {{prospect_role}} at {{prospect_company}}
Our product: {{product_description}}
Relevant pain point: {{pain_point}}`,
    model: pickModel(3),
    notes: null,
    is_favorite: false,
    tags: ["writing", "email", "sales", "b2b"],
    daysAgoN: 12,
  },
  {
    title: "Press Release Template",
    body: `Write a press release following AP Style guidelines.

Structure (follow exactly):
FOR IMMEDIATE RELEASE

[HEADLINE — title case, under 80 characters]
[SUBHEADLINE — one sentence, expands on headline]

[CITY, Date] — [Opening paragraph: who, what, when, where, why — 2–3 sentences]

[Body paragraph 1: supporting details and context]

[Quote from company spokesperson — full name, title]

[Body paragraph 2: product/initiative details, stats]

[Quote from customer, partner, or industry expert if available]

[Boilerplate: standard company description, 3–4 sentences]

###

Media Contact:
[Name, Email, Phone]

Company info:
- Company: {{company_name}}
- Announcement: {{announcement}}
- Key facts: {{key_facts}}
- Spokesperson: {{spokesperson_name}}, {{spokesperson_title}}
- Quote theme: {{quote_theme}}`,
    model: pickModel(4),
    notes: "Double-check dates, names, and titles before sending.",
    is_favorite: false,
    tags: ["writing", "pr", "marketing"],
    daysAgoN: 18,
  },
  {
    title: "YouTube Script — Hook + Structure",
    body: `Write a YouTube video script with a high-retention structure.

Format:
1. HOOK (0–30 sec): Open with a bold claim, surprising fact, or direct question. Do NOT introduce yourself yet.
2. SETUP (30–90 sec): Establish credibility, preview what the viewer will learn, build curiosity.
3. MAIN CONTENT: Break into 3–5 clearly labeled segments. Each segment:
   - Transition phrase to maintain flow
   - Core content (conversational, no jargon unless defined)
   - A "pattern interrupt" moment (story, analogy, visual cue note)
4. CTA (final 30 sec): Soft subscribe ask, related video suggestion, comment question.

Video details:
- Topic: {{topic}}
- Target length: {{length}} minutes
- Channel niche: {{niche}}
- Viewer level: {{level}}
- Key takeaway: {{takeaway}}`,
    model: pickModel(5),
    notes: null,
    is_favorite: true,
    tags: ["writing", "video", "content", "youtube"],
    daysAgoN: 22,
  },
  {
    title: "Product Description — E-commerce",
    body: `Write a product description optimized for conversion and SEO.

Sections:
1. Headline: benefit-first, include primary keyword, max 10 words
2. Subheadline: address the main objection or expand on the benefit
3. Opening paragraph (50 words): paint a picture of life with this product
4. Feature → Benefit bullets (5 bullets, format: "**Feature** — what it means for you")
5. Social proof line: placeholder for review quote + star rating
6. Urgency/scarcity line (optional, only if honest)
7. CTA button text (3–5 words)

Product: {{product_name}}
Category: {{category}}
Key features: {{features}}
Target customer: {{customer}}
Primary keyword: {{keyword}}
Tone: {{tone}}`,
    model: pickModel(6),
    notes: "Generate 3 variants and A/B test on the product page.",
    is_favorite: false,
    tags: ["writing", "ecommerce", "copywriting", "seo"],
    daysAgoN: 30,
  },
  {
    title: "Newsletter Issue Framework",
    body: `Structure a weekly newsletter issue that readers actually want to open.

Layout:
1. Subject line + preview text (3 variants)
2. Personal opening (3–5 sentences, something observed or learned this week)
3. Main story / essay (400–600 words on {{topic}})
4. "Three things worth your time" — curated links with 1-sentence annotations
5. Quick tip or tool of the week (practical, immediately actionable)
6. Closing thought (1–2 sentences, leave them thinking)
7. P.S. line (tease next issue or add a human touch)

Newsletter details:
- Name: {{newsletter_name}}
- Niche: {{niche}}
- Reader persona: {{persona}}
- This week's main topic: {{topic}}
- Tone: {{tone}}`,
    model: pickModel(0),
    notes: null,
    is_favorite: false,
    tags: ["writing", "email", "newsletter", "content"],
    daysAgoN: 35,
  },
  {
    title: "Case Study Writer",
    body: `Transform raw customer data into a compelling case study.

Structure:
1. Title: "[Customer Name] [achieved X result] with [Product]"
2. Executive summary (100 words, 3 key metrics up front)
3. The Challenge (2 paragraphs — situation before, specific pain points)
4. Why They Chose Us (objections addressed, decision criteria)
5. The Solution (implementation story, what was deployed, how long)
6. Results (use actual numbers: %, $, time saved — pull from {{results_data}})
7. Customer quote (pull from {{quote}}, edit for clarity only)
8. What's Next (future plans with the product)

Customer: {{company}}
Industry: {{industry}}
Product used: {{product}}
Results: {{results_data}}
Quote: {{quote}}`,
    model: pickModel(1),
    notes: "Get legal approval on customer quotes before publishing.",
    is_favorite: true,
    tags: ["writing", "sales", "marketing"],
    daysAgoN: 40,
  },
  {
    title: "Ghostwriter — Thought Leadership LinkedIn Post",
    body: `Write a LinkedIn post in the voice of a {{role}} sharing a professional insight.

Rules:
- Hook: first line must stop the scroll (bold claim, counterintuitive take, or specific number)
- No "I'm excited to share" or "Proud to announce" openers
- Short paragraphs — max 2 sentences each
- White space between every paragraph
- Real story > abstract advice
- End with a genuine question to drive comments
- Length: 150–250 words
- No hashtags in the body (add 2–3 at the very end only)

Voice: {{tone}} (e.g., direct, warm, contrarian, analytical)
Topic: {{topic}}
Personal story or data point to anchor it: {{anecdote}}
Main insight: {{insight}}`,
    model: pickModel(2),
    notes: "Run multiple variations and pick the one that sounds most human.",
    is_favorite: true,
    tags: ["writing", "linkedin", "content", "ghostwriting"],
    daysAgoN: 45,
  },

  // ── CODE & ENGINEERING (12) ──────────────────────────────────────────────

  {
    title: "Code Review Assistant",
    body: `You are a senior software engineer performing a thorough code review. Analyze the provided code and return structured feedback.

For each issue found, provide:
- **Severity**: Critical / High / Medium / Low / Nit
- **Category**: Bug | Security | Performance | Maintainability | Style
- **Location**: file + line reference
- **Problem**: clear one-sentence description
- **Suggestion**: concrete fix or refactor with a code snippet

After individual issues, provide:
- An overall assessment (2–3 sentences)
- Top 3 things done well (positive feedback matters)
- Recommended priority order for fixes

Language/framework: {{language}}
PR context: {{pr_description}}

\`\`\`{{language}}
{{code}}
\`\`\``,
    model: pickModel(3),
    notes: "Paste the diff, not the full file, for long codebases.",
    is_favorite: true,
    tags: ["code", "engineering", "review"],
    daysAgoN: 3,
  },
  {
    title: "SQL Query Optimizer",
    body: `You are a database performance expert. Analyze the following SQL query and provide an optimized version.

Your response must include:
1. **Diagnosis**: what is slow and why (missing index, full table scan, N+1, subquery in WHERE, etc.)
2. **Optimized query**: rewritten SQL with comments explaining each change
3. **Index recommendations**: exact CREATE INDEX statements to add
4. **EXPLAIN plan notes**: what to look for in EXPLAIN ANALYZE output
5. **Expected improvement**: rough order-of-magnitude estimate

Database: {{db}} (e.g., PostgreSQL 16, MySQL 8, SQLite 3.45)
Table sizes: {{table_sizes}}
Current query:

\`\`\`sql
{{query}}
\`\`\`

Current EXPLAIN output (if available):
\`\`\`
{{explain_output}}
\`\`\``,
    model: pickModel(4),
    notes: null,
    is_favorite: true,
    tags: ["code", "database", "sql", "performance"],
    daysAgoN: 6,
  },
  {
    title: "REST API Design Review",
    body: `Review this API specification against REST best practices and return a structured report.

Check for:
- Correct HTTP method usage (GET idempotent, POST for creation, PATCH for partial update)
- Resource naming (nouns not verbs, plural, kebab-case)
- Status code correctness (201 for creation, 204 for no-content, 422 for validation errors)
- Pagination strategy (cursor vs offset, Link headers)
- Versioning approach
- Authentication/authorization model
- Error response shape consistency
- Rate limiting headers
- Idempotency key support for mutations

For each issue: Problem | Current | Recommended | Priority

Then suggest a revised OpenAPI 3.1 snippet for the most critical endpoints.

API spec:
\`\`\`yaml
{{openapi_spec}}
\`\`\``,
    model: pickModel(5),
    notes: "Also check for missing CORS headers and content-type validation.",
    is_favorite: false,
    tags: ["code", "api", "engineering", "review"],
    daysAgoN: 10,
  },
  {
    title: "React Component Refactor",
    body: `Refactor the following React component. Apply these specific improvements:

1. Extract logic into custom hooks (one hook per concern)
2. Memoize expensive computations with useMemo
3. Stabilize callbacks with useCallback (only where genuinely needed)
4. Replace prop drilling with composition or context if depth > 2
5. Split into smaller components if the JSX is > 150 lines
6. Add TypeScript types for all props and hook return values
7. Fix any missing dependency array entries in useEffect
8. Replace any direct DOM manipulation with React-idiomatic patterns

Return:
- The refactored component(s)
- A brief explanation of each change and why it matters
- Any trade-offs introduced

Framework: React {{react_version}} with TypeScript

\`\`\`tsx
{{component_code}}
\`\`\``,
    model: pickModel(6),
    notes: "Check that tests still pass after the refactor.",
    is_favorite: false,
    tags: ["code", "react", "frontend", "typescript"],
    daysAgoN: 14,
  },
  {
    title: "Dockerfile Hardening",
    body: `Review and harden the following Dockerfile for production use.

Apply:
- Multi-stage build to minimize final image size
- Pin base image to a specific digest (not just tag)
- Run as non-root user
- Remove dev dependencies and build artifacts
- Use .dockerignore effectively (suggest contents)
- Add HEALTHCHECK instruction
- Set resource limits via labels or compose file
- Scan for secrets accidentally embedded
- Use BuildKit cache mounts for package managers
- Add LABEL metadata (maintainer, version, build date)

Output:
1. Hardened Dockerfile with inline comments
2. Suggested .dockerignore
3. docker build command with --no-cache and --platform flags

Input Dockerfile:
\`\`\`dockerfile
{{dockerfile}}
\`\`\``,
    model: pickModel(0),
    notes: "Run trivy or grype on the final image to check for CVEs.",
    is_favorite: false,
    tags: ["code", "devops", "docker", "security"],
    daysAgoN: 16,
  },
  {
    title: "Unit Test Generator",
    body: `Generate comprehensive unit tests for the following code.

Test requirements:
- Framework: {{test_framework}} (Jest / Vitest / pytest / Go test)
- Coverage targets: happy path, edge cases, error paths, boundary values
- Each test must have a descriptive name following the pattern: "should [behavior] when [condition]"
- Mock all external dependencies (network, filesystem, DB, time)
- Include at least one table-driven test where appropriate
- Add a comment above each test group explaining the scenario being tested

Quality checklist:
- [ ] Tests are independent (no shared mutable state)
- [ ] Each test has a single assertion focus
- [ ] Failure messages are clear
- [ ] Tests document the expected behavior, not the implementation

Function/module under test:
\`\`\`{{language}}
{{code}}
\`\`\``,
    model: pickModel(1),
    notes: null,
    is_favorite: true,
    tags: ["code", "testing", "engineering"],
    daysAgoN: 20,
  },
  {
    title: "Architecture Decision Record (ADR)",
    body: `Write a formal Architecture Decision Record for the following decision.

ADR Format:
---
# ADR-{{number}}: {{title}}

**Date:** {{date}}
**Status:** Proposed | Accepted | Deprecated | Superseded

## Context
[What is the issue motivating this decision? What forces are at play?]

## Decision
[What is the change we're proposing or have agreed to implement?]

## Consequences
### Positive
- ...

### Negative
- ...

### Risks
- ...

## Alternatives Considered
| Option | Pros | Cons | Reason Rejected |
|--------|------|------|-----------------|

## References
- ...
---

Decision to document:
{{decision_description}}

Context and constraints:
{{context}}`,
    model: pickModel(2),
    notes: "Store ADRs in /docs/adr/ in the repository.",
    is_favorite: false,
    tags: ["code", "architecture", "documentation", "engineering"],
    daysAgoN: 25,
  },
  {
    title: "Git Commit Message Rewriter",
    body: `Rewrite the following git commit messages to follow the Conventional Commits specification.

Rules:
- Format: <type>(<scope>): <description>
- Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
- Scope: optional, component or module affected (lowercase)
- Description: imperative mood, lowercase, no period, max 72 chars
- Body: wrap at 72 chars, explain WHY not WHAT (add if the change needs context)
- Footer: reference issues with "Closes #123" or "Fixes #456"

For each commit:
1. Original message
2. Rewritten message
3. Brief explanation of what type was chosen and why

Original commits:
{{commit_messages}}`,
    model: pickModel(3),
    notes: null,
    is_favorite: false,
    tags: ["code", "git", "engineering"],
    daysAgoN: 28,
  },
  {
    title: "Database Schema Design",
    body: `Design a normalized relational database schema for the following requirements.

Deliverables:
1. Entity-Relationship summary (list entities and their relationships with cardinality)
2. CREATE TABLE statements (PostgreSQL syntax) with:
   - Appropriate data types (use TEXT over VARCHAR, TIMESTAMPTZ over TIMESTAMP, etc.)
   - Primary keys (prefer UUIDs with gen_random_uuid())
   - Foreign keys with explicit ON DELETE behavior
   - NOT NULL constraints where logically required
   - CHECK constraints for enum-like columns
   - Unique constraints
3. Index recommendations (one CREATE INDEX per index, with rationale)
4. A note on any denormalization trade-offs made for query performance

Requirements:
{{requirements}}

Scale expectations:
{{scale}}`,
    model: pickModel(4),
    notes: "Always consider migration complexity when proposing schema changes.",
    is_favorite: true,
    tags: ["code", "database", "architecture", "engineering"],
    daysAgoN: 33,
  },
  {
    title: "CLI Tool Scaffolding",
    body: `Generate a production-ready CLI tool scaffold in {{language}}.

Include:
- Argument parsing with help text and version flag
- Subcommand structure (if applicable)
- Config file loading (XDG base dirs on Linux/Mac, %APPDATA% on Windows)
- Structured logging (JSON in production, colored in dev/TTY)
- Graceful shutdown on SIGINT/SIGTERM
- Exit codes: 0 success, 1 general error, 2 misuse, 78 config error
- A Makefile or build script with: build, test, lint, release targets
- GitHub Actions CI workflow

Tool description: {{description}}
Subcommands needed: {{subcommands}}
Config options: {{config_options}}`,
    model: pickModel(5),
    notes: null,
    is_favorite: false,
    tags: ["code", "cli", "engineering"],
    daysAgoN: 38,
  },
  {
    title: "Security Vulnerability Audit",
    body: `Perform a security audit of the following code, focusing on OWASP Top 10 vulnerabilities.

Check for:
1. **Injection** (SQL, NoSQL, OS command, LDAP, XPath)
2. **Broken Authentication** (weak session tokens, no rate limiting, credential exposure)
3. **Sensitive Data Exposure** (PII in logs, unencrypted storage, weak crypto)
4. **Broken Access Control** (missing authz checks, IDOR, privilege escalation)
5. **Security Misconfiguration** (default creds, verbose errors, open S3 buckets)
6. **XSS** (reflected, stored, DOM-based)
7. **Insecure Deserialization**
8. **Known Vulnerable Dependencies** (flag outdated packages)
9. **Insufficient Logging & Monitoring**

For each finding: Severity (Critical/High/Medium/Low) | CWE ID | Location | Description | Remediation

Language: {{language}}
\`\`\`{{language}}
{{code}}
\`\`\``,
    model: pickModel(6),
    notes: "Never log or store secrets found in code reviews. Rotate them immediately.",
    is_favorite: true,
    tags: ["code", "security", "review", "engineering"],
    daysAgoN: 42,
  },
  {
    title: "Performance Profiling Interpreter",
    body: `Analyze the following performance profile data and provide actionable optimization recommendations.

Analysis framework:
1. **Hot path identification** — which functions consume the most CPU/time?
2. **Memory pressure** — allocation rate, GC pauses, heap growth
3. **I/O bottlenecks** — blocking calls, missing connection pooling, N+1 queries
4. **Concurrency issues** — lock contention, thread starvation, event loop blocking
5. **Quick wins** — changes that take < 1 day and yield > 20% improvement
6. **Strategic improvements** — architectural changes worth planning

For each recommendation:
- Expected impact (High/Medium/Low)
- Implementation effort (Hours/Days/Weeks)
- Code snippet or config change

Runtime: {{runtime}}
Profile data:
\`\`\`
{{profile_data}}
\`\`\``,
    model: pickModel(0),
    notes: null,
    is_favorite: false,
    tags: ["code", "performance", "engineering"],
    daysAgoN: 50,
  },

  // ── AI IMAGE GENERATION (10) ─────────────────────────────────────────────

  {
    title: "Cinematic Portrait — Golden Hour",
    body: `Cinematic portrait photograph of {{subject}}, golden hour lighting, shot on Hasselblad X2D with 85mm f/1.4 lens, shallow depth of field, warm tones, bokeh background of {{setting}}, film grain, professional color grading, editorial style, National Geographic quality, ultra-detailed, 8K resolution.

Negative prompt: cartoon, illustration, painting, deformed, blurry, watermark, text, ugly, low quality, overexposed, flat lighting.`,
    model: "midjourney-v7",
    notes: "Works well at --ar 4:5 for Instagram, --ar 2:3 for print.",
    is_favorite: true,
    tags: ["image", "photography", "portrait"],
    daysAgoN: 4,
  },
  {
    title: "Sci-Fi Environment Concept Art",
    body: `Concept art for a science fiction {{environment_type}}, designed by Syd Mead and Craig Mullins, epic scale, dramatic lighting with neon accent colors, futuristic architecture, biopunk meets brutalism aesthetic, atmospheric haze, tiny human figures for scale, highly detailed, professional concept art for AAA game, matte painting style, trending on ArtStation.

Environment: {{environment_description}}
Time of day: {{time}}
Color palette: {{palette}}
Mood: {{mood}}

Style reference: Blade Runner 2049 + Mass Effect`,
    model: "stable-diffusion-xl",
    notes: "Use CFG 7–9, 40+ steps for best results.",
    is_favorite: false,
    tags: ["image", "concept-art", "scifi"],
    daysAgoN: 9,
  },
  {
    title: "Product Photography — Clean Studio",
    body: `Professional product photography of {{product}}, clean white studio background, soft box lighting setup with subtle shadow, shot from {{angle}} angle, macro detail if applicable, color-accurate rendering, commercial photography style, high key lighting, suitable for e-commerce, retouched, no reflections unless intentional, 4K product render.

Product color: {{color}}
Hero feature to emphasize: {{feature}}
Brand aesthetic: {{brand_style}}`,
    model: "dall-e-3",
    notes: "DALL-E 3 handles white backgrounds better than Midjourney for products.",
    is_favorite: true,
    tags: ["image", "photography", "product", "ecommerce"],
    daysAgoN: 13,
  },
  {
    title: "Logo Design Concepts",
    body: `Minimalist logo design for {{company_name}}, a {{industry}} company.

Style: geometric, clean, modern, scalable
Color palette: {{colors}} (provide hex codes if specific)
Icon concept: {{icon_concept}}
Variations requested: icon only, wordmark, combined lockup
Background: transparent / white
Format: vector-style SVG aesthetic

Design principles to apply:
- Works at 16px favicon and billboard scale
- Readable in black and white
- No gradients in primary mark (gradients in secondary use only)
- Negative space used intentionally

Reference styles: {{reference_brands}} (not a copy, just aesthetic direction)`,
    model: "midjourney-v7",
    notes: "Always ask for --no text unless company name should be in the mark.",
    is_favorite: false,
    tags: ["image", "logo", "branding", "design"],
    daysAgoN: 17,
  },
  {
    title: "Illustrated Book Cover",
    body: `Book cover illustration for a {{genre}} novel titled "{{title}}".

Art direction:
- Illustration style: {{art_style}} (e.g., painterly realism, flat design, noir, watercolor)
- Mood: {{mood}}
- Central image: {{central_image}}
- Color temperature: {{warm_or_cool}}
- Typography space: leave clear area at top for title, bottom for author name
- Composition: rule of thirds, strong focal point

Reference works: {{reference_books}}

The cover should evoke: {{emotion}}
Target audience: {{audience}}`,
    model: "stable-diffusion-xl",
    notes: "Generate at 6×9 aspect ratio (book trim size). Upscale with Real-ESRGAN.",
    is_favorite: false,
    tags: ["image", "illustration", "books", "design"],
    daysAgoN: 21,
  },
  {
    title: "Character Design Sheet",
    body: `Character design reference sheet for {{character_name}}, the {{character_role}} in a {{setting}} story.

Sheet includes:
- Front view (neutral pose)
- 3/4 view
- Back view
- 2 expression closeups (happy, determined)
- 1 action pose
- Colour palette swatches

Character details:
- Age/build: {{age_build}}
- Distinguishing features: {{features}}
- Outfit/costume: {{outfit}}
- Equipment/weapons: {{equipment}}

Art style: {{style}} (e.g., anime, western comic, concept art, pixel art)
Color palette: {{palette}}
Mood/personality conveyed: {{personality}}`,
    model: "midjourney-v7",
    notes: "Use --cref with a previous generation for consistency across sheets.",
    is_favorite: true,
    tags: ["image", "character-design", "illustration", "concept-art"],
    daysAgoN: 27,
  },
  {
    title: "Interior Design Visualization",
    body: `Photorealistic interior design rendering of a {{room_type}}.

Style: {{design_style}} (e.g., Japandi, maximalist, Scandinavian, industrial, Art Deco)
Time of day/lighting: {{lighting}}
Key furniture pieces: {{furniture}}
Materials: {{materials}} (e.g., warm walnut, polished concrete, linen, brass)
Color palette: {{colors}}
View: {{camera_angle}} (e.g., eye level, 45° overhead)

Quality: architectural visualization, 8K, photorealistic, Unreal Engine 5 quality, designed by a top interior design studio, published in AD magazine.`,
    model: "dall-e-3",
    notes: null,
    is_favorite: false,
    tags: ["image", "interior-design", "architecture"],
    daysAgoN: 32,
  },
  {
    title: "Fantasy Map Illustration",
    body: `Illustrated fantasy map in the style of classic Tolkien/D&D cartography.

Map details:
- Region name: {{region_name}}
- Scale: {{scale}} (e.g., continent, kingdom, city)
- Key features to include: {{features}} (mountains, forests, rivers, cities, ruins, roads)
- Map style: aged parchment texture, hand-drawn aesthetic, ink and watercolor tones
- Compass rose: include in lower right
- Legend box: include with symbols for terrain types
- City markers: use classic tower/building icons
- Labels: fantasy-style serif typography

Mood: mysterious, epic, inviting exploration`,
    model: "midjourney-v7",
    notes: "Best at --ar 4:3 or 3:2. Use --stylize 750 for more artistic result.",
    is_favorite: true,
    tags: ["image", "fantasy", "map", "illustration"],
    daysAgoN: 36,
  },
  {
    title: "Motion Graphics Keyframe",
    body: `Design a keyframe for a motion graphics animation explaining {{concept}}.

Visual requirements:
- Style: {{style}} (e.g., flat design, isometric, data visualization, glassmorphism)
- Key visual metaphor: {{metaphor}}
- Data or statistics to visualize: {{data}}
- Color scheme: {{colors}}
- Layout: {{layout}} (e.g., hero image + supporting elements, infographic grid, timeline)
- Brand guidelines: {{brand_notes}}

Output should look like a frame from a professional explainer video produced by a top motion design studio. Clean vectors, professional typography, polished finish.`,
    model: "dall-e-3",
    notes: "Export the concept and recreate in After Effects or Rive.",
    is_favorite: false,
    tags: ["image", "motion-graphics", "design", "video"],
    daysAgoN: 43,
  },
  {
    title: "Album Artwork Generator",
    body: `Create album artwork for a {{genre}} music release.

Album: "{{album_title}}" by {{artist_name}}
Release vibe: {{vibe}}
Visual concept: {{concept}}

Technical specs:
- Format: square (1:1 aspect ratio), 3000×3000px equivalent
- Must work as a 300px thumbnail (streaming) and full-size print
- Typography space: artist name and album title should be placeable

Art direction:
- Style: {{art_style}}
- Color palette: {{palette}}
- Key visual elements: {{elements}}
- Mood: {{mood}}
- Reference: {{visual_references}}

Avoid: overused clichés for the genre unless used ironically`,
    model: "midjourney-v7",
    notes: null,
    is_favorite: false,
    tags: ["image", "music", "design", "branding"],
    daysAgoN: 48,
  },

  // ── DATA ANALYSIS (8) ────────────────────────────────────────────────────

  {
    title: "Data Analysis Plan Generator",
    body: `Create a structured data analysis plan for the following business question.

Deliverables:
1. **Reframed question** — turn the business question into 2–3 specific, answerable analytical questions
2. **Required data sources** — tables, APIs, or datasets needed, with the key columns from each
3. **Analysis steps** — ordered list with the statistical or computational method for each step
4. **Metrics to compute** — define each metric precisely (formula + business meaning)
5. **Visualization recommendations** — chart type + what insight each chart should surface
6. **Assumptions and limitations** — what could invalidate the analysis
7. **Success criteria** — how will we know if we answered the question?

Business question: {{question}}
Available data: {{data_description}}
Stakeholder: {{stakeholder}}
Decision this will inform: {{decision}}`,
    model: pickModel(2),
    notes: null,
    is_favorite: false,
    tags: ["data", "analysis", "strategy"],
    daysAgoN: 7,
  },
  {
    title: "SQL Analytics Query Builder",
    body: `Write optimized analytics SQL for the following business question.

Requirements:
- Window functions over JOINs where they reduce query complexity
- CTEs for readability (one CTE per logical step)
- Comments explaining non-obvious logic
- EXPLAIN-friendly: avoid functions on indexed columns in WHERE
- Include a cohort analysis / time series / funnel variant as appropriate

Database: {{database}} (PostgreSQL / BigQuery / Snowflake / DuckDB)
Question: {{question}}

Schema:
\`\`\`sql
{{schema}}
\`\`\`

Sample data (optional):
\`\`\`
{{sample_data}}
\`\`\``,
    model: pickModel(3),
    notes: "Test on a date-filtered subset first; full scans on large tables are expensive.",
    is_favorite: true,
    tags: ["data", "sql", "analytics"],
    daysAgoN: 11,
  },
  {
    title: "A/B Test Statistical Interpreter",
    body: `Interpret the results of an A/B test and provide a clear recommendation.

Statistical analysis:
1. Confirm test validity: minimum sample size, test duration, SRM check
2. Primary metric: compute relative lift, absolute difference, confidence interval
3. Statistical significance: p-value vs. alpha (0.05), two-sided test
4. Practical significance: is the effect size meaningful for the business?
5. Secondary metrics: check for negative side effects
6. Segment breakdown: does the effect vary significantly by user segment?
7. Recommendation: ship / iterate / stop — with clear reasoning

Business context: {{context}}

Test data:
- Control: {{control_n}} users, {{control_metric}} {{metric_name}}
- Variant: {{variant_n}} users, {{variant_metric}} {{metric_name}}
- Test duration: {{duration}}
- Pre-experiment baseline: {{baseline}}`,
    model: pickModel(4),
    notes: null,
    is_favorite: false,
    tags: ["data", "statistics", "product", "analysis"],
    daysAgoN: 15,
  },
  {
    title: "Dashboard Metrics Definition",
    body: `Define the metrics for a {{team}} team dashboard.

For each metric provide:
| Metric | Definition | Formula | Data Source | Cadence | Owner | Good Direction | Benchmark |

Then organize metrics into a framework:
- **North Star Metric** (1 metric that best captures the team's core value)
- **Input Metrics** (leading indicators the team directly controls)
- **Output Metrics** (outcomes that result from good inputs)
- **Health Metrics** (things that shouldn't break while chasing outputs)
- **Counter Metrics** (guardrails to prevent gaming)

Business context: {{context}}
Team focus: {{focus}}
Stakeholders: {{stakeholders}}`,
    model: pickModel(5),
    notes: "Review quarterly — metrics that were once useful can become vanity metrics.",
    is_favorite: false,
    tags: ["data", "analytics", "product", "strategy"],
    daysAgoN: 19,
  },
  {
    title: "Python Data Cleaning Script",
    body: `Write a production-quality Python data cleaning script using pandas (or polars if specified).

Script must:
1. Load data from {{source}} (CSV / Parquet / JSON / SQL)
2. Profile the raw data: shape, dtypes, null counts, cardinality per column
3. Handle missing values: strategy per column (drop / fill / flag)
4. Fix data type issues: parse dates, cast numerics, standardize booleans
5. Deduplicate rows: by {{dedup_key}}, keep {{keep_strategy}}
6. Standardize string columns: strip whitespace, normalize case, fix encodings
7. Validate against schema: raise clear errors for constraint violations
8. Output a cleaned dataset and a data quality report

Dataset description: {{description}}
Target schema: {{schema}}
Output format: {{output_format}}`,
    model: pickModel(6),
    notes: null,
    is_favorite: true,
    tags: ["data", "python", "code", "engineering"],
    daysAgoN: 24,
  },
  {
    title: "Churn Prediction Feature Engineering",
    body: `Design feature engineering for a B2B SaaS churn prediction model.

For each feature:
- **Name**: snake_case column name
- **Description**: what it measures
- **Calculation**: precise SQL or Python formula
- **Rationale**: why it predicts churn
- **Data source**: which table/event stream
- **Staleness**: how fresh does it need to be?

Feature categories to cover:
1. Engagement depth (DAU/MAU, feature breadth, session frequency)
2. Product adoption (key feature activation, time-to-value milestones)
3. Support signals (ticket volume, severity, CSAT trend)
4. Contractual signals (invoice latency, seat utilization, contract age)
5. Relationship signals (champion change, stakeholder count, QBR attendance)
6. Competitive signals (if available)

Product type: {{product}}
Subscription model: {{billing}}
Available data sources: {{data_sources}}`,
    model: pickModel(0),
    notes: "Validate feature importance with SHAP after model training.",
    is_favorite: false,
    tags: ["data", "ml", "product", "analytics"],
    daysAgoN: 29,
  },
  {
    title: "Executive Summary — Data Report",
    body: `Write an executive summary for a data analysis report.

Rules:
- Max 300 words
- Lead with the most important finding, not the methodology
- Use plain English — no jargon, no p-values unless critical
- Three sections: What We Found | What It Means | What To Do About It
- Quantify everything: "X% increase" not "significant improvement"
- Acknowledge the #1 limitation or caveat
- End with a clear decision recommendation

Full analysis to summarize:
{{analysis_text}}

Audience: {{audience}} (e.g., CEO, Board, Product VP)
Decision context: {{decision}}`,
    model: pickModel(1),
    notes: null,
    is_favorite: true,
    tags: ["data", "writing", "strategy"],
    daysAgoN: 34,
  },
  {
    title: "KPI Tree Builder",
    body: `Build a KPI tree that breaks down the primary business metric into its component drivers.

Output format:
1. A text-based tree diagram showing the metric hierarchy
2. For each node in the tree:
   - Metric name
   - Formula (how it combines child metrics)
   - Current value (use {{current_values}} if provided)
   - Lever owner (who on the team controls this)
   - Sensitivity: how much does a 10% change in this node move the parent?

Primary metric: {{north_star}}
Business model: {{business_model}} (e.g., B2B SaaS, marketplace, e-commerce)
Revenue formula: {{revenue_formula}}
Current values: {{current_values}}`,
    model: pickModel(2),
    notes: "The KPI tree is most useful when used to prioritize what to instrument next.",
    is_favorite: false,
    tags: ["data", "strategy", "analytics", "product"],
    daysAgoN: 41,
  },

  // ── PRODUCT & STRATEGY (8) ───────────────────────────────────────────────

  {
    title: "PRD (Product Requirements Document)",
    body: `Write a Product Requirements Document for the following feature.

Template:
---
# PRD: {{feature_name}}
**Author:** {{author}} | **Date:** {{date}} | **Status:** Draft → Review → Approved

## 1. Problem Statement
[What user/business problem are we solving? Why now?]

## 2. Goals & Success Metrics
| Goal | Metric | Baseline | Target | Timeframe |

## 3. Non-Goals
[What explicitly falls outside scope]

## 4. User Stories
As a [user type], I want to [action], so that [benefit].
[At least 5 user stories, ordered by priority]

## 5. Functional Requirements
[Numbered list, grouped by feature area]

## 6. Non-Functional Requirements
Performance | Accessibility | Security | Scalability

## 7. Open Questions
[What must be decided before implementation?]

## 8. Out of Scope for V1
---

Feature: {{feature}}
User problem: {{problem}}
Business context: {{context}}`,
    model: pickModel(3),
    notes: null,
    is_favorite: true,
    tags: ["product", "strategy", "documentation"],
    daysAgoN: 5,
  },
  {
    title: "Competitor Analysis Framework",
    body: `Conduct a structured competitor analysis for {{company}} competing in {{market}}.

Framework:
1. **Competitor matrix** — 5–8 competitors mapped on two key differentiating axes
2. **Feature comparison table** — must-have features, rate each competitor: ✓ Full / ~ Partial / ✗ Missing
3. **Positioning map** — price vs. capability, or innovation vs. simplicity
4. **Strengths & Weaknesses** (per competitor, bullet points)
5. **Our differentiation** — where the whitespace is, what we can own
6. **Trends** — what is the market moving toward?
7. **Threats** — which competitor move would hurt us most?

Our product: {{our_product}}
Market segment: {{segment}}
Competitors to analyze: {{competitors}}
Sources used: {{sources}}`,
    model: pickModel(4),
    notes: "Update quarterly. Use G2, Capterra, and AppStore reviews for feature gaps.",
    is_favorite: false,
    tags: ["product", "strategy", "research"],
    daysAgoN: 9,
  },
  {
    title: "Sprint Planning Meeting Agenda",
    body: `Create a structured sprint planning agenda for a {{team_size}}-person engineering team.

Agenda ({{total_time}} total):
1. **Sprint Review close-out** ({{time_1}})
   - Demo of completed work
   - Acceptance criteria sign-off

2. **Context setting** ({{time_2}})
   - Product goals for this sprint
   - Capacity calculation (team availability, holidays)

3. **Backlog refinement** ({{time_3}})
   - Review top N stories
   - Confirm acceptance criteria complete
   - Technical discussion for complex items

4. **Estimation** ({{time_4}})
   - Story points / t-shirt sizing round
   - Flag dependencies and blockers

5. **Sprint commitment** ({{time_5}})
   - Pull top items into sprint based on velocity
   - Assign owners and identify pairing opportunities

6. **Sprint goal** — craft a one-sentence sprint goal

Team context: {{context}}
Sprint length: {{sprint_length}}
Current velocity: {{velocity}}`,
    model: pickModel(5),
    notes: null,
    is_favorite: false,
    tags: ["product", "agile", "engineering"],
    daysAgoN: 13,
  },
  {
    title: "User Interview Script",
    body: `Write a user interview script for the following research goal.

Script structure:
1. **Introduction** (5 min) — purpose, consent, recording permission, warm-up
2. **Context questions** (10 min) — understand their workflow without leading
3. **Core exploration** (25 min) — open-ended questions around the problem space
4. **Concept testing** (15 min, if applicable) — reaction to prototype or concept
5. **Wrap-up** (5 min) — anything else, referrals, thank you

Rules for all questions:
- No leading questions ("Do you find X frustrating?" → "How do you feel about X?")
- No binary questions (yes/no)
- Use "Tell me about a time when..." for concrete stories
- Silence is okay — don't rush to fill it
- Probes: "Say more about that." / "What happened next?" / "Why was that?"

Research goal: {{goal}}
User segment: {{segment}}
Key hypotheses to validate/invalidate: {{hypotheses}}`,
    model: pickModel(6),
    notes: "Record with permission. Transcribe with Otter.ai. Tag insights in Dovetail.",
    is_favorite: true,
    tags: ["product", "research", "ux"],
    daysAgoN: 17,
  },
  {
    title: "OKR Writing Assistant",
    body: `Write well-formed OKRs for the following team and quarter.

For each Objective:
- The Objective should be inspirational, qualitative, time-bound, and directional
- 2–4 Key Results per Objective:
  - Quantitative and measurable
  - Outcome-based, not output-based (not "launch feature X" — instead "increase metric Y by Z%")
  - Aggressive but achievable (70% confidence of hitting)
  - Has a clear measurement method

Also provide:
- Initiatives (projects that will drive each KR)
- Dependencies (what other teams need to deliver)
- Risk: what could prevent us from achieving this OKR?

Team: {{team}}
Quarter: {{quarter}}
Company context: {{company_goals}}
Team context: {{team_context}}
Previous quarter performance: {{previous_okrs}}`,
    model: pickModel(0),
    notes: "OKRs work best when the team sets them bottom-up, not top-down.",
    is_favorite: false,
    tags: ["product", "strategy", "okrs"],
    daysAgoN: 22,
  },
  {
    title: "Feature Prioritization Matrix",
    body: `Build a feature prioritization analysis using multiple frameworks.

Apply these models to the feature list and combine scores:

1. **RICE Score** (Reach × Impact × Confidence / Effort)
2. **ICE Score** (Impact × Confidence × Ease)
3. **MoSCoW** classification (Must / Should / Could / Won't for this release)
4. **Value vs. Effort 2×2** — place each feature in the quadrant
5. **Kano Model** — classify as: Basic / Performance / Excitement / Indifferent / Reverse

For each feature, provide:
- Scores across all frameworks
- Recommended priority rank (1 = ship first)
- Key assumptions that most affect the ranking
- Dependencies on other features

Feature list: {{features}}
Target release scope: {{scope}}
Constraints: {{constraints}}`,
    model: pickModel(1),
    notes: null,
    is_favorite: true,
    tags: ["product", "strategy", "prioritization"],
    daysAgoN: 26,
  },
  {
    title: "Go-To-Market Strategy Brief",
    body: `Write a Go-To-Market strategy brief for a new product launch.

Sections:
1. **Product summary** — one paragraph, lead with the customer problem
2. **Target market** — ICP definition with 3 firmographic + 3 psychographic attributes
3. **Positioning statement** — "For [target], who [need], [product] is a [category] that [key benefit]. Unlike [alternative], we [differentiator]."
4. **Pricing & packaging** — tiers, rationale, land-and-expand motion
5. **Launch channels** — ranked by expected ROI, with rationale
6. **Launch sequence** — 30/60/90 day milestones
7. **Success metrics** — by phase: awareness → trial → activation → retention
8. **Budget allocation** — % breakdown by channel

Product: {{product}}
Launch date target: {{date}}
Budget: {{budget}}
Team resources: {{resources}}`,
    model: pickModel(2),
    notes: "Validate pricing with 10 prospect conversations before finalizing.",
    is_favorite: false,
    tags: ["product", "marketing", "strategy"],
    daysAgoN: 31,
  },
  {
    title: "Retrospective Facilitator Guide",
    body: `Create a sprint retrospective session guide for a team that has been struggling with {{challenge}}.

Session design ({{duration}} total for {{team_size}} people):

**Check-in** (5 min): Low-stakes warm-up question to get voices in the room.

**Data gathering** (15 min): Silent brainstorm using the format:
- ✅ What went well?
- ⚠️ What was difficult?
- 💡 What should we try differently?
- ❓ What are we still confused about?

**Insight generation** (15 min): Affinity mapping, dot voting on themes.

**Action items** (15 min):
- For each top theme: root cause (5 Whys), owner, due date
- Max 3 action items (to avoid overwhelm)

**Close** (5 min): Team temperature check 1–5, appreciation round.

Facilitation notes:
- {{specific_tension_to_address}}
- Psychological safety tips for this team`,
    model: pickModel(3),
    notes: null,
    is_favorite: false,
    tags: ["product", "agile", "team"],
    daysAgoN: 37,
  },

  // ── RESEARCH & REASONING (6) ─────────────────────────────────────────────

  {
    title: "Steel Man Argument Generator",
    body: `Present the strongest possible version of the following position — a steel man, not a straw man.

Rules:
- Assume the position is held by the most intelligent, well-informed, good-faith proponent possible
- Cite the best evidence and arguments that actually support this view
- Acknowledge the strongest objections to the opposing view
- Do NOT insert your own opinion unless explicitly asked
- Separate empirical claims from value judgments
- Note where the strongest version of this position actually agrees with its critics

After the steel man, optionally provide:
- The strongest counter-arguments (steel man of the opposition)
- Where the genuine crux of disagreement lies

Position to steel man: {{position}}
Context: {{context}}`,
    model: pickModel(4),
    notes: "Useful for preparing debate positions, policy memos, and investment theses.",
    is_favorite: false,
    tags: ["research", "reasoning", "analysis"],
    daysAgoN: 8,
  },
  {
    title: "Literature Review Synthesizer",
    body: `Synthesize the following research papers into a coherent literature review section.

Structure:
1. **Introduction** — frame the research question and why this body of literature is relevant
2. **Thematic synthesis** — organize findings by theme, not by paper (avoid "Smith (2020) found X. Jones (2021) found Y.")
3. **Agreements across papers** — where the evidence converges
4. **Contradictions and debates** — where studies disagree and why (methodology differences, context, etc.)
5. **Gaps in the literature** — what hasn't been studied adequately
6. **Transition** — how this review motivates the current study/analysis

Style: academic, precise, objective
Citation format: {{citation_style}} (APA / MLA / Chicago / IEEE)

Papers to synthesize:
{{paper_summaries}}`,
    model: pickModel(5),
    notes: "Double-check all citations — models can hallucinate paper details.",
    is_favorite: true,
    tags: ["research", "writing", "academic"],
    daysAgoN: 12,
  },
  {
    title: "Socratic Dialogue Facilitator",
    body: `Engage with me in a Socratic dialogue to help me think through the following question.

Rules for this dialogue:
- Ask only one question at a time
- Each question should expose an assumption, inconsistency, or unexplored implication in my previous answer
- Do NOT provide answers — only ask questions that help me discover them
- When I make a claim, probe: "How do you know that?", "What would it mean if that were false?", "What's the strongest objection to that?"
- After 8–10 exchanges, summarize what we've established and what remains unresolved
- Use the elenctic method: help me see where my initial view needs refinement

Question to explore: {{question}}

My initial position: {{initial_position}}`,
    model: pickModel(6),
    notes: "Best for complex strategic, ethical, or philosophical questions.",
    is_favorite: false,
    tags: ["research", "reasoning", "philosophy"],
    daysAgoN: 16,
  },
  {
    title: "SWOT Analysis Builder",
    body: `Conduct a rigorous SWOT analysis for {{subject}}.

For each quadrant, provide 5–7 well-reasoned points (not platitudes):

**Strengths** (internal, positive)
- Be specific: not "good team" but "founding team has 3× successful exits in this space"
- Back each point with evidence or data where possible

**Weaknesses** (internal, negative)
- Be honest: this is where most analyses fail by being too gentle
- Include structural weaknesses, not just fixable operational issues

**Opportunities** (external, positive)
- Tie to specific market trends, regulatory changes, or competitor gaps
- Quantify where possible (market size, CAGR, timing window)

**Threats** (external, negative)
- Include non-obvious threats (technology shifts, regulatory risk, talent market)

After the matrix:
- Top 3 SO strategies (use strengths to capture opportunities)
- Top 3 ST strategies (use strengths to mitigate threats)
- Top 2 WO strategies (fix weaknesses to capture opportunities)
- Top 2 WT strategies (defensive plays)

Subject: {{subject}}
Context: {{context}}`,
    model: pickModel(0),
    notes: null,
    is_favorite: false,
    tags: ["research", "strategy", "analysis"],
    daysAgoN: 20,
  },
  {
    title: "Hypothesis Testing Framework",
    body: `Design a structured hypothesis test for the following business assumption.

Framework:
1. **Hypothesis statement**: "We believe [assumption]. We will know this is true when [observable evidence]. We expect to see this within [timeframe]."
2. **Risk assessment**: How wrong would we be if this assumption is false? (High/Medium/Low)
3. **Minimum viable test**: What is the cheapest, fastest experiment that would invalidate this?
4. **Metrics**: Primary metric + 2 secondary metrics to watch
5. **Sample size / data required**: What volume is needed for a statistically valid signal?
6. **Test design**: Controlled experiment / cohort analysis / survey / prototype test / smoke test
7. **Decision criteria**: "If [metric] is [above/below] [threshold] by [date], we will [proceed/pivot/stop]."
8. **Learning plan**: Who reviews results, when, and what decisions follow?

Assumption to test: {{assumption}}
Business context: {{context}}
Available resources: {{resources}}`,
    model: pickModel(1),
    notes: "Document results regardless of outcome — failed experiments are valuable.",
    is_favorite: true,
    tags: ["research", "product", "strategy", "data"],
    daysAgoN: 24,
  },
  {
    title: "Research Briefing Synthesizer",
    body: `Transform raw research notes into a polished briefing document.

Format:
---
# Research Briefing: {{topic}}
**Date:** {{date}} | **Analyst:** {{name}} | **Confidence:** High / Medium / Low

## Key Findings (Top 5, each in one sentence)
1. ...

## Detailed Findings
[Organized by theme, not source. 400–600 words total.]

## Methodology Note
[Sources used, date range, limitations]

## Uncertainties
[What we don't know and why it matters]

## Implications
[For {{audience}} — what decisions or actions follow from this research?]

## Sources
[Properly cited]
---

Raw notes to synthesize:
{{raw_notes}}

Briefing audience: {{audience}}`,
    model: pickModel(2),
    notes: null,
    is_favorite: false,
    tags: ["research", "writing", "analysis"],
    daysAgoN: 28,
  },

  // ── SYSTEM & META PROMPTS (8) ────────────────────────────────────────────

  {
    title: "Custom GPT System Prompt — Customer Support Agent",
    body: `You are {{bot_name}}, a customer support AI for {{company_name}}.

**Persona:**
- Tone: warm, empathetic, efficient — like a knowledgeable friend, not a corporate drone
- Never say "I cannot help with that" without offering an alternative
- Use the customer's name when provided

**Capabilities you have:**
- Look up order status and shipping info
- Process returns within 30 days of purchase
- Answer product questions using the knowledge base
- Escalate complex billing disputes to human agents

**Boundaries:**
- Never make pricing commitments outside the current published rates
- Never access, modify, or discuss other customers' data
- If asked about competitors: acknowledge the question, redirect to our value

**Escalation triggers** (immediately transfer to human):
- Legal threats or mentions of regulatory complaints
- Accounts flagged as high-value (revenue > $10k/month)
- Safety issues with physical products

**Response format:**
- First message: greet + confirm issue understanding
- Resolution messages: action taken + next step + timeline
- Max 3 sentences per message unless a detailed answer is needed`,
    model: pickModel(3),
    notes: "Test adversarial prompts before deploying. Check for prompt injection vulnerabilities.",
    is_favorite: true,
    tags: ["meta-prompt", "system-prompt", "ai", "customer-support"],
    daysAgoN: 6,
  },
  {
    title: "Chain-of-Thought Reasoning Template",
    body: `Before providing your final answer to the following question, reason through it step by step.

Reasoning protocol:
1. **Restate the question** in your own words to confirm understanding
2. **Identify what's being asked** — what type of reasoning is required? (math, logic, ethics, prediction, etc.)
3. **List what you know** that's relevant
4. **List what you're uncertain about**
5. **Work through the problem** step by step, showing intermediate results
6. **Check your work** — does the answer make sense? Are there edge cases?
7. **State your final answer** clearly, separated from the reasoning

Important: If at any step you realize your previous reasoning was wrong, explicitly correct it. Don't continue a flawed reasoning chain.

Question: {{question}}`,
    model: pickModel(4),
    notes: "Particularly effective for math, logic puzzles, and multi-step planning.",
    is_favorite: false,
    tags: ["meta-prompt", "reasoning", "ai"],
    daysAgoN: 10,
  },
  {
    title: "AI Persona — Socratic Tutor",
    body: `You are an expert tutor in {{subject}} using the Socratic method.

Your approach:
- Never give direct answers to conceptual questions — guide the student to discover them
- Diagnose misconceptions through gentle probing questions
- When a student is stuck: give the smallest useful hint, then ask a question
- Celebrate correct reasoning, not just correct answers
- Adjust your language to the student's demonstrated level

Conversation structure:
- Start by assessing prior knowledge with an open question
- Build from what they know toward what they don't
- Use concrete examples and analogies tied to the student's stated interests
- Check understanding with "Can you explain that back to me in your own words?"
- End each session with a summary of what was learned and a preview of next steps

Never:
- Give the answer and explain it after (defeats the purpose)
- Make the student feel bad for not knowing something
- Move on until the current concept is solid

Student level: {{level}}
Subject focus: {{topic}}`,
    model: pickModel(5),
    notes: null,
    is_favorite: true,
    tags: ["meta-prompt", "education", "ai", "system-prompt"],
    daysAgoN: 14,
  },
  {
    title: "Few-Shot Learning Template Builder",
    body: `Create a few-shot prompt for the following classification/generation task.

Structure:
1. **Task description** (1–2 sentences, clear and unambiguous)
2. **Input format** specification
3. **Output format** specification
4. **Examples** (5–8 high-quality examples that cover):
   - The typical case
   - Edge cases
   - Cases that could be confused with each other
   - At least one negative example (what NOT to output)
5. **Formatting instructions** for the actual input

Quality criteria for examples:
- Diverse (don't cluster in one part of the distribution)
- Unambiguous (a human expert would agree on every label/output)
- Representative (reflect real-world input distribution)

Task: {{task_description}}
Input type: {{input_type}}
Output type: {{output_type}}
Example pool to draw from: {{raw_examples}}`,
    model: pickModel(6),
    notes: "Measure few-shot accuracy vs zero-shot. Sometimes zero-shot with good instructions wins.",
    is_favorite: false,
    tags: ["meta-prompt", "ai", "prompt-engineering"],
    daysAgoN: 18,
  },
  {
    title: "LLM Evaluation Rubric Builder",
    body: `Design an evaluation rubric for assessing LLM output quality on the following task.

Rubric structure:
For each dimension, define:
- **Dimension name**
- **What it measures**
- **Scoring scale** (1–5 with clear behavioral anchors for each score)
- **Weight** (% of total score)
- **Example of a score-1 output**
- **Example of a score-5 output**

Recommended dimensions (customize for the task):
1. Accuracy / Factual correctness
2. Relevance to the prompt
3. Completeness
4. Clarity and coherence
5. Format compliance
6. Tone / Appropriateness
7. Safety / Harm avoidance

Also include:
- Inter-rater reliability instructions (how to resolve disagreements)
- Examples that should always score 1 (automatic fails)
- Notes on what to ignore when scoring

Task being evaluated: {{task}}
Use case: {{use_case}}`,
    model: pickModel(0),
    notes: "Use this rubric as both a human eval guide and as an LLM-as-judge prompt.",
    is_favorite: false,
    tags: ["meta-prompt", "ai", "evaluation", "prompt-engineering"],
    daysAgoN: 23,
  },
  {
    title: "Prompt Compression Optimizer",
    body: `Compress the following prompt to reduce token count while preserving instruction quality.

Compression strategies to apply:
1. Remove hedging language ("Please", "If you can", "I would like you to")
2. Replace examples with a compact format schema
3. Consolidate redundant instructions
4. Remove obvious defaults the model already knows
5. Use bullet lists instead of prose for multi-part instructions
6. Abbreviate verbose descriptions with precise technical terms

Constraints:
- The compressed prompt must produce equivalent output quality
- Never remove safety instructions
- Never compress few-shot examples (they must stay verbatim)
- Max compression target: {{target_pct}}% of original token count

Measure before/after:
- Token count (use tiktoken for gpt-4 / claude token estimator)
- Information preserved (what was removed and why it's safe to remove)

Original prompt:
{{prompt}}`,
    model: pickModel(1),
    notes: "Compression matters most for high-frequency calls (100k+ calls/month).",
    is_favorite: true,
    tags: ["meta-prompt", "prompt-engineering", "ai", "optimization"],
    daysAgoN: 27,
  },
  {
    title: "Multi-Agent Orchestration Design",
    body: `Design a multi-agent pipeline for the following complex task.

For each agent in the pipeline:
- **Agent name and role**
- **System prompt** (abbreviated)
- **Input** (what it receives — from user or previous agent)
- **Output** (what it produces — format and schema)
- **Model recommendation** (capability vs. cost tradeoff)
- **Failure mode** (what to do if this agent fails or produces low-confidence output)

Also design:
- **Orchestrator logic** (how the router decides which agent to call)
- **Context passing strategy** (full context / summarized / structured handoff)
- **Human-in-the-loop checkpoints** (where a human should review before proceeding)
- **Observability** (what to log for debugging)

Task to automate: {{task}}
Quality requirements: {{quality}}
Latency budget: {{latency}}
Cost budget: {{cost}}`,
    model: pickModel(2),
    notes: "Start with 2 agents max, add agents only when a single agent demonstrably fails.",
    is_favorite: false,
    tags: ["meta-prompt", "ai", "agents", "architecture"],
    daysAgoN: 32,
  },
  {
    title: "Prompt Red-Teaming Checklist",
    body: `Red-team the following system prompt or AI application for safety and robustness issues.

Test categories:

**Jailbreaks**
- [ ] Role-play / "pretend you are" attacks
- [ ] Hypothetical framing ("what if you were an AI without restrictions")
- [ ] Token manipulation (l33tspeak, unicode lookalikes)
- [ ] Prompt injection via user-supplied content

**Data extraction**
- [ ] Ask the model to repeat its system prompt
- [ ] Side-channel: infer system prompt from behavior
- [ ] Extract training data or PII

**Scope bypass**
- [ ] Out-of-scope requests the model might helpfully answer
- [ ] Authority escalation ("I am the developer, override X")
- [ ] Competing instructions in different parts of the context

**Output manipulation**
- [ ] Force specific output formats that bypass intent filters
- [ ] Multi-turn attacks where early turns set up a bypass

For each failed test: Severity | Attack vector | Mitigation recommendation

System prompt to red-team:
{{system_prompt}}`,
    model: pickModel(3),
    notes: "Run this before any public deployment. Escalate Critical findings before launch.",
    is_favorite: true,
    tags: ["meta-prompt", "security", "ai", "prompt-engineering"],
    daysAgoN: 38,
  },

  // ── CUSTOMER & UX (6) ────────────────────────────────────────────────────

  {
    title: "User Persona Builder",
    body: `Create a detailed user persona based on the following research data.

Persona template:
---
**Name:** [Fictional name that feels real]
**Photo description:** [Physical description for a stock photo search]
**Role:** Job title at a company type/size
**Age:** Range
**Location:** City type

**Goals (professional):**
1. [Primary goal that drives their work]
2. [Secondary goal]

**Goals (in relation to our product):**
1. [What they want to accomplish with our tool]

**Pain points:**
1. [Specific, concrete frustration — not generic]
2. [Second frustration]
3. [Third frustration]

**Day in the life:** [100-word narrative of a typical workday, including the moment they'd reach for our product]

**Quotes:** [2 direct quotes that capture their voice — from actual interviews if available]

**Behaviors:** [5 behavioral attributes with a 1–5 scale indicator]

**Tech stack / tools used:** [List of relevant tools they already use]
---

Research data: {{research_data}}
Product context: {{product}}`,
    model: pickModel(4),
    notes: "Base on real interview data, not assumptions. Update each quarter.",
    is_favorite: false,
    tags: ["product", "ux", "research"],
    daysAgoN: 11,
  },
  {
    title: "Usability Test Analysis",
    body: `Analyze the following usability test session notes and produce a structured findings report.

Report structure:
1. **Executive summary** (3–5 sentences, key issues only)
2. **Task completion rates** (table: task | completion rate | avg time | difficulty rating)
3. **Critical issues** (P1 — block completion): describe, quote participant, recommend fix
4. **Major issues** (P2 — cause significant friction): same format
5. **Minor issues** (P3 — annoyances): grouped list
6. **Positive findings** (what worked well — important for team morale and to not regress)
7. **Patterns across participants** (issues seen by 3+ participants)
8. **Recommended next steps** — ranked by impact vs. effort

Session notes:
{{session_notes}}

Participants: {{n}} users, segment: {{segment}}
Tasks tested: {{tasks}}`,
    model: pickModel(5),
    notes: "Run affinity mapping before this step for large sets of session notes.",
    is_favorite: true,
    tags: ["ux", "research", "product"],
    daysAgoN: 15,
  },
  {
    title: "Microcopy & UX Writing Review",
    body: `Review and rewrite the following UI copy to improve clarity, tone, and conversion.

For each piece of copy:
1. **Original** (quoted exactly)
2. **Issues** (vague, jargon, negative framing, too long, misleading, etc.)
3. **Rewrite** (improved version)
4. **Principle applied** (from: clarity, action-orientation, empathy, brevity, consistency)

General guidelines:
- Error messages: state what happened + what to do (never just "Error occurred")
- Empty states: explain why empty + what to do first
- CTAs: verb + object ("Save changes" not "OK")
- Onboarding: lead with user benefit, not feature name
- Confirmation dialogs: rephrase as questions, make the destructive action the secondary button

Copy to review:
{{ui_copy}}

Product tone: {{tone}} (e.g., playful, professional, direct, warm)
User context: {{context}}`,
    model: pickModel(6),
    notes: null,
    is_favorite: false,
    tags: ["ux", "writing", "product"],
    daysAgoN: 19,
  },
  {
    title: "Onboarding Flow Designer",
    body: `Design a user onboarding flow for {{product}} targeting {{user_segment}}.

Onboarding principles to apply:
- Time to first value: get the user to their "aha moment" in < {{target_minutes}} minutes
- Progressive disclosure: don't show everything at once
- Jobs to be Done: frame each step around what the user is trying to accomplish
- Social proof: inject at the right moment to reduce abandonment

Flow structure:
1. **Signup / Auth** — minimize friction (what's the minimum viable info we need?)
2. **Welcome moment** — set context, make them feel good about signing up
3. **Activation steps** (max 5) — each step should move them toward first value
4. **First success moment** — celebrate the aha moment explicitly
5. **Habit formation** — what will bring them back tomorrow?

For each step: Screen name | User action | Product action | Copy direction | Success metric

Product: {{product}}
Core value prop: {{value_prop}}
Activation metric: {{activation_metric}}`,
    model: pickModel(0),
    notes: "Validate each step is truly necessary — every step loses 20–30% of users.",
    is_favorite: false,
    tags: ["ux", "product", "onboarding"],
    daysAgoN: 23,
  },
  {
    title: "JTBD Interview Analyzer",
    body: `Analyze the following Jobs to be Done interview transcripts and extract the job stories.

For each job story, provide:
- **Job statement**: "When [situation], I want to [motivation/goal], so I can [expected outcome]."
- **Functional dimension**: the practical task being accomplished
- **Emotional dimension**: how the user wants to feel
- **Social dimension**: how the user wants to be perceived by others
- **Struggling moments**: the trigger that causes them to look for a solution
- **Current workaround**: what they do today (the competition)
- **Desired outcome**: what success looks like to them

After extracting all jobs:
- Rank by frequency across transcripts
- Identify the core job vs. related jobs
- Flag any jobs we currently serve well / poorly / not at all

Transcripts:
{{transcripts}}`,
    model: pickModel(1),
    notes: "Bob Moesta's Switch Interview method: focus on the timeline of the hire.",
    is_favorite: true,
    tags: ["ux", "research", "product"],
    daysAgoN: 27,
  },
  {
    title: "Notification Strategy Designer",
    body: `Design a notification strategy for {{product}} that maximizes engagement without causing notification fatigue.

Framework:

**1. Notification Audit**
Inventory every existing notification. For each: Is it time-sensitive? User-triggered or system-triggered? Can it be batched?

**2. Permission Request Strategy**
When to ask for push notification permission, what context to give, what to show if denied.

**3. Notification Taxonomy**
| Type | Trigger | Channel | Timing | Frequency Cap | Opt-out Level |
(Channels: push, email, in-app, SMS)

**4. Preference Center Design**
What controls to give users, default states, how to surface it.

**5. Fatigue Prevention Rules**
- Global frequency caps
- Quiet hours
- Sunset policy (stop emailing unengaged users after X days)
- Priority override for critical notifications

**6. Metrics to track**
- Opt-out rate per notification type
- Click-through rate
- Re-engagement rate

Product: {{product}}
User segments: {{segments}}`,
    model: pickModel(2),
    notes: null,
    is_favorite: false,
    tags: ["product", "ux", "growth"],
    daysAgoN: 31,
  },

  // ── GROWTH & MARKETING (6) ───────────────────────────────────────────────

  {
    title: "Growth Experiment Design",
    body: `Design a growth experiment for the following growth lever.

Experiment spec:
---
**Experiment name:** [descriptive slug]
**Hypothesis:** If we [change], then [metric] will [direction] by [amount] because [reason].
**Growth lever:** Acquisition / Activation / Retention / Revenue / Referral
**Metric being moved:** [Primary KPI + definition]
**Counter metrics:** [What we'll watch to ensure we don't break something]

**Implementation:**
- Control: [what users see today]
- Variant: [what changes]
- Traffic split: {{split}}%
- Target audience: [segment or 100% of users]

**Duration:** {{duration}} (justify based on MDE and traffic volume)
**Minimum Detectable Effect:** {{mde}}%

**Instrumentation needed:**
- Events to track: ...
- Dashboard: ...

**Go / No-go decision:** We will ship if [condition]. We will stop if [condition].
---

Growth lever: {{lever}}
Current baseline: {{baseline}}
Traffic available: {{traffic}}`,
    model: pickModel(3),
    notes: "Run a pre-experiment power analysis. Underpowered tests waste cycles.",
    is_favorite: false,
    tags: ["growth", "product", "data", "strategy"],
    daysAgoN: 7,
  },
  {
    title: "Referral Program Designer",
    body: `Design a referral program for {{product}} from first principles.

Design decisions:
1. **Reward structure** — what does the referrer get? The referred user? (Cash, credit, feature unlock)
2. **Trigger timing** — when to ask for referrals (post-activation, post-first-value, post-delight)
3. **Sharing mechanics** — unique link, code, or contact invite? One-click share to which channels?
4. **Fraud prevention** — how to detect self-referral, fake accounts, reward abuse
5. **Virality coefficient** — model K-factor: if current user base is {{users}} and each refers {{ref_rate}} users, project growth curve
6. **Copy** — referral ask message, email, landing page for referred users
7. **Success metrics** — referral rate, conversion rate of referred visitors, payback period of reward cost

Pricing model: {{pricing}}
CAC today: {{cac}}
LTV: {{ltv}}
Product type: {{product_type}}`,
    model: pickModel(4),
    notes: "Dropbox and Airbnb case studies are the canonical references for this design.",
    is_favorite: true,
    tags: ["growth", "marketing", "product"],
    daysAgoN: 11,
  },
  {
    title: "SEO Content Brief",
    body: `Create a comprehensive SEO content brief for a piece targeting the following keyword.

Brief sections:
1. **Target keyword** + search intent analysis (informational / navigational / commercial / transactional)
2. **Secondary keywords** (5–8 LSI and long-tail variations with estimated monthly volume)
3. **SERP analysis** — describe what currently ranks (list format, long-form guide, video, tools)
4. **Content type recommendation** (guide, comparison, listicle, tutorial, tool page)
5. **Recommended structure** — H1, H2s, H3s outlined with the angle to take for each
6. **Content differentiator** — why would our piece be better than what currently ranks?
7. **On-page SEO checklist**: title tag, meta description, URL slug, internal links needed, schema markup
8. **Word count target** and content depth guidance
9. **Expert quotes or data** to make the piece more authoritative

Primary keyword: {{keyword}}
Domain authority: {{da}}
Content team: {{resources}}`,
    model: pickModel(5),
    notes: null,
    is_favorite: false,
    tags: ["growth", "seo", "content", "marketing"],
    daysAgoN: 15,
  },
  {
    title: "Pricing Page Copywriter",
    body: `Write conversion-optimized pricing page copy for a {{product_type}} product.

Page sections:
1. **Headline** — benefit-first, addresses the #1 pricing objection (5–8 words)
2. **Subheadline** — expand on the value, address the "is it worth it?" question
3. **Plan names** — avoid generic "Basic/Pro/Enterprise"; use outcome-based names
4. **Feature descriptions** — benefits, not feature names (e.g., "Never lose a draft" not "Auto-save")
5. **Social proof bar** — logos + one key customer metric
6. **FAQ section** — 6 questions that address real purchase objections
7. **Money-back guarantee** copy
8. **Final CTA section** — remove last hesitation before clicking

Plans:
{{plans}}

Key objection to overcome: {{objection}}
Audience: {{audience}}
Price anchoring note: {{pricing_notes}}`,
    model: pickModel(6),
    notes: "Test annually pricing anchor against monthly for conversion rate.",
    is_favorite: false,
    tags: ["growth", "copywriting", "marketing", "product"],
    daysAgoN: 19,
  },
  {
    title: "Community Building Playbook",
    body: `Design a community building playbook for {{product}} targeting {{community_type}}.

Sections:
1. **Community purpose statement** — why this community exists (not "to grow our product")
2. **Member persona** — who is the ideal community member and what do they get out of it?
3. **Platform selection** — Discord vs. Slack vs. Circle vs. forum; with trade-off analysis
4. **Spaces architecture** — what channels/rooms to create at launch (start with fewer)
5. **Content calendar** — weekly rhythm of community programming
6. **Founding member recruitment** — how to find and court the first 50 "super-members"
7. **Moderation guidelines** — what's in/out of scope, escalation process
8. **Engagement loops** — what brings members back? Recognition, status, access, learning?
9. **Launch sequence** — 30-day plan from private beta to public launch
10. **Success metrics** — DAU/MAU, post rate, member NPS, % active contributors

Community goal: {{goal}}
Budget: {{budget}}`,
    model: pickModel(0),
    notes: "CMX Hub is the best resource for professional community building.",
    is_favorite: false,
    tags: ["growth", "marketing", "strategy", "community"],
    daysAgoN: 25,
  },
  {
    title: "Email Nurture Sequence Builder",
    body: `Design a {{n}}-email nurture sequence for {{funnel_stage}} leads.

For each email:
- **Email #N — [Name]**
- **Send timing**: Day X after trigger
- **Subject line**: (+ 2 alternatives)
- **Preview text**
- **Goal**: one clear action or belief shift
- **Body** (outline, not full copy):
  - Opening hook
  - Core message (2–3 paragraphs)
  - Social proof element
  - CTA (single, specific)
- **Segmentation trigger**: what moves this person to the next sequence?
- **If no open in 5 days**: follow-up subject line

Sequence logic:
1. Emails 1–2: Educate + build trust (no selling)
2. Email 3: Social proof + objection handling
3. Emails 4–5: Direct offer with urgency
4. Final email: Last chance or breakup email

Product: {{product}}
Lead source: {{lead_source}}
Primary objection: {{objection}}`,
    model: pickModel(1),
    notes: "A/B test subject lines. Track click-to-open rate, not just open rate.",
    is_favorite: true,
    tags: ["growth", "email", "marketing", "copywriting"],
    daysAgoN: 30,
  },

  // ── OPERATIONS & HR (6) ─────────────────────────────────────────────────

  {
    title: "Job Description Writer",
    body: `Write an inclusive, compelling job description for the following role.

Structure:
1. **Role headline** — job title + 1 exciting sentence about what makes this role unique
2. **The opportunity** (2–3 sentences) — sell the role before listing requirements
3. **What you'll do** — 5–7 bullet points, outcomes not activities, present tense ("You will...")
4. **What we're looking for** — separate must-haves from nice-to-haves explicitly
5. **What we offer** — compensation range (always include), benefits, culture attributes
6. **About us** (3–4 sentences) — mission, stage, why now

Inclusion guidelines:
- Gender-neutral language throughout
- "Requirements" → "You might be a great fit if..."
- Avoid corporate jargon ("synergy", "rockstar", "ninja")
- Include explicit salary range
- State remote/hybrid/in-office clearly

Role: {{title}}
Team: {{team}}
Level: {{level}}
Key outcomes expected in first 6 months: {{outcomes}}
Must-have skills: {{must_haves}}
Comp range: {{comp}}`,
    model: pickModel(2),
    notes: "Run through a bias checker (Textio or Gender Decoder) before posting.",
    is_favorite: false,
    tags: ["hr", "hiring", "writing"],
    daysAgoN: 9,
  },
  {
    title: "Performance Review Writer",
    body: `Write a balanced, growth-oriented performance review for an employee.

Structure:
1. **Overall assessment** (2–3 sentences) — tone-setting paragraph
2. **Accomplishments** (3–5 bullets) — specific, quantified where possible
3. **Areas of strength** — 2–3 competencies with behavioral evidence (STAR format)
4. **Areas for development** — 2 areas, framed constructively:
   - Observation (what you've noticed)
   - Impact (why it matters)
   - Suggestion (specific, actionable development path)
5. **Goals for next period** — 3 SMART goals
6. **Manager support commitment** — what you'll do to help them grow

Tone: honest, specific, growth-oriented — not generic praise or vague criticism

Employee info:
- Role: {{role}}
- Level: {{level}}
- Tenure: {{tenure}}
- Key achievements: {{achievements}}
- Development areas (your notes): {{dev_areas}}
- Goals for next period: {{goals}}`,
    model: pickModel(3),
    notes: "Have HR review before delivering. Share with employee 24h before the meeting.",
    is_favorite: false,
    tags: ["hr", "management", "writing"],
    daysAgoN: 14,
  },
  {
    title: "Meeting Notes → Action Items",
    body: `Transform the following raw meeting notes into a structured summary with clear action items.

Output format:
---
**Meeting:** {{meeting_name}}
**Date:** {{date}}
**Attendees:** [extracted from notes]
**Duration:** {{duration}}

## Summary (3–5 sentences)
[What was discussed and decided — no action items here]

## Decisions Made
- [Decision 1] — rationale if captured
- [Decision 2]

## Action Items
| # | What | Who | By When | Priority |
|---|------|-----|---------|----------|

## Open Questions / Parking Lot
- [Questions that were raised but not resolved]

## Next Meeting
- Date:
- Agenda items to carry forward:
---

Raw meeting notes:
{{notes}}`,
    model: pickModel(4),
    notes: "Send within 2 hours of meeting ending. Slack the action item owners directly.",
    is_favorite: true,
    tags: ["operations", "writing", "productivity"],
    daysAgoN: 4,
  },
  {
    title: "Process Documentation Template",
    body: `Document the following operational process in a clear, learnable format.

Template:
---
# Process: {{process_name}}
**Owner:** {{owner}} | **Last Updated:** {{date}} | **Version:** {{version}}

## Purpose
[Why this process exists and what outcome it produces]

## Scope
- **Applies to:** [who runs this process]
- **Frequency:** [how often it runs]
- **Prerequisites:** [what must be true before starting]

## Step-by-Step Instructions
For each step:
- **Step N: [Action verb + object]**
  - Detailed instructions
  - Screenshots or diagrams if needed
  - Common mistakes to avoid
  - Decision point: If [X], go to step N+2. If [Y], do...

## Roles and Responsibilities
| Role | Responsibility |

## Exception Handling
[What to do when something goes wrong]

## Metrics
[How we know the process is running well]
---

Process to document: {{process}}
SME interview notes: {{notes}}`,
    model: pickModel(5),
    notes: null,
    is_favorite: false,
    tags: ["operations", "documentation", "writing"],
    daysAgoN: 18,
  },
  {
    title: "Incident Postmortem Template",
    body: `Write an incident postmortem following a blameless post-mortem culture.

Template:
---
# Incident Postmortem: {{incident_id}}
**Severity:** P{{severity}} | **Date:** {{date}} | **Duration:** {{duration}}
**Author:** {{author}} | **Reviewers:** {{reviewers}}

## Summary
[2–3 sentences: what happened, customer impact, how it was resolved]

## Timeline (UTC)
| Time | Event |

## Root Cause Analysis
**Immediate cause:** [The proximate thing that caused the incident]
**Contributing factors:** [Systemic issues that allowed the immediate cause to happen]
**Root cause(s):** [The underlying systemic issues — use 5 Whys]

## Impact
- Users affected: {{users}}
- Duration of impact: {{impact_duration}}
- Data loss: yes/no
- Revenue impact: {{revenue}}

## What Went Well
[Things that limited impact or helped recovery]

## Action Items
| Item | Owner | Priority | Due Date |
---

Incident details: {{details}}
Timeline events: {{timeline}}`,
    model: pickModel(6),
    notes: "Blameless means no individual is identified as causing the incident — systems fail, not people.",
    is_favorite: true,
    tags: ["operations", "engineering", "documentation"],
    daysAgoN: 22,
  },
  {
    title: "Vendor Evaluation Framework",
    body: `Build a structured vendor evaluation framework for selecting a {{vendor_category}} provider.

Framework sections:

**1. Requirements gathering**
- Must-have requirements (disqualifiers if missing)
- Nice-to-have requirements (scored 0–3)
- Explicit non-requirements (what we're NOT optimizing for)

**2. Evaluation scorecard**
| Criterion | Weight | Vendor A | Vendor B | Vendor C |

Criteria categories:
- Technical fit (API quality, performance, reliability, security)
- Commercial fit (pricing model, contract flexibility, total cost of ownership)
- Support & partnership (SLA, onboarding, account management)
- Vendor health (funding, team size, customer count, churn rate)
- Integration (time to integrate, SDK quality, documentation)

**3. Reference check questions** (10 questions for existing customers)

**4. POC/trial evaluation criteria**

**5. Decision matrix** — weighted scoring and final recommendation

Vendor category: {{vendor_category}}
Budget: {{budget}}
Key use case: {{use_case}}`,
    model: pickModel(0),
    notes: "Always check the contract exit clause before signing.",
    is_favorite: false,
    tags: ["operations", "strategy", "procurement"],
    daysAgoN: 26,
  },

  // ── EDUCATION & LEARNING (10) ────────────────────────────────────────────

  {
    title: "Lesson Plan Builder",
    body: `Create a detailed lesson plan for a {{duration}}-minute class session.

Lesson plan template:
---
**Subject:** {{subject}}
**Grade/Level:** {{level}}
**Learning Objectives:** By the end of this lesson, students will be able to:
  1. [Objective 1 — use Bloom's Taxonomy action verbs: analyze, evaluate, create, apply...]
  2. [Objective 2]
  3. [Objective 3]

**Materials needed:** [List]

**Lesson structure:**
| Phase | Duration | Teacher activity | Student activity | Assessment |

**Opening Hook** ({{warm_up_time}} min):
[Attention-grabbing question, problem, or demo]

**Direct Instruction** ({{instruction_time}} min):
[Key concepts, explanations, examples]

**Guided Practice** ({{practice_time}} min):
[Structured activity with teacher support]

**Independent Practice** ({{independent_time}} min):
[Students apply learning autonomously]

**Closure** ({{close_time}} min):
[Exit ticket, reflection question, or formative check]

**Differentiation:**
- Advanced learners: [extension activity]
- Students needing support: [scaffold or modification]

**Homework:** [If applicable]
---

Topic: {{topic}}
Prior knowledge students have: {{prior_knowledge}}`,
    model: pickModel(2),
    notes: "Align objectives to your curriculum standards before finalizing.",
    is_favorite: false,
    tags: ["education", "writing", "teaching"],
    daysAgoN: 16,
  },
  {
    title: "Concept Explainer — Feynman Technique",
    body: `Explain {{concept}} using the Feynman Technique — as if teaching it to a curious 12-year-old who has no background in the subject.

Rules:
1. Use only everyday analogies — compare abstract ideas to things a child already knows
2. No jargon. If a technical term is truly necessary, define it immediately in plain language
3. Use a concrete story or example to illustrate the core insight
4. Identify the single most important thing to understand about this concept
5. Explain why this concept matters in real life
6. End with a question that would let a student test their understanding

After the simple explanation, provide:
- A slightly more advanced version for a motivated high school student
- 3 common misconceptions people have about this concept and why they're wrong

Concept: {{concept}}
Context (why the learner wants to understand it): {{context}}`,
    model: pickModel(3),
    notes: "Test the explanation by having someone with no background read it.",
    is_favorite: true,
    tags: ["education", "writing", "research"],
    daysAgoN: 20,
  },
  {
    title: "Flashcard Set Generator",
    body: `Generate a set of {{n}} high-quality flashcards for studying {{topic}}.

For each flashcard:
- **Front:** A question, term, or prompt (concise — max 20 words)
- **Back:** The answer (complete but minimal — only what's needed to answer the front)
- **Memory aid:** An analogy, acronym, visual description, or mnemonic (where helpful)
- **Difficulty:** Beginner / Intermediate / Advanced

Flashcard best practices applied:
- Minimum information principle (one fact per card)
- Use cloze deletion for definition cards: "The {{...}} principle states that..."
- Include at least 5 application cards ("What would happen if...?")
- Include at least 3 comparison cards ("What's the difference between X and Y?")
- Mix terminology, concepts, and applications

Topic: {{topic}}
Study goal: {{goal}}
Existing knowledge level: {{level}}`,
    model: pickModel(4),
    notes: "Export to Anki for spaced repetition scheduling.",
    is_favorite: false,
    tags: ["education", "studying", "productivity"],
    daysAgoN: 24,
  },
  {
    title: "Socratic Seminar Discussion Questions",
    body: `Generate discussion questions for a Socratic seminar on {{text_or_topic}}.

Question tiers (create 3–4 per tier):

**Tier 1 — Opening questions** (accessible, grounded in the text):
- "What does the author mean when...?"
- "Can you point to a passage that...?"

**Tier 2 — Core questions** (interpretive, drive the deep discussion):
- Questions with multiple defensible answers
- Questions that expose tensions or paradoxes in the text
- Questions that connect to broader themes

**Tier 3 — Closing questions** (transferable, connect to students' lives):
- "Where do you see this in the world today?"
- "Has this changed how you think about...?"

**Facilitation guide:**
- 3 follow-up probes for the most likely student responses
- Common misconceptions to address
- How to redirect if discussion stalls

Text/topic: {{text_or_topic}}
Student level: {{level}}
Key themes to explore: {{themes}}`,
    model: pickModel(5),
    notes: null,
    is_favorite: false,
    tags: ["education", "teaching", "research"],
    daysAgoN: 29,
  },
  {
    title: "Curriculum Alignment Mapper",
    body: `Map the following course content to the specified learning standards framework.

For each content unit, provide:
- **Unit name**
- **Standards addressed** (exact standard code + description)
- **Alignment strength**: Direct / Partial / Tangential
- **Coverage gaps**: standards in scope that aren't covered by this unit
- **Overlap opportunities**: where standards align across multiple units (integration points)

Then produce:
- A standards coverage matrix (units on rows, standards on columns, cells show alignment level)
- Prioritized list of coverage gaps to address
- Recommendations for unit sequence to build prerequisite knowledge correctly

Course content outline: {{content}}
Standards framework: {{standards}} (e.g., Common Core, NGSS, AP, IB, CEFR)
Grade/level: {{level}}
Subject: {{subject}}`,
    model: pickModel(6),
    notes: "Use this before submitting curriculum for accreditation review.",
    is_favorite: false,
    tags: ["education", "teaching", "documentation"],
    daysAgoN: 33,
  },
  {
    title: "Personalized Study Plan",
    body: `Create a personalized study plan for mastering {{subject}} in {{timeframe}}.

Assessment phase:
1. Identify what the learner already knows (self-assessment questions)
2. Identify the target knowledge/skill level
3. Diagnose the gap

Study plan structure:
- **Week-by-week breakdown** with specific topics per session
- **Session format** for each week (reading, practice problems, projects, review)
- **Resources** recommended for each phase (books, courses, practice sets)
- **Milestone checkpoints** with self-test criteria: "You're ready to move on when you can..."
- **Spaced repetition** schedule for previously learned material
- **Accountability mechanism** (daily/weekly review ritual)

Adjust the plan for:
- Available time: {{hours_per_week}} hours/week
- Learning style preference: {{style}} (visual, reading, practice-heavy, project-based)
- Hard deadline: {{deadline}}

Subject: {{subject}}
Current level: {{current_level}}
Target level: {{target_level}}`,
    model: pickModel(0),
    notes: "Revisit and adjust after the first 2-week checkpoint.",
    is_favorite: true,
    tags: ["education", "productivity", "studying"],
    daysAgoN: 37,
  },
  {
    title: "Rubric Builder — Written Assignments",
    body: `Create a detailed grading rubric for the following written assignment.

Rubric format (table):
| Criterion | Weight | 4 - Exemplary | 3 - Proficient | 2 - Developing | 1 - Beginning |

Criteria to include (customize for assignment type):
- **Thesis/Argument** — clarity, strength, originality
- **Evidence & Support** — quality, relevance, integration of sources
- **Analysis & Reasoning** — depth, logic, nuance
- **Organization & Structure** — introduction, body, conclusion, transitions
- **Writing Mechanics** — grammar, style, clarity, concision
- **Citation & Formatting** — adherence to {{citation_style}}

Also provide:
- A checklist students can use for self-assessment before submitting
- 3 examples of what separates a 3 from a 4 on the hardest-to-grade criterion

Assignment: {{assignment}}
Grade level: {{level}}
Subject: {{subject}}
Point scale: {{total_points}}`,
    model: pickModel(1),
    notes: "Share the rubric with students before they begin writing.",
    is_favorite: false,
    tags: ["education", "teaching", "writing"],
    daysAgoN: 41,
  },
  {
    title: "Reading Comprehension Questions",
    body: `Generate leveled comprehension questions for the following text passage.

Question levels (Bloom's Taxonomy):

**Remember** (2 questions): Recall explicit information from the text
**Understand** (2 questions): Paraphrase, summarize, explain main ideas
**Apply** (2 questions): Use information from the text to solve a new problem
**Analyze** (2 questions): Break down arguments, identify assumptions, compare perspectives
**Evaluate** (2 questions): Judge quality of arguments, assess evidence, defend a position
**Create** (1 question): Generate something new inspired by the text

For each question:
- The question itself
- An ideal answer (for teacher reference)
- The specific passage location being tested
- Differentiation: a simpler version for struggling readers

Text level: {{grade_level}}

Passage:
{{text}}`,
    model: pickModel(2),
    notes: "Balance recall and higher-order thinking — don't stop at Remember/Understand.",
    is_favorite: false,
    tags: ["education", "teaching", "reading"],
    daysAgoN: 45,
  },
  {
    title: "Explainer Video Script — Educational",
    body: `Write an educational explainer video script for students learning {{concept}} for the first time.

Script structure:
1. **Hook** (0–15 sec): A surprising fact, counterintuitive question, or real-world mystery that the concept explains
2. **Setup** (15–45 sec): Establish what the viewer is about to learn and why it matters to them
3. **Building blocks** (core content): Break the concept into 3–4 sub-concepts, each with:
   - Plain language explanation
   - A concrete visual analogy (describe what should appear on screen)
   - One example from everyday life
4. **Connection** — show how the sub-concepts link together
5. **Summary** — one-sentence statement of the core idea
6. **Extension question** — one thinking prompt to leave the viewer curious

Also include:
- [VISUAL] cues throughout (describe what should be animated or shown)
- Estimated time for each section

Concept: {{concept}}
Student level: {{level}}
Target video length: {{length}} minutes`,
    model: pickModel(3),
    notes: "Keep each conceptual beat to 60–90 seconds max before adding a visual change.",
    is_favorite: false,
    tags: ["education", "video", "writing", "content"],
    daysAgoN: 49,
  },
  {
    title: "Project-Based Learning Design",
    body: `Design a project-based learning (PBL) unit for {{subject}}.

PBL unit structure:
---
**Driving Question:** [An open-ended, authentic question that motivates the project]

**Final Product:** [What students will create/present at the end]

**Real-world connection:** [Who is the authentic audience? What is the real-world impact?]

**Learning objectives:** [3–5 objectives aligned to standards]

**Project phases:**
1. **Launch** (Day 1–2): Hook activity, introduce driving question, assess prior knowledge
2. **Research & Discovery** (Day 3–7): Structured inquiry, skill-building mini-lessons
3. **Design & Create** (Day 8–12): Student-led creation with checkpoints
4. **Critique & Revision** (Day 13–14): Peer feedback, revision protocols
5. **Presentation** (Day 15): Public exhibition or presentation

**Assessment:**
- Formative checkpoints at each phase
- Final product rubric
- Reflection component

**Differentiation:** [How to scaffold for diverse learners]
---

Subject: {{subject}}
Grade level: {{level}}
Duration: {{weeks}} weeks
Standards: {{standards}}`,
    model: pickModel(4),
    notes: "The driving question is the hardest part — test it by asking: does it excite students?",
    is_favorite: true,
    tags: ["education", "teaching", "project-management"],
    daysAgoN: 53,
  },

  // ── FINANCE & PRODUCTIVITY (10) ──────────────────────────────────────────

  {
    title: "Financial Model Assumptions Doc",
    body: `Write a structured assumptions document for a financial model.

For each assumption, provide:
- **Name**: clear label
- **Value**: the assumed value (number, %, range)
- **Basis**: how this was derived (market research, historical data, comparable, management estimate)
- **Sensitivity**: High / Medium / Low — how much does the model output change if this is wrong by 10%?
- **Source**: cited reference or methodology
- **Review date**: when this assumption should be revisited

Categories to cover:
1. Revenue assumptions (growth rate, pricing, churn, mix)
2. Cost assumptions (COGS, headcount, marketing, R&D)
3. Balance sheet assumptions (AR days, AP days, inventory turns)
4. Capital assumptions (CapEx schedule, depreciation, working capital)
5. Macro assumptions (inflation, FX, interest rates if applicable)

Business type: {{business}}
Model purpose: {{purpose}} (e.g., fundraising, board reporting, acquisition diligence)
Forecast period: {{period}}`,
    model: pickModel(5),
    notes: "Run a tornado chart to visualize which assumptions drive the most variance.",
    is_favorite: false,
    tags: ["finance", "strategy", "analysis"],
    daysAgoN: 13,
  },
  {
    title: "Investment Thesis Writer",
    body: `Write a structured investment thesis for the following opportunity.

Thesis structure:
---
**Company / Asset:** {{name}}
**Recommendation:** Buy / Hold / Sell
**Price target:** {{price}} | **Timeframe:** {{timeframe}}
**Conviction:** High / Medium / Low

## Core Thesis (3 bullets)
[The 3 most important reasons to own this]

## Business Overview
[2 paragraphs: what they do, business model, market position]

## The Opportunity
[What the market is missing or mispricing]

## Variant Perception
[How our view differs from consensus and why we're right]

## Key Value Drivers
[What needs to happen for the thesis to play out]

## Bull / Base / Bear Case
| Scenario | Probability | Outcome | Price Target |

## Key Risks
[3–5 risks with mitigation for each]

## Catalysts
[Specific events that could unlock value in the next 12 months]
---

Asset: {{asset}}
Available research: {{research}}`,
    model: pickModel(6),
    notes: "This is a framework, not financial advice. Validate all figures independently.",
    is_favorite: true,
    tags: ["finance", "analysis", "strategy"],
    daysAgoN: 17,
  },
  {
    title: "Personal Finance Review",
    body: `Analyze the following personal financial situation and provide a prioritized action plan.

Analysis framework:
1. **Emergency fund check**: Do they have 3–6 months of expenses liquid?
2. **High-interest debt**: Any debt above 7%? Avalanche vs. snowball recommendation.
3. **Employer match capture**: Are they getting 100% of the 401k employer match?
4. **Insurance gaps**: Health, disability, term life — any critical gaps?
5. **Tax optimization**: Are they using tax-advantaged accounts optimally? (401k, IRA, HSA, 529)
6. **Investment allocation**: Age-appropriate risk, diversification, expense ratios
7. **Estate planning basics**: Will, beneficiaries up to date, POA?

For each area: Current state | Gap identified | Recommended action | Priority | Estimated impact

Financial snapshot:
- Income: {{income}}
- Monthly expenses: {{expenses}}
- Savings: {{savings}}
- Debt: {{debt}}
- Investments: {{investments}}
- Goals: {{goals}}

Note: This is educational analysis, not personalized financial advice.`,
    model: pickModel(0),
    notes: "Suggest the user work with a fee-only CFP for personalized guidance.",
    is_favorite: false,
    tags: ["finance", "analysis", "personal"],
    daysAgoN: 21,
  },
  {
    title: "SaaS Unit Economics Calculator Prompt",
    body: `Calculate and interpret the unit economics for a SaaS business.

Metrics to compute (show formula + result):

**Customer Economics:**
- Customer Acquisition Cost (CAC) = Total S&M spend / New customers acquired
- Payback Period = CAC / (ACV × Gross Margin)
- LTV = ARPU × Gross Margin / Churn Rate
- LTV:CAC ratio (target: >3×)

**Revenue Quality:**
- Net Revenue Retention (NRR) = (Starting MRR + Expansion - Contraction - Churn) / Starting MRR
- Gross Revenue Retention (GRR)
- Magic Number = Net New ARR / Prior Quarter S&M Spend

**Growth Efficiency:**
- Rule of 40 = Revenue growth rate % + FCF margin %
- CAC Payback Efficiency = NRR / Payback Period

**Interpretation:** For each metric, state whether it is:
- World class / Good / Needs improvement / At risk
- What is the primary lever to improve it?

Input data:
{{financial_data}}`,
    model: pickModel(1),
    notes: "Benchmark against OpenView SaaS benchmarks report (published annually).",
    is_favorite: false,
    tags: ["finance", "saas", "data", "product"],
    daysAgoN: 25,
  },
  {
    title: "Quarterly Business Review (QBR) Deck Outline",
    body: `Create a QBR presentation outline for a B2B SaaS customer success review.

Slide structure:
1. **Title slide** — company name, quarter, CSM name, customer logo
2. **Partnership overview** — relationship timeline, key milestones, current contract value
3. **Goals recap** — what we committed to last quarter (from previous QBR)
4. **Results vs. goals** — green/yellow/red for each goal with actual numbers
5. **Product adoption** — usage metrics, feature adoption, user growth (visualize with charts)
6. **ROI & business impact** — translate usage into business value ($, hours saved, % improvement)
7. **Success stories** — 1–2 specific wins with the customer's own words
8. **Challenges & solutions** — issues encountered and how we resolved them
9. **Next quarter goals** — 3–5 SMART goals with owner and success criteria
10. **Roadmap preview** — relevant upcoming features
11. **Open discussion** — questions, concerns, expansion opportunities
12. **Next steps** — 3 action items with owners and dates

Customer context: {{customer}}
Product used: {{product}}
Data available: {{data}}`,
    model: pickModel(2),
    notes: "Personalize slide 6 (ROI) most — that's what customers remember.",
    is_favorite: false,
    tags: ["product", "sales", "strategy"],
    daysAgoN: 29,
  },
  {
    title: "Deep Work Schedule Designer",
    body: `Design a weekly deep work schedule optimized for {{role}} focused on {{primary_output}}.

Framework (Cal Newport's Deep Work principles):
1. **Chronotype assessment**: When is your peak cognitive performance window? (morning person vs. night owl)
2. **Deep work rhythm**: Which philosophy fits best?
   - Monastic (near-total isolation for extended periods)
   - Bimodal (dedicated deep work days vs. shallow days)
   - Rhythmic (fixed daily deep work blocks)
   - Journalistic (fit deep work wherever available)
3. **Weekly schedule template** (hourly breakdown):
   - Deep work blocks (labeled with the specific output)
   - Shallow work windows (email, meetings, admin)
   - Recovery time (important — don't eliminate)
   - Hard stop time (productivity research supports a hard end time)
4. **Attention residue minimization**: Which meetings to move, consolidate, or eliminate?
5. **Environment design**: Physical and digital environment changes to support the schedule

Current role: {{role}}
Primary output: {{primary_output}}
Current weekly schedule: {{current_schedule}}
Main time wasters to address: {{time_wasters}}`,
    model: pickModel(3),
    notes: "Track deep work hours for 2 weeks before and after implementing to measure impact.",
    is_favorite: true,
    tags: ["productivity", "strategy", "personal"],
    daysAgoN: 33,
  },
  {
    title: "Second Brain Setup Guide",
    body: `Design a personalized Second Brain knowledge management system for {{role}}.

System design:
1. **Capture tools**: Where to capture ideas, notes, bookmarks by context (mobile, desktop, browser, meetings)
2. **Inbox processing ritual**: How often, what to keep vs. discard, tagging philosophy
3. **Organization structure** (PARA method adapted for role):
   - Projects: Active projects with a deadline
   - Areas: Ongoing responsibilities
   - Resources: Reference material by topic
   - Archive: Inactive items
4. **Progressive summarization**: How to make notes more useful over time without re-reading everything
5. **Weekly review ritual**: 15-min process to maintain the system
6. **Tool stack recommendation**: Based on {{preferences}}
7. **Templates to create**: 5 note templates for the most common capture scenarios
8. **Common failure modes**: Why people abandon Second Brain systems and how to avoid them

Role: {{role}}
Main knowledge domains: {{domains}}
Current tools: {{current_tools}}
Biggest frustration with current system: {{frustration}}`,
    model: pickModel(4),
    notes: "Start with one area of your life, not everything at once.",
    is_favorite: false,
    tags: ["productivity", "knowledge-management", "tools"],
    daysAgoN: 39,
  },
  {
    title: "Decision Journal Template",
    body: `Create a decision journal entry for a significant decision.

Journal template:
---
**Decision:** {{decision}}
**Date:** {{date}}
**Decision type:** Reversible / Irreversible | High-stakes / Low-stakes

## Context
[What situation or opportunity prompted this decision?]

## What I Know
[Relevant facts, data, and constraints — separate from opinions]

## What I Don't Know (Key Uncertainties)
[The information gaps that most affect this decision]

## Options Considered
| Option | Expected Outcome | P(success) | Downsides | Why Eliminated |

## My Choice
[State the decision clearly]

**Reasoning:** [Why this option over the others]
**Key assumptions:** [What must be true for this to be the right call]
**Pre-mortem:** [How could this fail? What would I need to see to change course?]

## Review Protocol
- Review date: {{review_date}}
- What outcome will I measure?
- What would change my assessment?
---

Decision to document: {{decision}}`,
    model: pickModel(5),
    notes: "Read previous journal entries before making similar future decisions.",
    is_favorite: false,
    tags: ["productivity", "strategy", "personal"],
    daysAgoN: 43,
  },
  {
    title: "Contract Review Checklist",
    body: `Review the following contract for key risks and missing protections.

Review checklist:

**Parties & Definitions**
- [ ] Are all parties correctly identified with legal entity names?
- [ ] Are key terms precisely defined? Watch for vague terms like "reasonable" or "promptly"

**Obligations & Deliverables**
- [ ] Are all obligations clearly defined, scoped, and assigned?
- [ ] Are deliverable acceptance criteria specified?
- [ ] Are timelines realistic and clearly stated?

**Payment Terms**
- [ ] Payment schedule, late fees, dispute process
- [ ] Are invoicing requirements reasonable?

**IP Ownership**
- [ ] Who owns work product created under this contract?
- [ ] Are background IP rights protected?

**Liability & Indemnification**
- [ ] Is liability appropriately capped?
- [ ] Are indemnification obligations mutual?
- [ ] Is there adequate insurance required?

**Termination**
- [ ] What are the grounds for termination?
- [ ] What are the obligations upon termination?
- [ ] Are there adequate cure periods?

**Governing Law & Dispute Resolution**

Note: This is a general framework. Have a licensed attorney review all contracts.

Contract: {{contract_text}}`,
    model: pickModel(6),
    notes: "Never rely solely on AI for legal review. This is a starting point only.",
    is_favorite: false,
    tags: ["legal", "operations", "strategy"],
    daysAgoN: 47,
  },
  {
    title: "Annual Review & Goal Setting",
    body: `Facilitate a structured annual review and goal-setting process.

Part 1 — Year in review (30 min):
1. What were your 3 biggest wins this year? What made them possible?
2. What were your 3 biggest disappointments? What would you do differently?
3. What did you start that you should continue? Stop? What should you start?
4. What did you learn about yourself this year?
5. What relationships grew? Which need more attention?
6. On a scale of 1–10, how would you rate: Health / Work / Relationships / Personal growth / Finance?

Part 2 — Goal setting (30 min):
For each life area, set 1–3 goals using this format:
- **Goal statement** (specific, measurable outcome)
- **Why it matters** (connecting to deeper values)
- **Leading indicator** (weekly behavior that drives the outcome)
- **Milestone check**: How will I know I'm on track at the 3-month mark?
- **Obstacle** most likely to derail this + mitigation plan

Part 3 — Word of the year:
Choose one word that captures the theme or intention for the year ahead.

Areas: Career / Health / Relationships / Learning / Finance / Creative / Personal`,
    model: pickModel(0),
    notes: "Schedule this for the last week of the year. Block 90 minutes of uninterrupted time.",
    is_favorite: true,
    tags: ["productivity", "personal", "strategy"],
    daysAgoN: 51,
  },
];

// ─── Insertion ────────────────────────────────────────────────────────────────

const insertPrompt = db.prepare(
  `INSERT OR IGNORE INTO prompts (id, title, body, model, notes, is_favorite, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
);

const insertTag = db.prepare(
  "INSERT OR IGNORE INTO tags (name) VALUES (?)"
);

const getTag = db.prepare<[string], { id: number }>(
  "SELECT id FROM tags WHERE name = ? COLLATE NOCASE"
);

const insertPromptTag = db.prepare(
  "INSERT OR IGNORE INTO prompt_tags (prompt_id, tag_id) VALUES (?, ?)"
);

let inserted = 0;
let skipped = 0;

const seedAll = db.transaction(() => {
  for (let i = 0; i < SEED_PROMPTS.length; i++) {
    const seed = SEED_PROMPTS[i]!;

    // Stagger timestamps across ~180 days for realistic distribution
    const createdAt = daysAgo(seed.daysAgoN, i % 12);
    // updated_at is slightly after created_at (simulate a few edits)
    const updatedAt = daysAgo(Math.max(0, seed.daysAgoN - Math.floor(Math.random() * 3)), i % 8);

    const id = ulid();

    const result = insertPrompt.run(
      id,
      seed.title,
      seed.body,
      seed.model,
      seed.notes,
      seed.is_favorite ? 1 : 0,
      createdAt,
      updatedAt
    );

    if (result.changes === 0) {
      skipped++;
      continue;
    }

    for (const tagName of seed.tags) {
      insertTag.run(tagName);
      const tag = getTag.get(tagName)!;
      insertPromptTag.run(id, tag.id);
    }

    inserted++;
  }
});

console.log(`\n[seed] Inserting ${SEED_PROMPTS.length} prompts...`);
seedAll();

// ─── Summary ──────────────────────────────────────────────────────────────────

const stats = {
  prompts: (db.prepare("SELECT COUNT(*) AS n FROM prompts").get() as { n: number }).n,
  tags: (db.prepare("SELECT COUNT(*) AS n FROM tags").get() as { n: number }).n,
  favorites: (db.prepare("SELECT COUNT(*) AS n FROM prompts WHERE is_favorite = 1").get() as { n: number }).n,
  tagLinks: (db.prepare("SELECT COUNT(*) AS n FROM prompt_tags").get() as { n: number }).n,
};

console.log(`
[seed] Done.
  Inserted : ${inserted} prompts
  Skipped  : ${skipped} (already exist)
  ─────────────────────────
  Total prompts   : ${stats.prompts}
  Total tags      : ${stats.tags}
  Tag assignments : ${stats.tagLinks}
  Favorites       : ${stats.favorites}
`);

db.close();
