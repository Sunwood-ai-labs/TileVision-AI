import { GridConfig, QueuedVideo } from "../types";

// Helper to get a frame as base64
export const captureFrame = (videoFile: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = URL.createObjectURL(videoFile);
    video.muted = true;
    video.playsInline = true;
    video.currentTime = 1; // Capture at 1s

    video.onloadeddata = () => {
      // Seek handled by currentTime setting above, wait for seeked
    };

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 320; // Low res for AI analysis is fine
      canvas.height = 180;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      } else {
        reject("Could not create canvas context");
      }
      URL.revokeObjectURL(video.src);
    };

    video.onerror = (e) => {
        reject(e);
        URL.revokeObjectURL(video.src);
    };
  });
};

interface RenderResult {
  blob: Blob;
  extension: string;
}

export const renderGridVideo = async (
  videos: (QueuedVideo | null)[],
  config: GridConfig,
  onProgress: (percent: number) => void
): Promise<RenderResult> => {
  return new Promise(async (resolve, reject) => {
    // 1. Setup Canvas
    const canvas = document.createElement("canvas");
    canvas.width = config.width;
    canvas.height = config.height;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return reject(new Error("Failed to get 2D context"));
    }

    // 2. Setup Audio Context
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const dest = audioCtx.createMediaStreamDestination();

    // 3. Prepare Video Elements
    const videoElements: HTMLVideoElement[] = [];
    const loadPromises = videos.map((vItem, index) => {
      return new Promise<void>((resolveLoad, rejectLoad) => {
        if (!vItem) {
          videoElements.push(null as any); // Placeholder
          return resolveLoad();
        }

        const vid = document.createElement("video");
        vid.crossOrigin = "anonymous";
        vid.src = vItem.url;
        vid.muted = false; // We handle audio via AudioContext, but need internal muted false to get source
        vid.volume = 1; 

        // Important: MediaElementSource requires the video to play, but we don't want to hear it twice.
        // We connect it to dest, not destination (speakers).

        vid.onloadedmetadata = () => {
          resolveLoad();
        };
        vid.onerror = (e) => rejectLoad(e);
        
        videoElements.push(vid);
      });
    });

    try {
      await Promise.all(loadPromises);
    } catch (e) {
      return reject(new Error("Failed to load video metadata"));
    }

    // Connect Audio
    videoElements.forEach((vid) => {
      if (vid && config.includeAudio) {
        const source = audioCtx.createMediaElementSource(vid);
        // Add gain node for volume control if needed
        const gain = audioCtx.createGain();
        gain.gain.value = 0.5; // Lower volume to prevent clipping when mixing 4
        source.connect(gain);
        gain.connect(dest);
      }
    });

    // 4. Setup Recorder
    const canvasStream = canvas.captureStream(30); // 30 FPS
    
    // Merge Audio Track if exists
    const audioTracks = dest.stream.getAudioTracks();
    const combinedTracks = [...canvasStream.getVideoTracks(), ...audioTracks];
    const combinedStream = new MediaStream(combinedTracks);

    /**
     * MIME TYPE SELECTION FOR X (TWITTER) COMPATIBILITY:
     * 1. Priority: MP4 with AAC (avc1 + mp4a.40.2). Most standard, but often not supported by Chrome MediaRecorder.
     * 2. Fallback: WebM (VP9 + Opus). X supports WebM uploads well. 
     * 3. Avoid: Generic "video/mp4" in Chrome often results in H.264 + Opus, which X rejects as "Incompatible Audio".
     */
    const mimeCandidates = [
      { mime: 'video/mp4;codecs="avc1.424028,mp4a.40.2"', ext: 'mp4' }, // Accurate MP4
      { mime: 'video/mp4;codecs="avc1.42E01E,mp4a.40.2"', ext: 'mp4' }, // Accurate MP4 Profile 2
      { mime: 'video/webm;codecs=vp9,opus', ext: 'webm' }, // High quality WebM
      { mime: 'video/webm;codecs=vp8,opus', ext: 'webm' }, // Standard WebM
      { mime: 'video/webm', ext: 'webm' }, // Generic WebM
      { mime: 'video/mp4', ext: 'mp4' }, // Generic MP4 (Last resort, likely Opus audio)
    ];

    let selectedMime = mimeCandidates[mimeCandidates.length - 1]; // Default fallback

    for (const candidate of mimeCandidates) {
      if (MediaRecorder.isTypeSupported(candidate.mime)) {
        selectedMime = candidate;
        break;
      }
    }

    console.log(`Using MIME: ${selectedMime.mime}, Extension: ${selectedMime.ext}`);

    // Adjust bitrate based on resolution
    const is4K = config.width >= 3840;
    const bitrate = is4K ? 25000000 : 8000000; // 25Mbps for 4K, 8Mbps for 1080p

    const recorder = new MediaRecorder(combinedStream, {
      mimeType: selectedMime.mime,
      videoBitsPerSecond: bitrate,
    });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: selectedMime.mime });
      // Cleanup
      videoElements.forEach(v => {
        if(v) {
            v.pause();
            v.src = "";
            v.remove();
        }
      });
      audioCtx.close();
      resolve({ blob, extension: selectedMime.ext });
    };

    // 5. Playback & Draw Loop
    // Find max duration to stop
    let maxDuration = 0;
    videoElements.forEach(v => {
      if(v && v.duration > maxDuration) maxDuration = v.duration;
    });
    
    if (maxDuration === 0) maxDuration = 10; // Fallback

    const startTime = Date.now();
    let animationFrameId: number;

    const draw = () => {
      ctx.fillStyle = config.backgroundColor;
      ctx.fillRect(0, 0, config.width, config.height);

      const cellW = (config.width / 2);
      const cellH = (config.height / 2);

      // Grid Positions
      const positions = [
        { x: 0, y: 0 },         // Top Left
        { x: cellW, y: 0 },     // Top Right
        { x: 0, y: cellH },     // Bottom Left
        { x: cellW, y: cellH }  // Bottom Right
      ];

      let allEnded = true;

      videoElements.forEach((vid, idx) => {
        if (vid) {
          if (!vid.ended) allEnded = false;
          
          // Draw video covering the cell (center crop)
          const aspectVideo = vid.videoWidth / vid.videoHeight;
          const aspectCell = cellW / cellH;
          
          let renderW, renderH, offsetX, offsetY;

          if (aspectVideo > aspectCell) {
             // Video is wider than cell
             renderH = cellH;
             renderW = cellH * aspectVideo;
             offsetX = positions[idx].x - (renderW - cellW) / 2;
             offsetY = positions[idx].y;
          } else {
             // Video is taller than cell
             renderW = cellW;
             renderH = cellW / aspectVideo;
             offsetX = positions[idx].x;
             offsetY = positions[idx].y - (renderH - cellH) / 2;
          }

          // Clip to cell area
          ctx.save();
          ctx.beginPath();
          ctx.rect(positions[idx].x, positions[idx].y, cellW, cellH);
          ctx.clip();
          
          ctx.drawImage(vid, offsetX, offsetY, renderW, renderH);
          ctx.restore();
        }
      });

      // Progress Update
      const elapsed = (Date.now() - startTime) / 1000;
      const progress = Math.min((elapsed / maxDuration) * 100, 100);
      onProgress(progress);

      if (allEnded || elapsed >= maxDuration) {
        recorder.stop();
        cancelAnimationFrame(animationFrameId);
      } else {
        animationFrameId = requestAnimationFrame(draw);
      }
    };

    // Start Everything
    recorder.start();
    const playPromises = videoElements.map(v => v ? v.play() : Promise.resolve());
    await Promise.all(playPromises);
    draw();
  });
};
