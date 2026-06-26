export const SUPERUSER_EMAIL = "ict@smkdwiguna.sch.id";
export const WORKSPACE_DOMAIN = "smkdwiguna.sch.id";

const ACCESS_SEPARATOR_REGEX = /[,\n;]+/;

export function isSuperUser(email?: string | null) {
	return email?.toLowerCase() === SUPERUSER_EMAIL;
}

export function isWorkspaceEmail(email?: string | null) {
	return email?.toLowerCase().endsWith(`@${WORKSPACE_DOMAIN}`) ?? false;
}

export function normalizeAccessList(access?: string | null) {
	if (!access) return [];

	return access
		.split(ACCESS_SEPARATOR_REGEX)
		.map((value) => value.trim().toLowerCase())
		.filter(Boolean);
}

export function hasPermission(
	access?: string | null,
	permission?: string | null,
) {
	if (!permission) return false;

	const normalizedPermission = permission.trim().toLowerCase();
	if (!normalizedPermission) return false;

	const accessList = normalizeAccessList(access);
	return accessList.includes(normalizedPermission);
}
