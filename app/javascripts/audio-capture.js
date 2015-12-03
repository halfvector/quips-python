import _ from 'underscore'

class WavAudioEncoder {

    setString(view, offset, str) {
        var len = str.length;
        for (var i = 0; i < len; ++i)
            view.setUint8(offset + i, str.charCodeAt(i));
    }

    constructor(sampleRate, numChannels) {
        this.sampleRate = sampleRate;
        this.numChannels = numChannels;
        this.numSamples = 0;
        this.dataViews = [];
    }

    encode(buffers) {

        buffers.forEach(buffer => {
            var len = buffer.length,
                nCh = this.numChannels,
                view = new DataView(new ArrayBuffer(len * nCh * 2)),
                offset = 0;

            for (var i = 0; i < len; ++i) {
                var x = buffer[i] * 0x7fff;
                view.setInt16(offset, x < 0 ? Math.max(x, -0x8000) : Math.min(x, 0x7fff), true);
                offset += 2;
            }
            this.dataViews.push(view);
            this.numSamples += len;
        });
    }

    finish(mimeType) {
        var dataSize = this.numChannels * this.numSamples * 2,
            view = new DataView(new ArrayBuffer(44));
        this.setString(view, 0, 'RIFF');
        view.setUint32(4, 36 + dataSize, true);
        this.setString(view, 8, 'WAVE');
        this.setString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, this.numChannels, true);
        view.setUint32(24, this.sampleRate, true);
        view.setUint32(28, this.sampleRate * 4, true);
        view.setUint16(32, this.numChannels * 2, true);
        view.setUint16(34, 16, true);
        this.setString(view, 36, 'data');
        view.setUint32(40, dataSize, true);
        this.dataViews.unshift(view);
        console.log("data views", this.dataViews);
        var blob = new Blob(this.dataViews, {type: 'audio/wav'});
        this.cleanup();
        return blob;
    }

    cancel() {
        delete this.dataViews;
    }

    cleanup() {
        delete this.dataViews;
    }
}

export class AudioCapture {
    constructor() {
        // spawn background worker
        //this._encodingWorker = new Worker("/assets/js/worker-encoder.min.js");

        console.log("Initialized AudioCapture");

        _.extend(this, {
            _audioContext: null,
            _audioInput: null,
            _encodingWorker: null,
            _isRecording: false,
            _audioListener: null,
            _onCaptureCompleteCallback: null,
            _audioAnalyzer: null,
            _audioGain: null,
            _cachedMediaStream: null,

            _audioEncoder: null,
            _latestAudioBuffer: [],
            _cachedGainValue: 10,

            _fftSize: 256,
            _fftSmoothing: 0.8,
            _totalNumSamples: 0,
            _localBuffer: null,
            _localBufferSize: 0,
            _bufferArray: [],
            _encoder: new WavAudioEncoder(48000, 1)
        });

        this._localBuffer = new Float32Array(48000 * 10);

        this.polyfill();
    }

    // TODO: firefox's built-in ogg-creation route
    // Firefox 27's manual recording doesn't work. something funny with their sampling rates or buffer sizes
    // the data is fairly garbled, like they are serving 22khz as 44khz or something like that
    startAutomaticEncoding(mediaStream) {
        this._audioEncoder = new MediaRecorder(mediaStream);

        this._audioEncoder.ondataavailable = function (e) {
            console.log("AudioCapture::startAutomaticEncoding(); MediaRecorder.ondataavailable(); new blob: size=" + e.data.size + " type=" + e.data.type);
            this._latestAudioBuffer.push(e.data);
        };

        this._audioEncoder.onstop = function () {
            console.log("AudioCapture::startAutomaticEncoding(); MediaRecorder.onstop(); hit");

            // send the last captured audio buffer
            var encoded_blob = new Blob(this._latestAudioBuffer, {type: 'audio/ogg'});

            console.log("AudioCapture::startAutomaticEncoding(); MediaRecorder.onstop(); got encoded blob: size=" + encoded_blob.size + " type=" + encoded_blob.type);

            if (this._onCaptureCompleteCallback)
                this._onCaptureCompleteCallback(encoded_blob);
        };

        console.log("AudioCapture::startAutomaticEncoding(); MediaRecorder.start()");
        this._audioEncoder.start(0);
    }

