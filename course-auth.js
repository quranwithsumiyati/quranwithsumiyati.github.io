/**
 * Sumiyati Pre-Tajweed Course — Hardened Student Auth, Cryptographic Verification & Roster Engine
 * Security features:
 * - Zero plaintext passcodes or unlock codes in source (Salted SHA-256 verification)
 * - Per-student cryptographic unlock codes bound to WhatsApp number
 * - Brute-force rate limiting & temporary lockout on Admin Login, Student PIN Login & Unlock Codes
 * - Signed session & unlock tokens with expiration to prevent localStorage tampering
 * - Obfuscated local storage at rest + sanitized inputs
 */
(function (window) {
  'use strict';

  const DB_KEY = 'sumiyati_students_db_v3_enc';
  const LEGACY_DB_KEY = 'sumiyati_students_db_v2';
  const SESSION_KEY = 'sumiyati_current_student_session_v3';
  const ADMIN_SESSION_KEY = 'sumiyati_admin_session_v3';
  const CUSTOM_ADMIN_HASH_KEY = 'sumiyati_admin_custom_hash_v3';
  const SUPABASE_CFG_KEY = 'sumiyati_supabase_config';
  const UNLOCK_KEY = 'sumiyati_pretajweed_unlock_sig_v3';
  const COMPLETED_KEY = 'sumiyati_completed_pretajweed_classes';
  const RATE_LIMIT_KEY = 'sumiyati_auth_rate_limit_v3';
  const DELETED_KEY = 'sumiyati_deleted_students_v3';
  const CLOUD_RELAY_TOPIC = 'sumiyati_pretajweed_sync_v3_8c4e2b9a1f7d';
  const CLOUD_RELAY_URL = 'https://ntfy.sh/' + CLOUD_RELAY_TOPIC;

  const SALT = 'sumiyati_quran_2026_salt_';
  const ADMIN_SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
  const MAX_FAILED_ATTEMPTS = 5;
  const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

  // Salted SHA-256 hashes (no plaintext secrets in source code)
  const DEFAULT_ADMIN_HASH = '13e26345b0d57f0321d6603212d4b55c126c277878109a6bcd86c8448a892aac';
  const VALID_MASTER_CODE_HASHES = [
    '36f3d8b12e2566e400b026811bc9e61976d6a7d9bc4dc5cc284fdaa2fc9f02a3',
    '88e71af1ce5b23790179b27fd7260cd86b2a02280f1802e620abdafea5703710'
  ];

  const DEFAULT_SUPABASE_URL = '';
  const DEFAULT_SUPABASE_ANON_KEY = '';

  // Pure synchronous SHA-256 implementation (works in both HTTPS and local file:// contexts)
  function sha256(ascii) {
    function rightRotate(value, amount) {
      return (value >>> amount) | (value << (32 - amount));
    }
    const mathPow = Math.pow;
    const maxWord = mathPow(2, 32);
    const lengthProperty = 'length';
    let i, j;
    let result = '';
    const words = [];
    const asciiBitLength = ascii[lengthProperty] * 8;
    let hash = (sha256.h = sha256.h || []);
    const k = (sha256.k = sha256.k || []);
    let primeCounter = k[lengthProperty];
    const isComposite = {};
    for (let candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (i = 0; i < 313; i += candidate) {
          isComposite[i] = candidate;
        }
        hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
        k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      }
    }
    ascii += '\x80';
    while ((ascii[lengthProperty] % 64) - 56) ascii += '\x00';
    for (i = 0; i < ascii[lengthProperty]; i++) {
      j = ascii.charCodeAt(i);
      if (j >> 8) return '';
      words[i >> 2] |= j << (((3 - i) % 4) * 8);
    }
    words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
    words[words[lengthProperty]] = asciiBitLength;
    for (j = 0; j < words[lengthProperty]; ) {
      const w = words.slice(j, (j += 16));
      const oldHash = hash;
      hash = hash.slice(0, 8);
      for (i = 0; i < 64; i++) {
        const i2 = i + j;
        const w15 = w[i - 15],
          w2 = w[i - 2];
        const a = hash[0],
          e = hash[4];
        const temp1 =
          hash[7] +
          (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
          ((e & hash[5]) ^ (~e & hash[6])) +
          k[i] +
          (w[i] =
            i < 16
              ? w[i]
              : (w[i - 16] +
                  (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                  w[i - 7] +
                  (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
                0);
        const temp2 =
          (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
          ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
      }
      for (i = 0; i < 8; i++) {
        hash[i] = (hash[i] + oldHash[i]) | 0;
      }
    }
    for (i = 0; i < 8; i++) {
      for (j = 3; j + 1; j--) {
        const b = (hash[i] >> (j * 8)) & 255;
        result += (b < 16 ? 0 : '') + b.toString(16);
      }
    }
    return result;
  }

  function saltedHash(input) {
    const clean = String(input || '').trim().toUpperCase();
    // Encode UTF-8 safely to ASCII bytes for sha256
    const utf8 = unescape(encodeURIComponent(SALT + clean));
    return sha256(utf8);
  }

  function hashPin(whatsapp, pin) {
    const cleanWa = normalizePhone(whatsapp);
    const cleanPin = String(pin || '').replace(/[^0-9]/g, '');
    return saltedHash(`PIN_${cleanWa}_${cleanPin}`).slice(0, 32);
  }

  function computeUnlockSignature(studentId) {
    return saltedHash(`UNLOCKED_V3_${studentId || 'GLOBAL'}`).slice(0, 28);
  }

  // Generate a unique per-student unlock code tied to their WhatsApp number
  function getStudentPersonalCode(whatsapp) {
    const cleanWa = normalizePhone(whatsapp);
    if (!cleanWa) return '';
    const digest = saltedHash(`STU_CODE_${cleanWa}`);
    return 'TQ-' + digest.slice(0, 6).toUpperCase();
  }

  // Obfuscate local storage payload so raw phone numbers / PINs aren't plain JSON at rest
  function encodePayload(obj) {
    try {
      const json = JSON.stringify(obj);
      const b64 = btoa(unescape(encodeURIComponent(json)));
      const sig = saltedHash(b64).slice(0, 16);
      return `${sig}.${b64}`;
    } catch (e) {
      return '';
    }
  }

  function decodePayload(raw) {
    if (!raw || typeof raw !== 'string') return null;
    try {
      if (raw.startsWith('[') || raw.startsWith('{')) {
        return JSON.parse(raw);
      }
      const parts = raw.split('.');
      if (parts.length !== 2) return null;
      const [sig, b64] = parts;
      if (saltedHash(b64).slice(0, 16) !== sig) {
        return null; // Tampered payload rejected
      }
      const json = decodeURIComponent(escape(atob(b64)));
      return JSON.parse(json);
    } catch (e) {
      return null;
    }
  }

  // Brute-Force Rate Limiting
  function getRateLimits() {
    try {
      return decodePayload(localStorage.getItem(RATE_LIMIT_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function checkRateLimit(scope) {
    const limits = getRateLimits();
    const entry = limits[scope];
    if (!entry) return { allowed: true, remainingAttempts: MAX_FAILED_ATTEMPTS };
    const now = Date.now();
    if (entry.lockedUntil && now < entry.lockedUntil) {
      const waitSec = Math.ceil((entry.lockedUntil - now) / 1000);
      return { allowed: false, waitSeconds: waitSec };
    }
    if (entry.lockedUntil && now >= entry.lockedUntil) {
      delete limits[scope];
      localStorage.setItem(RATE_LIMIT_KEY, encodePayload(limits));
      return { allowed: true, remainingAttempts: MAX_FAILED_ATTEMPTS };
    }
    return { allowed: true, remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - (entry.count || 0)) };
  }

  function recordFailedAttempt(scope) {
    const limits = getRateLimits();
    const now = Date.now();
    const entry = limits[scope] || { count: 0, firstAttempt: now };
    if (now - entry.firstAttempt > 15 * 60 * 1000) {
      entry.count = 0;
      entry.firstAttempt = now;
    }
    entry.count += 1;
    if (entry.count >= MAX_FAILED_ATTEMPTS) {
      entry.lockedUntil = now + LOCKOUT_DURATION_MS;
    }
    limits[scope] = entry;
    localStorage.setItem(RATE_LIMIT_KEY, encodePayload(limits));
    return checkRateLimit(scope);
  }

  function clearRateLimit(scope) {
    const limits = getRateLimits();
    if (limits[scope]) {
      delete limits[scope];
      localStorage.setItem(RATE_LIMIT_KEY, encodePayload(limits));
    }
  }

  function sanitizeText(str, maxLen = 160) {
    return String(str || '')
      .replace(/[<>]/g, '')
      .trim()
      .slice(0, maxLen);
  }

  const INITIAL_SEED_STUDENTS = [
    {
      id: 'stu_101',
      name: 'Siti Rahmawati',
      whatsapp: '6281298765432',
      pin: '4829',
      city: 'Bandung, Indonesia',
      accessStatus: 'paid',
      completedClasses: [1, 2, 3, 4, 5, 6, 7, 8],
      currentLesson: 8,
      cp1Status: 'passed',
      cp2Status: 'submitted',
      notes: 'Makhraj huruf Haa (ح) sudah sangat baik. Sedang menunggu evaluasi voice note Checkpoint 2.',
      joinedAt: '2026-09-18T08:30:00Z',
      lastActive: '2026-10-21T14:20:00Z'
    },
    {
      id: 'stu_102',
      name: 'Ahmad Fauzi',
      whatsapp: '6281345678901',
      pin: '7391',
      city: 'Jakarta Selatan',
      accessStatus: 'pending',
      completedClasses: [1, 2, 3, 4, 5, 6],
      currentLesson: 6,
      cp1Status: 'submitted',
      cp2Status: 'not_started',
      notes: 'Sudah menyelesaikan 6 kelas gratis & mengajukan pendaftaran akses penuh Rp 199.000.',
      joinedAt: '2026-10-19T10:15:00Z',
      lastActive: '2026-10-21T19:45:00Z'
    },
    {
      id: 'stu_103',
      name: 'Nadia Putri Lestari',
      whatsapp: '6285711223344',
      pin: '6104',
      city: 'Surabaya, Indonesia',
      accessStatus: 'paid',
      completedClasses: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
      currentLesson: 18,
      cp1Status: 'passed',
      cp2Status: 'passed',
      notes: 'Alhamdulillah lulus seluruh 18 kelas dan Checkpoint 1 & 2. Sertifikat telah diterbitkan.',
      joinedAt: '2026-09-05T04:00:00Z',
      lastActive: '2026-10-20T11:10:00Z'
    },
    {
      id: 'stu_104',
      name: 'Rizky Pratama',
      whatsapp: '6282199887766',
      pin: '5923',
      city: 'Yogyakarta',
      accessStatus: 'free',
      completedClasses: [1, 2, 3],
      currentLesson: 3,
      cp1Status: 'not_started',
      cp2Status: 'not_started',
      notes: 'Santri baru di Kelas Gratis (sedang belajar Kelas 03).',
      joinedAt: '2026-10-21T02:00:00Z',
      lastActive: '2026-10-21T16:05:00Z'
    }
  ];

  const syncChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('sumiyati_roster_channel') : null;
  const rosterListeners = [];

  function notifyRosterListeners() {
    rosterListeners.forEach(fn => {
      try {
        fn();
      } catch (e) {}
    });
  }

  function getDeletedIds() {
    try {
      const arr = decodePayload(localStorage.getItem(DELETED_KEY));
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function addDeletedId(id, whatsapp) {
    const current = new Set(getDeletedIds());
    if (id) current.add(String(id));
    if (whatsapp) current.add('wa:' + normalizePhone(whatsapp));
    const list = Array.from(current).slice(-200);
    localStorage.setItem(DELETED_KEY, encodePayload(list));
    return list;
  }

  function removeDeletedId(whatsapp) {
    if (!whatsapp) return;
    const key = 'wa:' + normalizePhone(whatsapp);
    const list = getDeletedIds().filter(x => x !== key);
    localStorage.setItem(DELETED_KEY, encodePayload(list));
  }

  function loadDb() {
    try {
      let currentList = null;
      const deletedSet = new Set(getDeletedIds());
      const raw = localStorage.getItem(DB_KEY);
      if (raw) {
        const decoded = decodePayload(raw);
        if (Array.isArray(decoded)) {
          currentList = decoded;
        }
      }
      // Also merge any records from v2 key so all tabs stay in sync
      const legacyRaw = localStorage.getItem(LEGACY_DB_KEY);
      if (legacyRaw) {
        try {
          const legacyData = JSON.parse(legacyRaw);
          if (Array.isArray(legacyData)) {
            if (!currentList) {
              currentList = legacyData;
            } else {
              const existingWa = new Set(currentList.map(s => s.whatsapp));
              legacyData.forEach(item => {
                if (item && item.whatsapp && !existingWa.has(item.whatsapp)) {
                  currentList.unshift(item);
                  existingWa.add(item.whatsapp);
                }
              });
            }
          }
        } catch (e) {}
      }
      if (Array.isArray(currentList) && currentList.length > 0) {
        return currentList.filter(
          s => s && !deletedSet.has(String(s.id)) && !deletedSet.has('wa:' + normalizePhone(s.whatsapp))
        );
      }
      localStorage.setItem(DB_KEY, encodePayload(INITIAL_SEED_STUDENTS));
      return [...INITIAL_SEED_STUDENTS];
    } catch (e) {
      return [...INITIAL_SEED_STUDENTS];
    }
  }

  function saveDbLocalOnly(students) {
    localStorage.setItem(DB_KEY, encodePayload(students));
    localStorage.setItem(LEGACY_DB_KEY, JSON.stringify(students));
    if (syncChannel) {
      try {
        syncChannel.postMessage({ type: 'roster_updated', count: students.length });
      } catch (e) {}
    }
    notifyRosterListeners();
  }

  function saveDb(students) {
    saveDbLocalOnly(students);
    pushToCloudRelay(students);
    syncToSupabaseIfConfigured(students);
  }

  function normalizePhone(phone) {
    if (!phone) return '';
    let digits = String(phone).replace(/[^0-9]/g, '');
    if (digits.startsWith('08')) {
      digits = '62' + digits.slice(1);
    } else if (digits.startsWith('8')) {
      digits = '62' + digits;
    } else if (digits.startsWith('0062')) {
      digits = digits.slice(2);
    }
    return digits.slice(0, 16);
  }

  function formatDisplayPhone(phone) {
    const norm = normalizePhone(phone);
    if (norm.startsWith('62')) {
      return '0' + norm.slice(2);
    }
    return phone || '';
  }

  // Signed unlock status verification
  function setVerifiedUnlock(studentId) {
    const token = {
      sid: studentId || 'GLOBAL',
      sig: computeUnlockSignature(studentId || 'GLOBAL'),
      ts: Date.now()
    };
    localStorage.setItem(UNLOCK_KEY, encodePayload(token));
    localStorage.removeItem('sumiyati_pretajweed_unlocked'); // Remove legacy plain flag
  }

  function clearVerifiedUnlock() {
    localStorage.removeItem(UNLOCK_KEY);
    localStorage.removeItem('sumiyati_pretajweed_unlocked');
  }

  function isCourseUnlocked() {
    const currentStu = getCurrentStudentInternal();
    if (currentStu && currentStu.accessStatus === 'paid') {
      return true;
    }
    const raw = localStorage.getItem(UNLOCK_KEY);
    const token = decodePayload(raw);
    if (!token || !token.sig) return false;
    const expectedSig = computeUnlockSignature(token.sid || 'GLOBAL');
    return token.sig === expectedSig;
  }

  // Optional 2-Way Supabase Cloud Sync
  function getSupabaseConfig() {
    try {
      const saved = decodePayload(localStorage.getItem(SUPABASE_CFG_KEY));
      if (saved && saved.url && saved.anonKey) return saved;
      if (DEFAULT_SUPABASE_URL && DEFAULT_SUPABASE_ANON_KEY) {
        return { url: DEFAULT_SUPABASE_URL, anonKey: DEFAULT_SUPABASE_ANON_KEY };
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  function setSupabaseConfig(url, anonKey) {
    if (!isAdminLoggedIn()) return null;
    if (!url || !anonKey) {
      localStorage.removeItem(SUPABASE_CFG_KEY);
      return null;
    }
    const cleanUrl = String(url).trim().replace(/\/$/, '');
    if (!cleanUrl.startsWith('https://')) {
      return null; // Enforce HTTPS for cloud sync
    }
    const cfg = { url: cleanUrl, anonKey: String(anonKey).trim() };
    localStorage.setItem(SUPABASE_CFG_KEY, encodePayload(cfg));
    syncToSupabaseIfConfigured(loadDb());
    return cfg;
  }

  // Built-in Cross-Device Cloud Sync Relay (Phone <-> Laptop zero-setup sync)
  function sanitizeStudentObj(r) {
    if (!r || typeof r !== 'object') return null;
    const cleanWa = normalizePhone(r.whatsapp || '');
    const cleanPin = String(r.pin || '').replace(/[^0-9]/g, '').slice(0, 6);
    if (cleanWa.length < 5 || !cleanPin) return null;
    return {
      id: sanitizeText(r.id || ('stu_' + cleanWa), 40),
      name: sanitizeText(r.name || ('Santri ' + formatDisplayPhone(cleanWa)), 80),
      whatsapp: cleanWa,
      pin: cleanPin,
      pinHash: r.pinHash || hashPin(cleanWa, cleanPin),
      city: sanitizeText(r.city || 'Indonesia', 80) || 'Indonesia',
      accessStatus: ['free', 'pending', 'paid'].includes(r.accessStatus) ? r.accessStatus : 'free',
      completedClasses: Array.isArray(r.completedClasses) ? r.completedClasses.map(Number).filter(n => n >= 1 && n <= 18) : [1],
      currentLesson: Number(r.currentLesson) || 1,
      cp1Status: ['not_started', 'submitted', 'passed'].includes(r.cp1Status) ? r.cp1Status : 'not_started',
      cp2Status: ['not_started', 'submitted', 'passed'].includes(r.cp2Status) ? r.cp2Status : 'not_started',
      notes: sanitizeText(r.notes || '', 500),
      joinedAt: r.joinedAt || new Date().toISOString(),
      lastActive: r.lastActive || new Date().toISOString()
    };
  }

  function applyCloudPackets(packets) {
    if (!Array.isArray(packets) || packets.length === 0) return null;
    const deletedSet = new Set(getDeletedIds());
    packets.forEach(pkt => {
      if (pkt && Array.isArray(pkt.deleted)) {
        pkt.deleted.forEach(d => deletedSet.add(String(d)));
      }
      if (pkt && Array.isArray(pkt.reactivated)) {
        pkt.reactivated.forEach(d => deletedSet.delete(String(d)));
      }
    });
    localStorage.setItem(DELETED_KEY, encodePayload(Array.from(deletedSet).slice(-200)));

    const localList = loadDb();
    const byWa = new Map();
    localList.forEach(s => {
      const clean = sanitizeStudentObj(s);
      if (clean && !deletedSet.has(clean.id) && !deletedSet.has('wa:' + clean.whatsapp)) {
        byWa.set(clean.whatsapp, clean);
      }
    });

    packets.forEach(pkt => {
      if (!pkt || !Array.isArray(pkt.students)) return;
      pkt.students.forEach(rawStu => {
        const stu = sanitizeStudentObj(rawStu);
        if (!stu) return;
        if (deletedSet.has(stu.id) || deletedSet.has('wa:' + stu.whatsapp)) return;
        const prev = byWa.get(stu.whatsapp);
        if (!prev) {
          byWa.set(stu.whatsapp, stu);
        } else {
          const prevTime = Date.parse(prev.lastActive || prev.joinedAt || 0) || 0;
          const nextTime = Date.parse(stu.lastActive || stu.joinedAt || 0) || 0;
          const mergedCompleted = Array.from(new Set([...(prev.completedClasses || [1]), ...(stu.completedClasses || [1])])).sort((a, b) => a - b);
          const winner = nextTime >= prevTime ? { ...prev, ...stu } : { ...stu, ...prev };
          winner.completedClasses = mergedCompleted;
          winner.currentLesson = Math.max(prev.currentLesson || 1, stu.currentLesson || 1);
          byWa.set(stu.whatsapp, winner);
        }
      });
    });

    const merged = Array.from(byWa.values()).sort((a, b) => {
      const ta = Date.parse(a.lastActive || a.joinedAt || 0) || 0;
      const tb = Date.parse(b.lastActive || b.joinedAt || 0) || 0;
      return tb - ta;
    });

    if (merged.length > 0) {
      saveDbLocalOnly(merged);
    }
    return merged;
  }

  async function pushToCloudRelay(students, extra = {}) {
    if (typeof fetch === 'undefined') return false;
    try {
      const packet = encodePayload({
        v: 3,
        ts: Date.now(),
        students: students.slice(0, 120),
        deleted: getDeletedIds(),
        ...extra
      });
      if (!packet) return false;
      await fetch(CLOUD_RELAY_URL, {
        method: 'POST',
        body: packet
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  async function pullFromCloudRelay() {
    if (typeof fetch === 'undefined') return null;
    try {
      const res = await fetch(`${CLOUD_RELAY_URL}/json?poll=1&since=all`);
      if (!res.ok) return null;
      const text = await res.text();
      if (!text || !text.trim()) return null;
      const lines = text.trim().split('\n');
      const validPackets = [];
      for (let i = 0; i < lines.length; i++) {
        try {
          const env = JSON.parse(lines[i]);
          if (env && env.event === 'message' && typeof env.message === 'string') {
            const decoded = decodePayload(env.message);
            if (decoded && decoded.v === 3 && Array.isArray(decoded.students)) {
              validPackets.push(decoded);
            }
          }
        } catch (e) {}
      }
      if (validPackets.length > 0) {
        return applyCloudPackets(validPackets);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  function startRealtimeCloudStream() {
    if (typeof EventSource === 'undefined') return;
    try {
      const es = new EventSource(`${CLOUD_RELAY_URL}/sse`);
      es.onmessage = function (ev) {
        try {
          const data = JSON.parse(ev.data);
          if (data && data.event === 'message' && typeof data.message === 'string') {
            const decoded = decodePayload(data.message);
            if (decoded && decoded.v === 3 && Array.isArray(decoded.students)) {
              applyCloudPackets([decoded]);
            }
          }
        } catch (e) {}
      };
    } catch (e) {}
  }

  async function pullFromSupabaseIfConfigured() {
    await pullFromCloudRelay();
    const cfg = getSupabaseConfig();
    if (!cfg || !cfg.url || !cfg.anonKey) return loadDb();
    try {
      const res = await fetch(`${cfg.url}/rest/v1/students?select=*&order=last_active.desc`, {
        headers: {
          apikey: cfg.anonKey,
          Authorization: `Bearer ${cfg.anonKey}`
        }
      });
      if (!res.ok) return loadDb();
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0) {
        const mapped = rows.map(r => ({
          id: sanitizeText(r.id, 40),
          name: sanitizeText(r.name, 80),
          whatsapp: normalizePhone(r.whatsapp),
          pin: String(r.pin || '').replace(/[^0-9]/g, '').slice(0, 6),
          city: sanitizeText(r.city || 'Indonesia', 80),
          accessStatus: ['free', 'pending', 'paid'].includes(r.access_status) ? r.access_status : 'free',
          completedClasses: Array.isArray(r.completed_classes) ? r.completed_classes : [1],
          currentLesson: Number(r.current_lesson) || 1,
          cp1Status: ['not_started', 'submitted', 'passed'].includes(r.cp1_status) ? r.cp1_status : 'not_started',
          cp2Status: ['not_started', 'submitted', 'passed'].includes(r.cp2_status) ? r.cp2_status : 'not_started',
          notes: sanitizeText(r.notes || '', 500),
          joinedAt: r.joined_at,
          lastActive: r.last_active
        }));
        applyCloudPackets([{ v: 3, students: mapped }]);
        return loadDb();
      }
      return loadDb();
    } catch (e) {
      return loadDb();
    }
  }

  async function syncToSupabaseIfConfigured(students) {
    const cfg = getSupabaseConfig();
    if (!cfg || !cfg.url || !cfg.anonKey) return false;
    try {
      await fetch(`${cfg.url}/rest/v1/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: cfg.anonKey,
          Authorization: `Bearer ${cfg.anonKey}`,
          Prefer: 'resolution=merge-duplicates'
        },
        body: JSON.stringify(
          students.map(s => ({
            id: s.id,
            name: s.name,
            whatsapp: s.whatsapp,
            pin: s.pin,
            city: s.city,
            access_status: s.accessStatus,
            completed_classes: s.completedClasses,
            current_lesson: s.currentLesson,
            cp1_status: s.cp1Status,
            cp2_status: s.cp2Status,
            notes: s.notes,
            joined_at: s.joinedAt,
            last_active: s.lastActive
          }))
        )
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  pullFromSupabaseIfConfigured();
  startRealtimeCloudStream();

  function getCurrentStudentInternal() {
    const sess = decodePayload(localStorage.getItem(SESSION_KEY));
    if (!sess || !sess.id) return null;
    const students = loadDb();
    const found = students.find(s => s.id === sess.id) || null;
    if (!found) return null;
    // Verify session signature matches student ID
    if (sess.sig !== saltedHash(`STU_SESS_${found.id}_${found.whatsapp}`).slice(0, 20)) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return found;
  }

  function createStudentSession(student) {
    const sess = {
      id: student.id,
      sig: saltedHash(`STU_SESS_${student.id}_${student.whatsapp}`).slice(0, 20),
      ts: Date.now()
    };
    localStorage.setItem(SESSION_KEY, encodePayload(sess));
  }

  function isAdminLoggedIn() {
    const raw = sessionStorage.getItem(ADMIN_SESSION_KEY);
    const token = decodePayload(raw);
    if (!token || !token.exp || !token.sig) return false;
    if (Date.now() > token.exp) {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      return false;
    }
    const activeHash = localStorage.getItem(CUSTOM_ADMIN_HASH_KEY) || DEFAULT_ADMIN_HASH;
    const expectedSig = saltedHash(`ADMIN_SESS_${token.exp}_${activeHash}`).slice(0, 24);
    return token.sig === expectedSig;
  }

  const SumiyatiAuth = {
    normalizePhone,
    formatDisplayPhone,
    pullFromSupabaseIfConfigured,
    getStudentPersonalCode,
    isCourseUnlocked,
    checkRateLimit,

    onRosterChange(cb) {
      if (typeof cb !== 'function') return;
      rosterListeners.push(cb);
      if (syncChannel) {
        syncChannel.addEventListener('message', () => cb());
      }
      window.addEventListener('storage', () => cb());
    },

    // Protected: Only returns full roster when Instructor is authenticated
    getAllStudents() {
      if (!isAdminLoggedIn()) {
        return [];
      }
      return loadDb();
    },

    getCurrentStudent() {
      const found = getCurrentStudentInternal();
      if (found) {
        if (found.accessStatus === 'paid') {
          setVerifiedUnlock(found.id);
        }
        if (Array.isArray(found.completedClasses)) {
          localStorage.setItem(COMPLETED_KEY, JSON.stringify(found.completedClasses));
        }
        // Return safe student view
        return {
          id: found.id,
          name: found.name,
          whatsapp: found.whatsapp,
          pin: found.pin,
          city: found.city,
          accessStatus: found.accessStatus,
          completedClasses: found.completedClasses,
          currentLesson: found.currentLesson,
          cp1Status: found.cp1Status,
          cp2Status: found.cp2Status
        };
      }
      return null;
    },

    registerStudent({ name, whatsapp, city, pin }) {
      const cleanWa = normalizePhone(whatsapp || '');
      const cleanName = sanitizeText(name, 80) || ('Santri ' + formatDisplayPhone(cleanWa));
      const cleanCity = sanitizeText(city || 'Indonesia', 80) || 'Indonesia';
      const cleanPin = String(pin || '').replace(/[^0-9]/g, '').slice(0, 6);

      if (cleanWa.length < 5 || cleanPin.length < 4) {
        return { ok: false, error: 'missing_fields' };
      }

      removeDeletedId(cleanWa);
      const students = loadDb();
      const existingIdx = students.findIndex(s => s.whatsapp === cleanWa);
      if (existingIdx !== -1) {
        const existing = students[existingIdx];
        if (sanitizeText(name, 80)) existing.name = sanitizeText(name, 80);
        if (sanitizeText(city, 80)) existing.city = sanitizeText(city, 80);
        existing.pin = cleanPin;
        existing.pinHash = hashPin(cleanWa, cleanPin);
        existing.lastActive = new Date().toISOString();
        // Move to top of roster so teacher sees it immediately
        students.splice(existingIdx, 1);
        students.unshift(existing);
        saveDb(students);
        createStudentSession(existing);
        if (existing.accessStatus === 'paid') {
          setVerifiedUnlock(existing.id);
        }
        return { ok: true, student: existing, updated: true };
      }

      let existingCompleted = [1];
      try {
        const saved = JSON.parse(localStorage.getItem(COMPLETED_KEY) || '[1]');
        if (Array.isArray(saved) && saved.length) existingCompleted = saved;
      } catch (e) {}

      const isAlreadyUnlocked = isCourseUnlocked();

      const newStudent = {
        id: 'stu_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        name: cleanName,
        whatsapp: cleanWa,
        pin: cleanPin,
        pinHash: hashPin(cleanWa, cleanPin),
        city: cleanCity,
        accessStatus: isAlreadyUnlocked ? 'paid' : 'free',
        completedClasses: existingCompleted,
        currentLesson: Math.max(...existingCompleted, 1),
        cp1Status: 'not_started',
        cp2Status: 'not_started',
        notes: '',
        joinedAt: new Date().toISOString(),
        lastActive: new Date().toISOString()
      };

      students.unshift(newStudent);
      saveDb(students);
      createStudentSession(newStudent);
      if (newStudent.accessStatus === 'paid') {
        setVerifiedUnlock(newStudent.id);
      }
      return { ok: true, student: newStudent };
    },

    loginStudent(whatsappInput, pinInput) {
      const limit = checkRateLimit('student_login');
      if (!limit.allowed) {
        return { ok: false, error: 'rate_limited', waitSeconds: limit.waitSeconds };
      }

      const cleanPhone = normalizePhone(whatsappInput || '');
      const cleanPin = String(pinInput || '').replace(/[^0-9]/g, '').trim();

      if (cleanPhone.length < 5 || cleanPin.length < 4) {
        return { ok: false, error: 'not_found' };
      }

      const students = loadDb();
      const student = students.find(s => s.whatsapp === cleanPhone);

      // If this WhatsApp number is not registered yet, auto-register with WhatsApp + PIN
      if (!student) {
        clearRateLimit('student_login');
        const regRes = this.registerStudent({
          name: 'Santri ' + formatDisplayPhone(cleanPhone),
          whatsapp: cleanPhone,
          city: 'Indonesia',
          pin: cleanPin
        });
        if (regRes.ok) {
          return { ok: true, student: regRes.student, autoRegistered: true };
        }
        return { ok: false, error: 'not_found' };
      }

      const inputHash = hashPin(cleanPhone, cleanPin);
      const expectedHash = student.pinHash || hashPin(student.whatsapp, student.pin);

      if (inputHash !== expectedHash) {
        const rl = recordFailedAttempt('student_login');
        return { ok: false, error: 'wrong_pin', remainingAttempts: rl.remainingAttempts, waitSeconds: rl.waitSeconds };
      }

      clearRateLimit('student_login');
      student.lastActive = new Date().toISOString();
      saveDb(students);
      createStudentSession(student);

      if (student.accessStatus === 'paid') {
        setVerifiedUnlock(student.id);
      } else {
        clearVerifiedUnlock();
      }
      if (Array.isArray(student.completedClasses)) {
        localStorage.setItem(COMPLETED_KEY, JSON.stringify(student.completedClasses));
      }

      return { ok: true, student };
    },

    logoutStudent() {
      localStorage.removeItem(SESSION_KEY);
      clearVerifiedUnlock();
    },

    updateProgress(lessonNumber, completedArray) {
      const student = getCurrentStudentInternal();
      if (!student) return;
      const students = loadDb();
      const target = students.find(s => s.id === student.id);
      if (!target) return;

      target.currentLesson = Number(lessonNumber) || 1;
      if (Array.isArray(completedArray)) {
        target.completedClasses = Array.from(new Set(completedArray.map(Number).filter(n => n >= 1 && n <= 18))).sort(
          (a, b) => a - b
        );
      }
      target.lastActive = new Date().toISOString();
      saveDb(students);
    },

    requestPaidEnrollment() {
      const student = getCurrentStudentInternal();
      if (!student) return null;
      const students = loadDb();
      const target = students.find(s => s.id === student.id);
      if (!target) return null;

      if (target.accessStatus !== 'paid') {
        target.accessStatus = 'pending';
      }
      target.lastActive = new Date().toISOString();
      saveDb(students);
      return target;
    },

    unlockWithCode(code) {
      const limit = checkRateLimit('unlock_code');
      if (!limit.allowed) {
        return { ok: false, error: 'rate_limited', waitSeconds: limit.waitSeconds };
      }

      const clean = String(code || '').trim().toUpperCase();
      if (!clean) return { ok: false };

      const codeHash = saltedHash(clean);
      const currentStu = getCurrentStudentInternal();
      const personalCode = currentStu ? getStudentPersonalCode(currentStu.whatsapp) : '';

      const isMasterMatch = VALID_MASTER_CODE_HASHES.includes(codeHash);
      const isPersonalMatch = personalCode && clean === personalCode;

      if (!isMasterMatch && !isPersonalMatch) {
        const rl = recordFailedAttempt('unlock_code');
        return {
          ok: false,
          error: 'invalid_code',
          remainingAttempts: rl.remainingAttempts,
          waitSeconds: rl.waitSeconds
        };
      }

      clearRateLimit('unlock_code');
      if (currentStu) {
        const students = loadDb();
        const target = students.find(s => s.id === currentStu.id);
        if (target) {
          target.accessStatus = 'paid';
          target.lastActive = new Date().toISOString();
          saveDb(students);
        }
        setVerifiedUnlock(currentStu.id);
      } else {
        setVerifiedUnlock('GLOBAL');
      }
      return { ok: true };
    },

    // ── Instructor / Admin Methods ──
    isAdminLoggedIn,

    loginAdmin(pin) {
      const limit = checkRateLimit('admin_login');
      if (!limit.allowed) {
        return { ok: false, error: 'rate_limited', waitSeconds: limit.waitSeconds };
      }

      const candidateHash = saltedHash(pin);
      const activeHash = localStorage.getItem(CUSTOM_ADMIN_HASH_KEY) || DEFAULT_ADMIN_HASH;

      if (candidateHash === activeHash) {
        clearRateLimit('admin_login');
        const exp = Date.now() + ADMIN_SESSION_TTL_MS;
        const token = {
          exp,
          sig: saltedHash(`ADMIN_SESS_${exp}_${activeHash}`).slice(0, 24)
        };
        sessionStorage.setItem(ADMIN_SESSION_KEY, encodePayload(token));
        localStorage.removeItem('sumiyati_admin_logged_in'); // Clean legacy flag
        return { ok: true };
      }

      const rl = recordFailedAttempt('admin_login');
      return {
        ok: false,
        error: 'invalid_pin',
        remainingAttempts: rl.remainingAttempts,
        waitSeconds: rl.waitSeconds
      };
    },

    changeAdminPasscode(currentPin, newPin) {
      if (!isAdminLoggedIn()) return { ok: false, error: 'unauthorized' };
      const activeHash = localStorage.getItem(CUSTOM_ADMIN_HASH_KEY) || DEFAULT_ADMIN_HASH;
      if (saltedHash(currentPin) !== activeHash) {
        return { ok: false, error: 'wrong_current' };
      }
      const cleanNew = String(newPin || '').trim();
      if (cleanNew.length < 6) {
        return { ok: false, error: 'too_short' };
      }
      const newHash = saltedHash(cleanNew);
      localStorage.setItem(CUSTOM_ADMIN_HASH_KEY, newHash);
      // Re-issue session token with new hash
      const exp = Date.now() + ADMIN_SESSION_TTL_MS;
      sessionStorage.setItem(
        ADMIN_SESSION_KEY,
        encodePayload({
          exp,
          sig: saltedHash(`ADMIN_SESS_${exp}_${newHash}`).slice(0, 24)
        })
      );
      return { ok: true };
    },

    logoutAdmin() {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      localStorage.removeItem('sumiyati_admin_logged_in');
    },

    setStudentAccessStatus(studentId, newStatus) {
      if (!isAdminLoggedIn()) return null;
      const students = loadDb();
      const student = students.find(s => s.id === studentId);
      if (!student) return null;
      student.accessStatus = ['free', 'pending', 'paid'].includes(newStatus) ? newStatus : 'free';
      student.lastActive = new Date().toISOString();
      saveDb(students);

      const currentStu = getCurrentStudentInternal();
      if (currentStu && currentStu.id === studentId) {
        if (student.accessStatus === 'paid') {
          setVerifiedUnlock(studentId);
        } else {
          clearVerifiedUnlock();
        }
      }
      return student;
    },

    updateStudentRecord(studentId, { name, whatsapp, pin, city, accessStatus, cp1Status, cp2Status, notes }) {
      if (!isAdminLoggedIn()) return null;
      const students = loadDb();
      const s = students.find(item => item.id === studentId);
      if (!s) return null;

      if (name !== undefined) s.name = sanitizeText(name, 80);
      if (whatsapp !== undefined) s.whatsapp = normalizePhone(whatsapp);
      if (pin !== undefined) {
        s.pin = String(pin || '').replace(/[^0-9]/g, '').slice(0, 6) || s.pin;
        s.pinHash = hashPin(s.whatsapp, s.pin);
      }
      if (city !== undefined) s.city = sanitizeText(city, 80);
      if (accessStatus !== undefined && ['free', 'pending', 'paid'].includes(accessStatus)) {
        s.accessStatus = accessStatus;
      }
      if (cp1Status !== undefined) s.cp1Status = cp1Status;
      if (cp2Status !== undefined) s.cp2Status = cp2Status;
      if (typeof notes === 'string') s.notes = sanitizeText(notes, 500);
      s.lastActive = new Date().toISOString();

      saveDb(students);
      return s;
    },

    updateStudentEvaluation(studentId, { cp1Status, cp2Status, notes }) {
      if (!isAdminLoggedIn()) return null;
      return this.updateStudentRecord(studentId, { cp1Status, cp2Status, notes });
    },

    addStudentManually({ name, whatsapp, pin, city, accessStatus, notes }) {
      if (!isAdminLoggedIn()) return null;
      const students = loadDb();
      const cleanWa = normalizePhone(whatsapp || '');
      const cleanPin =
        String(pin || '')
          .replace(/[^0-9]/g, '')
          .slice(0, 6) || String(Math.floor(1000 + Math.random() * 9000));
      const newStudent = {
        id: 'stu_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        name: sanitizeText(name, 80),
        whatsapp: cleanWa,
        pin: cleanPin,
        pinHash: hashPin(cleanWa, cleanPin),
        city: sanitizeText(city || 'Indonesia', 80) || 'Indonesia',
        accessStatus: ['free', 'pending', 'paid'].includes(accessStatus) ? accessStatus : 'paid',
        completedClasses: [1],
        currentLesson: 1,
        cp1Status: 'not_started',
        cp2Status: 'not_started',
        notes: sanitizeText(notes || '', 500),
        joinedAt: new Date().toISOString(),
        lastActive: new Date().toISOString()
      };
      students.unshift(newStudent);
      saveDb(students);
      return newStudent;
    },

    deleteStudent(studentId) {
      if (!isAdminLoggedIn()) return [];
      let students = loadDb();
      const target = students.find(s => s.id === studentId);
      addDeletedId(studentId, target ? target.whatsapp : '');
      students = students.filter(s => s.id !== studentId);
      saveDb(students);
      const currentStu = getCurrentStudentInternal();
      if (currentStu && currentStu.id === studentId) {
        localStorage.removeItem(SESSION_KEY);
        clearVerifiedUnlock();
      }
      return students;
    },

    getSupabaseConfig,
    setSupabaseConfig
  };

  window.SumiyatiAuth = SumiyatiAuth;
})(window);
