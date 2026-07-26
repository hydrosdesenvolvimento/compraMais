import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconeCamera } from '../icons';

/**
 * Captura facial reutilizável (UC007): webcam (`getUserMedia` → frame em canvas → JPEG) com FALLBACK
 * de upload de arquivo — que cobre "sem câmera / permissão negada" e mantém o componente testável em
 * ambientes sem mídia (jsdom). Não decide nada: entrega o data URL capturado via `onCapturar`.
 * Toda string vem do i18n; o chamador cuida do envio/veredito.
 */
export function CapturaFacial({
  onCapturar,
  ocupado = false,
  cyPrefix = 'captura',
}: {
  onCapturar: (dataUrl: string) => void;
  ocupado?: boolean;
  cyPrefix?: string;
}) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraAtiva, setCameraAtiva] = useState(false);

  useEffect(() => () => pararCamera(), []);

  function pararCamera() {
    streamRef.current?.getTracks().forEach((faixa) => faixa.stop());
    streamRef.current = null;
    setCameraAtiva(false);
  }

  async function ativarCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraAtiva(true);
    } catch {
      // Sem câmera / permissão negada / ambiente sem mídia → o fallback de upload assume.
      setCameraAtiva(false);
    }
  }

  function capturarDaCamera() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 480;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    onCapturar(canvas.toDataURL('image/jpeg', 0.9));
  }

  function escolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onCapturar(String(reader.result));
    reader.readAsDataURL(file);
  }

  return (
    <div data-cy={`${cyPrefix}-facial`} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div
        style={{
          position: 'relative',
          aspectRatio: '4 / 3',
          maxWidth: 420,
          borderRadius: 12,
          overflow: 'hidden',
          background: 'var(--cinza-100, #f1f3f5)',
          border: '1.5px solid var(--border)',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          aria-label={t('credenciamento.provaVida.titulo')}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: cameraAtiva ? 'block' : 'none' }}
        />
        {!cameraAtiva && (
          <button
            type="button"
            data-cy={`${cyPrefix}-ativar-camera`}
            onClick={() => void ativarCamera()}
            disabled={ocupado}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px',
              border: '1.5px solid var(--border)', borderRadius: 9, background: '#fff',
              color: 'var(--cinza-700)', font: '600 14px var(--font-body)', cursor: 'pointer',
            }}
          >
            <IconeCamera width={18} height={18} />
            {t('credenciamento.provaVida.iniciarCamera')}
          </button>
        )}
      </div>

      {cameraAtiva && (
        <button
          type="button"
          data-cy={`${cyPrefix}-capturar`}
          onClick={capturarDaCamera}
          disabled={ocupado}
          className="btn btn-primary"
          style={{ alignSelf: 'flex-start' }}
        >
          {ocupado ? t('credenciamento.provaVida.verificando') : t('credenciamento.provaVida.capturar')}
        </button>
      )}

      {/* Fallback sem câmera (também o caminho testável): envia uma foto do rosto. */}
      <label
        data-cy={`${cyPrefix}-sem-camera`}
        style={{ font: '600 13px var(--font-body)', color: 'var(--azul-700, #1d4ed8)', cursor: ocupado ? 'default' : 'pointer' }}
      >
        {t('credenciamento.provaVida.semCamera')}{' '}
        <span style={{ textDecoration: 'underline' }}>{t('credenciamento.provaVida.enviarFoto')}</span>
        <input
          type="file"
          accept="image/png,image/jpeg"
          data-cy={`${cyPrefix}-arquivo`}
          onChange={escolherArquivo}
          disabled={ocupado}
          style={{ display: 'none' }}
        />
      </label>
    </div>
  );
}
