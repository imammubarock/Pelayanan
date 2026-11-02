// js/api.js

const API_CACHE = {
  data: {}, // format: { cacheKey: { data, timestamp } }
  staleTime: 5 * 60 * 1000, // 5 menit dalam milidetik

  // Daftar query yang boleh di-cache (Read operations)
  queries: [
    'getPenduduk',
    'getPendudukCount',
    'getPendudukByNik',
    'getSuratSelesai',
    'getSuratSelesaiCount',
    'getPermintaanSurat',
    'getPermintaanSuratCount',
    'getTemplateSurat',

    'getFieldsSurat',
    'getNomorSurat',
    'getPejabat',
    'getFonnteToken',
    'getBypassOtpStatus',
    'getFonnteStatus',
    'getLogHistory',
    'getDashboardStats',
    'getPermintaanSuratByNik'
  ],

  // Pemetaan mutasi (Write operations) ke query yang harus di-invalidate
  invalidations: {
    'simpanPenduduk': ['getPenduduk', 'getPendudukCount', 'getPendudukByNik', 'getDashboardStats'],
    'updatePenduduk': ['getPenduduk', 'getPendudukCount', 'getPendudukByNik', 'getDashboardStats'],
    'hapusPenduduk': ['getPenduduk', 'getPendudukCount', 'getPendudukByNik', 'getDashboardStats'],
    
    'kirimPermintaanSuratWarga': ['getPermintaanSurat', 'getPermintaanSuratCount', 'getDashboardStats', 'getPermintaanSuratByNik'],
    'prosesPermintaanSurat': ['getPermintaanSurat', 'getPermintaanSuratCount', 'getDashboardStats', 'getPermintaanSuratByNik'],
    'buatSuratPDF': [
      'getPermintaanSurat', 'getPermintaanSuratCount',
      'getSuratSelesai', 'getSuratSelesaiCount',
      'getNomorSurat', 'getDashboardStats', 'getPermintaanSuratByNik'
    ],

    
    'updateFileSuratSelesai': ['getSuratSelesai', 'getSuratSelesaiCount', 'getPermintaanSurat', 'getDashboardStats', 'getPermintaanSuratByNik'],
    'setTteApproved': ['getSuratSelesai', 'getSuratSelesaiCount', 'getPermintaanSurat', 'getDashboardStats', 'getPermintaanSuratByNik'],
    
    'simpanTemplateSurat': ['getTemplateSurat', 'getFieldsSurat'],
    'updateTemplateSurat': ['getTemplateSurat', 'getFieldsSurat'],
    'hapusTemplateSurat': ['getTemplateSurat', 'getFieldsSurat'],

    
    'simpanNomorSurat': ['getNomorSurat'],
    'updateNomorSurat': ['getNomorSurat'],
    'hapusNomorSurat': ['getNomorSurat'],
    
    'simpanPejabat': ['getPejabat'],
    'updatePejabat': ['getPejabat'],
    'hapusPejabat': ['getPejabat'],
    
    'simpanFonnteToken': ['getFonnteToken', 'getFonnteStatus'],
    'hapusFonnteToken': ['getFonnteToken', 'getFonnteStatus'],
    'disconnectFonnteDevice': ['getFonnteStatus'],
    'setBypassOtpStatus': ['getBypassOtpStatus'],
    'hapusSuratSelesai': [
      'getPermintaanSurat', 'getPermintaanSuratCount',
      'getSuratSelesai', 'getSuratSelesaiCount',
      'getDashboardStats', 'getPermintaanSuratByNik'
    ]
  },

  getCacheKey: function(fungsiName, args) {
    return `${fungsiName}_${JSON.stringify(args)}`;
  },

  get: function(fungsiName, args) {
    if (!this.queries.includes(fungsiName)) return null;
    const key = this.getCacheKey(fungsiName, args);
    const entry = this.data[key];
    if (entry) {
      const now = Date.now();
      if (now - entry.timestamp < this.staleTime) {
        console.log(`[API CACHE] HIT: Menggunakan cache untuk ${key}`);
        return entry.data;
      }
      console.log(`[API CACHE] EXPIRED: Cache kadaluwarsa untuk ${key}`);
      delete this.data[key];
    }
    return null;
  },

  set: function(fungsiName, args, data) {
    if (!this.queries.includes(fungsiName)) return;
    const key = this.getCacheKey(fungsiName, args);
    this.data[key] = {
      data: data,
      timestamp: Date.now()
    };
    console.log(`[API CACHE] SET: Menyimpan cache baru untuk ${key}`);
  },

  invalidate: function(fungsiName) {
    const queriesToInvalidate = this.invalidations[fungsiName];
    if (queriesToInvalidate) {
      queriesToInvalidate.forEach(qName => {
        Object.keys(this.data).forEach(key => {
          if (key.startsWith(qName + '_') || key === qName) {
            delete this.data[key];
            console.log(`[API CACHE] INVALIDATE: Cache dihapus untuk ${key}`);
          }
        });
      });
    }
  },

  invalidateQuery: function(qName) {
    Object.keys(this.data).forEach(key => {
      if (key.startsWith(qName + '_') || key === qName) {
        delete this.data[key];
        console.log(`[API CACHE] INVALIDATE QUERY: Cache query manual dihapus untuk ${key}`);
      }
    });
  }
};

function amankanPanggilanGAS(fungsiName, ...args) {
  // 1. Cek apakah query ada di cache
  const cachedData = API_CACHE.get(fungsiName, args);
  if (cachedData !== null) {
    return Promise.resolve(cachedData);
  }

  // 2. Jika tidak ada di cache, lakukan pemanggilan server/mock
  let fetchPromise;
  if (CONFIG.USE_MOCK_BACKEND) {
    // Jalankan dengan mock backend (localStorage)
    fetchPromise = new Promise((resolve, reject) => {
      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler(reject)[fungsiName](...args);
      } else {
        reject(new Error("Google script run tidak terdefinisi dan mock backend gagal dimuat."));
      }
    });
  } else {
    // Jalankan dengan fetch REST API ke GAS Web App
    fetchPromise = new Promise((resolve, reject) => {
      const token = localStorage.getItem('auth_token') || '';
      
      fetch(`${CONFIG.API_BASE_URL}?action=${fungsiName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({
          token: token,
          args: args
        })
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(res => {
        if (res.status === 'ok') {
          resolve(res.data);
        } else {
          reject(new Error(res.message || 'Terjadi kesalahan pada server'));
        }
      })
      .catch(err => {
        console.error(`API Error calling ${fungsiName}:`, err);
        reject(new Error(`Koneksi ke server gagal: ${err.message}`));
      });
    });
  }

  // 3. Setelah promise selesai, simpan ke cache atau invalidate jika mutasi
  return fetchPromise.then(data => {
    // Simpan ke cache jika ini query read
    API_CACHE.set(fungsiName, args, data);
    
    // Invalidate cache jika ini mutasi write
    API_CACHE.invalidate(fungsiName);
    
    return data;
  });
}

