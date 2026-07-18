import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
export function middleware(request: NextRequest) {
    let ip =request.ip
    if(!ip){
        const forwardedFor = request.headers.get("x-forwarded-for")
        if(forwardedFor){
            ip = forwardedFor.split(",")[0].trim()
        } else {
            ip = "127.0.0.1"
        }

    }
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-ip',ip);
    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });
}
export const config = {
    matcher : '/api/:path*',
}