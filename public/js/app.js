// ============================================================
// GeniusOne Typing Portal — Frontend App (v2)
// Features: Role-based nav, PDF download, Chain of Title auto,
//           Preview/Print, Activity log, Permissions
// ============================================================
const API = '';
let token = localStorage.getItem('geniusone_token');
let currentUser = null;
let currentRecordId = null;
let currentPage = 1;
let searchTimer = null;

// ── BOOT ────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  if (token) initApp();
  document.getElementById('login-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });
});

async function initApp() {
  try {
    const res = await apiFetch('/api/auth/me');
    currentUser = res.user;
    document.getElementById('user-name').textContent = currentUser.name;
    document.getElementById('user-role').textContent = currentUser.role;
    document.getElementById('user-avatar').textContent = currentUser.name.charAt(0).toUpperCase();
    applyRoleNav();
    showScreen('app');
    if (currentUser.role === 'admin') {
      showView('dashboard');
    } else {
      showView('records');
    }
  } catch {
    token = null;
    localStorage.removeItem('geniusone_token');
    showScreen('login');
  }
}

function applyRoleNav() {
  const isAdmin = currentUser.role === 'admin';
  document.querySelectorAll('.admin-only').forEach(el => el.classList.toggle('hidden', !isAdmin));
  document.querySelectorAll('.typist-only').forEach(el => el.classList.toggle('hidden', isAdmin));
}

// ── AUTH ────────────────────────────────────────────────────
async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  errEl.classList.add('hidden');
  if (!email || !password) { showError(errEl, 'Enter email and password'); return; }
  try {
    const res = await apiFetch('/api/auth/login', 'POST', { email, password }, true);
    token = res.token;
    localStorage.setItem('geniusone_token', token);
    await initApp();
  } catch (e) { showError(errEl, e.message || 'Login failed'); }
}

function doLogout() {
  token = null;
  localStorage.removeItem('geniusone_token');
  currentUser = null;
  showScreen('login');
}

// ── NAVIGATION ───────────────────────────────────────────────
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
}

function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.view === name);
  });
  if (name === 'dashboard') loadDashboard();
  if (name === 'records') { currentPage = 1; loadRecords(); }
  if (name === 'users') loadUsers();
  if (name === 'settings') loadSettings();
}

// ── DASHBOARD ────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const stats = await apiFetch('/api/records/stats/summary');
    document.getElementById('stat-total').textContent = stats.total;
    document.getElementById('stat-today').textContent = stats.today;
    document.getElementById('stat-completed').textContent = stats.byStatus.completed || 0;
    document.getElementById('stat-inprogress').textContent = stats.byStatus.in_progress || 0;
    const res = await apiFetch('/api/records?limit=10');
    renderTable(document.getElementById('recent-records-table'), res.records, true);
  } catch (e) { console.error(e); }
}

// ── RECORDS LIST ─────────────────────────────────────────────
async function loadRecords() {
  const search = document.getElementById('search-input')?.value || '';
  const status = document.getElementById('status-filter')?.value || '';
  try {
    const qs = new URLSearchParams({ page: currentPage, limit: 25 });
    if (search) qs.set('search', search);
    if (status) qs.set('status', status);
    const res = await apiFetch('/api/records?' + qs);
    renderTable(document.getElementById('records-table'), res.records);
    renderPagination(res.total, res.limit);
  } catch (e) { console.error(e); }
}

function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { currentPage = 1; loadRecords(); }, 350);
}

