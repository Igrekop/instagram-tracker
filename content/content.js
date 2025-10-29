// Wait helper
function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function isProfilePage(url){
	return /^https:\/\/www\.instagram\.com\/[^/]+\/?$/.test(url);
}
function isFollowersPage(url){
	return /^https:\/\/www\.instagram\.com\/[^/]+\/followers\/?$/.test(url);
}

// Try to find the scrollable container inside followers UI (modal/page)
function findFollowersScrollContainer() {
	// Prefer inside dialog
	const dialog = document.querySelector('div[role="dialog"]');
	const candidates = [];
	if (dialog) {
		candidates.push(
			...dialog.querySelectorAll('div, section, main')
		);
	}
	// Fallback: whole document
	candidates.push(...document.querySelectorAll('div, section, main'));
	let best = null;
	let bestScore = -1;
	for (const el of candidates) {
		const style = getComputedStyle(el);
		const canScrollY = /(auto|scroll)/.test(style.overflowY || '') || el.scrollHeight > el.clientHeight + 50;
		const tall = el.scrollHeight;
		const score = (canScrollY ? 1 : 0) * 100000 + tall;
		if (canScrollY && score > bestScore) {
			best = el;
			bestScore = score;
		}
	}
	return best;
}

// Ensure followers UI is open; return the scroll container element
async function openFollowersUIAndGetScrollContainer() {
	if (isFollowersPage(location.href)) {
		// Already on followers page
		for (let i = 0; i < 20; i++) {
			const sc = findFollowersScrollContainer();
			if (sc) return sc;
			await sleep(250);
		}
		return null;
	}
	if (!isProfilePage(location.href)) return null;
	// Click the followers link
	const counters = document.querySelectorAll('header a, header li a');
	let followersLink = null;
	for (const a of counters) {
		if (/followers|abonnés|abonne|abonnés?/i.test(a.textContent || '')) {
			followersLink = a;
			break;
		}
	}
	if (!followersLink) return null;
	followersLink.click();
	// Wait for modal and scroll container
	for (let i = 0; i < 20; i++) {
		const sc = findFollowersScrollContainer();
		if (sc) return sc;
		await sleep(300);
	}
	return null;
}

// Extract usernames from a given root
function collectUsernames(root) {
	const scope = root || document;
	const items = scope.querySelectorAll('a[href^="/"]:not([role="button"])');
	const usernames = new Set();
	for (const el of items) {
		const href = el.getAttribute('href') || '';
		// profile links look like /username/
		const match = href.match(/^\/([^/]+)\/$/);
		if (match && match[1] && !['explore', 'accounts', 'reels', 'stories'].includes(match[1])) {
			usernames.add(match[1]);
		}
	}
	return Array.from(usernames);
}

// Scroll until no new usernames are loaded for several iterations
async function loadAllFollowers(scrollEl, options = {}) {
	const {
		maxIterations = 600,
		settleRounds = 3,
		waitMs = 700
	} = options;
	let lastCount = 0;
	let stableRounds = 0;
	for (let i = 0; i < maxIterations; i++) {
		scrollEl.scrollTop = scrollEl.scrollHeight;
		await sleep(waitMs);
		const current = collectUsernames(scrollEl).length;
		if (current <= lastCount) {
			stableRounds += 1;
			if (stableRounds >= settleRounds) break;
		} else {
			stableRounds = 0;
			lastCount = current;
		}
	}
}

async function scanFollowers() {
	const scrollEl = await openFollowersUIAndGetScrollContainer();
	if (!scrollEl) {
		return { ok: false, reason: 'not_on_profile_or_modal_failed' };
	}
	await loadAllFollowers(scrollEl);
	const usernames = collectUsernames(scrollEl);
	// Close modal if present and not on dedicated page
	if (!isFollowersPage(location.href)) {
		const closeBtn = document.querySelector('div[role="dialog"] button svg[aria-label="Close"], div[role="dialog"] button[aria-label="Close"]')
			?.closest('button');
		try { closeBtn && closeBtn.click(); } catch {}
	}
	return { ok: true, usernames };
}

// Experimental: scrape recent interactions from /accounts/activity/ page
function scrapeRecentInteractions() {
	const links = document.querySelectorAll('a[href^="/"]');
	const usernames = new Set();
	for (const a of links) {
		const href = a.getAttribute('href') || '';
		const match = href.match(/^\/([^/]+)\/$/);
		if (match && match[1] && !['accounts', 'explore', 'reels', 'stories'].includes(match[1])) {
			if (a.closest('main')) usernames.add(match[1]);
		}
	}
	return Array.from(usernames).slice(0, 20);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	(async () => {
		if (message?.type === 'SCAN_FOLLOWERS') {
			const result = await scanFollowers();
			sendResponse(result);
			return;
		}
		if (message?.type === 'SCRAPE_INTERACTIONS') {
			const users = scrapeRecentInteractions();
			sendResponse({ ok: true, interactions: users });
			return;
		}
		sendResponse({ ok: false, reason: 'unknown_message' });
	})();
	return true;
});
