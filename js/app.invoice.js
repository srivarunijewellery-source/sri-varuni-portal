function renderInvoices(role) {
  const orders = role === 'reseller' ? ORDERS.filter(o => o.resellerEmail === currentUser?.email) : ORDERS;
  const tbody = document.getElementById(role === 'reseller' ? 'invoices-tbody' : 'admin-invoices-tbody');
  if (!tbody) return;
  tbody.innerHTML = orders.map(o => {
    const gst = calcGST(o.price, 3);
    const total = o.price + gst;
    return `
      <tr>
        <td><span style="font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace; font-size:12px; color:var(--purple-light);">${invoiceNo(o.id)}</span></td>
        ${role !== 'reseller' ? `<td>${o.reseller}</td>` : ''}
        <td><span style="font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace; font-size:12px;">${o.id}</span></td>
        <td>${o.product}</td>
        <td>₹${o.price.toLocaleString()}</td>
        <td>₹${gst}</td>
        <td style="font-weight:700;">₹${total.toLocaleString()}</td>
        <td style="color:var(--text-light); font-size:12px;">${formatDate(o.date)}</td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="showInvoice('${o.id}')">View</button>
          <button class="btn btn-gold btn-sm" onclick="showInvoice('${o.id}')" style="margin-left:4px;">⬇ PDF</button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderAdminInvoices() { renderInvoices('admin'); }

function buildInvoiceRows(o) {
  const rows = (o.items && o.items.length > 1) ? o.items : [{sl: o.sl, name: o.product, qty: o.qty, price: Math.round(o.price / o.qty)}];
  return rows.map(function(item) {
    return '<tr><td style="font-family:monospace;font-size:12px">' + item.sl + '</td><td>' + item.name + '</td><td>' + item.qty + '</td><td>₹' + item.price.toLocaleString() + '</td><td>₹' + (item.price * item.qty).toLocaleString() + '</td></tr>';
  }).join('');
}

function showInvoice(orderId) {
  const o = ORDERS.find(x => x.id === orderId);
  if (!o) return;
  currentInvoiceOrder = o;
  const gst = calcGST(o.price, 3);
  const cgst = Math.round(gst / 2);
  const sgst = Math.round(gst / 2);
  const total = o.price + gst;

  document.getElementById('modal-invoice-body').innerHTML = `
    <div class="invoice-preview" id="invoice-print-area">
      <div class="invoice-header">
        <div class="invoice-brand">
          <h2>Sri Varuni</h2>
          <p style="font-size:10px; letter-spacing:2px; text-transform:uppercase; color:var(--gold);">Fashion Jewellery</p>
          <p style="margin-top:8px; font-size:12px; color:var(--text-light); line-height:1.6;">
            123, Jewellers Street, Mumbai - 400001<br>
            GST: 27AABCS1429B1Z1<br>
            srivaruni@email.com
          </p>
        </div>
        <div class="invoice-meta">
          <h3>INVOICE</h3>
          <div class="inv-num">${invoiceNo(o.id)}</div>
          <p style="margin-top:8px; font-size:12px; color:var(--text-light);">Date: ${formatDate(o.date)}</p>
          <p style="font-size:12px; color:var(--text-light);">Order: ${o.id}</p>
        </div>
      </div>
      <div class="invoice-parties">
        <div class="invoice-party">
          <label>Bill To (Reseller)</label>
          <h4>${o.reseller}</h4>
          <p>Partner Account<br>Email on file<br>WhatsApp: Registered</p>
        </div>
        <div class="invoice-party">
          <label>Ship To</label>
          <h4>${o.customer}</h4>
          <p>${o.address}<br>${o.city}, ${o.state}<br>PIN: ${o.pin}</p>
        </div>
      </div>
      <table class="invoice-table">
        <thead>
          <tr>
            <th>SL No</th>
            <th>Description</th>
            <th>Qty</th>
            <th>Unit Price</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${buildInvoiceRows(o)}
        </tbody>
      </table>
      <div class="invoice-totals">
        <div class="invoice-total-row"><span>Subtotal</span><span>₹${o.price.toLocaleString()}</span></div>
        <div class="invoice-total-row"><span>CGST @ 1.5%</span><span>₹${cgst}</span></div>
        <div class="invoice-total-row"><span>SGST @ 1.5%</span><span>₹${sgst}</span></div>
        <div class="invoice-total-row invoice-grand"><span>Total</span><span>₹${total.toLocaleString()}</span></div>
      </div>
      <div class="invoice-footer">
        <p>UPI Transaction ID: <strong style="font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;">${o.upiTxn}</strong> | Payment Status: <strong style="color:var(--success);">PAID</strong></p>
        <p style="margin-top:6px;">Thank you for your business. This is a computer-generated invoice. | Sri Varuni Fashion Jewellery</p>
      </div>
    </div>
  `;
  openModal('modal-invoice');
}

function printInvoice() {
  const el = document.getElementById('invoice-print-area');
  const win = window.open('', '_blank');
  win.document.write('<html><head><title>Invoice - ' + invoiceNo(currentInvoiceOrder.id) + '</title>');
  // system fonts - no import needed
  win.document.write('<style>body{font-family:"Nunito Sans",-apple-system,Arial,sans-serif;padding:32px;} h2,h3{font-family:"Lora",Georgia,serif;font-weight:600;} .invoice-header{display:flex;justify-content:space-between;margin-bottom:28px;} .invoice-parties{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px;} .invoice-table{width:100%;border-collapse:collapse;margin-bottom:20px;} .invoice-table th{background:#2d1b3d;color:#fff;padding:10px 14px;text-align:left;font-size:11px;text-transform:uppercase;} .invoice-table th:last-child,.invoice-table td:last-child{text-align:right;} .invoice-table td{padding:12px 14px;border-bottom:1px solid #eee;} .invoice-totals{display:flex;flex-direction:column;align-items:flex-end;gap:6px;} .invoice-total-row{display:flex;gap:40px;font-size:13px;} .invoice-total-row span:last-child{width:90px;text-align:right;} .invoice-grand{font-size:16px;font-weight:700;color:#2d1b3d;border-top:2px solid #2d1b3d;padding-top:8px;} .invoice-footer{margin-top:24px;padding-top:16px;border-top:1px solid #eee;font-size:11px;color:#888;text-align:center;} label{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#c9a96e;font-weight:600;display:block;margin-bottom:6px;} </style></head><body>');
  win.document.write(el.innerHTML);
  win.document.write('</body></html>');
  win.document.close();
  win.print();
}

function downloadInvoicePDF() { showToast('PDF download ready! (Connect jsPDF in production)'); printInvoice(); }

function showLabel(orderId) {
  const o = ORDERS.find(x => x.id === orderId);
  if (!o) return;
  currentLabelOrder = o;
  document.getElementById('modal-label-body').innerHTML = `
    <div class="label-preview" id="label-print-area">
      <div class="label-top">
        <div class="label-brand">Sri Varuni<br><span style="font-size:11px; letter-spacing:2px; text-transform:uppercase; color:#c9a96e; font-family: 'Nunito Sans', -apple-system, Arial, sans-serif;">Fashion Jewellery</span></div>
        <div class="label-order">${o.id}</div>
      </div>
      <div class="label-to">
        <label>SHIP TO</label>
        <h3>${o.customer}</h3>
        <p>${o.address}<br>${o.city}, ${o.state} - ${o.pin}<br><strong>${o.phone}</strong></p>
      </div>
      <div class="label-barcode">||| ${o.id} |||</div>
      ${o.courier ? '<div style="text-align:center;font-size:13px;color:#4a3560;margin-bottom:10px"><strong>' + o.courier + '</strong> &middot; ' + o.tracking + '</div>' : ''}
      <div class="label-from">
        Return: Sri Varuni Fashion Jewellery, 123 Jewellers Street, Mumbai - 400001 · srivaruni@upi
      </div>
    </div>
  `;
  closeModal('modal-order');
  openModal('modal-label');
}

function printLabel() {
  const el = document.getElementById('label-print-area');
  const win = window.open('', '_blank');
  win.document.write('<html><head><title>Shipping Label</title>');
  win.document.write('<style>@page{size:A6;margin:10mm;}body{font-family:"Nunito Sans",-apple-system,Arial,sans-serif;padding:0;margin:0;} .label-preview{border:2px solid #000;padding:20px;} .label-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;padding-bottom:12px;border-bottom:2px solid #000;} .label-brand{font-family:"Lora",Georgia,serif;font-size:18px;color:#2d1b3d;} .label-order{font-family:"SF Mono",Consolas,monospace;font-size:12px;background:#2d1b3d;color:#fff;padding:4px 10px;border-radius:4px;} label{font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:#888;} h3{font-size:20px;font-weight:700;margin:4px 0;} p{font-size:13px;color:#444;line-height:1.5;} .label-barcode{text-align:center;margin:14px 0;font-family:"SF Mono",Consolas,monospace;letter-spacing:4px;font-size:18px;} .label-from{font-size:11px;color:#888;border-top:1px dashed #ccc;padding-top:10px;margin-top:4px;}</style></head><body>');
  win.document.write(el.innerHTML);
  win.document.write('</body></html>');
  win.document.close();
  win.print();
}