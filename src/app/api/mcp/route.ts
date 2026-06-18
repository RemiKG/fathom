/* Fathom's studio as an MCP server (JSON-RPC 2.0 over Streamable HTTP). Mount it in any MCP client
   and drive the six tools — plot_voyage · chart_scene · engrave_plate · sound_scene · assay_frame ·
   cut_short (+ sound_voyage). GET returns a server card; POST speaks JSON-RPC. */

import { NextResponse } from 'next/server';
import { TOOLS, findTool } from '@/lib/mcp/tools';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SERVER_INFO = { name: 'fathom', version: '1.0.0' };
const PROTOCOL = '2024-11-05';

function result(id: unknown, res: unknown) { return { jsonrpc: '2.0', id, result: res }; }
function error(id: unknown, code: number, message: string) { return { jsonrpc: '2.0', id, error: { code, message } }; }

async function handleOne(msg: any): Promise<any | null> {
  const { id, method, params } = msg || {};
  if (method === 'initialize') {
    return result(id, { protocolVersion: PROTOCOL, capabilities: { tools: { listChanged: false } }, serverInfo: SERVER_INFO });
  }
  if (method === 'notifications/initialized' || method === 'notifications/cancelled') return null; // notification
  if (method === 'ping') return result(id, {});
  if (method === 'tools/list') {
    return result(id, { tools: TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })) });
  }
  if (method === 'tools/call') {
    const tool = findTool(params?.name);
    if (!tool) return error(id, -32602, `unknown tool: ${params?.name}`);
    try {
      const out = await tool.handler(params?.arguments || {});
      return result(id, { content: [{ type: 'text', text: JSON.stringify(out, null, 2) }] });
    } catch (e: any) {
      return result(id, { content: [{ type: 'text', text: `error: ${String(e?.message || e)}` }], isError: true });
    }
  }
  if (id === undefined) return null; // unknown notification
  return error(id, -32601, `method not found: ${method}`);
}

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json(error(null, -32700, 'parse error'), { status: 400 }); }
  if (Array.isArray(body)) {
    const out = (await Promise.all(body.map(handleOne))).filter((x) => x !== null);
    return NextResponse.json(out);
  }
  const res = await handleOne(body);
  if (res === null) return new NextResponse(null, { status: 202 });
  return NextResponse.json(res);
}

export async function GET() {
  return NextResponse.json({
    server: SERVER_INFO,
    protocol: PROTOCOL,
    transport: 'streamable-http (POST JSON-RPC 2.0)',
    tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
    hint: 'POST a JSON-RPC 2.0 { method: "tools/list" } or { method: "tools/call", params: { name, arguments } }.',
  });
}
