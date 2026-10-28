// Browser runtime of the dashboard: state, routing, events and (with --serve) the live connection.
// Bundled with client-views.ts into the page; only imports from there and type imports are allowed.
import {
  type Ctx,
  type Filters,
  hrefOf,
  type LiveView,
  NO_FILTERS,
  parseRoute,
  type Route,
  renderApp,
  renderSpecResults,
  VIEW_KEYS,
  type ViewId,
} from "./client-views.ts";
import type { Locale } from "./config.ts";
import type { Page, PageData } from "./html.ts";
import type { LiveState } from "./live.ts";

interface LiveSession {
  readonly token: string;
}

interface AppState {
  data: PageData;
  page: Page;
  locale: Locale;
  route: Route;
  filters: Filters;
  live?: LiveView;
  /** Open/closed state of every <details data-key> the viewer toggled. */
  details: Map<string, boolean>;
}

const THEME_KEY = "specpulse-theme";
const LOCALE_KEY = "specpulse-locale";

const stored = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const store = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private windows may refuse storage; the choice then lasts for this page only.
  }
};

const readJson = <T>(id: string): T | undefined => {
  const el = document.getElementById(id);
  return el?.textContent ? (JSON.parse(el.textContent) as T) : undefined;
};

const pickLocale = (data: PageData): Locale => {
  const saved = stored(LOCALE_KEY);
  return saved && saved in data.messages ? (saved as Locale) : data.page.meta.locale;
};

const ctxOf = (s: AppState): Ctx => ({
  page: s.page,
  t: s.data.messages[s.locale],
  locale: s.locale,
  locales: (Object.keys(s.data.messages) as Locale[]).map((id) => ({
    id,
    name: s.data.messages[id].languageName,
  })),
  guide: s.data.guide[s.locale],
  route: s.route,
  filters: s.filters,
  ...(s.live ? { live: s.live } : {}),
  now: Date.now(),
});

interface FocusMemo {
  readonly id: string;
  readonly start: number | null;
  readonly end: number | null;
}

const captureFocus = (): FocusMemo | undefined => {
  const el = document.activeElement;
  if (!(el instanceof HTMLElement) || !el.id) return undefined;
  const input = el instanceof HTMLInputElement ? el : undefined;
  return { id: el.id, start: input?.selectionStart ?? null, end: input?.selectionEnd ?? null };
};

const restoreFocus = (memo: FocusMemo | undefined): void => {
  if (!memo) return;
  const el = document.getElementById(memo.id);
  if (!el) return;
  el.focus({ preventScroll: true });
  if (el instanceof HTMLInputElement && memo.start !== null) el.setSelectionRange(memo.start, memo.end);
};

const applyDetails = (root: HTMLElement, details: ReadonlyMap<string, boolean>): void => {
  for (const el of root.querySelectorAll<HTMLDetailsElement>("details[data-key]")) {
    const open = details.get(el.dataset["key"] ?? "");
    if (open !== undefined) el.open = open;
  }
};

const applyTheme = (): void => {
  const saved = stored(THEME_KEY);
  if (saved === "light" || saved === "dark") document.documentElement.dataset["theme"] = saved;
};

const toggleTheme = (): void => {
  const r = document.documentElement;
  const current = r.dataset["theme"];
  const dark = current ? current === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  r.dataset["theme"] = dark ? "light" : "dark";
  store(THEME_KEY, r.dataset["theme"]);
};

const scrollToTarget = (s: AppState): void => {
  const target =
    s.route.view === "guide" && s.route.arg ? document.getElementById(`guide-${s.route.arg}`) : null;
  if (target) target.scrollIntoView();
  else window.scrollTo(0, 0);
};

const createApp = (root: HTMLElement, s: AppState) => {
  /** Full re-render that keeps scroll, focus, caret and toggled <details>. */
  const render = (): void => {
    const focus = captureFocus();
    const y = window.scrollY;
    root.innerHTML = renderApp(ctxOf(s));
    applyDetails(root, s.details);
    document.documentElement.lang = s.data.messages[s.locale].lang;
    document.title = `${s.page.meta.title} · ${s.data.messages[s.locale].progress}`;
    restoreFocus(focus);
    window.scrollTo(0, y);
  };

  const renderResults = (): void => {
    const box = document.getElementById("sp-spec-results");
    if (box) box.innerHTML = renderSpecResults(ctxOf(s));
  };

  const navigate = (): void => {
    s.route = parseRoute(location.hash);
    render();
    scrollToTarget(s);
    document.getElementById("sp-view")?.focus({ preventScroll: true });
  };

  return { render, renderResults, navigate };
};

type App = ReturnType<typeof createApp>;

