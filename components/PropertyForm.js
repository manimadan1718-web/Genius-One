import { useState, useCallback } from 'react'

const EMPTY_TAX = () => ({ type: 'Real Estate', amount: '', status: 'Paid', date: '' })
const EMPTY_DEED = () => ({ deed_type: 'Deed of Bargain and Sale', dated: '', recorded: '', bkpgdoc: '', instrument_no: '', consideration: '', grantor: '', grantee: '', notes: '' })
const EMPTY_MORTGAGE = () => ({ doc_type: 'Deed of Trust', type: 'Closed Ended', dated: '', recorded: '', bkpgdoc: '', instrument_no: '', amount: '', borrower: '', lender: '', trustee: '', notes: '', modification: { dated: '', recorded: '', bkpgdoc: '', instrument_no: '', notes: '' }, lis_pendens: { dated: '', recorded: '', bkpgdoc: '', instrument_no: '', notes: '' } })
const EMPTY_SATDOC = () => ({ title: '', dated: '', recorded: '', bkpgdoc: '', instrument_no: '', type: 'Assignment', assignor: '', assignee: '', notes: '' })
const EMPTY_LIEN = () => ({ doc_name: 'Judgment', dated: '', recorded: '', bkpgdoc: '', instrument_no: '', case_no: '', amount: '', creditor: '', debtor: '' })
const EMPTY_ROW = () => ({ doc_name: 'Right of Way', dated: '', recorded: '', bkpgdoc: '', instrument_no: '', notes: '' })
const EMPTY_PROBATE = () => ({ doc_name: 'List of Heirs', dated: '', recorded: '', bkpgdoc: '', instrument_no: '', notes: '' })
const EMPTY_MISC = () => ({ doc_name: '', dated: '', recorded: '', bkpgdoc: '', instrument_no: '', notes: '' })

