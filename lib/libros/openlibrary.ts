interface ResultadoBusqueda {
  open_library_key: string;
  titulo: string;
  autor: string | null;
  portada_url: string | null;
}

interface OpenLibraryDoc {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
}

interface OpenLibrarySearchResponse {
  docs: OpenLibraryDoc[];
}

export async function buscarEnOpenLibrary(query: string): Promise<ResultadoBusqueda[]> {
  const url = new URL("https://openlibrary.org/search.json");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "12");
  url.searchParams.set("fields", "key,title,author_name,cover_i");

  const response = await fetch(url, {
    headers: { "User-Agent": "atenea (uso personal)" },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    throw new Error(`Open Library respondió ${response.status}`);
  }

  const data = (await response.json()) as OpenLibrarySearchResponse;

  return data.docs.map((doc) => ({
    open_library_key: doc.key.replace("/works/", ""),
    titulo: doc.title,
    autor: doc.author_name?.[0] ?? null,
    portada_url: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
  }));
}
