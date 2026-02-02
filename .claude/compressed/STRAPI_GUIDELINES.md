# Strapi CMS Content Guidelines

## Critical Rules

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

#### Tables & Data

**ALWAYS use HTML tables for:**
- SDK comparisons
- Feature matrices
- Technical specs

```html
<table style="width: 100%; border-collapse: collapse;">
  <thead>
    <tr>
      <th>Feature</th>
      <th>Python SDK</th>
      <th>TypeScript SDK</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Feature Name</td>
      <td>✅ Value</td>
      <td>✅ Value</td>
    </tr>
  </tbody>
</table>
```

#### Code Blocks

Use fenced code blocks with language:
```python
# Python example
```

```typescript
// TypeScript example
```

#### Callouts

```html
<div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 1rem;">
  <strong>💡 Pro Tip:</strong> Helpful guidance
</div>
```

### 3. SEO & Metadata

**Best Practices:**
- Title: 50-60 chars
- Excerpt: 150-160 chars
- Tags: 3-10, lowercase, hyphenated

**Common Tags:**
- `ai`, `machine-learning`
- `sdk`, `api`
- `python`, `typescript`
- `tutorial`, `guide`

### 4. Publishing Workflow

1. Create Content
2. Complete Metadata
3. Preview/Review
4. Publish

### 5. Strapi MCP Tools

**Create Blog Post:**
```typescript
strapi_create_blog_post({
  title: "Title",
  content: "Markdown content",
  author_id: 1,
  category_id: 1,
  tag_ids: [1, 2, 3]
})
```

### 6. Quality Checklist

- [ ] Slug set
- [ ] 3-5 tags added
- [ ] Category assigned
- [ ] Author assigned
- [ ] Excerpt written
- [ ] Published date set
- [ ] Code blocks formatted
- [ ] HTML tables used
- [ ] Links tested
- [ ] Mobile-responsive
- [ ] No typos
- [ ] No AI attribution

**Version:** 1.0