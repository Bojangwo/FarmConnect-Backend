const mongoose = require('mongoose');
const Order = require('../models/Order');
const Payout = require('../models/Payout');

function period(query) {
  const { startDate, endDate } = query;
  const valid = s => !s || /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z')) && new Date(s + 'T00:00:00Z').toISOString().slice(0,10) === s;
  if (!valid(startDate) || !valid(endDate) || (startDate && endDate && startDate > endDate)) throw new Error('Invalid date range. Use YYYY-MM-DD.');
  const start = startDate ? new Date(startDate + 'T00:00:00.000Z') : null;
  const end = endDate ? new Date(endDate + 'T23:59:59.999Z') : null;
  return { start, end, startDate: startDate || null, endDate: endDate || null };
}
const within = (date, p) => !!date && (!p.start || new Date(date) >= p.start) && (!p.end || new Date(date) <= p.end);
const sum = (items, field) => Math.round(items.reduce((n, x) => n + (Number(x[field]) || 0), 0) * 100) / 100;
const monthOf = d => new Date(d).toISOString().slice(0,7);
function monthSeries(items, getDate, getValue) {
  const map = new Map();
  for (const item of items) {
    const month = monthOf(getDate(item));
    const current = map.get(month) || { month, count: 0, amount: 0 };
    current.count++;
    current.amount += Number(getValue(item)) || 0;
    map.set(month, current);
  }
  return [...map.values()].sort((a,b) => a.month.localeCompare(b.month)).map(x => ({...x, amount: Math.round(x.amount * 100)/100}));
}
function payoutsSummary(payouts, p) {
  const pending = payouts.filter(x => x.status === 'pending' && within(x.createdAt,p));
  const paid = payouts.filter(x => x.status === 'paid' && within(x.paidAt || x.updatedAt,p));
  return { pending: sum(pending,'amount'), recordedPaid: sum(paid,'amount'), pendingCount: pending.length, recordedPaidCount: paid.length };
}

exports.getFarmerReport = async (req,res) => {
  try {
    const p = period(req.query);
    const id = new mongoose.Types.ObjectId(req.user.id);
    const [orders, payouts] = await Promise.all([
      Order.find({farmer:id}).populate('product','name').lean(),
      Payout.find({recipient:id,recipientType:'farmer'}).lean()
    ]);
    const periodOrders = orders.filter(o => within(o.createdAt,p));
    const paidOrders = orders.filter(o => o.paymentStatus === 'paid' && within(o.paidAt || o.createdAt,p));
    const completed = periodOrders.filter(o => o.status === 'completed');
    const productMap = new Map();
    for (const o of paidOrders) {
      const key = String(o.product?._id || o.product || 'deleted');
      const row = productMap.get(key) || {productId:key, name:o.product?.name || 'Deleted product',quantitySold:0,salesValue:0,orders:0};
      row.quantitySold += Number(o.quantity)||0; row.salesValue += Number(o.subtotal)||0; row.orders++;
      productMap.set(key,row);
    }
    res.json({period:{startDate:p.startDate,endDate:p.endDate},orders:{total:periodOrders.length,completed:completed.length,cancelled:periodOrders.filter(o=>o.status==='cancelled').length,pending:periodOrders.filter(o=>o.status==='pending').length},sales:{paidOrders:paidOrders.length,grossProductSales:sum(paidOrders,'subtotal'),commission:sum(paidOrders,'commissionAmount'),farmerEarnings:sum(paidOrders,'farmerEarnings'),quantitySold:sum(paidOrders,'quantity')},payouts:payoutsSummary(payouts,p),monthlySales:monthSeries(paidOrders,o=>o.paidAt||o.createdAt,o=>o.subtotal),topProducts:[...productMap.values()].sort((a,b)=>b.quantitySold-a.quantitySold).slice(0,10).map(x=>({...x,salesValue:Math.round(x.salesValue*100)/100}))});
  } catch(e) { if(e.message.startsWith('Invalid date')) return res.status(400).json({message:e.message}); console.error('Farmer report:',e); res.status(500).json({message:'Could not generate farmer report'}); }
};

exports.getDeliveryReport = async (req,res) => {
  try {
    const p = period(req.query);
    const id = new mongoose.Types.ObjectId(req.user.id);
    // Include assignments that were later reassigned away from this agent.
    const [orders,payouts] = await Promise.all([
      Order.find({$or:[{deliveryAgent:id},{'deliveryAssignmentHistory.deliveryAgent':id}]}).lean(),
      Payout.find({recipient:id,recipientType:'deliveryAgent'}).lean()
    ]);
    const events = orders.flatMap(o => (o.deliveryAssignmentHistory||[]).filter(h=>String(h.deliveryAgent)===req.user.id).map(h=>({orderId:String(o._id),outcome:h.outcome,date:h.assignedAt})));
    const selectedEvents = events.filter(x=>within(x.date,p));
    const assignedOrderIds = new Set(selectedEvents.map(x=>x.orderId));
    // Current status belongs to the current agent only; prior assignments cannot claim a delivery completed by someone else.
    const current = orders.filter(o=>String(o.deliveryAgent)===req.user.id && within(o.createdAt,p));
    const delivered = current.filter(o=>o.deliveryStatus==='delivered');
    const paidDelivered = delivered.filter(o=>o.paymentStatus==='paid');
    res.json({period:{startDate:p.startDate,endDate:p.endDate},deliveries:{assignedOrdersInPeriod:assignedOrderIds.size,assignmentEvents:selectedEvents.length,currentAssignedOrders:current.length,delivered:delivered.length,failed:current.filter(o=>o.deliveryStatus==='failed').length,reassignedEvents:selectedEvents.filter(x=>x.outcome==='reassigned').length,failedEvents:selectedEvents.filter(x=>x.outcome==='failed').length},earnings:{earnedOnPaidDeliveredOrders:sum(paidDelivered,'deliveryEarnings')},payouts:payoutsSummary(payouts,p),monthlyDeliveries:monthSeries(current,o=>o.createdAt,()=>1).map(x=>({month:x.month,count:x.count,delivered:current.filter(o=>monthOf(o.createdAt)===x.month && o.deliveryStatus==='delivered').length}))});
  } catch(e) { if(e.message.startsWith('Invalid date')) return res.status(400).json({message:e.message}); console.error('Delivery report:',e); res.status(500).json({message:'Could not generate delivery report'}); }
};
