const WP_API_BASE = import.meta.env.PUBLIC_WP_API_BASE || 'https://wordpress-130438-6234729.cloudwaysapps.com/wp-json/wp/v2';
const POST_TYPE = 'integrator-post';

export interface WPPost {
  id: number;
  slug: string;
  title: {
    rendered: string;
  };
  content: {
    rendered: string;
  };
  excerpt: {
    rendered: string;
  };
  date: string;
  modified: string;
  featured_media: number;
  categories: number[];
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      source_url: string;
      alt_text: string;
    }>;
    'wp:term'?: Array<Array<{
      id: number;
      name: string;
      slug: string;
    }>>;
  };
}

export interface WPCategory {
  id: number;
  name: string;
  slug: string;
  count: number;
}

export async function getPosts(options: {
  perPage?: number;
  page?: number;
  category?: number;
} = {}): Promise<{ posts: WPPost[]; totalPages: number; total: number }> {
  const { perPage = 10, page = 1, category } = options;

  const params = new URLSearchParams({
    per_page: perPage.toString(),
    page: page.toString(),
    _embed: 'true',
  });

  if (category) {
    params.set('categories', category.toString());
  }

  const response = await fetch(`${WP_API_BASE}/${POST_TYPE}?${params}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch posts: ${response.status}`);
  }

  const posts = await response.json() as WPPost[];
  const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1', 10);
  const total = parseInt(response.headers.get('X-WP-Total') || '0', 10);

  return { posts, totalPages, total };
}

export async function getAllPosts(): Promise<WPPost[]> {
  const allPosts: WPPost[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const { posts, totalPages: tp } = await getPosts({ perPage: 100, page });
    allPosts.push(...posts);
    totalPages = tp;
    page++;
  } while (page <= totalPages);

  return allPosts;
}

export async function getPostBySlug(slug: string): Promise<WPPost | null> {
  const params = new URLSearchParams({
    slug,
    _embed: 'true',
  });

  const response = await fetch(`${WP_API_BASE}/${POST_TYPE}?${params}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch post: ${response.status}`);
  }

  const posts = await response.json() as WPPost[];
  return posts[0] || null;
}

export async function getCategories(): Promise<WPCategory[]> {
  const response = await fetch(`${WP_API_BASE}/categories?per_page=100`);

  if (!response.ok) {
    throw new Error(`Failed to fetch categories: ${response.status}`);
  }

  return response.json();
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#039;': "'",
    '&#8217;': "'",
    '&#8216;': "'",
    '&#8220;': '"',
    '&#8221;': '"',
    '&#8211;': '–',
    '&#8212;': '—',
    '&#8230;': '…',
    '&nbsp;': ' ',
    '&hellip;': '…',
    '&mdash;': '—',
    '&ndash;': '–',
    '&lsquo;': "'",
    '&rsquo;': "'",
    '&ldquo;': '"',
    '&rdquo;': '"',
  };

  return text.replace(/&[#\w]+;/g, (entity) => entities[entity] || entity);
}

export function stripHtml(html: string): string {
  const stripped = html.replace(/<[^>]*>/g, '').trim();
  return decodeHtmlEntities(stripped);
}

export function truncateExcerpt(excerpt: string, maxLength: number = 160): string {
  const stripped = stripHtml(excerpt);
  if (stripped.length <= maxLength) return stripped;
  return stripped.slice(0, maxLength).replace(/\s+\S*$/, '') + '...';
}
