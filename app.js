const state = {
  loggedIn: false,
  authMode: "login",
  loginName: "",
  loginPin: "",
  registerName: "",
  registerPhone: "",
  registerPin: "",
  currentUser: null,
  role: "kasir",
  cashierScreen: "dashboard",
  tab: "layanan",
  search: "",
  cart: [],
  paymentOpen: false,
  paymentMethod: "",
  cashAmount: 0,
  qrisRef: "QR-0001",
  profilePanel: "",
  profilePhone: "",
  profileOutlet: "",
  profilePin: "",
  isLoadingServices: false,
  bookingStep: 1,
  booking: {
    serviceId: 1,
    barberId: "any",
    dateIndex: 0,
    slot: "10:30",
    name: "",
    phone: "",
    success: false,
  },
};

const STORAGE_KEY = "ymw-haircut-app-v1";
const CONFIG = window.YMW_CONFIG || {};

let accounts = [
  { id: 1, name: "Sari Wulandari", phone: "081234567890", pin: "1234", role: "kasir", shift: "Pagi", outlet: "YM-W HAIRCUT Cabang Utama" },
  { id: 2, name: "Budi Santoso", phone: "081298765432", pin: "1111", role: "admin", shift: "Owner", outlet: "YM-W HAIRCUT Cabang Utama" },
];

const services = [
  { id: 1, type: "layanan", icon: "scissors", name: "Potong Rambut", duration: "30 min", price: 40000, color: "success" },
  { id: 2, type: "layanan", icon: "beard", name: "Cukur Jenggot", duration: "20 min", price: 25000, color: "accent" },
  { id: 3, type: "layanan", icon: "razor", name: "Hair Wash + Styling", duration: "25 min", price: 35000, color: "info" },
  { id: 4, type: "layanan", icon: "sparkle", name: "Creambath", duration: "45 min", price: 65000, color: "warning" },
  { id: 5, type: "produk", icon: "bottle", name: "Pomade Matte", duration: "Stok 18", price: 85000, color: "accent" },
  { id: 6, type: "produk", icon: "bottle", name: "Hair Tonic", duration: "Stok 9", price: 55000, color: "info" },
  { id: 7, type: "produk", icon: "box", name: "Shampoo Mint", duration: "Habis", price: 45000, color: "warning", disabled: true },
];

const barbers = [
  { id: "any", name: "Bebas", rating: "Available" },
  { id: "rio", name: "Rio", rating: "4.9" },
  { id: "dimas", name: "Dimas", rating: "4.8" },
  { id: "bayu", name: "Bayu", rating: "4.7" },
];

let transactions = [
  { id: 1, name: "Walk-in", service: "Potong + Styling", total: 75000, method: "Tunai", cashier: "Sari Wulandari", time: "10:42", date: "2026-05-02" },
  { id: 2, name: "Andi", service: "Cukur Jenggot", total: 25000, method: "QRIS", cashier: "Sari Wulandari", time: "09:58", date: "2026-05-02" },
  { id: 3, name: "Bima", service: "Pomade Matte", total: 85000, method: "Kartu", cashier: "Sari Wulandari", time: "09:20", date: "2026-05-02" },
];

let cashierBookings = [
  { id: 1, date: "2026-05-02", time: "10:30", name: "Raka", phone: "081300000001", service: "Potong Rambut", barber: "Rio", status: "Menunggu", tone: "warning" },
  { id: 2, date: "2026-05-02", time: "11:00", name: "Doni", phone: "081300000002", service: "Hair Wash + Styling", barber: "Dimas", status: "Check-in", tone: "info" },
  { id: 3, date: "2026-05-02", time: "13:30", name: "Adit", phone: "081300000003", service: "Creambath", barber: "Bayu", status: "Dikonfirmasi", tone: "success" },
  { id: 4, date: "2026-05-02", time: "15:00", name: "Fajar", phone: "081300000004", service: "Cukur Jenggot", barber: "Bebas", status: "Dikonfirmasi", tone: "success" },
];

const rupiah = (value) => new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
}).format(value);

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function currentTime() {
  return new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function saveAppData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    accounts,
    transactions,
    cashierBookings,
    session: state.loggedIn && state.currentUser ? {
      userId: state.currentUser.id,
      role: state.role,
    } : null,
  }));
}

function isCloudEnabled() {
  return Boolean(CONFIG.supabaseUrl && CONFIG.supabaseAnonKey);
}

function cloudHeaders(extra = {}) {
  return {
    apikey: CONFIG.supabaseAnonKey,
    Authorization: `Bearer ${CONFIG.supabaseAnonKey}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
    ...extra,
  };
}

async function cloudRequest(path, options = {}) {
  const base = CONFIG.supabaseUrl.replace(/\/$/, "");
  const response = await fetch(`${base}/rest/v1/${path}`, {
    ...options,
    headers: cloudHeaders(options.headers || {}),
  });
  if (!response.ok) throw new Error(`Cloud request gagal: ${response.status}`);
  if (response.status === 204) return null;
  return response.json();
}

async function loadCloudData() {
  if (!isCloudEnabled()) return;
  try {
    const [cloudAccounts, cloudTransactions, cloudBookings] = await Promise.all([
      cloudRequest("accounts?select=*&order=id.asc"),
      cloudRequest("transactions?select=*&order=created_at.desc"),
      cloudRequest("cashier_bookings?select=*&order=date.asc,time.asc"),
    ]);
    if (Array.isArray(cloudAccounts) && cloudAccounts.length) accounts = cloudAccounts;
    if (Array.isArray(cloudTransactions)) transactions = cloudTransactions;
    if (Array.isArray(cloudBookings)) cashierBookings = cloudBookings;
    if (state.currentUser) {
      state.currentUser = accounts.find((account) => account.id === state.currentUser.id) || state.currentUser;
    }
    saveAppData();
    render();
    showToast("success", "Data online tersinkron");
  } catch (error) {
    showToast("warning", "Online gagal, memakai data lokal");
  }
}

async function cloudInsert(table, row) {
  if (!isCloudEnabled()) return;
  try {
    await cloudRequest(table, {
      method: "POST",
      body: JSON.stringify(row),
    });
  } catch (error) {
    showToast("warning", "Data disimpan lokal, belum tersinkron");
  }
}

async function cloudUpdateBooking(booking) {
  if (!isCloudEnabled()) return;
  try {
    await cloudRequest(`cashier_bookings?id=eq.${booking.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: booking.status,
        tone: booking.tone,
      }),
    });
  } catch (error) {
    showToast("warning", "Status tersimpan lokal, belum tersinkron");
  }
}

