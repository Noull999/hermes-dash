import { NextRequest, NextResponse } from 'next/server';

// Server-side only — the token never reaches the browser.
// BACKEND_URL defaults to the VPS public IP (token-protected port).
const API_BASE = process.env.BACKEND_URL || 'http://95.217.7.149:8080';
const AUTH_TOKEN = process.env.API_TOKEN || '';
const TIMEOUT_MS = 120000; // 2 minute timeout (Claude can take longer)

function backendUrl(path: string[], search: string): string {
  // /api/proxy/api/tokens  -> path = ['api','tokens'] -> /api/tokens
  const endpoint = '/' + path.join('/');
  return `${API_BASE}${endpoint}${search ? `?${search}` : ''}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;

  // Diagnostic endpoint - only shows safe info (no token details)
  if (path[0] === '_diag') {
    return NextResponse.json({
      hasToken: !!process.env.API_TOKEN,
      backend: process.env.BACKEND_URL ? 'configured' : '(default)',
    });
  }

  const url = backendUrl(path, request.nextUrl.searchParams.toString());

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    const message = (err as Error).name === 'AbortError'
      ? 'Request timeout'
      : (err as Error).message;
    return NextResponse.json(
      { error: 'Proxy error', message },
      { status: 502 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const url = backendUrl(path, request.nextUrl.searchParams.toString());
  let body: string | undefined;
  try {
    body = await request.text();
  } catch {
    // no body
  }

  const contentType = request.headers.get('content-type') || 'application/json';

  // Use longer timeout for Claude endpoint
  const isClaudeEndpoint = path.includes('claude');
  const timeout = isClaudeEndpoint ? 600000 : TIMEOUT_MS; // 10 min for Claude

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const headers: Record<string, string> = {
      Authorization: `Bearer ${AUTH_TOKEN}`,
    };
    // Only set Content-Type if there's a body
    if (body) {
      headers['Content-Type'] = contentType;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: body || undefined,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    const message = (err as Error).name === 'AbortError'
      ? 'Request timeout'
      : (err as Error).message;
    return NextResponse.json(
      { error: 'Proxy error', message },
      { status: 502 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const url = backendUrl(path, request.nextUrl.searchParams.toString());

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.status === 204) return new NextResponse(null, { status: 204 });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    const message = (err as Error).name === 'AbortError'
      ? 'Request timeout'
      : (err as Error).message;
    return NextResponse.json(
      { error: 'Proxy error', message },
      { status: 502 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const url = backendUrl(path, request.nextUrl.searchParams.toString());
  let body: string | undefined;
  try {
    body = await request.text();
  } catch {
    // no body
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    const message = (err as Error).name === 'AbortError'
      ? 'Request timeout'
      : (err as Error).message;
    return NextResponse.json(
      { error: 'Proxy error', message },
      { status: 502 }
    );
  }
}
