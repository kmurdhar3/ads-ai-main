# User Profile

## Identity
- **Name**: Kamlesh (kmurdhar3)
- **Email**: murdhariya.kamlesh3@gmail.com
- **Role**: Developer/Builder working on AI ad creation tool
- **Location**: Working from `/home/kamlesh/Documents/Kamlesh/Twitter/ads-ai-main`

## Current Project
Building a **white-label AI ad creation tool** for Facebook/Instagram advertising. The tool helps marketers create high-performing ads by reverse-engineering proven competitor strategies from the Meta Ad Library.

## Development Context

### This Workspace
This is the **ads-ai-main** project — a hybrid system combining:
- Claude Code CLI (for agentic brand context collection via `/collect-brand`)
- Next.js web application (4-step user flow for ad creation)

### Related Projects
The user has multiple projects in the home directory:
- `~/StudioProjects/VoiceUI` — React Native mobile app (SpeakIt)
- `~/claude-desktop-debian` — Build scripts for Claude Desktop on Linux
- `~/Documents/MCP/first-mcp` — Java MCP server
- `~/openclaw` — AI agent workspace framework

## Technical Preferences

### Code Style
- Functional, clean code
- Minimal abstractions (prefer 3 similar lines over premature abstraction)
- No comments unless WHY is non-obvious
- Descriptive variable names over documentation

### Tools & Stack
- **Frontend**: Next.js, React, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, TypeScript
- **AI**: Anthropic Claude, Google Gemini, Kie.ai
- **Testing**: Vitest
- **Version Control**: Git (GitHub)

## Current Priorities

### Active Work
1. Understanding the core systems (competitive analysis, QC, image generation)
2. Maintaining/improving the 4-step ad creation flow
3. Ensuring QC quality (6.0 threshold calibration)
4. Optimizing user experience (invisible QC, clean UI)

### Key Questions Being Explored
- How does the competitive scoring algorithm work?
- What makes the QC system effective at catching bad concepts?
- How does image generation match competitor formats?
- What are the cost/performance characteristics?

## Communication Preferences

### How the User Works
- Prefers **detailed technical explanations** with code examples
- Values **real-world examples** over abstract descriptions
- Wants to understand **WHY** design decisions were made
- Appreciates **visual diagrams** (ASCII art, flow charts)

### What the User Expects
- **Complete understanding** — not just "what" but "why" and "how"
- **Context files** — documented for future sessions
- **Actionable knowledge** — can modify/tune systems based on understanding
- **No hand-waving** — concrete numbers, formulas, thresholds

## Learning Style

### Effective
- Code walkthrough with real examples
- Step-by-step breakdowns
- Performance characteristics (time, cost, API calls)
- Edge cases and error handling

### Less Effective
- High-level overviews without details
- "Just trust it works" explanations
- Documentation without examples

## Project Goals

### Short-Term
- Deeply understand the three core systems
- Document everything in context files
- Ensure knowledge persists across sessions

### Long-Term
- Build a production-ready white-label tool
- Optimize cost/performance (currently ~$0.04 per concept)
- Scale to multiple users/brands
- Potentially add video generation (currently script-only)

## Technical Challenges Faced

### Solved
1. **Product catalog false positives** — QC flagging real products as "wrong category"
   - Solution: Pass full product catalog to QC
2. **Aspect ratio mismatch** — Generated images not matching competitor format
   - Solution: Parse image dimensions from competitor ad headers
3. **Generic ad copy** — AI copying competitor's product instead of brand's
   - Solution: Product-first prompt structure with explicit warnings

### Current
1. **Cost optimization** — $0.04 per concept (acceptable but could be lower)
2. **Image generation speed** — 30-90s per image (Kie.ai bottleneck)
3. **QC retry rate** — 15-20% need retry (aiming for <10%)

## Success Metrics

### Quality
- QC pass rate: ~90% after retry (target: 95%)
- User-visible concepts: Only passing (≥6.0)
- False positive rate: Near zero (after product catalog fix)

### Performance
- 10 concepts in 4-8 minutes (acceptable)
- Cost: ~$0.04 per concept (acceptable, aiming for $0.03)

### User Experience
- QC is invisible (no scores shown)
- Real-time progress (SSE streaming)
- Clean, visual-first UI (dark glass-morphism)

## How Claude Should Assist

### Do
- Provide detailed technical explanations
- Show code examples and real data
- Explain design decisions and tradeoffs
- Create comprehensive context files
- Use diagrams and visual aids
- Give concrete numbers (time, cost, scores)

### Don't
- Skip details or simplify too much
- Give generic advice without specifics
- Assume understanding without verification
- Make changes without explaining why
- Leave knowledge undocumented

## Session Expectations

### Typical Flow
1. User asks about a system/feature
2. Claude provides detailed breakdown
3. User asks follow-up questions
4. Claude creates context files for future reference
5. User may request modifications/optimizations

### What's Valuable
- **Context files** — Persists knowledge across sessions
- **Code references** — File paths, line numbers, exact functions
- **Real examples** — Actual data, not placeholder values
- **Design insights** — Why decisions were made, not just what they are

## Notes for Future Sessions

- User is building a **production tool**, not a prototype
- **Quality matters** — QC, user experience, polish are priorities
- **Cost awareness** — Every API call costs money, optimize where possible
- **Documentation first** — Context files ensure knowledge isn't lost
- **Visual-first thinking** — User values clean UI, dark glass-morphism theme
