---
description: Mandatory slug parameter for Strapi blog post updates
---

# Strapi Blog Slug Requirement

## WITHOUT SLUG = WORK IS NULL AND VOID

When updating ANY Strapi blog post, you **MUST ALWAYS** include the `slug` parameter.

## Why This Is Critical

The slug is used in the route: `/blog/{slug}`

Without slug:
- Blog detail pages will 404
- Users cannot view content
- All your work is wasted

## CORRECT Usage

```typescript
mcp__ainative-strapi__strapi_update_blog_post({
  document_id: "abc123",
  slug: "my-blog-post-title",  // REQUIRED!
  content: "# Updated content..."
})
```

## WRONG Usage (NULL AND VOID)

```typescript
mcp__ainative-strapi__strapi_update_blog_post({
  document_id: "abc123",
  // slug: missing!  // FATAL ERROR!
  content: "# Updated content..."
})
```

## How to Get the Slug

### From Existing Post
```json
{
  "data": {
    "slug": "existing-blog-post-slug"
  }
}
```

### Generate from Title
- Lowercase
- Replace spaces with hyphens
- Remove special characters
- "My Blog Post!" → "my-blog-post"

## Mandatory Checklist

Before calling `strapi_update_blog_post`:

- [ ] **Slug parameter included** (REQUIRED)
- [ ] **Content parameter included** (REQUIRED)
- [ ] **Document ID included** (REQUIRED)

## When to Include Slug

**ALWAYS.**

Even if only updating:
- Content
- Excerpt
- Tags
- Any other field

**ALWAYS include the slug parameter.**

Invoke this skill when updating Strapi blog posts.
