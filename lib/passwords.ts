import { randomInt } from "crypto";

const PASSWORD_CHARSET =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";

export function generateRandomPassword(length = 12): string {
	let password = "";
	for (let i = 0; i < length; i++) {
		password += PASSWORD_CHARSET.charAt(randomInt(PASSWORD_CHARSET.length));
	}
	return password;
}
