// ZEYTHAN System Constants / Sistem Sabitleri
const CONFIG = {
  // Discord davet linki YEDEĞİ. Sayfadaki TÜM davet bağlantıları bu dosyadan
  // beslenir (data-config="discordUrl"). Normalde link aşağıdaki API'den
  // otomatik gelir; API'ye ulaşılamazsa bu adres kullanılır.
  // NOT: Bot günlük yenilediği için bu kod yaklaşık 24 saat sonra geçersiz
  // olur. O zaman getInviteUrl() API'den güncel kodu çeker.
  discordUrl: 'https://discord.gg/P5sqw3H5JF',

  // Otomatik davet linki API'si (bot üretir/yeniler). Üç alan dolduğu sürece
  // getInviteUrl() sayfadaki tüm davet bağlantılarını günceller.
  inviteApiUrl: 'https://zeythan.bahadirduzcan.com.tr/api/public/invite-link',
  inviteToken: '5906ae300241470c12f19055e0618f084dfe9bcbba6a31b4',
  inviteGuildId: '832402784522731540',

  cs2ServerIp: '194.105.5.172',
  cs2ConnectCommand: 'CONNECT 194.105.5.172',
  cs2SteamUrl: 'steam://connect/194.105.5.172',
  // Sunucu aktiviteleri uç noktası. Boş bırakılırsa activity.js demo veriyle çalışır.
  activityApiUrl: 'https://zeythan.bahadirduzcan.com.tr/api/public/activity',
  activityToken: '5906ae300241470c12f19055e0618f084dfe9bcbba6a31b4',
  activityGuildId: '832402784522731540',
};

// Davet kodunun gerçekten geçerli olduğunu doğrular (yalnızca Discord adresi kabul edilir).
function isValidDiscordInvite(url) {
  return /^https:\/\/discord\.(gg|com\/invite)\/[A-Za-z0-9-]+$/i.test(
    String(url || '').trim(),
  );
}

// Sayfadaki tüm davet bağlantılarını verilen adrese bağlar.
// Seçici href'e bakmaz: HTML'de href boş olduğu için 'a[href*="discord.gg"]'
// yaklaşımı linkleri bulamaz. Tek ölçüt data-config="discordUrl" olmalı.
function applyDiscordLinks(url) {
  const invite = String(url || CONFIG.discordUrl || '').trim();
  if (!isValidDiscordInvite(invite)) return;
  CONFIG.discordUrl = invite;
  document.querySelectorAll('a[data-config="discordUrl"]').forEach((el) => {
    el.href = invite;
  });
}

let inviteRequest = null;
let inviteRetryAt = 0;
// API'den gerçek kod gelene kadar false. Tıklama yakalayıcı bu bayrağa bakar:
// false ise href henüz yedek kod olabilir, tıklamayı tutup güncel kodu bekleriz.
let inviteResolved = false;
let resolvedInviteUrl = '';

// Botun ürettiği güncel davet linkini getirir. Aynı anda birden fazla çağrılırsa
// tek istek atılır; sonuç sayfa ömrü boyunca saklanır. Başarısız olursa yedek
// link (CONFIG.discordUrl) döner, böylece tıklama asla boş kalmaz.
function getInviteUrl() {
  const now = Date.now();
  if (inviteRequest && (!inviteRetryAt || now >= inviteRetryAt)) {
    return inviteRequest;
  }

  const base = String(CONFIG.inviteApiUrl || '').trim();
  if (!base) {
    return Promise.resolve(CONFIG.discordUrl);
  }

  let url =
    base +
    (base.indexOf('?') === -1 ? '?' : '&') +
    'guild=' +
    encodeURIComponent(String(CONFIG.inviteGuildId || '').trim());
  const token = String(CONFIG.inviteToken || '').trim();
  if (token) {
    url += '&token=' + encodeURIComponent(token);
  }

  const controller =
    typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), 8000) : null;

  inviteRequest = fetch(url, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
    signal: controller ? controller.signal : undefined,
  })
    .then((response) => {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    })
    .then((data) => {
      const invite =
        data && data.valid !== false ? String(data.inviteUrl || '').trim() : '';
      if (!isValidDiscordInvite(invite)) {
        throw new Error('API geçersiz davet adresi döndü');
      }
      inviteRetryAt = 0;
      inviteResolved = true;
      resolvedInviteUrl = invite;
      applyDiscordLinks(invite);
      return invite;
    })
    .catch((err) => {
      // Sessizce yutmak hatayı görünmez kılıyordu; kısa bir süre sonra tekrar dene.
      inviteRetryAt = Date.now() + 60000;
      console.warn(
        "[ZEYTHAN] Davet linki API'den alınamadı, yedek link kullanılıyor:",
        err && err.message,
      );
      return CONFIG.discordUrl;
    })
    .finally(() => {
      if (timer) clearTimeout(timer);
    });

  return inviteRequest;
}

// Davet linkine tıklandığında: güncel kod henüz bilinmiyorsa bekle, sonra aç.
// Böylece kullanıcı API yavaş yanıt verse bile süresi geçmiş koda düşmez.
function openInviteLink(event) {
  const link =
    event.target.closest && event.target.closest('a[data-config="discordUrl"]');
  if (!link) return;

  // API'den güncel kod geldiyse link zaten doğru; tarayıcı normal davranışına
  // devam etsin. (Ama yedek kod yazılmış olsa bile güncel kodla aynıysa
  // yeniden beklemenin anlamı yok.)
  if (inviteResolved && link.getAttribute('href') === resolvedInviteUrl) return;
  if (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0
  )
    return;

  event.preventDefault();
  getInviteUrl().then((invite) => {
    const popup = window.open(invite, '_blank', 'noopener');
    if (!popup) {
      // Popup engelliyse aynı sekmede git.
      window.location.href = invite;
    }
  });
}

// HTTP / HTTPS sunucu ortamında config.json dosyasından canlı veriyi çek
// (file:// protokolü fallback olarak CONFIG nesnesini kullanır).
// discordUrl bilinçli olarak korunur: davet linkinin tek kaynağı bu dosyadır.
if (window.location.protocol.startsWith('http')) {
  fetch('./config.json')
    .then((response) => response.json())
    .then((data) => {
      const incoming = Object.assign({}, data);
      delete incoming.discordUrl;
      Object.assign(CONFIG, incoming);
      applyConfig();
    })
    .catch((err) =>
      console.log(
        'config.json yüklenirken varsayılan veriler kullanılıyor:',
        err,
      ),
    );
}

function applyConfig() {
  applyDiscordLinks();

  // data-config özniteliğine sahip diğer tüm elemanları güncelle
  document.querySelectorAll('[data-config]').forEach((el) => {
    const key = el.getAttribute('data-config');
    if (!key || key === 'discordUrl' || !CONFIG[key]) return;
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.value = CONFIG[key];
    } else if (el.tagName === 'A') {
      el.href = CONFIG[key];
    } else {
      el.textContent = CONFIG[key];
    }
  });
}

document.addEventListener('click', openInviteLink, true);
document.addEventListener('DOMContentLoaded', () => {
  applyConfig();
  getInviteUrl();
});

// config.js ertelenmiş (defer) olarak yüklendiği için betik çalıştığında DOM
// hazırdır; href'leri hemen doldur, tıklama boşluğunu kapat.
applyConfig();
