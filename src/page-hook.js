(function () {
  if (!navigator.mediaDevices?.getUserMedia || window.__astralInstalled) return;
  window.__astralInstalled = true;

  const initialSettings = {
    enabled: true,
    gain: 1,
    distortion: 0,
    square: 0,
    tube: 0,
    bass: 0,
    mid: 0,
    treble: 0,
    echo: 0,
    reverb: 0,
    bitcrush: false,
    stereoMotion: false
  };

  let settings = { ...initialSettings };
  let audioContext;
  let graph;

  const makeDistortionCurve = (amount) => {
    if (!amount) return null;
    const samples = 44100;
    const curve = new Float32Array(samples);
    const k = amount / 100 * 18;
    for (let index = 0; index < samples; index += 1) {
      const x = index * 2 / samples - 1;
      curve[index] = ((3 + k) * x * 20 * Math.PI / 180) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  };

  const makeSquareCurve = (amount) => {
    if (!amount) return null;
    const samples = 44100;
    const curve = new Float32Array(samples);
    const threshold = Math.max(0.03, 1 - amount / 100);
    for (let index = 0; index < samples; index += 1) {
      const x = index * 2 / samples - 1;
      curve[index] = x > threshold ? 1 : x < -threshold ? -1 : x / threshold;
    }
    return curve;
  };

  const makeTubeCurve = (amount) => {
    if (!amount) return null;
    const samples = 44100;
    const curve = new Float32Array(samples);
    const drive = 1 + amount / 100 * 4;
    for (let index = 0; index < samples; index += 1) {
      const x = index * 2 / samples - 1;
      curve[index] = Math.tanh(x * drive) / Math.tanh(drive);
    }
    return curve;
  };

  const makeBitcrusherCurve = () => {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const steps = 16;
    for (let index = 0; index < samples; index += 1) {
      const x = index * 2 / samples - 1;
      curve[index] = Math.round(x * steps) / steps;
    }
    return curve;
  };

  const makeImpulse = (context, duration, decay) => {
    const length = Math.floor(context.sampleRate * duration);
    const impulse = context.createBuffer(2, length, context.sampleRate);
    for (let channel = 0; channel < 2; channel += 1) {
      const data = impulse.getChannelData(channel);
      for (let index = 0; index < length; index += 1) {
        data[index] = (Math.random() * 2 - 1) * Math.pow(1 - index / length, decay);
      }
    }
    return impulse;
  };

  const updateGraph = () => {
    if (!graph || !audioContext) return;
    const now = audioContext.currentTime;
    const active = settings.enabled;
    graph.master.gain.setTargetAtTime(active ? settings.gain : 1, now, 0.025);
    graph.tube.curve = active ? makeTubeCurve(settings.tube) : null;
    graph.crusher.curve = active && settings.bitcrush ? makeBitcrusherCurve() : null;
    graph.distortion.curve = active ? makeDistortionCurve(settings.distortion) : null;
    graph.square.curve = active ? makeSquareCurve(settings.square) : null;
    graph.bass.gain.setTargetAtTime(active ? settings.bass : 0, now, 0.025);
    graph.mid.gain.setTargetAtTime(active ? settings.mid : 0, now, 0.025);
    graph.treble.gain.setTargetAtTime(active ? settings.treble : 0, now, 0.025);
    graph.echoMix.gain.setTargetAtTime(active ? settings.echo / 100 : 0, now, 0.025);
    graph.echoFeedback.gain.setTargetAtTime(active ? settings.echo / 130 : 0, now, 0.025);
    graph.reverbMix.gain.setTargetAtTime(active ? settings.reverb / 100 : 0, now, 0.025);
    graph.dryMix.gain.setTargetAtTime(active ? 1 - settings.reverb / 220 : 1, now, 0.025);
    graph.motionDepth.gain.setTargetAtTime(active && settings.stereoMotion ? 0.58 : 0, now, 0.025);
  };

  const createGraph = (stream) => {
    audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    const destination = audioContext.createMediaStreamDestination();
    const tube = audioContext.createWaveShaper();
    const crusher = audioContext.createWaveShaper();
    const distortion = audioContext.createWaveShaper();
    const square = audioContext.createWaveShaper();
    const bass = audioContext.createBiquadFilter();
    const mid = audioContext.createBiquadFilter();
    const treble = audioContext.createBiquadFilter();
    const motion = audioContext.createStereoPanner();
    const motionOscillator = audioContext.createOscillator();
    const motionDepth = audioContext.createGain();
    const master = audioContext.createGain();
    const echoDelay = audioContext.createDelay(1);
    const echoFeedback = audioContext.createGain();
    const echoMix = audioContext.createGain();
    const convolver = audioContext.createConvolver();
    const reverbMix = audioContext.createGain();
    const dryMix = audioContext.createGain();

    bass.type = "lowshelf";
    bass.frequency.value = 220;
    mid.type = "peaking";
    mid.frequency.value = 1100;
    mid.Q.value = 0.9;
    treble.type = "highshelf";
    treble.frequency.value = 4200;
    echoDelay.delayTime.value = 0.23;
    convolver.buffer = makeImpulse(audioContext, 1.8, 2.2);
    motionOscillator.type = "sine";
    motionOscillator.frequency.value = 0.24;
    motionOscillator.connect(motionDepth);
    motionDepth.connect(motion.pan);
    motionOscillator.start();
    echoFeedback.gain.value = 0;
    echoMix.gain.value = 0;
    reverbMix.gain.value = 0;
    dryMix.gain.value = 1;

    source.connect(tube);
    tube.connect(crusher);
    crusher.connect(distortion);
    distortion.connect(square);
    square.connect(bass);
    bass.connect(mid);
    mid.connect(treble);
    treble.connect(motion);
    motion.connect(dryMix);
    motion.connect(echoDelay);
    echoDelay.connect(echoFeedback);
    echoFeedback.connect(echoDelay);
    echoDelay.connect(echoMix);
    motion.connect(convolver);
    convolver.connect(reverbMix);
    dryMix.connect(master);
    echoMix.connect(master);
    reverbMix.connect(master);
    master.connect(destination);

    graph = { tube, crusher, distortion, square, bass, mid, treble, motion, motionDepth, master, echoMix, echoFeedback, reverbMix, dryMix };
    updateGraph();
    return destination.stream;
  };

  const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);

  navigator.mediaDevices.getUserMedia = async (constraints) => {
    const stream = await originalGetUserMedia(constraints);
    if (!constraints?.audio) return stream;
    try {
      const processed = createGraph(stream);
      return new MediaStream([...processed.getAudioTracks(), ...stream.getVideoTracks()]);
    } catch {
      return stream;
    }
  };

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.data?.source !== "astral") return;
    if (event.data.type === "ASTRAL_SETTINGS") {
      settings = { ...settings, ...event.data.settings };
      updateGraph();
    }
  });
})();