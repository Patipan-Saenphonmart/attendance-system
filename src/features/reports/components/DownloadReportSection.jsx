// File: src/features/reports/components/DownloadReportSection.jsx
import { useRef } from "react";
import html2canvas from "html2canvas";
import AbsentByRoom from "./AbsentByRoom";
import TodaySummary from "./TodaySummary";

function DownloadReportSection({ rooms, students, tempStatus, summary, today }) {
  const downloadRef = useRef(null);

  const handleDownload = async () => {
    const element = downloadRef.current;
    if (!element) return;

    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
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

  return (
    <>
      <div ref={downloadRef}>
        <div className="summary" style={{ marginTop: "2rem" }}>
          <h2>📋 รายชื่อนักเรียนลา/ขาดวันนี้</h2>
          <AbsentByRoom
            rooms={rooms}
            students={students}
            tempStatus={tempStatus}
          />
        </div>

        <TodaySummary
          summary={summary}
          students={students}
          tempStatus={tempStatus}
        />
      </div>

      <div style={{ textAlign: "center", marginTop: "1rem" }}>
        <button onClick={handleDownload} className="confirm-button">
          📥 ดาวน์โหลดรายงานเฉพาะส่วน (A4)
        </button>
      </div>
    </>
  );
}

export default DownloadReportSection;
