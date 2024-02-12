import { FSEntry, FSTable } from "../dist/FSTable.min.js";

let data = [
	new FSEntry("item 1.png", 123432451, "Image", 123451234),
	new FSEntry("my docs", null, "Folder", 345653456),
	new FSEntry("my file.docx", 1423452344, "Document", 123412634),
	new FSEntry("video.mp4", 12312, "Video", 123413234),
];

let ele = document.querySelector('#fstable');

let fsTable = new FSTable(ele);

fsTable.on('folder.expand', function(entry){
	let path = entry.getPath();
	document.getElementById('last_action').innerHTML = `Expanded folder: ${path}`;
	if(!entry.children){
		if('/my docs/' === path){
			fsTable.addEntries([
				new FSEntry("anpther test.png", 123437451, "Image", 123431234),
				new FSEntry("ntoes.xls", 123439451, "Spreadsheet", 345653456),
				new FSEntry("favorite files", null, "Folder", 345657456),
			], entry);
		}
		if('/my docs/favorite files/' === path){
			fsTable.addEntries([
				new FSEntry("my presentation.ppt", 123437451, "Powerpoint", 123431234),
				new FSEntry("nintendo cheat codes.txt", 123939451, "File", 345653456)
			], entry);
		}
	}
});

fsTable.on('folder.collapse', function(entry){
	document.getElementById('last_action').innerHTML = `Collapsed folder: ${entry.getPath()}`;
});

fsTable.on('file.click', function(entry){
	document.getElementById('last_action').innerHTML = `File clicked: ${entry.getPath()}`;
});

fsTable.on('row.click', function(entry){
	document.getElementById('last_action').innerHTML = `Row clicked: ${entry.getPath()}`;
});

fsTable.addEntries(data);