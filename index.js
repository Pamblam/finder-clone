class FSEntry {
	constructor(name, size, kind, date) {
		this.name = name;
		this.size = size;
		this.kind = kind;
		this.date = date;
		this.children = null;
		this.parent = null;
	}

	getIcon() {
		switch (this.kind.toLowerCase()) {
			case 'spreadsheet':
				return `<i class="fa-solid fa-file-excel"></i>`;
			case 'document':
				return `<i class="fa-solid fa-file-word"></i>`;
			case 'pdf':
				return '<i class="fa-solid fa-file-pdf"></i>';
			case 'archive':
				return '<i class="fa-solid fa-file-zipper"></i>';
			case 'video':
				return '<i class="fa-solid fa-file-video"></i>';
			case 'powerpoint':
				return '<i class="fa-solid fa-file-powerpoint"></i>';
			case 'image':
				return '<i class="fa-solid fa-file-image"></i>';
			case 'code':
				return '<i class="fa-solid fa-file-code"></i>';
			case 'audio':
				return '<i class="fa-solid fa-file-audio"></i>';
			case 'folder':
				return '<i class="fa-solid fa-folder"></i>';
			default:
				return '<i class="fa-solid fa-file"></i>';
		}
	}

	getName() {
		return `<i class="fa-solid fa-angle-right" ${(this.kind.toLowerCase() == 'folder' ? '' : `style='opacity:0'`)}></i> ${this.getIcon()} ${this.name}`;
	}

	getSize() {
		if (!this.size) return '';
		const thresh = 1000;
		const units = ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
		let bytes = this.size;
		if (Math.abs(bytes) < thresh) return bytes + ' B';
		let u = -1;
		const r = 10 ** 1;
		do {
			bytes /= thresh;
			++u;
		} while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);
		return bytes.toFixed(1) + ' ' + units[u];
	}
	getKind() {
		return this.kind;
	}

	getDate() {
		return new Date(this.date * 1000).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});
	}
}

class FSTable {
	constructor(ele) {
		this.entry_counter = 0;
		this.table = document.createElement('div');
		this.entries = [];
		this.table.classList.add('ft-table');
		this.sort_col = 'Name';
		this.sort_dir = 'asc'
		ele.replaceWith(this.table);
	}

	renderTable(){
		this.table.textContent = '';

		// Render the table header
		let header = document.createElement('div');
		header.classList.add('ft-th');
		['Name', 'Size', 'Kind', 'Date'].forEach(prop => {
			let col = document.createElement('div');
			col.classList.add(`ft-td-${prop.toLowerCase()}`);
			let html = `<span class='ft-pull-left'>${prop}</span>`;
			if (this.sort_col === prop) {
				let arr = this.sort_dir === 'asc' ?
					`<i class="fa-solid fa-angle-up"></i>` :
					`<i class="fa-solid fa-angle-down"></i>`;
				html += `<span class='ft-pull-right'>${arr}</span>`;
			}
			html += `<span class='ft-clear'></span>`;
			col.innerHTML = html;
			header.appendChild(col);
		});
		this.table.appendChild(header);

		// add the entries
		let entries = [...this.entries].sort((e1, e2)=>{
			let a = e1[this.sort_col.toLowerCase()];
			let b = e2[this.sort_col.toLowerCase()];
			if(a == b) return 0;
			if(a > b) return this.sort_dir === 'asc' ? 1 : -1;
			if(a < b) return this.sort_dir === 'asc' ? -1 : 1;
		});
		entries.forEach(entry => {
			let row = document.createElement('div');
			row.classList.add('ft-tr');
			['Name', 'Size', 'Kind', 'Date'].forEach(prop => {
				let col = document.createElement('div');
				col.classList.add(`ft-td-${prop.toLowerCase()}`);
				col.innerHTML = entry[`get${prop}`]();
				row.appendChild(col);
			});
			this.table.appendChild(row);
		});

		// Add header event listener
		this.table.querySelectorAll(`.ft-th > div`).forEach(th=>{
			th.addEventListener('click', e=>{
				e.preventDefault();
				let col = 'Name';
				if(e.target.classList.contains('ft-td-size')) col = 'Size';
				if(e.target.classList.contains('ft-td-kind')) col = 'Kind';
				if(e.target.classList.contains('ft-td-date')) col = 'Date';
				if(col === this.sort_col){
					this.sort_dir = this.sort_dir === 'asc' ? 'desc' : 'asc';
				}else{
					this.sort_dir = 'asc';
				}
				this.sort_col = col;
				this.renderTable();
			});
		});
	}

	addEntries(entries) {
		this.entries.push(...entries);
		this.entry_counter += entries.length;
		this.renderTable();
	}
}

let data = [
	new FSEntry("item 1.png", 123432451, "Image", 123451234),
	new FSEntry("my docs", null, "Folder", 345653456),
	new FSEntry("my file.docx", 1423452344, "Document", 123412634),
	new FSEntry("video.mp4", 12312, "Video", 123413234),
];

let ele = document.querySelector('#fstable');
let fsTable = new FSTable(ele);

fsTable.addEntries(data);