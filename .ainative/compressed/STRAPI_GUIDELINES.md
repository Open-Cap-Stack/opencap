# Strapi CMS Content Guidelines

## Critical Rules for Strapi Blog Posts

### 1. Required Fields

**MANDATORY before publishing:**
- Slug (URL-friendly)
- Tags (3-5 relevant)
- Category
- Author
- Excerpt (1-2 sentences)
- Published Date
- Featured Image

### 2. Content Formatting

#### Data Comparisons
- **ALWAYS use HTML tables**
- Use responsive design
- Add subtle styling
- Semantic HTML structure

#### Code Blocks
- Use fenced code blocks with language
- Specify language for syntax highlighting

#### Callouts
```html
<div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 1rem; border-radius: 4px;">
  <strong>💡 Pro Tip:</strong> Helpful guidance
</div>
```

### 3. SEO and Metadata

**Title Guidelines:**
- 50-60 characters
- Include primary keyword
- Action-oriented

**Tag Best Practices:**
- 3-10 tags
- Lowercase, hyphenated
- Include tech names, categories, features

### 4. Publishing Workflow

1. Create Content
2. Complete Metadata
3. Preview and Review
4. Publish

### 5. Content Structure Template

```markdown
# Title (H1)

Brief introduction

## Sections (H2)

Content with code, tables

## Conclusion
```

### 6. Image Guidelines
- Descriptive alt text
- Optimize file size
- Use WebP
- Descriptive filenames

### 7. Links and CTAs
- Use markdown/HTML links
- External links: `target="_blank"`
- Styled CTA buttons

### 8. Common Mistakes

❌ **DON'T:**
- Publish without slug
- Use Markdown tables
- Skip tags/excerpt
- Use AI attribution

✅ **DO:**
- Set complete metadata
- Use HTML tables
- Add relevant tags
- Publish with `publish: true`

### 9. Strapi MCP Tools

```typescript
// Create Blog Post
strapi_create_blog_post({
  title: "Title",
  content: "Markdown content",
  author_id: 1,
  category_id: 1,
  tag_ids: [1, 2, 3]
})

// Publish Post
strapi_publish_blog_post({
  document_id: "post-id",
  publish: true
})
```

### 10. Quality Checklist

- [ ] Slug set
- [ ] 3-5 tags
- [ ] Category assigned
- [ ] Author assigned
- [ ] Excerpt written
- [ ] Code blocks formatted
- [ ] Links tested
- [ ] Mobile-responsive
- [ ] No errors

**Version:** 1.0