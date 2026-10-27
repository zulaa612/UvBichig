const $ = s => document.querySelector(s);
const S = { get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set(k, v) { localStorage.setItem(k, JSON.stringify(v)); } };
const esc = t => { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; };
const users = () => S.get('users', []), posts = () => S.get('posts', []), comms = () => S.get('comms', []);
const meId = () => S.get('session', null), me = () => users().find(u => u.id === meId());
const user = id => users().find(u => u.id === id);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const st = (el, t, m) => { el.className = 'status ' + t; el.textContent = m; };
const TYPES = { note: ' Тэмдэглэл', question: ' Асуулт', confused: ' Ойлгоогүй', research: ' Судалгаа', info: ' Мэдээлэл' };
async function sha(t) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
async function unis() { const r = await fetch('data/universities.json'); if (!r.ok) throw 0; return r.json(); }   // AJAX + JSON
const saveUsers = fn => { const u = users(); fn(u); S.set('users', u); };
const av = n => `<span class="av">${esc((n || '?').trim()[0] || '?')}</span>`;
const guard = () => meId() && me() ? true : (location.href = 'login.html', false);

function initNav() {
  const m = me(), box = $('#user');
  box.innerHTML = m ? `<a href="profile.html">${esc(m.name)}</a> <button class="ghost" id="out">Гарах</button>` : '<a href="login.html" class="btn">Нэвтрэх</a>';
  if ($('#out')) $('#out').onclick = () => { localStorage.removeItem('session'); location.href = 'index.html'; };
  document.querySelectorAll('nav a').forEach(a => { if (a.getAttribute('href') === location.pathname.split('/').pop()) a.classList.add('on'); });
}
function postHTML(p) {
  const a = user(p.uid) || { name: 'Устгагдсан', uni: '' }, m = meId(), c = p.cid && comms().find(x => x.id === p.cid);
  return `<article class="card post"><div class="ph">${av(a.name)}<div><a href="profile.html?u=${p.uid}"><b>${esc(a.name)}</b></a><small>${esc(a.uni)} · ${new Date(p.t).toLocaleDateString('mn-MN')}</small></div></div>
  <div class="row"><span class="tag">${TYPES[p.type]}</span>${c ? `<span class="tag">👥 ${esc(c.name)}</span>` : ''}${p.tags.map(t => `<span class="tag">#${esc(t)}</span>`).join('')}</div>
  <h3>${esc(p.title)}</h3><p class="body">${esc(p.body)}</p>
  <div class="row"><button class="ghost" data-like="${p.id}">${p.likes.includes(m) ? '❤️' : '🤍'} ${p.likes.length}</button>${p.uid === m ? `<button class="ghost" data-del="${p.id}">Устгах</button>` : ''}</div>
  <div class="cms">${p.comments.map(k => `<div class="cm-i"><a href="profile.html?u=${k.uid}">${esc((user(k.uid) || {}).name || '?')}</a>: ${esc(k.text)}</div>`).join('')}</div>
  <form class="cm send" data-id="${p.id}"><input required maxlength="300" placeholder="Хариулт / сэтгэгдэл..." aria-label="Сэтгэгдэл"><button>Илгээх</button></form></article>`;
}
function bindPosts(el, redraw) {
  el.onclick = e => {
    const l = e.target.dataset.like, d = e.target.dataset.del, ps = posts(), m = meId();
    if (l) { const p = ps.find(x => x.id === l); p.likes = p.likes.includes(m) ? p.likes.filter(x => x !== m) : [...p.likes, m]; S.set('posts', ps); redraw(); }
    if (d && confirm('Энэ нийтлэлийг устгах уу?')) { S.set('posts', ps.filter(x => x.id !== d)); redraw(); }
  };
  el.onsubmit = e => {
    e.preventDefault(); const ps = posts(), p = ps.find(x => x.id === e.target.dataset.id);
    p.comments.push({ uid: meId(), text: e.target.firstElementChild.value.trim(), t: Date.now() }); S.set('posts', ps); redraw();
  };
}
function fillUnis(sel, first) {
  return unis().then(l => { sel.innerHTML = (first ? `<option value="">${first}</option>` : '') + l.map(x => `<option>${esc(x)}</option>`).join(''); });
}
function toggleFriend(id) {
  const m = meId(); saveUsers(u => { const a = u.find(x => x.id === m), b = u.find(x => x.id === id);
    if (a.friends.includes(id)) { a.friends = a.friends.filter(x => x !== id); b.friends = b.friends.filter(x => x !== m); }
    else { a.friends.push(id); b.friends.push(m); } });
}

const pages = {
  login() {
    const s = $('#st'); fillUnis($('#uni')).catch(() => st(s, 'err', 'Их сургуулийн жагсаалт ачаалж чадсангүй. Локал сервер (Live Server) ашиглана уу.'));
    $('#reg').onsubmit = async e => {
      e.preventDefault(); const em = $('#remail').value.trim().toLowerCase();
      if (users().some(u => u.email === em)) return st(s, 'err', 'Энэ имэйл бүртгэлтэй байна.');
      const u = { id: uid(), name: $('#name').value.trim(), email: em, pass: await sha($('#rpass').value), uni: $('#uni').value, major: $('#major').value.trim(), year: $('#year').value, bio: '', friends: [] };
      saveUsers(a => a.push(u)); S.set('session', u.id); location.href = 'feed.html';
    };
    $('#log').onsubmit = async e => {
      const h = await sha($('#pass').value), f = users().find(x => x.email === $('#email').value.trim().toLowerCase() && x.pass === h);
      if (!f) return st(s, 'err', 'Имэйл эсвэл нууц үг буруу байна.');
      S.set('session', f.id); location.href = 'feed.html';
    };
  },
  feed() {
    if (!guard()) return;
    const s = $('#st'), list = $('#list'), cid = new URLSearchParams(location.search).get('c'), c = cid && comms().find(x => x.id === cid);
    if (cid && (!c || !c.members.includes(meId()))) return st(s, 'err', 'Нийгэмлэг олдсонгүй эсвэл та гишүүн биш байна.');
    if (c) $('#title').textContent = '👥 ' + c.name;
    $('#cid').innerHTML = '<option value="">Нийтэд</option>' + comms().filter(x => x.members.includes(meId())).map(x => `<option value="${x.id}"${x.id === cid ? ' selected' : ''}>${esc(x.name)}</option>`).join('');
    const draw = () => {
      const q = $('#q').value.toLowerCase(), ty = $('#ty').value, fo = $('#fo').checked, m = me(), mine = comms().filter(x => x.members.includes(m.id)).map(x => x.id);
      const arr = posts().filter(p => (cid ? p.cid === cid : !p.cid || mine.includes(p.cid)) && (!ty || p.type === ty) && (!fo || p.uid === m.id || m.friends.includes(p.uid))
        && (p.title + p.body + p.tags.join(' ') + ((user(p.uid) || {}).uni || '')).toLowerCase().includes(q)).sort((a, b) => b.t - a.t);
      list.innerHTML = arr.map(postHTML).join('');
      arr.length ? s.className = 'status' : st(s, 'empty', 'Нийтлэл олдсонгүй. Эхний нийтлэлээ оруулаарай!');
    };
    $('#f').onsubmit = e => {
      e.preventDefault(); const ps = posts();
      ps.push({ id: uid(), uid: meId(), type: $('#type').value, title: $('#ptitle').value.trim(), body: $('#body').value.trim(), cid: $('#cid').value || null, t: Date.now(), likes: [], comments: [],
        tags: $('#tags').value.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean).slice(0, 5) });
      S.set('posts', ps); e.target.reset(); $('#cid').value = cid || ''; draw();
    };
    ['q', 'ty', 'fo'].forEach(i => $('#' + i).oninput = draw); bindPosts(list, draw); draw();
  },
  comms() {
    if (!guard()) return;
    const s = $('#st'), list = $('#list'), m = meId();
    const draw = () => {
      const cs = comms();
      list.innerHTML = cs.map(c => { const j = c.members.includes(m);
        return `<div class="card"><h3>${esc(c.name)}</h3><p class="muted">${esc(c.desc)}</p><span class="tag">${c.members.length} гишүүн</span>
        <div class="row">${j ? `<a class="btn" href="feed.html?c=${c.id}">Нээх</a><button class="ghost" data-leave="${c.id}">Гарах</button>` : `<button data-join="${c.id}">Нэгдэх</button>`}</div></div>`; }).join('');
      cs.length ? s.className = 'status' : st(s, 'empty', 'Нийгэмлэг алга. Эхнийхийг нь үүсгээрэй!');
    };
    const mut = fn => { const cs = comms(); fn(cs); S.set('comms', cs); draw(); };
    $('#f').onsubmit = e => { e.preventDefault(); mut(cs => cs.push({ id: uid(), name: $('#name').value.trim(), desc: $('#desc').value.trim(), uid: m, members: [m] })); e.target.reset(); };
    list.onclick = e => { const j = e.target.dataset.join, l = e.target.dataset.leave;
      if (j) mut(cs => cs.find(x => x.id === j).members.push(m));
      if (l) mut(cs => { const c = cs.find(x => x.id === l); c.members = c.members.filter(x => x !== m); }); };
    draw();
  },
  people() {
    if (!guard()) return;
    const s = $('#st'), list = $('#list'); st(s, 'loading', 'Ачаалж байна...');
    const draw = () => {
      const q = $('#q').value.toLowerCase(), un = $('#uni').value, m = me();
      const arr = users().filter(u => u.id !== m.id && (!un || u.uni === un) && (u.name + u.major).toLowerCase().includes(q));
      list.innerHTML = arr.map(u => `<div class="card"><div class="ph">${av(u.name)}<div><a href="profile.html?u=${u.id}"><b>${esc(u.name)}</b></a><small>${esc(u.uni)} · ${esc(u.major)} · ${esc(u.year)}-р курс</small></div></div>
        <div class="row"><button class="${m.friends.includes(u.id) ? 'ghost' : ''}" data-f="${u.id}">${m.friends.includes(u.id) ? 'Найзаас хасах' : 'Найз болох'}</button></div></div>`).join('');
      arr.length ? s.className = 'status' : st(s, 'empty', 'Оюутан олдсонгүй.');
    };
    fillUnis($('#uni'), 'Бүх сургууль').then(draw).catch(() => st(s, 'err', 'Жагсаалт ачаалж чадсангүй.'));
    ['q', 'uni'].forEach(i => $('#' + i).oninput = draw);
    list.onclick = e => { if (e.target.dataset.f) { toggleFriend(e.target.dataset.f); draw(); } };
  },
  profile() {
    if (!guard()) return;
    const id = new URLSearchParams(location.search).get('u') || meId(), mine = id === meId(), s = $('#st'), plist = $('#plist');
    if (!user(id)) return st(s, 'err', 'Хэрэглэгч олдсонгүй.');
    const draw = () => {
      const u = user(id), fr = me().friends.includes(id), my = posts().filter(p => p.uid === id).sort((a, b) => b.t - a.t);
      $('#box').innerHTML = `<div class="ph">${av(u.name)}<h1 style="margin:0">${esc(u.name)}</h1></div><p class="muted">${esc(u.uni)} · ${esc(u.major)} · ${esc(u.year)}-р курс</p><p>${esc(u.bio || 'Танилцуулга оруулаагүй байна.')}</p>
        <span class="tag">${u.friends.length} найз</span> <span class="tag">${my.length} нийтлэл</span>
        ${mine ? '' : `<div class="row"><button id="fr">${fr ? 'Найзаас хасах' : 'Найз болох'}</button></div>`}
        <h3>Найзууд</h3><div class="row">${u.friends.map(f => `<a class="tag" href="profile.html?u=${f}">${esc((user(f) || {}).name || '?')}</a>`).join('') || '<span class="muted">Одоогоор алга</span>'}</div>`;
      if ($('#fr')) $('#fr').onclick = () => { toggleFriend(id); draw(); };
      plist.innerHTML = my.map(postHTML).join(''); my.length ? s.className = 'status' : st(s, 'empty', 'Нийтлэл алга байна.');
    };
    if (mine) { const u = me(), f = $('#ed'); f.hidden = false; $('#bio').value = u.bio; $('#emajor').value = u.major; $('#eyear').value = u.year;
      f.onsubmit = e => { e.preventDefault(); saveUsers(a => { const x = a.find(y => y.id === id); x.bio = $('#bio').value.trim(); x.major = $('#emajor').value.trim(); x.year = $('#eyear').value; }); draw(); st(s, 'ok', 'Профайл хадгалагдлаа.'); }; }
    bindPosts(plist, draw); draw();
  }
};
initNav(); const p = document.body.dataset.page; if (pages[p]) pages[p]();
