import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  try {
    const target = url.startsWith("http") ? url : `https://${url}`;
    const res = await fetch(target, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; bot)",
        Accept: "text/html",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch" }, { status: 502 });
    }

    const html = await res.text();

    // Extract Open Graph / meta tags
    const getTag = (property: string): string => {
      // Try og tags
      const ogMatch = html.match(new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`, "i"))
        || html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`, "i"));
      if (ogMatch) return ogMatch[1];

      // Try name tags
      const nameMatch = html.match(new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']*)["']`, "i"))
        || html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${property}["']`, "i"));
      if (nameMatch) return nameMatch[1];

      return "";
    };

    const title = getTag("og:title") || getTag("twitter:title")
      || (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || "").trim();
    const description = getTag("og:description") || getTag("twitter:description") || getTag("description");
    const image = getTag("og:image") || getTag("twitter:image");
    const siteName = getTag("og:site_name");
    const favicon = (() => {
      const iconMatch = html.match(/<link[^>]*rel=["'](?:icon|shortcut icon)["'][^>]*href=["']([^"']*)["']/i)
        || html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["'](?:icon|shortcut icon)["']/i);
      if (!iconMatch) return "";
      const href = iconMatch[1];
      if (href.startsWith("http")) return href;
      if (href.startsWith("//")) return `https:${href}`;
      const base = new URL(target);
      if (href.startsWith("/")) return `${base.origin}${href}`;
      return `${base.origin}/${href}`;
    })();

    // Make image absolute
    let absoluteImage = image;
    if (image && !image.startsWith("http")) {
      const base = new URL(target);
      absoluteImage = image.startsWith("/") ? `${base.origin}${image}` : `${base.origin}/${image}`;
    }

    return NextResponse.json({
      title,
      description,
      image: absoluteImage,
      siteName,
      favicon,
      url: target,
    }, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" },
    });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
