import { NextRequest, NextResponse } from 'next/server';

// Server-side only — the token never reaches the browser.
// BACKEND_URL defaults to the VPS public IP (token-protected port).
const API_BASE = process.env.BACKEND_URL || 'http://95.217.7.149:8080';
const AUTH_TOKEN = process.env.API_TOKEN || '';

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

  // Temporary runtime diagnostic — /api/proxy/_diag
  if (path[0] === '_diag') {
    return NextResponse.json({
      hasToken: !!process.env.API_TOKEN,
      tokenLen: (process.env.API_TOKEN || '').length,
      tokenHead: (process.env.API_TOKEN || '').slice(0, 6),
      backend: process.env.BACKEND_URL || '(default)',
    });
  }

  const url = backendUrl(path, request.nextUrl.searchParams.toString());

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: 'Proxy error', message: (err as Error).message },
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

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body,
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: 'Proxy error', message: (err as Error).message },
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
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
    });
    if (res.status === 204) return new NextResponse(null, { status: 204 });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: 'Proxy error', message: (err as Error).message },
      { status: 502 }
    );
  }
}
