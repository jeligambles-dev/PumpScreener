import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const handle = req.nextUrl.searchParams.get("handle");
  if (!handle) {
    return NextResponse.json({ error: "Missing handle" }, { status: 400 });
  }

  try {
    // Use Twitter's syndication API to get user info
    const res = await fetch(
      `https://syndication.twitter.com/srv/timeline-profile/screen-name/${encodeURIComponent(handle)}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; bot)",
          Accept: "text/html",
        },
      }
    );

    if (res.ok) {
      const html = await res.text();

      // Extract JSON data from the syndication response
      const scriptMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      if (scriptMatch) {
        const nextData = JSON.parse(scriptMatch[1]);
        const user = nextData?.props?.pageProps?.timeline?.entries?.[0]?.content?.tweet?.user
          || nextData?.props?.pageProps?.user;

        if (user) {
          return NextResponse.json({
            name: user.name || handle,
            handle,
            description: user.description || "",
            members: null,
            following: user.friends_count ?? null,
            followers: user.followers_count ?? null,
            createdAt: user.created_at || null,
            avatar: user.profile_image_url_https?.replace("_normal", "_200x200") || null,
            banner: user.profile_banner_url || null,
          }, {
            headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" },
          });
        }
      }
    }

    // Fallback: try Twitter's oembed API for minimal data
    const oembedRes = await fetch(
      `https://publish.twitter.com/oembed?url=https://twitter.com/${encodeURIComponent(handle)}&omit_script=true`
    );

    if (oembedRes.ok) {
      const oembed = await oembedRes.json();
      return NextResponse.json({
        name: oembed.author_name || handle,
        handle,
        description: "",
        members: null,
        following: null,
        followers: null,
        createdAt: null,
        avatar: null,
        banner: null,
      }, {
        headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" },
      });
    }

    return NextResponse.json({ error: "Could not fetch" }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
