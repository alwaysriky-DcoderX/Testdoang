const ADMIN_PASS = "tokoriky";
let products = JSON.parse(localStorage.getItem("products")||"[]");
let vouchers = JSON.parse(localStorage.getItem("vouchers")||"[]");
let purchases = JSON.parse(localStorage.getItem("purchases")||"[]");
let editingIndex = -1;
let uploadedImageDataUrl = null;

document.getElementById("loginBtn").addEventListener("click", ()=>{
  const pass = document.getElementById("pass").value;
  if(pass===ADMIN_PASS){
    document.getElementById("loginWrap").classList.add("hidden");
    document.getElementById("adminWrap").classList.remove("hidden");
    renderProdTable(); renderVTable();
  } else document.getElementById("loginMsg").textContent = "Password salah";
});

document.getElementById("pImgFile").addEventListener("change", async (e)=>{
  const f = e.target.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = (ev)=>{ uploadedImageDataUrl = ev.target.result; document.getElementById("imgPreview").innerHTML = `<img src="${uploadedImageDataUrl}" style="max-width:160px;border-radius:8px">`; };
  reader.readAsDataURL(f);
});

document.getElementById("addProdBtn").addEventListener("click", ()=>{
  const id = document.getElementById("pId").value || Date.now().toString();
  const name = document.getElementById("pName").value;
  const price = Number(document.getElementById("pPrice").value||0);
  const qris = document.getElementById("pQRIS").value||"";
  const desc = document.getElementById("pDesc").value||"";

  const img = uploadedImageDataUrl || document.getElementById("pImgFile").dataset.url || "";

  if(!name || !price) return alert("Isi nama + harga");
  const obj = {id, name, price, desc, img, qris};
  // if editing replace by index, else push
  const existingIndex = products.findIndex(p=>p.id==id);
  if(existingIndex>=0) products[existingIndex]=obj;
  else products.push(obj);

  localStorage.setItem("products", JSON.stringify(products));
  uploadedImageDataUrl=null;
  clearForm();
  renderProdTable();
  alert("Produk tersimpan (localStorage). Untuk menyebarluaskan, export JSON atau tekan 'Simpan ke GitHub'");
});

document.getElementById("clearFormBtn").addEventListener("click", clearForm);

function clearForm(){
  document.getElementById("pId").value="";
  document.getElementById("pName").value="";
  document.getElementById("pPrice").value="";
  document.getElementById("pDesc").value="";
  document.getElementById("pImgFile").value="";
  document.getElementById("imgPreview").innerHTML="";
  document.getElementById("pQRIS").value="";
  uploadedImageDataUrl=null;
}

