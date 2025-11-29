/* CONFIG
  If you want to serve product/voucher JSON from GitHub raw,
  set RAW_BASE to your repo raw base:
  e.g. https://raw.githubusercontent.com/USERNAME/REPO/main/
*/
const RAW_BASE = ""; // <-- optional: put your raw base URL here (leave "" for localStorage fallback)
const ADMIN_PHONE = "6281234567890"; // admin WhatsApp number for notifications (prefix country code)
const RAW_PRODUCTS = (RAW_BASE ? RAW_BASE + "products.json" : null);
const RAW_VOUCHERS = (RAW_BASE ? RAW_BASE + "vouchers.json" : null);

// state
let products = JSON.parse(localStorage.getItem("products")) || [];
let vouchers = JSON.parse(localStorage.getItem("vouchers")) || [];
let cart = [];
let activeVoucher = null;

// init
document.addEventListener("DOMContentLoaded", async () => {
  await loadData();
  renderProducts();
  updateCartCount();
  document.getElementById("openAdminBtn").addEventListener("click", () => {
    window.location.href = "admin.html";
  });
  document.getElementById("openCartBtn").addEventListener("click", openCart);
  document.getElementById("uploadProof").addEventListener("change", handleProofUpload);
});

async function loadData(){
  if(RAW_PRODUCTS){
    try{
      const p = await fetch(RAW_PRODUCTS).then(r=>r.json());
      products = p;
      document.getElementById("rawNote").textContent = "raw/github";
    }catch(e){
      console.warn("RAW products failed, fallback to localStorage");
      document.getElementById("rawNote").textContent = "local";
    }
  }else{
    // ensure sample data if empty
    if(!products.length){
      products = [
        {id:1,name:"E-book Panduan",price:150000,desc:"E-book digital",img:"https://picsum.photos/seed/ebook/600/400",qris:""},
        {id:2,name:"Template Premium",price:250000,desc:"Template website",img:"https://picsum.photos/seed/template/600/400",qris:""},
        {id:3,name:"Kursus JS",price:350000,desc:"Kursus online",img:"https://picsum.photos/seed/course/600/400",qris:""}
      ];
      localStorage.setItem("products", JSON.stringify(products));
    }
  }

  if(RAW_VOUCHERS){
    try{
      const v = await fetch(RAW_VOUCHERS).then(r=>r.json());
      vouchers = v;
    }catch(e){
      console.warn("RAW vouchers failed");
    }
  }else{
    if(!vouchers.length){
      vouchers = [{code:"RIKY10",type:"percent",value:10},{code:"DISK50",type:"nominal",value:50000}];
      localStorage.setItem("vouchers", JSON.stringify(vouchers));
    }
  }
}

function renderProducts(){
  const grid = document.getElementById("productGrid");
  grid.innerHTML = "";
  products.forEach(p=>{
    const el = document.createElement("div");
    el.className="card";
    el.innerHTML = `
      <img src="${p.img||''}">
      <h4>${escapeHtml(p.name)}</h4>
      <p class="kv">${escapeHtml(p.desc||'')}</p>
      <p><b>Rp ${numberWithCommas(p.price)}</b></p>
      <div class="row">
        <button class="btn small" onclick="addToCart(${p.id})">Tambah</button>
        ${p.qris ? `<button class="btn small" onclick="showQris('${p.qris}')">QRIS</button>` : ""}
        <button class="btn small" onclick="openWhatsAppQuick('${p.id}')">WA Beli</button>
      </div>
    `;
    grid.appendChild(el);
  });
}

function addToCart(id){
  const p = products.find(x=>x.id==id);
  if(!p) return alert("Produk tidak ditemukan");
  cart.push(p);
  updateCartCount();
  openCart();
  renderCart();
}

function updateCartCount(){
  document.getElementById("cartCount").textContent = cart.length;
}

function openCart(){
  document.getElementById("cartModal").classList.add("show");
  renderCart();
}
function closeCart(){ document.getElementById("cartModal").classList.remove("show"); }

