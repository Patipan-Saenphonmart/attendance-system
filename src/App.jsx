// File: src/App.jsx
import { useEffect, useState } from "react";
import {
  getStudents,
  getAttendanceByDate,
  getAllAttendance,
  upsertAttendance,
  deleteAttendance,
} from "./lib/localDb";
import HeaderControls from "./components/common/HeaderControls";
import StudentAttendanceList from "./features/attendance/components/StudentAttendanceList";
import DownloadReportSection from "./features/reports/components/DownloadReportSection";
import TotalStatsTable from "./features/reports/components/TotalStatsTable";
import Modal from "./components/ui/Modal";
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
          status: tempStatus[s.id],
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

  const filteredStudents = students.filter((s) => s.room === selectedRoom);

  if (loading)
    return (
      <p style={{ textAlign: "center", marginTop: "2rem" }}>
        กำลังโหลดข้อมูล...
      </p>
    );

  return (
    <div className="app-container">
      {/* 1. ส่วนเลือกวันที่และห้องเรียน */}
      <HeaderControls
        today={today}
        onDateChange={setToday}
        rooms={rooms}
        selectedRoom={selectedRoom}
        onRoomChange={setSelectedRoom}
      />

      {/* 2. รายชื่อนักเรียนพร้อมปุ่มเลือกสถานะ (มา/ลา/ขาด) */}
      <StudentAttendanceList
        students={filteredStudents}
        tempStatus={tempStatus}
        onSelectStatus={selectStatus}
        onClearAttendance={handleClearAttendance}
        onConfirmAttendance={confirmAttendance}
      />

      {/* 3. รายงานสรุปประจำวัน & ปุ่มดาวน์โหลดภาพ A4 */}
      <DownloadReportSection
        rooms={rooms}
        students={students}
        tempStatus={tempStatus}
        summary={summary}
        today={today}
      />

      {/* 4. ตารางสถิติรวมทุกวัน */}
      <TotalStatsTable
        students={students}
        totalStats={totalStats}
        onViewDetails={handleViewDetails}
      />

      {/* 5. Modal ป๊อปอัพแสดงรายละเอียด */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        name={modalData.name}
        details={modalData.details}
      />
    </div>
  );
}

export default App;