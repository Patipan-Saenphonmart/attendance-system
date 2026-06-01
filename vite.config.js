import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'local-csv-database',
      configureServer(server) {
        // Serve files from 'data base check system' under '/data/'
        server.middlewares.use((req, res, next) => {
          if (req.url.startsWith('/data/')) {
            const fileName = req.url.slice(6).split('?')[0]; // get filename after /data/
            const filePath = path.join(__dirname, 'data base check system', fileName);
            if (fs.existsSync(filePath)) {
              res.setHeader('Content-Type', fileName.endsWith('.csv') ? 'text/csv; charset=utf-8' : 'application/octet-stream');
              res.end(fs.readFileSync(filePath));
              return;
            }
          }
          next();
        });

        // Add an API endpoint to write updates directly back to d:\Desktop\attendance-system\data base check system\attendance.csv
        server.middlewares.use((req, res, next) => {
          if (req.url === '/api/save-attendance' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
              body += chunk.toString();
            });
            req.on('end', () => {
              try {
                const { records } = JSON.parse(body);
                const csvPath = path.join(__dirname, 'data base check system', 'attendance.csv');
                
                // Read existing CSV
                let content = '';
                if (fs.existsSync(csvPath)) {
                  content = fs.readFileSync(csvPath, 'utf-8');
                }
                
                let lines = content.trim().split(/\r?\n/);
                const headers = lines[0];
                
                // Parse rows to objects for easy modification/deduplication
                const rows = [];
                if (lines.length > 1) {
                  const headerList = headers.split(',').map(h => h.trim());
                  for (let i = 1; i < lines.length; i++) {
                    const line = lines[i];
                    if (!line.trim()) continue;
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
                    headerList.forEach((h, idx) => { obj[h] = (values[idx] ?? "").trim(); });
                    rows.push(obj);
                  }
                }
                
                // Apply upserts
                const now = new Date().toISOString().replace('T', ' ').substring(0, 19) + '+00'; // Standard timezone format
                let nextId = rows.length > 0 ? Math.max(...rows.map(r => parseInt(r.id) || 0)) + 1 : 1;
                
                records.forEach(rec => {
                  // Find existing record for this student_id and date
                  const existingIdx = rows.findIndex(r => parseInt(r.student_id) === parseInt(rec.student_id) && r.date === rec.date);
                  if (existingIdx !== -1) {
                    if (rec.status === '__deleted__') {
                      rows.splice(existingIdx, 1); // Delete if tombstone / clear button clicked
                    } else {
                      rows[existingIdx].status = rec.status;
                      rows[existingIdx].created_at = now;
                    }
                  } else if (rec.status !== '__deleted__') {
                    rows.push({
                      id: String(nextId++),
                      student_id: String(rec.student_id),
                      date: rec.date,
                      status: rec.status,
                      remark: '',
                      created_at: now
                    });
                  }
                });
                
                // Write back to CSV
                const newContent = [
                  'id,student_id,date,status,remark,created_at',
                  ...rows.map(r => `${r.id},${r.student_id},${r.date},${r.status},${r.remark || ''},${r.created_at}`)
                ].join('\n') + '\n';
                
                fs.writeFileSync(csvPath, newContent, 'utf-8');
                
                // Also copy to public/data/attendance.csv so production-like builds have it
                const destPath = path.join(__dirname, 'public', 'data', 'attendance.csv');
                fs.mkdirSync(path.dirname(destPath), { recursive: true });
                fs.writeFileSync(destPath, newContent, 'utf-8');

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true }));
              } catch (err) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: err.message }));
              }
            });
            return;
          }
          next();
        });
      }
    }
  ],
})

