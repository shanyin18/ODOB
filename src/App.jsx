import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Check, Pencil, Calendar, Quote, Sparkles,
  ChevronDown, ChevronUp, Trash2, Users, LogOut,
  Heart, MessageSquare, X, Send, Bell, Reply
} from 'lucide-react'
import {
  findOrCreateUser, getMyRecords, getMyTodayRecord,
  submitLog, deleteLog, getPublicFeed, calcStreakFromLogs,
  toggleLike, getLogInteractions, addComment,
  getNotifications, markNotificationsAsRead
} from './lib/api'

/* ================================================================ */
const USER_KEY = 'daily-book-user'

function formatDateCN(date = new Date()) {
  const w = ['日','一','二','三','四','五','六']
  return `${date.getFullYear()}年${date.getMonth()+1}月${date.getDate()}日 星期${w[date.getDay()]}`
}

function spawnConfetti() {
  const colors = ['#e8927c','#f59e0b','#10b981','#6366f1','#ec4899','#f97316']
  const c = document.createElement('div')
  c.setAttribute('aria-hidden','true')
  document.body.appendChild(c)
  for (let i = 0; i < 50; i++) {
    const p = document.createElement('div')
    p.className = 'confetti-piece'
    p.style.left = `${Math.random()*100}vw`
    p.style.backgroundColor = colors[Math.floor(Math.random()*colors.length)]
    p.style.animationDelay = `${Math.random()*0.8}s`
    p.style.animationDuration = `${1.5+Math.random()*1.5}s`
    p.style.width = `${6+Math.random()*8}px`
    p.style.height = `${6+Math.random()*8}px`
    p.style.borderRadius = Math.random()>0.5?'50%':'2px'
    c.appendChild(p)
  }
  setTimeout(()=>c.remove(),4000)
}

const inputStyle = {
  width:'100%', padding:'10px 16px', borderRadius:'12px', fontSize:'14px',
  outline:'none', backgroundColor:'var(--color-bg)', border:'1px solid var(--color-border)',
  color:'var(--color-text)', transition:'border-color 0.2s', fontFamily:'inherit',
}

/* ================================================================
   NicknameGate
   ================================================================ */
function NicknameGate({ onLogin }) {
  const [nick, setNick] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [quoteIdx, setQuoteIdx] = useState(0)

  const quotes = useMemo(() => [
    { text: "阅读是一座随身携带的避难所。", author: "毛姆" },
    { text: "吾生也有涯，而知也无涯。", author: "庄子" },
    { text: "我们在书本中体验千百种人生。", author: "乔治·R·R·马丁" },
    { text: "书籍是屹立在时间的汪洋大海中的灯塔。", author: "惠普尔" }
  ], [])

  useEffect(() => {
    const timer = setInterval(() => setQuoteIdx(i => (i + 1) % quotes.length), 5000)
    return () => clearInterval(timer)
  }, [quotes])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = nick.trim()
    if (!trimmed) return
    setLoading(true)
    setError('')
    const user = await findOrCreateUser(trimmed)
    if (!user) { setError('连接失败，请检查网络'); setLoading(false); return }
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    onLogin(user)
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '16px',
      backgroundColor: '#08060d',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* 视频背景：利用宽高计算完美裁切掉16:9视频两侧的黑框，只保留中间的1:1内容 */}
      <video 
        autoPlay loop muted playsInline
        className="video-bg-animate"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          height: 'max(100vw, 100vh)',
          width: 'calc(max(100vw, 100vh) * 16 / 9)',
          objectFit: 'cover',
          zIndex: 0
        }}
      >
        <source src="/bg-video.mp4" type="video/mp4" />
      </video>

      {/* 模糊遮罩 */}
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(8, 6, 13, 0.3)', backdropFilter: 'blur(8px)', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
        
        {/* 名言展示区（绝对定位，悬浮在上方，不占用排版空间） */}
        <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: '40px', textAlign: 'center', height: '80px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', pointerEvents: 'none' }}>
          <AnimatePresence mode="wait">
            <motion.div key={quoteIdx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.8 }}>
              <p style={{ fontSize: '18px', color: '#fff', fontWeight: 300, letterSpacing: '2px', textShadow: '0 2px 8px rgba(0,0,0,0.8)', fontFamily: 'var(--font-serif)' }}>"{quotes[quoteIdx].text}"</p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', marginTop: '8px', letterSpacing: '1px', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>—— {quotes[quoteIdx].author}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 登录框（增加玻璃拟态设计） */}
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
          style={{ maxWidth:'380px', width:'100%', borderRadius:'24px', padding:'40px 32px', background:'rgba(255, 255, 255, 0.08)', backdropFilter:'blur(24px)', border:'1px solid rgba(255, 255, 255, 0.15)', boxShadow:'0 16px 40px rgba(0,0,0,0.4)', textAlign:'center' }}>
          <h1 style={{ fontSize:'32px', fontWeight:700, fontFamily:'var(--font-serif)', color:'#fff', marginBottom:'8px', textShadow:'0 2px 4px rgba(0,0,0,0.3)' }}>一日一书</h1>
          <p style={{ fontSize:'14px', color:'rgba(255,255,255,0.7)', marginBottom:'32px' }}>输入昵称，开始你的阅读之旅</p>
          <form onSubmit={handleSubmit}>
            <input type="text" value={nick} onChange={e=>setNick(e.target.value)} placeholder="你的昵称" required maxLength={20} style={{ ...inputStyle, textAlign:'center', fontSize:'16px', marginBottom:'16px', background:'rgba(0,0,0,0.25)', border:'1px solid rgba(255,255,255,0.2)', color:'#fff', backdropFilter:'blur(4px)' }} onFocus={e=>(e.target.style.borderColor='rgba(255,255,255,0.5)')} onBlur={e=>(e.target.style.borderColor='rgba(255,255,255,0.2)')}/>
            {error && <p style={{ fontSize:'12px', color:'#ef4444', marginBottom:'12px' }}>{error}</p>}
            <motion.button type="submit" whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }} disabled={loading} style={{ width:'100%', padding:'12px', borderRadius:'12px', fontSize:'14px', fontWeight:600, color:'#fff', cursor:'pointer', border:'none', fontFamily:'inherit', background:'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 100%)', backdropFilter:'blur(10px)', borderTop:'1px solid rgba(255,255,255,0.3)', borderLeft:'1px solid rgba(255,255,255,0.3)', boxShadow:'0 4px 16px rgba(0,0,0,0.2)', opacity: loading?0.6:1, transition: 'background 0.3s' }}>
              {loading ? '进入中...' : '进入宇宙'}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  )
}

