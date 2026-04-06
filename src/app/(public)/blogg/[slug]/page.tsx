import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import data from "@/data/takstmenn.json";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return data.bloggposter.map((p) => ({ slug: p.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = data.bloggposter.find((p) => p.id === slug);
  if (!post) return {};
  return {
    title: `${post.tittel} | takstmann.net`,
    description: post.ingress,
    alternates: {
      canonical: `https://www.takstmann.net/blogg/${post.id}`,
    },
    openGraph: {
      title: post.tittel,
      description: post.ingress,
      url: `https://www.takstmann.net/blogg/${post.id}`,
      type: "article",
      publishedTime: post.dato,
      siteName: "takstmann.net",
      locale: "nb_NO",
    },
  };
}

// Finn relaterte poster basert på enkel keyword-matching
function finnRelatertePoster(currentId: string, maxAntall = 3) {
  const current = data.bloggposter.find((p) => p.id === currentId);
  if (!current) return [];

  const keywords = current.tittel.toLowerCase().split(/\s+/);
  const scored = data.bloggposter
    .filter((p) => p.id !== currentId)
    .map((p) => {
      const tittelLower = p.tittel.toLowerCase();
      const ingressLower = p.ingress.toLowerCase();
      let score = 0;
      for (const kw of keywords) {
        if (kw.length > 3 && tittelLower.includes(kw)) score += 2;
        if (kw.length > 3 && ingressLower.includes(kw)) score += 1;
      }
      return { post: p, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxAntall);

  // Fyll opp med nyeste poster hvis vi ikke har nok
  if (scored.length < maxAntall) {
    const ids = new Set([currentId, ...scored.map((s) => s.post.id)]);
    const fyll = data.bloggposter
      .filter((p) => !ids.has(p.id))
      .sort((a, b) => new Date(b.dato).getTime() - new Date(a.dato).getTime())
      .slice(0, maxAntall - scored.length);
    return [...scored.map((s) => s.post), ...fyll];
  }

  return scored.map((s) => s.post);
}

function parseInline(text: string, keyPrefix: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/);
  return parts.map((part, j) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${keyPrefix}-${j}`} className="text-white font-semibold">
          {part.replace(/\*\*/g, "")}
        </strong>
      );
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <Link key={`${keyPrefix}-${j}`} href={linkMatch[2]} className="text-accent underline hover:text-accent/80 transition-colors">
          {linkMatch[1]}
        </Link>
      );
    }
    return part;
  });
}

export default async function BloggPost({ params }: Props) {
  const { slug } = await params;
  const post = data.bloggposter.find((p) => p.id === slug);
  if (!post) notFound();

  const relaterte = finnRelatertePoster(slug);

  return (
    <>
      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumb */}
        <nav aria-label="Brødsmulesti" className="mb-8">
          <ol className="flex items-center gap-2 text-sm text-gray-500">
            <li>
              <Link href="/" className="hover:text-white transition-colors">takstmann.net</Link>
            </li>
            <li>/</li>
            <li>
              <Link href="/blogg" className="hover:text-white transition-colors">Blogg</Link>
            </li>
            <li>/</li>
            <li className="text-gray-300 truncate max-w-[200px]">{post.tittel}</li>
          </ol>
        </nav>

        <div className="h-1 bg-gradient-to-r from-accent to-blue-400 rounded-full mb-8 max-w-[100px]" />

        <time className="text-sm text-gray-500 mb-4 block">
          {new Date(post.dato).toLocaleDateString("nb-NO", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </time>

        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-6 leading-tight">
          {post.tittel}
        </h1>

        <p className="text-lg text-gray-300 mb-8 leading-relaxed border-l-2 border-accent/40 pl-4">
          {post.ingress}
        </p>

        <div className="prose prose-invert max-w-none">
          {post.innhold.split("\n\n").map((paragraph, i) => {
            if (paragraph.startsWith("**") && paragraph.endsWith("**")) {
              return (
                <h2 key={i} className="text-xl font-bold text-white mt-8 mb-3">
                  {paragraph.replace(/\*\*/g, "")}
                </h2>
              );
            }
            if (paragraph.startsWith("- ")) {
              return (
                <ul key={i} className="list-disc list-inside space-y-1 text-gray-400 mb-4">
                  {paragraph.split("\n").map((line, j) => (
                    <li key={j}>{parseInline(line.replace(/^- /, ""), `li-${i}-${j}`)}</li>
                  ))}
                </ul>
              );
            }
            return (
              <p key={i} className="text-gray-400 leading-relaxed mb-4">
                {parseInline(paragraph, `p-${i}`)}
              </p>
            );
          })}
        </div>

        <div className="gradient-line mt-12 mb-8" />

        {/* CTA */}
        <div className="bg-card-bg border border-card-border rounded-xl p-6 text-center">
          <p className="text-gray-400 mb-3">Trenger du en takstmann?</p>
          <Link
            href="/#fylker"
            className="inline-block bg-accent hover:bg-accent/80 text-white font-semibold px-6 py-2 rounded-lg transition-all"
          >
            Finn takstmann i ditt fylke
          </Link>
        </div>
      </article>

      {/* Relaterte artikler */}
      {relaterte.length > 0 && (
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <h2 className="text-xl font-bold text-white mb-5">Relaterte artikler</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {relaterte.map((r) => (
              <Link
                key={r.id}
                href={`/blogg/${r.id}`}
                className="card-hover block bg-card-bg border border-card-border rounded-xl overflow-hidden"
              >
                <div className="h-1 bg-gradient-to-r from-accent to-blue-400" />
                <div className="p-4">
                  <h3 className="text-white font-semibold text-sm mb-2 leading-snug">
                    {r.tittel}
                  </h3>
                  <p className="text-gray-500 text-xs leading-relaxed line-clamp-2">
                    {r.ingress}
                  </p>
                  <span className="inline-block mt-2 text-accent text-xs font-medium">
                    Les mer &rarr;
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Structured Data: BreadcrumbList + Article */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "BreadcrumbList",
                itemListElement: [
                  {
                    "@type": "ListItem",
                    position: 1,
                    name: "takstmann.net",
                    item: "https://www.takstmann.net",
                  },
                  {
                    "@type": "ListItem",
                    position: 2,
                    name: "Blogg",
                    item: "https://www.takstmann.net/blogg",
                  },
                  {
                    "@type": "ListItem",
                    position: 3,
                    name: post.tittel,
                    item: `https://www.takstmann.net/blogg/${post.id}`,
                  },
                ],
              },
              {
                "@type": "Article",
                headline: post.tittel,
                description: post.ingress,
                datePublished: post.dato,
                url: `https://www.takstmann.net/blogg/${post.id}`,
                publisher: {
                  "@type": "Organization",
                  name: "takstmann.net",
                  url: "https://www.takstmann.net",
                },
              },
            ],
          }),
        }}
      />
    </>
  );
}
