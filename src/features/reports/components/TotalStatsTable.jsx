// File: src/features/reports/components/TotalStatsTable.jsx

function TotalStatsTable({ students, totalStats, onViewDetails }) {
  return (
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
                  <button
                    className="detail-button"
                    onClick={() => onViewDetails(s)}
                  >
                    ดู
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default TotalStatsTable;
