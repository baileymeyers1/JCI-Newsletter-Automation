'use client';

import { useEffect, useMemo, useState } from 'react';

type ClientRow = {
  client_id: string;
  client_name: string;
  industry: string;
  client_goal: string;
  jci_role: string;
  keywords: string;
  specific_urls: string;
  send_time: string;
  timezone: string;
  analysis_style: string;
  active: string;
};

type RecipientRow = {
  id: string;
  client_id: string;
  name: string;
  email: string;
  active: string;
};

type LogRow = {
  timestamp: string;
  client_id: string;
  client_name: string;
  recipients_sent: string;
  recipients_failed: string;
  status: string;
  details: string;
};

type RecipientPreset = {
  id: string;
  name: string;
  email: string;
};

const recipientPresets: RecipientPreset[] = [
  { id: 'recip_001', name: 'Bailey Meyers', email: 'baileymeyers1@gmail.com' },
  { id: 'recip_002', name: 'Lindsay Turpin', email: 'lindsay@jcipr.com' },
  { id: 'recip_003', name: 'Ava Sanchez', email: 'ava@jcipr.com' },
  { id: 'recip_004', name: 'Seth Jacobson', email: 'seth@jcipr.com' },
  { id: 'recip_005', name: 'Simi Situ', email: 'simi@jcipr.com' },
  { id: 'recip_006', name: 'Georgia Lewis', email: 'georgia@jcipr.com' },
  { id: 'recip_007', name: 'Lucy Peltz', email: 'lucy@jcipr.com' },
  { id: 'recip_008', name: 'Natalia Nervi', email: 'natalia@jcipr.com' }
];

const clientDefaults: ClientRow = {
  client_id: '',
  client_name: '',
  industry: '',
  client_goal: '',
  jci_role: '',
  keywords: '',
  specific_urls: '',
  send_time: '',
  timezone: 'America/Los_Angeles',
  analysis_style: 'brief',
  active: 'TRUE'
};

const timezones = [
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'America/Phoenix'
];

const analysisStyles = ['brief', 'executive', 'detailed'];

const hourOptions = Array.from({ length: 12 }, (_, i) => String(i + 1));

const minuteOptions = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

function parseCommaList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatSendTime(value: string): string {
  if (!value) return '—';
  const [rawHour, rawMinute] = value.split(':').map((part) => Number(part));
  if (!Number.isFinite(rawHour) || !Number.isFinite(rawMinute)) return value;
  const period = rawHour >= 12 ? 'PM' : 'AM';
  const hour12 = rawHour % 12 === 0 ? 12 : rawHour % 12;
  return `${hour12}:${String(rawMinute).padStart(2, '0')} ${period}`;
}

function getSendParts(value: string) {
  if (!value) {
    return { hour: '9', minute: '00', period: 'AM' };
  }
  const [rawHour, rawMinute] = value.split(':').map((part) => Number(part));
  if (!Number.isFinite(rawHour) || !Number.isFinite(rawMinute)) {
    return { hour: '9', minute: '00', period: 'AM' };
  }
  const period = rawHour >= 12 ? 'PM' : 'AM';
  const hour12 = rawHour % 12 === 0 ? 12 : rawHour % 12;
  return {
    hour: String(hour12),
    minute: String(rawMinute).padStart(2, '0'),
    period
  };
}

function to24Hour(hour: string, minute: string, period: string): string {
  let hourNum = Number(hour);
  if (period === 'PM' && hourNum < 12) hourNum += 12;
  if (period === 'AM' && hourNum === 12) hourNum = 0;
  return `${String(hourNum).padStart(2, '0')}:${minute}`;
}

function getNextClientId(existing: ClientRow[]): string {
  const ids = existing
    .map((client) => client.client_id)
    .filter((id) => typeof id === 'string' && id.startsWith('client_'));
  let max = 0;
  for (const id of ids) {
    const num = Number(id.replace('client_', ''));
    if (Number.isFinite(num)) {
      max = Math.max(max, num);
    }
  }
  return `client_${String(max + 1).padStart(3, '0')}`;
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Request failed');
  }
  return res.json();
}

