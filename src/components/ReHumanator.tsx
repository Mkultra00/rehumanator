import { useEffect, useRef, useState, useCallback } from "react";

const SEED: string[] = [
  ...Array.from({ length: 24 }, (_, i) => `https://randomuser.me/api/portraits/women/${(i * 7 + 3) % 99}.jpg`),
  ...Array.from({ length: 24 }, (_, i) => `https://randomuser.me/api/portraits/men/${(i * 11 + 5) % 99}.jpg`),
].sort((a, b) => (a.length * 31 + a.charCodeAt(40)) % 7 - (b.length * 31 + b.charCodeAt(40)) % 7);

const STORE = "rehumanator-faces";
// Four diagonal triangles: top, right, bottom, left
const CLIPS = [
  "polygon(0 0,100% 0,50% 50%)",
  "polygon(100% 0,100% 100%,50% 50%)",
  "polygon(0 100%,100% 100%,50% 50%)",
  "polygon(0 0,0 100%,50% 50%)",
];
const SPEEDS = [1, -1.37, 0.73, -1.9];

type Strip = { id: number; frames: number[][]; date: string };

function Mosaic({ faces, idx, size = "full" }: { faces: string[]; idx: number[]; size?: "full" | "small" }) {
  return (
    <div className="relative aspect-square w-full overflow-hidden bg-muted">
      {CLIPS.map((clip, q) => (
        <img
          key={q}
          src={faces[(idx[q] ?? 0) % faces.length]}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover grayscale-[15%] sepia-[20%]"
          style={{ clipPath: clip }}
        />
      ))}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--paper) 1px, transparent 1px), linear-gradient(to bottom, var(--paper) 1px, transparent 1px)",
          backgroundSize: "20% 20%",
          opacity: size === "full" ? 0.35 : 0.25,
        }}
      />
      <div className="grain pointer-events-none absolute inset-0" />
    </div>
  );
}

