function setStatus(text){
	document.getElementById('status').textContent=text||'';
}

async function readLocal(keys){
	return new Promise((resolve)=>chrome.storage.local.get(keys,(items)=>resolve(items)));
}
async function writeLocal(obj){
	return new Promise((resolve)=>chrome.storage.local.set(obj,()=>resolve()));
}

async function load(){
	const { scan_enabled, scan_interval_min } = await readLocal(['scan_enabled','scan_interval_min']);
	const enabled = typeof scan_enabled==='boolean' ? scan_enabled : true;
	const interval = typeof scan_interval_min==='number' ? scan_interval_min : 15;
	document.getElementById('scan-enabled').checked = enabled;
	document.getElementById('scan-interval').value = String(interval);
}

async function save(){
	const enabled = document.getElementById('scan-enabled').checked;
	const val = parseInt(document.getElementById('scan-interval').value,10);
	const interval = Number.isFinite(val) && val>=1 ? val : 15;
	await writeLocal({ scan_enabled: enabled, scan_interval_min: interval });
	setStatus('Paramètres enregistrés.');
}

async function resetDefaults(){
	await writeLocal({ scan_enabled: true, scan_interval_min: 15 });
	await load();
	setStatus('Paramètres réinitialisés.');
}

function init(){
	document.getElementById('save').addEventListener('click', ()=>{ save().catch(()=>setStatus('Erreur lors de la sauvegarde.')); });
	document.getElementById('reset').addEventListener('click', ()=>{ resetDefaults().catch(()=>setStatus('Erreur lors de la réinitialisation.')); });
	load().catch(()=>setStatus('Impossible de charger les paramètres.'));
}

document.addEventListener('DOMContentLoaded', init);
