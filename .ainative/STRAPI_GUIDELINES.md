# Strapi CMS Content Guidelines

## Critical Rules for Strapi Blog Posts

### 1. Required Fields - ALWAYS Complete These

**MANDATORY before publishing:**
- ✅ **Slug** - MUST be set (URL-friendly: `my-blog-post-title`)
- ✅ **Tags** - MUST add relevant tags (minimum 3-5 tags)
- ✅ **Category** - MUST assign a category
- ✅ **Author** - MUST assign an author
- ✅ **Excerpt** - MUST add a compelling excerpt (1-2 sentences)
- ✅ **Published Date** - Set to current date/time or scheduled date
- ✅ **Featured Image** - Add when available

### 2. Content Formatting Rules

#### Use HTML Tables for Data Comparisons

**NEVER use Markdown tables for:**
- SDK/product comparisons
- Feature matrices
- Pricing tables
- Technical specifications

**ALWAYS use styled HTML tables:**

```html
<div style="overflow-x: auto; margin: 2rem 0;">
  <table style="width: 100%; border-collapse: collapse; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <thead>
      <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
        <th style="padding: 1rem; text-align: left; font-weight: 600;">Feature</th>
        <th style="padding: 1rem; text-align: center; font-weight: 600;">Python SDK</th>
        <th style="padding: 1rem; text-align: center; font-weight: 600;">TypeScript SDK</th>
        <th style="padding: 1rem; text-align: center; font-weight: 600;">Go SDK</th>
      </tr>
    </thead>
    <tbody>
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 1rem; font-weight: 500;">Feature Name</td>
        <td style="padding: 1rem; text-align: center;">✅ Value</td>
        <td style="padding: 1rem; text-align: center;">✅ Value</td>
        <td style="padding: 1rem; text-align: center;">✅ Value</td>
      </tr>
    </tbody>
  </table>
</div>
```

**Table Styling Best Practices:**
- Use `overflow-x: auto` wrapper for mobile responsiveness
- Add subtle shadows for depth: `box-shadow: 0 2px 8px rgba(0,0,0,0.1)`
- Use gradient backgrounds for headers: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- Add alternating row colors: `background: #f9fafb` for even rows
- Ensure adequate padding: `1rem` minimum
- Use semantic HTML: `<thead>`, `<tbody>`, `<tfoot>`

#### Code Blocks

**Use fenced code blocks with language:**
```python
# Python code
```

```typescript
// TypeScript code
```

```bash
# Shell commands
```

#### Callouts and Highlights

**Use HTML for callouts:**
```html
<div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 1rem; margin: 1rem 0; border-radius: 4px;">
  <strong>💡 Pro Tip:</strong> Your helpful tip here
</div>
```

**Warning boxes:**
```html
<div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 1rem; margin: 1rem 0; border-radius: 4px;">
  <strong>⚠️ Warning:</strong> Important warning message
</div>
```

**Success boxes:**
```html
<div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 1rem; margin: 1rem 0; border-radius: 4px;">
  <strong>✅ Success:</strong> Positive message
</div>
```

### 3. SEO and Metadata

**Title Best Practices:**
- 50-60 characters maximum
- Include primary keyword
- Make it compelling and action-oriented

**Excerpt Best Practices:**
- 150-160 characters
- Summarize the value proposition
- Include a call-to-action or benefit

**Tags Best Practices:**
- Minimum 3, maximum 10 tags
- Use lowercase, hyphenated format: `machine-learning`, `api-design`
- Include technology names: `python`, `typescript`, `go`
- Include categories: `sdk`, `tutorial`, `announcement`
- Include feature names: `vector-search`, `embeddings`, `quantum`

**Common Tags for AINative Content:**
- `ai`, `machine-learning`, `deep-learning`
- `sdk`, `api`, `developer-tools`
- `python`, `typescript`, `javascript`, `go`
- `zerodb`, `vector-database`, `embeddings`
- `quantum-computing`, `agent-apis`
- `tutorial`, `guide`, `announcement`, `release-notes`

### 4. Publishing Workflow

**Step-by-Step Process:**

1. **Create Content**
   - Write comprehensive, accurate content
   - Use proper formatting (HTML tables, code blocks, callouts)
   - Add images/screenshots where helpful

