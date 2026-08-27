/* 데이터 계층. 두 화면이 공유합니다.
   config.js 의 키가 비어 있으면 '연습 모드'로 내려앉아
   이 기기 안에서만 동작합니다. */

const DB = (() => {
  const C = window.CONFIG;
  const live = !!(C.supabaseUrl && C.supabaseAnonKey);
  const sb = live ? supabase.createClient(C.supabaseUrl, C.supabaseAnonKey) : null;

  let rows = [];                 // {q, user_no, user_name, choice, answer}
  let lastSig = "";
  const listeners = [];

  const emit = () => listeners.forEach(fn => fn(rows));

  function merge(row){
    const i = rows.findIndex(r => r.q === row.q && r.user_no === row.user_no);
    if(i >= 0) rows[i] = row; else rows.push(row);
  }

  async function load(){
    if(!live) return;
    const { data, error } = await sb.from("responses")
      .select("q,user_no,user_name,choice,answer")
      .eq("session_id", C.sessionId);
    if(error){ console.error(error); return; }
    const next = data || [];
    const sig = JSON.stringify(next.map(r => [r.q, r.user_no, r.choice, r.answer]).sort());
    if(sig === lastSig) return;          // 바뀐 게 없으면 다시 안 그림
    lastSig = sig; rows = next; emit();
  }

  async function init(){
    if(!live){ emit(); return; }
    await load();                        // 첫 로드
    sb.channel("rc6")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "responses", filter: `session_id=eq.${C.sessionId}` },
        payload => { if(payload.new){ merge(payload.new); emit(); } })
      .subscribe();
  }

  async function submit({ q, userNo, userName, choice, answer }){
    const row = { session_id: C.sessionId, q, user_no: userNo,
                  user_name: userName, choice, answer };
    merge(row); emit();
    if(!live) return { ok:true };
    const { error } = await sb.from("responses")
      .upsert(row, { onConflict: "session_id,q,user_no" });
    if(error){ console.error(error); return { ok:false, error }; }
    return { ok:true };
  }

  const forQ = q => rows.filter(r => r.q === q);
  const onChange = fn => { listeners.push(fn); fn(rows); };

  return { init, load, submit, forQ, onChange, isLive: live };
})();
