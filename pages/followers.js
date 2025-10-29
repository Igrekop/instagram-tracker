function setStatus(text){
	document.getElementById('status').textContent=text||'';
}
function setMeta(text){
	document.getElementById('meta').textContent=text||'';
}
function renderUsernames(list){
	const tbody=document.getElementById('tbody');
	tbody.innerHTML='';
	list.forEach((u,idx)=>{
		const tr=document.createElement('tr');
		const c1=document.createElement('td'); c1.textContent=String(idx+1);
		const c2=document.createElement('td'); c2.textContent=u;
		tr.appendChild(c1); tr.appendChild(c2);
		tbody.appendChild(tr);
	});
}

function toCsv(list){
	const lines=['username'];
	for(const u of list){ lines.push(JSON.stringify(u)); }
	return lines.join('\n');
}

async function loadSnapshot(){
	return new Promise((resolve)=>{
		chrome.runtime.sendMessage({type:'GET_SNAPSHOT'},(res)=>{
			if(res?.ok){ resolve(res); } else { resolve({ok:false,usernames:[],lastScanAt:null}); }
		});
	});
}

function openDownload(filename, content, mime='text/csv'){
	const blob=new Blob([content],{type:mime});
	const url=URL.createObjectURL(blob);
	const a=document.createElement('a');
	a.href=url; a.download=filename; document.body.appendChild(a); a.click();
	setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 0);
}

async function init(){
	setStatus('Chargement de l\'instantané...');
	const res=await loadSnapshot();
	renderUsernames(res.usernames||[]);
	setStatus('');
	setMeta(res.lastScanAt? `Dernier enregistrement: ${new Date(res.lastScanAt).toLocaleString()}` : 'Aucun enregistrement.');

	document.getElementById('btn-export').addEventListener('click', ()=>{
		const rows=[...document.querySelectorAll('#tbody tr td:nth-child(2)')].map(td=>td.textContent||'');
		openDownload('followers.csv', toCsv(rows));
	});
}

document.addEventListener('DOMContentLoaded', init);