2. **Complete Metadata**
   - Set slug (auto-generated from title, but verify it's clean)
   - Add 3-5 relevant tags
   - Assign category
   - Assign author
   - Write compelling excerpt
   - Set published date

3. **Preview and Review**
   - Check for typos and grammar
   - Verify all code examples work
   - Ensure links are valid
   - Check mobile responsiveness (especially tables)

4. **Publish**
   - Use `strapi_publish_blog_post` with `publish: true`
   - Verify status changes from "modified" to "published"
   - Check live URL

### 5. Content Structure Template

```markdown
# Title (H1 - only one per post)

Brief introduction paragraph (2-3 sentences)

## Section 1 (H2)

Content with paragraphs, code blocks, lists

### Subsection 1.1 (H3)

Detailed content

## Section 2 (H2)

<div style="overflow-x: auto; margin: 2rem 0;">
  <table style="...">
    <!-- HTML table for comparisons -->
  </table>
</div>

## Conclusion

Summary and call-to-action
```

### 6. Image Guidelines

**When Adding Images:**
- Use descriptive alt text
- Optimize file size (< 500KB for web)
- Use WebP or modern formats when possible
- Name files descriptively: `python-sdk-installation.png`

**Markdown Format:**
```markdown
![Python SDK Installation Process](image-url.png)
```

**HTML Format (for more control):**
```html
<img src="image-url.png" alt="Python SDK Installation Process" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
```

### 7. Links and CTAs

**Internal Links:**
```markdown
[Python SDK Documentation](https://docs.ainative.studio/sdk/python)
```

**External Links (open in new tab with HTML):**
```html
<a href="https://external-site.com" target="_blank" rel="noopener noreferrer">External Resource</a>
```

**CTA Buttons (HTML):**
```html
<div style="text-align: center; margin: 2rem 0;">
  <a href="https://www.ainative.studio/signup" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1rem 2rem; border-radius: 8px; text-decoration: none; font-weight: 600; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
    Get Started Free →
  </a>
</div>
```

### 8. Common Mistakes to Avoid

❌ **DON'T:**
- Publish without setting slug
- Use Markdown tables for complex data
- Forget to add tags
- Skip the excerpt
- Use third-party AI attribution (Claude, ChatGPT, Copilot, etc.)
- Leave posts in "draft" or "modified" status
- Use unstyled tables
- Forget to assign author/category

✅ **DO:**
- Set all required metadata before publishing
- Use styled HTML tables for comparisons
- Add minimum 3 relevant tags
- Write compelling excerpts
- Publish with `publish: true`
- Test on mobile (especially tables)
- Use semantic HTML
- Add visual hierarchy with proper headings
- Use AINative branding if attribution needed (Built by AINative, etc.)

### 9. Strapi MCP Tools Reference

**Create Blog Post:**
```typescript
strapi_create_blog_post({
  title: "Your Title",
  content: "# Markdown content...",
  author_id: 1,
  category_id: 1,
  tag_ids: [1, 2, 3],
  description: "Compelling excerpt",
  publishedAt: new Date().toISOString()
})
```

**Update Blog Post:**
```typescript
strapi_update_blog_post({
  document_id: "post-id",
  content: "Updated content...",
  slug: "url-friendly-slug"
})
```

**Publish Blog Post:**
```typescript
strapi_publish_blog_post({
  document_id: "post-id",
  publish: true
})
```

**List Tags:**
```typescript
strapi_list_tags()
```

**List Categories:**
```typescript
strapi_list_categories()
```

**List Authors:**
```typescript
strapi_list_authors()
```

### 10. Quality Checklist

Before publishing, verify:

- [ ] Slug is set and URL-friendly
- [ ] 3-5 relevant tags added
- [ ] Category assigned
- [ ] Author assigned
- [ ] Excerpt written (150-160 chars)
- [ ] Published date set
- [ ] All code blocks have language specified
- [ ] HTML tables used for data comparisons
- [ ] No Markdown tables for complex data
- [ ] All links tested and working
- [ ] Mobile-responsive (tables scroll)
- [ ] No typos or grammar errors
- [ ] No AI attribution anywhere
- [ ] Images have alt text
- [ ] Status is "published" not "modified"

---

**Last Updated:** 2025-12-23
**Version:** 1.0
