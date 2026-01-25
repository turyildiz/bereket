# Developer Notes: Bereket Market Blog System

This folder implements a **Static-First** blog system using **Markdown** and **Static Site Generation (SSG)**.

## 📁 Structure

- `page.tsx`: The Blog Index page. Reads all markdown files from `root/blog-articles/` to display the grid of articles.
- `[slug]/page.tsx`: The generic template for rendering an article. It uses `generateStaticParams` to pre-build pages for all markdown files.
- `lib/blog.ts`: Utilities for reading and parsing markdown files.

## 🚀 Workflow: Adding a New Article

1. create a new `.md` file in `blog-articles/` folder (in the project root).
2. The filename should be the slug (e.g., `my-new-article.md`).
3. Add Frontmatter at the top:
   ```yaml
   ---
   title: "My New Article"
   date: "2024-10-28"
   excerpt: "A short summary..."
   thumbnail: "/blog/path/to/image.jpg"
   ---
   ```
4. Write content in Markdown.
   - You can use standard Markdown.
   - Images can be placed in `public/blog/...` and referenced as `/blog/...`.

## 🎨 Design Guidelines
- The system automatically styles Markdown content (headings, paragraphs, lists, images) to match the Bereket Market design system.
