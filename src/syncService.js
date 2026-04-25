import { supabase } from './supabaseClient'

export async function syncSale(sale) {
  console.log('syncSale firing:', JSON.stringify(sale))
  const { error } = await supabase.from('sales').upsert({
    id: String(sale.id || Date.now()),
    staff_id: String(sale.staffId || sale.resolvedStaffId || ''),
    staff_name: String(sale.staffName || sale.resolvedStaffName || ''),
    division: String(sale.division || ''),
    till: String(sale.tillNo || sale.till || ''),
    items: [],
    total: Number(sale.total || sale.unitPrice || 0),
    payment_method: 'cash',
    timestamp: String(sale.date || sale.timestamp || new Date().toISOString())
  })
  if (error) console.error('Supabase error:', error.message)
  else console.log('Sale synced OK!')
}

export async function syncLoan(loan) {
  const { error } = await supabase.from('loans').upsert({
    id: String(loan.id || Date.now()),
    staff_id: String(loan.staffId || ''),
    staff_name: String(loan.staffName || ''),
    division: String(loan.division || ''),
    till: String(loan.till || ''),
    amount: Number(loan.amount || 0),
    reason: String(loan.reason || ''),
    timestamp: String(loan.timestamp || new Date().toISOString())
  })
  if (error) console.error('Loan sync failed:', error.message)
}

export async function syncRefund(refund) {
  const { error } = await supabase.from('refunds').upsert({
    id: String(refund.id || Date.now()),
    staff_id: String(refund.staffId || ''),
    staff_name: String(refund.staffName || ''),
    division: String(refund.division || ''),
    till: String(refund.till || refund.tillNo || ''),
    items: [],
    total: Number(refund.total || 0),
    reason: String(refund.reason || ''),
    timestamp: String(refund.timestamp || new Date().toISOString())
  })
  if (error) console.error('Refund sync failed:', error.message)
}

export async function fetchTodaysSales(division) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let query = supabase
    .from('sales')
    .select('*')
    .gte('timestamp', today.toISOString())
    .order('timestamp', { ascending: false })
  if (division) query = query.eq('division', division)
  const { data, error } = await query
  if (error) { console.error('Fetch failed:', error.message); return [] }
  return data
}

export function unsubscribe(channel) {
  supabase.removeChannel(channel)
}