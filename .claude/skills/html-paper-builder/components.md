# Paper components — copy-paste snippets

All snippets are self-contained (no libraries, no external requests). Paste the HTML into the paper body and the JS into the single `<script>` at the end. Style hooks (`.widget`, `.control`, `.chart`) are already in the template CSS.

## 1. Parameter slider

```html
<div class="widget">
  <p class="widget-title">Learning-rate decay</p>
  <div class="control">
    <label for="lr">Initial LR</label>
    <input type="range" id="lr" min="0.001" max="1" step="0.001" value="0.1">
    <output id="lr-out">0.100</output>
  </div>
  <svg id="lr-chart" class="chart" viewBox="0 0 640 280" role="img" aria-label="Decay curve"></svg>
</div>
```

```js
function bindSlider(id, outId, fmt, onChange) {
  const el = document.getElementById(id), out = document.getElementById(outId);
  const update = () => { out.textContent = fmt(el.valueAsNumber); onChange(el.valueAsNumber); };
  el.addEventListener("input", update);
  update(); // draw initial state
}
```

## 2. SVG line chart (no libraries)

```js
function lineChart(svgId, seriesList, opts = {}) {
  const svg = document.getElementById(svgId);
  const W = 640, H = 280, m = { t: 12, r: 12, b: 28, l: 44 };
  const pts = seriesList.flatMap(s => s.points);
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const x0 = opts.xMin ?? Math.min(...xs), x1 = opts.xMax ?? Math.max(...xs);
  const y0 = opts.yMin ?? Math.min(...ys), y1 = opts.yMax ?? Math.max(...ys);
  const X = v => m.l + ((v - x0) / (x1 - x0 || 1)) * (W - m.l - m.r);
  const Y = v => H - m.b - ((v - y0) / (y1 - y0 || 1)) * (H - m.t - m.b);
  const tickFmt = v => Math.abs(v) >= 1000 ? v.toExponential(0) : +v.toFixed(3);
  let out = `<line class="axis" x1="${m.l}" y1="${H - m.b}" x2="${W - m.r}" y2="${H - m.b}"/>` +
            `<line class="axis" x1="${m.l}" y1="${m.t}" x2="${m.l}" y2="${H - m.b}"/>`;
  for (let i = 0; i <= 4; i++) {
    const xv = x0 + (i / 4) * (x1 - x0), yv = y0 + (i / 4) * (y1 - y0);
    out += `<text class="axis-label" x="${X(xv)}" y="${H - m.b + 16}" text-anchor="middle">${tickFmt(xv)}</text>`;
    out += `<text class="axis-label" x="${m.l - 6}" y="${Y(yv) + 4}" text-anchor="end">${tickFmt(yv)}</text>`;
  }
  seriesList.forEach((s, i) => {
    const d = s.points.map((p, j) => `${j ? "L" : "M"}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join("");
    out += `<path class="${i === 0 ? "series" : "series-2"}" d="${d}"/>`;
  });
  if (opts.xLabel) out += `<text class="axis-label" x="${(W + m.l) / 2}" y="${H - 4}" text-anchor="middle">${opts.xLabel}</text>`;
  svg.innerHTML = out;
}

// usage with a slider:
bindSlider("lr", "lr-out", v => v.toFixed(3), (lr) => {
  const points = Array.from({ length: 100 }, (_, i) => [i, lr * Math.exp(-i / 30)]);
  lineChart("lr-chart", [{ points }], { yMin: 0, xLabel: "epoch" });
});
```

## 3. SVG bar chart

```js
function barChart(svgId, labels, values) {
  const svg = document.getElementById(svgId);
  const W = 640, H = 280, m = { t: 12, r: 12, b: 40, l: 44 };
  const max = Math.max(...values) || 1;
  const bw = (W - m.l - m.r) / values.length;
  let out = `<line class="axis" x1="${m.l}" y1="${H - m.b}" x2="${W - m.r}" y2="${H - m.b}"/>`;
  values.forEach((v, i) => {
    const h = (v / max) * (H - m.t - m.b);
    out += `<rect class="bar" x="${(m.l + i * bw + bw * 0.15).toFixed(1)}" y="${(H - m.b - h).toFixed(1)}" width="${(bw * 0.7).toFixed(1)}" height="${h.toFixed(1)}" rx="3"/>`;
    out += `<text class="axis-label" x="${(m.l + (i + 0.5) * bw).toFixed(1)}" y="${H - m.b + 16}" text-anchor="middle">${labels[i]}</text>`;
    out += `<text class="axis-label" x="${(m.l + (i + 0.5) * bw).toFixed(1)}" y="${(H - m.b - h - 5).toFixed(1)}" text-anchor="middle">${v}</text>`;
  });
  svg.innerHTML = out;
}
```

## 4. Collapsible derivation

```html
<details class="derivation">
  <summary>Derivation: why the variance halves</summary>
  <p>Step-by-step content here — can include <code>code</code> and inline math notation.</p>
</details>
```

## 5. Figure with caption

```html
<figure>
  <svg id="fig-3" class="chart" viewBox="0 0 640 280"></svg>
  <figcaption><strong>Figure 3.</strong> Effect of temperature on sampling entropy.</figcaption>
</figure>
```