function renderCart(){
  const list = document.getElementById("cartList");
  list.innerHTML = "";
  let total = 0;
  cart.forEach((p, i)=>{
    total += p.price;
    const div = document.createElement("div");
    div.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center">
      <div><b>${escapeHtml(p.name)}</b><div class="hint">Rp ${numberWithCommas(p.price)}</div></div>
      <div><button class="btn small" onclick="removeCart(${i})">Hapus</button></div>
    </div>`;
    list.appendChild(div);
  });

  if(activeVoucher){
    if(activeVoucher.type==="percent"){
      const disc = Math.round(total * (activeVoucher.value/100));
      total = Math.max(0, total - disc);
    }else{
      total = Math.max(0, total - activeVoucher.value);
    }
    document.getElementById("voucherMsg").textContent = `Voucher ${activeVoucher.code} aktif`;
  }else{
    document.getElementById("voucherMsg").textContent = "";
  }

  document.getElementById("cartTotal").textContent = "Rp " + numberWithCommas(total);
}

function removeCart(i){
  cart.splice(i,1);
  updateCartCount();
  renderCart();
}

function clearCart(){ cart=[]; updateCartCount(); renderCart(); }

function applyVoucher(){
  const code = document.getElementById("voucherInput").value.trim().toUpperCase();
  const found = vouchers.find(v=>v.code===code);
  if(!found) return alert("Voucher tidak valid");
  activeVoucher = found;
  renderCart();
  alert("Voucher diterapkan: " + found.code);
}

/* QRIS handling */
function showQris(url){
  document.getElementById("qrisImg").src = url;
  document.getElementById("qrisModal").classList.add("show");
}
function closeQris(){ document.getElementById("qrisModal").classList.remove("show"); }
function confirmTransfer(){
  // open confirmation and allow upload proof
  closeQris();
  alert("Silakan upload bukti transfer pada form keranjang lalu tekan 'Bayar' (WhatsApp) atau hubungi admin.");
}

/* WhatsApp auto checkout:
   Compose message with cart items, total, buyer name/email (if provided),
   and open wa.me link to admin.
*/
function whatsappCheckout(){
  const name = document.getElementById("buyerName").value || "Pembeli";
  const email = document.getElementById("buyerEmail").value || "-";
  if(!cart.length) return alert("Keranjang kosong");
  let total = cart.reduce((s,p)=>s+p.price,0);
  if(activeVoucher){
    if(activeVoucher.type==="percent") total = total - Math.round(total*(activeVoucher.value/100));
    else total = total - activeVoucher.value;
  }
  const items = cart.map(p=>`- ${p.name} (Rp ${numberWithCommas(p.price)})`).join("%0A");
  const message = encodeURIComponent(`Halo admin,%0ASaya ingin membeli:%0A${items}%0ATotal: Rp ${numberWithCommas(total)}%0AName: ${name}%0AEmail: ${email}%0AVoucher: ${activeVoucher?activeVoucher.code:'-'}`);
  const wa = `https://wa.me/${ADMIN_PHONE}?text=${message}`;
  window.open(wa, "_blank");
}

/* Proof upload (convert to dataURL and store with purchase in localStorage) */
let lastProofDataUrl = null;
function handleProofUpload(e){
  const f = e.target.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = function(ev){
    lastProofDataUrl = ev.target.result;
    const preview = document.getElementById("uploadPreview");
    preview.innerHTML = `<img src="${lastProofDataUrl}" style="max-width:120px;border-radius:8px">`;
  }
  reader.readAsDataURL(f);
}

/* startPayment (simulate storing transaction locally and offering export / send to admin)
  Also supports POST to backend server to commit JSON to GitHub (see server.js)
*/
async function startPayment(){
  const name = document.getElementById("buyerName").value || "Pembeli";
  const email = document.getElementById("buyerEmail").value || "-";
  if(!cart.length) return alert("Keranjang kosong");
  let total = cart.reduce((s,p)=>s+p.price,0);
  if(activeVoucher){
    if(activeVoucher.type==="percent") total = total - Math.round(total*(activeVoucher.value/100));
    else total = total - activeVoucher.value;
  }

  const txn = {
    id: Date.now(),
    items: cart.map(p=>({id:p.id,name:p.name,price:p.price})),
    total, buyer:{name,email},
    voucher: activeVoucher ? activeVoucher.code : null,
    proof: lastProofDataUrl || null,
    date: new Date().toISOString()
  };

  // save locally
  const purchases = JSON.parse(localStorage.getItem("purchases")||"[]");
  purchases.push(txn);
  localStorage.setItem("purchases", JSON.stringify(purchases));

  // Optionally POST to our server endpoint to save to GitHub
  // Server endpoint (deploy server.js) : POST /save-json
  // body: { path: "purchases.json", content: JSON.stringify(purchases) }
  if(confirm("Simpan transaksi ke GitHub via server (jika tersedia)?")){
    try{
      const resp = await fetch("/api/save-json", {
        method:"POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ path: "purchases.json", content: JSON.stringify(purchases, null, 2) })
      });
      if(resp.ok) alert("Transaksi tersimpan di repo via server.");
      else alert("Server simpan gagal: " + resp.statusText);
    }catch(err){
      console.warn(err);
      alert("Tidak bisa menghubungi server simpan otomatis. Transaksi tersimpan lokal saja.");
    }
  }else{
    alert("Transaksi tersimpan lokal. Admin akan menghubungi via WhatsApp.");
  }

  // notify admin via WhatsApp open
  const message = encodeURIComponent(`Ada transaksi baru. ID: ${txn.id} Total: Rp ${numberWithCommas(total)} Buyer: ${name} ${email}`);
  window.open(`https://wa.me/${ADMIN_PHONE}?text=${message}`, "_blank");

  // reset cart
  cart = [];
  activeVoucher = null;
  lastProofDataUrl = null;
  document.getElementById("uploadPreview").innerHTML = "";
  document.getElementById("buyerName").value = "";
  document.getElementById("buyerEmail").value = "";
  renderCart();
  updateCartCount();
  closeCart();
}

/* Utilities */
function numberWithCommas(x){ return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
function escapeHtml(s){ if(!s) return ""; return s.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"); }