export default function PropertyForm({ initialData = {}, onSave, saving }) {
  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    order_no: '', search_type: 'Full Search', creation_date: today, effective_date: today,
    address: '', county_state: '', zip_code: '', owner: '', buyer_borrower: '',
    apn: '', land: '', improvements: '', total: '', exempt: '', spl_assess: '', brief_legal: '',
    tax_entries: [EMPTY_TAX()],
    vesting_deeds: [EMPTY_DEED()],
    open_mortgages: [EMPTY_MORTGAGE()],
    satellite_docs: [],
    liens_judgements: [],
    rows_ccrs_easements: [],
    divorce_probate: [],
    misc_docs: [],
    plat_dated: '', plat_recorded: '', plat_bkpgdoc: '', plat_instrument_no: '', plat_notes: '',
    legal_description: '', chain_of_title: '',
    status: 'draft',
    ...initialData
  })

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))

  const arrAdd = (field, empty) => setForm(f => ({ ...f, [field]: [...(f[field] || []), empty()] }))
  const arrRemove = (field, i) => setForm(f => ({ ...f, [field]: f[field].filter((_, idx) => idx !== i) }))
  const arrUpdate = (field, i, key, val) => setForm(f => {
    const arr = [...f[field]]
    arr[i] = { ...arr[i], [key]: val }
    return { ...f, [field]: arr }
  })
  const arrUpdateNested = (field, i, nested, key, val) => setForm(f => {
    const arr = [...f[field]]
    arr[i] = { ...arr[i], [nested]: { ...arr[i][nested], [key]: val } }
    return { ...f, [field]: arr }
  })

  const F = ({ label, children, span }) => (
    <div className="field" style={span ? { gridColumn: `span ${span}` } : {}}>
      <label>{label}</label>
      {children}
    </div>
  )

  const In = ({ field, placeholder, type = 'text', style }) => (
    <input type={type} value={form[field] || ''} onChange={e => set(field, e.target.value)} placeholder={placeholder} style={style} />
  )

  const Sel = ({ field, children }) => (
    <select value={form[field] || ''} onChange={e => set(field, e.target.value)}>{children}</select>
  )

  const ArrIn = (field, i, key, placeholder, type = 'text') => (
    <input type={type} value={(form[field][i] || {})[key] || ''} onChange={e => arrUpdate(field, i, key, e.target.value)} placeholder={placeholder} />
  )

  const ArrSel = (field, i, key, children) => (
    <select value={(form[field][i] || {})[key] || ''} onChange={e => arrUpdate(field, i, key, e.target.value)}>{children}</select>
  )

  return (
    <>
      {/* META */}
      <div className="meta-row">
        {[['Search Type', <select key="st" value={form.search_type} onChange={e => set('search_type', e.target.value)}><option>Full Search</option><option>Current Owner</option><option>Two Owner</option><option>Foreclosure</option><option>Update</option></select>],
          ['Order #', <input key="on" type="text" value={form.order_no} onChange={e => set('order_no', e.target.value)} placeholder="e.g. 25-05-913" />],
          ['Creation Date', <input key="cd" type="date" value={form.creation_date} onChange={e => set('creation_date', e.target.value)} />],
          ['Effective Date', <input key="ed" type="date" value={form.effective_date} onChange={e => set('effective_date', e.target.value)} />]
        ].map(([label, el]) => (
          <div className="meta-field" key={label}><label>{label}</label>{el}</div>
        ))}
      </div>

      {/* PROPERTY INFO */}
      <Section title="Property Information">
        <div className="grid g2">
          <F label="Address" span={2}><In field="address" placeholder="Street address" /></F>
          <F label="County / State"><In field="county_state" placeholder="Fulton/GA" /></F>
          <F label="Zip Code"><In field="zip_code" placeholder="23323" /></F>
          <F label="Owner"><In field="owner" placeholder="Owner name" /></F>
          <F label="Buyer / Borrower"><In field="buyer_borrower" placeholder="Buyer name" /></F>
        </div>
      </Section>

      {/* TAX */}
      <Section title="Tax and Assessment Info">
        <div className="grid g4">
          <F label="APN" span={2}><In field="apn" placeholder="Assessor Parcel Number" /></F>
          <F label="Land ($)"><In field="land" placeholder="0.00" /></F>
          <F label="Improvements ($)"><In field="improvements" placeholder="0.00" /></F>
          <F label="Total ($)"><In field="total" placeholder="0.00" /></F>
          <F label="Exempt"><Sel field="exempt"><option value="">None</option><option>Homestead</option><option>Senior</option><option>Veteran</option><option>Other</option></Sel></F>
          <F label="Spl Assess"><In field="spl_assess" placeholder="Special assessment" /></F>
          <F label="Brief Legal" span={2}><In field="brief_legal" placeholder="Brief legal description" /></F>
        </div>
        <div className="subsection">
          <div className="subsection-head"><h3>Tax Entries</h3></div>
          <div className="subsection-body">
            {form.tax_entries.map((t, i) => (
              <div className="tax-row" key={i}>
                {ArrSel('tax_entries', i, 'type', <><option>Real Estate</option><option>Storm Water</option><option>Personal Property</option><option>Supplemental</option><option>Special Assessment</option></>)}
                {ArrIn('tax_entries', i, 'amount', '0.00')}
                {ArrSel('tax_entries', i, 'status', <><option>Paid</option><option>Due</option><option>Delinquent</option></>)}
                {ArrIn('tax_entries', i, 'date', '', 'date')}
                <button className="rm-btn" onClick={() => arrRemove('tax_entries', i)}><XIcon /></button>
              </div>
            ))}
            <button className="add-btn" onClick={() => arrAdd('tax_entries', EMPTY_TAX)}><PlusIcon /> Add tax row</button>
          </div>
        </div>
      </Section>

      {/* VESTING DEEDS */}
      <Section title="Vesting Deeds">
        <div className="block-list">
          {form.vesting_deeds.map((d, i) => (
            <div className="block-item" key={i}>
              <div className="block-item-head">
                <span>Deed #{i + 1} {d.deed_type ? `— ${d.deed_type}` : ''}</span>
                <button className="rm-btn" onClick={() => arrRemove('vesting_deeds', i)}><XIcon /></button>
              </div>
              <div className="block-item-body">
                <div className="grid g4">
                  <DeedField f={d} i={i} k="deed_type" label="Deed Type" span={1} comp={ArrSel('vesting_deeds', i, 'deed_type', <><option>Deed of Bargain and Sale</option><option>Warranty Deed</option><option>Quitclaim Deed</option><option>Special Warranty Deed</option><option>Grant Deed</option><option>Trust Deed</option><option>Other</option></>)} />
                  {['dated','recorded'].map(k => <AField key={k} label={k.charAt(0).toUpperCase()+k.slice(1)} el={ArrIn('vesting_deeds',i,k,'','date')} />)}
                  <AField label="Bk/Pg/Doc" el={ArrIn('vesting_deeds',i,'bkpgdoc','Book/Page/Doc')} />
                  <AField label="Instrument #" el={ArrIn('vesting_deeds',i,'instrument_no','Instrument number')} />
                  <AField label="Consideration ($)" el={ArrIn('vesting_deeds',i,'consideration','0.00')} />
                  <AField label="Grantor" span={2} el={ArrIn('vesting_deeds',i,'grantor','Grantor name(s)')} />
                  <AField label="Grantee" span={4} el={ArrIn('vesting_deeds',i,'grantee','Grantee name(s)')} />
                  <AField label="Notes" span={4} el={<textarea value={d.notes||''} onChange={e=>arrUpdate('vesting_deeds',i,'notes',e.target.value)} placeholder="Notes…" style={{minHeight:52}} />} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <button className="add-btn" onClick={() => arrAdd('vesting_deeds', EMPTY_DEED)}><PlusIcon /> Add deed</button>
      </Section>

      {/* OPEN MORTGAGES */}
      <Section title="Open Mortgages">
        <div className="block-list">
          {form.open_mortgages.map((m, i) => (
            <div className="block-item" key={i}>
              <div className="block-item-head">
                <span>Mortgage #{i+1} {m.doc_type ? `— ${m.doc_type}` : ''}</span>
                <button className="rm-btn" onClick={() => arrRemove('open_mortgages', i)}><XIcon /></button>
              </div>
              <div className="block-item-body">
                <div className="grid g4">
                  <AField label="Doc Type" el={ArrSel('open_mortgages',i,'doc_type',<><option>Deed of Trust</option><option>Mortgage</option><option>Open-End Mortgage</option><option>Other</option></>)} />
                  <AField label="Type" el={ArrSel('open_mortgages',i,'type',<><option>Closed Ended</option><option>Open Ended</option><option>HELOC</option><option>Other</option></>)} />
                  <AField label="Dated" el={ArrIn('open_mortgages',i,'dated','','date')} />
                  <AField label="Recorded" el={ArrIn('open_mortgages',i,'recorded','','date')} />
                  <AField label="Bk/Pg/Doc" el={ArrIn('open_mortgages',i,'bkpgdoc','Book/Page/Doc')} />
                  <AField label="Instrument #" el={ArrIn('open_mortgages',i,'instrument_no','Instrument number')} />
                  <AField label="Amount ($)" span={2} el={ArrIn('open_mortgages',i,'amount','0.00')} />
                  <AField label="Borrower" span={2} el={ArrIn('open_mortgages',i,'borrower','Borrower name')} />
                  <AField label="Lender" span={2} el={ArrIn('open_mortgages',i,'lender','Lender name')} />
                  <AField label="Trustee" span={4} el={ArrIn('open_mortgages',i,'trustee','Trustee (if applicable)')} />
                  <AField label="Notes" span={4} el={<textarea value={m.notes||''} onChange={e=>arrUpdate('open_mortgages',i,'notes',e.target.value)} placeholder="Notes…" style={{minHeight:52}} />} />
                </div>
                <div className="subsection" style={{marginTop:12}}>
                  <div className="subsection-head"><h3>Modification</h3></div>
                  <div className="subsection-body">
                    <div className="grid g3">
                      {['dated','recorded'].map(k=><AField key={k} label={k.charAt(0).toUpperCase()+k.slice(1)} el={<input type="date" value={(m.modification||{})[k]||''} onChange={e=>arrUpdateNested('open_mortgages',i,'modification',k,e.target.value)} />} />)}
                      <AField label="Bk/Pg/Doc" el={<input type="text" value={(m.modification||{}).bkpgdoc||''} onChange={e=>arrUpdateNested('open_mortgages',i,'modification','bkpgdoc',e.target.value)} placeholder="Book/Page/Doc" />} />
                      <AField label="Instrument #" el={<input type="text" value={(m.modification||{}).instrument_no||''} onChange={e=>arrUpdateNested('open_mortgages',i,'modification','instrument_no',e.target.value)} placeholder="Instrument number" />} />
                      <AField label="Notes" span={2} el={<input type="text" value={(m.modification||{}).notes||''} onChange={e=>arrUpdateNested('open_mortgages',i,'modification','notes',e.target.value)} placeholder="Modification notes" />} />
                    </div>
                  </div>
                </div>
                <div className="subsection" style={{marginTop:10}}>
                  <div className="subsection-head"><h3>Lis Pendens</h3></div>
                  <div className="subsection-body">
                    <div className="grid g3">
                      {['dated','recorded'].map(k=><AField key={k} label={k.charAt(0).toUpperCase()+k.slice(1)} el={<input type="date" value={(m.lis_pendens||{})[k]||''} onChange={e=>arrUpdateNested('open_mortgages',i,'lis_pendens',k,e.target.value)} />} />)}
                      <AField label="Bk/Pg/Doc" el={<input type="text" value={(m.lis_pendens||{}).bkpgdoc||''} onChange={e=>arrUpdateNested('open_mortgages',i,'lis_pendens','bkpgdoc',e.target.value)} placeholder="Book/Page/Doc" />} />
                      <AField label="Instrument #" el={<input type="text" value={(m.lis_pendens||{}).instrument_no||''} onChange={e=>arrUpdateNested('open_mortgages',i,'lis_pendens','instrument_no',e.target.value)} placeholder="Instrument number" />} />
                      <AField label="Notes" span={2} el={<input type="text" value={(m.lis_pendens||{}).notes||''} onChange={e=>arrUpdateNested('open_mortgages',i,'lis_pendens','notes',e.target.value)} placeholder="Lis pendens notes" />} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button className="add-btn" onClick={() => arrAdd('open_mortgages', EMPTY_MORTGAGE)}><PlusIcon /> Add mortgage</button>
      </Section>

      {/* SATELLITE DOCS */}
      <SimpleBlockSection title="Satellite Documents" field="satellite_docs" items={form.satellite_docs} label="Satellite Doc"
        fields={[['Title','title','text','Document title',2],['Dated','dated','date','',1],['Recorded','recorded','date','',1],['Bk/Pg/Doc','bkpgdoc','text','Book/Page/Doc',1],['Instrument #','instrument_no','text','',1],['Type','type','select',['Assignment','Release','Subordination','Other'],1],['Assignor','assignor','text','',1],['Assignee','assignee','text','',4],['Notes','notes','textarea','Notes…',4]]}
        arrUpdate={arrUpdate} arrRemove={arrRemove} arrAdd={() => arrAdd('satellite_docs', EMPTY_SATDOC)} />

      {/* LIENS */}
      <SimpleBlockSection title="Liens and Judgements" field="liens_judgements" items={form.liens_judgements} label="Lien"
        fields={[['Doc Name','doc_name','select',['Judgment','Tax Lien','Mechanic\'s Lien','HOA Lien','Other'],2],['Dated','dated','date','',1],['Recorded','recorded','date','',1],['Bk/Pg/Doc','bkpgdoc','text','Book/Page/Doc',1],['Instrument #','instrument_no','text','',1],['Case #','case_no','text','',1],['Amount ($)','amount','text','0.00',1],['Creditor','creditor','text','',2],['Debtor','debtor','text','',2]]}
        arrUpdate={arrUpdate} arrRemove={arrRemove} arrAdd={() => arrAdd('liens_judgements', EMPTY_LIEN)} />

      {/* ROWs */}
      <SimpleBlockSection title="ROWs, CCRs, Easements" field="rows_ccrs_easements" items={form.rows_ccrs_easements} label="ROW/CCR"
        fields={[['Doc Name','doc_name','select',['Declaration of Restrictions','Right of Way','Easement','CCR','Other'],2],['Dated','dated','date','',1],['Recorded','recorded','date','',1],['Bk/Pg/Doc','bkpgdoc','text','',2],['Instrument #','instrument_no','text','',2],['Notes','notes','textarea','Notes…',4]]}
        arrUpdate={arrUpdate} arrRemove={arrRemove} arrAdd={() => arrAdd('rows_ccrs_easements', EMPTY_ROW)} />

      {/* PROBATE */}
      <SimpleBlockSection title="Divorce / Probate" field="divorce_probate" items={form.divorce_probate} label="Probate"
        fields={[['Doc Name','doc_name','select',['List of Heirs','Divorce','Probate','Will','Other'],2],['Dated','dated','date','',1],['Recorded','recorded','date','',1],['Bk/Pg/Doc','bkpgdoc','text','',2],['Instrument #','instrument_no','text','',2],['Notes','notes','textarea','Notes…',4]]}
        arrUpdate={arrUpdate} arrRemove={arrRemove} arrAdd={() => arrAdd('divorce_probate', EMPTY_PROBATE)} />

      {/* MISC */}
      <SimpleBlockSection title="Misc Docs" field="misc_docs" items={form.misc_docs} label="Misc"
        fields={[['Doc Name','doc_name','text','Document name',2],['Dated','dated','date','',1],['Recorded','recorded','date','',1],['Bk/Pg/Doc','bkpgdoc','text','',2],['Instrument #','instrument_no','text','',2],['Notes','notes','textarea','Notes…',4]]}
        arrUpdate={arrUpdate} arrRemove={arrRemove} arrAdd={() => arrAdd('misc_docs', EMPTY_MISC)} />

      {/* PLAT MAPS */}
      <Section title="Plat Maps">
        <div className="grid g4">
          <F label="Dated"><In field="plat_dated" type="date" /></F>
          <F label="Recorded"><In field="plat_recorded" type="date" /></F>
          <F label="Bk/Pg/Doc"><In field="plat_bkpgdoc" placeholder="Book/Page/Doc" /></F>
          <F label="Instrument No"><In field="plat_instrument_no" placeholder="Instrument number" /></F>
          <F label="Notes" span={4}><textarea value={form.plat_notes||''} onChange={e=>set('plat_notes',e.target.value)} placeholder="Plat map notes…" /></F>
        </div>
      </Section>

      {/* LEGAL */}
      <Section title="Legal Description">
        <F label="Legal Description"><textarea value={form.legal_description||''} onChange={e=>set('legal_description',e.target.value)} placeholder="Full legal description…" style={{minHeight:100}} /></F>
      </Section>

      <Section title="Chain of Title">
        <F label="Chain of Title"><textarea value={form.chain_of_title||''} onChange={e=>set('chain_of_title',e.target.value)} placeholder="Chain of title entries…" style={{minHeight:100}} /></F>
      </Section>

      {/* FOOTER */}
      <div className="form-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: '#6b6860' }}>Status:</span>
          <select value={form.status} onChange={e=>set('status',e.target.value)}
            style={{ padding: '6px 24px 6px 10px', border: '1px solid #e2e0da', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', appearance: 'none', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='7' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236b6860' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")", backgroundRepeat:'no-repeat', backgroundPosition:'right 8px center', outline:'none', background:'#fff' }}>
            <option value="draft">Draft</option>
            <option value="completed">Completed</option>
            <option value="reviewed">Reviewed</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => window.print()}>Print</button>
          <button className="btn btn-primary" onClick={() => onSave(form)} disabled={saving}>
            {saving ? 'Saving…' : 'Save Record'}
          </button>
        </div>
      </div>
    </>
  )
}

// HELPER COMPONENTS
function Section({ title, children }) {
  return (
    <div className="card">
      <div className="card-header"><div className="card-dot"></div><h2>{title}</h2></div>
      <div className="card-body">{children}</div>
    </div>
  )
}

function AField({ label, el, span }) {
  return (
    <div className="field" style={span ? { gridColumn: `span ${span}` } : {}}>
      <label>{label}</label>
      {el}
    </div>
  )
}

function DeedField({ comp, label, span }) {
  return <AField label={label} el={comp} span={span} />
}

function SimpleBlockSection({ title, field, items, label, fields, arrUpdate, arrRemove, arrAdd }) {
  return (
    <div className="card">
      <div className="card-header"><div className="card-dot"></div><h2>{title}</h2></div>
      <div className="card-body">
        <div className="block-list">
          {items.map((item, i) => (
            <div className="block-item" key={i}>
              <div className="block-item-head">
                <span>{label} #{i+1}</span>
                <button className="rm-btn" onClick={() => arrRemove(field, i)}><XIcon /></button>
              </div>
              <div className="block-item-body">
                <div className="grid g4">
                  {fields.map(([lbl, key, type, placeholder, span]) => (
                    <div className="field" key={key} style={span > 1 ? { gridColumn: `span ${span}` } : {}}>
                      <label>{lbl}</label>
                      {type === 'textarea' ? (
                        <textarea value={item[key]||''} onChange={e=>arrUpdate(field,i,key,e.target.value)} placeholder={placeholder} style={{minHeight:52}} />
                      ) : type === 'select' ? (
                        <select value={item[key]||''} onChange={e=>arrUpdate(field,i,key,e.target.value)}>
                          {placeholder.map(o=><option key={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input type={type} value={item[key]||''} onChange={e=>arrUpdate(field,i,key,e.target.value)} placeholder={placeholder||''} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
        <button className="add-btn" onClick={arrAdd}><PlusIcon /> Add {label.toLowerCase()}</button>
      </div>
    </div>
  )
}

function PlusIcon() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
}

function XIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1.5 1.5l10 10M11.5 1.5l-10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
}
