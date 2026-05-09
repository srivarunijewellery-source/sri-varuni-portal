async function saveProduct() {
  const sl    = document.getElementById('prod-sl').value.trim().toUpperCase();
  const name  = document.getElementById('prod-name').value.trim();
  const price = parseInt(document.getElementById('prod-price').value);
  const stock = parseInt(document.getElementById('prod-stock').value) || 0;
  if (!sl || !name || !price) { showToast('Fill SL number, name and price', 'error'); return; }

  const btn = document.querySelector('#modal-product .btn-primary');
  btn.textContent = 'Saving...'; btn.disabled = true;

  try {
    let imageUrl = CATALOG[sl] ? CATALOG[sl].image : null;

    // Upload product image if pending
    if (pendingProductImage && pendingProductImage.startsWith('data:')) {
      const blob = await (await fetch(pendingProductImage)).blob();
      const path = 'products/' + sl + '_' + Date.now() + '.jpg';
      imageUrl = await sb.uploadFile('products', path, blob, SESSION.token);
    }

    const body = {
      sl_number: sl, name,
      details: document.getElementById('prod-details').value.trim(),
      price, gst_pct: parseInt(document.getElementById('prod-gst').value) || 3,
      stock, status: document.getElementById('prod-status').value,
      image_url: imageUrl
    };

    if (editingProductSL) {
      // Update
      await sb.patch('catalog', 'sl_number=eq.' + sl, body, SESSION.token);
      showToast('Product updated');
    } else {
      // Insert - use upsert via Prefer header
      const url = SUPABASE_URL + '/rest/v1/catalog';
      const r = await fetch(url, {
        method: 'POST',
        headers: { ...sb.authHeaders(SESSION.token), 'Prefer': 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify(body)
      });
      if (!r.ok) throw new Error(await r.text());
      showToast('Product added to catalog');
    }

    await loadCatalog();
    closeModal('modal-product');
    renderCatalog();
  } catch(err) {
    showToast('Failed: ' + err.message, 'error');
  } finally {
    btn.textContent = 'Save Product'; btn.disabled = false;
  }
}

async function toggleProductStatus(sl) {
  if (!CATALOG[sl]) return;
  const newStatus = CATALOG[sl].status === 'hidden' ? 'active' : 'hidden';
  try {
    await sb.patch('catalog', 'sl_number=eq.' + sl, { status: newStatus }, SESSION.token);
    CATALOG[sl].status = newStatus;
    syncCatalogToProducts();
    renderCatalog();
    showToast('Product visibility updated');
  } catch(err) { showToast('Failed: ' + err.message, 'error'); }
}

function renderCatalog() {
  var tbody = document.getElementById('catalog-tbody');
  if (!tbody) return;
  var rows = '';
  Object.keys(CATALOG).forEach(function(sl) {
    var p = CATALOG[sl];
    var stockBadge = p.stock === 0
      ? '<span class="badge badge-cancelled">Out of Stock</span>'
      : p.stock <= 5
        ? '<span class="badge badge-pending">' + p.stock + ' left</span>'
        : '<span class="badge badge-delivered">' + p.stock + '</span>';
    var statusBadge2 = p.status === 'active'
      ? '<span class="badge badge-delivered">Active</span>'
      : p.status === 'out'
        ? '<span class="badge badge-cancelled">Out of Stock</span>'
        : '<span class="badge" style="background:#f3f4f6;color:#6b7280;">Hidden</span>';
    var imgCell = p.image
      ? '<img src="' + p.image + '" style="width:48px;height:48px;object-fit:cover;border-radius:8px;display:block;">'
      : '<div style="width:48px;height:48px;border-radius:8px;background:linear-gradient(135deg,var(--pl),var(--pd));display:flex;align-items:center;justify-content:center;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(201,169,110,.6)" stroke-width="1.5"><path d="M12 2L8 7H2l4 4-2 7 8-4 8 4-2-7 4-4h-6L12 2z"/></svg></div>';
    rows += '<tr>' +
      '<td style="padding:10px 16px;">' + imgCell + '</td>' +
      '<td style="font-family:monospace;font-size:12px;color:var(--pl);">' + sl + '</td>' +
      '<td><strong>' + p.name + '</strong></td>' +
      '<td style="font-size:12px;color:var(--tl);">' + p.details + '</td>' +
      '<td style="font-weight:600;">Rs.' + p.price.toLocaleString() + '</td>' +
      '<td>' + stockBadge + '</td>' +
      '<td>' + p.gst + '%</td>' +
      '<td>' + statusBadge2 + '</td>' +
      '<td style="display:flex;gap:4px;">' +
        '<button class="btn btn-outline btn-sm" onclick="editProduct(this.dataset.sl)" data-sl="' + sl + '">Edit</button>' +
        '<button class="btn btn-danger btn-sm" onclick="toggleProductStatus(this.dataset.sl)" data-sl="' + sl + '">' + (p.status === 'hidden' ? 'Show' : 'Hide') + '</button>' +
      '</td>' +
    '</tr>';
  });
  tbody.innerHTML = rows || '<tr><td colspan="8"><p style="text-align:center;padding:24px;color:var(--tl);">No products yet.</p></td></tr>';
  // Sync PRODUCTS so lookupAndAdd uses latest catalog
  syncCatalogToProducts();
}

function openAddProduct() {
  editingProductSL = null;
  document.getElementById('product-modal-title').textContent = 'Add Product';
  document.getElementById('prod-sl').value = '';
  document.getElementById('prod-sl').readOnly = false;
  document.getElementById('prod-name').value = '';
  document.getElementById('prod-details').value = '';
  document.getElementById('prod-price').value = '';
  document.getElementById('prod-stock').value = '';
  document.getElementById('prod-gst').value = '3';
  document.getElementById('prod-status').value = 'active';
  clearProductImageUI();
  openModal('modal-product');
}

function editProduct(sl) {
  var p = CATALOG[sl];
  if (!p) return;
  editingProductSL = sl;
  document.getElementById('product-modal-title').textContent = 'Edit Product';
  document.getElementById('prod-sl').value = sl;
  document.getElementById('prod-sl').readOnly = true;
  document.getElementById('prod-name').value = p.name;
  document.getElementById('prod-details').value = p.details;
  document.getElementById('prod-price').value = p.price;
  document.getElementById('prod-stock').value = p.stock;
  document.getElementById('prod-gst').value = p.gst;
  document.getElementById('prod-status').value = p.status;
  setProductImageUI(p.image || null);
  openModal('modal-product');
}

function deductStock(items) {
  if (!items) return;
  items.forEach(function(item) {
    if (CATALOG[item.sl]) {
      CATALOG[item.sl].stock = Math.max(0, CATALOG[item.sl].stock - item.qty);
      if (CATALOG[item.sl].stock === 0) CATALOG[item.sl].status = 'out';
    }
  });
  syncCatalogToProducts();
}

function handleProductImage(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  if (file.size > 5 * 1024 * 1024) { showToast('Image must be under 5MB', 'error'); return; }
  const reader = new FileReader();
  reader.onload = function(e) {
    pendingProductImage = e.target.result;
    document.getElementById('prod-img-thumb').src = pendingProductImage;
    document.getElementById('prod-img-empty').style.display = 'none';
    document.getElementById('prod-img-preview').style.display = 'block';
    document.getElementById('prod-img-area').style.borderColor = 'var(--ok)';
    document.getElementById('prod-img-area').style.borderStyle = 'solid';
  };
  reader.readAsDataURL(file);
}

function removeProductImage() {
  pendingProductImage = null;
  document.getElementById('prod-img-input').value = '';
  document.getElementById('prod-img-thumb').src = '';
  document.getElementById('prod-img-empty').style.display = 'block';
  document.getElementById('prod-img-preview').style.display = 'none';
  document.getElementById('prod-img-area').style.borderColor = 'var(--border)';
  document.getElementById('prod-img-area').style.borderStyle = 'dashed';
}

function clearProductImageUI() {
  pendingProductImage = null;
  var input = document.getElementById('prod-img-input');
  var empty = document.getElementById('prod-img-empty');
  var preview = document.getElementById('prod-img-preview');
  var area = document.getElementById('prod-img-area');
  if (input) input.value = '';
  if (empty) empty.style.display = 'block';
  if (preview) preview.style.display = 'none';
  if (area) { area.style.borderColor = 'var(--border)'; area.style.borderStyle = 'dashed'; }
}

function setProductImageUI(imgSrc) {
  if (imgSrc) {
    pendingProductImage = imgSrc;
    document.getElementById('prod-img-thumb').src = imgSrc;
    document.getElementById('prod-img-empty').style.display = 'none';
    document.getElementById('prod-img-preview').style.display = 'block';
    document.getElementById('prod-img-area').style.borderColor = 'var(--ok)';
    document.getElementById('prod-img-area').style.borderStyle = 'solid';
  } else {
    clearProductImageUI();
  }
}