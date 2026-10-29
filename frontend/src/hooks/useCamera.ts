import { useCallback, useEffect, useRef, useState } from 'react';

export type CameraStatus =
  'idle' | 'requesting' | 'active' | 'denied' | 'not-found' | 'unsupported' | 'error';

export interface CameraDevice {
  deviceId: string;
  label: string;
}

interface CameraState {
  status: CameraStatus;
  message: string | null;
}

function describeError(error: unknown): CameraState {
  const name = error instanceof DOMException || error instanceof Error ? error.name : '';
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return {
        status: 'denied',
        message:
          'Camera permission was denied. Allow camera access for this site in your browser settings, then retry.',
      };
    case 'NotFoundError':
    case 'OverconstrainedError':
      return { status: 'not-found', message: 'No compatible camera was found. Connect a webcam and retry.' };
    case 'NotReadableError':
    case 'AbortError':
      return {
        status: 'error',
        message: 'The camera could not be started. It may be in use by another application.',
      };
    default:
      return { status: 'error', message: 'The camera could not be started.' };
  }
}

/**
 * Owns the webcam MediaStream: permission, device selection, attach/detach to a
 * <video>, and guaranteed track shutdown on stop or unmount.
 */
export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestIdRef = useRef(0);
  const [state, setState] = useState<CameraState>({ status: 'idle', message: null });
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      setDevices(
        all
          .filter((d) => d.kind === 'videoinput')
          .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Camera ${i + 1}` })),
      );
    } catch {
      setDevices([]);
    }
  }, []);

  const stop = useCallback(() => {
    requestIdRef.current += 1; // invalidates any pending getUserMedia call
    releaseStream();
    setActiveDeviceId(null);
    setState({ status: 'idle', message: null });
  }, [releaseStream]);

  const start = useCallback(
    async (deviceId?: string | null): Promise<void> => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setState({
          status: 'unsupported',
          message:
            'This browser does not support camera access. Use a recent Chrome, Edge or Firefox on localhost.',
        });
        return;
      }
      const requestId = ++requestIdRef.current;
      releaseStream();
      setState({ status: 'requesting', message: null });

      const open = (id: string | null | undefined) =>
        navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            deviceId: id ? { exact: id } : undefined,
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: id ? undefined : 'user',
          },
        });

      try {
        let stream: MediaStream;
        try {
          stream = await open(deviceId);
        } catch (error) {
          const name = error instanceof DOMException || error instanceof Error ? error.name : '';
          // A remembered camera may have been unplugged: fall back to the default one.
          if (!deviceId || (name !== 'OverconstrainedError' && name !== 'NotFoundError')) throw error;
          stream = await open(null);
        }
        if (requestId !== requestIdRef.current) {
          // stop() or another start() happened while the permission prompt was open.
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const [track] = stream.getVideoTracks();
        track?.addEventListener('ended', () => {
          if (streamRef.current !== stream) return;
          releaseStream();
          setState({ status: 'error', message: 'The camera was disconnected or stopped by the system.' });
        });
        setActiveDeviceId(track?.getSettings().deviceId ?? deviceId ?? null);

        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => undefined); // autoplay is allowed for muted inline video
        }
        // The track may have ended (or stop()/start() been called) while play() was pending;
        // in that case the 'ended' handler or the newer call owns the state, so don't
        // overwrite it with "active".
        if (requestId !== requestIdRef.current || streamRef.current !== stream) return;
        if (track?.readyState === 'ended') {
          releaseStream();
          setState({ status: 'error', message: 'The camera was disconnected or stopped by the system.' });
          return;
        }
        setState({ status: 'active', message: null });
        void refreshDevices(); // labels become available after permission is granted
      } catch (error) {
        if (requestId !== requestIdRef.current) return;
        releaseStream();
        setState(describeError(error));
      }
    },
    [refreshDevices, releaseStream],
  );

  useEffect(() => {
    const media = navigator.mediaDevices;
    media
      ?.enumerateDevices?.()
      .then((all) =>
        setDevices(
          all
            .filter((d) => d.kind === 'videoinput')
            .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Camera ${i + 1}` })),
        ),
      )
      .catch(() => setDevices([]));
    media?.addEventListener?.('devicechange', refreshDevices);
    return () => {
      media?.removeEventListener?.('devicechange', refreshDevices);
      requestIdRef.current += 1;
      releaseStream();
    };
  }, [refreshDevices, releaseStream]);

  return { videoRef, ...state, devices, activeDeviceId, start, stop };
}
