// ZEYTHAN Sunucu Aktiviteleri
// Discord sunucusunda "şu an ne oynanıyor" verisini gösterir.
// Gizlilik: API yalnızca sayıları döndürür; üye adı/avatar bilgisi gösterilmez.
(function () {
    'use strict';

    var REFRESH_MS = 45000;

    // API adresi boşken kullanılan örnek veri (tasarım önizlemesi)
    var DEMO_ACTIVITY = {
        online: 29,
        withActivity: 12,
        updatedAt: null,
        games: [
            { name: 'Custom Status', typeLabel: 'Özel', image: null, count: 5 },
            { name: 'Arthion', typeLabel: 'Oynuyor', image: null, count: 4 },
            { name: 'Aena2 Global', typeLabel: 'Oynuyor', image: null, count: 1 },
            { name: 'Arena Breakout: Infinite', typeLabel: 'Oynuyor', image: 'https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/2073620/library_600x900.jpg', count: 1 },
            { name: 'Counter-Strike 2', typeLabel: 'Oynuyor', image: 'https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/730/library_600x900.jpg', count: 1 },
            { name: 'Valorant', typeLabel: 'Oynuyor', image: 'https://static-cdn.jtvnw.net/ttv-boxart/VALORANT-600x800.jpg', count: 1 }
        ]
    };

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function getConfig() {
        try {
            // config.js "const CONFIG" ile tanımlıyor; window üzerinde görünmez.
            return typeof CONFIG !== 'undefined' ? CONFIG : {};
        } catch (error) {
            return {};
        }
    }

    function buildApiUrl() {
        var cfg = getConfig();
        var base = (cfg.activityApiUrl || '').trim();
        if (!base) {
            return '';
        }
        var guild = (cfg.activityGuildId || '').trim();
        if (!guild) {
            return base;
        }
        return base + (base.indexOf('?') === -1 ? '?' : '&') + 'guild=' + encodeURIComponent(guild);
    }

    function normalize(raw) {
        if (!raw || !Array.isArray(raw.games)) {
            return null;
        }
        var games = raw.games
            .map(function (game) {
                return {
                    name: String(game && game.name ? game.name : 'Bilinmeyen etkinlik'),
                    typeLabel: String(game && game.typeLabel ? game.typeLabel : 'Etkinlik'),
                    image: game && game.image ? String(game.image) : null,
                    count: Number(game && game.count) || 0
                };
            })
            .filter(function (game) {
                return game.count > 0;
            })
            .sort(function (a, b) {
                // Custom Status ("Özel") her zaman en altta kalsın.
                var aCustom = a.typeLabel.toLocaleLowerCase('tr-TR') === 'özel';
                var bCustom = b.typeLabel.toLocaleLowerCase('tr-TR') === 'özel';
                if (aCustom !== bCustom) {
                    return aCustom ? 1 : -1;
                }
                return b.count - a.count;
            });

        return {
            online: Number(raw.online) || 0,
            withActivity: Number(raw.withActivity) || 0,
            updatedAt: raw.updatedAt || null,
            games: games
        };
    }

    function formatTime(iso) {
        var date = iso ? new Date(iso) : new Date();
        if (isNaN(date.getTime())) {
            date = new Date();
        }
        return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    }

    function renderIcon(game) {
        var isCustom = game.typeLabel.toLocaleLowerCase('tr-TR') === 'özel';
        var fallback = isCustom
            ? '<i class="fas fa-star" aria-hidden="true"></i>'
            : escapeHtml(game.name.charAt(0).toLocaleUpperCase('tr-TR'));
        var image = game.image
            ? '<img src="' + escapeHtml(game.image) + '" alt="" loading="lazy" decoding="async" onerror="this.remove()">'
            : '';
        return '<span class="zeythan-activity-icon' + (isCustom ? ' is-custom' : '') + '">' +
            '<span class="zeythan-activity-icon-fallback">' + fallback + '</span>' + image +
            '</span>';
    }

    function renderCard(game) {
        return '<article class="zeythan-activity-card">' +
            renderIcon(game) +
            '<div class="zeythan-activity-info">' +
            '<h3 class="zeythan-activity-name" title="' + escapeHtml(game.name) + '">' + escapeHtml(game.name) + '</h3>' +
            '<span class="zeythan-activity-type">' + escapeHtml(game.typeLabel) + '</span>' +
            '</div>' +
            '<div class="zeythan-activity-count"><strong>' + game.count + '</strong><span>kişi</span></div>' +
            '</article>';
    }

    function renderMarkup(data) {
        var stats = '<div class="zeythan-activity-stats">' +
            '<span class="zeythan-stat-pill zeythan-stat-online"><i class="fas fa-circle" aria-hidden="true"></i> ' + data.online + ' çevrimiçi</span>' +
            '<span class="zeythan-stat-pill zeythan-stat-active"><i class="fas fa-gamepad" aria-hidden="true"></i> ' + data.withActivity + ' etkinlikte</span>' +
            '<span class="zeythan-activity-updated">Son güncelleme ' + formatTime(data.updatedAt) + '</span>' +
            '</div>';

        var body;
        if (data.games.length === 0) {
            body = '<div class="zeythan-activity-empty"><i class="fas fa-moon" aria-hidden="true"></i> Şu an oyun oynayan kimse yok.</div>';
        } else {
            body = '<div class="zeythan-activity-grid">' + data.games.map(renderCard).join('') + '</div>';
        }

        return stats + body;
    }

    function renderEmptyState(container, message) {
        container.innerHTML = '<div class="zeythan-activity-empty"><i class="fas fa-triangle-exclamation" aria-hidden="true"></i> ' +
            escapeHtml(message) + '</div>';
    }

    var summaryText = function (data) {
        var gameCount = data.games.length;
        return data.withActivity + ' kişi şu an oyunda · ' + gameCount + ' oyun';
    };

    function applyData(data) {
        document.querySelectorAll('[data-activity-container]').forEach(function (container) {
            container.innerHTML = renderMarkup(data);
        });

        var chip = document.querySelector('[data-activity-chip]');
        if (chip) {
            var text = chip.querySelector('[data-activity-chip-text]');
            if (text) {
                text.textContent = summaryText(data);
            }
            chip.hidden = false;
        }
    }

    function run() {
        var containers = document.querySelectorAll('[data-activity-container]');
        var chip = document.querySelector('[data-activity-chip]');
        if (containers.length === 0 && !chip) {
            return;
        }

        var url = buildApiUrl();
        var token = String(getConfig().activityToken || '').trim();
        var lastData = null;

        var load = function () {
            if (!url) {
                var demo = normalize(DEMO_ACTIVITY);
                if (demo) {
                    applyData(demo);
                }
                return;
            }

            var controller = typeof AbortController === 'function' ? new AbortController() : null;
            var timer = controller ? setTimeout(function () { controller.abort(); }, 8000) : null;

            var headers = { Accept: 'application/json' };
            if (token) {
                headers['x-api-token'] = token;
            }

            fetch(url, { signal: controller ? controller.signal : undefined, headers: headers })
                .then(function (response) {
                    if (!response.ok) {
                        throw new Error('HTTP ' + response.status);
                    }
                    return response.json();
                })
                .then(function (raw) {
                    var data = normalize(raw);
                    if (!data) {
                        throw new Error('Geçersiz yanıt');
                    }
                    lastData = data;
                    applyData(data);
                })
                .catch(function () {
                    if (lastData) {
                        applyData(lastData);
                    } else {
                        containers.forEach(function (container) {
                            renderEmptyState(container, 'Sunucu aktiviteleri şu an yüklenemiyor.');
                        });
                    }
                })
                .finally(function () {
                    if (timer) {
                        clearTimeout(timer);
                    }
                });
        };

        load();

        setInterval(function () {
            if (!document.hidden) {
                load();
            }
        }, REFRESH_MS);

        document.addEventListener('visibilitychange', function () {
            if (!document.hidden) {
                load();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }
})();
