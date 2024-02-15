class FSTable {
	static version = null;
	constructor(ele, onExpand) {
		this.entry_counter = 0;
		this.table = document.createElement('div');
		this.entries = [];
		this.entries_map = {};
		this.table.classList.add('ft-table');
		this.sort_col = 'Name';
		this.sort_dir = 'asc';
		this.ctxmenu = null;
		this.conextMenuOpts = [];
		this.user_callbacks = {
			'folder.expand': [],
			'folder.collapse': [],
			'row.click': [],
			'table.sort': [],
			'row.dblclick': [],
			'row.ctxmenu': []
		};
		this.onExpand = onExpand;
		this.col_widths = {};
		this.col_sizes_json = ''; // a string used to keep track of whether or not table col widths have changed
		ele.replaceWith(this.table);

		// Set up the resize event
		// resize the table when the page is resized
		this._onResize = e => {
			let cols = this.calculateColumnSizes();
			if(cols === false) return;
			let [namen, sizen, kindn, daten] = cols;
			this.table.querySelectorAll(".ft-td-name").forEach(ele=>ele.style.width=`${namen}px`);
			this.table.querySelectorAll(".ft-td-kind").forEach(ele=>ele.style.width=`${kindn}px`);
			this.table.querySelectorAll(".ft-td-size").forEach(ele=>ele.style.width=`${sizen}px`);
			this.table.querySelectorAll(".ft-td-date").forEach(ele=>ele.style.width=`${daten}px`);
			this.removeCtxMenu();
		};
		addEventListener("resize", this._onResize);

		// Set up the document click event
		// remove the context menu if there is a click outside of it
		this._onClick = e => {
			if(this.ctxmenu){
				let ele = e.target;
				while(true){
					if(ele === this.ctxmenu) return;
					if(!ele.parentElement) break;
					ele = ele.parentElement;
				}
				this.removeCtxMenu();
			}
		};
		addEventListener('click', this._onClick);

		// remove the context menu if there is another right click outside of the table rows
		this._onCtxmenu = e => {
			if(this.ctxmenu){

				// if the right click occurs inside the existing context menu, cancel it
				let ele = e.target;
				while(true){
					if(ele.classList.contains('ft-contextmenu')){
						e.preventDefault();
						e.stopPropagation();
						return false;
					}
					if(!ele.parentElement) break;
					ele = ele.parentElement;
				}

				// if the right-click happens in the table rows, remove the existing menu
				ele = e.target;
				while(true){
					if(ele.classList.contains('ft-tr')) return;
					if(!ele.parentElement) break;
					ele = ele.parentElement;
				}
				this.removeCtxMenu();
			}
		};
		addEventListener('contextmenu', this._onCtxmenu, false);
	}

	destroy(){
		removeEventListener("resize", this._onResize);
		removeEventListener("click", this._onClick);
		removeEventListener("contextmenu", this._onCtxmenu);
	}

	setContextMenuOptions(opts){
		this.conextMenuOpts = opts;
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

		return [
			namen, sizen, kindn, daten, // New column sizes
			namea, sizea, kinda, datea  // Current column sizes
		];
	}

	async resizeTable(){
		if(this.resizing) return;
		this.resizing = true;

		let cols = this.calculateColumnSizes();
		if(cols === false){
			this.resizing = false;
			return false;
		}

		let [
			namen, sizen, kindn, daten, // New column sizes
			namea, sizea, kinda, datea  // Current column sizes
		] = cols;

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

	selectEntry(entry){
		Object.keys(this.entries_map).forEach(id=>{
			this.entries_map[id].selected = entry === this.entries_map[id];
		});
		this.table.querySelectorAll(`.ft-tr.active`).forEach(row=>row.classList.remove('active'));
		let row = this.table.querySelector(`.ft-tr[data-eid='${entry.id}']`);
		if(row) row.classList.add('active');
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
				if(entry.selected){
					row.classList.add('active');
				}
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
			th.addEventListener('click', async e=>{
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
				
				let promises = this.user_callbacks['table.sort'].map(cb=>{
					return Promise.resolve(cb(this.sort_col, this.sort_dir));
				});
				await Promise.all(promises);

			});
		});

		// Add row listeners
		this.table.querySelectorAll(`.ft-tr`).forEach(tr=>{

			// Row clicked event listener
			tr.addEventListener('click', async e=>{
				e.preventDefault();

				// don't do anything if the carat is clicked
				let ele = e.target;
				while(true){
					if(ele.classList.contains('folder-carat')) return;
					if(!ele.parentElement) break;
					ele = ele.parentElement;
				}

				let entry_id = tr.dataset.eid;
				let entry = this.entries_map[entry_id];
				this.selectEntry(entry);
	
				let promises = this.user_callbacks['row.click'].map(cb=>{
					return Promise.resolve(cb(entry));
				});
				await Promise.all(promises);
			});

			// Row double clicked event listener
			tr.addEventListener("dblclick", async e=>{
				e.preventDefault();

				let entry_id = tr.dataset.eid;
				let entry = this.entries_map[entry_id];
				this.selectEntry(entry);
	
				let promises = this.user_callbacks['row.dblclick'].map(cb=>{
					return Promise.resolve(cb(entry));
				});
				await Promise.all(promises);
			});

			// Row right-clicked event listener
			tr.addEventListener("contextmenu", async e=>{
				e.preventDefault();

				this.removeCtxMenu();

				// Get cursor position
				let x, y, de = document.documentElement, bd = document.body;
				if (e.pageX) x = e.pageX;
				else if (e.clientX) x = e.clientX + (de.scrollLeft ? de.scrollLeft : db.scrollLeft);
				if (e.pageY) y = e.pageY;
				else if (e.clientY) y = e.clientY + (de.scrollTop ? de.scrollTop : db.scrollTop);
				
				let entry_id = tr.dataset.eid;
				let entry = this.entries_map[entry_id];

				let promises = this.user_callbacks['row.ctxmenu'].map(cb=>{
					return Promise.resolve(cb(entry));
				});
				await Promise.all(promises);

				if(this.conextMenuOpts.length){
					tr.classList.add('outlined');
					this.ctxmenu = document.createElement('div');
					this.ctxmenu.classList.add('ft-contextmenu');
					this.ctxmenu.style.top = `${y-3}px`;
					this.ctxmenu.style.left = `${x}px`;
					this.ctxmenu.innerHTML = this.conextMenuOpts.map((opt, idx)=>{
						if(opt === '-'){
							return `<hr>`;
						}else{
							return `<div class='ft-context-item' data-idx='${idx}'>${opt.label}</div>`;
						}
					}).join('');
					document.body.append(this.ctxmenu);
					this.ctxmenu.querySelectorAll('.ft-context-item').forEach(ele=>{
						ele.addEventListener('click', e=>{
							e.preventDefault();
							this.removeCtxMenu();
							this.conextMenuOpts[ele.dataset.idx].action();
						});
					});
				}


				return false;
			}, false);

		});

		this.table.querySelectorAll('.folder-carat').forEach(ct=>{
			ct.addEventListener('click', async e=>{
				e.preventDefault();
				let entry_id = ct.parentElement.parentElement.parentElement.dataset.eid;
				let entry = this.entries_map[entry_id];
				if(entry.kind === 'Folder'){
					if(entry.expanded){
						let promises = this.user_callbacks['folder.collapse'].map(cb=>{
							return Promise.resolve(cb(entry));
						});
						await Promise.all(promises);

						// if the user callback re-rendered the table, our reference to `na` will be lost
						// so we need to find it again
						let row = this.table.querySelector(`.ft-tr[data-eid="${entry_id}"]`);
						ct = row.querySelector(`.folder-carat`);
						this.animate(ct, 'transform', 90, 0, v=>`rotate(${v}deg)`, 150);

						// hide ALL the children entries
						let height = getComputedStyle(row).getPropertyValue("height");
						height = +height.substring(0, height.length-2);
						let children = this.getAllChildrenIds(entry).map(eid=>this.table.querySelector(`.ft-tr[data-eid="${eid}"]`));
						children.forEach(c=>{
							c.style.height = `${height}px`;
							c.style.overflowY = 'hidden';
							c.style.display = null;
						});
						await Promise.all(children.map(c=>{
							return this.animate(c, 'height', height, 0, v=>`${v}px`, 150);
						}));
						children.forEach(c=>{
							c.style.height = null;
							c.style.overflowY = null;
							c.style.display = 'none';
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
						let row = this.table.querySelector(`.ft-tr[data-eid="${entry_id}"]`);
						ct = row.querySelector(`.folder-carat`);

						this.animate(ct, 'transform', 0, 90, v=>`rotate(${v}deg)`, 150);

						// show the children entries that are expanded
						let table = this.table;
						let height = getComputedStyle(row).getPropertyValue("height");
						height = +height.substring(0, height.length-2);
						let children = [];
						(function iterateChildren(e){
							if(Array.isArray(e.children)){
								e.children.forEach(ch=>{
									let row = table.querySelector(`.ft-tr[data-eid="${ch.id}"]`);
									children.push(row);
									if(ch.kind === 'Folder' && ch.expanded){
										iterateChildren(ch);
									}
								});
							}
						})(entry);	
						children.forEach(c=>{
							c.style.height = `0px`;
							c.style.overflowY = 'hidden';
							c.style.display = null;
						});
						await Promise.all(children.map(c=>{
							return this.animate(c, 'height', 0, height, v=>`${v}px`, 150);
						}));
						children.forEach(c=>{
							c.style.height = null;
							c.style.overflowY = null;
						});

						entry.expanded = true;
						this.addTableStripes();
						this.resizeTable();
					}
				}
			});
		});

		this.resizeTable();
	}

	removeCtxMenu(){
		this.table.querySelectorAll('.ft-tr.outlined').forEach(r=>r.classList.remove('outlined'));
		if(this.ctxmenu){
			this.ctxmenu.remove();
			this.ctxmenu = null;
		}
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

	clearEntries(){
		this.entries = [];
		this.entries_map = {};
		this.entry_counter = 0;
	}

	removeEntry(entry){
		if(entry.kind === 'Folder' && entry.children){
			entry.children.forEach(entry=>this.removeEntry(entry));
		}
		if(entry.parent) entry.parent.children = entry.parent.children.filter(ch=>ch!==entry);
		this.entries = this.entries.filter(ch=>ch!==entry);
		delete this.entries_map[entry.id];
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

export {FSTable};