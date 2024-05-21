import { FSEntry, FSTable } from "../dist/FSTable.min.js";
import FI from "./file-input.js";

// Instantiate the table
let path_prefix = '';
let ele = document.querySelector('#fstable');

let fi = new FI({multi: true});
let fsTable = new FSTable(ele, '', false, fi);

let backbtn = document.getElementById('backbtn');
backbtn.addEventListener('click', function(){
	fsTable.back();
	if(!fsTable.history.length){
		backbtn.style.display = 'none';
	}
});

document.getElementById('mode').addEventListener('input', function(e){
	fsTable.setLightMode(this.checked);
	// document.body.style.backgroundColor = this.checked ? '#f2f2f3' : null;
});

fsTable.on('folder.expand', async function(entry, historyChanged){
	let path = entry.getPath();
	document.getElementById('last_action').insertAdjacentHTML('afterbegin', `<div>Expanded folder: ${path}</div>`);

	// If this folder hasn't been loaded yet, load it's children
	if(!entry.children){
		let files = await getFiles(path);
		let fsEntries = files.map(f=>new FSEntry(f.basename, f.bytes, f.type, f.unix_timestamp));
		fsTable.addEntries(fsEntries, entry);
	} 

	// Show the back button if the history has been changed
	if(historyChanged){
		backbtn.style.display = null;
	}
});

fsTable.on('row.ctxmenu', function(entry){
	let path = entry.getPath();
	document.getElementById('last_action').insertAdjacentHTML('afterbegin', `<div>Context menu opened for: ${path}</div>`);

	let opts = [
		{label: 'Get path', action(){ alert(path); }},
		{label: 'Get name', action(){ alert(entry.name); }},
		'-',
		{label: 'Delete', action(){ 
			fsTable.removeEntry(entry);
			fsTable.renderTable();
		}}
	];

	// Set context menu options
	if(entry.kind === 'Folder'){
		opts.push({label: "Add File", async action(){
			let fname = prompt('Enter a file name:');
			let fsEntries = [];
			if(!entry.children){
				let files = await getFiles(path);
				fsEntries = files.map(f=>new FSEntry(f.basename, f.bytes, f.type, f.unix_timestamp));
				fsTable.addEntries(fsEntries, entry);
			}
			fsEntries.push(new FSEntry(fname, 0, 'File', new Date().getTime()/1000 ));
			fsTable.addEntries(fsEntries, entry);
			fsTable.renderTable();
		}});
	}else{
		opts.push({label: 'Rename', action(){ 
			entry.name = prompt('Enter new name:');
			fsTable.renderTable();
		}});
	}

	fsTable.setContextMenuOptions(opts);
});

fsTable.on('folder.collapse', function(entry){
	let path = entry.getPath();
	document.getElementById('last_action').insertAdjacentHTML('afterbegin', `<div>Collapsed folder: ${path}</div>`);
});

fsTable.on('row.click', function(entry){
	let path = entry.getPath();
	document.getElementById('last_action').insertAdjacentHTML('afterbegin', `<div>Row clicked: ${path}</div>`);
});

fsTable.on('table.sort', function(column, direction){
	document.getElementById('last_action').insertAdjacentHTML('afterbegin', `<div>Table sorted by ${column}, ${direction}</div>`);
});

fsTable.on('row.dblclick', async function(entry){
	let path = entry.getPath();
	document.getElementById('last_action').insertAdjacentHTML('afterbegin', `<div>Row double clicked: ${path}</div>`);
});

// Load the root directory
let files = await getFiles('/');
let fsEntries = files.map(f=>new FSEntry(f.basename, f.bytes, f.type, f.unix_timestamp));
fsTable.addEntries(fsEntries);

async function getFiles(path){
	path = (path_prefix+path).split('/').filter(p=>!!p);
	let files = await fetch('./assets/filesystem.json').then(r=>r.json());
	for(let i=0; i<path.length; i++) files = files[path[i]].children;
	return Object.keys(files).map(basename=>({
		basename, 
		type: files[basename].type, 
		bytes: files[basename].bytes, 
		unix_timestamp: files[basename].unix_timestamp
	}));
}