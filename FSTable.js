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

class FSTable {
	constructor(ele, onExpand) {
		this.entry_counter = 0;
		this.table = document.createElement('div');
		this.entries = [];
		this.entries_map = {};
		this.table.classList.add('ft-table');
		this.sort_col = 'Name';
		this.sort_dir = 'asc';
		this.user_callbacks = {
			'folder.expand': [],
			'folder.collapse': [],
			'file.click': []
		};
		this.onExpand = onExpand;
		this.col_widths = {};
		this.col_sizes_json = ''; // a string used to keep track of whether or not table col widths have changed
		ele.replaceWith(this.table);

		this._onResize = e => {
			let cols = this.calculateColumnSizes();
			if(cols === false) return;
			let [namen, sizen, kindn, daten] = cols;
			this.table.querySelectorAll(".ft-td-name").forEach(ele=>ele.style.width=`${namen}px`);
			this.table.querySelectorAll(".ft-td-kind").forEach(ele=>ele.style.width=`${kindn}px`);
			this.table.querySelectorAll(".ft-td-size").forEach(ele=>ele.style.width=`${sizen}px`);
			this.table.querySelectorAll(".ft-td-date").forEach(ele=>ele.style.width=`${daten}px`);
		};
		addEventListener("resize", this._onResize);
	}

	on(event, callback){
		this.user_callbacks[event].push(callback);
	}

	off(event, callback){
		this.user_callbacks[event] = this.user_callbacks[event].filter(cb=>{
			return cb !== callback;
		});
	}

	getMinRequiredWidth(ele){
		let orig_width = ele.style.width;
		ele.style.width = '1px';
		let reqd_width = ele.scrollWidth;
		ele.style.width = orig_width;
		return reqd_width;
	}

	getAllMinWidths(){
		let name_col_min_widths = [...this.table.querySelectorAll(".ft-td-name")].map(this.getMinRequiredWidth);
		let min_name_col_width = Math.max(...name_col_min_widths);
		let size_col_min_widths = [...this.table.querySelectorAll(".ft-td-size")].map(this.getMinRequiredWidth);
		let min_size_col_width = Math.max(...size_col_min_widths);
		let kind_col_min_widths = [...this.table.querySelectorAll(".ft-td-kind")].map(this.getMinRequiredWidth);
		let min_kind_col_width = Math.max(...kind_col_min_widths);
		let date_col_min_widths = [...this.table.querySelectorAll(".ft-td-date")].map(this.getMinRequiredWidth);
		let min_date_col_width = Math.max(...date_col_min_widths);
		return [min_name_col_width, min_size_col_width, min_kind_col_width, min_date_col_width];
	}

	getActualWidth(ele){
		let w = getComputedStyle(ele).getPropertyValue("width");
		return +w.substring(0, w.length-2);
	}

	getAllActualWidths(){
		let name = this.getActualWidth(this.table.querySelector(".ft-td-name"));
		let size = this.getActualWidth(this.table.querySelector(".ft-td-size"));
		let kind = this.getActualWidth(this.table.querySelector(".ft-td-kind"));
		let date = this.getActualWidth(this.table.querySelector(".ft-td-date"));
		return [name, size, kind, date];
	}

	getHorizontalMarginPaddingBorder(ele){
		return [
			"margin-left",
			"margin-right",
			"border-left-width",
			"border-right-width",
			"padding-left",
			"padding-right"
		].map(p=>{
			let v = getComputedStyle(ele).getPropertyValue(p);
			return +v.substring(0, v.length-2);
		}).reduce((a, c)=>a + c, 0);
	}

	getAllColsMPB(){
		return this.getHorizontalMarginPaddingBorder(this.table.querySelector(".ft-td-name"))
		 + this.getHorizontalMarginPaddingBorder(this.table.querySelector(".ft-td-size"))
		 + this.getHorizontalMarginPaddingBorder(this.table.querySelector(".ft-td-kind"))
		 + this.getHorizontalMarginPaddingBorder(this.table.querySelector(".ft-td-date"))
	}

	getAvailableTableWidth(){
		return this.getActualWidth(this.table.querySelector(".ft-tr")) - this.getAllColsMPB();
	}

