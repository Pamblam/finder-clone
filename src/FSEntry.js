class FSEntry {
	constructor(name, size, kind, date) {
		this.name = name;
		this.size = size;
		this.kind = kind;
		this.date = date;
		this.children = null;
		this.parent = null;
		this.expanded = false;
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

	getName(indent_level=0) {
		// We render the carat even for non-folder entries
		// this way everything stays evenly lined up
		// for non-folder entries we just make it invisible
		let opacity = this.kind.toLowerCase() == 'folder' ? '1' : `0`;
		let rotation = this.expanded ? 90 : 0;
		let carat_style = `style="opacity: ${opacity}; transform: rotate(${rotation}deg);"`;
		let carat = `<i class="fa-solid fa-angle-right" ${carat_style}></i>`;
		let indent = "&nbsp;&nbsp;&nbsp;&nbsp;".repeat(indent_level);
		return `<span class='ft-name-span'>${indent}${carat} ${this.getIcon()} ${this.name}</span>`;
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

	getPath(path_separator='/'){
		let parent = this.parent;
		let path_parts = [this.name];
		while(parent !== null){
			path_parts.unshift(parent.name);
			parent = parent.parent;
		}
		let path = path_separator + path_parts.join(path_separator);
		if(this.kind === 'Folder') path += path_separator;
		return path;
	}
}
export {FSEntry};