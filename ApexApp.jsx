// ============================================================
// APEX HOMES DXB — KPI LEADERBOARD
// Single-file React app — Supabase + React Router
// ============================================================
import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'

// ── Supabase client ──────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || '1234'

// ── Coin rules ───────────────────────────────────────────────
function calcCoins(kpi = {}) {
  return {
    comm:       Math.round((kpi.commission_aed || 0) * 0.01),
    deals:      (kpi.deals || 0)          * 50,
    excl:       (kpi.exclusives || 0)     * 10,
    great:      (kpi.great_listings || 0) * 15,
    good:       (kpi.good_listings || 0)  * 10,
    bayut:      (kpi.bayut_stories || 0)  * 5,
    reviews:    (kpi.reviews || 0)        * 50,
    truBroker:  kpi.trubest     ? 50 : 0,
    superAgent: kpi.super_agent ? 50 : 0,
  }
}

function enrichAgents(agents, kpisMap = {}) {
  const withCoins = agents.map(a => {
    const kpi   = kpisMap[a.id] || {}
    const coins = calcCoins(kpi)
    const base  = Object.values(coins).reduce((s, v) => s + v, 0)
    return { ...a, kpi, coins, base, commAed: kpi.commission_aed || 0 }
  })

  const div1 = [...withCoins].filter(a => ['Associate Consultant','Property Consultant'].includes(a.role)).sort((a,b) => b.commAed - a.commAed)
  const div2 = [...withCoins].filter(a => ['Senior Consultant','Team Leader'].includes(a.role)).sort((a,b) => b.commAed - a.commAed)

  const bonusMap = {}, d1Rank = {}, d2Rank = {}
  div1.forEach((a,i) => { d1Rank[a.id] = i+1; bonusMap[a.id] = i < 3 ? Math.round(a.commAed * 0.01) : 0 })
  div2.forEach((a,i) => { d2Rank[a.id] = i+1; bonusMap[a.id] = i < 3 ? Math.round(a.commAed * 0.01) : 0 })

  return withCoins.map(a => ({
    ...a,
    bonus:    bonusMap[a.id] || 0,
    div1Rank: d1Rank[a.id]  || null,
    div2Rank: d2Rank[a.id]  || null,
    total:    a.base + (bonusMap[a.id] || 0),
  })).sort((a,b) => b.total - a.total)
}

