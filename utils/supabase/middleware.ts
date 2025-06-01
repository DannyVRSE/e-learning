import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    });
    //👇🏻 creates the Supabase cookie functions
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // 👉🏻 placeholder for protected route controller
    //👇🏻 gets current user
    const {
        data: { user },
    } = await supabase.auth.getUser();

    //👇🏻 declares protected routes
    if (
        !user &&
        request.nextUrl.pathname !== "/" &&
        !request.nextUrl.pathname.startsWith("/instructor/auth") &&
        !request.nextUrl.pathname.startsWith("/student/auth")
    ) {
        //👇🏻 Redirect unauthenticated users to the login page
        const url = request.nextUrl.clone();
        url.pathname = "/student/auth/login"; // 👈🏼 redirect page
        return NextResponse.redirect(url);
    }
    //👇🏻 returns Supabase response
    return supabaseResponse;
}