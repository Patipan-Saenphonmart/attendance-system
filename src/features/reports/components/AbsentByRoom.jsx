// File: src/features/reports/components/AbsentByRoom.jsx

function AbsentByRoom({ rooms, students, tempStatus }) {
  return (
    <>
      {rooms.map((room) => {
        const list = students.filter(
          (s) =>
            s.room === room &&
            (tempStatus[s.id] === "ลา" || tempStatus[s.id] === "ขาด")
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
      })}
    </>
  );
}

export default AbsentByRoom;
