# AINative Studio Project Context

**Project**: AINative Studio Marketing Website (Next.js Migration)
**Last Updated**: 2026-01-18
**Compatible With**: Gemini CLI, Claude Code, and other AI coding assistants

---

## Project Overview

This is the **Next.js 16** production version of the AINative Studio marketing website, migrated from a Vite-based SPA. The project serves as the public-facing website for AINative Studio's AI development platform.

---

## Repository Paths

### Primary Repository (Next.js - Production)
**Path**: `/Users/aideveloper/ainative-website-nextjs-staging`
**Framework**: Next.js 16 (App Router)
**Status**: ✅ Active Development (Go-live: 1-2 days)

### Legacy Repository (Vite - Reference)
**Path**: `/Users/aideveloper/core/AINative-website`
**Framework**: Vite + React 18
**Status**: 🔒 Read-only reference (live production)

---

## Tech Stack

- **Framework**: Next.js 16 (App Router, TypeScript)
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **State Management**: React Query (TanStack Query)
- **Analytics**: Google Analytics 4, Google Tag Manager
- **Deployment**: Railway (production), Vercel (staging)
- **Package Manager**: npm

---

## Architecture

### Page Structure
```
app/                    # Next.js App Router pages
  layout.tsx           # Root layout with SEO metadata
  page.tsx             # Homepage
  [feature]/
    page.tsx           # Server component (exports metadata)
    [Feature]Client.tsx # Client component ('use client')
```

### Migration Pattern (from Vite)
1. **Server Component** (`app/[page]/page.tsx`):
   - Export `metadata` for SEO (replaces react-helmet-async)
   - Import and render client component
   - No 'use client' directive

2. **Client Component** (`app/[page]/[Page]Client.tsx`):
   - Add `'use client'` directive at top
   - Convert `react-router-dom` Link to Next.js Link (`to=` → `href=`)
   - Remove Helmet imports
   - Keep framer-motion for animations

### Component Library
- **Branded Components**: `components/branding/` (InputBranded, BrandedEmpty, etc.)
- **UI Components**: `components/ui/` (shadcn/ui)
- **Layout**: `components/layout/` (Header, Footer)
- **SEO**: `components/seo/StructuredData.tsx`

---

## Design System

### Color Palette
```typescript
primary: '#4B6FED',      // AI Native Blue
secondary: '#8A63F4',    // Purple
accent: '#D04BF4',       // Pink
background: '#0D1117',   // Dark BG (Vite-aligned)
surface: '#161B22',      // Dark surface
border: '#2D333B',       // Dark border
```

### Typography
- **Font**: Poppins (400, 500, 600, 700) via next/font/google
- **Scale**: title-1 (28px), title-2 (24px), body (14px), button (12px)

### Key CSS Classes
- `.text-gradient` - Blue to teal text gradient
- `.container-custom` - Max-width 1280px container
- `.card-vite` - Branded card with hover effects

---

## SEO Configuration

### Root Layout Metadata
- Title template: `%s | AI Native Studio`
- Comprehensive Open Graph and Twitter Cards
- JSON-LD structured data (Organization, SoftwareApplication, WebSite)

### Per-Page Metadata
Every page exports a `metadata` object with:
- Unique title and description
- Relevant keywords
- Page-specific OG images
- Canonical URLs

### Structured Data Schemas (Available)
- `ArticleSchema` - Blog posts
- `FAQSchema` - FAQ pages
- `VideoSchema` - Tutorials/webinars
- `HowToSchema` - Tutorial pages
- `BreadcrumbSchema` - Navigation
- `ProductSchema` - Pricing

---

## Services & APIs

### Backend API
**Base URL**: `https://api.ainative.studio/v1`
**Auth**: JWT tokens via `AuthService`

### Key Services (`services/`)
- `pricingService.ts` - Stripe checkout integration
- `apiKeyService.ts` - API key management
- `authService.ts` - Authentication
- `creditService.ts` - Credit system
- `usageService.ts` - Usage tracking

---

## Development Workflow

### Local Development
```bash
# Start dev server (port 3000 - RESERVED)
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Build verification
npm run build

# Run tests
npm test
```

### Pre-Commit Checklist
1. `npm run lint` - must pass
2. `npm run type-check` - must pass
3. `npm run build` - must succeed
4. `npm test` - all tests pass