function renderProdTable(){
  const tbody = document.querySelector("#prodTable tbody");
  tbody.innerHTML = "";
  products.forEach((p,i)=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${p.id}</td><td>${p.name}</td><td>Rp ${p.price.toLocaleString()}</td>
      <td>
        <button class="btn small" onclick="editProd('${p.id}')">Edit</button>
        <button class="btn small" style="background:#ef4444" onclick="delProd('${p.id}')">Hapus</button>
      </td>`;
    tbody.appendChild(tr);
  });
}
window.editProd = function(id){
  const p = products.find(x=>x.id==id);
  if(!p) return;
  document.getElementById("pId").value = p.id;
  document.getElementById("pName").value = p.name;
  document.getElementById("pPrice").value = p.price;
  document.getElementById("pDesc").value = p.desc;
  document.getElementById("pQRIS").value = p.qris||"";
  if(p.img) document.getElementById("imgPreview").innerHTML = `<img src="${p.img}" style="max-width:160px;border-radius:8px">`;
}
window.delProd = function(id){
  if(!confirm("Hapus produk?")) return;
  products = products.filter(x=>x.id!=id);
  localStorage.setItem("products", JSON.stringify(products));
  renderProdTable();
}

/* Voucher handling */
document.getElementById("addVoucherBtn").addEventListener("click", ()=>{
  const code = (document.getElementById("vCode").value||"").toUpperCase();
  const type = (document.getElementById("vType").value||"percent");
  const value = Number(document.getElementById("vValue").value||0);
  const min = document.getElementById("vMin").value ? Number(document.getElementById("vMin").value) : null;
  if(!code || !value) return alert("Isi kode + value");
  vouchers.push({code,type,value,min});
  localStorage.setItem("vouchers", JSON.stringify(vouchers));
  renderVTable();
});

function renderVTable(){
  const tbody = document.querySelector("#vTable tbody");
  tbody.innerHTML = "";
  vouchers.forEach((v,i)=>{
    const tr=document.createElement("tr");
    tr.innerHTML = `<td>${v.code}</td><td>${v.type}</td><td>${v.value}</td>
      <td><button class="btn small" onclick="delVoucher('${v.code}')">Del</button></td>`;
    tbody.appendChild(tr);
  });
}
window.delVoucher = function(code){
  if(!confirm("Hapus voucher?")) return;
  vouchers = vouchers.filter(x=>x.code!==code);
  localStorage.setItem("vouchers", JSON.stringify(vouchers));
  renderVTable();
}

/* Purchases / dashboard */
document.getElementById("loadPurchasesBtn").addEventListener("click", ()=> {
  purchases = JSON.parse(localStorage.getItem("purchases")||"[]");
  renderPurchases();
});
function renderPurchases(){
  const tbody = document.querySelector("#tTable tbody");
  tbody.innerHTML = "";
  purchases.forEach(p=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${p.id}</td><td>${p.buyer.name} (${p.buyer.email})</td><td>Rp ${p.total.toLocaleString()}</td><td>${new Date(p.date).toLocaleString()}</td>
      <td><button class="btn small" onclick='viewProof("${encodeURIComponent(p.proof||'')}")'>Bukti</button></td>`;
    tbody.appendChild(tr);
  });
}
window.viewProof = function(dataEnc){
  const data = decodeURIComponent(dataEnc);
  if(!data) return alert("Tidak ada bukti");
  const w = window.open("");
  w.document.write(`<img src="${data}" style="max-width:600px">`);
}

document.getElementById("exportJsonBtn").addEventListener("click", ()=>{
  downloadJSON({products,vouchers},"store-export.json");
});
document.getElementById("exportPurchasesBtn").addEventListener("click", ()=>{
  const list = JSON.parse(localStorage.getItem("purchases")||"[]");
  downloadJSON(list,"purchases.json");
});

function downloadJSON(data,filename){
  const b = new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const url = URL.createObjectURL(b);
  const a = document.createElement("a"); a.href=url; a.download=filename; a.click();
}

/* Save to GitHub via server POST (server.js) */
document.getElementById("saveGithubBtn").addEventListener("click", async ()=>{
  if(!confirm("Simpan products.json + vouchers.json to repo via server? (requires server with GITHUB_TOKEN)")) return;
  const payload1 = { path:"products.json", content: JSON.stringify(products,null,2) };
  const payload2 = { path:"vouchers.json", content: JSON.stringify(vouchers,null,2) };
  try{
    const r1 = await fetch("/api/save-json",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload1)});
    const r2 = await fetch("/api/save-json",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload2)});
    if(r1.ok && r2.ok) alert("Saved to repo via server");
    else alert("Save failed. Check server logs.");
  }catch(e){ alert("Unable to call server. Deploy server first."); }
});

/* helper */
function downloadFile(content, name){
  const a=document.createElement("a");
  const blob = new Blob([content],{type:"application/json"});
  a.href = URL.createObjectURL(blob); a.download=name; a.click();
}
function downloadJSON(obj,name){ downloadFile(JSON.stringify(obj,null,2),name); }
function renderVTable(){ /* already defined earlier; ensure initial call */ }
renderProdTable(); renderVTable();