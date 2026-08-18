export async function toggleFavorite(mediaData: {
  id: string;
  title: string;
  posterUrl?: string;
  mediaType: string;
  sourceApi: string;
}): Promise<boolean> {
  try {
    const response = await fetch(`/api/favorites`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(mediaData),
    });

    if (!response.ok) {
      throw new Error(`Failed to toggle favorite: ${response.statusText}`);
    }

    const result = await response.json();
    // API returns { success: true, favorited: boolean }
    return result.favorited;
  } catch (error) {
    console.error("Error toggling favorite:", error);
    throw error;
  }
}

export async function getUserFavorites(): Promise<Set<string>> {
  try {
    const response = await fetch(`/api/favorites`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch favorites: ${response.statusText}`);
    }

    const favorites = await response.json();
    // Assuming the API returns an array of favorite objects with media relation included
    return new Set(favorites.map((fav: any) => fav.media?.id ?? fav.mediaId));
  } catch (error) {
    console.error("Error fetching favorites:", error);
    return new Set();
  }
}