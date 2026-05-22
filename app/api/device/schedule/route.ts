export async function GET(request: Request) {
	return new Response("ERR;Use /api/device/{deviceId}", {
		status: 410,
		headers: { "content-type": "text/plain; charset=utf-8" },
	});
}
