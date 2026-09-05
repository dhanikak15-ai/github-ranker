# GitRank

GitRank turns a public GitHub profile into a Solo Leveling-inspired engineer rank. Enter a GitHub username and the app reads their public activity, calculates a weighted power score, and presents a rank from **E** to **S**.

<p align="center">
	<img src="public/background.webp" alt="GitRank's dark fantasy system interface background" width="900" />
</p>

## What It Does

1. Enter any public GitHub username.
2. GitRank fetches profile, repository, commit, issue, pull request, and review data from GitHub's public API.
3. The System displays the engineer's profile, overall level, rank title, and metric breakdown.
4. Each metric receives a score from 0 to 99 and is shown with a progress bar.

The interface uses a dark system-window aesthetic, animated loading and result states, rank-specific colors, and quick reference profiles for trying the experience immediately.

## Metrics

| Metric | What GitRank measures |
| --- | --- |
| Commits | Commits attributed to the user through GitHub search |
| Stars Earned | Total stars on the user's non-fork repositories |
| Top Repo Reach | Stars on the user's most-starred non-fork repository |
| Pull Requests | Pull requests authored by the user |
| Followers | Public GitHub followers |
| Languages | Distinct primary languages across fetched repositories |
| Issues | Issues authored by the user |
| Code Reviews | Pull requests reviewed by the user |
| Contributions | The combined total of commits, pull requests, issues, and reviews |

Scores are log-scaled against reference maximums so that a few very large profiles do not make ordinary differences invisible. The weighted average maps to a rank:

| Rank | Overall score | Title |
| --- | ---: | --- |
| S | 85-99 | National Level Engineer |
| A | 68-84 | Elite Engineer |
| B | 52-67 | High Engineer |
| C | 38-51 | Proven Engineer |
| D | 22-37 | Rising Engineer |
| E | 0-21 | Weakest Engineer |

## Interface Preview

The live page combines the visual system backdrop with profile status and scouting metrics after an analysis:

<p align="center">
	<img src="src/assets/dungeon-bg.jpg" alt="GitRank fantasy-themed visual asset" width="700" />
</p>

## Run Locally

Requirements: Node.js and npm.

```sh
git clone <this-repository-url>
cd github-ranker
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

## Scripts

```sh
npm run dev       # Start the Vite development server
npm run build     # Create a production build
npm run preview   # Serve the production build locally
npm run lint      # Run ESLint
npm run format    # Format the project with Prettier
```

## Notes

- GitRank only uses publicly available GitHub data; no GitHub sign-in is required.
- GitHub API rate limits can affect searches, especially for repeated evaluations.
- Repository analysis is limited to the repositories returned by the public API request.
- The score is an entertaining comparison, not a measure of engineering quality or hiring suitability.

## Tech Stack

- React 19 and TypeScript
- TanStack Start and TanStack Router
- Vite
- Tailwind CSS
- GitHub REST API
