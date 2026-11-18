/**
 * 按 schema 生成表单（规划 4.11）。控件都带 data-path，输入时由配置页写回草稿
 * 每个字段外层 data-f=字段路径、data-pub=线上值，用来标“改过”的字段
 */
(() => {
  'use strict';
  const { get, eq } = Schemas;
  const esc = UI.esc;
  const Form = (window.Form = { calc: new Map() });
  const pubAttr = (v) => (v === undefined ? '' : `data-pub="${esc(JSON.stringify(v ?? null))}"`);
  const opts = (f, data) => (typeof f.opts === 'function' ? f.opts(data) : f.opts);

  Form.fields = (fields, ctx, prefix = '', row = null) => fields.map((f) => Form.field(f, ctx, prefix, row)).join('');
  Form.field = (f, ctx, prefix, row) => {
    if (f.showIf && !f.showIf(ctx.data, row)) return '';
    if (f.t === 'group') return `<fieldset class="fs"><legend>${esc(f.label)}</legend><div class="fgrid c${f.cols || 2}">${Form.fields(f.fields, ctx, prefix, row)}</div></fieldset>`;
    if (f.t === 'list') return Form.list(f, ctx, prefix + f.k);
    const path = prefix + f.k;
    const v = get(ctx.data, path);
    const has = ctx.pubRow !== null;
    const pv = has ? get(ctx.pub, ctx.pubPath ? ctx.pubPath(path) : path) : undefined;
    const changed = f.t !== 'calc' && has && pv !== undefined && !eq(v, pv);
    if (f.t === 'calc') Form.calc.set(path, f);
    const was = changed ? (f.t === 'i18n' ? (pv || {}).zh : Schemas.show(f, pv, ctx.pub)) : '';
    return `<div class="f ${f.wide ? 'f-wide' : ''} ${changed ? 'is-changed' : ''}" data-f="${path}" ${f.t === 'calc' ? '' : pubAttr(pv)}>
      <label class="f-l">${esc(f.label)}${f.req ? '<i class="req">*</i>' : ''}</label>
      <div class="f-c" ${f.t === 'calc' ? `data-calc="${path}"` : ''}>${Form.control(f, v, path, ctx, row)}</div>
      ${f.help ? `<p class="f-h">${f.help}</p>` : ''}<p class="f-was">${changed ? '线上：' + esc(String(was ?? '')) : ''}</p></div>`;
  };

  Form.control = (f, v, path, ctx, row, compact) => {
    const ro = ctx.ro || f.ro === true;
    const dis = ro ? 'disabled' : '';
    const dp = `data-path="${path}"`;
    switch (f.t) {
      case 'num': return `<span class="inp-u"><input type="number" class="inp" ${dp} data-t="num" value="${v ?? ''}" ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''} step="${f.step || 1}" ${dis}>${f.unit ? `<em>${esc(f.unit)}</em>` : ''}</span>`;
      case 'text': return `<input class="inp" ${dp} data-t="text" value="${esc(v ?? '')}" ${dis}>`;
      case 'area': return `<textarea class="inp" rows="3" ${dp} data-t="text" ${dis}>${esc(v ?? '')}</textarea>`;
      case 'date': return `<input type="date" class="inp" ${dp} data-t="text" value="${esc(v || '')}" ${dis}>`;
      case 'bool': return `<label class="sw ${ro ? 'is-dis' : ''}"><input type="checkbox" ${dp} data-t="bool" ${v ? 'checked' : ''} ${dis}><i></i><span>${v ? '是' : '否'}</span></label>`;
      case 'sel': return `<select class="inp" ${dp} data-t="sel" ${f.num ? 'data-num' : ''} ${dis}>${UI.opts(opts(f, ctx.data), v)}</select>`;
      case 'radio': return `<div class="radios">${opts(f, ctx.data).map(([k, l]) => `<label class="rd ${String(k) === String(v) ? 'is-on' : ''}"><input type="radio" name="${path}" value="${esc(k)}" ${dp} data-t="sel" ${String(k) === String(v) ? 'checked' : ''} ${dis}><span>${esc(l)}</span></label>`).join('')}</div>`;
      case 'range': return `<span class="inp-u"><input type="number" class="inp inp-s" data-path="${path}.0" data-t="num" value="${(v || [])[0] ?? ''}" ${dis}><i>–</i><input type="number" class="inp inp-s" data-path="${path}.1" data-t="num" value="${(v || [])[1] ?? ''}" ${dis}>${f.unit ? `<em>${esc(f.unit)}</em>` : ''}</span>`;
      case 'i18n': return compact ? Form.i18nCell(f, v, path, ro) : Form.i18n(f, v, path, ro);
      case 'img': return Form.img(f, v, path, ro, compact);
      case 'item': {
        const list = Store.pub('items').rows.filter((x) => !f.kind || x.kind === f.kind);
        return `<select class="inp" ${dp} data-t="sel" ${dis}>${UI.opts([['', f.empty || '无'], ...list.map((x) => [x.id, x.name.zh + (x.enabled ? '' : '（已下架）')])], v)}</select>`;
      }
      case 'stake': return ro ? `<b>${esc(Store.stakeName(v))}</b>` : `<select class="inp" ${dp} data-t="sel">${UI.opts(Store.pub('stakes').rows.map((x) => [x.id, x.name.zh]), v)}</select>`;
      case 'jump': return `<select class="inp" ${dp} data-t="sel" ${dis}>${UI.opts(Store.pub('jumps').rows.map((x) => [x.key, x.name]), v)}</select>`;
      case 'reward': {
        const r = v || { coins: 0, item: '' };
        return `<span class="reward"><span class="inp-u"><input type="number" class="inp inp-s" data-path="${path}.coins" data-t="num" min="0" value="${r.coins ?? ''}" ${dis}><em>金币</em></span>
          <select class="inp" data-path="${path}.item" data-t="sel" ${dis}>${UI.opts([['', '不送装扮'], ...Store.pub('items').rows.filter((x) => !x.is_default && !x.vip).map((x) => [x.id, '+ ' + x.name.zh])], r.item)}</select></span>`;
      }
      case 'calc': return f.render(ctx.data, row);
      default: return esc(v);
    }
  };

  Form.i18n = (f, v, path, ro) => `<div class="i18n">${D.LANGS.map((l) => {
    const val = (v || {})[l.id] || '';
    const ctl = f.area ? `<textarea class="inp" rows="2" data-path="${path}.${l.id}" data-t="text" ${ro ? 'disabled' : ''}>${esc(val)}</textarea>` : `<input class="inp" data-path="${path}.${l.id}" data-t="text" value="${esc(val)}" placeholder="${esc(l.name)}" ${ro ? 'disabled' : ''}>`;
    return `<label class="i18n-r ${val.trim() ? '' : 'is-miss'}"><span title="${esc(l.name)}">${l.short}</span>${ctl}</label>`;
  }).join('')}</div>`;
  Form.i18nCell = (f, v, path, ro) => `<span class="i18n-cell">${UI.i18n(v)}<button class="btn btn-xs" data-act="i18n" data-path="${path}" data-label="${esc(f.label)}" ${f.area ? 'data-area' : ''}>${ro ? '查看' : '多语言'}</button></span>`;
  Form.img = (f, v, path, ro, compact) => {
    const lib = f.lib ? D.IMAGE_LIB[f.lib] || [] : [].concat(...Object.values(D.IMAGE_LIB));
    const list = [['', '（不用图片）'], ...lib, ...(v && !lib.some(([p]) => p === v) ? [[v, v.startsWith('data:') ? '上传的图片' : v.split('/').pop()]] : [])];
    return `<div class="imgf ${compact ? 'is-compact' : ''}">${v ? `<img src="${esc(v)}" alt="">` : '<span class="imgf-empty">无</span>'}
      <div class="imgf-c"><select class="inp" data-path="${path}" data-t="sel" ${ro ? 'disabled' : ''}>${UI.opts(list, v)}</select>
      ${ro ? '' : `<label class="btn btn-xs">上传<input type="file" accept="image/*" data-path="${path}" data-t="file" hidden></label>`}</div></div>`;
  };

  /* 列表：表格或卡片。行按 key 和线上对齐，新行标“新增” */
  Form.list = (f, ctx, path) => {
    const rows = get(ctx.data, path) || [];
    const pubRows = get(ctx.pub, path) || [];
    const ro = ctx.ro;
    const pubOf = (r, i) => (f.key ? pubRows.find((p) => p[f.key] === r[f.key]) : pubRows[i]);
    const acts = (i) => (ro ? '' : `<span class="row-acts">${f.sortable ? `<button class="icon-btn" data-act="mv" data-path="${path}" data-i="${i}" data-d="-1" title="上移">${UI.ic('up', 14)}</button><button class="icon-btn" data-act="mv" data-path="${path}" data-i="${i}" data-d="1" title="下移">${UI.ic('down', 14)}</button>` : ''}${f.remove !== false ? `<button class="icon-btn is-danger" data-act="rm" data-path="${path}" data-i="${i}" title="删除">${UI.ic('trash', 14)}</button>` : ''}</span>`);
    const add = !ro && f.add ? `<button class="btn btn-sm" data-act="add" data-path="${path}">${UI.ic('plus', 14)} 添加一行</button>` : '';
    const cellCtx = (r, i, c) => {
      const pr = pubOf(r, i);
      return { ...ctx, ro: ro || c.ro === true || (c.ro === 'existing' && !!pr), pubRow: pr ? 1 : null, pubPath: () => '', pub: pr };
    };
    if (f.layout === 'cards') {
      return `<div class="f f-wide"><label class="f-l">${esc(f.label)}</label><div class="lcards">${rows.map((r, i) => {
        const pr = pubOf(r, i);
        const rctx = { ...ctx, pub: pr || {}, pubRow: pr ? 1 : null, pubPath: (p) => p.split('.').pop() };
        return `<div class="lcard ${pr ? '' : 'is-new'}"><div class="lcard-hd"><b>${esc(f.rowLabel ? f.rowLabel(r) : '#' + (i + 1))}</b>${pr ? '' : UI.tag('新增', 'blue')}${acts(i)}</div>
          <div class="fgrid c2">${f.cols.map((c) => Form.field({ ...c, ro: c.ro === true || (c.ro === 'existing' && !!pr) }, rctx, `${path}.${i}.`, r)).join('')}</div></div>`;
      }).join('')}</div>${add}</div>`;
    }
    const cols = f.cols.filter((c) => !c.showIf || c.showIf(ctx.data));
    return `<div class="f f-wide f-list"><label class="f-l">${esc(f.label)} <span class="muted">${rows.length} 项</span></label>
      <div class="tbl-wrap"><table class="tbl ltbl"><thead><tr>${cols.map((c) => `<th style="${c.w ? `width:${c.w}` : ''}">${esc(c.label)}${c.unit && c.t !== 'num' ? `<small>（${esc(c.unit)}）</small>` : ''}</th>`).join('')}${ro ? '' : '<th style="width:96px"></th>'}</tr></thead>
      <tbody>${rows.map((r, i) => {
        const pr = pubOf(r, i);
        return `<tr class="${pr ? '' : 'is-new'}">${cols.map((c) => {
          const cp = `${path}.${i}.${c.k}`;
          const cx = cellCtx(r, i, c);
          const pv = pr ? pr[c.k] : undefined;
          const changed = c.t !== 'calc' && pr && !eq(r[c.k], pv);
          if (c.t === 'calc') Form.calc.set(cp, c);
          return `<td class="${changed ? 'is-changed' : ''}" data-f="${cp}" ${c.t !== 'calc' && pr ? pubAttr(pv) : ''} ${c.t === 'calc' ? `data-calc="${cp}"` : ''}>${Form.control(c, r[c.k], cp, cx, r, true)}</td>`;
        }).join('')}${ro ? '' : `<td class="a-r">${pr ? '' : UI.tag('新增', 'blue')}${acts(i)}</td>`}</tr>`;
      }).join('')}</tbody></table></div>${add}</div>`;
  };

  /** 按路径找到 schema 里的列表字段（只支持顶层和分组里的列表） */
  Form.findList = (fields, path) => {
    for (const f of fields) {
      if (f.t === 'group') { const x = Form.findList(f.fields, path); if (x) return x; }
      if (f.t === 'list' && f.k === path) return f;
    }
    return null;
  };
})();
