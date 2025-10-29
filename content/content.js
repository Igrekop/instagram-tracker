// Wait helper
function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function isProfilePage(url){
	return /^https:\/\/www\.instagram\.com\/([^/]+)\/?$/.test(url);
}
function extractUsername(url){
	const m = url.match(/^https:\/\/www\.instagram\.com\/([^/]+)\/?$/);
	return m ? m[1] : null;
}
function isFollowersPage(url){
	return /^https:\/\/www\.instagram\.com\/[^/]+\/followers\/?$/.test(url);
}

function robustClick(el){
	try{
		['mousedown','mouseup','click'].forEach(type=>{
			el.dispatchEvent(new MouseEvent(type,{bubbles:true,cancelable:true,view:window}));
		});
	}catch{
		try{ el.click(); }catch{}
	}
}

// Try to find the scrollable container inside followers UI (modal/page)
function findFollowersScrollContainer() {
	const dialog = document.querySelector('div[role="dialog"]');
	if (dialog) {
		const candidates = dialog.querySelectorAll('*');
		let best = null;
		let bestScore = -1;
		for (const el of candidates) {
			const style = getComputedStyle(el);
			const canScrollY = /(auto|scroll)/.test(style.overflowY || '') || el.scrollHeight > el.clientHeight + 50;
			if (!canScrollY) continue;
			const linkCount = el.querySelectorAll('a[href^="/"]').length;
			const score = linkCount * 1000 + el.scrollHeight;
			if (score > bestScore) { best = el; bestScore = score; }
		}
		if (best) return best;
	}
	return (document.scrollingElement || document.documentElement);
}

// Ensure followers UI is open; return the scroll container element
async function openFollowersUIAndGetScrollContainer() {
	if (isFollowersPage(location.href)) {
		for (let i = 0; i < 20; i++) {
			const sc = findFollowersScrollContainer();
			if (sc) {
				// Laisse le DOM initialiser le lazy-loading
				await sleep(1200);
				return sc;
			}
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
	robustClick(followersLink);
	// Wait for modal and scroll container
	for (let i = 0; i < 15; i++) {
		const sc = findFollowersScrollContainer();
		if (document.querySelector('div[role="dialog"]') && sc) {
			// Petite pause avant de scroller la modale
			await sleep(1200);
			return sc;
		}
		await sleep(150);
	}
	// Modal non détectée: naviguer vers /followers/
	const username = extractUsername(location.href);
	if (username) {
		setTimeout(()=>{ try{ location.assign(`/${username}/followers/`); }catch{} }, 0);
		return 'NAVIGATING_TO_FOLLOWERS_PAGE';
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
		const match = href.match(/^\/([^/]+)\/$/);
		if (match && match[1] && !['explore', 'accounts', 'reels', 'stories'].includes(match[1])) {
			usernames.add(match[1]);
		}
	}
	return Array.from(usernames);
}

function dispatchWheel(target, dy){
	try{
		const evt = new WheelEvent('wheel', { deltaY: dy, bubbles: true, cancelable: true });
		target.dispatchEvent(evt);
	}catch{}
}

function ensureFocusable(el){
	try{
		if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex','-1');
		el.focus({ preventScroll: true });
	}catch{}
}

// Warm-up to trigger lazy-loading even when page just opened
async function warmUpScrolling(scrollEl){
	ensureFocusable(scrollEl);
	const inModal = !!document.querySelector('div[role="dialog"]');
	for (let i=0;i<6;i++){
		if (!inModal && isFollowersPage(location.href)) {
			window.scrollBy(0, 200);
			await sleep(120);
			window.scrollBy(0, -150);
		}else{
			scrollEl.scrollTop += 220;
			dispatchWheel(scrollEl, 220);
			await sleep(140);
			scrollEl.scrollTop -= 150;
			dispatchWheel(scrollEl, -120);
		}
		await sleep(120);
	}
	if (!inModal && isFollowersPage(location.href)) {
		window.scrollTo(0, document.documentElement.scrollHeight);
	}else{
		scrollEl.scrollTop = scrollEl.scrollHeight;
		dispatchWheel(scrollEl, 300);
	}
	await sleep(400);
}

// Scroll until no new usernames are loaded for several iterations
async function loadAllFollowers(scrollEl, options = {}) {
	const {
		maxIterations = 800,
		settleRounds = 3,
		waitMs = 700
	} = options;
	await warmUpScrolling(scrollEl);
	let lastCount = collectUsernames(scrollEl).length;
	let stableRounds = 0;
	const inModal = !!document.querySelector('div[role="dialog"]');
	for (let i = 0; i < maxIterations; i++) {
		if (!inModal && isFollowersPage(location.href)) {
			window.scrollTo(0, document.documentElement.scrollHeight);
		}else{
			scrollEl.scrollTop = scrollEl.scrollHeight;
			dispatchWheel(scrollEl, 300);
		}
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
	const scOrSignal = await openFollowersUIAndGetScrollContainer();
	if (scOrSignal === 'NAVIGATING_TO_FOLLOWERS_PAGE') {
		return { ok: false, reason: 'navigating_to_followers' };
	}
	const scrollEl = scOrSignal;
	if (!scrollEl) {
		return { ok: false, reason: 'not_on_profile_or_modal_failed' };
	}
	await loadAllFollowers(scrollEl);
	const usernames = collectUsernames(scrollEl);
	if (!isFollowersPage(location.href)) {
		const closeBtn = document.querySelector('div[role="dialog"] button svg[aria-label="Close"], div[role="dialog"] button[aria-label="Close"]')
			?.closest('button');
		try { closeBtn && closeBtn.click(); } catch {}
	}
	return { ok: true, usernames };
}

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
