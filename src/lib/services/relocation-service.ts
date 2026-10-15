/**
 * Relocation Service (Pengajuan Pindah Kantor)
 * Menangani pengajuan perpindahan lokasi kantor peserta magang.
 *
 * Catatan Arsitektur:
 * - Menggunakan client storage (localStorage) yang reaktif dan persisten
 * - Struktur data dirancang agar siap diintegrasikan langsung dengan endpoint backend
 *   (misal: POST /api/interns/relocation atau PATCH /api/attendance/requests)
 */

export interface RelocationRequest {
  id: string;
  internId: string;
  internName?: string;
  internEmail?: string;
  currentOfficeId?: string;
  currentOfficeName?: string;
  currentLocationId?: string;
  targetOfficeId?: string;
  targetOfficeName?: string;
  targetLocationId?: string;
  reason: string;
  notes?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
}

const STORAGE_KEY = 'ioh_relocation_requests';
const USER_OFFICE_KEY_PREFIX = 'ioh_user_office_';

// Initial mock requests jika storage masih kosong
const INITIAL_REQUESTS: RelocationRequest[] = [
  {
    id: 'reloc-init-01',
    internId: 'intern-zacky',
    internName: 'Zacky Kurniawan',
    internEmail: 'zacky.kurniawan@ioh.co.id',
    currentOfficeId: 'loc-kppti',
    currentLocationId: 'loc-kppti',
    currentOfficeName: 'KPPTI Jakarta Pusat (HQ)',
    targetOfficeId: 'loc-bsd',
    targetLocationId: 'loc-bsd',
    targetOfficeName: 'Gedung Indosat Serpong BSD',
    reason: 'Pindah domisili ke Tangerang Selatan agar lebih dekat dengan lokasi kerja tim Network.',
    notes: 'Sudah berkoordinasi dengan mentor Vicky.',
    status: 'PENDING',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
];

let inMemoryRequests: RelocationRequest[] = [...INITIAL_REQUESTS];

function getStoredRequests(): RelocationRequest[] {
  if (typeof window === 'undefined') return inMemoryRequests;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_REQUESTS));
      return INITIAL_REQUESTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_REQUESTS;
  } catch {
    return inMemoryRequests;
  }
}

