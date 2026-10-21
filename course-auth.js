/**
 * Sumiyati Pre-Tajweed Course — WhatsApp + 4-Digit PIN Student Auth & Roster Engine
 * Supports instant local persistence (zero-setup) + 2-Way Supabase Cloud Sync for GitHub Pages.
 */
(function (window) {
  const DB_KEY = 'sumiyati_students_db_v2';
  const SESSION_KEY = 'sumiyati_current_student_id';
  const ADMIN_SESSION_KEY = 'sumiyati_admin_logged_in';
  const SUPABASE_CFG_KEY = 'sumiyati_supabase_config';
  const UNLOCK_KEY = 'sumiyati_pretajweed_unlocked';
  const COMPLETED_KEY = 'sumiyati_completed_pretajweed_classes';

  // Optional: Hardcode your free Supabase URL & Anon Key here so it works across all devices automatically on GitHub Pages!
  const DEFAULT_SUPABASE_URL = '';
  const DEFAULT_SUPABASE_ANON_KEY = '';

  const VALID_CODES = ['TAHSIN2026', 'SUMIYATI', 'BISMILLAH', 'FREEACCESS', 'QURANSMART'];

  const INITIAL_SEED_STUDENTS = [
    {
      id: 'stu_101',
      name: 'Siti Rahmawati',
      whatsapp: '6281298765432',
      pin: '1234',
      city: 'Bandung, Indonesia',
      accessStatus: 'paid', // 'free' | 'pending' | 'paid'
      completedClasses: [1, 2, 3, 4, 5, 6, 7, 8],
      currentLesson: 8,
      cp1Status: 'passed', // 'not_started' | 'submitted' | 'passed'
      cp2Status: 'submitted',
      notes: 'Makhraj huruf Haa (ح) sudah sangat baik. Sedang menunggu evaluasi voice note Checkpoint 2.',
      joinedAt: '2026-09-18T08:30:00Z',
      lastActive: '2026-10-21T14:20:00Z'
    },
    {
      id: 'stu_102',
      name: 'Ahmad Fauzi',
      whatsapp: '6281345678901',
      pin: '2580',
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
      pin: '4455',
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
      pin: '7788',
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

  function loadDb() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (!raw) {
        localStorage.setItem(DB_KEY, JSON.stringify(INITIAL_SEED_STUDENTS));
        return [...INITIAL_SEED_STUDENTS];
      }
      return JSON.parse(raw);
    } catch (e) {
      return [...INITIAL_SEED_STUDENTS];
    }
  }

  function saveDb(students) {
    localStorage.setItem(DB_KEY, JSON.stringify(students));
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
    return digits;
  }

  function formatDisplayPhone(phone) {
    const norm = normalizePhone(phone);
    if (norm.startsWith('62')) {
      return '0' + norm.slice(2);
    }
    return phone || '';
  }

  // Optional 2-Way Supabase Cloud Sync
  function getSupabaseConfig() {
    try {
      const saved = JSON.parse(localStorage.getItem(SUPABASE_CFG_KEY) || 'null');
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
    if (!url || !anonKey) {
      localStorage.removeItem(SUPABASE_CFG_KEY);
      return null;
    }
    const cfg = { url: url.trim().replace(/\/$/, ''), anonKey: anonKey.trim() };
    localStorage.setItem(SUPABASE_CFG_KEY, JSON.stringify(cfg));
    syncToSupabaseIfConfigured(loadDb());
    return cfg;
  }

  async function pullFromSupabaseIfConfigured() {
    const cfg = getSupabaseConfig();
    if (!cfg || !cfg.url || !cfg.anonKey) return null;
    try {
      const res = await fetch(`${cfg.url}/rest/v1/students?select=*&order=last_active.desc`, {
        headers: {
          'apikey': cfg.anonKey,
          'Authorization': `Bearer ${cfg.anonKey}`
        }
      });
      if (!res.ok) return null;
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0) {
        const mapped = rows.map(r => ({
          id: r.id,
          name: r.name,
          whatsapp: r.whatsapp,
          pin: r.pin || '1234',
          city: r.city || 'Indonesia',
          accessStatus: r.access_status || 'free',
          completedClasses: Array.isArray(r.completed_classes) ? r.completed_classes : [1],
          currentLesson: r.current_lesson || 1,
          cp1Status: r.cp1_status || 'not_started',
          cp2Status: r.cp2_status || 'not_started',
          notes: r.notes || '',
          joinedAt: r.joined_at,
          lastActive: r.last_active
        }));
        localStorage.setItem(DB_KEY, JSON.stringify(mapped));
        return mapped;
      }
      return null;
    } catch (e) {
      return null;
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
          'apikey': cfg.anonKey,
          'Authorization': `Bearer ${cfg.anonKey}`,
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(students.map(s => ({
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
        })))
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  // Trigger background pull when script loads if Supabase is configured
  pullFromSupabaseIfConfigured();

  const SumiyatiAuth = {
    normalizePhone,
    formatDisplayPhone,
    pullFromSupabaseIfConfigured,

    getAllStudents() {
      return loadDb();
    },

    getCurrentStudent() {
      const id = localStorage.getItem(SESSION_KEY);
      if (!id) return null;
      const students = loadDb();
      const found = students.find(s => s.id === id) || null;
      if (found) {
        if (found.accessStatus === 'paid') {
          localStorage.setItem(UNLOCK_KEY, 'true');
        }
        if (Array.isArray(found.completedClasses)) {
          localStorage.setItem(COMPLETED_KEY, JSON.stringify(found.completedClasses));
        }
      }
      return found;
    },

    registerStudent({ name, whatsapp, city, pin }) {
      const cleanName = (name || '').trim();
      const cleanWa = normalizePhone(whatsapp || '');
      const cleanCity = (city || '').trim() || 'Indonesia';
      const cleanPin = String(pin || '').replace(/[^0-9]/g, '').slice(0, 6);

      if (!cleanName || !cleanWa || cleanPin.length < 4) {
        return { ok: false, error: 'missing_fields' };
      }

      const students = loadDb();
      const existing = students.find(s => s.whatsapp === cleanWa);
      if (existing) {
        return { ok: false, error: 'already_exists', student: existing };
      }

      let existingCompleted = [1];
      try {
        const saved = JSON.parse(localStorage.getItem(COMPLETED_KEY) || '[1]');
        if (Array.isArray(saved) && saved.length) existingCompleted = saved;
      } catch (e) {}

      const isAlreadyUnlocked = localStorage.getItem(UNLOCK_KEY) === 'true';

      const newStudent = {
        id: 'stu_' + Date.now(),
        name: cleanName,
        whatsapp: cleanWa,
        pin: cleanPin,
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
      localStorage.setItem(SESSION_KEY, newStudent.id);
      return { ok: true, student: newStudent };
    },

    loginStudent(whatsappInput, pinInput) {
      const cleanPhone = normalizePhone(whatsappInput || '');
      const cleanPin = String(pinInput || '').trim();

      if (!cleanPhone) {
        return { ok: false, error: 'not_found' };
      }

      const students = loadDb();
      const student = students.find(s => s.whatsapp === cleanPhone);

      if (!student) {
        return { ok: false, error: 'not_found' };
      }
      if (student.pin && student.pin !== cleanPin) {
        return { ok: false, error: 'wrong_pin' };
      }

      student.lastActive = new Date().toISOString();
      saveDb(students);
      localStorage.setItem(SESSION_KEY, student.id);

      if (student.accessStatus === 'paid') {
        localStorage.setItem(UNLOCK_KEY, 'true');
      } else {
        localStorage.removeItem(UNLOCK_KEY);
      }
      if (Array.isArray(student.completedClasses)) {
        localStorage.setItem(COMPLETED_KEY, JSON.stringify(student.completedClasses));
      }

      return { ok: true, student };
    },

    logoutStudent() {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(UNLOCK_KEY);
    },

    updateProgress(lessonNumber, completedArray) {
      const id = localStorage.getItem(SESSION_KEY);
      if (!id) return;
      const students = loadDb();
      const student = students.find(s => s.id === id);
      if (!student) return;

      student.currentLesson = lessonNumber;
      if (Array.isArray(completedArray)) {
        student.completedClasses = Array.from(new Set(completedArray)).sort((a, b) => a - b);
      }
      student.lastActive = new Date().toISOString();
      saveDb(students);
    },

    requestPaidEnrollment() {
      const id = localStorage.getItem(SESSION_KEY);
      if (!id) return null;
      const students = loadDb();
      const student = students.find(s => s.id === id);
      if (!student) return null;

      if (student.accessStatus !== 'paid') {
        student.accessStatus = 'pending';
      }
      student.lastActive = new Date().toISOString();
      saveDb(students);
      return student;
    },

    unlockWithCode(code) {
      const clean = (code || '').trim().toUpperCase();
      if (!VALID_CODES.includes(clean)) {
        return { ok: false };
      }
      localStorage.setItem(UNLOCK_KEY, 'true');
      const id = localStorage.getItem(SESSION_KEY);
      if (id) {
        const students = loadDb();
        const student = students.find(s => s.id === id);
        if (student) {
          student.accessStatus = 'paid';
          student.lastActive = new Date().toISOString();
          saveDb(students);
        }
      }
      return { ok: true };
    },

    // ── Instructor / Admin Methods ──
    isAdminLoggedIn() {
      return sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true' || localStorage.getItem(ADMIN_SESSION_KEY) === 'true';
    },

    loginAdmin(pin) {
      const clean = (pin || '').trim().toUpperCase();
      const validPins = ['SUMIYATI2026', 'ADMIN123', 'USTADZAH', 'TAHSIN2026'];
      if (validPins.includes(clean)) {
        sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
        localStorage.setItem(ADMIN_SESSION_KEY, 'true');
        return true;
      }
      return false;
    },

    logoutAdmin() {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      localStorage.removeItem(ADMIN_SESSION_KEY);
    },

    setStudentAccessStatus(studentId, newStatus) {
      const students = loadDb();
      const student = students.find(s => s.id === studentId);
      if (!student) return null;
      student.accessStatus = newStatus;
      student.lastActive = new Date().toISOString();
      saveDb(students);

      if (localStorage.getItem(SESSION_KEY) === studentId) {
        if (newStatus === 'paid') {
          localStorage.setItem(UNLOCK_KEY, 'true');
        } else {
          localStorage.removeItem(UNLOCK_KEY);
        }
      }
      return student;
    },

    updateStudentEvaluation(studentId, { cp1Status, cp2Status, notes }) {
      const students = loadDb();
      const student = students.find(s => s.id === studentId);
      if (!student) return null;
      if (cp1Status) student.cp1Status = cp1Status;
      if (cp2Status) student.cp2Status = cp2Status;
      if (typeof notes === 'string') student.notes = notes;
      saveDb(students);
      return student;
    },

    addStudentManually({ name, whatsapp, pin, city, accessStatus, notes }) {
      const students = loadDb();
      const cleanPin = String(pin || '').replace(/[^0-9]/g, '').slice(0, 6) || String(Math.floor(1000 + Math.random() * 9000));
      const newStudent = {
        id: 'stu_' + Date.now(),
        name: (name || '').trim(),
        whatsapp: normalizePhone(whatsapp || ''),
        pin: cleanPin,
        city: (city || '').trim() || 'Indonesia',
        accessStatus: accessStatus || 'paid',
        completedClasses: [1],
        currentLesson: 1,
        cp1Status: 'not_started',
        cp2Status: 'not_started',
        notes: (notes || '').trim(),
        joinedAt: new Date().toISOString(),
        lastActive: new Date().toISOString()
      };
      students.unshift(newStudent);
      saveDb(students);
      return newStudent;
    },

    deleteStudent(studentId) {
      let students = loadDb();
      students = students.filter(s => s.id !== studentId);
      saveDb(students);
      if (localStorage.getItem(SESSION_KEY) === studentId) {
        localStorage.removeItem(SESSION_KEY);
      }
      return students;
    },

    getSupabaseConfig,
    setSupabaseConfig
  };

  window.SumiyatiAuth = SumiyatiAuth;
})(window);
