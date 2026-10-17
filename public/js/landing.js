// GraceFlow Countdown — landing page interactions
(function () {
    "use strict";

    /* ---- Auto-disable download buttons whose files aren't built yet & track downloads ---- */
    document.querySelectorAll(".download-card").forEach(function (card) {
        var href = card.getAttribute("href");
        if (!href) return;

        // Only verify relative static download files, keep external & web app links active
        if (!href.startsWith('http') && !href.startsWith('/app') && window.location.protocol !== 'file:') {
            fetch(href, { method: "HEAD" }).then(function (res) {
                if (!res.ok) markUnavailable(card);
            }).catch(function () {
                markUnavailable(card);
            });
        }

        card.addEventListener("click", function () {
            var platform = card.id === "dl-windows" ? "Windows" : "macOS";
            if (window.gtag) {
                gtag('event', 'file_download', {
                    'file_extension': platform === 'Windows' ? 'exe' : 'dmg',
                    'file_name': 'GraceFlow-Church-Countdown-' + platform,
                    'link_url': href
                });
            }
            console.log("[Analytics] Download button clicked:", platform);
        });
    });

    function markUnavailable(card) {
        card.classList.add("disabled");
        var btn = card.querySelector(".dl-btn");
        if (btn) btn.textContent = "Coming soon";
    }

    /* ---- Light / dark mode toggle ---- */
    var toggle = document.getElementById("theme-toggle");
    var root = document.documentElement;
    var STORE_KEY = "graceflow_site_mode";

    function setMode(light) {
        if (light) {
            root.setAttribute("data-theme", "light");
            if (toggle) { toggle.textContent = "🌙"; toggle.setAttribute("aria-label", "Switch to dark mode"); }
        } else {
            root.removeAttribute("data-theme");
            if (toggle) { toggle.textContent = "☀️"; toggle.setAttribute("aria-label", "Switch to light mode"); }
        }
    }

    var stored = null;
    try { stored = localStorage.getItem(STORE_KEY); } catch (e) {}

    if (stored) {
        setMode(stored === "light");
    } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
        setMode(true);
    }

    if (toggle) {
        toggle.addEventListener("click", function () {
            var isLight = root.getAttribute("data-theme") === "light";
            setMode(!isLight);
            try { localStorage.setItem(STORE_KEY, isLight ? "dark" : "light"); } catch (e) {}
        });
    }

    /* ---- Scroll reveal ---- */
    var revealTargets = document.querySelectorAll(
        ".feature-card, .theme-card, .download-card, .faq-item, .hero-display, .operator-mockup"
    );

    if ("IntersectionObserver" in window) {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("revealed");
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });

        revealTargets.forEach(function (el) { io.observe(el); });
    } else {
        revealTargets.forEach(function (el) { el.classList.add("revealed"); });
    }
})();
