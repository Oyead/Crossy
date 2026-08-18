import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "./src/lib/rateLimit";

export async function middleware(request: NextRequest) {
    let ip = request.ip;
    if (!ip) {
        const forwardedFor = request.headers.get("x-forwarded-for");
        if (forwardedFor) {
            ip = forwardedFor.split(",")[0].trim();
        } else {
            ip = "127.0.0.1";
        }
    }

    try {
        await rateLimitMiddleware(ip, 100, '15 m');
    } catch (error) {
        if (error instanceof Error && error.message === 'Rate limit exceeded') {
            return new NextResponse('Too Many Requests', { status: 429 });
        }
        console.error('Rate limit middleware error:', error);
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-ip', ip);
    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });
}

export const config = {
    matcher: '/api/:path*',
};