import Link from 'next/link';
import Image from 'next/image';
import { getAllPosts } from '@/lib/blog';

export default function BlogIndexPage() {
    const posts = getAllPosts();

    return (
        <div className="min-h-screen bg-[var(--cream)] pb-20">
            {/* Hero Section */}
            <section className="relative overflow-hidden py-24">
                {/* Background Decorative Elements */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-[var(--saffron-glow)] rounded-full blur-3xl opacity-50"></div>
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-[var(--terracotta-light)] rounded-full blur-3xl opacity-20"></div>

                <div className="container mx-auto px-4 relative z-10">
                    <div className="max-w-3xl mx-auto text-center">
                        <h1 className="text-5xl md:text-6xl font-extrabold mb-6 tracking-tight text-[var(--charcoal)] animate-fade-in-up">
                            <span className="text-gradient-spice">Bereket</span> Blog
                        </h1>
                        <p className="text-xl text-[var(--warm-gray)] mb-8 leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                            Aktuelle Neuigkeiten, Rezepte und Geschichten rund um unseren Markt und unsere Produkte.
                        </p>
                        <div className="w-24 h-1 bg-[var(--saffron)] mx-auto rounded-full animate-scale-in" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                </div>
            </section>

            {/* Blog Grid */}
            <section className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {posts.map((post, index) => (
                        <article
                            key={post.slug}
                            className="group bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-[var(--sand)] animate-fade-in-up"
                            style={{ animationDelay: `${0.1 * (index + 1)}s` }}
                        >
                            {/* Image Container */}
                            <div className="relative h-64 overflow-hidden">
                                <Image
                                    src={post.thumbnail}
                                    alt={post.title}
                                    fill
                                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[rgba(0,0,0,0.4)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            </div>

                            {/* Content */}
                            <div className="p-8">
                                <div className="flex items-center space-x-2 mb-4">
                                    <span className="px-3 py-1 bg-[var(--cream)] text-[var(--saffron-dark)] text-xs font-bold uppercase tracking-wider rounded-full">
                                        Artikel
                                    </span>
                                    <time className="text-sm text-[var(--warm-gray)]">
                                        {new Date(post.date).toLocaleDateString('de-DE', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </time>
                                </div>

                                <h2 className="text-2xl font-bold text-[var(--charcoal)] mb-3 group-hover:text-[var(--saffron-dark)] transition-colors line-clamp-2">
                                    {post.title}
                                </h2>

                                <p className="text-[var(--warm-gray)] mb-6 line-clamp-3 leading-relaxed">
                                    {post.excerpt}
                                </p>

                                <Link
                                    href={`/blog/${post.slug}`}
                                    className="inline-flex items-center text-[var(--terracotta)] font-semibold tracking-wide hover:text-[var(--terracotta-dark)] transition-colors group/link"
                                >
                                    <span>Mehr lesen</span>
                                    <svg
                                        className="w-5 h-5 ml-2 transform group-hover/link:translate-x-1 transition-transform"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                    </svg>
                                </Link>
                            </div>
                        </article>
                    ))}
                </div>

                {/* Empty State / Newsletter (Optional) */}
                {posts.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-[var(--sand)]">
                        <p className="text-[var(--warm-gray)] text-lg">Noch keine Artikel vorhanden. Schau bald wieder vorbei!</p>
                    </div>
                )}
            </section>
        </div>
    );
}
