// Load test for BRAND LAB. READ-ONLY: it only sends GET requests to public pages and public APIs.
// No dependencies (Node 20+). Not part of the app; do not deploy or commit results.
//
//   node scripts/loadtest/run.mjs                  all four scenarios against the default target
//   node scripts/loadtest/run.mjs a c              only scenarios a and c
//   TARGET=http://localhost:3000 node scripts/loadtest/run.mjs d
//
// Scenarios (virtual users are closed-loop: each sends its next request when the last one answered):
//   a  150 viewers on /live: load the page once, then poll /api/event-state every 3 s      (60 s)
//   b  300 visitors loading / and /register in turn, back to back                           (60 s)
//   c  150 users hitting /api/criteria and /api/event-state together, back to back          (60 s)
//   d  spike: 400 concurrent requests to /api/event-state, back to back                     (15 s)
// Users join evenly over the ramp, so the target is reached after RAMP seconds (the spike has no ramp).
//
// Why not autocannon alone: it has no ramp, no 95th percentile and no per-response header counts,
// and this test needs all three (x-vercel-cache per answer). autocannon.sh cross-checks the spike.

const TARGET = (process.env.TARGET ?? "https://brandlab-ieee.vercel.app").replace(/\/$/, "");
const TIMEOUT_MS = 15000;

const SCENARIOS = {
  a: { title: "150 viewers on /live, polling /api/event-state every 3 s", users: 150, seconds: 60, ramp: 20, first: ["/live"], loop: ["/api/event-state"], think: 3000 },
  b: { title: "300 visitors loading / and /register", users: 300, seconds: 60, ramp: 20, loop: ["/", "/register"], think: 0 },
  c: { title: "150 users on /api/criteria and /api/event-state", users: 150, seconds: 60, ramp: 20, loop: ["/api/criteria", "/api/event-state"], think: 0 },
  d: { title: "Spike: 400 concurrent on /api/event-state", users: 400, seconds: 15, ramp: 0, loop: ["/api/event-state"], think: 0 },
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const percentile = (sorted, p) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)] : 0);

function newStats() {
  return { latencies: [], status: {}, cache: {}, errors: {}, bytes: 0, slowest: { ms: 0, cache: "", status: 0 }, regions: {}, retryAfter: 0 };
}

async function hit(path, stats, deadline) {
  const started = performance.now();
  try {
    const response = await fetch(TARGET + path, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { "user-agent": "brandlab-loadtest" }, redirect: "manual" });
    const body = await response.arrayBuffer();
    const ms = performance.now() - started;
    if (performance.now() > deadline + TIMEOUT_MS) return;
    stats.latencies.push(ms);
    stats.bytes += body.byteLength;
    stats.status[response.status] = (stats.status[response.status] ?? 0) + 1;
    const cache = response.headers.get("x-vercel-cache") ?? "(none)";
    stats.cache[cache] = (stats.cache[cache] ?? 0) + 1;
    // x-vercel-id looks like "bom1::iad1::abcde-...": edge region, then function region.
    const region = (response.headers.get("x-vercel-id") ?? "").split("::").slice(0, -1).join(">") || "(none)";
    stats.regions[region] = (stats.regions[region] ?? 0) + 1;
    if (response.status === 429 && response.headers.get("retry-after")) stats.retryAfter += 1;
    if (ms > stats.slowest.ms) stats.slowest = { ms, cache, status: response.status };
  } catch (error) {
    const name = error?.name === "TimeoutError" ? "timeout" : (error?.cause?.code ?? error?.name ?? "error");
    stats.errors[name] = (stats.errors[name] ?? 0) + 1;
  }
}

