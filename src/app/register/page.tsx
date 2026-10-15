'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { OfficeLocation } from '../../types/index.ts';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    namaLengkap: '',
    email: '',
    password: '',
    pin: '',
    divisi: '',
    namaMentor: '',
    emailMentor: '',
    universitas: '',
    jurusan: '',
    periodeMagangSelesai: '',
    assignedLocationId: 'loc-kppti',
  });

  const [locations, setLocations] = useState<OfficeLocation[]>([]);
  const [facePhoto, setFacePhoto] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Fetch available office locations
  useEffect(() => {
    fetch('/api/config/locations')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: OfficeLocation[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setLocations(data);
          setFormData((prev) => ({ ...prev, assignedLocationId: data[0].id }));
        }
      })
      .catch(() => {
        // Fallback default locations
        setLocations([
          { id: 'loc-kppti', name: 'KPPTI Jakarta Pusat (HQ)', latitude: -6.180495, longitude: 106.822769, maxRadiusMeters: 50, isActive: true },
          { id: 'loc-bsd', name: 'Gedung Indosat Serpong BSD', latitude: -6.301540, longitude: 106.652170, maxRadiusMeters: 75, isActive: true },
        ]);
      });

    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        stopCamera();
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      setCameraError('Gagal mengakses kamera. Silakan gunakan opsi unggah file foto wajah di bawah.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 480;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setFacePhoto(dataUrl);
      stopCamera();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Berkas yang dipilih harus berupa gambar (JPEG, PNG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setFacePhoto(result);
        stopCamera();
      }
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!facePhoto) {
      setErrorMessage('Foto wajah wajib diambil atau diunggah sebelum mendaftar.');
      return;
    }

    if (formData.pin.length !== 6 || !/^\d{6}$/.test(formData.pin)) {
      setErrorMessage('PIN Presensi harus berupa 6 digit angka.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          facePhoto,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Terjadi kesalahan saat pendaftaran.');
        setSubmitting(false);
        return;
      }

      setSuccessMessage(`Pendaftaran berhasil! Akun ${data.intern.namaLengkap} telah aktif.`);
      setSubmitting(false);
    } catch {
      setErrorMessage('Gagal menghubungi server. Periksa koneksi internet Anda.');
      setSubmitting(false);
    }
  };

  return (
    <div className="raw-register-wrapper">
      <style>{`
        .raw-register-wrapper {
          min-height: 100vh;
          background-color: #f4f6f8;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #222;
          padding: 24px 16px;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          box-sizing: border-box;
        }
        .raw-card {
          background: #ffffff;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          max-width: 680px;
          width: 100%;
          padding: 28px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.06);
          box-sizing: border-box;
        }
        .raw-header {
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 16px;
          margin-bottom: 20px;
        }
        .raw-title {
          margin: 0 0 6px 0;
          font-size: 22px;
          font-weight: 700;
          color: #111827;
        }
        .raw-subtitle {
          margin: 0;
          font-size: 14px;
          color: #6b7280;
        }
        .raw-alert-error {
          background-color: #fee2e2;
          border-left: 4px solid #ef4444;
          color: #991b1b;
          padding: 12px;
          margin-bottom: 18px;
          font-size: 14px;
          border-radius: 4px;
        }
        .raw-alert-success {
          background-color: #dcfce7;
          border-left: 4px solid #22c55e;
          color: #166534;
          padding: 12px;
          margin-bottom: 18px;
          font-size: 14px;
          border-radius: 4px;
        }
        .raw-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        @media (max-width: 600px) {
          .raw-form-grid {
            grid-template-columns: 1fr;
          }
        }
        .raw-form-group {
          margin-bottom: 14px;
        }
        .raw-form-group.full-width {
          grid-column: 1 / -1;
        }
        .raw-label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 6px;
        }
        .raw-input, .raw-select {
          width: 100%;
          padding: 9px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 14px;
          box-sizing: border-box;
          background: #fff;
        }
        .raw-input:focus, .raw-select:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 2px rgba(37,99,235,0.2);
        }
        .raw-face-section {
          grid-column: 1 / -1;
          background: #f8fafc;
          border: 1px dashed #cbd5e1;
          border-radius: 8px;
          padding: 18px;
          margin-top: 6px;
          margin-bottom: 16px;
          text-align: center;
        }
        .raw-video-container {
          position: relative;
          width: 260px;
          height: 260px;
          margin: 12px auto;
          background: #000;
          border-radius: 8px;
          overflow: hidden;
        }
        .raw-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .raw-preview-img {
          width: 200px;
          height: 200px;
          object-fit: cover;
          border-radius: 8px;
          border: 2px solid #22c55e;
          margin: 10px auto;
          display: block;
        }
        .raw-btn {
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: background 0.15s ease;
        }
        .raw-btn-primary {
          background-color: #2563eb;
          color: #fff;
        }
        .raw-btn-primary:hover {
          background-color: #1d4ed8;
        }
        .raw-btn-secondary {
          background-color: #e2e8f0;
          color: #334155;
          margin-left: 8px;
        }
        .raw-btn-secondary:hover {
          background-color: #cbd5e1;
        }
        .raw-btn-submit {
          width: 100%;
          padding: 12px;
          background-color: #10b981;
          color: #fff;
          font-size: 16px;
          font-weight: 700;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          margin-top: 12px;
        }
        .raw-btn-submit:hover {
          background-color: #059669;
        }
        .raw-btn-submit:disabled {
          background-color: #9ca3af;
          cursor: not-allowed;
        }
        .raw-footer-link {
          text-align: center;
          margin-top: 18px;
          font-size: 14px;
          color: #4b5563;
        }
        .raw-footer-link a {
          color: #2563eb;
          text-decoration: underline;
        }
      `}</style>

      <div className="raw-card">
        <div className="raw-header">
          <h1 className="raw-title">Pendaftaran Peserta Magang Baru</h1>
          <p className="raw-subtitle">
            Isi formulir pendaftaran dan ambil foto wajah untuk verifikasi absensi check-in/check-out.
          </p>
        </div>

        {errorMessage && <div className="raw-alert-error">{errorMessage}</div>}
        {successMessage && (
          <div className="raw-alert-success">
            {successMessage}
            <div style={{ marginTop: '10px' }}>
              <a href="/login" style={{ fontWeight: 'bold', color: '#166534', textDecoration: 'underline' }}>
                Buka Halaman Login &rarr;
              </a>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="raw-form-grid">
            {/* 1. Nama Lengkap */}
            <div className="raw-form-group">
              <label className="raw-label" htmlFor="namaLengkap">
                Nama Lengkap *
              </label>
              <input
                id="namaLengkap"
                name="namaLengkap"
                type="text"
                required
                className="raw-input"
                placeholder="Contoh: Sarah Nurhaliza"
                value={formData.namaLengkap}
                onChange={handleInputChange}
              />
            </div>

            {/* 2. Email */}
            <div className="raw-form-group">
              <label className="raw-label" htmlFor="email">
                Email Perusahaan / Kampus *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="raw-input"
                placeholder="sarah@ioh.co.id"
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>

            {/* 3. Password */}
            <div className="raw-form-group">
              <label className="raw-label" htmlFor="password">
                Password Login * (min 6 karakter)
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                className="raw-input"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleInputChange}
              />
            </div>

            {/* 4. PIN Presensi */}
            <div className="raw-form-group">
              <label className="raw-label" htmlFor="pin">
                PIN Presensi * (6 Digit Angka)
              </label>
              <input
                id="pin"
                name="pin"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                className="raw-input"
                placeholder="Contoh: 123456"
                value={formData.pin}
                onChange={handleInputChange}
              />
            </div>

            {/* 5. Divisi */}
            <div className="raw-form-group">
              <label className="raw-label" htmlFor="divisi">
                Divisi Penempatan *
              </label>
              <input
                id="divisi"
                name="divisi"
                type="text"
                required
                className="raw-input"
                placeholder="Contoh: Network Operations"
                value={formData.divisi}
                onChange={handleInputChange}
              />
            </div>

            {/* 6. Lokasi Kantor */}
            <div className="raw-form-group">
              <label className="raw-label" htmlFor="assignedLocationId">
                Lokasi Kantor Utama *
              </label>
              <select
                id="assignedLocationId"
                name="assignedLocationId"
                className="raw-select"
                value={formData.assignedLocationId}
                onChange={handleInputChange}
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 7. Nama Mentor */}
            <div className="raw-form-group">
              <label className="raw-label" htmlFor="namaMentor">
                Nama Mentor Pembimbing *
              </label>
              <input
                id="namaMentor"
                name="namaMentor"
                type="text"
                required
                className="raw-input"
                placeholder="Contoh: Budi Santoso"
                value={formData.namaMentor}
                onChange={handleInputChange}
              />
            </div>

            {/* 8. Email Mentor */}
            <div className="raw-form-group">
              <label className="raw-label" htmlFor="emailMentor">
                Email Mentor Pembimbing *
              </label>
              <input
                id="emailMentor"
                name="emailMentor"
                type="email"
                required
                className="raw-input"
                placeholder="budi.santoso@indosat.com"
                value={formData.emailMentor}
                onChange={handleInputChange}
              />
            </div>

            {/* 9. Universitas */}
            <div className="raw-form-group">
              <label className="raw-label" htmlFor="universitas">
                Universitas / Institut *
              </label>
              <input
                id="universitas"
                name="universitas"
                type="text"
                required
                className="raw-input"
                placeholder="Contoh: Institut Teknologi Bandung"
                value={formData.universitas}
                onChange={handleInputChange}
              />
            </div>

            {/* 10. Jurusan */}
            <div className="raw-form-group">
              <label className="raw-label" htmlFor="jurusan">
                Jurusan / Program Studi *
              </label>
              <input
                id="jurusan"
                name="jurusan"
                type="text"
                required
                className="raw-input"
                placeholder="Contoh: Teknik Telekomunikasi"
                value={formData.jurusan}
                onChange={handleInputChange}
              />
            </div>

            {/* 11. Periode Selesai */}
            <div className="raw-form-group full-width">
              <label className="raw-label" htmlFor="periodeMagangSelesai">
                Periode Magang Selesai (Tanggal Berakhir) *
              </label>
              <input
                id="periodeMagangSelesai"
                name="periodeMagangSelesai"
                type="date"
                required
                className="raw-input"
                value={formData.periodeMagangSelesai}
                onChange={handleInputChange}
              />
            </div>

            {/* 12. Face Verification Section */}
            <div className="raw-face-section">
              <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', color: '#1f2937' }}>
                Pengambilan Foto Wajah Referensi *
              </h3>
              <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#6b7280' }}>
                Foto ini akan disimpan sebagai referensi biometrik saat verifikasi absensi check-in dan check-out.
              </p>

              {cameraError && <div className="raw-alert-error">{cameraError}</div>}

              {facePhoto ? (
                <div>
                  <img src={facePhoto} alt="Preview Foto Wajah" className="raw-preview-img" />
                  <p style={{ fontSize: '13px', color: '#166534', fontWeight: 600 }}>
                    ✓ Foto Wajah Siap Digunakan
                  </p>
                  <button
                    type="button"
                    className="raw-btn raw-btn-secondary"
                    onClick={() => {
                      setFacePhoto(null);
                      startCamera();
                    }}
                  >
                    Ambil Ulang Foto
                  </button>
                </div>
              ) : (
                <div>
                  {cameraActive ? (
                    <div>
                      <div className="raw-video-container">
                        <video ref={videoRef} autoPlay playsInline muted className="raw-video" />
                      </div>
                      <div style={{ marginTop: '10px' }}>
                        <button
                          type="button"
                          className="raw-btn raw-btn-primary"
                          onClick={capturePhoto}
                        >
                          📸 Jepret Foto Wajah
                        </button>
                        <button
                          type="button"
                          className="raw-btn raw-btn-secondary"
                          onClick={stopCamera}
                        >
                          Tutup Kamera
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <button
                        type="button"
                        className="raw-btn raw-btn-primary"
                        onClick={startCamera}
                      >
                        📷 Buka Kamera Webcam
                      </button>
                      <div style={{ margin: '12px 0', fontSize: '13px', color: '#9ca3af' }}>
                        — ATAU —
                      </div>
                      <label
                        className="raw-btn raw-btn-secondary"
                        style={{ display: 'inline-block', cursor: 'pointer' }}
                      >
                        📁 Unggah Berkas Foto Wajah
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          capture="user"
                          style={{ display: 'none' }}
                          onChange={handleFileUpload}
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="raw-btn-submit"
          >
            {submitting ? 'Memproses Pendaftaran & Validasi Wajah...' : 'Daftarkan Peserta Magang'}
          </button>
        </form>

        <div className="raw-footer-link">
          Sudah punya akun? <a href="/login">Masuk ke Halaman Login</a>
        </div>
      </div>
    </div>
  );
}

