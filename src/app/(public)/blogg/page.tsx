import Link from "next/link";
import type { Metadata } from "next";
import data from "@/data/takstmenn.json";

export const metadata: Metadata = {
  title: "Blogg om takst og bolig | VelgTakst",
  description:
    "Les artikler om boligtaksering, tilstandsrapporter, skadetakst, nye regler og tips for boligkjøpere og -selgere. Oppdatert fagstoff fra bransjen.",
};

export default function BloggPage() {
  const poster = [...data.bloggposter].sort(
    (a, b) => new Date(b.dato).getTime() - new Date(a.dato).getTime()
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 glow-text">
        Blogg
      </h1>
      <p className="text-gray-400 mb-10 max-w-2xl">
        Fagartikler om takst, boligsalg, nye regler og tips for boligkjøpere og
        -selgere. Hold deg oppdatert med siste nytt fra bransjen.
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
              <h2 className="text-white font-semibold mb-2 line-clamp-2 group-hover:text-accent transition-colors">
                {post.tittel}
              </h2>
              <p className="text-gray-400 text-sm line-clamp-3 mb-4">
                {post.ingress}
              </p>
              <span className="text-accent text-sm font-medium">
                Les mer &rarr;
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
