import { supabase } from './supabaseClient'

// ── WRITE functions ──────────────────────────────────────────────────────────

export async function syncSale(sale) {
  const { error } = await supabase.from('sales').upsert({
    id: sale.id, division: sale.division || '',
    staff_id: sale.staffId || '', staff_name: sale.staffName || '',
    till: sale.tillNo || sale.till || '',
    product_id: sale.productId || '', product_name: sale.productName || sale.style || '',
    style: sale.style || '', product_code: sale.productCode || '',
    colour: sale.colour || '', size: sale.size || '',
    base_price: Number(sale.basePrice || sale.unitPrice || 0),
    total: Number(sale.total || 0), qty: Number(sale.qty || 1),
    discount: sale.discount || null, is_external: sale.isExternal || false,
    is_unassigned: sale.isUnassigned || false, ext_id: sale.extId || '',
    date: sale.date || new Date().toISOString()
  })
  if (error) console.error('Sale sync failed:', error.message)
}

export async function syncRefund(refund) {
  const { error } = await supabase.from('refunds').upsert({
    id: refund.id, division: refund.division || '', type: refund.type || 'refund',
    staff_id: refund.staffId || '', staff_name: refund.staffName || '',
    till_no: refund.tillNo || '', product_name: refund.productName || refund.style || '',
    sku: refund.sku || refund.code || '', colour: refund.colour || '', size: refund.size || '',
    unit_price: Number(refund.unitPrice || refund.origPrice || 0), reason: refund.reason || '',
    exchange_style: refund.exchangeStyle || '', exchange_code: refund.exchangeCode || '',
    exchange_colour: refund.exchangeColour || '', exchange_size: refund.exchangeSize || '',
    date: refund.date || new Date().toISOString()
  })
  if (error) console.error('Refund sync failed:', error.message)
}

export async function syncLoan(loan) {
  const { error } = await supabase.from('loans').upsert({
    id: loan.id, division: loan.division || '', type: loan.type || 'display',
    staff_id: loan.staffId || '', staff_name: loan.staffName || '',
    product_id: loan.productId || '', product_name: loan.productName || loan.style || '',
    style: loan.style || '', sku: loan.sku || '', colour: loan.colour || '', size: loan.size || '',
    qty: Number(loan.qty || 1), location: loan.location || '', note: loan.note || '',
    requested_by: loan.requestedBy || '', returned: loan.returned || false,
    returned_date: loan.returnedDate || null, shopper_name: loan.shopperName || '',
    shopper_id: loan.shopperId || '', status: loan.status || 'out',
    eod_result: loan.eodResult || null, date: loan.date || new Date().toISOString()
  })
  if (error) console.error('Loan sync failed:', error.message)
}

export async function syncFaulty(item) {
  const { error } = await supabase.from('faulty').upsert({
    id: item.id, division: item.division || '',
    staff_id: item.staffId || '', staff_name: item.staffName || '',
    style: item.style || '', sku: item.sku || '', colour: item.colour || '', size: item.size || '',
    fault_type: item.faultType || '', description: item.description || '',
    action: item.action || '', status: item.status || 'open',
    date: item.date || new Date().toISOString()
  })
  if (error) console.error('Faulty sync failed:', error.message)
}

export async function syncOddShoe(item) {
  const { error } = await supabase.from('odd_shoes').upsert({
    id: item.id, division: item.division || '',
    staff_id: item.staffId || '', staff_name: item.staffName || '',
    style: item.style || '', sku: item.sku || '', colour: item.colour || '',
    shoe1_size: item.shoe1Size || '', shoe1_foot: item.shoe1Foot || '',
    shoe2_size: item.shoe2Size || '', shoe2_foot: item.shoe2Foot || '',
    found_by: item.foundByName || item.staffName || '', note: item.note || '',
    status: item.status || 'logged', date: item.date || new Date().toISOString()
  })
  if (error) console.error('OddShoe sync failed:', error.message)
}

export async function syncProduct(product, division) {
  const { error } = await supabase.from('products').upsert({
    id: product.id, division: division || '',
    name: product.name || '', sku: product.sku || '',
    colour: product.colour || '', size: product.size || '',
    price: Number(product.price || 0), stock: Number(product.stock || 0),
    on_loan: Number(product.onLoan || 0), barcode: product.barcode || ''
  })
  if (error) console.error('Product sync failed:', error.message)
}

export async function syncDelivery(delivery) {
  const { error } = await supabase.from('deliveries').upsert({
    id: delivery.id, division: delivery.division || '',
    staff_id: delivery.staffId || '', staff_name: delivery.staffName || '',
    product_name: delivery.productName || '', style_name: delivery.styleName || '',
    code: delivery.code || '', colour: delivery.colour || '', size: delivery.size || '',
    qty: Number(delivery.qty || 0), note: delivery.note || '',
    date: delivery.date || new Date().toISOString()
  })
  if (error) console.error('Delivery sync failed:', error.message)
}

// ── ROW CONVERTERS ───────────────────────────────────────────────────────────

function rowToSale(r) {
  return { id:r.id, division:r.division, staffId:r.staff_id, staffName:r.staff_name,
    tillNo:r.till, productId:r.product_id, productName:r.product_name, style:r.style,
    productCode:r.product_code, colour:r.colour, size:r.size, basePrice:r.base_price,
    unitPrice:r.base_price, total:r.total, qty:r.qty, discount:r.discount,
    isExternal:r.is_external, isUnassigned:r.is_unassigned, extId:r.ext_id, date:r.date }
}

