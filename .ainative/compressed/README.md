# Compressed Documentation Files

This directory contains optimized versions of `.ainative/*.md` files, compressed by **76.5%** for faster LLM context loading.

## Quick Start for Team Members

### 1. Update Your IDE Configuration

**Before:**
```json
{
  "contextFiles": [
    ".ainative/CODY.md",
    ".ainative/git-rules.md"
  ]
}
```

**After:**
```json
{
  "contextFiles": [
    ".ainative/compressed/CODY.md",
    ".ainative/compressed/git-rules.md",
    ".ainative/compressed/CONVERSION_TRACKING.md"
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
| CODY.md | .ainative/CODY.md | 62.6% |
| CONVERSION_TRACKING.md | .ainative/CONVERSION_TRACKING.md | 86.0% |
| CRITICAL_FILE_PLACEMENT_RULES.md | .ainative/CRITICAL_FILE_PLACEMENT_RULES.md | 75.5% |
| ISSUE_TRACKING_ENFORCEMENT.md | .ainative/ISSUE_TRACKING_ENFORCEMENT.md | 70.3% |
| SDK_PUBLISHING_GUIDELINES.md | .ainative/SDK_PUBLISHING_GUIDELINES.md | 66.4% |
| STRAPI_GUIDELINES.md | .ainative/STRAPI_GUIDELINES.md | 74.8% |
| git-rules.md | .ainative/git-rules.md | 59.8% |

### 4. Re-compression (After Updating Originals)

When you update original files in `.ainative/`, re-run compression:

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
  --file .ainative/CONVERSION_TRACKING.md \
  --target-ratio 0.25

# Custom output location
python3 scripts/compress_claude_docs_anthropic.py \
  --file .ainative/RULES.MD \
  --output custom/location.md
```

### 6. Verification

Compare original vs compressed:
```bash
# Token count estimate
wc -w .ainative/CODY.md .ainative/compressed/CODY.md

# File sizes
ls -lh .ainative/CODY.md .ainative/compressed/CODY.md

# Content diff
diff .ainative/CODY.md .ainative/compressed/CODY.md
```

## Reports

- **COMPRESSION_REPORT.md** - Phase 1 manual compression results
- **FINAL_COMPRESSION_REPORT.md** - Complete analysis with metrics

## Important Notes

1. **Original files unchanged:** All originals remain in `.ainative/` for editing
2. **Edit originals, not compressed:** Always edit `.ainative/*.md`, then re-compress
3. **Git tracking:** Both original and compressed files are version controlled
4. **Team consistency:** Everyone should use compressed versions for context

## Questions?

See detailed documentation in:
- `.ainative/compressed/FINAL_COMPRESSION_REPORT.md`
- `scripts/compress_claude_docs_anthropic.py --help`

---

**Last Updated:** 2025-12-28
**Compression Ratio:** 76.5% (19,427 → 4,556 tokens)
**Method:** AINative Cody AI
