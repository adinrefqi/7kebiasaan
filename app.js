// 0. Konfigurasi Supabase
const SUPABASE_URL = "https://czqkvzamhpbkqmktiach.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6cWt2emFtaHBia3Fta3RpYWNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMzgyNTgsImV4cCI6MjA5MjkxNDI1OH0.N1ic3C4LsTFe1X3tXd_pf3L047dBqygG5cZHyZ769bs"; // Key anon
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 0. Proteksi Halaman & Data Pengguna
const checkAuth = () => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const studentID = localStorage.getItem('studentID');
    const studentName = localStorage.getItem('studentName');

    if (isLoggedIn !== 'true') {
        window.location.href = 'login.html';
        return;
    }

    const displayName = document.getElementById('display-name');
    const hiddenNameInput = document.getElementById('student-name');
    if (displayName) displayName.innerText = studentName || studentID; 
    if (hiddenNameInput) hiddenNameInput.value = studentName || studentID;
};

document.getElementById('logout-btn')?.addEventListener('click', () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('studentID');
    localStorage.removeItem('studentName');
    window.location.href = 'login.html';
});

checkAuth();

// ==========================================
// 0. FITUR OFFLINE, DARK MODE & ONBOARDING
// ==========================================

// --- Dark Mode ---
const themeBtn = document.getElementById('theme-btn');
if (themeBtn) {
    const themeIcon = themeBtn.querySelector('i');
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        themeIcon.classList.replace('fa-moon', 'fa-sun');
    }
    
    themeBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        if (document.body.classList.contains('dark-mode')) {
            localStorage.setItem('theme', 'dark');
            themeIcon.classList.replace('fa-moon', 'fa-sun');
        } else {
            localStorage.setItem('theme', 'light');
            themeIcon.classList.replace('fa-sun', 'fa-moon');
        }
    });
}

// --- Offline Sync ---
async function syncOfflineData() {
    let queue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
    if (queue.length === 0) return;
    
    if (!navigator.onLine) return;
    
    console.log("Menyinkronkan data offline...");
    try {
        const { error } = await supabaseClient.from('habit_logs').insert(queue);
        if (error) throw error;
        
        localStorage.removeItem('offlineQueue');
        alert('Data yang tertunda saat offline berhasil disinkronkan ke server! 🚀');
        if (typeof loadGamificationStats === 'function') loadGamificationStats();
    } catch (e) {
        console.error('Gagal sinkron data:', e);
    }
}
window.addEventListener('online', syncOfflineData);