/* ================================================================
   InboxModal
   ================================================================ */
function InboxModal({ notifications, onClose, onRead }) {
  useEffect(() => { onRead() }, [onRead])

  return (
    <motion.div initial={{opacity:0, y:-10, scale:0.95}} animate={{opacity:1, y:0, scale:1}} exit={{opacity:0, y:-10, scale:0.95}} transition={{duration:0.2}}
      style={{ position:'absolute', top:'40px', right:0, width:'320px', maxHeight:'400px', zIndex:50, background:'var(--color-surface)', borderRadius:'16px', boxShadow:'0 10px 40px rgba(0,0,0,0.1)', overflowY:'auto', border:'1px solid var(--color-border)', textAlign:'left' }}>
      <div style={{ padding:'16px', borderBottom:'1px solid var(--color-border-light)', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, background:'var(--color-surface)', zIndex:2 }}>
        <h3 style={{ fontSize:'15px', fontWeight:600, display:'flex', alignItems:'center', gap:'8px', color:'var(--color-text)' }}><Bell size={16}/> 消息通知</h3>
        <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--color-text-tertiary)' }}><X size={16}/></button>
      </div>
      <div>
        {notifications.length === 0 ? (
          <p style={{ textAlign:'center', fontSize:'13px', color:'var(--color-text-tertiary)', padding:'40px 24px' }}>暂无新消息</p>
        ) : notifications.map(n => (
          <div key={n.id} style={{ padding:'16px', borderBottom:'1px solid var(--color-border-light)', display:'flex', gap:'12px', background: n.is_read ? 'transparent' : 'rgba(232,146,124,0.04)' }}>
            <div style={{width:'32px', height:'32px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', fontWeight:700, color:'#fff', background:`hsl(${[...(n.actor?.nickname||'A')].reduce((a,c)=>a+c.charCodeAt(0),0)%360},65%,55%)`, flexShrink:0}}>
              {(n.actor?.nickname||'A').charAt(0).toUpperCase()}
            </div>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:'14px', color:'var(--color-text)' }}>
                <strong>{n.actor?.nickname}</strong>
                {n.type === 'like' && ' 赞了你的记录 '}
                {n.type === 'comment' && ' 评论了你 '}
                {n.type === 'reply' && ' 回复了你的评论 '}
              </p>
              <p style={{ fontSize:'13px', color:'var(--color-accent)', marginTop:'4px', fontWeight:500 }}>《{n.log?.title}》</p>
              {n.content && <p style={{ fontSize:'13px', color:'var(--color-text-secondary)', marginTop:'6px', padding:'8px', background:'var(--color-bg)', borderRadius:'8px', fontStyle:'italic' }}>"{n.content}"</p>}
              <p style={{ fontSize:'11px', color:'var(--color-text-tertiary)', marginTop:'8px' }}>{new Date(n.created_at).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

/* ================================================================
   HeroSection & TodayCard & HistoryGrid
   ================================================================ */
function HeroSection({ streak, nickname, onLogout, notifications, onReadInbox }) {
  const [isInboxOpen, setIsInboxOpen] = useState(false)
  const today = useMemo(()=>formatDateCN(),[])
  const unreadCount = useMemo(()=>notifications.filter(n=>!n.is_read).length, [notifications])

  return (
    <motion.header initial={{opacity:0,y:-20}} animate={{opacity:1,y:0}} transition={{duration:0.5}}
      style={{ textAlign:'center', marginBottom:'2.5rem', position:'relative' }}>
      
      {/* Top Right Actions */}
      <div style={{ position:'absolute', right:0, top:0, display:'flex', alignItems:'center', gap:'16px' }}>
        <div style={{ position:'relative' }}>
          <button onClick={()=>setIsInboxOpen(!isInboxOpen)} style={{ background:'none', border:'none', cursor:'pointer', color: unreadCount > 0 ? 'var(--color-text)' : 'var(--color-text-tertiary)', display:'flex', alignItems:'center', padding:'4px', position:'relative' }}>
            <Bell size={18} />
            {unreadCount > 0 && <span style={{ position:'absolute', top:'2px', right:'2px', width:'8px', height:'8px', borderRadius:'50%', background:'#ef4444', border:'2px solid var(--color-surface)' }}/>}
          </button>
          <AnimatePresence>
            {isInboxOpen && <InboxModal notifications={notifications} onClose={()=>setIsInboxOpen(false)} onRead={onReadInbox} />}
          </AnimatePresence>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <span style={{ fontSize:'13px', color:'var(--color-text-secondary)', fontWeight:500 }}>{nickname}</span>
          <button onClick={onLogout} title="退出登录" style={{ background:'none', border:'none', cursor:'pointer', color:'var(--color-text-tertiary)', display:'flex', alignItems:'center', padding:'4px' }}>
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <p style={{ fontSize:'13px', letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--color-text-tertiary)' }}>{today}</p>
      <h1 style={{ marginTop:'12px', fontSize:'clamp(2rem,5vw,3rem)', fontWeight:700, letterSpacing:'-0.02em', fontFamily:'var(--font-serif)', color:'var(--color-text)' }}>一日一书</h1>
      <p style={{ marginTop:'8px', fontSize:'15px', color:'var(--color-text-secondary)' }}>记录你每一天的阅读旅程</p>
      
      <motion.div key={streak} initial={{scale:0.8,opacity:0}} animate={{scale:1,opacity:1}} transition={{type:'spring',stiffness:300,damping:20}}
        style={{ display:'inline-flex', alignItems:'center', gap:'8px', marginTop:'24px', padding:'8px 20px', borderRadius:'9999px', fontSize:'14px', fontWeight:600, background: streak>0 ? 'linear-gradient(135deg,#fffbeb 0%,#fef3c7 100%)' : 'var(--color-surface)', color: streak>0 ? '#92400e' : 'var(--color-text-secondary)', border: streak>0 ? '1px solid #fde68a' : '1px solid var(--color-border)' }}>
        {streak>0 ? (<span>连续阅读 <strong>{streak}</strong> 天</span>)
          : (<span>今天还没有打卡哦</span>)}
      </motion.div>
    </motion.header>
  )
}

function TodayCard({ todayRecord, onSubmit, onDelete, submitting }) {
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [takeaway, setTakeaway] = useState('')
  const [glowing, setGlowing] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()||submitting) return
    await onSubmit({ title:title.trim(), author:author.trim(), takeaway:takeaway.trim() })
    setTitle(''); setAuthor(''); setTakeaway('')
    setGlowing(true); spawnConfetti()
    setTimeout(()=>setGlowing(false),3000)
  }

  return (
    <motion.section layout className={glowing?'glow-animate':''} style={{ maxWidth:'36rem', margin:'0 auto 3rem', borderRadius:'16px', padding:'clamp(24px,4vw,32px)', backgroundColor:'var(--color-surface)', border:'1px solid var(--color-border-light)', boxShadow:'0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)' }} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.4,delay:0.15}}>
      <AnimatePresence mode="wait">
        {todayRecord ? (
          <motion.div key="done" initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.95}} transition={{duration:0.3}}>
            <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'20px'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'center',width:'40px',height:'40px',borderRadius:'50%',backgroundColor:'var(--color-success-soft)'}}>
                <Check size={20} style={{color:'var(--color-success)'}}/>
              </div>
              <div><p style={{fontSize:'15px',fontWeight:600,color:'var(--color-text)'}}>今日已完成阅读</p><p style={{fontSize:'12px',color:'var(--color-text-tertiary)'}}>阅读是最好的自我进化</p></div>
            </div>
            <div style={{borderRadius:'12px',padding:'20px',backgroundColor:'var(--color-bg)',border:'1px solid var(--color-border-light)'}}>
              <h3 style={{fontSize:'20px',fontWeight:700,marginBottom:'4px',fontFamily:'var(--font-serif)',color:'var(--color-text)'}}>《{todayRecord.title}》</h3>
              {todayRecord.author && <p style={{fontSize:'13px',marginBottom:'12px',color:'var(--color-text-secondary)'}}>{todayRecord.author}</p>}
              {todayRecord.takeaway && (
                <div style={{display:'flex',gap:'8px',marginTop:'12px',paddingTop:'12px',borderTop:'1px solid var(--color-border-light)'}}>
                  <Quote size={14} style={{marginTop:'2px',flexShrink:0,color:'var(--color-accent)'}}/>
                  <p style={{fontSize:'13px',lineHeight:1.7,fontStyle:'italic',color:'var(--color-text-secondary)'}}>{todayRecord.takeaway}</p>
                </div>
              )}
            </div>
            <button onClick={onDelete} style={{marginTop:'16px',display:'flex',alignItems:'center',gap:'6px',fontSize:'12px',cursor:'pointer',color:'var(--color-text-tertiary)',background:'none',border:'none',padding:0,fontFamily:'inherit',transition:'color 0.2s'}} onMouseEnter={e=>(e.currentTarget.style.color='#ef4444')} onMouseLeave={e=>(e.currentTarget.style.color='var(--color-text-tertiary)')}><Trash2 size={12}/>撤销打卡</button>
          </motion.div>
        ) : (
          <motion.form key="form" initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.95}} transition={{duration:0.3}} onSubmit={handleSubmit}>
            <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'24px'}}><h2 style={{fontSize:'17px',fontWeight:600,color:'var(--color-text)'}}>记录今日阅读</h2></div>
            <div style={{marginBottom:'16px'}}>
              <label style={{display:'block',fontSize:'12px',fontWeight:500,marginBottom:'6px',color:'var(--color-text-secondary)'}}>书名 <span style={{color:'var(--color-accent)'}}>*</span></label>
              <input type="text" value={title} onChange={e=>setTitle(e.target.value)} placeholder="你今天读了什么？" required style={inputStyle} onFocus={e=>(e.target.style.borderColor='var(--color-accent)')} onBlur={e=>(e.target.style.borderColor='var(--color-border)')}/>
            </div>
            <div style={{marginBottom:'16px'}}>
              <label style={{display:'block',fontSize:'12px',fontWeight:500,marginBottom:'6px',color:'var(--color-text-secondary)'}}>作者</label>
              <input type="text" value={author} onChange={e=>setAuthor(e.target.value)} placeholder="（选填）" style={inputStyle} onFocus={e=>(e.target.style.borderColor='var(--color-accent)')} onBlur={e=>(e.target.style.borderColor='var(--color-border)')}/>
            </div>
            <div style={{marginBottom:'24px'}}>
              <label style={{display:'block',fontSize:'12px',fontWeight:500,marginBottom:'6px',color:'var(--color-text-secondary)'}}>今日启发</label>
              <textarea value={takeaway} onChange={e=>setTakeaway(e.target.value)} placeholder="一句话记录你的收获…" rows={3} style={{...inputStyle,resize:'none'}} onFocus={e=>(e.target.style.borderColor='var(--color-accent)')} onBlur={e=>(e.target.style.borderColor='var(--color-border)')}/>
            </div>
            <motion.button type="submit" whileHover={{scale:1.02}} whileTap={{scale:0.97}} disabled={submitting} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',padding:'12px',borderRadius:'12px',fontSize:'14px',fontWeight:600,color:'#fff',cursor:'pointer',border:'none',fontFamily:'inherit',background:'linear-gradient(135deg,var(--color-accent) 0%,var(--color-accent-hover) 100%)',boxShadow:'0 2px 8px rgba(232,146,124,0.35)',opacity:submitting?0.6:1}}>
              {submitting?'提交中...':'完成阅读'}
            </motion.button>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.section>
  )
}