function rowToRefund(r) {
  return { id:r.id, division:r.division, type:r.type, staffId:r.staff_id, staffName:r.staff_name,
    tillNo:r.till_no, productName:r.product_name, sku:r.sku, colour:r.colour, size:r.size,
    unitPrice:r.unit_price, reason:r.reason, exchangeStyle:r.exchange_style,
    exchangeCode:r.exchange_code, exchangeColour:r.exchange_colour, exchangeSize:r.exchange_size, date:r.date }
}

function rowToLoan(r) {
  return { id:r.id, division:r.division, type:r.type, staffId:r.staff_id, staffName:r.staff_name,
    productId:r.product_id, productName:r.product_name, style:r.style, sku:r.sku,
    colour:r.colour, size:r.size, qty:r.qty, location:r.location, note:r.note,
    requestedBy:r.requested_by, returned:r.returned, returnedDate:r.returned_date,
    shopperName:r.shopper_name, shopperId:r.shopper_id, status:r.status, eodResult:r.eod_result, date:r.date }
}

function rowToFaulty(r) {
  return { id:r.id, division:r.division, staffId:r.staff_id, staffName:r.staff_name,
    style:r.style, sku:r.sku, colour:r.colour, size:r.size, faultType:r.fault_type,
    description:r.description, action:r.action, status:r.status, date:r.date }
}

function rowToOddShoe(r) {
  return { id:r.id, division:r.division, staffId:r.staff_id, staffName:r.staff_name,
    style:r.style, sku:r.sku, colour:r.colour, shoe1Size:r.shoe1_size, shoe1Foot:r.shoe1_foot,
    shoe2Size:r.shoe2_size, shoe2Foot:r.shoe2_foot, foundByName:r.found_by,
    note:r.note, status:r.status, date:r.date }
}

function rowToProduct(r) {
  return { id:r.id, name:r.name, sku:r.sku, colour:r.colour, size:r.size,
    price:r.price, stock:r.stock, onLoan:r.on_loan, barcode:r.barcode }
}

function rowToDelivery(r) {
  return { id:r.id, division:r.division, staffId:r.staff_id, staffName:r.staff_name,
    productName:r.product_name, styleName:r.style_name, code:r.code, colour:r.colour,
    size:r.size, qty:r.qty, note:r.note, date:r.date }
}

// ── FETCH ALL DATA ───────────────────────────────────────────────────────────

export async function fetchAllData() {
  try {
    const [salesRes, refundsRes, loansRes, faultyRes, oddRes, productsRes, deliveriesRes] = await Promise.all([
      supabase.from('sales').select('*').order('date', { ascending: true }),
      supabase.from('refunds').select('*').order('date', { ascending: false }),
      supabase.from('loans').select('*').order('date', { ascending: false }),
      supabase.from('faulty').select('*').order('date', { ascending: false }),
      supabase.from('odd_shoes').select('*').order('date', { ascending: false }),
      supabase.from('products').select('*'),
      supabase.from('deliveries').select('*').order('date', { ascending: false }),
    ])

    const sales = { womens:[], mens:[] }
    const refunds = { womens:[], mens:[] }
    const loans = { womens:[], mens:[] }
    const psLoans = { womens:[], mens:[] }
    const faulty = { womens:[], mens:[] }
    const oddShoes = { womens:[], mens:[] }
    const products = { womens:[], mens:[] }
    const deliveries = { womens:[], mens:[] }

    const div = r => r.division === 'womens' ? 'womens' : 'mens'

    if (!salesRes.error)      salesRes.data.forEach(r      => sales[div(r)].push(rowToSale(r)))
    if (!refundsRes.error)    refundsRes.data.forEach(r    => refunds[div(r)].push(rowToRefund(r)))
    if (!faultyRes.error)     faultyRes.data.forEach(r     => faulty[div(r)].push(rowToFaulty(r)))
    if (!oddRes.error)        oddRes.data.forEach(r        => oddShoes[div(r)].push(rowToOddShoe(r)))
    if (!productsRes.error)   productsRes.data.forEach(r   => products[div(r)].push(rowToProduct(r)))
    if (!deliveriesRes.error) deliveriesRes.data.forEach(r => deliveries[div(r)].push(rowToDelivery(r)))
    if (!loansRes.error) {
      loansRes.data.forEach(r => {
        const loan = rowToLoan(r)
        if (r.type === 'ps') psLoans[div(r)].push(loan)
        else loans[div(r)].push(loan)
      })
    }

    return { sales, refunds, loans, psLoans, faulty, oddShoes, products, deliveries }
  } catch (e) {
    console.error('fetchAllData failed:', e)
    return null
  }
}

// ── REAL-TIME SUBSCRIPTIONS ──────────────────────────────────────────────────

export function subscribeToChanges({ onSale, onRefund, onLoan, onFaulty, onOddShoe, onProduct, onDelivery }) {
  const channel = supabase.channel('db-all-changes')
    .on('postgres_changes', { event:'*', schema:'public', table:'sales' },      p => p.new && onSale(rowToSale(p.new)))
    .on('postgres_changes', { event:'*', schema:'public', table:'refunds' },    p => p.new && onRefund(rowToRefund(p.new)))
    .on('postgres_changes', { event:'*', schema:'public', table:'loans' },      p => p.new && onLoan(rowToLoan(p.new)))
    .on('postgres_changes', { event:'*', schema:'public', table:'faulty' },     p => p.new && onFaulty(rowToFaulty(p.new)))
    .on('postgres_changes', { event:'*', schema:'public', table:'odd_shoes' },  p => p.new && onOddShoe(rowToOddShoe(p.new)))
    .on('postgres_changes', { event:'*', schema:'public', table:'products' },   p => p.new && onProduct(rowToProduct(p.new), p.new.division))
    .on('postgres_changes', { event:'*', schema:'public', table:'deliveries' }, p => p.new && onDelivery(rowToDelivery(p.new)))
    .subscribe()

  return () => supabase.removeChannel(channel)
}