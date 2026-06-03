export function isTerminalIdle(status: string): boolean {
	return status === "0" || status === "INHERIT";
}

export function hasTerminalPendingCommand(status: string): boolean {
	return !isTerminalIdle(status);
}

export function formatTerminalCommand(
	status: string,
	metadata: string | null,
): string {
	if (isTerminalIdle(status)) return "0;";
	if (metadata) return `${status};${metadata}`;
	return `${status};`;
}
