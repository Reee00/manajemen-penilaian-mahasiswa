    // ====== STATE ======
    let dataNilai = [];
    let settings = { bobotTugas: 30, bobotUTS: 30, bobotUAS: 40, batasLulus: 60 };
    let currentPage = 1;
    const itemsPerPage = 10;
    let currentSort = { column: null, direction: 'asc' };
    let filteredData = [];

    // Utility: safe parse localStorage
    function tryParse(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (err) {
        console.warn('Failed to parse', key, err);
        return fallback;
      }
    }

    // Init on DOM ready
    window.addEventListener('DOMContentLoaded', () => {
      dataNilai = tryParse('nilai', []);
      settings = tryParse('settings', settings);
      filteredData = [...dataNilai];

      // Hook listeners
      const nilaiForm = document.getElementById('nilaiForm');
      const editForm = document.getElementById('editForm');
      const searchInput = document.getElementById('searchInput');
      const filterJurusan = document.getElementById('filterJurusan');
      const filterGrade = document.getElementById('filterGrade');
      const filterStatus = document.getElementById('filterStatus');

      if (nilaiForm) nilaiForm.addEventListener('submit', handleSubmit);
      if (editForm) editForm.addEventListener('submit', handleEdit);
      if (searchInput) searchInput.addEventListener('input', applyFilters);
      if (filterJurusan) filterJurusan.addEventListener('change', applyFilters);
      if (filterGrade) filterGrade.addEventListener('change', applyFilters);
      if (filterStatus) filterStatus.addEventListener('change', applyFilters);

      loadSettings();
      render();
    });

    // ====== HANDLE SUBMIT (CREATE) ======
    function handleSubmit(e) {
      e.preventDefault();
      const nim = document.getElementById('nim').value.trim();
      const nama = document.getElementById('nama').value.trim();
      const jurusan = document.getElementById('jurusan').value;
      const semester = document.getElementById('semester').value;
      const mataKuliah = document.getElementById('mataKuliah').value.trim();
      const sks = +document.getElementById('sks').value;
      const tugas = +document.getElementById('tugas').value;
      const uts = +document.getElementById('uts').value;
      const uas = +document.getElementById('uas').value;

      // Basic validation
      if (!nim || !nama || !jurusan || !semester || !mataKuliah || !sks) {
        showToast('Lengkapi semua field yang wajib!', 'error');
        return;
      }

      // Duplicate check (same nim + mataKuliah)
      const duplicate = dataNilai.find(d => d.nim === nim && d.mataKuliah.toLowerCase() === mataKuliah.toLowerCase());
      if (duplicate) {
        showToast('Data dengan NIM dan Mata Kuliah yang sama sudah ada!', 'error');
        return;
      }

      const base = { nim, nama, jurusan, semester, mataKuliah, sks, tugas, uts, uas, timestamp: Date.now() };
      const calculated = calculateGrade(base);
      dataNilai.push({ ...base, ...calculated });

      saveData();
      applyFilters(); // reapply to include new record
      render();
      e.target.reset();
      showToast('Data berhasil disimpan!', 'success');
    }

    // ====== CALCULATION ======
    function calculateGrade(data) {
      // Use current settings
      const t = settings.bobotTugas / 100;
      const u = settings.bobotUTS / 100;
      const a = settings.bobotUAS / 100;

      // Ensure numeric safe values
      const tugas = Number(data.tugas || 0);
      const uts = Number(data.uts || 0);
      const uas = Number(data.uas || 0);

      const nilaiAkhir = (tugas * t) + (uts * u) + (uas * a);
      const grade = nilaiAkhir >= 85 ? 'A' :
                    nilaiAkhir >= 70 ? 'B' :
                    nilaiAkhir >= 60 ? 'C' : 'D';
      const status = nilaiAkhir >= settings.batasLulus ? 'Lulus' : 'Tidak Lulus';
      const gradePoint = grade === 'A' ? 4.0 : grade === 'B' ? 3.0 : grade === 'C' ? 2.0 : 1.0;

      return { nilaiAkhir: Number(nilaiAkhir.toFixed(1)), grade, status, gradePoint };
    }

    // ====== RENDER ======
    function render() {
      renderStats();
      renderTable();
      renderAnalytics();
      renderPagination();
    }

    // Stats
    function renderStats() {
      const total = dataNilai.length;
      const avg = total > 0 ? (dataNilai.reduce((s, d) => s + d.nilaiAkhir, 0) / total).toFixed(1) : 0;
      const passed = dataNilai.filter(d => d.status === 'Lulus').length;
      const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;
      const ipk = calculateIPK();

      document.getElementById('statTotal').textContent = total;
      document.getElementById('statAvg').textContent = avg;
      document.getElementById('statPass').textContent = passRate + '%';
      document.getElementById('statIPK').textContent = ipk;
    }

    // IPK
    function calculateIPK() {
      if (dataNilai.length === 0) return '0.00';
      const totalSKS = dataNilai.reduce((sum, d) => sum + (Number(d.sks) || 0), 0);
      if (totalSKS === 0) return '0.00';
      const totalGradePoint = dataNilai.reduce((sum, d) => sum + ((Number(d.gradePoint) || 0) * (Number(d.sks) || 0)), 0);
      return (totalGradePoint / totalSKS).toFixed(2);
    }

    // Table
    function renderTable() {
      const tbody = document.getElementById('nilaiTable');
      if (!tbody) return;

      if (!filteredData || filteredData.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8">
              <div class="empty-state">
                <div class="icon">📭</div>
                <p>Belum ada data nilai</p>
              </div>
            </td>
          </tr>
        `;
        return;
      }

      const start = (currentPage - 1) * itemsPerPage;
      const end = start + itemsPerPage;
      const pageData = filteredData.slice(start, end);

      tbody.innerHTML = pageData.map((d, i) => `
        <tr>
          <td>${escapeHtml(d.nim)}</td>
          <td>${escapeHtml(d.nama)}</td>
          <td>${escapeHtml(d.jurusan)}</td>
          <td>${escapeHtml(d.mataKuliah)}</td>
          <td><strong>${Number(d.nilaiAkhir).toFixed(1)}</strong></td>
          <td><span class="badge badge-${d.grade.toLowerCase()}">${d.grade}</span></td>
          <td><span class="${d.status === 'Lulus' ? 'badge badge-success' : 'badge badge-danger'}">${d.status}</span></td>
          <td>
            <div class="action-buttons">
              <button class="btn btn-icon" title="Detail" onclick="showDetail(${start + i})">👁️</button>
              <button class="btn btn-warning" onclick="editData(${start + i})">✏️</button>
              <button class="btn btn-danger" onclick="deleteData(${start + i})">🗑️</button>
            </div>
          </td>
        </tr>
      `).join('');
    }

    // Pagination
    function renderPagination() {
      const totalPages = Math.ceil((filteredData.length || 0) / itemsPerPage);
      const container = document.getElementById('pagination');
      if (!container) return;
      if (totalPages <= 1) { container.innerHTML = ''; return; }

      let html = `<button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>◀ Prev</button>`;
      for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
          html += `<button class="${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
          html += '<span style="padding:0 6px;color:#94a3b8;">...</span>';
        }
      }
      html += `<button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Next ▶</button>`;
      container.innerHTML = html;
    }

    function changePage(page) {
      const totalPages = Math.ceil((filteredData.length || 0) / itemsPerPage);
      if (page < 1 || page > totalPages) return;
      currentPage = page;
      renderTable();
      renderPagination();
    }

    // Filters
    function applyFilters() {
      const search = (document.getElementById('searchInput')?.value || '').toLowerCase();
      const jurusan = document.getElementById('filterJurusan')?.value || '';
      const grade = document.getElementById('filterGrade')?.value || '';
      const status = document.getElementById('filterStatus')?.value || '';

      filteredData = dataNilai.filter(d => {
        const matchSearch = [d.nim, d.nama, d.mataKuliah].some(f => (f || '').toString().toLowerCase().includes(search));
        const matchJurusan = !jurusan || d.jurusan === jurusan;
        const matchGrade = !grade || d.grade === grade;
        const matchStatus = !status || d.status === status;
        return matchSearch && matchJurusan && matchGrade && matchStatus;
      });

      // Maintain sorting if any
      if (currentSort.column) {
        sortFilteredData(currentSort.column, currentSort.direction);
      }

      currentPage = 1;
      renderTable();
      renderPagination();
    }

    // Sorting
    function sortTable(column, thEl) {
      // toggle direction
      if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort.column = column;
        currentSort.direction = 'asc';
      }

      // update header UI
      document.querySelectorAll('th').forEach(t => { t.classList.remove('sort-asc', 'sort-desc'); });
      if (thEl) thEl.classList.add(currentSort.direction === 'asc' ? 'sort-asc' : 'sort-desc');

      sortFilteredData(column, currentSort.direction);
      renderTable();
    }

    function sortFilteredData(column, direction) {
      filteredData.sort((a, b) => {
        let valA = a[column];
        let valB = b[column];
        // handle undefined
        if (valA === undefined) valA = '';
        if (valB === undefined) valB = '';
        // numeric?
        if (typeof valA === 'number' || typeof valB === 'number') {
          return direction === 'asc' ? (Number(valA) - Number(valB)) : (Number(valB) - Number(valA));
        }
        // string compare
        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();
        if (valA === valB) return 0;
        return direction === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
      });
    }

    // Detail modal
    function showDetail(index) {
      const d = filteredData[index];
      if (!d) return;
      const content = document.getElementById('detailContent');
      content.innerHTML = `
        <div class="detail-grid">
          <div class="detail-item"><span class="detail-label">NIM:</span><span class="detail-value">${escapeHtml(d.nim)}</span></div>
          <div class="detail-item"><span class="detail-label">Nama:</span><span class="detail-value">${escapeHtml(d.nama)}</span></div>
          <div class="detail-item"><span class="detail-label">Jurusan:</span><span class="detail-value">${escapeHtml(d.jurusan)}</span></div>
          <div class="detail-item"><span class="detail-label">Semester:</span><span class="detail-value">Semester ${escapeHtml(d.semester)}</span></div>
          <div class="detail-item"><span class="detail-label">Mata Kuliah:</span><span class="detail-value">${escapeHtml(d.mataKuliah)}</span></div>
          <div class="detail-item"><span class="detail-label">SKS:</span><span class="detail-value">${escapeHtml(d.sks)}</span></div>
          <div class="detail-item"><span class="detail-label">Nilai Tugas:</span><span class="detail-value">${escapeHtml(d.tugas)}</span></div>
          <div class="detail-item"><span class="detail-label">Nilai UTS:</span><span class="detail-value">${escapeHtml(d.uts)}</span></div>
          <div class="detail-item"><span class="detail-label">Nilai UAS:</span><span class="detail-value">${escapeHtml(d.uas)}</span></div>
          <div class="detail-item"><span class="detail-label">Nilai Akhir:</span><span class="detail-value" style="color:#3b82f6;">${Number(d.nilaiAkhir).toFixed(1)}</span></div>
          <div class="detail-item"><span class="detail-label">Grade:</span><span class="badge badge-${d.grade.toLowerCase()}" style="font-size:1rem;">${d.grade}</span></div>
          <div class="detail-item"><span class="detail-label">Status:</span><span class="${d.status === 'Lulus' ? 'badge badge-success' : 'badge badge-danger'}" style="font-size:1rem;">${d.status}</span></div>
          <div class="detail-item"><span class="detail-label">Timestamp:</span><span class="detail-value">${new Date(d.timestamp).toLocaleString()}</span></div>
        </div>
      `;
      document.getElementById('detailModal').classList.add('show');
    }

    // Edit data
    function editData(index) {
      const d = filteredData[index];
      if (!d) return;
      const realIndex = dataNilai.findIndex(item => item.nim === d.nim && item.mataKuliah.toLowerCase() === d.mataKuliah.toLowerCase());
      if (realIndex === -1) return;

      document.getElementById('editIndex').value = realIndex;
      document.getElementById('editNim').value = dataNilai[realIndex].nim;
      document.getElementById('editNama').value = dataNilai[realIndex].nama;
      document.getElementById('editJurusan').value = dataNilai[realIndex].jurusan;
      document.getElementById('editSemester').value = dataNilai[realIndex].semester;
      document.getElementById('editMataKuliah').value = dataNilai[realIndex].mataKuliah;
      document.getElementById('editSks').value = dataNilai[realIndex].sks;
      document.getElementById('editTugas').value = dataNilai[realIndex].tugas;
      document.getElementById('editUts').value = dataNilai[realIndex].uts;
      document.getElementById('editUas').value = dataNilai[realIndex].uas;

      document.getElementById('editModal').classList.add('show');
    }

    function handleEdit(e) {
      e.preventDefault();
      const index = +document.getElementById('editIndex').value;
      const nim = document.getElementById('editNim').value.trim();
      const nama = document.getElementById('editNama').value.trim();
      const jurusan = document.getElementById('editJurusan').value;
      const semester = document.getElementById('editSemester').value;
      const mataKuliah = document.getElementById('editMataKuliah').value.trim();
      const sks = +document.getElementById('editSks').value;
      const tugas = +document.getElementById('editTugas').value;
      const uts = +document.getElementById('editUts').value;
      const uas = +document.getElementById('editUas').value;

      if (index < 0 || index >= dataNilai.length) {
        showToast('Indeks data tidak valid', 'error');
        return;
      }

      // Check duplicate if nim+mataKuliah changed to an existing record (except itself)
      const duplicate = dataNilai.find((d, idx) => idx !== index && d.nim === nim && d.mataKuliah.toLowerCase() === mataKuliah.toLowerCase());
      if (duplicate) {
        showToast('Tidak dapat menyimpan. NIM dan Mata Kuliah duplikat.', 'error');
        return;
      }

      const base = {
        nim, nama, jurusan, semester, mataKuliah, sks, tugas, uts, uas,
        timestamp: dataNilai[index].timestamp || Date.now()
      };
      const calculated = calculateGrade(base);
      dataNilai[index] = { ...base, ...calculated };

      saveData();
      applyFilters();
      render();
      closeModal('editModal');
      showToast('Data berhasil diupdate!', 'success');
    }

    // Delete
    function deleteData(index) {
      const d = filteredData[index];
      if (!d) return;
      if (!confirm('Yakin ingin menghapus data ini?')) return;

      const realIndex = dataNilai.findIndex(item => item.nim === d.nim && item.mataKuliah.toLowerCase() === d.mataKuliah.toLowerCase());
      if (realIndex >= 0) {
        dataNilai.splice(realIndex, 1);
        saveData();
        applyFilters();
        render();
        showToast('Data berhasil dihapus!', 'success');
      } else {
        showToast('Data tidak ditemukan', 'error');
      }
    }

    // Analytics
    function renderAnalytics() {
      // Grade distribution
      const gradeCount = { A: 0, B: 0, C: 0, D: 0 };
      dataNilai.forEach(d => { if (d.grade) gradeCount[d.grade] = (gradeCount[d.grade] || 0) + 1; });
      const maxCount = Math.max(...Object.values(gradeCount), 1);
      const gradeChart = document.getElementById('gradeChart');
      if (gradeChart) {
        gradeChart.innerHTML = Object.entries(gradeCount).map(([grade, count]) => `
          <div style="flex:1;">
            <div class="chart-bar" style="height: ${(count / maxCount) * 100}%">
              <div class="chart-bar-label">${count}</div>
            </div>
            <div class="chart-bar-text">Grade ${grade}</div>
          </div>
        `).join('');
      }

      // Jurusan stats
      const jurusanMap = {};
      dataNilai.forEach(d => {
        if (!jurusanMap[d.jurusan]) jurusanMap[d.jurusan] = { total:0, nilaiSum:0, sksSum:0, gradePointSum:0, passed:0 };
        jurusanMap[d.jurusan].total++;
        jurusanMap[d.jurusan].nilaiSum += Number(d.nilaiAkhir || 0);
        jurusanMap[d.jurusan].sksSum += Number(d.sks || 0);
        jurusanMap[d.jurusan].gradePointSum += (Number(d.gradePoint || 0) * Number(d.sks || 0));
        if (d.status === 'Lulus') jurusanMap[d.jurusan].passed++;
      });

      const jurusanStats = document.getElementById('jurusanStats');
      if (jurusanStats) {
        jurusanStats.innerHTML = Object.entries(jurusanMap).map(([jurusan, stat]) => `
          <tr>
            <td><strong>${escapeHtml(jurusan)}</strong></td>
            <td>${stat.total}</td>
            <td>${(stat.nilaiSum / stat.total).toFixed(1)}</td>
            <td>${((stat.passed / stat.total) * 100).toFixed(1)}%</td>
            <td>${(stat.sksSum ? (stat.gradePointSum / stat.sksSum).toFixed(2) : '0.00')}</td>
          </tr>
        `).join('');
      }

      // Top students (by IPK)
      const studentIPK = {};
      dataNilai.forEach(d => {
        const key = `${d.nim}||${d.nama}||${d.jurusan}`;
        if (!studentIPK[key]) studentIPK[key] = { nim: d.nim, nama: d.nama, jurusan: d.jurusan, sksSum:0, gradePointSum:0 };
        studentIPK[key].sksSum += Number(d.sks || 0);
        studentIPK[key].gradePointSum += (Number(d.gradePoint || 0) * Number(d.sks || 0));
      });

      const topStudents = Object.values(studentIPK)
        .map(s => ({ ...s, ipk: s.sksSum ? (s.gradePointSum / s.sksSum) : 0 }))
        .sort((a,b) => b.ipk - a.ipk)
        .slice(0, 10);

      const topStudentsTable = document.getElementById('topStudents');
      if (topStudentsTable) {
        topStudentsTable.innerHTML = topStudents.map((s, i) => `
          <tr>
            <td><strong>${i + 1}</strong></td>
            <td>${escapeHtml(s.nim)}</td>
            <td>${escapeHtml(s.nama)}</td>
            <td>${escapeHtml(s.jurusan)}</td>
            <td><strong>${s.ipk.toFixed(2)}</strong></td>
          </tr>
        `).join('');
      }
    }

    // Settings
    function loadSettings() {
      document.getElementById('bobotTugas').value = settings.bobotTugas;
      document.getElementById('bobotUTS').value = settings.bobotUTS;
      document.getElementById('bobotUAS').value = settings.bobotUAS;
      document.getElementById('batasLulus').value = settings.batasLulus;
    }

    function saveSettings() {
      const bt = +document.getElementById('bobotTugas').value;
      const bu = +document.getElementById('bobotUTS').value;
      const ba = +document.getElementById('bobotUAS').value;
      const batas = +document.getElementById('batasLulus').value;

      const total = bt + bu + ba;
      if (total !== 100) {
        showToast('Total bobot harus 100%!', 'error');
        return;
      }

      settings.bobotTugas = bt;
      settings.bobotUTS = bu;
      settings.bobotUAS = ba;
      settings.batasLulus = batas;
      localStorage.setItem('settings', JSON.stringify(settings));

      // Recalculate all data
      dataNilai = dataNilai.map(d => ({ ...d, ...calculateGrade(d) }));
      saveData();
      applyFilters();
      render();
      showToast('Pengaturan berhasil disimpan!', 'success');
    }

    function resetSettings() {
      settings = { bobotTugas: 30, bobotUTS: 30, bobotUAS: 40, batasLulus: 60 };
      localStorage.setItem('settings', JSON.stringify(settings));
      loadSettings();
      // Recalculate
      dataNilai = dataNilai.map(d => ({ ...d, ...calculateGrade(d) }));
      saveData();
      applyFilters();
      render();
      showToast('Pengaturan direset ke default!', 'success');
    }

    // Export CSV
    function exportCSV() {
      if (!dataNilai || dataNilai.length === 0) {
        showToast('Tidak ada data untuk diexport!', 'error');
        return;
      }
      const headers = ['NIM','Nama','Jurusan','Semester','Mata Kuliah','SKS','Tugas','UTS','UAS','Nilai Akhir','Grade','Status','Timestamp'];
      const rows = dataNilai.map(d => [
        csvSafe(d.nim), csvSafe(d.nama), csvSafe(d.jurusan), csvSafe(d.semester),
        csvSafe(d.mataKuliah), csvSafe(d.sks), csvSafe(d.tugas), csvSafe(d.uts), csvSafe(d.uas),
        csvSafe(Number(d.nilaiAkhir).toFixed(1)), csvSafe(d.grade), csvSafe(d.status), csvSafe(d.timestamp)
      ]);
      const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
      downloadFile(csv, 'data-nilai.csv', 'text/csv;charset=utf-8;');
      showToast('Data berhasil diexport!', 'success');
    }

    // Export JSON
    function exportJSON() {
      if (!dataNilai || dataNilai.length === 0) {
        showToast('Tidak ada data untuk diexport!', 'error');
        return;
      }
      const json = JSON.stringify({ data: dataNilai, settings }, null, 2);
      downloadFile(json, 'data-nilai.json', 'application/json');
      showToast('Data berhasil diexport!', 'success');
    }

    // Import CSV (expects header)
    function importData() {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv,text/csv';
      input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();

        showLoading('Mengimpor data...');
        reader.onload = event => {
          try {
            const csv = event.target.result;
            const lines = csv.replace(/\r/g,'').split('\n').filter(l => l.trim());
            if (lines.length <= 1) {
              hideLoading();
              showToast('File CSV kosong atau hanya header', 'error');
              return;
            }
            // parse header to find columns (case-insensitive)
            const header = lines[0].split(',').map(h => h.trim().toLowerCase());
            const rows = lines.slice(1);
            let imported = 0;
            rows.forEach(line => {
              const cols = splitCSVLine(line);
              if (cols.length < 5) return; // insufficient columns
              // Try to map known columns by header index
              const map = (name) => {
                const idx = header.findIndex(h => h.includes(name));
                return idx >= 0 ? (cols[idx] || '').trim() : '';
              };
              const nim = map('nim') || cols[0] || '';
              const nama = map('nama') || cols[1] || '';
              const jurusan = map('jurusan') || cols[2] || '';
              const semester = map('semester') || cols[3] || '';
              const mataKuliah = map('mata') || map('mata kuliah') || cols[4] || '';
              const sks = + (map('sks') || cols[5] || 0);
              const tugas = + (map('tugas') || cols[6] || 0);
              const uts = + (map('uts') || cols[7] || 0);
              const uas = + (map('uas') || cols[8] || 0);

              if (!nim || !mataKuliah) return;

              // skip duplicate nim+mataKuliah
              const exists = dataNilai.find(d => d.nim === nim && d.mataKuliah.toLowerCase() === mataKuliah.toLowerCase());
              if (exists) return;

              const base = { nim: nim.trim(), nama: nama.trim(), jurusan: jurusan.trim(), semester: semester.trim(), mataKuliah: mataKuliah.trim(), sks, tugas, uts, uas, timestamp: Date.now() };
              const calculated = calculateGrade(base);
              dataNilai.push({ ...base, ...calculated });
              imported++;
            });

            saveData();
            applyFilters();
            render();
            hideLoading();
            if (imported > 0) showToast(`Berhasil import ${imported} data!`, 'success');
            else showToast('Tidak ada data baru yang diimport (mungkin duplikat).', 'warning');
          } catch (err) {
            hideLoading();
            showToast('Gagal import data! Format file salah.', 'error');
            console.error(err);
          }
        };
        reader.readAsText(file, 'UTF-8');
      };
      input.click();
    }

    // Backup & Restore
    function backupData() {
      const backup = { data: dataNilai, settings, timestamp: Date.now() };
      const json = JSON.stringify(backup, null, 2);
      downloadFile(json, `backup-${Date.now()}.json`, 'application/json');
      showToast('Backup berhasil dibuat!', 'success');
    }

    function restoreData() {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        showLoading('Memulihkan data...');
        reader.onload = event => {
          try {
            const backup = JSON.parse(event.target.result);
            if (!backup || !Array.isArray(backup.data)) throw new Error('Format backup tidak valid');
            dataNilai = backup.data || [];
            settings = backup.settings || settings;
            localStorage.setItem('settings', JSON.stringify(settings));
            saveData();
            loadSettings();
            applyFilters();
            render();
            hideLoading();
            showToast('Data berhasil direstore!', 'success');
          } catch (err) {
            hideLoading();
            showToast('Gagal restore data! Format file salah.', 'error');
            console.error(err);
          }
        };
        reader.readAsText(file, 'UTF-8');
      };
      input.click();
    }

    // Clear all
    function clearAllData() {
      if (!confirm('Yakin ingin menghapus SEMUA data? Tindakan ini tidak dapat dibatalkan!')) return;
      dataNilai = [];
      filteredData = [];
      saveData();
      render();
      showToast('Semua data berhasil dihapus!', 'warning');
    }

    // Helpers
    function saveData() {
      try {
        localStorage.setItem('nilai', JSON.stringify(dataNilai));
      } catch (err) {
        console.error('Gagal menyimpan ke localStorage', err);
      }
    }

    function downloadFile(content, filename, type) {
      const blob = new Blob([content], { type: type || 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }

    function showLoading(text = 'Memuat...') {
      const el = document.getElementById('loading');
      if (!el) return;
      document.getElementById('loadingText').textContent = text;
      el.classList.add('show');
    }
    function hideLoading() {
      const el = document.getElementById('loading');
      if (!el) return;
      el.classList.remove('show');
    }

    // Toast
    function showToast(message, type = 'success') {
      const t = document.createElement('div');
      t.className = `toast ${type}`;
      t.textContent = message;
      document.body.appendChild(t);
      setTimeout(() => t.remove(), 3500);
    }

    // Close modal when clicking outside content
    function modalOutsideClick(e) {
      if (e.target && e.target.classList && e.target.classList.contains('modal')) {
        e.target.classList.remove('show');
      }
    }

    function closeModal(id) {
      const el = document.getElementById(id);
      if (el) el.classList.remove('show');
    }

    function resetForm() {
      const f = document.getElementById('nilaiForm');
      if (f) f.reset();
    }

    // Tab switching
    function switchTab(tab, el) {
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      if (el) el.classList.add('active');
      const panel = document.getElementById(`tab-${tab}`);
      if (panel) panel.classList.add('active');
      if (tab === 'analytics') renderAnalytics();
    }

    // Utility: escape HTML to avoid injection
    function escapeHtml(s) {
      if (s === undefined || s === null) return '';
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;')
        .replace(/'/g,'&#39;');
    }

    // CSV Helpers
    function csvSafe(v) {
      if (v === undefined || v === null) return '';
      const str = String(v);
      // If contains comma or quotes or new line, quote it
      if (/[,"\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }

    // split CSV line supporting quoted fields
    function splitCSVLine(line) {
      const result = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"' ) {
          if (inQuotes && line[i+1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === ',' && !inQuotes) {
          result.push(cur);
          cur = '';
        } else {
          cur += ch;
        }
      }
      result.push(cur);
      return result;
    }

    // Basic CSV line splitter for simple files (fallback)
    function splitCSVLineSimple(line) {
      return line.split(',');
    }

    // Escape global event usage
    window.showDetail = showDetail;
    window.editData = editData;
    window.deleteData = deleteData;
    window.changePage = changePage;
    window.sortTable = sortTable;
    window.switchTab = switchTab;
    window.closeModal = closeModal;
    window.importData = importData;
    window.exportCSV = exportCSV;
    window.exportJSON = exportJSON;
    window.backupData = backupData;
    window.restoreData = restoreData;
    window.clearAllData = clearAllData;
    window.saveSettings = saveSettings;
    window.resetSettings = resetSettings;
    window.resetForm = resetForm;
