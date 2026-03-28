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
    title: `${post.tittel} | VelgTakst - Velg en sertifisert takstmann`,
    description: post.ingress,
  };
}

export default async function BloggPost({ params }: Props) {
  const { slug } = await params;
  const post = data.bloggposter.find((p) => p.id === slug);
  if (!post) notFound();

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 text-sm"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Tilbake til forsiden
      </Link>

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
                  <li key={j}>{line.replace(/^- /, "")}</li>
                ))}
              </ul>
            );
          }
          // Handle bold text within paragraphs
          const parts = paragraph.split(/(\*\*[^*]+\*\*)/);
          return (
            <p key={i} className="text-gray-400 leading-relaxed mb-4">
              {parts.map((part, j) => {
                if (part.startsWith("**") && part.endsWith("**")) {
                  return (
                    <strong key={j} className="text-white font-semibold">
                      {part.replace(/\*\*/g, "")}
                    </strong>
                  );
                }
                return part;
              })}
            </p>
          );
        })}
      </div>

      <div className="gradient-line mt-12 mb-8" />

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
  );
}
