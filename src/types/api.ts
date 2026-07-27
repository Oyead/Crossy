import { z } from "zod";
import { SEARCH_MODES } from "./media";

export const searchRequestSchema = z.object({
  input: z.string().min(1).max(200),
  mode: z.enum(SEARCH_MODES),
});
export type SearchRequest = z.infer<typeof searchRequestSchema>;