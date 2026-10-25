const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const titles = { overview: 'Overview', files: 'Documents', crypto: 'Crypto posture', activity: 'Activity' };

function switchView(name) {
  if (!titles[name]) return;
  $$('.view').forEach((view) => view.classList.toggle('active', view.id === `view-${name}`));
  $$('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.view === name));
  $('#crumb').textContent = titles[name];
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cell(row, value, className = '') {
  const td = document.createElement('td');
  td.textContent = value;
  if (className) td.className = className;
  row.append(td);
  return td;
}

function renderDocuments(documents) {
  const overview = $('#documents-body');
  const all = $('#all-documents-body');
  overview.replaceChildren();
  all.replaceChildren();
  for (const doc of documents) {
    const row = document.createElement('tr');
    const name = cell(row, '', 'document-name-cell');
    name.innerHTML = '<span class="file-icon">▤</span>';
    const title = document.createElement('span');
    title.textContent = doc.name;
    name.append(title);
    cell(row, doc.owner, 'muted-cell');
    cell(row, doc.updated, 'muted-cell');
    const stateCell = cell(row, '', '');
    const pill = document.createElement('span');
    pill.className = `status-pill status-${doc.tone}`;
    pill.textContent = doc.state;
    stateCell.append(pill);
    overview.append(row);

    const fullRow = document.createElement('tr');
    const fullName = cell(fullRow, '', 'document-name-cell');
    fullName.innerHTML = '<span class="file-icon">▤</span>';
    const fullTitle = document.createElement('span');
    fullTitle.textContent = doc.name;
    fullName.append(fullTitle);
    cell(fullRow, doc.type, 'muted-cell');
    cell(fullRow, doc.owner, 'muted-cell');
    cell(fullRow, doc.updated, 'muted-cell');
    const fullState = cell(fullRow, '');
    const fullPill = document.createElement('span');
    fullPill.className = `status-pill status-${doc.tone}`;
    fullPill.textContent = doc.state;
    fullState.append(fullPill);
    all.append(fullRow);
  }
}

function activityRow(item, compact = false) {
  const row = document.createElement('div');
  row.className = 'activity-row';
  const icon = document.createElement('span');
  icon.className = `activity-icon ${item.kind}`;
  icon.textContent = ({ crypto: '⌘', access: '↗', share: '⇧', identity: '♙' })[item.kind] || '·';
  const copy = document.createElement('span');
  copy.className = 'activity-copy';
  const title = document.createElement('b');
  title.textContent = item.event;
  const detail = document.createElement('small');
  detail.textContent = `${item.actor} · ${item.detail}`;
  copy.append(title, detail);
  const time = document.createElement('time');
  time.textContent = item.time;
  row.append(icon, copy, time);
  if (!compact) {
    const kind = document.createElement('span');
    kind.className = 'activity-kind';
    kind.textContent = item.kind;
    row.append(kind);
  }
  return row;
}

function renderActivity(items) {
  const preview = $('#activity-preview');
  const full = $('#activity-full');
  preview.replaceChildren();
  full.replaceChildren();
  items.forEach((item, index) => {
    full.append(activityRow(item));
    if (index < 3) preview.append(activityRow(item, true));
  });
}

function renderCrypto(items) {
  const grid = $('#crypto-grid');
  grid.replaceChildren();
  $('#crypto-count').textContent = items.length;
  $('#metric-findings').textContent = String(items.length).padStart(2, '0');
  items.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'crypto-card';
    const top = document.createElement('div');
    top.className = 'crypto-card-top';
    const source = document.createElement('span');
    source.className = `source-pill ${item.layer.startsWith('Java') ? 'java' : 'node'}`;
    source.textContent = item.layer;
    const severity = document.createElement('span');
    severity.className = `severity severity-${item.severity.toLowerCase()}`;
    severity.textContent = item.severity;
    top.append(source, severity);
    const title = document.createElement('h3');
    title.textContent = item.name;
    const algorithm = document.createElement('code');
    algorithm.textContent = item.algorithm;
    const detail = document.createElement('p');
    detail.textContent = item.detail;
    const outputLabel = document.createElement('span');
    outputLabel.className = 'output-label';
    outputLabel.textContent = 'SAMPLE RUNTIME OUTPUT';
    const output = document.createElement('code');
    output.className = 'crypto-output';
    output.textContent = item.output;
    card.append(top, title, algorithm, detail, outputLabel, output);
    grid.append(card);
  });
}

async function loadWorkspace() {
  const refresh = $('#refresh');
  const errorBox = $('#load-error');
  refresh.classList.add('spinning');
  errorBox.hidden = true;
  try {
    const response = await fetch('/api/dashboard');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not load workspace');
    $('#metric-docs').textContent = data.summary.documents.toLocaleString();
    $('#metric-shared').textContent = String(data.summary.shared).padStart(2, '0');
    $('#metric-pending').textContent = String(data.summary.pendingReview).padStart(2, '0');
    $('#file-count').textContent = `${data.summary.documents} documents`;
    $('#workspace-name').textContent = data.workspace.company;
    renderDocuments(data.documents);
    renderActivity(data.activity);
    renderCrypto(data.cryptoExamples);
  } catch (error) {
    errorBox.hidden = false;
    errorBox.textContent = `${error.message}. Make sure the Java API is running on port 8081, then refresh.`;
  } finally {
    refresh.classList.remove('spinning');
  }
}

$$('.nav-item').forEach((item) => item.addEventListener('click', () => switchView(item.dataset.view)));
$$('[data-go]').forEach((button) => button.addEventListener('click', () => switchView(button.dataset.go)));
$('#refresh').addEventListener('click', loadWorkspace);
$('#current-date').textContent = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date()).toUpperCase();
loadWorkspace();
