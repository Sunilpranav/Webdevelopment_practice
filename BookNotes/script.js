const STORAGE_KEY = 'reading-room-books';
  const GENRE_LABEL = { fiction:'Fiction', nonfiction:'Nonfiction', poetry:'Poetry', philosophy:'Philosophy', scifi:'Sci-Fi', memoir:'Memoir' };
  const GENRE_COLOR = { fiction:'var(--pine)', nonfiction:'var(--brass)', poetry:'var(--pine)', philosophy:'var(--ink-soft)', scifi:'var(--oxblood)', memoir:'var(--oxblood)' };
  const STATUS_LABEL = { want:'Want to read', reading:'Currently reading', read:'Finished' };

  let books = [];
  let activeGenre = 'all';

  const grid = document.getElementById('grid');
  const shelfEmpty = document.getElementById('shelfEmpty');
  const noResults = document.getElementById('noResults');
  const searchBox = document.getElementById('searchBox');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const modalOverlay = document.getElementById('modalOverlay');
  const bookForm = document.getElementById('bookForm');
  const modalTitle = document.getElementById('modalTitle');
  const saveFlag = document.getElementById('saveFlag');
  const starPicker = document.getElementById('starPicker');
  let currentRating = 0;
  const fFile = document.getElementById('fFile');
  const fFileName = document.getElementById('fFileName');
  let pendingFile = null; // File object staged in the modal, not yet saved
  const sessionFileURLs = {}; // bookId -> object URL, only valid for this browser session

  if(window.pdfjsLib){
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  async function extractPdfMeta(file){
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    const meta = await pdf.getMetadata();
    const info = meta.info || {};
    return {
      title: info.Title && info.Title.trim(),
      author: info.Author && info.Author.trim()
    };
  }

  async function extractEpubMeta(file){
    const zip = await JSZip.loadAsync(file);
    const containerXml = await zip.file('META-INF/container.xml').async('string');
    const containerDoc = new DOMParser().parseFromString(containerXml, 'application/xml');
    const opfPath = containerDoc.querySelector('rootfile').getAttribute('full-path');
    const opfXml = await zip.file(opfPath).async('string');
    const opfDoc = new DOMParser().parseFromString(opfXml, 'application/xml');
    const title = opfDoc.getElementsByTagName('dc:title')[0]?.textContent?.trim();
    const author = opfDoc.getElementsByTagName('dc:creator')[0]?.textContent?.trim();
    return { title, author };
  }

  fFile.addEventListener('change', async () => {
    pendingFile = fFile.files[0] || null;
    fFileName.textContent = pendingFile ? `Selected: ${pendingFile.name}` : '';
    const statusEl = document.getElementById('fExtractStatus');
    statusEl.textContent = '';
    if(!pendingFile) return;

    const ext = pendingFile.name.split('.').pop().toLowerCase();
    const titleField = document.getElementById('fTitle');
    const authorField = document.getElementById('fAuthor');

    try{
      let meta = null;
      if(ext === 'pdf'){
        statusEl.textContent = 'Reading PDF details…';
        meta = await extractPdfMeta(pendingFile);
      } else if(ext === 'epub'){
        statusEl.textContent = 'Reading EPUB details…';
        meta = await extractEpubMeta(pendingFile);
      }

      if(meta && (meta.title || meta.author)){
        if(meta.title && !titleField.value.trim()) titleField.value = meta.title;
        if(meta.author && !authorField.value.trim()) authorField.value = meta.author;
        statusEl.textContent = '✓ Filled in title/author from the file — feel free to edit.';
      } else if(ext === 'pdf' || ext === 'epub'){
        statusEl.textContent = "Couldn't find title/author info in this file — please fill them in yourself.";
        if(!titleField.value.trim()) titleField.value = pendingFile.name.replace(/\.[^.]+$/, '');
      } else {
        if(!titleField.value.trim()) titleField.value = pendingFile.name.replace(/\.[^.]+$/, '');
        statusEl.textContent = "This file type doesn't carry title/author info — used the filename as a starting point.";
      }
    } catch(err){
      statusEl.textContent = "Couldn't read this file's details — please fill in the fields yourself.";
      if(!titleField.value.trim()) titleField.value = pendingFile.name.replace(/\.[^.]+$/, '');
    }
  });

  function callNumber(book){
    const genreCode = { fiction:'FIC', nonfiction:'NF', poetry:'POE', philosophy:'PHI', scifi:'SF', memoir:'MEM' }[book.genre] || 'GEN';
    const authorCode = (book.author || '???').replace(/[^a-zA-Z]/g,'').slice(0,3).toUpperCase() || '???';
    return `${genreCode} — ${authorCode}`;
  }

  function renderStars(rating){
    let html = '';
    for(let i=1;i<=5;i++){
      html += `<span class="${i<=rating ? 'filled' : ''}"></span>`;
    }
    return html;
  }

  function renderBooks(){
    const q = searchBox.value.trim().toLowerCase();
    const visible = books.filter(b => {
      const matchesGenre = activeGenre === 'all' || b.genre === activeGenre;
      const matchesSearch = !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q);
      return matchesGenre && matchesSearch;
    });

    grid.innerHTML = '';
    shelfEmpty.classList.toggle('hidden', books.length !== 0);
    noResults.classList.toggle('hidden', !(books.length > 0 && visible.length === 0));

    visible.forEach(book => {
      const card = document.createElement('div');
      card.className = 'book-card';
      card.style.position = 'relative';
      card.innerHTML = `
        <div class="card-actions">
          <button class="icon-btn" data-action="edit" data-id="${book.id}" title="Edit">✎</button>
          <button class="icon-btn" data-action="delete" data-id="${book.id}" title="Delete">✕</button>
        </div>
        <div class="card-tab" style="background:${GENRE_COLOR[book.genre]}">${GENRE_LABEL[book.genre]}</div>
        <div class="card-body" data-action="view" data-id="${book.id}">
          <div class="call-no">${callNumber(book)}</div>
          <h3 class="book-title">${escapeHtml(book.title)}</h3>
          <p class="book-author">${escapeHtml(book.author)}</p>
          <div class="rating">${renderStars(book.rating)}</div>
          <p class="book-note">${escapeHtml(book.note || 'No notes yet — click to add some.')}</p>
          ${book.note && book.note.length > 140 ? `<button type="button" class="read-more-link" data-action="view" data-id="${book.id}">Read full note →</button>` : ''}
          ${book.fileName ? `<button class="filter-btn" data-action="open-file" data-id="${book.id}" style="align-self:flex-start; margin-bottom:14px;">📖 Open “${escapeHtml(book.fileName)}”</button>` : ''}
        </div>
        <div class="card-footer">
          <span class="status-pill ${book.status}">${STATUS_LABEL[book.status]}${book.dateNote ? ' · ' + escapeHtml(book.dateNote) : ''}</span>
          <span>${book.pages ? book.pages + ' pp' : ''}</span>
        </div>
      `;
      grid.appendChild(card);
    });

    updateStats();
  }

  function escapeHtml(str){
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function updateStats(){
    document.getElementById('statTotal').textContent = books.length;
    document.getElementById('statReading').textContent = books.filter(b => b.status === 'reading').length;
    const pagesRead = books.filter(b => b.status === 'read').reduce((sum,b) => sum + (parseInt(b.pages)||0), 0);
    document.getElementById('statPages').textContent = pagesRead.toLocaleString();
    const rated = books.filter(b => b.rating > 0);
    const avg = rated.length ? (rated.reduce((s,b)=>s+b.rating,0)/rated.length).toFixed(1) : '–';
    document.getElementById('statRating').textContent = avg;
  }

  let storageMode = 'unknown'; // 'bridge' | 'local' | 'memory'

  function showStorageBanner(){
    const banner = document.getElementById('storageBanner');
    banner.style.display = 'block';
    if(storageMode === 'bridge' || storageMode === 'local'){
      banner.style.color = 'var(--pine)';
      banner.style.background = 'rgba(63,84,67,0.08)';
      banner.textContent = '● Your entries are saved on this device and will still be here next time you open this page.';
    } else {
      banner.style.color = 'var(--oxblood)';
      banner.style.background = 'rgba(124,45,45,0.08)';
      banner.textContent = "⚠ This preview can't save your entries permanently — they'll disappear if you close or refresh this tab. Download the file and open it directly in your browser (not just this preview) to save for real.";
    }
  }

  async function loadBooks(){
    // Try the sandboxed artifact bridge first
    try{
      if(window.storage && typeof window.storage.get === 'function'){
        const result = await window.storage.get(STORAGE_KEY, false);
        books = result ? JSON.parse(result.value) : [];
        storageMode = 'bridge';
        renderBooks();
        return;
      }
    } catch(e){ /* fall through */ }

    // Fall back to the browser's own local storage (works when the file is opened directly)
    try{
      const raw = window.localStorage.getItem(STORAGE_KEY);
      books = raw ? JSON.parse(raw) : [];
      storageMode = 'local';
    } catch(e){
      books = [];
      storageMode = 'memory';
    }
    renderBooks();
  }

  async function saveBooks(){
    if(storageMode === 'bridge'){
      try{
        await window.storage.set(STORAGE_KEY, JSON.stringify(books), false);
        flashSave(true);
        return;
      } catch(e){ storageMode = 'local'; /* fall through and retry below */ }
    }
    if(storageMode === 'local' || storageMode === 'unknown'){
      try{
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
        storageMode = 'local';
        flashSave(true);
        return;
      } catch(e){ storageMode = 'memory'; }
    }
    // Nothing persists this entry — still keep it in the in-memory list for this session
    flashSave(false);
  }

  function flashSave(persisted){
    saveFlag.textContent = persisted ? '✓ Saved' : '⚠ Saved for this session only';
    saveFlag.style.color = persisted ? 'var(--pine)' : 'var(--oxblood)';
    saveFlag.classList.add('show');
    setTimeout(() => saveFlag.classList.remove('show'), 2200);
  }

  function openModal(book){
    bookForm.reset();
    currentRating = book ? book.rating : 0;
    updateStarUI();
    pendingFile = null;
    fFileName.textContent = book && book.fileName ? `Currently attached: ${book.fileName} (re-select to update, or leave as is)` : '';
    document.getElementById('bookId').value = book ? book.id : '';
    document.getElementById('fTitle').value = book ? book.title : '';
    document.getElementById('fAuthor').value = book ? book.author : '';
    document.getElementById('fGenre').value = book ? book.genre : 'fiction';
    document.getElementById('fStatus').value = book ? book.status : 'want';
    document.getElementById('fPages').value = book ? book.pages : '';
    document.getElementById('fDate').value = book ? book.dateNote : '';
    document.getElementById('fNote').value = book ? book.note : '';
    modalTitle.textContent = book ? 'Edit Catalog Card' : 'New Catalog Card';
    modalOverlay.classList.remove('hidden');
    document.getElementById('fTitle').focus();
  }

  function closeModal(){
    modalOverlay.classList.add('hidden');
  }

  // ---------- Read-only "view" modal ----------
  const viewOverlay = document.getElementById('viewOverlay');
  let viewingBookId = null;

  function openViewModal(book){
    viewingBookId = book.id;
    document.getElementById('viewTab').textContent = GENRE_LABEL[book.genre];
    document.getElementById('viewTab').style.background = GENRE_COLOR[book.genre];
    document.getElementById('viewCallNo').textContent = callNumber(book);
    document.getElementById('viewTitle').textContent = book.title;
    document.getElementById('viewAuthor').textContent = book.author;
    document.getElementById('viewRating').innerHTML = renderStars(book.rating);
    document.getElementById('viewNote').textContent = book.note || 'No notes yet.';
    document.getElementById('viewFooterMeta').textContent =
      `${STATUS_LABEL[book.status]}${book.dateNote ? ' · ' + book.dateNote : ''}${book.pages ? ' · ' + book.pages + ' pp' : ''}`;

    const fileRow = document.getElementById('viewFileRow');
    fileRow.innerHTML = book.fileName
      ? `<button type="button" class="filter-btn" id="viewOpenFileBtn">📖 Open “${escapeHtml(book.fileName)}”</button>`
      : '';
    if(book.fileName){
      document.getElementById('viewOpenFileBtn').addEventListener('click', () => {
        openBookFile(book);
      });
    }
    viewOverlay.classList.remove('hidden');
  }

  function openBookFile(book){
    const id = book.id;
    if(sessionFileURLs[id]){
      window.open(sessionFileURLs[id], '_blank');
      return;
    }
    const picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = '.pdf,.epub,.txt,.mobi,.azw3,.doc,.docx';
    picker.addEventListener('change', () => {
      const file = picker.files[0];
      if(file){
        sessionFileURLs[id] = URL.createObjectURL(file);
        window.open(sessionFileURLs[id], '_blank');
      }
    });
    alert(`Locate "${book.fileName}" on your laptop to open it — this browser can't remember its location between visits.`);
    picker.click();
  }

  document.getElementById('viewCloseBtn').addEventListener('click', () => viewOverlay.classList.add('hidden'));
  document.getElementById('viewEditBtn').addEventListener('click', () => {
    const book = books.find(b => b.id === viewingBookId);
    viewOverlay.classList.add('hidden');
    if(book) openModal(book);
  });
  viewOverlay.addEventListener('click', e => { if(e.target === viewOverlay) viewOverlay.classList.add('hidden'); });

  function updateStarUI(){
    starPicker.querySelectorAll('button').forEach(btn => {
      btn.classList.toggle('on', parseInt(btn.dataset.val) <= currentRating);
    });
  }

  starPicker.addEventListener('click', e => {
    if(e.target.tagName === 'BUTTON'){
      currentRating = parseInt(e.target.dataset.val);
      updateStarUI();
    }
  });

  document.getElementById('addBtn').addEventListener('click', () => openModal(null));
  document.getElementById('addBtnEmpty').addEventListener('click', () => openModal(null));
  document.getElementById('cancelBtn').addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', e => { if(e.target === modalOverlay) closeModal(); });

  bookForm.addEventListener('submit', async e => {
    e.preventDefault();
    const id = document.getElementById('bookId').value;
    const existing = id ? books.find(b => b.id === id) : null;
    const newId = id || 'b' + Date.now();
    const data = {
      id: newId,
      title: document.getElementById('fTitle').value.trim() || 'Untitled',
      author: document.getElementById('fAuthor').value.trim() || 'Unknown author',
      genre: document.getElementById('fGenre').value,
      status: document.getElementById('fStatus').value,
      pages: parseInt(document.getElementById('fPages').value) || 0,
      dateNote: document.getElementById('fDate').value.trim(),
      rating: currentRating,
      note: document.getElementById('fNote').value.trim(),
      fileName: pendingFile ? pendingFile.name : (existing ? existing.fileName : '')
    };
    if(pendingFile){
      sessionFileURLs[newId] = URL.createObjectURL(pendingFile);
    }
    if(id){
      books = books.map(b => b.id === id ? data : b);
    } else {
      books.unshift(data);
    }
    renderBooks();
    await saveBooks();
    closeModal();
  });

  grid.addEventListener('click', async e => {
    const openBtn = e.target.closest('[data-action="open-file"]');
    if(openBtn){
      const book = books.find(b => b.id === openBtn.dataset.id);
      if(book) openBookFile(book);
      return;
    }
    const viewEl = e.target.closest('[data-action="view"]');
    if(viewEl){
      const book = books.find(b => b.id === viewEl.dataset.id);
      if(book) openViewModal(book);
      return;
    }
    const btn = e.target.closest('.icon-btn');
    if(!btn) return;
    const id = btn.dataset.id;
    const book = books.find(b => b.id === id);
    if(btn.dataset.action === 'edit'){
      openModal(book);
    } else if(btn.dataset.action === 'delete'){
      if(confirm(`Remove "${book.title}" from your shelf?`)){
        books = books.filter(b => b.id !== id);
        renderBooks();
        await saveBooks();
      }
    }
  });

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeGenre = btn.dataset.genre;
      renderBooks();
    });
  });

  searchBox.addEventListener('input', renderBooks);

  loadBooks().then(showStorageBanner);
