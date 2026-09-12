import { Link } from 'react-router-dom';
import { PageHeader } from './PageHeader';

/**
 * Posts live in this array. It is empty rather than seeded with invented
 * articles: a blog with made-up posts is worse than an honest empty one.
 *
 * Add an entry and the list renders itself:
 *
 *   { slug: 'weekend-trips', title: '...', date: '2026-09-01',
 *     excerpt: 'One or two sentences.' }
 *
 * Full post pages are not built yet -- say the word and they can be, either
 * from Markdown files or as components.
 */
interface Post {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
}

const posts: Post[] = [];

export function Blog() {
  return (
    <>
      <PageHeader
        title="Blog"
        intro="Road trip routes, driving tips, and news about the fleet."
      />

      <section className="mx-auto max-w-3xl px-5 py-16">
        {posts.length === 0 ? (
          <div className="rounded-[14px] border border-line bg-white p-10 text-center shadow-[0_10px_30px_rgba(16,24,40,0.08)]">
            <p className="text-lg font-semibold text-navy">Nothing here yet</p>
            <p className="mx-auto mt-2 max-w-md text-ink-dim">
              We have not published anything so far. In the meantime, the fastest
              way to get an answer is to ask us directly.
            </p>
            <Link
              to="/contact"
              className="mt-6 inline-block rounded-xl bg-navy px-5 py-2.5 font-semibold text-white transition hover:bg-navy/90"
            >
              Get in touch
            </Link>
          </div>
        ) : (
          <ul className="space-y-6">
            {posts.map((post) => (
              <li
                key={post.slug}
                className="rounded-[14px] border border-line bg-white p-6 shadow-[0_10px_30px_rgba(16,24,40,0.08)]"
              >
                <p className="text-xs tracking-wide text-ink-faint uppercase">
                  {new Date(post.date).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-navy">{post.title}</h2>
                <p className="mt-2 leading-relaxed text-ink-dim">{post.excerpt}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