function renderTable(container, records, compact = false) {
  if (!records || records.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No records found</p></div>';
    return;
  }
  const rows = records.map(r => `
    <tr>
      <td><strong style="font-family:var(--mono);font-size:12px;">${r.order_no}</strong></td>
      <td>${r.address || '—'}</td>
      <td>${r.owner || '—'}</td>
      <td><span class="badge badge-${r.status}">${r.status.replace('_',' ')}</span></td>
      <td>${fmtDate(r.created_at)}</td>
      <td>
        <div class="actions">
          <button class="btn btn-sm btn-secondary" onclick="editRecord('${r.id}')">Edit</button>
          <button class="btn btn-sm btn-secondary" onclick="previewRecord('${r.id}')" title="Preview PDF">
            <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <button class="btn btn-sm btn-secondary" onclick="downloadRecordPDF('${r.id}')" title="Download PDF" style="display:inline-flex;align-items:center;gap:4px">
            <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            PDF
          </button>
          ${currentUser?.role === 'admin' ? `<button class="btn btn-sm btn-danger" onclick="deleteRecord('${r.id}')">Delete</button>` : ''}
        </div>
      </td>
    </tr>`).join('');
  container.innerHTML = `
    <table class="data-table">
      <thead><tr>
        <th>Order #</th><th>Address</th><th>Owner</th><th>Status</th><th>Created</th><th></th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderPagination(total, limit) {
  const pages = Math.ceil(total / limit);
  const el = document.getElementById('pagination');
  if (!el || pages <= 1) { if(el) el.innerHTML = ''; return; }
  let html = '';
  for (let i = 1; i <= pages; i++) {
    html += `<button class="page-btn${i === currentPage ? ' active' : ''}" onclick="goPage(${i})">${i}</button>`;
  }
  el.innerHTML = html;
}

function goPage(p) { currentPage = p; loadRecords(); }

// ── NEW / EDIT RECORD ────────────────────────────────────────
function newRecord() {
  currentRecordId = null;
  document.getElementById('portal-title').textContent = 'New Record';
  document.getElementById('portal-sub').textContent = '';
  document.getElementById('portal-status').value = 'draft';
  renderPortalForm(null);
  showView('portal');
}

async function editRecord(id) {
  try {
    const res = await apiFetch('/api/records/' + id);
    currentRecordId = id;
    const r = res.record;
    document.getElementById('portal-title').textContent = 'Edit Record';
    document.getElementById('portal-sub').textContent = 'Order #: ' + r.order_no;
    document.getElementById('portal-status').value = r.status || 'draft';
    renderPortalForm(r);
    showView('portal');
  } catch (e) { alert('Failed to load record: ' + e.message); }
}

async function deleteRecord(id) {
  if (!confirm('Delete this record? This cannot be undone.')) return;
  try {
    await apiFetch('/api/records/' + id, 'DELETE');
    loadRecords();
  } catch (e) { alert('Delete failed: ' + e.message); }
}

// ── PORTAL FORM ──────────────────────────────────────────────
function renderPortalForm(r) {
  const d = r || {};
  const taxes = d.tax_entries || [{}];
  const deeds = d.vesting_deeds || [];
  const mortgages = d.open_mortgages || [];
  const satdocs = d.satellite_documents || [];
  const liens = d.liens_judgements || [];
  const rows = d.rows_ccrs_easements || [];
  const probates = d.divorce_probate || [];
  const miscs = d.misc_docs || [];

  document.getElementById('portal-form').innerHTML = `
    <div class="meta-bar">
      <div class="meta-field"><label>Search Type</label>
        <select id="f-search_type">${['Full Search','Current Owner','Two Owner','Foreclosure','Update'].map(v=>`<option${d.search_type===v?' selected':''}>${v}</option>`).join('')}</select>
      </div>
      <div class="meta-field"><label>Order #</label><input type="text" id="f-order_no" value="${d.order_no||''}" placeholder="e.g. 25-05-913"/></div>
      <div class="meta-field"><label>Creation Date</label><input type="date" id="f-creation_date" value="${d.creation_date||today()}"/></div>
      <div class="meta-field"><label>Effective Date</label><input type="date" id="f-effective_date" value="${d.effective_date||today()}"/></div>
    </div>

    ${section('Property Information', `
      <div class="grid g2">
        <div class="field span2"><label>Address</label><input type="text" id="f-address" value="${esc(d.address)}" placeholder="Street address"/></div>
        <div class="field"><label>County / State</label><input type="text" id="f-county_state" value="${esc(d.county_state)}" placeholder="e.g. Fulton/GA"/></div>
        <div class="field"><label>Zip Code</label><input type="text" id="f-zip_code" value="${esc(d.zip_code)}" placeholder="ZIP" maxlength="10"/></div>
        <div class="field"><label>Owner</label><input type="text" id="f-owner" value="${esc(d.owner)}" placeholder="Owner name"/></div>
        <div class="field"><label>Buyer / Borrower</label><input type="text" id="f-buyer_borrower" value="${esc(d.buyer_borrower)}" placeholder="Buyer or borrower name"/></div>
      </div>`)}

    ${section('Tax and Assessment Info', `
      <div class="grid g4">
        <div class="field span2"><label>APN</label><input type="text" id="f-apn" value="${esc(d.apn)}" placeholder="Assessor Parcel Number"/></div>
        <div class="field"><label>Land ($)</label><input type="text" id="f-land_value" value="${d.land_value||''}" placeholder="0.00" oninput="calcTotal()"/></div>
        <div class="field"><label>Improvements ($)</label><input type="text" id="f-improvements_value" value="${d.improvements_value||''}" placeholder="0.00" oninput="calcTotal()"/></div>
        <div class="field"><label>Total ($)</label><input type="text" id="f-total_value" value="${d.total_value||''}" placeholder="Auto-calculated"/></div>
        <div class="field"><label>Exempt</label><select id="f-exempt">${['None','Homestead','Senior','Veteran','Other'].map(v=>`<option${d.exempt===v?' selected':''}>${v}</option>`).join('')}</select></div>
        <div class="field"><label>Spl Assess</label><input type="text" id="f-spl_assess" value="${esc(d.spl_assess)}"/></div>
        <div class="field span2"><label>Brief Legal</label><input type="text" id="f-brief_legal" value="${esc(d.brief_legal)}"/></div>
      </div>
      <div class="subsection" style="margin-top:14px">
        <div class="subsection-head"><h3>Tax Entries</h3></div>
        <div class="subsection-body">
          <div id="tax-rows-list">${taxes.map(t=>taxRowHTML(t)).join('')}</div>
          <button class="add-row-btn" onclick="addTaxRow()">+ Add tax row</button>
        </div>
      </div>`)}

    ${section('Vesting Deeds', `
      <div id="deeds-list" class="block-list">${deeds.map((d,i)=>deedBlock(d,i)).join('')}</div>
      <button class="add-row-btn" style="margin-top:12px" onclick="addDeedBlock()">+ Add deed</button>`)}

    ${section('Open Mortgages', `
      <div id="mortgages-list" class="block-list">${mortgages.map((m,i)=>mortgageBlock(m,i)).join('')}</div>
      <button class="add-row-btn" style="margin-top:12px" onclick="addBlock('mortgages-list','mortgage')">+ Add mortgage</button>`)}

    ${section('Satellite Documents', `
      <div id="satdocs-list" class="block-list">${satdocs.map((s,i)=>satdocBlock(s,i)).join('')}</div>
      <button class="add-row-btn" style="margin-top:12px" onclick="addBlock('satdocs-list','satdoc')">+ Add satellite document</button>`)}

    ${section('Liens and Judgements', `
      <div id="liens-list" class="block-list">${liens.map((l,i)=>lienBlock(l,i)).join('')}</div>
      <button class="add-row-btn" style="margin-top:12px" onclick="addBlock('liens-list','lien')">+ Add lien / judgement</button>`)}

    ${section('ROWs, CCRs, Easements', `
      <div id="rows-list" class="block-list">${rows.map((r,i)=>rowBlock(r,i)).join('')}</div>
      <button class="add-row-btn" style="margin-top:12px" onclick="addBlock('rows-list','row')">+ Add ROW / CCR / Easement</button>`)}

    ${section('Divorce / Probate', `
      <div id="probate-list" class="block-list">${probates.map((p,i)=>probateBlock(p,i)).join('')}</div>
      <button class="add-row-btn" style="margin-top:12px" onclick="addBlock('probate-list','probate')">+ Add record</button>`)}

    ${section('Misc Docs', `
      <div id="misc-list" class="block-list">${miscs.map((m,i)=>miscBlock(m,i)).join('')}</div>
      <button class="add-row-btn" style="margin-top:12px" onclick="addBlock('misc-list','misc')">+ Add misc doc</button>`)}

    ${section('Plat Maps', `
      <div class="grid g4">
        <div class="field"><label>Dated</label><input type="date" id="f-plat_dated" value="${d.plat_dated||''}"/></div>
        <div class="field"><label>Recorded</label><input type="date" id="f-plat_recorded" value="${d.plat_recorded||''}"/></div>
        <div class="field"><label>Bk/Pg/Doc</label><input type="text" id="f-plat_bk_pg_doc" value="${esc(d.plat_bk_pg_doc)}"/></div>
        <div class="field"><label>Instrument No</label><input type="text" id="f-plat_instrument_no" value="${esc(d.plat_instrument_no)}"/></div>
        <div class="field span4"><label>Notes</label><textarea id="f-plat_notes">${esc(d.plat_notes)}</textarea></div>
      </div>`)}

    ${section('Legal Description', `
      <div class="field"><textarea id="f-legal_description" style="min-height:100px">${esc(d.legal_description)}</textarea></div>`)}

    ${section('Chain of Title', `
      <div class="field"><textarea id="f-chain_of_title" style="min-height:100px" placeholder="Auto-populated from Vesting Deeds. You can also edit manually.">${esc(d.chain_of_title)}</textarea></div>`)}
  `;

  if (!deeds.length) addDeedBlock();
  if (!mortgages.length) addBlock('mortgages-list','mortgage');
}

function calcTotal() {
  const l = parseFloat(document.getElementById('f-land_value')?.value) || 0;
  const i = parseFloat(document.getElementById('f-improvements_value')?.value) || 0;
  const t = document.getElementById('f-total_value');
  if (t && (l || i)) t.value = (l + i).toFixed(2);
}

function section(title, body) {
  return `<div class="portal-section">
    <div class="portal-section-head"><h2>${title}</h2></div>
    <div class="portal-section-body">${body}</div>
  </div>`;
}

// ── BLOCK TEMPLATES ──────────────────────────────────────────
let bc = 0;
function blk(id, title, body) {
  return `<div class="block-item" id="${id}">
    <div class="block-item-head"><span>${title}</span>
      <button class="rm-btn" onclick="document.getElementById('${id}').remove();updateChainOfTitle()">
        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" viewBox="0 0 13 13"><path d="M1.5 1.5l10 10M11.5 1.5l-10 10"/></svg>
      </button>
    </div>
    <div class="block-item-body">${body}</div>
  </div>`;
}

function taxRowHTML(t={}) {
  bc++;
  const id = 'tr'+bc;
  return `<div class="tax-row" id="${id}">
    <select>${['Real Estate','Storm Water','Personal Property','Supplemental','Special Assessment'].map(v=>`<option${t.tax_type===v?' selected':''}>${v}</option>`).join('')}</select>
    <input type="text" value="${t.amount||''}" placeholder="0.00"/>
    <select>${['Paid','Due','Delinquent'].map(v=>`<option${t.status===v?' selected':''}>${v}</option>`).join('')}</select>
    <input type="date" value="${t.entry_date||''}"/>
    <button class="rm-btn" onclick="document.getElementById('${id}').remove()">
      <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" viewBox="0 0 13 13"><path d="M1.5 1.5l10 10M11.5 1.5l-10 10"/></svg>
    </button>
  </div>`;
}
function addTaxRow() { document.getElementById('tax-rows-list').insertAdjacentHTML('beforeend', taxRowHTML()); }

// Deed block with Chain of Title auto-update
function deedBlock(d={}, i=0) {
  bc++;
  const id='deed'+bc;
  return blk(id,'Deed #'+(i+1),`
    <div class="grid g4">
      <div class="field"><label>Deed Type</label><select onchange="updateChainOfTitle()">${['Deed of Bargain and Sale','Warranty Deed','Quitclaim Deed','Special Warranty Deed','Grant Deed','Trust Deed','Other'].map(v=>`<option${d.deed_type===v?' selected':''}>${v}</option>`).join('')}</select></div>
      <div class="field"><label>Dated</label><input type="date" value="${d.dated||''}" oninput="updateChainOfTitle()"/></div>
      <div class="field"><label>Recorded</label><input type="date" value="${d.recorded||''}" oninput="updateChainOfTitle()"/></div>
      <div class="field"><label>Bk/Pg/Doc</label><input type="text" value="${esc(d.bk_pg_doc)}" placeholder="Book/Page/Doc" oninput="updateChainOfTitle()"/></div>
      <div class="field"><label>Instrument #</label><input type="text" value="${esc(d.instrument_number)}" oninput="updateChainOfTitle()"/></div>
      <div class="field"><label>Consideration ($)</label><input type="text" value="${d.consideration||''}" placeholder="0.00"/></div>
      <div class="field span2"><label>Grantor</label><input type="text" value="${esc(d.grantor)}" placeholder="Grantor name(s)" oninput="updateChainOfTitle()"/></div>
      <div class="field span4"><label>Grantee</label><input type="text" value="${esc(d.grantee)}" placeholder="Grantee name(s)" oninput="updateChainOfTitle()"/></div>
      <div class="field span4"><label>Notes</label><textarea style="min-height:56px" oninput="updateChainOfTitle()">${esc(d.notes)}</textarea></div>
    </div>`);
}

function addDeedBlock() {
  const list = document.getElementById('deeds-list');
  const i = list.children.length;
  list.insertAdjacentHTML('beforeend', deedBlock({}, i));
}

// Auto-populate Chain of Title from Vesting Deeds
// Rule: 1st deed → Vesting Deed section + Chain of Title
//       2nd+ deeds → Chain of Title only
function updateChainOfTitle() {
  const deedBlocks = document.querySelectorAll('[id^=deed]');
  if (!deedBlocks.length) return;

  const chainLines = [];
  deedBlocks.forEach((block, idx) => {
    const inputs = block.querySelectorAll('select, input, textarea');
    const deedType = inputs[0]?.value || '';
    const dated = inputs[1]?.value ? fmtDate(inputs[1].value) : '';
    const recorded = inputs[2]?.value ? fmtDate(inputs[2].value) : '';
    const bkPgDoc = inputs[3]?.value || '';
    const instrNo = inputs[4]?.value || '';
    const grantor = inputs[6]?.value || '';
    const grantee = inputs[7]?.value || '';

    if (!grantor && !grantee && !bkPgDoc) return;

    let line = `${deedType}`;
    if (dated) line += `, Dated: ${dated}`;
    if (recorded) line += `, Recorded: ${recorded}`;
    if (bkPgDoc) line += `, Bk/Pg/Doc: ${bkPgDoc}`;
    if (instrNo) line += `, Inst#: ${instrNo}`;
    if (grantor) line += `\n  From: ${grantor}`;
    if (grantee) line += `\n  To: ${grantee}`;
    chainLines.push(line);
  });

  const chainEl = document.getElementById('f-chain_of_title');
  if (chainEl && chainLines.length) {
    chainEl.value = chainLines.join('\n\n');
  }
}