    compressAudio(data) {
        this.audioContextOffline = new OfflineAudioContext(1, 48000 * 30, 48000);

        var source = this.audioContextOffline.createBufferSource();
        var audioBuffer = this.audioContextOffline.createBuffer(1, e.data.buffer.length, 44100);
        audioBuffer.getChannelData(0).set(e.data.buffer);

        source.buffer = audioBuffer;
        source.connect(this.audioContextOffline.destination);
        source.start();

        this._audioListener.onaudioprocess = (e) => {
            if (!this._isRecording) return;

            this._encoder.encode([e.inputBuffer.getChannelData(0)]);

            this._totalNumSamples += msg.left.length;
        };
    }

    createAudioContext(mediaStream) {
        // build capture graph
        this._audioContext = new window.AudioContext();
        this._audioInput = this._audioContext.createMediaStreamSource(mediaStream);
        //this._audioDestination = this._audioContext.createMediaStreamDestination();

        //this._audioOfflineContext = new OfflineAudioContext(1, 48000 * 30, 48000);
        this._audioDestination = this._audioContext.destination;

        console.log("AudioCapture::startManualEncoding(); _audioContext.sampleRate: " + this._audioContext.sampleRate + " Hz");

        // create a listener node to grab microphone samples and feed it to our background worker
        this._audioListener = this._audioContext.createScriptProcessor(16384, 1, 1);

        console.log("this._cachedGainValue = " + this._cachedGainValue);

        this._audioGain = this._audioContext.createGain();
        this._audioGain.gain.value = this._cachedGainValue;

        //this._audioAnalyzer = this._audioContext.createAnalyser();
        //this._audioAnalyzer.fftSize = this._fftSize;
        //this._audioAnalyzer.smoothingTimeConstant = this._fftSmoothing;
    }

    startManualEncoding(mediaStream) {

        if (!this._audioContext) {
            this.createAudioContext(mediaStream);
        }

        //if (!this._encodingWorker)
        //    this._encodingWorker = new Worker("/assets/js/worker-encoder.min.js");

        // re-hook audio listener node every time we start, because _encodingWorker reference will change
        this._audioListener.onaudioprocess = (e) => {
            if (!this._isRecording) return;

            //this._encoder.encode([e.inputBuffer.getChannelData(0)]);

            var src = e.inputBuffer.getChannelData(0);
            //var src2 = e.inputBuffer.getChannelData(1);
            var buf = new Float32Array(src.length);

            //console.log("frames=" + src.length + " duration=" + e.inputBuffer.duration + " channels=" + e.inputBuffer.numberOfChannels);

            e.inputBuffer.copyFromChannel(buf, 0, 0);

            //for (var i = 0; i < src.length; i++) {
            //    this._localBuffer[this._localBufferSize++] = src[i];
            //    //buf[i] = src[i];
            //    //buf[i] = Math.sin(400 * i / buf.length);
            //}

            //for (var i = 0; i < buf.length; i++) {
            //    buf[i] += Math.sin(440 * i / buf.length) / 3.0;
            //}

            //for (var i = 0; i < buf.length; i++) {
            //    buf[i] = src[i];
            //}

            this._bufferArray.push(buf);

            //for (var i = 0; i < buf.length; i++) {
            //    this._localBuffer[this._localBufferSize++] = buf[i];
            //}

            //this._totalNumSamples += msg.left.length;
        };

        // TODO: it might be better to listen for a message back from the background worker before considering that recording has began
        // it's easier to trim audio than capture a missing word at the start of a sentence
        this._isRecording = false;

        // connect audio nodes
        // audio-input -> gain -> fft-analyzer -> PCM-data capture -> destination

        console.log("AudioCapture::startManualEncoding(); Connecting Audio Nodes..");

        console.log("connecting: input->gain");
        //this._audioInput.connect(this._audioGain);
        //console.log("connecting: gain->analyzer");
        //this._audioGain.connect(this._audioAnalyzer);
        //console.log("connecting: analyzer->listesner");
        //this._audioAnalyzer.connect(this._audioListener);
        // connect gain directly into listener, bypassing analyzer
        console.log("connecting: gain->listener");
        this._audioInput.connect(this._audioListener);
        console.log("connecting: listener->destination");
        this._audioListener.connect(this._audioDestination);

        return true;
    }

