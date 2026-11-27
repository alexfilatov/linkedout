(() => {
  'use strict';
  const api = globalThis.browser ?? globalThis.chrome;
  const enabled = document.getElementById('enabled');
  const pageStatus = document.getElementById('page-status');
  const desktop = document.getElementById('desktop');
  const desktopStatus = document.getElementById('desktop-status');
  const error = document.getElementById('error');
  const canManageDesktop = api.runtime.getManifest().optional_permissions?.includes('contentSettings') === true;
  let blocking = false;
  const showError = (message) => { error.textContent = message; error.hidden = false; };
  const clearError = () => { error.hidden = true; error.textContent = ''; };

  async function refreshTab() {
    if (!enabled.checked) { pageStatus.textContent = 'Paused. Premium has the floor again.'; return; }
    try {
      const [tab] = await api.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id || !tab.url?.startsWith('https://www.linkedin.com/')) {
        pageStatus.textContent = 'Ready for your next LinkedIn visit.';
        return;
      }
      const state = await api.tabs.sendMessage(tab.id, { type: 'linkedout:status' });
      pageStatus.textContent = `${state.hidden} Premium ${state.hidden === 1 ? 'upsell' : 'upsells'} hidden on this page.`;
    } catch {
      pageStatus.textContent = 'Reload LinkedIn to activate LinkedOut on this tab.';
    }
  }
  async function refreshDesktop() {
    if (!canManageDesktop) {
      desktop.textContent = 'How to silence Safari notifications';
      desktopStatus.textContent = 'In Safari → Settings → Websites → Notifications, set linkedin.com to Deny. This blocks all LinkedIn desktop alerts.';
      desktop.disabled = false;
      return;
    }
    // Track only our rule. An existing browser/user block must never be undone.
    ({ desktopBlocked: blocking = false } = await api.storage.local.get({ desktopBlocked: false }));
    const granted = await api.permissions.contains({ permissions: ['contentSettings'] });
    if (!granted && blocking) {
      blocking = false;
      await api.storage.local.set({ desktopBlocked: false });
    }
    desktop.textContent = blocking ? 'Remove LinkedOut’s desktop block' : 'Block all LinkedIn desktop alerts';
    if (granted) {
      const actual = await api.contentSettings.notifications.get({ primaryUrl: 'https://www.linkedin.com/' });
      desktopStatus.textContent = actual.setting === 'block'
        ? 'LinkedIn desktop notifications are blocked.'
        : 'LinkedIn desktop notifications follow your browser settings.';
    } else {
      desktopStatus.textContent = 'Optional: Chrome will ask for permission to change site settings.';
    }
    desktop.disabled = false;
  }
  enabled.addEventListener('change', async () => {
    clearError(); enabled.disabled = true;
    try {
      await api.storage.local.set({ enabled: enabled.checked });
      await refreshTab();
    } catch { enabled.checked = !enabled.checked; showError('Couldn’t save the filter setting. Close LinkedOut and try again.'); }
    finally { enabled.disabled = false; }
  });
  desktop.addEventListener('click', async () => {
    clearError();
    if (!canManageDesktop) {
      desktopStatus.textContent = 'Open Safari → Settings → Websites → Notifications. Find linkedin.com and choose Deny. If it isn’t listed, LinkedIn has no saved notification permission.';
      return;
    }
    desktop.disabled = true;
    try {
      // Call request directly in this user gesture, before any await.
      if (!blocking && !(await api.permissions.request({ permissions: ['contentSettings'] }))) {
        desktopStatus.textContent = 'Permission wasn’t granted. You can block LinkedIn in Chrome’s site settings instead.';
        return;
      }
      if (blocking) {
        // Only this extension's notification rules are cleared, restoring the
        // pre-existing browser/user policy, rather than forcing "allow".
        await api.contentSettings.notifications.clear({ scope: 'regular' });
      } else {
        await api.contentSettings.notifications.set({ primaryPattern: 'https://[*.]linkedin.com/*', setting: 'block', scope: 'regular' });
      }
      blocking = !blocking;
      await api.storage.local.set({ desktopBlocked: blocking });
      await refreshDesktop();
    } catch { showError('Couldn’t update desktop notifications. Try again or use your browser’s site settings.'); }
    finally { desktop.disabled = false; }
  });
  async function init() {
    try {
      const settings = await api.storage.local.get({ enabled: true });
      enabled.checked = settings.enabled !== false;
      enabled.disabled = false;
      await Promise.all([refreshTab(), refreshDesktop()]);
    } catch { showError('Couldn’t load settings. Close LinkedOut and try again.'); }
  }
  init();
})();
