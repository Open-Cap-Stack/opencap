---
description: Enforce unique featured images for Strapi blog posts
---

# Strapi Blog Image Uniqueness

## ZERO TOLERANCE: One Image, One Post

**NEVER use the same featured image on multiple blog posts.**

## Why This Matters

With duplicate images:
- Users think posts are the same
- Unprofessional appearance
- Reduced click-through rates
- Damaged brand perception

## Before Assigning an Image

### 1. Check if Already Used

```typescript
const allPosts = await strapi_list_blog_posts({ pageSize: 100 });

const imageId = "proposed-image-123";
const alreadyUsed = allPosts.data.some(
  post => post.featured_image?.id === imageId
);

if (alreadyUsed) {
  // Choose a different image!
}
```

### 2. Or Run Audit Script

```bash
node scripts/strapi_check_blog_images.js
```

## Fixing Duplicates

Priority for keeping the image:
1. First published post (oldest)
2. Most viewed post
3. Most recent post

Assign NEW images to all other posts.

## Image Guidelines

| Criteria | Good | Bad |
|----------|------|-----|
| Relevance | Related to topic | Generic stock |
| Quality | 1200x630+ px | Low resolution |
| Uniqueness | Custom/rare | Overused stock |
| Brand | AINative colors | Off-brand |

## Image Sources

1. **Custom Design** - Figma/Canva graphics
2. **AI-Generated** - DALL-E, Midjourney
3. **Stock Photos** - Unsplash, Pexels
4. **Screenshots** - Product screenshots

## Pre-Publication Checklist

- [ ] Featured image assigned
- [ ] Image is unique (not on other posts)
- [ ] Image is high quality
- [ ] Image is relevant
- [ ] Image source documented

Invoke this skill when working with Strapi blog images.