function mortgageBlock(m={}, i=0) {
  bc++;
  const id='mort'+bc;
  return blk(id,'Mortgage #'+(i+1),`
    <div class="grid g4">
      <div class="field"><label>Doc Type</label><select>${['Deed of Trust','Mortgage','Open-End Mortgage','Other'].map(v=>`<option${m.doc_type===v?' selected':''}>${v}</option>`).join('')}</select></div>
      <div class="field"><label>Type</label><select>${['Closed Ended','Open Ended','HELOC','Other'].map(v=>`<option${m.mortgage_type===v?' selected':''}>${v}</option>`).join('')}</select></div>
      <div class="field"><label>Dated</label><input type="date" value="${m.dated||''}"/></div>
      <div class="field"><label>Recorded</label><input type="date" value="${m.recorded||''}"/></div>
      <div class="field"><label>Bk/Pg/Doc</label><input type="text" value="${esc(m.bk_pg_doc)}"/></div>
      <div class="field"><label>Instrument #</label><input type="text" value="${esc(m.instrument_number)}"/></div>
      <div class="field span2"><label>Amount ($)</label><input type="text" value="${m.amount||''}" placeholder="0.00"/></div>
      <div class="field span2"><label>Borrower</label><input type="text" value="${esc(m.borrower)}"/></div>
      <div class="field span2"><label>Lender</label><input type="text" value="${esc(m.lender)}"/></div>
      <div class="field span4"><label>Trustee</label><input type="text" value="${esc(m.trustee)}"/></div>
      <div class="field span4"><label>Notes</label><textarea style="min-height:56px">${esc(m.notes)}</textarea></div>
    </div>
    <div class="subsection">
      <div class="subsection-head"><h3>Modification</h3></div>
      <div class="subsection-body"><div class="grid g3">
        <div class="field"><label>Dated</label><input type="date" value="${m.mod_dated||''}"/></div>
        <div class="field"><label>Recorded</label><input type="date" value="${m.mod_recorded||''}"/></div>
        <div class="field"><label>Bk/Pg/Doc</label><input type="text" value="${esc(m.mod_bk_pg_doc)}"/></div>
        <div class="field"><label>Instrument #</label><input type="text" value="${esc(m.mod_instrument_number)}"/></div>
        <div class="field span2"><label>Notes</label><input type="text" value="${esc(m.mod_notes)}"/></div>
      </div></div>
    </div>
    <div class="subsection" style="margin-top:8px">
      <div class="subsection-head"><h3>Lis Pendens</h3></div>
      <div class="subsection-body"><div class="grid g3">
        <div class="field"><label>Dated</label><input type="date" value="${m.lp_dated||''}"/></div>
        <div class="field"><label>Recorded</label><input type="date" value="${m.lp_recorded||''}"/></div>
        <div class="field"><label>Bk/Pg/Doc</label><input type="text" value="${esc(m.lp_bk_pg_doc)}"/></div>
        <div class="field"><label>Instrument #</label><input type="text" value="${esc(m.lp_instrument_number)}"/></div>
        <div class="field span2"><label>Notes</label><input type="text" value="${esc(m.lp_notes)}"/></div>
      </div></div>
    </div>`);
}

function satdocBlock(s={},i=0){bc++;const id='sat'+bc;return blk(id,'Satellite Doc #'+(i+1),`<div class="grid g4">
  <div class="field span2"><label>Title</label><input type="text" value="${esc(s.title)}" placeholder="Document title"/></div>
  <div class="field"><label>Dated</label><input type="date" value="${s.dated||''}"/></div>
  <div class="field"><label>Recorded</label><input type="date" value="${s.recorded||''}"/></div>
  <div class="field"><label>Bk/Pg/Doc</label><input type="text" value="${esc(s.bk_pg_doc)}"/></div>
  <div class="field"><label>Instrument #</label><input type="text" value="${esc(s.instrument_number)}"/></div>
  <div class="field"><label>Type</label><select>${['Assignment','Release','Subordination','Other'].map(v=>`<option${s.doc_type===v?' selected':''}>${v}</option>`).join('')}</select></div>
  <div class="field"><label>Assignor</label><input type="text" value="${esc(s.assignor)}"/></div>
  <div class="field span4"><label>Assignee</label><input type="text" value="${esc(s.assignee)}"/></div>
  <div class="field span4"><label>Notes</label><textarea style="min-height:48px">${esc(s.notes)}</textarea></div>
</div>`);}

function lienBlock(l={},i=0){bc++;const id='lien'+bc;return blk(id,'Lien/Judgement #'+(i+1),`<div class="grid g4">
  <div class="field span2"><label>Doc Name</label><select>${['Judgment','Tax Lien',"Mechanic's Lien",'HOA Lien','Other'].map(v=>`<option${l.doc_name===v?' selected':''}>${v}</option>`).join('')}</select></div>
  <div class="field"><label>Dated</label><input type="date" value="${l.dated||''}"/></div>
  <div class="field"><label>Recorded</label><input type="date" value="${l.recorded||''}"/></div>
  <div class="field"><label>Bk/Pg/Doc</label><input type="text" value="${esc(l.bk_pg_doc)}"/></div>
  <div class="field"><label>Instrument #</label><input type="text" value="${esc(l.instrument_number)}"/></div>
  <div class="field"><label>Case #</label><input type="text" value="${esc(l.case_number)}"/></div>
  <div class="field"><label>Amount ($)</label><input type="text" value="${l.amount||''}"/></div>
  <div class="field span2"><label>Creditor</label><input type="text" value="${esc(l.creditor)}"/></div>
  <div class="field span2"><label>Debtor</label><input type="text" value="${esc(l.debtor)}"/></div>
</div>`);}

function rowBlock(r={},i=0){bc++;const id='row'+bc;return blk(id,'ROW/CCR #'+(i+1),`<div class="grid g4">
  <div class="field span2"><label>Doc Name</label><select>${['Declaration of Restrictions','Right of Way','Easement','CCR','Other'].map(v=>`<option${r.doc_name===v?' selected':''}>${v}</option>`).join('')}</select></div>
  <div class="field"><label>Dated</label><input type="date" value="${r.dated||''}"/></div>
  <div class="field"><label>Recorded</label><input type="date" value="${r.recorded||''}"/></div>
  <div class="field span2"><label>Bk/Pg/Doc</label><input type="text" value="${esc(r.bk_pg_doc)}"/></div>
  <div class="field span2"><label>Instrument #</label><input type="text" value="${esc(r.instrument_number)}"/></div>
  <div class="field span4"><label>Notes</label><textarea style="min-height:48px">${esc(r.notes)}</textarea></div>
</div>`);}

function probateBlock(p={},i=0){bc++;const id='prob'+bc;return blk(id,'Divorce/Probate #'+(i+1),`<div class="grid g4">
  <div class="field span2"><label>Doc Name</label><select>${['List of Heirs','Divorce','Probate','Will','Other'].map(v=>`<option${p.doc_name===v?' selected':''}>${v}</option>`).join('')}</select></div>
  <div class="field"><label>Dated</label><input type="date" value="${p.dated||''}"/></div>
  <div class="field"><label>Recorded</label><input type="date" value="${p.recorded||''}"/></div>
  <div class="field span2"><label>Bk/Pg/Doc</label><input type="text" value="${esc(p.bk_pg_doc)}"/></div>
  <div class="field span2"><label>Instrument #</label><input type="text" value="${esc(p.instrument_number)}"/></div>
  <div class="field span4"><label>Notes</label><textarea style="min-height:48px">${esc(p.notes)}</textarea></div>
</div>`);}

function miscBlock(m={},i=0){bc++;const id='misc'+bc;return blk(id,'Misc Doc #'+(i+1),`<div class="grid g4">
  <div class="field span2"><label>Doc Name</label><input type="text" value="${esc(m.doc_name)}" placeholder="Document name or type"/></div>
  <div class="field"><label>Dated</label><input type="date" value="${m.dated||''}"/></div>
  <div class="field"><label>Recorded</label><input type="date" value="${m.recorded||''}"/></div>
  <div class="field span2"><label>Bk/Pg/Doc</label><input type="text" value="${esc(m.bk_pg_doc)}"/></div>
  <div class="field span2"><label>Instrument #</label><input type="text" value="${esc(m.instrument_number)}"/></div>
  <div class="field span4"><label>Notes</label><textarea style="min-height:48px">${esc(m.notes)}</textarea></div>
</div>`);}

