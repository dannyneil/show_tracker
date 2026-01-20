// Database types

export type ShowStatus = 'to_watch' | 'watching' | 'watched';
export type ShowType = 'movie' | 'tv';

export interface Show {
  id: string;
  tmdb_id: number;
  title: string;
  type: ShowType;
  poster_url: string | null;
  year: number | null;
  overview: string | null;
  status: ShowStatus;
  imdb_rating: number | null;
  rotten_tomatoes_score: number | null;
  imdb_id: string | null;
  streaming_services: string[];
  ai_summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  category: 'who' | 'genre' | 'mood' | 'meta';
  created_at: string;
}

export interface ShowTag {
  show_id: string;
  tag_id: string;
}

// API response types

export interface TMDbSearchResult {
  id: number;
  title?: string;  // for movies
  name?: string;   // for TV shows
  poster_path: string | null;
  release_date?: string;  // for movies
  first_air_date?: string;  // for TV shows
  overview: string;
  media_type?: 'movie' | 'tv';
}

export interface TMDbSearchResponse {
  results: TMDbSearchResult[];
  total_results: number;
  total_pages: number;
}

export interface TMDbWatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

export interface TMDbWatchProvidersResponse {
  results: {
    US?: {
      flatrate?: TMDbWatchProvider[];
      rent?: TMDbWatchProvider[];
      buy?: TMDbWatchProvider[];
    };
  };
}

export interface OMDbResponse {
  Title: string;
  Year: string;
  imdbRating: string;
  imdbID: string;
  Metascore: string;
  Ratings: Array<{
    Source: string;
    Value: string;
  }>;
  Response: 'True' | 'False';
  Error?: string;
}

// UI types

export interface ShowWithTags extends Show {
  tags: Tag[];
}

export interface FilterOptions {
  status?: ShowStatus;
  tagIds?: string[];
  streamingService?: string;
  searchQuery?: string;
}

export interface SortOptions {
  field: 'created_at' | 'title' | 'imdb_rating' | 'year';
  direction: 'asc' | 'desc';
}
