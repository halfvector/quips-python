(function (App) {
    'use strict';

    App.AudioCapture = function AudioCapture() {

        var _audioContext,
            _audioInput,
            _encodingWorker,
            _isRecording = false,
            _audioListener,
            _onCaptureCompleteCallback,
            _audioAnalyzer,
            _audioGain,
            _cachedMediaStream = null
            ;

        var _audioEncoder,
            _latestAudioBuffer = [],
            _cachedGainValue = 1,
            _onStartedCallback = null
            ;

        var _fftSize = 256;
        var _fftSmoothing = 0.8;

        // spawn background worker
        _encodingWorker = new Worker("/assets/js/worker-encoder.min.js");

        // TODO: firefox's built-in ogg-creation route
        // Firefox 27's manual recording doesn't work. something funny with their sampling rates or buffer sizes
        // the data is fairly garbled, like they are serving 22khz as 44khz or something like that
        function startAutomaticEncoding(mediaStream) {
            _audioEncoder = new MediaRecorder(mediaStream);

            _audioEncoder.ondataavailable = function (e) {
                console.log("AudioCapture::startManualEncoding(); MediaRecorder.ondataavailable(); new blob: size=" + e.data.size + " type=" + e.data.type);
                _latestAudioBuffer.push(e.data);
            };

            _audioEncoder.onstop = function () {
                console.log("AudioCapture::startManualEncoding(); MediaRecorder.onstop(); hit");

                // send the last captured audio buffer
                var encoded_blob = new Blob(_latestAudioBuffer, {type: 'audio/ogg'});

                console.log("AudioCapture::startManualEncoding(); MediaRecorder.onstop(); got encoded blob: size=" + encoded_blob.size + " type=" + encoded_blob.type);

                if (_onCaptureCompleteCallback)
                    _onCaptureCompleteCallback(encoded_blob);
            };

            console.log("AudioCapture::startManualEncoding(); MediaRecorder.start()");
            _audioEncoder.start(0);
        }

        function startManualEncoding(mediaStream) {

            if (!_audioContext) {

                // build capture graph
                var AudioContextCreator = window.webkitAudioContext || window.AudioContext;

                _audioContext = new AudioContextCreator();
                _audioInput = _audioContext.createMediaStreamSource(mediaStream);

                console.log("AudioCapture::startManualEncoding(); _audioContext.sampleRate: " + _audioContext.sampleRate + " Hz");

                // create a listener node to grab microphone samples and feed it to our background worker
                _audioListener = (_audioContext.createScriptProcessor || _audioContext.createJavaScriptNode).call(_audioContext, 8192, 2, 2);

                _audioGain = _audioContext.createGain();
                _audioGain.gain.value = _cachedGainValue;

                _audioAnalyzer = _audioContext.createAnalyser();
                _audioAnalyzer.fftSize = _fftSize;
                _audioAnalyzer.smoothingTimeConstant = _fftSmoothing;
            }

            if (!_encodingWorker)
                _encodingWorker = new Worker("/assets/js/worker-encoder.min.js");

            // re-hook audio listener node every time we start, because _encodingWorker reference will change
            _audioListener.onaudioprocess = function (e) {
                if (!_isRecording) return;

                var msg = {
                    action: "process",

                    // two Float32Arrays
                    left: e.inputBuffer.getChannelData(0),
                    right: e.inputBuffer.getChannelData(1)
                };

                _encodingWorker.postMessage(msg);
            };

            // handle messages from the encoding-worker
            _encodingWorker.onmessage = function workerMessageHandler(e) {

                // worker finished and has the final encoded audio buffer for us
                if (e.data.action === "encoded") {
                    var encoded_blob = new Blob([e.data.buffer], {type: 'audio/ogg'});

                    console.log("got encoded blob: size=" + encoded_blob.size + " type=" + encoded_blob.type);

                    if (_onCaptureCompleteCallback)
                        _onCaptureCompleteCallback(encoded_blob);

                    // worker has exited, unreference it
                    _encodingWorker = null;
                }
            };

            // configure worker with a sampling rate and buffer-size
            _encodingWorker.postMessage({action: "initialize", sample_rate: _audioContext.sampleRate, buffer_size: _audioListener.bufferSize });

            // TODO: it might be better to listen for a message back from the background worker before considering that recording has began
            // it's easier to trim audio than capture a missing word at the start of a sentence
            _isRecording = false;

            // connect audio nodes
            // audio-input -> gain -> fft-analyzer -> PCM-data capture -> destination

            console.log("AudioCapture::startManualEncoding(); Connecting Audio Nodes..");

            console.log("input->gain");
            _audioInput.connect(_audioGain);
            console.log("gain->analyzer");
            _audioGain.connect(_audioAnalyzer);
            console.log("analyzer->listesner");
            _audioAnalyzer.connect(_audioListener);
            console.log("listener->destination");
            _audioListener.connect(_audioContext.destination);

            return true;
        }

        function shutdownManualEncoding() {
            console.log("AudioCapture::shutdownManualEncoding(); Tearing down AudioAPI connections..");

            console.log("listener->destination");
            _audioListener.disconnect(_audioContext.destination);
            console.log("analyzer->listesner");
            _audioAnalyzer.disconnect(_audioListener);
            console.log("gain->analyzer");
            _audioGain.disconnect(_audioAnalyzer);
            console.log("input->gain");
            _audioInput.disconnect(_audioGain);
        }

        /**
         * The microphone may be live, but it isn't recording. This toggles the actual writing to the capture stream.
         * captureAudioSamples bool indicates whether to record from mic
         */
        this.toggleMicrophoneRecording = function (captureAudioSamples) {
            _isRecording = captureAudioSamples;
        };

        // called when user allows us use of their microphone
        function onMicrophoneProvided(mediaStream) {

            _cachedMediaStream = mediaStream;

            // we could check if the browser can perform its own encoding and use that
            // Firefox can provide us ogg+speex or ogg+opus? files, but unfortunately that codec isn't supported widely enough
            // so instead we perform manual encoding everywhere right now to get us ogg+vorbis
            // though one day, i want ogg+opus! opus has a wonderful range of quality settings perfect for this project

            if (false && typeof(MediaRecorder) !== "undefined") {
                startAutomaticEncoding(mediaStream);
            } else {
                // no media recorder available, do it manually
                startManualEncoding(mediaStream);
            }

            // TODO: might be a good time to start a spectral analyzer
            if (_onStartedCallback)
                _onStartedCallback();
        }

        this.setGain = function (gain) {
            if (_audioGain)
                _audioGain.gain.value = gain;
            _cachedGainValue = gain;
        };
        
        this.preloadMediaStream = function() {
            if (_cachedMediaStream)
                return;

            var getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

            // request microphone access
            // on HTTPS permissions get saved and this will be fast
            getUserMedia.call(navigator, { audio: true }, function(mediaStream) {
                _cachedMediaStream = mediaStream;
            }, function (err) {
                console.log("AudioCapture::start(); could not grab microphone. perhaps user didn't give us permission?");
            });
        };

        this.start = function (onStartedCallback) {

            _onStartedCallback = onStartedCallback;

            if (_cachedMediaStream)
                return onMicrophoneProvided(_cachedMediaStream);

            var getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

            // request microphone access
            // on HTTPS permissions get saved and this will be fast
            getUserMedia.call(navigator, { audio: true }, onMicrophoneProvided, function (err) {
                console.log("AudioCapture::start(); could not grab microphone. perhaps user didn't give us permission?");
            });

            return true;
        };

        this.stop = function (captureCompleteCallback) {
            _onCaptureCompleteCallback = captureCompleteCallback;
            _isRecording = false;

            if (_audioContext) {
                // stop the manual encoder
                _encodingWorker.postMessage({action: "finish"});
                shutdownManualEncoding();
            }

            if (_audioEncoder) {
                // stop the automatic encoder

                if (_audioEncoder.state !== 'recording') {
                    console.warn("AudioCapture::stop(); _audioEncoder.state != 'recording'");
                }

                _audioEncoder.requestData();
                _audioEncoder.stop();
            }

            // TODO: stop any active spectral analysis
        };
    };

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
})(App);