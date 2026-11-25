import { createFileRoute } from "@tanstack/react-router";
import { ReHumanator } from "@/components/ReHumanator";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "The ReHumanator — Mosaic Face Mixer" },
      { name: "description", content: "An interactive photo booth that mixes faces from around the world into one. Unity through diversity." },
      { property: "og:title", content: "The ReHumanator — Mosaic Face Mixer" },
      { property: "og:description", content: "Mix faces from around the world into one. Print your strip." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <main>
      <ReHumanator />
      <footer className="pb-10 text-center font-mono text-xs text-muted-foreground">Originally a 2003 Macromedia Director piece. Resurrected.</footer>
    </main>
  ),
});