function addBlock(listId, type) {
  const list = document.getElementById(listId);
  const i = list.children.length;
  const map = { mortgage: mortgageBlock, satdoc: satdocBlock,
    lien: lienBlock, row: rowBlock, probate: probateBlock, misc: miscBlock };
  list.insertAdjacentHTML('beforeend', map[type]({}, i));
}

// ── SAVE RECORD ──────────────────────────────────────────────
async function saveRecord() {
  const alertEl = document.getElementById('portal-alert');
  alertEl.className = 'alert hidden';
  const order_no = val('f-order_no');
  if (!order_no) { showAlert(alertEl, 'Order # is required', 'error'); return; }

  const main = {
    order_no, status: document.getElementById('portal-status').value,
    search_type: val('f-search_type'),
    creation_date: val('f-creation_date') || null,
    effective_date: val('f-effective_date') || null,
    address: val('f-address'), county_state: val('f-county_state'),
    zip_code: val('f-zip_code'), owner: val('f-owner'),
    buyer_borrower: val('f-buyer_borrower'),
    apn: val('f-apn'),
    land_value: num('f-land_value'), improvements_value: num('f-improvements_value'),
    total_value: num('f-total_value'), exempt: val('f-exempt'),
    spl_assess: val('f-spl_assess'), brief_legal: val('f-brief_legal'),
    plat_dated: val('f-plat_dated')||null, plat_recorded: val('f-plat_recorded')||null,
    plat_bk_pg_doc: val('f-plat_bk_pg_doc'), plat_instrument_no: val('f-plat_instrument_no'),
    plat_notes: val('f-plat_notes'),
    legal_description: val('f-legal_description'), chain_of_title: val('f-chain_of_title'),
  };

  const children = {
    tax_entries: collectRows('#tax-rows-list .tax-row', row => {
      const s = row.querySelectorAll('select,input');
      return { tax_type: s[0].value, amount: s[1].value||null, status: s[2].value, entry_date: s[3].value||null };
    }),
    vesting_deeds: collectBlocks('[id^=deed]', row => {
      const i=row.querySelectorAll('select,input,textarea');
      return {deed_type:i[0].value,dated:i[1].value||null,recorded:i[2].value||null,bk_pg_doc:i[3].value,instrument_number:i[4].value,consideration:i[5].value||null,grantor:i[6].value,grantee:i[7].value,notes:i[8].value};
    }),
    open_mortgages: collectBlocks('[id^=mort]', row => {
      const i=row.querySelectorAll('select,input,textarea');
      return {doc_type:i[0].value,mortgage_type:i[1].value,dated:i[2].value||null,recorded:i[3].value||null,bk_pg_doc:i[4].value,instrument_number:i[5].value,amount:i[6].value||null,borrower:i[7].value,lender:i[8].value,trustee:i[9].value,notes:i[10].value,mod_dated:i[11].value||null,mod_recorded:i[12].value||null,mod_bk_pg_doc:i[13].value,mod_instrument_number:i[14].value,mod_notes:i[15].value,lp_dated:i[16].value||null,lp_recorded:i[17].value||null,lp_bk_pg_doc:i[18].value,lp_instrument_number:i[19].value,lp_notes:i[20].value};
    }),
    satellite_documents: collectBlocks('[id^=sat]', row => {
      const i=row.querySelectorAll('input,select,textarea');
      return {title:i[0].value,dated:i[1].value||null,recorded:i[2].value||null,bk_pg_doc:i[3].value,instrument_number:i[4].value,doc_type:i[5].value,assignor:i[6].value,assignee:i[7].value,notes:i[8].value};
    }),
    liens_judgements: collectBlocks('[id^=lien]', row => {
      const i=row.querySelectorAll('select,input');
      return {doc_name:i[0].value,dated:i[1].value||null,recorded:i[2].value||null,bk_pg_doc:i[3].value,instrument_number:i[4].value,case_number:i[5].value,amount:i[6].value||null,creditor:i[7].value,debtor:i[8].value};
    }),
    rows_ccrs_easements: collectBlocks('[id^=row]', row => {
      const i=row.querySelectorAll('select,input,textarea');
      return {doc_name:i[0].value,dated:i[1].value||null,recorded:i[2].value||null,bk_pg_doc:i[3].value,instrument_number:i[4].value,notes:i[5].value};
    }),
    divorce_probate: collectBlocks('[id^=prob]', row => {
      const i=row.querySelectorAll('select,input,textarea');
      return {doc_name:i[0].value,dated:i[1].value||null,recorded:i[2].value||null,bk_pg_doc:i[3].value,instrument_number:i[4].value,notes:i[5].value};
    }),
    misc_docs: collectBlocks('[id^=misc]', row => {
      const i=row.querySelectorAll('input,textarea');
      return {doc_name:i[0].value,dated:i[1].value||null,recorded:i[2].value||null,bk_pg_doc:i[3].value,instrument_number:i[4].value,notes:i[5].value};
    }),
  };

  try {
    const method = currentRecordId ? 'PUT' : 'POST';
    const url = currentRecordId ? '/api/records/'+currentRecordId : '/api/records';
    const res = await apiFetch(url, method, { ...main, children });
    showAlert(alertEl, 'Record saved! Order #' + res.record.order_no, 'success');
    currentRecordId = res.record.id;
    document.getElementById('portal-title').textContent = 'Edit Record';
    document.getElementById('portal-sub').textContent = 'Order #: ' + res.record.order_no;
  } catch (e) {
    showAlert(alertEl, 'Save failed: ' + e.message, 'error');
  }
}

function collectRows(selector, mapper) {
  return Array.from(document.querySelectorAll(selector)).map(mapper);
}
function collectBlocks(selector, mapper) {
  return Array.from(document.querySelectorAll(selector)).filter(el=>el.querySelector('input,textarea')).map(mapper);
}

// ── PREVIEW & PDF ─────────────────────────────────────────────
async function previewRecord(id) {
  try {
    const res = await apiFetch('/api/records/' + id);
    openPreviewModal(res.record);
  } catch(e) { alert('Failed to load record: ' + e.message); }
}

async function downloadRecordPDF(id) {
  try {
    const res = await apiFetch('/api/records/' + id);
    const r = res.record;
    openPrintWindow(buildReportHTML(r), r.order_no || 'report');
  } catch(e) { alert('Failed to download PDF: ' + e.message); }
}


function previewCurrentRecord() {
  // Build record from current form state for live preview
  const d = {
    order_no: val('f-order_no'),
    search_type: val('f-search_type'),
    creation_date: val('f-creation_date'),
    effective_date: val('f-effective_date'),
    address: val('f-address'),
    county_state: val('f-county_state'),
    zip_code: val('f-zip_code'),
    owner: val('f-owner'),
    buyer_borrower: val('f-buyer_borrower'),
    apn: val('f-apn'),
    land_value: val('f-land_value'),
    improvements_value: val('f-improvements_value'),
    total_value: val('f-total_value'),
    exempt: val('f-exempt'),
    spl_assess: val('f-spl_assess'),
    brief_legal: val('f-brief_legal'),
    legal_description: val('f-legal_description'),
    chain_of_title: val('f-chain_of_title'),
    plat_dated: val('f-plat_dated'),
    plat_recorded: val('f-plat_recorded'),
    plat_bk_pg_doc: val('f-plat_bk_pg_doc'),
    plat_instrument_no: val('f-plat_instrument_no'),
    plat_notes: val('f-plat_notes'),
    tax_entries: collectRows('#tax-rows-list .tax-row', row => {
      const s = row.querySelectorAll('select,input');
      return { tax_type: s[0].value, amount: s[1].value, status: s[2].value, entry_date: s[3].value };
    }),
    vesting_deeds: collectBlocks('[id^=deed]', row => {
      const i=row.querySelectorAll('select,input,textarea');
      return {deed_type:i[0].value,dated:i[1].value,recorded:i[2].value,bk_pg_doc:i[3].value,instrument_number:i[4].value,consideration:i[5].value,grantor:i[6].value,grantee:i[7].value,notes:i[8].value};
    }),
    open_mortgages: collectBlocks('[id^=mort]', row => {
      const i=row.querySelectorAll('select,input,textarea');
      return {doc_type:i[0].value,mortgage_type:i[1].value,dated:i[2].value,recorded:i[3].value,bk_pg_doc:i[4].value,instrument_number:i[5].value,amount:i[6].value,borrower:i[7].value,lender:i[8].value,trustee:i[9].value,notes:i[10].value};
    }),
    satellite_documents: collectBlocks('[id^=sat]', row => {
      const i=row.querySelectorAll('input,select,textarea');
      return {title:i[0].value,dated:i[1].value,recorded:i[2].value,bk_pg_doc:i[3].value,instrument_number:i[4].value,assignor:i[6].value,assignee:i[7].value,notes:i[8].value};
    }),
    liens_judgements: collectBlocks('[id^=lien]', row => {
      const i=row.querySelectorAll('select,input');
      return {doc_name:i[0].value,dated:i[1].value,recorded:i[2].value,bk_pg_doc:i[3].value,instrument_number:i[4].value,case_number:i[5].value,amount:i[6].value,creditor:i[7].value,debtor:i[8].value};
    }),
    rows_ccrs_easements: collectBlocks('[id^=row]', row => {
      const i=row.querySelectorAll('select,input,textarea');
      return {doc_name:i[0].value,dated:i[1].value,recorded:i[2].value,bk_pg_doc:i[3].value,instrument_number:i[4].value,notes:i[5].value};
    }),
    divorce_probate: collectBlocks('[id^=prob]', row => {
      const i=row.querySelectorAll('select,input,textarea');
      return {doc_name:i[0].value,dated:i[1].value,recorded:i[2].value,bk_pg_doc:i[3].value,instrument_number:i[4].value,notes:i[5].value};
    }),
    misc_docs: collectBlocks('[id^=misc]', row => {
      const i=row.querySelectorAll('input,textarea');
      return {doc_name:i[0].value,dated:i[1].value,recorded:i[2].value,bk_pg_doc:i[3].value,instrument_number:i[4].value,notes:i[5].value};
    }),
  };
  openPreviewModal(d);
}

