// src/hooks/useVoiceRecorder.ts
import { useState, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';

export interface VoiceRecorderState {
  isRecording: boolean;
  elapsed: number;        // seconds recorded so far
  cancelled: boolean;     // was the last recording cancelled
}

export interface VoiceRecorderResult {
  uri: string;
  duration: number;       // seconds, rounded
}

export function useVoiceRecorder() {
  const [state, setState] = useState<VoiceRecorderState>({
    isRecording: false,
    elapsed: 0,
    cancelled: false,
  });

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedRef = useRef(0);
  const onFinishRef = useRef<((result: VoiceRecorderResult | null) => void) | null>(null);

  function clearTimers() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (autoStopRef.current) { clearTimeout(autoStopRef.current); autoStopRef.current = null; }
  }

  const start = useCallback(async (onFinish: (result: VoiceRecorderResult | null) => void) => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') { onFinish(null); return; }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );

      recordingRef.current = recording;
      onFinishRef.current = onFinish;
      elapsedRef.current = 0;

      setState({ isRecording: true, elapsed: 0, cancelled: false });

      timerRef.current = setInterval(() => {
        elapsedRef.current += 1;
        setState(s => ({ ...s, elapsed: elapsedRef.current }));
      }, 1000);

      // auto-stop at 20 seconds
      autoStopRef.current = setTimeout(() => {
        stop(false);
      }, 20000);
    } catch (e) {
      console.error('useVoiceRecorder start error', e);
      onFinish(null);
    }
  }, []);

  const stop = useCallback(async (cancel: boolean) => {
    clearTimers();
    const recording = recordingRef.current;
    if (!recording) return;
    recordingRef.current = null;

    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      if (cancel) {
        setState({ isRecording: false, elapsed: 0, cancelled: true });
        onFinishRef.current?.(null);
      } else {
        const uri = recording.getURI() ?? '';
        const duration = Math.max(1, Math.round(elapsedRef.current));
        setState({ isRecording: false, elapsed: 0, cancelled: false });
        onFinishRef.current?.({ uri, duration });
      }
    } catch (e) {
      console.error('useVoiceRecorder stop error', e);
      setState({ isRecording: false, elapsed: 0, cancelled: false });
      onFinishRef.current?.(null);
    }
  }, []);

  return { state, start, stop };
}
