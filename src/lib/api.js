import { supabase } from './supabase'

/* ================================================================
   User
   ================================================================ */

/**
 * 查找或创建用户（昵称唯一）
 * @returns {{ id: string, nickname: string } | null}
 */
export async function findOrCreateUser(nickname) {
  // 先查
  const { data: existing } = await supabase
    .from('users')
    .select('id, nickname')
    .eq('nickname', nickname)
    .maybeSingle()

  if (existing) return existing

  // 不存在则创建
  const { data: created, error } = await supabase
    .from('users')
    .insert({ nickname })
    .select('id, nickname')
    .single()

  if (error) {
    // 并发冲突 → 再查一次
    if (error.code === '23505') {
      const { data } = await supabase
        .from('users')
        .select('id, nickname')
        .eq('nickname', nickname)
        .single()
      return data
    }
    console.error('创建用户失败:', error)
    return null
  }
  return created
}

/* ================================================================
   Reading Logs — 个人
   ================================================================ */

/** 获取某用户的所有记录（按日期降序） */
export async function getMyRecords(userId) {
  const { data, error } = await supabase
    .from('reading_logs')
    .select('*')
    .eq('user_id', userId)
    .order('log_date', { ascending: false })

  if (error) {
    console.error('获取记录失败:', error)
    return []
  }
  return data ?? []
}

/** 获取某用户今天的记录 */
export async function getMyTodayRecord(userId) {
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await supabase
    .from('reading_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('log_date', today)
    .maybeSingle()

  return data ?? null
}

/** 打卡 */
export async function submitLog(userId, { title, author, takeaway }) {
  const today = new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('reading_logs')
    .upsert(
      { user_id: userId, title, author, takeaway, log_date: today },
      { onConflict: 'user_id,log_date' },
    )
    .select()
    .single()

  if (error) {
    console.error('打卡失败:', error)
    return null
  }
  return data
}

/** 撤销打卡 */
export async function deleteLog(logId) {
  const { error } = await supabase
    .from('reading_logs')
    .delete()
    .eq('id', logId)

  if (error) {
    console.error('删除失败:', error)
    return false
  }
  return true
}

/* ================================================================
   Public Feed — 公开广场
   ================================================================ */

/**
 * 获取所有人的最新打卡记录
 * 联表查用户昵称
 */
export async function getPublicFeed(limit = 30) {
  const { data, error } = await supabase
    .from('reading_logs')
    .select('*, users(nickname)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('获取广场数据失败:', error)
    return []
  }
  return data ?? []
}

/* ================================================================
   Streak 计算
   ================================================================ */

/** 根据用户的记录列表计算连续天数 */
export function calcStreakFromLogs(logs) {
  if (!logs || logs.length === 0) return 0

  const dateSet = new Set(logs.map((l) => l.log_date))
  const today = new Date()
  const check = new Date(today)

  const toKey = (d) => d.toISOString().slice(0, 10)

  // 如果今天没记录，从昨天开始
  if (!dateSet.has(toKey(check))) {
    check.setDate(check.getDate() - 1)
  }

  let streak = 0
  while (dateSet.has(toKey(check))) {
    streak++
    check.setDate(check.getDate() - 1)
  }

  return streak
}
