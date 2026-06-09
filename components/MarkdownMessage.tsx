"use client";

import ReactMarkdown from "react-markdown";

interface Props {
  content: string;
}

export default function MarkdownMessage({ content }: Props) {
  // Transform local image references to the API route
  const transformed = content.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    (_match, alt, src) => {
      // If it's already a URL, leave it alone
      if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("/")) {
        return `![${alt}](${src})`;
      }
      return `![${alt}](/api/kb/images/${encodeURIComponent(src)})`;
    }
  );

  return (
    <div className="prose-patch">
      <ReactMarkdown
        components={{
          img: ({ src, alt }) => {
            if (!src) return null;
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt={alt ?? ""}
                className="rounded-lg my-3 max-w-full block"
                onError={(e) => {
                  console.error("[image] missing:", src);
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            );
          },
        }}
      >
        {transformed}
      </ReactMarkdown>
    </div>
  );
}
