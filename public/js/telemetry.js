// Grace Flow — Analytics & Telemetry Engine (Built-in + GA4)

(function () {
  // 1. Detect Device & Operating System
  function getDeviceInfo() {
    const ua = navigator.userAgent || '';
    let os = 'Other';
    if (/Macintosh|Mac OS X/i.test(ua)) os = 'Mac';
    else if (/Windows/i.test(ua)) os = 'Windows';
    else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
    else if (/Android/i.test(ua)) os = 'Android';
    else if (/Linux/i.test(ua)) os = 'Linux';

    let device = 'Desktop';
    if (/iPad|Tablet/i.test(ua) || (os === 'Mac' && navigator.maxTouchPoints > 1)) {
      device = 'Tablet';
    } else if (/Mobi|Android|iPhone/i.test(ua)) {
      device = 'Mobile';
    }

    return { os, device };
  }

  // 2. Ping Built-In Server Telemetry
  try {
    const isStage = window.location.pathname.includes('/stage');
    const { os, device } = getDeviceInfo();

    fetch('/api/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page: isStage ? 'stage' : 'operator',
        os,
        device,
        referrer: document.referrer || '',
        screenRes: `${window.screen.width}x${window.screen.height}`
      })
    }).catch(() => {});
  } catch (e) {}

  // 3. Google Analytics 4 (GA4) Integration
  // Measurement ID can be configured here or loaded from localStorage / server config
  window.GA_MEASUREMENT_ID = window.GA_MEASUREMENT_ID || localStorage.getItem('grace_flow_ga_id') || 'G-MEASUREMENT_ID_PENDING';

  function initGoogleAnalytics(id) {
    if (!id || id === 'G-MEASUREMENT_ID_PENDING' || !id.startsWith('G-')) return;

    // Load gtag.js asynchronously
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;

    gtag('js', new Date());
    gtag('config', id, {
      page_title: document.title,
      page_path: window.location.pathname
    });

    // Helper to send custom events
    window.trackTimerEvent = function(eventName, params = {}) {
      if (typeof window.gtag === 'function') {
        window.gtag('event', eventName, params);
      }
    };
  }

  if (window.GA_MEASUREMENT_ID) {
    initGoogleAnalytics(window.GA_MEASUREMENT_ID);
  }
})();