// ── Formatters ───────────────────────────────────────────────
const fmt    = n => Number(n||0).toLocaleString()
const fmtAed = n => 'AED ' + Number(n||0).toLocaleString()
const fmtMonth = ym => { if(!ym) return ''; const [y,m]=ym.split('-'); return new Date(y,m-1,1).toLocaleString('en-GB',{month:'long',year:'numeric'}) }
const curMonth = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` }
function monthOptions() {
  const opts=[]; const d=new Date()
  for(let i=0;i<7;i++){
    const v=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    opts.push({value:v,label:fmtMonth(v)}); d.setMonth(d.getMonth()-1)
  }
  return opts
}

// ── Rewards data ─────────────────────────────────────────────
const REWARDS = [
  {name:'Gift Card',            cat:'Cash & Gift Cards',cls:'rc-cash',coins:250},
  {name:'AED 500 Cash Bonus',   cat:'Cash & Gift Cards',cls:'rc-cash',coins:500},
  {name:'Fine Dining for Two',  cat:'Experiences',      cls:'rc-exp', coins:500},
  {name:'Spa Day Voucher',      cat:'Experiences',      cls:'rc-exp', coins:750},
  {name:'AED 1,000 Cash Bonus', cat:'Cash & Gift Cards',cls:'rc-cash',coins:1000},
  {name:'Extra Day Off',        cat:'Work Perks',       cls:'rc-perk',coins:1000},
  {name:'Prime Parking 1 Month',cat:'Work Perks',       cls:'rc-perk',coins:500},
  {name:'Work From Home Day',   cat:'Work Perks',       cls:'rc-perk',coins:300},
  {name:'AirPods / Earbuds',    cat:'Tech',             cls:'rc-tech',coins:1500},
  {name:'Weekend Staycation',   cat:'Experiences',      cls:'rc-exp', coins:3000},
  {name:'Apple Watch',          cat:'Tech',             cls:'rc-tech',coins:2500},
  {name:'AED 2,500 Cash Bonus', cat:'Cash & Gift Cards',cls:'rc-cash',coins:2500},
  {name:'iPhone / Smartphone',  cat:'Tech',             cls:'rc-tech',coins:5000},
  {name:'Weekend Trip',         cat:'Experiences',      cls:'rc-exp', coins:7500},
  {name:'MacBook / Laptop',     cat:'Tech',             cls:'rc-tech',coins:10000},
]

// ── Empty KPI row ─────────────────────────────────────────────
const emptyKpi = () => ({commission_aed:0,deals:0,exclusives:0,great_listings:0,good_listings:0,bayut_stories:0,reviews:0,trubest:false,super_agent:false})

// ============================================================
// LEADERBOARD PAGE
// ============================================================
function Leaderboard() {
  const [agents,   setAgents]   = useState([])
  const [tab,      setTab]      = useState('overall')
  const [month,    setMonth]    = useState(curMonth())
  const [selected, setSelected] = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [updated,  setUpdated]  = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: ag }, { data: kp }] = await Promise.all([
        supabase.from('agents').select('*').eq('active',true).order('name'),
        supabase.from('monthly_kpis').select('*').eq('month',month),
      ])
      const map = {}; (kp||[]).forEach(k => { map[k.agent_id]=k })
      setAgents(enrichAgents(ag||[], map))
      setUpdated(new Date())
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }, [month])

  useEffect(() => { load() }, [load])
  useEffect(() => { const id=setInterval(load,300000); return ()=>clearInterval(id) }, [load])

  const list = tab==='div1' ? agents.filter(a=>a.division==='Division 1')
             : tab==='div2' ? agents.filter(a=>a.division==='Division 2')
             : agents

  return (
    <div style={{minHeight:'100vh',background:'#050505',color:'#f0f0f0',fontFamily:'var(--sans)'}}>
      {/* Header */}
      <header style={{background:'#000',padding:'20px 44px',display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'1px solid rgba(255,255,255,.11)'}}>
        <div style={{display:'flex',alignItems:'center',gap:'22px'}}>
          <img src="/apex-logo.png" alt="Apex" style={{height:'58px'}} onError={e=>e.target.style.display='none'}/>
          <div style={{width:'1px',height:'38px',background:'rgba(255,255,255,.11)'}}/>
          <div>
            <div style={{fontFamily:'var(--serif)',fontSize:'19px',fontWeight:600,letterSpacing:'2.5px',textTransform:'uppercase'}}>Apex Homes DXB</div>
            <div style={{fontFamily:'var(--serif)',fontSize:'10px',letterSpacing:'4px',textTransform:'uppercase',color:'rgba(240,240,240,.25)'}}>Incentive Leaderboard</div>
          </div>
        </div>
        <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'5px'}}>
          <div style={{fontSize:'9px',fontWeight:700,letterSpacing:'2.5px',textTransform:'uppercase',color:'#C8A96E',border:'1px solid rgba(200,169,110,.25)',borderRadius:'2px',padding:'5px 14px',background:'rgba(200,169,110,.1)'}}>{fmtMonth(month)}</div>
          <div style={{fontSize:'9px',color:'rgba(240,240,240,.25)',letterSpacing:'.4px'}}>{updated?'Updated '+updated.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):'Loading…'}</div>
        </div>
      </header>

      {/* Rule banner */}
      <div style={{background:'#000',borderBottom:'1px solid rgba(255,255,255,.055)',display:'flex',alignItems:'center',justifyContent:'center',gap:'16px',padding:'9px 20px',flexWrap:'wrap'}}>
        <span style={{background:'rgba(200,169,110,.1)',color:'#C8A96E',border:'1px solid rgba(200,169,110,.25)',borderRadius:'2px',padding:'2px 11px',fontSize:'8.5px',fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase'}}>Coin Rules</span>
        <span style={{fontSize:'9px',fontWeight:600,letterSpacing:'1.5px',textTransform:'uppercase',color:'rgba(240,240,240,.25)'}}>·</span>
        <span style={{fontSize:'9px',fontWeight:600,letterSpacing:'1.5px',textTransform:'uppercase',color:'rgba(240,240,240,.5)'}}><strong style={{color:'#C8A96E'}}>1%</strong> of all commission billed</span>
        <span style={{fontSize:'9px',color:'rgba(255,255,255,.11)'}}>·</span>
        <span style={{fontSize:'9px',fontWeight:600,letterSpacing:'1.5px',textTransform:'uppercase',color:'rgba(240,240,240,.5)'}}>Extra <strong style={{color:'#C8A96E'}}>1%</strong> for Top 3 per Division</span>
        <span style={{fontSize:'9px',color:'rgba(255,255,255,.11)'}}>·</span>
        <span style={{fontSize:'9px',fontWeight:600,letterSpacing:'1.5px',textTransform:'uppercase',color:'rgba(240,240,240,.5)'}}><strong style={{color:'#C8A96E'}}>1 Coin = AED 1</strong></span>
      </div>

      {/* Tabs */}
      <nav style={{display:'flex',alignItems:'center',background:'#000',padding:'0 40px',borderBottom:'1px solid rgba(255,255,255,.11)',overflowX:'auto'}}>
        {[['overall','Overall'],['div1','Division I'],['div2','Division II'],['rewards','Rewards Store']].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{padding:'15px 22px',background:'none',border:'none',borderBottom:tab===t?'2px solid #C8A96E':'2px solid transparent',color:tab===t?'#f0f0f0':'rgba(240,240,240,.25)',fontFamily:'var(--sans)',fontSize:'9.5px',fontWeight:700,letterSpacing:'2.5px',textTransform:'uppercase',cursor:'pointer',whiteSpace:'nowrap'}}>{l}</button>
        ))}
        <div style={{flex:1}}/>
        <Link to="/admin" style={{color:'rgba(240,240,240,.25)',fontSize:'9px',fontWeight:700,letterSpacing:'2px',textTransform:'uppercase',textDecoration:'none',border:'1px solid rgba(255,255,255,.11)',padding:'6px 14px',borderRadius:'2px',margin:'10px 0 10px 6px'}}>Admin ↗</Link>
      </nav>

      {/* Content */}
      <main style={{maxWidth:'1160px',margin:'0 auto',padding:'36px 24px'}}>
        {tab==='rewards' ? <RewardsStore/> : loading ? (
          <div style={{textAlign:'center',padding:'80px',color:'rgba(240,240,240,.25)'}}>
            <div style={{fontFamily:'var(--serif)',fontSize:'20px',marginBottom:'8px'}}>Loading…</div>
          </div>
        ) : list.length===0 ? (
          <div style={{textAlign:'center',padding:'80px',color:'rgba(240,240,240,.25)'}}>
            <div style={{fontFamily:'var(--serif)',fontSize:'20px',marginBottom:'8px'}}>No data yet</div>
            <div>Visit <Link to="/admin" style={{color:'#C8A96E'}}>Admin</Link> to enter this month's KPIs</div>
          </div>
        ) : (<>
          <StatsRow agents={list}/>
          <Podium agents={list} onSelect={setSelected}/>
          <AgentTable agents={list} onSelect={setSelected}/>
        </>)}
      </main>

      {selected && <AgentModal agent={selected} onClose={()=>setSelected(null)}/>}
    </div>
  )
}

// ── Stats row ────────────────────────────────────────────────
function StatsRow({agents}) {
  const total  = agents.reduce((s,a)=>s+a.total,0)
  const leader = agents[0]
  const avg    = agents.length ? Math.round(total/agents.length) : 0
  const card   = (lbl,val,note) => (
    <div style={{background:'#0d0d0d',border:'1px solid rgba(255,255,255,.055)',borderRadius:'2px',padding:'18px 20px'}}>
      <div style={{fontSize:'7.5px',fontWeight:700,letterSpacing:'2.5px',textTransform:'uppercase',color:'rgba(240,240,240,.25)',marginBottom:'8px'}}>{lbl}</div>
      <div style={{fontFamily:'var(--serif)',fontSize:'26px',fontWeight:600,lineHeight:1}}>{val}</div>
      <div style={{fontSize:'9px',color:'rgba(240,240,240,.25)',marginTop:'5px'}}>{note}</div>
    </div>
  )
  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'10px',marginBottom:'32px'}}>
      {card('Participants', agents.length, 'Active agents this month')}
      {card('Leader', leader?leader.name.split(' ')[0]:'—', leader?fmt(leader.total)+' coins':'')}
      {card('Avg Score', fmt(avg), 'Coins per agent')}
      {card('Total Issued', fmt(total), '= '+fmtAed(total))}
    </div>
  )
}

// ── Podium ───────────────────────────────────────────────────
function Podium({agents, onSelect}) {
  const top3  = agents.slice(0,3)
  const order = [1,0,2]
  const divBadge = a => ({background:a.division==='Division 1'?'rgba(144,189,255,.10)':'rgba(200,169,110,.10)',color:a.division==='Division 1'?'#90BDFF':'#C8A96E',border:`1px solid ${a.division==='Division 1'?'rgba(144,189,255,.22)':'rgba(200,169,110,.25)'}`,borderRadius:'2px',padding:'2px 9px',fontSize:'7.5px',fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',display:'inline-block',marginTop:'10px'})
  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px',marginBottom:'32px'}}>
      {[0,1,2].map(pos=>{
        const agent=top3[order[pos]]
        if(!agent) return <div key={pos}/>
        const rank=order[pos]+1
        return (
          <div key={agent.id} onClick={()=>onSelect(agent)} style={{background:'#0d0d0d',border:`1px solid rgba(255,255,255,.055)`,borderTop:rank===1?'2px solid #C8A96E':'1px solid rgba(255,255,255,.055)',borderRadius:'2px',padding:'24px 20px',textAlign:'center',position:'relative',overflow:'hidden',cursor:'pointer'}}>
            <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',fontFamily:'var(--serif)',fontSize:'120px',fontWeight:700,color:'rgba(255,255,255,.018)',pointerEvents:'none',userSelect:'none',lineHeight:1}}>{rank}</div>
            <div style={{fontSize:'8px',fontWeight:700,letterSpacing:'2.5px',textTransform:'uppercase',color:rank===1?'#C8A96E':'rgba(240,240,240,.25)',marginBottom:'12px'}}>{rank===1?'First Place':rank===2?'Second Place':'Third Place'}</div>
            <div style={{fontFamily:'var(--serif)',fontSize:'17px',fontWeight:600,letterSpacing:'.5px',marginBottom:'4px'}}>{agent.name}</div>
            <div style={{fontSize:'8px',letterSpacing:'1.5px',textTransform:'uppercase',color:'rgba(240,240,240,.25)',marginBottom:'16px'}}>{agent.role}</div>
            <div style={{fontFamily:'var(--serif)',fontSize:'28px',fontWeight:600,color:'#C8A96E',lineHeight:1}}>{fmt(agent.total)}</div>
            <div style={{fontSize:'8px',letterSpacing:'1.5px',textTransform:'uppercase',color:'rgba(240,240,240,.25)',marginTop:'4px'}}>Coins · {fmtAed(agent.total)}</div>
            <div style={divBadge(agent)}>{agent.division}</div>
          </div>
        )
      })}
    </div>
  )
}

// ── Agent table ───────────────────────────────────────────────
function AgentTable({agents, onSelect}) {
  const divPill = a => ({background:a.division==='Division 1'?'rgba(144,189,255,.10)':'rgba(200,169,110,.10)',color:a.division==='Division 1'?'#90BDFF':'#C8A96E',border:`1px solid ${a.division==='Division 1'?'rgba(144,189,255,.22)':'rgba(200,169,110,.25)'}`,borderRadius:'2px',padding:'2px 7px',fontSize:'7px',fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',display:'inline-block'})
  return (
    <div style={{background:'#0d0d0d',border:'1px solid rgba(255,255,255,.055)',borderRadius:'2px',overflow:'hidden'}}>
      <table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead>
          <tr>
            {['#','Agent','Division','Total Coins','Commission','Badges'].map((h,i)=>(
              <th key={h} style={{background:'#0a0a0a',fontSize:'7.5px',fontWeight:700,letterSpacing:'2px',textTransform:'uppercase',color:'rgba(240,240,240,.25)',padding:'12px 14px',textAlign:i>1?'right':'left'}}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {agents.map((a,i)=>(
            <tr key={a.id} onClick={()=>onSelect(a)} style={{cursor:'pointer'}} onMouseEnter={e=>e.currentTarget.style.background='#1a1a1a'} onMouseLeave={e=>e.currentTarget.style.background=''}>
              <td style={{padding:'13px 14px',borderTop:'1px solid rgba(255,255,255,.055)'}}><span style={{fontFamily:'var(--serif)',fontSize:'15px',fontWeight:600,color:i<3?'#C8A96E':'rgba(240,240,240,.25)'}}>{i+1}</span></td>
              <td style={{padding:'13px 14px',borderTop:'1px solid rgba(255,255,255,.055)'}}>
                <div style={{fontSize:'12px',fontWeight:600}}>{a.name}</div>
                <div style={{fontSize:'9px',color:'rgba(240,240,240,.25)',marginTop:'1px'}}>{a.role}</div>
              </td>
              <td style={{padding:'13px 14px',borderTop:'1px solid rgba(255,255,255,.055)',textAlign:'right'}}><span style={divPill(a)}>{a.division==='Division 1'?'Div I':'Div II'}</span></td>
              <td style={{padding:'13px 14px',borderTop:'1px solid rgba(255,255,255,.055)',textAlign:'right'}}><span style={{fontFamily:'var(--serif)',fontSize:'16px',fontWeight:600,color:'#C8A96E'}}>{fmt(a.total)}</span></td>
              <td style={{padding:'13px 14px',borderTop:'1px solid rgba(255,255,255,.055)',textAlign:'right'}}>
                <div style={{fontSize:'11px',color:'rgba(240,240,240,.5)'}}>{fmt(a.coins.comm)} base</div>
                {a.bonus>0 && <div style={{fontSize:'9px',color:'#C8A96E'}}>+{fmt(a.bonus)} bonus</div>}
              </td>
              <td style={{padding:'13px 14px',borderTop:'1px solid rgba(255,255,255,.055)'}}>
                <div style={{display:'flex',flexWrap:'wrap',gap:'4px',justifyContent:'flex-end'}}>
                  {a.kpi.deals>0       && <Tag c="rgba(99,102,241,.08)"  tc="#818CF8" bc="rgba(99,102,241,.2)">{a.kpi.deals} deal{a.kpi.deals>1?'s':''}</Tag>}
                  {a.kpi.reviews>0     && <Tag c="rgba(34,197,94,.08)"   tc="#4ADE80" bc="rgba(34,197,94,.2)">{a.kpi.reviews} review{a.kpi.reviews>1?'s':''}</Tag>}
                  {(a.kpi.great_listings>0||a.kpi.good_listings>0) && <Tag c="rgba(251,146,60,.08)" tc="#FB923C" bc="rgba(251,146,60,.2)">{a.kpi.great_listings>0?`${a.kpi.great_listings} great`:''}{a.kpi.great_listings>0&&a.kpi.good_listings>0?' · ':''}{a.kpi.good_listings>0?`${a.kpi.good_listings} good`:''}</Tag>}
                  {a.kpi.trubest      && <Tag c="rgba(200,169,110,.1)"  tc="#C8A96E" bc="rgba(200,169,110,.25)">TruBroker</Tag>}
                  {a.kpi.super_agent  && <Tag c="rgba(168,85,247,.08)"  tc="#C084FC" bc="rgba(168,85,247,.2)">Super Agent</Tag>}
                  {a.bonus>0          && <Tag c="rgba(200,169,110,.15)" tc="#DFC08A" bc="rgba(200,169,110,.25)">Top 3 Bonus</Tag>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Tag({c,tc,bc,children}) {
  return <span style={{background:c,color:tc,border:`1px solid ${bc}`,borderRadius:'2px',fontSize:'7.5px',fontWeight:600,letterSpacing:'.5px',textTransform:'uppercase',padding:'2px 6px'}}>{children}</span>
}

// ── Agent modal ───────────────────────────────────────────────
function AgentModal({agent, onClose}) {
  const {coins,kpi,bonus} = agent
  const row = (k,v) => (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:'1px solid rgba(255,255,255,.055)'}}>
      <span style={{fontSize:'10px',color:'rgba(240,240,240,.5)'}}>{k}</span>
      <span style={{fontFamily:'var(--serif)',fontSize:'14px',fontWeight:600}}>{v}</span>
    </div>
  )
  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'20px'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'#0d0d0d',border:'1px solid rgba(255,255,255,.11)',borderRadius:'2px',width:'100%',maxWidth:'520px',maxHeight:'90vh',overflowY:'auto'}}>
        <div style={{padding:'24px 28px 16px',borderBottom:'1px solid rgba(255,255,255,.055)'}}>
          <button onClick={onClose} style={{float:'right',background:'none',border:'none',color:'rgba(240,240,240,.25)',fontSize:'20px',cursor:'pointer',lineHeight:1}}>×</button>
          <div style={{fontFamily:'var(--serif)',fontSize:'22px',fontWeight:600,marginBottom:'3px'}}>{agent.name}</div>
          <div style={{fontSize:'9px',letterSpacing:'1.5px',textTransform:'uppercase',color:'rgba(240,240,240,.25)'}}>{agent.role} · {agent.division}</div>
        </div>
        <div style={{padding:'20px 28px 28px'}}>
          {[['Commission',  [{k:'Billed',v:fmtAed(kpi.commission_aed)},{k:'Base coins (1%)',v:fmt(coins.comm)},...(bonus>0?[{k:'Top 3 bonus (+1%)',v:'+'+fmt(bonus),gold:true}]:[])]],
            ['Sales Activity', [{k:'Deals closed',v:`${kpi.deals||0} × 50 = ${fmt(coins.deals)}`},{k:'Exclusive listings',v:`${kpi.exclusives||0} × 10 = ${fmt(coins.excl)}`}]],
            ['Listing Quality', [{k:'Great listings',v:`${kpi.great_listings||0} × 15 = ${fmt(coins.great)}`},{k:'Good listings',v:`${kpi.good_listings||0} × 10 = ${fmt(coins.good)}`}]],
            ['Digital Presence', [{k:'Bayut Stories',v:`${kpi.bayut_stories||0} × 5 = ${fmt(coins.bayut)}`},{k:'Google reviews',v:`${kpi.reviews||0} × 50 = ${fmt(coins.reviews)}`}]],
            ['Status Badges', [{k:'TruBroker',v:kpi.trubest?'✓  50':'—'},{k:'Super Agent',v:kpi.super_agent?'✓  50':'—'}]],
          ].map(([section,rows])=>(
            <div key={section} style={{marginBottom:'20px'}}>
              <div style={{fontSize:'7.5px',fontWeight:700,letterSpacing:'2.5px',textTransform:'uppercase',color:'rgba(240,240,240,.25)',marginBottom:'10px'}}>{section}</div>
              {rows.map(({k,v,gold})=>(
                <div key={k} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:'1px solid rgba(255,255,255,.055)'}}>
                  <span style={{fontSize:'10px',color:gold?'#C8A96E':'rgba(240,240,240,.5)'}}>{k}</span>
                  <span style={{fontFamily:'var(--serif)',fontSize:'14px',fontWeight:600,color:gold?'#C8A96E':'#f0f0f0'}}>{v}</span>
                </div>
              ))}
            </div>
          ))}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 16px',background:'rgba(200,169,110,.1)',border:'1px solid rgba(200,169,110,.25)',borderRadius:'2px',marginTop:'12px'}}>
            <span style={{fontSize:'9px',fontWeight:700,letterSpacing:'2px',textTransform:'uppercase',color:'#C8A96E'}}>Total Coins</span>
            <span style={{fontFamily:'var(--serif)',fontSize:'28px',fontWeight:700,color:'#C8A96E'}}>{fmt(agent.total)}</span>
          </div>
          <div style={{textAlign:'right',fontSize:'10px',color:'rgba(240,240,240,.25)',marginTop:'6px'}}>= {fmtAed(agent.total)}</div>
        </div>
      </div>
    </div>
  )
}

// ── Rewards store ─────────────────────────────────────────────
function RewardsStore() {
  const catColor = {'Cash & Gift Cards':'#4ADE80','Experiences':'#818CF8','Work Perks':'#90BDFF','Tech':'#FB923C'}
  return (
    <div>
      <p style={{fontSize:'11px',color:'rgba(240,240,240,.5)',lineHeight:'1.7',marginBottom:'20px'}}>Your coins have real value — <strong style={{color:'#C8A96E'}}>1 Coin = AED 1</strong>. Redeem anytime by speaking to your manager. Claims processed within 5 working days.</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'10px'}}>
        {REWARDS.map(r=>(
          <div key={r.name} style={{background:'#0d0d0d',border:'1px solid rgba(255,255,255,.055)',borderRadius:'2px',padding:'18px 16px',display:'flex',flexDirection:'column',gap:'6px'}}>
            <div style={{fontSize:'7.5px',fontWeight:700,letterSpacing:'2px',textTransform:'uppercase',color:catColor[r.cat]}}>{r.cat}</div>
            <div style={{fontSize:'13px',fontWeight:600}}>{r.name}</div>
            <div style={{fontFamily:'var(--serif)',fontSize:'20px',fontWeight:600,color:'#C8A96E'}}>{fmt(r.coins)} coins</div>
            <div style={{fontSize:'9px',color:'rgba(240,240,240,.25)'}}>{fmtAed(r.coins)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// ADMIN PAGE
// ============================================================
function Admin() {
  const [authed,  setAuthed]  = useState(false)
  const [pin,     setPin]     = useState('')
  const [pinErr,  setPinErr]  = useState('')
  const [agents,  setAgents]  = useState([])
  const [month,   setMonth]   = useState(curMonth())
  const [kpis,    setKpis]    = useState({})
  const [saving,  setSaving]  = useState(false)
  const [status,  setStatus]  = useState(null)

  useEffect(()=>{
    if(!authed) return
    supabase.from('agents').select('*').eq('active',true).order('division').order('name')
      .then(({data})=>setAgents(data||[]))
  },[authed])

  const loadKpis = useCallback(async()=>{
    if(!authed||!agents.length) return
    const {data}=await supabase.from('monthly_kpis').select('*').eq('month',month)
    const map={}; agents.forEach(a=>{map[a.id]=emptyKpi()});
    (data||[]).forEach(k=>{map[k.agent_id]={...emptyKpi(),...k}})
    setKpis(map)
  },[authed,agents,month])

  useEffect(()=>{loadKpis()},[loadKpis])

  function handlePin(e){
    e.preventDefault()
    if(pin===ADMIN_PIN){setAuthed(true);setPinErr('')}
    else setPinErr('Incorrect PIN')
  }

  function update(agentId,field,value){
    setKpis(p=>({...p,[agentId]:{...(p[agentId]||emptyKpi()),[field]:value}}))
    setStatus(null)
  }

  async function saveAll(){
    setSaving(true); setStatus(null)
    try {
      const rows=agents.map(a=>({agent_id:a.id,month,...(kpis[a.id]||emptyKpi())}))
        .map(({id,updated_at,...r})=>r)
      const {error}=await supabase.from('monthly_kpis').upsert(rows,{onConflict:'agent_id,month'})
      if(error) throw error
      setStatus('ok')
    } catch(e){ console.error(e); setStatus('err') }
    finally { setSaving(false) }
  }

  if(!authed) return (
    <div style={{minHeight:'100vh',background:'#050505',display:'flex',flexDirection:'column'}}>
      <header style={{background:'#000',padding:'18px 44px',display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'1px solid rgba(255,255,255,.11)'}}>
        <div style={{fontFamily:'var(--serif)',fontSize:'22px',fontWeight:600,letterSpacing:'1.5px',textTransform:'uppercase'}}>Admin Panel</div>
        <Link to="/" style={{color:'rgba(240,240,240,.25)',fontSize:'9px',fontWeight:700,letterSpacing:'2px',textTransform:'uppercase',textDecoration:'none',border:'1px solid rgba(255,255,255,.11)',padding:'6px 14px',borderRadius:'2px'}}>← Leaderboard</Link>
      </header>
      <div style={{display:'flex',flex:1,alignItems:'center',justifyContent:'center',padding:'20px'}}>
        <div style={{background:'#0d0d0d',border:'1px solid rgba(255,255,255,.11)',borderRadius:'2px',padding:'40px 36px',width:'100%',maxWidth:'360px',textAlign:'center'}}>
          <div style={{fontFamily:'var(--serif)',fontSize:'24px',fontWeight:600,marginBottom:'8px'}}>Enter Admin PIN</div>
          <div style={{fontSize:'11px',color:'rgba(240,240,240,.25)',marginBottom:'24px'}}>Set your PIN in Vercel environment variables</div>
          <form onSubmit={handlePin}>
            <input type="password" value={pin} onChange={e=>{setPin(e.target.value);setPinErr('')}} placeholder="• • • •" maxLength={12} autoFocus
              style={{width:'100%',background:'#131313',border:'1px solid rgba(255,255,255,.11)',color:'#f0f0f0',fontFamily:'var(--sans)',fontSize:'18px',letterSpacing:'6px',textAlign:'center',padding:'14px 16px',borderRadius:'2px',outline:'none',marginBottom:'12px'}}/>
            {pinErr && <div style={{color:'#f87171',fontSize:'10px',marginBottom:'10px'}}>{pinErr}</div>}
            <button type="submit" style={{width:'100%',background:'#C8A96E',color:'#000',fontFamily:'var(--sans)',fontWeight:700,fontSize:'10px',letterSpacing:'2px',textTransform:'uppercase',border:'none',padding:'12px',borderRadius:'2px',cursor:'pointer'}}>Unlock</button>
          </form>
        </div>
      </div>
    </div>
  )

  const div2 = agents.filter(a=>a.division==='Division 2')
  const div1 = agents.filter(a=>a.division==='Division 1')
  const btnStyle = {background:'#C8A96E',color:'#000',fontFamily:'var(--sans)',fontWeight:700,fontSize:'9px',letterSpacing:'2px',textTransform:'uppercase',border:'none',padding:'9px 22px',borderRadius:'2px',cursor:saving?'not-allowed':'pointer',opacity:saving?.6:1}
  const thStyle  = {background:'#0a0a0a',fontSize:'7.5px',fontWeight:700,letterSpacing:'2px',textTransform:'uppercase',color:'rgba(240,240,240,.25)',padding:'10px',textAlign:'center',whiteSpace:'nowrap'}
  const inpStyle = {background:'#131313',border:'1px solid rgba(255,255,255,.055)',color:'#f0f0f0',fontFamily:'var(--sans)',fontSize:'11px',textAlign:'center',width:'68px',padding:'5px 6px',borderRadius:'2px',outline:'none'}

  const KpiRow = ({agent}) => {
    const k = kpis[agent.id]||emptyKpi()
    const num = field => <input type="number" min={0} style={inpStyle} value={k[field]||0} onChange={e=>update(agent.id,field,Number(e.target.value))}/>
    return (
      <tr>
        <td style={{padding:'8px 16px',borderTop:'1px solid rgba(255,255,255,.055)'}}>
          <div style={{fontSize:'11px',fontWeight:600}}>{agent.name}</div>
          <div style={{fontSize:'8.5px',color:'rgba(240,240,240,.25)'}}>{agent.role}</div>
        </td>
        <td style={{padding:'8px',borderTop:'1px solid rgba(255,255,255,.055)',textAlign:'center'}}>
          <input type="number" min={0} step={500} style={{...inpStyle,width:'100px'}} value={k.commission_aed||0} onChange={e=>update(agent.id,'commission_aed',Number(e.target.value))}/>
        </td>
        {['deals','exclusives','great_listings','good_listings','bayut_stories','reviews'].map(f=>(
          <td key={f} style={{padding:'8px',borderTop:'1px solid rgba(255,255,255,.055)',textAlign:'center'}}>{num(f)}</td>
        ))}
        {['trubest','super_agent'].map(f=>(
          <td key={f} style={{padding:'8px',borderTop:'1px solid rgba(255,255,255,.055)',textAlign:'center'}}>
            <input type="checkbox" style={{width:'16px',height:'16px',accentColor:'#C8A96E',cursor:'pointer'}} checked={!!k[f]} onChange={e=>update(agent.id,f,e.target.checked)}/>
          </td>
        ))}
      </tr>
    )
  }

  return (
    <div style={{minHeight:'100vh',background:'#050505',color:'#f0f0f0',fontFamily:'var(--sans)'}}>
      <header style={{background:'#000',padding:'18px 44px',display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'1px solid rgba(255,255,255,.11)'}}>
        <div style={{fontFamily:'var(--serif)',fontSize:'22px',fontWeight:600,letterSpacing:'1.5px',textTransform:'uppercase'}}>Admin — KPI Entry</div>
        <Link to="/" style={{color:'rgba(240,240,240,.25)',fontSize:'9px',fontWeight:700,letterSpacing:'2px',textTransform:'uppercase',textDecoration:'none',border:'1px solid rgba(255,255,255,.11)',padding:'6px 14px',borderRadius:'2px'}}>← Leaderboard</Link>
      </header>
      <div style={{maxWidth:'1200px',margin:'0 auto',padding:'32px 24px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'28px',flexWrap:'wrap'}}>
          <span style={{fontSize:'9px',fontWeight:700,letterSpacing:'2px',textTransform:'uppercase',color:'rgba(240,240,240,.25)'}}>Month</span>
          <select value={month} onChange={e=>setMonth(e.target.value)} style={{background:'#131313',border:'1px solid rgba(255,255,255,.11)',color:'#f0f0f0',fontFamily:'var(--sans)',fontSize:'11px',padding:'8px 12px',borderRadius:'2px',outline:'none'}}>
            {monthOptions().map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {status==='ok'  && <span style={{fontSize:'9px',color:'#4ADE80'}}>✓ Saved successfully</span>}
          {status==='err' && <span style={{fontSize:'9px',color:'#f87171'}}>✗ Save failed</span>}
          <div style={{marginLeft:'auto'}}><button onClick={saveAll} disabled={saving} style={btnStyle}>{saving?'Saving…':`Save All — ${fmtMonth(month)}`}</button></div>
        </div>
        <div style={{background:'#0d0d0d',border:'1px solid rgba(255,255,255,.055)',borderRadius:'2px',overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',minWidth:'900px'}}>
            <thead>
              <tr>
                {['Agent','Commission (AED)','Deals','Exclusives','Great','Good','Bayut','Reviews','TruBroker','Super Agent'].map((h,i)=>(
                  <th key={h} style={{...thStyle,textAlign:i===0?'left':'center',paddingLeft:i===0?'16px':'10px'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr><td colSpan={10} style={{background:'rgba(200,169,110,.04)',padding:'4px 16px',fontSize:'7.5px',fontWeight:700,letterSpacing:'2.5px',textTransform:'uppercase',color:'#C8A96E',borderTop:'1px solid rgba(200,169,110,.25)'}}>Division II — Senior Consultants &amp; Team Leaders</td></tr>
              {div2.map(a=><KpiRow key={a.id} agent={a}/>)}
              <tr><td colSpan={10} style={{background:'rgba(144,189,255,.04)',padding:'4px 16px',fontSize:'7.5px',fontWeight:700,letterSpacing:'2.5px',textTransform:'uppercase',color:'#90BDFF',borderTop:'1px solid rgba(144,189,255,.22)'}}>Division I — Property Consultants &amp; Associate Consultants</td></tr>
              {div1.map(a=><KpiRow key={a.id} agent={a}/>)}
            </tbody>
          </table>
        </div>
        <div style={{textAlign:'right',marginTop:'20px'}}>
          <button onClick={saveAll} disabled={saving} style={btnStyle}>{saving?'Saving…':`Save All — ${fmtMonth(month)}`}</button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// APP — Router
// ============================================================
export default function ApexApp() {
  return (
    <>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--serif:'Cormorant Garamond',Georgia,serif;--sans:'Raleway',system-ui,sans-serif}
        html,body,#root{min-height:100%;background:#050505;color:#f0f0f0;font-family:var(--sans)}
        ::-webkit-scrollbar{width:6px;height:6px}
        ::-webkit-scrollbar-track{background:#0a0a0a}
        ::-webkit-scrollbar-thumb{background:#2a2a2a;border-radius:3px}
        input[type=number]::-webkit-inner-spin-button{opacity:.3}
      `}</style>
      <BrowserRouter>
        <Routes>
          <Route path="/"      element={<Leaderboard/>}/>
          <Route path="/admin" element={<Admin/>}/>
        </Routes>
      </BrowserRouter>
    </>
  )
}
