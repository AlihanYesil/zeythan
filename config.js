// ZEYTHAN System Constants / Sistem Sabitleri
const CONFIG = {
    // Discord davet linki YEDEĞİ. Normalde link aşağıdaki API'den otomatik gelir
    // (bot her gün yeniler). API'ye ulaşılamazsa bu adres kullanılır.
    discordUrl: "https://discord.gg/Br3wVHfJkg",

    // Otomatik davet linki API'si (bot üretir/yeniler). Üç alan dolduğu sürece
    // refreshInviteLink() sayfadaki tüm davet bağlantılarını günceller.
    inviteApiUrl: "https://zeythan.bahadirduzcan.com.tr/api/public/invite-link",
    inviteToken: "5906ae300241470c12f19055e0618f084dfe9bcbba6a31b4",
    inviteGuildId: "832402784522731540",

    cs2ServerIp: "194.105.5.172",
    cs2ConnectCommand: "CONNECT 194.105.5.172",
    cs2SteamUrl: "steam://connect/194.105.5.172",
    // Sunucu aktiviteleri uç noktası. Boş bırakılırsa activity.js demo veriyle çalışır.
    activityApiUrl: "https://zeythan.bahadirduzcan.com.tr/api/public/activity",
    activityToken: "5906ae300241470c12f19055e0618f084dfe9bcbba6a31b4",
    activityGuildId: "832402784522731540"
};

// HTTP / HTTPS sunucu ortamında config.json dosyasından canlı veriyi çek (file:// protokolü fallback olarak CONFIG nesnesini kullanır)
if (window.location.protocol.startsWith('http')) {
    fetch('./config.json')
        .then(response => response.json())
        .then(data => {
            Object.assign(CONFIG, data);
            applyConfig();
        })
        .catch(err => console.log('config.json yüklenirken varsayılan veriler kullanılıyor:', err));
}

// Sayfadaki TÜM discord.gg bağlantılarını geçerli davet linkiyle günceller.
function applyDiscordLinks() {
    if (!CONFIG.discordUrl) return;
    document.querySelectorAll('a[href*="discord.gg"], .discord-link, [data-config="discordUrl"]').forEach(el => {
        if (el.tagName === 'A') {
            el.href = CONFIG.discordUrl;
        }
    });
}

// Botun ürettiği güncel davet linkini çeker; başarılıysa tüm bağlantıları günceller.
// Hata durumunda yedek link (CONFIG.discordUrl) olduğu gibi kalır.
function refreshInviteLink() {
    const base = String(CONFIG.inviteApiUrl || '').trim();
    if (!base) return;

    let url = base + (base.indexOf('?') === -1 ? '?' : '&') + 'guild=' + encodeURIComponent(String(CONFIG.inviteGuildId || '').trim());
    const token = String(CONFIG.inviteToken || '').trim();
    if (token) {
        url += '&token=' + encodeURIComponent(token);
    }

    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), 8000) : null;

    fetch(url, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
        signal: controller ? controller.signal : undefined
    })
        .then(response => {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.json();
        })
        .then(data => {
            const invite = data && data.valid !== false ? String(data.inviteUrl || '').trim() : '';
            // Güvenlik: yalnızca discord davet adresi kabul edilir.
            if (/^https:\/\/discord\.(gg|com\/invite)\//i.test(invite)) {
                CONFIG.discordUrl = invite;
                applyDiscordLinks();
            }
        })
        .catch(() => { /* API yoksa yedek link kalır */ })
        .finally(() => {
            if (timer) clearTimeout(timer);
        });
}

function applyConfig() {
    applyDiscordLinks();

    // data-config özniteliğine sahip tüm elemanları güncelle
    document.querySelectorAll('[data-config]').forEach(el => {
        const key = el.getAttribute('data-config');
        if (CONFIG[key]) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.value = CONFIG[key];
            } else if (el.tagName === 'A') {
                el.href = CONFIG[key];
            } else {
                el.textContent = CONFIG[key];
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    applyConfig();
    refreshInviteLink();
});
