import { supabase } from './supabaseClient'

export async function syncSale(sale) {
  console.log('syncSale called with:', sale)
  const { error } = await supabase.from('sales').upsert({
    id: String(sale.id || Date.now()),
    staff_id: sale.staffId || sale.staff_id || '',
    staff_name: sale.staffName || sale.staff_name || '',
    division: sale.division || '',
    till: sale.till || sale.tillNo || '',
    items: sale.items || [],
    total: Number(sale.total) || 0,
    payment_method: sale.paymentMethod || sale.payment_method || 'cash',
    timestamp: sale.timestamp || sale.date || new Date().toISOString()
  })
  if (error) console.error('Sale sync failed:', error.message)
  else console.log('Sale synced successfully!')
}

export async function syncLoan(loan) {
  const { error } = await supabase.from('loans').upsert({
    id: String(loan.id || Date.now()),
    staff_id: loan.staffId || '',
    staff_name: loan.staffName || '',
    division: loan.division || '',
    till: loan.till || '',
    amount: Number(loan.amount) || 0,
    reason: loan.reason || '',
    timestamp: loan.timestamp || new Date().toISOString()
  })
  if (error) console.error('Loan sync failed:', error.message)
}

export async function syncRefund(refund) {
  const { error } = await supabase.from('refunds').upsert({
    id: String(refund.id || Date.now()),
    staff_id: refund.staffId || '',
    staff_name: refund.staffName || '',
    division: refund.division || '',
    till: refund.till || '',
    items: refund.items || [],
    total: Number(refund.total) || 0,
    reason: refund.reason || '',
    timestamp: refund.timestamp || new Date().toISOString()
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

export function subscribeToSales(onNewSale) {
  return supabase
    .channel('sales-channel')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'sales' },
      payload => onNewSale(payload.new))
    .subscribe()
}

export function unsubscribe(channel) {
  supabase.removeChannel(channel)
}