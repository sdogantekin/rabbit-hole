// Wikimedia etiquette requires a descriptive User-Agent identifying the app + a contact
// method (design.md §3). No real contact exists yet — replace before shipping.
// TODO: replace with a real contact email/URL before production.
const USER_AGENT = 'RabbitHole/0.1 (contact: TODO@example.com) wiki-proxy edge function';

const ACTION_API = 'https://en.wikipedia.org/w/api.php';
// design.md names api.wikimedia.org's core v1 API, but that gateway has no "summary"
// resource (verified by hand: /core/v1/wikipedia/en/page/{title}/summary 404s; only
// bare/html/with_html exist there, none shaped like a lead extract). This is Wikipedia's
// own long-stable RESTBase mirror, which does return exactly {pageid, extract, thumbnail,
// content_urls} — verified working directly against the live API before wiring this up.
const REST_SUMMARY_API = 'https://en.wikipedia.org/api/rest_v1/page/summary';

interface CategoryMember {
  pageid: number;
  title: string;
}

async function fetchCategoryMembers(
  categoryTitle: string,
  cmtype: 'page' | 'subcat',
  limit: number,
): Promise<CategoryMember[]> {
  const url = new URL(ACTION_API);
  url.searchParams.set('action', 'query');
  url.searchParams.set('list', 'categorymembers');
  url.searchParams.set('cmtitle', categoryTitle);
  url.searchParams.set('cmtype', cmtype);
  url.searchParams.set('cmlimit', String(limit));
  url.searchParams.set('format', 'json');

  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) return [];
  const data = await res.json();
  return data?.query?.categorymembers ?? [];
}

// Top-level curated categories (e.g. Category:Science) mostly contain subcategories, not
// direct article members. A depth-limited crawl (seed + up to 10 immediate subcategories)
// is enough real article candidates without an unbounded recursive crawl's latency risk.
export async function discoverCandidateArticles(
  categoryTitle: string,
): Promise<CategoryMember[]> {
  const [directPages, subcats] = await Promise.all([
    fetchCategoryMembers(categoryTitle, 'page', 500),
    fetchCategoryMembers(categoryTitle, 'subcat', 10),
  ]);

  const subcatPages = await Promise.all(
    subcats.map((subcat) => fetchCategoryMembers(subcat.title, 'page', 100)),
  );

  const byPageId = new Map<number, CategoryMember>();
  for (const member of [directPages, ...subcatPages].flat()) {
    byPageId.set(member.pageid, member);
  }
  return [...byPageId.values()];
}

export interface ArticleSummary {
  pageid: number;
  title: string;
  extract: string;
  thumbnailUrl: string | null;
  sourceUrl: string;
}

export async function fetchArticleSummary(title: string): Promise<ArticleSummary | null> {
  const normalizedTitle = title.replaceAll(' ', '_');
  // Anonymous access to this endpoint — design.md's "personal API token for higher limits"
  // applies to api.wikimedia.org's separate gateway, which doesn't expose an equivalent
  // summary resource (see the comment on REST_SUMMARY_API above). Revisit if request
  // volume ever actually needs the higher authenticated-tier limits.
  const res = await fetch(
    `${REST_SUMMARY_API}/${encodeURIComponent(normalizedTitle)}`,
    { headers: { 'User-Agent': USER_AGENT } },
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (!data?.extract) return null;

  return {
    pageid: data.pageid,
    title: data.title,
    extract: data.extract,
    thumbnailUrl: data.thumbnail?.source ?? null,
    sourceUrl: data.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(normalizedTitle)}`,
  };
}
