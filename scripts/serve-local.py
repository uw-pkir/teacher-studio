#!/usr/bin/env python3
"""Local static file server for previewing this site with no HTTP caching --
plain `python3 -m http.server` lets the browser cache JS/CSS aggressively
across edits, which makes iterating on a change look like it isn't working.
Not used by the deployed site (GitHub Pages) -- dev-only convenience."""
import functools
import http.server
import pathlib
import sys

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8090
site_root = pathlib.Path(__file__).resolve().parent.parent


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()


handler = functools.partial(NoCacheHandler, directory=str(site_root))
http.server.test(HandlerClass=handler, port=port)
