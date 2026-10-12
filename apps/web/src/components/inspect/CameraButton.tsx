'use client';

import { Camera } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';

/**
 * In-app camera only. There is deliberately no file picker: a photo that can be chosen from the gallery
 * could predate the visit, so evidence must be captured here, with the time and place of capture.
 */
export function CameraButton({
  title,
  label,
  disabled,
  busy,
  onShot,
}: {
  title: string;
  label: string;
  disabled?: boolean;
  busy?: boolean;
  onShot: (blob: Blob) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      title={title}
      trigger={
        <Button
          size="md"
          variant="quiet"
          disabled={disabled}
          loading={busy}
          data-testid="camera-open"
          aria-label={label}
        >
          <Camera size={18} aria-hidden="true" />
          <span className="max-sm:sr-only">{label}</span>
        </Button>
      }
    >
      {open && (
        <CameraView
          onShot={async (blob) => {
            setOpen(false);
            await onShot(blob);
          }}
        />
      )}
    </Dialog>
  );
}

function CameraView({ onShot }: { onShot: (blob: Blob) => Promise<void> }) {
  const t = useTranslations('inspect');
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stream: MediaStream | undefined;
    let cancelled = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(true);
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((tr) => tr.stop());
          return;
        }
        stream = s;
        if (video.current) video.current.srcObject = s;
      })
      .catch(() => setError(true));
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((tr) => tr.stop());
    };
  }, []);

  const shoot = () => {
    const v = video.current;
    if (!v) return;
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth || 640;
    canvas.height = v.videoHeight || 480;
    canvas.getContext('2d')?.drawImage(v, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((b) => b && void onShot(b), 'image/jpeg', 0.85);
  };

  if (error) {
    return (
      <p role="alert" className="text-small text-danger" data-testid="camera-error">
        {t('cameraDenied')}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <video
        ref={video}
        autoPlay
        playsInline
        muted
        onLoadedData={() => setReady(true)}
        aria-label={t('cameraPreview')}
        className="aspect-[4/3] w-full rounded-md bg-night object-cover"
      />
      <Button onClick={shoot} disabled={!ready} data-testid="camera-shutter">
        <Camera size={18} aria-hidden="true" />
        {t('capture')}
      </Button>
      <p className="text-caption text-text-muted">{t('captureNote')}</p>
    </div>
  );
}
