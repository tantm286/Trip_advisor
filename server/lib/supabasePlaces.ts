import { supabase } from "./supabaseClient";

export type Place = {
  id: number;
  city: string;
  name: string;
  address: string;
  area: string;
  type: string;
  vibes: string[];
  budget: "Low" | "Medium" | "High" | "";
  tags: string[];
  source: string;
};

/**
 * Parse semicolon-separated string into array
 */
function parseField(field: string | null): string[] {
  if (!field) return [];
  return field
    .split(";")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

/**
 * Fetch and filter places from Supabase with scoring
 */
export async function fetchPlacesByCityAndFilters(options: {
  city: string;
  vibes?: string[];
  interests?: string[];
  budget?: string;
}): Promise<Place[]> {
  const { city, vibes = [], interests = [], budget } = options;

  try {
    // Query all locations for the city (case-insensitive)
    const { data, error } = await supabase
      .from("locations")
      .select("*")
      .ilike("city", `%${city}%`);

    if (error) {
      console.error("Supabase query error:", error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Transform and parse data
    const places: Place[] = data.map((row: any) => ({
      id: row.id,
      city: row.city,
      name: row.name,
      address: row.address,
      area: row.area,
      type: row.type,
      vibes: parseField(row.vibes),
      budget: row.budget || "",
      tags: parseField(row.tags),
      source: row.source,
    }));

    // Score places based on matching vibes and interests
    const scoredPlaces = places.map((place) => {
      let score = 0;

      // +1 for each matching vibe
      vibes.forEach((vibe) => {
        if (place.vibes.includes(vibe)) {
          score += 1;
        }
      });

      // +1 for each matching interest (check tags and vibes)
      interests.forEach((interest) => {
        if (place.tags.includes(interest) || place.vibes.includes(interest)) {
          score += 1;
        }
      });

      // Boost budget matching places
      if (budget && place.budget === budget) {
        score += 2;
      }

      return { ...place, score };
    });

    // Sort by score descending
    scoredPlaces.sort((a, b) => b.score - a.score);

    // If all scores are 0, return unsorted list
    if (scoredPlaces.every((p) => p.score === 0)) {
      return places;
    }

    return scoredPlaces.map(({ score, ...place }) => place);
  } catch (error) {
    console.error("Error fetching places:", error);
    return [];
  }
}
