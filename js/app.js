// 🔴 นำ URL จาก Google Apps Script (เวอร์ชันใหม่) มาวางที่นี่
const API_URL = "https://script.google.com/macros/s/AKfycbwvIUI093e_N1lgzGhpxC_SGkG2fkTlnjr8yiSdMm6kkR8I9mBwECq9FvRjOTLuLQci/exec";

function getToken() { return localStorage.getItem("bpp_token") || sessionStorage.getItem("bpp_token"); }
function escapeHtml(s) { return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

window.onload = function() {
    let token = getToken();
    if(token) {
        document.getElementById("tab-auth").classList.remove("active");
        document.getElementById("tab-search").classList.add("active");
        document.getElementById("mainNav").style.display = "flex";
        
        const role = localStorage.getItem("bpp_role");
        document.getElementById("accountDetailsZone").innerHTML = `<p><b>ชื่อ:</b> ${escapeHtml(localStorage.getItem("bpp_user"))}</p><p><b>สิทธิ์:</b> <span style="color:#166534; font-weight:bold;">${escapeHtml(role)}</span></p>`;
        
        if(role === "Admin") { 
            document.getElementById("adminPanel").style.display = "block"; 
            document.getElementById("nav-profile").innerHTML = '<i class="fa-solid fa-crown"></i><span>แอดมิน</span>';
        }
        loadDash(false);
    } else { document.getElementById("mainNav").style.display = "none"; }
};

async function fetchSafePOST(payload) {
    try {
        const response = await fetch(API_URL, { method: "POST", body: JSON.stringify(payload) });
        return await response.json();
    } catch (err) { throw new Error("การเชื่อมต่อขัดข้อง"); }
}

function verifyUser() {
    const e = document.getElementById("loginEmail").value.trim().toLowerCase(); 
    const p = document.getElementById("loginPassword").value.trim(); 
    const remember = document.getElementById("chkRemember").checked;
    if(!e || !p) return alert("กรุณากรอกข้อมูลให้ครบ");
    
    document.getElementById("btnVerify").innerHTML = "กำลังตรวจสอบ...";
    fetch(`${API_URL}?action=login&email=${encodeURIComponent(e)}&pass=${encodeURIComponent(p)}`)
        .then(r=>r.json()).then(res=>{
        if(res.auth) { 
            let storage = remember ? localStorage : sessionStorage;
            storage.setItem("bpp_token", res.token); storage.setItem("bpp_user", res.user); storage.setItem("bpp_role", res.role); storage.setItem("bpp_dept", res.dept);
            location.reload(); 
        } 
        else { alert(res.message); document.getElementById("btnVerify").innerHTML = "เข้าสู่ระบบ"; }
    }).catch(() => { document.getElementById("btnVerify").innerHTML = "ระบบขัดข้อง ลองอีกครั้ง"; }); 
}

function logoutManual() { if(confirm("ต้องการออกจากระบบ?")) { fetch(`${API_URL}?action=logout&token=${getToken()}`); localStorage.clear(); sessionStorage.clear(); location.reload(); } }

function switchTab(id, el) {
    const role = localStorage.getItem("bpp_role");
    // ระบบป้องกันสิทธิ์ (Role-Based Access Control)
    if(id==='tab-assign' && role!=='ธุรการ' && role!=='Admin') return alert("⚠️ หน้าผูกเรื่องจำกัดเฉพาะสิทธิ์ [ธุรการ / Admin]");
    if(id==='tab-scan' && role!=='หน้าห้อง' && role!=='ธุรการ' && role!=='Admin' && role!=='เจ้าของเรื่อง') return alert("⚠️ การอัปเดตจำกัดเฉพาะเจ้าหน้าที่ปฏิบัติงาน");
    
    document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active')); document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
    document.getElementById(id).classList.add('active'); el.classList.add('active');
    if(id==='tab-search') loadDash(true);
}

function getStatusClass(s) { if(s.includes("อนุมัติ")||s.includes("รับ")) return "status-ok"; if(s.includes("ตีกลับ")||s.includes("แก้ไข")) return "status-err"; return "status-warn"; }
function toggleAcc(btn) { const c = btn.nextElementSibling, i = btn.querySelector('i'); if(c.classList.contains('expanded')){c.classList.remove('expanded');i.className="fa-solid fa-plus";} else {c.classList.add('expanded');i.className="fa-solid fa-minus";} }

function buildFileHTML(f) { 
    let eId = escapeHtml(f.id), eTitle = escapeHtml(f.title), eAction = escapeHtml(f.action), eLoc = escapeHtml(f.loc), eTime = escapeHtml(f.time);
    let sC = getStatusClass(eAction); let uH = f.urgency!=="ปกติ"?`<span class="tag" style="color:#dc2626;"><i class="fa-solid fa-bolt"></i> ${escapeHtml(f.urgency)}</span>`:`<span class="tag">ปกติ</span>`; 
    return `<div class="file-item" onclick="openHistory('${eId}', '${eTitle}')"><div class="file-title"><span style="color:var(--navy);">[ ${eId} ]</span> ${eTitle}</div><div class="file-meta"><span class="tag"><i class="fa-solid fa-location-dot"></i> ${eLoc}</span><span class="tag ${sC}"><i class="fa-solid fa-circle-info"></i> ${eAction}</span>${uH}<span class="tag"><i class="fa-regular fa-clock"></i> ${eTime}</span></div></div>`; 
}

function loadDash(isSync = false) {
    let token = getToken(); if(!token) return;
    let openIds = Array.from(document.querySelectorAll('.accordion-content.expanded')).map(el => el.previousElementSibling.getAttribute('data-id'));
    fetch(`${API_URL}?action=getDash&token=${token}`).then(r=>r.json()).then(data=>{
        if(data.error) return; 
        document.getElementById('dash-total').innerText=data.total; document.getElementById('dash-in').innerText=data.in;
        let topHtml = "";
        if(data.urgent.length > 0) { let uH = ""; data.urgent.forEach(f => uH += buildFileHTML(f)); topHtml += `<div class="accordion-item"><button class="accordion-btn" data-id="urgent" style="background:#fef2f2; color:#dc2626;" onclick="toggleAcc(this)"><div>🔥 แฟ้มด่วนที่สุด <span class="badge" style="background:#dc2626;">${data.urgent.length}</span></div><i class="fa-solid fa-plus"></i></button><div class="accordion-content">${uH}</div></div>`; }
        if(data.approved.length > 0) { let aH = ""; data.approved.forEach(f => aH += buildFileHTML(f)); topHtml += `<div class="accordion-item"><button class="accordion-btn" data-id="approved" style="background:#f0fdf4; color:#166534;" onclick="toggleAcc(this)"><div>✅ แฟ้มอนุมัติแล้ว <span class="badge" style="background:#166534;">${data.approved.length}</span></div><i class="fa-solid fa-plus"></i></button><div class="accordion-content">${aH}</div></div>`; }
        document.getElementById('dash-top-accordion').innerHTML = topHtml;
        let html = "";
        data.sortedDepts.forEach(d => { let fH = ""; d.files.forEach(f => fH += buildFileHTML(f)); html += `<div class="accordion-item"><button class="accordion-btn" data-id="dept-${escapeHtml(d.name)}" onclick="toggleAcc(this)"><div>${escapeHtml(d.name)} <span class="badge">${d.count} แฟ้ม</span></div><i class="fa-solid fa-plus"></i></button><div class="accordion-content">${fH}</div></div>`; });
        document.getElementById('dash-accordion').innerHTML = html || "<div style='text-align:center; padding:15px; color:#94a3b8;'>ไม่มีประวัติแฟ้มค้างในคลาวด์</div>";
        document.querySelectorAll('.accordion-btn').forEach(btn => { if(openIds.includes(btn.getAttribute('data-id'))) { btn.nextElementSibling.classList.add('expanded'); btn.querySelector('i').className = "fa-solid fa-minus"; } });
    });
}

function openHistory(id, title) {
    let token = getToken(); if(!token) return;
    document.getElementById("historyOverlay").classList.add("active"); document.getElementById("historyModal").classList.add("active");
    document.getElementById("historyTitle").innerText = `ประวัติ: [${id}] ${title}`; document.getElementById("historyTimeline").innerHTML = `<div style="text-align:center; padding:20px;">กำลังโหลด...</div>`;
    fetch(`${API_URL}?action=getHistory&fileId=${encodeURIComponent(id)}&token=${token}`).then(r=>r.json()).then(data => {
        let html = "";
        data.forEach(h => { html += `<div class="timeline-item"><div class="timeline-time">${escapeHtml(h.time)} • ${escapeHtml(h.loc)}</div><div class="timeline-status">${escapeHtml(h.status)}</div><div class="timeline-user"><i class="fa-solid fa-user-check"></i> ${escapeHtml(h.user)}</div></div>`; });
        document.getElementById("historyTimeline").innerHTML = html || "<div style='text-align:center;'>ยังไม่มีประวัติ</div>";
    });
}
function closeHistory() { document.getElementById("historyOverlay").classList.remove("active"); document.getElementById("historyModal").classList.remove("active"); }

function runScan(text) { 
    const scanStatus = document.querySelector('input[name="scanStatus"]:checked').value;
    fetchSafePOST({ action: "scan", fileId: text, dept: "", scanStatus: scanStatus, loc: document.getElementById("locScan").value, token: getToken() }).then(d=>{ alert(d.message); loadDash(); });
}
function manualScan() { const v = document.getElementById("manualIdScan").value.trim().toUpperCase(); if(v) runScan(v); }
function manualAssign() { 
    const v = document.getElementById("manualIdAssign").value.trim().toUpperCase(); const t = document.getElementById("newDocTitle").value.trim(); 
    if(!v || !t) return alert("กรอกข้อมูลให้ครบ"); 
    fetchSafePOST({ action:"assign", fileId:v, title:t, urgency:document.getElementById("urgencyAssign").value, dept: "", loc:document.getElementById("locAssign").value, token: getToken() }).then(d=>{ alert(d.message); loadDash(); document.getElementById("manualIdAssign").value=""; document.getElementById("newDocTitle").value=""; }); 
}

// 🔴 ส่วนของ Admin (ระบบนำเข้าและจัดการสิทธิ์)
function importCSV() {
    const file = document.getElementById('csvFileInput').files[0];
    if(!file) return alert("กรุณาเลือกไฟล์ CSV");
    const reader = new FileReader();
    reader.onload = function(e) {
        const lines = e.target.result.split('\n');
        let users = [];
        for(let i=1; i<lines.length; i++) { // ข้ามหัวตาราง (แถว 0)
            let cols = lines[i].split(',');
            if(cols.length >= 4 && cols[0].trim() !== "") {
                users.push({ email: cols[0].trim(), name: cols[1].trim(), dept: cols[2].trim(), role: cols[3].trim() });
            }
        }
        if(users.length === 0) return alert("ไม่พบข้อมูลในไฟล์ หรือรูปแบบไม่ถูกต้อง");
        if(confirm(`เตรียมนำเข้า ${users.length} รายชื่อ ยืนยันหรือไม่?`)) {
            fetchSafePOST({action:"admin_import_users", users: users, token: getToken()}).then(d=>{ alert(d.message); loadAdminUsers(); });
        }
    };
    reader.readAsText(file);
}

function loadAdminUsers() {
    fetch(`${API_URL}?action=admin_get_users&token=${getToken()}`).then(r=>r.json()).then(data=>{
        let html = `<table style="width:100%; border-collapse:collapse;"><tr style="background:#f8fafc;"><th style="padding:5px;text-align:left;">ผู้ใช้</th><th>สิทธิ์</th></tr>`;
        data.forEach(u => {
            let roleDropdown = `<select onchange="updateRole('${u.email}', this.value)" style="font-size:10px;">
                <option value="ทั่วไป" ${u.role==='ทั่วไป'?'selected':''}>ทั่วไป (ดูได้เท่านั้น)</option>
                <option value="เจ้าของเรื่อง" ${u.role==='เจ้าของเรื่อง'?'selected':''}>เจ้าของเรื่อง</option>
                <option value="ธุรการ" ${u.role==='ธุรการ'?'selected':''}>ธุรการ</option>
                <option value="หน้าห้อง" ${u.role==='หน้าห้อง'?'selected':''}>หน้าห้อง</option>
                <option value="Admin" ${u.role==='Admin'?'selected':''}>Admin</option>
            </select>`;
            if(u.role === "Admin" && u.email === localStorage.getItem("bpp_user")) roleDropdown = "Root Admin"; // ล็อกแอดมินคนแรกไม่ให้เปลี่ยนสิทธิ์ตัวเอง
            
            html += `<tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:5px; font-size:11px;">${escapeHtml(u.name)}<br><span style="color:#64748b;">${escapeHtml(u.email)}</span></td><td style="text-align:center;">${roleDropdown}</td></tr>`;
        });
        document.getElementById('adminUserList').innerHTML = html + `</table>`;
    });
}

function updateRole(email, newRole) {
    if(!confirm(`ต้องการเปลี่ยนสิทธิ์ของ ${email} เป็น [${newRole}] ใช่หรือไม่?`)) return loadAdminUsers(); // รีเฟรชกลับ
    fetchSafePOST({action:"admin_update_role", targetEmail:email, newRole:newRole, token:getToken()}).then(d=>{ alert(d.message); });
}

let sTimeout; function debounceSearch() { let token = getToken(); if(!token) return; clearTimeout(sTimeout); const k = document.getElementById("searchInput").value.trim(); if(!k) { document.getElementById("miniDashboard").style.display="block"; document.getElementById("searchResults").innerHTML=""; return; } document.getElementById("miniDashboard").style.display="none"; sTimeout = setTimeout(() => { fetch(`${API_URL}?action=search&keyword=${encodeURIComponent(k)}&token=${token}`).then(r => r.json()).then(res => { let html = ""; if(!res || res.length===0) html = '<div style="text-align:center; color:#ef4444; padding:20px; font-weight:bold;">❌ ไม่พบข้อมูลแฟ้ม</div>'; else res.forEach(f => { html += `<div class="accordion-item" style="padding:12px;">${buildFileHTML(f)}</div>`; }); document.getElementById("searchResults").innerHTML = html; }); }, 400); }