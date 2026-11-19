'use strict';
/* ============================================================
   BatchPhoto.ru — универсальный движок
   ============================================================ */

const $ = id => document.getElementById(id);
const BP = { files: [], processing: false, cancelled: false };
const MAX_FILES = 100;
const CFG = window.BP_CONFIG || {};

/* ---------- Тема ---------- */
(function initTheme() {
    const saved = localStorage.getItem('bp-theme');
    if (saved) document.documentElement.dataset.theme = saved;
    const btn = $('themeBtn');
    if (btn) btn.textContent = document.documentElement.dataset.theme === 'light' ? '☀️' : '🌙';
})();

document.addEventListener('DOMContentLoaded', () => {
    const themeBtn = $('themeBtn');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const next = document.documentElement.dataset.theme === 'light' ? '' : 'light';
            document.documentElement.dataset.theme = next;
            localStorage.setItem('bp-theme', next);
            themeBtn.textContent = next === 'light' ? '☀️' : '🌙';
        });
    }

    // Фильтрация вкладок под конкретную страницу
    if (CFG.allowedTabs && Array.isArray(CFG.allowedTabs)) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            const tab = btn.dataset.tab;
            if (!CFG.allowedTabs.includes(tab)) {
                btn.style.display = 'none';
                const panel = $('panel-' + tab);
                if (panel) panel.style.display = 'none';
            }
        });
    }

    // Установка пресета по умолчанию
    if (CFG.defaultPreset && PRESETS[CFG.defaultPreset]) {
        const pInput = $('preset');
        if (pInput) {
            pInput.value = CFG.defaultPreset;
            pInput.dispatchEvent(new Event('change'));
        }
    }

    // Установка вкладки по умолчанию
    if (CFG.defaultTab) {
        const b = document.querySelector(`.tab-btn[data-tab="${CFG.defaultTab}"]`);
        if (b && b.style.display !== 'none') b.click();
    }
});

/* ---------- Переключение активных вкладок ---------- */
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const panel = $('panel-' + btn.dataset.tab);
        if (panel) panel.classList.add('active');
    });
});

/* ---------- Живые значение ползунков ---------- */
[['quality','qualityVal','%'],['percent','percentVal','%'],['wmSize','wmSizeVal',''],
 ['wmOpacity','wmOpacityVal','%'],['brightness','brightnessVal','%'],
 ['contrast','contrastVal','%'],['saturate','saturateVal','%']].forEach(([i, o, s]) => {
    const el = $(i); 
    if (el) el.addEventListener('input', () => { 
        const out = $(o); if (out) out.textContent = el.value + s; 
    });
});

/* ---------- Режим подгонки размера ---------- */
const rMode = $('resizeMode');
if (rMode) {
    rMode.addEventListener('change', () => {
        const m = rMode.value;
        if ($('dimsGroup')) $('dimsGroup').style.display = ['percent','none'].includes(m) ? 'none' : '';
        if ($('percentGroup')) $('percentGroup').style.display = m === 'percent' ? '' : 'none';
        if ($('bgGroup')) $('bgGroup').style.display = m === 'contain_bg' ? '' : 'none';
        if ($('width')) $('width').disabled = m === 'height';
        if ($('height')) $('height').disabled = m === 'width';
    });
}

/* ---------- Качество сжатия (скрываем для PNG) ---------- */
const fmtInput = $('format');
if (fmtInput) {
    fmtInput.addEventListener('change', () => {
        if ($('qualityGroup')) $('qualityGroup').style.display = fmtInput.value === 'image/png' ? 'none' : '';
    });
}