// --- Onboarding Tutorial ---
function checkOnboarding() {
    if (!localStorage.getItem('hasSeenTutorial') && localStorage.getItem('isLoggedIn') === 'true') {
        const modal = document.getElementById('onboarding-modal');
        if (modal) {
            modal.style.display = 'flex'; // Ganti dari classList karena di index kita pake modal-overlay
            document.getElementById('close-onboarding').addEventListener('click', () => {
                modal.style.display = 'none';
                localStorage.setItem('hasSeenTutorial', 'true');
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    checkOnboarding();
    syncOfflineData();
});

// Setup Tanggal Default
document.addEventListener('DOMContentLoaded', () => {
    const reportDate = document.getElementById('report-date');
    if (reportDate) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;
        
        reportDate.value = todayStr;
        
        // Kunci agar tidak bisa memilih tanggal kemarin atau besok
        reportDate.setAttribute('min', todayStr);
        reportDate.setAttribute('max', todayStr);
    }
});

// 1. Inisialisasi Library SignaturePad
const canvas = document.getElementById('signature-pad');
const signaturePad = new SignaturePad(canvas, {
    backgroundColor: 'rgba(255, 255, 255, 0)', // Transparan
    penColor: 'rgb(0, 0, 0)' // Warna tinta hitam
});

// Sembunyikan petunjuk saat mulai mencoret
signaturePad.onBegin = () => {
    const hint = document.querySelector('.sig-hint');
    if (hint) hint.style.opacity = '0';
};

// 2. Fungsi agar ukuran canvas menyesuaikan layar (Resize Canvas)
// Penting untuk perangkat mobile agar koordinat tanda tangan tetap akurat
function resizeCanvas() {
    // Menghitung rasio pixel perangkat agar hasil coretan tajam
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    
    // Simpan data tanda tangan sementara jika sudah ada coretan
    const data = signaturePad.toData();
    
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d").scale(ratio, ratio);
    
    // Bersihkan dan masukkan kembali data tanda tangan setelah resize
    signaturePad.clear();
    signaturePad.fromData(data);
}

// Jalankan fungsi resize saat jendela browser berubah ukuran
window.addEventListener("resize", resizeCanvas);
// Jalankan saat pertama kali halaman dimuat
resizeCanvas();

// 3. Fungsi untuk tombol 'Bersihkan TTD'
const clearButton = document.getElementById('clear-btn');
clearButton.addEventListener('click', () => {
    signaturePad.clear();
});

// 4. Logika Tombol 'Kirim Data' dengan Validasi
const habitForm = document.getElementById('habit-form');
habitForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Mencegah halaman refresh saat submit

    const studentName = localStorage.getItem('studentName');
    const studentID = localStorage.getItem('studentID');

    // Ambil data kebiasaan dengan perulangan pada setiap kartu
    const selectedHabits = [];
    let isValid = true;
    let missingDescHabitName = "";
    
    const habitCards = document.querySelectorAll('.habit-card');
    
    habitCards.forEach(card => {
        const checkbox = card.querySelector('input[name="habit"]');
        const description = card.querySelector('.habit-desc').value;
        
        if (checkbox.checked) {
            if (description.trim() === "") {
                isValid = false;
                missingDescHabitName = checkbox.value;
            }
            
            selectedHabits.push({
                habit: checkbox.value,
                desc: description
            });
        }
    });

    if (selectedHabits.length === 0) {
        alert('Ups! Kamu belum memilih satu pun kebiasaan hari ini.');
        return;
    }

    if (!isValid) {
        alert(`Tunggu dulu! Kamu memilih "${missingDescHabitName}", tapi belum mengisi contoh kegiatannya. Yuk, diisi dulu!`);
        return;
    }

    const selectedDate = document.getElementById('report-date')?.value;

    if (!selectedDate) {
        alert('Ups! Kamu belum memilih tanggal kegiatan.');
        return;
    }

    // Validasi tambahan untuk mencegah input tanggal lewat/besok (jika bypass HTML)
    const todayObj = new Date();
    const yyyy = todayObj.getFullYear();
    const mm = String(todayObj.getMonth() + 1).padStart(2, '0');
    const dd = String(todayObj.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    if (selectedDate < todayStr) {
        alert('Maaf, kamu tidak bisa mengisi laporan untuk hari yang sudah lewat!');
        return;
    }
    if (selectedDate > todayStr) {
        alert('Maaf, kamu belum bisa mengisi laporan untuk hari esok!');
        return;
    }

    const signatureImage = signaturePad.toDataURL(); // Data gambar base64

    // Tampilkan loading pada tombol
    const submitBtn = document.getElementById('submit-btn');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengecek...';

    try {
        // Cek apakah siswa sudah mengisi di tanggal tersebut
        const startOfDay = new Date(`${selectedDate}T00:00:00`).toISOString();
        const endOfDay = new Date(`${selectedDate}T23:59:59.999`).toISOString();

        const { data: existingLogs, error: checkError } = await supabaseClient
            .from('habit_logs')
            .select('id')
            .eq('student_id', studentID)
            .gte('created_at', startOfDay)
            .lte('created_at', endOfDay);

        if (checkError) throw checkError;

        if (existingLogs && existingLogs.length > 0) {
            alert(`Tunggu dulu! Kamu sudah mengirim laporan untuk tanggal ${selectedDate}. Hebat! Besok isi lagi ya.`);
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
            return;
        }

        // Ambil Mood Tracker (Disisipkan sebagai Kebiasaan Khusus tanpa mengubah struktur database)
        const moodInput = document.querySelector('input[name="mood"]:checked');
        if (moodInput) {
            selectedHabits.push({
                habit: "Perasaan Hari Ini",
                desc: moodInput.value
            });
        }

        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';
        
        // Atur waktu submission sesuai tanggal yang dipilih
        const customDate = new Date(`${selectedDate}T12:00:00`).toISOString();

        const insertData = { 
            student_id: studentID, 
            student_name: studentName, 
            habits: selectedHabits, 
            signature_url: signatureImage,
            created_at: customDate
        };

        // Jika OFFLINE, simpan ke IndexedDB / LocalStorage Queue
        if (!navigator.onLine) {
            let queue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
            queue.push(insertData);
            localStorage.setItem('offlineQueue', JSON.stringify(queue));
            
            alert('Kamu sedang offline! Laporanmu disimpan di HP dan akan otomatis dikirim saat internet kembali aktif. 📡');
            
            // Reset UI
            const checkboxes = document.querySelectorAll('input[name="habit"]:checked');
            checkboxes.forEach(cb => cb.checked = false);
            const descInputs = document.querySelectorAll('.habit-desc');
            descInputs.forEach(input => input.value = '');
            const moodInputChecked = document.querySelector('input[name="mood"]:checked');
            if (moodInputChecked) moodInputChecked.checked = false;
            
            signaturePad.clear();
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
            loadGamificationStats();
            return;
        }

        // Jika ONLINE, kirim ke Supabase
        const { error } = await supabaseClient
            .from('habit_logs')
            .insert([insertData]);

        if (error) throw error;

        // Notifikasi Berhasil (Dinamis berdasarkan jumlah kebiasaan)
        let successMessage = "";
        if (selectedHabits.length <= 2) {
            successMessage = "Langkah awal yang bagus! Besok usahakan tambah kebiasaan baik lainnya ya, kamu pasti bisa lebih hebat lagi! 💪";
        } else if (selectedHabits.length <= 5) {
            successMessage = "Luar biasa! Kamu sudah sangat rajin hari ini. Pertahankan terus semangatmu! 🔥";
        } else {
            successMessage = "Sempurna! Kamu adalah contoh siswa teladan hari ini. Keren banget! 🌟";
        }
        alert(successMessage);
        
        // Update gamification bar without reloading
        loadGamificationStats();
        
        // Reset Form
        habitForm.reset();
        signaturePad.clear();
        
        // Kembalikan tanggal ke hari ini setelah reset
        const today = new Date();
        document.getElementById('report-date').value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
    } catch (err) {
        console.error('Error:', err);
        alert('Gagal mengirim data. Pastikan koneksi internet kamu aktif!');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
});

// Ganti PIN
const changePinBtn = document.getElementById('change-pin-btn');
if (changePinBtn) {
    changePinBtn.addEventListener('click', async () => {
        const studentID = localStorage.getItem('studentID');
        const newPin = prompt("Masukkan 4 digit PIN BARU Anda:\n(Boleh kombinasi angka apa saja)");
        
        if (!newPin) return; // Batal
        
        if (newPin.length !== 4 || isNaN(newPin)) {
            alert("PIN harus berupa 4 digit angka!");
            return;
        }

        const originalText = changePinBtn.innerHTML;
        changePinBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
        changePinBtn.disabled = true;

        try {
            const { data, error } = await supabaseClient
                .from('student_pins')
                .upsert([
                    { student_id: studentID, pin: newPin }
                ], { onConflict: 'student_id' });

            if (error) throw error;
            
            alert(`Berhasil! PIN kamu sudah diganti menjadi: ${newPin}\nIngat baik-baik ya, jangan sampai lupa!`);
        } catch (err) {
            console.error(err);
            alert("Gagal mengganti PIN. Pastikan koneksi lancar.");
        } finally {
            changePinBtn.innerHTML = originalText;
            changePinBtn.disabled = false;
        }
    });
}

// 5. Fitur Motivasi (Pesan Guru & Peringatan Sistem)
async function checkMotivation() {
    const studentID = localStorage.getItem('studentID');
    if (!studentID) return;

    const banner = document.getElementById('motivation-banner');
    if (!banner) return;

    try {
        // 1. Cek Pesan dari Guru
        const { data: messages, error: msgErr } = await supabaseClient
            .from('teacher_messages')
            .select('*')
            .eq('student_id', studentID)
            .eq('is_read', false)
            .order('created_at', { ascending: false })
            .limit(1);

        if (!msgErr && messages && messages.length > 0) {
            const msg = messages[0];
            banner.className = "banner-msg banner-teacher";
            banner.innerHTML = `
                <div style="font-size: 1.5rem; color: #3b82f6;"><i class="fas fa-envelope-open-text"></i></div>
                <div style="flex-grow: 1;">
                    <div style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; color: #60a5fa; margin-bottom: 2px;">Pesan dari Guru</div>
                    <p>"${msg.message}"</p>
                    <button class="btn-read" onclick="markMessageRead('${msg.id}')">Tutup & Tandai Dibaca</button>
                </div>
            `;
            return; // Jika ada pesan guru, jangan tampilkan peringatan sistem
        }

        // 2. Cek Frekuensi Pengisian
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const { data: logs, error: logErr } = await supabaseClient
            .from('habit_logs')
            .select('id')
            .eq('student_id', studentID)
            .gte('created_at', sevenDaysAgo.toISOString());

        if (!logErr && logs && logs.length <= 2) {
            banner.className = "banner-msg banner-warning";
            banner.innerHTML = `
                <div style="font-size: 1.5rem; color: #ef4444;"><i class="fas fa-exclamation-circle"></i></div>
                <div>
                    <p>Halo Sahabat! Belakangan ini kamu jarang mencatat kebiasaanmu ya? Yuk, mulai disiplin lagi. Kesuksesan dimulai dari kebiasaan kecil setiap hari lho! 🌱</p>
                </div>
            `;
        }
    } catch (err) {
        console.error("Gagal mengecek motivasi:", err);
    }
}

// Helper: Penentu Tantangan Mingguan
function getChallengeForDate(dateObj) {
    const habits = [
        { id: "Bangun Pagi", title: "Minggu Semangat Pagi", badge: "🌅" },
        { id: "Beribadah", title: "Minggu Khusyuk", badge: "🤲" },
        { id: "Berolahraga", title: "Minggu Keringat Sehat", badge: "🏃‍♂️" },
        { id: "Makan Sehat", title: "Minggu Gizi Seimbang", badge: "🥗" },
        { id: "Gemar Belajar", title: "Minggu Si Kutu Buku", badge: "📚" },
        { id: "Bermasyarakat", title: "Minggu Peduli Sesama", badge: "🤝" },
        { id: "Tidur Cepat/Cukup", title: "Minggu Tidur Tepat Waktu", badge: "😴" }
    ];
    // Hitung minggu sejak epoch, offset 4 hari agar pivot di hari Senin
    const weekNum = Math.floor((dateObj.getTime() - 345600000) / 604800000);
    return habits[Math.abs(weekNum % 7)];
}

function renderWeeklyChallenge() {
    const currentChallenge = getChallengeForDate(new Date());
    const badgeEl = document.getElementById('challenge-badge');
    const titleEl = document.getElementById('challenge-title');
    const targetEl = document.getElementById('challenge-target');
    
    if (badgeEl && titleEl && targetEl) {
        badgeEl.innerText = currentChallenge.badge;
        titleEl.innerText = currentChallenge.title;
        targetEl.innerText = currentChallenge.id;
    }
}

// 6. Fitur Gamifikasi (XP, Level, Streaks)
async function loadGamificationStats() {
    const studentID = localStorage.getItem('studentID');
    if (!studentID) return;

    try {
        const { data, error } = await supabaseClient
            .from('habit_logs')
            .select('created_at, habits')
            .eq('student_id', studentID)
            .order('created_at', { ascending: false });

        if (error) throw error;

        let totalXP = 0;
        let uniqueDates = new Set();

        data.forEach(log => {
            const logDate = new Date(log.created_at);
            const challengeForWeek = getChallengeForDate(logDate);

            // Hitung XP (Normal = 10 XP, Tantangan Mingguan = 20 XP)
            let habitsArr = log.habits;
            if (typeof habitsArr === 'string') {
                try { habitsArr = JSON.parse(habitsArr); } catch(e) { habitsArr = []; }
            }
            if (Array.isArray(habitsArr)) {
                habitsArr.forEach(h => {
                    if (h.habit === challengeForWeek.id) {
                        totalXP += 20;
                    } else {
                        totalXP += 10;
                    }
                });
            }

            // Catat tanggal unik untuk streak
            const dateStr = log.created_at.split('T')[0];
            uniqueDates.add(dateStr);
        });

        // Tentukan Level
        let levelName = "Pemula"; let levelIcon = "🌱"; let nextLevelXP = 100; let progress = 0;
        if (totalXP < 100) {
            levelName = "Pemula"; levelIcon = "🌱"; nextLevelXP = 100;
            progress = (totalXP / 100) * 100;
        } else if (totalXP < 300) {
            levelName = "Pelajar Giat"; levelIcon = "🚀"; nextLevelXP = 300;
            progress = ((totalXP - 100) / 200) * 100;
        } else if (totalXP < 600) {
            levelName = "Ksatria Disiplin"; levelIcon = "⚔️"; nextLevelXP = 600;
            progress = ((totalXP - 300) / 300) * 100;
        } else {
            levelName = "Pahlawan Kebiasaan"; levelIcon = "👑"; nextLevelXP = totalXP;
            progress = 100;
        }

        // Hitung Streak
        let currentStreak = 0;
        let d = new Date();
        const todayStr = d.toISOString().split('T')[0];
        d.setDate(d.getDate() - 1);
        const yesterdayStr = d.toISOString().split('T')[0];

        let dateToCheck = new Date();
        if (!uniqueDates.has(todayStr) && uniqueDates.has(yesterdayStr)) {
            // Jika hari ini belum mengisi, mulai hitung streak dari kemarin
            dateToCheck.setDate(dateToCheck.getDate() - 1);
        }

        while (true) {
            const checkStr = dateToCheck.toISOString().split('T')[0];
            if (uniqueDates.has(checkStr)) {
                currentStreak++;
                dateToCheck.setDate(dateToCheck.getDate() - 1);
            } else {
                break;
            }
        }

        // Render UI
        const bar = document.getElementById('gamification-bar');
        if (bar) {
            bar.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <div style="font-weight: 800; color: #0f766e; font-size: 1.1rem;">${levelIcon} Level: ${levelName}</div>
                    <div style="color: #f59e0b; font-weight: 800; font-size: 0.95rem; display: flex; align-items: center; gap: 5px;">
                        <i class="fas fa-fire" style="color: ${currentStreak > 0 ? '#ef4444' : '#d1d5db'}"></i> ${currentStreak} Hari Beruntun
                    </div>
                </div>
                <div style="background: #ccfbf1; border-radius: 9999px; height: 12px; width: 100%; overflow: hidden; border: 1px solid #99f6e4;">
                    <div style="background: linear-gradient(to right, #2dd4bf, #0d9488); height: 100%; border-radius: 9999px; transition: width 1s ease-in-out; width: ${progress}%"></div>
                </div>
                <div style="text-align: right; font-size: 0.75rem; color: #0d9488; font-weight: 800; margin-top: 5px;">${totalXP} / ${nextLevelXP} XP</div>
            `;
            bar.classList.remove('hidden');
            bar.style.display = 'block';

            // Beri Lencana jika mencapai milestone tertentu
            const milestones = [3, 5, 7, 14, 21, 30, 50, 100];
            if (milestones.includes(currentStreak)) {
                const lastBadgeAlert = localStorage.getItem('lastBadgeAlert');
                if (lastBadgeAlert !== currentStreak.toString()) {
                    let badgeIcon = "🔥";
                    if (currentStreak >= 30) badgeIcon = "🏆";
                    else if (currentStreak >= 14) badgeIcon = "💎";
                    else if (currentStreak >= 7) badgeIcon = "⭐";
                    
                    setTimeout(() => {
                        alert(`🎉 SELAMAT! Kamu mendapatkan Lencana Khusus!\n\n${badgeIcon} Pejuang ${currentStreak} Hari Beruntun ${badgeIcon}\n\nKamu berhasil konsisten tanpa putus. Terus pertahankan prestasimu yang luar biasa ini!`);
                    }, 1000);
                    localStorage.setItem('lastBadgeAlert', currentStreak.toString());
                }
            }
        }
    } catch(e) {
        console.error("Gagal memuat gamifikasi:", e);
    }
}

window.markMessageRead = async function(id) {
    const banner = document.getElementById('motivation-banner');
    if (banner) {
        banner.innerHTML = '';
        banner.className = '';
    }
    await supabaseClient.from('teacher_messages').update({ is_read: true }).eq('id', id);
};

if (localStorage.getItem('isLoggedIn') === 'true') {
    checkMotivation();
    renderWeeklyChallenge();
    loadGamificationStats();
    checkOnboarding();
    syncOfflineData();
}

// 7. Fitur Profil & Riwayat Jurnal
let habitChartInstance = null;

async function loadProfileData() {
    const studentID = localStorage.getItem('studentID');
    if (!studentID) return;

    try {
        const { data, error } = await supabaseClient
            .from('habit_logs')
            .select('created_at, habits')
            .eq('student_id', studentID)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // 1. Render Jurnal Riwayat
        const journalList = document.getElementById('journal-list');
        const journalCount = document.getElementById('journal-count');
        journalList.innerHTML = '';
        
        if (!data || data.length === 0) {
            journalList.innerHTML = '<div class="empty-state">Belum ada catatan jurnal. Mulai isi kebiasaanmu ya!</div>';
            journalCount.innerText = '0 Catatan';
        } else {
            journalCount.innerText = `${data.length} Catatan`;
            data.forEach(log => {
                const dateObj = new Date(log.created_at);
                const dateStr = dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                
                let habitsArr = log.habits;
                if (typeof habitsArr === 'string') {
                    try { habitsArr = JSON.parse(habitsArr); } catch(e) { habitsArr = []; }
                }

                let habitsHtml = '';
                if (Array.isArray(habitsArr)) {
                    habitsArr.forEach(h => {
                        habitsHtml += `
                            <div style="margin-bottom: 8px;">
                                <span class="journal-habit">${h.habit}</span>
                                ${h.desc && h.desc.trim() !== '' ? `<div class="journal-desc">"${h.desc}"</div>` : ''}
                            </div>
                        `;
                    });
                }

                journalList.innerHTML += `
                    <div class="journal-item">
                        <div class="journal-date"><i class="far fa-calendar-alt"></i> ${dateStr}</div>
                        <div>${habitsHtml}</div>
                    </div>
                `;
            });
        }

        // 3. Kalkulasi Max Streak untuk Render Lencana Historis
        const uniqueDates = new Set();
        data.forEach(log => uniqueDates.add(log.created_at.split('T')[0]));
        const sortedDates = Array.from(uniqueDates).sort();
        
        let maxStreak = 0;
        let tempStreak = 0;
        let prevDate = null;

        sortedDates.forEach(dateStr => {
            if (!prevDate) {
                tempStreak = 1;
            } else {
                const diffTime = new Date(dateStr) - new Date(prevDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays === 1) tempStreak++;
                else tempStreak = 1;
            }
            if (tempStreak > maxStreak) maxStreak = tempStreak;
            prevDate = dateStr;
        });

        const badgeList = document.getElementById('badge-list');
        if (badgeList) {
            badgeList.innerHTML = '';
            const allBadges = [
                { days: 3, icon: "🔥", title: "3 Hari" },
                { days: 5, icon: "🔥", title: "5 Hari" },
                { days: 7, icon: "⭐", title: "7 Hari" },
                { days: 14, icon: "💎", title: "14 Hari" },
                { days: 30, icon: "🏆", title: "30 Hari" },
            ];
            
            allBadges.forEach(b => {
                const earned = maxStreak >= b.days;
                badgeList.innerHTML += `
                    <div style="display: flex; flex-direction: column; align-items: center; width: 60px; opacity: ${earned ? '1' : '0.3'}; filter: ${earned ? 'none' : 'grayscale(1)'}; transition: all 0.3s;">
                        <div style="font-size: 2rem; background: ${earned ? '#fef3c7' : '#f1f5f9'}; border-radius: 50%; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; box-shadow: ${earned ? '0 4px 6px rgba(245,158,11,0.2)' : 'none'};">${b.icon}</div>
                        <div style="font-size: 0.65rem; font-weight: 800; color: ${earned ? '#b45309' : '#64748b'}; margin-top: 5px; text-align: center;">${b.title}</div>
                    </div>
                `;
            });
        }

        // 4. Render Grafik 7 Hari Terakhir
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const habitCounts = {
            "Bangun Pagi": 0, "Beribadah": 0, "Berolahraga": 0,
            "Makan Sehat": 0, "Gemar Belajar": 0, "Bermasyarakat": 0, "Tidur Cepat/Cukup": 0
        };

        data.forEach(log => {
            const logDate = new Date(log.created_at);
            if (logDate >= sevenDaysAgo) {
                let habitsArr = log.habits;
                if (typeof habitsArr === 'string') {
                    try { habitsArr = JSON.parse(habitsArr); } catch(e) { habitsArr = []; }
                }
                if (Array.isArray(habitsArr)) {
                    habitsArr.forEach(h => {
                        if (habitCounts[h.habit] !== undefined) {
                            habitCounts[h.habit]++;
                        }
                    });
                }
            }
        });

        const ctx = document.getElementById('habitChart').getContext('2d');
        if (habitChartInstance) { habitChartInstance.destroy(); }

        habitChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Bangun', 'Ibadah', 'Olahraga', 'Makan', 'Belajar', 'Sosial', 'Tidur'],
                datasets: [{
                    label: 'Jumlah (7 Hari)',
                    data: [
                        habitCounts["Bangun Pagi"], habitCounts["Beribadah"], habitCounts["Berolahraga"],
                        habitCounts["Makan Sehat"], habitCounts["Gemar Belajar"], habitCounts["Bermasyarakat"], habitCounts["Tidur Cepat/Cukup"]
                    ],
                    backgroundColor: 'rgba(20, 184, 166, 0.7)',
                    borderColor: '#0d9488',
                    borderWidth: 1,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } },
                    x: { ticks: { font: { size: 10 } } }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });

    } catch(e) {
        console.error("Gagal memuat profil:", e);
    }
}

// Event Listener Modal Profil
const profileBtn = document.getElementById('profile-btn');
const profileModal = document.getElementById('profile-modal');
const closeProfileBtn = document.getElementById('close-profile-modal');

if (profileBtn) {
    profileBtn.addEventListener('click', () => {
        profileModal.classList.add('active');
        loadProfileData();
    });
}
if (closeProfileBtn) {
    closeProfileBtn.addEventListener('click', () => {
        profileModal.classList.remove('active');
    });
}

// 8. Registrasi Service Worker untuk PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker terdaftar!', reg))
            .catch(err => console.error('Gagal mendaftarkan Service Worker:', err));
    });
}