async function runScenario(key) {
  const scenario = SCENARIOS[key];
  const byPath = {};
  const statsFor = (path) => (byPath[path] ??= newStats());
  const start = performance.now();
  const deadline = start + scenario.seconds * 1000;

  const user = async (index) => {
    if (scenario.ramp) await sleep((index / scenario.users) * scenario.ramp * 1000);
    for (const path of scenario.first ?? []) if (performance.now() < deadline) await hit(path, statsFor(path), deadline);
    let turn = index; // spread users over the paths
    while (performance.now() < deadline) {
      const path = scenario.loop[turn++ % scenario.loop.length];
      await hit(path, statsFor(path), deadline);
      if (scenario.think) await sleep(Math.min(scenario.think, Math.max(0, deadline - performance.now())));
    }
  };

  console.log(`\n=== Scenario ${key}: ${scenario.title} (${scenario.seconds} s${scenario.ramp ? `, ramp ${scenario.ramp} s` : ", no ramp"}) ===`);
  await Promise.all(Array.from({ length: scenario.users }, (_, index) => user(index)));
  const elapsed = (performance.now() - start) / 1000;

  const result = { scenario: key, title: scenario.title, target: TARGET, seconds: Number(elapsed.toFixed(1)), paths: {} };
  for (const [path, stats] of Object.entries(byPath)) {
    const sorted = stats.latencies.slice().sort((x, y) => x - y);
    const errors = Object.values(stats.errors).reduce((sum, n) => sum + n, 0);
    const total = sorted.length + errors;
    const bad = errors + Object.entries(stats.status).filter(([code]) => Number(code) >= 400).reduce((sum, [, n]) => sum + n, 0);
    const row = {
      requests: total,
      rps: Number((total / elapsed).toFixed(1)),
      p50: Math.round(percentile(sorted, 50)),
      p95: Math.round(percentile(sorted, 95)),
      p99: Math.round(percentile(sorted, 99)),
      max: Math.round(sorted.at(-1) ?? 0),
      errorRate: total ? `${((bad / total) * 100).toFixed(2)}%` : "n/a",
      status: stats.status,
      networkErrors: stats.errors,
      cache: stats.cache,
      slowest: { ms: Math.round(stats.slowest.ms), cache: stats.slowest.cache, status: stats.slowest.status },
      regions: stats.regions,
      mb: Number((stats.bytes / 1048576).toFixed(1)),
    };
    result.paths[path] = row;
    console.log(`${path}`);
    console.log(`  requests ${row.requests}  ${row.rps}/s  p50 ${row.p50} ms  p95 ${row.p95} ms  p99 ${row.p99} ms  max ${row.max} ms  errors ${row.errorRate}`);
    console.log(`  status ${JSON.stringify(row.status)}  network ${JSON.stringify(row.networkErrors)}`);
    console.log(`  x-vercel-cache ${JSON.stringify(row.cache)}  slowest ${JSON.stringify(row.slowest)}  regions ${JSON.stringify(row.regions)}  ${row.mb} MB`);
  }
  return result;
}

// One quiet request per path first, so the headers each route sends are on record.
async function preflight() {
  console.log(`Target: ${TARGET}`);
  for (const path of ["/", "/register", "/live", "/api/event-state", "/api/criteria"]) {
    try {
      const started = performance.now();
      const response = await fetch(TARGET + path, { signal: AbortSignal.timeout(TIMEOUT_MS), redirect: "manual" });
      await response.arrayBuffer();
      const pick = (name) => response.headers.get(name) ?? "-";
      console.log(`${path.padEnd(18)} ${response.status}  ${Math.round(performance.now() - started)} ms  cache-control: ${pick("cache-control")}  x-vercel-cache: ${pick("x-vercel-cache")}  age: ${pick("age")}`);
    } catch (error) {
      console.log(`${path.padEnd(18)} FAILED ${error?.name}`);
    }
  }
}

const wanted = process.argv.slice(2).filter((key) => SCENARIOS[key]);
const keys = wanted.length ? wanted : Object.keys(SCENARIOS);
await preflight();
const results = [];
for (const key of keys) {
  results.push(await runScenario(key));
  await sleep(5000); // let the edge settle between scenarios
}
if (process.env.OUT) (await import("node:fs")).writeFileSync(process.env.OUT, JSON.stringify(results, null, 2));