function BookCard({ record, onClick }) {
  const dateObj = new Date(record.log_date + 'T00:00:00')
  const w = ['日','一','二','三','四','五','六']
  const displayDate = `${dateObj.getMonth()+1}/${dateObj.getDate()} 周${w[dateObj.getDay()]}`

  return (
    <motion.div layoutId={`card-${record.id}`} onClick={()=>onClick(record)} initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} whileHover={{y:-5,boxShadow:'0 8px 25px rgba(0,0,0,0.08)'}} transition={{duration:0.2}} style={{borderRadius:'16px',padding:'20px',cursor:'pointer',display:'flex',flexDirection:'column', backgroundColor:'var(--color-surface)',border:'1px solid var(--color-border-light)',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
      <span style={{fontSize:'12px',fontWeight:500,padding:'4px 10px',borderRadius:'9999px',alignSelf:'flex-start',marginBottom:'12px', backgroundColor:'var(--color-bg)',color:'var(--color-text-tertiary)',border:'1px solid var(--color-border-light)',display:'inline-flex',alignItems:'center',gap:'4px'}}><Calendar size={10}/>{displayDate}</span>
      <h4 style={{fontSize:'15px',fontWeight:700,marginBottom:'2px',fontFamily:'var(--font-serif)',color:'var(--color-text)', display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>《{record.title}》</h4>
      {record.author && <p style={{fontSize:'12px',marginBottom:'8px',color:'var(--color-text-tertiary)'}}>{record.author}</p>}
      {record.takeaway && <p style={{fontSize:'12px',marginTop:'auto',paddingTop:'12px',fontStyle:'italic',lineHeight:1.6,color:'var(--color-text-secondary)', borderTop:'1px solid var(--color-border-light)',display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical',overflow:'hidden'}}>"{record.takeaway}"</p>}
    </motion.div>
  )
}

function HistoryGrid({ records, todayDate, onLogClick, currentUser }) {
  const [expanded, setExpanded] = useState(false)
  const history = useMemo(()=>records.filter(r=>r.log_date!==todayDate),[records,todayDate])
  if (history.length===0) return null

  const VISIBLE = 6
  const visible = expanded ? history : history.slice(0,VISIBLE)
  const hasMore = history.length > VISIBLE

  const handleClick = (record) => {
    // 注入当前用户信息，让详情面板显示名字
    onLogClick({ ...record, users: { nickname: currentUser.nickname } })
  }

  return (
    <motion.section initial={{opacity:0}} animate={{opacity:1}} transition={{duration:0.4,delay:0.3}} style={{maxWidth:'56rem',margin:'0 auto 3rem'}}>
      <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'24px'}}>
        <h2 style={{fontSize:'17px',fontWeight:600,color:'var(--color-text)'}}>我的书架</h2>
        <span style={{fontSize:'12px',padding:'2px 8px',borderRadius:'9999px',backgroundColor:'var(--color-accent-soft)',color:'var(--color-accent)'}}>{history.length} 本</span>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:'16px'}}>
        <AnimatePresence>{visible.map(r=><BookCard key={r.id} record={r} onClick={handleClick}/>)}</AnimatePresence>
      </div>
      {hasMore && (
        <div style={{display:'flex',justifyContent:'center',marginTop:'24px'}}>
          <motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}} onClick={()=>setExpanded(!expanded)} style={{display:'flex',alignItems:'center',gap:'6px',padding:'8px 20px',borderRadius:'9999px',fontSize:'13px',fontWeight:500,cursor:'pointer', backgroundColor:'var(--color-surface)',color:'var(--color-text-secondary)',border:'1px solid var(--color-border)',fontFamily:'inherit'}}>
            {expanded?<><ChevronUp size={14}/>收起</>:<><ChevronDown size={14}/>查看全部 ({history.length})</>}
          </motion.button>
        </div>
      )}
    </motion.section>
  )
}

