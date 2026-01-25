import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const postsDirectory = path.join(process.cwd(), 'blog-articles');

export interface BlogPost {
    slug: string;
    title: string;
    date: string;
    excerpt: string;
    thumbnail: string;
    ctaType?: 'offers' | 'sweets' | 'business' | 'general';
    content: string;
}

export function getAllPosts(): BlogPost[] {
    // Ensure directory exists
    if (!fs.existsSync(postsDirectory)) {
        return [];
    }

    const fileNames = fs.readdirSync(postsDirectory);
    const allPostsData = fileNames
        .filter((fileName) => fileName.endsWith('.md'))
        .map((fileName) => {
            const slug = fileName.replace(/\.md$/, '');
            const fullPath = path.join(postsDirectory, fileName);
            const fileContents = fs.readFileSync(fullPath, 'utf8');
            const { data, content } = matter(fileContents);

            return {
                slug,
                title: data.title || 'Untitled',
                date: data.date || new Date().toISOString(),
                excerpt: data.excerpt || '',
                thumbnail: data.thumbnail || '',
                ctaType: data.ctaType || 'general',
                content,
            };
        });

    // Sort posts by date
    return allPostsData.sort((a, b) => {
        if (a.date < b.date) {
            return 1;
        } else {
            return -1;
        }
    });
}

export function getPostBySlug(slug: string): BlogPost | null {
    try {
        const fullPath = path.join(postsDirectory, `${slug}.md`);
        if (!fs.existsSync(fullPath)) {
            return null;
        }
        const fileContents = fs.readFileSync(fullPath, 'utf8');
        const { data, content } = matter(fileContents);

        return {
            slug,
            title: data.title,
            date: data.date,
            excerpt: data.excerpt,
            thumbnail: data.thumbnail,
            ctaType: data.ctaType || 'general',
            content,
        };
    } catch (error) {
        return null;
    }
}
