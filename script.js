/* Outlet Seluler POS - logika aplikasi */
(function(){
'use strict';

/* ================= util ================= */
const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const dstr=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const nowTime=()=>{const d=new Date();return pad(d.getHours())+':'+pad(d.getMinutes())};
const num=v=>{const n=parseInt(String(v==null?'':v).replace(/\D/g,''),10);return isNaN(n)?0:n};
const fmt=n=>Math.round(n).toLocaleString('id-ID');
const rp=n=>'Rp '+fmt(n);
const BLN=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const tglID=s=>{const p=s.split('-');return +p[2]+' '+BLN[+p[1]-1]+' '+p[0]};
const addDays=(s,n)=>{const d=new Date(s+'T00:00:00');d.setDate(d.getDate()+n);return dstr(d)};
const KAT=['Pulsa','Voucher','Kartu','Charger','Headset'];
const kcol=k=>'var(--k'+(KAT.indexOf(k)+1)+')';

/* ================= data ================= */
const KEY='outlet-seluler-pos-v5';
const PULSA_MARGIN=0.05; /* perkiraan laba pulsa 5% dari harga yang diketik */
const memDb={};
function seed(){
  const P=[
    ['PLS-TSEL','Pulsa Telkomsel','Pulsa',0,0,null,0],
    ['PLS-XL','Pulsa XL','Pulsa',0,0,null,0],
    ['PLS-ISAT','Pulsa Indosat','Pulsa',0,0,null,0],
    ['PLS-SF','Pulsa Smartfren','Pulsa',0,0,null,0],
    ['PLS-BYU','Pulsa by.U','Pulsa',0,0,null,0],
    ['VCR-TSEL-2G5','Voucher Telkomsel 2,5 GB 3 Hari','Voucher',7800,8500,20,5],
    ['VCR-TSEL-7G','Voucher Telkomsel 7 GB 14 Hari','Voucher',25800,28000,20,5],
    ['VCR-XL-4G','Voucher XL 4 GB 5 Hari','Voucher',12900,14000,20,5],
    ['VCR-XL-FLEX10','Voucher XL Flex S+ 10 GB 28 Hari','Voucher',33100,36000,20,5],
    ['VCR-ISAT-3G','Voucher Indosat Freedom Internet 3 GB 14 Hari','Voucher',20200,22000,20,5],
    ['VCR-ISAT-7G','Voucher Indosat Freedom Internet 7 GB 28 Hari','Voucher',32200,35000,20,5],
    ['VCR-ISAT-30G','Voucher Indosat Freedom Internet 30 GB 30 Hari','Voucher',59800,65000,20,5],
    ['VCR-SF-3G','Voucher Smartfren 3 GB 14 Hari','Voucher',13800,15000,20,5],
    ['VCR-SF-10G','Voucher Smartfren 10 GB 28 Hari','Voucher',36800,40000,20,5],
    ['VCR-BYU-6G','Voucher by.U 6 GB 7 Hari','Voucher',13300,14500,20,5],
    ['VCR-BYU-10G','Voucher by.U 10 GB 28 Hari','Voucher',35000,38000,20,5],
    ['KRT-TSEL-SA','Kartu Telkomsel Perdana simPATI A / Lite (3 GB, 30 Hari)','Kartu',18400,20000,20,5],
    ['KRT-XL-3G','Kartu XL Perdana XL (3 GB, 30 Hari)','Kartu',32200,35000,20,5],
    ['KRT-XL-FLEX','Kartu XL Perdana flexMini (10 GB, 10 Hari)','Kartu',29400,32000,20,5],
    ['KRT-ISAT-STD','Kartu Indosat Perdana IM3 Standar','Kartu',13800,15000,20,5],
    ['KRT-ISAT-3G','Kartu Indosat Perdana IM3 (3 GB, 30 Hari)','Kartu',32200,35000,20,5],
    ['KRT-SF-3G','Kartu Smartfren Perdana Kuota 3 GB','Kartu',14700,16000,20,5],
    ['KRT-SF-10G','Kartu Smartfren Perdana 10 GB','Kartu',17900,19500,20,5],
    ['KRT-BYU-8G','Kartu by.U + Paket 8 GB','Kartu',18400,20000,20,5],
    ['CHG-2A-01','Charger 2A Micro USB','Charger',27000,35000,9,5],
    ['CHG-FAST-01','Charger Fast Charging Type-C','Charger',45000,60000,6,4],
    ['HDS-STD-01','Headset Kabel Standar','Headset',16500,22000,3,5],
    ['HDS-BASS-01','Headset Kabel Extra Bass','Headset',24000,32000,11,5]
  ];
  const produk=P.map((p,i)=>({id:i+1,kode:p[0],nama:p[1],kat:p[2],beli:p[3],jual:p[4],stok:p[5],min:p[6]}));
  const today=dstr(new Date()), yest=addDays(today,-1);
  const transaksi=[];
  const add=(tgl,jam,kasir,metode,rows,bayar)=>{
    const items=rows.map(r=>{const p=produk.find(x=>x.kode===r[0]);const jual=r[3]||p.jual,beli=p.kat==='Pulsa'?Math.round(jual*(1-PULSA_MARGIN)):p.beli;return {pid:p.id,kode:p.kode,nama:p.nama,kat:p.kat,qty:r[1],jual:jual,beli:beli,tujuan:r[2]||''}});
    const total=items.reduce((a,i)=>a+i.qty*i.jual,0);
    const n=transaksi.filter(t=>t.tgl===tgl).length+1;
    const b=metode==='Tunai'?(bayar||total):total;
    transaksi.push({no:'TRX-'+tgl.replace(/-/g,'')+'-'+String(n).padStart(3,'0'),tgl:tgl,jam:jam,kasir:kasir,metode:metode,items:items,total:total,bayar:b,kembali:b-total,catatan:''});
  };
  return {produk:produk,transaksi:[],stokLog:[]};
}
let db=null,dbKey=KEY;
function loadDb(tokoId){
  dbKey=tokoId==='demo'?KEY:KEY+':'+tokoId;
  let d=null;
  try{const r=localStorage.getItem(dbKey);if(r){d=JSON.parse(r);if(d&&d.produk&&d.transaksi)d.stokLog=d.stokLog||[];else d=null}}catch(e){d=null}
  if(!d)d=memDb[dbKey]||null;
  if(!d)d=seed();
  db=d;
}
function save(){memDb[dbKey]=db;try{localStorage.setItem(dbKey,JSON.stringify(db))}catch(e){}}

/* ================= akun toko ================= */
const AKUN_KEY='outlet-seluler-akun-v2';
let akun=[];
try{const r=localStorage.getItem(AKUN_KEY);if(r)akun=JSON.parse(r)||[]}catch(e){akun=[]}
function saveAkun(){try{localStorage.setItem(AKUN_KEY,JSON.stringify(akun))}catch(e){}}
function findAkun(u){
  return akun.find(a=>a.username===u)||null;
}
const USERNAME_RE=/^[a-z0-9_]{4,20}$/;

/* ================= sesi ================= */
let user=null;
try{const s=sessionStorage.getItem('os-user');if(s)user=JSON.parse(s)}catch(e){}
if(user&&!akun.some(a=>a.username===user.username))user=null;
if(user)loadDb(user.tokoId||'demo');
const tokoNama=()=>(user&&user.toko)||'Outlet Seluler';
function setUser(u){user=u;try{if(u)sessionStorage.setItem('os-user',JSON.stringify(u));else sessionStorage.removeItem('os-user')}catch(e){}}

/* ================= toast & overlay ================= */
let toastT=null;
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('on'),3200)}
function closeOv(){const o=$('#overlay');o.hidden=true;o.innerHTML=''}
function openStruk(t){
  const o=$('#overlay');
  o.innerHTML='<div class="ov-in" role="dialog" aria-modal="true" aria-label="Struk '+esc(t.no)+'"><div class="struk-wrapper">'+strukHTML(t)+'</div>'+(EMBEDDED?'':'<button type="button" class="btn" id="ov-print">Cetak struk</button>')+'<button type="button" class="btn ghost" id="ov-close" style="background:var(--surface)">Tutup</button></div>';
  o.hidden=false;$('#ov-close').focus();
  const pb=$('#ov-print');if(pb)pb.onclick=()=>cetakStruk(t);
}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeOv()});
$('#overlay').addEventListener('click',e=>{if(e.target.id==='overlay'||e.target.id==='ov-close')closeOv()});

