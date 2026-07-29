import { useMutation } from "@tanstack/react-query";

export function useSearch() {
  return useMutation({
    mutationFn: async (query: string) => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) {
        throw new Error("Failed to search");
      }
      return res.json();
    },
  });
}