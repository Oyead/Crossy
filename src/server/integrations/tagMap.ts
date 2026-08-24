const GENRE_ALIASES: Record<string, string> = {
  'sci-fi': 'sci-fi',
  'science fiction': 'sci-fi',
  'sciencefiction': 'sci-fi',
  'sf': 'sci-fi',
  'space': 'sci-fi',
  'mecha': 'sci-fi',
  dystopian: 'dystopian',
  cyberpunk: 'cyberpunk',
  steampunk: 'steampunk',

  fantasy: 'fantasy',
  'epic fantasy': 'fantasy',
  'high fantasy': 'fantasy',
  'dark fantasy': 'dark fantasy',
  magic: 'fantasy',
  supernatural: 'supernatural',
  paranormal: 'supernatural',
  mythology: 'mythology',

  action: 'action',
  adventure: 'adventure',
  thriller: 'thriller',
  suspense: 'thriller',
  'crime & mystery': 'mystery',
  mystery: 'mystery',
  crime: 'crime',
  'film-noir': 'noir',
  noir: 'noir',
  detective: 'mystery',

  horror: 'horror',
  'slasher': 'horror',
  zombies: 'horror',
  vampire: 'supernatural',

  comedy: 'comedy',
  sitcom: 'comedy',
  parody: 'comedy',
  satire: 'satire',

  drama: 'drama',
  'crime drama': 'crime',
  'medical drama': 'drama',
  tragedy: 'drama',
  romance: 'romance',
  'romantic comedy': 'romance',
  'romcom': 'romance',

  animation: 'animation',
  animated: 'animation',
  anime: 'anime',
  family: 'family',
  kids: 'family',
  children: 'family',

  documentary: 'documentary',
  'docuseries': 'documentary',
  biography: 'biographical',
  biopic: 'biographical',
  history: 'historical',
  historical: 'historical',
  war: 'war',

  music: 'music',
  musical: 'music',
  concert: 'music',

  western: 'western',
  sport: 'sports',
  sports: 'sports',

  indie: 'indie',
  casual: 'casual',
  puzzle: 'puzzle',
  platformer: 'platformer',
  shooter: 'shooter',
  fps: 'shooter',
  rpg: 'rpg',
  'role-playing': 'rpg',
  'role playing': 'rpg',
  'jrpg': 'rpg',
  strategy: 'strategy',
  simulation: 'simulation',
  roguelike: 'roguelike',
  sandbox: 'sandbox',
  survival: 'survival',
  'open world': 'open world',
  'point-and-click': 'puzzle',

  cozy: 'cozy',
  relaxing: 'cozy',
  chill: 'cozy',
  wholesome: 'cozy',
  ambient: 'ambient',
  lofi: 'lo-fi',
  'lo-fi': 'lo-fi',
  atmospheric: 'atmospheric',
  philosophical: 'philosophical',
  psychological: 'psychological',
  surreal: 'surreal',
  minimalist: 'minimalist',
  'coming-of-age': 'coming-of-age',
  'slice of life': 'slice of life',
  'soundtrack': 'soundtrack',
  'new age': 'ambient',
};

const CANONICAL_TAGS = new Set(Object.values(GENRE_ALIASES));

export function normalizeTag(tag: string): string | null {
  const cleaned = String(tag ?? '').trim().toLowerCase();
  if (!cleaned) return null;
  if (CANONICAL_TAGS.has(cleaned)) return cleaned;
  return GENRE_ALIASES[cleaned] ?? null;
}

export function normalizeGenres(genres?: unknown): string[] | undefined {
  if (!Array.isArray(genres)) return undefined;
  const tags = new Set<string>();
  for (const genre of genres) {
    const normalized = typeof genre === 'string' ? normalizeTag(genre) : null;
    if (normalized) tags.add(normalized);
  }
  return tags.size > 0 ? Array.from(tags) : undefined;
}