	calculateColumnSizes(){
		// Get the minimum required widths of all the columns in order to prevent any overflow
		let mins = this.getAllMinWidths();
		let totala = this.getAvailableTableWidth();
		let [namem, sizem, kindm, datem] = mins;

		// if nothing has changed since the last time we checked, we don't need to do anything
		let col_sizes_json = JSON.stringify([totala, ...mins]);
		if(this.col_sizes_json === col_sizes_json){
			this.resizing = false; 
			return false;
		} 
		this.col_sizes_json = col_sizes_json;

		// Get the actual widths of the columns as they are
		let actual = this.getAllActualWidths();
		let [namea, sizea, kinda, datea] = actual;

		// if the total required width is less than the the total table width, 
		// calculate how to distribute the remaining extra width
		let tablem = namem + sizem + kindm + datem;
		let tablen, namen, sizen, kindn, daten;
		if(totala >= tablem){
			this.table.style.minWidth = null;
			let remaining_width = totala - tablem;

			// date col gets 25% of remaining width, 
			// but not more than 10px more than the minimum required
			daten = Math.floor(Math.min(datem + (remaining_width * .25), datem + 10));
			remaining_width -= (daten - datem);

			// kind col gets 12.5% of remaining width, 
			// but not more than 10px more than the minimum required
			kindn = Math.floor(Math.min(kindm + (remaining_width * .125), kindm + 10));
			remaining_width -= (kindn - kindm);

			// size col gets 12.5% of remaining width, 
			// but not more than 10px more than the minimum required
			sizen = Math.floor(Math.min(sizem + (remaining_width * .125), sizem + 10));
			remaining_width -= (sizen - sizem);
			
			// Name gets whatever's left
			namen = namem + remaining_width;
		}else{
			// not enough horizontal space to show everything, 
			// so everything gets the min required space and we add a scrollbar
			this.table.style.minWidth = `${tablem + this.getAllColsMPB()}px`;
			namen = namem;
			sizen = sizem;
			kindn = kindm;
			daten = datem;
		}

		this.col_widths.name = namen;
		this.col_widths.size = sizen;
		this.col_widths.kind = kindn;
		this.col_widths.date = daten;

		return [namen, sizen, kindn, daten, namea, sizea, kinda, datea];
	}

	async resizeTable(){
		if(this.resizing) return;
		this.resizing = true;

		let cols = this.calculateColumnSizes();
		if(cols === false){
			this.resizing = false;
			return false;
		}

		let [namen, sizen, kindn, daten, namea, sizea, kinda, datea] = cols;

		// Change all the sizes
		let name_cols = [...this.table.querySelectorAll(".ft-td-name")];
		let kind_cols = [...this.table.querySelectorAll(".ft-td-kind")];
		let size_cols = [...this.table.querySelectorAll(".ft-td-size")];
		let date_cols = [...this.table.querySelectorAll(".ft-td-date")];
		await Promise.all([
			...name_cols.map(e=>this.animate(e, 'width', namea, namen, v=>`${v}px`, 150)),
			...kind_cols.map(e=>this.animate(e, 'width', kinda, kindn, v=>`${v}px`, 150)),
			...size_cols.map(e=>this.animate(e, 'width', sizea, sizen, v=>`${v}px`, 150)),
			...date_cols.map(e=>this.animate(e, 'width', datea, daten, v=>`${v}px`, 150)),
		]);

		this.resizing = false;
	}

	getSortedEntries(entries){
		return [...entries].sort((e1, e2)=>{
			let a = e1[this.sort_col.toLowerCase()];
			let b = e2[this.sort_col.toLowerCase()];
			if(a == b) return 0;
			if(a > b) return this.sort_dir === 'asc' ? 1 : -1;
			if(a < b) return this.sort_dir === 'asc' ? -1 : 1;
		});
	}