    shutdownManualEncoding() {
        console.log("AudioCapture::shutdownManualEncoding(); Tearing down AudioAPI connections..");

        console.log("disconnecting: listener->destination");
        this._audioListener.disconnect(this._audioDestination);
        //console.log("disconnecting: analyzer->listesner");
        //this._audioAnalyzer.disconnect(this._audioListener);
        //console.log("disconnecting: gain->analyzer");
        //this._audioGain.disconnect(this._audioAnalyzer);
        console.log("disconnecting: gain->listener");
        this._audioInput.disconnect(this._audioListener);
        console.log("disconnecting: input->gain");
        //this._audioInput.disconnect(this._audioGain);
    }

    /**
     * The microphone may be live, but it isn't recording. This toggles the actual writing to the capture stream.
     * captureAudioSamples bool indicates whether to record from mic
     */
    toggleMicrophoneRecording(captureAudioSamples) {
        this._isRecording = captureAudioSamples;
    }

    // called when user allows us use of their microphone
    onMicrophoneProvided(mediaStream, onStartedCallback) {

        this._cachedMediaStream = mediaStream;

        console.log("mediaStream.getAudioTracks", mediaStream.getAudioTracks());

        // we could check if the browser can perform its own encoding and use that
        // Firefox can provide us ogg+speex or ogg+opus? files, but unfortunately that codec isn't supported widely enough
        // so instead we perform manual encoding everywhere right now to get us ogg+vorbis
        // though one day, i want ogg+opus! opus has a wonderful range of quality settings perfect for this project

        //if (false && typeof(MediaRecorder) !== "undefined") {
        //    this.startAutomaticEncoding(mediaStream);
        //} else {
        //    // no media recorder available, do it manually
        //    this.startManualEncoding(mediaStream);
        //}

        this.startManualEncoding(mediaStream);

        // TODO: might be a good time to start a spectral analyzer
        if (onStartedCallback)
            onStartedCallback();
    }

    setGain(gain) {
        if (this._audioGain)
            this._audioGain.gain.value = gain;

        console.log("setting gain: " + gain);
        this._cachedGainValue = gain;
    }

    polyfill() {
        window.AudioContext = window.AudioContext || window.webkitAudioContext || false;

        console.log("navigator ", navigator);
        console.log("navigator.mediaDevice = ", navigator.mediaDevice);

        if (navigator.mediaDevice == null) {
            console.log("polyfilling mediaDevice.getUserMedia");
            navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia || false;
            navigator.mediaDevice = {
                getUserMedia: (props) => new Promise((y, n) => navigator.getUserMedia(props, y, n))
            }
        }

        if (!navigator.getUserMedia) {
            console.error("AudioCapture::polyfill(); getUserMedia() not supported.");
            return false;
        }
    }

    preloadMediaStream() {
        if (this._cachedMediaStream)
            return;

        navigator.mediaDevice.getUserMedia({audio: true, video: false, stereo: false,
            googEchoCancellation: false, googNoiseSuppression: false, googNoiseReduction: false, googTypingNoiseDetection: false,
            googAudioMirroring: false, googAutoGainControl2: false, googEchoCancellation2: false, googAutoGainControl: false, googLeakyBucket: false
        })
            .then((ms) => {
                this._cachedMediaStream = ms;
            })
            .catch((err) => {
                console.warn("AudioCapture::preloadMediaStream(); could not grab microphone. perhaps user didn't give us permission?", err);
            })
    };

