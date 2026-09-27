// ZEYTHAN System Constants / Sistem Sabitleri
const CONFIG = {
    // Discord davet linki TEK KAYNAK: sadece buradaki kodu degistir.
    // applyConfig() sayfadaki tum discord.gg baglantilarini otomatik gunceller.
    discordUrl: "https://discord.gg/Br3wVHfJkg",
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

function applyConfig() {
    // Sayfadaki TÜM discord.gg bağlantılarını ve data-config="discordUrl" özniteliklerini otomatik bul ve güncelle
    document.querySelectorAll('a[href*="discord.gg"], .discord-link, [data-config="discordUrl"]').forEach(el => {
        if (el.tagName === 'A') {
            el.href = CONFIG.discordUrl;
        }
    });

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

document.addEventListener('DOMContentLoaded', applyConfig);
