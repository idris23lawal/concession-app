import { supabase } from './supabaseClient'

export async function syncSale(sale) {
  const { error } = await supabase.from('sales').upsert({
    id: sale.id,
    division: sale.division || '',
    staff_id: sale.staffId || '',
    staff_name: sale.staffName || '',
    till: sale.tillNo || sale.till || '',
    product_id: sale.productId || '',
    product_name: sale.productName || sale.style || '',
    style: sale.style || '',
    product_code: sale.productCode || '',
    colour: sale.colour || '',
    size: sale.size || '',
    base_price: Number(sale.basePrice || sale.unitPrice || 0),
    total: Number(sale.total || 0),
    qty: Number(sale.qty || 1),
    discount: sale.discount || null,
    is_external: sale.isExternal || false,
    is_unassigned: sale.isUnassigned || false,
    ext_id: sale.extId || '',
    date: sale.date || new Date().toISOString()
  })
  if (error) console.error('Sale sync failed:', error.message)
}

export async function syncRefund(refund) {
  const { error } = await supabase.from('refunds').upsert({
    id: refund.id,
    division: refund.division || '',
    type: refund.type || 'refund',
    staff_id: refund.staffId || '',
    staff_name: refund.staffName || '',
    till_no: refund.tillNo || '',
    product_name: refund.productName || refund.style || '',
    sku: refund.sku || refund.code || '',
    colour: refund.colour || '',
    size: refund.size || '',
    unit_price: Number(refund.unitPrice || refund.origPrice || 0),
    reason: refund.reason || '',
    exchange_style: refund.exchangeStyle || '',
    exchange_code: refund.exchangeCode || '',
    exchange_colour: refund.exchangeColour || '',
    exchange_size: refund.exchangeSize || '',
    date: refund.date || new Date().toISOString()
  })
  if (error) console.error('Refund sync failed:', error.message)
}

export async function syncLoan(loan) {
  const { error } = await supabase.from('loans').upsert({
    id: loan.id,
    division: loan.division || '',
    type: loan.type || 'display',
    staff_id: loan.staffId || '',
    staff_name: loan.staffName || '',
    product_id: loan.productId || '',
    product_name: loan.productName || loan.style || '',
    style: loan.style || '',
    sku: loan.sku || '',
    colour: loan.colour || '',
    size: loan.size || '',
    qty: Number(loan.qty || 1),
    location: loan.location || '',
    note: loan.note || '',
    requested_by: loan.requestedBy || '',
    returned: loan.returned || false,
    returned_date: loan.returnedDate || null,
    shopper_name: loan.shopperName || '',
    shopper_id: loan.shopperId || '',
    status: loan.status || 'out',
    eod_result: loan.eodResult || null,
    date: loan.date || new Date().toISOString()
  })
  if (error) console.error('Loan sync failed:', error.message)
}