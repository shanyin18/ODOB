import { supabase } from './supabase'

/* ================================================================
   User
   ================================================================ */

export async function findOrCreateUser(nickname) {
  const { data: existing } = await supabase.from('users').select('id, nickname').eq('nickname', nickname).maybeSingle()
  if (existing) return existing

  const { data: created, error } = await supabase.from('users').insert({ nickname }).select('id, nickname').single()
  if (error) {
    if (error.code === '23505') {
      const { data } = await supabase.from('users').select('id, nickname').eq('nickname', nickname).single()
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

export async function getMyRecords(userId) {
  const { data, error } = await supabase.from('reading_logs').select('*').eq('user_id', userId).order('log_date', { ascending: false })
  if (error) { console.error('获取记录失败:', error); return [] }
  return data ?? []
}

export async function getMyTodayRecord(userId) {
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await supabase.from('reading_logs').select('*').eq('user_id', userId).eq('log_date', today).maybeSingle()
  return data ?? null
}

export async function submitLog(userId, { title, author, takeaway }) {
  const today = new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase.from('reading_logs').upsert({ user_id: userId, title, author, takeaway, log_date: today }, { onConflict: 'user_id,log_date' }).select().single()
  if (error) { console.error('打卡失败:', error); return null }
  return data
}

export async function deleteLog(logId) {
  const { error } = await supabase.from('reading_logs').delete().eq('id', logId)
  if (error) { console.error('删除失败:', error); return false }
  return true
}

/* ================================================================
   Public Feed — 公开广场
   ================================================================ */

export async function getPublicFeed(limit = 30) {
  const { data, error } = await supabase.from('reading_logs').select('*, users!reading_logs_user_id_fkey(nickname)').order('created_at', { ascending: false }).limit(limit)
  if (error) { console.error('获取广场数据失败:', error); return [] }
  return data ?? []
}

/* ================================================================
   Streak 计算
   ================================================================ */

export function calcStreakFromLogs(logs) {
  if (!logs || logs.length === 0) return 0
  const dateSet = new Set(logs.map((l) => l.log_date))
  const today = new Date()
  const check = new Date(today)
  const toKey = (d) => d.toISOString().slice(0, 10)

  if (!dateSet.has(toKey(check))) check.setDate(check.getDate() - 1)
  
  let streak = 0
  while (dateSet.has(toKey(check))) {
    streak++
    check.setDate(check.getDate() - 1)
  }
  return streak
}

/* ================================================================
   Interactions (Likes & Comments)
   ================================================================ */

export async function toggleLike(userId, logId, logOwnerId) {
  const { data: existing } = await supabase.from('likes').select('id').eq('user_id', userId).eq('log_id', logId).maybeSingle()

  if (existing) {
    await supabase.from('likes').delete().eq('id', existing.id)
    return false
  } else {
    await supabase.from('likes').insert({ user_id: userId, log_id: logId })
    // 如果给别人点赞，发通知
    if (userId !== logOwnerId) {
      await supabase.from('notifications').insert({
        user_id: logOwnerId, actor_id: userId, type: 'like', log_id: logId
      })
    }
    return true
  }
}

export async function getLogInteractions(logId, userId) {
  const { count: likeCount } = await supabase.from('likes').select('*', { count: 'exact', head: true }).eq('log_id', logId)
  
  let isLiked = false
  if (userId) {
    const { data } = await supabase.from('likes').select('id').eq('user_id', userId).eq('log_id', logId).maybeSingle()
    isLiked = !!data
  }

  const { data: comments } = await supabase
    .from('comments')
    .select('id, content, created_at, user_id, parent_id, users!comments_user_id_fkey(nickname)')
    .eq('log_id', logId)
    .order('created_at', { ascending: true })

  return { likeCount: likeCount || 0, isLiked, comments: comments || [] }
}

export async function addComment(userId, logId, content, logOwnerId, parentId = null, parentOwnerId = null) {
  const { data, error } = await supabase
    .from('comments')
    .insert({ user_id: userId, log_id: logId, content, parent_id: parentId })
    .select('*, users!comments_user_id_fkey(nickname)')
    .single()

  if (error) { console.error('评论失败:', error); return null }

  // 发通知：如果是回复别人，通知被回复的人；如果是普通评论，通知贴主
  if (parentId && userId !== parentOwnerId) {
    await supabase.from('notifications').insert({
      user_id: parentOwnerId, actor_id: userId, type: 'reply', log_id: logId, content: content.substring(0, 50)
    })
  } else if (!parentId && userId !== logOwnerId) {
    await supabase.from('notifications').insert({
      user_id: logOwnerId, actor_id: userId, type: 'comment', log_id: logId, content: content.substring(0, 50)
    })
  }

  return data
}

/* ================================================================
   Notifications (Inbox)
   ================================================================ */

export async function getNotifications(userId) {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, content, is_read, created_at, log_id, actor:users!notifications_actor_id_fkey(nickname), log:reading_logs!notifications_log_id_fkey(title)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) { console.error('获取通知失败:', error); return [] }
  return data ?? []
}

export async function markNotificationsAsRead(userId) {
  await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false)
}
