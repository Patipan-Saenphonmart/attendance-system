// File: src/components/ui/Modal.jsx

function Modal({ isOpen, onClose, name, details }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>รายละเอียดการลา/ขาดของ {name}</h3>
        {details.length === 0 ? (
          <p>ไม่มีข้อมูล</p>
        ) : (
          <ul>
            {details.map((d, idx) => (
              <li key={idx}>
                {d.date}: {d.status}
              </li>
            ))}
          </ul>
        )}
        <button onClick={onClose} className="close-button">
          ปิด
        </button>
      </div>
    </div>
  );
}

export default Modal;