const setFilter = (s: AppState, key: string, value: string): void => {
  if (key === "text") s.filters = { ...s.filters, text: value };
  else if (key === "status" && (value === "all" || value === "open" || value === "complete"))
    s.filters = { ...s.filters, status: value };
  else if (key === "milestone") s.filters = { ...s.filters, milestone: value };
};

const post = async (s: AppState, app: App, path: string): Promise<void> => {
  if (!s.live) return;
  try {
    const res = await fetch(path, { method: "POST", headers: { "x-specpulse-token": s.live.token } });
    if (!res.ok) throw new Error(await res.text());
  } catch (e) {
    s.live = { ...s.live, rendering: false, notice: (e as Error).message };
    app.render();
  }
};

const onClick = (s: AppState, app: App, e: MouseEvent): void => {
  const target = e.target instanceof Element ? e.target : null;
  const action = target?.closest<HTMLElement>("[data-action]")?.dataset["action"];
  if (action === "theme") return void toggleTheme();
  if (action === "render" && s.live) {
    s.live = { ...s.live, rendering: true, notice: s.data.messages[s.locale].renderRunning };
    app.render();
    return void post(s, app, "/render");
  }
  if (action === "check") return void post(s, app, "/check");
  const row = target?.closest<HTMLElement>("tr[data-href]");
  if (row && !target?.closest("a")) location.hash = row.dataset["href"] ?? "";
};

const onInput = (s: AppState, app: App, e: Event): void => {
  const el = e.target;
  if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement)) return;
  if (el.dataset["control"] === "lang") {
    s.locale = el.value as Locale;
    store(LOCALE_KEY, s.locale);
    return void app.render();
  }
  const key = el.dataset["filter"];
  if (!key) return;
  setFilter(s, key, el.value);
  app.renderResults();
};

const isTyping = (e: KeyboardEvent): boolean => {
  const el = e.target;
  return (
    el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement
  );
};

/** `g` then a view key, like a two-key chord, within 1.5 s. */
const keyboard = () => {
  let armed = 0;
  return (e: KeyboardEvent): void => {
    if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e)) return;
    const now = Date.now();
    if (now - armed < 1500) {
      armed = 0;
      const view: ViewId | undefined = VIEW_KEYS[e.key.toLowerCase()];
      if (view) location.hash = hrefOf(view);
      return;
    }
    if (e.key === "g") armed = now;
  };
};

const connectLive = (s: AppState, app: App, session: LiveSession): void => {
  s.live = { connected: false, token: session.token };
  const events = new EventSource("/events");
  const set = (patch: Partial<LiveView>): void => {
    if (s.live) s.live = { ...s.live, ...patch };
    app.render();
  };
  events.onopen = () => set({ connected: true });
  events.onerror = () => set({ connected: false });
  events.addEventListener("model", (e) => {
    const page = JSON.parse((e as MessageEvent<string>).data) as Page;
    s.page = page;
    set(
      s.live?.rendering && page.repo.rendered
        ? { rendering: false, notice: s.data.messages[s.locale].renderDone }
        : {},
    );
  });
  events.addEventListener("live", (e) =>
    set({ state: JSON.parse((e as MessageEvent<string>).data) as LiveState }),
  );
  events.addEventListener("activity", (e) => {
    const a = JSON.parse((e as MessageEvent<string>).data) as { newCommits?: string[] };
    if (a.newCommits?.length) set({ fresh: a.newCommits });
  });
  events.addEventListener("render-error", (e) =>
    set({
      rendering: false,
      notice: (JSON.parse((e as MessageEvent<string>).data) as { error: string }).error,
    }),
  );
};

/** Entry point, called once by the bundle. */
export const boot = (): void => {
  applyTheme();
  const root = document.getElementById("sp-app");
  const data = readJson<PageData>("specpulse-data");
  if (!root || !data) return;
  const s: AppState = {
    data,
    page: data.page,
    locale: pickLocale(data),
    route: parseRoute(location.hash),
    filters: NO_FILTERS,
    details: new Map(),
  };
  const app = createApp(root, s);
  const session = readJson<LiveSession>("specpulse-live");
  if (session) connectLive(s, app, session);
  root.addEventListener(
    "toggle",
    (e) => {
      const el = e.target;
      if (el instanceof HTMLDetailsElement && el.dataset["key"]) s.details.set(el.dataset["key"], el.open);
    },
    true,
  );
  document.addEventListener("click", (e) => onClick(s, app, e));
  document.addEventListener("input", (e) => onInput(s, app, e));
  document.addEventListener("change", (e) => onInput(s, app, e));
  document.addEventListener("keydown", keyboard());
  window.addEventListener("hashchange", app.navigate);
  app.render();
  scrollToTarget(s);
};