/* ================= cetak & ekspor ================= */
const EMBEDDED=(function(){try{return window.self!==window.top}catch(e){return true}})();
function cetakStruk(t){
  if(EMBEDDED){toast('Cetak hanya aktif di file HTML mandiri');return}
  $('#print-area').innerHTML=strukHTML(t);
  document.body.classList.add('printing');
  const done=()=>{document.body.classList.remove('printing');window.removeEventListener('afterprint',done)};
  window.addEventListener('afterprint',done);
  setTimeout(()=>window.print(),60);
}
function exportRows(L){
  const H=['No. Transaksi','Tanggal','Jam','Kasir','Kategori','Produk','Nomor Tujuan','Jumlah','Harga Satuan','Subtotal','Metode Bayar','Total Transaksi','Uang Dibayar','Kembalian'];
  const rows=[H];let st=0,tt=0;
  L.forEach(t=>{
    tt+=t.total;
    t.items.forEach((i,ix)=>{const sub=i.qty*i.jual;st+=sub;rows.push([t.no,t.tgl,t.jam,t.kasir,i.kat,i.nama,i.tujuan||'',i.qty,i.jual,sub,t.metode,ix===0?t.total:'',ix===0?t.bayar:'',ix===0?t.kembali:''])});
  });
  rows.push(['TOTAL','','','','','','','','',st,'',tt,'','']);
  return rows;
}
function copyText(txt){
  const fallback=()=>{
    const o=$('#overlay');
    o.innerHTML='<div class="ov-in" role="dialog" aria-modal="true"><div class="card"><h2>Salin data ke Excel</h2><p class="hint">Tekan Ctrl+C, lalu tempel di Excel dengan Ctrl+V.</p><textarea id="ov-ta" rows="8" readonly style="margin-top:10px;font-family:var(--f-mono);font-size:12px"></textarea></div><button type="button" class="btn ghost" id="ov-close" style="background:var(--surface)">Tutup</button></div>';
    o.hidden=false;const ta=$('#ov-ta');ta.value=txt;ta.focus();ta.select();
  };
  try{navigator.clipboard.writeText(txt).then(()=>toast('Data disalin. Tempel di Excel dengan Ctrl+V'),fallback)}catch(e){fallback()}
}
async function getDownloads(){
  try{return window.claude&&window.claude.use?await window.claude.use('downloads'):null}catch(e){return null}
}
function buildWb(rows){
  const ws=XLSX.utils.aoa_to_sheet(rows);
  ws['!cols']=[18,12,7,10,10,46,15,8,13,13,12,15,14,11].map(w=>({wch:w}));
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Riwayat');
  return wb;
}
async function exportRiwayat(){
  if(!riwayatList.length){toast('Tidak ada data untuk diekspor');return}
  const L=riwayatList.slice().reverse(),rows=exportRows(L);
  const d=$('#r-dari').value,s=$('#r-sampai').value;
  const name='riwayat-transaksi_'+(d||'awal')+'_sd_'+(s||'akhir');
  const tsv=()=>rows.map(r=>r.map(c=>String(c).replace(/[\t\r\n]+/g,' ')).join('\t')).join('\n');
  if(EMBEDDED){
    const dl=await getDownloads();
    if(dl&&window.XLSX){
      try{
        const buf=XLSX.write(buildWb(rows),{bookType:'xlsx',type:'array'});
        await dl.save({filename:name+'.xlsx',data:buf});
        toast('File Excel siap disimpan');
      }catch(e){
        if(e&&e.code==='declined')return;
        copyText(tsv());
      }
      return;
    }
    copyText(tsv());
    return;
  }
  if(window.XLSX){
    XLSX.writeFile(buildWb(rows),name+'.xlsx');
  }else{
    const csv='\ufeff'+rows.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(';')).join('\r\n');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download=name+'.csv';document.body.appendChild(a);a.click();a.remove();
  }
  toast('File Excel diunduh');
}
let riwayatList=[];

/* ================= struk ================= */
function strukHTML(t){
  const its=t.items.map(i=>'<div class="it"><div>'+esc(i.nama)+'</div><div class="r"><span>'+i.qty+' x '+fmt(i.jual)+'</span><span>'+fmt(i.qty*i.jual)+'</span></div>'+(i.tujuan?'<div class="s">Tujuan '+esc(i.tujuan)+'</div>':'')+'</div>').join('');
  return '<div class="struk"><div class="c"><b>'+esc(tokoNama().toUpperCase())+'</b><small>Pulsa · Voucher · Kartu · Aksesori</small></div><div class="d"></div>'
   +'<div class="r"><span>No</span><span>'+esc(t.no)+'</span></div>'
   +'<div class="r"><span>Tanggal</span><span>'+tglID(t.tgl)+' '+esc(t.jam)+'</span></div>'
   +'<div class="r"><span>Kasir</span><span>'+esc(t.kasir)+'</span></div><div class="d"></div>'
   +its+'<div class="d"></div>'
   +'<div class="r t"><span>TOTAL</span><span>'+fmt(t.total)+'</span></div>'
   +(t.bayar>0?'<div class="r"><span>Bayar ('+esc(t.metode)+')</span><span>'+fmt(t.bayar)+'</span></div><div class="r"><span>Kembali</span><span>'+fmt(t.kembali)+'</span></div>':'')
   +'<span class="f">Terima kasih sudah berbelanja</span></div>';
}

/* ================= routing ================= */
const ROUTES={
  kasir:{label:'Input Transaksi',grp:'Input',roles:['kasir']},
  produk:{label:'Input Produk & Stok',grp:'Input',roles:['admin']},
  laporan:{label:'Laporan Penjualan',grp:'Output',roles:['admin']},
  riwayat:{label:'Riwayat Transaksi',grp:'Output',roles:['admin','kasir']},
  stok:{label:'Stok Produk',grp:'Output',roles:['admin','kasir']},
  pengaturan:{label:'Pengaturan',grp:'',roles:['admin'],hidden:true}
};
const RENDER={kasir:vKasir,produk:vProduk,laporan:vLaporan,riwayat:vRiwayat,stok:vStok,pengaturan:vPengaturan};

