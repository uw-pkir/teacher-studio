// Decap CMS GitHub OAuth proxy — deploy this as a Cloudflare Worker.
// See ../SETUP.md for exact click-by-click deployment steps.
//
// It needs two secrets set in the Worker (Settings -> Variables -> Secrets):
//   GITHUB_CLIENT_ID     - from your GitHub OAuth App
//   GITHUB_CLIENT_SECRET - from your GitHub OAuth App
//
// Flow: Decap CMS opens /auth in a popup -> we redirect to GitHub's OAuth
// consent screen -> GitHub redirects back to /callback with a code -> we
// exchange it for an access token and hand it back to the popup's opener
// via postMessage, in the exact format Decap CMS expects.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/auth') {
      const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
      authorizeUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
      authorizeUrl.searchParams.set('redirect_uri', `${url.origin}/callback`);
      authorizeUrl.searchParams.set('scope', 'repo,user');
      return Response.redirect(authorizeUrl.toString(), 302);
    }

    if (url.pathname === '/callback') {
      const code = url.searchParams.get('code');
      if (!code) {
        return new Response('Missing code', { status: 400 });
      }

      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code
        })
      });
      const tokenData = await tokenRes.json();

      if (tokenData.error || !tokenData.access_token) {
        return new Response(`OAuth error: ${tokenData.error_description || 'no access token returned'}`, { status: 400 });
      }

      const payload = JSON.stringify({ token: tokenData.access_token, provider: 'github' });
      const html = `<!doctype html>
<html><body>
<script>
(function() {
  function receiveMessage(e) {
    window.opener.postMessage(
      'authorization:github:success:${payload.replace(/'/g, "\\'")}',
      e.origin
    );
    window.removeEventListener("message", receiveMessage, false);
  }
  window.addEventListener("message", receiveMessage, false);
  window.opener.postMessage("authorizing:github", "*");
})();
</script>
</body></html>`;

      return new Response(html, { headers: { 'Content-Type': 'text/html' } });
    }

    return new Response('Teacher Studio CMS OAuth proxy. See /auth to start login.', { status: 200 });
  }
};
