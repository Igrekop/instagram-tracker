// Storage keys
const STORAGE_KEYS = {
	followersSnapshot: 'followers_snapshot', // Set<string> serialized as array
	history: 'events_history', // Array of { type, username, at }
	lastScanAt: 'last_scan_at', // number (timestamp)
	scanEnabled: 'scan_enabled', // boolean
	scanIntervalMin: 'scan_interval_min' // number (minutes)
};

// Event types
const EVENT_TYPES = {
	UNFOLLOW: 'unfollow',
	INTERACTION: 'interaction' // experimental proxy for visits
};

// Utility: read from chrome.storage.local
async function readLocal(keys) {
	return new Promise((resolve) => {
		chrome.storage.local.get(keys, (items) => resolve(items));
	});
}

// Utility: write to chrome.storage.local
async function writeLocal(obj) {
	return new Promise((resolve) => {
		chrome.storage.local.set(obj, () => resolve());
	});
}

// Append event to history with cap
async function appendHistory(event) {
	const { events_history } = await readLocal([STORAGE_KEYS.history]);
	const history = Array.isArray(events_history) ? events_history : [];
	history.unshift(event);
	// Cap history length to 500 entries
	const capped = history.slice(0, 500);
	await writeLocal({ [STORAGE_KEYS.history]: capped });
}

// Create a Chrome notification
function notify(title, message) {
	chrome.notifications.create('', {
		type: 'basic',
		iconUrl: 'icon.png',
		title,
		message,
		silent: false
	});
}

// Diff two sets of followers
function diffFollowers(previousUsernames, currentUsernames) {
	const prev = new Set(previousUsernames || []);
	const curr = new Set(currentUsernames || []);
	const unfollowers = [];
	for (const username of prev) {
		if (!curr.has(username)) {
			unfollowers.push(username);
		}
	}
	return { unfollowers };
}

// Trigger scan via active instagram tab content script
async function triggerFollowersScanOnActiveTab() {
	const tabs = await chrome.tabs.query({ url: 'https://www.instagram.com/*' });
	if (!tabs || tabs.length === 0) {
		return { ok: false, reason: 'no_instagram_tab' };
	}
	const targetTab = tabs[0];
	const response = await chrome.tabs.sendMessage(targetTab.id, { type: 'SCAN_FOLLOWERS' }).catch(() => null);
	if (!response || !response.ok) return { ok: false, reason: 'scan_failed' };
	return { ok: true, usernames: response.usernames };
}

// Periodic job: if an instagram tab is open, ask it to scan followers and compute diffs
async function periodicFollowersCheck() {
	const result = await triggerFollowersScanOnActiveTab();
	if (!result.ok) return;
	const currentUsernames = result.usernames;
	const { followers_snapshot } = await readLocal([STORAGE_KEYS.followersSnapshot]);
	const previousUsernames = Array.isArray(followers_snapshot) ? followers_snapshot : [];
	const { unfollowers } = diffFollowers(previousUsernames, currentUsernames);
	if (unfollowers.length > 0) {
		for (const username of unfollowers) {
			await appendHistory({ type: EVENT_TYPES.UNFOLLOW, username, at: Date.now() });
			notify('Unfollow détecté', `${username} ne vous suit plus.`);
		}
	}
	await writeLocal({
		[STORAGE_KEYS.followersSnapshot]: currentUsernames,
		[STORAGE_KEYS.lastScanAt]: Date.now()
	});
}

// Planification des alarmes selon réglages
async function scheduleAlarmFromSettings() {
	const { [STORAGE_KEYS.scanEnabled]: enabled, [STORAGE_KEYS.scanIntervalMin]: interval } = await readLocal([
		STORAGE_KEYS.scanEnabled,
		STORAGE_KEYS.scanIntervalMin
	]);
	const isEnabled = typeof enabled === 'boolean' ? enabled : true;
	const minutes = typeof interval === 'number' && interval >= 1 ? interval : 15;
	await new Promise((resolve) => chrome.alarms.clear('followers_check', () => resolve()));
	if (isEnabled && minutes >= 1) {
		chrome.alarms.create('followers_check', { periodInMinutes: minutes });
	}
}

