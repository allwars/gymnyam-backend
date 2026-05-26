const supabase = require('../db/supabase');

async function upsertDailyStat(userId, date, fields) {
  const { error } = await supabase
    .from('daily_stats')
    .upsert({ user_id: userId, date, ...fields }, { onConflict: 'user_id,date' });
  if (error) throw error;
}

async function getDailyStats(userId, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days + 1);
  const sinceStr = since.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('daily_stats')
    .select('date,steps,distance_m,active_calories,sleep_hours,weight')
    .eq('user_id', userId)
    .gte('date', sinceStr)
    .order('date', { ascending: true });

  if (error) throw error;
  return data || [];
}

module.exports = { upsertDailyStat, getDailyStats };