export function ReHumanator() {
  const [uploads, setUploads] = useState<string[]>([]);
  const faces = [...uploads, ...SEED];
  const [idx, setIdx] = useState([0, 5, 11, 17]);
  const pos = useRef({ x: 0, y: 0, acc: [0, 5, 11, 17] });
  const [strips, setStrips] = useState<Strip[]>([]);
  const [flash, setFlash] = useState(0);
  const [printing, setPrinting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try { setUploads(JSON.parse(localStorage.getItem(STORE) || "[]")); } catch { /* ignore */ }
  }, []);

  // Idle drift keeps it hypnotic even without movement
  useEffect(() => {
    const t = setInterval(() => {
      const a = pos.current.acc;
      a.forEach((_, q) => (a[q] = (a[q] ?? 0) + Math.abs(SPEEDS[q] ?? 1) * 0.04));
      setIdx(a.map((v) => Math.floor(v)));
    }, 100);
    return () => clearInterval(t);
  }, []);

  const onMove = (e: React.PointerEvent) => {
    const dx = e.clientX - pos.current.x, dy = e.clientY - pos.current.y;
    pos.current.x = e.clientX; pos.current.y = e.clientY;
    const d = Math.min(Math.hypot(dx, dy), 60) / 18;
    const a = pos.current.acc;
    // top/bottom respond to horizontal motion, left/right to vertical, each at its own pace
    const drive = [dx, dy, dx, dy];
    a.forEach((_, q) => {
      const v = (a[q] ?? 0) + Math.sign(drive[q] || 1) * (SPEEDS[q] ?? 1) * d * 0.5;
      a[q] = ((v % 100000) + 100000) % 100000;
    });
    setIdx(a.map((v) => Math.floor(v)));
  };

  const print = useCallback(() => {
    if (printing) return;
    setPrinting(true);
    const frames: number[][] = [];
    const base = [...pos.current.acc].map(Math.floor);
    let n = 0;
    const shoot = () => {
      setFlash((f) => f + 1);
      frames.push(n === 0 ? base : base.map((v, q) => v + (q + n) * 3 + n * 7));
      n++;
      if (n < 4) setTimeout(shoot, 450);
      else {
        setStrips((s) => [{ id: Date.now(), frames, date: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) }, ...s].slice(0, 8));
        setTimeout(() => setPrinting(false), 600);
      }
    };
    shoot();
  }, [printing]);

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    const read = (f: File) =>
      new Promise<string>((res) => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement("canvas");
          const s = Math.min(img.width, img.height);
          c.width = c.height = 400;
          c.getContext("2d")!.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 400, 400);
          res(c.toDataURL("image/jpeg", 0.82));
          URL.revokeObjectURL(img.src);
        };
        img.src = URL.createObjectURL(f);
      });
    const added = await Promise.all(Array.from(files).slice(0, 10).map(read));
    const next = [...added, ...uploads].slice(0, 30);
    setUploads(next);
    try { localStorage.setItem(STORE, JSON.stringify(next)); } catch { /* quota */ }
    pos.current.acc = [0, 0, 0, 0].map((_, q) => q * 2);
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center gap-12 px-4 py-10 lg:flex-row lg:items-start lg:justify-center">
      {/* Cabinet */}
      <div className="wood relative w-full max-w-[520px] rounded-[2rem] p-6 pb-8">
        <div className="mb-4 flex items-center justify-between rounded-lg border border-brass/40 bg-background/70 px-4 py-3">
          <div>
            <h1 className="font-display text-3xl font-black tracking-tight text-brass">The ReHumanator</h1>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">4 faces · 1 humanity</p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className={`h-4 w-4 rounded-full ${printing ? "lamp-blink" : "lamp-blink"}`} />
            <span className="font-mono text-[10px] text-muted-foreground">{printing ? "PRINT" : "LIVE"}</span>
          </div>
        </div>

        <div
          className="relative cursor-crosshair touch-none select-none rounded-md border-[10px] border-background bg-background shadow-inner"
          onPointerMove={onMove}
          onClick={print}
          role="button"
          aria-label="Print photo strip"
        >
          <Mosaic faces={faces} idx={idx} />
          {flash > 0 && <div key={flash} className="flash pointer-events-none absolute inset-0" />}
        </div>

        <p className="mt-4 text-center font-mono text-sm text-foreground/85">
          Move to mix · Click to print
        </p>

        <div className="mt-5 flex gap-3">
          <button onClick={print} disabled={printing}
            className="flex-1 rounded-full bg-primary py-3 font-display text-lg font-bold text-primary-foreground shadow-lg transition hover:brightness-110 disabled:opacity-60">
            {printing ? "Developing…" : "Print strip"}
          </button>
          <button onClick={() => fileRef.current?.click()}
            className="rounded-full border-2 border-brass px-5 py-3 font-mono text-sm font-bold text-brass transition hover:bg-brass hover:text-accent-foreground">
            + Add your face
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
        </div>
        <p className="mt-3 text-center font-mono text-xs text-muted-foreground">
          {faces.length} faces in the booth{uploads.length ? ` · ${uploads.length} yours` : ""}
        </p>
        {/* slot */}
        <div className="mx-auto mt-6 h-3 w-40 rounded-full bg-background shadow-inner" />
      </div>

      {/* Strips */}
      <div className="w-full max-w-md">
        <h2 className="font-display text-2xl text-brass">Printed strips</h2>
        <p className="mb-6 mt-1 text-sm text-muted-foreground">
          Born after 9/11 to make race, gender, age and nationality beside the point. Every strip is someone who never existed — and everyone who does.
        </p>
        {strips.length === 0 && (
          <div className="rounded-lg border border-dashed p-8 text-center font-mono text-sm text-muted-foreground">
            No strips yet. Click the booth.
          </div>
        )}
        <div className="flex flex-wrap gap-5 overflow-hidden">
          {strips.map((s, i) => (
            <div key={s.id} className="overflow-hidden pt-1">
              <div className="print-out strip-shadow w-28 bg-paper p-2 pb-3"
                style={{ rotate: `${((s.id % 7) - 3) * 0.8}deg`, animationDelay: i === 0 ? "0s" : "0s" }}>
                <div className="flex flex-col gap-2">
                  {s.frames.map((f, k) => <Mosaic key={k} faces={faces} idx={f} size="small" />)}
                </div>
                <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-widest text-paper-ink">
                  ReHumanator · {s.date}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
