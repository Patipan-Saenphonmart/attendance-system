// File: src/features/reports/components/TodaySummary.jsx

function TodaySummary({ summary, students, tempStatus }) {
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

  return (
    <div className="summary" style={{ marginTop: "1rem" }}>
      <h2>📊 สรุปยอดวันนี้</h2>
      <p>✅ มา: {summary["มา"]} คน</p>
      <p>🟡 ลา: {summary["ลา"]} คน</p>
      <p>❌ ขาด: {summary["ขาด"]} คน</p>
      <div className="room-summary">{renderRoomSummary()}</div>
    </div>
  );
}

export default TodaySummary;
