import { useEffect, useState, useRef } from "react";
import {
  getStudents,
  getAttendanceByDate,
  getAllAttendance,
  upsertAttendance,
  deleteAttendance,
} from "./lib/localDb";
import html2canvas from "html2canvas";
import "./index.css";

function App() {
  const [students, setStudents] = useState([]);
  const [summary, setSummary] = useState({ มา: 0, ลา: 0, ขาด: 0 });
  const [totalStats, setTotalStats] = useState({});
  const [loading, setLoading] = useState(true);

  const [today, setToday] = useState(new Date().toISOString().split("T")[0]);
  const [tempStatus, setTempStatus] = useState({});
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({ name: "", details: [] });

  const downloadRef = useRef(null); // ส่วนดาวน์โหลด (เฉพาะรายชื่อ+สรุปวันนี้)

  const loadStudents = async () => {
    const { data, error } = await getStudents();
    if (error) return console.error(error);

    setStudents(data || []);
    const roomList = [...new Set(data.map((s) => s.room))].sort();
    setRooms(roomList);
    if (!selectedRoom && roomList.length > 0) setSelectedRoom(roomList[0]);
    setLoading(false);
  };

  const loadAttendance = async (date) => {
    const { data, error } = await getAttendanceByDate(date);
    if (error) return console.error(error);

    const statusMap = {};
    const result = { มา: 0, ลา: 0, ขาด: 0 };
    data.forEach((row) => {
      // ข้าม tombstone record (ถูกลบแล้ว)
      if (row.status === "__deleted__") return;
      statusMap[row.student_id] = row.status;
      if (result[row.status] !== undefined) result[row.status]++;
    });
    setTempStatus(statusMap);
    setSummary(result);
  };

  const loadTotalStats = async () => {
    const { data, error } = await getAllAttendance();
    if (error) return console.error(error);

    const stats = {};
    data.forEach(({ student_id, status, date }) => {
      // ข้าม tombstone record (ถูกลบแล้ว)
      if (status === "__deleted__") return;
      if (!stats[student_id])
        stats[student_id] = { ลา: 0, ขาด: 0, details: [] };
      if (status === "ลา" || status === "ขาด") {
        stats[student_id][status]++;
        stats[student_id].details.push({ date, status });
      }
    });
    setTotalStats(stats);
  };

  useEffect(() => {
    loadStudents();
    loadAttendance(today);
    loadTotalStats();
  }, []);

  useEffect(() => {
    loadAttendance(today);
  }, [today]);

  const selectStatus = (studentId, status) => {
    setTempStatus((prev) => ({ ...prev, [studentId]: status }));

    const newSummary = { มา: 0, ลา: 0, ขาด: 0 };
    Object.entries({ ...tempStatus, [studentId]: status }).forEach(([_, s]) => {
      if (newSummary[s] !== undefined) newSummary[s]++;
    });
    setSummary(newSummary);
  };

  const confirmAttendance = async () => {
    try {
      const filteredStudents = students.filter((s) => s.room === selectedRoom);
      const upserts = filteredStudents
        .filter((s) => tempStatus[s.id])
        .map((s) => ({
          student_id: s.id,
          date: today,
          status: tempStatus[s.id]
        }));

      const { error } = await upsertAttendance(upserts);
      if (error) throw error;

      await loadAttendance(today);
      await loadTotalStats();
      alert("บันทึกข้อมูลสำเร็จ ✅");
    } catch (err) {
      console.error("Error saving attendance:", err);
    }
  };

  const handleClearAttendance = async (studentId) => {
    try {
      const { error } = await deleteAttendance(studentId, today);
      if (error) throw error;

      setTempStatus((prev) => {
        const newStatus = { ...prev };
        delete newStatus[studentId];
        return newStatus;
      });

      await loadAttendance(today);
      await loadTotalStats();
    } catch (err) {
      console.error("Error deleting attendance:", err);
    }
  };

  const handleViewDetails = (student) => {
    const details = totalStats[student.id]?.details || [];
    setModalData({ name: student.name, details });
    setShowModal(true);
  };

  const renderRoomSummary = () => {
    const roomSummary = {};
    students.forEach((s) => {
      if (!roomSummary[s.room]) roomSummary[s.room] = { ลา: 0, ขาด: 0 };
      const status = tempStatus[s.id];
      if (status === "ลา") roomSummary[s.room].ลา++;
      if (status === "ขาด") roomSummary[s.room].ขาด++;
    });
    return Object.entries(roomSummary).map(([room, counts]) => (
      <p key={room}>
        🏫 ห้อง {room} → ลา {counts.ลา} | ขาด {counts.ขาด}
      </p>
    ));
  };

  const filteredStudents = students.filter((s) => s.room === selectedRoom);

  const renderAbsentByRoom = () => {
    return rooms.map((room) => {
      const list = students.filter(
        (s) => s.room === room && (tempStatus[s.id] === "ลา" || tempStatus[s.id] === "ขาด")
      );
      if (list.length === 0) return null;
      return (
        <div key={room} style={{ marginBottom: "1.5rem" }}>
          <h3>รายชื่อนักเรียนลา/ขาดวันนี้ (ห้อง {room})</h3>
          <table className="stats-table">
            <thead>
              <tr>
                <th>เลขที่</th>
                <th>ชื่อเล่น</th>
                <th>ชื่อจริง</th>
                <th>ห้อง</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id}>
                  <td>{s.student_code}</td>
                  <td>{s.nickname}</td>
                  <td>{s.name}</td>
                  <td>{s.room}</td>
                  <td>{tempStatus[s.id]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    });
  };

  // ดาวน์โหลดเฉพาะรายชื่อ+สรุปวันนี้
  const handleDownload = async () => {
    const element = downloadRef.current;
    if (!element) return;

    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true
    });

    const a4Width = 794;
    const a4Height = 1123;
    const resizedCanvas = document.createElement("canvas");
    resizedCanvas.width = a4Width;
    resizedCanvas.height = a4Height;
    const ctx = resizedCanvas.getContext("2d");
    const ratio = Math.min(a4Width / canvas.width, a4Height / canvas.height);
    const x = (a4Width - canvas.width * ratio) / 2;
    const y = (a4Height - canvas.height * ratio) / 2;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, a4Width, a4Height);
    ctx.drawImage(canvas, x, y, canvas.width * ratio, canvas.height * ratio);

    const link = document.createElement("a");
    link.download = `รายงานเช็คชื่อ_${today}.png`;
    link.href = resizedCanvas.toDataURL("image/png");
    link.click();
  };

  if (loading)
    return <p style={{ textAlign: "center", marginTop: "2rem" }}>กำลังโหลดข้อมูล...</p>;

  return (
    <div className="app-container">
      <h1>📋 ระบบเช็คชื่อ</h1>

      {/* เลือกวันที่และห้อง */}
      <div style={{ textAlign: "center", marginBottom: "1rem" }}>
        วันที่:{" "}
        <input
          type="date"
          value={today}
          onChange={(e) => setToday(e.target.value)}
          className="date-input"
        />
      </div>

      <div style={{ textAlign: "center", marginBottom: "1rem" }}>
        ห้อง:{" "}
        <select
          value={selectedRoom}
          onChange={(e) => setSelectedRoom(e.target.value)}
        >
          {rooms.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* เลือกสถานะ */}
      {filteredStudents.map((s) => {
        const status = tempStatus[s.id];
        const hasData = status !== undefined;
        return (
          <div key={s.id} className="student-row">
            <div className="student-info">
              <p>{s.name} ({s.nickname}) ห้อง {s.room}</p>
            </div>
            <div className="button-group">
              <button
                onClick={() => selectStatus(s.id, "มา")}
                className={`present ${status === "มา" ? "active" : "inactive"}`}
              >มา</button>
              <button
                onClick={() => selectStatus(s.id, "ลา")}
                className={`leave ${status === "ลา" ? "active" : "inactive"}`}
              >ลา</button>
              <button
                onClick={() => selectStatus(s.id, "ขาด")}
                className={`absent ${status === "ขาด" ? "active" : "inactive"}`}
              >ขาด</button>
              {hasData && <button onClick={() => handleClearAttendance(s.id)} className="clear-button">คืนค่า</button>}
            </div>
          </div>
        );
      })}

      <div style={{ textAlign: "center", marginTop: "1rem" }}>
        <button onClick={confirmAttendance} className="confirm-button">ยืนยัน</button>
      </div>

      {/* ส่วนดาวน์โหลดเฉพาะรายชื่อ+สรุปวันนี้ */}
      <div ref={downloadRef}>
        <div className="summary" style={{ marginTop: "2rem" }}>
          <h2>📋 รายชื่อนักเรียนลา/ขาดวันนี้</h2>
          {renderAbsentByRoom()}
        </div>

        <div className="summary" style={{ marginTop: "1rem" }}>
          <h2>📊 สรุปยอดวันนี้</h2>
          <p>✅ มา: {summary["มา"]} คน</p>
          <p>🟡 ลา: {summary["ลา"]} คน</p>
          <p>❌ ขาด: {summary["ขาด"]} คน</p>
          <div className="room-summary">{renderRoomSummary()}</div>
        </div>
      </div>

      {/* สถิติรวมทุกวัน ยังคงใช้งานปกติในหน้าเว็บ */}
      <div className="summary" style={{ marginTop: "1rem" }}>
        <h2>📊 สถิติรวมทุกวัน (ลา/ขาด ≥1)</h2>
        <table className="stats-table">
          <thead>
            <tr>
              <th>ชื่อจริง</th>
              <th>ชื่อเล่น</th>
              <th>ห้อง</th>
              <th>ลา</th>
              <th>ขาด</th>
              <th>ดูรายละเอียด</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => {
              const stats = totalStats[s.id] || { ลา: 0, ขาด: 0 };
              if (stats["ลา"] === 0 && stats["ขาด"] === 0) return null;
              return (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.nickname}</td>
                  <td>{s.room}</td>
                  <td>{stats["ลา"]}</td>
                  <td>{stats["ขาด"]}</td>
                  <td>
                    <button className="detail-button" onClick={() => handleViewDetails(s)}>ดู</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ textAlign: "center", marginTop: "1rem" }}>
        <button onClick={handleDownload} className="confirm-button">📥 ดาวน์โหลดรายงานเฉพาะส่วน (A4)</button>
      </div>

      {/* Modal ดูรายละเอียด */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>รายละเอียดการลา/ขาดของ {modalData.name}</h3>
            {modalData.details.length === 0 ? (
              <p>ไม่มีข้อมูล</p>
            ) : (
              <ul>
                {modalData.details.map((d, idx) => (
                  <li key={idx}>{d.date}: {d.status}</li>
                ))}
              </ul>
            )}
            <button onClick={() => setShowModal(false)} className="close-button">ปิด</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
