import _ from 'underscore'

class AudioCapture {
    constructor(microphoneMediaStream) {
        // spawn background worker
        this._encodingWorker = new Worker("/assets/js/worker-encoder.min.js");

        console.log("Initialized AudioCapture");

        this._audioContext = null;
        this._audioInput = null;
        this._encodingWorker = null;
        this._isRecording = false;
        this._audioListener = null;
        this._onCaptureCompleteCallback = null;
        this._audioAnalyzer = null;
        this._audioGain = null;
        this._cachedMediaStream = microphoneMediaStream;

        this._audioEncoder = null;
        this._latestAudioBuffer = [];
        this._cachedGainValue = 1;
        this._onStartedCallback = null;

        this._fftSize = 256;
        this._fftSmoothing = 0.8;
        this._totalNumSamples = 0;


    }
    createAudioContext(mediaStream) {
        // build capture graph
        this._audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this._audioInput = this._audioContext.createMediaStreamSource(mediaStream);
        this._audioDestination = this._audioContext.createMediaStreamDestination();

        console.log("AudioCapture::startManualEncoding(); _audioContext.sampleRate: " + this._audioContext.sampleRate + " Hz");

        // create a listener node to grab microphone samples and feed it to our background worker
        this._audioListener = (this._audioContext.createScriptProcessor || this._audioContext.createJavaScriptNode).call(this._audioContext, 16384, 1, 1);

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

        if (!this._encodingWorker)
            this._encodingWorker = new Worker("/assets/js/worker-encoder.min.js");

        // re-hook audio listener node every time we start, because _encodingWorker reference will change
        this._audioListener.onaudioprocess = (e) => {
            if (!this._isRecording) return;

            var msg = {
                action: "process",

                // two Float32Arrays
                left: e.inputBuffer.getChannelData(0)
                //right: e.inputBuffer.getChannelData(1)
            };

            //var leftOut = e.outputBuffer.getChannelData(0);
            //for(var i = 0; i < msg.left.length; i++) {
            //    leftOut[i] = msg.left[i];
            //}

            this._totalNumSamples += msg.left.length;

            this._encodingWorker.postMessage(msg);
        };

        // handle messages from the encoding-worker
        this._encodingWorker.onmessage = (e) => {

            // worker finished and has the final encoded audio buffer for us
            if (e.data.action === "encoded") {
                var encoded_blob = new Blob([e.data.buffer], {type: 'audio/ogg'});

                console.log("e.data.buffer.buffer = " + e.data.buffer.buffer);
                console.log("e.data.buffer.byteLength = " + e.data.buffer.byteLength);
                console.log("sampleRate = " + this._audioContext.sampleRate);
                console.log("totalNumSamples = " + this._totalNumSamples);
                console.log("Duration of recording = " + (this._totalNumSamples / this._audioContext.sampleRate) + " seconds");

                console.log("got encoded blob: size=" + encoded_blob.size + " type=" + encoded_blob.type);

                if (this._onCaptureCompleteCallback)
                    this._onCaptureCompleteCallback(encoded_blob);

                // worker has exited, unreference it
                this._encodingWorker = null;
            }
        };

        // configure worker with a sampling rate and buffer-size
        this._encodingWorker.postMessage({
            action: "initialize",
            sample_rate: this._audioContext.sampleRate,
            buffer_size: this._audioListener.bufferSize
        });

        // TODO: it might be better to listen for a message back from the background worker before considering that recording has began
        // it's easier to trim audio than capture a missing word at the start of a sentence
        this._isRecording = false;

        // connect audio nodes
        // audio-input -> gain -> fft-analyzer -> PCM-data capture -> destination

        console.log("AudioCapture::startManualEncoding(); Connecting Audio Nodes..");

        console.log("connecting: input->gain");
        this._audioInput.connect(this._audioGain);
        //console.log("connecting: gain->analyzer");
        //this._audioGain.connect(this._audioAnalyzer);
        //console.log("connecting: analyzer->listesner");
        //this._audioAnalyzer.connect(this._audioListener);
        // connect gain directly into listener, bypassing analyzer
        console.log("connecting: gain->listener");
        this._audioGain.connect(this._audioListener);
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
        this._audioGain.disconnect(this._audioListener);
        console.log("disconnecting: input->gain");
        this._audioInput.disconnect(this._audioGain);
    }

    /**
     * The microphone may be live, but it isn't recording. This toggles the actual writing to the capture stream.
     * captureAudioSamples bool indicates whether to record from mic
     */
    toggleMicrophoneRecording(captureAudioSamples) {
        this._isRecording = captureAudioSamples;
    }

    setGain(gain) {
        if (this._audioGain)
            this._audioGain.gain.value = gain;

        console.log("setting gain: " + gain);
        this._cachedGainValue = gain;
    }

    start(onStartedCallback) {
        console.log("this._cachedMediaStream", this._cachedMediaStream);
        this.startManualEncoding(this._cachedMediaStream);

        // TODO: might be a good time to start a spectral analyzer

        if (onStartedCallback)
            onStartedCallback();
    }

    stop(captureCompleteCallback) {
        this._onCaptureCompleteCallback = captureCompleteCallback;
        this._isRecording = false;

        if (this._audioContext) {
            // stop the manual encoder
            this._encodingWorker.postMessage({action: "finish"});
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

        // TODO: stop any active spectral analysis
    };
}

/*
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
*/

export { AudioCapture }