### Port Reservations
- **Port 3000**: Reserved for AINative Studio Next.js dev server
- **Port 3001**: Other local services

---

## Git Workflow

### Branch Strategy
- `main` - production branch
- Feature branches: `feature/[name]`
- Bug fixes: `fix/[name]`

### Commit Rules (ZERO TOLERANCE)
**NEVER include in commits, PRs, or GitHub activity:**
- "Claude" / "Anthropic" / "claude.com"
- "Generated with Claude" / "Claude Code"
- "Co-Authored-By: Claude" or any Claude/Anthropic reference
- AI tool attribution of any kind

See `.claude/rules/git-rules.md` for complete rules.

---

## Gap Analysis Status

### Functional Gaps
- **Total**: 47 gaps identified
- **Critical**: 6 items (27-42 hours)
- **Tracking**: GitHub Issues #327-#369
- **Document**: `gaps-backlog.md`

### Design System Gaps
- **Total**: 15 gaps identified
- **Critical**: 3 items (11-16 hours)
- **Tracking**: GitHub Issues #370-#384
- **Document**: `design-gaps-backlog.md`

### SEO Gaps
- **Total**: 18 gaps identified
- **Critical**: 5 items (15-21 hours)
- **Tracking**: GitHub Issues #385-#389
- **Document**: `seo-gaps-backlog.md`

---

## AI Agent Configuration

### Claude Code
- Primary agent configuration: `.claude/CLAUDE.md`
- Specialized agents: `.claude/agents/`
- Custom rules: `.claude/rules/`

### Gemini CLI (This File)
- Project context: `.ainative/AINATIVE.md` (this file)
- Settings: `.ainative/settings.json`
- Custom rules: `.ainative/rules/`

---

## MCP Servers (Model Context Protocol)

### Configured MCP Servers
1. **ZeroDB MCP Server** - Vector database, embeddings, agent memory
2. **GitHub MCP Server** - GitHub API integration
3. **AINative Design MCP Server** - Design system analysis

See `.claude/CLAUDE.md` for complete MCP configuration.

---

## Key Files Reference

### Configuration
- `next.config.ts` - Next.js configuration
- `tailwind.config.ts` - Tailwind configuration
- `tsconfig.json` - TypeScript configuration
- `lib/config/app.ts` - App configuration

### Documentation
- `gaps-backlog.md` - Functional gaps (47 items)
- `design-gaps-backlog.md` - Design gaps (15 items)
- `seo-gaps-backlog.md` - SEO gaps (18 items)
- `GAP_ANALYSIS_SUMMARY.md` - Functional summary
- `DESIGN_GAP_ANALYSIS_SUMMARY.md` - Design summary
- `SEO_GAP_ANALYSIS_SUMMARY.md` - SEO summary

### SEO & Analytics
- `app/layout.tsx` - Root metadata
- `app/sitemap.ts` - Dynamic sitemap
- `app/robots.ts` - Robots.txt
- `components/seo/StructuredData.tsx` - JSON-LD schemas

---

## Environment Variables

### Required
```bash
NEXT_PUBLIC_SITE_URL=https://www.ainative.studio
NEXT_PUBLIC_API_URL=https://api.ainative.studio/v1
```

### Optional
```bash
NEXT_PUBLIC_META_PIXEL_ID=your_pixel_id
NEXT_PUBLIC_GA_ID=G-ML0XEBPZV2
NEXT_PUBLIC_GTM_ID=GTM-MJKQDBGV
```

---

## Testing

### Test Structure
```
test/                  # Test scripts
  issue-[N]-[page].test.sh  # Page-specific tests
```

### Testing Philosophy
- Test-driven development (TDD) preferred
- BDD-style tests (Given/When/Then)
- Minimum 80% coverage for new features

---

## Resources

### Documentation
- Next.js 16 Docs: https://nextjs.org/docs
- Tailwind CSS v4: https://tailwindcss.com/docs
- shadcn/ui: https://ui.shadcn.com

### Internal
- Original Vite Site: `/Users/aideveloper/core/AINative-website`
- Migration Guide: See gap analysis documents

---

## Contact & Support

- **Team**: AINative Studio
- **Repository**: ainative-website-nextjs-staging
- **Issues**: GitHub Issues (#327-#389 active)
- **Deployment**: Railway (production), Vercel (staging)

---

**Last Updated**: 2026-01-18
**Next Review**: Before go-live (1-2 days)
