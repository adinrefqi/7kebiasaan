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

        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';
        
        // Atur waktu submission sesuai tanggal yang dipilih
        const customDate = new Date(`${selectedDate}T12:00:00`).toISOString();

        const { data, error } = await supabaseClient
            .from('habit_logs')
            .insert([
                { 
                    student_id: studentID, 
                    student_name: studentName, 
                    habits: selectedHabits, 
                    signature_url: signatureImage,
                    created_at: customDate
                }
            ]);

        if (error) throw error;

        // Notifikasi Berhasil
        alert('Selamat! Kebiasaan hebatmu hari ini sudah tercatat. Terus semangat ya!');
        
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

// 5. Registrasi Service Worker untuk PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker terdaftar!', reg))
            .catch(err => console.error('Gagal mendaftarkan Service Worker:', err));
    });
}
