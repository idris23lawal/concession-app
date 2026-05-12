import { supabase } from './supabaseClient'

// ── Upsert functions (write to Supabase) ────────────────────────────────────

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

// ── Convert Supabase row → app format ───────────────────────────────────────

function rowToSale(row) {
  return {
    id: row.id,
    division: row.division,
    staffId: row.staff_id,
    staffName: row.staff_name,
    tillNo: row.till,
    productId: row.product_id,
    productName: row.product_name,
    style: row.style,
    productCode: row.product_code,
    colour: row.colour,
    size: row.size,
    basePrice: row.base_price,
    unitPrice: row.base_price,
    total: row.total,
    qty: row.qty,
    discount: row.discount,
    isExternal: row.is_external,
    isUnassigned: row.is_unassigned,
    extId: row.ext_id,
    date: row.date,
  }
}

function rowToRefund(row) {
  return {
    id: row.id,
    division: row.division,
    type: row.type,
    staffId: row.staff_id,
    staffName: row.staff_name,
    tillNo: row.till_no,
    productName: row.product_name,
    sku: row.sku,
    colour: row.colour,
    size: row.size,
    unitPrice: row.unit_price,
    reason: row.reason,
    exchangeStyle: row.exchange_style,
    exchangeCode: row.exchange_code,
    exchangeColour: row.exchange_colour,
    exchangeSize: row.exchange_size,
    date: row.date,
  }
}

function rowToLoan(row) {
  return {
    id: row.id,
    division: row.division,
    type: row.type,
    staffId: row.staff_id,
    staffName: row.staff_name,
    productId: row.product_id,
    productName: row.product_name,
    style: row.style,
    sku: row.sku,
    colour: row.colour,
    size: row.size,
    qty: row.qty,
    location: row.location,
    note: row.note,
    requestedBy: row.requested_by,
    returned: row.returned,
    returnedDate: row.returned_date,
    shopperName: row.shopper_name,
    shopperId: row.shopper_id,
    status: row.status,
    eodResult: row.eod_result,
    date: row.date,
  }
}

// ── Fetch all data from Supabase ─────────────────────────────────────────────

export async function fetchAllData() {
  try {
    const [salesRes, refundsRes, loansRes] = await Promise.all([
      supabase.from('sales').select('*').order('date', { ascending: false }),
      supabase.from('refunds').select('*').order('date', { ascending: false }),
      supabase.from('loans').select('*').order('date', { ascending: false }),
    ])

    const sales = { womens: [], mens: [] }
    const refunds = { womens: [], mens: [] }
    const loans = { womens: [], mens: [] }
    const psLoans = { womens: [], mens: [] }

    if (!salesRes.error && salesRes.data) {
      salesRes.data.forEach(row => {
        const div = row.division === 'womens' ? 'womens' : 'mens'
        sales[div].push(rowToSale(row))
      })
    }

    if (!refundsRes.error && refundsRes.data) {
      refundsRes.data.forEach(row => {
        const div = row.division === 'womens' ? 'womens' : 'mens'
        refunds[div].push(rowToRefund(row))
      })
    }

    if (!loansRes.error && loansRes.data) {
      loansRes.data.forEach(row => {
        const div = row.division === 'womens' ? 'womens' : 'mens'
        const loan = rowToLoan(row)
        if (row.type === 'ps') {
          psLoans[div].push(loan)
        } else {
          loans[div].push(loan)
        }
      })
    }

    return { sales, refunds, loans, psLoans }
  } catch (e) {
    console.error('fetchAllData failed:', e)
    return null
  }
}

// ── Real-time subscriptions ──────────────────────────────────────────────────

export function subscribeToChanges({ onSale, onRefund, onLoan }) {
  const channel = supabase
    .channel('db-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, payload => {
      if (payload.new) onSale(rowToSale(payload.new))
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'refunds' }, payload => {
      if (payload.new) onRefund(rowToRefund(payload.new))
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'loans' }, payload => {
      if (payload.new) onLoan(rowToLoan(payload.new))
    })
    .subscribe()

  return () => supabase.removeChannel(channel)
}