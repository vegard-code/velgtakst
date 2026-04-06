import Link from "next/link";
import type { Metadata } from "next";
import data from "@/data/takstmenn.json";

export const metadata: Metadata = {
  title: "Blogg om takst og bolig | Fagartikler og tips | takstmann.net",
  description:
    "Les fagartikler om tilstandsrapport, verditakst, skadetakst, nye regler for boligsalg og tips for boligkjøpere og -selgere. Oppdatert innhold fra takstbransjen.",
  alternates: {
    canonical: "https://www.takstmann.net/blogg",
  },
  openGraph: {
    title: "Blogg om takst og bolig | takstmann.net",
    description:
      "Fagartikler om tilstandsrapport, verditakst, skadetakst og tips for boligkjøpere og -selgere.",
    url: "https://www.takstmann.net/blogg",
  },
};

export default function BloggPage() {
  const poster = [...data.bloggposter].sort(
    (a, b) => new Date(b.dato).getTime() - new Date(a.dato).getTime()
  );

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumb */}
        <nav aria-label="Brødsmulesti" className="mb-8">
          <ol className="flex items-center gap-2 text-sm text-gray-500">
            <li>
              <Link href="/" className="hover:text-white transition-colors">takstmann.net</Link>
            </li>
            <li>/</li>
            <li className="text-gray-300">Blogg</li>
          </ol>
        </nav>

        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 glow-text">
          Blogg om takst og bolig
        </h1>
        <p className="text-gray-400 mb-10 max-w-2xl leading-relaxed">
          Fagartikler om tilstandsrapport, verditakst, skadetakst, nye regler for boligsalg
          og tips for boligkjøpere og -selgere. Hold deg oppdatert med siste nytt fra takstbransjen.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {poster.map((post) => (
            <Link
              key={post.id}
              href={`/blogg/${post.id}`}
              className="group block bg-card-bg border border-card-border rounded-xl overflow-hidden hover:border-accent/40 transition-all duration-200"
            >
              <div className="h-1.5 bg-gradient-to-r from-accent to-blue-400" />
              <div className="p-6">
                <time className="text-xs text-gray-500 block mb-2">
                  {new Date(post.dato).toLocaleDateString("nb-NO", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
                <h2 className="text-gray-900 font-semibold mb-2 line-clamp-2 group-hover:text-accent transition-colors">
                  {post.tittel}
                </h2>
                <p className="text-gray-600 text-sm line-clamp-3 mb-4">
                  {post.ingress}
                </p>
                <span className="text-accent text-sm font-medium">
                  Les mer &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <p className="text-gray-600 mb-4">Trenger du hjelp med takst?</p>
          <Link
            href="/#fylker"
            className="inline-block bg-accent hover:bg-accent/90 text-white px-8 py-3 rounded-lg font-medium transition-colors"
          >
            Finn takstmann i ditt fylke
          </Link>
        </div>
      </div>

      {/* Structured Data: BreadcrumbList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
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
            ],
          }),
        }}
      />
    </>
  );
}
