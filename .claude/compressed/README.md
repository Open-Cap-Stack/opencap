# Compressed Documentation Files

This directory contains optimized versions of `.claude/*.md` files, compressed by **76.5%** for faster LLM context loading.

## Quick Start for Team Members

### 1. Update Your IDE Configuration

**Before:**
```json
{
  "contextFiles": [
    ".claude/CLAUDE.md",
    ".claude/git-rules.md"
  ]
}
```

**After:**
```json
{
  "contextFiles": [
    ".claude/compressed/CLAUDE.md",
    ".claude/compressed/git-rules.md",
    ".claude/compressed/CONVERSION_TRACKING.md"
  ]
}
```

### 2. Benefits

- **76.5% smaller:** 19,427 → 4,556 tokens
- **4x faster loading:** Reduced API latency
- **Same information:** 100% of critical content preserved
- **Lower costs:** 76% less API usage per load

### 3. File Mapping

| Compressed File | Original | Reduction |
|----------------|----------|-----------|
| CLAUDE.md | .claude/CLAUDE.md | 62.6% |
| CONVERSION_TRACKING.md | .claude/CONVERSION_TRACKING.md | 86.0% |
| CRITICAL_FILE_PLACEMENT_RULES.md | .claude/CRITICAL_FILE_PLACEMENT_RULES.md | 75.5% |
| ISSUE_TRACKING_ENFORCEMENT.md | .claude/ISSUE_TRACKING_ENFORCEMENT.md | 70.3% |
| SDK_PUBLISHING_GUIDELINES.md | .claude/SDK_PUBLISHING_GUIDELINES.md | 66.4% |
| STRAPI_GUIDELINES.md | .claude/STRAPI_GUIDELINES.md | 74.8% |
| git-rules.md | .claude/git-rules.md | 59.8% |

### 4. Re-compression (After Updating Originals)

When you update original files in `.claude/`, re-run compression:

```bash
# Install dependencies (one-time)
pip3 install --break-system-packages anthropic

# Set API key
export ANTHROPIC_API_KEY="sk-ant-..."

# Run compression
python3 scripts/compress_claude_docs_anthropic.py --all
```

### 5. Compression Options

```bash
# Compress all files
python3 scripts/compress_claude_docs_anthropic.py --all

# Compress single file
python3 scripts/compress_claude_docs_anthropic.py \
  --file .claude/CONVERSION_TRACKING.md \
  --target-ratio 0.25

# Custom output location
python3 scripts/compress_claude_docs_anthropic.py \
  --file .claude/RULES.MD \
  --output custom/location.md
```

### 6. Verification

Compare original vs compressed:
```bash
# Token count estimate
wc -w .claude/CLAUDE.md .claude/compressed/CLAUDE.md

# File sizes
ls -lh .claude/CLAUDE.md .claude/compressed/CLAUDE.md

# Content diff
diff .claude/CLAUDE.md .claude/compressed/CLAUDE.md
```

## Reports

- **COMPRESSION_REPORT.md** - Phase 1 manual compression results
- **FINAL_COMPRESSION_REPORT.md** - Complete analysis with metrics

## Important Notes

1. **Original files unchanged:** All originals remain in `.claude/` for editing
2. **Edit originals, not compressed:** Always edit `.claude/*.md`, then re-compress
3. **Git tracking:** Both original and compressed files are version controlled
4. **Team consistency:** Everyone should use compressed versions for context

## Questions?

See detailed documentation in:
- `.claude/compressed/FINAL_COMPRESSION_REPORT.md`
- `scripts/compress_claude_docs_anthropic.py --help`

---

**Last Updated:** 2025-12-28
**Compression Ratio:** 76.5% (19,427 → 4,556 tokens)
**Method:** Anthropic Claude 3.5 Haiku