export default function Dashboard() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [recipients, setRecipients] = useState<RecipientRow[]>([]);
  const [log, setLog] = useState<LogRow[]>([]);
  const [editingClient, setEditingClient] = useState<ClientRow | null>(null);
  const [notice, setNotice] = useState<string>('');
  const [customRecipient, setCustomRecipient] = useState({ name: '', email: '' });
  const [presetChoice, setPresetChoice] = useState<string>('');
  const [logPage, setLogPage] = useState(0);
  const [urlInput, setUrlInput] = useState('');

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    if (!editingClient) return;
    const areas = document.querySelectorAll<HTMLTextAreaElement>('.auto-textarea');
    areas.forEach((area) => {
      area.style.height = 'auto';
      area.style.height = `${area.scrollHeight}px`;
    });
  }, [editingClient]);

  async function refreshAll() {
    await Promise.all([loadClients(), loadRecipients(), loadLog()]);
  }

  async function loadClients() {
    const data = await fetchJSON<{ rows: ClientRow[] }>('/api/clients');
    setClients(data.rows);
  }

  async function loadRecipients() {
    const data = await fetchJSON<{ rows: RecipientRow[] }>('/api/recipients');
    setRecipients(data.rows);
  }

  async function loadLog() {
    const data = await fetchJSON<{ rows: LogRow[] }>('/api/log');
    setLog(data.rows);
  }

  const recipientsByClient = useMemo(() => {
    const map: Record<string, RecipientRow[]> = {};
    recipients.forEach((r) => {
      if (!map[r.client_id]) map[r.client_id] = [];
      map[r.client_id].push(r);
    });
    return map;
  }, [recipients]);

  const sortedLog = useMemo(() => [...log].reverse(), [log]);
  const logPageSize = 20;
  const totalLogPages = Math.max(1, Math.ceil(sortedLog.length / logPageSize));
  const pagedLog = sortedLog.slice(logPage * logPageSize, (logPage + 1) * logPageSize);

  useEffect(() => {
    if (logPage > totalLogPages - 1) {
      setLogPage(0);
    }
  }, [logPage, totalLogPages]);

  function openNewClient() {
    setEditingClient({ ...clientDefaults, client_id: getNextClientId(clients) });
    setPresetChoice('');
    setCustomRecipient({ name: '', email: '' });
    setUrlInput('');
  }

  function openEditClient(client: ClientRow) {
    setEditingClient({ ...client });
    setPresetChoice('');
    setCustomRecipient({ name: '', email: '' });
    setUrlInput('');
  }

  function closeEditor() {
    setEditingClient(null);
    setPresetChoice('');
    setCustomRecipient({ name: '', email: '' });
    setUrlInput('');
  }

  async function saveClient() {
    if (!editingClient) return;
    setNotice('');
    const payload = { ...editingClient };
    const existing = clients.find((c) => c.client_id === editingClient.client_id);
    if (existing) {
      await fetch(`/api/clients/${encodeURIComponent(editingClient.client_id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setNotice('Client updated.');
    } else {
      await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setNotice('Client added.');
    }
    await loadClients();
  }

  async function deleteClient(clientId: string) {
    if (!confirm(`Delete client ${clientId}?`)) return;
    await fetch(`/api/clients/${encodeURIComponent(clientId)}`, { method: 'DELETE' });
    setNotice('Client deleted.');
    if (editingClient?.client_id === clientId) {
      closeEditor();
    }
    await loadClients();
  }

  async function addRecipient(clientId: string, name: string, email: string) {
    if (!clientId || !email) return;
    const existing = recipients.find(
      (r) => r.client_id === clientId && r.email.toLowerCase() === email.toLowerCase()
    );
    if (existing) {
      setNotice('Recipient already assigned.');
      return;
    }
    await fetch('/api/recipients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        name,
        email,
        active: 'TRUE'
      })
    });
    await loadRecipients();
  }

  async function removeRecipient(recipient: RecipientRow) {
    if (!confirm(`Remove ${recipient.name}?`)) return;
    await fetch(`/api/recipients/${encodeURIComponent(recipient.id)}`, { method: 'DELETE' });
    await loadRecipients();
  }

  async function handlePresetAdd() {
    if (!editingClient || !presetChoice) return;
    const preset = recipientPresets.find((p) => p.id === presetChoice);
    if (!preset) return;
    await addRecipient(editingClient.client_id, preset.name, preset.email);
    setPresetChoice('');
  }

  async function handleCustomAdd() {
    if (!editingClient) return;
    await addRecipient(editingClient.client_id, customRecipient.name, customRecipient.email);
    setCustomRecipient({ name: '', email: '' });
  }

  function addUrlChip() {
    if (!editingClient) return;
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    const existing = parseCommaList(editingClient.specific_urls).map((url) => url.toLowerCase());
    if (existing.includes(trimmed.toLowerCase())) {
      setNotice('URL already added.');
      return;
    }
    const nextUrls = [...parseCommaList(editingClient.specific_urls), trimmed];
    setEditingClient({ ...editingClient, specific_urls: nextUrls.join(', ') });
    setUrlInput('');
  }

  function removeUrlChip(target: string) {
    if (!editingClient) return;
    const nextUrls = parseCommaList(editingClient.specific_urls).filter((url) => url !== target);
    setEditingClient({ ...editingClient, specific_urls: nextUrls.join(', ') });
  }

  function autoGrow(event: React.FormEvent<HTMLTextAreaElement>) {
    const el = event.currentTarget;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  const sendParts = editingClient ? getSendParts(editingClient.send_time) : getSendParts('');

  return (
    <div className="container">
      <div className="header">
        <div>
          <span className="badge">Daily Client Newsletter</span>
          <h1>Client Cards</h1>
        </div>
        <div className="action-row">
          <button className="button" onClick={openNewClient}>
            Add Client
          </button>
          <button className="button secondary" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </div>

      {notice ? <div className="notice">{notice}</div> : null}

      <div className="cards">
        {clients.map((client) => {
          const assigned = recipientsByClient[client.client_id] || [];
          return (
            <div className="client-card" key={client.client_id}>
              <div className="card-header">
                <div>
                  <h2>{client.client_name}</h2>
                  <p>{client.industry}</p>
                  {client.client_goal ? <p className="goal">{client.client_goal}</p> : null}
                </div>
                <button className="button secondary" onClick={() => openEditClient(client)}>
                  Edit
                </button>
              </div>
              <div className="pill-row">
                <span className="pill">Send: {formatSendTime(client.send_time)}</span>
                <span className="pill">Active: {client.active === 'TRUE' ? 'Yes' : 'No'}</span>
              </div>
              <div className="recipients-block">
                <h3>Assigned Recipients</h3>
                {assigned.length === 0 ? (
                  <p className="muted">No recipients assigned.</p>
                ) : (
                  <ul>
                    {assigned.map((recipient) => (
                      <li key={recipient.id}>
                        {recipient.name} <span>{recipient.email}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editingClient ? (
        <div className="modal">
          <div className="modal-backdrop" onClick={closeEditor} />
          <div className="modal-content card">
            <div className="editor-header">
              <div>
                <h2>Edit Client</h2>
                <p>{editingClient.client_name || 'New client'} </p>
              </div>
              <div className="action-row">
                <button className="button" onClick={saveClient}>
                  Save
                </button>
                <button className="button secondary" onClick={closeEditor}>
                  Close
                </button>
              </div>
            </div>

            <div className="grid">
              <div className="field">
                <label>Client name</label>
                <input
                  value={editingClient.client_name}
                  onChange={(event) =>
                    setEditingClient((prev) => (prev ? { ...prev, client_name: event.target.value } : prev))
                  }
                />
              </div>
              <div className="field">
                <label>Industry</label>
                <input
                  value={editingClient.industry}
                  onChange={(event) =>
                    setEditingClient((prev) => (prev ? { ...prev, industry: event.target.value } : prev))
                  }
                />
              </div>
              <div className="field">
                <label>Client goal</label>
                <textarea
                  value={editingClient.client_goal}
                  className="auto-textarea"
                  onInput={autoGrow}
                  onChange={(event) =>
                    setEditingClient((prev) => (prev ? { ...prev, client_goal: event.target.value } : prev))
                  }
                />
              </div>
              <div className="field">
                <label>JCI role</label>
                <textarea
                  value={editingClient.jci_role}
                  className="auto-textarea"
                  onInput={autoGrow}
                  onChange={(event) =>
                    setEditingClient((prev) => (prev ? { ...prev, jci_role: event.target.value } : prev))
                  }
                />
              </div>
              <div className="field">
                <label>Keywords</label>
                <textarea
                  value={editingClient.keywords}
                  className="auto-textarea"
                  onInput={autoGrow}
                  onChange={(event) =>
                    setEditingClient((prev) => (prev ? { ...prev, keywords: event.target.value } : prev))
                  }
                />
              </div>
              <div className="field">
                <label>URLs</label>
                <div className="inline">
                  <input
                    placeholder="Paste URL and add"
                    value={urlInput}
                    onChange={(event) => setUrlInput(event.target.value)}
                  />
                  <button className="button secondary" onClick={addUrlChip}>
                    Add URL
                  </button>
                </div>
                <div className="pill-row urls-preview">
                  {parseCommaList(editingClient.specific_urls).map((url) => (
                    <button className="pill url-pill removable" key={url} onClick={() => removeUrlChip(url)}>
                      {url} <span className="remove">×</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <label>Send time</label>
                <div className="inline time-inline">
                  <select
                    className="time-select hour"
                    value={sendParts.hour}
                    onChange={(event) =>
                      setEditingClient((prev) =>
                        prev ? { ...prev, send_time: to24Hour(event.target.value, sendParts.minute, sendParts.period) } : prev
                      )
                    }
                  >
                    {hourOptions.map((hour) => (
                      <option key={hour} value={hour}>
                        {hour}
                      </option>
                    ))}
                  </select>
                  <span className="time-colon">:</span>
                  <select
                    className="time-select minute"
                    value={sendParts.minute}
                    onChange={(event) =>
                      setEditingClient((prev) =>
                        prev ? { ...prev, send_time: to24Hour(sendParts.hour, event.target.value, sendParts.period) } : prev
                      )
                    }
                  >
                    {minuteOptions.map((minute) => (
                      <option key={minute} value={minute}>
                        {minute}
                      </option>
                    ))}
                  </select>
                  <select
                    className="time-select period"
                    value={sendParts.period}
                    onChange={(event) =>
                      setEditingClient((prev) =>
                        prev ? { ...prev, send_time: to24Hour(sendParts.hour, sendParts.minute, event.target.value) } : prev
                      )
                    }
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Timezone</label>
                <select
                  value={editingClient.timezone}
                  onChange={(event) =>
                    setEditingClient((prev) => (prev ? { ...prev, timezone: event.target.value } : prev))
                  }
                >
                  {timezones.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Analysis style</label>
                <select
                  value={editingClient.analysis_style}
                  onChange={(event) =>
                    setEditingClient((prev) => (prev ? { ...prev, analysis_style: event.target.value } : prev))
                  }
                >
                  {analysisStyles.map((style) => (
                    <option key={style} value={style}>
                      {style}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field toggle-field">
                <label>Active</label>
                <button
                  type="button"
                  className={`pill-switch ${editingClient.active === 'TRUE' ? 'on' : 'off'}`}
                  onClick={() =>
                    setEditingClient((prev) =>
                      prev ? { ...prev, active: prev.active === 'TRUE' ? 'FALSE' : 'TRUE' } : prev
                    )
                  }
                >
                  {editingClient.active === 'TRUE' ? 'ACTIVE' : 'INACTIVE'}
                </button>
              </div>
            </div>

            <div className="editor-section">
              <h3>Assigned Recipients</h3>
              <div className="recipient-actions">
                <div className="field">
                  <label>Add from preset</label>
                  <div className="inline">
                    <select value={presetChoice} onChange={(event) => setPresetChoice(event.target.value)}>
                      <option value="">Select a recipient</option>
                      {recipientPresets.map((preset) => (
                        <option key={preset.id} value={preset.id}>
                          {preset.name} ({preset.email})
                        </option>
                      ))}
                    </select>
                    <button className="button" onClick={handlePresetAdd}>
                      Add
                    </button>
                  </div>
                </div>

                <div className="field">
                  <label>Add custom recipient</label>
                  <div className="inline">
                    <input
                      placeholder="Name"
                      value={customRecipient.name}
                      onChange={(event) => setCustomRecipient({ ...customRecipient, name: event.target.value })}
                    />
                    <input
                      placeholder="Email"
                      value={customRecipient.email}
                      onChange={(event) => setCustomRecipient({ ...customRecipient, email: event.target.value })}
                    />
                    <button className="button secondary" onClick={handleCustomAdd}>
                      Add
                    </button>
                  </div>
                </div>
              </div>

              <div className="recipient-list">
                {(recipientsByClient[editingClient.client_id] || []).map((recipient) => (
                  <div className="recipient-row" key={recipient.id}>
                    <div>
                      <strong>{recipient.name}</strong>
                      <span>{recipient.email}</span>
                    </div>
                    <button className="button danger" onClick={() => removeRecipient(recipient)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {clients.some((c) => c.client_id === editingClient.client_id) ? (
              <div className="editor-section danger-zone">
                <h3>Delete Client</h3>
                <p className="muted">This will remove the client and all associated recipients.</p>
                <button className="button danger" onClick={() => deleteClient(editingClient.client_id)}>
                  Delete Client
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="card" style={{ marginTop: 24 }}>
        <h2>Delivery Log</h2>
        <div className="log-controls">
          <button className="button secondary" disabled={logPage === 0} onClick={() => setLogPage(logPage - 1)}>
            Previous
          </button>
          <span className="log-page">
            Page {logPage + 1} of {totalLogPages}
          </span>
          <button
            className="button secondary"
            disabled={logPage >= totalLogPages - 1}
            onClick={() => setLogPage(logPage + 1)}
          >
            Next
          </button>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Client</th>
              <th>Sent</th>
              <th>Failed</th>
              <th>Status</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {pagedLog.map((entry, index) => (
              <tr key={`${entry.timestamp}-${index}`}>
                <td>{entry.timestamp}</td>
                <td>{entry.client_name}</td>
                <td>{entry.recipients_sent}</td>
                <td>{entry.recipients_failed}</td>
                <td>{entry.status}</td>
                <td>{entry.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