function saveStoredRequests(list: RelocationRequest[]): void {
  inMemoryRequests = list;
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

/**
 * Mengambil daftar pengajuan pindah kantor
 */
export async function getRelocationRequests(internId?: string): Promise<RelocationRequest[]> {
  if (typeof window !== 'undefined') {
    try {
      const url = `/api/interns/relocation${internId ? `?internId=${encodeURIComponent(internId)}` : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const serverList: RelocationRequest[] = Array.isArray(data?.requests)
          ? data.requests
          : Array.isArray(data)
          ? data
          : [];

        if (serverList.length > 0) {
          // Normalize and merge with local office names if needed
          const localStored = getStoredRequests();
          const merged = serverList.map((srv) => {
            const localMatch = localStored.find((l) => l.id === srv.id);
            return {
              ...srv,
              currentOfficeId: srv.currentLocationId || srv.currentOfficeId,
              targetOfficeId: srv.targetLocationId || srv.targetOfficeId,
              currentOfficeName:
                srv.currentOfficeName || localMatch?.currentOfficeName || srv.currentLocationId,
              targetOfficeName:
                srv.targetOfficeName || localMatch?.targetOfficeName || srv.targetLocationId,
            };
          });
          saveStoredRequests(merged);
          return merged;
        } else {
          saveStoredRequests([]);
          return [];
        }
      }
    } catch {
      // Fallback to offline localStorage
    }
  }

  const all = getStoredRequests();
  if (internId) {
    return all.filter((r) => r.internId === internId);
  }
  return all;
}

/**
 * Mengambil pengajuan pindah kantor terakhir (terutama status PENDING jika ada)
 */
export async function getLatestRelocationRequest(internId: string): Promise<RelocationRequest | null> {
  const requests = await getRelocationRequests(internId);
  if (requests.length === 0) return null;
  // Prioritaskan yang masih PENDING jika ada, atau yang terbaru
  const pending = requests.find((r) => r.status === 'PENDING');
  if (pending) return pending;
  return requests[0];
}

/**
 * Mendapatkan nama kantor saat ini dari intern (memperhitungkan jika sudah pernah disetujui pindah)
 */
export function getCurrentOfficeForIntern(internId: string, defaultOffice = 'KPPTI Jakarta Pusat (HQ)'): string {
  if (typeof window === 'undefined') return defaultOffice;
  try {
    const customOffice = localStorage.getItem(`${USER_OFFICE_KEY_PREFIX}${internId}`);
    if (customOffice) return customOffice;
  } catch {}
  return defaultOffice;
}

/**
 * Mengajukan permohonan pindah kantor
 */
export async function submitRelocationRequest(payload: {
  internId: string;
  internName?: string;
  internEmail?: string;
  currentOfficeId?: string;
  currentLocationId?: string;
  currentOfficeName?: string;
  targetOfficeId?: string;
  targetLocationId?: string;
  targetOfficeName?: string;
  reason: string;
  notes?: string;
}): Promise<{ success: boolean; error?: string; request?: RelocationRequest }> {
  const currentLocId = payload.currentLocationId || payload.currentOfficeId || 'loc-kppti';
  const targetLocId = payload.targetLocationId || payload.targetOfficeId || '';
  const currentOfficeName = payload.currentOfficeName || currentLocId;
  const targetOfficeName = payload.targetOfficeName || targetLocId;

  // Validasi Frontend
  if (!targetLocId || (payload.targetOfficeName !== undefined && !payload.targetOfficeName)) {
    return { success: false, error: 'Kantor tujuan wajib dipilih' };
  }
  if (targetLocId === currentLocId) {
    return { success: false, error: 'Kantor tujuan tidak boleh sama dengan kantor saat ini' };
  }
  if (!payload.reason || payload.reason.trim().length === 0) {
    return { success: false, error: 'Alasan pindah kantor wajib diisi' };
  }

  // Cek apakah ada pengajuan PENDING di storage lokal
  const all = getStoredRequests();
  const existingPending = all.find(
    (r) => r.internId === payload.internId && r.status === 'PENDING'
  );
  if (existingPending) {
    return {
      success: false,
      error: 'Anda masih memiliki pengajuan pindah kantor yang sedang Menunggu Persetujuan.',
    };
  }

  // Live backend call jika berjalan di browser
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/interns/relocation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internId: payload.internId,
          currentLocationId: currentLocId,
          targetLocationId: targetLocId,
          reason: payload.reason.trim(),
          notes: payload.notes?.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data.error || 'Gagal mengirim pengajuan pindah kantor',
        };
      }

      const serverRequest: RelocationRequest = {
        ...data.request,
        internName: payload.internName,
        internEmail: payload.internEmail,
        currentOfficeId: currentLocId,
        currentLocationId: currentLocId,
        currentOfficeName,
        targetOfficeId: targetLocId,
        targetLocationId: targetLocId,
        targetOfficeName,
      };

      const updated = [serverRequest, ...all.filter((r) => r.id !== serverRequest.id)];
      saveStoredRequests(updated);
      return { success: true, request: serverRequest };
    } catch {
      // Offline fallback: lanjutkan membuat secara lokal
    }
  }

  const newRequest: RelocationRequest = {
    id: `reloc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    internId: payload.internId,
    internName: payload.internName || payload.internId,
    internEmail: payload.internEmail,
    currentOfficeId: currentLocId,
    currentLocationId: currentLocId,
    currentOfficeName,
    targetOfficeId: targetLocId,
    targetLocationId: targetLocId,
    targetOfficeName,
    reason: payload.reason.trim(),
    notes: payload.notes?.trim() || undefined,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };

  const updated = [newRequest, ...all];
  saveStoredRequests(updated);

  return { success: true, request: newRequest };
}

/**
 * Approve atau Reject permohonan pindah kantor oleh Admin
 */
export async function reviewRelocationRequest(
  id: string,
  status: 'APPROVED' | 'REJECTED',
  reviewedBy: string,
  rejectionReason?: string
): Promise<{ success: boolean; error?: string }> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/interns/relocation/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          reviewedBy,
          rejectionReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data.error || 'Gagal memproses persetujuan pengajuan',
        };
      }
    } catch {
      // Offline fallback
    }
  }

  const all = getStoredRequests();
  const index = all.findIndex((r) => r.id === id);
  if (index !== -1) {
    const target = all[index];
    const updatedReq: RelocationRequest = {
      ...target,
      status,
      reviewedBy,
      reviewedAt: new Date().toISOString(),
      rejectionReason: status === 'REJECTED' ? rejectionReason : undefined,
    };

    all[index] = updatedReq;
    saveStoredRequests(all);

    // Jika APPROVED, perbarui kantor saat ini milik intern di local storage
    if (status === 'APPROVED' && typeof window !== 'undefined') {
      try {
        const officeName = target.targetOfficeName || target.targetLocationId || target.targetOfficeId;
        if (officeName) {
          localStorage.setItem(`${USER_OFFICE_KEY_PREFIX}${target.internId}`, officeName);
        }
      } catch {}
    }
  }

  return { success: true };
}