function route(){
  if(!user){renderLogin();return}
  if(!$('#shell'))renderShell();
  let h=location.hash.slice(1);
  if(!ROUTES[h]||ROUTES[h].roles.indexOf(user.role)<0){
    const home=user.role==='admin'?'produk':'kasir';
    if(location.hash!=='#'+home){location.hash=home;return}
    h=home;
  }
  $$('.nav a').forEach(a=>{const on=a.dataset.r===h;a.classList.toggle('on',on);if(on)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
  const v=$('#view');v.innerHTML='';
  RENDER[h](v);eyes();
  window.scrollTo(0,0);
}
window.addEventListener('hashchange',route);

const EYE='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
function eyes(){
  $$('input[type="password"]').forEach(inp=>{
    if(inp.dataset.eye)return;inp.dataset.eye='1';
    const w=document.createElement('div');w.className='pw';
    inp.parentNode.insertBefore(w,inp);w.appendChild(inp);
    const b=document.createElement('button');b.type='button';b.className='eye';
    b.setAttribute('aria-label','Tampilkan password');b.setAttribute('aria-pressed','false');b.innerHTML=EYE;
    b.onclick=()=>{
      const show=inp.type==='password';
      inp.type=show?'text':'password';b.innerHTML=show?EYE_OFF:EYE;
      b.setAttribute('aria-pressed',String(show));b.setAttribute('aria-label',show?'Sembunyikan password':'Tampilkan password');inp.focus();
    };
    w.appendChild(b);
  });
}
function logout(){setUser(null);lastSaved=null;savedShown=false;renderLogin()}
function renderShell(){
  let nav='',last='';
  Object.keys(ROUTES).forEach(k=>{
    const r=ROUTES[k];if(r.roles.indexOf(user.role)<0||r.hidden)return;
    if(r.grp!==last){nav+='<div class="grp">'+r.grp+'</div>';last=r.grp}
    nav+='<a href="#'+k+'" data-r="'+k+'">'+esc(r.label)+'</a>';
  });
  $('#root').innerHTML='<div class="app" id="shell"><aside class="side"><div class="side-in gut">'
   +'<div class="brand"><span class="bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span><div><b>'+esc(tokoNama())+'</b><small>Pencatatan transaksi</small></div></div>'
   +'<nav class="nav" aria-label="Menu utama">'+nav+'</nav>'
   +'<div class="side-foot"><div class="who"><b>'+esc(user.nama)+'</b><span>'+(user.role==='admin'?'Admin / Pemilik':'Kasir')+'</span></div>'
   +'<div class="tools"><button type="button" class="sbtn icon" id="b-tema" aria-label="Ganti tampilan terang atau gelap" title="Ganti tampilan terang atau gelap"></button>'+(user.role==='admin'?'<a class="sbtn icon" href="#pengaturan" aria-label="Pengaturan" title="Pengaturan"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></a>':'<button type="button" class="sbtn" id="b-keluar">Keluar</button>')+'</div>'
   +'</div></div></aside><main class="main"><div class="main-in gut" id="view"></div></main></div>';
  const bk=$('#b-keluar');if(bk)bk.onclick=logout;
  const SUN='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  const MOON='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  const curTheme=()=>document.documentElement.getAttribute('data-theme')||(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
  const tb=$('#b-tema');
  const paint=()=>{tb.innerHTML=curTheme()==='dark'?MOON:SUN};
  paint();
  tb.onclick=()=>{document.documentElement.setAttribute('data-theme',curTheme()==='dark'?'light':'dark');paint()};
  try{matchMedia('(prefers-color-scheme: dark)').addEventListener('change',paint)}catch(e){}
}

/* ================= login ================= */
function renderLogin(){
  if(!akun.some(a=>a.role==='admin')){renderSetup();return}
  $('#root').innerHTML='<div class="login"><section class="art gut"><div class="brand"><span class="bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span><div><b>Outlet Seluler</b><small>Sistem pencatatan transaksi</small></div></div>'
   +'<div><h1>Catat tiap penjualan, hitung laba harian.</h1></div></section>'
   +'<section class="pwrap gut"><form class="pform" id="f-login" autocomplete="off" novalidate><h2>Masuk</h2><p class="lead">Masuk dengan username dan password Anda.</p>'
   +'<div class="f"><label for="username">Username</label><input id="username" name="username" autocapitalize="off" autocomplete="username" required></div>'
   +'<div class="f"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required></div>'
   +'<div class="err" id="err-login" role="alert"></div>'
   +'<div class="row-actions"><button class="btn full" type="submit">Masuk</button></div>'
   +'</form></section></div>';
  $('#f-login').onsubmit=e=>{
    e.preventDefault();
    const u=$('#username').value.trim().toLowerCase(),p=$('#password').value,a=findAkun(u);
    if(!u||!p){$('#err-login').textContent='Isi username dan password.';return}
    if(!a||a.pw!==p){$('#err-login').textContent='Username atau password salah. Periksa kembali akun Anda.';return}
    loadDb(a.tokoId);setUser({username:u,nama:a.nama,role:a.role,tokoId:a.tokoId,toko:a.toko});
    location.hash=a.role==='admin'?'produk':'kasir';route();
  };
  eyes();
  $('#username').focus();
}

function renderSetup(){
  $('#root').innerHTML='<div class="login"><section class="art gut"><div class="brand"><span class="bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span><div><b>Outlet Seluler</b><small>Sistem pencatatan transaksi</small></div></div>'
   +'<div><h1>Buat akun admin untuk mulai memakai aplikasi.</h1></div></section>'
   +'<section class="pwrap gut"><form class="pform" id="f-setup" autocomplete="off" novalidate><h2>Akun admin</h2><p class="lead">Langkah awal, hanya sekali. Akun kasir dibuat oleh admin setelah masuk.</p>'
   +'<div class="f"><label for="d-toko">Nama outlet</label><input id="d-toko" placeholder="Mis. Barokah Cell" autocomplete="off"></div>'
   +'<div class="f"><label for="d-nama">Nama admin</label><input id="d-nama" autocomplete="off"></div>'
   +'<div class="f"><label for="d-user">Username</label><input id="d-user" autocapitalize="off" autocomplete="off"><span class="hint">4 sampai 20 karakter: huruf kecil, angka, atau garis bawah.</span></div>'
   +'<div class="f"><label for="d-pw">Password</label><input id="d-pw" type="password" autocomplete="new-password"><span class="hint">Minimal 6 karakter.</span></div>'
   +'<div class="f"><label for="d-pw2">Ulangi password</label><input id="d-pw2" type="password" autocomplete="new-password"></div>'
   +'<div class="err" id="err-daftar" role="alert"></div>'
   +'<div class="row-actions"><button class="btn full" type="submit">Buat akun dan masuk</button></div></form></section></div>';
  $('#f-setup').onsubmit=e=>{
    e.preventDefault();
    const err=$('#err-daftar');err.textContent='';
    const toko=$('#d-toko').value.trim(),nama=$('#d-nama').value.trim(),u=$('#d-user').value.trim().toLowerCase(),p=$('#d-pw').value,p2=$('#d-pw2').value;
    if(toko.length<3){err.textContent='Nama outlet minimal 3 karakter.';return}
    if(!nama){err.textContent='Isi nama admin.';return}
    if(!USERNAME_RE.test(u)){err.textContent='Username harus 4 sampai 20 karakter: huruf kecil, angka, atau garis bawah.';return}
    if(p.length<6){err.textContent='Password minimal 6 karakter.';return}
    if(p!==p2){err.textContent='Ulangi password tidak sama dengan password.';return}
    akun.push({username:u,pw:p,nama:nama,role:'admin',tokoId:'demo',toko:toko});saveAkun();
    loadDb('demo');save();
    setUser({username:u,nama:nama,role:'admin',tokoId:'demo',toko:toko});
    toast('Akun admin dibuat. Selamat datang, '+nama+'!');
    location.hash='produk';route();
  };
  eyes();
  $('#d-toko').focus();
}

/* ================= pengaturan (admin) ================= */
function vPengaturan(v){
  const me=akun.find(a=>a.username===user.username)||{};
  v.innerHTML=head('Pengaturan','Kelola akun admin Anda dan sesi login di perangkat ini.')
  +'<div class="cols2"><section class="card"><h2>Akun saya</h2><dl class="kv"><dt>Nama</dt><dd>'+esc(user.nama)+'</dd><dt>Username</dt><dd class="mono">'+esc(user.username)+'</dd><dt>Peran</dt><dd>Admin / Pemilik</dd><dt>Outlet</dt><dd>'+esc(tokoNama())+'</dd></dl></section>'
  +'<div class="stack"><section class="card"><h2>Keluar</h2><p class="hint" style="margin:-6px 0 14px">Akhiri sesi di perangkat ini. Data dan akun tetap tersimpan.</p><button type="button" class="btn ghost" id="p-keluar">Keluar dari akun</button></section>'
  +'<section class="card danger"><h2>Hapus akun</h2><p class="hint" style="margin:-6px 0 14px">Akun admin ini akan dihapus dan Anda keluar. Data produk, transaksi, dan akun kasir tidak ikut terhapus. Setelah itu aplikasi meminta Anda membuat akun admin baru.</p>'
  +'<div class="f"><label for="p-pw">Password untuk konfirmasi</label><input id="p-pw" type="password" autocomplete="current-password"></div>'
  +'<div class="err" id="err-hapus" role="alert"></div><div class="row-actions"><button type="button" class="btn danger" id="p-hapus">Hapus akun saya</button></div></section></div></div>';
  $('#p-keluar').onclick=logout;
  let armed=false,tm=null;
  $('#p-hapus').onclick=()=>{
    const err=$('#err-hapus'),b=$('#p-hapus');err.textContent='';
    const pw=$('#p-pw').value;
    if(!pw){err.textContent='Isi password Anda untuk konfirmasi.';return}
    if(!me.pw||pw!==me.pw){err.textContent='Password salah. Akun belum dihapus.';armed=false;b.textContent='Hapus akun saya';return}
    if(!armed){armed=true;b.textContent='Klik lagi untuk menghapus';clearTimeout(tm);tm=setTimeout(()=>{armed=false;b.textContent='Hapus akun saya'},4000);return}
    akun=akun.filter(a=>a.username!==user.username);saveAkun();
    logout();toast('Akun admin dihapus');
  };
}

/* ================= helper tampilan ================= */
function head(t,p,extra){return '<div class="head"><div><h1>'+t+'</h1><p>'+p+'</p></div>'+(extra||'')+'</div>'}
function lowStock(){return db.produk.filter(p=>p.stok!=null&&p.stok<p.min)}
function fmtInput(el){const v=num(el.value);el.value=v?fmt(v):''}

/* ================= INPUT 1: transaksi ================= */
let lastSaved=null,selKat='Pulsa',savedShown=false;
function nextNo(){const tgl=dstr(new Date());return 'TRX-'+tgl.replace(/-/g,'')+'-'+String(db.transaksi.filter(t=>t.tgl===tgl).length+1).padStart(3,'0')}
const validHP=s=>/^0\d{8,13}$/.test(s);

function kasirDraft(){
  const sel=$('#produk');if(!sel)return null;
  const p=db.produk.find(x=>x.id==sel.value);if(!p)return null;
  const pulsa=p.kat==='Pulsa';
  const qty=pulsa?1:num($('#qty').value);
  const jual=pulsa?num($('#harga').value):p.jual;
  const tj=pulsa?$('#tujuan').value.replace(/\D/g,''):'';
  return {p:p,pulsa:pulsa,qty:qty,jual:jual,tujuan:tj,total:qty*jual};
}
function modalOf(p,jual){return p.kat==='Pulsa'?Math.round(jual*(1-PULSA_MARGIN)):p.beli}
function draftItem(d){return {pid:d.p.id,kode:d.p.kode,nama:d.p.nama,kat:d.p.kat,qty:d.qty,jual:d.jual,beli:modalOf(d.p,d.jual),tujuan:d.tujuan}}

function vKasir(v){
  const chips=KAT.map(k=>'<button type="button" class="chip'+(k===selKat?' on':'')+'" data-kat="'+k+'" aria-pressed="'+(k===selKat)+'"><i style="background:'+kcol(k)+'"></i>'+k+'</button>').join('');
  v.innerHTML=head('Input Transaksi','Isi data penjualan lalu simpan. Transaksi langsung masuk ke Riwayat Transaksi hari ini.')
  +'<div class="kasir-grid"><div class="stack">'
  +'<section class="card"><h2>Data transaksi</h2><div class="chips" role="group" aria-label="Kategori produk">'+chips+'</div>'
  +'<div class="grid2"><div class="f full"><label for="produk" id="l-produk">Operator</label><select id="produk"></select><span class="hint" id="stok-info"></span></div>'
  +'<div class="f" id="f-tujuan"><label for="tujuan" id="l-tujuan">Nomor tujuan</label><input id="tujuan" inputmode="numeric" placeholder="081234567890" autocomplete="off"></div>'
  +'<div class="f" id="f-harga"><label for="harga">Harga (Rp)</label><input id="harga" inputmode="numeric" placeholder="Contoh: 12.000" autocomplete="off"></div>'
  +'<div class="f" id="f-qty"><label for="qty">Jumlah</label><div class="step"><button type="button" id="qmin" aria-label="Kurangi">−</button><input id="qty" inputmode="numeric" value="1" aria-label="Jumlah"><button type="button" id="qplus" aria-label="Tambah">+</button></div></div></div></section>'
  +'<section class="card"><h2>Pembayaran</h2><div class="grid2">'
  +'<div class="f"><label for="metode">Metode bayar</label><select id="metode"><option>Tunai</option><option>QRIS</option><option>Transfer</option></select></div>'
  +'<div class="f"><label for="bayar">Uang dibayar (Rp)</label><input id="bayar" inputmode="numeric" placeholder="0" autocomplete="off"></div></div>'
  +'<div class="total-box"><span>Total</span><b class="num" id="total">—</b></div>'
  +'<div class="total-box"><span>Kembalian</span><span class="kembali" id="kembali">—</span></div>'
  +'<div class="err" id="err-save" role="alert"></div>'
  +'<div class="row-actions"><button type="button" class="btn" id="btn-save">Simpan transaksi</button><button type="button" class="btn ghost" id="btn-clear">Kosongkan</button></div></section>'
  +'</div><aside><div id="struk-wrap"></div></aside></div>';

  const sel=$('#produk');
  function touch(){savedShown=false}
  function fillProduk(){
    const L=db.produk.filter(p=>p.kat===selKat),pulsa=selKat==='Pulsa';
    if(selKat==='Voucher'||selKat==='Kartu'){
      const G={TSEL:'Telkomsel',XL:'XL',ISAT:'Indosat',SF:'Smartfren',BYU:'by.U'};
      let html='',last=null;
      L.forEach(p=>{
        const g=G[p.kode.split('-')[1]]||'Lainnya';
        if(g!==last){if(last!==null)html+='</optgroup>';html+='<optgroup label="'+g+'">';last=g}
        html+='<option value="'+p.id+'">'+esc(g==='Lainnya'?p.nama:p.nama.replace(/^(Voucher|Kartu) \S+ /,''))+' — '+rp(p.jual)+'</option>';
      });
      if(last!==null)html+='</optgroup>';
      sel.innerHTML=html;
    }else{
      sel.innerHTML=L.map(p=>'<option value="'+p.id+'">'+(pulsa?esc(p.nama.replace(/^Pulsa /,'')):esc(p.nama)+' — '+rp(p.jual))+'</option>').join('');
    }
    $('#l-produk').textContent=pulsa?'Operator':'Produk';
    $('#f-tujuan').hidden=!pulsa;
        $('#f-harga').hidden=!pulsa;
    $('#f-qty').hidden=pulsa;
    info();
  }
  function info(){
    const p=db.produk.find(x=>x.id==sel.value);
    $('#stok-info').textContent=!p?'':p.stok==null?'Pulsa memakai saldo digital, tanpa batas stok.':'Stok tersisa '+p.stok+(p.stok<p.min?' (menipis)':'');
  }
  function refresh(){touch();info();updateKembali();renderStruk()}
  $$('.chip[data-kat]').forEach(b=>b.onclick=()=>{
    selKat=b.dataset.kat;
    $$('.chip[data-kat]').forEach(x=>{const on=x.dataset.kat===selKat;x.classList.toggle('on',on);x.setAttribute('aria-pressed',on)});
    $('#err-save').textContent='';fillProduk();refresh();
  });
  sel.onchange=refresh;
  $('#qmin').onclick=()=>{$('#qty').value=Math.max(1,num($('#qty').value)-1);refresh()};
  $('#qplus').onclick=()=>{$('#qty').value=num($('#qty').value)+1;refresh()};
  $('#qty').oninput=e=>{const n=num(e.target.value);e.target.value=n||'';refresh()};
  $('#tujuan').oninput=e=>{e.target.value=e.target.value.replace(/[^\d]/g,'');refresh()};
  $('#harga').oninput=e=>{fmtInput(e.target);refresh()};
  $('#metode').onchange=refresh;
  $('#bayar').oninput=e=>{fmtInput(e.target);touch();updateKembali();renderStruk()};
  $('#btn-clear').onclick=()=>{
    $('#tujuan').value='';$('#harga').value='';$('#qty').value=1;$('#bayar').value='';$('#err-save').textContent='';refresh();
  };
  $('#btn-save').onclick=saveTrx;
  fillProduk();refresh();
}
function bayarNow(d){
  const m=$('#metode');
  return (m&&m.value==='Tunai')?num($('#bayar').value):(d?d.total:0);
}
function updateKembali(){
  const m=$('#metode');if(!m)return;
  const d=kasirDraft(),total=d?d.total:0,tunai=m.value==='Tunai',bayar=$('#bayar');
  if(!tunai){bayar.value=total?fmt(total):'';bayar.disabled=true}else bayar.disabled=false;
  $('#total').textContent=total?rp(total):'—';
  const k=$('#kembali'),b=bayarNow(d)-total;
  if(!total){k.textContent='—';k.classList.remove('neg')}
  else if(b>=0){k.textContent=rp(b);k.classList.remove('neg')}
  else{k.textContent='Kurang '+rp(-b);k.classList.add('neg')}
}
function strukActions(){
  return EMBEDDED?'<p class="hint" style="margin-top:12px">Cetak struk aktif di file HTML mandiri yang dibuka langsung di browser.</p>':'<div class="row-actions"><button type="button" class="btn ghost" id="btn-print">Cetak struk</button></div>';
}
function renderStruk(){
  const w=$('#struk-wrap');if(!w)return;
  const d=kasirDraft();let t=null;
  if(savedShown&&lastSaved){
    t=lastSaved;
    w.innerHTML='<p class="cap ok">Tersimpan di Riwayat Transaksi</p><div class="struk-wrapper">'+strukHTML(t)+'</div>'+strukActions();
  }else if(d&&d.total>0){
    const b=bayarNow(d);
    t={no:nextNo(),tgl:dstr(new Date()),jam:nowTime(),kasir:user.nama,metode:$('#metode').value,items:[draftItem(d)],total:d.total,bayar:b,kembali:Math.max(0,b-d.total)};
    w.innerHTML='<p class="cap">Pratinjau struk</p><div class="struk-wrapper">'+strukHTML(t)+'</div>'+strukActions();
  }else{
    w.innerHTML='<p class="cap">Pratinjau struk</p><div class="struk-empty">Struk muncul di sini dan ikut berubah saat Anda mengisi data transaksi.</div>';
    return;
  }
  const pb=$('#btn-print');if(pb)pb.onclick=()=>cetakStruk(t);
}
function saveTrx(){
  const err=$('#err-save');err.textContent='';
  const d=kasirDraft();
  if(!d){err.textContent='Pilih produk terlebih dahulu.';return}
  if(d.pulsa){
    if(!validHP(d.tujuan)){err.textContent='Nomor tujuan tidak valid. Tulis nomor yang diawali 0, contoh 081234567890.';return}
    if(d.jual<1){err.textContent='Isi harga pulsa terlebih dahulu.';return}
  }else{
    if(d.qty<1){err.textContent='Jumlah minimal 1.';return}
    if(d.p.stok!=null&&d.qty>d.p.stok){err.textContent='Stok '+d.p.nama+' tinggal '+d.p.stok+'. Kurangi jumlahnya.';return}
  }
  const metode=$('#metode').value,bayar=bayarNow(d);
  if(metode==='Tunai'&&bayar<d.total){err.textContent='Uang dibayar kurang '+rp(d.total-bayar)+'. Isi jumlah yang cukup.';return}
  const t={no:nextNo(),tgl:dstr(new Date()),jam:nowTime(),kasir:user.nama,metode:metode,items:[draftItem(d)],total:d.total,bayar:bayar,kembali:bayar-d.total,catatan:''};
  if(d.p.stok!=null)d.p.stok-=d.qty;
  db.transaksi.push(t);save();
  lastSaved=t;savedShown=true;
  $('#tujuan').value='';$('#harga').value='';$('#qty').value=1;$('#bayar').value='';
  const sel=$('#produk');const cur=sel.value;
  // perbarui info stok tanpa mengubah pilihan
  const p=db.produk.find(x=>x.id==cur);
  $('#stok-info').textContent=!p?'':p.stok==null?'Pulsa memakai saldo digital, tanpa batas stok.':'Stok tersisa '+p.stok+(p.stok<p.min?' (menipis)':'');
  updateKembali();renderStruk();
  toast('Transaksi '+t.no+' tersimpan di Riwayat hari ini');
}

/* ================= INPUT 2: produk & stok ================= */
function vProduk(v){
  v.innerHTML=head('Input Produk & Stok','Daftarkan produk baru atau catat barang masuk dari supplier.')
  +'<div class="cols2"><form class="card" id="f-prod" novalidate><h2>Tambah produk baru</h2><div class="grid2">'
  +'<div class="f"><label for="kode">Kode produk</label><input id="kode" readonly placeholder="Terbentuk otomatis" autocomplete="off"><span class="hint">Dibuat otomatis dari kategori dan nama produk.</span></div>'
  +'<div class="f"><label for="kat-baru">Kategori</label><select id="kat-baru">'+KAT.map(k=>'<option>'+k+'</option>').join('')+'</select></div>'
  +'<div class="f full"><label for="nama">Nama produk</label><input id="nama" placeholder="Mis. Charger 2A Micro USB" autocomplete="off"></div>'
  +'<div class="f"><label for="beli">Harga beli / modal (Rp)</label><input id="beli" inputmode="numeric" autocomplete="off"></div>'
  +'<div class="f"><label for="jual">Harga jual (Rp)</label><input id="jual" inputmode="numeric" autocomplete="off"></div>'
  +'<div class="f"><label for="stok-awal">Stok awal</label><input id="stok-awal" inputmode="numeric" value="0"><span class="hint" id="h-stok">Pulsa: harga diketik saat transaksi, stok tidak dihitung.</span></div>'
  +'<div class="f"><label for="stok-min">Batas stok menipis</label><input id="stok-min" inputmode="numeric" value="5"></div></div>'
  +'<div class="err" id="err-prod" role="alert"></div><div class="row-actions"><button class="btn" type="submit">Simpan produk</button><button class="btn ghost" type="reset" id="r-prod">Bersihkan</button></div></form>'
  +'<div class="stack"><form class="card" id="f-stok" novalidate><h2>Tambah stok barang</h2><div class="grid2">'
  +'<div class="f full"><label for="stok-prod">Produk</label><select id="stok-prod"></select></div>'
  +'<div class="f"><label for="stok-jml">Jumlah masuk</label><input id="stok-jml" inputmode="numeric" autocomplete="off"></div>'
  +'<div class="f"><label for="stok-tgl">Tanggal masuk</label><input id="stok-tgl" type="date"></div>'
  +'<div class="f full"><label for="stok-sup">Supplier</label><input id="stok-sup" placeholder="Nama distributor" autocomplete="off"></div></div>'
  +'<div class="err" id="err-stok" role="alert"></div><div class="row-actions"><button class="btn" type="submit">Tambah stok</button></div></form>'
  +'<section class="card"><h2>Stok masuk terakhir</h2><div id="log"></div></section></div></div>'
  +'<section class="card" style="margin-top:16px"><h2>Akun kasir</h2><p class="hint" style="margin:-6px 0 14px">Kasir hanya bisa mencatat transaksi dan melihat riwayat serta stok toko ini.</p>'
  +'<form id="f-kasir" novalidate><div class="grid2"><div class="f"><label for="k-nama">Nama kasir</label><input id="k-nama" autocomplete="off"></div><div class="f"><label for="k-user">Username</label><input id="k-user" autocapitalize="off" autocomplete="off"></div>'
  +'<div class="f"><label for="k-pw">Password</label><input id="k-pw" type="password" autocomplete="new-password"><span class="hint">Minimal 6 karakter.</span></div></div>'
  +'<div class="err" id="err-kasir" role="alert"></div><div class="row-actions"><button class="btn" type="submit">Tambah kasir</button></div></form>'
  +'<div id="kasir-list" style="margin-top:18px"></div></section>';
  $('#stok-tgl').value=dstr(new Date());
  const kb=$('#kat-baru');
  const PFX={Pulsa:'PLS',Voucher:'VCR',Kartu:'KRT',Charger:'CHG',Headset:'HDS'};
  const OPS=[['TSEL',/telkomsel|simpati/i],['XL',/\bxl\b|flex/i],['ISAT',/indosat|im3/i],['SF',/smartfren/i],['BYU',/by\.?u\b/i]];
  const STOP=/^(PULSA|VOUCHER|KARTU|PERDANA|CHARGER|HEADSET|TELKOMSEL|XL|INDOSAT|SMARTFREN|BY|U|KABEL|DAN|DENGAN|PAKET)$/;
  function genKode(kat,nama){
    const n=(nama||'').trim();if(!n)return '';
    const op=(OPS.find(o=>o[1].test(n))||[])[0];
    const toks=n.toUpperCase().replace(/[^A-Z0-9 ]/g,' ').split(/\s+/).filter(t=>t&&!STOP.test(t)).slice(0,2).map(t=>t.slice(0,4));
    const base=[PFX[kat]||'PRD',op].concat(toks).filter(Boolean).join('-');
    let kode=base,i=2;
    while(db.produk.some(p=>p.kode===kode)){kode=base+'-'+i;i++}
    return kode;
  }
  function upKode(){$('#kode').value=genKode(kb.value,$('#nama').value)}
  function togg(){const pulsa=kb.value==='Pulsa';['stok-awal','stok-min','beli','jual'].forEach(id=>{$('#'+id).disabled=pulsa});if(pulsa){$('#stok-awal').value='0';$('#beli').value='';$('#jual').value=''}}
  kb.onchange=()=>{togg();upKode()};togg();
  $('#nama').oninput=upKode;
  ['beli','jual','stok-jml'].forEach(id=>{$('#'+id).oninput=e=>fmtInput(e.target)});
  function selStok(){$('#stok-prod').innerHTML=db.produk.filter(p=>p.stok!=null).map(p=>'<option value="'+p.id+'">'+esc(p.nama)+' (stok '+p.stok+')</option>').join('')}
  function log(){
    const L=db.stokLog.slice(0,5);
    $('#log').innerHTML=L.length?'<div class="tw"><table><thead><tr><th>Tanggal</th><th>Produk</th><th class="num">Jml</th></tr></thead><tbody>'+L.map(l=>'<tr><td class="nw">'+tglID(l.tgl)+'</td><td class="wrap">'+esc(l.nama)+(l.supplier?'<div class="sub">'+esc(l.supplier)+'</div>':'')+'</td><td class="num">+'+l.jml+'</td></tr>').join('')+'</tbody></table></div>':'<div class="empty">Belum ada catatan stok masuk.</div>';
  }
  selStok();log();
  function kasirDaftar(){
    const tid=user.tokoId||'demo';
    return akun.filter(a=>a.tokoId===tid&&a.role==='kasir');
  }
  function kasirList(){
    const L=kasirDaftar();
    $('#kasir-list').innerHTML=L.length?'<div class="tw"><table><thead><tr><th>Nama</th><th>Username</th><th></th></tr></thead><tbody>'+L.map(k=>'<tr><td>'+esc(k.nama)+'</td><td class="mono">'+esc(k.username)+'</td><td class="num">'+'<button type="button" class="btn ghost sm" data-hk="'+esc(k.username)+'">Hapus</button>'+'</td></tr>').join('')+'</tbody></table></div>':'<div class="empty">Belum ada akun kasir. Tambahkan kasir pertama di atas.</div>';
    $$('[data-hk]').forEach(b=>{let armed=false,tm=null;b.onclick=()=>{
      if(!armed){armed=true;b.textContent='Yakin hapus?';clearTimeout(tm);tm=setTimeout(()=>{armed=false;b.textContent='Hapus'},3500);return}
      akun=akun.filter(a=>a.username!==b.dataset.hk);saveAkun();kasirList();toast('Akun kasir dihapus');
    }});
  }
  kasirList();
  $('#f-kasir').onsubmit=e=>{
    e.preventDefault();
    const err=$('#err-kasir');err.textContent='';
    const nama=$('#k-nama').value.trim(),u=$('#k-user').value.trim().toLowerCase(),p=$('#k-pw').value;
    if(nama.length<2){err.textContent='Isi nama kasir.';return}
    if(!USERNAME_RE.test(u)){err.textContent='Username harus 4 sampai 20 karakter: huruf kecil, angka, atau garis bawah.';return}
    if(findAkun(u)){err.textContent='Username '+u+' sudah dipakai. Pilih username lain.';return}
    if(p.length<6){err.textContent='Password minimal 6 karakter.';return}
    akun.push({username:u,pw:p,nama:nama,role:'kasir',tokoId:user.tokoId||'demo',toko:tokoNama()});saveAkun();
    e.target.reset();kasirList();toast('Kasir '+nama+' ditambahkan');
  };
  $('#r-prod').onclick=()=>{setTimeout(()=>{togg();upKode();$('#err-prod').textContent=''},0)};
  $('#f-prod').onsubmit=e=>{
    e.preventDefault();
    const err=$('#err-prod');err.textContent='';
    const nama=$('#nama').value.trim(),kat=kb.value,beli=num($('#beli').value),jual=num($('#jual').value);
    if(!nama){err.textContent='Nama produk wajib diisi.';return}
    const kode=genKode(kat,nama);
    const digital=kat==='Pulsa';
    if(!digital&&!jual){err.textContent='Harga jual wajib diisi.';return}
    if(!digital&&jual<beli){err.textContent='Harga jual lebih rendah dari harga beli. Periksa kembali angkanya.';return}
    db.produk.push({id:Math.max.apply(null,db.produk.map(p=>p.id))+1,kode:kode,nama:nama,kat:kat,beli:beli,jual:jual,stok:digital?null:num($('#stok-awal').value),min:digital?0:num($('#stok-min').value)});
    save();e.target.reset();togg();upKode();selStok();toast('Produk '+nama+' tersimpan dengan kode '+kode);
  };
  $('#f-stok').onsubmit=e=>{
    e.preventDefault();
    const err=$('#err-stok');err.textContent='';
    const p=db.produk.find(x=>x.id==$('#stok-prod').value),jml=num($('#stok-jml').value),tgl=$('#stok-tgl').value;
    if(!p){err.textContent='Pilih produk yang stoknya ditambah.';return}
    if(jml<1){err.textContent='Jumlah masuk minimal 1.';return}
    if(!tgl){err.textContent='Isi tanggal masuk.';return}
    p.stok+=jml;db.stokLog.unshift({tgl:tgl,nama:p.nama,jml:jml,supplier:$('#stok-sup').value.trim()});
    save();$('#stok-jml').value='';$('#stok-sup').value='';selStok();log();
    toast('Stok '+p.nama+' sekarang '+p.stok);
  };
}

/* ================= OUTPUT 1: laporan (harian, bulanan, tahunan) ================= */
let lapMode='harian';
const BLN_PENUH=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const PREV_TXT={harian:'kemarin',bulanan:'bulan lalu',tahunan:'tahun lalu'};
function inPeriod(tgl,mode,key){return mode==='harian'?tgl===key:mode==='bulanan'?tgl.slice(0,7)===key:tgl.slice(0,4)===key}
function prevKey(mode,key){
  if(mode==='harian')return addDays(key,-1);
  if(mode==='bulanan'){let p=key.split('-'),y=+p[0],m=+p[1]-1;if(m<1){m=12;y--}return y+'-'+pad(m)}
  return String(+key-1);
}
function labelKey(mode,key){
  if(mode==='harian')return tglID(key);
  if(mode==='bulanan'){const p=key.split('-');return BLN_PENUH[+p[1]-1]+' '+p[0]}
  return 'tahun '+key;
}
function lapLaba(t){return t.items.reduce((a,i)=>a+i.qty*(i.jual-i.beli),0)}
function agg(mode,key){
  const T=db.transaksi.filter(t=>inPeriod(t.tgl,mode,key)),byK={},byM={};
  KAT.forEach(k=>byK[k]={qty:0,jual:0,laba:0});
  let total=0,laba=0,qty=0;
  T.forEach(t=>{total+=t.total;byM[t.metode]=(byM[t.metode]||0)+t.total;
    t.items.forEach(i=>{const s=i.qty*i.jual,l=i.qty*(i.jual-i.beli);byK[i.kat].qty+=i.qty;byK[i.kat].jual+=s;byK[i.kat].laba+=l;laba+=l;qty+=i.qty})});
  return {T:T,n:T.length,total:total,laba:laba,qty:qty,byK:byK,byM:byM};
}
function lapKey(){
  if(lapMode==='harian')return $('#l-tgl').value;
  const y=num($('#l-thn').value);
  if(y<2000||y>2100)return '';
  return lapMode==='bulanan'?y+'-'+pad(+$('#l-bln').value):String(y);
}
function vLaporan(v){
  const chips=[['harian','Harian'],['bulanan','Bulanan'],['tahunan','Tahunan']].map(m=>'<button type="button" class="chip'+(m[0]===lapMode?' on':'')+'" data-lm="'+m[0]+'" aria-pressed="'+(m[0]===lapMode)+'">'+m[1]+'</button>').join('');
  v.innerHTML=head('Laporan Penjualan','Ringkasan penjualan, laba, dan kategori terlaris per hari, bulan, atau tahun.')
  +'<div class="chips" role="group" aria-label="Jenis laporan">'+chips+'</div>'
  +'<div class="filters"><div class="f" id="f-tgl"><label for="l-tgl">Tanggal</label><input id="l-tgl" type="date"></div>'
  +'<div class="f" id="f-bln"><label for="l-bln">Bulan</label><select id="l-bln">'+BLN_PENUH.map((b,i)=>'<option value="'+(i+1)+'">'+b+'</option>').join('')+'</select></div>'
  +'<div class="f" id="f-thn"><label for="l-thn">Tahun</label><input id="l-thn" inputmode="numeric" maxlength="4" autocomplete="off"></div>'
  +'<button type="button" class="btn ghost" id="l-now"></button></div><div id="lap"></div>';
  function setNow(){const n=new Date();$('#l-tgl').value=dstr(n);$('#l-bln').value=String(n.getMonth()+1);$('#l-thn').value=String(n.getFullYear())}
  function showMode(){
    $('#f-tgl').hidden=lapMode!=='harian';$('#f-bln').hidden=lapMode!=='bulanan';$('#f-thn').hidden=lapMode==='harian';
    $('#l-now').textContent={harian:'Hari ini',bulanan:'Bulan ini',tahunan:'Tahun ini'}[lapMode];
  }
  setNow();showMode();
  $$('[data-lm]').forEach(b=>b.onclick=()=>{
    lapMode=b.dataset.lm;
    $$('[data-lm]').forEach(x=>{const on=x.dataset.lm===lapMode;x.classList.toggle('on',on);x.setAttribute('aria-pressed',on)});
    showMode();drawLaporan();
  });
  $('#l-tgl').oninput=drawLaporan;
  $('#l-bln').onchange=drawLaporan;
  $('#l-thn').oninput=e=>{e.target.value=e.target.value.replace(/\D/g,'').slice(0,4);drawLaporan()};
  $('#l-now').onclick=()=>{setNow();drawLaporan()};
  drawLaporan();
}
function drawLaporan(){
  const mode=lapMode,key=lapKey();
  const out=$('#lap');
  if(!key){out.innerHTML='<div class="card"><div class="empty">Isi '+(mode==='harian'?'tanggal':'tahun (4 angka, mis. '+new Date().getFullYear()+')')+' untuk menampilkan laporan.</div></div>';return}
  const a=agg(mode,key),prev=agg(mode,prevKey(mode,key)),low=lowStock().length,lbl=labelKey(mode,key);
  let delta='';
  if(prev.total>0){const p=Math.round((a.total-prev.total)/prev.total*100);delta='<div class="d '+(p>=0?'up':'down')+'">'+(p>=0?'Naik ':'Turun ')+Math.abs(p)+'% dari '+PREV_TXT[mode]+' ('+rp(prev.total)+')</div>'}
  const marginPct=a.total?Math.round(a.laba/a.total*1000)/10:0;
  let html='<div class="hero"><div class="stat big"><div class="l">Total penjualan, '+lbl+'</div><div class="v">'+rp(a.total)+'</div>'+delta+'</div>'
   +'<div class="stat"><div class="l">Laba kotor</div><div class="v">'+rp(a.laba)+'</div><div class="sub">Margin '+String(marginPct).replace('.',',')+'%</div></div>'
   +'<div class="stat"><div class="l">Transaksi</div><div class="v">'+a.n+'</div><div class="sub">'+a.qty+' item terjual</div></div>'
   +'<div class="stat"><div class="l">Stok menipis</div><div class="v">'+low+' produk</div><div class="sub"><a href="#stok">Lihat daftar stok</a></div></div></div>';
  if(!a.n){out.innerHTML=html+'<div class="card"><div class="empty">Belum ada transaksi pada '+lbl+'. Pilih periode lain atau catat transaksi lewat akun kasir.</div></div>';return}
  const bars=KAT.map(k=>{const r=a.byK[k],pc=a.total?r.jual/a.total*100:0;return '<div class="br"><div class="i"><span><span class="dot" style="background:'+kcol(k)+'"></span>'+k+' <span class="sub">('+r.qty+' terjual)</span></span><b class="num">'+rp(r.jual)+'</b></div><div class="tr"><div class="fl" style="width:'+pc.toFixed(1)+'%;background:'+kcol(k)+'"></div></div></div>'}).join('');
  const mets=Object.keys(a.byM).map(m=>'<div class="br"><div class="i"><span>'+esc(m)+'</span><b class="num">'+rp(a.byM[m])+'</b></div><div class="tr"><div class="fl" style="width:'+(a.byM[m]/a.total*100).toFixed(1)+'%;background:var(--accent)"></div></div></div>').join('');
  const rows=KAT.map(k=>{const r=a.byK[k];return '<tr><td><span class="dot" style="background:'+kcol(k)+'"></span>'+k+'</td><td class="num">'+r.qty+'</td><td class="num">'+rp(r.jual)+'</td><td class="num">'+rp(r.laba)+'</td></tr>'}).join('');
  html+='<div class="cols2"><section class="card"><h2>Penjualan per kategori</h2>'+bars+'</section><section class="card"><h2>Rincian penjualan dan laba</h2><div class="tw"><table><thead><tr><th>Kategori</th><th class="num">Terjual</th><th class="num">Penjualan</th><th class="num">Laba</th></tr></thead><tbody>'+rows+'</tbody><tfoot><tr><td>Total</td><td class="num">'+a.qty+'</td><td class="num">'+rp(a.total)+'</td><td class="num">'+rp(a.laba)+'</td></tr></tfoot></table></div></section></div>';
  if(mode!=='harian'){
    const G={};
    a.T.forEach(t=>{const g=mode==='bulanan'?t.tgl:t.tgl.slice(0,7);const o=G[g]||(G[g]={n:0,total:0,laba:0});o.n++;o.total+=t.total;o.laba+=lapLaba(t)});
    let keys;
    if(mode==='bulanan')keys=Object.keys(G).sort();
    else keys=BLN_PENUH.map((b,i)=>key+'-'+pad(i+1));
    const name=g=>mode==='bulanan'?tglID(g):BLN_PENUH[+g.slice(5)-1];
    const max=Math.max.apply(null,keys.map(g=>(G[g]||{total:0}).total));
    const trows=keys.map(g=>{const o=G[g]||{n:0,total:0,laba:0};return '<tr><td class="nw">'+name(g)+'</td><td class="num">'+o.n+'</td><td class="num">'+rp(o.total)+'</td><td class="num">'+rp(o.laba)+'</td><td style="min-width:120px"><div class="tr" style="height:8px"><div class="fl" style="width:'+(max?(o.total/max*100).toFixed(1):0)+'%;background:var(--accent)"></div></div></td></tr>'}).join('');
    html+='<section class="card" style="margin-top:16px"><h2>Rincian per '+(mode==='bulanan'?'hari':'bulan')+'</h2><div class="tw"><table><thead><tr><th>'+(mode==='bulanan'?'Tanggal':'Bulan')+'</th><th class="num">Transaksi</th><th class="num">Penjualan</th><th class="num">Laba</th><th></th></tr></thead><tbody>'+trows+'</tbody><tfoot><tr><td>Total</td><td class="num">'+a.n+'</td><td class="num">'+rp(a.total)+'</td><td class="num">'+rp(a.laba)+'</td><td></td></tr></tfoot></table></div></section>';
  }
  html+='<section class="card" style="margin-top:16px"><h2>Penjualan per metode bayar</h2>'+mets+'</section>';
  out.innerHTML=html;
}

/* ================= OUTPUT 2: riwayat ================= */
function vRiwayat(v){
  const today=dstr(new Date());
  v.innerHTML=head('Riwayat Transaksi',user.role==='kasir'?'Daftar transaksi yang Anda catat.':'Semua transaksi yang tercatat, bisa disaring menurut tanggal dan kategori.')
  +'<section class="card"><div class="filters"><div class="f"><label for="r-dari">Dari tanggal</label><input id="r-dari" type="date"></div><div class="f"><label for="r-sampai">Sampai tanggal</label><input id="r-sampai" type="date"></div>'
  +'<div class="f"><label for="r-kat">Kategori</label><select id="r-kat"><option value="">Semua</option>'+KAT.map(k=>'<option>'+k+'</option>').join('')+'</select></div>'
  +'<div class="f"><label for="r-cari">Cari</label><input id="r-cari" placeholder="No. transaksi, nomor, produk" autocomplete="off"></div></div>'
  +'<div class="quick" style="margin:-4px 0 16px"><button type="button" class="btn ghost sm" data-rg="0">Hari ini</button><button type="button" class="btn ghost sm" data-rg="7">7 hari</button><button type="button" class="btn ghost sm" data-rg="all">Semua tanggal</button><span style="flex:1"></span><button type="button" class="btn sm" id="r-export">Unduh Excel (.xlsx)</button></div>'
  +(EMBEDDED?'<p class="hint" style="margin:-6px 0 14px">Cetak struk aktif di file HTML mandiri yang dibuka langsung di browser.</p>':'')
  +'<div id="riw"></div></section>';
  $('#r-dari').value=today;$('#r-sampai').value=today;
  ['r-dari','r-sampai','r-kat','r-cari'].forEach(id=>{$('#'+id).oninput=drawRiwayat});
  $$('[data-rg]').forEach(b=>b.onclick=()=>{
    const g=b.dataset.rg;
    if(g==='all'){$('#r-dari').value='';$('#r-sampai').value=''}
    else{$('#r-dari').value=addDays(today,-(+g));$('#r-sampai').value=today}
    drawRiwayat();
  });
  $('#r-export').onclick=exportRiwayat;
  drawRiwayat();
}
function drawRiwayat(){
  const d=$('#r-dari').value,s=$('#r-sampai').value,k=$('#r-kat').value,q=$('#r-cari').value.trim().toLowerCase();
  let L=db.transaksi.filter(t=>(!d||t.tgl>=d)&&(!s||t.tgl<=s));
  if(user.role==='kasir')L=L.filter(t=>t.kasir===user.nama);
  if(k)L=L.filter(t=>t.items.some(i=>i.kat===k));
  if(q)L=L.filter(t=>t.no.toLowerCase().indexOf(q)>=0||t.items.some(i=>(i.tujuan||'').indexOf(q)>=0||i.nama.toLowerCase().indexOf(q)>=0));
  L.sort((a,b)=>(b.tgl+b.jam+b.no).localeCompare(a.tgl+a.jam+a.no));
  riwayatList=L.slice();
  const w=$('#riw');
  if(!L.length){w.innerHTML='<div class="empty">Tidak ada transaksi yang cocok dengan penyaring ini.</div>';return}
  const sum=L.reduce((a,t)=>a+t.total,0);
  w.innerHTML='<div class="tw"><table><thead><tr><th>No. transaksi</th><th>Waktu</th><th>Item</th><th class="num">Total</th><th>Metode</th><th>Kasir</th><th></th></tr></thead><tbody>'
   +L.map(t=>'<tr><td class="nw mono">'+esc(t.no)+'</td><td class="nw">'+tglID(t.tgl)+'<div class="sub">'+esc(t.jam)+'</div></td><td class="wrap">'
     +t.items.map(i=>'<div><span class="dot" style="background:'+kcol(i.kat)+'"></span>'+i.qty+' × '+esc(i.nama)+(i.tujuan?' <span class="sub mono">'+esc(i.tujuan)+'</span>':'')+'</div>').join('')
     +'</td><td class="num">'+rp(t.total)+'</td><td><span class="pill mute">'+esc(t.metode)+'</span></td><td class="nw">'+esc(t.kasir)+'</td><td><button type="button" class="btn ghost sm" data-no="'+esc(t.no)+'">Struk</button></td></tr>').join('')
   +'</tbody><tfoot><tr><td colspan="3">'+L.length+' transaksi</td><td class="num">'+rp(sum)+'</td><td colspan="3"></td></tr></tfoot></table></div>';
  $$('[data-no]',w).forEach(b=>b.onclick=()=>{const t=db.transaksi.find(x=>x.no===b.dataset.no);if(t)openStruk(t)});
}

/* ================= OUTPUT 3: stok ================= */
let stokKat='';
function vStok(v){
  const low=lowStock();
  v.innerHTML=head('Stok Produk','Sisa stok setiap produk. Pulsa memakai saldo digital sehingga tidak dihitung per unit.')
  +(low.length?'<div class="banner"><span>'+low.length+' produk di bawah batas stok minimum: '+low.map(p=>esc(p.nama)).join(', ')+'.</span>'+(user.role==='admin'?'<a href="#produk">Tambah stok</a>':'')+'</div>':'')
  +'<section class="card"><div class="chips" id="s-chips"></div><div id="stok-tbl"></div></section>';
  function chips(){
    $('#s-chips').innerHTML=['Semua'].concat(KAT).map(k=>{const val=k==='Semua'?'':k;return '<button type="button" class="chip'+(val===stokKat?' on':'')+'" data-sk="'+val+'" aria-pressed="'+(val===stokKat)+'">'+(val?'<i style="background:'+kcol(k)+'"></i>':'')+k+'</button>'}).join('');
    $$('[data-sk]').forEach(b=>b.onclick=()=>{stokKat=b.dataset.sk;chips();tbl()});
  }
  function tbl(){
    const L=db.produk.filter(p=>!stokKat||p.kat===stokKat);
    $('#stok-tbl').innerHTML='<div class="tw"><table><thead><tr><th>Kode</th><th>Nama produk</th><th>Kategori</th><th class="num">Harga beli</th><th class="num">Harga jual</th><th class="num">Stok</th><th class="num">Min.</th><th>Status</th></tr></thead><tbody>'
     +L.map(p=>{
       const dig=p.stok==null,lo=!dig&&p.stok<p.min,hab=!dig&&p.stok===0;
       return '<tr><td class="nw mono">'+esc(p.kode)+'</td><td class="wrap">'+esc(p.nama)+'</td><td class="nw"><span class="dot" style="background:'+kcol(p.kat)+'"></span>'+p.kat+'</td><td class="num">'+(p.kat==='Pulsa'?'—':rp(p.beli))+'</td><td class="num">'+(p.kat==='Pulsa'?'Diketik saat transaksi':rp(p.jual))+'</td><td class="num">'+(dig?'—':p.stok)+'</td><td class="num">'+(dig?'—':p.min)+'</td><td>'+(dig?'<span class="pill mute">Saldo digital</span>':hab?'<span class="pill bad">Habis</span>':lo?'<span class="pill warn">Menipis</span>':'<span class="pill ok">Aman</span>')+'</td></tr>';
     }).join('')+'</tbody></table></div>';
  }
  chips();tbl();
}

/* ================= mulai ================= */
route();
})();