const fs = require('fs');
const path = require('path');

const rootDir = 'c:\\Projects\\bereket-market\\app';
const publicDir = 'c:\\Projects\\bereket-market\\public';

// Helper to get all page.tsx files recursively
function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            if (file === 'page.tsx') {
                arrayOfFiles.push(path.join(dirPath, "/", file));
            }
        }
    });

    return arrayOfFiles;
}

const files = getAllFiles(rootDir);
const scanResults = [];

files.forEach(fullPath => {
    const relativePath = path.relative(rootDir, fullPath);
    try {
        const content = fs.readFileSync(fullPath, 'utf8');

        // Metadata check
        const hasStaticMetadata = content.includes('export const metadata');
        const hasDynamicMetadata = content.includes('export async function generateMetadata') || content.includes('export function generateMetadata');

        // Heading check
        const h1Count = (content.match(/<h1/g) || []).length;
        const h2Count = (content.match(/<h2/g) || []).length;
        const h3Count = (content.match(/<h3/g) || []).length;

        // Image check
        const imageTags = content.match(/<(Image|img)[^>]*>/g) || [];
        let missingAltCount = 0;

        imageTags.forEach(tag => {
            if (!/alt=['"{]/.test(tag)) {
                missingAltCount++;
            }
        });

        scanResults.push({
            file: relativePath,
            metadata: hasStaticMetadata ? 'static' : (hasDynamicMetadata ? 'dynamic' : 'MISSING'),
            h1: h1Count,
            h1_status: h1Count === 1 ? 'OK' : (h1Count === 0 ? 'MISSING' : 'MULTIPLE'),
            images_missing_alt: missingAltCount
        });
    } catch (e) {
        console.error(`Error reading ${relativePath}: ${e.message}`);
    }
});

console.log('--- SCAN REPORT ---');
console.table(scanResults);
console.log('--- JSON REPORT ---');
console.log(JSON.stringify(scanResults, null, 2));

// Check Configuration
console.log('--- CONFIGURATION ---');
const robotsTs = fs.existsSync(path.join(rootDir, 'robots.ts'));
const robotsTxt = fs.existsSync(path.join(publicDir, 'robots.txt'));
const sitemapTs = fs.existsSync(path.join(rootDir, 'sitemap.ts'));
const sitemapXml = fs.existsSync(path.join(publicDir, 'sitemap.xml'));

console.log(`Robots File: ${robotsTs || robotsTxt ? 'PRESENT' : 'MISSING'}`);
console.log(`Sitemap: ${sitemapTs || sitemapXml ? 'PRESENT' : 'MISSING'}`);