/* ---------- Пресеты ---------- */
const PRESETS = {
    wb:          { mode:'contain_bg', w:1200, h:1600, fmt:'image/jpeg', q:88 },
    wb_std:      { mode:'contain_bg', w:900,  h:1200, fmt:'image/jpeg', q:85 },
    ozon:        { mode:'contain_bg', w:1200, h:1600, fmt:'image/jpeg', q:88 },
    ozon_zoom:   { mode:'contain_bg', w:1500, h:1500, fmt:'image/jpeg', q:90 },
    ymarket:     { mode:'contain_bg', w:900,  h:1200, fmt:'image/jpeg', q:85 },
    avito:       { mode:'contain_bg', w:1200, h:900,  fmt:'image/jpeg', q:85 },
    insta_feed:  { mode:'cover',      w:1080, h:1080, fmt:'image/jpeg', q:88 },
    insta_story: { mode:'cover',      w:1080, h:1920, fmt:'image/jpeg', q:90 },
    web:         { mode:'width',      w:1920, h:0,    fmt:'image/webp', q:82 },
    compress:    { mode:'none',       w:0,    h:0,    fmt:'image/jpeg', q:80 },
    half:        { mode:'percent',    w:0,    h:0,    fmt:'image/jpeg', q:85, percent:50 }
};

const presetSelect = $('preset');
if (presetSelect) {
    presetSelect.addEventListener('change', () => {
        const p = PRESETS[presetSelect.value];
        if (!p) return;
        if ($('resizeMode')) { $('resizeMode').value = p.mode; $('resizeMode').dispatchEvent(new Event('change')); }
        if ($('width')) $('width').value = p.w; 
        if ($('height')) $('height').value = p.h;
        if ($('format')) { $('format').value = p.fmt; $('format').dispatchEvent(new Event('change')); }
        if ($('quality')) { $('quality').value = p.q; if ($('qualityVal')) $('qualityVal').textContent = p.q + '%'; }
        if (p.percent && $('percent')) { $('percent').value = p.percent; if ($('percentVal')) $('percentVal').textContent = p.percent + '%'; }
    });
}

/* ---------- Загрузка файлов ---------- */
const dropzone = $('dropzone'), fileInput = $('fileInput');
if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') fileInput.click(); });
    fileInput.addEventListener('change', e => { addFiles(e.target.files); fileInput.value = ''; });
    ['dragenter','dragover'].forEach(ev => dropzone.addEventListener(ev, e => { e.preventDefault(); dropzone.classList.add('dragover'); }));
    ['dragleave','drop'].forEach(ev => dropzone.addEventListener(ev, e => { e.preventDefault(); dropzone.classList.remove('dragover'); }));
    dropzone.addEventListener('drop', e => { e.preventDefault(); addFiles(e.dataTransfer.files); });
}

document.addEventListener('paste', e => {
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    const imgs = [...items].filter(i => i.type.startsWith('image/')).map(i => i.getAsFile());
    if (imgs.length) addFiles(imgs);
});

function addFiles(list) {
    const incoming = [...list].filter(f => f.type.startsWith('image/'));
    if (!incoming.length) return;
    if (BP.files.length + incoming.length > MAX_FILES) alert(`Вы можете выбрать до ${MAX_FILES} файлов за раз.`);
    incoming.slice(0, MAX_FILES - BP.files.length).forEach(f => {
        BP.files.push({ id: Math.random().toString(36).slice(2), file: f, url: URL.createObjectURL(f) });
    });
    renderFiles();
}

function removeFile(id) {
    const i = BP.files.findIndex(f => f.id === id);
    if (i > -1) { URL.revokeObjectURL(BP.files[i].url); BP.files.splice(i, 1); }
    renderFiles();
}

if ($('clearBtn')) {
    $('clearBtn').addEventListener('click', () => {
        BP.files.forEach(f => URL.revokeObjectURL(f.url));
        BP.files = []; renderFiles();
    });
}

function renderFiles() {
    const grid = $('filesGrid');
    if (!grid) return;
    grid.innerHTML = '';
    BP.files.forEach(f => {
        const el = document.createElement('div');
        el.className = 'file-card'; el.dataset.id = f.id;
        el.innerHTML = `<img src="${f.url}" alt="" loading="lazy">
            <span class="fsize">${formatBytes(f.file.size)}</span>
            <button class="remove" title="Удалить">✕</button>
            <span class="fname">${escapeHtml(f.file.name)}</span>`;
        el.querySelector('.remove').addEventListener('click', () => removeFile(f.id));
        grid.appendChild(el);
    });
    if ($('filesToolbar')) $('filesToolbar').classList.toggle('visible', BP.files.length > 0);
    if ($('filesCount')) $('filesCount').textContent = `Выбрано файлов: ${BP.files.length} (${formatBytes(totalSize())})`;
}