	renderTable(){
		this.table.textContent = '';

		// Render the table header
		let header = document.createElement('div');
		header.classList.add('ft-th');
		['Name', 'Size', 'Kind', 'Date'].forEach(prop => {
			let col = document.createElement('div');
			col.classList.add(`ft-td-${prop.toLowerCase()}`);

			if(this.col_widths[prop.toLowerCase()]){
				col.style.width = `${this.col_widths[prop.toLowerCase()]}px`;
			}

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
		let entries = this.getSortedEntries(this.entries);
		(function renderEntries(context, entries, parent_id=null, parent_expanded=true, indent_level=0, ancestor_collapsed=false){
			entries.forEach(entry => {
				let row = document.createElement('div');
				row.dataset.eid = entry.id;
				row.classList.add('ft-tr');
				if(!parent_expanded || ancestor_collapsed){
					row.style.display = 'none';
					ancestor_collapsed = true;
				}
				if(parent_id){
					row.dataset.pid = parent_id;
				}
				['Name', 'Size', 'Kind', 'Date'].forEach(prop => {
					let col = document.createElement('div');
					col.classList.add(`ft-td-${prop.toLowerCase()}`);

					if(context.col_widths[prop.toLowerCase()]){
						col.style.width = `${context.col_widths[prop.toLowerCase()]}px`;
					}

					let htmlContent;
					if('Name' === prop){
						htmlContent = entry.getName(indent_level);
					}else{
						htmlContent = entry[`get${prop}`]();
					}
					col.innerHTML = htmlContent;
					row.appendChild(col);
				});
				context.table.appendChild(row);

				// Render children rows
				if(entry.kind.toLowerCase() === 'folder' && Array.isArray(entry.children)){
					let entries = context.getSortedEntries(entry.children);
					renderEntries(context, entries, entry.id, entry.expanded, indent_level+1, ancestor_collapsed);
				}

			});
		})(this, entries);
		this.addTableStripes();

		// Add header event listener
		this.table.querySelectorAll(`.ft-th > div`).forEach(th=>{
			th.addEventListener('click', e=>{
				e.preventDefault();
				let col;
				if(e.currentTarget.classList.contains('ft-td-size')) col = 'Size';
				if(e.currentTarget.classList.contains('ft-td-kind')) col = 'Kind';
				if(e.currentTarget.classList.contains('ft-td-date')) col = 'Date';
				if(e.currentTarget.classList.contains('ft-td-name')) col = 'Name';
				if(col){
					if(col === this.sort_col){
						this.sort_dir = this.sort_dir === 'asc' ? 'desc' : 'asc';
					}else{
						this.sort_dir = 'asc';
					}
					this.sort_col = col;
					this.renderTable();
				}
				
			});
		});

		// Add folder event listener
		this.table.querySelectorAll(`.ft-name-span`).forEach(na=>{
			na.addEventListener('click', async e=>{
				e.preventDefault();
				let entry_id = na.parentElement.parentElement.dataset.eid;
				let entry = this.entries_map[entry_id];

				if(entry.kind === 'Folder'){
					if(entry.expanded){
						let promises = this.user_callbacks['folder.collapse'].map(cb=>{
							return Promise.resolve(cb(entry));
						});
						await Promise.all(promises);

						// if the user callback re-rendered the table, our reference to `na` will be lost
						// so we need to find it again
						let row = document.querySelector(`.ft-tr[data-eid="${entry_id}"]`);
						na = row.querySelector(`.ft-name-span`);

						let arr = na.parentElement.querySelector('.fa-angle-right');
						await this.animate(arr, 'transform', 90, 0, v=>`rotate(${v}deg)`, 150);

						// hide ALL the children entries
						this.getAllChildrenIds(entry).forEach(entry_id=>{
							document.querySelector(`.ft-tr[data-eid="${entry_id}"]`).style.display = 'none';
						});

						entry.expanded = false;
						this.addTableStripes();
						this.resizeTable();

					}else{
						// Expand a folder
						let promises = this.user_callbacks['folder.expand'].map(cb=>{
							return Promise.resolve(cb(entry));
						});
						await Promise.all(promises);

						// if the user callback re-rendered the table, our reference to `na` will be lost
						// so we need to find it again
						let row = document.querySelector(`.ft-tr[data-eid="${entry_id}"]`);
						na = row.querySelector(`.ft-name-span`);

						let arr = na.parentElement.querySelector('.fa-angle-right');
						await this.animate(arr, 'transform', 0, 90, v=>`rotate(${v}deg)`, 150);

						// show the children entries that are expanded
						(function iterateChildren(e, shown){
							if(Array.isArray(e.children)){
								e.children.forEach(ch=>{
									document.querySelector(`.ft-tr[data-eid="${ch.id}"]`).style.display = shown ? null : 'none';
									if(ch.kind === 'Folder'){
										if(!ch.expanded) shown = false;
										iterateChildren(ch, shown);
									}
								});
							}
						})(entry, true);		

						entry.expanded = true;
						this.addTableStripes();
						this.resizeTable();
					}
				}else{
					// File is clicked
					let promises = this.user_callbacks['file.click'].map(cb=>{
						return Promise.resolve(cb(entry));
					});
					await Promise.all(promises);
				}
				
			});
		});

		this.resizeTable();
	}

	addTableStripes(){
		let idx = 0;
		this.table.querySelectorAll(`.ft-tr`).forEach((tr)=>{
			if(tr.style.display && tr.style.display === 'none') return;
			if(idx % 2 === 0){
				if(!tr.classList.contains('ft-tr-odd')){
					tr.classList.add('ft-tr-odd');
				}
			}else{
				if(tr.classList.contains('ft-tr-odd')){
					tr.classList.remove('ft-tr-odd');
				}
			}
			idx++;
		});
	}

	getAllChildrenIds(entry){
		let ids = [];
		(function getIds(e){
			if(Array.isArray(e.children)){
				e.children.forEach(ch=>{
					ids.push(ch.id);
					if(ch.kind === 'Folder') getIds(ch);
				});
			}
		})(entry);
		return ids;
	}

	addEntries(entries, parent_entry=null) {
		let entry_array;
		if(parent_entry){
			if(!parent_entry.children) parent_entry.children = [];
			entry_array = parent_entry.children;
		}else{
			entry_array = this.entries;
		}
		entry_array.push(...entries.map(e=>{
			e.id = this.entry_counter;
			e.parent = parent_entry;
			this.entries_map[e.id] = e;
			this.entry_counter++;
			return e;
		}));
		this.renderTable();
	}

	animate(element, style_property, start_value, end_value, unit, duration) {
		return new Promise((resolve, reject) => {
			let start_time = Date.now();
			let diff = Math.abs(start_value - end_value);
			(function frame() {
				requestAnimationFrame(() => {
					let time_passed = Date.now() - start_time;
					let percent = time_passed / duration;
					let position_change = diff * percent;
					let position;
					if (start_value > end_value) {
						position = Math.max(start_value - position_change, end_value);
					} else {
						position = Math.min(start_value + position_change, end_value);
					}
					let value;
					if('function' === typeof unit){
						value = unit(position);
					}else{
						value = `${position}${unit}`;
					}
					element.style[style_property] = value;
					if (position == end_value) resolve();
					else frame();
				});
			})();
		});
	}
}

export {FSEntry, FSTable};