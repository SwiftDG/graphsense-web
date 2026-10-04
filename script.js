const form = document.querySelector('#analysis-form');
const imageInput = document.querySelector('#chart-image');
const loadDemoButton = document.querySelector('#load-demo');
const fileStatus = document.querySelector('#file-status');
const previewWrap = document.querySelector('#preview-wrap');
const preview = document.querySelector('#chart-preview');
const previewCaption = document.querySelector('#preview-caption');
const message = document.querySelector('#form-message');
const results = document.querySelector('#results');
const audioPlayer = document.querySelector('#audio-player');
const audioDownload = document.querySelector('#download-audio');

let selectedImage = null;
let audioUrl = null;

imageInput.addEventListener('change', () => {
  const [file] = imageInput.files;
  if (!file) return;
  if (!file.type.startsWith('image/')) return showError('Choose a PNG, JPG, or WebP image.');
  selectedImage = { name: file.name, url: URL.createObjectURL(file) };
  showPreview(selectedImage);
});

loadDemoButton.addEventListener('click', () => {
  selectedImage = { name: 'Example chart: Value versus Time', url: 'assets/demo-line-graph.png' };
  document.querySelector('#chart-title').value = 'Value versus Time';
  document.querySelector('#x-min').value = 0;
  document.querySelector('#x-max').value = 10;
  document.querySelector('#y-min').value = 0;
  document.querySelector('#y-max').value = 60;
  showPreview(selectedImage);
});

function showPreview(image) {
  preview.src = image.url;
  preview.alt = `Preview of ${image.name}`;
  previewCaption.textContent = image.name;
  previewWrap.hidden = false;
  fileStatus.textContent = `${image.name} is ready to analyse. The image stays in this browser.`;
  hideError();
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideError();
  if (!selectedImage) return showError('Choose a supported line-graph image before analysing.');

  const scale = getScale();
  if (!scale) return;

  try {
    fileStatus.textContent = 'Analysing the line and chart axes…';
    const image = await loadImage(selectedImage.url);
    const analysis = analyseLineGraph(image, scale);
    if (!analysis.ok) throw new Error(analysis.reason);
    showResults(analysis, scale);
    fileStatus.textContent = 'Analysis complete. Your image was processed locally in this browser.';
  } catch (error) {
    showError(error.message || 'GraphSense could not analyse this image. Try a clearer supported line graph.');
    fileStatus.textContent = 'Analysis did not complete.';
  }
});

function getScale() {
  const values = ['x-min', 'x-max', 'y-min', 'y-max'].map((id) => Number(document.querySelector(`#${id}`).value));
  if (values.some((value) => !Number.isFinite(value))) {
    showError('Enter a number for every axis limit before analysing.');
    return null;
  }
  const [xMin, xMax, yMin, yMax] = values;
  if (xMax <= xMin || yMax <= yMin) {
    showError('Each axis maximum must be greater than its minimum.');
    return null;
  }
  return {
    xMin, xMax, yMin, yMax,
    title: document.querySelector('#chart-title').value.trim(),
    unit: document.querySelector('#chart-unit').value.trim()
  };
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The selected image could not be read.'));
    image.src = url;
  });
}

function analyseLineGraph(image, scale) {
  const canvas = document.createElement('canvas');
  const maxWidth = 1400;
  const scaleFactor = Math.min(1, maxWidth / image.naturalWidth);
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scaleFactor));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scaleFactor));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const { width, height } = canvas;
  const pixels = context.getImageData(0, 0, width, height).data;
  const darkAt = (x, y) => {
    const index = (y * width + x) * 4;
    const r = pixels[index], g = pixels[index + 1], b = pixels[index + 2];
    const luminance = r * .2126 + g * .7152 + b * .0722;
    const spread = Math.max(r, g, b) - Math.min(r, g, b);
    return luminance < 132 || (spread > 70 && luminance < 220);
  };

  const rowCounts = Array.from({ length: height }, (_, y) => {
    let count = 0;
    for (let x = Math.round(width * .04); x < Math.round(width * .96); x += 1) if (darkAt(x, y)) count += 1;
    return count;
  });
  const colCounts = Array.from({ length: width }, (_, x) => {
    let count = 0;
    for (let y = Math.round(height * .04); y < Math.round(height * .96); y += 1) if (darkAt(x, y)) count += 1;
    return count;
  });

  const horizontalThreshold = Math.max(55, width * .27);
  const verticalThreshold = Math.max(55, height * .28);
  const horizontalCandidates = rowCounts.map((count, y) => ({ count, y })).filter(({ count }) => count >= horizontalThreshold);
  const verticalCandidates = colCounts.map((count, x) => ({ count, x })).filter(({ count }) => count >= verticalThreshold);
  if (!horizontalCandidates.length || !verticalCandidates.length) {
    return { ok: false, reason: 'GraphSense could not find both chart axes. Use a clearer screenshot with visible x- and y-axes.' };
  }

  const xAxisY = horizontalCandidates.filter(({ y }) => y > height * .25).at(-1)?.y;
  const yAxisX = verticalCandidates.filter(({ x }) => x < width * .65)[0]?.x;
  if (!Number.isFinite(xAxisY) || !Number.isFinite(yAxisX)) {
    return { ok: false, reason: 'GraphSense could not identify the chart area. Try the original chart image rather than a cropped or angled photo.' };
  }

  const verticalInk = [];
  for (let y = 0; y < xAxisY - 5; y += 1) if (darkAt(yAxisX, y)) verticalInk.push(y);
  const yTop = Math.max(0, Math.min(...verticalInk) - 2);
  const xRight = Math.max(...horizontalCandidates.filter(({ y }) => Math.abs(y - xAxisY) <= 2).flatMap(({ y }) => {
    const coordinates = [];
    for (let x = yAxisX + 8; x < width; x += 1) if (darkAt(x, y)) coordinates.push(x);
    return coordinates;
  }));
  if (!Number.isFinite(yTop) || !Number.isFinite(xRight) || xRight - yAxisX < 80 || xAxisY - yTop < 60) {
    return { ok: false, reason: 'The detected chart area is too small. Use a larger screenshot with clear axes.' };
  }

  const pointCount = 24;
  const points = [];
  for (let i = 0; i < pointCount; i += 1) {
    const targetX = Math.round(yAxisX + 10 + ((xRight - yAxisX - 20) * i) / (pointCount - 1));
    const ys = [];
    for (let x = targetX - 3; x <= targetX + 3; x += 1) {
      for (let y = yTop + 4; y < xAxisY - 7; y += 1) if (darkAt(x, y)) ys.push(y);
    }
    if (!ys.length) continue;
    ys.sort((a, b) => a - b);
    const pixelY = ys[Math.floor(ys.length / 2)];
    const x = scale.xMin + ((targetX - yAxisX) / (xRight - yAxisX)) * (scale.xMax - scale.xMin);
    const y = scale.yMax - ((pixelY - yTop) / (xAxisY - yTop)) * (scale.yMax - scale.yMin);
    points.push({ x, y });
  }
  if (points.length < 14) {
    return { ok: false, reason: 'GraphSense found too little of the plotted line. This beta works best with one high-contrast line and minimal grid lines.' };
  }
  const coverage = points.length / pointCount;
  return { ok: true, points, coverage, axes: { xAxisY, yAxisX, xRight, yTop } };
}