function formatBytes(b) { if (b < 1024) return b+' Б'; if (b < 1048576) return (b/1024).toFixed(0)+' КБ'; return (b/1048576).toFixed(1)+' МБ'; }
function escapeHtml(s) { return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function totalSize() { return BP.files.reduce((s, f) => s + f.file.size, 0); }
function hexToRgba(hex, a) { const n = parseInt(hex.slice(1),16); return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`; }

function getSettings() {
    return {
        mode: $('resizeMode') ? $('resizeMode').value : 'contain_bg',
        w: $('width') ? (parseInt($('width').value) || 0) : 1200, 
        h: $('height') ? (parseInt($('height').value) || 0) : 1600,
        percent: $('percent') ? (parseInt($('percent').value) || 100) : 100,
        bgColor: $('bgColor') ? $('bgColor').value : '#ffffff',
        format: $('format') ? $('format').value : 'image/jpeg',
        quality: $('quality') ? ((parseInt($('quality').value) || 85) / 100) : 0.88,
        noUpscale: $('noUpscale') ? $('noUpscale').checked : true,
        wmText: $('wmText') ? $('wmText').value.trim() : '', 
        wmPos: $('wmPos') ? $('wmPos').value : 'br',
        wmSize: $('wmSize') ? parseInt($('wmSize').value) : 4, 
        wmOpacity: $('wmOpacity') ? (parseInt($('wmOpacity').value)/100) : 0.5,
        wmColor: $('wmColor') ? $('wmColor').value : '#ffffff',
        rotate: $('rotate') ? parseInt($('rotate').value) : 0, 
        flip: $('flip') ? $('flip').value : 'none',
        brightness: $('brightness') ? parseInt($('brightness').value) : 100,
        contrast: $('contrast') ? parseInt($('contrast').value) : 100,
        saturate: $('saturate') ? parseInt($('saturate').value) : 100,
        effect: $('effect') ? $('effect').value : 'none',
        pattern: $('renamePattern') ? ($('renamePattern').value.trim() || '{name}') : '{name}'
    };
}

function computeTarget(sw, sh, s) {
    const cl = v => Math.max(1, Math.round(v));
    switch (s.mode) {
        case 'none':    return { cw: sw, ch: sh, dx:0, dy:0, dw:sw, dh:sh };
        case 'percent': { const p=s.percent/100, dw=cl(sw*p), dh=cl(sh*p); return { cw:dw, ch:dh, dx:0, dy:0, dw, dh }; }
        case 'width':   { if(!s.w) return {cw:sw,ch:sh,dx:0,dy:0,dw:sw,dh:sh}; const dw=s.w, dh=cl(sh*s.w/sw); return { cw:dw, ch:dh, dx:0, dy:0, dw, dh }; }
        case 'height':  { if(!s.h) return {cw:sw,ch:sh,dx:0,dy:0,dw:sw,dh:sh}; const dh=s.h, dw=cl(sw*s.h/sh); return { cw:dw, ch:dh, dx:0, dy:0, dw, dh }; }
        case 'cover': {
            let r = Math.max((s.w||sw)/sw, (s.h||sh)/sh);
            if (s.noUpscale) r = Math.min(1, r);
            const dw=cl(sw*r), dh=cl(sh*r), cw=s.w||sw, ch=s.h||sh;
            return { cw, ch, dx:Math.round((cw-dw)/2), dy:Math.round((ch-dh)/2), dw, dh };
        }
        case 'contain_bg': {
            let r = Math.min((s.w||sw)/sw, (s.h||sh)/sh);
            if (s.noUpscale) r = Math.min(1, r);
            const dw=cl(sw*r), dh=cl(sh*r), cw=s.w||sw, ch=s.h||sh;
            return { cw, ch, dx:Math.round((cw-dw)/2), dy:Math.round((ch-dh)/2), dw, dh, fill:true };
        }
        default: {
            let r = Math.min((s.w||sw)/sw, (s.h||sh)/sh);
            if (s.noUpscale) r = Math.min(1, r);
            const dw=cl(sw*r), dh=cl(sh*r);
            return { cw:dw, ch:dh, dx:0, dy:0, dw, dh };
        }
    }
}

function orientImage(img, rotate, flip) {
    const swap = rotate === 90 || rotate === 270;
    const c = document.createElement('canvas');
    c.width = swap ? img.height : img.width;
    c.height = swap ? img.width : img.height;
    const ctx = c.getContext('2d');
    ctx.save();
    ctx.translate(c.width/2, c.height/2);
    ctx.rotate(rotate * Math.PI / 180);
    ctx.scale(flip === 'h' ? -1 : 1, flip === 'v' ? -1 : 1);
    ctx.drawImage(img, -img.width/2, -img.height/2);
    ctx.restore();
    return c;
}

function drawWatermark(ctx, cw, ch, s) {
    const fontSize = Math.max(12, Math.round(cw / (28 - s.wmSize * 2)));
    ctx.save();
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.fillStyle = hexToRgba(s.wmColor, s.wmOpacity);
    const pad = Math.round(fontSize * 1.2);
    if (s.wmPos === 'tile') {
        ctx.rotate(-25 * Math.PI / 180);
        const stepX = ctx.measureText(s.wmText).width + fontSize * 4;
        const stepY = fontSize * 5;
        for (let y = -ch; y < ch * 2; y += stepY)
            for (let x = -cw; x < cw * 2; x += stepX)
                ctx.fillText(s.wmText, x, y);
    } else {
        const map = {
            tl:['left','top',pad,pad], tr:['right','top',cw-pad,pad],
            bl:['left','bottom',pad,ch-pad], br:['right','bottom',cw-pad,ch-pad],
            center:['center','middle',cw/2,ch/2]
        };
        const [ta, tb, x, y] = map[s.wmPos] || map.br;
        ctx.textAlign = ta; ctx.textBaseline = tb;
        ctx.fillText(s.wmText, x, y);
    }
    ctx.restore();
}

function processImage(item, s) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            try {
                const oriented = orientImage(img, s.rotate, s.flip);
                const t = computeTarget(oriented.width, oriented.height, s);
                const canvas = document.createElement('canvas');
                canvas.width = t.cw; canvas.height = t.ch;
                const ctx = canvas.getContext('2d');
                if (t.fill || s.format === 'image/jpeg') {
                    ctx.fillStyle = s.bgColor; ctx.fillRect(0, 0, t.cw, t.ch);
                }
                const filters = [];
                if (s.brightness !== 100) filters.push(`brightness(${s.brightness}%)`);
                if (s.contrast !== 100)   filters.push(`contrast(${s.contrast}%)`);
                if (s.saturate !== 100)   filters.push(`saturate(${s.saturate}%)`);
                if (s.effect === 'grayscale') filters.push('grayscale(100%)');
                if (s.effect === 'sepia')     filters.push('sepia(100%)');
                ctx.filter = filters.length ? filters.join(' ') : 'none';
                ctx.drawImage(oriented, t.dx, t.dy, t.dw, t.dh);
                ctx.filter = 'none';
                if (s.wmText) drawWatermark(ctx, t.cw, t.ch, s);
                canvas.toBlob(blob => blob ? resolve({ blob, w: t.cw, h: t.ch }) : reject(new Error('encode')), s.format, s.quality);
            } catch (err) { reject(err); }
        };
        img.onerror = () => reject(new Error('read'));
        img.src = item.url;
    });
}

function makeName(pattern, idx, file, w, h, ext, used) {
    const base = file.name.replace(/\.[^.]+$/, '') || 'photo';
    let name = pattern
        .replaceAll('{nnn}', String(idx+1).padStart(3,'0'))
        .replaceAll('{n}', String(idx+1))
        .replaceAll('{name}', base)
        .replaceAll('{w}', w).replaceAll('{h}', h)
        .replaceAll('{date}', new Date().toISOString().slice(0,10))
        .replace(/[\\/:*?"<>|]/g, '_') || 'photo';
    let fn = name + ext, k = 1;
    while (used.has(fn)) fn = `${name}-${++k}${ext}`;
    used.add(fn);
    return fn;
}

if ($('processBtn')) $('processBtn').addEventListener('click', startProcessing);
if ($('cancelBtn')) $('cancelBtn').addEventListener('click', () => { BP.cancelled = true; });

async function startProcessing() {
    if (BP.processing) return;
    if (!BP.files.length) { alert('Добавьте хотя бы одно изображение товара!'); return; }

    const s = getSettings();
    const ext = s.format === 'image/webp' ? '.webp' : s.format === 'image/png' ? '.png' : '.jpg';
    BP.processing = true; BP.cancelled = false;
    $('processBtn').disabled = true;
    if ($('progressBox')) $('progressBox').classList.add('visible');
    if ($('resultBox')) $('resultBox').classList.remove('visible');

    const zip = new JSZip();
    const used = new Set(), results = [];
    let outBytes = 0, errors = 0;

    for (let i = 0; i < BP.files.length; i++) {
        if (BP.cancelled) break;
        const item = BP.files[i];
        if ($('progressStatus')) $('progressStatus').textContent = `Обработка: ${item.file.name} (${i+1}/${BP.files.length})`;
        const pct = Math.round((i / BP.files.length) * 100);
        if ($('progressBar')) $('progressBar').style.width = pct + '%';
        if ($('progressPercent')) $('progressPercent').textContent = pct + '%';
        try {
            const { blob, w, h } = await processImage(item, s);
            const name = makeName(s.pattern, i, item.file, w, h, ext, used);
            zip.file(name, blob);
            results.push({ name, blob, size: blob.size });
            outBytes += blob.size;
            const card = document.querySelector(`.file-card[data-id="${item.id}"]`);
            if (card) card.classList.add('done');
        } catch (e) { errors++; }
        await new Promise(r => setTimeout(r));
    }

    if (!BP.cancelled && results.length) {
        if ($('progressStatus')) $('progressStatus').textContent = 'Упаковка файлов в ZIP…';
        if ($('progressBar')) $('progressBar').style.width = '98%';
        const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
        saveAs(zipBlob, `batchphoto-market-${new Date().toISOString().slice(0,10)}.zip`);

        const saved = totalSize() - outBytes;
        if ($('resultStats')) {
            $('resultStats').innerHTML =
                `Готово карт: <strong>${results.length}</strong>${errors ? `, ошибок: <strong>${errors}</strong>` : ''}<br>` +
                `Исходный размер: ${formatBytes(totalSize())} → Новый архив: ${formatBytes(outBytes)} ` +
                (saved > 0 ? `(сжато на ${Math.round(saved/totalSize()*100)}%)` : '');
        }
        if ($('resultsList')) {
            $('resultsList').innerHTML = results.map((r, i) =>
                `<div class="result-row"><span>${escapeHtml(r.name)}</span><span>${formatBytes(r.size)} &nbsp; <a href="#" data-i="${i}">скачать</a></span></div>`).join('');
            $('resultsList').querySelectorAll('a').forEach(a =>
                a.addEventListener('click', e => { e.preventDefault(); const r = results[+a.dataset.i]; saveAs(r.blob, r.name); }));
        }
        if ($('resultBox')) $('resultBox').classList.add('visible');
        if ($('progressStatus')) $('progressStatus').textContent = 'Готово! Архив скачан.';
        if ($('progressBar')) $('progressBar').style.width = '100%'; 
        if ($('progressPercent')) $('progressPercent').textContent = '100%';
    } else {
        if ($('progressStatus')) $('progressStatus').textContent = BP.cancelled ? 'Отменено.' : 'Нет результатов.';
    }
    BP.processing = false;
    $('processBtn').disabled = false;
}