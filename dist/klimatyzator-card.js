// kod karty termostat - Bartosz Damian Scencelek
class KlimatyzatorCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._config = {};
    this._dragging = false;
    this._editing = false;
    this._settingsClickHandler = null;

    this._uiSettings = Object.assign({
      sliderOpacity: 1.0,
      tailThickness: 6,
      knobSize: 20,
      dotSize: 10,
      fontSize: 72,
      cardOpacity: 1.0,
      controlsGap: 50,
      controlsOpacity: 0.9,
      modesIconSize: 28,
      targetOpacity: 1.0,
      metaOpacity: 1.0
    }, JSON.parse(localStorage.getItem('klimatyzator_card_ui') || 'null') || {});


    this._mediaQuery = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    if (this._mediaQuery) {
      if (this._mediaQuery.addEventListener) {
        this._mediaQuery.addEventListener('change', () => this.render());
      } else if (this._mediaQuery.addListener) {
        this._mediaQuery.addListener(() => this.render());
      }
    }
  }

  setConfig(config) {
    this._config = Object.assign({
      title: '',
      entity_target: 'number.klimatyzator_klimatyzator_temperatura',
      entity_current: 'sensor.klimatyzator_klimatyzator_temperatura_zmierzona',
      entity_power: 'switch.klimatyzator_klimatyzator_zasilanie',
      entity_fan: 'select.klimatyzator_klimatyzator_predkosc_wentylatora',
      entity_mode: 'select.klimatyzator_klimatyzator_tryb',
      entity_humidity: 'sensor.klimatyzator_klimatyzator_wilgotnosc',
      step: 1,
      min: 16,
      max: 30,
      arcStart: 240,
      arcEnd: 120,
      wave: true,
      wave_entity: null,
      // dark_mode: true | false | 'auto'
      dark_mode: 'auto'
    }, config);
  }

  static getStubConfig() { return (new this())._config; }

  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  getCardSize() { return 4; }

  _saveUiSettings() {
    localStorage.setItem('klimatyzator_card_ui', JSON.stringify(this._uiSettings));
  }

  _allEntities() {
    if (!this._hass || !this._hass.states) return [];
    return Object.keys(this._hass.states);
  }


  _isDarkModeConfigured() {
    const cfg = this._config;
    if (cfg.dark_mode === true) return true;
    if (cfg.dark_mode === false) return false;
    // 'auto' => prefer system preference (prefers-color-scheme)
    try {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return true;
    } catch (e) { /* ignore */ }

    try {
      if (this._hass && this._hass.themes && typeof this._hass.themes === 'object') {
        const themeName = this._hass.themes.default_theme || this._hass.selectedTheme || '';
        if (typeof themeName === 'string' && themeName.toLowerCase().includes('dark')) return true;
      }
    } catch (e) { /* ignore */ }

    try {
      const el = document.documentElement || document.body;
      if (el) {
        const bg = window.getComputedStyle(el).getPropertyValue('background-color') || '';
        const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (m) {
          const r = parseInt(m[1],10), g = parseInt(m[2],10), b = parseInt(m[3],10);
          const luminance = (0.2126*r + 0.7152*g + 0.0722*b) / 255;
          return luminance < 0.5;
        }
      }
    } catch (e) { /* ignore */ }

    return false;
  }

  render() {
    if (!this._hass) return;
    const cfg = this._config;
    const SLIDER_PX = 340;
    const ui = this._uiSettings;

    const eT = cfg.entity_target;
    const eC = cfg.entity_current;
    const eP = cfg.entity_power;
    const eF = cfg.entity_fan;
    const eM = cfg.entity_mode;
    const eH = cfg.entity_humidity;
    const step = Number(cfg.step) || 1;
    const minT = Number(cfg.min) || 16;
    const maxT = Number(cfg.max) || 30;
    const arcStart = Number(cfg.arcStart) % 360;
    const arcEnd = Number(cfg.arcEnd) % 360;

    const waveConfigDefault = !!cfg.wave;
    const waveEntityId = cfg.wave_entity || null;

    const target = eT && this._hass.states[eT] ? this._hass.states[eT].state : '--';
    const cur = eC && this._hass.states[eC] ? this._hass.states[eC].state : '--';
    const fan = eF && this._hass.states[eF] ? this._hass.states[eF].state : '-';
    const hum = eH && this._hass.states[eH] ? this._hass.states[eH].state : '--';
    const power = eP && this._hass.states[eP] ? this._hass.states[eP].state : 'off';
    const isOn = power === 'on';

    let waveVisible = waveConfigDefault;
    if (waveEntityId && this._hass.states[waveEntityId]) {
      const s = String(this._hass.states[waveEntityId].state).toLowerCase();
      waveVisible = (s === 'on' || s === 'true' || s === '1' || s === 'active');
    }

    const dark = this._isDarkModeConfigured();

    const colors = {
      cardBg: dark ? '#0b0b0b' : '#ffffff',
      cardShadow: dark ? '0 2px 8px rgba(0,0,0,0.6)' : '0 2px 6px rgba(0,0,0,0.06)',
      textPrimary: dark ? '#eaeaea' : '#222222',
      textSecondary: dark ? '#bdbdbd' : '#666666',
      iconInactive: dark ? '#444444' : '#d3d3d3',
      powerOn: '#00cc66',
      gradientStart: '#00aaff',
      gradientEnd: '#ff8c00',
      waveBtnInactive: '#888',
      modesInactive: '#d3d3d3'
    };

    const getIconColor = (m) => (m === (this._hass.states[eM] ? this._hass.states[eM].state : '') && isOn) ? '#ff8c00' : colors.iconInactive;
    const fmtVal = (v) => (isFinite(v) || (typeof v === 'string' && v !== '--')) ? (parseFloat(v).toFixed ? parseFloat(v).toFixed(1) : v) : '--';

    const allModes = ['Grzanie', 'Chłodzenie', 'Wentylator', 'Osuszanie'];
    const visibleModes = allModes.filter(m => m && m.toLowerCase() !== 'none');

    const editorHTML = this._editing ? `
      <div class="editor" id="editorPanel">
        <h4>Ustawienia wizualne</h4>
        <label>Przezroczystość suwaka
          <div style="display:flex;align-items:center;gap:8px;">
            <input id="cfg_opacity" type="range" min="0" max="1" step="0.05" value="${ui.sliderOpacity}" />
            <span id="val_cfg_opacity" style="width:40px;text-align:right;font-weight:600;">${Number(ui.sliderOpacity).toFixed(2)}</span>
          </div>
        </label>
        <label>Grubość ogona (tail) (px)
          <div style="display:flex;align-items:center;gap:8px;">
            <input id="cfg_tail" type="range" min="1" max="40" step="1" value="${ui.tailThickness}" />
            <span id="val_cfg_tail" style="width:40px;text-align:right;font-weight:600;">${ui.tailThickness}</span>
          </div>
        </label>
        <label>Rozmiar punktu (knob) temperatury zadanej (px)
          <div style="display:flex;align-items:center;gap:8px;">
            <input id="cfg_knob" type="range" min="8" max="80" step="1" value="${ui.knobSize}" />
            <span id="val_cfg_knob" style="width:40px;text-align:right;font-weight:600;">${ui.knobSize}</span>
          </div>
        </label>
        <label>Rozmiar punktu (knob) temperatury zmierzonej (px)
          <div style="display:flex;align-items:center;gap:8px;">
            <input id="cfg_dot" type="range" min="4" max="40" step="1" value="${ui.dotSize}" />
            <span id="val_cfg_dot" style="width:40px;text-align:right;font-weight:600;">${ui.dotSize}</span>
          </div>
        </label>
        <label>Rozmiar fontu temperatury (px)
          <div style="display:flex;align-items:center;gap:8px;">
            <input id="cfg_font" type="range" min="24" max="140" step="2" value="${ui.fontSize}" />
            <span id="val_cfg_font" style="width:40px;text-align:right;font-weight:600;">${ui.fontSize}</span>
          </div>
        </label>
        <label>Przezroczystość karty
          <div style="display:flex;align-items:center;gap:8px;">
            <input id="cfg_card_opacity" type="range" min="0" max="1" step="0.05" value="${ui.cardOpacity}" />
            <span id="val_cfg_card_opacity" style="width:40px;text-align:right;font-weight:600;">${Number(ui.cardOpacity).toFixed(2)}</span>
          </div>
        </label>
        <label>Rozstaw przycisków + i - (px)
          <div style="display:flex;align-items:center;gap:8px;">
            <input id="cfg_controls_gap" type="range" min="8" max="120" step="1" value="${ui.controlsGap}" />
            <span id="val_cfg_controls_gap" style="width:40px;text-align:right;font-weight:600;">${ui.controlsGap}</span>
          </div>
        </label>
        <label>Przezroczystość przycisków (+/-)
          <div style="display:flex;align-items:center;gap:8px;">
            <input id="cfg_controls_opacity" type="range" min="0" max="1" step="0.05" value="${ui.controlsOpacity}" />
            <span id="val_cfg_controls_opacity" style="width:40px;text-align:right;font-weight:600;">${Number(ui.controlsOpacity).toFixed(2)}</span>
          </div>
        </label>
        <label>Rozmiar ikon trybów (modes) (px)
          <div style="display:flex;align-items:center;gap:8px;">
            <input id="cfg_modes_icon" type="range" min="12" max="56" step="1" value="${ui.modesIconSize}" />
            <span id="val_cfg_modes_icon" style="width:40px;text-align:right;font-weight:600;">${ui.modesIconSize}</span>
          </div>
        </label>
        <label>Przezroczystość ustawionej temperatury (zadanej)
          <div style="display:flex;align-items:center;gap:8px;">
            <input id="cfg_target_opacity" type="range" min="0" max="1" step="0.05" value="${ui.targetOpacity}" />
            <span id="val_cfg_target_opacity" style="width:40px;text-align:right;font-weight:600;">${Number(ui.targetOpacity).toFixed(2)}</span>
          </div>
        </label>
        <label>Przezroczystość (prędkość / temp zmierzona / wilgotność)
          <div style="display:flex;align-items:center;gap:8px;">
            <input id="cfg_meta_opacity" type="range" min="0" max="1" step="0.05" value="${ui.metaOpacity}" />
            <span id="val_cfg_meta_opacity" style="width:40px;text-align:right;font-weight:600;">${Number(ui.metaOpacity).toFixed(2)}</span>
          </div>
        </label>

        <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:8px;">
          <button id="editorCancel" class="cancel">Zamknij</button>
        </div>
      </div>
    ` : '';

    // inline style to hide controls when waveVisible === false
    const waveBtnStyle = waveVisible ? '' : 'display:none;';
    const fanWaveStyle = waveVisible ? '' : 'display:none;';

    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; font-family: Roboto, "Noto Sans", sans-serif; }
        .card { width:${SLIDER_PX + 30}px; height:480px; padding:16px; border-radius:16px; background:${colors.cardBg}; box-shadow:${colors.cardShadow}; color:${colors.textPrimary}; box-sizing:border-box; position:relative; user-select:none; opacity: ${ui.cardOpacity}; }
        .title { position:absolute; left:16px; top:16px; font-weight:600; font-size:14px; color:${colors.textPrimary}; z-index:200; }
        .header { position:absolute; right:12px; top:12px; z-index:200; display:flex; gap:8px; align-items:center; }
        .power { width:48px; height:48px; border-radius:50%; background:transparent; cursor:pointer; display:flex; align-items:center; justify-content:center; color:${isOn ? colors.powerOn : colors.iconInactive}; z-index:200; }
        .power ha-icon { width:28px; height:28px; --mdc-icon-size:28px; }

        .wave-btn { width:44px; height:44px; display:flex; align-items:center; justify-content:center; border-radius:8px; background:transparent; border:none; cursor:pointer; z-index:200; }
        .wave-btn ha-icon { width:20px; height:20px; --mdc-icon-size:20px; color:${colors.waveBtnInactive}; }

        .slider { position:relative; margin:36px auto 0 auto; width:${SLIDER_PX}px; height:${SLIDER_PX}px; display:flex; align-items:center; justify-content:center; touch-action:none; z-index:1; }
        .ring { position:absolute; width:${SLIDER_PX}px; height:${SLIDER_PX}px; left:0; top:0; pointer-events:none; z-index:1; opacity:${ui.sliderOpacity}; }
        .ring svg { width:${SLIDER_PX}px; height:${SLIDER_PX}px; display:block; }

        .big { font-size:${ui.fontSize}px; font-weight:800; color:${colors.textPrimary}; line-height:1; position:absolute; left:50%; transform:translateX(-50%); top:70px; z-index:300; pointer-events:none; opacity: ${ui.targetOpacity}; }
        .deg { font-size:20px; color:${colors.textSecondary}; margin-top:-8px; text-align:center; z-index:300; pointer-events:none; }

        .controls-wrap { display:flex; justify-content:center; gap:${ui.controlsGap}px; align-items:center; margin-top:8px; position:relative; z-index:420; }
        .ctrl { width:60px; height:60px; border-radius:50%; background:${dark ? '#151515' : '#fff'}; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow: ${dark ? '0 1px 4px rgba(0,0,0,0.6)' : '0 1px 4px rgba(0,0,0,0.06)'}; }
        .ctrl ha-icon { width:60px; height:60px; --mdc-icon-size:60px; opacity:${ui.controlsOpacity}; color:${colors.textPrimary}; }

        .settings-wrap { width:44px; height:44px; display:flex; align-items:center; justify-content:center; border-radius:8px; background:transparent; border:none; cursor:pointer; z-index:420; margin-left:6px; }
        .settings-wrap ha-icon { width:30px; height:30px; --mdc-icon-size:30px; color:${colors.textSecondary}; }

        .knob { position:absolute; width:${ui.knobSize}px; height:${ui.knobSize}px; border-radius:50%; transform:translate(-50%,-50%); box-shadow:0 2px 6px rgba(0,0,0,0.18); pointer-events:none; transition: background .12s, transform .08s; z-index:350; }
        .dot-current { position:absolute; width:${ui.dotSize}px; height:${ui.dotSize}px; border-radius:50%; background:${dark ? '#888' : '#999'}; transform:translate(-50%,-50%); z-index:320; pointer-events:none; }

        .tail { position:absolute; width:${SLIDER_PX}px; height:${SLIDER_PX}px; left:0; top:0; pointer-events:none; z-index:2; stroke-width:${ui.tailThickness}; }

        .meta { position:absolute; bottom:125px; left:50%; transform:translateX(-50%); display:flex; gap:30px; font-size:16px; color:${colors.textSecondary}; align-items:center; z-index:410; opacity: ${ui.metaOpacity}; }
        .fan-wrap { position:relative; display:flex; flex-direction:column; align-items:center; gap:4px; cursor:pointer; color:${colors.textSecondary}; }
        .fan-wrap ha-icon { width:18px; height:18px; --mdc-icon-size:18px; display:block; margin:0; z-index:3; position:relative; color:${colors.textPrimary}; }
        .fan-wave { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); border-radius:50%; pointer-events:none; z-index:1; opacity:0; display:flex; align-items:center; justify-content:center; transition: opacity 160ms linear; }
        .fan-wave.small { width:34px; height:34px; }
        .fan-wave.medium { width:48px; height:48px; }
        .fan-wave.large { width:64px; height:64px; }
        .fan-wave ha-icon { width:100%; height:100%; --mdc-icon-size:30px; display:block; color:${dark ? '#ffc98a' : '#ffd7b3'}; }
        .fan-wave.active { animation: fanPulse 900ms ease-out forwards; }
        .fan-wave.visible { opacity:0.18; }
        @keyframes fanPulse {
          0% { transform: translate(-50%,-50%) scale(0.2); opacity:0.28; }
          60% { transform: translate(-50%,-50%) scale(1.05); opacity:0.14; }
          100% { transform: translate(-50%,-50%) scale(1.3); opacity:0; }
        }

        .modes { position:absolute; bottom:78px; left:50%; transform:translateX(-50%); display:flex; gap:20px; z-index:400; }
        .mode { width:38px; height:38px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:${colors.modesInactive}; }
        .mode ha-icon { width:${ui.modesIconSize}px; height:${ui.modesIconSize}px; --mdc-icon-size:${ui.modesIconSize}px; color:inherit; }

        .editor { position:absolute; right:12px; bottom:-90px; background:${dark ? '#111' : '#fff'}; border:1px solid ${dark ? '#222' : '#eee'}; padding:10px; opacity:0.9; border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,0.08); z-index:700; width:300px; font-size:13px; color:${colors.textPrimary}; }
        .editor h4 { margin:0 0 8px 0; font-size:14px; }
        .editor label { display:block; margin-bottom:8px; font-size:13px; color:${colors.textPrimary}; }
        .editor input[type="range"] { width:100%; }
        .cancel { background:${dark ? '#222' : '#f5f5f5'}; border:1px solid ${dark ? '#333' : '#eee'}; padding:6px 8px; border-radius:6px; cursor:pointer; color:${colors.textPrimary}; }
      </style>

      <div class="card" id="root">
        <div class="title">${cfg.title || ''}</div>
        <div class="header">
          <button class="power" id="powerBtn" title="Zasilanie"><ha-icon icon="mdi:power"></ha-icon></button>
        </div>

        <div class="slider" id="slider" title="Ustaw temperaturę (suwak)">
          <div class="ring" id="ring">
            <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="${colors.gradientStart}"></stop><stop offset="100%" stop-color="${colors.gradientEnd}"></stop>
                </linearGradient>
              </defs>
              <path id="trackPath" d="" stroke="${dark ? '#2a2a2a' : '#e6e6e6'}" stroke-width="4" fill="none" stroke-linecap="round"></path>
              <path id="tailArc" d="" stroke="${colors.gradientStart}" stroke-width="${ui.tailThickness}" fill="none" stroke-linecap="round"></path>
            </svg>
          </div>

          <div style="z-index:300; pointer-events:none;">
            <div class="big" id="target">${fmtVal(target)}</div>
            <div class="deg">°C</div>
          </div>

          <div class="knob" id="knob" style="background:${colors.gradientStart}; left:50%; top:20px;"></div>
          <div class="dot-current" id="dotCurrent" style="left:50%; top:40px; display:none;"></div>

          <div class="meta" id="meta">
            <div id="cur">${fmtVal(cur)}°C</div>

            <div class="fan-wrap" id="fanBtn" title="Zmień prędkość wentylatora">
              <div class="fan-wave ${waveVisible ? 'visible' : ''}" id="fanWave" style="${fanWaveStyle}"><ha-icon icon="mdi:heat-wave" id="fanWaveIcon"></ha-icon></div>
              <ha-icon icon="mdi:fan" id="fanIcon"></ha-icon>
              <div id="fanText" style="line-height:1;font-size:13px;text-align:center;color:${colors.textPrimary};">${fan}</div>
            </div>

            <div id="hum">${hum}%</div>
          </div>

          <div class="modes" id="modes">
            ${visibleModes.map(mode => {
              const icon = mode === 'Grzanie' ? 'mdi:fire' : mode === 'Chłodzenie' ? 'mdi:snowflake' : mode === 'Wentylator' ? 'mdi:fan' : 'mdi:water-percent';
              const color = getIconColor(mode);
              return `<div class="mode" data-mode="${mode}" title="${mode}"><ha-icon icon="${icon}" style="color:${color};"></ha-icon></div>`;
            }).join('')}
          </div>
        </div>

        <div style="display:flex; justify-content:center; align-items:center; gap:8px; margin-top:-40px; z-index:220;">
          <div class="controls-wrap">
            <div class="ctrl" id="dec"><ha-icon icon="mdi:minus-circle"></ha-icon></div>
            <div class="ctrl" id="inc"><ha-icon icon="mdi:plus-circle"></ha-icon></div>
          </div>

          <div style="display:flex; position:absolute; right:12px; bottom:12px; z-index:200;">
            <button id="settingsBtn" class="settings-wrap" title="Ustawienia"><ha-icon icon="mdi:cog-outline"></ha-icon></button>
          </div>
         <div style="display:flex; position:absolute; left:12px; bottom:12px; z-index:200;">
           <button class="wave-btn" id="waveBtn" title="Falowanie (wave)" style="${waveBtnStyle}"><ha-icon icon="mdi:heat-wave" id="waveBtnIcon" style="color:${waveVisible ? '#ff8c00' : colors.waveBtnInactive}"></ha-icon></button>
         </div>
        </div>

        ${editorHTML}
      </div>
    `;

    // helpers
    const getDomain = (entity_id) => (entity_id || '').split('.')[0];
    const toNum = v => { if (v === null || v === undefined) return NaN; const n = parseFloat(v); return isNaN(n) ? NaN : n; };

    const changeNumber = async (entity_id, delta) => {
      const domain = getDomain(entity_id);
      const services = this._hass && this._hass.services ? this._hass.services : {};
      try {
        if (services[domain] && delta > 0 && services[domain].increment) { await this._hass.callService(domain,'increment',{entity_id,step:Math.abs(delta)||1}); return true; }
        if (services[domain] && delta < 0 && services[domain].decrement) { await this._hass.callService(domain,'decrement',{entity_id,step:Math.abs(delta)||1}); return true; }
        if (services[domain] && services[domain].set_value) {
          const curv = this._hass.states[entity_id] ? toNum(this._hass.states[entity_id].state) : NaN;
          if (!isNaN(curv)) { const newVal = curv + delta; await this._hass.callService(domain,'set_value',{entity_id,value:newVal}); return true; }
        }
        if (services['input_number']) {
          if (delta > 0 && services['input_number'].increment) { await this._hass.callService('input_number','increment',{entity_id}); return true; }
          if (delta < 0 && services['input_number'].decrement) { await this._hass.callService('input_number','decrement',{entity_id}); return true; }
          if (services['input_number'].set_value) {
            const curv = this._hass.states[entity_id] ? toNum(this._hass.states[entity_id].state) : NaN;
            if (!isNaN(curv)) { const newVal = curv + delta; await this._hass.callService('input_number','set_value',{entity_id,value:newVal}); return true; }
          }
        }
        if (services['number'] && services['number'].set_value) {
          const curv = this._hass.states[entity_id] ? toNum(this._hass.states[entity_id].state) : NaN;
          if (!isNaN(curv)) { const newVal = curv + delta; await this._hass.callService('number','set_value',{entity_id,value:newVal}); return true; }
        }
        console.error('KlimatyzatorCard: brak usługi dla encji', entity_id, 'domena:', domain);
        return false;
      } catch (err) { console.error('changeNumber error', err); return false; }
    };

    const setTarget = async (entity_id, value) => {
      const domain = getDomain(entity_id);
      const services = this._hass && this._hass.services ? this._hass.services : {};
      try {
        if (services[domain] && services[domain].set_value) { await this._hass.callService(domain,'set_value',{entity_id,value}); return true; }
        if (services['input_number'] && services['input_number'].set_value) { await this._hass.callService('input_number','set_value',{entity_id,value}); return true; }
        if (services['number'] && services['number'].set_value) { await this._hass.callService('number','set_value',{entity_id,value}); return true; }
        const curv = this._hass.states[entity_id] ? toNum(this._hass.states[entity_id].state) : NaN;
        if (!isNaN(curv)) {
          const delta = value - curv;
          if (services[domain] && delta > 0 && services[domain].increment) { await this._hass.callService(domain,'increment',{entity_id,step:Math.abs(delta)}); return true; }
          if (services[domain] && delta < 0 && services[domain].decrement) { await this._hass.callService(domain,'decrement',{entity_id,step:Math.abs(delta)}); return true; }
        }
        console.error('KlimatyzatorCard: brak usługi do ustawienia wartości', entity_id);
        return false;
      } catch (err) { console.error('setTarget error', err); return false; }
    };

    // bindings
    const powerBtn = this.shadowRoot.getElementById('powerBtn');
    if (powerBtn && eP) powerBtn.onclick = async (ev) => { ev.stopPropagation(); try { await this._hass.callService('switch','toggle',{entity_id:eP}); } catch(e){console.error(e);} };

    const decBtn = this.shadowRoot.getElementById('dec');
    if (decBtn && eT) decBtn.onclick = async (ev) => { ev.stopPropagation(); await changeNumber(eT, -(step||1)); };

    const incBtn = this.shadowRoot.getElementById('inc');
    if (incBtn && eT) incBtn.onclick = async (ev) => { ev.stopPropagation(); await changeNumber(eT, (step||1)); };

    const waveBtn = this.shadowRoot.getElementById('waveBtn');
    const waveBtnIcon = this.shadowRoot.getElementById('waveBtnIcon');
    const fanBtn = this.shadowRoot.getElementById('fanBtn');
    const fanWave = this.shadowRoot.getElementById('fanWave');
    const fanIcon = this.shadowRoot.getElementById('fanIcon');
    const fanWaveIcon = this.shadowRoot.getElementById('fanWaveIcon');

    if (waveBtn) {
      waveBtn.onclick = async (ev) => {
        ev.stopPropagation();
        try {
          if (waveEntityId && this._hass && this._hass.states && this._hass.services) {
            const domain = getDomain(waveEntityId);
            const state = this._hass.states[waveEntityId] ? this._hass.states[waveEntityId].state : null;
            if (this._hass.services[domain] && this._hass.services[domain].toggle) {
              await this._hass.callService(domain,'toggle',{entity_id:waveEntityId});
            } else if (state === 'on' && this._hass.services[domain] && this._hass.services[domain].turn_off) {
              await this._hass.callService(domain,'turn_off',{entity_id:waveEntityId});
            } else if ((state === 'off' || state === 'closed' || state === 'false') && this._hass.services[domain] && this._hass.services[domain].turn_on) {
              await this._hass.callService(domain,'turn_on',{entity_id:waveEntityId});
            }
            const newState = this._hass.states[waveEntityId] ? this._hass.states[waveEntityId].state : null;
            const visibleNow = (String(newState).toLowerCase() === 'on' || String(newState).toLowerCase() === 'true' || String(newState) === '1');
            if (waveBtnIcon) waveBtnIcon.style.color = visibleNow ? '#ff8c00' : colors.waveBtnInactive;
            if (fanWave) {
              if (visibleNow) fanWave.style.display = ''; else fanWave.style.display = 'none';
            }
            // re-render to pick up new hass state if needed
            setTimeout(()=>this.render(), 300);
          } else {
            if (fanWave) {
              const now = fanWave.style.display === 'none';
              fanWave.style.display = now ? '' : 'none';
              if (waveBtnIcon) waveBtnIcon.style.color = now ? '#ff8c00' : colors.waveBtnInactive;
            }
          }
        } catch (e) { console.error('waveBtn onclick error', e); }
      };
    }

    if (fanBtn && eF) fanBtn.onclick = async (ev) => {
      ev.stopPropagation();
      try {
        const options = ['Niska','Średnia','Wysoka'];
        const curVal = this._hass.states[eF] ? this._hass.states[eF].state : null;
        const idx = options.indexOf(curVal);
        const next = idx===-1?options[0]:options[(idx+1)%options.length];
        await this._hass.callService('select','select_option',{entity_id:eF, option:next});
        const fanTextEl = this.shadowRoot.getElementById('fanText'); if (fanTextEl) fanTextEl.textContent = next;

        if (fanWave && fanWaveIcon) {
          fanWave.className = 'fan-wave';
          if (waveVisible && window.getComputedStyle(fanWave).display === 'none') {
            fanWave.style.display = '';
          }
          if (next === 'Wysoka') {
            fanWave.classList.add('large');
            fanWaveIcon.style.color = '#ff6a00';
          } else if (next === 'Średnia') {
            fanWave.classList.add('medium');
            fanWaveIcon.style.color = '#ff9a4d';
          } else {
            fanWave.classList.add('small');
            fanWaveIcon.style.color = '#ffd7b3';
          }
          if (waveVisible) fanWave.classList.add('visible');
          void fanWave.offsetWidth;
          fanWave.classList.add('active');
          setTimeout(()=>{ fanWave.classList.remove('active'); }, 950);
        }
      } catch(e){console.error(e);}
    };

    const modesEl = this.shadowRoot.getElementById('modes');
    if (modesEl && eM) {
      modesEl.querySelectorAll('.mode').forEach(md => {
        md.onclick = async (ev) => { ev.stopPropagation(); try { const option = md.getAttribute('data-mode'); await this._hass.callService('select','select_option',{entity_id:eM, option}); } catch(e){console.error(e);} };
      });
    }

    const sliderEl = this.shadowRoot.getElementById('slider');
    const targetElNow = this.shadowRoot.getElementById('target');
    const knobEl = this.shadowRoot.getElementById('knob');
    const tailArcEl = this.shadowRoot.getElementById('tailArc');
    const trackPathEl = this.shadowRoot.getElementById('trackPath');
    const dotCurrentEl = this.shadowRoot.getElementById('dotCurrent');

    const polarToCartesian = (cx, cy, r, angleInDegrees) => { const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0; return { x: cx + (r * Math.cos(angleInRadians)), y: cy + (r * Math.sin(angleInRadians)) }; };
    const describeArc = (cx, cy, r, startAngle, endAngle) => { let sa = startAngle % 360; if (sa < 0) sa += 360; let ea = endAngle % 360; if (ea < 0) ea += 360; if (ea <= sa) ea += 360; const start = polarToCartesian(cx, cy, r, ea); const end = polarToCartesian(cx, cy, r, sa); const largeArcFlag = (ea - sa) <= 180 ? "0" : "1"; return ["M", start.x.toFixed(4), start.y.toFixed(4), "A", r.toFixed(4), r.toFixed(4), 0, largeArcFlag, 0, end.x.toFixed(4), end.y.toFixed(4)].join(" "); };

    const valueToArcAngle = (value) => { const pct = (value - minT) / (maxT - minT); const clamped = Math.min(1, Math.max(0, pct)); let span = arcEnd - arcStart; if (span <= 0) span += 360; return (arcStart + clamped * span) % 360; };
    const angleToValue = (angle) => { let a = angle % 360; if (a < 0) a += 360; let sa = arcStart % 360; if (sa < 0) sa += 360; let ea = arcEnd % 360; if (ea < 0) ea += 360; let span = ea - sa; if (span <= 0) span += 360; let diff = a - sa; if (diff < 0) diff += 360; if (diff > span) diff = span; const pct = diff / span; const raw = minT + pct * (maxT - minT); const stepped = Math.round(raw / step) * step; return Number(Math.min(maxT, Math.max(minT, stepped)).toFixed(2)); };

    const interpColor = (t) => { const c1 = { r:0x00, g:0xaa, b:0xff }, c2 = { r:0xff, g:0x8c, b:0x00 }; const r = Math.round(c1.r + (c2.r - c1.r) * t); const g = Math.round(c1.g + (c2.g - c1.g) * t); const b = Math.round(c1.b + (c2.b - c1.b) * t); return `rgb(${r},${g},${b})`; };

    const setArcVisuals = (value) => {
      if (!trackPathEl || !tailArcEl) return;
      const r = 46, cx = 50, cy = 50;
      trackPathEl.setAttribute('d', describeArc(cx, cy, r, arcStart, arcEnd));
      const currentAngle = valueToArcAngle(value);
      tailArcEl.setAttribute('d', describeArc(cx, cy, r, arcStart, currentAngle));
      const pos = polarToCartesian(cx, cy, r, currentAngle);
      const scale = SLIDER_PX / 100;
      const px = pos.x * scale, py = pos.y * scale;
      if (knobEl) { knobEl.style.left = `${px}px`; knobEl.style.top = `${py}px`; knobEl.style.width = `${ui.knobSize}px`; knobEl.style.height = `${ui.knobSize}px`; }
      if (dotCurrentEl) { dotCurrentEl.style.width = `${ui.dotSize}px`; dotCurrentEl.style.height = `${ui.dotSize}px`; }
      if (targetElNow) {
        targetElNow.style.fontSize = `${ui.fontSize}px`;
        targetElNow.style.opacity = String(ui.targetOpacity);
      }
      const tval = (value - minT) / (maxT - minT);
      const col = interpColor(Math.min(1, Math.max(0, tval)));
      if (knobEl) knobEl.style.background = col;
      tailArcEl.setAttribute('stroke', col);
      tailArcEl.setAttribute('stroke-width', String(ui.tailThickness));
      const ring = this.shadowRoot.getElementById('ring'); if (ring) ring.style.opacity = String(ui.sliderOpacity);

      const controlsWrap = this.shadowRoot.querySelector('.controls-wrap');
      if (controlsWrap) controlsWrap.style.gap = `${ui.controlsGap}px`;
      const ctrlIcons = this.shadowRoot.querySelectorAll('.ctrl ha-icon');
      ctrlIcons.forEach(icon => { icon.style.opacity = String(ui.controlsOpacity); icon.style.color = colors.textPrimary; });
      const card = this.shadowRoot.getElementById('root');
      if (card) card.style.opacity = String(ui.cardOpacity);

      const modeIcons = this.shadowRoot.querySelectorAll('.modes ha-icon');
      modeIcons.forEach(ic => {
        ic.style.width = `${ui.modesIconSize}px`;
        ic.style.height = `${ui.modesIconSize}px`;
        ic.style.setProperty('--mdc-icon-size', `${ui.modesIconSize}px`);
      });

      const metaEl = this.shadowRoot.getElementById('meta');
      if (metaEl) {
        metaEl.style.opacity = String(ui.metaOpacity);
      }
      const curEl = this.shadowRoot.getElementById('cur');
      const fanTextEl = this.shadowRoot.getElementById('fanText');
      const humEl = this.shadowRoot.getElementById('hum');
      if (curEl) curEl.style.opacity = String(ui.metaOpacity);
      if (fanTextEl) fanTextEl.style.opacity = String(ui.metaOpacity);
      if (humEl) humEl.style.opacity = String(ui.metaOpacity);
    };

    const setCurrentDot = () => {
      if (!dotCurrentEl) return;
      const curVal = (isFinite(cur) || (typeof cur === 'string' && cur !== '--')) ? toNum(cur) : NaN;
      if (isNaN(curVal)) { dotCurrentEl.style.display = 'none'; return; }
      dotCurrentEl.style.display = '';
      const r = 46, cx = 50, cy = 50;
      const ang = valueToArcAngle(Math.min(maxT, Math.max(minT, curVal)));
      const pos = polarToCartesian(cx, cy, r, ang);
      const scale = SLIDER_PX / 100;
      dotCurrentEl.style.left = `${pos.x * scale}px`; dotCurrentEl.style.top = `${pos.y * scale}px`;
    };

    const initVisuals = () => {
      const tVal = (isFinite(target) || (typeof target === 'string' && target !== '--')) ? toNum(target) : NaN;
      const initVal = !isNaN(tVal) ? tVal : Math.max(minT, Math.min(maxT, (minT + maxT) / 2));
      setArcVisuals(initVal);
      setCurrentDot();
      const tEl = this.shadowRoot.getElementById('target'); if (tEl) tEl.textContent = (!isNaN(tVal)) ? (parseFloat(tVal).toFixed ? parseFloat(tVal).toFixed(1) : tVal) : '--';
    };
    initVisuals();

    const getAngleFromEvent = (ev) => {
      const rect = sliderEl.getBoundingClientRect();
      const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
      const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const clientY = ev.touches ? ev.touches[0].clientY : ev.clientY;
      const dx = clientX - cx, dy = clientY - cy;
      let angle = Math.atan2(dy, dx) * (180 / Math.PI);
      angle = angle + 90; if (angle < 0) angle += 360;
      return angle;
    };

    const isAngleWithinArc = (angle) => {
      let a = angle % 360; if (a < 0) a += 360;
      let sa = arcStart % 360; if (sa < 0) sa += 360;
      let ea = arcEnd % 360; if (ea < 0) ea += 360;
      let span = ea - sa; if (span <= 0) span += 360;
      let diff = a - sa; if (diff < 0) diff += 360;
      return diff >= 0 && diff <= span;
    };

    const onPointerDown = (ev) => {
      const path = ev.composedPath ? ev.composedPath() : [];
      for (const el of path) {
        if (!el || !el.classList) continue;
        if (el.classList.contains('ctrl') || el.classList.contains('fan-wrap') || el.classList.contains('mode') || el.id === 'settingsBtn' || el.id === 'powerBtn') return;
      }
      ev.preventDefault(); ev.stopPropagation();
      this._dragging = true;
      document.addEventListener('mousemove', onPointerMove);
      document.addEventListener('mouseup', onPointerUp);
      document.addEventListener('touchmove', onPointerMove, { passive:false });
      document.addEventListener('touchend', onPointerUp);
      handlePointer(ev);
    };

    const onPointerMove = (ev) => { if (!this._dragging) return; ev.preventDefault(); ev.stopPropagation(); handlePointer(ev); };
    const onPointerUp = (ev) => {
      if (!this._dragging) return;
      ev.preventDefault(); ev.stopPropagation();
      this._dragging = false;
      document.removeEventListener('mousemove', onPointerMove);
      document.removeEventListener('mouseup', onPointerUp);
      document.removeEventListener('touchmove', onPointerMove);
      document.removeEventListener('touchend', onPointerUp);
      commitPointer(ev);
    };

    const handlePointer = (ev) => {
      try {
        const angle = getAngleFromEvent(ev);
        let effectiveAngle = angle;
        if (!isAngleWithinArc(angle)) {
          const sa = arcStart % 360, ea = arcEnd % 360;
          const diffToStart = (angle - sa + 360) % 360;
          const diffToEnd = (ea - angle + 360) % 360;
          effectiveAngle = (diffToStart < diffToEnd) ? sa : ea;
        }
        const val = angleToValue(effectiveAngle);
        setArcVisuals(val);
        const tEl = this.shadowRoot.getElementById('target');
        if (tEl) tEl.textContent = (val !== null && val !== undefined) ? (parseFloat(val).toFixed ? parseFloat(val).toFixed(1) : val) : '--';
      } catch (err) { console.error('handlePointer', err); }
    };

    const commitPointer = async (ev) => {
      try {
        const angle = getAngleFromEvent(ev);
        let effAngle = angle;
        if (!isAngleWithinArc(angle)) {
          const sa = arcStart % 360, ea = arcEnd % 360;
          const diffToStart = (angle - sa + 360) % 360;
          const diffToEnd = (ea - angle + 360) % 360;
          effAngle = (diffToStart < diffToEnd) ? sa : ea;
        }
        const val = angleToValue(effAngle);
        await setTarget(eT, val);
      } catch (err) { console.error('commitPointer', err); }
    };

    if (sliderEl) {
      sliderEl.removeEventListener('mousedown', onPointerDown);
      sliderEl.removeEventListener('touchstart', onPointerDown);
      sliderEl.addEventListener('mousedown', onPointerDown);
      sliderEl.addEventListener('touchstart', onPointerDown, { passive:false });
    }

    // SETTINGS 
    if (this._settingsClickHandler) {
      this.shadowRoot.removeEventListener('click', this._settingsClickHandler, true);
      this._settingsClickHandler = null;
    }
    this._settingsClickHandler = (ev) => {
      const path = ev.composedPath ? ev.composedPath() : [];
      for (const el of path) {
        if (el && el.id === 'settingsBtn') {
          ev.stopPropagation(); ev.preventDefault();
          this._editing = !this._editing;
          this.render();
          return;
        }
      }
    };
    this.shadowRoot.addEventListener('click', this._settingsClickHandler, true);

    if (this._editing) {
      const inOpacity = this.shadowRoot.getElementById('cfg_opacity');
      const inTail = this.shadowRoot.getElementById('cfg_tail');
      const inKnob = this.shadowRoot.getElementById('cfg_knob');
      const inDot = this.shadowRoot.getElementById('cfg_dot');
      const inFont = this.shadowRoot.getElementById('cfg_font');
      const inCardOpacity = this.shadowRoot.getElementById('cfg_card_opacity');
      const inControlsGap = this.shadowRoot.getElementById('cfg_controls_gap');
      const inControlsOpacity = this.shadowRoot.getElementById('cfg_controls_opacity');
      const inModesIcon = this.shadowRoot.getElementById('cfg_modes_icon');
      const inTargetOpacity = this.shadowRoot.getElementById('cfg_target_opacity');
      const inMetaOpacity = this.shadowRoot.getElementById('cfg_meta_opacity');
      const editorCancel = this.shadowRoot.getElementById('editorCancel');

      const spanOpacity = this.shadowRoot.getElementById('val_cfg_opacity');
      const spanTail = this.shadowRoot.getElementById('val_cfg_tail');
      const spanKnob = this.shadowRoot.getElementById('val_cfg_knob');
      const spanDot = this.shadowRoot.getElementById('val_cfg_dot');
      const spanFont = this.shadowRoot.getElementById('val_cfg_font');
      const spanCardOpacity = this.shadowRoot.getElementById('val_cfg_card_opacity');
      const spanControlsGap = this.shadowRoot.getElementById('val_cfg_controls_gap');
      const spanControlsOpacity = this.shadowRoot.getElementById('val_cfg_controls_opacity');
      const spanModesIcon = this.shadowRoot.getElementById('val_cfg_modes_icon');
      const spanTargetOpacity = this.shadowRoot.getElementById('val_cfg_target_opacity');
      const spanMetaOpacity = this.shadowRoot.getElementById('val_cfg_meta_opacity');

      const applyAndPersist = () => {
        const parseFloatClamped = (v, min, max, fallback) => { const n = parseFloat(v); if (isNaN(n)) return fallback; return Math.min(max, Math.max(min, n)); };
        this._uiSettings.sliderOpacity = parseFloatClamped(inOpacity ? inOpacity.value : ui.sliderOpacity, 0, 1, ui.sliderOpacity);
        this._uiSettings.tailThickness = parseFloatClamped(inTail ? inTail.value : ui.tailThickness, 1, 40, ui.tailThickness);
        this._uiSettings.knobSize = parseFloatClamped(inKnob ? inKnob.value : ui.knobSize, 8, 80, ui.knobSize);
        this._uiSettings.dotSize = parseFloatClamped(inDot ? inDot.value : ui.dotSize, 4, 40, ui.dotSize);
        this._uiSettings.fontSize = parseFloatClamped(inFont ? inFont.value : ui.fontSize, 24, 140, ui.fontSize);
        this._uiSettings.cardOpacity = parseFloatClamped(inCardOpacity ? inCardOpacity.value : ui.cardOpacity, 0, 1, ui.cardOpacity);
        this._uiSettings.controlsGap = parseFloatClamped(inControlsGap ? inControlsGap.value : ui.controlsGap, 8, 120, ui.controlsGap);
        this._uiSettings.controlsOpacity = parseFloatClamped(inControlsOpacity ? inControlsOpacity.value : ui.controlsOpacity, 0, 1, ui.controlsOpacity);
        this._uiSettings.modesIconSize = parseFloatClamped(inModesIcon ? inModesIcon.value : ui.modesIconSize, 12, 56, ui.modesIconSize);
        this._uiSettings.targetOpacity = parseFloatClamped(inTargetOpacity ? inTargetOpacity.value : ui.targetOpacity, 0, 1, ui.targetOpacity);

        this._uiSettings.metaOpacity = parseFloatClamped(inMetaOpacity ? inMetaOpacity.value : ui.metaOpacity, 0, 1, ui.metaOpacity);

        this._saveUiSettings();

        if (spanOpacity) spanOpacity.textContent = Number(this._uiSettings.sliderOpacity).toFixed(2);
        if (spanTail) spanTail.textContent = String(this._uiSettings.tailThickness);
        if (spanKnob) spanKnob.textContent = String(this._uiSettings.knobSize);
        if (spanDot) spanDot.textContent = String(this._uiSettings.dotSize);
        if (spanFont) spanFont.textContent = String(this._uiSettings.fontSize);
        if (spanCardOpacity) spanCardOpacity.textContent = Number(this._uiSettings.cardOpacity).toFixed(2);
        if (spanControlsGap) spanControlsGap.textContent = String(this._uiSettings.controlsGap);
        if (spanControlsOpacity) spanControlsOpacity.textContent = Number(this._uiSettings.controlsOpacity).toFixed(2);
        if (spanModesIcon) spanModesIcon.textContent = String(this._uiSettings.modesIconSize);
        if (spanTargetOpacity) spanTargetOpacity.textContent = Number(this._uiSettings.targetOpacity).toFixed(2);
        if (spanMetaOpacity) spanMetaOpacity.textContent = Number(this._uiSettings.metaOpacity).toFixed(2);

        Object.assign(ui, this._uiSettings);
        this.render();
      };

      if (inOpacity) { inOpacity.oninput = () => { if (spanOpacity) spanOpacity.textContent = Number(inOpacity.value).toFixed(2); applyAndPersist(); }; }
      if (inTail) { inTail.oninput = () => { if (spanTail) spanTail.textContent = inTail.value; applyAndPersist(); }; }
      if (inKnob) { inKnob.oninput = () => { if (spanKnob) spanKnob.textContent = inKnob.value; applyAndPersist(); }; }
      if (inDot) { inDot.oninput = () => { if (spanDot) spanDot.textContent = inDot.value; applyAndPersist(); }; }
      if (inFont) { inFont.oninput = () => { if (spanFont) spanFont.textContent = inFont.value; applyAndPersist(); }; }
      if (inCardOpacity) { inCardOpacity.oninput = () => { if (spanCardOpacity) spanCardOpacity.textContent = Number(inCardOpacity.value).toFixed(2); applyAndPersist(); }; }
      if (inControlsGap) { inControlsGap.oninput = () => { if (spanControlsGap) spanControlsGap.textContent = inControlsGap.value; applyAndPersist(); }; }
      if (inControlsOpacity) { inControlsOpacity.oninput = () => { if (spanControlsOpacity) spanControlsOpacity.textContent = Number(inControlsOpacity.value).toFixed(2); applyAndPersist(); }; }
      if (inModesIcon) { inModesIcon.oninput = () => { if (spanModesIcon) spanModesIcon.textContent = inModesIcon.value; applyAndPersist(); }; }
      if (inTargetOpacity) { inTargetOpacity.oninput = () => { if (spanTargetOpacity) spanTargetOpacity.textContent = Number(inTargetOpacity.value).toFixed(2); applyAndPersist(); }; }
      if (inMetaOpacity) { inMetaOpacity.oninput = () => { if (spanMetaOpacity) spanMetaOpacity.textContent = Number(inMetaOpacity.value).toFixed(2); applyAndPersist(); }; }

      if (editorCancel) {
        editorCancel.onclick = (ev) => { ev.stopPropagation(); this._editing = false; this.render(); };
      }
    }

    // cleanup
    this._cleanup = () => {
      try {
        if (sliderEl) {
          sliderEl.removeEventListener('mousedown', onPointerDown);
          sliderEl.removeEventListener('touchstart', onPointerDown);
        }
        document.removeEventListener('mousemove', onPointerMove);
        document.removeEventListener('mouseup', onPointerUp);
        document.removeEventListener('touchmove', onPointerMove);
        document.removeEventListener('touchend', onPointerUp);
        if (this._settingsClickHandler) {
          this.shadowRoot.removeEventListener('click', this._settingsClickHandler, true);
          this._settingsClickHandler = null;
        }
      } catch (e) { /* ignore */ }
    };
  }

  disconnectedCallback() {
    if (this._cleanup) this._cleanup();
    if (this._mediaQuery) {
      try {
        if (this._mediaQuery.removeEventListener) this._mediaQuery.removeEventListener('change', () => this.render());
        else if (this._mediaQuery.removeListener) this._mediaQuery.removeListener(() => this.render());
      } catch(e) { /* ignore */ }
    }
  }
}

customElements.define('klimatyzator-card', KlimatyzatorCard);
