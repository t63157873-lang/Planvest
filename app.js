/***** داده‌های نمونه *****/
const packages = [
  {
    id: "pkg-basic-1",
    name: "پکیج برنز",
    category: "basic",
    price: "68$",
    short: "مناسب برای تست و سرمایه گذاری های شخصی",
    features: {
      فضای_کاربر: "1",
      پشتیبانی: "ایمیل (24 ساعت)",
      کاربران: "حداکثر 2",
      دامنه_سفارشی: "ندارد",
      گزارشات: "محدود"
    }
  },
  {
    id: "pkg-pro-1",
    name: "پکیج نقره ای",
    category: "pro",
    price: "112$",
    short: "مناسب استارتاپ‌ها و تیم‌های کوچک",
    features: {
      فضای_کاربر: "1",
      پشتیبانی: "ایمیل (24/7)",
      کاربران: "تا 5 کاربر",
      دامنه_سفارشی: "ندارد",
      گزارشات: "پیشرفته"
    }
  },
  {
    id: "pkg-enterprise-1",
    name: "پکیج طلایی",
    category: "enterprise",
    price: "1050$",
    short: "سفارشی‌سازی برای سازمان ها",
    features: {
      فضای_کاربر: "1",
      پشتیبانی: "ایمیل 24/7",
      کاربران: "50",
      دامنه_سفارشی: "ندارد",
      گزارشات: "پیشرفته"
    }
  },
  {
    id: "pkg-pro-2",
    name: "پکیج الماس",
    category: "pro",
    price: "10000$",
    short: "برای تیم‌های بزرگ",
    features: {
      فضای_کاربر: "1",
      پشتیبانی: "چت و تماس اختصاصی",
      کاربران: "تا 500 کاربر",
      دامنه_سفارشی: "ندارد",
      گزارشات: "پیشرفته + API"
    }
  }
];

// المان‌ها
let selected = null;
const listEl = document.getElementById('list');
const detailsEl = document.getElementById('details');
const emptyEl = document.getElementById('empty');
const summaryEl = document.getElementById('summary');
const searchInput = document.getElementById('search');
const filterSelect = document.getElementById('filter');
const compareSet = new Set();

// لیست
function renderList(){
  const q = searchInput.value.trim().toLowerCase();
  const cat = filterSelect.value;
  listEl.innerHTML = '';

  const filtered = packages.filter(p => {
    const matchesCat = (cat === 'all') ? true : (p.category === cat);
    const matchesQ = q === '' ? true :
      p.name.toLowerCase().includes(q) ||
      (p.short || '').toLowerCase().includes(q) ||
      Object.values(p.features).join(' ').toLowerCase().includes(q);
    return matchesCat && matchesQ;
  });

  if(filtered.length === 0){
    listEl.innerHTML = '<div class="empty">نتیجه‌ای یافت نشد.</div>';
    return;
  }

  filtered.forEach(p => {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = p.id;
    card.innerHTML = `
      <div class="card-icon">${p.name.split(' ')[0].slice(0,2)}</div>
      <div class="meta">
        <div class="title">${p.name} <span class="text-muted price">- ${p.price}</span></div>
        <div class="desc">${p.short}</div>
      </div>
      <div class="card-meta">
        <div class="badge">${p.category}</div>
        <div class="features-count">${Object.keys(p.features).length} ویژگی</div>
      </div>
    `;
    card.addEventListener('click', ()=> selectPackage(p.id));
    listEl.appendChild(card);
  });
}

// جزئیات
function selectPackage(id){
  const pkg = packages.find(x => x.id === id);
  if(!pkg) return;
  selected = pkg;
  detailsEl.innerHTML = `
    <div class="detail-header">
      <div>
        <div class="title" style="font-size:18px;font-weight:800">${pkg.name}</div>
        <div class="desc" style="color:var(--muted);margin-top:6px">${pkg.short}</div>
        <div style="margin-top:8px"><strong class="badge">${pkg.price}</strong></div>
      </div>
      <div>
        <button id="compareBtn" class="btn-secondary">افزودن به مقایسه</button>
      </div>
    </div>
    <div class="specs"></div>
  `;
  const specsEl = detailsEl.querySelector('.specs');
  for(const [k,v] of Object.entries(pkg.features)){
    const s = document.createElement('div');
    s.className = 'spec';
    s.innerHTML = `<h4>${k.replaceAll('_',' ')}</h4><div style="color:var(--muted)">${v}</div>`;
    specsEl.appendChild(s);
  }
  document.getElementById('compareBtn').addEventListener('click', ()=> {
    toggleCompare(pkg.id);
  });
}

// مقایسه
function toggleCompare(id){
  if(compareSet.has(id)) compareSet.delete(id);
  else compareSet.add(id);
  renderSummary();
}

function renderSummary(){
  if(compareSet.size === 0){
    summaryEl.textContent = 'برای مقایسه، حداقل دو پکیج را انتخاب کن.';
    return;
  }
  const arr = Array.from(compareSet).map(id => packages.find(p=>p.id===id));
  let html = '<div style="display:flex;gap:12px;overflow:auto">';
  arr.forEach(p=>{
    html += `<div class="spec bg-glass">
      <div style="font-weight:800">${p.name}</div>
      <div style="color:var(--muted);font-size:13px">${p.price}</div>
      <hr style="opacity:.06;margin:8px 0">
      <div style="font-size:13px;color:var(--muted)">
        ${Object.entries(p.features).map(([k,v])=>`<div><strong>${k.replaceAll('_',' ')}:</strong> ${v}</div>`).join('')}
      </div>
    </div>`;
  });
  html += '</div>';
  summaryEl.innerHTML = html;
}

// ارسال ایمیل
const sendBtn = document.getElementById('sendEmailBtn');
sendBtn.addEventListener('click', () => {
  if(!selected){
    alert("لطفاً ابتدا یک پکیج انتخاب کنید.");
    return;
  }
  const subject = `درخواست اطلاعات پکیج: ${selected.name}`;
  const body = `
نام پکیج: ${selected.name}
قیمت: ${selected.price}
توضیح کوتاه: ${selected.short}

ویژگی‌ها:
${Object.entries(selected.features).map(([k,v]) => `${k}: ${v}`).join("\n")}
  `;
  const email = "planvestfirst@gmail.com";
  window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});

// init
renderList();
renderSummary();
searchInput.addEventListener('input', ()=> renderList());
filterSelect.addEventListener('change', ()=> renderList());
