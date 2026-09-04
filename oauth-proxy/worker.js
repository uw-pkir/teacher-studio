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

// Only this origin is ever allowed to receive the finished access token,
// and it's also the only origin /auth will accept a request from -- update
// this if the site ever moves to a custom domain.
const ALLOWED_ORIGIN = 'https://uw-pkir.github.io';

function parseCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? match[1] : null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/auth') {
      // A random, single-use value tying this /auth request to the
      // /callback that completes it -- without it, an attacker could open
      // /callback directly with a code from their own GitHub account and
      // have it silently accepted (a login CSRF).
      const state = crypto.randomUUID();

      const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
      authorizeUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
      authorizeUrl.searchParams.set('redirect_uri', `${url.origin}/callback`);
      authorizeUrl.searchParams.set('scope', 'repo,user');
      authorizeUrl.searchParams.set('state', state);

      return new Response(null, {
        status: 302,
        headers: {
          Location: authorizeUrl.toString(),
          // HttpOnly (JS can't read it) + Secure + SameSite=Lax (still
          // sent on GitHub's top-level redirect back) + a short Max-Age,
          // since it's only ever needed for the few seconds this flow takes.
          'Set-Cookie': `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Max-Age=600; Path=/callback`
        }
      });
    }

    if (url.pathname === '/callback') {
      const code = url.searchParams.get('code');
      if (!code) {
        return new Response('Missing code', { status: 400 });
      }

      const state = url.searchParams.get('state');
      const cookieState = parseCookie(request, 'oauth_state');
      if (!state || !cookieState || state !== cookieState) {
        return new Response('Invalid or expired login attempt -- please try logging in again.', { status: 400 });
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
  var ALLOWED_ORIGIN = ${JSON.stringify(ALLOWED_ORIGIN)};
  function receiveMessage(e) {
    // Only ever hand the token to the real admin page -- without this
    // check, whichever origin messages this popup first receives it,
    // which is exactly what an attacker-opened popup would exploit.
    if (e.origin !== ALLOWED_ORIGIN) return;
    window.opener.postMessage(
      'authorization:github:success:${payload.replace(/'/g, "\\'")}',
      ALLOWED_ORIGIN
    );
    window.removeEventListener("message", receiveMessage, false);
  }
  window.addEventListener("message", receiveMessage, false);
  window.opener.postMessage("authorizing:github", ALLOWED_ORIGIN);
})();
</script>
</body></html>`;

      return new Response(html, {
        headers: {
          'Content-Type': 'text/html',
          // Clear the state cookie now that it's served its purpose.
          'Set-Cookie': 'oauth_state=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/callback'
        }
      });
    }

    return new Response('Teacher Studio CMS OAuth proxy. See /auth to start login.', { status: 200 });
  }
};
