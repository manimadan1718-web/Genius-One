const router = require('express').Router();
const { supabaseAdmin } = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

// GET /api/pdf/:orderId
router.get('/:orderId', requireAuth, async (req, res) => {
  const { orderId } = req.params;

  // Fetch all data
  const [
    { data: order },
    { data: property },
    { data: taxEntries },
    { data: deeds },
    { data: mortgages },
    { data: satDocs },
    { data: liens },
    { data: rows },
    { data: probate },
    { data: misc }
  ] = await Promise.all([
    supabaseAdmin.from('orders').select('*').eq('id', orderId).single(),
    supabaseAdmin.from('property_info').select('*').eq('order_id', orderId).single(),
    supabaseAdmin.from('tax_entries').select('*').eq('order_id', orderId).order('sort_order'),
    supabaseAdmin.from('vesting_deeds').select('*').eq('order_id', orderId).order('sort_order'),
    supabaseAdmin.from('open_mortgages').select('*').eq('order_id', orderId).order('sort_order'),
    supabaseAdmin.from('satellite_docs').select('*').eq('order_id', orderId).order('sort_order'),
    supabaseAdmin.from('liens_judgements').select('*').eq('order_id', orderId).order('sort_order'),
    supabaseAdmin.from('rows_ccrs').select('*').eq('order_id', orderId).order('sort_order'),
    supabaseAdmin.from('divorce_probate').select('*').eq('order_id', orderId).order('sort_order'),
    supabaseAdmin.from('misc_docs').select('*').eq('order_id', orderId).order('sort_order')
  ]);

  if (!order) return res.status(404).json({ error: 'Order not found' });

  const fmt = (v) => v || '—';
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US') : '—';
  const fmtMoney = (v) => v ? `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—';

  const sectionHead = (title) =>
    `<div class="sec-head"><span class="dot"></span><h2>${title}</h2></div>`;

  const row = (label, value) =>
    `<tr><td class="lbl">${label}</td><td>${fmt(value)}</td></tr>`;

  const taxRows = (taxEntries || []).map(t =>
    `<tr><td>${fmt(t.tax_type)}</td><td>${fmtMoney(t.amount)}</td><td>${fmt(t.status)}</td><td>${fmtDate(t.entry_date)}</td></tr>`
  ).join('');

  const deedBlocks = (deeds || []).map((d, i) => `
    <div class="sub-block">
      <div class="sub-head">Deed ${i + 1}</div>
      <table><tbody>
        ${row('Deed Type', d.deed_type)}
        ${row('Dated', fmtDate(d.dated))}
        ${row('Recorded', fmtDate(d.recorded))}
        ${row('Bk/Pg/Doc', d.bkpgdoc)}
        ${row('Instrument #', d.instrument_number)}
        ${row('Consideration', fmtMoney(d.consideration))}
        ${row('Grantor', d.grantor)}
        ${row('Grantee', d.grantee)}
        ${d.notes ? row('Notes', d.notes) : ''}
      </tbody></table>
    </div>
  `).join('');

  const mortgageBlocks = (mortgages || []).map((m, i) => `
    <div class="sub-block">
      <div class="sub-head">Mortgage ${i + 1} — ${fmt(m.doc_type)}</div>
      <table><tbody>
        ${row('Type', m.type)}
        ${row('Dated', fmtDate(m.dated))}
        ${row('Recorded', fmtDate(m.recorded))}
        ${row('Bk/Pg/Doc', m.bkpgdoc)}
        ${row('Instrument #', m.instrument_number)}
        ${row('Amount', fmtMoney(m.amount))}
        ${row('Borrower', m.borrower)}
        ${row('Lender', m.lender)}
        ${m.trustee ? row('Trustee', m.trustee) : ''}
        ${m.notes ? row('Notes', m.notes) : ''}
        ${m.mod_dated ? `<tr><td colspan="2" class="sub-label">Modification</td></tr>${row('Dated', fmtDate(m.mod_dated))}${row('Recorded', fmtDate(m.mod_recorded))}${row('Bk/Pg/Doc', m.mod_bkpgdoc)}${row('Notes', m.mod_notes)}` : ''}
        ${m.lp_dated ? `<tr><td colspan="2" class="sub-label">Lis Pendens</td></tr>${row('Dated', fmtDate(m.lp_dated))}${row('Recorded', fmtDate(m.lp_recorded))}${row('Bk/Pg/Doc', m.lp_bkpgdoc)}${row('Notes', m.lp_notes)}` : ''}
      </tbody></table>
    </div>
  `).join('');

  const genericBlocks = (arr, title) => (arr || []).map((item, i) => `
    <div class="sub-block">
      <div class="sub-head">${title} ${i + 1}</div>
      <table><tbody>
        ${Object.entries(item)
          .filter(([k]) => !['id','order_id','sort_order'].includes(k))
          .map(([k, v]) => {
            const label = k.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase());
            const val = k.includes('date') || k === 'dated' || k === 'recorded'
              ? fmtDate(v)
              : k === 'amount' || k === 'consideration' ? fmtMoney(v) : v;
            return row(label, val);
          }).join('')}
      </tbody></table>
    </div>
  `).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>Property Report — ${order.order_no}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a1a; background: #fff; }
  .page { max-width: 800px; margin: 0 auto; padding: 24px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #1B2B4B; padding-bottom: 14px; }
  .co-name { font-size: 13px; font-weight: bold; color: #1B2B4B; }
  .co-sub { font-size: 10px; color: #666; margin-top: 2px; }
  .order-meta { text-align: right; font-size: 10px; color: #555; }
  .order-meta strong { color: #1B2B4B; font-size: 11px; }
  .title-bar { font-size: 16px; font-weight: bold; color: #1B2B4B; margin-bottom: 16px; }
  .prop-box { border: 1px solid #ddd; border-radius: 4px; padding: 10px 14px; margin-bottom: 16px; background: #f8f8f6; }
  .prop-box table { width: 100%; }
  .prop-box td { padding: 2px 6px; vertical-align: top; }
  .prop-box .lbl { font-weight: bold; color: #1B2B4B; width: 120px; white-space: nowrap; }
  .section { margin-bottom: 14px; border: 1px solid #ddd; border-radius: 4px; overflow: hidden; }
  .sec-head { background: #1B2B4B; padding: 6px 12px; display: flex; align-items: center; gap: 6px; }
  .sec-head h2 { font-size: 10px; font-weight: bold; color: #fff; text-transform: uppercase; letter-spacing: 0.6px; }
  .dot { width: 5px; height: 5px; background: #E8511A; border-radius: 50%; flex-shrink: 0; }
  .sec-body { padding: 10px 14px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 3px 6px; vertical-align: top; border-bottom: 1px solid #f0efec; }
  .lbl { font-weight: bold; color: #444; width: 140px; white-space: nowrap; font-size: 10px; }
  th { background: #f0efec; font-size: 9px; text-transform: uppercase; padding: 4px 6px; color: #666; text-align: left; letter-spacing: 0.4px; }
  .sub-block { border: 1px solid #e5e5e5; border-radius: 3px; margin-bottom: 8px; overflow: hidden; }
  .sub-head { background: #e8edf4; padding: 5px 10px; font-size: 10px; font-weight: bold; color: #1B2B4B; }
  .sub-block table { margin: 0; }
  .sub-label { background: #f5f5f0; font-style: italic; color: #666; padding: 4px 6px; font-size: 10px; }
  .footer { margin-top: 24px; border-top: 1px solid #ddd; padding-top: 10px; display: flex; justify-content: space-between; font-size: 9px; color: #888; }
  @media print { body { font-size: 10px; } .page { padding: 0; } }
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <div>
      <div class="co-name">GeniusOne Solutions LLC</div>
      <div class="co-sub">30 N Gould St Ste R, Sheridan, WY 82801 USA</div>
      <div class="co-sub">307-318-4001 | orders@geniusonesolutions.com</div>
    </div>
    <div class="order-meta">
      <strong>Search Type:</strong> ${fmt(order.search_type)}<br/>
      <strong>Order #:</strong> ${fmt(order.order_no)}<br/>
      Creation Date: ${fmtDate(property?.creation_date)}<br/>
      Effective Date: ${fmtDate(property?.effective_date)}
    </div>
  </div>

  <div class="title-bar">Property Information</div>

  <div class="prop-box">
    <table>
      <tr>
        <td class="lbl">Address:</td>
        <td colspan="3">${fmt(property?.address)}</td>
      </tr>
      <tr>
        <td class="lbl">Cnty/ST:</td>
        <td>${fmt(property?.county_state)}</td>
        <td class="lbl">Zip:</td>
        <td>${fmt(property?.zip_code)}</td>
      </tr>
      <tr>
        <td class="lbl">Owner:</td>
        <td>${fmt(property?.owner)}</td>
        <td class="lbl">Bwr/Buyer:</td>
        <td>${fmt(property?.buyer_borrower)}</td>
      </tr>
    </table>
  </div>

  <div class="section">
    ${sectionHead('Tax and Assessment Info')}
    <div class="sec-body">
      <table><tbody>
        <tr>
          <td class="lbl">APN:</td><td>${fmt(property?.apn)}</td>
          <td class="lbl">Land:</td><td>${fmtMoney(property?.land)}</td>
          <td class="lbl">Improvements:</td><td>${fmtMoney(property?.improvements)}</td>
          <td class="lbl">Total:</td><td>${fmtMoney(property?.total)}</td>
        </tr>
        <tr>
          <td class="lbl">Exempt:</td><td>${fmt(property?.exempt)}</td>
          <td class="lbl">Spl Assess:</td><td colspan="5">${fmt(property?.spl_assess)}</td>
        </tr>
        <tr><td class="lbl">Brief Legal:</td><td colspan="7">${fmt(property?.brief_legal)}</td></tr>
      </tbody></table>
      ${taxRows ? `
      <table style="margin-top:8px;">
        <thead><tr><th>Tax Type</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>${taxRows}</tbody>
      </table>` : ''}
    </div>
  </div>

  ${deeds?.length ? `<div class="section">${sectionHead('Vesting Deeds')}<div class="sec-body">${deedBlocks}</div></div>` : ''}
  ${mortgages?.length ? `<div class="section">${sectionHead('Open Mortgages')}<div class="sec-body">${mortgageBlocks}</div></div>` : ''}
  ${satDocs?.length ? `<div class="section">${sectionHead('Satellite Documents')}<div class="sec-body">${genericBlocks(satDocs, 'Document')}</div></div>` : ''}
  ${liens?.length ? `<div class="section">${sectionHead('Liens and Judgements')}<div class="sec-body">${genericBlocks(liens, 'Lien')}</div></div>` : ''}
  ${rows?.length ? `<div class="section">${sectionHead('ROWs, CCRs, Easements')}<div class="sec-body">${genericBlocks(rows, 'Entry')}</div></div>` : ''}
  ${probate?.length ? `<div class="section">${sectionHead('Divorce / Probate')}<div class="sec-body">${genericBlocks(probate, 'Entry')}</div></div>` : ''}
  ${misc?.length ? `<div class="section">${sectionHead('Misc Docs')}<div class="sec-body">${genericBlocks(misc, 'Document')}</div></div>` : ''}

  ${property?.legal_description ? `
  <div class="section">
    ${sectionHead('Legal Description')}
    <div class="sec-body"><p>${property.legal_description}</p></div>
  </div>` : ''}

  ${property?.chain_of_title ? `
  <div class="section">
    ${sectionHead('Chain of Title')}
    <div class="sec-body"><p>${property.chain_of_title}</p></div>
  </div>` : ''}

  <div class="footer">
    <span>GeniusOne Solutions LLC — Excellence Delivered</span>
    <span>Generated: ${new Date().toLocaleString('en-US')}</span>
    <span>Order #: ${order.order_no}</span>
  </div>

</div>
</body>
</html>`;

  // Return HTML that browser can print-to-PDF, or use puppeteer for server-side PDF
  res.setHeader('Content-Type', 'text/html');
  res.setHeader('X-Order-No', order.order_no);
  res.send(html);
});

module.exports = router;