async function cloudUpdateAccount(account) {
  if (!isCloudEnabled()) return;
  try {
    await cloudRequest(`accounts?id=eq.${account.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        phone: account.phone,
        pin: account.pin,
        outlet: account.outlet,
      }),
    });
  } catch (error) {
    showToast("warning", "Akun tersimpan lokal, belum tersinkron");
  }
}

function loadAppData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const saved = JSON.parse(raw);
    if (Array.isArray(saved.accounts)) accounts = saved.accounts;
    if (Array.isArray(saved.transactions)) transactions = saved.transactions;
    if (Array.isArray(saved.cashierBookings)) cashierBookings = saved.cashierBookings;
    if (saved.session) {
      const user = accounts.find((account) => account.id === saved.session.userId);
      if (user) {
        state.loggedIn = true;
        state.currentUser = user;
        state.role = saved.session.role || user.role;
      }
    }
  } catch (error) {
    console.warn("Gagal membaca data lokal", error);
  }
}

function transactionStats() {
  const total = transactions.reduce((sum, item) => sum + item.total, 0);
  return {
    count: transactions.length,
    revenue: total,
    bookingCount: cashierBookings.length,
    checkedIn: cashierBookings.filter((item) => item.status === "Check-in").length,
    waiting: cashierBookings.filter((item) => item.status === "Menunggu").length,
  };
}

function icon(name, size = 24) {
  const attrs = `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"`;
  const icons = {
    home: `<svg ${attrs}><path d="m3 10 9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>`,
    receipt: `<svg ${attrs}><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2Z"/><path d="M8 7h8"/><path d="M8 12h8"/><path d="M8 17h5"/></svg>`,
    calendar: `<svg ${attrs}><path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/></svg>`,
    user: `<svg ${attrs}><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg>`,
    plus: `<svg ${attrs}><path d="M12 5v14"/><path d="M5 12h14"/></svg>`,
    scissors: `<svg ${attrs}><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88"/><path d="M14.47 14.48 20 20"/><path d="M8.12 8.12 12 12"/></svg>`,
    beard: `<svg ${attrs}><path d="M7 10a5 5 0 0 1 10 0v3a5 5 0 0 1-10 0Z"/><path d="M8 14c1.2 2.2 6.8 2.2 8 0"/><path d="M9 10h.01"/><path d="M15 10h.01"/></svg>`,
    razor: `<svg ${attrs}><path d="m4 20 9-9"/><path d="m14 4 6 6"/><path d="m12 6 6 6"/><path d="m7 17 3 3"/></svg>`,
    sparkle: `<svg ${attrs}><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z"/><path d="M5 3v4"/><path d="M3 5h4"/><path d="M19 17v4"/><path d="M17 19h4"/></svg>`,
    bottle: `<svg ${attrs}><path d="M10 2h4v4h-4z"/><path d="M9 6h6l1 3v11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V9Z"/><path d="M8 13h8"/></svg>`,
    box: `<svg ${attrs}><path d="m21 8-9-5-9 5 9 5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>`,
    search: `<svg ${attrs}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
    trash: `<svg ${attrs}><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/></svg>`,
    wallet: `<svg ${attrs}><path d="M20 7V6a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h15v10H5a2 2 0 0 1-2-2V6"/><path d="M16 13h.01"/></svg>`,
    qris: `<svg ${attrs}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3z"/><path d="M20 14v7"/><path d="M14 20h3"/></svg>`,
    card: `<svg ${attrs}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/></svg>`,
    chart: `<svg ${attrs}><path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-7"/></svg>`,
    menu: `<svg ${attrs}><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/></svg>`,
    check: `<svg ${attrs}><path d="M20 6 9 17l-5-5"/></svg>`,
    sync: `<svg ${attrs}><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 16h6v6"/><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M15 2h6v6"/></svg>`,
  };
  return icons[name] || icons.box;
}

function setState(patch) {
  Object.assign(state, patch);
  render();
}

function login() {
  if (!state.loginName.trim() || !state.loginPin.trim()) {
    showToast("error", "Username dan PIN wajib diisi");
    return;
  }
  const normalizedName = state.loginName.trim().toLowerCase();
  const account = accounts.find((item) =>
    item.role === state.role &&
    item.pin === state.loginPin &&
    (item.name.toLowerCase() === normalizedName || item.phone === state.loginName.trim())
  );
  if (!account) {
    showToast("error", "Akun tidak ditemukan atau PIN salah");
    return;
  }
  state.loggedIn = true;
  state.currentUser = account;
  state.cashierScreen = "dashboard";
  saveAppData();
  render();
  showToast("success", `Selamat datang, ${account.name}`);
}

function createAccount() {
  if (!state.registerName.trim() || !state.registerPhone.trim() || !state.registerPin.trim()) {
    showToast("error", "Nama, nomor WA, dan PIN wajib diisi");
    return;
  }
  if (state.registerPin.length < 4) {
    showToast("error", "PIN minimal 4 digit");
    return;
  }
  const exists = accounts.some((item) => item.phone === state.registerPhone.trim() && item.role === state.role);
  if (exists) {
    showToast("error", "Nomor WA sudah terdaftar untuk role ini");
    return;
  }
  const account = {
    id: Date.now(),
    name: state.registerName.trim(),
    phone: state.registerPhone.trim(),
    pin: state.registerPin,
    role: state.role,
    shift: state.role === "kasir" ? "Belum mulai" : state.role === "admin" ? "Owner" : "Pelanggan",
    outlet: state.role === "pelanggan" ? "Booking Online" : "YM-W HAIRCUT Cabang Utama",
  };
  accounts.push(account);
  cloudInsert("accounts", account);
  state.authMode = "login";
  state.loginName = account.phone;
  state.loginPin = "";
  state.registerName = "";
  state.registerPhone = "";
  state.registerPin = "";
  saveAppData();
  render();
  showToast("success", "Akun berhasil dibuat, silakan masuk");
}

function logout() {
  const activeRole = roleLabel(state.role).toLowerCase();
  state.loggedIn = false;
  state.loginPin = "";
  state.currentUser = null;
  state.paymentOpen = false;
  state.profilePanel = "";
  state.profilePhone = "";
  state.profileOutlet = "";
  state.profilePin = "";
  state.cashierScreen = "dashboard";
  saveAppData();
  render();
  showToast("info", `Sesi ${activeRole} ditutup`);
}

function openProfilePanel(panel) {
  state.profilePanel = panel;
  state.profilePhone = state.currentUser ? state.currentUser.phone : "";
  state.profileOutlet = state.currentUser ? state.currentUser.outlet : "";
  state.profilePin = "";
  render();
}

function closeProfilePanel() {
  state.profilePanel = "";
  state.profilePhone = "";
  state.profileOutlet = "";
  state.profilePin = "";
  render();
}

function saveCurrentUserProfile() {
  if (!state.currentUser) return;
  if (state.profilePhone.trim()) state.currentUser.phone = state.profilePhone.trim();
  if (state.profileOutlet.trim()) state.currentUser.outlet = state.profileOutlet.trim();
  const account = accounts.find((item) => item.id === state.currentUser.id);
  if (account) Object.assign(account, state.currentUser);
  saveAppData();
  cloudUpdateAccount(state.currentUser);
  closeProfilePanel();
  showToast("success", "Pengaturan akun disimpan");
}

function saveCashierPin() {
  if (!state.profilePin.trim()) {
    showToast("error", "PIN baru wajib diisi");
    return;
  }
  if (state.profilePin.trim().length < 4) {
    showToast("error", "PIN minimal 4 digit");
    return;
  }
  state.currentUser.pin = state.profilePin.trim();
  saveCurrentUserProfile();
}

function showToast(type, message) {
  const root = document.getElementById("toast-root");
  const node = document.createElement("div");
  node.className = `toast ${type}`;
  node.textContent = message;
  root.appendChild(node);
  setTimeout(() => node.remove(), 3000);
}

function addToCart(item) {
  if (item.disabled) {
    showToast("warning", "Stok habis");
    return;
  }
  const current = state.cart.find((cartItem) => cartItem.id === item.id);
  if (current) current.qty += 1;
  else state.cart.push({ ...item, qty: 1 });
  render();
  showToast("success", `${item.name} ditambahkan`);
}

function removeFromCart(id) {
  state.cart = state.cart.filter((item) => item.id !== id);
  render();
  showToast("info", "Item dihapus dari keranjang");
}

function cartTotal() {
  return state.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function completePayment() {
  const total = cartTotal();
  const paymentLabel = state.paymentMethod === "qris" ? "QRIS" : state.paymentMethod === "kartu" ? "Kartu" : "Tunai";
  const transaction = {
    id: Date.now(),
    name: "Walk-in",
    service: state.cart.map((item) => item.qty > 1 ? `${item.name} x${item.qty}` : item.name).join(", "),
    total,
    method: paymentLabel,
    cashier: state.currentUser ? state.currentUser.name : "Kasir",
    time: currentTime(),
    date: todayDate(),
  };
  transactions.unshift(transaction);
  cloudInsert("transactions", transaction);
  showToast("success", "Transaksi berhasil disimpan");
  state.cart = [];
  state.paymentOpen = false;
  state.paymentMethod = "";
  state.cashAmount = 0;
  state.cashierScreen = "dashboard";
  saveAppData();
  render();
}

function refreshData() {
  if (isCloudEnabled()) {
    loadCloudData();
    return;
  }
  render();
  showToast("info", "Data lokal diperbarui");
}

function resetTransactions() {
  const confirmed = window.confirm("Reset riwayat transaksi lokal di perangkat ini?");
  if (!confirmed) return;
  transactions = [];
  state.cart = [];
  state.paymentOpen = false;
  state.paymentMethod = "";
  state.cashAmount = 0;
  saveAppData();
  render();
  showToast("success", "Riwayat transaksi direset");
}

function resetBookings() {
  const confirmed = window.confirm("Reset semua booking lokal di perangkat ini?");
  if (!confirmed) return;
  cashierBookings = [];
  saveAppData();
  render();
  showToast("success", "Riwayat booking direset");
}

function startBookingFlow() {
  state.profilePanel = "newBooking";
  state.booking = {
    serviceId: 1,
    barberId: "any",
    dateIndex: 0,
    slot: "10:30",
    name: "",
    phone: "",
    success: false,
  };
  render();
}

function createCashierBooking() {
  if (!state.booking.name.trim() || !state.booking.phone.trim()) {
    showToast("error", "Nama dan nomor WA wajib diisi");
    return;
  }
  const selectedService = services.find((item) => item.id === Number(state.booking.serviceId));
  const selectedBarber = barbers.find((item) => item.id === state.booking.barberId);
  const booking = {
    id: Date.now(),
    date: todayDate(),
    time: state.booking.slot,
    name: state.booking.name.trim(),
    phone: state.booking.phone.trim(),
    service: selectedService ? selectedService.name : "Potong Rambut",
    barber: selectedBarber ? selectedBarber.name : "Bebas",
    status: "Dikonfirmasi",
    tone: "success",
  };
  cashierBookings.unshift(booking);
  cloudInsert("cashier_bookings", booking);
  saveAppData();
  closeProfilePanel();
  showToast("success", "Booking baru dibuat");
}

function addBookingToCalendar() {
  const selectedService = services.find((item) => item.id === Number(state.booking.serviceId));
  const selectedBarber = barbers.find((item) => item.id === state.booking.barberId);
  const [hour, minute] = state.booking.slot.split(":").map(Number);
  const start = new Date();
  start.setDate(start.getDate() + Number(state.booking.dateIndex || 0));
  start.setHours(hour, minute, 0, 0);
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const stamp = (date) => date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const title = `Booking YM-W HAIRCUT - ${selectedService ? selectedService.name : "Layanan"}`;
  const description = `Barber: ${selectedBarber ? selectedBarber.name : "Bebas"}\\nPelanggan: ${state.booking.name || "-"}`;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//YM-W HAIRCUT//Booking//ID",
    "BEGIN:VEVENT",
    `UID:${Date.now()}@ymw-haircut`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    "LOCATION:YM-W HAIRCUT Cabang Utama",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\\r\\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "booking-ymw-haircut.ics";
  link.click();
  URL.revokeObjectURL(url);
  showToast("success", "File kalender dibuat");
}

function simulateLoading() {
  state.isLoadingServices = true;
  state.cashierScreen = "pos";
  render();
  setTimeout(() => {
    state.isLoadingServices = false;
    render();
  }, 350);
}

function topbar() {
  return `
    <header class="topbar">
      <div class="brand"><span class="brand-mark">${icon("scissors", 22)}</span> YM-W HAIRCUT</div>
      <div class="topbar-actions">
        <span class="signed-user">${icon("user", 18)} ${state.currentUser ? state.currentUser.name : "Guest"}</span>
        <span class="signed-user">${roleLabel(state.role)}</span>
        <button class="button secondary" onclick="logout()">Keluar</button>
      </div>
    </header>
  `;
}

function loginScreen() {
  const isRegister = state.authMode === "register";
  return `
    <main class="login-page">
      <section class="login-panel card">
        <div class="login-logo-wrap">
          <span class="login-logo">${icon("scissors", 42)}</span>
          <div class="login-brand-text">YM-W HAIRCUT</div>
        </div>
        <div>
          <h1>${isRegister ? "Buat Akun" : "Masuk"}</h1>
          <p class="caption">${isRegister ? "Daftarkan akun baru sesuai role" : "Pilih role dan masuk dengan akun terdaftar"}</p>
        </div>

        <div class="segmented login-role">
          <button class="${state.role === "kasir" ? "active" : ""}" onclick="setState({role:'kasir'})">Kasir</button>
          <button class="${state.role === "admin" ? "active" : ""}" onclick="setState({role:'admin'})">Admin</button>
          <button class="${state.role === "pelanggan" ? "active" : ""}" onclick="setState({role:'pelanggan'})">Pelanggan</button>
        </div>

        ${isRegister ? registerForm() : loginForm()}
      </section>
    </main>
  `;
}

function loginForm() {
  return `
    <div class="form-grid">
      <label class="field-label">
        Nama atau nomor WA
        <input placeholder="contoh: Sari Wulandari / 081234567890" value="${state.loginName}" oninput="state.loginName=this.value" />
      </label>
      <label class="field-label">
        PIN
        <input type="password" inputmode="numeric" maxlength="6" placeholder="1234" value="${state.loginPin}" oninput="state.loginPin=this.value" onkeydown="if(event.key==='Enter') login()" />
      </label>
    </div>
    <button class="button primary full" onclick="login()">${icon("user", 20)} Masuk</button>
    <button class="button secondary full" onclick="setState({authMode:'register'})">${icon("plus", 20)} Buat Akun</button>
  `;
}

function registerForm() {
  return `
    <div class="form-grid">
      <label class="field-label">
        Nama lengkap
        <input placeholder="Nama akun" value="${state.registerName}" oninput="state.registerName=this.value" />
      </label>
      <label class="field-label">
        Nomor WhatsApp
        <input inputmode="tel" placeholder="08xxxxxxxxxx" value="${state.registerPhone}" oninput="state.registerPhone=this.value" />
      </label>
      <label class="field-label">
        Buat PIN
        <input type="password" inputmode="numeric" maxlength="6" placeholder="Minimal 4 digit" value="${state.registerPin}" oninput="state.registerPin=this.value" onkeydown="if(event.key==='Enter') createAccount()" />
      </label>
    </div>
    <button class="button primary full" onclick="createAccount()">${icon("check", 20)} Daftar</button>
    <button class="button secondary full" onclick="setState({authMode:'login'})">Sudah punya akun</button>
  `;
}

function cashierDashboard() {
  const stats = transactionStats();
  const latest = transactions.slice(0, 5);
  return `
    <main class="page">
      <div class="page-title">
        <div>
          <h1>Dashboard Kasir</h1>
          <p class="caption">Mode Offline - Data tersimpan lokal</p>
        </div>
        <span class="badge warning">${icon("sync", 16)} Sync Ready</span>
      </div>

      <section class="grid stats-grid">
        ${statCard("receipt", "Transaksi", String(stats.count), "success")}
        ${statCard("wallet", "Omzet", rupiah(stats.revenue), "accent")}
        ${statCard("calendar", "Booking", String(stats.bookingCount), "info")}
      </section>

      <button class="primary-cta" onclick="simulateLoading()">${icon("plus", 28)} Transaksi Baru</button>

      <section>
        <div class="section-head">
          <h2>Transaksi Terakhir</h2>
          <div class="action-row">
            <button class="button secondary" onclick="refreshData()">${icon("sync", 18)} Refresh</button>
            <button class="button danger" onclick="resetTransactions()">${icon("trash", 18)} Reset</button>
          </div>
        </div>
        <div class="transaction-list">
          ${latest.map((item, index) => `
            <article class="transaction-row ${index === 2 ? "swipe-delete" : ""}">
              <div>
                <h3>${item.name}</h3>
                <p class="caption">${item.service} • ${item.method || "Tunai"} • ${item.time}</p>
              </div>
              <strong class="price">${rupiah(item.total)}</strong>
            </article>
          `).join("") || `<div class="empty-state card">${icon("receipt", 48)}<h3>Belum ada transaksi</h3><p class="caption">Transaksi baru akan tampil di sini</p></div>`}
        </div>
      </section>
    </main>
    ${bottomNav("home")}
  `;
}

function cashierProfile() {
  const user = state.currentUser || accounts[0];
  return `
    <main class="page">
      <div class="page-title">
        <div>
          <h1>Profil Kasir</h1>
          <p class="caption">Akun, shift, dan perangkat kasir</p>
        </div>
        <span class="badge warning">${icon("sync", 16)} Mode Offline</span>
      </div>

      <section class="card" style="padding:18px;margin-bottom:16px">
        <div style="display:flex;align-items:center;gap:14px">
          <span class="avatar" style="margin:0;background:var(--success)">${user.name.slice(0, 1).toUpperCase()}</span>
          <div>
            <h2>${user.name}</h2>
            <p class="caption">${roleLabel(user.role)} • Shift ${user.shift}</p>
          </div>
        </div>
      </section>

      <section class="grid stats-grid">
        ${statCard("receipt", "Transaksi Saya", "28", "success")}
        ${statCard("wallet", "Tunai Diterima", "Rp 1,2 jt", "accent")}
        ${statCard("calendar", "Jam Shift", "08:00-16:00", "info")}
      </section>

      <section>
        <div class="section-head">
          <h2>Pengaturan Kasir</h2>
        </div>
        <div class="transaction-list">
          ${profileRow("Printer Struk", "Terhubung • Auto print aktif", "receipt", "success")}
          ${profileRow("Sinkronisasi", "12 transaksi menunggu upload", "sync", "warning")}
          ${profileRow("Nomor WhatsApp", user.phone, "user", "success")}
          ${profileRow("Outlet", user.outlet, "home", "info")}
          ${profileRow("PIN Kasir", "Terakhir diubah 14 hari lalu", "user", "accent")}
        </div>
      </section>

      <button class="button danger full" style="margin-top:18px" onclick="logout()">Keluar dari Shift</button>
    </main>
    ${bottomNav("akun")}
  `;
}

function roleLabel(role) {
  if (role === "admin") return "Admin/Pemilik";
  if (role === "pelanggan") return "Pelanggan";
  return "Kasir";
}

function cashierBookingsScreen() {
  const stats = transactionStats();
  return `
    <main class="page">
      <div class="page-title">
        <div>
          <h1>Booking Hari Ini</h1>
          <p class="caption">Kelola jadwal pelanggan dan antrean barber</p>
        </div>
        <button class="button primary" onclick="startBookingFlow()">${icon("plus", 18)} Booking Baru</button>
      </div>

      <section class="grid stats-grid">
        ${statCard("calendar", "Total Booking", String(stats.bookingCount), "info")}
        ${statCard("user", "Sudah Check-in", String(stats.checkedIn), "success")}
        ${statCard("sync", "Menunggu", String(stats.waiting), "warning")}
      </section>

      <section>
        <div class="section-head">
          <h2>Jadwal Berikutnya</h2>
          <div class="action-row">
            <span class="badge warning">Mode Offline - antrean lokal</span>
            <button class="button danger" onclick="resetBookings()">${icon("trash", 18)} Reset</button>
          </div>
        </div>
        <div class="transaction-list">
          ${cashierBookings.map(bookingRow).join("") || `<div class="empty-state card">${icon("calendar", 48)}<h3>Belum ada booking</h3><p class="caption">Booking pelanggan akan tampil di sini</p></div>`}
        </div>
      </section>

      <section class="card" style="padding:16px;margin-top:16px">
        <div class="section-head" style="margin-top:0">
          <h2>Kapasitas Barber</h2>
          <button class="button secondary" onclick="refreshData()">${icon("sync", 18)} Sync</button>
        </div>
        <div class="slot-grid">
          ${["Rio 4/6", "Dimas 3/6", "Bayu 2/5", "Bebas 5/8", "Walk-in 7", "Kosong 6"].map((slot, index) => `
            <button class="slot ${index === 4 ? "selected" : ""}" onclick="showToast('info','${slot}')">${slot}</button>
          `).join("")}
        </div>
      </section>
    </main>
    ${bottomNav("booking")}
  `;
}

function processBooking(id) {
  const booking = cashierBookings.find((item) => item.id === id);
  if (!booking) return;
  if (booking.status === "Menunggu" || booking.status === "Dikonfirmasi") {
    booking.status = "Check-in";
    booking.tone = "info";
    showToast("success", `${booking.name} check-in`);
  } else {
    booking.status = "Selesai";
    booking.tone = "success";
    showToast("success", `${booking.name} selesai`);
  }
  saveAppData();
  cloudUpdateBooking(booking);
  render();
}

function bookingRow(item) {
  const color = item.tone === "success" ? "success" : item.tone === "info" ? "info" : "warning";
  return `
    <article class="transaction-row">
      <div style="display:flex;align-items:center;gap:12px">
        <span class="icon-tile ${color}">${icon("calendar", 22)}</span>
        <div>
          <h3>${item.time} • ${item.name}</h3>
          <p class="caption">${item.service} • ${item.barber}</p>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <span class="badge ${item.tone === "warning" ? "warning" : ""}">${item.status}</span>
        <button class="button secondary" onclick="processBooking(${item.id})">Proses</button>
      </div>
    </article>
  `;
}

function profileRow(key, title, description, iconName, color) {
  if (color === undefined) {
    color = iconName;
    iconName = description;
    description = title;
    title = key;
    key = {
      "Printer Struk": "printer",
      "Sinkronisasi": "sync",
      "Nomor WhatsApp": "phone",
      "Outlet": "outlet",
      "PIN Kasir": "pin",
    }[title] || "profile";
  }
  return `
    <article class="transaction-row">
      <div style="display:flex;align-items:center;gap:12px">
        <span class="icon-tile ${color}">${icon(iconName, 22)}</span>
        <div>
          <h3>${title}</h3>
          <p class="caption">${description}</p>
        </div>
      </div>
      <button class="button secondary" onclick="openProfilePanel('${key}')">Detail</button>
    </article>
  `;
}

function profilePanel() {
  const user = state.currentUser || accounts[0];
  const panel = state.profilePanel;
  const titles = {
    printer: "Printer Struk",
    sync: "Sinkronisasi",
    phone: "Nomor WhatsApp",
    outlet: "Outlet",
    pin: "PIN Kasir",
    newBooking: "Booking Baru",
  };
  return `
    <div class="modal-backdrop" onclick="if(event.target===this) closeProfilePanel()">
      <section class="payment-sheet settings-sheet">
        <div class="payment-total">
          <p class="caption">Pengaturan Kasir</p>
          <strong>${titles[panel] || "Detail Akun"}</strong>
        </div>
        <div class="payment-body">
          ${profilePanelBody(panel, user)}
        </div>
      </section>
    </div>
  `;
}

function profilePanelBody(panel, user) {
  if (panel === "newBooking") {
    return `
      <label class="field-label">Layanan
        <select value="${state.booking.serviceId}" onchange="state.booking.serviceId=Number(this.value)">
          ${services.filter((item) => item.type === "layanan").map((item) => `<option value="${item.id}" ${state.booking.serviceId === item.id ? "selected" : ""}>${item.name} - ${rupiah(item.price)}</option>`).join("")}
        </select>
      </label>
      <label class="field-label">Barber
        <select value="${state.booking.barberId}" onchange="state.booking.barberId=this.value">
          ${barbers.map((barber) => `<option value="${barber.id}" ${state.booking.barberId === barber.id ? "selected" : ""}>${barber.name}</option>`).join("")}
        </select>
      </label>
      <label class="field-label">Jam
        <select value="${state.booking.slot}" onchange="state.booking.slot=this.value">
          ${["09:00", "09:30", "10:30", "11:00", "13:00", "13:30", "15:00", "16:30", "17:00"].map((slot) => `<option value="${slot}" ${state.booking.slot === slot ? "selected" : ""}>${slot}</option>`).join("")}
        </select>
      </label>
      <label class="field-label">Nama Pelanggan
        <input value="${state.booking.name}" oninput="state.booking.name=this.value" />
      </label>
      <label class="field-label">Nomor WhatsApp
        <input inputmode="tel" value="${state.booking.phone}" oninput="state.booking.phone=this.value" />
      </label>
      <button class="button primary full" onclick="createCashierBooking()">${icon("check", 18)} Simpan Booking</button>
      <button class="button secondary full" onclick="closeProfilePanel()">Batal</button>
    `;
  }
  if (panel === "printer") {
    return `
      <div class="settings-card">
        <span class="icon-tile success">${icon("receipt", 24)}</span>
        <div>
          <h3>Printer siap dipakai</h3>
          <p class="caption">Mode demo: struk akan memakai dialog cetak browser.</p>
        </div>
      </div>
      <button class="button primary full" onclick="window.print()">${icon("receipt", 18)} Tes Cetak Struk</button>
      <button class="button secondary full" onclick="closeProfilePanel()">Tutup</button>
    `;
  }
  if (panel === "sync") {
    return `
      <div class="settings-card">
        <span class="icon-tile warning">${icon("sync", 24)}</span>
        <div>
          <h3>${isCloudEnabled() ? "Supabase aktif" : "Belum tersambung Supabase"}</h3>
          <p class="caption">${isCloudEnabled() ? "Data bisa ditarik ulang dari server." : "Isi URL dan anon key di config.js untuk sinkron online."}</p>
        </div>
      </div>
      <button class="button primary full" onclick="loadCloudData();closeProfilePanel()">${icon("sync", 18)} Sinkronkan Sekarang</button>
      <button class="button secondary full" onclick="closeProfilePanel()">Tutup</button>
    `;
  }
  if (panel === "phone") {
    return `
      <label class="field-label">Nomor WhatsApp
        <input inputmode="tel" value="${state.profilePhone || user.phone}" oninput="state.profilePhone=this.value" />
      </label>
      <button class="button primary full" onclick="saveCurrentUserProfile()">${icon("check", 18)} Simpan Nomor</button>
      <button class="button secondary full" onclick="closeProfilePanel()">Batal</button>
    `;
  }
  if (panel === "outlet") {
    return `
      <label class="field-label">Nama Outlet
        <input value="${state.profileOutlet || user.outlet}" oninput="state.profileOutlet=this.value" />
      </label>
      <button class="button primary full" onclick="saveCurrentUserProfile()">${icon("check", 18)} Simpan Outlet</button>
      <button class="button secondary full" onclick="closeProfilePanel()">Batal</button>
    `;
  }
  return `
    <label class="field-label">PIN Baru
      <input type="password" inputmode="numeric" maxlength="6" placeholder="Minimal 4 digit" value="${state.profilePin}" oninput="state.profilePin=this.value" onkeydown="if(event.key==='Enter') saveCashierPin()" />
    </label>
    <button class="button primary full" onclick="saveCashierPin()">${icon("check", 18)} Simpan PIN</button>
    <button class="button secondary full" onclick="closeProfilePanel()">Batal</button>
  `;
}

function statCard(iconName, label, value, color) {
  return `
    <article class="card stat-card" onclick="showToast('info','Membuka laporan ${label}')">
      <span class="icon-tile ${color}">${icon(iconName, 24)}</span>
      <div>
        <span class="caption">${label}</span>
        <strong class="stat-value">${value}</strong>
      </div>
    </article>
  `;
}

function cashierPOS() {
  const term = state.search.toLowerCase();
  const visible = services.filter((item) => item.type === state.tab && item.name.toLowerCase().includes(term));
  return `
    <main class="page">
      <div class="page-title">
        <div>
          <h1>POS Transaksi</h1>
          <p class="caption">Pilih layanan, cek keranjang, lalu bayar</p>
        </div>
        <button class="button secondary" onclick="setState({cashierScreen:'dashboard'})">Kembali</button>
      </div>

      <section class="pos-layout">
        <div class="panel">
          <div class="toolbar">
            <div class="segmented">
              <button class="${state.tab === "layanan" ? "active" : ""}" onclick="setState({tab:'layanan'})">Layanan</button>
              <button class="${state.tab === "produk" ? "active" : ""}" onclick="setState({tab:'produk'})">Produk</button>
            </div>
            <label class="search">
              ${icon("search", 22)}
              <input type="search" placeholder="Cari layanan..." value="${state.search}" oninput="setState({search:this.value})" />
            </label>
          </div>

          <div class="service-list">
            ${state.isLoadingServices
              ? Array.from({ length: 4 }, () => `<div class="skeleton-card"></div>`).join("")
              : visible.map(serviceCard).join("")}
          </div>
        </div>

        <aside class="panel cart-panel">
          <h2>Keranjang</h2>
          <select class="customer-select">
            <option>Walk-in</option>
            <option>Tambah pelanggan cepat</option>
            <option>Andi</option>
          </select>
          ${state.cart.length ? cartList() : emptyCart()}
          <div class="cart-total">
            <div class="total-line"><span>Total</span><strong>${rupiah(cartTotal())}</strong></div>
            <button class="button primary full" ${state.cart.length ? "" : "disabled"} onclick="setState({paymentOpen:true})">${icon("wallet", 20)} BAYAR</button>
          </div>
        </aside>
      </section>
    </main>
    ${bottomNav("transaksi")}
    ${state.paymentOpen ? paymentSheet() : ""}
  `;
}

function serviceCard(item) {
  return `
    <article class="service-card ${item.disabled ? "disabled" : ""}">
      <div class="service-main">
        <span class="icon-tile ${item.color}">${icon(item.icon, 24)}</span>
        <div>
          <h3>${item.name}</h3>
          <p class="caption">${item.duration}</p>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:12px">
        <strong class="price">${rupiah(item.price)}</strong>
        ${item.disabled ? `<span class="badge warning">Habis</span>` : `<button class="icon-button" title="Tambah ${item.name}" onclick='addToCart(${JSON.stringify(item)})'>${icon("plus", 22)}</button>`}
      </div>
    </article>
  `;
}

function cartList() {
  return `
    <div class="cart-list">
      ${state.cart.map((item) => `
        <article class="cart-row">
          <div>
            <h3>${item.name}</h3>
            <p class="caption">${item.qty} x ${rupiah(item.price)}</p>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <strong>${rupiah(item.qty * item.price)}</strong>
            <button class="button danger" title="Hapus" onclick="removeFromCart(${item.id})">${icon("trash", 18)}</button>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function emptyCart() {
  return `
    <div class="empty-state">
      ${icon("receipt", 58)}
      <div>
        <h3>Keranjang kosong</h3>
        <p class="caption">Tambahkan layanan dari panel kiri</p>
      </div>
    </div>
  `;
}

function paymentSheet() {
  const total = cartTotal();
  if (!state.qrisRef || state.qrisRef === "QR-0001") {
    state.qrisRef = `QR-${Date.now().toString().slice(-6)}`;
  }
  const change = Math.max(0, state.cashAmount - total);
  const canConfirm = state.paymentMethod && (state.paymentMethod !== "tunai" || state.cashAmount >= total);
  const method = (key, label, iconName) => `
    <button class="method-card ${state.paymentMethod === key ? "active" : ""}" onclick="setState({paymentMethod:'${key}'})">
      ${icon(iconName, 30)}
      ${label}
    </button>
  `;
  return `
    <div class="modal-backdrop">
      <section class="payment-sheet">
        <header class="payment-total">
          <span>Total Pembayaran</span>
          <strong>${rupiah(total)}</strong>
        </header>
        <div class="payment-body">
          <div class="payment-methods">
            ${method("tunai", "Tunai", "wallet")}
            ${method("qris", "QRIS", "qris")}
            ${method("kartu", "Kartu", "card")}
          </div>

          ${state.paymentMethod === "qris" ? qrisPayment(total) : ""}

          ${state.paymentMethod === "tunai" ? cashPad(total, change) : ""}

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <button class="button secondary full" onclick="setState({paymentOpen:false,paymentMethod:'',cashAmount:0})">Batal</button>
            <button class="button primary full" ${canConfirm ? "" : "disabled"} onclick="completePayment()">KONFIRMASI</button>
          </div>
        </div>
      </section>
    </div>
  `;
}

function qrisPayment(total) {
  const matrix = [
    1,1,1,1,1,0,1,0,1,0,1,1,1,1,1,
    1,0,0,0,1,0,0,1,0,0,1,0,0,0,1,
    1,0,1,0,1,1,1,0,1,1,1,0,1,0,1,
    1,0,0,0,1,0,1,1,0,0,1,0,0,0,1,
    1,1,1,1,1,0,1,0,1,0,1,1,1,1,1,
    0,0,1,0,0,1,0,1,1,1,0,0,1,0,0,
    1,0,1,1,1,0,1,1,0,1,1,1,0,1,1,
    0,1,0,1,0,1,1,0,1,0,1,0,1,1,0,
    1,1,0,1,1,0,0,1,1,0,1,1,1,0,1,
    0,0,1,0,1,1,0,1,0,1,0,1,0,1,0,
    1,1,1,1,1,0,1,0,1,1,1,0,1,1,1,
    1,0,0,0,1,1,0,1,0,0,1,1,0,0,1,
    1,0,1,0,1,0,1,1,1,0,1,0,1,0,1,
    1,0,0,0,1,0,0,1,0,1,1,0,0,0,1,
    1,1,1,1,1,1,0,0,1,0,1,1,1,1,1,
  ];
  return `
    <section class="qris-card card">
      <div class="qris-summary">
        <div>
          <h3>QRIS YM-W HAIRCUT</h3>
          <p class="caption">Merchant: YM-W HAIRCUT Cabang Utama</p>
          <p class="caption">Kode: ${state.qrisRef}</p>
        </div>
        <strong class="price">${rupiah(total)}</strong>
      </div>
      <div class="qr-box" aria-label="Demo QRIS code">
        ${matrix.map((cell) => `<span class="${cell ? "on" : ""}"></span>`).join("")}
      </div>
      <div class="qris-note">
        <span class="badge warning">Auto-refresh 60 detik</span>
        <span class="caption">Scan dengan aplikasi e-wallet atau mobile banking pelanggan.</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <button class="button secondary full" onclick="state.qrisRef='QR-' + Date.now().toString().slice(-6);render()">${icon("sync", 18)} Refresh QR</button>
        <button class="button primary full" onclick="completePayment()">${icon("check", 18)} Sudah Dibayar</button>
      </div>
    </section>
  `;
}

function cashPad(total, change) {
  const append = (n) => `setState({cashAmount:Number(String(state.cashAmount || '') + '${n}')})`;
  return `
    <div class="cash-display"><span>Uang diterima</span><strong>${rupiah(state.cashAmount)}</strong></div>
    <div class="quick-amounts">
      <button onclick="setState({cashAmount:50000})">50K</button>
      <button onclick="setState({cashAmount:100000})">100K</button>
      <button onclick="setState({cashAmount:${total}})">Pas</button>
    </div>
    <div class="numpad">
      ${[1,2,3,4,5,6,7,8,9].map((n) => `<button onclick="${append(n)}">${n}</button>`).join("")}
      <button onclick="setState({cashAmount:0})">C</button>
      <button onclick="${append(0)}">0</button>
      <button onclick="setState({cashAmount:Math.floor(state.cashAmount / 10)})">⌫</button>
    </div>
    <div class="change-box">Kembalian: ${rupiah(change)}</div>
  `;
}

function bottomNav(active) {
  const item = (key, label, iconName, action) => `<button class="${active === key ? "active" : ""}" onclick="${action}">${icon(iconName, 22)}<span>${label}</span></button>`;
  return `
    <nav class="bottom-nav" aria-label="Navigasi kasir">
      ${item("home", "Home", "home", "setState({cashierScreen:'dashboard'})")}
      ${item("transaksi", "Transaksi", "receipt", "simulateLoading()")}
      ${item("booking", "Booking", "calendar", "setState({cashierScreen:'booking'})")}
      ${item("akun", "Akun", "user", "setState({cashierScreen:'profile'})")}
    </nav>
  `;
}

function adminDashboard() {
  const stats = transactionStats();
  const avg = stats.count ? Math.round(stats.revenue / stats.count) : 0;
  return `
    <div class="admin-layout">
      <aside class="sidebar">
        ${sideItem("Dashboard", "home", true)}
        ${sideItem("Transaksi", "receipt")}
        ${sideItem("Booking", "calendar")}
        ${sideItem("Laporan", "chart")}
      </aside>
      <main class="admin-main">
        <div class="page-title">
          <div>
            <h1>Dashboard Admin</h1>
            <p class="caption">Ringkasan performa hari ini</p>
          </div>
          <div class="segmented">
            <button class="active">7D</button>
            <button>30D</button>
            <button>90D</button>
          </div>
        </div>
        <section class="grid kpi-grid">
          ${kpi("Omzet", rupiah(stats.revenue), "chart", "success")}
          ${kpi("Transaksi", String(stats.count), "receipt", "accent")}
          ${kpi("Booking", String(stats.bookingCount), "calendar", "info")}
          ${kpi("Rata-rata", rupiah(avg), "wallet", "warning")}
        </section>
        <section class="grid" style="grid-template-columns:minmax(0,1.2fr) minmax(360px,.8fr);margin-top:16px">
          <article class="card chart-card">
            <div class="section-head"><h2>Grafik Omzet</h2><span class="badge">Hover detail</span></div>
            <div class="chart-wrap">
              ${[48,70,55,92,78,104,88].map((height, index) => `<div class="bar"><span style="height:${height}%"></span><span>H${index + 1}</span></div>`).join("")}
            </div>
          </article>
          <article class="card table-card">
            <div class="section-head">
              <h2>Transaksi</h2>
              <div class="action-row">
                <button class="button secondary" onclick="refreshData()">${icon("sync", 18)} Refresh</button>
                <button class="button danger" onclick="resetTransactions()">${icon("trash", 18)} Reset</button>
              </div>
            </div>
            <table class="data-table">
              <thead><tr><th>Nama</th><th>Layanan</th><th>Total</th><th>Metode</th></tr></thead>
              <tbody>
                ${transactions.slice(0, 10).map((row) => `<tr><td>${row.name}</td><td>${row.service}</td><td>${rupiah(row.total)}</td><td>${row.method || "Tunai"}</td></tr>`).join("")}
              </tbody>
            </table>
          </article>
        </section>
      </main>
    </div>
  `;
}

function sideItem(label, iconName, active = false) {
  return `<button class="side-item ${active ? "active" : ""}" title="${label}">${icon(iconName, 20)}<span>${label}</span></button>`;
}

function kpi(label, value, iconName, color) {
  return `
    <article class="card kpi-card">
      <span class="icon-tile ${color}">${icon(iconName, 22)}</span>
      <div><span class="caption">${label}</span><strong class="stat-value">${value}</strong></div>
    </article>
  `;
}

function customerBooking() {
  return `
    <main class="page booking-shell">
      ${state.booking.success ? bookingSuccess() : `
        <div class="page-title">
          <div>
            <h1>Booking Barber</h1>
            <p class="caption">Langkah ${state.bookingStep} dari 4</p>
          </div>
        </div>
        <div class="stepper">${[1,2,3,4].map((step) => `<span class="step ${step <= state.bookingStep ? "active" : ""}"></span>`).join("")}</div>
        ${bookingStepContent()}
      `}
    </main>
  `;
}

function bookingStepContent() {
  if (state.bookingStep === 1) return `
    <section>
      <h2>Pilih Layanan</h2>
      <div style="margin-top:12px">
        ${services.filter((item) => item.type === "layanan").map((item) => `
          <button class="booking-card ${state.booking.serviceId === item.id ? "selected" : ""}" onclick="state.booking.serviceId=${item.id};render()">
            <div style="display:flex;align-items:center;gap:12px">
              <span class="icon-tile ${item.color}">${icon(item.icon, 22)}</span>
              <span><strong>${item.name}</strong><p class="caption">${item.duration} • ${rupiah(item.price)}</p></span>
            </div>
            ${state.booking.serviceId === item.id ? icon("check", 22) : ""}
          </button>
        `).join("")}
      </div>
      ${bookingActions(false, true)}
    </section>
  `;

  if (state.bookingStep === 2) return `
    <section>
      <h2>Pilih Barber</h2>
      <div class="avatar-row" style="margin-top:12px">
        ${barbers.map((barber) => `
          <button class="avatar-card ${state.booking.barberId === barber.id ? "selected" : ""}" onclick="state.booking.barberId='${barber.id}';render()">
            <span class="avatar">${barber.name.slice(0, 1)}</span>
            <strong>${barber.name}</strong>
            <p class="caption">${barber.rating}</p>
          </button>
        `).join("")}
      </div>
      ${bookingActions(true, true)}
    </section>
  `;

  if (state.bookingStep === 3) {
    const slots = ["09:00", "09:30", "10:30", "11:00", "13:00", "13:30", "15:00", "16:30", "17:00"];
    return `
      <section>
        <h2>Pilih Jadwal</h2>
        <div class="date-row" style="margin-top:12px">
          ${["Hari ini","Besok","Senin","Selasa","Rabu","Kamis","Jumat"].map((day, index) => `
            <button class="date-card ${state.booking.dateIndex === index ? "selected" : ""}" onclick="state.booking.dateIndex=${index};render()">
              <strong>${day}</strong>
              <p class="caption">${index + 2} Mei</p>
            </button>
          `).join("")}
        </div>
        <div class="slot-grid">
          ${slots.map((slot, index) => {
            const booked = index === 1 || index === 5;
            return `<button class="slot ${booked ? "booked" : ""} ${state.booking.slot === slot ? "selected" : ""}" ${booked ? "disabled" : ""} onclick="state.booking.slot='${slot}';render()">${slot}</button>`;
          }).join("")}
        </div>
        ${bookingActions(true, true)}
      </section>
    `;
  }

  const selectedService = services.find((item) => item.id === state.booking.serviceId);
  const selectedBarber = barbers.find((item) => item.id === state.booking.barberId);
  return `
    <section>
      <h2>Konfirmasi</h2>
      <article class="card" style="padding:16px;margin:12px 0">
        <p><strong>${selectedService.name}</strong></p>
        <p class="caption">${selectedBarber.name} • ${state.booking.slot} • ${rupiah(selectedService.price)}</p>
      </article>
      <div class="form-grid">
        <input placeholder="Nama" value="${state.booking.name}" oninput="state.booking.name=this.value" />
        <input placeholder="Nomor WhatsApp" value="${state.booking.phone}" oninput="state.booking.phone=this.value" />
      </div>
      ${bookingActions(true, false)}
      <button class="button primary full" style="margin-top:10px" onclick="confirmBooking()">Konfirmasi Booking</button>
    </section>
  `;
}

function bookingActions(back, next) {
  return `
    <div style="display:grid;grid-template-columns:${back ? "1fr 1fr" : "1fr"};gap:10px;margin-top:16px">
      ${back ? `<button class="button secondary full" onclick="state.bookingStep-=1;render()">Kembali</button>` : ""}
      ${next ? `<button class="button primary full" onclick="state.bookingStep+=1;render()">Lanjut</button>` : ""}
    </div>
  `;
}

function confirmBooking() {
  if (!state.booking.name || !state.booking.phone) {
    showToast("error", "Nama dan nomor WA wajib diisi");
    return;
  }
  const selectedService = services.find((item) => item.id === state.booking.serviceId);
  const selectedBarber = barbers.find((item) => item.id === state.booking.barberId);
  const booking = {
    id: Date.now(),
    date: todayDate(),
    time: state.booking.slot,
    name: state.booking.name.trim(),
    phone: state.booking.phone.trim(),
    service: selectedService.name,
    barber: selectedBarber.name,
    status: "Dikonfirmasi",
    tone: "success",
  };
  cashierBookings.unshift(booking);
  cloudInsert("cashier_bookings", booking);
  saveAppData();
  showToast("success", "Booking dikonfirmasi");
  state.booking.success = true;
  render();
}

function bookingSuccess() {
  const selectedService = services.find((item) => item.id === state.booking.serviceId);
  return `
    <section class="success-box">
      <div class="confetti">${icon("check", 42)}</div>
      <div>
        <h1>Booking Berhasil</h1>
        <p class="caption">${selectedService.name} • ${state.booking.slot}</p>
      </div>
      <button class="button secondary" onclick="addBookingToCalendar()">${icon("calendar", 18)} Tambah ke Kalender</button>
      <button class="button primary full" onclick="state.booking={serviceId:1,barberId:'any',dateIndex:0,slot:'10:30',name:'',phone:'',success:false};state.bookingStep=1;render()">Booking Lagi</button>
    </section>
  `;
}

function render() {
  const app = document.getElementById("app");
  if (!state.loggedIn) {
    app.innerHTML = loginScreen();
    return;
  }
  const content = state.role === "kasir"
    ? (state.cashierScreen === "dashboard" ? cashierDashboard() : state.cashierScreen === "profile" ? cashierProfile() : state.cashierScreen === "booking" ? cashierBookingsScreen() : cashierPOS())
    : state.role === "admin"
      ? adminDashboard()
      : customerBooking();
  app.innerHTML = `<div class="app-shell">${topbar()}${content}${state.profilePanel ? profilePanel() : ""}</div>`;
}

loadAppData();
render();
loadCloudData();

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
