import { matchesHash, sha256Hex, type InspectionMedia } from '@rasikh/shared';
import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { firebaseDb, firebaseStorage } from '@/lib/firebase';

/** Best-effort position: never blocks the photo, and no fix is simply recorded as absent. */
export function readGps(timeoutMs = 4000): Promise<InspectionMedia['gps']> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return Promise.resolve(undefined);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(undefined), timeoutMs + 500);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        clearTimeout(timer);
        resolve({
          lat: Number(p.coords.latitude.toFixed(6)),
          lng: Number(p.coords.longitude.toFixed(6)),
          accuracy: Math.round(p.coords.accuracy),
        });
      },
      () => {
        clearTimeout(timer);
        resolve(undefined);
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 10_000 },
    );
  });
}

export const deviceLabel = () =>
  typeof navigator === 'undefined' ? '' : navigator.userAgent.slice(0, 200);

export async function sha256OfBlob(blob: Blob): Promise<string> {
  return sha256Hex(new Uint8Array(await blob.arrayBuffer()));
}

export interface EvidenceTarget {
  orgId: string;
  inspectionId: string;
  room: string;
  item?: string;
  uid: string;
}

/**
 * Stores one photo as evidence: hash and metadata are taken at the moment of capture, the file is
 * uploaded write-once, and a create-only metadata document ties them together.
 */
export async function saveEvidence(target: EvidenceTarget, blob: Blob, capturedAt = new Date()) {
  const sha256 = await sha256OfBlob(blob);
  const gps = await readGps();
  const db = firebaseDb();
  const mediaRef = doc(
    collection(db, `orgs/${target.orgId}/inspections/${target.inspectionId}/media`),
  );
  const path = `orgs/${target.orgId}/inspections/${target.inspectionId}/${mediaRef.id}.jpg`;
  await uploadBytes(ref(firebaseStorage(), path), blob, { contentType: 'image/jpeg' });
  await setDoc(mediaRef, {
    room: target.room,
    ...(target.item ? { item: target.item } : {}),
    path,
    sha256,
    size: blob.size,
    contentType: 'image/jpeg',
    capturedAt: capturedAt.toISOString(),
    ...(gps ? { gps } : {}),
    device: deviceLabel(),
    source: 'in_app_camera',
    uploadedBy: target.uid,
    createdAt: serverTimestamp(),
  });
  return { id: mediaRef.id, sha256 };
}

export const evidenceUrl = (path: string) => getDownloadURL(ref(firebaseStorage(), path));

/** Downloads the stored file again and checks it still matches the hash recorded at capture. */
export async function verifyEvidence(path: string, expectedSha256: string): Promise<boolean> {
  const res = await fetch(await evidenceUrl(path));
  return matchesHash(new Uint8Array(await res.arrayBuffer()), expectedSha256);
}