    start(onStartedCallback) {
        if (this._cachedMediaStream)
            return this.onMicrophoneProvided(this._cachedMediaStream, onStartedCallback);

        navigator.mediaDevice.getUserMedia({audio: true})
            .then((ms) => this.onMicrophoneProvided(ms, onStartedCallback))
            .catch((err) => {
                console.warn("AudioCapture::start(); could not grab microphone. perhaps user didn't give us permission?", err);
            })

        return true;
    }

    stop(captureCompleteCallback) {
        this._onCaptureCompleteCallback = captureCompleteCallback;
        this._isRecording = false;

        if (this._audioContext) {
            // stop the manual encoder
            //this._encodingWorker.postMessage({action: "finish"});
            this.shutdownManualEncoding();
        }

        if (this._audioEncoder) {
            // stop the automatic encoder

            if (this._audioEncoder.state !== 'recording') {
                console.warn("AudioCapture::stop(); _audioEncoder.state != 'recording'");
            }

            this._audioEncoder.requestData();
            this._audioEncoder.stop();
        }

        console.log("_bufferArray = " + this._bufferArray.length);

        //var bufs = [];
        //
        //for( var a = 0; a < 5; a++) {
        //    var buf = new Float32Array(44100);
        //
        //    for (var i = 0; i < buf.length; i++) {
        //        var second = (i / buf.length);
        //        buf[i] = Math.sin(2.0 * Math.PI * 440 * second);
        //    }
        //
        //    bufs.push(buf);
        //}

        this._encoder = new WavAudioEncoder(48000, 1);

        this._encoder.encode(this._bufferArray);

        var encoded_blob = this._encoder.finish("audio/wav");

        if (this._onCaptureCompleteCallback)
            this._onCaptureCompleteCallback(encoded_blob);

        // TODO: stop any active spectral analysis
    };
}

