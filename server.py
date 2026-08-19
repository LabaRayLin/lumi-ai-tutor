#!/usr/bin/env python3
"""
Santa AI Offline Standalone Web Server
- Lightweight Python HTTP Server with zero external dependencies
- Configures proper MIME types (.wasm, .mjs, .webp, .json, etc.)
- SPA Route Fallback mechanism for Next.js Client-Side Routing
- Security headers (COOP/COEP/CORS) for WebAssembly & Web Workers
"""

import http.server
import socketserver
import mimetypes
import os
import sys
import urllib.parse

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

# Configure custom MIME types
mimetypes.add_type('application/wasm', '.wasm')
mimetypes.add_type('text/javascript', '.mjs')
mimetypes.add_type('text/javascript', '.js')
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('image/webp', '.webp')
mimetypes.add_type('image/svg+xml', '.svg')
mimetypes.add_type('application/json', '.json')
mimetypes.add_type('audio/mpeg', '.mp3')
mimetypes.add_type('audio/wav', '.wav')
mimetypes.add_type('audio/webm', '.webm')

class SantaOfflineHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Security & Isolation headers for WASM / Workers / SharedArrayBuffer
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cross-Origin-Embedder-Policy', 'credentialless')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        clean_path = parsed_url.path.lstrip('/')
        local_path = os.path.join(DIRECTORY, clean_path.replace('/', os.sep))

        # 1. Root path -> serve index.html or onboarding/intro.html
        if clean_path == '' or clean_path == '/':
            if os.path.exists(os.path.join(DIRECTORY, 'index.html')):
                self.path = '/index.html'
            elif os.path.exists(os.path.join(DIRECTORY, 'onboarding', 'intro.html')):
                self.path = '/onboarding/intro.html'
            return super().do_GET()

        # 2. Exact file exists -> serve file
        if os.path.isfile(local_path):
            return super().do_GET()

        # 3. Path with .html exists (e.g. /onboarding/intro -> /onboarding/intro.html)
        if os.path.isfile(local_path + '.html'):
            self.path = '/' + clean_path + '.html'
            return super().do_GET()

        # 4. If directory with index.html exists
        if os.path.isdir(local_path) and os.path.isfile(os.path.join(local_path, 'index.html')):
            return super().do_GET()

        # 5. Static assets (/_next/, /assets/, /wasm/) that do not exist -> 404
        if clean_path.startswith('_next/') or clean_path.startswith('assets/') or '.' in os.path.basename(clean_path):
            self.send_error(404, f"Asset Not Found: {self.path}")
            return

        # 6. SPA Route Fallback: Any other non-file route falls back to onboarding/intro.html or index.html
        if os.path.exists(os.path.join(DIRECTORY, 'onboarding', 'intro.html')):
            self.path = '/onboarding/intro.html'
        elif os.path.exists(os.path.join(DIRECTORY, 'index.html')):
            self.path = '/index.html'
        
        return super().do_GET()

def run_test(port=8080):
    """Smoke test to verify server responsiveness & MIME types"""
    import urllib.request
    print(f"[*] Testing server on port {port}...")
    try:
        req = urllib.request.Request(f"http://127.0.0.1:{port}/onboarding/intro")
        with urllib.request.urlopen(req, timeout=3) as resp:
            status = resp.status
            content_type = resp.headers.get('Content-Type', '')
            print(f"[+] GET /onboarding/intro returned status {status} ({content_type})")
            if status == 200:
                print("[+] Server test passed successfully!")
                return True
    except Exception as e:
        print(f"[-] Server test failed: {e}")
        return False

def main():
    port = PORT
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        port = int(sys.argv[1])
    
    if '--test' in sys.argv:
        success = run_test(port)
        sys.exit(0 if success else 1)

    # Threading server allows concurrent asset fetching and worker requests
    socketserver.TCPServer.allow_reuse_address = True
    try:
        with socketserver.ThreadingTCPServer(('127.0.0.1', port), SantaOfflineHTTPRequestHandler) as httpd:
            print("=" * 65)
            print("  🎅 Santa AI Tutor Standalone Offline Server")
            print("=" * 65)
            print(f"  Local URL       : http://127.0.0.1:{port}/onboarding/intro")
            print(f"  Root Directory  : {DIRECTORY}")
            print(f"  SPA Fallback    : Enabled")
            print(f"  COOP / COEP     : Enabled (WebAssembly / SharedArrayBuffer)")
            print("=" * 65)
            print("  Press Ctrl+C to stop the server.\n")
            httpd.serve_forever()
    except OSError as e:
        if port == 8080:
            print(f"[!] Port 8080 in use, trying port 8081...")
            with socketserver.ThreadingTCPServer(('127.0.0.1', 8081), SantaOfflineHTTPRequestHandler) as httpd:
                print(f"[*] Serving on http://127.0.0.1:8081/onboarding/intro")
                httpd.serve_forever()
        else:
            raise e

if __name__ == '__main__':
    main()
