import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";

// The auth instance is built lazily (it needs the Cloudflare request context),
// so resolve it per-request and delegate to Better Auth's Next.js handler.
async function dispatch(request: Request): Promise<Response> {
	const auth = await getAuth();
	const handlers = toNextJsHandler(auth);
	return request.method === "GET"
		? handlers.GET(request)
		: handlers.POST(request);
}

export const GET = dispatch;
export const POST = dispatch;
export const PUT = dispatch;
export const PATCH = dispatch;
export const DELETE = dispatch;
