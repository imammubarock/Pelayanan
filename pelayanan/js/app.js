    let dataPendudukFiltered = [];
    let dataPendudukGlobal = [];
    let dataLogsGlobal = [];
    let currentPage = 1;
    const perPage = 8;
    let currentUserRole = '';
    let tempUploadedTemplateId = null;
    let tempLoginUsername = '';
    let currentCitizenData = null;
    let currentSelectedTemplate = null;
    let currentTemplateRawText = "";
    let currentTemplatesGlobal = [];
    let previewDebounceTimer = null;
    let previewRequestSeq = 0;

    // Global variables for live chat
    let lastChatTimestamp = 0;
    let chatPollInterval = null;
    let isChatOpen = false;
    let unreadChatCount = 0;
    let activeChatTarget = 'Semua';
    let allChatMessagesArray = [];
    let unreadCountsByChannel = {};

    // Global variables for citizen camera capture
    let wargaStream = null;
    let wargaCapturedPhotoBase64 = '';
    let wargaKtpBase64 = '';

    function formatTanggalIndonesia(date) {
      if (!date) return "";
      const d = new Date(date);
      if (isNaN(d.getTime())) return "";
      
      const bulan = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
      ];
      
      const tgl = d.getDate();
      const bln = bulan[d.getMonth()];
      const thn = d.getFullYear();
      
      return `${tgl} ${bln} ${thn}`;
    }

    function escJS(str) {
      if (!str) return '';
      return str.toString()
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r');
    }
    window.escJS = escJS;

    function hilangkanSplashLoader() {
      const loader = document.getElementById('app_splash_loader');
      if (loader) {
        loader.classList.add('opacity-0');
        setTimeout(() => {
          loader.style.display = 'none';
        }, 500);
      }
    }

    // ==========================================
    // MOCK LAYER APPS SCRIPT UNTUK PREVIEW LOKAL
    // ==========================================
    if (typeof google === 'undefined' || CONFIG.USE_MOCK_BACKEND) {
      console.warn("Aplikasi berjalan di luar lingkup Google Apps Script. Mode Demo diaktifkan.");

      // Bersihkan dan seed ulang agar data selalu segar saat testing
      localStorage.removeItem('mock_penduduk');
      localStorage.removeItem('mock_surat_selesai');
      localStorage.removeItem('mock_permintaan');
      localStorage.removeItem('mock_users');
      localStorage.removeItem('mock_templates');
      localStorage.removeItem('mock_nomorsurat');
      localStorage.removeItem('mock_pejabat');

      // Seeding database simulasi di LocalStorage
      if (!localStorage.getItem('mock_penduduk')) {
        localStorage.setItem('mock_penduduk', JSON.stringify([
          { "nik": "3201011234560001", "no_kk": "3201011234567890", "nama": "Ahmad Subarjo", "tempat_lahir": "Bogor", "tanggal_lahir": "1990-05-12", "jk": "Laki-Laki", "kewarganegaraan": "WNI", "agama": "Islam", "status": "Kawin", "pekerjaan": "Wiraswasta", "alamat": "Jl. Raya Bogor No. 12", "rt": "001", "rw": "002", "pendidikan": "D4 / S1" },
          { "nik": "3201011234560002", "no_kk": "3201011234567890", "nama": "Siti Aminah", "tempat_lahir": "Bandung", "tanggal_lahir": "1995-08-22", "jk": "Perempuan", "kewarganegaraan": "WNI", "agama": "Islam", "status": "Belum Kawin", "pekerjaan": "Karyawan Swasta", "alamat": "Gang Masjid No. 5", "rt": "002", "rw": "002", "pendidikan": "SMA" },
          { "nik": "3201019876540003", "no_kk": "3201019876541234", "nama": "Budi Hartono", "tempat_lahir": "Jakarta", "tanggal_lahir": "1988-11-30", "jk": "Laki-Laki", "kewarganegaraan": "WNI", "agama": "Kristen", "status": "Kawin", "pekerjaan": "PNS", "alamat": "Perumahan Asri Blok C", "rt": "003", "rw": "004", "pendidikan": "S2" }
        ]));
      }

      if (!localStorage.getItem('mock_surat_selesai')) {
        localStorage.setItem('mock_surat_selesai', JSON.stringify([
          { "tanggal": "29 Mei 2026", "nik": "3201011234560001", "nama": "Ahmad Subarjo", "jenis": "Surat Keterangan Usaha", "nomor": "400.10.5.2/1/429.523.01/2026", "file": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", "tte_status": "Belum TTE", "pejabat_kode": "PJ1", "reg_id": "REQ-ADM-1002" }
        ]));
      }

      if (!localStorage.getItem('mock_permintaan')) {
        localStorage.setItem('mock_permintaan', JSON.stringify([
          {
            "id": "REQ-MND-1001",
            "tanggal": "28 Mei 2026",
            "nik": "3201011234560002",
            "nama": "Siti Aminah",
            "jenis_surat": "Surat Keterangan Domisili",
            "kode_surat": "SKD",
            "kontak": "628129876543",
            "data_tambahan": { "KEPERLUAN": "Syarat Pendaftaran Beasiswa Pendidikan" },
            "status": "Menunggu",
            "file_pdf": ""
          },
          {
            "id": "REQ-ADM-1002",
            "tanggal": "29 Mei 2026",
            "nik": "3201011234560001",
            "nama": "Ahmad Subarjo",
            "jenis_surat": "Surat Keterangan Usaha",
            "kode_surat": "SKU",
            "kontak": "-",
            "data_tambahan": { "NAMA_USAHA": "Toko Berkah Utama", "ALAMAT_USAHA": "Jl. Raya Tegalsari No. 12" },
            "status": "Selesai",
            "file_pdf": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
          }
        ]));
      }

      if (!localStorage.getItem('mock_users')) {
        localStorage.setItem('mock_users', JSON.stringify([
          { "username": "admin", "password": "admin", "nama": "H. Mulyadi (Kades)", "role": "admin", "kontak": "081234567890" },
          { "username": "staff", "password": "staff", "nama": "Rian Staff Desa", "role": "petugas", "kontak": "081298765432" }
        ]));
      }

      if (!localStorage.getItem('mock_templates')) {
        localStorage.setItem('mock_templates', JSON.stringify([
          { "kode": "SKD", "jenis": "Surat Keterangan Domisili", "template_id": "1eTQNw8KpwDAFp0KqA3bxTqDL06M09MSx_SAMPLE_ID", "fields": "KEPERLUAN", "kode_nomor": "400.10.02.02" },
          { "kode": "SKU", "jenis": "Surat Keterangan Usaha", "template_id": "1MQEiwmlSeu1QmBiBKPE-eQdnAYn1qKxi5zmNB7vKfyM", "fields": "NAMA_USAHA,ALAMAT_USAHA", "kode_nomor": "400.10.5.2" },
          { "kode": "SKW", "jenis": "Surat Keterangan Wali", "template_id": "1eTQNw8KpwDAFp0KqA3bxTqDL06M09MSx_SAMPLE_ID_2", "fields": "NAMA_WALI,NAMA_ANAK", "kode_nomor": "400.10.02.02" },
          { "kode": "SPN", "jenis": "Surat Pengantar Nikah", "template_id": "1eTQNw8KpwDAFp0KqA3bxTqDL06M09MSx_SKTM_ID", "fields": "NAMA_PASANGAN,MAS_KAWIN", "kode_nomor": "400.12.3.2" },
          { "kode": "SP_SKCK", "jenis": "Surat Pengantar SKCK", "template_id": "1eTQNw8KpwDAFp0KqA3bxTqDL06M09MSx_SKCK", "fields": "KEPERLUAN", "kode_nomor": "300.12.2" },
          { "kode": "SPW", "jenis": "Surat Pernyataan Waris", "template_id": "1MQEiwmlSeu1QmBiBKPE-eQdnAYn1qKxi5zmNB7vKfyM", "fields": "KUSTOM", "kode_nomor": "400.10.02.02" }
        ]));
      }

      if (!localStorage.getItem('mock_nomorsurat')) {
        localStorage.setItem('mock_nomorsurat', JSON.stringify([
          { "kode": "400.10.02.02", "jenis_surat": "Umum (Kependudukan, Kehilangan, SIUP, Status, NPWP dll)", "last_number": "12", "format": "400.10.02.02/[NO]/429.523.01/[TAHUN]" },
          { "kode": "400.12.3.2", "jenis_surat": "Khusus (Srt Pengantar Nikah, Pindah Nikah, Cerai)", "last_number": "3", "format": "400.12.3.2/[NO]/429.523.01/[TAHUN]" },
          { "kode": "300.12.2", "jenis_surat": "Khusus (Srt Pengantar SKCK)", "last_number": "1", "format": "300.12.2/[NO]/429.523.01/[TAHUN]" },
          { "kode": "400.12.3.1", "jenis_surat": "Khusus (Srt Ket Kelahiran & Kematian)", "last_number": "5", "format": "400.12.3.1/[NO]/429.523.01/[TAHUN]" },
          { "kode": "400.10.5.2", "jenis_surat": "Khusus (Srt Ket Usaha)", "last_number": "4", "format": "400.10.5.2/[NO]/429.523.01/[TAHUN]" },
          { "kode": "300.2.12", "jenis_surat": "Khusus (Srt Ijin Keramaian)", "last_number": "0", "format": "300.2.12/[NO]/429.523.01/[TAHUN]" }
        ]));
      }

      if (!localStorage.getItem('mock_pejabat')) {
        localStorage.setItem('mock_pejabat', JSON.stringify([
          { "kode": "KADES", "nama": "H. BONIRAN", "jabatan": "KEPALA DESA", "nip": "5803121712230010235", "ttd": "BONIRAN", "kontak": "628121712301" },
          { "kode": "SEKDES", "nama": "FERY ARTHA YUDIAWAN", "jabatan": "SEKRETARIS DESA", "nip": "8802181905230012455", "ttd": "FERY", "kontak": "628121712301" }
        ]));
      }

      function generateMockBackend(successHandler, failureHandler) {
        function runAsync(result, isSuccess = true) {
          setTimeout(() => {
            if (isSuccess && successHandler) {
              successHandler(result);
            } else if (!isSuccess && failureHandler) {
              failureHandler(typeof result === 'string' ? new Error(result) : result);
            }
          }, 300);
        }

        return {
          getDashboardStats: function () {
            const listPenduduk = JSON.parse(localStorage.getItem('mock_penduduk')) || [];
            const listSelesai = JSON.parse(localStorage.getItem('mock_surat_selesai')) || [];
            const listPermintaan = JSON.parse(localStorage.getItem('mock_permintaan')) || [];
            const countPermintaan = listPermintaan.filter(r => r.status === 'Menunggu' && r.kontak !== '-').length;
            
            runAsync({
              totalPenduduk: listPenduduk.length,
              totalSurat: listSelesai.length,
              totalPermintaan: countPermintaan
            });
          },
          getPermintaanSuratByNik: function (nik) {
            const listPermintaan = JSON.parse(localStorage.getItem('mock_permintaan')) || [];
            const listSelesai = JSON.parse(localStorage.getItem('mock_surat_selesai')) || [];
            
            const filteredPermintaan = listPermintaan.filter(r => r.nik.toString().trim() === nik.toString().trim());
            const filteredSelesai = listSelesai.filter(s => s.nik.toString().trim() === nik.toString().trim());
            
            const mappedPermintaan = filteredPermintaan.map(r => {
              const matchingSelesai = filteredSelesai.find(s => 
                s.reg_id === r.id || 
                s.file === r.file_pdf || 
                (s.nik.toString().trim() === r.nik.toString().trim() && s.jenis.toString().trim() === r.jenis_surat.toString().trim())
              );
              let status = r.status;
              if (r.status === 'Selesai') {
                const tteStatus = matchingSelesai ? matchingSelesai.tte_status : 'Belum TTE';
                if (tteStatus !== 'Sudah TTE') {
                  status = 'Proses TTE';
                }
              }
              return { ...r, status };
            });
            
            runAsync({
              permintaan: mappedPermintaan,
              selesai: filteredSelesai
            });
          },
          getPenduduk: function () {
            runAsync(JSON.parse(localStorage.getItem('mock_penduduk')));
          },
          getSuratSelesai: function () {
            runAsync(JSON.parse(localStorage.getItem('mock_surat_selesai')));
          },
          getPendudukCount: function () {
            const list = JSON.parse(localStorage.getItem('mock_penduduk')) || [];
            runAsync(list.length);
          },
          getSuratSelesaiCount: function () {
            const list = JSON.parse(localStorage.getItem('mock_surat_selesai')) || [];
            runAsync(list.length);
          },
          getPermintaanSuratCount: function () {
            const list = JSON.parse(localStorage.getItem('mock_permintaan')) || [];
            const count = list.filter(r => r.status === 'Menunggu' && r.id && r.id.indexOf('REQ-MND-') === 0).length;
            runAsync(count);
          },
          getFieldsSurat: function (kode) {
            const list = JSON.parse(localStorage.getItem('mock_templates')) || [];
            const tpl = list.find(t => t.kode.toUpperCase() === kode.toUpperCase());
            const fields = tpl && tpl.fields ? tpl.fields.split(',').map(x => x.trim()) : [];
            runAsync(fields);
          },
          getTemplateSurat: function () {
            runAsync(JSON.parse(localStorage.getItem('mock_templates')));
          },
          getTemplateContent: function (templateId) {
            runAsync(
              `<html><head><style>
                body { font-family: 'Times New Roman', Times, serif; padding: 40px; line-height: 1.6; color: #1e293b; background: white; }
                .kop-surat { text-align: center; border-bottom: 4px double #000; padding-bottom: 12px; margin-bottom: 20px; font-family: Arial, Helvetica, sans-serif; position: relative; }
                .kop-logo { position: absolute; left: 10px; top: 0; width: 50px; height: 50px; }
                .kop-kab { font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
                .kop-kec { font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
                .kop-desa { font-size: 15px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }
                .kop-alamat { font-size: 9px; font-style: italic; margin-top: 4px; font-weight: normal; text-transform: none; }
                .judul-surat { text-align: center; margin-top: 20px; margin-bottom: 20px; }
                .judul { font-size: 14px; font-weight: bold; text-decoration: underline; text-transform: uppercase; margin-bottom: 2px; }
                .nomor { font-size: 11px; color: #475569; }
                .isi { text-align: justify; text-indent: 30px; font-size: 12px; margin-bottom: 15px; }
                .tabel-identitas { width: 100%; margin: 15px 0 15px 30px; font-size: 12px; border-collapse: collapse; }
                .tabel-identitas td { padding: 4px 0; vertical-align: top; }
                .tabel-identitas td.label { width: 150px; }
                .tabel-identitas td.titik { width: 15px; text-align: center; }
                .tabel-identitas td.value { font-weight: bold; }
                .penutup { text-align: justify; text-indent: 30px; font-size: 12px; margin-top: 15px; }
                .ttd-box { float: right; width: 220px; text-align: center; margin-top: 30px; font-size: 12px; }
                .ttd-tanggal { margin-bottom: 5px; }
                .ttd-jabatan { font-weight: bold; text-transform: uppercase; margin-bottom: 10px; }
                .ttd-nama { font-weight: bold; text-decoration: underline; margin-top: 15px; }
                .ttd-nip { font-size: 10px; color: #475569; }
                .clear { clear: both; }
              </style></head><body>
                <div class="kop-surat">
                  <img class="kop-logo" src="img/logo-desa.png" onerror="this.src='https://upload.wikimedia.org/wikipedia/commons/b/bc/Garuda_Pancasila_Coat_of_Arms_of_Indonesia.svg';">
                  <div class="kop-kab">Pemerintah Kabupaten Banyuwangi</div>
                  <div class="kop-kec">Kecamatan Tegalsari</div>
                  <div class="kop-desa">Pemerintah Desa Tegalsari</div>
                  <div class="kop-alamat">Jl. Raya Tegalsari No. 1, Desa Tegalsari, Kec. Tegalsari - 68485</div>
                </div>
                <div class="judul-surat">
                  <div class="judul">SURAT KETERANGAN USAHA</div>
                  <div class="nomor">Nomor: [nomor_surat]</div>
                </div>
                <div class="isi">Yang bertanda tangan di bawah ini Kepala Desa Tegalsari, Kecamatan Tegalsari, Kabupaten Banyuwangi menerangkan dengan sebenarnya bahwa:</div>
                <table class="tabel-identitas">
                  <tr><td class="label">Nama Lengkap</td><td class="titik">:</td><td class="value">[nama]</td></tr>
                  <tr><td class="label">NIK</td><td class="titik">:</td><td class="value">[nik]</td></tr>
                  <tr><td class="label">Tempat, Tgl Lahir</td><td class="titik">:</td><td class="value">[tempat_lahir], [tanggal_lahir]</td></tr>
                  <tr><td class="label">Jenis Kelamin / Agama</td><td class="titik">:</td><td class="value">[jk] / [agama]</td></tr>
                  <tr><td class="label">Pekerjaan</td><td class="titik">:</td><td class="value">[pekerjaan]</td></tr>
                  <tr><td class="label">Alamat Lengkap</td><td class="titik">:</td><td class="value">[alamat]</td></tr>
                </table>
                <div class="isi">Bahwa orang tersebut diatas memang benar memiliki usaha <strong>[NAMA_USAHA]</strong> yang berlokasi di <strong>[ALAMAT_USAHA]</strong> di wilayah Desa Tegalsari.</div>
                <div class="penutup">Demikian surat keterangan ini dibuat dengan sebenarnya, untuk dapat dipergunakan sebagaimana mestinya dan kepada pihak yang berkepentingan mohon maklum adanya.</div>
                <div class="ttd-box">
                  <div class="ttd-tanggal">Tegalsari, [tanggal]</div>
                  <div class="ttd-jabatan">[jabatan_pejabat]</div>
                  [ttd]
                  <div class="ttd-nama">[nama_pejabat]</div>
                  <div class="ttd-nip">[nip_pejabat]</div>
                </div>
                <div class="clear"></div>
              </body></html>`
            );
          },
          getPejabat: function () {
            runAsync(JSON.parse(localStorage.getItem('mock_pejabat')) || []);
          },
          simpanPejabat: function (data) {
            const list = JSON.parse(localStorage.getItem('mock_pejabat')) || [];
            if (list.some(p => p.kode.toUpperCase() === data.kode.toUpperCase())) {
              runAsync("Kode pejabat tersebut sudah terdaftar.", false);
              return;
            }
            list.push(data);
            localStorage.setItem('mock_pejabat', JSON.stringify(list));
            runAsync(true);
          },
          updatePejabat: function (data) {
            const list = JSON.parse(localStorage.getItem('mock_pejabat')) || [];
            const idx = list.findIndex(p => p.kode.toUpperCase() === data.kode.toUpperCase());
            if (idx !== -1) {
              list[idx] = data;
              localStorage.setItem('mock_pejabat', JSON.stringify(list));
              runAsync(true);
            } else {
              runAsync("Pejabat tidak ditemukan", false);
            }
          },
          hapusPejabat: function (kode) {
            let list = JSON.parse(localStorage.getItem('mock_pejabat')) || [];
            list = list.filter(p => p.kode.toUpperCase() !== kode.toUpperCase());
            localStorage.setItem('mock_pejabat', JSON.stringify(list));
            runAsync(true);
          },
          getPendudukByNik: function (nik) {
            const list = JSON.parse(localStorage.getItem('mock_penduduk'));
            const citizen = list.find(c => c.nik.toString() === nik.toString());
            runAsync(citizen || null);
          },
          getNomorSurat: function () {
            runAsync(JSON.parse(localStorage.getItem('mock_nomorsurat')));
          },
          simpanNomorSurat: function (data) {
            const list = JSON.parse(localStorage.getItem('mock_nomorsurat')) || [];
            if (list.some(n => n.kode.toUpperCase() === data.kode.toUpperCase())) {
              runAsync("Kode penomoran/klasifikasi sudah ada", false);
              return;
            }
            list.push(data);
            localStorage.setItem('mock_nomorsurat', JSON.stringify(list));
            runAsync(true);
          },
          updateNomorSurat: function (data) {
            const list = JSON.parse(localStorage.getItem('mock_nomorsurat')) || [];
            const idx = list.findIndex(n => n.kode.toUpperCase() === data.kode.toUpperCase());
            if (idx !== -1) {
              list[idx] = data;
              localStorage.setItem('mock_nomorsurat', JSON.stringify(list));
              runAsync(true);
            } else {
              runAsync("Klasifikasi penomoran tidak ditemukan", false);
            }
          },
          hapusNomorSurat: function (kode) {
            let list = JSON.parse(localStorage.getItem('mock_nomorsurat')) || [];
            list = list.filter(n => n.kode.toUpperCase() !== kode.toUpperCase());
            localStorage.setItem('mock_nomorsurat', JSON.stringify(list));
            runAsync(true);
          },
          simpanPenduduk: function (data) {
            const list = JSON.parse(localStorage.getItem('mock_penduduk'));
            if (list.some(c => c.nik === data.nik)) {
              runAsync("NIK ini sudah terdaftar", false);
              return;
            }
            list.push(data);
            localStorage.setItem('mock_penduduk', JSON.stringify(list));
            runAsync(true);
          },
          updatePenduduk: function (data) {
            const list = JSON.parse(localStorage.getItem('mock_penduduk'));
            const idx = list.findIndex(c => c.nik === data.nik);
            if (idx !== -1) {
              list[idx] = data;
              localStorage.setItem('mock_penduduk', JSON.stringify(list));
              runAsync(true);
            } else {
              runAsync("Data penduduk tidak ditemukan", false);
            }
          },
          hapusPenduduk: function (nik) {
            let list = JSON.parse(localStorage.getItem('mock_penduduk'));
            list = list.filter(c => c.nik !== nik);
            localStorage.setItem('mock_penduduk', JSON.stringify(list));
            runAsync(true);
          },
          buatSuratPDF: function (nik, kode, dataFields, pejabatKode, requestActiveId, keepExistingNumber) {
            const list = JSON.parse(localStorage.getItem('mock_penduduk'));
            const citizen = list.find(c => c.nik === nik);
            const listTpl = JSON.parse(localStorage.getItem('mock_templates')) || [];
            const tpl = listTpl.find(t => t.kode === kode);
            const kodeNomor = tpl ? tpl.kode_nomor : '';

            const nomorSuratList = JSON.parse(localStorage.getItem('mock_nomorsurat')) || [];
            const nsIdx = nomorSuratList.findIndex(n => n.kode.toString() === kodeNomor.toString());
            let finalNumber = "REG-SAMPLE/2026";
            if (nsIdx !== -1) {
              let nextNum = Number(nomorSuratList[nsIdx].last_number) + 1;
              nomorSuratList[nsIdx].last_number = nextNum.toString();
              localStorage.setItem('mock_nomorsurat', JSON.stringify(nomorSuratList));
              finalNumber = nomorSuratList[nsIdx].format.replace('[NO]', nextNum).replace('[TAHUN]', '2026');
            }

            const isDirectInput = !requestActiveId || requestActiveId.trim() === "";

            const newSurat = {
              tanggal: "29 Mei 2026",
              nik: citizen.nik,
              nama: citizen.nama,
              jenis: tpl ? tpl.jenis : "Surat Keterangan",
              nomor: finalNumber,
              file: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
              tte_status: "Belum TTE",
              pejabat_kode: pejabatKode
            };

            const completed = JSON.parse(localStorage.getItem('mock_surat_selesai'));
            completed.push(newSurat);
            localStorage.setItem('mock_surat_selesai', JSON.stringify(completed));

            // Simpan draf permintaan ke riwayat permintaan
            const reqList = JSON.parse(localStorage.getItem('mock_permintaan')) || [];
            if (isDirectInput) {
              const reqId = "REQ-ADM-" + (reqList.length + 1001);
              reqList.push({
                "id": reqId,
                "tanggal": "29 Mei 2026",
                "nik": citizen.nik,
                "nama": citizen.nama,
                "jenis_surat": tpl ? tpl.jenis : "Surat Keterangan",
                "kode_surat": kode,
                "kontak": "-",
                "data_tambahan": dataFields,
                "status": "Selesai",
                "file_pdf": newSurat.file
              });
            } else {
              const idx = reqList.findIndex(r => r.id === requestActiveId);
              if (idx !== -1) {
                reqList[idx].status = "Selesai";
                reqList[idx].file_pdf = newSurat.file;
              }
            }
            localStorage.setItem('mock_permintaan', JSON.stringify(reqList));

            runAsync(newSurat.file);
          },
          updateFileSuratSelesai: function (nomorSurat, base64Data, fileName) {
            const completed = JSON.parse(localStorage.getItem('mock_surat_selesai')) || [];
            const idx = completed.findIndex(s => s.nomor === nomorSurat);
            let oldUrl = "";
            const simulatedNewUrl = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf?updated=" + Date.now();

            if (idx !== -1) {
              oldUrl = completed[idx].file;
              completed[idx].file = simulatedNewUrl;
              completed[idx].tte_status = "Sudah TTE";
              localStorage.setItem('mock_surat_selesai', JSON.stringify(completed));
            }

            if (oldUrl) {
              const reqList = JSON.parse(localStorage.getItem('mock_permintaan')) || [];
              const reqIdx = reqList.findIndex(r => r.file_pdf === oldUrl);
              if (reqIdx !== -1) {
                reqList[reqIdx].file_pdf = simulatedNewUrl;
                localStorage.setItem('mock_permintaan', JSON.stringify(reqList));
              }
            }
            runAsync(simulatedNewUrl);
          },
          kirimWaPejabat: function (nomorSurat, namaPejabat, kontakPejabat, jenisSurat, namaWarga) {
            console.log("Simulasi Kirim WA TTE Pejabat:", namaPejabat, kontakPejabat, nomorSurat);
            runAsync(true);
          },
          setTteApproved: function (nomorSurat) {
            const completed = JSON.parse(localStorage.getItem('mock_surat_selesai')) || [];
            const idx = completed.findIndex(s => s.nomor === nomorSurat);
            if (idx !== -1) {
              completed[idx].tte_status = "Sudah TTE";
              localStorage.setItem('mock_surat_selesai', JSON.stringify(completed));

              // Perbarui status pengajuan terkait
              const fileUrl = completed[idx].file;
              const reqList = JSON.parse(localStorage.getItem('mock_permintaan')) || [];
              const reqIdx = reqList.findIndex(r => r.file_pdf === fileUrl || (r.nik === completed[idx].nik && r.jenis_surat === completed[idx].jenis));
              if (reqIdx !== -1) {
                reqList[reqIdx].status = "Selesai";
                reqList[reqIdx].file_pdf = fileUrl;
                localStorage.setItem('mock_permintaan', JSON.stringify(reqList));
              }
            }
            runAsync(true);
          },
          login: function (username, password) {
            const list = JSON.parse(localStorage.getItem('mock_users')) || [];
            const matched = list.find(u => u.username === username && u.password === password);
            if (matched) {
              const dummyOtp = "123456";
              sessionStorage.setItem('mock_otp_' + username, dummyOtp);
              sessionStorage.setItem('mock_temp_user_' + username, JSON.stringify(matched));

              let wa = matched.kontak || '081234567890';
              let masked = wa.substring(0, 4) + '*****' + wa.substring(wa.length - 3);

              runAsync({ status: "NEED_OTP", username: username, masked_wa: masked });
            } else {
              runAsync("Username atau password salah", false);
            }
          },
          verifikasiAdminOtp: function (username, otpInput) {
            const cachedOtp = sessionStorage.getItem('mock_otp_' + username);
            if (!cachedOtp) {
              runAsync("Sesi OTP kadaluwarsa", false);
              return;
            }
            if (cachedOtp === otpInput) {
              const matched = JSON.parse(sessionStorage.getItem('mock_temp_user_' + username));
              const session = { username: matched.username, nama: matched.nama, role: matched.role, status: true };
              sessionStorage.setItem('mock_session', JSON.stringify(session));

              sessionStorage.removeItem('mock_otp_' + username);
              sessionStorage.removeItem('mock_temp_user_' + username);
              runAsync(session);
            } else {
              runAsync("Kode OTP salah! (Gunakan OTP simulasi: 123456)", false);
            }
          },
          logout: function () {
            sessionStorage.removeItem('mock_session');
            runAsync(true);
          },
          getProfilAktif: function () {
            const session = JSON.parse(sessionStorage.getItem('mock_session'));
            if (!session) { runAsync("Sesi telah habis", false); return; }
            const list = JSON.parse(localStorage.getItem('mock_users')) || [];
            const user = list.find(u => u.username.toLowerCase() === session.username.toLowerCase());
            runAsync(user);
          },
          updatePasswordAktif: function (passwordBaru) {
            const session = JSON.parse(sessionStorage.getItem('mock_session'));
            let list = JSON.parse(localStorage.getItem('mock_users')) || [];
            const idx = list.findIndex(u => u.username.toLowerCase() === session.username.toLowerCase());
            if (idx !== -1) {
              list[idx].password = passwordBaru;
              localStorage.setItem('mock_users', JSON.stringify(list));
              runAsync(true);
            } else {
              runAsync("Gagal menemukan pengguna", false);
            }
          },
          cekLogin: function () {
            const session = sessionStorage.getItem('mock_session');
            runAsync(session ? JSON.parse(session) : null);
          },
          getPermintaanSurat: function () {
            runAsync(JSON.parse(localStorage.getItem('mock_permintaan')));
          },
          kirimPermintaanSuratWarga: function (data) {
            const reqList = JSON.parse(localStorage.getItem('mock_permintaan')) || [];
            const reqId = "REQ-MND-" + (reqList.length + 1001);
            const newRequest = {
              id: reqId,
              tanggal: "29 Mei 2026",
              nik: data.nik,
              nama: data.nama,
              jenis_surat: data.jenis_surat,
              kode_surat: data.kode_surat,
              kontak: data.kontak,
              data_tambahan: data.data_tambahan,
              status: "Menunggu",
              file_pdf: "",
              foto_wajah: data.foto_wajah_base64 || ""
            };
            reqList.push(newRequest);
            localStorage.setItem('mock_permintaan', JSON.stringify(reqList));
            runAsync(true);
          },
          prosesPermintaanSurat: function (id, status, fileUrl = "", alasan = "") {
            const reqList = JSON.parse(localStorage.getItem('mock_permintaan')) || [];
            const idx = reqList.findIndex(r => r.id === id);
            if (idx !== -1) {
              reqList[idx].status = status;
              if (fileUrl) reqList[idx].file_pdf = fileUrl;
              if (status === 'Ditolak' && alasan) {
                reqList[idx].alasan_penolakan = alasan;
              }
              localStorage.setItem('mock_permintaan', JSON.stringify(reqList));
              runAsync(true);
            } else {
              runAsync("Draf pengajuan tidak ditemukan", false);
            }
          },
          getUsers: function () {
            runAsync(JSON.parse(localStorage.getItem('mock_users')));
          },
          simpanUser: function (data) {
            const list = JSON.parse(localStorage.getItem('mock_users'));
            if (list.some(u => u.username.toLowerCase() === data.username.toLowerCase())) {
              runAsync("Username sudah terdaftar", false);
              return;
            }
            list.push(data);
            localStorage.setItem('mock_users', JSON.stringify(list));
            runAsync(true);
          },
          updateUser: function (data) {
            const list = JSON.parse(localStorage.getItem('mock_users'));
            const idx = list.findIndex(u => u.username.toLowerCase() === data.username.toLowerCase());
            if (idx !== -1) {
              list[idx] = data;
              localStorage.setItem('mock_users', JSON.stringify(list));
              runAsync(true);
            } else {
              runAsync("User tidak ditemukan", false);
            }
          },
          hapusUser: function (username) {
            let list = JSON.parse(localStorage.getItem('mock_users'));
            if (list.length <= 1) {
              runAsync("Gagal menghapus. Harus tersisa minimal satu administrator.", false);
              return;
            }
            list = list.filter(u => u.username.toLowerCase() !== username.toLowerCase());
            localStorage.setItem('mock_users', JSON.stringify(list));
            runAsync(true);
          },
          simpanTemplateSurat: function (data) {
            const list = JSON.parse(localStorage.getItem('mock_templates')) || [];
            if (list.some(t => t.kode.toUpperCase() === data.kode.toUpperCase())) {
              runAsync("Kode template tersebut sudah ada.", false);
              return;
            }
            list.push(data);
            localStorage.setItem('mock_templates', JSON.stringify(list));
            runAsync(true);
          },
          updateTemplateSurat: function (data) {
            const list = JSON.parse(localStorage.getItem('mock_templates')) || [];
            const idx = list.findIndex(t => t.kode.toUpperCase() === data.kode.toUpperCase());
            if (idx !== -1) {
              list[idx] = data;
              localStorage.setItem('mock_templates', JSON.stringify(list));
              runAsync(true);
            } else {
              runAsync("Template surat tidak ditemukan", false);
            }
          },
          hapusTemplateSurat: function (kode) {
            let list = JSON.parse(localStorage.getItem('mock_templates')) || [];
            list = list.filter(t => t.kode.toUpperCase() !== kode.toUpperCase());
            localStorage.setItem('mock_templates', JSON.stringify(list));
            runAsync(true);
          },
          uploadAndConvertTemplate: function (base64, fileName) {
            runAsync({
              docId: "ID_TEMPLATE_TERCONVERT_" + Math.floor(Math.random() * 10000),
              customFields: "NAMA_USAHA,ALAMAT_USAHA"
            });
          },
          kirimWaFonnte: function (target, nama, jenisSurat, linkPdf) {
            console.log("Simulasi Kirim WA Fonnte ke:", target, nama, jenisSurat, linkPdf);
            runAsync(true);
          },
          setWaStatusPermintaan: function (id, statusWa) {
            runAsync(true);
          },
          getFonnteToken: function () {
            runAsync(localStorage.getItem('mock_fonnte_token') || 'FPgpa7vTWWeJYB5n6o5a');
          },
          simpanFonnteToken: function (token) {
            localStorage.setItem('mock_fonnte_token', token);
            runAsync(true);
          },
          hapusFonnteToken: function () {
            localStorage.removeItem('mock_fonnte_token');
            runAsync(true);
          },
          getFonnteStatus: function () {
            const hasToken = localStorage.getItem('mock_fonnte_token');
            if (!hasToken) {
              runAsync({ status: false, reason: "Token Fonnte belum dikonfigurasi" });
            } else {
              const devStatus = localStorage.getItem('mock_fonnte_device_status') || 'disconnect';
              runAsync({
                status: true,
                device: "6281234567890",
                device_status: devStatus,
                expired: "31 Desember 2029",
                messages: 9999,
                name: "Server Desa Tegalsari (SIMULASI)",
                package: "Regular",
                quota: "10000"
              });
            }
          },
          disconnectFonnteDevice: function () {
            localStorage.setItem('mock_fonnte_device_status', 'disconnect');
            runAsync({ status: true, detail: "device disconnected" });
          },
          getFonnteQR: function () {
            runAsync({
              status: true,
              url: "iVBORw0KGgoAAAANSUhEUgAAAMgAAADIEAQAAADZCO6vAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAAAHdElNRQfmBw0LEiU7mZ8pAAADXklEQVR42u3dQY7bQAwEwMv//+S8pU9YAsgYCOpUvU9i9IAnm8XN/S6Xy+VyuVwu99/+6bN3e/Y+y+VyuVwul8vlcrnt7Vn/0+fv/uynXy6Xy+VyuVxuz2L+6ev73z/bXC6Xy+VyufNz3/fvff9su1wul8vlcrn94bN39WuvzGf/P9v/Abe"
            });
          },
          getBypassOtpStatus: function () {
            runAsync(localStorage.getItem('mock_bypass_otp') === 'true');
          },
          setBypassOtpStatus: function (isEnabled) {
            localStorage.setItem('mock_bypass_otp', isEnabled ? 'true' : 'false');
            runAsync(true);
          },
          getLogHistory: function () {
            const mockLogs = JSON.parse(localStorage.getItem('mock_logs')) || [
              { "waktu": "02 Jun 2026 23:00:00", "user": "System", "aksi": "System Boot", "detail": "Sistem dimuat dalam mode simulasi." }
            ];
            runAsync(mockLogs);
          },
          hapusFileDrive: function (fileId) {
            console.log("Simulasi Hapus File Drive ID:", fileId);
            runAsync(true);
          },
          unggahUpdateZip: function (base64Data, fileName) {
            console.log("Simulasi Unggah Update ZIP:", fileName);
            runAsync({
              status: "ok",
              message: "Simulasi: Berkas '" + fileName + "' berhasil diunggah ke Google Drive simulasi.",
              fileUrl: "https://drive.google.com/mock-file-url-update-zip"
            });
          }
        };
      }

      window.google = {
        script: {
          run: {
            withSuccessHandler: function (s) {
              return {
                withFailureHandler: function (f) {
                  return generateMockBackend(s, f);
                },
                ...generateMockBackend(s, null)
              };
            }
          }
        }
      };
    }

    function setActiveNav(navId) {
      document.querySelectorAll('.nav-sidebar .nav-link').forEach(link => {
        link.classList.remove('active');
      });
      const activeElement = document.getElementById(navId);
      if (activeElement) {
        activeElement.classList.add('active');

        if (navId === 'nav-buat-surat' || navId === 'nav-permintaan-mandiri' || navId === 'nav-permintaan-langsung' || navId === 'nav-arsip-surat') {
          const parent = document.getElementById('nav-surat-parent');
          const submenu = document.getElementById('submenu-surat');
          parent.classList.add('active');
          submenu.style.display = 'block';
          parent.querySelector('.fa-angle-left').style.transform = 'rotate(-90deg)';
        }
      }
    }

    function toggleMenuSurat(event, el) {
      event.preventDefault();
      const submenu = document.getElementById('submenu-surat');
      const icon = el.querySelector('.fa-angle-left');

      if (submenu.style.display === 'block') {
        submenu.style.display = 'none';
        icon.style.transform = 'rotate(0deg)';
      } else {
        submenu.style.display = 'block';
        icon.style.transform = 'rotate(-90deg)';
      }
    }

    function switchKePortalWarga() {
      document.getElementById('appLogin').style.display = 'none';
      document.getElementById('mainApp').style.display = 'none';
      document.getElementById('appWarga').style.display = 'flex';
      switchTabWarga('ajukan');
      hilangkanSplashLoader();
    }

    function switchKeLoginAdmin() {
      document.getElementById('appWarga').style.display = 'none';
      document.getElementById('mainApp').style.display = 'none';
      document.getElementById('appLogin').style.display = 'flex';

      document.getElementById('loginFormContainer').style.display = 'block';
      document.getElementById('loginOtpContainer').style.display = 'none';
    }

    function handleEnterLogin(e) {
      if (e.key === 'Enter') {
        prosesLogin();
      }
    }

    function handleEnterOtp(e) {
      if (e.key === 'Enter') {
        prosesVerifikasiLoginOtp();
      }
    }

    function toggleCustomDropdown(dropdownId) {
      const dropdown = document.getElementById(dropdownId);
      if (!dropdown) return;
      if (dropdown.classList.contains('hidden')) {
        // Hide other dropdowns
        document.querySelectorAll('[id$="Dropdown"]').forEach(d => {
          if (d.id !== dropdownId) d.classList.add('hidden');
        });
        dropdown.classList.remove('hidden');
        const searchInput = dropdown.querySelector('input');
        if (searchInput) {
          searchInput.value = '';
          searchInput.focus();
          filterCustomDropdown(dropdownId, '');
        }
      } else {
        dropdown.classList.add('hidden');
      }
    }

    function filterCustomDropdown(dropdownId, query) {
      const q = query.toLowerCase();
      const list = document.getElementById(dropdownId).querySelector('ul');
      if (!list) return;
      const items = list.querySelectorAll('li');
      items.forEach(item => {
        const text = item.getAttribute('data-search') || '';
        if (text.includes(q)) {
          item.style.display = '';
        } else {
          item.style.display = 'none';
        }
      });
    }

    function selectCustomDropdownOption(nameId, val, text) {
      const input = document.getElementById(nameId);
      const selected = document.getElementById(nameId + 'Selected');
      const dropdown = document.getElementById(nameId + 'Dropdown');

      if (input) input.value = val;
      if (selected) selected.innerText = text;
      if (dropdown) dropdown.classList.add('hidden');

      // Trigger change event programmatically
      if (input) {
        const event = new Event('change');
        input.dispatchEvent(event);
      }
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', function (e) {
      const openDropdowns = document.querySelectorAll('[id$="Dropdown"]:not(.hidden)');
      openDropdowns.forEach(d => {
        const wrapperId = d.id.replace('Dropdown', 'Wrapper');
        const wrapper = document.getElementById(wrapperId);
        if (wrapper && !wrapper.contains(e.target)) {
          d.classList.add('hidden');
        }
      });
    });

    // amankanPanggilanGAS dipindahkan ke js/api.js untuk mempermudah routing REST API / Mock
    // (Fungsi asli telah dihapus dari file ini untuk mencegah tumpang tindih)

    function switchTabWarga(tab) {
      const tabAjukan = document.getElementById('tabAjukanSurat');
      const tabStatus = document.getElementById('tabStatusSurat');
      const panelAjukan = document.getElementById('panelAjukanSurat');
      const panelStatus = document.getElementById('panelStatusSurat');

      if (tab === 'ajukan') {
        tabAjukan.className = "flex-1 py-4 text-center font-bold text-sm text-blue-600 border-b-2 border-blue-600 focus:outline-none";
        tabStatus.className = "flex-1 py-4 text-center font-bold text-sm text-slate-500 hover:text-blue-600 focus:outline-none";
        panelAjukan.style.display = 'block';
        panelStatus.style.display = 'none';
        resetFormWarga();
      } else {
        tabAjukan.className = "flex-1 py-4 text-center font-bold text-sm text-slate-500 hover:text-blue-600 focus:outline-none";
        tabStatus.className = "flex-1 py-4 text-center font-bold text-sm text-blue-600 border-b-2 border-blue-600 focus:outline-none";
        panelAjukan.style.display = 'none';
        panelStatus.style.display = 'block';

        const resArea = document.getElementById('statusResultArea');
        if (resArea) resArea.innerHTML = '';

        const cariNikInput = document.getElementById('statusCariNik');
        if (cariNikInput) cariNikInput.value = '';
      }
    }

    function loadDashboard() {
      setActiveNav('nav-dashboard');

      document.getElementById('content').innerHTML = `
        <div class="fade-in">
          <div class="row mb-4">
            <div class="col-12">
              <h1 class="text-2xl font-bold text-slate-800">Ringkasan Pelayanan Desa</h1>
              <p class="text-slate-500 text-sm mt-1">Selamat datang kembali! Berikut adalah status layanan administrasi desa saat ini.</p>
            </div>
          </div>

          <div class="row">
            <div class="col-lg-3 col-sm-6 col-12">
              <div class="info-box bg-white flex items-center p-4 border border-slate-200 cursor-pointer" onclick="loadPenduduk()">
                <span class="info-box-icon bg-blue-500 text-white rounded-xl flex items-center justify-center w-14 h-14 shadow-md shadow-blue-500/20">
                  <i class="fas fa-users text-xl"></i>
                </span>
                <div class="info-box-content ml-4">
                  <span class="info-box-text text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Penduduk</span>
                  <span class="info-box-number text-2xl font-bold text-slate-800 mt-1" id="totalPenduduk">0</span>
                </div>
              </div>
            </div>

            <div class="col-lg-3 col-sm-6 col-12">
              <div class="info-box bg-white flex items-center p-4 border border-slate-200 cursor-pointer" onclick="loadPermintaanSuratMandiri()">
                <span class="info-box-icon bg-amber-500 text-white rounded-xl flex items-center justify-center w-14 h-14 shadow-md shadow-amber-500/20">
                  <i class="fas fa-file-invoice text-xl"></i>
                </span>
                <div class="info-box-content ml-4">
                  <span class="info-box-text text-sm font-semibold text-slate-500 uppercase tracking-wider">Antrean Mandiri</span>
                  <span class="info-box-number text-2xl font-bold text-slate-800 mt-1" id="totalPermintaan">0</span>
                </div>
              </div>
            </div>

            <div class="col-lg-3 col-sm-6 col-12">
              <div class="info-box bg-white flex items-center p-4 border border-slate-200 cursor-pointer" onclick="loadArsipSurat()">
                <span class="info-box-icon bg-emerald-500 text-white rounded-xl flex items-center justify-center w-14 h-14 shadow-md shadow-emerald-500/20">
                  <i class="fas fa-file-pdf text-xl"></i>
                </span>
                <div class="info-box-content ml-4">
                  <span class="info-box-text text-sm font-semibold text-slate-500 uppercase tracking-wider">Arsip Surat</span>
                  <span class="info-box-number text-2xl font-bold text-slate-800 mt-1" id="totalSurat">0</span>
                </div>
              </div>
            </div>

            <div class="col-lg-3 col-sm-6 col-12">
              <div class="info-box bg-white flex items-center p-4 border border-slate-200 cursor-pointer" onclick="switchKePortalWarga()">
                <span class="info-box-icon bg-indigo-500 text-white rounded-xl flex items-center justify-center w-14 h-14 shadow-md shadow-indigo-500/20">
                  <i class="fas fa-globe text-xl"></i>
                </span>
                <div class="info-box-content ml-4">
                  <span class="info-box-text text-sm font-semibold text-slate-500 uppercase tracking-wider">Portal Warga</span>
                  <span class="info-box-number text-xs font-bold text-indigo-600 mt-2 flex items-center gap-1">
                    <span>Akses Mandiri</span>
                    <i class="fas fa-external-link-alt text-[9px]"></i>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="row mt-4">
            <div class="col-12">
              <div class="card p-6 border border-slate-200">
                <h3 class="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <i class="fas fa-info-circle text-blue-500"></i>
                  <span>Alur Pelayanan Pembuatan Surat</span>
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-slate-600 mt-2">
                  <div class="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div class="font-bold text-blue-600 mb-1">1. Cari Data Penduduk / Permintaan</div>
                    <span>Periksa data di tab "Data Penduduk" atau tinjau menu "Permintaan Surat Mandiri" untuk pengajuan warga secara daring.</span>
                  </div>
                  <div class="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div class="font-bold text-blue-600 mb-1">2. Lengkapi Form Variabel</div>
                    <span>Pilih jenis template surat serta Pejabat Penandatangan. Isi parameter dinamis secara instan dan otomatis sesuai template terpilih.</span>
                  </div>
                  <div class="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div class="font-bold text-blue-600 mb-1">3. Generate Berkas PDF</div>
                    <span>Sistem akan menduplikasi Google Doc template, memproses teks bracket, mengekspornya ke format PDF, dan menyimpan riwayat berkas.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      amankanPanggilanGAS('getDashboardStats')
        .then(function (stats) {
          const elPenduduk = document.getElementById('totalPenduduk');
          if (elPenduduk) elPenduduk.innerText = (stats.totalPenduduk || 0).toLocaleString('id-ID');

          const elSurat = document.getElementById('totalSurat');
          if (elSurat) elSurat.innerText = (stats.totalSurat || 0).toLocaleString('id-ID');

          const elPermintaan = document.getElementById('totalPermintaan');
          if (elPermintaan) elPermintaan.innerText = (stats.totalPermintaan || 0).toLocaleString('id-ID');
        })
        .catch(function (err) {
          console.error("Gagal memuat statistik dashboard:", err);
        });
    }

    function loadPenduduk() {
      setActiveNav('nav-penduduk');
      currentPage = 1;

      document.getElementById('content').innerHTML = `
        <div class="card border border-slate-200 fade-in">
          <div class="card-header bg-white border-b border-slate-200 py-4 px-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div class="flex items-center gap-3">
              <div class="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0 flex items-center justify-center">
                <i class="fas fa-users text-xl"></i>
              </div>
              <div>
                <div class="flex items-center gap-2 flex-wrap">
                  <h1 class="text-lg font-bold text-slate-800 tracking-tight m-0 p-0">Manajemen Data Penduduk</h1>
                  <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800 shrink-0 uppercase tracking-wider">Kelola</span>
                </div>
                <p class="text-xs text-slate-500 mt-0.5">Informasi data kependudukan Desa Tegalsari.</p>
              </div>
            </div>
            
            <div class="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <button onclick="modalTambahPenduduk()" class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5 px-4 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2">
                <i class="fas fa-plus"></i>
                <span>Tambah Penduduk</span>
              </button>
              <div class="relative w-full max-w-xs">
                <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                  <i class="fas fa-search text-xs"></i>
                </span>
                <input type="text" id="searchPenduduk" onkeyup="filterPenduduk()" class="w-full pl-10 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400" placeholder="Cari NIK atau Nama...">
              </div>
            </div>
          </div>

          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table min-w-full text-left border-collapse">
                <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] font-semibold uppercase tracking-wider">
                  <tr>
                    <th class="p-4 text-center w-12">No</th>
                    <th class="p-4">NIK</th>
                    <th class="p-4">Nama Lengkap</th>
                    <th class="p-4">Tempat, Tgl Lahir</th>
                    <th class="p-4">L/P</th>
                    <th class="p-4">Agama</th>
                    <th class="p-4 text-center">RT/RW</th>
                    <th class="p-4 text-center w-36">Aksi</th>
                  </tr>
                </thead>
                <tbody id="tbodyPenduduk" class="divide-y divide-slate-100 text-xs text-slate-700">
                  <tr>
                    <td colspan="8" class="text-center py-10 text-slate-400">
                      <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mb-2"></div>
                      <p>Membuka database kependudukan...</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div id="pagination" class="py-4 px-6 border-t border-slate-100 flex justify-between items-center bg-slate-50/50"></div>
          </div>
        </div>
      `;

      if (dataPendudukGlobal && dataPendudukGlobal.length > 0) {
        dataPendudukFiltered = dataPendudukGlobal;
        tampilPenduduk(dataPendudukFiltered);
      } else {
        amankanPanggilanGAS('getPenduduk')
          .then(function (data) {
            dataPendudukGlobal = data || [];
            dataPendudukFiltered = data || [];
            tampilPenduduk(dataPendudukFiltered);
          })
          .catch(function (err) {
            Swal.fire({ icon: 'error', title: 'Gagal Memuat', text: err.message });
          });
      }
    }

    function tampilPenduduk(data) {
      const tbody = document.getElementById('tbodyPenduduk');
      if (!tbody) return; // Safety Guard

      if (!Array.isArray(data)) {
        data = [];
      }

      if (data.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" class="text-center py-10 text-slate-400">
              <i class="fas fa-folder-open text-4xl mb-3 block text-slate-300"></i>
              <span>Belum ada data penduduk yang ditemukan.</span>
            </td>
          </tr>
        `;
        const pag = document.getElementById('pagination');
        if (pag) pag.innerHTML = '';
        return;
      }

      const start = (currentPage - 1) * perPage;
      const end = start + perPage;
      const pageData = data.slice(start, end);

      let html = '';
      pageData.forEach((d, i) => {
        const indexNo = start + i + 1;
        const shortGender = d.jk === 'Laki-Laki' ? 'L' : 'P';
        html += `
          <tr class="hover:bg-slate-50/70 transition-colors">
            <td class="p-4 text-center font-medium text-slate-400">${indexNo}</td>
            <td class="p-4">
              <div class="font-mono font-semibold text-slate-800">${d.nik}</div>
              <div class="text-[10px] text-slate-400 font-mono font-semibold">KK: ${d.no_kk || '-'}</div>
            </td>
            <td class="p-4">
              <div class="font-bold text-slate-900">${d.nama}</div>
              <div class="text-[10px] text-slate-400 font-medium">${d.pekerjaan || '-'} | Pend: <span class="font-semibold text-slate-600">${d.pendidikan || '-'}</span></div>
            </td>
            <td class="p-4">${d.tempat_lahir}, ${d.tanggal_lahir}</td>
            <td class="p-4">
              <span class="px-2 py-0.5 rounded font-bold text-[10px] ${shortGender === 'L' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}">${shortGender}</span>
            </td>
            <td class="p-4 text-slate-600">${d.agama}</td>
            <td class="p-4 text-center font-semibold text-slate-600">${d.rt}/${d.rw}</td>
            <td class="p-4 text-center">
              <div class="inline-flex gap-1.5">
                <button onclick="editPenduduk('${d.nik}')" class="bg-amber-500 hover:bg-amber-600 text-white rounded p-1.5 transition-colors" title="Edit Data">
                  <i class="fas fa-edit text-xs"></i>
                </button>
                <button onclick="hapusPenduduk('${d.nik}')" class="bg-red-500 hover:bg-red-600 text-white rounded p-1.5 transition-colors" title="Hapus Data">
                  <i class="fas fa-trash-alt text-xs"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      });

      tbody.innerHTML = html;
      buatPagination(data.length);
    }

    function buatPagination(totalData) {
      const pagElement = document.getElementById('pagination');
      if (!pagElement) return; // Safety Guard

      const totalPage = Math.ceil(totalData / perPage) || 1;

      let html = `
        <span class="text-xs text-slate-500 font-medium">
          Halaman <strong class="text-slate-700">${currentPage}</strong> dari <strong class="text-slate-700">${totalPage}</strong> (${totalData} Jiwa)
        </span>
        <div class="flex gap-1.5">
          <button class="bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 px-3 py-1 rounded text-xs transition-colors" ${currentPage === 1 ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''} onclick="gantiHalaman(${currentPage - 1})">
            Sebelumnya
          </button>
          <button class="bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 px-3 py-1 rounded text-xs transition-colors" ${currentPage === totalPage ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''} onclick="gantiHalaman(${currentPage + 1})">
            Selanjutnya
          </button>
        </div>
      `;
      pagElement.innerHTML = html;
    }

    function modalTambahPenduduk() {
      const modalHtml = `
        <div class="modal fade" id="modalTambah" tabindex="-1" role="dialog" aria-hidden="true">
          <div class="modal-dialog modal-lg modal-dialog-centered" role="document">
            <div class="modal-content overflow-hidden rounded-xl border-0 shadow-2xl">
              <div class="modal-header bg-blue-600 text-white p-4">
                <h5 class="modal-title font-bold text-base flex items-center gap-2">
                  <i class="fas fa-user-plus"></i>
                  <span>Tambah Data Penduduk Baru</span>
                </h5>
                <button type="button" class="close text-white opacity-85 hover:opacity-100" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div class="modal-body p-6 bg-slate-50">
                <div class="row">
                  <div class="col-md-6 form-group">
                    <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">No. KK (16 Digit)</label>
                    <input type="text" id="tambah_no_kk" oninput="this.value = this.value.replace(/[^0-9]/g, '')" class="form-control rounded-lg text-sm" placeholder="Masukkan 16 digit No. KK">
                  </div>
                  <div class="col-md-6 form-group">
                    <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">NIK (16 Digit)</label>
                    <input type="text" id="tambah_nik" oninput="this.value = this.value.replace(/[^0-9]/g, '')" class="form-control rounded-lg text-sm" placeholder="Masukkan 16 digit NIK">
                  </div>
                  <div class="col-md-6 form-group">
                    <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Nama Lengkap</label>
                    <input type="text" id="tambah_nama" class="form-control rounded-lg text-sm" placeholder="Nama sesuai KTP">
                  </div>
                  <div class="col-md-6 form-group">
                    <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Pendidikan Terakhir</label>
                    <select id="tambah_pendidikan" class="form-control rounded-lg text-sm">
                      <option value="">-- Pilih Pendidikan Terakhir --</option>
                      <option value="Tidak Sekolah">Tidak / Belum Sekolah</option>
                      <option value="SD">SD / Sederajat</option>
                      <option value="SMP">SMP / Sederajat</option>
                      <option value="SMA">SMA / Sederajat</option>
                      <option value="D1">D1</option>
                      <option value="D2">D2</option>
                      <option value="D3">D3</option>
                      <option value="D4 / S1">D4 / S1</option>
                      <option value="S2">S2</option>
                      <option value="S3">S3</option>
                    </select>
                  </div>
                  <div class="col-md-6 form-group">
                    <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Tempat Lahir</label>
                    <input type="text" id="tambah_tempat" class="form-control rounded-lg text-sm" placeholder="Kota / Kabupaten">
                  </div>
                  <div class="col-md-6 form-group">
                    <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Tanggal Lahir</label>
                    <input type="date" id="tambah_tanggal" class="form-control rounded-lg text-sm">
                  </div>
                  <div class="col-md-6 form-group">
                    <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Jenis Kelamin</label>
                    <select id="tambah_jk" class="form-control rounded-lg text-sm">
                      <option value="">-- Pilih Jenis Kelamin --</option>
                      <option value="Laki-Laki">Laki-Laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                  </div>
                  <div class="col-md-6 form-group">
                    <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Kewarganegaraan</label>
                    <input type="text" id="tambah_kewarganegaraan" class="form-control rounded-lg text-sm" value="Indonesia">
                  </div>
                  <div class="col-md-6 form-group">
                    <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Agama</label>
                    <select id="tambah_agama" class="form-control rounded-lg text-sm">
                      <option value="">-- Pilih Agama --</option>
                      <option value="Islam">Islam</option>
                      <option value="Kristen">Kristen</option>
                      <option value="Katolik">Katolik</option>
                      <option value="Hindu">Hindu</option>
                      <option value="Budha">Budha</option>
                      <option value="Konghucu">Konghucu</option>
                    </select>
                  </div>
                  <div class="col-md-6 form-group">
                    <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Status Pernikahan</label>
                    <input type="text" id="tambah_status" class="form-control rounded-lg text-sm" placeholder="Belum Kawin / Kawin">
                  </div>
                  <div class="col-md-6 form-group">
                    <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Pekerjaan</label>
                    <input type="text" id="tambah_pekerjaan" class="form-control rounded-lg text-sm" placeholder="Pekerjaan Susuai KTP">
                  </div>
                  <div class="col-md-6 form-group">
                    <div class="row">
                      <div class="col-6">
                        <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">RT</label>
                        <input type="text" id="tambah_rt" class="form-control rounded-lg text-sm" placeholder="Contoh: 001">
                      </div>
                      <div class="col-6">
                        <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">RW</label>
                        <input type="text" id="tambah_rw" class="form-control rounded-lg text-sm" placeholder="Contoh: 002">
                      </div>
                    </div>
                  </div>
                  <div class="col-md-12 form-group">
                    <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Alamat Domisili</label>
                    <textarea id="tambah_alamat" class="form-control rounded-lg text-sm" rows="2" placeholder="Nama Dusun"></textarea>
                  </div>
                </div>
              </div>
              <div class="modal-footer bg-white p-4 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" class="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs py-2 px-4 rounded-lg transition-colors" data-dismiss="modal">Batal</button>
                <button type="button" onclick="simpanPendudukBaru()" class="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2 px-4 rounded-lg shadow-sm transition-colors flex items-center gap-1.5">
                  <i class="fas fa-save"></i> Simpan Data
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      const container = document.getElementById('modalContainer');
      if (container) {
        container.innerHTML = modalHtml;
        $('#modalTambah').modal('show');
      }
    }

    function simpanPendudukBaru() {
      const data = {
        nik: document.getElementById('tambah_nik').value.trim(),
        no_kk: document.getElementById('tambah_no_kk').value.trim(),
        nama: document.getElementById('tambah_nama').value.trim(),
        pendidikan: document.getElementById('tambah_pendidikan').value,
        tempat_lahir: document.getElementById('tambah_tempat').value.trim(),
        tanggal_lahir: document.getElementById('tambah_tanggal').value,
        jk: document.getElementById('tambah_jk').value,
        kewarganegaraan: document.getElementById('tambah_kewarganegaraan').value.trim(),
        agama: document.getElementById('tambah_agama').value,
        status: document.getElementById('tambah_status').value.trim(),
        pekerjaan: document.getElementById('tambah_pekerjaan').value.trim(),
        alamat: document.getElementById('tambah_alamat').value.trim(),
        rt: document.getElementById('tambah_rt').value.trim(),
        rw: document.getElementById('tambah_rw').value.trim()
      };

      if (!data.nik || !data.no_kk || !data.nama || !data.jk || !data.rt || !data.rw) {
        Swal.fire({ icon: 'warning', title: 'Data Belum Lengkap', text: 'No. KK, NIK, Nama Lengkap, Gender, serta RT/RW wajib ditentukan.' });
        return;
      }

      Swal.fire({ title: 'Menyimpan...', text: 'Mengunggah data baru ke server', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

      amankanPanggilanGAS('simpanPenduduk', data)
        .then(function () {
          Swal.close();
          dataPendudukGlobal = []; // Invalidate cache
          $('#modalTambah').modal('hide');
          Swal.fire({ icon: 'success', title: 'Sukses', text: 'Warga baru berhasil didaftarkan!', timer: 1500, showConfirmButton: false });
          loadPenduduk();
        })
        .catch(function (err) {
          Swal.fire({ icon: 'error', title: 'Gagal Menyimpan', text: err.message });
        });
    }

    function editPenduduk(nik) {
      Swal.fire({ title: 'Mengunduh data...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

      amankanPanggilanGAS('getPendudukByNik', nik)
        .then(function (data) {
          Swal.close();
          if (!data) return;

          const modalHtml = `
            <div class="modal fade" id="modalEdit" tabindex="-1" role="dialog" aria-hidden="true">
              <div class="modal-dialog modal-lg modal-dialog-centered" role="document">
                <div class="modal-content overflow-hidden rounded-xl border-0 shadow-2xl">
                  <div class="modal-header bg-amber-500 text-white p-4">
                    <h5 class="modal-title font-bold text-base flex items-center gap-2">
                      <i class="fas fa-edit"></i>
                      <span>Perbarui Data Penduduk</span>
                    </h5>
                    <button type="button" class="close text-white opacity-85 hover:opacity-100" data-dismiss="modal" aria-label="Close">
                      <span aria-hidden="true">&times;</span>
                    </button>
                  </div>
                  <div class="modal-body p-6 bg-slate-50">
                    <div class="row">
                      <div class="col-md-6 form-group">
                        <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">No. KK (16 Digit)</label>
                        <input type="text" id="edit_no_kk" oninput="this.value = this.value.replace(/[^0-9]/g, '')" class="form-control rounded-lg text-sm" value="${data.no_kk || ''}" placeholder="Masukkan 16 digit No. KK">
                      </div>
                      <div class="col-md-6 form-group">
                        <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">NIK (Kunci Akses Utama)</label>
                        <input type="text" id="edit_nik" class="form-control rounded-lg text-sm bg-slate-200" value="${data.nik}" readonly>
                      </div>
                      <div class="col-md-6 form-group">
                        <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Nama Lengkap</label>
                        <input type="text" id="edit_nama" class="form-control rounded-lg text-sm" value="${data.nama}">
                      </div>
                      <div class="col-md-6 form-group">
                        <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Pendidikan Terakhir</label>
                        <select id="edit_pendidikan" class="form-control rounded-lg text-sm">
                          <option value="" ${!data.pendidikan ? 'selected' : ''}>-- Pilih Pendidikan Terakhir --</option>
                          <option value="Tidak Sekolah" ${data.pendidikan === 'Tidak Sekolah' ? 'selected' : ''}>Tidak / Belum Sekolah</option>
                          <option value="SD" ${data.pendidikan === 'SD' ? 'selected' : ''}>SD / Sederajat</option>
                          <option value="SMP" ${data.pendidikan === 'SMP' ? 'selected' : ''}>SMP / Sederajat</option>
                          <option value="SMA" ${data.pendidikan === 'SMA' ? 'selected' : ''}>SMA / Sederajat</option>
                          <option value="D1" ${data.pendidikan === 'D1' ? 'selected' : ''}>D1</option>
                          <option value="D2" ${data.pendidikan === 'D2' ? 'selected' : ''}>D2</option>
                          <option value="D3" ${data.pendidikan === 'D3' ? 'selected' : ''}>D3</option>
                          <option value="D4 / S1" ${data.pendidikan === 'D4 / S1' ? 'selected' : ''}>D4 / S1</option>
                          <option value="S2" ${data.pendidikan === 'S2' ? 'selected' : ''}>S2</option>
                          <option value="S3" ${data.pendidikan === 'S3' ? 'selected' : ''}>S3</option>
                        </select>
                      </div>
                      <div class="col-md-6 form-group">
                        <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Tempat Lahir</label>
                        <input type="text" id="edit_tempat" class="form-control rounded-lg text-sm" value="${data.tempat_lahir}">
                      </div>
                      <div class="col-md-6 form-group">
                        <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Tanggal Lahir</label>
                        <input type="text" id="edit_tanggal" class="form-control rounded-lg text-sm" value="${data.tanggal_lahir}">
                      </div>
                      <div class="col-md-6 form-group">
                        <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Jenis Kelamin</label>
                        <select id="edit_jk" class="form-control rounded-lg text-sm">
                          <option value="Laki-Laki" ${data.jk === 'Laki-Laki' ? 'selected' : ''}>Laki-Laki</option>
                          <option value="Perempuan" ${data.jk === 'Perempuan' ? 'selected' : ''}>Perempuan</option>
                        </select>
                      </div>
                      <div class="col-md-6 form-group">
                        <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Kewarganegaraan</label>
                        <input type="text" id="edit_kewarganegaraan" class="form-control rounded-lg text-sm" value="${data.kewarganegaraan}">
                      </div>
                      <div class="col-md-6 form-group">
                        <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Agama</label>
                        <select id="edit_agama" class="form-control rounded-lg text-sm">
                          <option value="Islam" ${data.agama === 'Islam' ? 'selected' : ''}>Islam</option>
                          <option value="Kristen" ${data.agama === 'Kristen' ? 'selected' : ''}>Kristen</option>
                          <option value="Katolik" ${data.agama === 'Katolik' ? 'selected' : ''}>Katolik</option>
                          <option value="Hindu" ${data.agama === 'Hindu' ? 'selected' : ''}>Hindu</option>
                          <option value="Budha" ${data.agama === 'Budha' ? 'selected' : ''}>Budha</option>
                          <option value="Konghucu" ${data.agama === 'Konghucu' ? 'selected' : ''}>Konghucu</option>
                        </select>
                      </div>
                      <div class="col-md-6 form-group">
                        <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Status</label>
                        <input type="text" id="edit_status" class="form-control rounded-lg text-sm" value="${data.status}">
                      </div>
                      <div class="col-md-6 form-group">
                        <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Pekerjaan</label>
                        <input type="text" id="edit_pekerjaan" class="form-control rounded-lg text-sm" value="${data.pekerjaan}">
                      </div>
                      <div class="col-md-6 form-group">
                        <div class="row">
                          <div class="col-6">
                            <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">RT</label>
                            <input type="text" id="edit_rt" class="form-control rounded-lg text-sm" value="${data.rt}">
                          </div>
                          <div class="col-6">
                            <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">RW</label>
                            <input type="text" id="edit_rw" class="form-control rounded-lg text-sm" value="${data.rw}">
                          </div>
                        </div>
                      </div>
                      <div class="col-md-12 form-group">
                        <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Alamat Domisili</label>
                        <textarea id="edit_alamat" class="form-control rounded-lg text-sm" rows="2">${data.alamat}</textarea>
                      </div>
                    </div>
                  </div>
                  <div class="modal-footer bg-white p-4 flex justify-end gap-2 border-t border-slate-100">
                    <button type="button" class="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs py-2 px-4 rounded-lg transition-colors" data-dismiss="modal">Batal</button>
                    <button type="button" onclick="prosesUpdatePenduduk()" class="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs py-2 px-4 rounded-lg shadow-sm transition-colors flex items-center gap-1.5">
                      <i class="fas fa-sync"></i> Perbarui Data
                    </button>
                  </div>
                </div>
              </div>
            </div>
          `;

          const container = document.getElementById('modalContainer');
          if (container) {
            container.innerHTML = modalHtml;
            $('#modalEdit').modal('show');
          }
        })
        .catch(function (err) {
          Swal.fire({ icon: 'error', title: 'Terjadi Masalah', text: err.message });
        });
    }

    function prosesUpdatePenduduk() {
      const data = {
        nik: document.getElementById('edit_nik').value,
        no_kk: document.getElementById('edit_no_kk').value.trim(),
        nama: document.getElementById('edit_nama').value,
        pendidikan: document.getElementById('edit_pendidikan').value,
        tempat_lahir: document.getElementById('edit_tempat').value,
        tanggal_lahir: document.getElementById('edit_tanggal').value,
        jk: document.getElementById('edit_jk').value,
        kewarganegaraan: document.getElementById('edit_kewarganegaraan').value,
        agama: document.getElementById('edit_agama').value,
        status: document.getElementById('edit_status').value,
        pekerjaan: document.getElementById('edit_pekerjaan').value,
        alamat: document.getElementById('edit_alamat').value,
        rt: document.getElementById('edit_rt').value,
        rw: document.getElementById('edit_rw').value
      };

      if (!data.no_kk) {
        Swal.fire({ icon: 'warning', title: 'Data Belum Lengkap', text: 'No. KK wajib diisi.' });
        return;
      }

      Swal.fire({ title: 'Memproses...', text: 'Mengunggah data terbaru ke Google Sheets', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

      amankanPanggilanGAS('updatePenduduk', data)
        .then(function () {
          Swal.close();
          dataPendudukGlobal = []; // Invalidate cache
          $('#modalEdit').modal('hide');
          Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Data warga berhasil diperbarui!', timer: 1500, showConfirmButton: false });
          loadPenduduk();
        })
        .catch(function (err) {
          Swal.fire({ icon: 'error', title: 'Gagal', text: err.message });
        });
    }

    function hapusPenduduk(nik) {
      Swal.fire({
        title: 'Hapus Data Penduduk?',
        text: 'Data NIK ' + nik + ' akan dihapus permanen dari sistem.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Ya, Hapus',
        cancelButtonText: 'Batal'
      }).then((result) => {
        if (result.isConfirmed) {
          Swal.fire({ title: 'Menghapus data...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
          amankanPanggilanGAS('hapusPenduduk', nik)
            .then(function () {
              Swal.close();
              dataPendudukGlobal = []; // Invalidate cache
              loadPenduduk();
              Swal.fire({ icon: 'success', title: 'Berhasil Dihapus', timer: 1200, showConfirmButton: false });
            })
            .catch(function (err) {
              Swal.close();
              Swal.fire({ icon: 'error', title: 'Gagal Menghapus', text: err.message });
            });
        }
      });
    }

    function buatSurat(prefillData = null) {
      setActiveNav('nav-buat-surat');
      currentCitizenData = null;
      currentSelectedTemplate = null;
      if (!prefillData) {
        sessionStorage.removeItem('active_processing_request_foto_wajah');
        sessionStorage.removeItem('active_processing_request_foto_ktp');
      }

      document.getElementById('content').innerHTML = `
        <div class="card border border-slate-200 fade-in">
          <div class="card-header bg-white border-b border-slate-200 py-4 px-6">
            <h3 class="card-title text-lg font-bold text-slate-800 flex items-center gap-2">
              <i class="fas fa-file-signature text-blue-500"></i>
              <span>Proses Pembuatan Berkas Surat Baru</span>
            </h3>
          </div>

          <div class="card-body p-6">
            <!-- Tiga Kolom Parameter Utama -->
            <div class="row">
              <div class="col-md-4 form-group">
                <label class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Langkah 1: Verifikasi NIK Warga</label>
                <div class="input-group">
                  <input type="text" id="cariNikSurat" oninput="this.value = this.value.replace(/[^0-9]/g, '')" class="form-control rounded-l-lg text-sm" placeholder="Masukkan 16 Digit NIK">
                  <div class="input-group-append">
                    <button class="btn btn-primary px-3 rounded-r-lg bg-blue-600 hover:bg-blue-700 font-medium text-xs flex items-center gap-1.5" onclick="cariPendudukSurat()">
                      <i class="fas fa-search"></i>
                      <span>Verifikasi</span>
                    </button>
                  </div>
                </div>
              </div>

              <div class="col-md-4 form-group">
                <label class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Langkah 2: Pilih Jenis Surat</label>
                <div class="relative w-full" id="jenisSuratWrapper">
                  <button id="jenisSuratBtn" onclick="toggleCustomDropdown('jenisSuratDropdown')" class="w-full flex items-center justify-between bg-white border border-slate-300 text-slate-700 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-blue-500">
                    <span id="jenisSuratSelected">-- Pilih Jenis Surat --</span>
                    <i class="fas fa-chevron-down text-xs text-slate-400"></i>
                  </button>
                  <input type="hidden" id="jenisSurat" value="" onchange="loadFieldsSurat()">
                  
                  <div id="jenisSuratDropdown" class="hidden absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 p-2">
                    <input type="text" onkeyup="filterCustomDropdown('jenisSuratDropdown', this.value)" class="w-full border border-slate-300 rounded-md py-1.5 px-3 text-xs mb-2 focus:outline-none focus:border-blue-500" placeholder="Cari jenis surat...">
                    <ul id="jenisSuratList" class="max-h-60 overflow-y-auto text-xs text-slate-700 divide-y divide-slate-100">
                    </ul>
                  </div>
                </div>
              </div>

              <div class="col-md-4 form-group">
                <label class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Langkah 3: Pejabat Penandatangan</label>
                <select id="pejabatSurat" onchange="updateLivePreview()" onkeyup="updateLivePreview()" onclick="updateLivePreview()" class="form-control rounded-lg text-sm">
                  <option value="">Selesaikan Langkah 1...</option>
                </select>
              </div>
            </div>

            <!-- Layout Utama: Form & Preview di Bawahnya -->
            <div class="row mt-4">
              <!-- KOLOM FORMULIR PENGISIAN (Full Width) -->
              <div class="col-12 space-y-4">
                <div id="hasilCariPenduduk" class="mt-2"></div>
                <div id="dynamicFields" class="mt-4"></div>
                
                <div class="pt-6 border-t border-slate-100">
                  <button onclick="prosesBuatSurat()" id="btnBuatPdf" disabled class="w-full bg-slate-400 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all flex items-center justify-center gap-2 cursor-not-allowed">
                    <i class="fas fa-file-pdf"></i>
                    <span>Proses & Terbit PDF</span>
                  </button>
                </div>
              </div>

              <!-- KOLOM LIVE PREVIEW SURAT (Full Width di Bawah Form) -->
              <div class="col-12 mt-6">
                <div class="bg-slate-100 p-6 rounded-2xl border border-slate-200 flex flex-col items-center">
                  <div class="w-full flex items-center justify-between mb-4 px-1">
                    <span class="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                      <i class="fas fa-eye text-blue-500"></i> Live Preview Surat Resmi (Simulasi)
                    </span>
                    <span class="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider">A4 Format</span>
                  </div>
                  
                  <!-- LEMBAR KERTAS A4 SIMULASI -->
                  <div id="live_preview_paper" class="bg-slate-50 w-full max-w-[860px] shadow-inner border border-slate-200 rounded-md relative">
                    <div id="live_preview_status" class="hidden absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full bg-blue-600/90 text-white text-[10px] font-bold uppercase tracking-wider shadow">
                      Memuat pratinjau...
                    </div>
                    <div id="live_preview_frame_wrap" class="w-full overflow-auto rounded-md" style="max-height: 85vh;">
                      <div class="flex flex-col items-center justify-center py-32 text-slate-400 text-center px-6 min-h-[960px]">
                        <i class="fas fa-file-invoice text-5xl text-slate-300 mb-4 animate-pulse"></i>
                        <h5 class="text-sm font-bold text-slate-700">Belum Ada Template Terpilih</h5>
                        <p class="text-xs text-slate-400 mt-2 max-w-sm leading-relaxed">
                          Silakan pilih Jenis Surat di Langkah 2 untuk melihat pratinjau surat resmi di sini.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      amankanPanggilanGAS('getTemplateSurat')
        .then(function (data) {
          currentTemplatesGlobal = data || [];
          const sList = document.getElementById('jenisSuratList');
          if (!sList) return;

          let html = '';
          data.forEach(s => {
            html += `<li onclick="selectCustomDropdownOption('jenisSurat', '${escJS(s.kode)}', '${escJS(s.jenis)}')" class="p-2 hover:bg-blue-50 hover:text-blue-700 rounded cursor-pointer transition-colors" data-search="${s.jenis.toLowerCase()}">${s.jenis}</li>`;
          });
          sList.innerHTML = html;

          if (prefillData) {
            const inputNik = document.getElementById('cariNikSurat');
            if (inputNik) inputNik.value = prefillData.nik;
            cariPendudukSurat(() => {
              const matchingSurat = data.find(s => s.kode === prefillData.kode_surat);
              if (matchingSurat) {
                selectCustomDropdownOption('jenisSurat', prefillData.kode_surat, matchingSurat.jenis);
              }
              loadFieldsSurat(() => {
                for (const key in prefillData.data_tambahan) {
                  const input = document.querySelector(`.field-surat[data-field="${key}"]`);
                  if (input) input.value = prefillData.data_tambahan[key];
                }
              });
            });
          }
        });

      amankanPanggilanGAS('getPejabat')
        .then(function (data) {
          const selectPejabat = document.getElementById('pejabatSurat');
          if (!selectPejabat) return;

          let html = '<option value="">-- Pilih Pejabat Penandatangan --</option>';
          data.forEach(p => {
            html += `<option value="${p.kode}">${p.nama} - ${p.jabatan} (${p.nip || '-'})</option>`;
          });
          selectPejabat.innerHTML = html;

          // Prefill Pejabat if stored
          const prefillPejabat = sessionStorage.getItem('prefill_pejabat_kode');
          if (prefillPejabat) {
            selectPejabat.value = prefillPejabat;
            sessionStorage.removeItem('prefill_pejabat_kode');
          }
        });
    }

    function cariPendudukSurat(callback = null) {
      const nik = document.getElementById('cariNikSurat').value.trim();
      if (!nik) {
        Swal.fire({ icon: 'warning', title: 'Perhatian', text: 'Masukkan NIK pemohon terlebih dahulu.' });
        return;
      }

      const infoContainer = document.getElementById('hasilCariPenduduk');
      if (!infoContainer) return;

      infoContainer.innerHTML = `
        <div class="flex items-center justify-center p-6 bg-slate-50 rounded-lg border border-slate-200 mt-4">
          <div class="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2.5"></div>
          <span class="text-sm text-slate-500 font-medium">Memverifikasi kecocokan NIK dalam sistem...</span>
        </div>
      `;

      amankanPanggilanGAS('getPendudukByNik', nik)
        .then(function (data) {
          const container = document.getElementById('hasilCariPenduduk');
          if (!container) return; // Safety Guard

          if (!data) {
            currentCitizenData = null;
            container.innerHTML = `
              <div class="alert alert-danger bg-red-50 text-red-700 border border-red-200 rounded-lg p-4 mt-4 text-xs font-semibold flex items-center gap-2">
                <i class="fas fa-exclamation-triangle"></i>
                <span>NIK ${nik} tidak terdaftar di database. Silakan daftarkan warga tersebut di menu "Data Penduduk" terlebih dahulu.</span>
              </div>
            `;
            disableButtonBuatPdf(true);
            updateLivePreview();
            return;
          }

          currentCitizenData = data;
          
          const activeFotoWajah = sessionStorage.getItem('active_processing_request_foto_wajah');
          const activeFotoKtp = sessionStorage.getItem('active_processing_request_foto_ktp');
          let fotoHtml = '';
          if (activeFotoWajah || activeFotoKtp) {
            fotoHtml = `<div class="flex gap-2 shrink-0 flex-wrap">`;
            if (activeFotoWajah) {
              const thumb = getGoogleDriveThumbnail(activeFotoWajah);
              fotoHtml += `
                <div class="md:w-28 flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                  <span class="text-[9px] text-slate-400 font-bold mb-1.5 uppercase tracking-wider">Foto Wajah</span>
                  <img src="${thumb || activeFotoWajah}" class="w-20 h-20 object-cover rounded-md border border-slate-100 cursor-pointer hover:scale-[1.03] transition-transform" onclick="lihatFotoBesar('${activeFotoWajah}')" title="Klik untuk perbesar">
                </div>
              `;
            }
            if (activeFotoKtp) {
              const isPdf = activeFotoKtp.toLowerCase().includes('.pdf') || activeFotoKtp.includes('application/pdf');
              if (isPdf) {
                fotoHtml += `
                  <div class="md:w-28 flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                    <span class="text-[9px] text-slate-400 font-bold mb-1.5 uppercase tracking-wider">Berkas KTP</span>
                    <a href="${activeFotoKtp}" target="_blank" class="w-20 h-20 bg-slate-100 border border-slate-200 rounded-md flex flex-col items-center justify-center text-slate-500 hover:text-blue-600 transition-colors" title="Buka PDF KTP">
                      <i class="fas fa-file-pdf text-2xl mb-1 text-red-500"></i>
                      <span class="text-[9px] font-bold">BUKA PDF</span>
                    </a>
                  </div>
                `;
              } else {
                const thumbKtp = getGoogleDriveThumbnail(activeFotoKtp);
                fotoHtml += `
                  <div class="md:w-28 flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                    <span class="text-[9px] text-slate-400 font-bold mb-1.5 uppercase tracking-wider">Foto KTP</span>
                    <img src="${thumbKtp || activeFotoKtp}" class="w-20 h-20 object-cover rounded-md border border-slate-100 cursor-pointer hover:scale-[1.03] transition-transform" onclick="lihatFotoBesar('${activeFotoKtp}')" title="Klik untuk perbesar">
                  </div>
                `;
              }
            }
            fotoHtml += `</div>`;
          }

          container.innerHTML = `
            <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mt-4 fade-in flex flex-col md:flex-row gap-4 items-start">
              <div class="flex-grow">
                <h4 class="text-emerald-800 font-bold text-sm mb-3 flex items-center gap-2">
                  <i class="fas fa-check-circle text-emerald-500"></i>
                  <span>Identitas Pemohon Terverifikasi</span>
                </h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-4 text-xs text-slate-700">
                  <div><span class="text-slate-400">No. KK:</span> <strong class="font-mono text-slate-800">${data.no_kk || '-'}</strong></div>
                  <div><span class="text-slate-400">NIK:</span> <strong class="font-mono text-slate-800">${data.nik}</strong></div>
                  <div><span class="text-slate-400">Nama:</span> <strong class="text-slate-800">${data.nama}</strong></div>
                  <div><span class="text-slate-400">Pendidikan:</span> <strong class="text-slate-800">${data.pendidikan || '-'}</strong></div>
                  <div><span class="text-slate-400">Tempat, Tgl Lahir:</span> <strong class="text-slate-800">${data.tempat_lahir}, ${data.tanggal_lahir}</strong></div>
                  <div><span class="text-slate-400">Gender /Agama/Status:</span> <strong class="text-slate-800">${data.jk}/${data.agama}/${data.status}</strong></div>
                  <div><span class="text-slate-400">Alamat:</span> <strong class="text-slate-800">${data.alamat} (RT.${data.rt}/RW.${data.rw})</strong></div>
                  <div><span class="text-slate-400">Pekerjaan/Warga Negara:</span> <strong class="text-slate-800">${data.pekerjaan}/${data.kewarganegaraan}</strong></div>
                </div>
              </div>
              ${fotoHtml}
            </div>
          `;
          disableButtonBuatPdf(false);
          updateLivePreview();
          if (callback) callback();
        })
        .catch(function (err) {
          const container = document.getElementById('hasilCariPenduduk');
          if (container) container.innerHTML = `<div class="alert alert-danger mt-4 text-xs">${err.message}</div>`;
        });
    }

    function disableButtonBuatPdf(isDisabled) {
      const btn = document.getElementById('btnBuatPdf');
      if (!btn) return;
      if (isDisabled) {
        btn.disabled = true;
        btn.className = "bg-slate-400 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all flex items-center gap-2 cursor-not-allowed";
      } else {
        btn.disabled = false;
        btn.className = "bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer";
      }
    }

    function updateLivePreview() {
      const previewPaper = document.getElementById('live_preview_paper');
      if (!previewPaper) return;

      if (!currentTemplateRawText) {
        previewPaper.innerHTML = `
          <div class="flex flex-col items-center justify-center py-40 text-slate-400 text-center px-6">
            <i class="fas fa-file-invoice text-4xl text-slate-300 mb-3 animate-pulse"></i>
            <h5 class="text-xs font-bold text-slate-700">Belum Ada Template Terpilih</h5>
            <p class="text-[9px] text-slate-400 mt-1.5 max-w-xs leading-relaxed">
              Silakan pilih Jenis Surat di Langkah 2 untuk mengunduh format surat asli dari Google Docs secara otomatis dan melihat simulasinya di sini.
            </p>
          </div>
        `;
        return;
      }

      // 1. Ambil teks HTML template
      let outputText = currentTemplateRawText;

      // Standarkan kurung siku dari format HTML entities (misal: &#91; -> [)
      outputText = outputText
        .replace(/(&#91;|&lbrack;|&lsqb;)/g, '[')
        .replace(/(&#93;|&rbrack;|&rsqb;)/g, ']');

      // Bersihkan tag HTML di dalam kurung siku (misal: [<span...>TEXT</span>] menjadi [TEXT])
      // agar tidak merusak pencarian regex placeholder
      outputText = outputText.replace(/\[([^\]]+)\]/g, (match, p1) => {
        const cleanContent = p1.replace(/<[^>]+>/g, '');
        return `[${cleanContent}]`;
      });

      // 2. Siapkan Pemetaan Data Penduduk
      const dataMapping = {
        'nik': '-',
        'nama': '-',
        'tempat_lahir': '-',
        'tanggal_lahir': '-',
        'jk': '-',
        'kewarganegaraan': '-',
        'agama': '-',
        'status': '-',
        'pekerjaan': '-',
        'alamat': '-',
        'rt': '-',
        'rw': '-',
        'no_kk': '-',
        'pendidikan': '-'
      };

      if (currentCitizenData) {
        dataMapping['nik'] = currentCitizenData.nik || '-';
        dataMapping['nama'] = currentCitizenData.nama || '-';
        dataMapping['tempat_lahir'] = currentCitizenData.tempat_lahir || '-';
        dataMapping['tanggal_lahir'] = currentCitizenData.tanggal_lahir || '-';
        dataMapping['jk'] = currentCitizenData.jk || '-';
        dataMapping['kewarganegaraan'] = currentCitizenData.kewarganegaraan || '-';
        dataMapping['agama'] = currentCitizenData.agama || '-';
        dataMapping['status'] = currentCitizenData.status || '-';
        dataMapping['pekerjaan'] = currentCitizenData.pekerjaan || '-';
        dataMapping['alamat'] = `${currentCitizenData.alamat || '-'} RT. ${currentCitizenData.rt || '000'} RW. ${currentCitizenData.rw || '000'}`;
        dataMapping['rt'] = currentCitizenData.rt || '-';
        dataMapping['rw'] = currentCitizenData.rw || '-';
        dataMapping['no_kk'] = currentCitizenData.no_kk || '-';
        dataMapping['pendidikan'] = currentCitizenData.pendidikan || '-';
      }

      // Ganti Placeholder Penduduk
      for (const [key, value] of Object.entries(dataMapping)) {
        const regex = new RegExp('\\[' + key + '\\]', 'gi');
        outputText = outputText.replace(regex, () => value);
      }

      // 3. Ganti Parameter Isian Dinamis dari Form Kiri
      const inputs = document.querySelectorAll('.field-surat');

      // Tampilkan log debug di Developer Console (F12)
      console.log("[DEBUG PREVIEW] Fields from form:", Array.from(inputs).map(i => i.dataset.field));
      const foundPlaceholders = outputText.match(/\[[^\]]+\]/g) || [];
      console.log("[DEBUG PREVIEW] Placeholders found in doc (cleaned):", foundPlaceholders);

      inputs.forEach(input => {
        const fieldName = input.dataset.field;
        const val = input.value.trim() || `<span style="color: #2563eb; font-weight: bold; text-decoration: underline; background-color: #eff6ff; padding: 0 4px; border-radius: 4px;">[${fieldName.toUpperCase()}]</span>`;
        const regex = new RegExp('\\[' + fieldName + '\\]', 'gi');
        outputText = outputText.replace(regex, () => val);
      });

      // 4. Ganti Nomor Surat Simulasi
      const selectJenis = document.getElementById('jenisSurat');
      const nomorSuratSimulasi = (selectJenis && selectJenis.value) ? `400.10.5.2/01/${selectJenis.value}/2026` : '[nomor_surat]';
      outputText = outputText.replace(/\[nomor_surat\]/gi, () => nomorSuratSimulasi);

      // 5. Ganti Tanggal Surat
      outputText = outputText.replace(/\[tanggal\]/gi, () => formatTanggalIndonesia(new Date()));

      // 6. Ganti Pejabat Penandatangan
      const selectPejabat = document.getElementById('pejabatSurat');
      let pejabatNama = '-';
      let pejabatNip = 'NIP. -';
      let pejabatJabatan = 'KEPALA DESA TEGALSARI';

      if (selectPejabat && selectPejabat.value) {
        const opt = selectPejabat.options[selectPejabat.selectedIndex];
        const fullText = opt.text;
        const parts = fullText.split(' - ');
        pejabatNama = parts[0];
        if (parts[1]) {
          const subParts = parts[1].split(' (');
          pejabatJabatan = subParts[0];
          if (subParts[1]) {
            pejabatNip = 'NIP. ' + subParts[1].replace(')', '');
          }
        }
      }

      outputText = outputText.replace(/\[nama_pejabat\]/gi, () => pejabatNama);
      outputText = outputText.replace(/\[nip_pejabat\]/gi, () => pejabatNip);
      outputText = outputText.replace(/\[jabatan_pejabat\]/gi, () => pejabatJabatan.toUpperCase());
      
      // Inject QR TTE dan tanda tangan dinamis (menggunakan SVG self-contained)
      const simulatedTteHtml = `<div style="position: relative; display: inline-flex; flex-direction: column; align-items: center; justify-content: center; margin: 4px 0; user-select: none; white-space: normal; vertical-align: middle;"><div style="width: 48px; height: 48px; border: 1px solid #e2e8f0; background-color: #f8fafc; border-radius: 4px; padding: 4px; display: flex; align-items: center; justify-content: center; opacity: 0.85; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="#64748b"><path d="M16 17v-1h-3v1h3zm0-3v-1h-3v1h3zm-5 3v-1H8v1h3zm0-3v-1H8v1h3zm9-9h-3V2H2v17h3v3h17V5h-2zm-3-1v1h1V4h-1zm1 3h-1v1h1V7zm-8 12H3V3h12v12h-2v-2h-3v3zm11 2H6v-2h13V6h3v15zm-5-8v-1h-3v1h3z"/></svg></div><span style="position: absolute; font-size: 6px; background-color: #d1fae5; color: #065f46; padding: 2px 4px; border-radius: 2px; font-weight: 800; transform: rotate(12deg); tracking-wider: 0.05em; text-transform: uppercase; border: 1px solid #a7f3d0; box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05); line-height: 1; margin-top: 4px;">SIMULASI TTE</span></div>`;
      outputText = outputText.replace(/\[ttd\]/gi, () => simulatedTteHtml);

      // 7. Inject HTML ke Iframe untuk isolasi CSS (dan perkecil konten 80% agar lebih besar dan jelas)
      previewPaper.innerHTML = `<iframe id="preview_iframe" style="width: 100%; height: 960px; border: 0; background: #f8fafc; border-radius: 8px;" srcdoc=""></iframe>`;
      const iframe = document.getElementById('preview_iframe');
      if (iframe) {
        const customStyle = `
          <style>
            body {
              zoom: 0.8 !important;
              background-color: #ffffff !important;
              margin: 15px auto !important;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
              border: 1px solid #e2e8f0 !important;
              box-sizing: border-box !important;
              max-width: 595pt !important;
            }
          </style>
        `;
        if (outputText.includes('</body>')) {
          outputText = outputText.replace('</body>', customStyle + '</body>');
        } else {
          outputText += customStyle;
        }
        iframe.srcdoc = outputText;
      }
    }

    function loadFieldsSurat(callback = null) {
      const kode = document.getElementById('jenisSurat').value;
      const container = document.getElementById('dynamicFields');
      if (!container) return;

      if (!kode) {
        container.innerHTML = '';
        currentTemplateRawText = "";
        updateLivePreview();
        return;
      }

      // Cari template_id dari list global
      const selectTemplate = currentTemplatesGlobal.find(t => t.kode.toUpperCase() === kode.toUpperCase());
      const templateId = selectTemplate ? selectTemplate.template_id : '';

      currentTemplateRawText = "";
      const previewPaper = document.getElementById('live_preview_paper');
      if (previewPaper) {
        previewPaper.innerHTML = `
          <div class="flex flex-col items-center justify-center py-64 text-slate-400">
            <div class="inline-block animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600 mb-4"></div>
            <p class="text-xs font-semibold tracking-wide">Mengunduh format asli dari Google Docs...</p>
          </div>
        `;
      }

      if (templateId) {
        amankanPanggilanGAS('getTemplateContent', templateId)
          .then(text => {
            currentTemplateRawText = text || "";
            updateLivePreview();
          })
          .catch(err => {
            console.error("Gagal memuat isi Docs: " + err.message);
            currentTemplateRawText = "";
            if (previewPaper) {
              previewPaper.innerHTML = `
                <div class="flex flex-col items-center justify-center py-48 text-red-500 text-center px-6 space-y-4">
                  <i class="fas fa-times-circle text-5xl text-red-400"></i>
                  <h5 class="text-sm font-bold">Gagal Mengunduh Dokumen Docs</h5>
                  <p class="text-xs text-slate-500 max-w-xs leading-relaxed">
                    Detail: <strong>${err.message}</strong>
                  </p>
                  <p class="text-xs text-blue-600 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100 max-w-sm leading-relaxed font-semibold">
                    *Tip: Pastikan Anda telah memperbarui kode Code.gs di Google Drive dan men-deploy-nya ke VERSI BARU.
                  </p>
                </div>
              `;
            }
          });
      } else {
        currentTemplateRawText = "";
        if (previewPaper) {
          previewPaper.innerHTML = `
            <div class="flex flex-col items-center justify-center py-48 text-amber-600 text-center px-6 space-y-4">
              <i class="fas fa-exclamation-triangle text-5xl text-amber-400 animate-bounce"></i>
              <h5 class="text-sm font-bold">ID Template Google Docs Kosong</h5>
              <p class="text-xs text-slate-500 max-w-sm leading-relaxed">
                Kode surat <strong class="font-mono text-slate-700 bg-slate-100 px-1 rounded">${kode}</strong> terdeteksi, tetapi kolom ketiga (ID Template) di sheet <strong class="text-slate-700">TemplateSurat</strong> kosong.
              </p>
              <p class="text-xs text-amber-800 bg-amber-50/50 p-2.5 rounded-lg border border-amber-100 max-w-sm leading-relaxed font-semibold">
                Silakan isi ID File Google Docs template Anda di Google Sheets terlebih dahulu.
              </p>
            </div>
          `;
        }
      }

      container.innerHTML = `
        <div class="flex items-center justify-center p-6">
          <div class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
          <span class="text-xs text-slate-500">Menganalisis parameter kustom template...</span>
        </div>
      `;

      amankanPanggilanGAS('getFieldsSurat', kode)
        .then(function (fields) {
          const targetContainer = document.getElementById('dynamicFields');
          if (!targetContainer) return; // Safety Guard

          if (!fields || fields.length === 0) {
            targetContainer.innerHTML = `
              <div class="bg-blue-50/50 border border-blue-100 rounded-lg p-4 text-xs text-slate-600 flex items-center gap-2">
                <i class="fas fa-info-circle text-blue-500"></i>
                <span>Tipe surat ini hanya membutuhkan data kependudukan standar (tanpa variabel tambahan).</span>
              </div>
            `;
            updateLivePreview();
            if (callback) callback();
            return;
          }

          let html = `
            <div class="card bg-slate-50 border border-slate-200 mt-4 fade-in">
              <div class="card-header bg-slate-100/50 py-3 px-4 border-b border-slate-200">
                <h4 class="text-slate-700 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                  <i class="fas fa-keyboard text-slate-500"></i>
                  <span>Langkah 4: Lengkapi Parameter Isian Surat</span>
                </h4>
              </div>
              <div class="card-body p-4">
                <div class="row">
          `;

          fields.forEach(f => {
            const labelClean = f.replace(/_/g, ' ').toUpperCase();
            html += `
              <div class="col-md-6 form-group">
                <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">${labelClean}</label>
                <input type="text" class="form-control rounded-lg text-sm field-surat" data-field="${f}" placeholder="Ketik isian ${labelClean}">
              </div>
            `;
          });

          html += `
                </div>
              </div>
            </div>
          `;
          targetContainer.innerHTML = html;
          
          // DAFTARKAN EVENT LISTENERS UNTUK LIVE PREVIEW
          const inputs = document.querySelectorAll('.field-surat');
          inputs.forEach(input => {
            input.addEventListener('input', updateLivePreview);
          });
          updateLivePreview();
          
          if (callback) callback();
        });
    }

    function prosesBuatSurat() {
      const nik = document.getElementById('cariNikSurat').value.trim();
      const kode = document.getElementById('jenisSurat').value;
      const pejabatKode = document.getElementById('pejabatSurat').value;

      if (!nik || !kode || !pejabatKode) {
        Swal.fire({ icon: 'warning', title: 'Data Kurang Lengkap', text: 'Pastikan NIK valid, jenis surat terpilih, serta penandatangan ditentukan.' });
        return;
      }

      // Disable button immediately to prevent double submissions
      disableButtonBuatPdf(true);

      const extraFields = document.querySelectorAll('.field-surat');
      const dataFields = {};
      const kolomKosongList = [];

      extraFields.forEach(f => {
        const value = f.value.trim();
        if (value === "") {
          const labelEl = f.previousElementSibling;
          const labelText = labelEl ? labelEl.innerText.replace(/[:*]/g, '').trim() : f.dataset.field;
          kolomKosongList.push(labelText);
        }
        dataFields[f.dataset.field] = value;
      });

      if (kolomKosongList.length > 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Isian Belum Lengkap',
          html: `<p class="text-sm text-left mb-2">Mohon lengkapi kolom isian berikut terlebih dahulu:</p>
                 <ul class="list-disc list-inside text-left text-xs text-red-600 space-y-1">
                   ${kolomKosongList.map(item => `<li><strong>${item}</strong></li>`).join('')}
                 </ul>`,
          confirmButtonColor: '#3b82f6'
        });
        disableButtonBuatPdf(false); // Re-enable if validation fails
        return;
      }

      Swal.fire({
        title: 'Mempersiapkan Berkas PDF...',
        text: 'Menggandakan Google Doc, menyisipkan variabel, serta melakukan ekspor PDF otomatis. Harap tunggu.',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const requestActiveId = sessionStorage.getItem('active_processing_request_id') || "";
      const keepExistingNumber = sessionStorage.getItem('keep_existing_number') === 'true';

      amankanPanggilanGAS('buatSuratPDF', nik, kode, dataFields, pejabatKode, requestActiveId, keepExistingNumber)
        .then(function (url) {
          Swal.close();
          disableButtonBuatPdf(false); // Re-enable on success
          sessionStorage.removeItem('active_processing_request_id');
          sessionStorage.removeItem('keep_existing_number');

          Swal.fire({
            icon: 'success',
            title: 'Dokumen Berhasil Terbit!',
            html: `
              <p class="text-sm mb-4">Berkas draf PDF berhasil dibuat dan dicatat di database.</p>
              <div class="flex flex-col gap-2">
                <a href="${url}" target="_blank" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg text-sm transition-colors block text-center shadow-lg shadow-blue-500/20">
                  <i class="fas fa-file-pdf mr-1.5"></i> Lihat Dokumen Draf
                </a>
                <button onclick="Swal.close(); loadDashboard();" class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg text-xs transition-colors">
                  Tutup Dialog
                </button>
              </div>
            `,
            showConfirmButton: false
          });
        })
        .catch(function (err) {
          disableButtonBuatPdf(false); // Re-enable on error so user can retry
          Swal.fire({ icon: 'error', title: 'Pembuatan Dokumen Gagal', text: err.message });
        });
    }

    // ========================================================
    // MENU: PERMINTAAN SURAT MANDIRI (Pengajuan dari Portal Warga)
    // ========================================================
    function loadPermintaanSuratMandiri(forceRefresh = false) {
      if (forceRefresh) {
        API_CACHE.invalidateQuery('getPermintaanSurat');
        API_CACHE.invalidateQuery('getPermintaanSuratCount');
      }
      setActiveNav('nav-permintaan-mandiri');

      document.getElementById('content').innerHTML = `
        <div class="card border border-slate-200 fade-in">
          <div class="card-header bg-white border-b border-slate-200 py-4 px-6 flex justify-between items-center">
            <div class="flex items-center gap-3">
              <div class="bg-amber-100 text-amber-600 p-2.5 rounded-lg">
                <i class="fas fa-mobile-alt text-lg"></i>
              </div>
              <div>
                <h3 class="text-lg font-bold text-slate-800">Permintaan Surat Mandiri</h3>
                <p class="text-xs text-slate-500 mt-0.5">Tinjau permohonan daring warga yang diajukan melalui Portal Mandiri.</p>
              </div>
            </div>
            <button onclick="loadPermintaanSuratMandiri(true)" class="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-600 font-semibold text-xs py-2 px-4 rounded-lg transition-colors flex items-center gap-1.5">
              <i class="fas fa-sync-alt"></i> Refresh
            </button>
          </div>

          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table min-w-full text-left border-collapse">
                <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] font-semibold uppercase tracking-wider">
                  <tr>
                    <th class="p-4 text-center w-12">No</th>
                    <th class="p-4">Tanggal Masuk</th>
                    <th class="p-4">Nama Pemohon (NIK)</th>
                    <th class="p-4">Jenis Surat</th>
                    <th class="p-4">WhatsApp (Warga)</th>
                    <th class="p-4">Atribut Tambahan</th>
                    <th class="p-4 text-center">Berkas (KTP, Foto Wajah, & Koordinat)</th>
                    <th class="p-4 text-center">Status</th>
                    <th class="p-4 text-center w-40">Aksi</th>
                  </tr>
                </thead>
                <tbody id="tbodyPermintaanMandiri" class="divide-y divide-slate-100 text-xs text-slate-700">
                  <tr>
                    <td colspan="9" class="text-center py-10 text-slate-400">
                      <div class="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-amber-600 mb-2"></div>
                      <p>Membaca data antrean...</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      amankanPanggilanGAS('getPermintaanSurat')
        .then(function (data) {
          const tbody = document.getElementById('tbodyPermintaanMandiri');
          if (!tbody) return; // Safety Guard

          const mandiriData = Array.isArray(data) ? data.filter(r => r.id && r.id.indexOf('REQ-MND-') === 0) : [];

          if (mandiriData.length === 0) {
            tbody.innerHTML = `
              <tr>
                <td colspan="9" class="text-center py-10 text-slate-400">
                  <i class="fas fa-mobile text-4xl mb-3 block text-slate-300"></i>
                  <span>Tidak ada antrean permohonan mandiri secara online.</span>
                </td>
              </tr>
            `;
            return;
          }

          let html = '';
          mandiriData.slice().reverse().forEach((r, i) => {
            let statusBadge = '';
            if (r.status === 'Menunggu') {
              statusBadge = '<span class="px-2 py-1 rounded bg-amber-100 text-amber-800 font-bold text-[10px] uppercase">Menunggu</span>';
            } else if (r.status === 'Ditolak') {
              statusBadge = '<span class="px-2 py-1 rounded bg-red-100 text-red-800 font-bold text-[10px] uppercase">Ditolak</span>';
              if (r.alasan_penolakan) {
                statusBadge += `<div class="text-[10px] text-red-600 mt-1 italic max-w-[150px] break-words">Alasan: ${r.alasan_penolakan}</div>`;
              }
            } else if (r.status === 'Proses TTE') {
              statusBadge = '<span class="px-2 py-1 rounded bg-blue-100 text-blue-800 font-bold text-[10px] uppercase">Proses TTE</span>';
            } else {
              statusBadge = '<span class="px-2 py-1 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase">Selesai</span>';
            }

            let details = '';
            for (const key in r.data_tambahan) {
              if (key === 'maps_link') continue;
              details += `<div class="mb-0.5"><strong class="text-slate-500">${key.replace(/_/g, ' ')}:</strong> ${r.data_tambahan[key]}</div>`;
            }

            let aksiButtons = '';
            if (r.status === 'Menunggu') {
              aksiButtons = `
                <button onclick="prosesPengajuanWarga('${r.id}')" class="bg-blue-600 hover:bg-blue-700 text-white rounded px-2.5 py-1 text-[10px] font-bold transition-colors inline-flex items-center gap-1">
                  <i class="fas fa-cog"></i> Proses
                </button>
                <button onclick="tolakPengajuanWarga('${r.id}')" class="bg-red-500 hover:bg-red-600 text-white rounded px-2.5 py-1 text-[10px] font-bold transition-colors inline-flex items-center gap-1">
                  <i class="fas fa-times"></i> Tolak
                </button>
              `;
            } else if ((r.status === 'Selesai' || r.status === 'Proses TTE') && r.file_pdf) {
              const isWaSent = r.wa_sent === 'Sent' || r.wa_sent === 'true';
              const btnText = isWaSent ? '<i class="fas fa-sync-alt"></i> Resend' : '<i class="fab fa-whatsapp"></i> Kirim';
              const btnColor = isWaSent ? 'bg-slate-500 hover:bg-slate-600' : 'bg-green-600 hover:bg-green-700';

              aksiButtons = `
                <div class="flex flex-col sm:flex-row gap-1">
                  <a href="${r.file_pdf}" target="_blank" class="bg-emerald-600 hover:bg-emerald-700 text-white rounded px-2 py-1 text-[10px] font-bold transition-colors inline-flex items-center justify-center gap-1">
                    <i class="fas fa-file-pdf"></i> PDF
                  </a>
                  <button id="btn-wa-${r.id}" onclick="kirimNotifWaWarga('${escJS(r.kontak)}', '${escJS(r.nama)}', '${escJS(r.jenis_surat)}', '${escJS(r.file_pdf)}', '${escJS(r.id)}')" class="${btnColor} text-white rounded px-2 py-1 text-[10px] font-bold transition-colors inline-flex items-center justify-center gap-1" title="Kirim Link Notifikasi WA">
                    ${btnText}
                  </button>
                </div>
              `;
            }

            const thumb = getGoogleDriveThumbnail(r.foto_wajah);
            const fotoHtml = r.foto_wajah 
              ? `<img src="${thumb || r.foto_wajah}" class="w-8 h-8 object-cover rounded-full border border-slate-200 cursor-pointer shadow-sm hover:scale-105 transition-transform" onclick="lihatFotoBesar('${r.foto_wajah}')" title="Lihat Foto Wajah (Klik untuk perbesar)">`
              : `<div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400" title="Tidak ada foto wajah"><i class="fas fa-user-slash text-xs"></i></div>`;

            let ktpHtml = '';
            if (r.foto_ktp) {
              const isPdf = r.foto_ktp.toLowerCase().includes('.pdf') || r.foto_ktp.includes('application/pdf');
              if (isPdf) {
                ktpHtml = `<a href="${r.foto_ktp}" target="_blank" class="w-8 h-8 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-500 hover:bg-red-100 transition-colors shadow-sm" title="Lihat PDF KTP"><i class="fas fa-file-pdf text-xs"></i></a>`;
              } else {
                const thumbKtp = getGoogleDriveThumbnail(r.foto_ktp);
                ktpHtml = `<img src="${thumbKtp || r.foto_ktp}" class="w-8 h-8 object-cover rounded-full border border-slate-200 cursor-pointer shadow-sm hover:scale-105 transition-transform" onclick="lihatFotoBesar('${r.foto_ktp}')" title="Lihat Foto KTP (Klik untuk perbesar)">`;
              }
            } else {
              ktpHtml = `<div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400" title="Tidak ada foto KTP"><i class="fas fa-id-card text-xs"></i></div>`;
            }

            const mapsLink = r.data_tambahan ? r.data_tambahan.maps_link : null;
            let lokasiHtml = '';
            if (mapsLink) {
              lokasiHtml = `<a href="${mapsLink}" target="_blank" class="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 hover:bg-blue-100 transition-colors shadow-sm" title="Lihat Lokasi GPS Pengaju di Google Maps"><i class="fas fa-map-marker-alt text-xs text-red-500"></i></a>`;
            } else {
              lokasiHtml = `<div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400" title="Lokasi tidak tersedia"><i class="fas fa-map-marked text-xs"></i></div>`;
            }

            html += `
              <tr class="hover:bg-slate-50/70 transition-colors">
                <td class="p-4 text-center font-medium text-slate-400">${i + 1}</td>
                <td class="p-4 text-slate-500">${r.tanggal}</td>
                <td class="p-4">
                  <div>
                    <div class="font-bold text-slate-900">${r.nama}</div>
                    <div class="text-[10px] text-slate-400 font-mono">${r.nik}</div>
                  </div>
                </td>
                <td class="p-4 font-semibold text-slate-700">${r.jenis_surat}</td>
                <td class="p-4 text-slate-600 font-mono">${r.kontak || '-'}</td>
                <td class="p-4 text-[11px] text-slate-600 max-w-xs overflow-hidden">${details || '<span class="text-slate-300 italic">Tidak ada</span>'}</td>
                <td class="p-4 text-center">
                  <div class="flex justify-center gap-1">
                    ${ktpHtml}
                    ${fotoHtml}
                    ${lokasiHtml}
                  </div>
                </td>
                <td class="p-4 text-center">${statusBadge}</td>
                <td class="p-4 text-center">
                  <div class="flex justify-center gap-1.5">
                    ${aksiButtons}
                  </div>
                </td>
              </tr>
            `;
          });
          tbody.innerHTML = html;
        })
        .catch(function (err) {
          const tbody = document.getElementById('tbodyPermintaanMandiri');
          if (tbody) {
            tbody.innerHTML = `
              <tr>
                <td colspan="8" class="text-center py-10 text-red-500 font-semibold">${err.message}</td>
              </tr>
            `;
          }
        });
    }

    // =======================================================
    // MENU: PERMINTAAN SURAT LANGSUNG (Warga Datang Ke Kantor)
    // =======================================================
    function loadPermintaanSuratDirect(forceRefresh = false) {
      if (forceRefresh) {
        API_CACHE.invalidateQuery('getPermintaanSurat');
      }
      setActiveNav('nav-permintaan-langsung');

      document.getElementById('content').innerHTML = `
        <div class="card border border-slate-200 fade-in">
          <div class="card-header bg-white border-b border-slate-200 py-4 px-6 flex justify-between items-center">
            <div class="flex items-center gap-3">
              <div class="bg-orange-100 text-orange-600 p-2.5 rounded-lg">
                <i class="fas fa-keyboard text-lg"></i>
              </div>
              <div>
                <h3 class="text-lg font-bold text-slate-800">Permintaan Surat Langsung</h3>
                <p class="text-xs text-slate-500 mt-0.5">Daftar pengajuan surat yang dicetak secara instan oleh admin di Kantor Desa.</p>
              </div>
            </div>
            <button onclick="loadPermintaanSuratDirect(true)" class="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-600 font-semibold text-xs py-2 px-4 rounded-lg transition-colors flex items-center gap-1.5">
              <i class="fas fa-sync-alt"></i> Refresh
            </button>
          </div>

          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table min-w-full text-left border-collapse">
                <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] font-semibold uppercase tracking-wider">
                  <tr>
                    <th class="p-4 text-center w-12">No</th>
                    <th class="p-4">Tanggal Selesai</th>
                    <th class="p-4">Nama Pemohon (NIK)</th>
                    <th class="p-4">Jenis Surat</th>
                    <th class="p-4">Atribut Tambahan</th>
                    <th class="p-4 text-center">Status</th>
                    <th class="p-4 text-center w-40">Dokumen</th>
                  </tr>
                </thead>
                <tbody id="tbodyPermintaanDirect" class="divide-y divide-slate-100 text-xs text-slate-700">
                  <tr>
                    <td colspan="7" class="text-center py-10 text-slate-400">
                      <div class="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-orange-500 mb-2"></div>
                      <p>Membaca data...</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      amankanPanggilanGAS('getPermintaanSurat')
        .then(function (data) {
          const tbody = document.getElementById('tbodyPermintaanDirect');
          if (!tbody) return; // Safety Guard

          const directData = Array.isArray(data) ? data.filter(r => r.id && r.id.indexOf('REQ-ADM-') === 0) : [];

          if (directData.length === 0) {
            tbody.innerHTML = `
              <tr>
                <td colspan="7" class="text-center py-10 text-slate-400">
                  <i class="fas fa-keyboard text-4xl mb-3 block text-slate-300"></i>
                  <span>Belum ada data pembuatan surat langsung di kantor desa.</span>
                </td>
              </tr>
            `;
            return;
          }

          let html = '';
          directData.slice().reverse().forEach((r, i) => {
            let details = '';
            for (const key in r.data_tambahan) {
              details += `<div class="mb-0.5"><strong class="text-slate-500">${key.replace(/_/g, ' ')}:</strong> ${r.data_tambahan[key]}</div>`;
            }

            let docButton = '';
            if (r.file_pdf) {
              docButton = `
                <a href="${r.file_pdf}" target="_blank" class="bg-emerald-600 hover:bg-emerald-700 text-white rounded px-3 py-1.5 text-[10px] font-bold transition-colors inline-flex items-center justify-center gap-1">
                  <i class="fas fa-file-pdf"></i> Buka PDF
                </a>
              `;
            } else {
              docButton = '<span class="text-slate-400 italic">File Kosong</span>';
            }

            html += `
              <tr class="hover:bg-slate-50/70 transition-colors">
                <td class="p-4 text-center font-medium text-slate-400">${i + 1}</td>
                <td class="p-4 text-slate-500">${r.tanggal}</td>
                <td class="p-4">
                  <div class="font-bold text-slate-900">${r.nama}</div>
                  <div class="text-[10px] text-slate-400 font-mono">${r.nik}</div>
                </td>
                <td class="p-4 font-semibold text-slate-700">${r.jenis_surat}</td>
                <td class="p-4 text-[11px] text-slate-600 max-w-xs overflow-hidden">${details || '<span class="text-slate-300 italic">Tidak ada</span>'}</td>
                <td class="p-4 text-center">
                  <span class="px-2 py-1 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase">Selesai</span>
                </td>
                <td class="p-4 text-center">
                  ${docButton}
                </td>
              </tr>
            `;
          });
          tbody.innerHTML = html;
        })
        .catch(function (err) {
          const tbody = document.getElementById('tbodyPermintaanDirect');
          if (tbody) {
            tbody.innerHTML = `
              <tr>
                <td colspan="7" class="text-center py-10 text-red-500 font-semibold">${err.message}</td>
              </tr>
            `;
          }
        });
    }

    function prosesPengajuanWarga(id) {
      Swal.fire({
        title: 'Mulai Pembuatan Berkas?',
        text: 'Anda akan diarahkan ke formulir cetak dengan isian data kependudukan warga yang terisi otomatis.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3b82f6',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Proses Dokumen',
        cancelButtonText: 'Kembali'
      }).then((result) => {
        if (result.isConfirmed) {
          amankanPanggilanGAS('getPermintaanSurat')
            .then(function (list) {
              const req = list.find(r => r.id === id);
              if (req) {
                sessionStorage.setItem('active_processing_request_id', id);
                sessionStorage.setItem('active_processing_request_foto_wajah', req.foto_wajah || '');
                sessionStorage.setItem('active_processing_request_foto_ktp', req.foto_ktp || '');
                buatSurat(req);
              }
            })
            .catch(function (err) {
              console.error("Gagal membaca detail draf:", err);
            });
        }
      });
    }

    function tolakPengajuanWarga(id) {
      Swal.fire({
        title: 'Tolak Permohonan Surat?',
        text: 'Sebutkan alasan penolakan secara ringkas:',
        input: 'text',
        inputPlaceholder: 'Contoh: Persyaratan berkas kurang lengkap / salah NIK',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Tolak',
        cancelButtonText: 'Batal',
        inputValidator: (value) => {
          if (!value || !value.trim()) {
            return 'Alasan penolakan wajib diisi!';
          }
        }
      }).then((result) => {
        if (result.isConfirmed) {
          const alasan = result.value.trim();
          Swal.fire({ title: 'Menolak permohonan...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

          amankanPanggilanGAS('prosesPermintaanSurat', id, 'Ditolak', '', alasan)
            .then(function () {
              Swal.close();
              Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Status pengajuan berhasil diubah menjadi Ditolak.', timer: 1500, showConfirmButton: false });
              loadPermintaanSuratMandiri();
            })
            .catch(function (err) {
              Swal.close();
              Swal.fire({ icon: 'error', title: 'Gagal', text: err.message });
            });
        }
      });
    }

    // ============================================================
    // MENU: ARSIP SURAT (Kumpulan surat dari mandiri & langsung)
    // ============================================================
    function loadArsipSurat() {
      setActiveNav('nav-arsip-surat');

      document.getElementById('content').innerHTML = `
        <div class="fade-in space-y-6 pb-8">
          
          <!-- ========================================== -->
          <!-- PANEL REKAPITULASI WAKTU (STATISTIK ELEGAN) -->
          <!-- ========================================== -->
          <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <!-- Harian -->
            <div class="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-4 text-white shadow-md relative overflow-hidden">
              <div class="absolute -right-4 -bottom-4 opacity-10 text-6xl"><i class="fas fa-calendar-day"></i></div>
              <p class="text-[10px] font-semibold uppercase tracking-wider text-blue-100">Hari Ini</p>
              <h3 class="text-2xl font-bold mt-1" id="rekapHarian">0</h3>
              <p class="text-[10px] text-blue-200 mt-2">Diterbitkan hari ini</p>
            </div>
            
            <!-- Mingguan -->
            <div class="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-4 text-white shadow-md relative overflow-hidden">
              <div class="absolute -right-4 -bottom-4 opacity-10 text-6xl"><i class="fas fa-calendar-week"></i></div>
              <p class="text-[10px] font-semibold uppercase tracking-wider text-amber-100">7 Hari Terakhir</p>
              <h3 class="text-2xl font-bold mt-1" id="rekapMingguan">0</h3>
              <p class="text-[10px] text-amber-200 mt-2">Diterbitkan 1 minggu ini</p>
            </div>
            
            <!-- Bulanan -->
            <div class="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 text-white shadow-md relative overflow-hidden">
              <div class="absolute -right-4 -bottom-4 opacity-10 text-6xl"><i class="fas fa-calendar-alt"></i></div>
              <p class="text-[10px] font-semibold uppercase tracking-wider text-emerald-100">Bulan Ini</p>
              <h3 class="text-2xl font-bold mt-1" id="rekapBulanan">0</h3>
              <p class="text-[10px] text-emerald-200 mt-2">Diterbitkan bulan ini</p>
            </div>
            
            <!-- Tahunan -->
            <div class="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-4 text-white shadow-md relative overflow-hidden">
              <div class="absolute -right-4 -bottom-4 opacity-10 text-6xl"><i class="fas fa-calendar"></i></div>
              <p class="text-[10px] font-semibold uppercase tracking-wider text-purple-100">Tahun Ini</p>
              <h3 class="text-2xl font-bold mt-1" id="rekapTahunan">0</h3>
              <p class="text-[10px] text-purple-200 mt-2">Diterbitkan tahun ini</p>
            </div>
            
            <!-- Total -->
            <div class="col-span-2 lg:col-span-1 bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl p-4 text-white shadow-md relative overflow-hidden">
              <div class="absolute -right-4 -bottom-4 opacity-10 text-6xl"><i class="fas fa-archive"></i></div>
              <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-300">Total Arsip</p>
              <h3 class="text-2xl font-bold mt-1" id="rekapTotal">0</h3>
              <p class="text-[10px] text-slate-400 mt-2">Keseluruhan dokumen</p>
            </div>
          </div>

          <!-- ========================================== -->
          <!-- REKAPITULASI JENIS SURAT (PROGRESS BAR)     -->
          <!-- ========================================== -->
          <div class="card border border-slate-200 shadow-sm">
            <div class="card-header bg-white border-b border-slate-100 py-3 px-6">
              <h4 class="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                <i class="fas fa-chart-pie text-blue-500"></i> Rekapitulasi Berdasarkan Jenis Surat
              </h4>
            </div>
            <div class="card-body p-6">
              <div id="rekapJenisSuratContainer" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <!-- Render otomatis melalui JavaScript -->
              </div>
            </div>
          </div>

          <!-- ========================================== -->
          <!-- TABEL UTAMA DATA ARSIP SURAT               -->
          <!-- ========================================== -->
          <div class="card border border-slate-200 shadow-sm">
            <div class="card-header bg-white border-b border-slate-200 py-4 px-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div class="flex items-center gap-3">
                <div class="bg-emerald-100 text-emerald-600 p-2.5 rounded-lg">
                  <i class="fas fa-file-pdf text-lg"></i>
                </div>
                <div>
                  <h3 class="text-lg font-bold text-slate-800">Arsip Pengeluaran Surat</h3>
                  <p class="text-xs text-slate-500 mt-0.5">Daftar kronologis lengkap dokumen administrasi desa yang telah disahkan.</p>
                </div>
              </div>
              
              <!-- FILTER PENCARIAN ELEGAN -->
              <div class="flex gap-2 w-full md:w-auto">
                <div class="relative w-full md:w-72">
                  <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <i class="fas fa-search text-xs"></i>
                  </span>
                  <input type="text" id="searchArsip" onkeyup="filterArsip()" class="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" placeholder="Cari Nama Pemohon atau NIK...">
                </div>
                <button onclick="loadArsipSurat()" class="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-600 font-semibold text-xs py-2 px-4 rounded-lg transition-colors flex items-center justify-center" title="Segarkan Data">
                  <i class="fas fa-sync-alt"></i>
                </button>
              </div>
            </div>

            <div class="card-body p-0">
              <div class="table-responsive">
                <table class="table min-w-full text-left border-collapse">
                  <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] font-semibold uppercase tracking-wider">
                    <tr>
                      <th class="p-4 text-center w-12">No</th>
                      <th class="p-4">Tanggal Terbit</th>
                      <th class="p-4">NIK</th>
                      <th class="p-4">Nama Lengkap</th>
                      <th class="p-4">Jenis Surat</th>
                      <th class="p-4">Nomor Dokumen</th>
                      <th class="p-4 text-center w-[250px]">Berkas Dokumen</th>
                    </tr>
                  </thead>
                  <tbody id="tbodySuratSelesai" class="divide-y divide-slate-100 text-xs text-slate-700">
                    <tr>
                      <td colspan="7" class="text-center py-10 text-slate-400">
                        <div class="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-600 mb-2"></div>
                        <p>Membuka seluruh arsip desa...</p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      `;

      amankanPanggilanGAS('getSuratSelesai')
        .then(function (data) {
          dataArsipGlobal = data || [];
          dataArsipFiltered = data || [];

          prosesRekapitulasiWaktu(dataArsipGlobal);
          prosesRekapitulasiJenis(dataArsipGlobal);
          tampilArsip(dataArsipFiltered);
        })
        .catch(function (err) {
          const tbody = document.getElementById('tbodySuratSelesai');
          if (tbody) {
            tbody.innerHTML = `
              <tr>
                <td colspan="7" class="text-center py-10 text-red-500 font-semibold">${err.message}</td>
              </tr>
            `;
          }
        });
    }

    let dataArsipGlobal = [];
    let dataArsipFiltered = [];

    // ========================================================
    // 1. PARSER TANGGAL INDONESIA KE OBJEK DATE JAVASCRIPT
    // ========================================================
    function parseTanggalIndonesia(dateStr) {
      if (!dateStr) return new Date();
      const bulanMap = {
        'januari': 0, 'februari': 1, 'maret': 2, 'april': 3, 'mei': 4, 'juni': 5,
        'juli': 6, 'agustus': 7, 'september': 8, 'oktober': 9, 'november': 10, 'desember': 11,
        'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'mei': 4, 'jun': 5, 'jul': 6, 'ags': 7, 'sep': 8, 'okt': 9, 'nov': 10, 'des': 11
      };
      const parts = dateStr.toString().toLowerCase().trim().split(/\s+/);
      if (parts.length >= 3) {
        const tgl = parseInt(parts[0], 10);
        const bln = bulanMap[parts[1]] !== undefined ? bulanMap[parts[1]] : 0;
        const thn = parseInt(parts[2], 10);
        return new Date(thn, bln, tgl);
      }
      const parsingStandar = Date.parse(dateStr);
      return !isNaN(parsingStandar) ? new Date(parsingStandar) : new Date();
    }

    function isSameDay(d1, d2) {
      return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
    }

    function isWithinPastDays(date, days) {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      const pastLimit = new Date();
      pastLimit.setDate(today.getDate() - days);
      pastLimit.setHours(0, 0, 0, 0);
      return date >= pastLimit && date <= today;
    }

    // ========================================================
    // 2. FUNGSI LOGIKA FILTER PENCARIAN REAL-TIME
    // ========================================================
    function filterArsip() {
      const query = document.getElementById('searchArsip').value.toLowerCase().trim();
      dataArsipFiltered = dataArsipGlobal.filter(item => {
        return item.nama.toLowerCase().includes(query) || item.nik.toLowerCase().includes(query);
      });
      tampilArsip(dataArsipFiltered);
    }

    // ========================================================
    // 3. FUNGSI PROSES REKAPITULASI WAKTU (STATISTIK)
    // ========================================================
    function prosesRekapitulasiWaktu(data) {
      const today = new Date();
      let harian = 0;
      let mingguan = 0;
      let bulanan = 0;
      let tahunan = 0;

      data.forEach(item => {
        const dateObj = parseTanggalIndonesia(item.tanggal);

        // Harian (Hari Ini)
        if (isSameDay(dateObj, today)) {
          harian++;
        }
        // Mingguan (7 Hari Terakhir)
        if (isWithinPastDays(dateObj, 7)) {
          mingguan++;
        }
        // Bulanan (Bulan Ini)
        if (dateObj.getMonth() === today.getMonth() && dateObj.getFullYear() === today.getFullYear()) {
          bulanan++;
        }
        // Tahunan (Tahun Ini)
        if (dateObj.getFullYear() === today.getFullYear()) {
          tahunan++;
        }
      });

      // Tampilkan ke masing-masing elemen Dashboard dengan pengaman null
      const harianEl = document.getElementById('rekapHarian');
      if (harianEl) harianEl.innerText = harian;

      const mingguanEl = document.getElementById('rekapMingguan');
      if (mingguanEl) mingguanEl.innerText = mingguan;

      const bulananEl = document.getElementById('rekapBulanan');
      if (bulananEl) bulananEl.innerText = bulanan;

      const tahunanEl = document.getElementById('rekapTahunan');
      if (tahunanEl) tahunanEl.innerText = tahunan;

      const totalEl = document.getElementById('rekapTotal');
      if (totalEl) totalEl.innerText = data.length;
    }

    // ========================================================
    // 4. FUNGSI VISUALISASI REKAPITULASI JENIS SURAT
    // ========================================================
    function prosesRekapitulasiJenis(data) {
      const container = document.getElementById('rekapJenisSuratContainer');
      if (!container) return; // Safety Guard

      const counts = {};
      data.forEach(item => {
        counts[item.jenis] = (counts[item.jenis] || 0) + 1;
      });

      if (Object.keys(counts).length === 0) {
        container.innerHTML = `<p class="col-span-full text-center text-slate-400 text-xs py-4">Belum ada statistik jenis surat.</p>`;
        return;
      }

      // Urutkan counts berdasarkan jumlah terbanyak
      const sortedCounts = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      let html = '';
      const totalDocs = data.length || 1;

      for (const [jenis, count] of sortedCounts) {
        const percentage = Math.round((count / totalDocs) * 100);
        html += `
          <div class="bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center justify-between transition-colors shadow-sm shadow-slate-100/20">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                <i class="fas fa-file-invoice text-xs"></i>
              </div>
              <div class="min-w-0">
                <span class="text-xs font-bold text-slate-700 block truncate" title="${jenis}">${jenis}</span>
                <span class="text-[9px] font-semibold text-slate-400 font-mono">${percentage}% dari total</span>
              </div>
            </div>
            <div class="text-right flex-shrink-0">
              <span class="px-2 py-1 rounded-lg text-[10px] bg-blue-50 text-blue-700 font-bold font-mono">${count} Surat</span>
            </div>
          </div>
        `;
      }
      container.innerHTML = html;
    }

    // ========================================================
    // 5. FUNGSI MERENDER DATA KE TABEL ARSIP
    // ========================================================
    function tampilArsip(data) {
      const tbody = document.getElementById('tbodySuratSelesai');
      if (!tbody) return; // Safety Guard

      if (!Array.isArray(data)) {
        data = [];
      }

      if (data.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" class="text-center py-10 text-slate-400">
              <i class="fas fa-folder-open text-3xl mb-2 block"></i>
              <span>Arsip surat tidak ditemukan.</span>
            </td>
          </tr>
        `;
        return;
      }

      let html = '';
      data.slice().reverse().forEach((d, i) => {
        let tteBtnHtml = d.tte_status === "Sudah TTE" ? `
          <button onclick="bukaModalUploadTte('${escJS(d.nomor)}', '${escJS(d.nama)}', '${escJS(d.reg_id)}')" class="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 font-bold px-2.5 py-1.5 rounded-lg border border-emerald-200 transition-colors inline-flex items-center gap-1" title="Sudah Ber-TTE Resmi. Klik untuk ganti berkas baru.">
            <i class="fas fa-check-circle"></i>
            <span>Sudah Upload</span>
          </button>
        ` : `
          <button onclick="bukaModalUploadTte('${escJS(d.nomor)}', '${escJS(d.nama)}', '${escJS(d.reg_id)}')" class="bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold px-2.5 py-1.5 rounded-lg border border-blue-200 transition-colors inline-flex items-center gap-1" title="Unggah Surat TTE">
            <i class="fas fa-upload"></i>
            <span>Upload TTE</span>
          </button>
        `;

        let editBtnHtml = '';
        if (d.tte_status !== "Sudah TTE") {
          editBtnHtml = `
            <button onclick="editArsipSurat('${d.reg_id}', '${d.pejabat_kode}')" class="bg-amber-50 hover:bg-amber-100 text-amber-600 font-bold px-2.5 py-1.5 rounded-lg border border-amber-200 transition-colors inline-flex items-center gap-1" title="Edit Data & Regenerate Surat">
              <i class="fas fa-edit"></i>
              <span>Edit</span>
            </button>
          `;
        }

        let hapusBtnHtml = '';
        if (d.tte_status !== "Sudah TTE" && currentUserRole === 'admin') {
          hapusBtnHtml = `
            <button onclick="konfirmasiHapusArsip('${escJS(d.nomor)}')" class="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-2.5 py-1.5 rounded-lg border border-red-200 transition-colors inline-flex items-center gap-1" title="Hapus Berkas & Data Arsip">
              <i class="fas fa-trash-alt"></i>
              <span>Hapus</span>
            </button>
          `;
        }

        html += `
          <tr class="hover:bg-slate-50/70 transition-colors">
            <td class="p-4 text-center font-medium text-slate-400">${i + 1}</td>
            <td class="p-4 text-slate-500 font-medium">${d.tanggal}</td>
            <td class="p-4 font-mono font-semibold text-slate-600">${d.nik}</td>
            <td class="p-4 font-bold text-slate-900">${d.nama}</td>
            <td class="p-4">
              <span class="inline-block bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-semibold border border-blue-100">${d.jenis}</span>
            </td>
            <td class="p-4 font-semibold text-slate-600">${d.nomor}</td>
            <td class="p-4 text-center">
              <div class="inline-flex gap-1.5 justify-center">
                <a href="${d.file}" target="_blank" class="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-2.5 py-1.5 rounded-lg border border-red-200 transition-colors inline-flex items-center gap-1">
                  <i class="fas fa-file-pdf"></i>
                  <span>PDF</span>
                </a>
                ${editBtnHtml}
                ${tteBtnHtml}
                ${hapusBtnHtml}
              </div>
            </td>
          </tr>
        `;
      });
      tbody.innerHTML = html;
    }

    function konfirmasiHapusArsip(nomorSurat) {
      Swal.fire({
        title: 'Hapus Arsip Surat?',
        text: 'Tindakan ini akan menghapus data arsip surat ini dan menghapus berkas dokumen PDF/GDoc terkait di Google Drive secara permanen.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Ya, Hapus!',
        cancelButtonText: 'Batal'
      }).then((result) => {
        if (result.isConfirmed) {
          Swal.fire({
            title: 'Menghapus Berkas...',
            text: 'Mohon tunggu sementara data dan berkas dihapus.',
            allowOutsideClick: false,
            didOpen: () => {
              Swal.showLoading();
            }
          });

          const token = localStorage.getItem('auth_token') || '';
          amankanPanggilanGAS('hapusSuratSelesai', nomorSurat, token)
            .then(function (res) {
              Swal.close();
              if (res) {
                Swal.fire({
                  icon: 'success',
                  title: 'Berhasil Dihapus',
                  text: 'Data arsip surat beserta berkas terkait berhasil dihapus.',
                  timer: 1500,
                  showConfirmButton: false
                });
                loadArsipSurat(); // Refresh data arsip
              } else {
                Swal.fire({ icon: 'error', title: 'Gagal Menghapus', text: 'Data tidak dapat ditemukan.' });
              }
            })
            .catch(function (err) {
              Swal.close();
              Swal.fire({ icon: 'error', title: 'Terjadi Kesalahan', text: err.message });
            });
        }
      });
    }

    function bukaModalUploadTte(nomorSurat, namaWarga, regId) {
      const modalHtml = `
        <div class="modal fade" id="modalUploadTte" tabindex="-1" role="dialog" aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered" role="document">
            <div class="modal-content overflow-hidden rounded-xl border-0 shadow-2xl">
              <div class="modal-header bg-blue-600 text-white p-4">
                <h5 class="modal-title font-bold text-base flex items-center gap-2">
                  <i class="fas fa-cloud-upload-alt"></i>
                  <span>Upload Surat Pengganti (TTE / TTD)</span>
                </h5>
                <button type="button" class="close text-white opacity-85 hover:opacity-100" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div class="modal-body p-6 bg-slate-50 text-slate-700">
                <div class="bg-blue-50/75 border border-blue-100 p-3 rounded-lg text-xs mb-4 text-blue-800">
                  <i class="fas fa-info-circle mr-1"></i>
                  <span>Mengunggah file di sini akan <strong>menimpa & menghapus</strong> draf file lama dari database sistem dan Drive Anda. Tautan unduhan warga juga akan terupdate otomatis.</span>
                </div>
                <div class="space-y-4">
                  <div>
                    <label class="text-xs font-semibold text-slate-500 uppercase">Nomor Dokumen</label>
                    <div class="font-mono font-bold text-slate-800 text-sm">${nomorSurat}</div>
                  </div>
                  <div>
                    <label class="text-xs font-semibold text-slate-500 uppercase">Nama Warga Pemohon</label>
                    <div class="font-bold text-slate-800 text-sm">${namaWarga}</div>
                  </div>
                  <div class="form-group pt-2">
                    <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 block">Pilih Berkas PDF Hasil Scan/TTE</label>
                    <div class="custom-file">
                      <input type="file" class="custom-file-input" id="inputBerkasTte" accept="application/pdf" onchange="updateLabelNamaFile(this)">
                      <label class="custom-file-label text-xs text-slate-500" for="inputBerkasTte" id="labelFileSelected">Pilih file PDF resmi...</label>
                    </div>
                  </div>
                </div>
              </div>
              <div class="modal-footer bg-white p-4 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" class="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs py-2 px-4 rounded-lg transition-colors" data-dismiss="modal">Batal</button>
                <button type="button" onclick="prosesUploadTteSurat('${nomorSurat}', '${regId}')" class="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2 px-4 rounded-lg shadow-sm transition-colors flex items-center gap-1.5">
                  <i class="fas fa-file-upload"></i> Unggah & Timpa File
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      const container = document.getElementById('modalContainer');
      if (container) {
        container.innerHTML = modalHtml;
        $('#modalUploadTte').modal('show');
      }
    }

    function updateLabelNamaFile(input) {
      const fileName = input.files[0] ? input.files[0].name : "Pilih file PDF resmi...";
      const label = document.getElementById('labelFileSelected');
      if (label) label.innerText = fileName;
    }

    function prosesUploadTteSurat(nomorSurat, regId) {
      const fileInput = document.getElementById('inputBerkasTte');
      if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        Swal.fire({ icon: 'warning', title: 'Belum Ada File', text: 'Silakan pilih file PDF yang valid terlebih dahulu.' });
        return;
      }

      const file = fileInput.files[0];
      if (file.type !== "application/pdf") {
        Swal.fire({ icon: 'error', title: 'Format Salah', text: 'Hanya file PDF bertanda-tangan yang diizinkan untuk diunggah.' });
        return;
      }

      Swal.fire({
        title: 'Mengunggah Berkas Baru...',
        text: 'Mengirim file PDF, memperbarui indeks database, serta membersihkan file lama. Harap tunggu.',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const reader = new FileReader();
      reader.onload = function (e) {
        const base64Data = e.target.result;

        amankanPanggilanGAS('updateFileSuratSelesai', nomorSurat, base64Data, file.name, regId)
          .then(function (newUrl) {
            Swal.close();
            $('#modalUploadTte').modal('hide');
            Swal.fire({
              icon: 'success',
              title: 'Berhasil Diperbarui!',
              text: 'File PDF lama telah ditimpa dengan dokumen resmi yang baru di Drive dan sistem database.',
              timer: 1500,
              showConfirmButton: false
            });
            loadArsipSurat();
          })
          .catch(function (err) {
            Swal.close();
            Swal.fire({ icon: 'error', title: 'Gagal Memperbarui', text: err.message });
          });
      };
      reader.readAsDataURL(file);
    }

    function editArsipSurat(regId, pejabatKode) {
      Swal.fire({
        title: 'Konfirmasi Edit Surat',
        text: 'Bagaimana dengan nomor surat untuk hasil revisi ini?',
        icon: 'question',
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonColor: '#3b82f6',
        denyButtonColor: '#10b981',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Gunakan Nomor Baru (Urutan Terkini)',
        denyButtonText: 'Tetap Nomor Lama',
        cancelButtonText: 'Batal'
      }).then((result) => {
        if (result.isConfirmed || result.isDenied) {
          const keepExistingNumber = result.isDenied; // Denied means "Tetap Nomor Lama"

          Swal.fire({ title: 'Memuat data draf...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
          amankanPanggilanGAS('getPermintaanSurat')
            .then(function (list) {
              Swal.close();
              const req = list.find(r => r.id === regId);
              if (req) {
                sessionStorage.setItem('active_processing_request_id', regId);
                sessionStorage.setItem('prefill_pejabat_kode', pejabatKode);
                sessionStorage.setItem('keep_existing_number', keepExistingNumber ? 'true' : 'false');
                buatSurat(req);
              } else {
                Swal.fire({ icon: 'error', title: 'Gagal', text: 'Detail draf tidak ditemukan di database.' });
              }
            })
            .catch(function (err) {
              Swal.close();
              Swal.fire({ icon: 'error', title: 'Gagal', text: err.message });
            });
        }
      });
    }

    function loadPengaturan() {
      if (currentUserRole !== 'admin' && currentUserRole !== 'petugas') {
        Swal.fire({
          icon: 'error',
          title: 'Akses Ditolak',
          text: 'Anda tidak memiliki hak akses untuk membuka menu ini.',
          confirmButtonColor: '#ef4444'
        });
        loadDashboard();
        return;
      }

      setActiveNav('nav-pengaturan');

      const isPetugas = (currentUserRole === 'petugas');
      let tabsHtml = '';
      if (!isPetugas) {
        tabsHtml = `
          <li class="nav-item">
            <a class="nav-link active font-bold text-xs uppercase tracking-wider pb-3 border-b-2 border-blue-600 cursor-pointer text-blue-600 focus:outline-none" id="tab-users-link" onclick="switchPengaturanTab('users')">
              <i class="fas fa-users-cog mr-1.5"></i> Manajemen Pengguna
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link font-bold text-xs uppercase tracking-wider pb-3 cursor-pointer text-slate-500 hover:text-blue-600 focus:outline-none" id="tab-log-link" onclick="switchPengaturanTab('log')">
              <i class="fas fa-history mr-1.5"></i> Log & History
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link font-bold text-xs uppercase tracking-wider pb-3 cursor-pointer text-slate-500 hover:text-blue-600 focus:outline-none" id="tab-templates-link" onclick="switchPengaturanTab('templates')">
              <i class="fas fa-file-word mr-1.5"></i> Template Surat
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link font-bold text-xs uppercase tracking-wider pb-3 cursor-pointer text-slate-500 hover:text-blue-600 focus:outline-none" id="tab-nomor-link" onclick="switchPengaturanTab('nomor')">
              <i class="fas fa-list-ol mr-1.5"></i> Format & Nomor Surat
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link font-bold text-xs uppercase tracking-wider pb-3 cursor-pointer text-slate-500 hover:text-blue-600 focus:outline-none" id="tab-pejabat-link" onclick="switchPengaturanTab('pejabat')">
              <i class="fas fa-user-tie mr-1.5"></i> Pejabat
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link font-bold text-xs uppercase tracking-wider pb-3 cursor-pointer text-slate-500 hover:text-blue-600 focus:outline-none" id="tab-fonnte-link" onclick="switchPengaturanTab('fonnte')">
              <i class="fas fa-server mr-1.5"></i> Server Send WhatsApp
            </a>
          </li>

        `;
      } else {
        tabsHtml = `
          <li class="nav-item">
            <a class="nav-link active font-bold text-xs uppercase tracking-wider pb-3 border-b-2 border-blue-600 cursor-pointer text-blue-600 focus:outline-none" id="tab-nomor-link" onclick="switchPengaturanTab('nomor')">
              <i class="fas fa-list-ol mr-1.5"></i> Format & Nomor Surat
            </a>
          </li>
        `;
      }

      document.getElementById('content').innerHTML = `
        <div class="card border border-slate-200 fade-in">
          <div class="card-header p-0 border-b border-slate-200 bg-white">
            <ul class="nav nav-tabs px-4 pt-3 flex gap-2" id="pengaturanTabs" role="tablist">
              ${tabsHtml}
            </ul>
          </div>

          ${isPetugas ? '' : `
          <!-- PANEL 1: MANAJEMEN PENGGUNA -->
          <div id="panel-pengaturan-users" class="fade-in">
            <div class="card-body p-0">
              <div class="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h4 class="text-sm font-bold text-slate-800">Daftar Administrator Sistem</h4>
                  <p class="text-[11px] text-slate-500 mt-0.5">Kelola akun kredensial masuk serta level otorisasi staff desa Anda.</p>
                </div>
                <button onclick="modalTambahUser()" class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5 px-4 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2">
                  <i class="fas fa-plus"></i>
                  <span>Daftarkan Akun Baru</span>
                </button>
              </div>

              <div class="table-responsive">
                <table class="table min-w-full text-left border-collapse">
                  <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] font-semibold uppercase tracking-wider">
                    <tr>
                      <th class="p-4 text-center w-12">No</th>
                      <th class="p-4">Nama Lengkap</th>
                      <th class="p-4">Username</th>
                      <th class="p-4">No. WhatsApp (OTP)</th>
                      <th class="p-4">Kata Sandi</th>
                      <th class="p-4">Peran (Role)</th>
                      <th class="p-4 text-center w-36">Aksi</th>
                    </tr>
                  </thead>
                  <tbody id="tbodyUsers" class="divide-y divide-slate-100 text-xs text-slate-700">
                    <tr>
                      <td colspan="7" class="text-center py-10 text-slate-400">
                        <div class="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mb-2"></div>
                        <p>Menggali data pengguna...</p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          `}

          ${isPetugas ? '' : `
          <!-- PANEL 2: LOG HISTORY -->
          <div id="panel-pengaturan-log" class="fade-in" style="display: none;">
            <div class="card-body p-0">
              <div class="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h4 class="text-sm font-bold text-slate-800">Riwayat Aktivitas Sistem (Log History)</h4>
                  <p class="text-[11px] text-slate-500 mt-0.5">Pantau seluruh aktivitas pembuatan surat, upload TTE, pengajuan warga, dan notifikasi WA beserta nama pelakunya.</p>
                </div>
                <div class="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                  <div class="relative w-full md:w-64">
                    <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <i class="fas fa-search text-xs"></i>
                    </span>
                    <input type="text" id="searchLog" onkeyup="filterLog()" class="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" placeholder="Cari Nama Surat atau NIK...">
                  </div>
                  <button onclick="renderPengaturanLog()" class="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-600 font-semibold text-xs py-2 px-4 rounded-lg transition-colors flex items-center gap-1.5">
                    <i class="fas fa-sync-alt"></i> Segarkan Log
                  </button>
                </div>
              </div>
              <div class="table-responsive">
                <table class="table min-w-full text-left border-collapse">
                  <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] font-semibold uppercase tracking-wider">
                    <tr>
                      <th class="p-4 w-48">Tanggal & Jam</th>
                      <th class="p-4 w-48">Aktor / Pengguna</th>
                      <th class="p-4 w-40 text-center">Jenis Aksi</th>
                      <th class="p-4">Detail Aktivitas</th>
                    </tr>
                  </thead>
                  <tbody id="tbodyLogHistory" class="divide-y divide-slate-100 text-xs text-slate-700">
                    <tr>
                      <td colspan="4" class="text-center py-10 text-slate-400">
                        <div class="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mb-2"></div>
                        <p>Menarik data riwayat log sistem...</p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          `}

          ${isPetugas ? '' : `
          <!-- PANEL 3: TEMPLATE SURAT -->
          <div id="panel-pengaturan-templates" class="fade-in" style="display: none;">
            <div class="card-body p-0">
              <div class="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h4 class="text-sm font-bold text-slate-800">Daftar Tipe Surat & Google Docs Template ID</h4>
                  <p class="text-[11px] text-slate-500 mt-0.5">Daftarkan Kode Surat, Nama Jenis Surat, ID berkas Google Docs Template, serta Relasi Klasifikasi Penomorannya.</p>
                </div>
                <button onclick="modalTambahTemplate()" class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5 px-4 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2">
                  <i class="fas fa-plus"></i>
                  <span>Daftarkan Template Baru</span>
                </button>
              </div>

              <div class="p-4 bg-blue-50/50 border border-blue-100 rounded-lg mx-6 mt-4 flex gap-3 text-xs text-blue-800">
                <i class="fas fa-info-circle text-base mt-0.5"></i>
                <div>
                  <strong class="block mb-1">Panduan Konfigurasi Google Docs Template ID & Klasifikasi Nomor:</strong>
                  1. Rancang isi surat lengkap dengan kurung siku seperti <code class="bg-blue-100 px-1 font-bold rounded text-red-600">[PEKERJAAN]</code>, <code class="bg-blue-100 px-1 font-bold rounded text-red-600">[nik]</code>, atau variabel kustom tambahan.<br>
                  2. Hubungkan jenis surat Anda ke <strong>Klasifikasi Penomoran</strong> (misal: SKU dan SKDU diarahkan ke kode Klasifikasi <code class="bg-blue-100 px-1 rounded">503</code>).<br>
                  3. Format penomoran klasifikasi tersebut dapat diatur secara mandiri pada Tab <strong>Format & Nomor Surat</strong>.
                </div>
              </div>

              <div class="table-responsive mt-4">
                <table class="table min-w-full text-left border-collapse">
                  <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] font-semibold uppercase tracking-wider">
                    <tr>
                      <th class="p-4 text-center w-12">No</th>
                      <th class="p-4">Kode Surat</th>
                      <th class="p-4">Jenis / Judul Surat</th>
                      <th class="p-4">Google Docs Template ID</th>
                      <th class="p-4">Grup Klasifikasi Nomor</th>
                      <th class="p-4">Atribut Dinamis (Kustom)</th>
                      <th class="p-4 text-center w-36">Aksi</th>
                    </tr>
                  </thead>
                  <tbody id="tbodyTemplates" class="divide-y divide-slate-100 text-xs text-slate-700">
                    <tr>
                      <td colspan="7" class="text-center py-10 text-slate-400">
                        <div class="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mb-2"></div>
                        <p>Mengambil data konfigurasi surat...</p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          `}



          <!-- PANEL 4: FORMAT & NOMOR SURAT -->
          <div id="panel-pengaturan-nomor" class="fade-in" style="${isPetugas ? '' : 'display: none;'}">
            <div class="card-body p-0">
              <div class="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h4 class="text-sm font-bold text-slate-800">Manajemen Format & Grup Penomoran Surat</h4>
                  <p class="text-[11px] text-slate-500 mt-0.5">Kelola Kode Klasifikasi, Counter Urutan Nomor Terakhir, serta Format Penulisan Surat Dinas Desa.</p>
                </div>
                <button onclick="modalTambahNomorSurat()" class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5 px-4 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2">
                  <i class="fas fa-plus"></i>
                  <span>Tambah Klasifikasi Baru</span>
                </button>
              </div>

              <div class="p-4 bg-amber-50 border border-amber-200 rounded-lg mx-6 mt-4 flex gap-3 text-xs text-amber-900">
                <i class="fas fa-lightbulb text-base mt-0.5"></i>
                <div>
                  <strong class="block mb-1">Panduan Pengaturan Format Penulisan Nomor:</strong>
                  Gunakan penanda <code class="bg-amber-100 px-1 font-bold rounded text-red-600">[NO]</code> untuk urutan counter otomatis dan <code class="bg-amber-100 px-1 font-bold rounded text-red-600">[TAHUN]</code> untuk penyematan tahun berjalan.<br>
                  <em>Contoh:</em> <code class="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-200">503/[NO]/Desa-Tgl/[TAHUN]</code> menghasilkan penulisan nomor <code class="font-bold">503/12/Desa-Tgl/2026</code>.
                </div>
              </div>

              <div class="table-responsive mt-4">
                <table class="table min-w-full text-left border-collapse">
                  <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] font-semibold uppercase tracking-wider">
                    <tr>
                      <th class="p-4 text-center w-12">No</th>
                      <th class="p-4">Kode Klasifikasi</th>
                      <th class="p-4">Deskripsi / Nama Grup</th>
                      <th class="p-4 text-center">Nomor Terakhir</th>
                      <th class="p-4">Format Nomor Surat</th>
                      <th class="p-4">Contoh Hasil</th>
                      <th class="p-4 text-center w-36">Aksi</th>
                    </tr>
                  </thead>
                  <tbody id="tbodyNomorSurat" class="divide-y divide-slate-100 text-xs text-slate-700">
                    <tr>
                      <td colspan="7" class="text-center py-10 text-slate-400">
                        <div class="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mb-2"></div>
                        <p>Mengambil data penomoran...</p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          ${isPetugas ? '' : `
          <!-- PANEL 5: SERVER FONNTE -->
          <div id="panel-pengaturan-fonnte" class="fade-in" style="display: none;">
            <div class="card-body p-6">
              <div class="row">
                <!-- KOLOM KIRI: TOKEN & PEMBARUAN -->
                <div class="col-md-5 space-y-5">
                  <!-- CARD KREDENSIAL FONNTE -->
                  <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-md shadow-slate-100/50 space-y-5 relative overflow-hidden">
                    <div class="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-blue-500 to-indigo-600"></div>
                    <div class="pl-2">
                      <h4 class="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <span class="p-1.5 bg-blue-50 rounded-lg text-blue-600 flex items-center justify-center">
                          <i class="fas fa-key text-xs"></i>
                        </span>
                        <span>Kredensial Fonnte Token</span>
                      </h4>
                      <p class="text-[11px] text-slate-500 mt-2 leading-relaxed">
                        Token API digunakan untuk mengautentikasi pengiriman notifikasi surat otomatis melalui WhatsApp Gateway Fonnte.
                      </p>
                      
                      <div class="form-group mt-4">
                        <label class="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Fonnte API Token</label>
                        <div class="relative">
                          <input type="password" id="fonnte_token_input" class="form-control rounded-xl text-xs py-2 pr-10 font-mono border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-slate-50/50" placeholder="Masukkan token API Fonnte Anda">
                          <button type="button" onclick="toggleVisibilityFonnteToken()" class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-blue-600 focus:outline-none">
                            <i class="far fa-eye text-xs" id="icon-eye-fonnte"></i>
                          </button>
                        </div>
                      </div>

                      <div class="flex gap-2.5 mt-5">
                        <button onclick="simpanFonnteToken()" class="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]">
                          <i class="fas fa-save"></i> Simpan Token
                        </button>
                        <button onclick="hapusFonnteToken()" class="bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 font-bold text-xs py-2.5 px-3.5 rounded-xl transition-colors flex items-center justify-center active:scale-[0.98]" title="Hapus Token">
                          <i class="fas fa-trash-alt"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <!-- CARD UPLOADER UPDATE.ZIP -->
                  <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-md shadow-slate-100/50 space-y-5 relative overflow-hidden">
                    <div class="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-emerald-500 to-teal-600"></div>
                    <div class="pl-2">
                      <h4 class="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <span class="p-1.5 bg-emerald-50 rounded-lg text-emerald-600 flex items-center justify-center">
                          <i class="fas fa-file-archive text-xs"></i>
                        </span>
                        <span>Pembaruan Aplikasi (Upload ZIP)</span>
                      </h4>
                      <p class="text-[11px] text-slate-500 mt-2 leading-relaxed">
                        Unggah berkas pembaruan aplikasi format <code class="bg-emerald-50 text-emerald-700 font-semibold px-1.5 py-0.5 rounded text-[10px]">.zip</code> untuk memperbarui sistem Frontend secara otomatis di server hosting.
                      </p>

                      <div class="form-group mt-4">
                        <label class="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Pilih Berkas Pembaruan</label>
                        <div class="flex items-center justify-center w-full">
                          <label class="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-200 border-dashed rounded-xl cursor-pointer bg-slate-50/50 hover:bg-slate-50/80 transition-colors">
                            <div class="flex flex-col items-center justify-center pt-3 pb-3">
                              <i class="fas fa-cloud-upload-alt text-slate-400 text-lg mb-1"></i>
                              <p class="text-[10px] text-slate-500 font-semibold">Klik untuk memilih berkas ZIP</p>
                              <p class="text-[9px] text-slate-400 mt-0.5" id="update_zip_filename_display">update.zip (Maks. 20MB)</p>
                            </div>
                            <input type="file" id="update_zip_file" accept=".zip" class="hidden" onchange="document.getElementById('update_zip_filename_display').innerText = this.files[0] ? this.files[0].name : 'update.zip (Maks. 20MB)'">
                          </label>
                        </div>
                      </div>

                      <button onclick="unggahFileUpdateZip()" class="w-full mt-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]">
                        <i class="fas fa-cloud-upload-alt"></i> Unggah & Terapkan Update
                      </button>
                    </div>
                  </div>
                </div>

                <!-- KOLOM KANAN: STATUS WHATSAPP & MODE DEV -->
                <div class="col-md-7 mt-4 md:mt-0 space-y-5">
                  <!-- CARD STATUS PERANGKAT WHATSAPP -->
                  <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-md shadow-slate-100/50 space-y-5 relative overflow-hidden">
                    <div class="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-blue-500 to-sky-500"></div>
                    <div class="pl-2">
                      <h4 class="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
                        <span class="p-1.5 bg-blue-50 rounded-lg text-blue-600 flex items-center justify-center">
                          <i class="fas fa-signal text-xs"></i>
                        </span>
                        <span>Status Perangkat WhatsApp</span>
                      </h4>

                      <div id="fonnte_status_card" class="flex flex-col items-center justify-center py-8 text-center bg-slate-50/50 rounded-2xl border border-slate-100 mt-4">
                        <div class="inline-block animate-spin rounded-full h-7 w-7 border-2 border-blue-600 border-t-transparent mb-3"></div>
                        <p class="text-xs text-slate-500 font-semibold">Memeriksa status perangkat WhatsApp di Fonnte...</p>
                      </div>

                      <div id="fonnte_qr_container" class="border border-slate-150 bg-slate-50/70 rounded-2xl p-5 text-center space-y-4 fade-in mt-4" style="display: none;">
                        <h5 class="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-center gap-1.5">
                          <i class="fas fa-qrcode text-slate-500"></i> Pindai QR Code WhatsApp
                        </h5>
                        <p class="text-[10px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                          Buka aplikasi WhatsApp di ponsel Anda -> ketuk **Perangkat Tertaut** -> pilih **Tautkan Perangkat** -> lalu arahkan kamera ke QR Code di bawah.
                        </p>
                        <div class="bg-white p-4 rounded-xl inline-block shadow-inner mx-auto border border-slate-200">
                          <img id="fonnte_qr_image" src="" class="w-44 h-44 object-contain" alt="QR Code Fonnte">
                        </div>
                        <div>
                          <button onclick="loadFonnteStatus()" class="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-bold text-xs py-2 px-4 rounded-xl shadow-sm transition-all inline-flex items-center gap-1.5 active:scale-[0.98]">
                            <i class="fas fa-sync-alt"></i> Segarkan Koneksi & Status
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <!-- CARD MODE BYPASS OTP -->
                  <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-md shadow-slate-100/50 space-y-5 relative overflow-hidden">
                    <div class="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-amber-500 to-orange-600"></div>
                    <div class="pl-2">
                      <h4 class="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <span class="p-1.5 bg-amber-50 rounded-lg text-amber-600 flex items-center justify-center">
                          <i class="fas fa-shield-alt text-xs"></i>
                        </span>
                        <span>Mode Pengembang (Bypass OTP)</span>
                      </h4>
                      <p class="text-[11px] text-slate-500 mt-2 leading-relaxed">
                        Berguna untuk melewati verifikasi kode OTP WhatsApp selama masa pengembangan / perbaikan aplikasi di localhost. 
                        <span class="text-red-500 font-bold block mt-1.5 flex items-center gap-1"><i class="fas fa-exclamation-triangle"></i> Pastikan opsi ini mati saat sistem dirilis di server produksi!</span>
                      </p>
                      
                      <div class="flex items-center justify-between p-3.5 bg-amber-50/40 rounded-xl border border-amber-100 mt-4">
                        <span class="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Status Bypass OTP:</span>
                        <label class="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" id="bypass_otp_toggle" onchange="ubahBypassOtp(this)" class="sr-only peer">
                          <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          `}

          ${isPetugas ? '' : `
          <!-- PANEL 6: MANAJEMEN PEJABAT -->
          <div id="panel-pengaturan-pejabat" class="fade-in" style="display: none;">
            <div class="card-body p-0">
              <div class="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h4 class="text-sm font-bold text-slate-800">Daftar Pejabat Penandatangan Surat</h4>
                  <p class="text-[11px] text-slate-500 mt-0.5">Kelola data pejabat yang berwenang menandatangani surat dinas desa (TTE).</p>
                </div>
                <button onclick="modalTambahPejabat()" class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5 px-4 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2">
                  <i class="fas fa-user-plus"></i>
                  <span>Tambah Pejabat Baru</span>
                </button>
              </div>

              <div class="table-responsive">
                <table class="table min-w-full text-left border-collapse">
                  <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] font-semibold uppercase tracking-wider">
                    <tr>
                      <th class="p-4 text-center w-12">No</th>
                      <th class="p-4">Kode Pejabat</th>
                      <th class="p-4">Nama Lengkap</th>
                      <th class="p-4">Jabatan</th>
                      <th class="p-4">NIAP</th>
                      <th class="p-4">Teks TTD / Status</th>
                      <th class="p-4">No. HP / WA</th>
                      <th class="p-4 text-center w-36">Aksi</th>
                    </tr>
                  </thead>
                  <tbody id="tbodyPejabat" class="divide-y divide-slate-100 text-xs text-slate-700">
                    <tr>
                      <td colspan="8" class="text-center py-10 text-slate-400">
                        <div class="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mb-2"></div>
                        <p>Mengambil data pejabat...</p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          `}
        </div>
      `;

      if (isPetugas) {
        renderPengaturanNomor();
      } else {
        renderPengaturanUsers();
      }
    }

    function switchPengaturanTab(tab) {
      const tabUsersLink = document.getElementById('tab-users-link');
      const tabLogLink = document.getElementById('tab-log-link');
      const tabTemplatesLink = document.getElementById('tab-templates-link');
      const tabNomorLink = document.getElementById('tab-nomor-link');
      const tabPejabatLink = document.getElementById('tab-pejabat-link');
      const tabFonnteLink = document.getElementById('tab-fonnte-link');

      const panelUsers = document.getElementById('panel-pengaturan-users');
      const panelLog = document.getElementById('panel-pengaturan-log');
      const panelTemplates = document.getElementById('panel-pengaturan-templates');
      const panelNomor = document.getElementById('panel-pengaturan-nomor');
      const panelPejabat = document.getElementById('panel-pengaturan-pejabat');
      const panelFonnte = document.getElementById('panel-pengaturan-fonnte');

      const inactiveClass = "nav-link font-bold text-xs uppercase tracking-wider pb-3 cursor-pointer text-slate-500 hover:text-blue-600 focus:outline-none";
      if (tabUsersLink) tabUsersLink.className = inactiveClass;
      if (tabLogLink) tabLogLink.className = inactiveClass;
      if (tabTemplatesLink) tabTemplatesLink.className = inactiveClass;
      if (tabNomorLink) tabNomorLink.className = inactiveClass;
      if (tabPejabatLink) tabPejabatLink.className = inactiveClass;
      if (tabFonnteLink) tabFonnteLink.className = inactiveClass;

      if (panelUsers) panelUsers.style.display = 'none';
      if (panelLog) panelLog.style.display = 'none';
      if (panelTemplates) panelTemplates.style.display = 'none';
      if (panelNomor) panelNomor.style.display = 'none';
      if (panelPejabat) panelPejabat.style.display = 'none';
      if (panelFonnte) panelFonnte.style.display = 'none';

      const activeClass = "nav-link active font-bold text-xs uppercase tracking-wider pb-3 border-b-2 border-blue-600 cursor-pointer text-blue-600 focus:outline-none";

      if (tab === 'users') {
        if (tabUsersLink) tabUsersLink.className = activeClass;
        if (panelUsers) panelUsers.style.display = 'block';
        renderPengaturanUsers();
      } else if (tab === 'log') {
        if (tabLogLink) tabLogLink.className = activeClass;
        if (panelLog) panelLog.style.display = 'block';
        renderPengaturanLog();
      } else if (tab === 'templates') {
        if (tabTemplatesLink) tabTemplatesLink.className = activeClass;
        if (panelTemplates) panelTemplates.style.display = 'block';
        renderPengaturanTemplates();
      } else if (tab === 'nomor') {
        if (tabNomorLink) tabNomorLink.className = activeClass;
        if (panelNomor) panelNomor.style.display = 'block';
        renderPengaturanNomor();
      } else if (tab === 'pejabat') {
        if (tabPejabatLink) tabPejabatLink.className = activeClass;
        if (panelPejabat) panelPejabat.style.display = 'block';
        renderPengaturanPejabat();
      } else if (tab === 'fonnte') {
        if (tabFonnteLink) tabFonnteLink.className = activeClass;
        if (panelFonnte) panelFonnte.style.display = 'block';
        loadFonntePanel();
      }
    }

    function renderPengaturanUsers() {
      amankanPanggilanGAS('getUsers')
        .then(function (users) {
          const tbody = document.getElementById('tbodyUsers');
          if (!tbody) return; // Safety Guard

          if (!users || users.length === 0) {
            tbody.innerHTML = `
              <tr>
                <td colspan="7" class="text-center py-10 text-slate-400">
                  <i class="fas fa-users-slash text-4xl mb-3 block text-slate-300"></i>
                  <span>Belum ada user admin terdaftar.</span>
                </td>
              </tr>
            `;
            return;
          }

          let html = '';
          users.forEach((u, i) => {
            const roleBadge = u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800';
            html += `
              <tr class="hover:bg-slate-50/70 transition-colors">
                <td class="p-4 text-center font-medium text-slate-400">${i + 1}</td>
                <td class="p-4 font-bold text-slate-800">${u.nama}</td>
                <td class="p-4 font-mono font-semibold">${u.username}</td>
                <td class="p-4 font-mono text-slate-600 font-bold">${u.kontak || '<span class="text-red-500 italic font-normal">Belum diset</span>'}</td>
                <td class="p-4">
                  <span class="font-mono" id="pass-${i}">â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢</span>
                  <button onclick="toggleVisibilityPass('${u.password}', ${i})" class="text-blue-500 hover:text-blue-700 ml-2 focus:outline-none" title="Tampilkan Sandi">
                    <i class="far fa-eye text-xs"></i>
                  </button>
                </td>
                <td class="p-4">
                  <span class="px-2 py-1 rounded font-bold text-[10px] uppercase ${roleBadge}">${u.role}</span>
                </td>
                <td class="p-4 text-center">
                  <div class="inline-flex gap-1.5">
                    <button onclick='editUser(${JSON.stringify(u)})' class="bg-amber-500 hover:bg-amber-600 text-white rounded p-1.5 transition-colors" title="Edit Akun">
                      <i class="fas fa-edit text-xs"></i>
                    </button>
                    <button onclick="hapusUser('${u.username}')" class="bg-red-500 hover:bg-red-600 text-white rounded p-1.5 transition-colors" title="Hapus Akun">
                      <i class="fas fa-trash-alt text-xs"></i>
                    </button>
                  </div>
                </td>
              </tr>
            `;
          });
          tbody.innerHTML = html;
        })
        .catch(function (err) {
          Swal.fire({ icon: 'error', title: 'Gagal Memuat Akun', text: err.message });
        });
    }

    function toggleVisibilityPass(passText, idx) {
      const el = document.getElementById(`pass-${idx}`);
      if (el) {
        if (el.innerText === 'â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢') {
          el.innerText = passText;
        } else {
          el.innerText = 'â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢';
        }
      }
    }

    function renderPengaturanTemplates() {
      amankanPanggilanGAS('getTemplateSurat')
        .then(function (templates) {
          const tbody = document.getElementById('tbodyTemplates');
          if (!tbody) return; // Safety Guard

          if (!templates || templates.length === 0) {
            tbody.innerHTML = `
              <tr>
                <td colspan="7" class="text-center py-10 text-slate-400">
                  <i class="fas fa-file-excel text-4xl mb-3 block text-slate-300"></i>
                  <span>Belum ada konfigurasi template surat di database.</span>
                </td>
              </tr>
            `;
            return;
          }

          let html = '';
          templates.forEach((t, i) => {
            const shortId = t.template_id.length > 20 ? t.template_id.substring(0, 20) + "..." : t.template_id;
            html += `
              <tr class="hover:bg-slate-50/70 transition-colors">
                <td class="p-4 text-center font-medium text-slate-400">${i + 1}</td>
                <td class="p-4 font-mono font-bold text-blue-600">${t.kode}</td>
                <td class="p-4 font-semibold text-slate-800">${t.jenis}</td>
                <td class="p-4 font-mono text-slate-500 text-xs" title="${t.template_id}">
                  <span class="mr-2">${shortId}</span>
                  <a href="https://docs.google.com/document/d/${t.template_id}/edit" target="_blank" class="text-blue-500 text-[10px]" title="Buka Google Docs">
                    <i class="fas fa-external-link-alt"></i>
                  </a>
                </td>
                <td class="p-4 font-mono font-bold text-purple-700">${t.kode_nomor || '<span class="text-red-500 italic text-[11px]">Belum Diset</span>'}</td>
                <td class="p-4 font-mono text-xs text-slate-600">
                  ${t.fields ? t.fields.split(',').map(f => `<span class="inline-block bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded mr-1 mb-1 font-semibold">${f}</span>`).join('') : '<span class="text-slate-300 italic">None</span>'}
                </td>
                <td class="p-4 text-center">
                  <div class="inline-flex gap-1.5">
                    <button onclick='editTemplate(${JSON.stringify(t)})' class="bg-amber-500 hover:bg-amber-600 text-white rounded p-1.5 transition-colors" title="Edit Template">
                      <i class="fas fa-edit text-xs"></i>
                    </button>
                    <button onclick="hapusTemplate('${t.kode}', '${t.template_id}')" class="bg-red-500 hover:bg-red-600 text-white rounded p-1.5 transition-colors" title="Hapus Template & File Drive">
                      <i class="fas fa-trash-alt text-xs"></i>
                    </button>
                  </div>
                </td>
              </tr>
            `;
          });
          tbody.innerHTML = html;
        })
        .catch(function (err) {
          Swal.fire({ icon: 'error', title: 'Gagal Memuat Template', text: err.message });
        });
    }



    function renderPengaturanNomor() {
      amankanPanggilanGAS('getNomorSurat')
        .then(function (nomorSuratList) {
          const tbody = document.getElementById('tbodyNomorSurat');
          if (!tbody) return; // Safety Guard


          if (!nomorSuratList || nomorSuratList.length === 0) {
            tbody.innerHTML = `
              <tr>
                <td colspan="7" class="text-center py-10 text-slate-400">
                  <i class="fas fa-list-ol text-4xl mb-3 block text-slate-300"></i>
                  <span>Belum ada grup penomoran terdaftar di database.</span>
                </td>
              </tr>
            `;
            return;
          }

          let html = '';
          const tahunSkg = new Date().getFullYear();
          nomorSuratList.forEach((n, i) => {
            const contohTampil = n.format.replace('[NO]', Number(n.last_number) + 1).replace('[TAHUN]', tahunSkg);
            html += `
              <tr class="hover:bg-slate-50/70 transition-colors">
                <td class="p-4 text-center font-medium text-slate-400">${i + 1}</td>
                <td class="p-4 font-mono font-bold text-purple-700">${n.kode}</td>
                <td class="p-4 font-semibold text-slate-800">${n.jenis_surat}</td>
                <td class="p-4 text-center font-mono font-bold text-slate-700">${n.last_number}</td>
                <td class="p-4 font-mono text-xs text-blue-600 font-semibold bg-blue-50/30">${n.format}</td>
                <td class="p-4 font-mono text-xs text-slate-500 italic">${contohTampil}</td>
                <td class="p-4 text-center">
                  <div class="inline-flex gap-1.5">
                    <button onclick='editNomorSurat(${JSON.stringify(n)})' class="bg-amber-500 hover:bg-amber-600 text-white rounded p-1.5 transition-colors" title="Edit Klasifikasi">
                      <i class="fas fa-edit text-xs"></i>
                    </button>
                    <button onclick="hapusNomorSurat('${n.kode}')" class="bg-red-500 hover:bg-red-600 text-white rounded p-1.5 transition-colors" title="Hapus Klasifikasi">
                      <i class="fas fa-trash-alt text-xs"></i>
                    </button>
                  </div>
                </td>
              </tr>
            `;
          });
          tbody.innerHTML = html;
        })
        .catch(function (err) {
          Swal.fire({ icon: 'error', title: 'Gagal Memuat Klasifikasi', text: err.message });
        });
    }

    function renderPengaturanPejabat() {
      amankanPanggilanGAS('getPejabat')
        .then(function (pejabatList) {
          const tbody = document.getElementById('tbodyPejabat');
          if (!tbody) return;

          if (!pejabatList || pejabatList.length === 0) {
            tbody.innerHTML = `
              <tr>
                <td colspan="8" class="text-center py-10 text-slate-400">
                  <i class="fas fa-user-shield text-4xl mb-3 block text-slate-300"></i>
                  <span>Belum ada data pejabat terdaftar.</span>
                </td>
              </tr>
            `;
            return;
          }

          let html = '';
          pejabatList.forEach((p, i) => {
            html += `
              <tr class="hover:bg-slate-50/70 transition-colors">
                <td class="p-4 text-center font-medium text-slate-400">${i + 1}</td>
                <td class="p-4 font-mono font-bold text-blue-600">${p.kode}</td>
                <td class="p-4 font-bold text-slate-800">${p.nama}</td>
                <td class="p-4 text-slate-600">${p.jabatan}</td>
                <td class="p-4 font-mono text-slate-600">${p.nip}</td>
                <td class="p-4 text-slate-600">${p.ttd || '(TTE)'}</td>
                <td class="p-4 font-mono font-bold text-slate-600">${p.kontak || '<span class="text-slate-400 italic font-normal">-</span>'}</td>
                <td class="p-4 text-center">
                  <div class="inline-flex gap-1.5">
                    <button onclick='editPejabat(${JSON.stringify(p)})' class="bg-amber-500 hover:bg-amber-600 text-white rounded p-1.5 transition-colors" title="Edit Pejabat">
                      <i class="fas fa-edit text-xs"></i>
                    </button>
                    <button onclick="hapusPejabat('${p.kode}')" class="bg-red-500 hover:bg-red-600 text-white rounded p-1.5 transition-colors" title="Hapus Pejabat">
                      <i class="fas fa-trash-alt text-xs"></i>
                    </button>
                  </div>
                </td>
              </tr>
            `;
          });
          tbody.innerHTML = html;
        })
        .catch(function (err) {
          Swal.fire({ icon: 'error', title: 'Gagal Memuat Pejabat', text: err.message });
        });
    }

    function modalTambahPejabat() {
      const modalHtml = `
        <div class="modal fade" id="modalTambahPejabat" tabindex="-1" role="dialog" aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered" role="document">
            <div class="modal-content overflow-hidden rounded-xl border-0 shadow-2xl">
              <div class="modal-header bg-blue-600 text-white p-4">
                <h5 class="modal-title font-bold text-base flex items-center gap-2">
                  <i class="fas fa-user-plus"></i>
                  <span>Daftarkan Pejabat Baru</span>
                </h5>
                <button type="button" class="close text-white opacity-85 hover:opacity-100" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div class="modal-body p-6 bg-slate-50">
                <div class="space-y-4">
                  <div class="form-group">
                    <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Kode Pejabat</label>
                    <input type="text" id="add_pj_kode" class="form-control rounded-lg text-sm font-mono" placeholder="Contoh: KADES, SEKDES">
                  </div>
                  <div class="form-group">
                    <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Nama Lengkap & Gelar</label>
                    <input type="text" id="add_pj_nama" class="form-control rounded-lg text-sm" placeholder="Contoh: H. BONIRAN">
                  </div>
                  <div class="form-group">
                    <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Jabatan</label>
                    <input type="text" id="add_pj_jabatan" class="form-control rounded-lg text-sm" placeholder="Contoh: KEPALA DESA">
                  </div>
                  <div class="form-group">
                    <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">NIAP (NIP)</label>
                    <input type="text" id="add_pj_nip" class="form-control rounded-lg text-sm font-mono" placeholder="Contoh: 5803121712230010235 atau -">
                  </div>
                  <div class="form-group">
                    <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Teks TTD / Status</label>
                    <input type="text" id="add_pj_ttd" class="form-control rounded-lg text-sm" placeholder="Contoh: BONIRAN">
                  </div>
                  <div class="form-group">
                    <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">No. HP / WA</label>
                    <input type="text" id="add_pj_kontak" class="form-control rounded-lg text-sm font-mono" placeholder="Contoh: 628121712301">
                  </div>
                </div>
              </div>
              <div class="modal-footer bg-white p-4 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" class="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs py-2 px-4 rounded-lg transition-colors" data-dismiss="modal">Batal</button>
                <button type="button" onclick="simpanPejabatBaru()" class="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2 px-4 rounded-lg shadow-sm transition-colors flex items-center gap-1.5">
                  <i class="fas fa-save"></i> Daftarkan Pejabat
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
      document.getElementById('modalContainer').innerHTML = modalHtml;
      $('#modalTambahPejabat').modal('show');
    }

    function simpanPejabatBaru() {
      const data = {
        kode: document.getElementById('add_pj_kode').value.trim().toUpperCase(),
        nama: document.getElementById('add_pj_nama').value.trim(),
        jabatan: document.getElementById('add_pj_jabatan').value.trim(),
        nip: document.getElementById('add_pj_nip').value.trim(),
        ttd: document.getElementById('add_pj_ttd').value.trim(),
        kontak: document.getElementById('add_pj_kontak').value.trim()
      };

      if (!data.kode || !data.nama || !data.jabatan || !data.nip || !data.ttd) {
        Swal.fire({ icon: 'warning', title: 'Data Belum Lengkap', text: 'Kode, Nama, Jabatan, NIAP, dan TTD wajib diisi.' });
        return;
      }

      Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

      amankanPanggilanGAS('simpanPejabat', data)
        .then(function () {
          Swal.close();
          $('#modalTambahPejabat').modal('hide');
          Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Pejabat baru berhasil didaftarkan!', timer: 1500, showConfirmButton: false });
          renderPengaturanPejabat();
        })
        .catch(function (err) {
          Swal.fire({ icon: 'error', title: 'Gagal Menyimpan', text: err.message });
        });
    }

    function editPejabat(p) {
      const modalHtml = `
        <div class="modal fade" id="modalEditPejabat" tabindex="-1" role="dialog" aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered" role="document">
            <div class="modal-content overflow-hidden rounded-xl border-0 shadow-2xl">
              <div class="modal-header bg-amber-500 text-white p-4">
                <h5 class="modal-title font-bold text-base flex items-center gap-2">
                  <i class="fas fa-user-edit"></i>
                  <span>Perbarui Data Pejabat</span>
                </h5>
                <button type="button" class="close text-white opacity-85 hover:opacity-100" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div class="modal-body p-6 bg-slate-50">
                <div class="space-y-4">
                  <div class="form-group">
                    <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Kode Pejabat (Tidak Dapat Diubah)</label>
                    <input type="text" id="edit_pj_kode" class="form-control rounded-lg text-sm bg-slate-200 font-mono" value="${p.kode}" readonly>
                  </div>
                  <div class="form-group">
                    <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Nama Lengkap & Gelar</label>
                    <input type="text" id="edit_pj_nama" class="form-control rounded-lg text-sm" value="${p.nama}">
                  </div>
                  <div class="form-group">
                    <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Jabatan</label>
                    <input type="text" id="edit_pj_jabatan" class="form-control rounded-lg text-sm" value="${p.jabatan}">
                  </div>
                  <div class="form-group">
                    <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">NIAP (NIP)</label>
                    <input type="text" id="edit_pj_nip" class="form-control rounded-lg text-sm font-mono" value="${p.nip}">
                  </div>
                  <div class="form-group">
                    <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Teks TTD / Status</label>
                    <input type="text" id="edit_pj_ttd" class="form-control rounded-lg text-sm" value="${p.ttd}">
                  </div>
                  <div class="form-group">
                    <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">No. HP / WA</label>
                    <input type="text" id="edit_pj_kontak" class="form-control rounded-lg text-sm font-mono" value="${p.kontak || ''}">
                  </div>
                </div>
              </div>
              <div class="modal-footer bg-white p-4 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" class="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs py-2 px-4 rounded-lg transition-colors" data-dismiss="modal">Batal</button>
                <button type="button" onclick="prosesUpdatePejabat()" class="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs py-2 px-4 rounded-lg shadow-sm transition-colors flex items-center gap-1.5">
                  <i class="fas fa-save"></i> Perbarui Pejabat
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
      document.getElementById('modalContainer').innerHTML = modalHtml;
      $('#modalEditPejabat').modal('show');
    }

    function prosesUpdatePejabat() {
      const data = {
        kode: document.getElementById('edit_pj_kode').value,
        nama: document.getElementById('edit_pj_nama').value.trim(),
        jabatan: document.getElementById('edit_pj_jabatan').value.trim(),
        nip: document.getElementById('edit_pj_nip').value.trim(),
        ttd: document.getElementById('edit_pj_ttd').value.trim(),
        kontak: document.getElementById('edit_pj_kontak').value.trim()
      };

      if (!data.nama || !data.jabatan || !data.nip || !data.ttd) {
        Swal.fire({ icon: 'warning', title: 'Data Belum Lengkap', text: 'Nama, Jabatan, NIAP, dan TTD wajib diisi.' });
        return;
      }

      Swal.fire({ title: 'Memperbarui...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

      amankanPanggilanGAS('updatePejabat', data)
        .then(function () {
          Swal.close();
          $('#modalEditPejabat').modal('hide');
          Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Data pejabat berhasil diperbarui!', timer: 1500, showConfirmButton: false });
          renderPengaturanPejabat();
        })
        .catch(function (err) {
          Swal.fire({ icon: 'error', title: 'Gagal', text: err.message });
        });
    }

    function hapusPejabat(kode) {
      Swal.fire({
        title: 'Hapus Pejabat ini?',
        text: 'Menghapus data pejabat akan memutuskan relasi penandatangan surat yang menggunakan kode ini.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Ya, Hapus Pejabat',
        cancelButtonText: 'Batal'
      }).then((result) => {
        if (result.isConfirmed) {
          Swal.fire({ title: 'Menghapus...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
          amankanPanggilanGAS('hapusPejabat', kode)
            .then(function () {
              Swal.close();
              Swal.fire({ icon: 'success', title: 'Dihapus', text: 'Data pejabat berhasil dihapus.', timer: 1500, showConfirmButton: false });
              renderPengaturanPejabat();
            })
            .catch(function (err) {
              Swal.fire({ icon: 'error', title: 'Gagal Menghapus', text: err.message });
            });
        }
      });
    }

    window.renderPengaturanPejabat = renderPengaturanPejabat;
    window.modalTambahPejabat = modalTambahPejabat;
    window.simpanPejabatBaru = simpanPejabatBaru;
    window.editPejabat = editPejabat;
    window.prosesUpdatePejabat = prosesUpdatePejabat;
    window.hapusPejabat = hapusPejabat;

    function modalTambahUser() {
      const modalHtml = `
        <div class="modal fade" id="modalTambahUser" tabindex="-1" role="dialog" aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered" role="document">
            <div class="modal-content overflow-hidden rounded-xl border-0 shadow-2xl">
              <div class="modal-header bg-blue-600 text-white p-4">
                <h5 class="modal-title font-bold text-base flex items-center gap-2">
                  <i class="fas fa-user-plus"></i>
                  <span>Mendaftarkan Pengguna Admin Baru</span>
                </h5>
                <button type="button" class="close text-white opacity-85 hover:opacity-100" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div class="modal-body p-6 bg-slate-50">
                <div class="space-y-4">
                  <div class="form-group">
                    <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Nama Lengkap</label>
                    <input type="text" id="add_user_nama" class="form-control rounded-lg text-sm" placeholder="Contoh: Rian Pratama">
                  </div>
                  <div class="form-group">
                    <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Username (Kunci Login)</label>
                    <input type="text" id="add_user_username" class="form-control rounded-lg text-sm" placeholder="Gunakan huruf kecil tanpa spasi">
                  </div>
                  <div class="form-group">
                    <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">No. WhatsApp Hubung (Untuk OTP)</label>
                    <input type="text" id="add_user_kontak" class="form-control rounded-lg text-sm" placeholder="Contoh: 081234567890">
                  </div>
                  <div class="form-group">
                    <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Kata Sandi (Password)</label>
                    <input type="password" id="add_user_password" class="form-control rounded-lg text-sm" placeholder="Masukkan password akun">
                  </div>
                  <div class="form-group">
                    <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Hak Akses (Role)</label>
                    <select id="add_user_role" class="form-control rounded-lg text-sm">
                      <option value="admin">Administrator (Akses Penuh)</option>
                      <option value="petugas">Petugas Administrasi (Biasa)</option>
                    </select>
                  </div>
                </div>
              </div>
              <div class="modal-footer bg-white p-4 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" class="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs py-2 px-4 rounded-lg transition-colors" data-dismiss="modal">Batal</button>
                <button type="button" onclick="simpanUserBaru()" class="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2 px-4 rounded-lg shadow-sm transition-colors flex items-center gap-1.5">
                  <i class="fas fa-save"></i> Keamanan Login
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      const container = document.getElementById('modalContainer');
      if (container) {
        container.innerHTML = modalHtml;
        $('#modalTambahUser').modal('show');
      }
    }

    function simpanUserBaru() {
      const data = {
        nama: document.getElementById('add_user_nama').value.trim(),
        username: document.getElementById('add_user_username').value.trim(),
        kontak: document.getElementById('add_user_kontak').value.trim(),
        password: document.getElementById('add_user_password').value.trim(),
        role: document.getElementById('add_user_role').value
      };

      if (!data.nama || !data.username || !data.password || !data.kontak) {
        Swal.fire({ icon: 'warning', title: 'Data Belum Lengkap', text: 'Semua kolom termasuk No. WhatsApp wajib diisi.' });
        return;
      }

      Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

      amankanPanggilanGAS('simpanUser', data)
        .then(function () {
          Swal.close();
          $('#modalTambahUser').modal('hide');
          Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Pengguna admin berhasil ditambahkan!', timer: 1500, showConfirmButton: false });
          renderPengaturanUsers();
        })
        .catch(function (err) {
          Swal.fire({ icon: 'error', title: 'Gagal Menyimpan', text: err.message });
        });
    }

    function editUser(u) {
      const modalHtml = `
        <div class="modal fade" id="modalEditUser" tabindex="-1" role="dialog" aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered" role="document">
            <div class="modal-content overflow-hidden rounded-xl border-0 shadow-2xl">
              <div class="modal-header bg-amber-500 text-white p-4">
                <h5 class="modal-title font-bold text-base flex items-center gap-2">
                  <i class="fas fa-user-edit"></i>
                  <span>Perbarui Informasi Akun</span>
                </h5>
                <button type="button" class="close text-white opacity-85 hover:opacity-100" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div class="modal-body p-6 bg-slate-50">
                <div class="space-y-4">
                  <div class="form-group">
                    <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Username (Kunci Unik - Tidak Dapat Diedit)</label>
                    <input type="text" id="edit_user_username" class="form-control rounded-lg text-sm bg-slate-200 font-mono" value="${u.username}" readonly>
                  </div>
                  <div class="form-group">
                    <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Nama Lengkap</label>
                    <input type="text" id="edit_user_nama" class="form-control rounded-lg text-sm" value="${u.nama}" placeholder="Nama admin">
                  </div>
                  <div class="form-group">
                    <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">No. WhatsApp Aktif (OTP)</label>
                    <input type="text" id="edit_user_kontak" class="form-control rounded-lg text-sm" value="${u.kontak || ''}" placeholder="Contoh: 081234567890">
                  </div>
                  <div class="form-group">
                    <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Kata Sandi Baru</label>
                    <input type="text" id="edit_user_password" class="form-control rounded-lg text-sm" value="${u.password}" placeholder="Kata sandi">
                  </div>
                  <div class="form-group">
                    <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Hak Akses (Role)</label>
                    <select id="edit_user_role" class="form-control rounded-lg text-sm">
                      <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Administrator (Akses Penuh)</option>
                      <option value="petugas" ${u.role === 'petugas' ? 'selected' : ''}>Petugas Administrasi (Biasa)</option>
                    </select>
                  </div>
                </div>
              </div>
              <div class="modal-footer bg-white p-4 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" class="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs py-2 px-4 rounded-lg transition-colors" data-dismiss="modal">Batal</button>
                <button type="button" onclick="prosesUpdateUser()" class="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs py-2 px-4 rounded-lg shadow-sm transition-colors flex items-center gap-1.5">
                  <i class="fas fa-sync"></i> Perbarui Akun
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      const container = document.getElementById('modalContainer');
      if (container) {
        container.innerHTML = modalHtml;
        $('#modalEditUser').modal('show');
      }
    }

    function prosesUpdateUser() {
      const data = {
        username: document.getElementById('edit_user_username').value,
        nama: document.getElementById('edit_user_nama').value.trim(),
        kontak: document.getElementById('edit_user_kontak').value.trim(),
        password: document.getElementById('edit_user_password').value.trim(),
        role: document.getElementById('edit_user_role').value
      };

      if (!data.nama || !data.password || !data.kontak) {
        Swal.fire({ icon: 'warning', title: 'Data Belum Lengkap', text: 'Nama Lengkap, No. WA, and Password wajib diisi.' });
        return;
      }

      Swal.fire({ title: 'Memproses pembaruan...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

      amankanPanggilanGAS('updateUser', data)
        .then(function () {
          Swal.close();
          $('#modalEditUser').modal('hide');
          Swal.fire({ icon: 'success', title: 'Terperbarui', text: 'Kredensial pengguna admin berhasil diubah!', timer: 1500, showConfirmButton: false });
          renderPengaturanUsers();
        })
        .catch(function (err) {
          Swal.fire({ icon: 'error', title: 'Gagal', text: err.message });
        });
    }

    function hapusUser(username) {
      Swal.fire({
        title: 'Hapus Akun Pengguna ini?',
        text: 'Pengguna tersebut tidak akan lagi memiliki hak akses ke Dashboard Panel Admin.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Ya, Hapus Akun',
        cancelButtonText: 'Batal'
      }).then((result) => {
        if (result.isConfirmed) {
          Swal.fire({ title: 'Menghapus...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
          amankanPanggilanGAS('hapusUser', username)
            .then(function () {
              Swal.close();
              Swal.fire({ icon: 'success', title: 'Dihapus', text: 'Akun administrator berhasil dicabut dari sistem.', timer: 1500, showConfirmButton: false });
              renderPengaturanUsers();
            })
            .catch(function (err) {
              Swal.fire({ icon: 'error', title: 'Gagal Menghapus', text: err.message });
            });
        }
      });
    }

    function batalTambahTemplate() {
      if (tempUploadedTemplateId) {
        amankanPanggilanGAS('hapusFileDrive', tempUploadedTemplateId)
          .catch(e => console.error("Gagal menghapus file temp dari sistem:", e));
      }
      tempUploadedTemplateId = null;
      $('#modalTambahTemplate').modal('hide');
    }

    function modalTambahTemplate() {
      amankanPanggilanGAS('getNomorSurat')
        .then(function (nomorSuratList) {
          let selectOptions = '<option value="">-- Hubungkan Klasifikasi Nomor --</option>';
          nomorSuratList.forEach(n => {
            selectOptions += `<option value="${n.kode}">${n.kode} - ${n.jenis_surat}</option>`;
          });

          const modalHtml = `
            <div class="modal fade" id="modalTambahTemplate" data-backdrop="static" data-keyboard="false" tabindex="-1" role="dialog" aria-hidden="true">
              <div class="modal-dialog modal-lg modal-dialog-centered" role="document">
                <div class="modal-content overflow-hidden rounded-xl border-0 shadow-2xl">
                  <div class="modal-header bg-blue-600 text-white p-4">
                    <h5 class="modal-title font-bold text-base flex items-center gap-2">
                      <i class="fas fa-file-upload"></i>
                      <span>Daftarkan Jenis Template Surat Baru</span>
                    </h5>
                    <button type="button" class="close text-white opacity-85 hover:opacity-100" onclick="batalTambahTemplate()" aria-label="Close">
                      <span aria-hidden="true">&times;</span>
                    </button>
                  </div>
                  <div class="modal-body p-6 bg-slate-50">
                    <div class="row">
                      <div class="col-md-6 form-group">
                        <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Kode Surat (Gunakan Kapital)</label>
                        <input type="text" id="add_tpl_kode" class="form-control rounded-lg text-sm font-mono" placeholder="Contoh: SKU, SKD, SKTM">
                      </div>
                      <div class="col-md-6 form-group">
                        <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Nama / Jenis Dokumen Surat</label>
                        <input type="text" id="add_tpl_jenis" class="form-control rounded-lg text-sm" placeholder="Contoh: Surat Keterangan Usaha">
                      </div>
                      <div class="col-md-12 form-group">
                        <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Grup Klasifikasi Penomoran Surat (Relasi)</label>
                        <select id="add_tpl_kode_nomor" class="form-control rounded-lg text-sm">
                          ${selectOptions}
                        </select>
                        <span class="text-[10px] text-slate-400 mt-1 block">Surat-surat dengan Klasifikasi Penomoran yang sama akan berbagi urutan counter nomor yang sama.</span>
                      </div>

                      <div class="col-md-12 form-group border border-blue-200 bg-blue-50/30 p-3 rounded-lg mb-3">
                        <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1 block text-blue-700">
                          <i class="fas fa-cloud-upload-alt mr-1"></i> Upload Template Ms. Word (.docx)
                        </label>
                        <div class="custom-file mb-1">
                          <input type="file" class="custom-file-input" id="upload_docx_file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onchange="prosesUploadTemplateDocx(this)">
                          <label class="custom-file-label text-xs text-slate-500" for="upload_docx_file" id="labelDocxSelected">Pilih file .docx Anda...</label>
                        </div>
                        <span class="text-[10px] text-slate-500 mt-1 block">File otomatis dikonversi jadi Google Docs. ID-nya akan terisi di form bawah ini.</span>
                        <div id="uploadStatusDocx" class="text-[11px] mt-2 font-semibold" style="display: none;"></div>
                      </div>

                      <div class="col-md-12 form-group">
                        <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Google Docs Template ID</label>
                        <input type="text" id="add_tpl_id" class="form-control rounded-lg text-sm font-mono" placeholder="Masukkan ID berkas atau upload file di atas">
                      </div>
                      <div class="col-md-12 form-group">
                        <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Variabel Dinamis Kustom (Pisahkan dengan Koma)</label>
                        <input type="text" id="add_tpl_fields" class="form-control rounded-lg text-sm font-mono" placeholder="Contoh: NAMA_USAHA,ALAMAT_USAHA,JENIS_DAGANGAN">
                      </div>
                    </div>
                  </div>
                  <div class="modal-footer bg-white p-4 flex justify-end gap-2 border-t border-slate-100">
                    <button type="button" class="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs py-2 px-4 rounded-lg transition-colors" onclick="batalTambahTemplate()">Batal</button>
                    <button type="button" onclick="simpanTemplateBaru()" class="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2 px-4 rounded-lg shadow-sm transition-colors flex items-center gap-1.5">
                      <i class="fas fa-save"></i> Daftarkan Surat
                    </button>
                  </div>
                </div>
              </div>
            </div>
          `;

          const container = document.getElementById('modalContainer');
          if (container) {
            container.innerHTML = modalHtml;
            $('#modalTambahTemplate').modal('show');
          }
        })
        .catch(function (err) {
          Swal.fire({ icon: 'error', title: 'Gagal Memuat Klasifikasi', text: err.message });
        });
    }

    function simpanTemplateBaru() {
      const data = {
        kode: document.getElementById('add_tpl_kode').value.trim().toUpperCase(),
        jenis: document.getElementById('add_tpl_jenis').value.trim(),
        template_id: document.getElementById('add_tpl_id').value.trim(),
        fields: document.getElementById('add_tpl_fields').value.trim(),
        kode_nomor: document.getElementById('add_tpl_kode_nomor').value
      };

      if (!data.kode || !data.jenis || !data.template_id || !data.kode_nomor) {
        Swal.fire({ icon: 'warning', title: 'Data Belum Lengkap', text: 'Kode Surat, Nama Jenis Surat, Google Docs ID, and Klasifikasi Nomor wajib diisi.' });
        return;
      }

      Swal.fire({ title: 'Menyimpan konfigurasi...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

      amankanPanggilanGAS('simpanTemplateSurat', data)
        .then(function () {
          Swal.close();
          tempUploadedTemplateId = null;
          $('#modalTambahTemplate').modal('hide');
          Swal.fire({ icon: 'success', title: 'Sukses', text: 'Template baru berhasil disimpan di database!', timer: 1500, showConfirmButton: false });
          renderPengaturanTemplates();
        })
        .catch(function (err) {
          Swal.fire({ icon: 'error', title: 'Gagal Menyimpan', text: err.message });
        });
    }

    function prosesUploadTemplateDocx(input) {
      const file = input.files[0];
      if (!file) return;

      if (!file.name.endsWith('.docx')) {
        Swal.fire({ icon: 'error', title: 'Format Salah', text: 'Hanya format Microsoft Word (.docx) yang diizinkan.' });
        input.value = '';
        document.getElementById('labelDocxSelected').innerText = 'Pilih file .docx Anda...';
        return;
      }

      document.getElementById('labelDocxSelected').innerText = file.name;
      const statusEl = document.getElementById('uploadStatusDocx');
      statusEl.style.display = 'block';
      statusEl.className = 'text-[11px] mt-2 font-semibold text-blue-600';
      statusEl.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Sedang mengunggah & mengekstrak variabel, mohon tunggu...';

      const reader = new FileReader();
      reader.onload = function (e) {
        const base64Data = e.target.result;
        amankanPanggilanGAS('uploadAndConvertTemplate', base64Data, file.name)
          .then(function (result) {
            statusEl.className = 'text-[11px] mt-2 font-semibold text-emerald-600';
            statusEl.innerHTML = '<i class="fas fa-check-circle mr-1"></i> Konversi berhasil! ID Template terisi otomatis.';

            document.getElementById('add_tpl_id').value = result.docId;
            tempUploadedTemplateId = result.docId;

            if (result.customFields) {
              document.getElementById('add_tpl_fields').value = result.customFields;
              statusEl.innerHTML += `<br><i class="fas fa-magic text-amber-500 mr-1 mt-1"></i> ${result.customFields.split(',').length} parameter kustom otomatis diekstrak!`;
            }
          })
          .catch(function (err) {
            statusEl.className = 'text-[11px] mt-2 font-semibold text-red-600';
            statusEl.innerHTML = '<i class="fas fa-times-circle mr-1"></i> Gagal: ' + err.message;
            Swal.fire({ icon: 'error', title: 'Upload Gagal', text: err.message });
          });
      };
      reader.readAsDataURL(file);
    }

    function editTemplate(t) {
      amankanPanggilanGAS('getNomorSurat')
        .then(function (nomorSuratList) {
          let selectOptions = '<option value="">-- Hubungkan Klasifikasi Nomor --</option>';
          nomorSuratList.forEach(n => {
            const selected = n.kode.toString() === t.kode_nomor.toString() ? 'selected' : '';
            selectOptions += `<option value="${n.kode}" ${selected}>${n.kode} - ${n.jenis_surat}</option>`;
          });

          const modalHtml = `
            <div class="modal fade" id="modalEditTemplate" tabindex="-1" role="dialog" aria-hidden="true">
              <div class="modal-dialog modal-lg modal-dialog-centered" role="document">
                <div class="modal-content overflow-hidden rounded-xl border-0 shadow-2xl">
                  <div class="modal-header bg-amber-500 text-white p-4">
                    <h5 class="modal-title font-bold text-base flex items-center gap-2">
                      <i class="fas fa-edit"></i>
                      <span>Perbarui Pengaturan Template</span>
                    </h5>
                    <button type="button" class="close text-white opacity-85 hover:opacity-100" data-dismiss="modal" aria-label="Close">
                      <span aria-hidden="true">&times;</span>
                    </button>
                  </div>
                  <div class="modal-body p-6 bg-slate-50">
                    <div class="row">
                      <div class="col-md-6 form-group">
                        <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Kode Surat (Kunci Utama - Tidak Dapat Diubah)</label>
                        <input type="text" id="edit_tpl_kode" class="form-control rounded-lg text-sm bg-slate-200 font-mono" value="${t.kode}" readonly>
                      </div>
                      <div class="col-md-6 form-group">
                        <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Nama / Jenis Dokumen Surat</label>
                        <input type="text" id="edit_tpl_jenis" class="form-control rounded-lg text-sm" value="${t.jenis}">
                      </div>
                      <div class="col-md-12 form-group">
                        <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Grup Klasifikasi Penomoran Surat (Relasi)</label>
                        <select id="edit_tpl_kode_nomor" class="form-control rounded-lg text-sm">
                          ${selectOptions}
                        </select>
                      </div>
                      <div class="col-md-12 form-group">
                        <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Google Docs Template ID</label>
                        <input type="text" id="edit_tpl_id" class="form-control rounded-lg text-sm font-mono" value="${t.template_id}">
                      </div>
                      <div class="col-md-12 form-group">
                        <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Atribut Dinamis / Variabel Kustom (Pisahkan Koma)</label>
                        <input type="text" id="edit_tpl_fields" class="form-control rounded-lg text-sm font-mono" value="${t.fields || ''}">
                      </div>
                    </div>
                  </div>
                  <div class="modal-footer bg-white p-4 flex justify-end gap-2 border-t border-slate-100">
                    <button type="button" class="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs py-2 px-4 rounded-lg transition-colors" data-dismiss="modal">Batal</button>
                    <button type="button" onclick="prosesUpdateTemplate()" class="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs py-2 px-4 rounded-lg shadow-sm transition-colors flex items-center gap-1.5">
                      <i class="fas fa-sync"></i> Perbarui Template
                    </button>
                  </div>
                </div>
              </div>
            </div>
          `;
          document.getElementById('modalContainer').innerHTML = modalHtml;
          $('#modalEditTemplate').modal('show');
        })
        .catch(function (err) {
          Swal.fire({ icon: 'error', title: 'Gagal Memuat Klasifikasi', text: err.message });
        });
    }

    function prosesUpdateTemplate() {
      const data = {
        kode: document.getElementById('edit_tpl_kode').value,
        jenis: document.getElementById('edit_tpl_jenis').value.trim(),
        template_id: document.getElementById('edit_tpl_id').value.trim(),
        fields: document.getElementById('edit_tpl_fields').value.trim(),
        kode_nomor: document.getElementById('edit_tpl_kode_nomor').value
      };

      if (!data.jenis || !data.template_id || !data.kode_nomor) {
        Swal.fire({ icon: 'warning', title: 'Data Belum Lengkap', text: 'Nama Surat, Klasifikasi, and Google Docs ID wajib diisi.' });
        return;
      }

      Swal.fire({ title: 'Menyimpan konfigurasi...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

      amankanPanggilanGAS('updateTemplateSurat', data)
        .then(function () {
          Swal.close();
          $('#modalEditTemplate').modal('hide');
          Swal.fire({ icon: 'success', title: 'Terperbarui', text: 'Konfigurasi jenis template surat berhasil diubah!', timer: 1500, showConfirmButton: false });
          renderPengaturanTemplates();
        })
        .catch(function (err) {
          Swal.fire({ icon: 'error', title: 'Gagal Memperbarui', text: err.message });
        });
    }

    function hapusTemplate(kode, templateId) {
      Swal.fire({
        title: 'Hapus Template ini?',
        text: 'Data registrasi akan dihapus, dan file Google Docs Template juga akan dimasukkan ke Kotak Sampah Drive.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Ya, Hapus Semua',
        cancelButtonText: 'Batal'
      }).then((result) => {
        if (result.isConfirmed) {
          Swal.fire({ title: 'Menghapus Data & File...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
          amankanPanggilanGAS('hapusTemplateSurat', kode, templateId)
            .then(function () {
              Swal.close();
              Swal.fire({ icon: 'success', title: 'Dihapus', text: 'Data sistem and file Drive berhasil dibersihkan.', timer: 2000, showConfirmButton: false });
              renderPengaturanTemplates();
            })
            .catch(function (err) {
              Swal.fire({ icon: 'error', title: 'Gagal Menghapus', text: err.message });
            });
        }
      });
    }

    function modalTambahNomorSurat() {
      const modalHtml = `
        <div class="modal fade" id="modalTambahNomor" tabindex="-1" role="dialog" aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered" role="document">
            <div class="modal-content overflow-hidden rounded-xl border-0 shadow-2xl">
              <div class="modal-header bg-blue-600 text-white p-4">
                <h5 class="modal-title font-bold text-base flex items-center gap-2">
                  <i class="fas fa-plus"></i>
                  <span>Tambah Klasifikasi Baru</span>
                </h5>
                <button type="button" class="close text-white opacity-85 hover:opacity-100" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div class="modal-body p-6 bg-slate-50">
                <div class="space-y-4">
                  <div class="form-group">
                    <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Kode Klasifikasi (Maks 15 Karakter)</label>
                    <input type="text" id="add_ns_kode" class="form-control rounded-lg text-sm font-mono" placeholder="Contoh: 400.10.02.02 atau 300.12.2">
                  </div>
                  <div class="form-group">
                    <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Deskripsi / Nama Grup</label>
                    <input type="text" id="add_ns_jenis" class="form-control rounded-lg text-sm" placeholder="Contoh: Umum / Pengantar Nikah / SKCK">
                  </div>
                  <div class="form-group">
                    <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Nomor Urut Awal / Terakhir</label>
                    <input type="number" id="add_ns_last" class="form-control rounded-lg text-sm font-mono" value="0" placeholder="0">
                  </div>
                  <div class="form-group">
                    <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Format Nomor Surat</label>
                    <input type="text" id="add_ns_format" class="form-control rounded-lg text-sm font-mono" value="[KODE]/[NO]/Desa-Tgl/[TAHUN]" placeholder="Contoh: 400.10.02.02/[NO]/429.523.01/[TAHUN]">
                    <span class="text-[10px] text-slate-400 mt-1 block">Wajib menyertakan <code class="font-bold">[NO]</code> and <code class="font-bold">[TAHUN]</code>.</span>
                  </div>
                </div>
              </div>
              <div class="modal-footer bg-white p-4 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" class="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs py-2 px-4 rounded-lg transition-colors" data-dismiss="modal">Batal</button>
                <button type="button" onclick="simpanNomorSuratBaru()" class="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2 px-4 rounded-lg shadow-sm transition-colors flex items-center gap-1.5">
                  <i class="fas fa-save"></i> Daftarkan
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
      document.getElementById('modalContainer').innerHTML = modalHtml;
      $('#modalTambahNomor').modal('show');
    }

    function simpanNomorSuratBaru() {
      const data = {
        kode: document.getElementById('add_ns_kode').value.trim(),
        jenis_surat: document.getElementById('add_ns_jenis').value.trim(),
        last_number: document.getElementById('add_ns_last').value || 0,
        format: document.getElementById('add_ns_format').value.trim()
      };

      if (!data.kode || !data.jenis_surat || !data.format) {
        Swal.fire({ icon: 'warning', title: 'Data Belum Lengkap', text: 'Semua kolom klasifikasi wajib ditentukan.' });
        return;
      }

      if (!data.format.includes('[NO]')) {
        Swal.fire({ icon: 'warning', title: 'Format Salah', text: 'Format nomor surat wajib menyertakan tag [NO]' });
        return;
      }

      Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

      amankanPanggilanGAS('simpanNomorSurat', data)
        .then(function () {
          Swal.close();
          $('#modalTambahNomor').modal('hide');
          Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Format Klasifikasi penomoran berhasil didaftarkan!', timer: 1500, showConfirmButton: false });
          renderPengaturanNomor();
        })
        .catch(function (err) {
          Swal.fire({ icon: 'error', title: 'Gagal Menyimpan', text: err.message });
        });
    }

    function editNomorSurat(n) {
      const modalHtml = `
        <div class="modal fade" id="modalEditNomor" tabindex="-1" role="dialog" aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered" role="document">
            <div class="modal-content overflow-hidden rounded-xl border-0 shadow-2xl">
              <div class="modal-header bg-amber-500 text-white p-4">
                <h5 class="modal-title font-bold text-base flex items-center gap-2">
                  <i class="fas fa-edit"></i>
                  <span>Perbarui Format Nomor Surat</span>
                </h5>
                <button type="button" class="close text-white opacity-85 hover:opacity-100" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div class="modal-body p-6 bg-slate-50">
                <div class="space-y-4">
                  <div class="form-group">
                    <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Kode Klasifikasi (Tidak Dapat Diubah)</label>
                    <input type="text" id="edit_ns_kode" class="form-control rounded-lg text-sm bg-slate-200 font-mono" value="${n.kode}" readonly>
                  </div>
                  <div class="form-group">
                    <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Deskripsi / Nama Grup</label>
                    <input type="text" id="edit_ns_jenis" class="form-control rounded-lg text-sm" value="${n.jenis_surat}">
                  </div>
                  <div class="form-group">
                    <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Nomor Urut Terakhir</label>
                    <input type="number" id="edit_ns_last" class="form-control rounded-lg text-sm font-mono" value="${n.last_number}">
                  </div>
                  <div class="form-group">
                    <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Format Nomor Surat</label>
                    <input type="text" id="edit_ns_format" class="form-control rounded-lg text-sm font-mono" value="${n.format}">
                  </div>
                </div>
              </div>
              <div class="modal-footer bg-white p-4 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" class="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs py-2 px-4 rounded-lg transition-colors" data-dismiss="modal">Batal</button>
                <button type="button" onclick="prosesUpdateNomorSurat()" class="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs py-2 px-4 rounded-lg shadow-sm transition-colors flex items-center gap-1.5">
                  <i class="fas fa-sync"></i> Perbarui
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
      document.getElementById('modalContainer').innerHTML = modalHtml;
      $('#modalEditNomor').modal('show');
    }

    function prosesUpdateNomorSurat() {
      const data = {
        kode: document.getElementById('edit_ns_kode').value,
        jenis_surat: document.getElementById('edit_ns_jenis').value.trim(),
        last_number: document.getElementById('edit_ns_last').value || 0,
        format: document.getElementById('edit_ns_format').value.trim()
      };

      if (!data.jenis_surat || !data.format) {
        Swal.fire({ icon: 'warning', title: 'Data Belum Lengkap', text: 'Deskripsi dan Format penomoran wajib ditentukan.' });
        return;
      }

      if (!data.format.includes('[NO]')) {
        Swal.fire({ icon: 'warning', title: 'Format Salah', text: 'Format nomor surat wajib menyertakan tag [NO]' });
        return;
      }

      Swal.fire({ title: 'Memperbarui...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

      amankanPanggilanGAS('updateNomorSurat', data)
        .then(function () {
          Swal.close();
          $('#modalEditNomor').modal('hide');
          Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Klasifikasi penomoran berhasil diperbarui!', timer: 1500, showConfirmButton: false });
          renderPengaturanNomor();
        })
        .catch(function (err) {
          Swal.fire({ icon: 'error', title: 'Gagal', text: err.message });
        });
    }

    function hapusNomorSurat(kode) {
      Swal.fire({
        title: 'Hapus Format Klasifikasi ini?',
        text: 'Menghapus klasifikasi dapat memutus urutan penomoran surat yang menginduk ke kode ini.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Ya, Hapus Klasifikasi',
        cancelButtonText: 'Batal'
      }).then((result) => {
        if (result.isConfirmed) {
          Swal.fire({ title: 'Menghapus...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
          amankanPanggilanGAS('hapusNomorSurat', kode)
            .then(function () {
              Swal.close();
              Swal.fire({ icon: 'success', title: 'Dihapus', text: 'Klasifikasi penomoran berhasil dihapus.', timer: 1500, showConfirmButton: false });
              renderPengaturanNomor();
            })
            .catch(function (err) {
              Swal.fire({ icon: 'error', title: 'Gagal Menghapus', text: err.message });
            });
        }
      });
    }

    // Inisialisasi basis data simulasi TTE Pejabat di LocalStorage jika belum ada
    if (!localStorage.getItem('mock_tte_pejabat')) {
      localStorage.setItem('mock_tte_pejabat', JSON.stringify([
        { "nama": "H. Mulyadi, S.Sos.", "jabatan": "Kepala Desa Tegalsari", "nip": "197508122003121002", "email": "mulyadi.kades@banyuwangikab.go.id", "status_tte": "Aktif (BSrE)", "tanggal": "12 April 2026" },
        { "nama": "Rian Hermawan", "jabatan": "Sekretaris Desa", "nip": "198211052010011003", "email": "rian.hermawan@banyuwangikab.go.id", "status_tte": "Menunggu Token", "tanggal": "02 Juni 2026" },
        { "nama": "Siti Aminah", "jabatan": "Kaur Keuangan", "nip": "-", "email": "siti.aminah@banyuwangikab.go.id", "status_tte": "Belum Terdaftar", "tanggal": "-" }
      ]));
    }

    function loadRegisterTTE() {
      setActiveNav('nav-tte');

      document.getElementById('content').innerHTML = `
        <div class="fade-in space-y-6 pb-8">
          <!-- Header Modul -->
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div class="flex items-center gap-4">
              <div class="bg-cyan-100 text-cyan-600 p-3 rounded-xl flex items-center justify-center shrink-0">
                <i class="fas fa-fingerprint text-2xl"></i>
              </div>
              <div>
                <h1 class="text-xl font-bold text-slate-800 tracking-tight">Registrasi TTE Mandiri</h1>
                <p class="text-xs text-slate-500 mt-0.5">Integrasi Layanan Sertifikasi Tanda Tangan Elektronik BSrE melalui Portal Mandiri Desa Tegalsari.</p>
              </div>
            </div>
            
            <a href="https://sikawan.banyuwangikab.go.id/masuk" target="_blank" rel="noopener noreferrer" class="group bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white hover:text-white font-bold text-xs py-2.5 px-5 rounded-xl shadow-lg shadow-cyan-600/20 hover:shadow-xl hover:shadow-cyan-600/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 flex items-center gap-2 no-underline hover:no-underline">
              <i class="fas fa-external-link-alt text-[10px] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200"></i>
              <span class="tracking-wide">Buka Portal Resmi SIKAWAN</span>
            </a>
          </div>

          <!-- TAB SUB-MODUL TTE -->
          <div class="flex border-b border-slate-200 bg-white rounded-xl p-2 shadow-sm gap-2">
            <button id="tab-tte-antrean" onclick="gantiSubTabTte('antrean')" class="flex-1 md:flex-initial py-2.5 px-5 text-center font-bold text-xs rounded-lg bg-cyan-600 text-white shadow-sm transition-all">
              <i class="fas fa-tasks mr-1.5"></i> Antrean & Approval TTE Dokumen
            </button>
            <button id="tab-tte-pejabat" onclick="gantiSubTabTte('pejabat')" class="flex-1 md:flex-initial py-2.5 px-5 text-center font-bold text-xs rounded-lg text-slate-500 hover:text-cyan-600 hover:bg-slate-50 transition-all">
              <i class="fas fa-users-cog mr-1.5"></i> Profil & Registrasi Akun Pejabat
            </button>
          </div>

          <!-- SUB-TAB 1: ANTREAN SURAT MENUNGGU TTE (UTAMA) -->
          <div id="subtab-tte-antrean-section" class="space-y-6 fade-in">
            <!-- PANDUAN AKTIVASI SMART WEBHOOK APPROVAL -->
            <div class="bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-2xl p-5 shadow-sm flex gap-4 text-xs text-slate-700 leading-relaxed fade-in">
              <div class="bg-cyan-100 text-cyan-600 w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                <i class="fas fa-magic text-lg"></i>
              </div>
              <div class="space-y-1">
                <strong class="block text-sm font-bold text-slate-800">âš¡ Fitur Smart Approval: TTE Otomatis via Balasan WhatsApp "YA"</strong>
                <p class="text-slate-600">Saat Anda menekan tombol <strong class="text-green-600 font-bold"><i class="fab fa-whatsapp"></i> WA Notif</strong>, pejabat berwenang akan otomatis menerima notifikasi yang memuat rincian dan tautan dokumen draf PDF. Pejabat cukup membalas chat tersebut dengan mengetik kata <strong class="bg-white border border-cyan-300 px-1.5 py-0.5 rounded font-mono font-bold text-cyan-700">YA</strong> dari ponsel mereka, maka sistem secara otomatis langsung mengesahkan dokumen (TTE), membubuhkan QR Code, dan mengirimkan file final ke warga pemohon.</p>
                <div class="mt-3 pt-2 border-t border-cyan-200/50 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]">
                  <span class="font-bold text-slate-700"><i class="fas fa-cog"></i> Cara Mengaktifkan Webhook:</span>
                  <span>1. Klik menu <strong>Deploy</strong> -> <strong>New Deployment</strong> di editor GAS.</span>
                  <span>2. Pilih tipe <strong>Web App</strong>, ubah aksesnya menjadi <strong>Anyone</strong>, lalu salin URL Web App yang terbit.</span>
                  <span>3. Tempel URL tersebut pada kolom <strong>Webhook URL</strong> di Dashboard Device Fonnte Anda.</span>
                </div>
              </div>
            </div>

            <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4 mb-4">
                <div>
                  <h3 class="font-bold text-sm text-slate-800">Antrean Surat Menunggu Tanda Tangan</h3>
                  <p class="text-xs text-slate-500">Kirim notifikasi persetujuan WA ke Pejabat yang berwenang, lalu lakukan pengesahan (TTE).</p>
                </div>
                <button onclick="loadAntreanTteTable(true)" class="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-600 font-semibold text-xs py-2 px-4 rounded-lg transition-colors flex items-center gap-1.5">
                  <i class="fas fa-sync-alt"></i> Refresh Antrean
                </button>
              </div>

              <div class="table-responsive">
                <table class="table min-w-full text-left border-collapse">
                  <thead class="bg-slate-50 border-b border-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                    <tr>
                      <th class="p-4 text-center w-12">No</th>
                      <th class="p-4">Tanggal Buat</th>
                      <th class="p-4">Nomor Dokumen</th>
                      <th class="p-4">Jenis Surat / Pemohon</th>
                      <th class="p-4">Pejabat Pengesah</th>
                      <th class="p-4 text-center">Status TTE</th>
                      <th class="p-4 text-center w-64">Aksi Pengesahan</th>
                    </tr>
                  </thead>
                  <tbody id="tbodyAntreanTTE" class="divide-y divide-slate-100 text-xs text-slate-700">
                    <tr>
                      <td colspan="7" class="text-center py-8 text-slate-400">
                        <div class="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-cyan-600 mb-2"></div>
                        <p>Memuat antrean draf surat...</p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- SUB-TAB 2: REGISTRASI & PROFIL PEJABAT -->
          <div id="subtab-tte-pejabat-section" class="space-y-6 fade-in" style="display: none;">
            <!-- Grid Konten Utama -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              <!-- KOLOM KIRI: FORM REGISTRASI MANDIRI (Step-by-Step Wizard) -->
              <div class="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div class="bg-slate-50 border-b border-slate-100 p-5">
                  <h3 class="font-bold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <i class="fas fa-file-signature text-cyan-600"></i>
                    <span>Formulir Pengajuan Sertifikat TTE Mandiri</span>
                  </h3>
                </div>
                
                <div class="p-6 flex-grow space-y-4">
                  <div class="bg-cyan-50/70 border border-cyan-100 p-4 rounded-xl text-xs text-cyan-800 leading-relaxed">
                    <i class="fas fa-info-circle mr-1 text-sm"></i>
                    <span>Formulir ini digunakan untuk mengajukan sertifikasi tanda tangan digital bagi perangkat desa baru ke Dinas Kominfo & BSrE Kabupaten Banyuwangi.</span>
                  </div>

                  <!-- Step 1: Informasi Pejabat -->
                  <div class="space-y-3">
                    <h4 class="text-xs font-bold text-slate-500 uppercase tracking-wider">Langkah 1: Identitas Pejabat Pemohon</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div class="form-group mb-0">
                        <label class="text-[10px] font-bold text-slate-600 uppercase mb-1 block">Nama Lengkap & Gelar</label>
                        <input type="text" id="reg_tte_nama" class="form-control rounded-lg text-xs" placeholder="Contoh: H. Mulyadi, S.Sos.">
                      </div>
                      <div class="form-group mb-0">
                        <label class="text-[10px] font-bold text-slate-600 uppercase mb-1 block">NIP / NIAP (PNS/Perangkat)</label>
                        <input type="text" id="reg_tte_nip" class="form-control rounded-lg text-xs" placeholder="Contoh: 19750812XXXXXXXXXX atau -">
                      </div>
                      <div class="form-group mb-0">
                        <label class="text-[10px] font-bold text-slate-600 uppercase mb-1 block">Jabatan Pemerintahan</label>
                        <input type="text" id="reg_tte_jabatan" class="form-control rounded-lg text-xs" placeholder="Contoh: Kaur Keuangan / Sekdes">
                      </div>
                      <div class="form-group mb-0">
                        <label class="text-[10px] font-bold text-slate-600 uppercase mb-1 block">Email Resmi Dinas / Instansi</label>
                        <input type="email" id="reg_tte_email" class="form-control rounded-lg text-xs" placeholder="username@banyuwangikab.go.id">
                      </div>
                    </div>
                  </div>

                  <hr class="border-slate-100">

                  <!-- Step 2: Upload Berkas SIKAWAN -->
                  <div class="space-y-3">
                    <h4 class="text-xs font-bold text-slate-500 uppercase tracking-wider">Langkah 2: Kelengkapan Berkas Administrasi (Scan PDF)</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div class="form-group mb-0">
                        <label class="text-[10px] font-bold text-slate-600 uppercase mb-1 block">Scan KTP & SK Jabatan (Max 2MB)</label>
                        <div class="custom-file">
                          <input type="file" class="custom-file-input" id="reg_tte_file_sk" accept="application/pdf" onchange="document.getElementById('lbl_sk_tte').innerText = this.files[0].name">
                          <label class="custom-file-label text-[11px] text-slate-400" id="lbl_sk_tte" for="reg_tte_file_sk">Pilih Berkas SK...</label>
                        </div>
                      </div>
                      <div class="form-group mb-0">
                        <label class="text-[10px] font-bold text-slate-600 uppercase mb-1 block">Surat Rekomendasi Camat (Max 2MB)</label>
                        <div class="custom-file">
                          <input type="file" class="custom-file-input" id="reg_tte_file_rek" accept="application/pdf" onchange="document.getElementById('lbl_rek_tte').innerText = this.files[0].name">
                          <label class="custom-file-label text-[11px] text-slate-400" id="lbl_rek_tte" for="reg_tte_file_rek">Pilih Berkas Rekomendasi...</label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="pt-4 border-t border-slate-100 flex justify-end">
                    <button onclick="prosesAjukanTTEMandiri()" class="bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs py-2.5 px-6 rounded-lg shadow-md shadow-cyan-600/10 transition-colors flex items-center gap-2">
                      <i class="fas fa-paper-plane"></i>
                      <span>Kirim Pengajuan TTE Mandiri</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- KOLOM KANAN: ALUR PROSES INTEGRASI (Visual Timeline) -->
              <div class="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
                <div>
                  <h3 class="font-bold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-1">
                    <i class="fas fa-project-diagram text-cyan-600"></i>
                    <span>Alur Verifikasi SIKAWAN - BSrE</span>
                  </h3>
                  <p class="text-[11px] text-slate-400">Tahapan wajib dari registrasi berkas hingga sertifikat tanda tangan aktif.</p>
                </div>

                <!-- Vertical Timeline Stepper -->
                <div class="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-[11px] before:top-1.5 before:bottom-1.5 before:w-[2px] before:bg-slate-200">
                  
                  <!-- Step 1 -->
                  <div class="relative">
                    <div class="absolute -left-[20px] top-0 w-[11px] h-[11px] rounded-full bg-cyan-600 ring-4 ring-cyan-100 flex items-center justify-center"></div>
                    <h4 class="text-xs font-bold text-slate-800">1. Pengajuan Mandiri (Operator Desa)</h4>
                    <p class="text-[11px] text-slate-500 mt-1">Mengunggah identitas pejabat desa, SK Pengangkatan, Surat Rekomendasi Camat, dan Email Dinas ke sistem.</p>
                  </div>

                  <!-- Step 2 -->
                  <div class="relative">
                    <div class="absolute -left-[20px] top-0 w-[11px] h-[11px] rounded-full bg-slate-300 ring-4 ring-slate-100 flex items-center justify-center"></div>
                    <h4 class="text-xs font-bold text-slate-800">2. Verifikasi Dinas PMD & Kominfo</h4>
                    <p class="text-[11px] text-slate-500 mt-1">Tim verifikator mengevaluasi validitas keaslian dokumen kependudukan, masa aktif SK, dan kesesuaian administrasi.</p>
                  </div>

                  <!-- Step 3 -->
                  <div class="relative">
                    <div class="absolute -left-[20px] top-0 w-[11px] h-[11px] rounded-full bg-slate-300 ring-4 ring-slate-100 flex items-center justify-center"></div>
                    <h4 class="text-xs font-bold text-slate-800">3. Email Aktivasi & E-KYC (BSrE)</h4>
                    <p class="text-[11px] text-slate-500 mt-1">BSrE mengirim tautan aktivasi mandiri ke email dinas terdaftar untuk verifikasi wajah (E-KYC) & pembuatan passphrase/PIN.</p>
                  </div>

                  <!-- Step 4 -->
                  <div class="relative">
                    <div class="absolute -left-[20px] top-0 w-[11px] h-[11px] rounded-full bg-slate-300 ring-4 ring-slate-100 flex items-center justify-center"></div>
                    <h4 class="text-xs font-bold text-slate-800">4. Penerbitan & E-Surat Siap Digunakan</h4>
                    <p class="text-[11px] text-slate-500 mt-1">Sertifikat digital BSrE terbit dan langsung diintegrasikan dengan aplikasi E-Surat untuk mengesahkan draf PDF surat.</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- BAGIAN BAWAH: STATUS PENGAJUAN PEJABAT (Tabel Status) -->
            <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div class="bg-slate-50 border-b border-slate-100 p-5 flex justify-between items-center">
                <h3 class="font-bold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <i class="fas fa-list-alt text-cyan-600"></i>
                  <span>Status Registrasi & Aktivasi TTE Pejabat Tegalsari</span>
                </h3>
                <span class="text-[10px] bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Daftar Pejabat</span>
              </div>

              <div class="table-responsive">
                <table class="table min-w-full text-left border-collapse mb-0">
                  <thead class="bg-slate-50 border-b border-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                    <tr>
                      <th class="p-4 text-center w-12">No</th>
                      <th class="p-4">Nama Pejabat</th>
                      <th class="p-4">Jabatan</th>
                      <th class="p-4">NIP / NIAP</th>
                      <th class="p-4">Email Dinas</th>
                      <th class="p-4 text-center">Status BSrE</th>
                      <th class="p-4 text-center w-36">Aksi Mandiri</th>
                    </tr>
                  </thead>
                  <tbody id="tbodyTTEPejabat" class="divide-y divide-slate-100 text-xs text-slate-700">
                    <!-- Data diisi oleh JS -->
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      `;
      loadAntreanTteTable();
      renderTTEPejabatTable();
    }

    function gantiSubTabTte(tab) {
      const btnAntrean = document.getElementById('tab-tte-antrean');
      const btnPejabat = document.getElementById('tab-tte-pejabat');
      const secAntrean = document.getElementById('subtab-tte-antrean-section');
      const secPejabat = document.getElementById('subtab-tte-pejabat-section');

      if (tab === 'antrean') {
        btnAntrean.className = "flex-1 md:flex-initial py-2.5 px-5 text-center font-bold text-xs rounded-lg bg-cyan-600 text-white shadow-sm transition-all";
        btnPejabat.className = "flex-1 md:flex-initial py-2.5 px-5 text-center font-bold text-xs rounded-lg text-slate-500 hover:text-cyan-600 hover:bg-slate-50 transition-all";
        secAntrean.style.display = 'block';
        secPejabat.style.display = 'none';
        loadAntreanTteTable();
      } else {
        btnPejabat.className = "flex-1 md:flex-initial py-2.5 px-5 text-center font-bold text-xs rounded-lg bg-cyan-600 text-white shadow-sm transition-all";
        btnAntrean.className = "flex-1 md:flex-initial py-2.5 px-5 text-center font-bold text-xs rounded-lg text-slate-500 hover:text-cyan-600 hover:bg-slate-50 transition-all";
        secPejabat.style.display = 'block';
        secAntrean.style.display = 'none';
        renderTTEPejabatTable();
      }
    }

    function loadAntreanTteTable(forceRefresh = false) {
      if (forceRefresh) {
        API_CACHE.invalidateQuery('getSuratSelesai');
        API_CACHE.invalidateQuery('getSuratSelesaiCount');
        API_CACHE.invalidateQuery('getPejabat');
      }
      const tbody = document.getElementById('tbodyAntreanTTE');
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-8 text-slate-400">
            <div class="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-cyan-600 mb-2"></div>
            <p>Menghubungkan ke arsip draf surat...</p>
          </td>
        </tr>
      `;

      Promise.all([
        amankanPanggilanGAS('getSuratSelesai'),
        amankanPanggilanGAS('getPejabat')
      ])
        .then(([suratList, pejabatList]) => {
          if (!Array.isArray(suratList)) {
            suratList = [];
          }
          if (suratList.length === 0) {
            tbody.innerHTML = `
            <tr>
              <td colspan="7" class="text-center py-10 text-slate-400">
                <i class="fas fa-folder-open text-3xl mb-3 block text-slate-300"></i>
                <span>Tidak ada draf pengeluaran surat yang membutuhkan tanda tangan digital saat ini.</span>
              </td>
            </tr>
          `;
            return;
          }

          let html = '';
          suratList.slice().reverse().forEach((s, i) => {
            // Mencari pejabat pengesah berdasarkan kode yang tersimpan di database secara permanen
            const pejabatPengesah = pejabatList.find(p => p.kode === s.pejabat_kode) || pejabatList[0];

            let badgeStatus = '';
            let aksiTte = '';

            if (s.tte_status === "Sudah TTE") {
              badgeStatus = `
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                <i class="fas fa-check-circle"></i> TTE Aktif
              </span>
            `;
              aksiTte = `
              <div class="flex gap-1 justify-center">
                <a href="${s.file}" target="_blank" class="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold px-2 py-1 text-[10px] rounded transition-colors inline-flex items-center gap-1">
                  <i class="fas fa-file-pdf"></i> PDF
                </a>
                <span class="text-[10px] text-slate-400 font-bold self-center flex items-center gap-0.5 ml-1">
                  <i class="fas fa-fingerprint text-emerald-500"></i> QR Sealed
                </span>
              </div>
            `;
            } else {
              badgeStatus = `
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">
                <i class="fas fa-clock"></i> Belum TTE
              </span>
            `;
              aksiTte = `
              <div class="flex flex-col sm:flex-row gap-1 justify-center">
                <button onclick="kirimNotifTteKePejabat('${escJS(s.nomor)}', '${escJS(pejabatPengesah.nama)}', '${escJS(pejabatPengesah.kontak)}', '${escJS(s.jenis)}', '${escJS(s.nama)}')" class="bg-green-600 hover:bg-green-700 text-white font-bold px-2 py-1 text-[10px] rounded transition-colors inline-flex items-center justify-center gap-1">
                  <i class="fab fa-whatsapp"></i> WA Notif
                </button>
                <button onclick="bukaSimulasiHpPejabat('${escJS(s.nomor)}', '${escJS(pejabatPengesah.nama)}', '${escJS(pejabatPengesah.kontak)}', '${escJS(s.jenis)}', '${escJS(s.nama)}')" class="bg-cyan-600 hover:bg-cyan-700 text-white font-bold px-2 py-1 text-[10px] rounded transition-colors inline-flex items-center justify-center gap-1" title="Buka Simulator Handphone Pejabat">
                  <i class="fas fa-mobile-alt"></i> Simulasi HP 📱
                </button>
              </div>
            `;
            }

            html += `
            <tr class="hover:bg-slate-50/70 transition-colors">
              <td class="p-4 text-center font-medium text-slate-400">${i + 1}</td>
              <td class="p-4 text-slate-500 font-medium">${s.tanggal}</td>
              <td class="p-4">
                <div class="font-bold text-slate-950">${s.jenis}</div>
                <div class="text-[10px] text-slate-400 font-mono font-semibold mt-0.5">${s.nomor}</div>
              </td>
              <td class="p-4">
                <div class="font-bold text-slate-800">${s.nama}</div>
                <div class="text-[10px] text-slate-400 font-mono">${s.nik}</div>
              </td>
              <td class="p-4">
                <div class="font-bold text-slate-800">${pejabatPengesah.nama}</div>
                <div class="text-[10px] text-cyan-600 font-semibold uppercase">${pejabatPengesah.jabatan}</div>
              </td>
              <td class="p-4 text-center">${badgeStatus}</td>
              <td class="p-4 text-center">${aksiTte}</td>
            </tr>
          `;
          });
          tbody.innerHTML = html;
        })
        .catch(err => {
          tbody.innerHTML = `
          <tr>
            <td colspan="7" class="text-center py-8 text-red-500 font-semibold">Gagal memuat antrean: ${err.message}</td>
          </tr>
        `;
        });
    }

    function kirimNotifTteKePejabat(nomorSurat, namaPejabat, kontakPejabat, jenisSurat, namaWarga) {
      if (!kontakPejabat || kontakPejabat === 'undefined' || kontakPejabat.trim() === '' || kontakPejabat === '-') {
        Swal.fire({
          icon: 'error',
          title: 'Nomor WA Tidak Ditemukan',
          html: `<div class="text-left text-xs space-y-2">
            <p>Pejabat <b>${namaPejabat}</b> belum memiliki nomor WhatsApp yang terdaftar di sistem.</p>
            <p class="font-semibold text-slate-700">Cara Mengatasi:</p>
            <ol class="list-decimal pl-4 space-y-1 text-slate-600">
              <li>Buka Google Spreadsheet proyek Anda.</li>
              <li>Pilih sheet bernama <b>"Pejabat"</b>.</li>
              <li>Buat <b>Kolom F (Kolom ke-6)</b> dengan judul baris pertama: <b>KONTAK</b>.</li>
              <li>Tulis nomor WhatsApp pejabat tersebut di bawahnya (Contoh: <code class="bg-slate-100 p-0.5 rounded font-mono">082251102016</code>).</li>
            </ol>
          </div>`,
          confirmButtonColor: '#0891b2'
        });
        return;
      }

      Swal.fire({
        title: 'Kirim Notifikasi WA?',
        text: `Kirim pesan pengajuan TTE surat kepada ${namaPejabat} (${kontakPejabat}) via Fonnte?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#16a34a',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Kirim WhatsApp',
        cancelButtonText: 'Batal'
      }).then((result) => {
        if (result.isConfirmed) {
          Swal.fire({ title: 'Mengirimkan pesan WA...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

          amankanPanggilanGAS('kirimWaPejabat', nomorSurat, namaPejabat, kontakPejabat, jenisSurat, namaWarga)
            .then(() => {
              Swal.close();
              Swal.fire({
                icon: 'success',
                title: 'Notifikasi Terkirim!',
                text: `Instruksi tanda tangan digital berhasil dilarungkan ke WA ${namaPejabat}.`,
                timer: 2000,
                showConfirmButton: false
              });
            })
            .catch(err => {
              Swal.close();
              Swal.fire({ icon: 'error', title: 'Gagal Kirim', text: err.message });
            });
        }
      });
    }

    function bukaSimulasiHpPejabat(nomorSurat, namaPejabat, kontakPejabat, jenisSurat, namaWarga) {
      const container = document.getElementById('modalContainer');

      const phoneHtml = `
        <div id="simulasiHpModal" class="modal fade" tabindex="-1" role="dialog" aria-hidden="true" style="z-index: 1050;">
          <div class="modal-dialog modal-dialog-centered flex items-center justify-center m-0 min-h-full" role="document" style="max-width: 100%;">
            <div class="modal-content border-0 bg-transparent shadow-none w-auto">
              <div class="relative bg-black w-[350px] h-[680px] rounded-[50px] shadow-[0_0_50px_rgba(0,0,0,0.8)] border-[12px] border-slate-800 overflow-hidden flex flex-col fade-in">
                <!-- Notch Handphone -->
                <div class="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-50 flex items-center justify-center">
                  <div class="w-12 h-1 bg-slate-700 rounded-full mb-1"></div>
                </div>

                <!-- LAYAR UTAMA (Aplikasi WhatsApp Mockup) -->
                <div id="hpScreenContainer" class="w-full h-full bg-slate-100 flex flex-col pt-6 relative select-none">
                  
                  <!-- Screen 1: Chat WhatsApp -->
                  <div id="screenWaChat" class="flex flex-col h-full w-full">
                    <!-- Header Chat WA -->
                    <div class="bg-[#075e54] text-white p-3 flex items-center gap-2.5 shadow-md">
                      <i class="fas fa-arrow-left text-xs cursor-pointer" onclick="tutupSimulasiHpPejabat()"></i>
                      <img src="https://ui-avatars.com/api/?name=${namaPejabat.replace(/\s+/g, '+')}&background=0D8ABC&color=fff&rounded=true" class="w-7 h-7 rounded-full shadow border border-white/20" alt="Avatar">
                      <div class="leading-tight flex-1">
                        <h5 class="text-xs font-bold truncate">${namaPejabat}</h5>
                        <span class="text-[9px] text-emerald-200">Online</span>
                      </div>
                      <div class="flex gap-3 text-xs">
                        <i class="fas fa-video"></i>
                        <i class="fas fa-phone"></i>
                        <i class="fas fa-ellipsis-v"></i>
                      </div>
                    </div>

                    <!-- Chat Wallpaper & Messages Area -->
                    <div class="flex-grow p-3 space-y-3 overflow-y-auto flex flex-col justify-end bg-[#ece5dd] pb-14">
                      <!-- Tanggal Chat -->
                      <div class="mx-auto bg-white/70 text-slate-500 text-[8px] font-bold uppercase py-0.5 px-2 rounded-md shadow-sm">Hari Ini</div>
                      
                      <!-- Balon Chat Pesan Pengajuan -->
                      <div class="bg-white rounded-xl rounded-tl-none p-3 shadow-sm max-w-[85%] self-start border border-slate-200">
                        <h6 class="text-[10px] font-bold text-cyan-700 uppercase tracking-wide mb-1 flex items-center gap-1">
                          <i class="fas fa-file-alt"></i> E-Surat Desa Tegalsari
                        </h6>
                        <p class="text-[10px] text-slate-800 leading-normal">
                          Yth. Bapak/Ibu *${namaPejabat}*,<br><br>
                          Mohon tinjau & sahkan permohonan surat warga berikut:<br>
                          • *Surat:* ${jenisSurat}<br>
                          • *Nomor:* ${nomorSurat}<br>
                          • *Warga:* ${namaWarga}
                        </p>
                        
                        <!-- Link Persetujuan di Dalam WA -->
                        <div class="mt-3 pt-2.5 border-t border-slate-100">
                          <button onclick="navigasiSikawanApprove('${escJS(nomorSurat)}', '${escJS(namaPejabat)}', '${escJS(jenisSurat)}', '${escJS(namaWarga)}')" class="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-[10px] py-2 px-3 rounded-lg shadow transition-colors flex items-center justify-center gap-1.5">
                            <i class="fas fa-link"></i>
                            <span>👉 BUKA LINK SIKAWAN</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <!-- Footer Input WA -->
                    <div class="absolute bottom-0 left-0 right-0 p-2 bg-slate-200 flex items-center gap-2">
                      <div class="flex-grow bg-white rounded-full py-1 px-3 flex items-center gap-2 shadow-sm border border-slate-200">
                        <i class="far fa-smile text-slate-400 text-xs"></i>
                        <input type="text" readonly class="w-full text-[10px] bg-transparent border-0 focus:outline-none" placeholder="Ketik pesan...">
                        <i class="fas fa-paperclip text-slate-400 text-xs"></i>
                      </div>
                      <div class="w-8 h-8 rounded-full bg-[#075e54] text-white flex items-center justify-center shadow-md">
                        <i class="fas fa-microphone text-xs"></i>
                      </div>
                    </div>
                  </div>

                  <!-- Screen 2: Portal SIKAWAN - Konfirmasi BSrE -->
                  <div id="screenSikawanApprove" class="flex flex-col h-full w-full bg-slate-50" style="display: none;">
                    <!-- Header SIKAWAN -->
                    <div class="bg-slate-900 text-white p-3 flex items-center gap-2 shadow border-b border-cyan-500/20">
                      <i class="fas fa-chevron-left text-xs cursor-pointer" onclick="kembaliKeWaChat()"></i>
                      <div class="flex items-center gap-1.5 flex-grow">
                        <i class="fas fa-fingerprint text-cyan-400 text-xs"></i>
                        <span class="text-[10px] font-bold tracking-widest uppercase">SIKAWAN SECURE</span>
                      </div>
                      <span class="text-[8px] bg-emerald-500 text-white px-1.5 py-0.5 rounded font-bold uppercase">BSrE</span>
                    </div>

                    <!-- Isi Panel Review Surat SIKAWAN -->
                    <div class="flex-grow p-4 overflow-y-auto space-y-4">
                      <div class="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm space-y-2">
                        <h4 class="text-[11px] font-bold text-slate-800 border-b border-slate-100 pb-1.5">Review Dokumen Elektronik</h4>
                        
                        <div class="space-y-1 text-[9px] text-slate-600">
                          <div><span class="text-slate-400">Nama Pejabat:</span> <strong class="text-slate-700">${namaPejabat}</strong></div>
                          <div><span class="text-slate-400">Jenis Dokumen:</span> <strong class="text-slate-700">${jenisSurat}</strong></div>
                          <div><span class="text-slate-400">No. Surat:</span> <strong class="text-slate-700 font-mono">${nomorSurat}</strong></div>
                          <div><span class="text-slate-400">Pemohon:</span> <strong class="text-slate-700">${namaWarga}</strong></div>
                        </div>
                      </div>

                      <!-- Secure Pin Passphrase Box -->
                      <div class="bg-cyan-50 border border-cyan-200 rounded-xl p-4 shadow-sm space-y-3">
                        <div class="text-center">
                          <i class="fas fa-shield-alt text-cyan-600 text-xl mb-1"></i>
                          <h5 class="text-[10px] font-bold text-cyan-800">Passphrase Keamanan TTE</h5>
                          <p class="text-[8px] text-cyan-600 mt-0.5">Sertifikasi TTE ini disahkan oleh Balai Sertifikasi Elektronik (BSrE).</p>
                        </div>

                        <div class="form-group mb-0">
                          <input type="password" id="inputPassphraseTte" class="form-control text-center text-xs font-mono font-bold tracking-widest rounded-lg py-2" placeholder="••••">
                          <span class="text-[8px] text-slate-400 text-center block mt-1">Gunakan PIN simulasi: <strong class="text-cyan-600 font-mono">1234</strong></span>
                        </div>

                        <button onclick="prosesSimulasiSahkanTte('${nomorSurat}')" class="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs py-2.5 rounded-lg shadow-md shadow-cyan-600/20 transition-all flex items-center justify-center gap-1.5">
                          <i class="fas fa-signature"></i>
                          <span>Bubuhkan QR Code TTE</span>
                        </button>
                      </div>
                    </div>

                    <!-- Footer SIKAWAN -->
                    <div class="p-3 text-center text-[7px] text-slate-400 border-t border-slate-100 bg-white">
                      Dinas Kominfo & Persandian Banyuwangi &copy; 2026
                    </div>
                  </div>

                  <!-- Screen 3: Animasi Loading Proses TTE -->
                  <div id="screenTteProcessing" class="flex flex-col items-center justify-center h-full w-full bg-slate-900 text-white p-6 text-center" style="display: none;">
                    <div class="relative w-16 h-16 mb-4 flex items-center justify-center">
                      <div class="absolute inset-0 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin"></div>
                      <i class="fas fa-fingerprint text-cyan-400 text-2xl animate-pulse"></i>
                    </div>
                    <h4 class="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-1">Processing...</h4>
                    <p id="tteProgressMessage" class="text-[9px] text-slate-400 font-medium">Menghubungkan ke secure server BSrE...</p>
                  </div>

                  <!-- Screen 4: Sukses Seal TTE -->
                  <div id="screenTteSuccess" class="flex flex-col items-center justify-center h-full w-full bg-[#059669] text-white p-6 text-center" style="display: none;">
                    <div class="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-white mb-4 shadow-lg animate-bounce">
                      <i class="fas fa-check text-2xl"></i>
                    </div>
                    <h4 class="text-sm font-bold tracking-wider mb-1">PENGESAHAN SUKSES!</h4>
                    <p class="text-[10px] text-emerald-100 leading-normal max-w-[200px] mx-auto">Tanda tangan elektronik resmi berhasil dibubuhkan ke dokumen draf PDF melalui enkripsi SHA-256.</p>
                    <span class="text-[8px] bg-white/10 px-2 py-0.5 rounded mt-3 font-mono">Status: QR Sealed BSrE</span>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      container.innerHTML = phoneHtml;
      const modalEl = $('#simulasiHpModal');
      modalEl.modal({
        backdrop: 'static',
        keyboard: true
      });
      modalEl.modal('show');

      modalEl.on('hidden.bs.modal', function () {
        modalEl.remove();
      });
    }

    function tutupSimulasiHpPejabat() {
      $('#simulasiHpModal').modal('hide');
    }

    function navigasiSikawanApprove() {
      document.getElementById('screenWaChat').style.display = 'none';
      document.getElementById('screenSikawanApprove').style.display = 'flex';
      document.getElementById('inputPassphraseTte').value = '';
    }

    function kembaliKeWaChat() {
      document.getElementById('screenSikawanApprove').style.display = 'none';
      document.getElementById('screenWaChat').style.display = 'flex';
    }

    function prosesSimulasiSahkanTte(nomorSurat) {
      const pin = document.getElementById('inputPassphraseTte').value;
      if (!pin) {
        Swal.fire({ icon: 'warning', title: 'Perhatian', text: 'Sebutkan Passphrase sertifikat TTE (BSrE) Anda.' });
        return;
      }

      if (pin !== '1234') {
        Swal.fire({ icon: 'error', title: 'Gagal', text: 'Passphrase/PIN TTE Anda salah! (Gunakan PIN Simulasi: 1234)' });
        return;
      }

      // Mulai Animasi Proses Penandatanganan
      document.getElementById('screenSikawanApprove').style.display = 'none';
      const screenProc = document.getElementById('screenTteProcessing');
      const textProc = document.getElementById('tteProgressMessage');
      screenProc.style.display = 'flex';

      setTimeout(() => {
        textProc.innerText = 'Melakukan verifikasi kunci E-KYC pejabat...';
        setTimeout(() => {
          textProc.innerText = 'Mengenkripsi berkas dengan tanda digital SHA-256...';
          setTimeout(() => {
            textProc.innerText = 'Membubuhkan QR Code QR-Sealed resmi...';
            setTimeout(() => {

              // Panggil Fungsi Backend untuk Menyelesaikan Pengesahan TTE
              amankanPanggilanGAS('setTteApproved', nomorSurat)
                .then(() => {
                  screenProc.style.display = 'none';
                  document.getElementById('screenTteSuccess').style.display = 'flex';

                  // Bersihkan setelah beberapa saat
                  setTimeout(() => {
                    tutupSimulasiHpPejabat();
                    Swal.fire({
                      icon: 'success',
                      title: 'Pengesahan TTE Berhasil!',
                      text: `Surat nomor ${nomorSurat} telah ditandatangani secara elektronik (TTE) dan siap didownload oleh warga.`,
                      timer: 3000,
                      showConfirmButton: false
                    });
                    loadAntreanTteTable();
                  }, 2000);
                })
                .catch(err => {
                  screenProc.style.display = 'none';
                  document.getElementById('screenSikawanApprove').style.display = 'flex';
                  Swal.fire({ icon: 'error', title: 'BSrE Connection Fail', text: err.message });
                });

            }, 800);
          }, 800);
        }, 800);
      }, 800);
    }

    function renderTTEPejabatTable() {
      const data = JSON.parse(localStorage.getItem('mock_tte_pejabat')) || [];
      const tbody = document.getElementById('tbodyTTEPejabat');

      if (data.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" class="text-center py-6 text-slate-400">Belum ada pejabat yang diajukan.</td>
          </tr>
        `;
        return;
      }

      let html = '';
      data.forEach((d, i) => {
        let badgeClass = 'bg-gray-100 text-gray-800';
        let actionBtn = '';

        if (d.status_tte === 'Aktif (BSrE)') {
          badgeClass = 'bg-emerald-100 text-emerald-800 font-bold';
          actionBtn = `
            <span class="text-[10px] font-bold text-emerald-600 flex items-center justify-center gap-1">
              <i class="fas fa-check-circle"></i> Sertifikasi Aktif
            </span>
          `;
        } else if (d.status_tte === 'Menunggu Token') {
          badgeClass = 'bg-amber-100 text-amber-800 font-bold animate-pulse';
          actionBtn = `
            <button onclick="simulasiKirimUlangToken('${escJS(d.nama)}', '${escJS(d.email)}')" class="bg-amber-500 hover:bg-amber-600 text-white rounded px-2.5 py-1 text-[10px] font-bold transition-all w-full flex items-center justify-center gap-1">
              <i class="fas fa-sync-alt text-[9px]"></i> Resend Email
            </button>
          `;
        } else if (d.status_tte === 'Menunggu Verifikasi') {
          badgeClass = 'bg-blue-100 text-blue-800 font-bold';
          actionBtn = `
            <button onclick="simulasiSelesaikanTTE('${i}')" class="bg-blue-600 hover:bg-blue-700 text-white rounded px-2.5 py-1 text-[10px] font-bold transition-all w-full flex items-center justify-center gap-1">
              <i class="fas fa-check"></i> Approve TTE
            </button>
          `;
        } else {
          badgeClass = 'bg-red-50 text-red-700 border border-red-100 font-bold';
          actionBtn = `
            <button onclick="simulasiIsiFormTTE('${escJS(d.nama)}', '${escJS(d.nip)}', '${escJS(d.jabatan)}', '${escJS(d.email)}')" class="bg-cyan-600 hover:bg-cyan-700 text-white rounded px-2.5 py-1 text-[10px] font-bold transition-all w-full flex items-center justify-center gap-1">
              <i class="fas fa-plus text-[9px]"></i> Registrasi
            </button>
          `;
        }

        html += `
          <tr class="hover:bg-slate-50/70 transition-colors">
            <td class="p-4 text-center font-medium text-slate-400">${i + 1}</td>
            <td class="p-4 font-bold text-slate-900">${d.nama}</td>
            <td class="p-4 font-semibold text-slate-700">${d.jabatan}</td>
            <td class="p-4 font-mono">${d.nip}</td>
            <td class="p-4 font-mono text-slate-600">${d.email}</td>
            <td class="p-4 text-center">
              <span class="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${badgeClass}">${d.status_tte}</span>
            </td>
            <td class="p-4 text-center">
              <div class="inline-flex w-full justify-center">
                ${actionBtn}
              </div>
            </td>
          </tr>
        `;
      });
      tbody.innerHTML = html;
    }

    function prosesAjukanTTEMandiri() {
      const nama = document.getElementById('reg_tte_nama').value.trim();
      const nip = document.getElementById('reg_tte_nip').value.trim();
      const jabatan = document.getElementById('reg_tte_jabatan').value.trim();
      const email = document.getElementById('reg_tte_email').value.trim();
      const fileSk = document.getElementById('reg_tte_file_sk').files[0];
      const fileRek = document.getElementById('reg_tte_file_rek').files[0];

      if (!nama || !jabatan || !email) {
        Swal.fire({ icon: 'warning', title: 'Data Kurang Lengkap', text: 'Nama, Jabatan, dan Email Dinas wajib diisi.' });
        return;
      }

      if (!fileSk || !fileRek) {
        Swal.fire({ icon: 'warning', title: 'Berkas Kurang Lengkap', text: 'Scan berkas SK dan Rekomendasi Camat wajib dilampirkan.' });
        return;
      }

      Swal.fire({
        title: 'Mengirim Usulan Ke SIKAWAN...',
        text: 'Mengunggah berkas administrasi dan mendaftarkan identitas pejabat ke Kominfo Kabupaten Banyuwangi.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
      });

      setTimeout(() => {
        Swal.close();
        let currentDb = JSON.parse(localStorage.getItem('mock_tte_pejabat')) || [];

        // Cek jika pejabat sudah pernah didaftarkan
        const existIdx = currentDb.findIndex(d => d.email.toLowerCase() === email.toLowerCase());
        if (existIdx !== -1) {
          currentDb[existIdx].status_tte = 'Menunggu Verifikasi';
          currentDb[existIdx].nip = nip || '-';
          currentDb[existIdx].jabatan = jabatan;
        } else {
          currentDb.push({
            "nama": nama,
            "jabatan": jabatan,
            "nip": nip || '-',
            "email": email,
            "status_tte": "Menunggu Verifikasi",
            "tanggal": formatTanggalIndonesia(new Date())
          });
        }

        localStorage.setItem('mock_tte_pejabat', JSON.stringify(currentDb));

        Swal.fire({
          icon: 'success',
          title: 'Usulan Berhasil Dikirim!',
          text: 'Berkas pendaftaran TTE mandiri berhasil disimpan di antrean SIKAWAN. Tim Kominfo akan segera memproses verifikasi kelayakan.',
          confirmButtonColor: '#0891b2'
        });

        // Reset Form
        document.getElementById('reg_tte_nama').value = '';
        document.getElementById('reg_tte_nip').value = '';
        document.getElementById('reg_tte_jabatan').value = '';
        document.getElementById('reg_tte_email').value = '';
        document.getElementById('reg_tte_file_sk').value = '';
        document.getElementById('reg_tte_file_rek').value = '';
        document.getElementById('lbl_sk_tte').innerText = 'Pilih Berkas SK...';
        document.getElementById('lbl_rek_tte').innerText = 'Pilih Berkas Rekomendasi...';

        renderTTEPejabatTable();
      }, 1500);
    }

    function simulasiIsiFormTTE(nama, nip, jabatan, email) {
      document.getElementById('reg_tte_nama').value = nama;
      document.getElementById('reg_tte_nip').value = nip === '-' ? '' : nip;
      document.getElementById('reg_tte_jabatan').value = jabatan;
      document.getElementById('reg_tte_email').value = email;
      document.getElementById('reg_tte_nama').focus();
    }

    function simulasiKirimUlangToken(nama, email) {
      Swal.fire({
        title: 'Kirim Ulang Token BSrE?',
        text: `Kirim ulang instruksi verifikasi tanda tangan elektronik ke email resmi: ${email}`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#f59e0b',
        confirmButtonText: 'Kirim Ulang',
        cancelButtonText: 'Batal'
      }).then(res => {
        if (res.isConfirmed) {
          Swal.fire({ title: 'Memproses...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
          setTimeout(() => {
            Swal.close();
            Swal.fire({ icon: 'success', title: 'Berhasil Terkirim', text: 'Token aktivasi sertifikat digital berhasil di-resend ke kotak masuk.', timer: 1500, showConfirmButton: false });
          }, 1000);
        }
      });
    }

    function simulasiSelesaikanTTE(index) {
      Swal.fire({
        title: 'Setujui Sertifikasi TTE?',
        text: 'Langkah ini mensimulasikan persetujuan administrasi berkas oleh Dinas PMD & Kominfo Kabupaten Banyuwangi.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#059669',
        confirmButtonText: 'Selesaikan & Aktifkan TTE',
        cancelButtonText: 'Batal'
      }).then(res => {
        if (res.isConfirmed) {
          let currentDb = JSON.parse(localStorage.getItem('mock_tte_pejabat')) || [];
          if (currentDb[index]) {
            currentDb[index].status_tte = 'Aktif (BSrE)';
            localStorage.setItem('mock_tte_pejabat', JSON.stringify(currentDb));
            Swal.fire({ icon: 'success', title: 'TTE Pejabat Aktif!', text: 'Sertifikat Tanda Tangan Elektronik berhasil diterbitkan oleh BSrE dan siap digunakan.', timer: 2000, showConfirmButton: false });
            renderTTEPejabatTable();
          }
        }
      });
    }

    let wargaDataPenduduk = null;

    function getGoogleDriveThumbnail(url) {
      if (!url) return '';
      const match = url.match(/[-\w]{25,}/);
      if (match) {
        return `https://lh3.googleusercontent.com/d/${match[0]}=s150`;
      }
      return '';
    }

    function lihatFotoBesar(url) {
      const match = url.match(/[-\w]{25,}/);
      const imgUrl = match ? `https://lh3.googleusercontent.com/d/${match[0]}=s600` : url;
      Swal.fire({
        imageUrl: imgUrl,
        imageAlt: 'Foto Wajah Pemohon',
        imageWidth: 400,
        imageHeight: 300,
        imageClass: 'object-cover rounded-lg border border-slate-200',
        confirmButtonText: 'Tutup',
        confirmButtonColor: '#3b82f6'
      });
    }

    function resetFormWarga() {
      wargaDataPenduduk = null;
      document.getElementById('wargaNik').value = '';
      document.getElementById('wargaNik').disabled = false;

      const sVal = document.getElementById('wargaJenisSurat');
      if (sVal) sVal.value = '';
      const sBtn = document.getElementById('wargaJenisSuratBtn');
      if (sBtn) {
        sBtn.disabled = true;
        sBtn.className = "w-full flex items-center justify-between bg-slate-50 border border-slate-300 text-slate-700 rounded-lg py-2 px-3 text-sm focus:outline-none";
      }
      const sSelected = document.getElementById('wargaJenisSuratSelected');
      if (sSelected) sSelected.innerText = 'Lakukan Verifikasi NIK...';
      const sList = document.getElementById('wargaJenisSuratList');
      if (sList) sList.innerHTML = '';

      document.getElementById('wargaWa').value = '';
      document.getElementById('wargaWa').disabled = true;
      document.getElementById('wargaDetailVerifikasi').innerHTML = '';
      document.getElementById('wargaDynamicFields').innerHTML = '';
      document.getElementById('wargaSubmitArea').style.display = 'none';

      // Reset KTP area
      const ktpArea = document.getElementById('wargaKtpArea');
      if (ktpArea) ktpArea.style.display = 'none';
      wargaKtpBase64 = '';
      const ktpInput = document.getElementById('inputFotoKtpWarga');
      if (ktpInput) ktpInput.value = '';
      const ktpLabel = document.getElementById('labelKtpSelected');
      if (ktpLabel) ktpLabel.innerText = 'Pilih berkas KTP (Gambar/PDF)...';
      const ktpContainer = document.getElementById('wargaKtpPreviewContainer');
      if (ktpContainer) ktpContainer.classList.add('hidden');

      // Reset camera state
      stopKameraWarga();
      wargaCapturedPhotoBase64 = '';
      const camArea = document.getElementById('wargaCameraArea');
      if (camArea) camArea.style.display = 'none';
      const placeholder = document.getElementById('wargaCameraPlaceholder');
      if (placeholder) {
        placeholder.style.display = 'flex';
        placeholder.innerHTML = `
          <i class="fas fa-user-circle text-5xl mb-2 text-slate-500"></i>
          <span class="text-xs font-semibold">Kamera Belum Aktif</span>
          <span class="text-[10px] text-slate-500 mt-1">Tekan "Aktifkan Kamera" di bawah</span>
        `;
      }
      const video = document.getElementById('wargaVideo');
      if (video) video.style.display = 'none';
      const canvas = document.getElementById('wargaCanvas');
      if (canvas) canvas.style.display = 'none';
      const photoResult = document.getElementById('wargaPhotoResult');
      if (photoResult) {
        photoResult.src = '';
        photoResult.style.display = 'none';
      }
      const btnStart = document.getElementById('btnStartCamera');
      if (btnStart) btnStart.style.display = 'inline-flex';
      const btnCapture = document.getElementById('btnCapturePhoto');
      if (btnCapture) btnCapture.style.display = 'none';
      const btnRetake = document.getElementById('btnRetakePhoto');
      if (btnRetake) btnRetake.style.display = 'none';
    }

    function mulaiKameraWarga() {
      const video = document.getElementById('wargaVideo');
      const canvas = document.getElementById('wargaCanvas');
      const photoResult = document.getElementById('wargaPhotoResult');
      const placeholder = document.getElementById('wargaCameraPlaceholder');
      const btnStart = document.getElementById('btnStartCamera');
      const btnCapture = document.getElementById('btnCapturePhoto');
      const btnRetake = document.getElementById('btnRetakePhoto');

      if (!video || !placeholder) return;

      placeholder.innerHTML = `
        <div class="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-slate-400 mr-2"></div>
        <span class="text-xs text-slate-400 mt-2">Menghubungkan kamera...</span>
      `;

      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
        .then(function (stream) {
          wargaStream = stream;
          video.srcObject = stream;
          video.style.display = 'block';
          video.play();
          
          placeholder.style.display = 'none';
          canvas.style.display = 'none';
          photoResult.style.display = 'none';

          btnStart.style.display = 'none';
          btnCapture.style.display = 'inline-flex';
          btnRetake.style.display = 'none';
        })
        .catch(function (err) {
          console.error("Gagal mengakses kamera depan:", err);
          placeholder.innerHTML = `
            <i class="fas fa-exclamation-triangle text-3xl mb-2 text-red-500"></i>
            <span class="text-xs font-semibold text-red-500">Akses Kamera Gagal</span>
            <span class="text-[9px] text-slate-500 mt-1 px-4">Harap izinkan hak akses kamera di browser Anda.</span>
          `;
          Swal.fire({
            icon: 'error',
            title: 'Kamera Gagal',
            text: 'Tidak dapat mengakses kamera depan. Pastikan izin kamera telah diaktifkan untuk situs ini.'
          });
        });
    }

    function ambilFotoWarga() {
      const video = document.getElementById('wargaVideo');
      const canvas = document.getElementById('wargaCanvas');
      const photoResult = document.getElementById('wargaPhotoResult');
      const btnCapture = document.getElementById('btnCapturePhoto');
      const btnRetake = document.getElementById('btnRetakePhoto');

      if (!video || !canvas || !photoResult) return;

      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth || 480;
      canvas.height = video.videoHeight || 640;

      context.translate(canvas.width, 0);
      context.scale(-1, 1);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      context.setTransform(1, 0, 0, 1, 0, 0);

      wargaCapturedPhotoBase64 = canvas.toDataURL('image/jpeg', 0.8);
      
      photoResult.src = wargaCapturedPhotoBase64;
      photoResult.style.display = 'block';
      video.style.display = 'none';

      stopKameraWarga();

      btnCapture.style.display = 'none';
      btnRetake.style.display = 'inline-flex';

      // Tampilkan KTP Upload Area setelah selfie selesai
      const ktpArea = document.getElementById('wargaKtpArea');
      if (ktpArea) {
        ktpArea.style.display = 'block';
        ktpArea.scrollIntoView({ behavior: 'smooth' });
      }
    }

    function stopKameraWarga() {
      if (wargaStream) {
        wargaStream.getTracks().forEach(track => track.stop());
        wargaStream = null;
      }
      const video = document.getElementById('wargaVideo');
      if (video) video.srcObject = null;
    }

    function ulangFotoWarga() {
      wargaCapturedPhotoBase64 = '';
      const photoResult = document.getElementById('wargaPhotoResult');
      if (photoResult) {
        photoResult.src = '';
        photoResult.style.display = 'none';
      }

      // Sembunyikan dan reset KTP Upload Area
      const ktpArea = document.getElementById('wargaKtpArea');
      if (ktpArea) ktpArea.style.display = 'none';
      wargaKtpBase64 = '';
      const ktpInput = document.getElementById('inputFotoKtpWarga');
      if (ktpInput) ktpInput.value = '';
      const ktpLabel = document.getElementById('labelKtpSelected');
      if (ktpLabel) ktpLabel.innerText = 'Pilih berkas KTP (Gambar/PDF)...';
      const ktpContainer = document.getElementById('wargaKtpPreviewContainer');
      if (ktpContainer) ktpContainer.classList.add('hidden');

      mulaiKameraWarga();
    }

    function previewKtpWarga(input) {
      const file = input.files[0];
      const label = document.getElementById('labelKtpSelected');
      const preview = document.getElementById('wargaKtpPreview');
      const pdfPreview = document.getElementById('wargaKtpPdfPreview');
      const container = document.getElementById('wargaKtpPreviewContainer');
      
      if (!file) {
        wargaKtpBase64 = '';
        if (label) label.innerText = 'Pilih berkas KTP (Gambar/PDF)...';
        if (container) container.classList.add('hidden');
        return;
      }
      
      if (label) label.innerText = file.name;
      
      const reader = new FileReader();
      reader.onload = function(e) {
        wargaKtpBase64 = e.target.result;
        
        if (container) container.classList.remove('hidden');
        
        if (file.type === 'application/pdf') {
          if (preview) preview.classList.add('hidden');
          if (pdfPreview) {
            pdfPreview.src = wargaKtpBase64;
            pdfPreview.classList.remove('hidden');
          }
        } else {
          if (pdfPreview) pdfPreview.classList.add('hidden');
          if (preview) {
            preview.src = wargaKtpBase64;
            preview.classList.remove('hidden');
          }
        }
      };
      reader.readAsDataURL(file);
    }
    window.previewKtpWarga = previewKtpWarga;

    function verifikasiNikWarga() {
      const nik = document.getElementById('wargaNik').value.trim();
      if (!nik) {
        Swal.fire({ icon: 'warning', title: 'Perhatian', text: 'Masukkan 16 digit NIK Anda.' });
        return;
      }

      const verifiedArea = document.getElementById('wargaDetailVerifikasi');
      verifiedArea.innerHTML = `
        <div class="flex items-center justify-center p-6 bg-slate-50 rounded-lg border border-slate-200 mt-4">
          <div class="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2.5"></div>
          <span class="text-sm text-slate-500 font-medium">Memverifikasi kecocokan identitas warga...</span>
        </div>
      `;

      amankanPanggilanGAS('getPendudukByNik', nik)
        .then(function (data) {
          if (!data) {
            verifiedArea.innerHTML = `
              <div class="bg-red-50/90 border border-red-200/80 rounded-2xl p-6 mt-5 fade-in shadow-md flex flex-col md:flex-row justify-between items-center gap-6">
                <div class="flex items-start gap-4">
                  <div class="bg-red-500 text-white p-3 rounded-xl shadow-lg shadow-red-500/20 animate-pulse">
                    <i class="fas fa-exclamation-triangle text-xl"></i>
                  </div>
                  <div>
                    <h4 class="font-extrabold text-red-900 text-base mb-1 tracking-tight">NIK Tidak Terdaftar!</h4>
                    <p class="text-xs text-red-700/90 leading-relaxed">
                      NIK <span class="bg-red-100 px-2 py-0.5 rounded font-mono font-bold text-red-900 text-sm">${nik}</span> tidak ditemukan dalam basis data kependudukan Desa Tegalsari.
                    </p>
                    <p class="text-[11px] text-red-600/80 mt-1 leading-relaxed">
                      Silakan hubungi operator pelayanan desa kami secara langsung melalui WhatsApp, kunjungi Kantor Desa, atau hubungi pengurus RT/RW Anda untuk mendaftarkan data kependudukan Anda.
                    </p>
                  </div>
                </div>
                <a href="https://wa.me/6282251102016?text=Halo%20Admin%20Desa%20Tegalsari,%20saya%20sudah%20mencoba%20memasukkan%20NIK%20saya%20(${nik})%20di%20portal%20pelayanan%20mandiri%20namun%20tidak%20terdaftar.%20Mohon%20bantuannya%20untuk%20mendaftarkan%20data%20saya." target="_blank" rel="noopener noreferrer" class="w-full md:w-auto shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.05] shadow-lg shadow-emerald-500/20 text-xs"><i class="fab fa-whatsapp text-lg"></i><span>Hubungi WA Pelayanan</span></a>
              </div>
            `;
            return;
          }

          wargaDataPenduduk = data;
          document.getElementById('wargaNik').disabled = true;

          verifiedArea.innerHTML = `
            <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mt-4 fade-in">
              <h4 class="text-emerald-800 font-bold text-sm mb-3 flex items-center gap-2">
                <i class="fas fa-check-circle text-emerald-500"></i>
                <span>Identitas Pemohon Terverifikasi</span>
              </h4>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-y-2 gap-x-4 text-xs text-slate-700">
                <div><span class="text-slate-400">No. KK:</span> <strong class="font-mono text-slate-800">${data.no_kk || '-'}</strong></div>
                <div><span class="text-slate-400">NIK:</span> <strong class="font-mono text-slate-800">${data.nik}</strong></div>
                <div><span class="text-slate-400">Nama:</span> <strong class="text-slate-800">${data.nama}</strong></div>
                <div><span class="text-slate-400">Pendidikan:</span> <strong class="text-slate-800">${data.pendidikan || '-'}</strong></div>
                <div><span class="text-slate-400">Tempat, Tgl Lahir:</span> <strong class="text-slate-800">${data.tempat_lahir}, ${data.tanggal_lahir}</strong></div>
                <div><span class="text-slate-400">Gender /Agama/Status:</span> <strong class="text-slate-800">${data.jk}/${data.agama}/${data.status}</strong></div>
                <div><span class="text-slate-400">Alamat:</span> <strong class="text-slate-800">${data.alamat} (RT.${data.rt}/RW.${data.rw})</strong></div>
                <div><span class="text-slate-400">Pekerjaan/Warga Negara:</span> <strong class="text-slate-800">${data.pekerjaan}/${data.kewarganegaraan}</strong></div>
              </div>
            </div>
          `;

          document.getElementById('wargaWa').disabled = false;
          document.getElementById('wargaWa').className = "form-control rounded-lg text-sm bg-white";

          const sBtn = document.getElementById('wargaJenisSuratBtn');
          const sSelected = document.getElementById('wargaJenisSuratSelected');
          const sList = document.getElementById('wargaJenisSuratList');

          if (sBtn) {
            sBtn.disabled = false;
            sBtn.className = "w-full flex items-center justify-between bg-white border border-slate-300 text-slate-700 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-blue-500";
          }
          if (sSelected) sSelected.innerText = "Pilih Jenis Surat Pengajuan...";
          if (sList) sList.innerHTML = '<li class="p-2 text-slate-400 italic">Menghubungi database template...</li>';

          amankanPanggilanGAS('getTemplateSurat')
            .then(function (templates) {
              let html = '';
              templates.forEach(s => {
                html += `<li onclick="selectCustomDropdownOption('wargaJenisSurat', '${escJS(s.kode)}', '${escJS(s.jenis)}')" class="p-2 hover:bg-blue-50 hover:text-blue-700 rounded cursor-pointer transition-colors" data-search="${s.jenis.toLowerCase()}">${s.jenis}</li>`;
              });
              if (sList) sList.innerHTML = html;
            });
        });
    }

    function loadFieldsSuratWarga() {
      const kode = document.getElementById('wargaJenisSurat').value;
      const container = document.getElementById('wargaDynamicFields');
      if (!kode) {
        container.innerHTML = '';
        document.getElementById('wargaSubmitArea').style.display = 'none';
        return;
      }

      container.innerHTML = `
        <div class="flex items-center justify-center p-6">
          <div class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
          <span class="text-xs text-slate-500">Mempersiapkan parameter formulir khusus...</span>
        </div>
      `;

      amankanPanggilanGAS('getFieldsSurat', kode)
        .then(function (fields) {
          document.getElementById('wargaSubmitArea').style.display = 'flex';
          const camArea = document.getElementById('wargaCameraArea');
          if (camArea) camArea.style.display = 'block';

          if (!fields || fields.length === 0) {
            container.innerHTML = `
              <div class="bg-blue-50/50 border border-blue-100 rounded-lg p-4 text-xs text-slate-600 mt-4 flex items-center gap-2">
                <i class="fas fa-info-circle text-blue-500"></i>
                <span>Surat permohonan ini siap langsung dikirimkan tanpa melampirkan berkas/data tambahan kustom.</span>
              </div>
            `;
            return;
          }

          let html = `
            <div class="card bg-slate-50 border border-slate-200 mt-4 fade-in">
              <div class="card-header bg-slate-100/50 py-3 px-4 border-b border-slate-200">
                <h4 class="text-slate-700 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                  <i class="fas fa-keyboard text-slate-500"></i>
                  <span>Lengkapi Informasi Formulir Tambahan</span>
                </h4>
              </div>
              <div class="card-body p-4">
                <div class="row">
          `;

          fields.forEach(f => {
            const labelClean = f.replace(/_/g, ' ').toUpperCase();
            html += `
              <div class="col-md-6 form-group">
                <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">${labelClean}</label>
                <input type="text" class="form-control rounded-lg text-sm field-surat-warga" data-field="${f}" placeholder="Ketik data ${labelClean}">
              </div>
            `;
          });

          html += `
                </div>
              </div>
            </div>
          `;
          container.innerHTML = html;
        });
    }

    function getKoordinatWarga() {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error("Browser Anda tidak mendukung deteksi lokasi."));
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });
          },
          (error) => {
            let errorMsg = "Gagal mendapatkan lokasi.";
            if (error.code === error.PERMISSION_DENIED) {
              errorMsg = "Wajib menggunakan lokasi";
            } else if (error.code === error.POSITION_UNAVAILABLE) {
              errorMsg = "Informasi lokasi tidak tersedia pada perangkat Anda.";
            } else if (error.code === error.TIMEOUT) {
              errorMsg = "Waktu permintaan lokasi habis (timeout). Silakan coba lagi.";
            }
            reject(new Error(errorMsg));
          },
          { enableHighAccuracy: true, timeout: 8000 }
        );
      });
    }

    function kirimPermintaanWarga() {
      const sSelect = document.getElementById('wargaJenisSurat');
      const kodeSurat = sSelect.value;
      const jenisSurat = document.getElementById('wargaJenisSuratSelected').innerText.trim();
      const inputNikValue = document.getElementById('wargaNik').value.trim();

      let wa = document.getElementById('wargaWa').value.trim().replace(/\D/g, '');

      if (wa.startsWith('0')) {
        wa = '62' + wa.slice(1);
      } else if (wa.startsWith('8')) {
        wa = '62' + wa;
      }

      if (!wargaDataPenduduk || wargaDataPenduduk.nik.toString().trim() !== inputNikValue) {
        Swal.fire({
          icon: 'warning',
          title: 'NIK Belum Terverifikasi',
          text: 'Harap lakukan verifikasi NIK Anda terlebih dahulu dengan menekan tombol "Periksa".'
        });
        return;
      }

      if (!kodeSurat) {
        Swal.fire({ icon: 'warning', title: 'Jenis Surat Kosong', text: 'Silakan pilih jenis surat pengajuan terlebih dahulu.' });
        return;
      }

      if (!wa) {
        Swal.fire({ icon: 'warning', title: 'WhatsApp Kosong', text: 'Tulis No. WhatsApp aktif agar kami dapat mengirimkan notifikasi pengambilan berkas.' });
        return;
      }

      const inputs = document.querySelectorAll('.field-surat-warga');
      const dataTambahan = {};
      const kolomKosongList = [];

      inputs.forEach(input => {
        const value = input.value.trim();
        if (value === "") {
          const labelEl = input.previousElementSibling;
          const labelText = labelEl ? labelEl.innerText.replace(/[:*]/g, '').trim() : input.dataset.field;
          kolomKosongList.push(labelText);
        }
        dataTambahan[input.dataset.field] = value;
      });

      if (kolomKosongList.length > 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Isian Formulir Belum Lengkap',
          html: `<p class="text-sm text-left mb-2">Mohon lengkapi kolom data berikut terlebih dahulu sebelum mengirim permohonan:</p>
                 <ul class="list-disc list-inside text-left text-xs text-red-600 space-y-1">
                   ${kolomKosongList.map(item => `<li><strong>${item}</strong></li>`).join('')}
                 </ul>`,
          confirmButtonColor: '#3b82f6'
        });
        return;
      }

      if (!wargaCapturedPhotoBase64) {
        Swal.fire({
          icon: 'warning',
          title: 'Foto Selfie Kosong',
          text: 'Harap ambil foto wajah Anda terlebih dahulu menggunakan kamera depan sebagai syarat verifikasi permohonan.'
        });
        return;
      }

      if (!wargaKtpBase64) {
        Swal.fire({
          icon: 'warning',
          title: 'Foto KTP Kosong',
          text: 'Harap unggah berkas KTP Anda terlebih dahulu sebagai syarat verifikasi permohonan.'
        });
        return;
      }

      // Ambil lokasi GPS terlebih dahulu secara paksa
      Swal.fire({
        title: 'Mengakses Lokasi GPS...',
        text: 'Harap izinkan akses lokasi jika muncul permintaan pada browser Anda.',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      getKoordinatWarga()
        .then((lokasi) => {
          Swal.close();

          const payload = {
            nik: wargaDataPenduduk.nik,
            nama: wargaDataPenduduk.nama,
            jenis_surat: jenisSurat,
            kode_surat: kodeSurat,
            kontak: wa,
            data_tambahan: dataTambahan,
            foto_wajah_base64: wargaCapturedPhotoBase64,
            foto_ktp_base64: wargaKtpBase64,
            latitude: lokasi.latitude,
            longitude: lokasi.longitude
          };

          const num1 = Math.floor(Math.random() * 10) + 1;
          const num2 = Math.floor(Math.random() * 10) + 1;
          const correctAns = num1 + num2;

          Swal.fire({
            title: 'Verifikasi Keamanan',
            width: '340px',
            html: `
              <p class="text-xs text-slate-500 mb-3 text-left">
                Untuk memverifikasi pengiriman dan menghindari spam bot, silakan selesaikan penjumlahan berikut:
              </p>
              <div class="bg-slate-100 py-3 rounded-lg border border-slate-200 text-center mb-1">
                <span class="text-lg font-extrabold text-slate-800 tracking-wider">${num1} + ${num2} = ?</span>
              </div>
            `,
            input: 'text',
            inputPlaceholder: 'Masukkan hasil jawaban...',
            inputAttributes: {
              autocapitalize: 'off',
              autocorrect: 'off'
            },
            showCancelButton: true,
            confirmButtonText: 'Verifikasi & Kirim',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#3b82f6',
            cancelButtonColor: '#64748b',
            preConfirm: (inputVal) => {
              if (!inputVal) {
                Swal.showValidationMessage('Harap masukkan jawaban Anda!');
                return false;
              }
              if (parseInt(inputVal.trim(), 10) !== correctAns) {
                Swal.showValidationMessage('Jawaban salah! Silakan coba lagi.');
                return false;
              }
              return true;
            }
          }).then((result) => {
            if (result.isConfirmed) {
              Swal.fire({ title: 'Mengirim permohonan...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

              amankanPanggilanGAS('kirimPermintaanSuratWarga', payload)
                .then(function () {
                  Swal.close();
                  Swal.fire({
                    icon: 'success',
                    title: 'Berhasil Terkirim!',
                    text: 'Dokumen permohonan Anda berhasil masuk antrean server. Kami akan segera memeriksa dan memprosesnya.',
                    confirmButtonColor: '#3b82f6'
                  }).then(() => {
                    resetFormWarga();
                  });
                })
                .catch(function (err) {
                  Swal.close();
                  Swal.fire({ icon: 'error', title: 'Pengiriman Gagal', text: err.message });
                });
            }
          });
        })
        .catch((err) => {
          Swal.close();
          Swal.fire({
            icon: 'error',
            title: 'Izin Lokasi Diperlukan',
            text: err.message || 'Wajib menggunakan lokasi'
          });
        });
    }

    function cariStatusPermintaanWarga() {
      const nik = document.getElementById('statusCariNik').value.trim();
      if (!nik) {
        Swal.fire({ icon: 'warning', title: 'Perhatian', text: 'Sebutkan NIK pemohon terlebih dahulu.' });
        return;
      }

      const resArea = document.getElementById('statusResultArea');
      resArea.innerHTML = `
        <div class="flex justify-center p-6">
          <div class="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
          <span>Mencari histori permohonan Anda...</span>
        </div>
      `;

      amankanPanggilanGAS('getPermintaanSuratByNik', nik)
        .then(function (result) {
          const filtered = (result && Array.isArray(result.permintaan)) ? result.permintaan : [];
          const selesaiList = (result && Array.isArray(result.selesai)) ? result.selesai : [];
          if (filtered.length === 0) {
            resArea.innerHTML = `
            <div class="text-center py-6 text-slate-400 text-sm">
              <i class="fas fa-folder-open text-3xl mb-2 block text-slate-300"></i>
              <span>NIK Anda belum pernah melakukan registrasi permohonan di portal mandiri ini.</span>
            </div>
          `;
            return;
          }

          let html = `
          <div class="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <h4 class="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3">Daftar Histori Pengajuan Anda</h4>
            <div class="space-y-3">
        `;

          filtered.slice().reverse().forEach(r => {
            let badge = '';
            let details = '';

            if (r.status === 'Menunggu') {
              badge = '<span class="px-2 py-1 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold uppercase"><i class="fas fa-hourglass-half mr-1"></i>Antrean Pemeriksaan</span>';
              details = '<p class="text-[11px] text-slate-500 mt-1.5"><i class="fas fa-info-circle mr-1"></i>Sistem sedang memverifikasi pengajuan Anda dalam daftar antrean admin.</p>';
            } else if (r.status === 'Ditolak') {
              badge = '<span class="px-2 py-1 rounded-full text-[10px] bg-red-100 text-red-800 font-bold uppercase"><i class="fas fa-times-circle mr-1"></i>Permohonan Ditolak</span>';
              let reasonHtml = r.alasan_penolakan ? `<div class="mt-2 p-2 bg-red-50 rounded border border-red-200 text-red-700 font-medium">Alasan Penolakan: <strong>${r.alasan_penolakan}</strong></div>` : '';
              details = `<p class="text-[11px] text-red-500 mt-1.5"><i class="fas fa-exclamation-triangle mr-1"></i>Persyaratan belum memenuhi kriteria atau ditolak petugas.</p>${reasonHtml}`;
            } else if (r.status === 'Proses TTE') {
              badge = '<span class="px-2 py-1 rounded-full text-[10px] bg-blue-100 text-blue-800 font-bold uppercase"><i class="fas fa-signature mr-1"></i>Proses TTE</span>';
              details = '<p class="text-[11px] text-blue-800 mt-1.5"><i class="fas fa-clock mr-1"></i> Berkas draf digital telah diproses. Dokumen Anda saat ini sedang menunggu tanda tangan elektronik (TTE) resmi.</p>';
            } else if (r.status === 'Selesai') {
              const matchingSelesai = selesaiList ? selesaiList.find(s =>
                (s.reg_id && s.reg_id.toString().trim() === r.id.toString().trim()) ||
                s.file === r.file_pdf ||
                (s.nik.toString().trim() === r.nik.toString().trim() && s.jenis.toString().trim() === r.jenis_surat.toString().trim())
              ) : null;

              const isTteSelesai = matchingSelesai && matchingSelesai.tte_status === "Sudah TTE";

              if (isTteSelesai) {
                badge = '<span class="px-2 py-1 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold uppercase"><i class="fas fa-check-circle mr-1"></i>Selesai / Terbit</span>';
                details = r.file_pdf ? `
                <div class="mt-3">
                  <a href="${r.file_pdf}" target="_blank" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-sm">
                    <i class="fas fa-file-download text-xs"></i> Unduh Surat Resmi (TTE)
                  </a>
                </div>
              ` : '<p class="text-[11px] text-slate-400 mt-1.5">File siap diunduh.</p>';
              } else {
                badge = '<span class="px-2 py-1 rounded-full text-[10px] bg-blue-100 text-blue-800 font-bold uppercase"><i class="fas fa-signature mr-1"></i>Proses TTE</span>';
                details = '<p class="text-[11px] text-blue-800 mt-1.5"><i class="fas fa-clock mr-1"></i> Berkas draf digital telah diproses. Dokumen Anda saat ini sedang menunggu tanda tangan elektronik (TTE) resmi.</p>';
              }
            } else {
              badge = `<span class="px-2 py-1 rounded-full text-[10px] bg-slate-100 text-slate-800 font-bold uppercase">${r.status}</span>`;
            }

            html += `
            <div class="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between items-start gap-2">
              <div class="w-full">
                <div class="flex items-center justify-between gap-2 flex-wrap border-b border-slate-100 pb-2 mb-2 w-full">
                  <strong class="text-slate-800 text-sm font-semibold">${r.jenis_surat}</strong>
                  ${badge}
                </div>
                <div class="text-[10px] text-slate-400 flex gap-4">
                  <span>ID Registrasi: <strong class="font-mono text-slate-600">${r.id}</strong></span>
                  <span>Tanggal: <strong class="text-slate-600">${r.tanggal}</strong></span>
                </div>
                ${details}
              </div>
            </div>
          `;
          });

          html += `</div></div>`;
          resArea.innerHTML = html;
        })
        .catch(function (err) {
          resArea.innerHTML = `<div class="text-center py-6 text-red-500 font-semibold">${err.message}</div>`;
        });
    }

    function showLoginScreen() {
      document.getElementById('mainApp').style.display = 'none';
      document.getElementById('appWarga').style.display = 'none';
      document.getElementById('appLogin').style.display = 'flex';
      hilangkanSplashLoader();
    }

    function showMainAppScreen(user) {
      if (user && user.token) {
        localStorage.setItem('auth_token', user.token);
      }
      currentUserRole = user.role || 'petugas';

      document.getElementById('appLogin').style.display = 'none';
      document.getElementById('appWarga').style.display = 'none';
      document.getElementById('mainApp').style.display = 'block';
      document.getElementById('namaLogin').innerText = user.nama || 'Administrator';

      const sidebarNama = document.getElementById('sidebarNamaLogin');
      if (sidebarNama) sidebarNama.innerText = user.nama || 'Administrator';
      const sidebarRole = document.getElementById('sidebarRole');
      if (sidebarRole) sidebarRole.innerText = user.role === 'admin' ? 'Administrator' : 'Petugas Desa';
      const sidebarAvatar = document.getElementById('sidebarAvatar');
      if (sidebarAvatar) sidebarAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nama || 'User')}&background=0D8ABC&color=fff&rounded=true&size=36`;

      const menuPengaturan = document.getElementById('menu-pengaturan');
      if (menuPengaturan) {
        if (currentUserRole === 'admin' || currentUserRole === 'petugas') {
          menuPengaturan.style.display = 'block';
        } else {
          menuPengaturan.style.display = 'none';
        }
      }

      loadDashboard();
      hilangkanSplashLoader();
      initAdminChat();
    }

    function prosesLogin() {
      const u = document.getElementById('loginUsername').value.trim();
      const p = document.getElementById('loginPassword').value.trim();

      if (!u || !p) {
        Swal.fire({ icon: 'warning', title: 'Input Salah', text: 'Ketik username dan password Anda.' });
        return;
      }

      Swal.fire({ title: 'Menghubungi server...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

      amankanPanggilanGAS('login', u, p)
        .then(function (res) {
          Swal.close();
          if (res && res.status === "NEED_OTP") {
            tempLoginUsername = res.username;
            document.getElementById('loginFormContainer').style.display = 'none';
            document.getElementById('loginOtpContainer').style.display = 'block';
            document.getElementById('loginMaskedWa').innerText = res.masked_wa;
            document.getElementById('loginOtpInput').value = '';
            document.getElementById('loginOtpInput').focus();

            if (typeof google === 'undefined' || !google.script || !google.script.run) {
              document.getElementById('demoOtpTip').style.display = 'block';
            }
          } else if (res && res.status === true) {
            Swal.fire({ icon: 'success', title: 'Berhasil Masuk', text: `Selamat bertugas, ${res.nama}!`, timer: 1500, showConfirmButton: false });
            showMainAppScreen(res);
          }
        })
        .catch(function (err) {
          Swal.close();
          Swal.fire({ icon: 'error', title: 'Otentikasi Gagal', text: err.message });
        });
    }

    function batalLoginOtp() {
      tempLoginUsername = '';
      document.getElementById('loginFormContainer').style.display = 'block';
      document.getElementById('loginOtpContainer').style.display = 'none';
      document.getElementById('loginPassword').value = '';
      document.getElementById('loginPassword').focus();
    }

    function prosesVerifikasiLoginOtp() {
      const otp = document.getElementById('loginOtpInput').value.trim();
      if (otp.length !== 6 || isNaN(otp)) {
        Swal.fire({ icon: 'warning', title: 'Format OTP Salah', text: 'Kode OTP harus berupa 6 digit angka.' });
        return;
      }

      Swal.fire({ title: 'Memvalidasi OTP...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

      amankanPanggilanGAS('verifikasiAdminOtp', tempLoginUsername, otp)
        .then(function (user) {
          Swal.close();
          if (user && user.status) {
            Swal.fire({ icon: 'success', title: 'Sesi Terverifikasi', text: `Selamat bekerja, ${user.nama}!`, timer: 1500, showConfirmButton: false });

            document.getElementById('loginFormContainer').style.display = 'block';
            document.getElementById('loginOtpContainer').style.display = 'none';
            document.getElementById('loginUsername').value = '';
            document.getElementById('loginPassword').value = '';

            showMainAppScreen(user);
          }
        })
        .catch(function (err) {
          Swal.close();
          Swal.fire({ icon: 'error', title: 'Verifikasi Gagal', text: err.message });
        });
    }

    function cekSessionLogin() {
      amankanPanggilanGAS('cekLogin')
        .then(function (user) {
          if (user) {
            showMainAppScreen(user);
          } else {
            switchKePortalWarga();
          }
        });
    }

    function prosesLogout() {
      Swal.fire({
        title: 'Keluar dari Sistem?',
        text: 'Sesi Panel Admin Anda akan segera berakhir.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3b82f6',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Ya, Keluar',
        cancelButtonText: 'Batal'
      }).then((result) => {
        if (result.isConfirmed) {
          amankanPanggilanGAS('logout')
            .then(function () {
              localStorage.removeItem('auth_token');
              document.getElementById('loginUsername').value = '';
              document.getElementById('loginPassword').value = '';
              currentUserRole = '';
              switchKePortalWarga();
              deinitAdminChat();
              Swal.fire({ icon: 'success', title: 'Berhasil Logout', timer: 1200, showConfirmButton: false });
            });
        }
      });
    }

    document.addEventListener('DOMContentLoaded', () => {
      // Deteksi penutupan halaman/refresh oleh admin yang sedang login
      window.addEventListener('beforeunload', () => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          // Kirim log dengan keepalive: true agar request tidak terputus saat tab ditutup
          fetch(`${CONFIG.API_BASE_URL}?action=logTutupHalaman`, {
            method: 'POST',
            headers: {
              'Content-Type': 'text/plain;charset=utf-8'
            },
            body: JSON.stringify({
              token: token,
              args: []
            }),
            keepalive: true
          });
        }
      });

      // Timeout pengaman 8 detik jika koneksi GAS lambat
      setTimeout(() => {
        const loader = document.getElementById('app_splash_loader');
        const splashStatus = document.getElementById('splash_status');
        const splashAction = document.getElementById('splash_error_action');
        if (loader && !loader.classList.contains('opacity-0') && splashStatus && splashAction) {
          splashStatus.innerHTML = `<span class="text-amber-400 font-semibold flex items-center gap-1.5 justify-center"><i class="fas fa-exclamation-triangle"></i> Terdeteksi Koneksi Lambat...</span>`;
          splashAction.classList.remove('hidden');
        }
      }, 8000);

      cekSessionLogin();
    });

    // Tangani error fatal runtime agar tidak memicu blank screen permanen
    window.onerror = function (message, source, lineno, colno, error) {
      console.error("Fatal Application Error:", message);
      const loader = document.getElementById('app_splash_loader');
      const splashStatus = document.getElementById('splash_status');
      const splashAction = document.getElementById('splash_error_action');
      
      if (loader && !loader.classList.contains('opacity-0') && splashStatus && splashAction) {
        splashStatus.innerHTML = `<span class="text-red-500 font-bold flex items-center gap-1.5 justify-center"><i class="fas fa-times-circle"></i> Terjadi Kesalahan Inisialisasi!</span>`;
        splashAction.classList.remove('hidden');
      }
      return false; // Jangan blokir default console error
    };

    function bukaProfilPengguna() {
      Swal.fire({ title: 'Memuat Profil...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

      amankanPanggilanGAS('getProfilAktif')
        .then(function (user) {
          Swal.close();
          if (!user) return;

          const roleBadge = user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800';
          const roleText = user.role === 'admin' ? 'Administrator' : 'Petugas Desa';

          const modalHtml = `
            <div class="modal fade" id="modalProfil" tabindex="-1" role="dialog" aria-hidden="true">
              <div class="modal-dialog modal-dialog-centered" role="document">
                <div class="modal-content overflow-hidden rounded-xl border-0 shadow-2xl">
                  <div class="modal-header bg-blue-600 text-white p-4">
                    <h5 class="modal-title font-bold text-base flex items-center gap-2">
                      <i class="fas fa-id-badge"></i>
                      <span>Profil Saya</span>
                    </h5>
                    <button type="button" class="close text-white opacity-85 hover:opacity-100" data-dismiss="modal" aria-label="Close">
                      <span aria-hidden="true">&times;</span>
                    </button>
                  </div>
                  <div class="modal-body p-6 bg-slate-50">
                    <div class="flex flex-col items-center mb-6">
                      <img src="https://ui-avatars.com/api/?name=${user.nama}&background=0D8ABC&color=fff&rounded=true&size=80" class="w-20 h-20 rounded-full shadow-md mb-3" alt="Avatar">
                      <h4 class="font-bold text-lg text-slate-800 text-center">${user.nama}</h4>
                      <span class="px-3 py-1 rounded-full font-bold text-[10px] uppercase mt-1 ${roleBadge}">${roleText}</span>
                    </div>

                    <div class="space-y-4">
                      <div class="form-group">
                        <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Username (Akses Login)</label>
                        <input type="text" class="form-control rounded-lg text-sm bg-slate-200 font-mono text-slate-600" value="${user.username}" readonly>
                      </div>
                      <div class="form-group">
                        <label class="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Ubah Kata Sandi</label>
                        <div class="relative">
                          <input type="password" id="profil_password_baru" class="form-control rounded-lg text-sm" value="${user.password}" placeholder="Ketik kata sandi baru Anda">
                          <button onclick="toggleVisibilityPassProfil()" class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-blue-600 focus:outline-none">
                            <i class="far fa-eye" id="icon-eye-profil"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="modal-footer bg-white p-4 flex justify-between gap-2 border-t border-slate-100">
                    <button type="button" onclick="prosesLogout()" class="bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-semibold text-xs py-2 px-4 rounded-lg transition-colors flex items-center gap-1.5" data-dismiss="modal">
                      <i class="fas fa-sign-out-alt"></i> Logout dari Sistem
                    </button>
                    <div class="flex gap-2">
                      <button type="button" class="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs py-2 px-4 rounded-lg transition-colors" data-dismiss="modal">Tutup</button>
                      <button type="button" onclick="prosesGantiPasswordProfil()" class="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2 px-4 rounded-lg shadow-sm transition-colors flex items-center gap-1.5">
                        <i class="fas fa-save"></i> Simpan Sandi
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          `;
          document.getElementById('modalContainer').innerHTML = modalHtml;
          $('#modalProfil').modal('show');
        })
        .catch(function (err) {
          Swal.fire({ icon: 'error', title: 'Gagal Memuat Profil', text: err.message });
        });
    }

    function toggleVisibilityPassProfil() {
      const el = document.getElementById('profil_password_baru');
      const icon = document.getElementById('icon-eye-profil');
      if (el.type === 'password') {
        el.type = 'text';
        icon.className = 'far fa-eye-slash';
      } else {
        el.type = 'password';
        icon.className = 'far fa-eye';
      }
    }

    function prosesGantiPasswordProfil() {
      const passBaru = document.getElementById('profil_password_baru').value.trim();
      if (!passBaru) {
        Swal.fire({ icon: 'warning', title: 'Peringatan', text: 'Kata sandi tidak boleh dikosongkan.' });
        return;
      }

      Swal.fire({ title: 'Menyimpan Kata Sandi...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

      amankanPanggilanGAS('updatePasswordAktif', passBaru)
        .then(function () {
          Swal.close();
          $('#modalProfil').modal('hide');
          Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Kata sandi Anda berhasil diperbarui!', timer: 2000, showConfirmButton: false });
        })
        .catch(function (err) {
          Swal.fire({ icon: 'error', title: 'Gagal', text: err.message });
        });
    }

    function kirimNotifWaWarga(noWa, nama, jenisSurat, linkPdf, reqId) {
      if (!noWa || noWa === '-') {
        Swal.fire({ icon: 'warning', title: 'Nomor Tidak Valid', text: 'Nomor WhatsApp warga tidak terdaftar atau kosong.' });
        return;
      }

      const btn = document.getElementById(`btn-wa-${reqId}`);
      let oldHtml = "";
      if (btn) {
        oldHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
      }

      amankanPanggilanGAS('kirimWaFonnte', noWa, nama, jenisSurat, linkPdf)
        .then(function () {
          if (btn) {
            btn.disabled = false;
            btn.className = "bg-slate-500 hover:bg-slate-600 text-white rounded px-2.5 py-1 text-[10px] font-bold transition-colors inline-flex items-center justify-center gap-1";
            btn.innerHTML = '<i class="fas fa-sync-alt"></i> Resend';
          }
          amankanPanggilanGAS('setWaStatusPermintaan', reqId, 'Sent')
            .catch(err => console.error("Gagal update status WA di DB:", err));

          Swal.fire({ icon: 'success', title: 'WhatsApp Terkirim!', text: 'Notifikasi pengambilan dokumen berhasil dikirim ke nomor warga.', timer: 1500, showConfirmButton: false });
        })
        .catch(function (err) {
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = oldHtml;
          }
          Swal.fire({ icon: 'error', title: 'Gagal Kirim WhatsApp', text: err.message });
        });
    }

    function loadFonntePanel() {
      amankanPanggilanGAS('getFonnteToken')
        .then(token => {
          document.getElementById('fonnte_token_input').value = token || '';
          loadFonnteStatus();
        });

      amankanPanggilanGAS('getBypassOtpStatus')
        .then(isEnabled => {
          document.getElementById('bypass_otp_toggle').checked = isEnabled;
        });
    }

    function toggleVisibilityFonnteToken() {
      const el = document.getElementById('fonnte_token_input');
      const icon = document.getElementById('icon-eye-fonnte');
      if (el.type === 'password') {
        el.type = 'text';
        icon.className = 'far fa-eye-slash';
      } else {
        el.type = 'password';
        icon.className = 'far fa-eye';
      }
    }

    function simpanFonnteToken() {
      const token = document.getElementById('fonnte_token_input').value.trim();
      if (!token) {
        Swal.fire({ icon: 'warning', title: 'Perhatian', text: 'Token tidak boleh kosong.' });
        return;
      }
      Swal.fire({ title: 'Menyimpan Token...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
      amankanPanggilanGAS('simpanFonnteToken', token)
        .then(() => {
          Swal.close();
          Swal.fire({ icon: 'success', title: 'Token Disimpan', text: 'Koneksi Fonnte berhasil diperbarui!', timer: 1500, showConfirmButton: false });
          loadFonnteStatus();
        })
        .catch(err => Swal.fire({ icon: 'error', title: 'Gagal', text: err.message }));
    }

    function hapusFonnteToken() {
      Swal.fire({
        title: 'Hapus Token?',
        text: 'Fitur notifikasi WhatsApp otomatis akan dimatikan.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Ya, Hapus'
      }).then(res => {
        if (res.isConfirmed) {
          Swal.fire({ title: 'Menghapus...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
          amankanPanggilanGAS('hapusFonnteToken')
            .then(() => {
              Swal.close();
              document.getElementById('fonnte_token_input').value = '';
              Swal.fire({ icon: 'success', title: 'Token Dihapus', timer: 1500, showConfirmButton: false });
              loadFonnteStatus();
            })
            .catch(err => Swal.fire({ icon: 'error', title: 'Gagal', text: err.message }));
        }
      });
    }

    function loadFonnteStatus() {
      const card = document.getElementById('fonnte_status_card');
      const qrContainer = document.getElementById('fonnte_qr_container');

      card.innerHTML = `
        <div class="flex flex-col items-center justify-center py-6 text-center">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
          <p class="text-xs text-slate-500 font-medium">Memeriksa status realtime perangkat...</p>
        </div>
      `;

      amankanPanggilanGAS('getFonnteStatus')
        .then(res => {
          if (res.status === true) {
            let badgeClass = "bg-emerald-100 text-emerald-800";
            let statusText = "Terhubung";
            if (res.device_status === "disconnect") {
              badgeClass = "bg-red-100 text-red-800";
              statusText = "Terputus";
            }
            let pulseColor = statusText === "Terhubung" ? "bg-emerald-500" : "bg-red-500";
            
            card.innerHTML = `
              <div class="space-y-4 w-full px-5 py-4 text-left">
                <!-- Header Status Perangkat -->
                <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h5 class="text-xs font-bold text-slate-800">${res.name || 'Server Desa'}</h5>
                    <p class="text-[9px] text-slate-400 mt-0.5">Nama Perangkat</p>
                  </div>
                  <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full ${badgeClass} text-[9px] font-bold uppercase tracking-wider">
                    <span class="h-2 w-2 rounded-full ${pulseColor} animate-pulse"></span>
                    ${statusText}
                  </div>
                </div>

                <!-- Info Grid -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <!-- Nomor WA -->
                  <div class="bg-white p-3 rounded-xl border border-slate-150 shadow-sm">
                    <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Nomor WhatsApp</span>
                    <span class="text-xs font-mono font-bold text-slate-700 mt-1 block">${res.device || '-'}</span>
                  </div>
                  
                  <!-- Kuota Pesan -->
                  <div class="bg-white p-3 rounded-xl border border-slate-150 shadow-sm">
                    <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Kuota Kirim</span>
                    <span class="text-xs font-bold text-slate-700 mt-1 block">${res.quota || '0'} / ${res.messages || '0'}</span>
                  </div>

                  <!-- Masa Aktif -->
                  <div class="bg-white p-3 rounded-xl border border-slate-150 shadow-sm">
                    <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Masa Aktif</span>
                    <span class="text-xs font-bold text-slate-700 mt-1 block">${res.expired || '-'}</span>
                  </div>
                </div>

                <!-- Tombol Aksi -->
                <div class="flex gap-3 pt-2">
                  <button onclick="prosesMintaQrFonnte()" class="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]">
                    <i class="fas fa-qrcode"></i> Scan QR Baru
                  </button>
                  <button onclick="prosesDisconnectFonnte()" class="bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 font-bold text-xs py-2.5 px-4 rounded-xl transition-all flex items-center justify-center active:scale-[0.98]" title="Putuskan Koneksi">
                    <i class="fas fa-unlink"></i>
                  </button>
                </div>
              </div>
            `;
            qrContainer.style.display = 'none';
          } else {
            card.innerHTML = `
              <div class="text-center p-4">
                <i class="fas fa-exclamation-triangle text-amber-500 text-2xl mb-2"></i>
                <p class="text-xs font-semibold text-slate-700">${res.reason || 'Koneksi ke Fonnte gagal'}</p>
                <button onclick="loadFonnteStatus()" class="mt-3 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold py-1.5 px-3 rounded">
                  Coba Lagi
                </button>
              </div>
            `;
            qrContainer.style.display = 'none';
          }
        })
        .catch(err => {
          card.innerHTML = `
            <div class="text-center p-4">
              <i class="fas fa-times-circle text-red-500 text-2xl mb-2"></i>
              <p class="text-xs font-semibold text-slate-700">Gagal mengambil status: ${err.message}</p>
            </div>
          `;
        });
    }

    function prosesMintaQrFonnte() {
      const qrContainer = document.getElementById('fonnte_qr_container');
      const qrImg = document.getElementById('fonnte_qr_image');

      Swal.fire({ title: 'Meminta QR Code...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

      amankanPanggilanGAS('getFonnteQR')
        .then(res => {
          Swal.close();
          if (res.status === true) {
            if (res.url.startsWith('http') || res.url.startsWith('data:')) {
              qrImg.src = res.url;
            } else {
              qrImg.src = 'data:image/png;base64,' + res.url;
            }
            qrContainer.style.display = 'block';
          } else {
            Swal.fire({ icon: 'error', title: 'Gagal', text: res.reason || 'Gagal meminta QR Code dari Fonnte.' });
          }
        })
        .catch(err => {
          Swal.close();
          Swal.fire({ icon: 'error', title: 'Error', text: err.message });
        });
    }

    function prosesDisconnectFonnte() {
      Swal.fire({
        title: 'Putuskan Koneksi WA?',
        text: 'Perangkat WhatsApp akan dipisahkan dari server Gateway Fonnte.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Ya, Putuskan'
      }).then(result => {
        if (result.isConfirmed) {
          Swal.fire({ title: 'Memutuskan perangkat...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
          amankanPanggilanGAS('disconnectFonnteDevice')
            .then(res => {
              Swal.close();
              Swal.fire({ icon: 'success', title: 'Terputus', text: 'Perangkat berhasil dipisahkan.', timer: 1500, showConfirmButton: false });
              loadFonnteStatus();
            })
            .catch(err => {
              Swal.close();
              Swal.fire({ icon: 'error', title: 'Gagal', text: err.message });
            });
        }
      });
    }

    function ubahBypassOtp(checkbox) {
      const isEnabled = checkbox.checked;
      Swal.fire({ title: 'Menyimpan konfigurasi...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
      amankanPanggilanGAS('setBypassOtpStatus', isEnabled)
        .then(() => {
          Swal.close();
          Swal.fire({ icon: 'success', title: 'Konfigurasi Diubah', text: `Mode Bypass OTP sekarang ${isEnabled ? 'AKTIF' : 'NONAKTIF'}.`, timer: 1500, showConfirmButton: false });
        })
        .catch(err => {
          Swal.close();
          checkbox.checked = !isEnabled;
          Swal.fire({ icon: 'error', title: 'Gagal', text: err.message });
        });
    }

    function renderPengaturanLog() {
      amankanPanggilanGAS('getLogHistory')
        .then(logs => {
          dataLogsGlobal = logs || [];
          const searchInput = document.getElementById('searchLog');
          if (searchInput) searchInput.value = '';
          tampilLog(dataLogsGlobal);
        })
        .catch(err => {
          const tbody = document.getElementById('tbodyLogHistory');
          if (tbody) {
            tbody.innerHTML = `
              <tr>
                <td colspan="4" class="text-center py-10 text-red-500 font-semibold">${err.message}</td>
              </tr>
            `;
          }
        });
    }

    function tampilLog(logs) {
      const tbody = document.getElementById('tbodyLogHistory');
      if (!tbody) return;

      if (!logs || logs.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="4" class="text-center py-10 text-slate-400">
              <i class="fas fa-history text-3xl mb-2 block text-slate-300"></i>
              <span>Tidak ada log aktivitas yang cocok.</span>
            </td>
          </tr>
        `;
        return;
      }

      let html = '';
      logs.slice().reverse().forEach(log => {
        let actionBadge = "";
        const action = log.aksi.toLowerCase();
        if (action.includes("login")) {
          actionBadge = "bg-blue-100 text-blue-800";
        } else if (action.includes("hapus") || action.includes("delete")) {
          actionBadge = "bg-red-100 text-red-800";
        } else if (action.includes("buat") || action.includes("generate")) {
          actionBadge = "bg-emerald-100 text-emerald-800";
        } else {
          actionBadge = "bg-slate-100 text-slate-800";
        }

        html += `
          <tr class="hover:bg-slate-50/70 transition-colors">
            <td class="p-4 font-mono text-slate-500 text-xs">${log.waktu}</td>
            <td class="p-4 font-semibold text-slate-800">${log.user}</td>
            <td class="p-4 text-center">
              <span class="px-2 py-0.5 rounded font-bold text-[10px] uppercase ${actionBadge}">${log.aksi}</span>
            </td>
            <td class="p-4 text-slate-600 font-medium">${log.detail}</td>
          </tr>
        `;
      });
      tbody.innerHTML = html;
    }

    function filterLog() {
      const searchLogEl = document.getElementById('searchLog');
      if (!searchLogEl) return;
      const query = searchLogEl.value.toLowerCase().trim();
      const filtered = dataLogsGlobal.filter(log => {
        return (log.detail && log.detail.toLowerCase().includes(query)) ||
          (log.aksi && log.aksi.toLowerCase().includes(query)) ||
          (log.user && log.user.toLowerCase().includes(query));
      });
      tampilLog(filtered);
    }

    function filterPenduduk() {
      const search = document.getElementById('searchPenduduk').value.toLowerCase();
      dataPendudukFiltered = dataPendudukGlobal.filter(p => {
        return p.nik.toLowerCase().includes(search) || p.nama.toLowerCase().includes(search);
      });
      currentPage = 1;
      tampilPenduduk(dataPendudukFiltered);
    }

    function gantiHalaman(page) {
      currentPage = page;
      tampilPenduduk(dataPendudukFiltered);
    }

    function unggahFileUpdateZip() {
      const fileInput = document.getElementById('update_zip_file');
      if (!fileInput || fileInput.files.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Berkas Kosong',
          text: 'Harap pilih berkas update.zip terlebih dahulu.'
        });
        return;
      }

      const file = fileInput.files[0];
      const ext = file.name.split('.').pop().toLowerCase();
      if (ext !== 'zip') {
        Swal.fire({
          icon: 'error',
          title: 'Format Salah',
          text: 'Hanya berkas dengan ekstensi .zip yang diperbolehkan.'
        });
        return;
      }

      Swal.fire({
        title: 'Mengunggah...',
        text: 'Mengirim paket pembaruan ke server hosting...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // PENGUJIAN MOCK / DEVELOPMENT LOKAL
      if (CONFIG.USE_MOCK_BACKEND) {
        const reader = new FileReader();
        reader.onload = function(e) {
          const rawResult = e.target.result;
          const base64Data = rawResult.split(',')[1];

          amankanPanggilanGAS('unggahUpdateZip', base64Data, file.name)
            .then(function(res) {
              Swal.close();
              Swal.fire({
                icon: 'success',
                title: 'Pembaruan Berhasil (Mock)',
                text: res.message || 'Sistem berhasil diperbarui!',
                confirmButtonText: 'OK'
              });
              fileInput.value = '';
            })
            .catch(function(err) {
              Swal.close();
              Swal.fire({
                icon: 'error',
                title: 'Gagal Memperbarui (Mock)',
                text: err.message
              });
            });
        };
        reader.readAsDataURL(file);
        return;
      }

      // PRODUCTION (CPANEL / VPS HOSTING)
      const token = localStorage.getItem('auth_token') || 'session_mock_token';
      const formData = new FormData();
      formData.append('update_file', file);
      formData.append('token', token); // Kirim token via POST body untuk bypass Apache CGI strip header

      // Dapatkan base path saat ini secara dinamis agar aman dari trailing slash URL
      let basePath = window.location.pathname;
      if (!basePath.endsWith('/')) {
        basePath = basePath.substring(0, basePath.lastIndexOf('/') + 1);
      }

      fetch(basePath + 'update_handler.php', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token
        },
        body: formData
      })
      .then(response => {
        return response.text().then(text => {
          let res;
          try {
            res = JSON.parse(text);
          } catch (jsonErr) {
            // Jika respon bukan JSON (misal HTML error 403 default Apache), bersihkan tag HTML dan tampilkan pesan teksnya
            const cleanText = text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
            const previewText = cleanText.substring(0, 150);
            throw new Error((previewText || 'Gagal memproses respon server') + ' (HTTP ' + response.status + ')');
          }

          if (!response.ok) {
            throw new Error(res.message || 'Terjadi kesalahan pada server (HTTP ' + response.status + ')');
          }
          return res;
        });
      })
      .then(res => {
        Swal.close();
        if (res.status === 'ok') {
          Swal.fire({
            icon: 'success',
            title: 'Pembaruan Sukses',
            text: res.message || 'Frontend berhasil diperbarui secara lokal!',
            confirmButtonText: 'OK'
          });
          fileInput.value = '';
        } else {
          throw new Error(res.message || 'Terjadi kesalahan sistem.');
        }
      })
      .catch(err => {
        Swal.close();
        Swal.fire({
          icon: 'error',
          title: 'Gagal Memperbarui',
          text: err.message || 'Koneksi ke hosting gagal.'
        });
      });
    }

    // ========================================================
    // LOGIKA LIVE CHAT ANTAR ADMINISTRATOR & PETUGAS DESA
    // ========================================================

    let cachedUserList = []; // Menyimpan daftar user lain untuk refresh dropdown

    window.toggleAdminChat = function(show) {
      isChatOpen = show;
      const widget = document.getElementById('adminChatWidget');
      const toggleBtn = document.getElementById('adminChatToggleBtn');
      const badge = document.getElementById('chatUnreadBadge');
      
      if (show) {
        if (widget) widget.style.display = 'flex';
        if (toggleBtn) toggleBtn.style.display = 'none';
        
        // Reset unread counts untuk channel yang saat ini aktif
        unreadCountsByChannel[activeChatTarget] = 0;
        updateChatNotificationBadges();
        
        renderActiveChatMessages();
        scrollChatToBottom();
        
        const chatInput = document.getElementById('adminChatInput');
        if (chatInput) chatInput.focus();
      } else {
        if (widget) widget.style.display = 'none';
        if (toggleBtn) toggleBtn.style.display = 'flex';
      }
    }

    function scrollChatToBottom() {
      const bodyContainer = document.getElementById('adminChatBody');
      if (bodyContainer) {
        // Gunakan timeout kecil agar browser selesai merender HTML sebelum digulir
        setTimeout(() => {
          bodyContainer.scrollTop = bodyContainer.scrollHeight;
        }, 30);
      }
    }

    window.gantiSaluranChat = function() {
      const select = document.getElementById('chatTargetSelect');
      if (!select) return;
      
      activeChatTarget = select.value;
      
      // Reset unread count untuk channel yang baru saja dibuka
      unreadCountsByChannel[activeChatTarget] = 0;
      updateChatNotificationBadges();
      
      renderActiveChatMessages();
    }

    function updateChatNotificationBadges() {
      // Hitung total pesan unread secara global
      unreadChatCount = Object.values(unreadCountsByChannel).reduce((a, b) => a + b, 0);
      
      // Perbarui badge pada tombol melayang utama
      const badge = document.getElementById('chatUnreadBadge');
      if (badge) {
        if (unreadChatCount > 0) {
          badge.innerText = unreadChatCount;
          badge.style.display = 'block';
        } else {
          badge.style.display = 'none';
        }
      }
      
      // Perbarui teks opsi di dalam dropdown select untuk menyertakan tanda ada pesan baru
      const select = document.getElementById('chatTargetSelect');
      if (!select) return;
      
      const currentAdminName = document.getElementById('namaLogin').innerText.trim().toUpperCase();
      
      let html = `<option value="Semua">📢 Semua Pengguna ${unreadCountsByChannel['Semua'] > 0 ? `(${unreadCountsByChannel['Semua']})` : ''}</option>`;
      if (cachedUserList && cachedUserList.length > 0) {
        cachedUserList.forEach(user => {
          const userCleanName = user.nama.trim();
          if (userCleanName.toUpperCase() !== currentAdminName) {
            const count = unreadCountsByChannel[userCleanName] || 0;
            html += `<option value="${userCleanName}">👤 ${userCleanName} ${count > 0 ? `(${count})` : ''}</option>`;
          }
        });
      }
      select.innerHTML = html;
      select.value = activeChatTarget;
    }

    function initAdminChat() {
      lastChatTimestamp = 0;
      unreadChatCount = 0;
      isChatOpen = false;
      activeChatTarget = 'Semua';
      allChatMessagesArray = [];
      unreadCountsByChannel = { 'Semua': 0 };
      cachedUserList = [];
      
      const messagesContainer = document.getElementById('adminChatMessages');
      if (messagesContainer) messagesContainer.innerHTML = '';
      
      const badge = document.getElementById('chatUnreadBadge');
      if (badge) {
        badge.style.display = 'none';
        badge.innerText = '0';
      }
      
      const widget = document.getElementById('adminChatWidget');
      if (widget) widget.style.display = 'none';
      
      const toggleBtn = document.getElementById('adminChatToggleBtn');
      if (toggleBtn) toggleBtn.style.display = 'flex';
      
      // Load user list for dropdown select target chat
      const currentAdminName = document.getElementById('namaLogin').innerText.trim().toUpperCase();
      amankanPanggilanGAS('getUsers')
        .then(function(users) {
          cachedUserList = users || [];
          updateChatNotificationBadges();
        });
      
      // Load initial chat messages immediately
      pollChatMessages();
      
      // Start polling interval every 4 seconds
      if (chatPollInterval) clearInterval(chatPollInterval);
      chatPollInterval = setInterval(pollChatMessages, 4000);
    }

    function deinitAdminChat() {
      if (chatPollInterval) {
        clearInterval(chatPollInterval);
        chatPollInterval = null;
      }
      
      const widget = document.getElementById('adminChatWidget');
      if (widget) widget.style.display = 'none';
      
      const toggleBtn = document.getElementById('adminChatToggleBtn');
      if (toggleBtn) toggleBtn.style.display = 'none';
    }

    function pollChatMessages() {
      if (typeof amankanPanggilanGAS !== 'function') return;
      
      amankanPanggilanGAS('getChatMessages', lastChatTimestamp)
        .then(function(messages) {
          if (!messages || messages.length === 0) return;
          
          const currentAdminName = document.getElementById('namaLogin').innerText.trim().toUpperCase();
          let incomingNewMessage = false;
          
          messages.forEach(msg => {
            // Cek apakah ini adalah konfirmasi dari pesan optimistic kita
            const optimisticIndex = allChatMessagesArray.findIndex(existing => 
              existing.isOptimistic &&
              existing.sender && msg.sender &&
              existing.sender.trim().toUpperCase() === msg.sender.trim().toUpperCase() &&
              existing.receiver && msg.receiver &&
              existing.receiver.trim().toUpperCase() === msg.receiver.trim().toUpperCase() &&
              existing.message === msg.message
            );

            if (optimisticIndex !== -1) {
              // Update pesan optimistic menjadi pesan resmi dari server
              allChatMessagesArray[optimisticIndex].timestamp = msg.timestamp;
              delete allChatMessagesArray[optimisticIndex].isOptimistic;
              incomingNewMessage = true;
            } else {
              // Cek duplikasi biasa
              const isDuplicate = allChatMessagesArray.some(existing => 
                existing.timestamp === msg.timestamp && 
                existing.sender === msg.sender && 
                existing.message === msg.message
              );
              if (!isDuplicate) {
                allChatMessagesArray.push(msg);
                incomingNewMessage = true;
                
                const isMe = msg.sender.trim().toUpperCase() === currentAdminName;
                if (!isMe) {
                  // Tentukan channel asal pesan
                  const channel = (msg.receiver === 'Semua') ? 'Semua' : msg.sender;
                  
                  // Tambah unread count jika chat ke channel tersebut sedang tidak aktif/terbuka
                  if (!isChatOpen || activeChatTarget !== channel) {
                    unreadCountsByChannel[channel] = (unreadCountsByChannel[channel] || 0) + 1;
                  }
                }
              }
            }
            
            // Perbarui lastChatTimestamp dengan epoch terbaru
            if (msg.timestamp > lastChatTimestamp) {
              lastChatTimestamp = msg.timestamp;
            }
          });
          
          if (incomingNewMessage) {
            updateChatNotificationBadges();
            renderActiveChatMessages();
          }
        });
    }

    function getSenderColor(name) {
      if (!name) return '#00a884';
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      const colors = [
        '#d91b5c', '#8e24aa', '#5e35b1', '#3949ab', 
        '#1e88e5', '#039be5', '#00acc1', '#00897b', 
        '#43a047', '#7cb342', '#fb8c00', '#f4511e'
      ];
      const index = Math.abs(hash) % colors.length;
      return colors[index];
    }

    function renderActiveChatMessages() {
      const messagesContainer = document.getElementById('adminChatMessages');
      if (!messagesContainer) return;
      
      const currentAdminName = document.getElementById('namaLogin').innerText.trim().toUpperCase();
      let html = '';
      
      // Tentukan apakah scroll saat ini di posisi paling bawah sebelum diganti/ditambah
      const bodyContainer = document.getElementById('adminChatBody');
      let shouldScroll = false;
      if (bodyContainer) {
        const threshold = 50; // pixels
        shouldScroll = (bodyContainer.scrollHeight - bodyContainer.scrollTop - bodyContainer.clientHeight) <= threshold;
      }
      
      // Filter pesan yang sesuai dengan target obrolan saat ini
      const filtered = allChatMessagesArray.filter(msg => {
        const sender = msg.sender.trim().toUpperCase();
        const receiver = msg.receiver.trim().toUpperCase();
        
        if (activeChatTarget === 'Semua') {
          return receiver === 'SEMUA';
        } else {
          // Direct Message: Tampilkan jika (saya kirim ke dia) ATAU (dia kirim ke saya)
          const targetUpper = activeChatTarget.trim().toUpperCase();
          return (sender === currentAdminName && receiver === targetUpper) || 
                 (sender === targetUpper && receiver === currentAdminName);
        }
      });
      
      if (filtered.length === 0) {
        html = `<div class="text-center text-[10px] text-slate-400 py-10 italic">Belum ada percakapan di sini.</div>`;
      } else {
        filtered.forEach(msg => {
          const isMe = msg.sender.trim().toUpperCase() === currentAdminName;
          const justifyClass = isMe ? 'justify-end' : 'justify-start';
          const bubbleBg = isMe ? '#d9fdd3' : '#ffffff';
          const borderRadius = isMe ? 'border-radius: 8px 8px 0px 8px;' : 'border-radius: 8px 8px 8px 0px;';
          const dateStr = formatChatTime(msg.timestamp);
          
          // Status ticks ala WhatsApp untuk pengirim
          let statusTick = '';
          if (isMe) {
            if (msg.isOptimistic) {
              statusTick = '<i class="far fa-clock text-[9px] text-slate-400 ml-1"></i>';
            } else {
              statusTick = '<i class="fas fa-check-double text-[9px] text-sky-500 ml-1"></i>';
            }
          }
          
          // Header nama jika di channel "Semua" dan bukan pesan saya sendiri
          const senderColor = getSenderColor(msg.sender);
          const nameHeader = (!isMe && activeChatTarget === 'Semua') 
            ? `<span class="block font-bold text-[10px] mb-0.5" style="color: ${senderColor};">${msg.sender} (${msg.role.toUpperCase()})</span>` 
            : '';
          
          html += `
            <div class="flex w-full ${justifyClass} mb-2 fade-in">
              <div class="relative max-w-[85%] px-3 py-1.5 shadow-sm text-xs" style="background-color: ${bubbleBg}; ${borderRadius} color: #111b21; min-width: 90px;">
                ${nameHeader}
                <div class="whitespace-pre-wrap break-words pr-12 text-slate-800" style="font-size: 11.5px; line-height: 1.4;">
                  ${escapeHtml(msg.message)}
                </div>
                <div class="absolute bottom-0.5 right-1.5 flex items-center text-[9px] text-slate-400 select-none font-mono">
                  ${dateStr}
                  ${statusTick}
                </div>
              </div>
            </div>
          `;
        });
      }
      
      messagesContainer.innerHTML = html;
      
      // Auto-scroll jika diaktifkan atau baru buka
      if (shouldScroll || isChatOpen) {
        scrollChatToBottom();
      }
    }

    function formatChatTime(timestamp) {
      const d = new Date(timestamp);
      const jam = String(d.getHours()).padStart(2, '0');
      const fontMenit = String(d.getMinutes()).padStart(2, '0');
      return `${jam}:${fontMenit}`;
    }
    
    function escapeHtml(text) {
      if (!text) return '';
      const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      };
      return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }

    window.kirimChatMsg = function(e) {
      if (e) e.preventDefault();
      
      const input = document.getElementById('adminChatInput');
      if (!input) return;
      
      const msgText = input.value.trim();
      if (!msgText) return;
      
      input.value = '';
      
      // Optimistic UI update: langsung munculkan pesan di browser lokal dengan flag isOptimistic
      const currentAdminName = document.getElementById('namaLogin').innerText.trim();
      const localMsg = {
        timestamp: Date.now(),
        sender: currentAdminName,
        message: msgText,
        role: currentUserRole,
        receiver: activeChatTarget,
        isOptimistic: true
      };
      
      allChatMessagesArray.push(localMsg);
      renderActiveChatMessages();
      scrollChatToBottom();
      
      amankanPanggilanGAS('sendChatMessage', msgText, activeChatTarget)
        .then(function(res) {
          if (res) {
            // Panggil poll untuk mensinkronkan timestamp asli dari server Sheets
            pollChatMessages();
          }
        })
        .catch(function(err) {
          console.error('Gagal mengirim pesan chat:', err);
        });
    }