// unused at the moment
function Analyzer() {

    var _audioCanvasAnimationId,
        _audioSpectrumCanvas
        ;

    this.startAnalyzerUpdates = function () {
        updateAnalyzer();
    };

    this.stopAnalyzerUpdates = function () {
        if (!_audioCanvasAnimationId)
            return;

        window.cancelAnimationFrame(_audioCanvasAnimationId);
        _audioCanvasAnimationId = null;
    };

    function updateAnalyzer() {

        if (!_audioSpectrumCanvas)
            _audioSpectrumCanvas = document.getElementById("recording-visualizer").getContext("2d");

        var freqData = new Uint8Array(_audioAnalyzer.frequencyBinCount);
        _audioAnalyzer.getByteFrequencyData(freqData);

        var numBars = _audioAnalyzer.frequencyBinCount;
        var barWidth = Math.floor(_canvasWidth / numBars) - _fftBarSpacing;


        _audioSpectrumCanvas.globalCompositeOperation = "source-over";

        _audioSpectrumCanvas.clearRect(0, 0, _canvasWidth, _canvasHeight);
        _audioSpectrumCanvas.fillStyle = '#f6d565';
        _audioSpectrumCanvas.lineCap = 'round';

        var x, y, w, h;

        for (var i = 0; i < numBars; i++) {
            var value = freqData[i];
            var scaled_value = (value / 256) * _canvasHeight;

            x = i * (barWidth + _fftBarSpacing);
            y = _canvasHeight - scaled_value;
            w = barWidth;
            h = scaled_value;

            var gradient = _audioSpectrumCanvas.createLinearGradient(x, _canvasHeight, x, y);
            gradient.addColorStop(1.0, "rgba(0,0,0,1.0)");
            gradient.addColorStop(0.0, "rgba(0,0,0,1.0)");

            _audioSpectrumCanvas.fillStyle = gradient;
            _audioSpectrumCanvas.fillRect(x, y, w, h);

            if (scaled_value > _hitHeights[i]) {
                _hitVelocities[i] += (scaled_value - _hitHeights[i]) * 6;
                _hitHeights[i] = scaled_value;
            } else {
                _hitVelocities[i] -= 4;
            }

            _hitHeights[i] += _hitVelocities[i] * 0.016;

            if (_hitHeights[i] < 0)
                _hitHeights[i] = 0;
        }

        _audioSpectrumCanvas.globalCompositeOperation = "source-atop";
        _audioSpectrumCanvas.drawImage(_canvasBg, 0, 0);

        _audioSpectrumCanvas.globalCompositeOperation = "source-over";
        _audioSpectrumCanvas.fillStyle = "rgba(255,255,255,0.7)";

        for (i = 0; i < numBars; i++) {
            x = i * (barWidth + _fftBarSpacing);
            y = _canvasHeight - Math.round(_hitHeights[i]) - 2;
            w = barWidth;
            h = barWidth;

            if (_hitHeights[i] === 0)
                continue;

            //_audioSpectrumCanvas.fillStyle = "rgba(255, 255, 255,"+ Math.max(0, 1 - Math.abs(_hitVelocities[i]/150)) + ")";
            _audioSpectrumCanvas.fillRect(x, y, w, h);
        }

        _audioCanvasAnimationId = window.requestAnimationFrame(updateAnalyzer);
    }

    var _canvasWidth, _canvasHeight;
    var _fftSize = 256;
    var _fftSmoothing = 0.8;
    var _fftBarSpacing = 1;

    var _hitHeights = [];
    var _hitVelocities = [];

    this.testCanvas = function () {

        var canvasContainer = document.getElementById("recording-visualizer");

        _canvasWidth = canvasContainer.width;
        _canvasHeight = canvasContainer.height;

        _audioSpectrumCanvas = canvasContainer.getContext("2d");
        _audioSpectrumCanvas.globalCompositeOperation = "source-over";
        _audioSpectrumCanvas.fillStyle = "rgba(0,0,0,0)";
        _audioSpectrumCanvas.fillRect(0, 0, _canvasWidth, _canvasHeight);

        var numBars = _fftSize / 2;
        var barSpacing = _fftBarSpacing;
        var barWidth = Math.floor(_canvasWidth / numBars) - barSpacing;

        var x, y, w, h, i;

        for (i = 0; i < numBars; i++) {
            _hitHeights[i] = _canvasHeight - 1;
            _hitVelocities[i] = 0;
        }

        for (i = 0; i < numBars; i++) {
            var scaled_value = Math.abs(Math.sin(Math.PI * 6 * (i / numBars))) * _canvasHeight;

            x = i * (barWidth + barSpacing);
            y = _canvasHeight - scaled_value;
            w = barWidth;
            h = scaled_value;

            var gradient = _audioSpectrumCanvas.createLinearGradient(x, _canvasHeight, x, y);
            gradient.addColorStop(1.0, "rgba(0,0,0,0.0)");
            gradient.addColorStop(0.0, "rgba(0,0,0,1.0)");

            _audioSpectrumCanvas.fillStyle = gradient;
            _audioSpectrumCanvas.fillRect(x, y, w, h);
        }

        _audioSpectrumCanvas.globalCompositeOperation = "source-atop";
        _audioSpectrumCanvas.drawImage(_canvasBg, 0, 0);

        _audioSpectrumCanvas.globalCompositeOperation = "source-over";
        _audioSpectrumCanvas.fillStyle = "#ffffff";

        for (i = 0; i < numBars; i++) {
            x = i * (barWidth + barSpacing);
            y = _canvasHeight - _hitHeights[i];
            w = barWidth;
            h = 2;

            _audioSpectrumCanvas.fillRect(x, y, w, h);
        }
    };

    var _scope = this;

    var _canvasBg = new Image();
    _canvasBg.onload = function () {
        _scope.testCanvas();
    };
    //_canvasBg.src = "/img/bg5s.jpg";
    _canvasBg.src = "/img/bg6-wide.jpg";
}
