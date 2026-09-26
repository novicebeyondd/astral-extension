const astralApi = globalThis.browser ?? globalThis.chrome;
const astralRootId = "astral-extension-root";

const defaults = {
  enabled: true,
  preset: "custom",
  gain: 1,
  distortion: 0,
  square: 0,
  tube: 0,
  bass: 0,
  mid: 0,
  treble: 0,
  echo: 0,
  reverb: 0,
  bitcrush: false,
  stereoMotion: false
};

const presets = {
  flat: {
    gain: 1,
    distortion: 0,
    square: 0,
    tube: 0,
    bass: 0,
    mid: 0,
    treble: 0,
    echo: 0,
    reverb: 0,
    bitcrush: false,
    stereoMotion: false
  },
  bass: {
    gain: 1.05,
    distortion: 0,
    square: 0,
    tube: 18,
    bass: 28,
    mid: -4,
    treble: 6,
    echo: 0,
    reverb: 8,
    bitcrush: false,
    stereoMotion: false
  },
  radio: {
    gain: 0.92,
    distortion: 16,
    square: 0,
    tube: 8,
    bass: -18,
    mid: 22,
    treble: -12,
    echo: 0,
    reverb: 0,
    bitcrush: false,
    stereoMotion: false
  },
  loFi: {
    gain: 0.9,
    distortion: 8,
    square: 12,
    tube: 32,
    bass: 8,
    mid: -6,
    treble: -18,
    echo: 14,
    reverb: 18,
    bitcrush: true,
    stereoMotion: false
  },
  wide: {
    gain: 1,
    distortion: 0,
    square: 0,
    tube: 4,
    bass: 5,
    mid: 0,
    treble: 8,
    echo: 0,
    reverb: 12,
    bitcrush: false,
    stereoMotion: true
  }
};

const mergeSettings = (value = {}) => ({ ...defaults, ...value });

const storageGet = async (key) => {
  if (!astralApi?.storage?.local) return {};
  const result = astralApi.storage.local.get(key);
  return result && typeof result.then === "function"
    ? result
    : new Promise((resolve) => astralApi.storage.local.get(key, resolve));
};

const storageSet = async (value) => {
  if (!astralApi?.storage?.local) return;
  const result = astralApi.storage.local.set(value);
  if (result && typeof result.then === "function") await result;
};

const sendHookUpdate = (settings) => {
  window.postMessage({ source: "astral", type: "ASTRAL_SETTINGS", settings }, "*");
};

const resetSettings = () => {
  const reset = mergeSettings({ enabled: false });
  storageSet({ astralSettings: reset });
  sendHookUpdate(reset);
  return reset;
};

const injectPageHook = () => {
  if (document.documentElement.dataset.astralHook === "true") return;
  const script = document.createElement("script");
  script.src = astralApi.runtime.getURL("src/page-hook.js");
  script.dataset.astralHook = "true";
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);
};

const svg = {
  mark: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 3 24 16l13 4-13 4-4 13-4-13-13-4 13-4 4-13Z" fill="currentColor"/><path d="m30 4 1.5 4.5L36 10l-4.5 1.5L30 16l-1.5-4.5L24 10l4.5-1.5L30 4Z" fill="currentColor"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  grip: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5h.01M16 5h.01M8 12h.01M16 12h.01M8 19h.01M16 19h.01" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
  reset: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.35-5.65L4 8.7M4 4v4.7h4.7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};

const controlMarkup = (id, label, min, max, step, value, unit) => `
  <div class="astral-control">
    <div class="astral-control__top">
      <label for="astral-${id}">${label}</label>
      <output id="astral-${id}-value">${value}${unit}</output>
    </div>
    <input id="astral-${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-setting="${id}" data-unit="${unit}">
  </div>
`;

const switchMarkup = (id, label, detail) => `
  <label class="astral-switch-row" for="astral-${id}">
    <span>
      <strong>${label}</strong>
      <small>${detail}</small>
    </span>
    <input id="astral-${id}" type="checkbox" data-setting="${id}">
    <span class="astral-switch" aria-hidden="true"></span>
  </label>
`;