/* ================================================================
   PublicFeed
   ================================================================ */
function FeedCard({ record, onClick }) {
  const nickname = record.users?.nickname ?? '匿名'
  const initial = nickname.charAt(0).toUpperCase()
  const dateObj = new Date(record.log_date + 'T00:00:00')
  const w = ['日','一','二','三','四','五','六']
  const displayDate = `${dateObj.getMonth()+1}/${dateObj.getDate()} 周${w[dateObj.getDay()]}`
  const hue = [...nickname].reduce((a,c)=>a+c.charCodeAt(0),0) % 360

  return (
    <motion.div layoutId={`card-${record.id}`} onClick={()=>onClick(record)} whileHover={{y:-4,boxShadow:'0 8px 25px rgba(0,0,0,0.08)'}} transition={{duration:0.3}} style={{borderRadius:'16px',padding:'20px',cursor:'pointer',display:'flex',flexDirection:'column', backgroundColor:'var(--color-surface)',border:'1px solid var(--color-border-light)',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
      <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'12px'}}>
        <div style={{width:'28px',height:'28px',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center', fontSize:'12px',fontWeight:700,color:'#fff',background:`hsl(${hue},65%,55%)`,flexShrink:0}}>{initial}</div>
        <span style={{fontSize:'13px',fontWeight:600,color:'var(--color-text)',flex:1}}>{nickname}</span>
        <span style={{fontSize:'11px',color:'var(--color-text-tertiary)'}}>{displayDate}</span>
      </div>
      <h4 style={{fontSize:'15px',fontWeight:700,marginBottom:'2px',fontFamily:'var(--font-serif)',color:'var(--color-text)', display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>《{record.title}》</h4>
      {record.author && <p style={{fontSize:'12px',marginBottom:'4px',color:'var(--color-text-tertiary)'}}>{record.author}</p>}
      {record.takeaway && <p style={{fontSize:'12px',marginTop:'auto',paddingTop:'12px',fontStyle:'italic',lineHeight:1.6,color:'var(--color-text-secondary)', borderTop:'1px solid var(--color-border-light)',display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical',overflow:'hidden'}}>"{record.takeaway}"</p>}
    </motion.div>
  )
}

function PublicFeed({ feed, currentUserId, onLogClick }) {
  const [expanded, setExpanded] = useState(false)
  const others = useMemo(()=>feed.filter(r=>r.user_id!==currentUserId),[feed,currentUserId])
  if (others.length===0) return null
  const VISIBLE = 6
  const visible = expanded ? others : others.slice(0,VISIBLE)
  const hasMore = others.length > VISIBLE

  return (
    <motion.section initial={{opacity:0}} animate={{opacity:1}} transition={{duration:0.4,delay:0.4}} style={{maxWidth:'56rem',margin:'0 auto 3rem'}}>
      <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'24px'}}>
        <h2 style={{fontSize:'17px',fontWeight:600,color:'var(--color-text)'}}>阅读广场</h2>
        <span style={{fontSize:'12px',padding:'2px 8px',borderRadius:'9999px',backgroundColor:'#ede9fe',color:'#7c3aed'}}>{others.length} 条</span>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:'16px'}}>
        <AnimatePresence>{visible.map(r=><FeedCard key={r.id} record={r} onClick={onLogClick}/>)}</AnimatePresence>
      </div>
      {hasMore && (
        <div style={{display:'flex',justifyContent:'center',marginTop:'24px'}}>
          <motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}} onClick={()=>setExpanded(!expanded)} style={{display:'flex',alignItems:'center',gap:'6px',padding:'8px 20px',borderRadius:'9999px',fontSize:'13px',fontWeight:500,cursor:'pointer', backgroundColor:'var(--color-surface)',color:'var(--color-text-secondary)',border:'1px solid var(--color-border)',fontFamily:'inherit'}}>
            {expanded?<><ChevronUp size={14}/>收起</>:<><ChevronDown size={14}/>查看全部 ({others.length})</>}
          </motion.button>
        </div>
      )}
    </motion.section>
  )
}

/* ================================================================
   LogDetailModal — 点赞与评论嵌套
   ================================================================ */
function LogDetailModal({ log, currentUserId, onClose }) {
  const [likes, setLikes] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [replyTo, setReplyTo] = useState(null) // { id, nickname, user_id }
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    getLogInteractions(log.id, currentUserId).then(data => {
      setLikes(data.likeCount)
      setIsLiked(data.isLiked)
      setComments(data.comments)
      setLoading(false)
    })
    return () => { document.body.style.overflow = 'auto' }
  }, [log.id, currentUserId])

  const handleLike = async () => {
    const next = !isLiked
    setIsLiked(next)
    setLikes(p => next ? p + 1 : Math.max(0, p - 1))
    await toggleLike(currentUserId, log.id, log.user_id)
  }

  const handleComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return
    const content = newComment.trim()
    const parentId = replyTo ? replyTo.id : null
    const parentUserId = replyTo ? replyTo.user_id : null
    setNewComment('')
    setReplyTo(null)
    
    const c = await addComment(currentUserId, log.id, content, log.user_id, parentId, parentUserId)
    if (c) setComments(p => [...p, c])
  }

  const hue = [...(log.users?.nickname||'匿名')].reduce((a,c)=>a+c.charCodeAt(0),0) % 360

  return (
    <div style={{ position:'fixed', inset:0, zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.2}} onClick={onClose}
        style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)' }} />
      <motion.div layoutId={`card-${log.id}`} transition={{type:'spring', stiffness:300, damping:30}}
        style={{ position:'relative', zIndex:101, width:'100%', maxWidth:'520px', maxHeight:'85vh', display:'flex', flexDirection:'column', background:'var(--color-surface)', borderRadius:'24px', boxShadow:'0 24px 48px rgba(0,0,0,0.15)', overflow:'hidden' }}>
        
        {/* Header */}
        <div style={{ padding:'24px 24px 16px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
            <div style={{width:'40px', height:'40px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', fontWeight:700, color:'#fff', background:`hsl(${hue},65%,55%)`}}>
              {(log.users?.nickname||'匿名').charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{fontSize:'15px', fontWeight:600, color:'var(--color-text)'}}>{log.users?.nickname||'匿名'}</div>
              <div style={{fontSize:'12px', color:'var(--color-text-tertiary)'}}>{new Date(log.log_date).toLocaleDateString()}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'var(--color-bg)', border:'none', width:'32px', height:'32px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--color-text-secondary)', transition:'background 0.2s' }} onMouseEnter={e=>e.currentTarget.style.background='var(--color-border-light)'} onMouseLeave={e=>e.currentTarget.style.background='var(--color-bg)'}><X size={18} /></button>
        </div>

        {/* Scrollable Content */}
        <div style={{ padding:'0 24px', overflowY:'auto', flex:1 }}>
          <h3 style={{ fontSize:'22px', fontWeight:700, fontFamily:'var(--font-serif)', color:'var(--color-text)', marginBottom:'8px' }}>《{log.title}》</h3>
          {log.author && <p style={{ fontSize:'14px', color:'var(--color-text-secondary)', marginBottom:'20px' }}>作者：{log.author}</p>}
          
          {log.takeaway && (
            <div style={{ padding:'20px', background:'var(--color-bg)', borderRadius:'16px', marginBottom:'24px', border:'1px solid var(--color-border-light)' }}>
              <Quote size={20} style={{ color:'var(--color-accent)', marginBottom:'8px', opacity:0.5 }}/>
              <p style={{ fontSize:'15px', lineHeight:1.7, fontStyle:'italic', color:'var(--color-text)' }}>{log.takeaway}</p>
            </div>
          )}

          {/* Actions Bar */}
          <div style={{ display:'flex', alignItems:'center', gap:'24px', paddingBottom:'20px', borderBottom:'1px solid var(--color-border-light)', marginBottom:'20px' }}>
            <motion.button whileTap={{scale:0.8}} onClick={handleLike} style={{ display:'flex', alignItems:'center', gap:'6px', background:'none', border:'none', cursor:'pointer', padding:0, color: isLiked ? '#ef4444' : 'var(--color-text-tertiary)' }}>
              <Heart fill={isLiked ? '#ef4444' : 'none'} size={22} />
              <span style={{ fontSize:'15px', fontWeight:500 }}>{likes > 0 ? likes : '赞'}</span>
            </motion.button>
            <div style={{ display:'flex', alignItems:'center', gap:'6px', color:'var(--color-text-tertiary)' }}>
              <MessageSquare size={22} />
              <span style={{ fontSize:'15px', fontWeight:500 }}>{comments.length > 0 ? comments.length : '评论'}</span>
            </div>
          </div>

          {/* Comments List */}
          <div style={{ paddingBottom:'24px' }}>
            {loading ? (
              <p style={{ fontSize:'13px', color:'var(--color-text-tertiary)', textAlign:'center', padding:'20px 0' }}>加载中...</p>
            ) : comments.length === 0 ? (
              <p style={{ fontSize:'13px', color:'var(--color-text-tertiary)', textAlign:'center', padding:'20px 0' }}>还没有评论，快来说两句吧</p>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
                {comments.map(c => {
                   const cHue = [...(c.users?.nickname||'A')].reduce((a,x)=>a+x.charCodeAt(0),0)%360
                   // 查找父评论的昵称（如果是回复）
                   const parentComment = c.parent_id ? comments.find(x => x.id === c.parent_id) : null
                   
                   return (
                    <div key={c.id} style={{ display:'flex', gap:'12px', paddingLeft: c.parent_id ? '24px' : '0', position:'relative' }}>
                      {c.parent_id && <div style={{ position:'absolute', left:'11px', top:'-20px', bottom:'15px', width:'2px', background:'var(--color-border-light)' }} />}
                      <div style={{width:'28px', height:'28px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:700, color:'#fff', background:`hsl(${cHue},65%,55%)`, flexShrink:0, zIndex:2}}>
                        {(c.users?.nickname||'A').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'baseline', gap:'8px', marginBottom:'4px' }}>
                          <span style={{ fontSize:'13px', fontWeight:600, color:'var(--color-text)' }}>{c.users?.nickname||'匿名'}</span>
                          {parentComment && <span style={{ fontSize:'12px', color:'var(--color-text-tertiary)' }}>回复 @{parentComment.users?.nickname}</span>}
                          <span style={{ fontSize:'11px', color:'var(--color-text-tertiary)', marginLeft:'auto' }}>{new Date(c.created_at).toLocaleString()}</span>
                        </div>
                        <p style={{ fontSize:'14px', color:'var(--color-text-secondary)', lineHeight:1.5, marginBottom:'6px' }}>{c.content}</p>
                        <button onClick={()=>setReplyTo({id: c.id, nickname: c.users?.nickname, user_id: c.user_id})} style={{ background:'none', border:'none', fontSize:'12px', color:'var(--color-accent)', cursor:'pointer', padding:0, display:'flex', alignItems:'center', gap:'4px' }}>
                          <Reply size={12}/> 回复
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Comment Input */}
        <form onSubmit={handleComment} style={{ padding:'16px 24px', background:'var(--color-bg)', borderTop:'1px solid var(--color-border-light)', display:'flex', flexDirection:'column', gap:'8px' }}>
          {replyTo && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', fontSize:'12px', color:'var(--color-accent)', padding:'0 8px' }}>
              <span>正在回复 @{replyTo.nickname}</span>
              <button type="button" onClick={()=>setReplyTo(null)} style={{ background:'none', border:'none', color:'var(--color-text-tertiary)', cursor:'pointer' }}><X size={14}/></button>
            </div>
          )}
          <div style={{ display:'flex', gap:'12px', alignItems:'center' }}>
            <input type="text" value={newComment} onChange={e=>setNewComment(e.target.value)} placeholder={replyTo ? `回复 @${replyTo.nickname}...` : "写下你的评论..."} maxLength={200}
              style={{ flex:1, padding:'12px 16px', borderRadius:'24px', border:'1px solid var(--color-border)', outline:'none', fontSize:'14px', background:'var(--color-surface)', transition:'border-color 0.2s' }} onFocus={e=>e.target.style.borderColor='var(--color-accent)'} onBlur={e=>e.target.style.borderColor='var(--color-border)'}
            />
            <button type="submit" disabled={!newComment.trim()} style={{ width:'40px', height:'40px', borderRadius:'50%', background:'var(--color-accent)', color:'#fff', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor: newComment.trim()?'pointer':'not-allowed', opacity: newComment.trim()?1:0.5, transition:'transform 0.1s' }} onMouseDown={e=>newComment.trim()&&(e.currentTarget.style.transform='scale(0.9)')} onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}>
              <Send size={18} />
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

function Footer() {
  return <footer style={{textAlign:'center',padding:'32px 0',fontSize:'12px',color:'var(--color-text-tertiary)'}}>Made with 📖 · 一日一书</footer>
}

/* ================================================================
   App Root
   ================================================================ */
export default function App() {
  const [user, setUser] = useState(()=>{
    try { return JSON.parse(localStorage.getItem(USER_KEY)) } catch { return null }
  })
  const [myRecords, setMyRecords] = useState([])
  const [todayRecord, setTodayRecord] = useState(null)
  const [feed, setFeed] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [selectedLog, setSelectedLog] = useState(null)

  const todayDate = new Date().toISOString().slice(0,10)

  const refreshData = useCallback(async()=>{
    if (!user) return
    setLoading(true)
    const [records, today, publicFeed, notifs] = await Promise.all([
      getMyRecords(user.id), getMyTodayRecord(user.id), getPublicFeed(50), getNotifications(user.id)
    ])
    setMyRecords(records)
    setTodayRecord(today)
    setFeed(publicFeed)
    setNotifications(notifs)
    setLoading(false)
  },[user])

  useEffect(()=>{ refreshData() },[refreshData])

  const streak = useMemo(()=>calcStreakFromLogs(myRecords),[myRecords])

  const handleLogin = (u)=>setUser(u)
  const handleLogout = ()=>{ localStorage.removeItem(USER_KEY); setUser(null) }

  const handleSubmit = useCallback(async({title,author,takeaway})=>{
    if (!user) return
    setSubmitting(true)
    await submitLog(user.id,{title,author,takeaway})
    await refreshData()
    setSubmitting(false)
  },[user,refreshData])

  const handleDelete = useCallback(async()=>{
    if (!todayRecord) return
    await deleteLog(todayRecord.id)
    await refreshData()
  },[todayRecord,refreshData])

  const handleReadInbox = async () => {
    const unread = notifications.some(n => !n.is_read)
    if (unread) {
      await markNotificationsAsRead(user.id)
      setNotifications(prev => prev.map(n => ({...n, is_read: true})))
    }
  }

  if (!user) return <NicknameGate onLogin={handleLogin}/>

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <motion.div animate={{rotate:360}} transition={{repeat:Infinity,duration:1,ease:'linear'}} style={{width:'32px',height:'32px',border:'3px solid var(--color-border)',borderTopColor:'var(--color-accent)',borderRadius:'50%'}}/>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',padding:'clamp(40px,5vw,64px) 16px'}}>
      <HeroSection streak={streak} nickname={user.nickname} onLogout={handleLogout} notifications={notifications} onReadInbox={handleReadInbox} />
      <TodayCard todayRecord={todayRecord} onSubmit={handleSubmit} onDelete={handleDelete} submitting={submitting}/>
      <HistoryGrid records={myRecords} todayDate={todayDate} onLogClick={setSelectedLog} currentUser={user} />
      <PublicFeed feed={feed} currentUserId={user.id} onLogClick={setSelectedLog}/>
      <Footer/>

      <AnimatePresence>
        {selectedLog && (
          <LogDetailModal 
            log={selectedLog} 
            currentUserId={user.id} 
            onClose={() => setSelectedLog(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  )
}
