import { supabase } from './supabaseClient'

export async function syncSale(sale) {
  const { error } = await supabase.from('sales').upsert({
    id: sale.id,
    staff_id: sale.staffId,
    staff_name: sale.staffName,
    division: sale.division,
    till: sale.till,
    items: sale.items,
    total: sale.total,
    payment_method: sale.paymentMethod,
    timestamp: sale.timestamp
  })
  if (error) console.error('Sale sync failed:', error.message)
}

export async function syncLoan(loan) {
  const { error } = await supabase.from('loans').upsert({
    id: loan.id,
    staff_id: loan.staffId,
    staff_name: loan.staffName,
    division: loan.division,
    till: loan.till,
    amount: loan.amount,
    reason: loan.reason,
    timestamp: loan.timestamp
  })
  if (error) console.error('Loan sync failed:', error.message)
}

export async function syncRefund(refund) {
  const { error } = await supabase.from('refunds').upsert({
    id: refund.id,
    staff_id: refund.staffId,
    staff_name: refund.staffName,
    division: refund.division,
    till: refund.till,
    items: refund.items,
    total: refund.total,
    reason: refund.reason,
    timestamp: refund.timestamp
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