function showResults(analysis, scale) {
  const values = analysis.points.map(({ y }) => y);
  const first = analysis.points[0], last = analysis.points.at(-1);
  const max = Math.max(...values), min = Math.min(...values);
  const maxPoint = analysis.points[values.indexOf(max)], minPoint = analysis.points[values.indexOf(min)];
  const direction = last.y - first.y;
  const range = scale.yMax - scale.yMin;
  const trend = Math.abs(direction) < range * .07 ? 'a broadly steady pattern' : direction > 0 ? 'an overall rising pattern' : 'an overall falling pattern';
  const unit = scale.unit ? ` ${scale.unit}` : '';
  const label = (value) => `${formatNumber(value)}${unit}`;
  const titleStart = scale.title ? `${scale.title}. ` : '';
  const peakSentence = `The highest detected value is ${label(max)} near x = ${formatNumber(maxPoint.x)}.`;
  const lowSentence = `The lowest detected value is ${label(min)} near x = ${formatNumber(minPoint.x)}.`;
  const summary = `${titleStart}This supported line graph shows ${trend}. It starts near ${label(first.y)} at x = ${formatNumber(first.x)} and ends near ${label(last.y)} at x = ${formatNumber(last.x)}. ${peakSentence} ${lowSentence}`;

  document.querySelector('#summary-text').textContent = summary;
  document.querySelector('#start-value').textContent = `${label(first.y)} at x = ${formatNumber(first.x)}`;
  document.querySelector('#end-value').textContent = `${label(last.y)} at x = ${formatNumber(last.x)}`;
  document.querySelector('#max-value').textContent = `${label(max)} near x = ${formatNumber(maxPoint.x)}`;
  document.querySelector('#min-value').textContent = `${label(min)} near x = ${formatNumber(minPoint.x)}`;
  document.querySelector('#confidence-note').textContent = analysis.coverage > .8
    ? 'GraphSense found the axes and most of the plotted line. Check the original chart before using this result in coursework.'
    : 'GraphSense found part of the plotted line. Treat this as a rough overview and check it against the original chart.';
  document.querySelector('#method-note').textContent = `The browser detected visible axis lines, sampled ${analysis.points.length} positions along a high-contrast plotted line, then mapped those positions to the axis limits you entered. The values are estimates, not a replacement for the source chart.`;
  setAudio(values);
  results.hidden = false;
  results.focus();
}

function formatNumber(value) {
  return Number(value.toFixed(2)).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function setAudio(values) {
  if (audioUrl) URL.revokeObjectURL(audioUrl);
  const wav = makeWav(values);
  audioUrl = URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }));
  audioPlayer.src = audioUrl;
  audioDownload.href = audioUrl;
}

function makeWav(values) {
  const sampleRate = 44100, duration = .15, samplesPerTone = Math.round(sampleRate * duration);
  const low = Math.min(...values), high = Math.max(...values), range = Math.max(high - low, Number.EPSILON);
  const samples = new Int16Array(samplesPerTone * values.length);
  values.forEach((value, toneIndex) => {
    const frequency = 220 + ((value - low) / range) * 660;
    for (let i = 0; i < samplesPerTone; i += 1) {
      const phase = (2 * Math.PI * frequency * i) / sampleRate;
      const envelope = .5 - .5 * Math.cos((2 * Math.PI * i) / (samplesPerTone - 1));
      samples[toneIndex * samplesPerTone + i] = Math.round(Math.sin(phase) * envelope * 0.45 * 32767);
    }
  });
  const buffer = new ArrayBuffer(44 + samples.byteLength), view = new DataView(buffer);
  const write = (offset, value) => [...value].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
  write(0, 'RIFF'); view.setUint32(4, 36 + samples.byteLength, true); write(8, 'WAVE'); write(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); write(36, 'data'); view.setUint32(40, samples.byteLength, true);
  new Int16Array(buffer, 44).set(samples);
  return buffer;
}

function showError(text) { message.textContent = text; message.hidden = false; }
function hideError() { message.hidden = true; message.textContent = ''; }
