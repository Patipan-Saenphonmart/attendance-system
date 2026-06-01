// File: src/lib/localDb.js
// แทนที่ Supabase ด้วยการดึงข้อมูลจาก CSV และบันทึกใน localStorage

const BASE_URL = import.meta.env.BASE_URL; // '/' in dev, '/attendance-system/' in production
const STUDENTS_CSV_PATH = `${BASE_URL}data/students.csv`;
const ATTENDANCE_CSV_PATH = `${BASE_URL}data/attendance.csv`;
const ATTENDANCE_STORAGE_KEY = "attendance_local";

// -------- CSV Parser --------
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    // รองรับ field ที่มี comma ในเครื่องหมาย quote
    const values = [];
    let cur = "";
    let inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === "," && !inQuote) { values.push(cur); cur = ""; }
      else { cur += ch; }
    }
    values.push(cur);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (values[i] ?? "").trim(); });
    return obj;
  });
}

// -------- โหลด CSV จาก public/data/ --------
async function fetchStudentsCSV() {
  const res = await fetch(STUDENTS_CSV_PATH);
  if (!res.ok) throw new Error("โหลด students.csv ไม่สำเร็จ");
  const text = await res.text();
  return parseCSV(text).map((row) => ({
    id: parseInt(row.id),
    student_code: row.student_code,
    name: row.name,
    nickname: row.nickname,
    room: row.room,
  }));
}

async function fetchAttendanceCSV() {
  const res = await fetch(ATTENDANCE_CSV_PATH);
  if (!res.ok) throw new Error("โหลด attendance.csv ไม่สำเร็จ");
  const text = await res.text();
  return parseCSV(text).map((row) => ({
    id: parseInt(row.id),
    student_id: parseInt(row.student_id),
    date: row.date,
    status: row.status,
    created_at: row.created_at,
  }));
}

// -------- In-Memory Store (โหลดครั้งเดียว) --------
let _studentsCache = null;
let _attendanceCache = null; // เก็บเป็น Map<"studentId_date", record> (ล่าสุดเท่านั้น)

// รวม CSV + localStorage เข้าด้วยกัน แล้ว deduplicate เก็บแค่ล่าสุดต่อ student+date
function buildAttendanceMap(csvRows) {
  const localRaw = JSON.parse(localStorage.getItem(ATTENDANCE_STORAGE_KEY) || "[]");
  const allRows = [...csvRows, ...localRaw];

  const map = {}; // key: `${student_id}_${date}`
  for (const row of allRows) {
    const key = `${row.student_id}_${row.date}`;
    if (!map[key] || row.created_at > map[key].created_at) {
      map[key] = row;
    }
  }
  return map;
}

async function ensureLoaded() {
  if (!_studentsCache) {
    _studentsCache = await fetchStudentsCSV();
  }
  if (!_attendanceCache) {
    const csvRows = await fetchAttendanceCSV();
    _attendanceCache = buildAttendanceMap(csvRows);
  }
}

// rebuild map หลังบันทึกข้อมูลใหม่
async function rebuildAttendance() {
  const csvRows = await fetchAttendanceCSV();
  _attendanceCache = buildAttendanceMap(csvRows);
}

// -------- Public API (เลียนแบบ Supabase) --------

/** ดึงรายชื่อนักเรียนทั้งหมด เรียงตาม student_code */
export async function getStudents() {
  await ensureLoaded();
  const sorted = [..._studentsCache].sort((a, b) =>
    parseInt(a.student_code) - parseInt(b.student_code)
  );
  return { data: sorted, error: null };
}

/** ดึงการเข้าเรียนตามวันที่ */
export async function getAttendanceByDate(date) {
  await ensureLoaded();
  const rows = Object.values(_attendanceCache).filter((r) => r.date === date);
  return {
    data: rows.map((r) => ({ student_id: r.student_id, status: r.status })),
    error: null,
  };
}

/** ดึงการเข้าเรียนทั้งหมด (สำหรับสถิติรวม) */
export async function getAllAttendance() {
  await ensureLoaded();
  const rows = Object.values(_attendanceCache);
  return {
    data: rows.map((r) => ({
      student_id: r.student_id,
      status: r.status,
      date: r.date,
    })),
    error: null,
  };
}

/**
 * upsert attendance records
 * บันทึกลง local server CSV (ถ้าใช้งาน dev server) หรือ fallback ลง localStorage
 */
export async function upsertAttendance(records) {
  try {
    // 1. พยายามบันทึกลงไฟล์ CSV ใน data base check system ผ่าน Local API
    try {
      const res = await fetch('/api/save-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records })
      });
      if (res.ok) {
        // rebuild cache เพื่อโหลดข้อมูลใหม่ที่เซฟลง CSV แล้วกลับมาแสดงผลทันที
        await rebuildAttendance();
        return { error: null };
      }
    } catch (e) {
      console.warn("Dev API not available, falling back to localStorage", e);
    }

    // 2. Fallback ลง localStorage หากไม่มี API server (เช่น หน้าเว็บบน Production static)
    const now = new Date().toISOString();
    const localRaw = JSON.parse(localStorage.getItem(ATTENDANCE_STORAGE_KEY) || "[]");

    // เอา record เก่าออกถ้า student_id+date ซ้ำ แล้วใส่ใหม่
    const newIds = new Set(records.map((r) => `${r.student_id}_${r.date}`));
    const filtered = localRaw.filter(
      (r) => !newIds.has(`${r.student_id}_${r.date}`)
    );

    const withTimestamp = records.map((r, i) => ({
      id: Date.now() + i,
      student_id: r.student_id,
      date: r.date,
      status: r.status,
      created_at: now,
    }));

    localStorage.setItem(
      ATTENDANCE_STORAGE_KEY,
      JSON.stringify([...filtered, ...withTimestamp])
    );

    // rebuild cache เพื่อให้ข้อมูลใหม่มีผลทันที
    await rebuildAttendance();
    return { error: null };
  } catch (err) {
    return { error: err };
  }
}

/**
 * ลบ attendance ของ student_id ในวันที่กำหนด (คืนค่า)
 * ลบทั้งจาก CSV (ผ่าน API) หรือลบจาก localStorage
 */
export async function deleteAttendance(studentId, date) {
  try {
    // 1. พยายามลบจากไฟล์ CSV ผ่าน Local API
    try {
      const res = await fetch('/api/save-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: [{ student_id: studentId, date, status: '__deleted__' }]
        })
      });
      if (res.ok) {
        const key = `${studentId}_${date}`;
        if (_attendanceCache) {
          delete _attendanceCache[key];
        }
        await rebuildAttendance();
        return { error: null };
      }
    } catch (e) {
      console.warn("Dev API not available, falling back to localStorage", e);
    }

    // 2. Fallback ลบออกจาก localStorage และเขียน tombstone
    const localRaw = JSON.parse(localStorage.getItem(ATTENDANCE_STORAGE_KEY) || "[]");
    const key = `${studentId}_${date}`;

    // ลบออกจาก localStorage
    const filtered = localRaw.filter(
      (r) => !(r.student_id === studentId && r.date === date)
    );

    // เพิ่ม tombstone record เพื่อ override CSV ที่อาจมีข้อมูลเก่า
    const tombstone = {
      id: Date.now(),
      student_id: studentId,
      date,
      status: "__deleted__",
      created_at: new Date().toISOString(),
    };
    filtered.push(tombstone);
    localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(filtered));

    // ลบออกจาก cache โดยตรง
    if (_attendanceCache) {
      delete _attendanceCache[key];
    }

    await rebuildAttendance();
    return { error: null };
  } catch (err) {
    return { error: err };
  }
}
