import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import dungeonBg from "@/assets/dungeon-bg.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GitRank — Awaken Your GitHub Engineer Rank" },
      {
        name: "description",
        content:
          "Enter any GitHub username and the System will analyze their commits, stars, PRs and more to reveal a Solo Leveling style engineer rank from E to S.",
      },
      { property: "og:title", content: "GitRank — Awaken Your GitHub Engineer Rank" },
      {
        property: "og:description",
        content:
          "Enter any GitHub username and reveal their engineer rank — from E to S — based on real GitHub stats.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

/* ---------------- Types ---------------- */

interface EngineerStats {
  username: string;
  name: string | null;
  avatar: string;
  bio: string | null;
  publicRepos: number;
  metrics: MetricResult[];
  overall: number;
  rank: Rank;
  title: string;
}

interface MetricResult {
  key: string;
  label: string;
  raw: number;
  unit: string;
  score: number;
}

type Rank = "S" | "A" | "B" | "C" | "D" | "E";

/* ---------------- Scoring ---------------- */

// Reference "max" values a legendary dev might reach. Scores are log-scaled 0..99.
const METRIC_DEFS: { key: string; label: string; unit: string; max: number; weight: number }[] = [
  { key: "commits", label: "Commits", unit: "commits", max: 5000, weight: 1.4 },
  { key: "stars", label: "Stars Earned", unit: "stars", max: 5000, weight: 1.3 },
  { key: "topRepo", label: "Top Repo Reach", unit: "stars", max: 5000, weight: 1.0 },
  { key: "prs", label: "Pull Requests", unit: "PRs", max: 500, weight: 1.2 },
  { key: "followers", label: "Followers", unit: "followers", max: 2000, weight: 0.8 },
  { key: "languages", label: "Languages", unit: "languages", max: 20, weight: 0.7 },
  { key: "issues", label: "Issues", unit: "issues", max: 500, weight: 0.6 },
  { key: "reviews", label: "Code Reviews", unit: "reviews", max: 500, weight: 0.9 },
  { key: "contributions", label: "Contributions", unit: "contributions", max: 8000, weight: 1.1 },
];

function scoreMetric(value: number, max: number): number {
  if (value <= 0) return 0;
  return Math.min(99, Math.round((99 * Math.log10(1 + value)) / Math.log10(1 + max)));
}

function rankFor(overall: number): Rank {
  if (overall >= 85) return "S";
  if (overall >= 68) return "A";
  if (overall >= 52) return "B";
  if (overall >= 38) return "C";
  if (overall >= 22) return "D";
  return "E";
}

const RANK_META: Record<Rank, { title: string; colorClass: string; desc: string }> = {
  S: {
    title: "National Level Engineer",
    colorClass: "text-rank-s",
    desc: "A monarch among developers. Nations speak their name.",
  },
  A: {
    title: "Elite Engineer",
    colorClass: "text-rank-a",
    desc: "Guilds wage wars to recruit talent like this.",
  },
  B: {
    title: "High Engineer",
    colorClass: "text-rank-b",
    desc: "A trusted raid leader. Few dungeons can stop them.",
  },
  C: {
    title: "Proven Engineer",
    colorClass: "text-rank-c",
    desc: "Steady and reliable — the backbone of every party.",
  },
  D: {
    title: "Rising Engineer",
    colorClass: "text-rank-d",
    desc: "Awakened and climbing. The gates have noticed.",
  },
  E: {
    title: "Weakest Engineer",
    colorClass: "text-rank-e",
    desc: "Every monarch started at E-rank. Keep grinding.",
  },
};

/* ---------------- GitHub fetching ---------------- */

async function gh<T>(path: string): Promise<T> {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (res.status === 404) throw new Error("Engineer not found in this realm.");
  if (res.status === 403) throw new Error("The System is rate-limited. Try again in a minute.");
  if (!res.ok) throw new Error(`GitHub answered with ${res.status}.`);
  return (await res.json()) as T;
}

interface GhUser {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  followers: number;
  public_repos: number;
}

interface GhRepo {
  stargazers_count: number;
  language: string | null;
  fork: boolean;
}

interface GhSearch {
  total_count: number;
}

async function analyze(username: string): Promise<EngineerStats> {
  const user = await gh<GhUser>(`/users/${encodeURIComponent(username)}`);

  const [repos, commits, prs, issues, reviews] = await Promise.all([
    gh<GhRepo[]>(`/users/${user.login}/repos?per_page=100&sort=pushed`).catch(() => [] as GhRepo[]),
    gh<GhSearch>(`/search/commits?q=author:${user.login}&per_page=1`).catch(() => ({ total_count: 0 })),
    gh<GhSearch>(`/search/issues?q=type:pr+author:${user.login}&per_page=1`).catch(() => ({ total_count: 0 })),
    gh<GhSearch>(`/search/issues?q=type:issue+author:${user.login}&per_page=1`).catch(() => ({ total_count: 0 })),
    gh<GhSearch>(`/search/issues?q=type:pr+reviewed-by:${user.login}&per_page=1`).catch(() => ({ total_count: 0 })),
  ]);

  const ownRepos = repos.filter((r) => !r.fork);
  const stars = ownRepos.reduce((s, r) => s + r.stargazers_count, 0);
  const topRepo = ownRepos.reduce((m, r) => Math.max(m, r.stargazers_count), 0);
  const languages = new Set(repos.map((r) => r.language).filter(Boolean)).size;
  const contributions = commits.total_count + prs.total_count + issues.total_count + reviews.total_count;

  const raw: Record<string, number> = {
    commits: commits.total_count,
    stars,
    topRepo,
    prs: prs.total_count,
    followers: user.followers,
    languages,
    issues: issues.total_count,
    reviews: reviews.total_count,
    contributions,
  };

  const metrics = METRIC_DEFS.map((d) => ({
    key: d.key,
    label: d.label,
    raw: raw[d.key] ?? 0,
    unit: d.unit,
    score: scoreMetric(raw[d.key] ?? 0, d.max),
  }));

  const totalWeight = METRIC_DEFS.reduce((s, d) => s + d.weight, 0);
  const overall = Math.round(
    metrics.reduce((s, m, i) => s + m.score * (METRIC_DEFS[i]?.weight ?? 1), 0) / totalWeight,
  );

  const rank = rankFor(overall);

  return {
    username: user.login,
    name: user.name,
    avatar: user.avatar_url,
    bio: user.bio,
    publicRepos: user.public_repos,
    metrics,
    overall,
    rank,
    title: RANK_META[rank].title,
  };
}

/* ---------------- UI ---------------- */

function formatNum(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

function Index() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [engineer, setEngineer] = useState<EngineerStats | null>(null);

  const summon = async (e: React.FormEvent) => {
    e.preventDefault();
    const username = input.trim();
    if (!username) return;
    setLoading(true);
    setError(null);
    setEngineer(null);
    try {
      setEngineer(await analyze(username));
    } catch (err) {
      setError(err instanceof Error ? err.message : "The System failed to answer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <img
        src={dungeonBg}
        alt=""
        width={1920}
        height={1080}
        className="pointer-events-none fixed inset-0 h-full w-full object-cover opacity-40"
      />
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center px-4 py-14 sm:py-20">
        {/* Hero */}
        <div className="flex flex-col items-center text-center">
          <p className="font-display text-xs tracking-[0.5em] text-mana uppercase animate-pulse-glow">
            ⚠ The System Has Detected You ⚠
          </p>
          <h1 className="font-display mana-text mt-4 text-5xl font-bold sm:text-7xl">GITRANK</h1>
          <p className="mt-3 max-w-md text-lg text-muted-foreground">
            Enter a GitHub username. The System will measure their power and assign an engineer rank —{" "}
            <span className="text-rank-e font-semibold">E</span> to{" "}
            <span className="text-rank-s font-semibold">S</span>.
          </p>
        </div>

        {/* Summon form */}
        <form onSubmit={summon} className="system-window mt-10 w-full max-w-xl rounded-xl p-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. torvalds"
              spellCheck={false}
              autoComplete="off"
              className="h-12 flex-1 rounded-lg border border-input bg-background/70 px-4 text-lg tracking-wide text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-ring focus:ring-2 focus:ring-ring/40"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="h-12 rounded-lg bg-primary px-8 font-display text-sm font-bold tracking-[0.25em] text-primary-foreground uppercase transition-all hover:brightness-125 hover:shadow-[0_0_24px_var(--color-mana-glow)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "…" : "Arise"}
            </button>
          </div>
        </form>

        {loading && (
          <div className="system-window animate-float-up mt-10 w-full max-w-xl rounded-xl px-8 py-10 text-center">
            <p className="font-display animate-pulse-glow text-lg tracking-[0.3em] text-mana uppercase">
              Analyzing Engineer…
            </p>
            <div className="stat-bar-track mx-auto mt-6 h-2 w-64 overflow-hidden rounded-full">
              <div className="stat-bar-fill h-full w-2/3 animate-pulse" />
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="system-window animate-float-up mt-10 w-full max-w-xl rounded-xl border-destructive/50 px-8 py-6 text-center">
            <p className="font-display text-sm tracking-[0.3em] text-destructive uppercase">System Error</p>
            <p className="mt-2 text-muted-foreground">{error}</p>
          </div>
        )}

        {engineer && !loading && <EngineerSheet engineer={engineer} />}
      </main>
    </div>
  );
}

function EngineerSheet({ engineer }: { engineer: EngineerStats }) {
  const meta = RANK_META[engineer.rank];

  return (
    <div className="animate-float-up mt-12 w-full">
      {/* Rank window */}
      <section className="system-window overflow-hidden rounded-2xl">
        <div className="system-header px-6 py-3 text-center">
          <span className="font-display text-xs font-bold tracking-[0.4em] text-mana uppercase">
            — Engineer Status Window —
          </span>
        </div>
        <div className="flex flex-col items-center gap-8 p-8 sm:flex-row sm:p-10">
          <div className="relative shrink-0">
            <div className="absolute -inset-3 rounded-full bg-mana/20 blur-2xl" />
            <img
              src={engineer.avatar}
              alt={`${engineer.username}'s avatar`}
              width={140}
              height={140}
              className="relative h-32 w-32 rounded-full border-2 border-mana/60 object-cover shadow-[0_0_30px_var(--color-mana-glow)]"
            />
          </div>

          <div className="flex-1 text-center sm:text-left">
            <p className="font-display text-xs tracking-[0.35em] text-muted-foreground uppercase">Name</p>
            <h2 className="mt-1 text-3xl font-bold tracking-wide text-foreground sm:text-4xl">
              {engineer.name ?? engineer.username}
            </h2>
            <p className="text-mana text-lg font-semibold">@{engineer.username}</p>
            {engineer.bio && <p className="mt-2 max-w-md text-muted-foreground">{engineer.bio}</p>}
            <p className="mt-3 text-sm text-muted-foreground">
              {engineer.publicRepos} public repositories · {meta.desc}
            </p>
          </div>

          <div className="flex flex-col items-center">
            <span className={`font-display rank-glow text-[7rem] leading-none font-black ${meta.colorClass}`}>
              {engineer.rank}
            </span>
            <span className="font-display mt-1 text-xs tracking-[0.3em] text-muted-foreground uppercase">
              Rank
            </span>
            <div className="rune-divider my-3 w-24" />
            <span className="text-3xl font-bold text-foreground">{engineer.overall}</span>
            <span className="text-xs tracking-widest text-muted-foreground uppercase">Level</span>
            <span className={`mt-2 text-sm font-semibold ${meta.colorClass}`}>{engineer.title}</span>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="system-window mt-6 rounded-2xl p-6 sm:p-8">
        <h3 className="font-display text-center text-sm font-bold tracking-[0.4em] text-mana uppercase">
          — Scouting Metrics —
        </h3>
        <div className="mt-6 grid gap-x-10 gap-y-5 sm:grid-cols-2">
          {engineer.metrics.map((m, i) => (
            <div key={m.key} className="animate-float-up" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold tracking-wide text-foreground">{m.label}</span>
                <span className="text-sm text-muted-foreground">
                  {formatNum(m.raw)} {m.unit}{" "}
                  <span className="ml-1 font-bold text-mana">{m.score}</span>
                </span>
              </div>
              <div className="stat-bar-track mt-1.5 h-2 overflow-hidden rounded-full">
                <div className="stat-bar-fill h-full rounded-full" style={{ width: `${m.score}%` }} />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-muted-foreground/70">
          Scores are measured by the System from public GitHub activity and scaled against legendary engineers.
        </p>
      </section>
    </div>
  );
}
