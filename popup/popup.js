function setStatus(text){
	const el=document.getElementById('status');
	el.textContent=text||'';
}

function formatTime(ts){
	try{ return new Date(ts).toLocaleString(); }catch{return ''}
}

function renderHistory(items){
	const ul=document.getElementById('history');
	ul.innerHTML='';
	for(const ev of items){
		const li=document.createElement('li');
		const pill=document.createElement('span');
		pill.className='pill '+(ev.type==='unfollow'?'pill-unfollow':'pill-interaction');
		pill.textContent=ev.type==='unfollow'?'Unfollow':'Interaction';
		li.appendChild(pill);
		li.append(' ');
		li.append(ev.username||'(inconnu)');
		li.append(' • ');
		li.append(formatTime(ev.at));
		ul.appendChild(li);
	}
}

async function getHistory(){
	return new Promise((resolve)=>{
		chrome.runtime.sendMessage({type:'GET_HISTORY'},(res)=>{
			if(res?.ok){ resolve(res.history||[]); } else { resolve([]); }
		});
	});
}

async function manualScanFollowers(){
	setStatus('Scan des abonnés en cours... Ouvrez votre profil Instagram.');
	chrome.runtime.sendMessage({type:'MANUAL_SCAN_FOLLOWERS'}, async (res)=>{
		if(!res?.ok){
			if(res?.reason==='no_instagram_tab') setStatus("Aucun onglet Instagram ouvert.");
			else if(res?.reason==='not_on_profile_or_modal_failed') setStatus("Ouvrez votre profil Instagram et réessayez.");
			else setStatus('Le scan a échoué.');
			return;
		}
		const unfCount=(res.unfollowers||[]).length;
		setStatus(`Scan terminé. Abonnés total: ${res.count}. Unfollows détectés: ${unfCount}.`);
		const history=await getHistory();
		renderHistory(history);
	});
}

async function scanInteractions(){
	setStatus('Scan des interactions… Allez sur \'/accounts/activity/\' pour de meilleurs résultats.');
	// Envoyer un message à l’onglet actif instagram
	const tabs = await chrome.tabs.query({url:'https://www.instagram.com/*'});
	if(!tabs || tabs.length===0){ setStatus('Aucun onglet Instagram ouvert.'); return; }
	const target=tabs[0];
	chrome.tabs.sendMessage(target.id,{type:'SCRAPE_INTERACTIONS'},(res)=>{
		if(!res?.ok){ setStatus('Impossible de lire les interactions.'); return; }
		chrome.runtime.sendMessage({type:'SAVE_INTERACTIONS', interactions: res.interactions||[]}, async (ack)=>{
			if(ack?.ok){
				setStatus(`Interactions sauvegardées: ${ack.saved}.`);
				const history=await getHistory();
				renderHistory(history);
			}else{
				setStatus('Erreur en sauvegardant les interactions.');
			}
		});
	});
}

function openOptions(){
	if(chrome.runtime.openOptionsPage){
		chrome.runtime.openOptionsPage();
	}else{
		window.open('options/options.html');
	}
}

function openFollowersPage(){
	const url=chrome.runtime.getURL('pages/followers.html');
	chrome.tabs.create({ url });
}

async function init(){
	document.getElementById('btn-scan-followers').addEventListener('click', manualScanFollowers);
	document.getElementById('btn-scan-interactions').addEventListener('click', scanInteractions);
	document.getElementById('btn-open-options').addEventListener('click', openOptions);
	document.getElementById('btn-open-followers').addEventListener('click', openFollowersPage);
	const history=await getHistory();
	renderHistory(history);
}

document.addEventListener('DOMContentLoaded', init);