// Messages API
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	(async () => {
		if (message?.type === 'GET_HISTORY') {
			const { events_history } = await readLocal([STORAGE_KEYS.history]);
			sendResponse({ ok: true, history: Array.isArray(events_history) ? events_history : [] });
			return;
		}
		if (message?.type === 'CLEAR_HISTORY') {
			await writeLocal({ [STORAGE_KEYS.history]: [] });
			sendResponse({ ok: true });
			return;
		}
		if (message?.type === 'GET_SNAPSHOT') {
			const { followers_snapshot, last_scan_at } = await readLocal([
				STORAGE_KEYS.followersSnapshot,
				STORAGE_KEYS.lastScanAt
			]);
			sendResponse({ ok: true, usernames: Array.isArray(followers_snapshot) ? followers_snapshot : [], lastScanAt: last_scan_at || null });
			return;
		}
		if (message?.type === 'SAVE_SNAPSHOT') {
			const usernames = Array.isArray(message?.usernames) ? message.usernames : [];
			await writeLocal({ [STORAGE_KEYS.followersSnapshot]: usernames, [STORAGE_KEYS.lastScanAt]: Date.now() });
			sendResponse({ ok: true, count: usernames.length });
			return;
		}
		if (message?.type === 'MANUAL_SCAN_FOLLOWERS') {
			const result = await triggerFollowersScanOnActiveTab();
			if (!result.ok) {
				sendResponse({ ok: false, reason: result.reason });
				return;
			}
			const currentUsernames = result.usernames;
			const { followers_snapshot } = await readLocal([STORAGE_KEYS.followersSnapshot]);
			const previousUsernames = Array.isArray(followers_snapshot) ? followers_snapshot : [];
			const { unfollowers } = diffFollowers(previousUsernames, currentUsernames);
			if (unfollowers.length > 0) {
				for (const username of unfollowers) {
					await appendHistory({ type: EVENT_TYPES.UNFOLLOW, username, at: Date.now() });
					notify('Unfollow détecté', `${username} ne vous suit plus.`);
				}
			}
			await writeLocal({ [STORAGE_KEYS.followersSnapshot]: currentUsernames, [STORAGE_KEYS.lastScanAt]: Date.now() });
			sendResponse({ ok: true, unfollowers, count: currentUsernames.length });
			return;
		}
		if (message?.type === 'SAVE_INTERACTIONS') {
			const interactions = Array.isArray(message?.interactions) ? message.interactions : [];
			for (const username of interactions) {
				await appendHistory({ type: EVENT_TYPES.INTERACTION, username, at: Date.now() });
			}
			if (interactions.length) {
				notify('Interactions récentes', `${interactions.length} utilisateur(s) ont interagi avec vous.`);
			}
			sendResponse({ ok: true, saved: interactions.length });
			return;
		}
		// Default
		sendResponse({ ok: false, reason: 'unknown_message' });
	})();
	return true; // keep the message channel open for async
});

// Defaults et planification
chrome.runtime.onInstalled.addListener(async () => {
	const { [STORAGE_KEYS.scanEnabled]: enabled, [STORAGE_KEYS.scanIntervalMin]: interval } = await readLocal([
		STORAGE_KEYS.scanEnabled,
		STORAGE_KEYS.scanIntervalMin
	]);
	const initial = {};
	if (typeof enabled !== 'boolean') initial[STORAGE_KEYS.scanEnabled] = true;
	if (typeof interval !== 'number') initial[STORAGE_KEYS.scanIntervalMin] = 15;
	if (Object.keys(initial).length) await writeLocal(initial);
	await scheduleAlarmFromSettings();
});

chrome.runtime.onStartup?.addListener(() => {
	scheduleAlarmFromSettings().catch(() => {});
});

chrome.storage.onChanged.addListener((changes, area) => {
	if (area !== 'local') return;
	if (changes[STORAGE_KEYS.scanEnabled] || changes[STORAGE_KEYS.scanIntervalMin]) {
		scheduleAlarmFromSettings().catch(() => {});
	}
});

// Alarm handler
chrome.alarms.onAlarm.addListener((alarm) => {
	if (alarm.name === 'followers_check') {
		periodicFollowersCheck().catch(() => {});
	}
});
