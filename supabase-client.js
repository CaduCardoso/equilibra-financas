const SUPABASE_URL='YOUR_SUPABASE_URL';
const SUPABASE_KEY='YOUR_SUPABASE_PUBLISHABLE_KEY';
const SESSION_KEY='equilibra_session';

async function api(path,options={}){
  const response=await fetch(SUPABASE_URL+path,{...options,headers:{apikey:SUPABASE_KEY,'Content-Type':'application/json',...(options.headers||{})}});
  const text=await response.text();let data=null;try{data=text?JSON.parse(text):null}catch{data=text}
  if(!response.ok)throw new Error(data?.msg||data?.message||data?.error_description||'Não foi possível concluir. Tente novamente.');
  return data;
}
function saveSession(session){localStorage.setItem(SESSION_KEY,JSON.stringify(session))}
function clearSession(){localStorage.removeItem(SESSION_KEY)}
async function signUp(name,email,password){
  const redirect=encodeURIComponent(location.origin+'/area.html');
  const data=await api('/auth/v1/signup?redirect_to='+redirect,{method:'POST',body:JSON.stringify({email,password,data:{full_name:name}})});
  if(data?.access_token)saveSession(data);return data;
}
async function signIn(email,password){const data=await api('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})});saveSession(data);return data}
async function getSession(){
  let session;try{session=JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{clearSession();return null}
  if(!session?.access_token)return null;
  if((session.expires_at||0)>Math.floor(Date.now()/1000)+60)return session;
  try{session=await api('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:session.refresh_token})});saveSession(session);return session}catch{clearSession();return null}
}
async function signOut(){const session=await getSession();if(session)try{await api('/auth/v1/logout',{method:'POST',headers:{Authorization:'Bearer '+session.access_token}})}catch{}clearSession();location.href='auth.html'}
async function db(path,options={}){const session=await getSession();if(!session){location.href='auth.html';throw new Error('Sessão encerrada')};return api('/rest/v1/'+path,{...options,headers:{Authorization:'Bearer '+session.access_token,Prefer:'return=representation',...(options.headers||{})}})}
window.Equilibra={signUp,signIn,getSession,signOut,db};
