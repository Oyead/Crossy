"use client";

import { signIn } from "next-auth/react";

export default function SocialSignInButtons() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 border-t-2 border-foreground/20"></div>
        <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Or continue with
        </span>
        <div className="flex-1 border-t-2 border-foreground/20"></div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => signIn("github", { callbackUrl: "/" })}
          className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-foreground rounded-xl bg-white font-bold text-sm text-foreground hover:bg-[#D2E9F9] retro-shadow-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_#1a1a15] transition-all"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75 0 4.25 2.426 7.865 5.813 9.173.425.09.58-.214.58-.477v-1.85c-2.357.51-2.855-1.043-2.855-1.043-.385-.98-.94-1.245-.94-1.245-.77-.526.059-.516.059-.516.853.06 1.302.874 1.302.874.695 1.293 2.002.918 2.49 1.402.024-1.096.09-1.847.14-2.283-1.872-.208-3.84-.936-3.84-4.17 0-.92.33-1.668.87-2.257-.085-.214-.367-1.076.08-2.242 0 0 .71-.229 2.33.866a10.296 10.296 0 012.04-.261c.698-.09 1.446-.136 2.162-.136.716 0 1.464.046 2.162.136 1.62-1.095 2.33-.866 2.33-.866.447 1.166.165 2.028.08 2.242.54.589.87 1.337.87 2.257 0 3.234-1.968 3.962-3.84 4.17.3.26.57.773.57 1.558v2.96c0 .263.155.567.58.477 3.387-1.308 5.813-4.923 5.813-9.173C21.75 6.615 17.385 2.25 12 2.25z" clipRule="evenodd" />
          </svg>
          GitHub
        </button>
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-foreground rounded-xl bg-white font-bold text-sm text-foreground hover:bg-[#E8C5C8] retro-shadow-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_#1a1a15] transition-all"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google
        </button>
      </div>
    </div>
  );
}
