(() => {
  'use strict';

  // Backend endpoint that receives streamed audio chunks. Override before this
  // script loads with: <script>window.VOICE_NOTES_API_ENDPOINT = '...';</script>
  const API_ENDPOINT = window.VOICE_NOTES_API_ENDPOINT || '/api/voice/stream';
  const CHUNK_INTERVAL_MS = 1000;

  const recordButton = document.getElementById('recordButton');
  const recordButtonLabel = recordButton.querySelector('.sr-only');
  const statusEl = document.getElementById('status');
  const timerEl = document.getElementById('timer');
  const errorEl = document.getElementById('errorMessage');
  const canvas = document.getElementById('waveform');
  const canvasCtx = canvas.getContext('2d');
  const installHint = document.getElementById('installHint');

  let mediaStream = null;
  let mediaRecorder = null;
  let audioContext = null;
  let analyser = null;
  let animationFrameId = null;
  let timerIntervalId = null;
  let recordingId = null;
  let chunkIndex = 0;
  let startedAt = 0;
  let isRecording = false;
  let isStarting = false;

  function pickMimeType() {
    if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) {
      return '';
    }
    // Chrome/Android supports webm+opus; iOS Safari only supports mp4 (AAC).
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
    return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || '';
  }

  function showError(message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  }

  function clearError() {
    errorEl.hidden = true;
    errorEl.textContent = '';
  }

  function setStatus(text, recording) {
    statusEl.textContent = text;
    statusEl.classList.toggle('status--recording', Boolean(recording));
  }

  function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

  function startTimer() {
    startedAt = Date.now();
    timerEl.textContent = '00:00';
    timerIntervalId = window.setInterval(() => {
      timerEl.textContent = formatTime(Date.now() - startedAt);
    }, 250);
  }

  function stopTimer() {
    if (timerIntervalId) {
      window.clearInterval(timerIntervalId);
      timerIntervalId = null;
    }
  }

  function drawWaveform() {
    if (!analyser) return;
    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      if (!analyser) return;
      analyser.getByteTimeDomainData(dataArray);
      const { width, height } = canvas;
      canvasCtx.clearRect(0, 0, width, height);
      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = '#ff5a5f';
      canvasCtx.beginPath();

      const sliceWidth = width / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i += 1) {
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2;
        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }
        x += sliceWidth;
      }
      canvasCtx.lineTo(width, height / 2);
      canvasCtx.stroke();

      animationFrameId = requestAnimationFrame(render);
    };

    render();
  }

  function stopWaveform() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
  }

  // Chunks are POSTed straight to the backend and never written to disk,
  // IndexedDB, or localStorage — a failed upload just drops that chunk.
  async function uploadChunk(blob, index, isFinal) {
    try {
      await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': blob.type || 'application/octet-stream',
          'X-Recording-Id': recordingId,
          'X-Chunk-Index': String(index),
          'X-Chunk-Final': String(Boolean(isFinal)),
        },
        body: blob,
        keepalive: isFinal,
      });
    } catch (err) {
      console.error('Failed to upload audio chunk', err);
      if (isRecording) {
        setStatus('Recording (upload issue)', true);
      }
    }
  }

  async function startRecording() {
    if (isStarting || isRecording) return;
    isStarting = true;
    clearError();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
      showError('This browser does not support audio recording.');
      isStarting = false;
      return;
    }

    // Create the AudioContext synchronously, inside the user-gesture click
    // handler, so Safari doesn't treat it as needing a later resume() call.
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioContext = AudioContextClass ? new AudioContextClass() : null;

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      showError('Microphone permission was denied or unavailable.');
      isStarting = false;
      if (audioContext) {
        audioContext.close();
        audioContext = null;
      }
      return;
    }

    const mimeType = pickMimeType();
    try {
      mediaRecorder = mimeType ? new MediaRecorder(mediaStream, { mimeType }) : new MediaRecorder(mediaStream);
    } catch (err) {
      showError('Unable to start the recorder on this device.');
      mediaStream.getTracks().forEach((track) => track.stop());
      mediaStream = null;
      isStarting = false;
      return;
    }

    recordingId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    chunkIndex = 0;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        uploadChunk(event.data, chunkIndex, false);
        chunkIndex += 1;
      }
    };

    mediaRecorder.onstop = () => {
      uploadChunk(new Blob([], { type: mimeType }), chunkIndex, true);
    };

    if (audioContext) {
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      const source = audioContext.createMediaStreamSource(mediaStream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      drawWaveform();
    }

    mediaRecorder.start(CHUNK_INTERVAL_MS);
    isRecording = true;
    isStarting = false;
    recordButton.setAttribute('aria-pressed', 'true');
    recordButtonLabel.textContent = 'Stop recording';
    setStatus('Recording…', true);
    startTimer();
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      mediaStream = null;
    }
    if (audioContext) {
      audioContext.close();
      audioContext = null;
      analyser = null;
    }

    stopWaveform();
    stopTimer();
    isRecording = false;
    recordButton.setAttribute('aria-pressed', 'false');
    recordButtonLabel.textContent = 'Start recording';
    setStatus('Ready', false);
  }

  recordButton.addEventListener('click', () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js').catch((err) => {
        console.error('Service worker registration failed', err);
      });
    });
  }

  window.addEventListener('beforeinstallprompt', () => {
    installHint.hidden = false;
  });
})();
