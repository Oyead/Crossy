import { NextResponse } from "next/server";
// import { getCachedData, setCacheData } from "@/lib/cache";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ type: string, id: string }> }
){
    const { type, id } = await params;
    const cacheKey = `media:${type}:${id}`;
    
    // // const cachedResult = await getCachedData(cacheKey);
    // if (cachedResult) {
    //     return NextResponse.json(cachedResult);
    // }
    
    let data = null;

    if (type === 'movie'){
        const res = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${process.env.TMDB_API_KEY}`);
        data = await res.json();
    }
    if (type === 'game'){
        const res = await fetch(`https://api.rawg.io/api/games/${id}?key=${process.env.RAWG_API_KEY}`);
        data = await res.json();
    }
    if (type === 'book'){
        const res = await fetch(`https://www.googleapis.com/books/v1/volumes/${id}?key=${process.env.GOOGLE_BOOKS_API_KEY}`);
        data = await res.json();
    }
    if (type === 'song'){
        const res = await fetch(`https://api.spotify.com/v1/tracks/${id}`, {
            headers: {
                'Authorization': `Bearer ${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
            }
        });
        data = await res.json();
    }

    if (!data) {
        return NextResponse.json({ error: "Media not found or type unsupported" }, { status: 404 });
    }

    // await setCacheData(cacheKey, data);

    return NextResponse.json(data);
}