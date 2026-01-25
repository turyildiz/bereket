import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import { getPostBySlug, getAllPosts } from '@/lib/blog';
import ScrollToTop from '@/app/components/ScrollToTop';
import type { Metadata } from 'next';

export async function generateStaticParams() {
    const posts = getAllPosts();
    return posts.map((post) => ({
        slug: post.slug,
    }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const post = getPostBySlug(slug);

    if (!post) {
        return {
            title: 'Artikel nicht gefunden',
        };
    }

    return {
        title: post.title,
        description: post.excerpt,
        openGraph: {
            title: post.title,
            description: post.excerpt,
            images: [post.thumbnail],
        },
    };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const post = getPostBySlug(slug);

    if (!post) {
        notFound();
    }

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: post.title,
        image: [post.thumbnail],
        datePublished: post.date,
        dateModified: post.date,
        author: [{
            '@type': 'Organization',
            name: 'Bereket Market Team',
            url: 'https://bereket-market.de'
        }],
        publisher: {
            '@type': 'Organization',
            name: 'Bereket Market',
            logo: {
                '@type': 'ImageObject',
                url: 'https://bereket-market.de/logo.png'
            }
        },
        description: post.excerpt,
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <ScrollToTop />

            <article className="min-h-screen bg-[var(--cream)] pb-20">
                {/* Article Hero */}
                <div className="relative w-full h-[65vh] md:h-[70vh] flex flex-col justify-end">
                    <div className="absolute inset-0">
                        <Image
                            src={post.thumbnail}
                            alt={post.title}
                            fill
                            className="object-cover"
                            priority
                            quality={90}
                        />
                        {/* Darker gradient for better text readability */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent"></div>
                    </div>

                    <div className="relative z-10 w-full p-6 pb-20 md:p-16 md:pb-24">
                        <div className="container mx-auto max-w-4xl">
                            <Link
                                href="/blog"
                                className="inline-flex items-center text-white/80 hover:text-white mb-4 md:mb-6 transition-colors group bg-black/20 backdrop-blur-sm rounded-full px-3 py-1 md:bg-transparent md:px-0 md:py-0"
                            >
                                <svg className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                <span className="text-sm md:text-base">Zurück zum Magazin</span>
                            </Link>

                            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-extrabold text-white mb-4 leading-tight drop-shadow-lg">
                                {post.title}
                            </h1>
                            <div className="flex flex-wrap items-center gap-4 text-white/90 text-sm md:text-base">
                                <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-[var(--saffron)] flex items-center justify-center text-[var(--charcoal)] font-bold text-xs">
                                        BM
                                    </div>
                                    <span className="font-medium">Bereket Team</span>
                                </div>
                                <time className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    {new Date(post.date).toLocaleDateString('de-DE', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </time>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Article Content */}
                <div className="container mx-auto px-4 -mt-10 relative z-10">
                    <div className="max-w-3xl mx-auto bg-white rounded-3xl p-8 md:p-12 shadow-xl border border-[var(--sand)]">
                        <div className="prose prose-lg md:prose-xl prose-headings:text-[var(--charcoal)] prose-p:text-[var(--warm-gray)] prose-strong:text-[var(--terracotta)] prose-li:text-[var(--warm-gray)] max-w-none focus:outline-none">
                            <ReactMarkdown
                                components={{
                                    h1: ({ node, ...props }) => <h1 className="text-4xl font-extrabold mb-6" {...props} />,
                                    h2: ({ node, ...props }) => <h2 className="text-2xl md:text-3xl font-bold mt-12 mb-6 text-[var(--charcoal)]" {...props} />,
                                    h3: ({ node, ...props }) => <h3 className="text-xl md:text-2xl font-bold mt-8 mb-4 text-[var(--charcoal)]" {...props} />,
                                    p: ({ node, ...props }) => <p className="leading-relaxed mb-6 text-[var(--warm-gray)]" {...props} />,
                                    ul: ({ node, ...props }) => <ul className="list-disc list-inside space-y-4 marker:text-[var(--terracotta)] mb-6" {...props} />,
                                    ol: ({ node, ...props }) => <ol className="list-decimal list-inside space-y-4 marker:text-[var(--terracotta)] mb-6" {...props} />,
                                    li: ({ node, ...props }) => <li className="pl-2" {...props} />,
                                    blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-[var(--saffron)] pl-4 italic text-[var(--warm-gray)] bg-[var(--cream-dark)] p-4 rounded-r-lg my-8" {...props} />,
                                    a: ({ node, ...props }) => <a className="text-[var(--terracotta)] hover:text-[var(--terracotta-dark)] underline decoration-[var(--saffron)] decoration-2 underline-offset-4 transition-colors" {...props} />,
                                    img: ({ node, ...props }) => (
                                        <span className="block my-10 relative overflow-hidden rounded-2xl shadow-xl">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img className="w-full h-auto object-cover hover:scale-105 transition-transform duration-500" {...props} alt={props.alt || ''} />
                                        </span>
                                    ),
                                    hr: ({ node, ...props }) => <hr className="border-[var(--sand)] my-12" {...props} />,
                                    // Map custom div for image wrapper if strictly needed, but converting standard markdown image syntax is better. 
                                    // I processed the markdown to include a raw HTML div. React-Markdown by default escapes HTML.
                                    // To support HTML in Markdown we need 'rehype-raw' but standard commonmark doesn't support it well without plugins.
                                    // However, simpler is just to use standard markdown image syntax in the md file. 
                                    // The user's content I wrote has <div>...<img/>...</div>. ReactMarkdown might strip this unless configured with rehype-raw.
                                    // For now I will assume standard markdown images are preferred, BUT since I wrote HTML in the MD file, I should probably install rehype-raw or just rewrite the MD to use standard images.
                                    // Reriting the MD to standard images is cleaner.
                                }}
                            >
                                {post.content}
                            </ReactMarkdown>
                        </div>

                        {/* CTA Section */}
                        {/* Smart CTA Section */}
                        <div className="mt-16 pt-12 border-t border-[var(--sand)]">
                            {post.ctaType === 'business' ? (
                                // Business/Shop Owner CTA
                                <>
                                    <h3 className="text-2xl md:text-3xl font-bold text-center mb-6 md:mb-8 text-[var(--charcoal)]">
                                        Bereit für mehr Sichtbarkeit?
                                    </h3>
                                    <div className="bg-gradient-to-br from-[var(--cream)] to-[var(--white)] rounded-2xl p-6 md:p-10 border border-[var(--sand)] shadow-lg text-center">
                                        <p className="text-lg md:text-xl text-[var(--warm-gray)] mb-8 max-w-2xl mx-auto">
                                            Melden Sie Ihr Geschäft noch heute bei Bereket Market an und erreichen Sie
                                            tausende neue Kunden in Ihrer Umgebung – ganz ohne technisches Vorwissen.
                                        </p>
                                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                                            <Link
                                                href="/for-shops"
                                                className="btn-primary w-full sm:w-auto px-8 py-4 text-lg inline-flex items-center justify-center gap-2 group shadow-xl hover:shadow-2xl transform active:scale-95 transition-all"
                                            >
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                </svg>
                                                Jetzt Partner werden
                                            </Link>
                                        </div>
                                    </div>
                                </>
                            ) : post.ctaType === 'offers' ? (
                                // Weekly Offers CTA
                                <>
                                    <h3 className="text-2xl md:text-3xl font-bold text-center mb-6 md:mb-8 text-[var(--charcoal)]">
                                        Verpasse keine Schnäppchen!
                                    </h3>
                                    <div className="bg-gradient-to-br from-[var(--cream)] to-[var(--white)] rounded-2xl p-6 md:p-10 border border-[var(--sand)] shadow-lg text-center">
                                        <p className="text-lg md:text-xl text-[var(--warm-gray)] mb-8 max-w-2xl mx-auto">
                                            Unsere Angebote wechseln wöchentlich. Schau gleich nach, was diese Woche besonders günstig ist!
                                        </p>
                                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                                            <Link
                                                href="/offers"
                                                className="btn-primary w-full sm:w-auto px-8 py-4 text-lg inline-flex items-center justify-center gap-2 group shadow-xl hover:shadow-2xl transform active:scale-95 transition-all"
                                            >
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Zu den aktuellen Angeboten
                                            </Link>
                                        </div>
                                    </div>
                                </>

                            ) : post.ctaType === 'general' ? (
                                // General / Welcome CTA
                                <>
                                    <h3 className="text-2xl md:text-3xl font-bold text-center mb-6 md:mb-8 text-[var(--charcoal)]">
                                        Wir freuen uns auf dich!
                                    </h3>
                                    <div className="bg-gradient-to-br from-[var(--cream)] to-[var(--white)] rounded-2xl p-6 md:p-10 border border-[var(--sand)] shadow-lg text-center">
                                        <p className="text-lg md:text-xl text-[var(--warm-gray)] mb-8 max-w-2xl mx-auto">
                                            Komm vorbei und entdecke die Vielfalt von Bereket Market.
                                            Frisch, lokal und mit Herz.
                                        </p>
                                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                                            <Link
                                                href="/#location"
                                                className="btn-primary w-full sm:w-auto px-8 py-4 text-lg inline-flex items-center justify-center gap-2 group shadow-xl hover:shadow-2xl transform active:scale-95 transition-all"
                                            >
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                Anfahrt & Öffnungszeiten
                                            </Link>
                                        </div>
                                    </div>
                                </>

                            ) : (
                                // Default / Sweets CTA
                                <>
                                    <h3 className="text-2xl md:text-3xl font-bold text-center mb-6 md:mb-8 text-[var(--charcoal)]">
                                        Lust auf Süßes bekommen?
                                    </h3>
                                    <div className="bg-gradient-to-br from-[var(--cream)] to-[var(--white)] rounded-2xl p-6 md:p-10 border border-[var(--sand)] shadow-lg text-center">
                                        <p className="text-lg md:text-xl text-[var(--warm-gray)] mb-8 max-w-2xl mx-auto">
                                            Bei Bereket Market findest du täglich frisches Baklava, Lokum und andere orientalische Spezialitäten.
                                            Gönn dir ein Stück Tradition!
                                        </p>
                                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                                            <Link
                                                href="/offers"
                                                className="btn-primary w-full sm:w-auto px-8 py-4 text-lg inline-flex items-center justify-center gap-2 group shadow-xl hover:shadow-2xl transform active:scale-95 transition-all"
                                            >
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                                </svg>
                                                Zu den Angeboten
                                            </Link>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </article>
        </>
    );
}
