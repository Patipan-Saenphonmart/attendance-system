// File: src/features/attendance/components/StudentAttendanceList.jsx

function StudentAttendanceList({
  students,
  tempStatus,
  onSelectStatus,
  onClearAttendance,
  onConfirmAttendance
}) {
  return (
    <div>
      {students.map((s) => {
        const status = tempStatus[s.id];
        const hasData = status !== undefined;
        return (
          <div key={s.id} className="student-row">
            <div className="student-info">
              <p>
                {s.name} ({s.nickname}) ห้อง {s.room}
              </p>
            </div>
            <div className="button-group">
              <button
                onClick={() => onSelectStatus(s.id, "มา")}
                className={`present ${status === "มา" ? "active" : "inactive"}`}
              >
                มา
              </button>
              <button
                onClick={() => onSelectStatus(s.id, "ลา")}
                className={`leave ${status === "ลา" ? "active" : "inactive"}`}
              >
                ลา
              </button>
              <button
                onClick={() => onSelectStatus(s.id, "ขาด")}
                className={`absent ${status === "ขาด" ? "active" : "inactive"}`}
              >
                ขาด
              </button>
              {hasData && (
                <button
                  onClick={() => onClearAttendance(s.id)}
                  className="clear-button"
                >
                  คืนค่า
                </button>
              )}
            </div>
          </div>
        );
      })}

      <div style={{ textAlign: "center", marginTop: "1rem" }}>
        <button onClick={onConfirmAttendance} className="confirm-button">
          ยืนยัน
        </button>
      </div>
    </div>
  );
}

export default StudentAttendanceList;
