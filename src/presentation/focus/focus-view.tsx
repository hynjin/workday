"use client";

export type FocusLocale = "ko" | "en";

function FocusIconSprite() {
  return <svg className="svg-sprite" aria-hidden="true">
    <symbol id="i-partly-sunny" viewBox="0 0 24 24"><circle cx="16" cy="7" r="4"/><path d="M16 1v1m0 10v1m6-6h-1M11.8 2.8l.8.8m6.8 6.8.8.8m0-8.4-.8.8"/><path d="M4 20h12a3.5 3.5 0 0 0 .35-6.98A5 5 0 0 0 6.8 14.5 3 3 0 0 0 4 20Z" fill="var(--sky)" stroke="var(--sky)" strokeWidth="4"/><path d="M4 20h12a3.5 3.5 0 0 0 .35-6.98A5 5 0 0 0 6.8 14.5 3 3 0 0 0 4 20Z"/></symbol>
  </svg>;
}

function duration(seconds:number, locale:FocusLocale, clock=false) {
  const safe=Math.max(0,Math.floor(seconds));
  if(clock) return `${String(Math.floor(safe/60)).padStart(2,"0")}:${String(safe%60).padStart(2,"0")}`;
  const hours=Math.floor(safe/3600),minutes=Math.floor(safe%3600/60);
  if(locale==="ko") return [hours?`${hours}시간`:"",minutes?`${minutes}분`:""].filter(Boolean).join(" ")||"0분";
  return [hours?`${hours}h`:"",minutes?`${minutes}m`:""].filter(Boolean).join(" ")||"0m";
}

export function ApprovedFocusPresentation(props:{
  locale:FocusLocale;
  title:string;
  location:string;
  color:string;
  goalMinutes:number|null;
  elapsedSeconds:number;
  previousSeconds:number;
  pending?:boolean;
  onEnd:()=>void;
}) {
  const goalSeconds=props.goalMinutes?props.goalMinutes*60:0;
  const progress=goalSeconds?Math.min(100,props.elapsedSeconds/goalSeconds*100):0;
  return <section className="focus-screen" id="focusScreen">
    <FocusIconSprite/>
    <header><a className="brand"><span className="brand-mark"><svg aria-hidden="true"><use href="#i-partly-sunny"/></svg></span><strong>Workday</strong></a><span className="focus-status"><i/><b>{props.locale==="ko"?"집중 중":"Focusing"}</b></span></header>
    <main><span className="focus-location"><i className={`dot ${props.color||"gray"}`}/><b>{props.location}</b></span><h1>{props.title}</h1><span className="focus-goal">{props.goalMinutes?(props.locale==="ko"?`목표 ${props.goalMinutes}분`:`Goal ${props.goalMinutes} min`):(props.locale==="ko"?"목표 시간 없음":"No goal time")}</span><div className={`focus-ring ${props.goalMinutes?"":"no-goal"}`} style={goalSeconds?{background:`conic-gradient(var(--sky) 0 ${progress}%,var(--sky-soft) ${progress}% 100%)`}:undefined}><div><span>{props.locale==="ko"?"현재 세션":"Current session"}</span><strong>{duration(props.elapsedSeconds,props.locale,true)}</strong></div></div><p className="focus-total"><span>{props.locale==="ko"?"오늘 누적":"Today total"}</span><strong>{duration(props.previousSeconds+props.elapsedSeconds,props.locale)}</strong></p><button className="focus-end" type="button" onClick={props.onEnd} disabled={props.pending}>{props.pending?(props.locale==="ko"?"기록 중…":"Saving…"):(props.locale==="ko"?"세션 종료":"End session")}</button><small>{props.locale==="ko"?"종료하면 지금까지의 시간이 자동으로 기록돼요.":"Your focused time is saved when the session ends."}</small></main>
  </section>;
}
