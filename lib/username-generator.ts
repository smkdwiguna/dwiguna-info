import { getAdminService } from "./google-api";

// Phase 1: Fetch all existing users
export async function fetchAllWorkspaceUsers() {
	const adminService = getAdminService();
	let allUsers: any[] = [];
	let pageToken: string | undefined = undefined;

	do {
		try {
			const res: any = await adminService.users.list({
				customer: "my_customer",
				pageToken: pageToken,
				fields:
					"users(id,name,primaryEmail,orgUnitPath,suspended,thumbnailPhotoUrl),nextPageToken",
			});
			if (res.data.users) {
				allUsers = allUsers.concat(res.data.users);
			}
			pageToken = res.data.nextPageToken || undefined;
		} catch (error) {
			console.error("Error fetching workspace users:", error);
			break;
		}
	} while (pageToken);

	return allUsers;
}

// Phase 2: Build Stop-word Detector (IGNORE_LIST)
export function buildIgnoreList(userNames: string[]): Set<string> {
	const wordFreq = new Map<string, number>();
	let totalValidNames = 0;

	for (const name of userNames) {
		if (!name) continue;
		totalValidNames++;
		const words = name
			.toLowerCase()
			.replace(/[^a-z0-9\s]/g, "")
			.split(/\s+/)
			.filter((w) => w.length > 0);

		// Count unique words per name so "muhammad muhammad" only counts as 1 for frequency threshold
		const uniqueWords = new Set(words);
		for (const w of uniqueWords) {
			wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
		}
	}

	const ignoreList = new Set<string>();
	if (totalValidNames === 0) return ignoreList;

	const threshold = totalValidNames * 0.15; // > 15% of all names

	for (const [word, count] of wordFreq.entries()) {
		if (count > threshold) {
			ignoreList.add(word);
		}
	}

	return ignoreList;
}

// Phase 3: Generator
export function generateUniqueUsername(
	fullName: string,
	existingUsernames: Set<string>,
	ignoreList: Set<string>,
): string {
	const words = fullName
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, "")
		.split(/\s+/)
		.filter((w) => w.length > 0);

	const filteredWords = words.filter((w) => !ignoreList.has(w));

	// If all words were filtered out (e.g. name is just stop-words), fallback to original words
	const usableWords = filteredWords.length > 0 ? filteredWords : words;
	if (usableWords.length === 0) {
		// Absolute fallback if name was completely empty or symbols
		usableWords.push("user");
	}

	let proposed = "";
	// Try combinations: word1, word1.word2, word1.word2.word3
	for (let i = 0; i < usableWords.length; i++) {
		proposed = usableWords.slice(0, i + 1).join(".");
		if (!existingUsernames.has(proposed)) {
			existingUsernames.add(proposed); // mark as used for the batch
			return proposed;
		}
	}

	// Fallback: append incrementing number to the fullest name combination
	let counter = 1;
	const baseProposed = usableWords.join(".");
	while (true) {
		proposed = `${baseProposed}${counter}`;
		if (!existingUsernames.has(proposed)) {
			existingUsernames.add(proposed);
			return proposed;
		}
		counter++;
	}
}
