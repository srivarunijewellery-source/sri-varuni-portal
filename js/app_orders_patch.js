// ══════════════════════════════════════════════
// ORDER FLOW FIX — replaces goToStep with safe version
// Add this AFTER app.orders.js in index.html
// ══════════════════════════════════════════════

function goToStep(step) {
  try {
    if (step === 2 && orderCart.length === 0) {
      showToast('Add at least one product first', 'error');
      return;
    }

    if (step === 3) {
      const custName    = document.getElementById('cust-name');
      const custAddress = document.getElementById('cust-address');
      const custPin     = document.getElementById('cust-pin');

      if (!custName || !custName.value.trim()) {
        showToast('Enter customer name', 'error'); return;
      }
      if (!custAddress || !custAddress.value.trim()) {
        showToast('Enter delivery address', 'error'); return;
      }
      if (!custPin || !custPin.value.trim()) {
        showToast('Enter pincode', 'error'); return;
      }

      try {
        const total = cartTotal();
        const pamount = document.getElementById('payment-amount');
        if (pamount) pamount.textContent = '₹' + (total || 0).toLocaleString();

        const creditSection = document.getElementById('credit-apply-section');
        if (creditSection) {
          const balance = (typeof resellerCreditBalance === 'number' && !isNaN(resellerCreditBalance))
            ? resellerCreditBalance : 0;
          if (balance > 0) {
            creditSection.style.display = 'block';
            const creditAvail = document.getElementById('credit-avail-amount');
            const creditMax   = document.getElementById('credit-apply-max');
            if (creditAvail) creditAvail.textContent = '₹' + balance.toLocaleString();
            if (creditMax)   creditMax.textContent   = Math.min(balance, total).toLocaleString();
            const inp = document.getElementById('credit-apply-input');
            if (inp) inp.max = Math.min(balance, total);
          } else {
            creditSection.style.display = 'none';
          }
        }
        // also update payable display
        updatePaymentAmountDisplay();
      } catch (creditErr) {
        console.warn('Credit section update failed (non-fatal):', creditErr);
      }
    }

    if (step === 4) {
      const upiTxn = document.getElementById('upi-txn');
      if (!uploadedScreenshots || uploadedScreenshots.length === 0) {
        showToast('Please upload at least one payment screenshot', 'error'); return;
      }
      if (!upiTxn || !upiTxn.value.trim()) {
        showToast('Please enter the UPI Transaction ID', 'error'); return;
      }

      try {
        const total = cartTotal();
        const confItems = document.getElementById('conf-items-list');
        if (confItems) {
          confItems.innerHTML = (orderCart || []).map(item =>
            '<div style="display:flex;justify-content:space-between;padding:10px 16px;border-bottom:1px solid #e8d5f0;">' +
            '<div><span style="font-family:monospace;font-size:11px;color:#5a3578;">' + item.sl + '</span>' +
            '<span style="font-size:13px;font-weight:500;margin-left:10px;color:#1a0f2e;">' + item.name + '</span></div>' +
            '<div style="font-size:13px;color:#4a3560;">' + item.qty + ' x Rs.' + item.price.toLocaleString() +
            ' = <strong style="color:#2d1b3d;">Rs.' + (item.qty * item.price).toLocaleString() + '</strong></div></div>'
          ).join('');
        }
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || '—'; };
        set('conf-amount', 'Rs.' + cartTotal().toLocaleString());
        set('conf-cname',  document.getElementById('cust-name')?.value  || '');
        set('conf-cphone', document.getElementById('cust-phone')?.value || '');
        const addr = (document.getElementById('cust-address')?.value || '') + ', ' +
                     (document.getElementById('cust-city')?.value    || '') + ' - ' +
                     (document.getElementById('cust-state')?.value   || '');
        set('conf-caddr', addr);
        set('conf-cpin',  document.getElementById('cust-pin')?.value || '');
      } catch (confErr) {
        console.warn('Confirm screen populate error (non-fatal):', confErr);
      }
    }

    // Switch step divs
    for (let i = 1; i <= 4; i++) {
      const el  = document.getElementById('order-step-' + i);
      const dot = document.getElementById('step-' + i);
      if (el)  el.style.display = (i === step) ? 'block' : 'none';
      if (dot) {
        dot.className = 'step' + (i < step ? ' done' : i === step ? ' active' : '');
        const num = dot.querySelector('.step-num');
        if (num) num.textContent = i < step ? '✓' : String(i);
      }
    }

    const orderSteps = document.getElementById('order-steps');
    if (orderSteps) orderSteps.scrollIntoView({ behavior: 'smooth', block: 'start' });

  } catch (err) {
    console.error('goToStep fatal error:', err);
    showToast('Error: ' + err.message, 'error');
  }
}
