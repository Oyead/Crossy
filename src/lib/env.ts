import { parse } from 'path'
import { env } from 'process'
import {z} from 'zod'
const envSchema = z.object({
    DATABASE_URL : z.string().min(1),
    OPENAI_API_KEY:z.string().min(1).optional(),
    TMDB_API_KEY : z.string().min(1),
    SPOTIFY_CLIENT_ID : z.string().min(1),
    SPOTIFY_CLIENT_SECRET : z.string().min(1),
    RAWG_API_KEY: z.string().min(1),
    GOOGLE_BOOKS_API_KEY: z.string().min(1).optional(),
})
let cached : z.infer<typeof envSchema> | null = null
export function getEnv(){
    if (cached)
        return cached
    const parsed = envSchema.safeParse(process.env)
    if(!parsed.success){
            console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
            throw new Error("Invalid environment variables. Check .env.example.");
    }
    cached =parsed.data
    return cached
}