function openPreviewModal(r) {
  const html = buildReportHTML(r);
  const backdrop = document.getElementById('modal-backdrop');
  document.getElementById('modal-title').textContent = 'Report Preview — Order #' + (r.order_no||'');
  document.getElementById('modal-body').innerHTML = `
    <div style="display:flex;gap:10px;margin-bottom:12px;justify-content:flex-end;align-items:center">
      <button class="btn btn-secondary btn-sm" id="btn-print" onclick="printReport()" style="display:inline-flex;align-items:center;gap:6px;padding:8px 16px;font-size:13px;font-weight:500">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        Print
      </button>
      <button class="btn btn-primary btn-sm" id="btn-download" onclick="downloadPDF()" style="display:inline-flex;align-items:center;gap:6px;padding:8px 18px;font-size:13px;font-weight:500;background:#1B2B4B;color:#fff;border:none;border-radius:6px;cursor:pointer">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Download PDF
      </button>
    </div>
    <div style="border:1px solid #ddd;border-radius:6px;overflow:hidden">
      <iframe id="report-iframe" style="width:100%;height:72vh;border:none;background:#fff;display:block"></iframe>
    </div>`;
  backdrop.classList.remove('hidden');

  // Render inside iframe for accurate WYSIWYG preview
  setTimeout(() => {
    const iframe = document.getElementById('report-iframe');
    if (!iframe) return;
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>${getReportCSS()}</style></head><body>${html}</body></html>`);
    doc.close();
  }, 50);

  window._currentReportHTML = html;
  window._currentReportOrderNo = r.order_no || 'report';
}

function printReport() {
  openPrintWindow(window._currentReportHTML, window._currentReportOrderNo || 'report');
}

function downloadPDF() {
  // Most reliable approach: open a styled print window — user saves as PDF via browser print dialog
  // This works 100% regardless of CORS, off-screen rendering, or CDN availability
  openPrintWindow(window._currentReportHTML, window._currentReportOrderNo || 'report');
}

function openPrintWindow(reportHTML, orderNo) {
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) { alert('Please allow pop-ups for this site to download PDF.'); return; }
  const fullHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>GeniusOne — Order #${orderNo}</title>
  <style>
    ${getReportCSS()}
    @page { size: A4 portrait; margin: 12mm 15mm; }
    @media print {
      html, body { width: 100%; margin: 0; padding: 0; background: #fff; }
      .report-page { padding: 0; max-width: 100%; }
      .no-print { display: none !important; }
    }
    body { background: #f0f0f0; }
    .print-toolbar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
      background: #1B2B4B; color: #fff; padding: 10px 20px;
      display: flex; align-items: center; justify-content: space-between;
      font-family: Arial, sans-serif; font-size: 13px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .print-toolbar .ptitle { font-weight: 600; font-size: 14px; }
    .print-toolbar .hint { font-size: 12px; color: rgba(255,255,255,0.7); }
    .print-toolbar .pbtn {
      background: #E8511A; color: #fff; border: none; border-radius: 5px;
      padding: 8px 20px; font-size: 13px; font-weight: 600; cursor: pointer;
      display: inline-flex; align-items: center; gap: 6px;
    }
    .print-toolbar .pbtn:hover { background: #d44518; }
    .print-toolbar .pclose {
      background: rgba(255,255,255,0.15); color: #fff; border: none; border-radius: 5px;
      padding: 8px 14px; font-size: 13px; cursor: pointer; margin-left: 8px;
    }
    .report-wrap { margin-top: 58px; padding: 20px; }
    .report-page { background: #fff; box-shadow: 0 2px 16px rgba(0,0,0,0.15); border-radius: 4px; }
  </style>
</head>
<body>
  <div class="print-toolbar no-print">
    <div>
      <div class="ptitle">GeniusOne — Order #${orderNo}</div>
      <div class="hint">Click "Save as PDF" → choose PDF as printer to download</div>
    </div>
    <div style="display:flex;align-items:center;gap:8px">
      <button class="pbtn" onclick="window.print()">
        <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Save / Print as PDF
      </button>
      <button class="pclose" onclick="window.close()">✕ Close</button>
    </div>
  </div>
  <div class="report-wrap">
    ${reportHTML}
  </div>
  <script>
    // Auto-open print dialog after content loads
    window.addEventListener('load', function() {
      setTimeout(function() { window.print(); }, 800);
    });
  <\/script>
</body>
</html>`;
  w.document.open();
  w.document.write(fullHTML);
  w.document.close();
}

// ── LOGO SVG ─────────────────────────────────────────────────
// Returns the GeniusOne logo as inline SVG — no external file needed
// mode: 'dark' = navy text (for report/login), 'light' = white text (for sidebar)
function getLogoSVG(mode) {
  const textColor   = mode === 'light' ? '#ffffff' : '#1B2B4B';
  const subColor    = mode === 'light' ? 'rgba(255,255,255,0.6)' : '#E8511A';
  const subText     = mode === 'light' ? 'Typing Portal' : 'Excellence Delivered';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 230 64" width="184" height="52" style="display:block">
  <!-- Red circle background -->
  <circle cx="32" cy="32" r="30" fill="#D42B2B"/>
  <!-- White swirl G shape (approximated from actual logo) -->
  <path d="
    M32 10
    C19 10 10 20 10 32
    C10 44 19 54 32 54
    C42 54 50 48 53 39
    L38 39
    C36 43 34 45 32 45
    C24 45 19 39 19 32
    C19 25 24 19 32 19
    C37 19 41 22 43 27
    L34 27
    L34 35
    L54 35
    L54 27
    C51 17 42 10 32 10 Z
  " fill="white"/>
  <!-- House outline inside circle -->
  <path d="M32 20 L24 27 L24 40 L28.5 40 L28.5 33 L35.5 33 L35.5 40 L40 40 L40 27 Z" fill="#D42B2B" opacity="0.85"/>
  <path d="M32 17 L21 27 L23.5 27 L32 19.5 L40.5 27 L43 27 Z" fill="#D42B2B" opacity="0.85"/>
  <!-- GeniusOne text -->
  <text x="70" y="30" font-family="Arial,Helvetica,sans-serif" font-size="22" font-weight="700" fill="${textColor}" letter-spacing="0">GeniusOne</text>
  <!-- Tagline -->
  <text x="70" y="48" font-family="Arial,Helvetica,sans-serif" font-size="10" fill="${subColor}" letter-spacing="1.5">${subText}</text>
</svg>`;
}

function getReportCSS() {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; color: #000; background: #fff; }
    .report-page { width: 100%; max-width: 820px; margin: 0 auto; padding: 28px 36px; }
    .report-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1B2B4B; padding-bottom: 14px; margin-bottom: 18px; }
    .report-company { font-size: 12pt; line-height: 1.6; }
    .report-company strong { font-size: 13pt; color: #1B2B4B; }
    .report-logo { text-align: right; display: flex; align-items: center; }
    .report-logo img { height: 60px; object-fit: contain; }
    .report-logo .logo-fallback { display: inline-flex; align-items: center; gap: 10px; border: 2px solid #D42B2B; border-radius: 6px; padding: 6px 14px; }
    .report-logo .logo-g { width: 38px; height: 38px; background: #D42B2B; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: bold; font-size: 18pt; font-family: Georgia, serif; }
    .report-logo .logo-text { font-size: 16pt; font-weight: bold; color: #1B2B4B; font-family: Arial, sans-serif; }
    .report-logo .logo-sub { font-size: 8pt; color: #E8511A; letter-spacing: 1.2px; text-transform: uppercase; font-family: Arial, sans-serif; margin-top: 2px; }
    .prop-info-header { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 12px; }
    .prop-info-header .title { font-weight: bold; font-size: 13pt; grid-column: 1; color: #1B2B4B; }
    .prop-info-header .meta { font-size: 11pt; text-align: right; line-height: 1.7; }
    .info-box { border: 1px solid #1B2B4B; padding: 10px 14px; margin-bottom: 12px; }
    .info-row { display: grid; grid-template-columns: 130px 1fr; gap: 4px; padding: 3px 0; font-size: 12pt; }
    .info-row .lbl { font-weight: bold; }
    .info-row-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .section-title { font-weight: bold; font-size: 12pt; margin: 14px 0 6px; border-bottom: 1px solid #1B2B4B; padding-bottom: 3px; color: #1B2B4B; }
    .section-block { border: 1px solid #999; padding: 10px 14px; margin-bottom: 8px; font-size: 12pt; }
    .block-row { display: flex; flex-wrap: wrap; gap: 4px 18px; margin-bottom: 4px; font-size: 12pt; }
    .block-field { display: flex; gap: 5px; font-size: 12pt; }
    .block-field .lbl { font-weight: bold; white-space: nowrap; }
    .tax-table { width: 100%; border-collapse: collapse; font-size: 12pt; margin-top: 6px; }
    .tax-table th { background: #f0f0f0; border: 1px solid #999; padding: 5px 8px; text-align: left; font-weight: bold; }
    .tax-table td { border: 1px solid #ccc; padding: 5px 8px; }
    .disclaimer-box { border: 1px solid #999; padding: 10px; font-size: 9pt; margin-top: 14px; line-height: 1.5; color: #444; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .separator { border: none; border-top: 1px dashed #aaa; margin: 6px 0; }
    .subsection-title { font-weight: bold; font-size: 11pt; margin: 6px 0 3px; color: #1B2B4B; }
    .notes-box { background: #f9f9f9; padding: 5px 10px; font-size: 11pt; border-left: 3px solid #D42B2B; margin-top: 6px; white-space: pre-wrap; }
    .chain-box { border: 1px solid #999; padding: 10px; font-size: 12pt; white-space: pre-wrap; min-height: 60px; }
    @media print { .report-page { padding: 14px 22px; } }
  `;
}

function fmt(v, prefix='') { return v ? prefix + v : '—'; }
function fmtMoney(v) { if (!v) return '—'; return '$' + parseFloat(v).toLocaleString('en-US', {minimumFractionDigits:2}); }
function fmtD(v) { if (!v) return '—'; try { return new Date(v+'T00:00:00').toLocaleDateString('en-US',{month:'numeric',day:'numeric',year:'numeric'}); } catch { return v; } }

function buildReportHTML(r) {
  const taxes = r.tax_entries || [];
  const deeds = r.vesting_deeds || [];
  const mortgages = r.open_mortgages || [];
  const satdocs = r.satellite_documents || [];
  const liens = r.liens_judgements || [];
  const rows = r.rows_ccrs_easements || [];
  const probates = r.divorce_probate || [];
  const miscs = r.misc_docs || [];

  const taxRows = taxes.length ? taxes.map(t => `
    <tr>
      <td>${t.tax_type||'—'}</td>
      <td>${fmtMoney(t.amount)}</td>
      <td>${t.status||'—'}</td>
      <td>${fmtD(t.entry_date)}</td>
    </tr>`).join('') : '<tr><td colspan="4" style="color:#888;text-align:center">None</td></tr>';

  const deedBlocks = deeds.map((d,i) => `
    <div class="section-block">
      <div class="block-row">
        <div class="block-field"><span class="lbl">Deed:</span> ${d.deed_type||'—'}</div>
        <div class="block-field"><span class="lbl">Dated:</span> ${fmtD(d.dated)}</div>
        <div class="block-field"><span class="lbl">Recorded:</span> ${fmtD(d.recorded)}</div>
        <div class="block-field"><span class="lbl">Bk/Pg/Doc:</span> ${d.bk_pg_doc||'—'}</div>
        <div class="block-field"><span class="lbl">Consideration:</span> ${fmtMoney(d.consideration)}</div>
      </div>
      <div class="block-row">
        <div class="block-field"><span class="lbl">Instrument #:</span> ${d.instrument_number||'—'}</div>
      </div>
      <div class="block-row">
        <div class="block-field"><span class="lbl">Grantor:</span> ${d.grantor||'—'}</div>
      </div>
      <div class="block-row">
        <div class="block-field"><span class="lbl">Grantee:</span> ${d.grantee||'—'}</div>
      </div>
      ${d.notes ? `<div class="notes-box">Notes: ${d.notes}</div>` : ''}
    </div>`).join('') || '<div class="section-block" style="color:#888">None</div>';

  const mortBlocks = mortgages.map(m => `
    <div class="section-block">
      <div class="block-row">
        <div class="block-field"><span class="lbl">Doc Type:</span> ${m.doc_type||'—'}</div>
        <div class="block-field"><span class="lbl">Type:</span> ${m.mortgage_type||'—'}</div>
        <div class="block-field"><span class="lbl">Dated:</span> ${fmtD(m.dated)}</div>
        <div class="block-field"><span class="lbl">Recorded:</span> ${fmtD(m.recorded)}</div>
        <div class="block-field"><span class="lbl">Bk/Pg/Doc:</span> ${m.bk_pg_doc||'—'}</div>
        <div class="block-field"><span class="lbl">Amount:</span> ${fmtMoney(m.amount)}</div>
      </div>
      <div class="block-row">
        <div class="block-field"><span class="lbl">Instrument #:</span> ${m.instrument_number||'—'}</div>
      </div>
      <div class="block-row">
        <div class="block-field"><span class="lbl">Borrower:</span> ${m.borrower||'—'}</div>
      </div>
      <div class="block-row">
        <div class="block-field"><span class="lbl">Lender:</span> ${m.lender||'—'}</div>
      </div>
      ${m.trustee ? `<div class="block-row"><div class="block-field"><span class="lbl">Trustee:</span> ${m.trustee}</div></div>` : ''}
      ${m.notes ? `<div class="notes-box">${m.notes}</div>` : ''}
      ${(m.mod_dated||m.mod_recorded||m.mod_bk_pg_doc) ? `
        <hr class="separator"/>
        <div class="subsection-title">Modification:</div>
        <div class="block-row">
          <div class="block-field"><span class="lbl">Dated:</span> ${fmtD(m.mod_dated)}</div>
          <div class="block-field"><span class="lbl">Recorded:</span> ${fmtD(m.mod_recorded)}</div>
          <div class="block-field"><span class="lbl">Bk/Pg/Doc:</span> ${m.mod_bk_pg_doc||'—'}</div>
          <div class="block-field"><span class="lbl">Inst#:</span> ${m.mod_instrument_number||'—'}</div>
        </div>
        ${m.mod_notes ? `<div class="notes-box">${m.mod_notes}</div>` : ''}` : ''}
      ${(m.lp_dated||m.lp_recorded||m.lp_bk_pg_doc) ? `
        <hr class="separator"/>
        <div class="subsection-title">Lis Pendens:</div>
        <div class="block-row">
          <div class="block-field"><span class="lbl">Dated:</span> ${fmtD(m.lp_dated)}</div>
          <div class="block-field"><span class="lbl">Recorded:</span> ${fmtD(m.lp_recorded)}</div>
          <div class="block-field"><span class="lbl">Bk/Pg/Doc:</span> ${m.lp_bk_pg_doc||'—'}</div>
          <div class="block-field"><span class="lbl">Inst#:</span> ${m.lp_instrument_number||'—'}</div>
        </div>
        ${m.lp_notes ? `<div class="notes-box">${m.lp_notes}</div>` : ''}` : ''}
    </div>`).join('') || '<div class="section-block" style="color:#888">None</div>';

  const satBlocks = satdocs.map(s => `
    <div class="section-block">
      <div class="block-row">
        <div class="block-field"><span class="lbl">Title:</span> ${s.title||'—'}</div>
        <div class="block-field"><span class="lbl">Type:</span> ${s.doc_type||'—'}</div>
        <div class="block-field"><span class="lbl">Dated:</span> ${fmtD(s.dated)}</div>
        <div class="block-field"><span class="lbl">Recorded:</span> ${fmtD(s.recorded)}</div>
        <div class="block-field"><span class="lbl">Bk/Pg/Doc:</span> ${s.bk_pg_doc||'—'}</div>
        <div class="block-field"><span class="lbl">Inst#:</span> ${s.instrument_number||'—'}</div>
      </div>
      ${s.assignor ? `<div class="block-row"><div class="block-field"><span class="lbl">Assignor:</span> ${s.assignor}</div></div>` : ''}
      ${s.assignee ? `<div class="block-row"><div class="block-field"><span class="lbl">Assignee:</span> ${s.assignee}</div></div>` : ''}
      ${s.notes ? `<div class="notes-box">${s.notes}</div>` : ''}
    </div>`).join('') || '';

  const lienBlocks = liens.map(l => `
    <div class="section-block">
      <div class="block-row">
        <div class="block-field"><span class="lbl">Doc Name:</span> ${l.doc_name||'—'}</div>
        <div class="block-field"><span class="lbl">Dated:</span> ${fmtD(l.dated)}</div>
        <div class="block-field"><span class="lbl">Recorded:</span> ${fmtD(l.recorded)}</div>
        <div class="block-field"><span class="lbl">Bk/Pg/Doc:</span> ${l.bk_pg_doc||'—'}</div>
        <div class="block-field"><span class="lbl">Amount:</span> ${fmtMoney(l.amount)}</div>
      </div>
      <div class="block-row">
        <div class="block-field"><span class="lbl">Creditor:</span> ${l.creditor||'—'}</div>
        <div class="block-field"><span class="lbl">Debtor:</span> ${l.debtor||'—'}</div>
      </div>
    </div>`).join('') || '';

  const rowBlocks = rows.map(rw => `
    <div class="section-block">
      <div class="block-row">
        <div class="block-field"><span class="lbl">Doc Name:</span> ${rw.doc_name||'—'}</div>
        <div class="block-field"><span class="lbl">Dated:</span> ${fmtD(rw.dated)}</div>
        <div class="block-field"><span class="lbl">Recorded:</span> ${fmtD(rw.recorded)}</div>
        <div class="block-field"><span class="lbl">Bk/Pg/Doc:</span> ${rw.bk_pg_doc||'—'}</div>
      </div>
      ${rw.notes ? `<div class="notes-box">${rw.notes}</div>` : ''}
    </div>`).join('') || '';

  const probateBlocks = probates.map(p => `
    <div class="section-block">
      <div class="block-row">
        <div class="block-field"><span class="lbl">Doc Name:</span> ${p.doc_name||'—'}</div>
        <div class="block-field"><span class="lbl">Dated:</span> ${fmtD(p.dated)}</div>
        <div class="block-field"><span class="lbl">Recorded:</span> ${fmtD(p.recorded)}</div>
        <div class="block-field"><span class="lbl">Bk/Pg/Doc:</span> ${p.bk_pg_doc||'—'}</div>
      </div>
      ${p.notes ? `<div class="notes-box">${p.notes}</div>` : ''}
    </div>`).join('') || '';

  const miscBlocks = miscs.map(m => `
    <div class="section-block">
      <div class="block-row">
        <div class="block-field"><span class="lbl">Doc Name:</span> ${m.doc_name||'—'}</div>
        <div class="block-field"><span class="lbl">Dated:</span> ${fmtD(m.dated)}</div>
        <div class="block-field"><span class="lbl">Recorded:</span> ${fmtD(m.recorded)}</div>
        <div class="block-field"><span class="lbl">Bk/Pg/Doc:</span> ${m.bk_pg_doc||'—'}</div>
      </div>
      ${m.notes ? `<div class="notes-box">${m.notes}</div>` : ''}
    </div>`).join('') || '';

  return `
  <div class="report-page">
    <!-- HEADER -->
    <div class="report-header">
      <div class="report-company">
        <strong>GeniusOne Solutions LLC</strong><br>
        30 N Gould St Ste R<br>
        Sheridan, WY 82801 USA<br>
        307-318-4001<br>
        orders@geniusonesolutions.com
      </div>
      <div class="report-logo"><img src="data:image/png;base64,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" alt="GeniusOne" style="height:60px;object-fit:contain;max-width:200px"/></div>
    </div>

    <!-- PROPERTY INFO HEADER -->
    <div class="prop-info-header">
      <div class="title">Property Information</div>
      <div class="meta">
        <strong>Search Type:</strong> ${r.search_type||'Full Search'}&nbsp;&nbsp;&nbsp;
        <strong>Creation Date:</strong> ${fmtD(r.creation_date)}<br>
        <strong>Order #:</strong> ${r.order_no||'—'}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        <strong>Effective Date:</strong> ${fmtD(r.effective_date)}
      </div>
    </div>

    <!-- ADDRESS BOX -->
    <div class="info-box">
      <div class="info-row"><span class="lbl">Address:</span><span>${r.address||''}</span></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
        <div class="info-row"><span class="lbl">Cnty/ST:</span><span>${r.county_state||''}</span></div>
        <div class="info-row"><span class="lbl">Zip code:</span><span>${r.zip_code||''}</span></div>
        <div class="info-row"><span class="lbl">Owner:</span><span>${r.owner||''}</span></div>
        <div class="info-row"><span class="lbl">Bwr/Buyer:</span><span>${r.buyer_borrower||''}</span></div>
      </div>
    </div>

    <!-- TAX AND ASSESSMENT -->
    <div class="section-title">Tax and Assessment Info</div>
    <div class="info-box">
      <div class="block-row">
        <div class="block-field"><span class="lbl">APN:</span> ${r.apn||'—'}</div>
        <div class="block-field"><span class="lbl">Land:</span> ${fmtMoney(r.land_value)}</div>
        <div class="block-field"><span class="lbl">Improvements:</span> ${fmtMoney(r.improvements_value)}</div>
        <div class="block-field"><span class="lbl">Total:</span> ${fmtMoney(r.total_value)}</div>
        <div class="block-field"><span class="lbl">Exempt:</span> ${r.exempt||'None'}</div>
      </div>
      <div class="block-row">
        <div class="block-field"><span class="lbl">Brief Legal:</span> ${r.brief_legal||'—'}</div>
        <div class="block-field"><span class="lbl">Spl Assess:</span> ${r.spl_assess||'None'}</div>
      </div>
      ${taxes.length ? `
      <table class="tax-table" style="margin-top:6px">
        <thead><tr><th>Tax Type</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>${taxRows}</tbody>
      </table>` : ''}
    </div>

    <!-- VESTING DEEDS -->
    <div class="section-title">Vesting Deeds</div>
    ${deedBlocks}

    <!-- OPEN MORTGAGES -->
    <div class="section-title">Open Mortgages</div>
    ${mortBlocks}

    <!-- SATELLITE DOCS -->
    ${satdocs.length ? `<div class="section-title">Satellite Documents</div>${satBlocks}` : ''}

    <!-- LIENS -->
    ${liens.length ? `<div class="section-title">Liens and Judgements</div>${lienBlocks}` : ''}

    <!-- ROWS CCRs -->
    ${rows.length ? `<div class="section-title">ROWs, CCRs, Easements</div>${rowBlocks}` : ''}

    <!-- DIVORCE PROBATE -->
    ${probates.length ? `<div class="section-title">Divorce/Probate</div>${probateBlocks}` : ''}

    <!-- MISC DOCS -->
    ${miscs.length ? `<div class="section-title">Misc Docs</div>${miscBlocks}` : ''}

    <!-- PLAT MAPS -->
    ${(r.plat_dated||r.plat_bk_pg_doc) ? `
    <div class="section-title">Plat Maps</div>
    <div class="section-block">
      <div class="block-row">
        <div class="block-field"><span class="lbl">Dated:</span> ${fmtD(r.plat_dated)}</div>
        <div class="block-field"><span class="lbl">Recorded:</span> ${fmtD(r.plat_recorded)}</div>
        <div class="block-field"><span class="lbl">Bk/Pg/Doc:</span> ${r.plat_bk_pg_doc||'—'}</div>
        <div class="block-field"><span class="lbl">Inst No:</span> ${r.plat_instrument_no||'—'}</div>
      </div>
      ${r.plat_notes ? `<div class="notes-box">${r.plat_notes}</div>` : ''}
    </div>` : ''}

    <!-- NOTES (plat) -->
    ${r.plat_notes && !r.plat_dated ? `<div class="section-title">Notes</div><div class="chain-box">${r.plat_notes}</div>` : ''}

    <!-- LEGAL DESCRIPTION -->
    ${r.legal_description ? `<div class="section-title">Legal Description</div><div class="chain-box">${r.legal_description}</div>` : ''}

    <!-- CHAIN OF TITLE -->
    ${r.chain_of_title ? `<div class="section-title">Chain of Title</div><div class="chain-box">${r.chain_of_title}</div>` : ''}

    <!-- DISCLAIMER -->
    <div class="disclaimer-box">
      <strong>Disclaimer:</strong> The information in this report was obtained by GeniusOne Solutions LLC through records at the county courthouse. Every attempt has been made to ensure thorough, accurate information. The report may not contain information affecting the above real estate that cannot be indexed due to different spelling of owner's name, incorrectly recorded parcel number or incorrect recorder or tax assessment office information. Liability is limited to search cost.
    </div>
  </div>`;
}

// ── SETTINGS ─────────────────────────────────────────────────
function loadSettings() {
  document.getElementById('settings-content').innerHTML = `
    <div class="settings-tabs">
      <button class="stab active" onclick="showSettingsTab('activity',this)">Activity Logs</button>
      <button class="stab" onclick="showSettingsTab('permissions',this)">Permissions</button>
    </div>
    <div id="stab-activity" class="stab-panel">
      <div style="padding:12px 0;color:var(--gray-600);font-size:13px">Loading activity logs…</div>
    </div>
    <div id="stab-permissions" class="stab-panel hidden">
      ${buildPermissionsUI()}
    </div>`;
  loadActivityLogs();
}

function showSettingsTab(name, btn) {
  document.querySelectorAll('.stab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.stab-panel').forEach(p => p.classList.add('hidden'));
  btn.classList.add('active');
  document.getElementById('stab-' + name).classList.remove('hidden');
}

async function loadActivityLogs() {
  try {
    const res = await apiFetch('/api/records?limit=50');
    const panel = document.getElementById('stab-activity');
    if (!res.records || !res.records.length) {
      panel.innerHTML = '<div style="padding:20px;color:var(--gray-600);text-align:center">No activity yet.</div>';
      return;
    }
    const rows = res.records.map(r => `<tr>
      <td>${fmtDate(r.created_at)}</td>
      <td><strong style="font-family:var(--mono)">${r.order_no}</strong></td>
      <td>${r.address||'—'}</td>
      <td>${r.owner||'—'}</td>
      <td><span class="badge badge-${r.status}">${r.status.replace('_',' ')}</span></td>
    </tr>`).join('');
    panel.innerHTML = `<table class="data-table"><thead><tr>
      <th>Date</th><th>Order #</th><th>Address</th><th>Owner</th><th>Status</th>
    </tr></thead><tbody>${rows}</tbody></table>`;
  } catch(e) {
    document.getElementById('stab-activity').innerHTML = '<div style="padding:20px;color:var(--gray-600)">Failed to load logs.</div>';
  }
}

function buildPermissionsUI() {
  const perms = JSON.parse(localStorage.getItem('go_permissions') || '{}');
  const def = (k, d) => perms[k] !== undefined ? perms[k] : d;

  return `
    <div style="max-width:600px">
      <p style="font-size:13px;color:var(--gray-600);margin-bottom:16px">Control what typists can see and do. Changes apply immediately.</p>

      <div class="perm-group">
        <div class="perm-group-title">Records View</div>
        <div class="perm-row">
          <div>
            <div class="perm-label">Typists can see</div>
            <div class="perm-desc">Choose whether typists see only their own records or all records</div>
          </div>
          <select class="perm-select" onchange="savePerm('records_view',this.value)">
            <option value="own" ${def('records_view','own')==='own'?'selected':''}>Own records only</option>
            <option value="all" ${def('records_view','own')==='all'?'selected':''}>All records</option>
          </select>
        </div>
      </div>

      <div class="perm-group">
        <div class="perm-group-title">Typist Capabilities</div>
        ${permToggle('can_delete','Allow typists to delete records',false,perms)}
        ${permToggle('can_export','Allow typists to download PDF / print',true,perms)}
        ${permToggle('can_change_status','Allow typists to change record status',true,perms)}
      </div>

      <div class="perm-group">
        <div class="perm-group-title">Record Sections (visible to typists)</div>
        ${permToggle('show_liens','Show Liens & Judgements section',true,perms)}
        ${permToggle('show_probate','Show Divorce/Probate section',true,perms)}
        ${permToggle('show_misc','Show Misc Docs section',true,perms)}
        ${permToggle('show_chain','Show Chain of Title section',true,perms)}
      </div>

      <button class="btn btn-primary btn-sm" onclick="applyPermissions()" style="margin-top:8px">Save Permissions</button>
      <span id="perm-saved" style="margin-left:10px;font-size:12px;color:#2e7d32;display:none">✓ Saved</span>
    </div>`;
}

function permToggle(key, label, defaultVal, perms) {
  const checked = perms[key] !== undefined ? perms[key] : defaultVal;
  return `<div class="perm-row">
    <div>
      <div class="perm-label">${label}</div>
    </div>
    <label class="toggle">
      <input type="checkbox" id="perm-${key}" ${checked?'checked':''}>
      <span class="toggle-slider"></span>
    </label>
  </div>`;
}

function savePerm(key, value) {
  const p = JSON.parse(localStorage.getItem('go_permissions') || '{}');
  p[key] = value;
  localStorage.setItem('go_permissions', JSON.stringify(p));
}

function applyPermissions() {
  const keys = ['can_delete','can_export','can_change_status','show_liens','show_probate','show_misc','show_chain'];
  const p = JSON.parse(localStorage.getItem('go_permissions') || '{}');
  keys.forEach(k => {
    const el = document.getElementById('perm-' + k);
    if (el) p[k] = el.checked;
  });
  localStorage.setItem('go_permissions', JSON.stringify(p));
  const saved = document.getElementById('perm-saved');
  saved.style.display = 'inline';
  setTimeout(() => saved.style.display = 'none', 2000);
}

// ── USERS ────────────────────────────────────────────────────
async function loadUsers() {
  try {
    const res = await apiFetch('/api/auth/users');
    const rows = res.users.map(u => `<tr>
      <td><strong>${u.full_name}</strong></td>
      <td>${u.email}</td>
      <td><span class="badge badge-${u.role==='admin'?'reviewed':'completed'}">${u.role}</span></td>
      <td><span class="badge badge-${u.is_active?'completed':'draft'}">${u.is_active?'Active':'Inactive'}</span></td>
      <td>${fmtDate(u.created_at)}</td>
      <td><div class="actions">
        <button class="btn btn-sm btn-secondary" onclick="showEditUserModal('${u.id}','${u.full_name.replace(/'/g,"\\'")}','${u.email}','${u.role}')" title="Edit user">Edit</button>

        <button class="btn btn-sm btn-secondary" onclick="toggleUser('${u.id}',${!u.is_active})">${u.is_active?'Disable':'Enable'}</button>
        <button class="btn btn-sm btn-danger" onclick="deleteUser('${u.id}','${u.full_name.replace(/'/g,"\\'")}')">Delete</button>
      </div></td>
    </tr>`).join('');
    document.getElementById('users-table').innerHTML = `
      <table class="data-table"><thead><tr>
        <th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Created</th><th style="min-width:260px"></th>
      </tr></thead><tbody>${rows}</tbody></table>`;
  } catch (e) { console.error(e); }
}

async function toggleUser(id, is_active) {
  await apiFetch('/api/auth/users/'+id, 'PATCH', { is_active });
  loadUsers();
}

async function deleteUser(id, name) {
  if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
  try {
    await apiFetch('/api/auth/users/'+id, 'DELETE');
    loadUsers();
  } catch(e) { alert('Delete failed: ' + (e.message||'Unknown error')); }
}

function showEditUserModal(id, name, email, role) {
  document.getElementById('modal-title').textContent = 'Edit User';
  document.getElementById('modal-body').innerHTML = `
    <div class="field"><label>Full Name</label><input type="text" id="eu-name" value="${esc(name)}" placeholder="Full name"/></div>
    <div class="field"><label>Email</label><input type="email" id="eu-email" value="${esc(email)}" placeholder="user@email.com"/></div>
    <div class="field"><label>New Password <span style="font-weight:400;color:var(--gray-600)">(leave blank to keep current)</span></label><input type="password" id="eu-password" placeholder="New password (optional)"/></div>
    <div class="field"><label>Role</label><select id="eu-role"><option value="typist"${role==='typist'?' selected':''}>Typist</option><option value="admin"${role==='admin'?' selected':''}>Admin</option></select></div>
    <div id="eu-error" class="alert alert-error hidden"></div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveEditUser('${id}')">Save Changes</button>
    </div>`;
  document.getElementById('modal-backdrop').classList.remove('hidden');
}

async function saveEditUser(id) {
  const errEl = document.getElementById('eu-error');
  errEl.classList.add('hidden');
  const payload = {
    full_name: document.getElementById('eu-name').value.trim(),
    email: document.getElementById('eu-email').value.trim(),
    role: document.getElementById('eu-role').value
  };
  const pw = document.getElementById('eu-password').value;
  if (pw) payload.password = pw;
  if (!payload.full_name || !payload.email) { showError(errEl, 'Name and email are required'); return; }
  try {
    await apiFetch('/api/auth/users/'+id, 'PATCH', payload);
    closeModal();
    loadUsers();
  } catch(e) { showError(errEl, e.message || 'Update failed'); }
}


async function createUser() {
  const errEl = document.getElementById('mu-error');
  errEl.classList.add('hidden');
  try {
    await apiFetch('/api/auth/register','POST',{
      full_name: document.getElementById('mu-name').value,
      email: document.getElementById('mu-email').value,
      password: document.getElementById('mu-password').value,
      role: document.getElementById('mu-role').value
    });
    closeModal();
    loadUsers();
  } catch(e) { showError(errEl, e.message); }
}

function closeModal() { document.getElementById('modal-backdrop').classList.add('hidden'); }

// ── UTILITIES ────────────────────────────────────────────────
async function apiFetch(url, method='GET', body=null, noAuth=false) {
  const headers = { 'Content-Type': 'application/json' };
  if (!noAuth && token) headers['Authorization'] = 'Bearer ' + token;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function val(id) { const el=document.getElementById(id); return el?el.value.trim():''; }
function num(id) { const v=val(id); return v?parseFloat(v):null; }
function esc(s) { return s?String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'):''; }
function today() { return new Date().toISOString().split('T')[0]; }
function fmtDate(s) { if(!s)return'—'; return new Date(s).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); }
function showError(el, msg) { el.textContent=msg; el.className='alert alert-error'; }
function showAlert(el, msg, type) { el.textContent=msg; el.className='alert alert-'+type; }