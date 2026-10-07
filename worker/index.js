// Cloudflare Worker for caffearoma.cwmccann.pro.
// The site is a static export (./out) served by Workers Static Assets. Static files can't do two things, so this does them:
//  1. /order/track/<any order id> is answered by the one pre-built tracker page (the page reads the id from the URL).
//  2. /robots.txt: this is a pitch preview, not the cafe's real site, so search engines are asked to stay away.
// Everything else is passed straight through to the assets (security and cache headers come from out/_headers).

/** @typedef {{ ASSETS: { fetch(request: Request): Promise<Response> } }} Env */

export default {
  /**
   * @param {Request} request
   * @param {Env} env
   */
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/robots.txt") {
      return new Response("User-agent: *\nDisallow: /\n", {
        headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
      });
    }

    // /order/track/ABC123  ->  /order/track/_/   (and the page's data files: /order/track/ABC123/x.txt -> /order/track/_/x.txt)
    const m = /^\/order\/track\/([^/]+)(\/.*)?$/.exec(url.pathname);
    if (m && m[1] !== "_") {
      url.pathname = `/order/track/_${m[2] ?? "/"}`;
      return env.ASSETS.fetch(new Request(url, request));
    }

    return env.ASSETS.fetch(request);
  },
};
