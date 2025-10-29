// Wait helper
function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// Ensure followers modal is open on profile page; return the scroll container element
async function openFollowersModal() {
	// Detect profile page
	// URL like: https://www.instagram.com/<username>/
	if (!/^https:\/\/www\.instagram\.com\/[^/]+\/?$/.test(location.href)) {
		return null;
	}
	// Find and click the followers link in the header counters
	const counters = document.querySelectorAll('header a, header li a');
	let followersLink = null;
	for (const a of counters) {
		if (/followers|abonnés|abonne|followers?/i.test(a.textContent || '')) {
			followersLink = a;
			break;
		}
	}
	if (!followersLink) return null;
	followersLink.click();
	// Wait for modal
	for (let i = 0; i < 20; i++) {
		const scrollEl = document.querySelector('div[role="dialog"] div[role="dialog"] div[style*="overflow"]')
			|| document.querySelector('div[role="dialog"] [data-visualcompletion] div[style*="overflow"]')
			|| document.querySelector('div[role="dialog"] div[style*="overflow"]');
		if (scrollEl) return scrollEl;
		await sleep(300);
	}
	return null;
}

// Extract usernames from the currently loaded list items in the followers modal
function collectUsernamesFromModal() {
	const items = document.querySelectorAll('div[role="dialog"] a[href^="/"]:not([role="button"])');
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

// Scroll the modal to load all followers (best-effort with cap)
async function loadAllFollowers(scrollEl, maxScrolls = 200, step = 1000) {
	let lastCount = 0;
	for (let i = 0; i < maxScrolls; i++) {
		scrollEl.scrollTop = scrollEl.scrollHeight;
		await sleep(600);
		const current = collectUsernamesFromModal().length;
		if (current === lastCount) {
			// one extra wait to be sure
			await sleep(600);
			const current2 = collectUsernamesFromModal().length;
			if (current2 === lastCount) break;
		}
		lastCount = current;
	}
}

async function scanFollowers() {
	const scrollEl = await openFollowersModal();
	if (!scrollEl) {
		return { ok: false, reason: 'not_on_profile_or_modal_failed' };
	}
	await loadAllFollowers(scrollEl);
	const usernames = collectUsernamesFromModal();
	// Close modal (best effort)
	const closeBtn = document.querySelector('div[role="dialog"] button svg[aria-label="Close"], div[role="dialog"] button[aria-label="Close"]')
		?.closest('button');
	try { closeBtn && closeBtn.click(); } catch {}
	return { ok: true, usernames };
}

// Experimental: scrape recent interactions from /accounts/activity/ page
function scrapeRecentInteractions() {
	// This page lists likes/comments; we collect profile links shown
	const links = document.querySelectorAll('a[href^="/"]');
	const usernames = new Set();
	for (const a of links) {
		const href = a.getAttribute('href') || '';
		const match = href.match(/^\/([^/]+)\/$/);
		if (match && match[1] && !['accounts', 'explore', 'reels', 'stories'].includes(match[1])) {
			// Heuristic: ensure the link is inside activity container
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
