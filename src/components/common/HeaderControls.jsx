// File: src/components/common/HeaderControls.jsx

function HeaderControls({ today, onDateChange, rooms, selectedRoom, onRoomChange }) {
  return (
    <>
      <h1>📋 ระบบเช็คชื่อ</h1>

      {/* เลือกวันที่ */}
      <div style={{ textAlign: "center", marginBottom: "1rem" }}>
        วันที่:{" "}
        <input
          type="date"
          value={today}
          onChange={(e) => onDateChange(e.target.value)}
          className="date-input"
        />
      </div>

      {/* เลือกห้องเรียน */}
      <div style={{ textAlign: "center", marginBottom: "1rem" }}>
        ห้อง:{" "}
        <select
          value={selectedRoom}
          onChange={(e) => onRoomChange(e.target.value)}
        >
          {rooms.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

export default HeaderControls;
