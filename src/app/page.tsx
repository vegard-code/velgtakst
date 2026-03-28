import Link from "next/link";
import data from "@/data/takstmenn.json";

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/5 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center relative">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 glow-text">
            Finn din takstmann
          </h1>
          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-4">
            Norges mest oversiktlige portal for sertifiserte takstmenn. Velg ditt
            fylke og finn den rette eksperten for din eiendom.
          </p>
          <div className="gradient-line max-w-xs mx-auto mt-8 mb-4" />
          <p className="text-sm text-gray-500">
            {data.fylker.length} fylker &middot;{" "}
            {data.fylker.reduce((sum, f) => sum + f.takstmenn.length, 0)}{" "}
            takstmenn
          </p>
        </div>
      </section>

      {/* Fylker grid */}
      <section id="fylker" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <h2 className="text-2xl font-bold text-white mb-8 text-center">
          Velg fylke
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {data.fylker.map((fylke) => (
            <Link
              key={fylke.id}
              href={`/${fylke.id}`}
              className="card-hover block bg-card-bg border border-card-border rounded-xl p-6 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-3">
                <svg
                  className="w-5 h-5 text-accent"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-1">{fylke.navn}</h3>
              <p className="text-xs text-gray-500">
                {fylke.takstmenn.length} takstmenn
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Om portalen */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="bg-card-bg border border-card-border rounded-2xl p-8 sm:p-12 text-center max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-4">
            Om VelgTakst
          </h2>
          <p className="text-gray-400 leading-relaxed">
            VelgTakst er en uavhengig portal som hjelper deg med å finne
            sertifiserte og erfarne takstmenn i hele Norge. Vi har samlet
            takstmenn fra alle 15 fylker, slik at du raskt kan finne den rette
            eksperten for boligtaksering, tilstandsrapporter, verditakster og
            mer. Alle takstmenn i vår portal er sertifisert og har dokumentert
            erfaring.
          </p>
        </div>
      </section>

      {/* Blogg */}
      <section id="blogg" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <h2 className="text-2xl font-bold text-white mb-8 text-center">
          Fra bloggen
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {data.bloggposter.map((post) => (
            <Link
              key={post.id}
              href={`/blogg/${post.id}`}
              className="card-hover block bg-card-bg border border-card-border rounded-xl overflow-hidden"
            >
              <div className="h-2 bg-gradient-to-r from-accent to-blue-400" />
              <div className="p-6">
                <time className="text-xs text-gray-500 mb-2 block">
                  {new Date(post.dato).toLocaleDateString("nb-NO", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
                <h3 className="text-white font-semibold mb-3 text-lg leading-snug">
                  {post.tittel}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed line-clamp-3">
                  {post.ingress}
                </p>
                <span className="inline-block mt-4 text-accent text-sm font-medium">
                  Les mer &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