const createPanel = (shadow) => {
  const host = document.createElement("div");
  host.id = astralRootId;
  document.documentElement.appendChild(host);
  const root = host.attachShadow({ mode: "open" });
  const style = document.createElement("link");
  style.rel = "stylesheet";
  style.href = astralApi.runtime.getURL("src/astral.css");
  root.appendChild(style);

  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <button class="astral-launcher" type="button" aria-label="Open Astral"><img src="${astralApi.runtime.getURL("assets/icon-128.png")}" alt=""></button>
    <section class="astral-panel" aria-label="Astral audio controls">
      <header class="astral-header" data-drag-handle>
        <div class="astral-brand">
          <span class="astral-brand__mark"><img src="${astralApi.runtime.getURL("assets/icon-128.png")}" alt=""></span>
          <span><strong>ASTRAL</strong><small>DISCORD WEB CONTROL</small></span>
        </div>
        <div class="astral-header__actions">
          <button class="astral-icon-button" type="button" data-action="reset" aria-label="Reset settings">${svg.reset}</button>
          <button class="astral-icon-button astral-close" type="button" data-action="close" aria-label="Close Astral">${svg.close}</button>
        </div>
      </header>
      <div class="astral-status">
        <span class="astral-status__label"><i></i><span data-status>PROCESSING ACTIVE</span></span>
        <label class="astral-power" aria-label="Toggle Astral processing">
          <input type="checkbox" data-setting="enabled" checked>
          <span></span>
        </label>
      </div>
      <nav class="astral-tabs" aria-label="Control groups">
        <button class="is-active" type="button" data-tab="main">MAIN</button>
        <button type="button" data-tab="dsp">DSP</button>
        <button type="button" data-tab="eq">EQ / FX</button>
      </nav>
      <div class="astral-content">
        <div class="astral-tab is-active" data-pane="main">
          <label class="astral-field-label" for="astral-preset">PROFILE</label>
          <select id="astral-preset" class="astral-select" data-setting="preset">
            <option value="custom">Custom configuration</option>
            <option value="flat">Flat</option>
            <option value="bass">Bass presence</option>
            <option value="radio">Radio voice</option>
            <option value="loFi">Lo-fi texture</option>
            <option value="wide">Wide room</option>
          </select>
          <div class="astral-section-label">AMPLITUDE</div>
          ${controlMarkup("gain", "Master gain", "0.5", "2.5", "0.01", "1", "x")}
          ${controlMarkup("distortion", "Overdrive", "0", "100", "1", "0", "%")}
          ${controlMarkup("square", "Edge", "0", "100", "1", "0", "%")}
          ${controlMarkup("tube", "Tube warmth", "0", "100", "1", "0", "%")}
        </div>
        <div class="astral-tab" data-pane="dsp">
          <div class="astral-section-label">SIGNAL CHARACTER</div>
          ${switchMarkup("bitcrush", "Bitcrusher", "Reduce resolution for digital texture")}
          ${switchMarkup("stereoMotion", "Stereo motion", "Add a gentle left-to-right movement")}
          <div class="astral-info">
            <span class="astral-info__dot"></span>
            <span>All processing stays inside this browser tab.</span>
          </div>
          <button class="astral-reset-button" type="button" data-action="reset">RESET TO DEFAULTS</button>
        </div>
        <div class="astral-tab" data-pane="eq">
          <div class="astral-section-label">EQUALIZER</div>
          ${controlMarkup("bass", "Low", "-40", "40", "1", "0", " dB")}
          ${controlMarkup("mid", "Mid", "-40", "40", "1", "0", " dB")}
          ${controlMarkup("treble", "High", "-40", "40", "1", "0", " dB")}
          <div class="astral-section-label">SPACE</div>
          ${controlMarkup("echo", "Echo mix", "0", "100", "1", "0", "%")}
          ${controlMarkup("reverb", "Reverb mix", "0", "100", "1", "0", "%")}
        </div>
      </div>
      <footer class="astral-footer"><span>${svg.grip}</span><span>DRAG TO MOVE</span><kbd>CTRL</kbd><kbd>SHIFT</kbd><kbd>A</kbd></footer>
    </section>
  `;
  root.appendChild(wrapper);
  return { host, root };
};

const bindPanel = async ({ root, host }) => {
  const panel = root.querySelector(".astral-panel");
  const launcher = root.querySelector(".astral-launcher");
  const status = root.querySelector("[data-status]");
  let settings = mergeSettings();
  let panelOpen = false;
  let panelPosition = { x: null, y: null };
  let dragState = null;

  const applyPosition = () => {
    if (panelPosition.x === null || panelPosition.y === null) return;
    panel.style.left = `${panelPosition.x}px`;
    panel.style.top = `${panelPosition.y}px`;
    panel.style.transform = "none";
  };

  const setPanelOpen = (value) => {
    panelOpen = value;
    panel.classList.toggle("is-open", value);
    launcher.classList.toggle("is-hidden", value);
    if (value) applyPosition();
  };

  const reflect = () => {
    root.querySelectorAll("[data-setting]").forEach((field) => {
      const key = field.dataset.setting;
      if (key === "preset") {
        field.value = settings.preset || "custom";
      } else if (field.type === "checkbox") {
        field.checked = Boolean(settings[key]);
      } else {
        field.value = settings[key];
      }
      const output = root.querySelector(`#astral-${key}-value`);
      if (output) output.textContent = `${field.value}${field.dataset.unit || ""}`;
    });
    status.textContent = settings.enabled ? "PROCESSING ACTIVE" : "PROCESSING PAUSED";
    status.parentElement.classList.toggle("is-paused", !settings.enabled);
  };

  const save = async (next) => {
    settings = mergeSettings(next);
    await storageSet({ astralSettings: settings });
    sendHookUpdate(settings);
    reflect();
  };

  const load = async () => {
    const saved = await storageGet("astralSettings");
    settings = mergeSettings(saved.astralSettings);
    const position = await storageGet("astralPanelPosition");
    panelPosition = position.astralPanelPosition || panelPosition;
    reflect();
    sendHookUpdate(settings);
  };

  const choosePreset = async (name) => {
    if (name === "custom") {
      await save({ ...settings, preset: "custom" });
      return;
    }
    await save({ ...settings, ...presets[name], preset: name });
  };

  root.addEventListener("click", async (event) => {
    const target = event.target.closest("[data-action], [data-tab]");
    if (!target) return;
    if (target.dataset.action === "close") setPanelOpen(false);
    if (target.dataset.action === "reset") await save(resetSettings());
    if (target.dataset.tab) {
      root.querySelectorAll("[data-tab]").forEach((tab) => tab.classList.toggle("is-active", tab === target));
      root.querySelectorAll("[data-pane]").forEach((pane) => pane.classList.toggle("is-active", pane.dataset.pane === target.dataset.tab));
    }
  });

  root.addEventListener("input", async (event) => {
    const field = event.target.closest("[data-setting]");
    if (!field || field.dataset.setting === "preset") return;
    await save({ ...settings, [field.dataset.setting]: field.type === "checkbox" ? field.checked : Number(field.value), preset: "custom" });
  });

  root.addEventListener("change", async (event) => {
    const field = event.target.closest("[data-setting]");
    if (!field) return;
    if (field.dataset.setting === "preset") await choosePreset(field.value);
    if (field.type === "checkbox" && field.dataset.setting !== "enabled") await save({ ...settings, [field.dataset.setting]: field.checked, preset: "custom" });
    if (field.type === "checkbox" && field.dataset.setting === "enabled") await save({ ...settings, enabled: field.checked });
  });

  launcher.addEventListener("click", () => setPanelOpen(true));

  const startDrag = (event) => {
    if (event.target.closest("button, input, select")) return;
    const rect = panel.getBoundingClientRect();
    dragState = { startX: event.clientX, startY: event.clientY, left: rect.left, top: rect.top };
    panel.classList.add("is-dragging");
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  };

  const moveDrag = (event) => {
    if (!dragState) return;
    const x = Math.max(12, Math.min(window.innerWidth - panel.offsetWidth - 12, dragState.left + event.clientX - dragState.startX));
    const y = Math.max(12, Math.min(window.innerHeight - panel.offsetHeight - 12, dragState.top + event.clientY - dragState.startY));
    panelPosition = { x, y };
    applyPosition();
  };

  const endDrag = async () => {
    if (!dragState) return;
    dragState = null;
    panel.classList.remove("is-dragging");
    await storageSet({ astralPanelPosition: panelPosition });
  };

  root.querySelector("[data-drag-handle]").addEventListener("pointerdown", startDrag);
  window.addEventListener("pointermove", moveDrag);
  window.addEventListener("pointerup", endDrag);

  if (astralApi?.runtime?.onMessage) {
    astralApi.runtime.onMessage.addListener(async (message) => {
      if (message?.type === "ASTRAL_OPEN") setPanelOpen(true);
      if (message?.type === "ASTRAL_TOGGLE") setPanelOpen(!panelOpen);
      if (message?.type === "ASTRAL_POWER") await save({ ...settings, enabled: !settings.enabled });
      if (message?.type === "ASTRAL_RESET") await save(resetSettings());
    });
  }

  await load();
  host.dataset.ready = "true";
};

const start = () => {
  injectPageHook();
  if (document.getElementById(astralRootId)) return;
  const panel = createPanel();
  bindPanel(panel);
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}