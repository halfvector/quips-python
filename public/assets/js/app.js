(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _backbone = require('backbone');

var _backbone2 = _interopRequireDefault(_backbone);

var _homepage = require('./homepage');

var _homepage2 = _interopRequireDefault(_homepage);

var _recordingControl = require('./recording-control');

var Application = function Application() {
    _classCallCheck(this, Application);

    _backbone2['default'].$ = $;
    _backbone2['default'].history.start();

    var view = new _homepage2['default']();
    view.render();

    var recorder = new _recordingControl.RecorderView({
        el: $('.m-recording-container'),
        model: new _recordingControl.Recorder({ recordingTime: -3 })
    });

    //// locate any controllers on the page and load their requirements
    //// this is a part of Angular i really liked, the custom directives
    //$('[backbone-controller]').each(function(el) {
    //
    //    var controllerName = $(el).attr('backbone-controller');
    //    if(controllerName in App.Loaders)
    //        App.Loaders[controllerName]();
    //    else
    //        console.error("Controller: '" + controllerName + "' not found");
    //});
};

$(function () {
    // setup raven to push messages to our sentry
    //Raven.config('https://d098712cb7064cf08b74d01b6f3be3da@app.getsentry.com/20973', {
    //    whitelistUrls: ['staging.couchpod.com', 'couchpod.com'] // production only
    //}).install();

    Raven.config('https://db2a7d58107c4975ae7de736a6308a1e@app.getsentry.com/53456', {
        whitelistUrls: ['staging.couchpod.com', 'couchpod.com'] // production only
    }).install();

    new Application();

    // for production, could wrap domReadyCallback and let raven handle any exceptions

    /*
    try {
        domReadyCallback();
    } catch(err) {
        Raven.captureException(err);
        console.log("[Error] Unhandled Exception was caught and sent via Raven:");
        console.dir(err);
    }
    */
});

exports['default'] = { Application: Application };
module.exports = exports['default'];

},{"./homepage":4,"./recording-control":6,"backbone":"backbone"}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var WavAudioEncoder = (function () {
    _createClass(WavAudioEncoder, [{
        key: 'setString',
        value: function setString(view, offset, str) {
            var len = str.length;
            for (var i = 0; i < len; ++i) view.setUint8(offset + i, str.charCodeAt(i));
        }
    }]);

    function WavAudioEncoder(sampleRate, numChannels) {
        _classCallCheck(this, WavAudioEncoder);

        this.sampleRate = sampleRate;
        this.numChannels = numChannels;
        this.numSamples = 0;
        this.dataViews = [];
    }

    _createClass(WavAudioEncoder, [{
        key: 'encode',
        value: function encode(buffers) {
            var _this = this;

            buffers.forEach(function (buffer) {
                var len = buffer.length,
                    nCh = _this.numChannels,
                    view = new DataView(new ArrayBuffer(len * nCh * 2)),
                    offset = 0;

                for (var i = 0; i < len; ++i) {
                    var x = buffer[i] * 0x7fff;
                    view.setInt16(offset, x < 0 ? Math.max(x, -0x8000) : Math.min(x, 0x7fff), true);
                    offset += 2;
                }
                _this.dataViews.push(view);
                _this.numSamples += len;
            });
        }
    }, {
        key: 'finish',
        value: function finish(mimeType) {
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
            var blob = new Blob(this.dataViews, { type: 'audio/wav' });
            this.cleanup();
            return blob;
        }
    }, {
        key: 'cancel',
        value: function cancel() {
            delete this.dataViews;
        }
    }, {
        key: 'cleanup',
        value: function cleanup() {
            delete this.dataViews;
        }
    }]);

    return WavAudioEncoder;
})();

var AudioCapture = (function () {
    function AudioCapture() {
        _classCallCheck(this, AudioCapture);

        // spawn background worker
        //this._encodingWorker = new Worker("/assets/js/worker-encoder.min.js");

        console.log("Initialized AudioCapture");

        _underscore2['default'].extend(this, {
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

    // unused at the moment

    // TODO: firefox's built-in ogg-creation route
    // Firefox 27's manual recording doesn't work. something funny with their sampling rates or buffer sizes
    // the data is fairly garbled, like they are serving 22khz as 44khz or something like that

    _createClass(AudioCapture, [{
        key: 'startAutomaticEncoding',
        value: function startAutomaticEncoding(mediaStream) {
            this._audioEncoder = new MediaRecorder(mediaStream);

            this._audioEncoder.ondataavailable = function (e) {
                console.log("AudioCapture::startAutomaticEncoding(); MediaRecorder.ondataavailable(); new blob: size=" + e.data.size + " type=" + e.data.type);
                this._latestAudioBuffer.push(e.data);
            };

            this._audioEncoder.onstop = function () {
                console.log("AudioCapture::startAutomaticEncoding(); MediaRecorder.onstop(); hit");

                // send the last captured audio buffer
                var encoded_blob = new Blob(this._latestAudioBuffer, { type: 'audio/ogg' });

                console.log("AudioCapture::startAutomaticEncoding(); MediaRecorder.onstop(); got encoded blob: size=" + encoded_blob.size + " type=" + encoded_blob.type);

                if (this._onCaptureCompleteCallback) this._onCaptureCompleteCallback(encoded_blob);
            };

            console.log("AudioCapture::startAutomaticEncoding(); MediaRecorder.start()");
            this._audioEncoder.start(0);
        }
    }, {
        key: 'compressAudio',
        value: function compressAudio(data) {
            var _this2 = this;

            this.audioContextOffline = new OfflineAudioContext(1, 48000 * 30, 48000);

            var source = this.audioContextOffline.createBufferSource();
            var audioBuffer = this.audioContextOffline.createBuffer(1, e.data.buffer.length, 44100);
            audioBuffer.getChannelData(0).set(e.data.buffer);

            source.buffer = audioBuffer;
            source.connect(this.audioContextOffline.destination);
            source.start();

            this._audioListener.onaudioprocess = function (e) {
                if (!_this2._isRecording) return;

                _this2._encoder.encode([e.inputBuffer.getChannelData(0)]);

                _this2._totalNumSamples += msg.left.length;
            };
        }
    }, {
        key: 'createAudioContext',
        value: function createAudioContext(mediaStream) {
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
    }, {
        key: 'startManualEncoding',
        value: function startManualEncoding(mediaStream) {
            var _this3 = this;

            if (!this._audioContext) {
                this.createAudioContext(mediaStream);
            }

            //if (!this._encodingWorker)
            //    this._encodingWorker = new Worker("/assets/js/worker-encoder.min.js");

            // re-hook audio listener node every time we start, because _encodingWorker reference will change
            this._audioListener.onaudioprocess = function (e) {
                if (!_this3._isRecording) return;

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

                _this3._bufferArray.push(buf);

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
    }, {
        key: 'shutdownManualEncoding',
        value: function shutdownManualEncoding() {
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
    }, {
        key: 'toggleMicrophoneRecording',
        value: function toggleMicrophoneRecording(captureAudioSamples) {
            this._isRecording = captureAudioSamples;
        }

        // called when user allows us use of their microphone
    }, {
        key: 'onMicrophoneProvided',
        value: function onMicrophoneProvided(mediaStream, onStartedCallback) {

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
            if (onStartedCallback) onStartedCallback();
        }
    }, {
        key: 'setGain',
        value: function setGain(gain) {
            if (this._audioGain) this._audioGain.gain.value = gain;

            console.log("setting gain: " + gain);
            this._cachedGainValue = gain;
        }
    }, {
        key: 'polyfill',
        value: function polyfill() {
            window.AudioContext = window.AudioContext || window.webkitAudioContext || false;

            console.log("navigator ", navigator);
            console.log("navigator.mediaDevice = ", navigator.mediaDevice);

            if (navigator.mediaDevice == null) {
                console.log("polyfilling mediaDevice.getUserMedia");
                navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia || false;
                navigator.mediaDevice = {
                    getUserMedia: function getUserMedia(props) {
                        return new Promise(function (y, n) {
                            return navigator.getUserMedia(props, y, n);
                        });
                    }
                };
            }

            if (!navigator.getUserMedia) {
                console.error("AudioCapture::polyfill(); getUserMedia() not supported.");
                return false;
            }
        }
    }, {
        key: 'preloadMediaStream',
        value: function preloadMediaStream() {
            var _this4 = this;

            if (this._cachedMediaStream) return;

            navigator.mediaDevice.getUserMedia({ audio: true, video: false, stereo: false,
                googEchoCancellation: false, googNoiseSuppression: false, googNoiseReduction: false, googTypingNoiseDetection: false,
                googAudioMirroring: false, googAutoGainControl2: false, googEchoCancellation2: false, googAutoGainControl: false, googLeakyBucket: false
            }).then(function (ms) {
                _this4._cachedMediaStream = ms;
            })['catch'](function (err) {
                console.warn("AudioCapture::preloadMediaStream(); could not grab microphone. perhaps user didn't give us permission?", err);
            });
        }
    }, {
        key: 'start',
        value: function start(onStartedCallback) {
            var _this5 = this;

            if (this._cachedMediaStream) return this.onMicrophoneProvided(this._cachedMediaStream, onStartedCallback);

            navigator.mediaDevice.getUserMedia({ audio: true }).then(function (ms) {
                return _this5.onMicrophoneProvided(ms, onStartedCallback);
            })['catch'](function (err) {
                console.warn("AudioCapture::start(); could not grab microphone. perhaps user didn't give us permission?", err);
            });

            return true;
        }
    }, {
        key: 'stop',
        value: function stop(captureCompleteCallback) {
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

            if (this._onCaptureCompleteCallback) this._onCaptureCompleteCallback(encoded_blob);

            // TODO: stop any active spectral analysis
        }
    }]);

    return AudioCapture;
})();

exports.AudioCapture = AudioCapture;
function Analyzer() {

    var _audioCanvasAnimationId, _audioSpectrumCanvas;

    this.startAnalyzerUpdates = function () {
        updateAnalyzer();
    };

    this.stopAnalyzerUpdates = function () {
        if (!_audioCanvasAnimationId) return;

        window.cancelAnimationFrame(_audioCanvasAnimationId);
        _audioCanvasAnimationId = null;
    };

    function updateAnalyzer() {

        if (!_audioSpectrumCanvas) _audioSpectrumCanvas = document.getElementById("recording-visualizer").getContext("2d");

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
            var scaled_value = value / 256 * _canvasHeight;

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

            if (_hitHeights[i] < 0) _hitHeights[i] = 0;
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

            if (_hitHeights[i] === 0) continue;

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

},{"underscore":"underscore"}],3:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var SoundPlayer = (function () {
    function SoundPlayer() {
        _classCallCheck(this, SoundPlayer);
    }

    _createClass(SoundPlayer, null, [{
        key: "create",
        value: function create(model) {
            var resumePosition = parseInt(model.get('position') || 0);

            console.log("Creating sound player for model:", model);

            return soundManager.createSound({
                id: model.id,
                url: model.url,
                volume: 100,
                autoLoad: true,
                autoPlay: false,
                from: resumePosition,
                whileloading: function whileloading() {
                    console.log("loaded: " + this.bytesLoaded + " of " + this.bytesTotal);
                },
                onload: function onload() {
                    console.log('Sound; audio loaded; position = ' + resumePosition + ', duration = ' + this.duration);

                    if (this.duration == null || this.duration == 0) {
                        console.log("duration is null");
                        return;
                    }

                    if (resumePosition + 10 > this.duration) {
                        // the track is pretty much complete, loop it
                        // FIXME: this should actually happen earlier, we should know that the action will cause a rewind
                        //        and indicate the rewind visually so there is no surprise
                        resumePosition = 0;
                        console.log('Sound; track needed a rewind');
                    }

                    // FIXME: resume compatibility with various browsers
                    // FIXME: sometimes you resume a file all the way at the end, should loop them around
                    this.setPosition(resumePosition);
                    this.play();
                },
                whileplaying: function whileplaying() {
                    var progress = (this.duration > 0 ? 100 * this.position / this.duration : 0).toFixed(0) + '%';
                    localStorage.setItem("quip:" + this.id + ":progress", progress);
                    localStorage.setItem("quip:" + this.id + ":position", this.position.toFixed(0));
                    model.set({ 'progress': progress });
                },
                onpause: function onpause() {
                    console.log("Sound; paused: " + this.id);
                    var position = this.position ? this.position.toFixed(0) : 0;
                    var progress = (this.duration > 0 ? 100 * position / this.duration : 0).toFixed(0) + '%';
                    localStorage.setItem("quip:" + this.id + ":progress", progress);
                    localStorage.setItem("quip:" + this.id + ":position", position);
                    model.set({ 'progress': progress });
                },
                onfinish: function onfinish() {
                    console.log("Sound; finished playing: " + this.id);

                    // store completion in browser
                    localStorage.setItem("quip:" + this.id + ":progress", '100%');
                    localStorage.setItem("quip:" + this.id + ":position", this.duration.toFixed(0));
                    model.set({ 'progress': '100%' });

                    // TODO: unlock some sort of achievement for finishing this track, mark it a diff color, etc
                    // TODO: this is a good place to fire a hook to a playback manager to move onto the next audio clip
                }
            });
        }
    }]);

    return SoundPlayer;
})();

exports["default"] = SoundPlayer;
module.exports = exports["default"];

},{}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _backbone = require('backbone');

var _backbone2 = _interopRequireDefault(_backbone);

var _quipControlJs = require('./quip-control.js');

var RecordingsList = (function (_Backbone$View) {
    _inherits(RecordingsList, _Backbone$View);

    function RecordingsList() {
        _classCallCheck(this, RecordingsList);

        _get(Object.getPrototypeOf(RecordingsList.prototype), 'constructor', this).apply(this, arguments);
    }

    _createClass(RecordingsList, [{
        key: 'initialize',
        value: function initialize() {

            var audioPlayer = new _quipControlJs.AudioPlayerView();

            soundManager.setup({
                debugMode: true,
                url: '/assets/swf/',
                preferFlash: false,
                onready: function onready() {
                    console.log("soundManager ready");
                }
            });

            $('.quip').each(function (elem) {
                var view = new _quipControlJs.QuipView({
                    el: elem,
                    model: new _quipControlJs.QuipModel({ progress: 0 })
                });

                _quipControlJs.Quips.add(view.model);
                view.render();
            });

            // process all timestamps
            var vagueTime = require('vague-time');
            var now = new Date();

            $("time[datetime]").each(function generateVagueDate(ele) {
                ele.textContent = vagueTime.get({ from: now, to: new Date(ele.getAttribute('datetime')) });
            });

            this.listenTo(_quipControlJs.Quips, 'add', this.quipAdded);
        }
    }, {
        key: 'quipAdded',
        value: function quipAdded(quip) {}
    }]);

    return RecordingsList;
})(_backbone2['default'].View);

exports['default'] = RecordingsList;
module.exports = exports['default'];

},{"./quip-control.js":5,"backbone":"backbone","vague-time":"vague-time"}],5:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _backbone = require('backbone');

var _backbone2 = _interopRequireDefault(_backbone);

var _audioPlayerJs = require('./audio-player.js');

var _audioPlayerJs2 = _interopRequireDefault(_audioPlayerJs);

/**
 * Quip
 * Plays audio and tracks position
 */

var QuipModel = (function (_Backbone$Model) {
    _inherits(QuipModel, _Backbone$Model);

    _createClass(QuipModel, [{
        key: 'defaults',
        value: function defaults() {
            return {
                id: 0, // guid
                progress: 0, // [0-100] percentage
                position: 0, // msec
                duration: 0, // msec
                isPublic: false
            };
        }
    }]);

    function QuipModel() {
        _classCallCheck(this, QuipModel);

        _get(Object.getPrototypeOf(QuipModel.prototype), 'constructor', this).call(this);
    }

    _createClass(QuipModel, [{
        key: 'save',
        value: function save(attributes) {
            console.log("Quip Model saving to localStorage");
            localStorage.setItem(this.id, JSON.stringify(this.toJSON()));
        }
    }, {
        key: 'fetch',
        value: function fetch() {
            console.log("Quip Model loading from localStorage");
            this.set(JSON.parse(localStorage.getItem(this.id)));
        }
    }, {
        key: 'updateProgress',
        value: function updateProgress() {
            this.set({
                progress: (duration > 0 ? position / duration : 0).toFixed(0) + "%"
            });
        }
    }]);

    return QuipModel;
})(_backbone2['default'].Model);

var AudioPlayerEvents = (function (_Backbone$Model2) {
    _inherits(AudioPlayerEvents, _Backbone$Model2);

    function AudioPlayerEvents() {
        _classCallCheck(this, AudioPlayerEvents);

        _get(Object.getPrototypeOf(AudioPlayerEvents.prototype), 'constructor', this).apply(this, arguments);
    }

    _createClass(AudioPlayerEvents, [{
        key: 'getPauseUrl',
        value: function getPauseUrl(id) {
            var url = "/" + id + "/paused";
            console.log("pause url" + url);
            return url;
        }
    }, {
        key: 'onPause',
        value: function onPause(id, callback) {
            this.on(this.getPauseUrl(id), callback);
        }
    }, {
        key: 'triggerPause',
        value: function triggerPause(id) {
            this.trigger(this.getPauseUrl(id));
        }
    }]);

    return AudioPlayerEvents;
})(_backbone2['default'].Model);

var AudioPlayer = new AudioPlayerEvents();

//class AudioPlayerEvents extends Backbone.Events {
//
//}

var AudioPlayerView = (function (_Backbone$View) {
    _inherits(AudioPlayerView, _Backbone$View);

    function AudioPlayerView() {
        _classCallCheck(this, AudioPlayerView);

        _get(Object.getPrototypeOf(AudioPlayerView.prototype), 'constructor', this).apply(this, arguments);
    }

    _createClass(AudioPlayerView, [{
        key: 'defaults',
        value: function defaults() {
            return {
                audioPlayer: null,
                quipModel: null
            };
        }
    }, {
        key: 'initialize',
        value: function initialize() {
            var _this = this;

            console.log("AudioPlayerView initialized");
            this.audioPlayer = document.getElementById("audio-player");
            AudioPlayer.on("toggle", function (quip) {
                return _this.onToggle(quip);
            });
        }
    }, {
        key: 'close',
        value: function close() {
            this.stopPeriodicTimer();
        }
    }, {
        key: 'startPeriodicTimer',
        value: function startPeriodicTimer() {
            var _this2 = this;

            if (this.periodicTimer == null) {
                this.periodicTimer = setInterval(function () {
                    return _this2.checkProgress();
                }, 100);
            }
        }
    }, {
        key: 'stopPeriodicTimer',
        value: function stopPeriodicTimer() {
            if (this.periodicTimer != null) {
                clearInterval(this.periodicTimer);
                this.periodicTimer = null;
            }
        }
    }, {
        key: 'checkProgress',
        value: function checkProgress() {
            if (this.quipModel == null) {
                return;
            }

            var progressUpdate = {
                currentTime: this.audioPlayer.currentTime,
                duration: this.audioPlayer.duration,
                progress: 100 * this.audioPlayer.currentTime / this.audioPlayer.duration
            };

            AudioPlayer.trigger("/" + this.quipModel.id + "/progress", progressUpdate);
        }
    }, {
        key: 'onToggle',
        value: function onToggle(quipModel) {
            this.quipModel = quipModel;

            if (!this.trackIsLoaded(quipModel.url)) {
                this.loadTrack(quipModel.url);
            }

            if (!this.trackIsLoaded(quipModel.url)) {
                return;
            }

            if (this.audioPlayer.paused) {
                this.play(quipModel);
            } else {
                this.pause(quipModel);
            }
        }
    }, {
        key: 'play',
        value: function play(quipModel) {
            this.audioPlayer.play();
            AudioPlayer.trigger("/" + quipModel.id + "/playing");
            this.startPeriodicTimer();
        }
    }, {
        key: 'pause',
        value: function pause(quipModel) {
            this.audioPlayer.pause();
            AudioPlayer.trigger("/" + quipModel.id + "/paused");
            this.stopPeriodicTimer();
        }
    }, {
        key: 'trackIsLoaded',
        value: function trackIsLoaded(url) {
            return ~this.audioPlayer.src.indexOf(url);
        }
    }, {
        key: 'loadTrack',
        value: function loadTrack(url) {
            console.log("Loading audio: " + url);
            this.audioPlayer.src = url;
        }
    }]);

    return AudioPlayerView;
})(_backbone2['default'].View);

var QuipView = (function (_Backbone$View2) {
    _inherits(QuipView, _Backbone$View2);

    function QuipView() {
        _classCallCheck(this, QuipView);

        _get(Object.getPrototypeOf(QuipView.prototype), 'constructor', this).apply(this, arguments);
    }

    _createClass(QuipView, [{
        key: 'defaults',
        value: function defaults() {
            return {
                quipId: 0,
                audioPlayer: null
            };
        }
    }, {
        key: 'events',
        value: function events() {
            return {
                "click .quip-actions .lock-indicator": "togglePublic",
                "click .quip-player": "toggle"
            };
        }
    }, {
        key: 'onPause',
        value: function onPause() {
            console.log("QuipView; paused");

            $(this.el).find('.fa-play').removeClass('fa-play').addClass('fa-pause');
        }
    }, {
        key: 'onPlay',
        value: function onPlay() {
            console.log("QuipView; playing");

            $(this.el).find('.fa-pause').removeClass('fa-pause').addClass('fa-play');
        }
    }, {
        key: 'onProgress',
        value: function onProgress(progressUpdate) {
            this.model.set({ 'progress': progressUpdate.progress });
        }
    }, {
        key: 'initialize',
        value: function initialize() {
            var _this3 = this;

            this.quipId = this.$el.data("quipId");
            this.publicLink = '/u/' + this.quipId;

            AudioPlayer.on("/" + this.quipId + "/paused", function () {
                return _this3.onPause();
            });
            AudioPlayer.on("/" + this.quipId + "/playing", function () {
                return _this3.onPlay();
            });
            AudioPlayer.on("/" + this.quipId + "/progress", function (update) {
                return _this3.onProgress(update);
            });

            this.loadModel();

            // update visuals to indicate playback progress
            this.listenTo(this.model, 'change:progress', function (model, progress) {
                $(_this3.el).find(".progress-bar").css("width", progress + "%");
            });

            this.listenTo(this.model, "change", this.render);
        }
    }, {
        key: 'loadModel',
        value: function loadModel() {
            var progress = localStorage.getItem("quip:" + this.quipId + ":progress");
            var position = localStorage.getItem("quip:" + this.quipId + ":position");

            this.model.set({
                'id': this.quipId,
                'progress': progress,
                'position': position,
                'isPublic': this.$el.data("isPublic") == 'True',
                'isMine': this.$el.data("isMine") == 'True'
            });
        }
    }, {
        key: 'togglePublic',
        value: function togglePublic(ev) {
            var newState = !this.model.get('isPublic');
            this.model.set({ 'isPublic': newState });

            console.log("toggling new published state: " + newState);

            $.ajax({
                url: '/recording/publish/' + this.quipId,
                method: 'post',
                data: { isPublic: newState },
                complete: function complete(resp) {
                    if (resp && resp.status == 'success') {
                        // change successful
                    } else {
                            // change failed
                            // TODO: add visual to indicate change-failure
                            console.warn("Toggling recording publication state failed:");
                            console.dir(resp);
                        }
                }
            });

            return false;
        }

        /**
         * Audio element fields
         * .duration (seconds)
         * .onprogress
         * .onplay
         * .onpause
         * .paused
         * .volume
         * .ended
         * .currentTime
         */

    }, {
        key: 'toggle',
        value: function toggle(event) {
            var quipId = $(this.el).data("quipId");
            this.model.url = '/recordings/' + quipId + '.ogg';

            AudioPlayer.trigger("toggle", this.model);
        }
    }, {
        key: 'render',
        value: function render() {
            //this.$el.html(_.template($('#quip-template').html()));
            //return this;
            var result = $(this.el).find('.quip-actions').find('.lock-indicator');
            if (result) result.remove();

            if (this.model.get('isMine')) {
                var _ = require('underscore');
                var html = _.template($("#quip-control-privacy").html());

                $(this.el).find(".quip-actions").append(html({
                    isPublic: this.model.get('isPublic'),
                    publicLink: this.publicLink
                }));
            }
        }
    }]);

    return QuipView;
})(_backbone2['default'].View);

var QuipList = (function (_Backbone$Collection) {
    _inherits(QuipList, _Backbone$Collection);

    function QuipList(options) {
        _classCallCheck(this, QuipList);

        _get(Object.getPrototypeOf(QuipList.prototype), 'constructor', this).call(this, options);
        this.model = QuipModel;
    }

    return QuipList;
})(_backbone2['default'].Collection);

var Quips = new QuipList();

exports.QuipModel = QuipModel;
exports.QuipView = QuipView;
exports.QuipList = QuipList;
exports.Quips = Quips;
exports.AudioPlayerView = AudioPlayerView;

},{"./audio-player.js":3,"backbone":"backbone","underscore":"underscore"}],6:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _backbone = require('backbone');

var _backbone2 = _interopRequireDefault(_backbone);

var _quipControlJs = require('./quip-control.js');

var _audioCapture = require('./audio-capture');

var Recorder = (function (_Backbone$Model) {
    _inherits(Recorder, _Backbone$Model);

    function Recorder() {
        _classCallCheck(this, Recorder);

        _get(Object.getPrototypeOf(Recorder.prototype), 'constructor', this).apply(this, arguments);
    }

    _createClass(Recorder, [{
        key: 'defaults',
        value: function defaults() {
            return {
                recordingTime: 0
            };
        }
    }]);

    return Recorder;
})(_backbone2['default'].Model);

exports.Recorder = Recorder;

var RecorderView = (function (_Backbone$View) {
    _inherits(RecorderView, _Backbone$View);

    function RecorderView() {
        _classCallCheck(this, RecorderView);

        _get(Object.getPrototypeOf(RecorderView.prototype), 'constructor', this).apply(this, arguments);
    }

    _createClass(RecorderView, [{
        key: 'IntToTime',

        //    el: '.m-recording-container',

        value: function IntToTime(value) {
            var minutes = Math.floor(value / 60);
            var seconds = Math.round(value - minutes * 60);

            return ("00" + minutes).substr(-2) + ":" + ("00" + seconds).substr(-2);
        }
    }, {
        key: 'defaults',
        value: function defaults() {
            return {
                audioCapture: null,
                audioBlob: null,
                audioBlobUrl: null,
                audioPlayer: null,
                isRecording: false,
                timerId: 0,
                timerStart: 3
            };
        }
    }, {
        key: 'events',
        value: function events() {
            return {
                "click .recording-toggle": "toggle",
                "click #cancel-recording": "cancelRecording",
                "click #upload-recording": "uploadRecording",
                "click #helper-btn": "playPreview"
            };
        }
    }, {
        key: 'initialize',
        value: function initialize(options) {
            console.log("RecorderView init");
            this.audioCapture = new _audioCapture.AudioCapture();

            this.audioPlayer = document.getElementById("recorded-preview");
            if (this.audioPlayer == null) {
                return;
            }

            console.log("can play vorbis: ", !!this.audioPlayer.canPlayType && "" != this.audioPlayer.canPlayType('audio/ogg; codecs="vorbis"'));

            //this.audioPlayer.loop = "loop";
            //this.audioPlayer.autoplay = "autoplay";
            //this.audioPlayer.src = "/assets/sounds/beep_short_on.ogg";
            //this.audioPlayer.play();

            this.model.on('change:recordingTime', function (model, time) {
                $(".recording-time").text(time);
            });

            // attempt to fetch media-stream on page-load
            this.audioCapture.preloadMediaStream();

            // TODO: a pretty advanced but neat feature may be to store a backup copy of a recording locally in case of a crash or user-error
            /*
             // check how much temporary storage space we have. it's a good way to save recording without losing it
             window.webkitStorageInfo.queryUsageAndQuota(
             webkitStorageInfo.TEMPORARY,
             function(used, remaining) {
             var rmb = (remaining / 1024 / 1024).toFixed(4);
             var umb = (used / 1024 / 1024).toFixed(4);
             console.log("Used quota: " + umb + "mb, remaining quota: " + rmb + "mb");
             }, function(e) {
             console.log('Error', e);
             }
             );
              function onErrorInFS() {
             var msg = '';
              switch (e.code) {
             case FileError.QUOTA_EXCEEDED_ERR:
             msg = 'QUOTA_EXCEEDED_ERR';
             break;
             case FileError.NOT_FOUND_ERR:
             msg = 'NOT_FOUND_ERR';
             break;
             case FileError.SECURITY_ERR:
             msg = 'SECURITY_ERR';
             break;
             case FileError.INVALID_MODIFICATION_ERR:
             msg = 'INVALID_MODIFICATION_ERR';
             break;
             case FileError.INVALID_STATE_ERR:
             msg = 'INVALID_STATE_ERR';
             break;
             default:
             msg = 'Unknown Error';
             break;
             }
              console.log('Error: ' + msg);
             }
              window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
              window.requestFileSystem(window.TEMPORARY, 5 * 1024 * 1024, function onSuccess(fs) {
              console.log('opening file');
              fs.root.getFile("test", {create:true}, function(fe) {
              console.log('spawned writer');
              fe.createWriter(function(fw) {
              fw.onwriteend = function(e) {
             console.log('write completed');
             };
              fw.onerror = function(e) {
             console.log('write failed: ' + e.toString());
             };
              console.log('writing blob to file..');
              var blob = new Blob(['yeh this is a test!'], {type: 'text/plain'});
             fw.write(blob);
              }, onErrorInFS);
              }, onErrorInFS);
              }, onErrorInFS);
             */
        }
    }, {
        key: 'toggle',
        value: function toggle(event) {
            if (this.isRecording) {
                this.isRecording = false;
                this.stopRecording();
            } else {
                this.isRecording = true;
                this.startRecording();
            }
        }
    }, {
        key: 'cancelRecording',
        value: function cancelRecording(event) {
            console.log("Recorder::onRecordingCompleted(); canceling recording");
            $("#recorder-full").removeClass("disabled");
            $("#recorder-uploader").addClass("disabled");
            $(".m-recording-container").removeClass("flipped");
            this.audioPlayer.src = "";
            this.model.set('recordingTime', 3);
        }
    }, {
        key: 'uploadRecording',
        value: function uploadRecording(event) {
            console.log("Recorder::onRecordingCompleted(); uploading recording");
            this.audioPlayer.src = "";

            $("#recorder-full").addClass("disabled");
            $("#recorder-uploader").removeClass("disabled");
            $(".m-recording-container").removeClass("flipped");

            var description = $('textarea[name=description]')[0].value;

            var data = new FormData();
            data.append('description', description);
            data.append('isPublic', 1);
            data.append('audio-blob', this.audioBlob);

            // send raw blob and metadata

            // TODO: get a replacement ajax library (maybe patch reqwest to support binary?)
            var xhr = new XMLHttpRequest();
            xhr.open('post', '/recording/create', true);
            xhr.setRequestHeader('Accept', 'application/json');
            xhr.upload.onprogress = function (e) {
                var percent = (e.loaded / e.total * 100).toFixed(0) + '%';
                console.log("percentage: " + percent);
                $("#recorder-uploader").find(".bar").css('width', percent);
            };
            xhr.onload = function (e) {
                $("#recorder-uploader").find(".bar").css('width', '100%');
                if (xhr.status == 200) {
                    console.log("Recorder::onRecordingCompleted(); manual xhr successful");
                } else {
                    console.log("Recorder::onRecordingCompleted(); manual xhr error", xhr);
                }
                var result = JSON.parse(xhr.response);
                console.log("xhr.response", xhr.response);
                console.log("result", result);

                if (result.status == "success") {
                    window.location.href = result.url;
                }
            };
            xhr.send(data);
        }
    }, {
        key: 'onRecordingTick',
        value: function onRecordingTick() {
            var timeSpan = parseInt(((new Date().getTime() - this.timerStart) / 1000).toFixed());
            var timeStr = this.IntToTime(timeSpan);
            this.model.set('recordingTime', timeStr);
        }
    }, {
        key: 'onCountdownTick',
        value: function onCountdownTick() {
            if (--this.timerStart > 0) {
                this.model.set('recordingTime', this.timerStart);
            } else {
                console.log("countdown hit zero. begin recording.");
                clearInterval(this.timerId);
                this.model.set('recordingTime', this.IntToTime(0));
                this.onMicRecording();
            }
        }
    }, {
        key: 'startRecording',
        value: function startRecording() {
            var _this = this;

            console.log("starting recording");
            this.audioCapture.start(function () {
                return _this.onMicReady();
            });
        }

        /**
         * Microphone is ready to record. Do a count-down, then signal for input-signal to begin recording
         */
    }, {
        key: 'onMicReady',
        value: function onMicReady() {
            console.log("mic ready to record. do countdown.");
            this.timerStart = 3;
            // run countdown
            //this.timerId = setInterval(this.onCountdownTick.bind(this), 1000);

            // or launch capture immediately
            this.model.set('recordingTime', this.IntToTime(0));
            this.onMicRecording();

            $(".recording-time").addClass("is-visible");
        }
    }, {
        key: 'onMicRecording',
        value: function onMicRecording() {
            var _this2 = this;

            this.timerStart = new Date().getTime();
            this.timerId = setInterval(this.onRecordingTick.bind(this), 1000);
            $(".m-recording-screen").addClass("is-recording");

            console.log("Mic recording started");

            // TODO: the mic capture is already active, so audio buffers are getting built up
            // when toggling this on, we may already be capturing a buffer that has audio prior to the countdown
            // hitting zero. we can do a few things here:
            // 1) figure out how much audio was already captured, and cut it out
            // 2) use a fade-in to cover up that split-second of audio
            // 3) allow the user to edit post-record and clip as they wish (better but more complex option!)
            setTimeout(function () {
                return _this2.audioCapture.toggleMicrophoneRecording(true);
            }, 500);
        }
    }, {
        key: 'stopRecording',
        value: function stopRecording() {
            var _this3 = this;

            console.log("stopping recording");
            clearInterval(this.timerId);

            // play sound immediately to bypass mobile chrome's "user initiated media" requirement
            this.audioPlayer.src = "/assets/sounds/beep_short_on.ogg";
            this.audioPlayer.play();

            this.audioCapture.stop(function (blob) {
                return _this3.onRecordingCompleted(blob);
            });

            $(".recording-time").removeClass("is-visible");
            $(".m-recording-screen").removeClass("is-recording");

            // TODO: animate recorder out
            // TODO: animate uploader in
        }
    }, {
        key: 'onRecordingCompleted',
        value: function onRecordingCompleted(blob) {
            console.log("Recorder::onRecordingCompleted(); previewing recorded audio");
            this.audioBlob = blob;
            this.showCompletionScreen();
        }
    }, {
        key: 'playPreview',
        value: function playPreview() {
            console.log("playing preview..");
            console.log("audio blob", this.audioBlob);
            console.log("audio blob url", this.audioBlobUrl);
            this.audioPlayer.src = this.audioBlobUrl;
            this.audioPlayer.play();
        }
    }, {
        key: 'showCompletionScreen',
        value: function showCompletionScreen() {
            var _this4 = this;

            console.log("Recorder::onRecordingCompleted(); flipping to audio playback");
            this.audioBlobUrl = window.URL.createObjectURL(this.audioBlob);
            $(".m-recording-container").addClass("flipped");

            //console.dir(this.audioBlobUrl);
            //
            //this.audioPlayer.src = this.audioBlobUrl;
            //this.audioPlayer.play();
            //return;

            // HACK: route blob through xhr to let Android Chrome play blobs via <audio>
            var xhr = new XMLHttpRequest();
            xhr.open('GET', this.audioBlobUrl, true);
            xhr.responseType = 'blob';
            xhr.overrideMimeType('audio/wav');

            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4 && xhr.status == 200) {
                    var xhrBlobUrl = window.URL.createObjectURL(xhr.response);

                    console.log("Loaded blob from cache url: " + _this4.audioBlobUrl);
                    console.log("Routed into blob url: " + xhrBlobUrl);

                    _this4.audioPlayer.src = xhrBlobUrl;
                    _this4.audioPlayer.play();
                }
            };
            xhr.send();
        }
    }]);

    return RecorderView;
})(_backbone2['default'].View);

exports.RecorderView = RecorderView;

},{"./audio-capture":2,"./quip-control.js":5,"backbone":"backbone"}]},{},[1])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvYWJhcmthbi9hbGV4LWRldi9xdWlwcy1weXRob24vYXBwL2phdmFzY3JpcHRzL2FwcC5qcyIsIi9Vc2Vycy9hYmFya2FuL2FsZXgtZGV2L3F1aXBzLXB5dGhvbi9hcHAvamF2YXNjcmlwdHMvYXVkaW8tY2FwdHVyZS5qcyIsIi9Vc2Vycy9hYmFya2FuL2FsZXgtZGV2L3F1aXBzLXB5dGhvbi9hcHAvamF2YXNjcmlwdHMvYXVkaW8tcGxheWVyLmpzIiwiL1VzZXJzL2FiYXJrYW4vYWxleC1kZXYvcXVpcHMtcHl0aG9uL2FwcC9qYXZhc2NyaXB0cy9ob21lcGFnZS5qcyIsIi9Vc2Vycy9hYmFya2FuL2FsZXgtZGV2L3F1aXBzLXB5dGhvbi9hcHAvamF2YXNjcmlwdHMvcXVpcC1jb250cm9sLmpzIiwiL1VzZXJzL2FiYXJrYW4vYWxleC1kZXYvcXVpcHMtcHl0aG9uL2FwcC9qYXZhc2NyaXB0cy9yZWNvcmRpbmctY29udHJvbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7d0JDQXFCLFVBQVU7Ozs7d0JBQ0osWUFBWTs7OztnQ0FDQSxxQkFBcUI7O0lBRXRELFdBQVcsR0FDRixTQURULFdBQVcsR0FDQzswQkFEWixXQUFXOztBQUVULDBCQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDZiwwQkFBUyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7O0FBRXpCLFFBQUksSUFBSSxHQUFHLDJCQUFvQixDQUFDO0FBQ2hDLFFBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQzs7QUFFZCxRQUFJLFFBQVEsR0FBRyxtQ0FBaUI7QUFDNUIsVUFBRSxFQUFFLENBQUMsQ0FBQyx3QkFBd0IsQ0FBQztBQUMvQixhQUFLLEVBQUUsK0JBQWEsRUFBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQztLQUMzQyxDQUFDLENB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dGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImltcG9ydCBCYWNrYm9uZSBmcm9tICdiYWNrYm9uZSdcbmltcG9ydCBSZWNvcmRpbmdzTGlzdCBmcm9tICcuL2hvbWVwYWdlJ1xuaW1wb3J0IHsgUmVjb3JkZXJWaWV3LCBSZWNvcmRlciB9IGZyb20gJy4vcmVjb3JkaW5nLWNvbnRyb2wnXG5cbmNsYXNzIEFwcGxpY2F0aW9uIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgQmFja2JvbmUuJCA9ICQ7XG4gICAgICAgIEJhY2tib25lLmhpc3Rvcnkuc3RhcnQoKTtcblxuICAgICAgICB2YXIgdmlldyA9IG5ldyBSZWNvcmRpbmdzTGlzdCgpO1xuICAgICAgICB2aWV3LnJlbmRlcigpO1xuXG4gICAgICAgIHZhciByZWNvcmRlciA9IG5ldyBSZWNvcmRlclZpZXcoe1xuICAgICAgICAgICAgZWw6ICQoJy5tLXJlY29yZGluZy1jb250YWluZXInKSxcbiAgICAgICAgICAgIG1vZGVsOiBuZXcgUmVjb3JkZXIoe3JlY29yZGluZ1RpbWU6IC0zfSlcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8vLyBsb2NhdGUgYW55IGNvbnRyb2xsZXJzIG9uIHRoZSBwYWdlIGFuZCBsb2FkIHRoZWlyIHJlcXVpcmVtZW50c1xuICAgICAgICAvLy8vIHRoaXMgaXMgYSBwYXJ0IG9mIEFuZ3VsYXIgaSByZWFsbHkgbGlrZWQsIHRoZSBjdXN0b20gZGlyZWN0aXZlc1xuICAgICAgICAvLyQoJ1tiYWNrYm9uZS1jb250cm9sbGVyXScpLmVhY2goZnVuY3Rpb24oZWwpIHtcbiAgICAgICAgLy9cbiAgICAgICAgLy8gICAgdmFyIGNvbnRyb2xsZXJOYW1lID0gJChlbCkuYXR0cignYmFja2JvbmUtY29udHJvbGxlcicpO1xuICAgICAgICAvLyAgICBpZihjb250cm9sbGVyTmFtZSBpbiBBcHAuTG9hZGVycylcbiAgICAgICAgLy8gICAgICAgIEFwcC5Mb2FkZXJzW2NvbnRyb2xsZXJOYW1lXSgpO1xuICAgICAgICAvLyAgICBlbHNlXG4gICAgICAgIC8vICAgICAgICBjb25zb2xlLmVycm9yKFwiQ29udHJvbGxlcjogJ1wiICsgY29udHJvbGxlck5hbWUgKyBcIicgbm90IGZvdW5kXCIpO1xuICAgICAgICAvL30pO1xuICAgIH1cbn1cblxuJCgoKSA9PiB7XG4gICAgLy8gc2V0dXAgcmF2ZW4gdG8gcHVzaCBtZXNzYWdlcyB0byBvdXIgc2VudHJ5XG4gICAgLy9SYXZlbi5jb25maWcoJ2h0dHBzOi8vZDA5ODcxMmNiNzA2NGNmMDhiNzRkMDFiNmYzYmUzZGFAYXBwLmdldHNlbnRyeS5jb20vMjA5NzMnLCB7XG4gICAgLy8gICAgd2hpdGVsaXN0VXJsczogWydzdGFnaW5nLmNvdWNocG9kLmNvbScsICdjb3VjaHBvZC5jb20nXSAvLyBwcm9kdWN0aW9uIG9ubHlcbiAgICAvL30pLmluc3RhbGwoKTtcblxuICAgIFJhdmVuLmNvbmZpZygnaHR0cHM6Ly9kYjJhN2Q1ODEwN2M0OTc1YWU3ZGU3MzZhNjMwOGExZUBhcHAuZ2V0c2VudHJ5LmNvbS81MzQ1NicsIHtcbiAgICAgICAgd2hpdGVsaXN0VXJsczogWydzdGFnaW5nLmNvdWNocG9kLmNvbScsICdjb3VjaHBvZC5jb20nXSAvLyBwcm9kdWN0aW9uIG9ubHlcbiAgICB9KS5pbnN0YWxsKClcblxuICAgIG5ldyBBcHBsaWNhdGlvbigpO1xuXG4gICAgLy8gZm9yIHByb2R1Y3Rpb24sIGNvdWxkIHdyYXAgZG9tUmVhZHlDYWxsYmFjayBhbmQgbGV0IHJhdmVuIGhhbmRsZSBhbnkgZXhjZXB0aW9uc1xuXG4gICAgLypcbiAgICB0cnkge1xuICAgICAgICBkb21SZWFkeUNhbGxiYWNrKCk7XG4gICAgfSBjYXRjaChlcnIpIHtcbiAgICAgICAgUmF2ZW4uY2FwdHVyZUV4Y2VwdGlvbihlcnIpO1xuICAgICAgICBjb25zb2xlLmxvZyhcIltFcnJvcl0gVW5oYW5kbGVkIEV4Y2VwdGlvbiB3YXMgY2F1Z2h0IGFuZCBzZW50IHZpYSBSYXZlbjpcIik7XG4gICAgICAgIGNvbnNvbGUuZGlyKGVycik7XG4gICAgfVxuICAgICovXG59KVxuXG5leHBvcnQgZGVmYXVsdCB7IEFwcGxpY2F0aW9uIH1cbiIsImltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnXG5cbmNsYXNzIFdhdkF1ZGlvRW5jb2RlciB7XG5cbiAgICBzZXRTdHJpbmcodmlldywgb2Zmc2V0LCBzdHIpIHtcbiAgICAgICAgdmFyIGxlbiA9IHN0ci5sZW5ndGg7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyArK2kpXG4gICAgICAgICAgICB2aWV3LnNldFVpbnQ4KG9mZnNldCArIGksIHN0ci5jaGFyQ29kZUF0KGkpKTtcbiAgICB9XG5cbiAgICBjb25zdHJ1Y3RvcihzYW1wbGVSYXRlLCBudW1DaGFubmVscykge1xuICAgICAgICB0aGlzLnNhbXBsZVJhdGUgPSBzYW1wbGVSYXRlO1xuICAgICAgICB0aGlzLm51bUNoYW5uZWxzID0gbnVtQ2hhbm5lbHM7XG4gICAgICAgIHRoaXMubnVtU2FtcGxlcyA9IDA7XG4gICAgICAgIHRoaXMuZGF0YVZpZXdzID0gW107XG4gICAgfVxuXG4gICAgZW5jb2RlKGJ1ZmZlcnMpIHtcblxuICAgICAgICBidWZmZXJzLmZvckVhY2goYnVmZmVyID0+IHtcbiAgICAgICAgICAgIHZhciBsZW4gPSBidWZmZXIubGVuZ3RoLFxuICAgICAgICAgICAgICAgIG5DaCA9IHRoaXMubnVtQ2hhbm5lbHMsXG4gICAgICAgICAgICAgICAgdmlldyA9IG5ldyBEYXRhVmlldyhuZXcgQXJyYXlCdWZmZXIobGVuICogbkNoICogMikpLFxuICAgICAgICAgICAgICAgIG9mZnNldCA9IDA7XG5cbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgICAgICAgICAgICB2YXIgeCA9IGJ1ZmZlcltpXSAqIDB4N2ZmZjtcbiAgICAgICAgICAgICAgICB2aWV3LnNldEludDE2KG9mZnNldCwgeCA8IDAgPyBNYXRoLm1heCh4LCAtMHg4MDAwKSA6IE1hdGgubWluKHgsIDB4N2ZmZiksIHRydWUpO1xuICAgICAgICAgICAgICAgIG9mZnNldCArPSAyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5kYXRhVmlld3MucHVzaCh2aWV3KTtcbiAgICAgICAgICAgIHRoaXMubnVtU2FtcGxlcyArPSBsZW47XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGZpbmlzaChtaW1lVHlwZSkge1xuICAgICAgICB2YXIgZGF0YVNpemUgPSB0aGlzLm51bUNoYW5uZWxzICogdGhpcy5udW1TYW1wbGVzICogMixcbiAgICAgICAgICAgIHZpZXcgPSBuZXcgRGF0YVZpZXcobmV3IEFycmF5QnVmZmVyKDQ0KSk7XG4gICAgICAgIHRoaXMuc2V0U3RyaW5nKHZpZXcsIDAsICdSSUZGJyk7XG4gICAgICAgIHZpZXcuc2V0VWludDMyKDQsIDM2ICsgZGF0YVNpemUsIHRydWUpO1xuICAgICAgICB0aGlzLnNldFN0cmluZyh2aWV3LCA4LCAnV0FWRScpO1xuICAgICAgICB0aGlzLnNldFN0cmluZyh2aWV3LCAxMiwgJ2ZtdCAnKTtcbiAgICAgICAgdmlldy5zZXRVaW50MzIoMTYsIDE2LCB0cnVlKTtcbiAgICAgICAgdmlldy5zZXRVaW50MTYoMjAsIDEsIHRydWUpO1xuICAgICAgICB2aWV3LnNldFVpbnQxNigyMiwgdGhpcy5udW1DaGFubmVscywgdHJ1ZSk7XG4gICAgICAgIHZpZXcuc2V0VWludDMyKDI0LCB0aGlzLnNhbXBsZVJhdGUsIHRydWUpO1xuICAgICAgICB2aWV3LnNldFVpbnQzMigyOCwgdGhpcy5zYW1wbGVSYXRlICogNCwgdHJ1ZSk7XG4gICAgICAgIHZpZXcuc2V0VWludDE2KDMyLCB0aGlzLm51bUNoYW5uZWxzICogMiwgdHJ1ZSk7XG4gICAgICAgIHZpZXcuc2V0VWludDE2KDM0LCAxNiwgdHJ1ZSk7XG4gICAgICAgIHRoaXMuc2V0U3RyaW5nKHZpZXcsIDM2LCAnZGF0YScpO1xuICAgICAgICB2aWV3LnNldFVpbnQzMig0MCwgZGF0YVNpemUsIHRydWUpO1xuICAgICAgICB0aGlzLmRhdGFWaWV3cy51bnNoaWZ0KHZpZXcpO1xuICAgICAgICBjb25zb2xlLmxvZyhcImRhdGEgdmlld3NcIiwgdGhpcy5kYXRhVmlld3MpO1xuICAgICAgICB2YXIgYmxvYiA9IG5ldyBCbG9iKHRoaXMuZGF0YVZpZXdzLCB7dHlwZTogJ2F1ZGlvL3dhdid9KTtcbiAgICAgICAgdGhpcy5jbGVhbnVwKCk7XG4gICAgICAgIHJldHVybiBibG9iO1xuICAgIH1cblxuICAgIGNhbmNlbCgpIHtcbiAgICAgICAgZGVsZXRlIHRoaXMuZGF0YVZpZXdzO1xuICAgIH1cblxuICAgIGNsZWFudXAoKSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLmRhdGFWaWV3cztcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBBdWRpb0NhcHR1cmUge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICAvLyBzcGF3biBiYWNrZ3JvdW5kIHdvcmtlclxuICAgICAgICAvL3RoaXMuX2VuY29kaW5nV29ya2VyID0gbmV3IFdvcmtlcihcIi9hc3NldHMvanMvd29ya2VyLWVuY29kZXIubWluLmpzXCIpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiSW5pdGlhbGl6ZWQgQXVkaW9DYXB0dXJlXCIpO1xuXG4gICAgICAgIF8uZXh0ZW5kKHRoaXMsIHtcbiAgICAgICAgICAgIF9hdWRpb0NvbnRleHQ6IG51bGwsXG4gICAgICAgICAgICBfYXVkaW9JbnB1dDogbnVsbCxcbiAgICAgICAgICAgIF9lbmNvZGluZ1dvcmtlcjogbnVsbCxcbiAgICAgICAgICAgIF9pc1JlY29yZGluZzogZmFsc2UsXG4gICAgICAgICAgICBfYXVkaW9MaXN0ZW5lcjogbnVsbCxcbiAgICAgICAgICAgIF9vbkNhcHR1cmVDb21wbGV0ZUNhbGxiYWNrOiBudWxsLFxuICAgICAgICAgICAgX2F1ZGlvQW5hbHl6ZXI6IG51bGwsXG4gICAgICAgICAgICBfYXVkaW9HYWluOiBudWxsLFxuICAgICAgICAgICAgX2NhY2hlZE1lZGlhU3RyZWFtOiBudWxsLFxuXG4gICAgICAgICAgICBfYXVkaW9FbmNvZGVyOiBudWxsLFxuICAgICAgICAgICAgX2xhdGVzdEF1ZGlvQnVmZmVyOiBbXSxcbiAgICAgICAgICAgIF9jYWNoZWRHYWluVmFsdWU6IDEwLFxuXG4gICAgICAgICAgICBfZmZ0U2l6ZTogMjU2LFxuICAgICAgICAgICAgX2ZmdFNtb290aGluZzogMC44LFxuICAgICAgICAgICAgX3RvdGFsTnVtU2FtcGxlczogMCxcbiAgICAgICAgICAgIF9sb2NhbEJ1ZmZlcjogbnVsbCxcbiAgICAgICAgICAgIF9sb2NhbEJ1ZmZlclNpemU6IDAsXG4gICAgICAgICAgICBfYnVmZmVyQXJyYXk6IFtdLFxuICAgICAgICAgICAgX2VuY29kZXI6IG5ldyBXYXZBdWRpb0VuY29kZXIoNDgwMDAsIDEpXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuX2xvY2FsQnVmZmVyID0gbmV3IEZsb2F0MzJBcnJheSg0ODAwMCAqIDEwKTtcblxuICAgICAgICB0aGlzLnBvbHlmaWxsKCk7XG4gICAgfVxuXG4gICAgLy8gVE9ETzogZmlyZWZveCdzIGJ1aWx0LWluIG9nZy1jcmVhdGlvbiByb3V0ZVxuICAgIC8vIEZpcmVmb3ggMjcncyBtYW51YWwgcmVjb3JkaW5nIGRvZXNuJ3Qgd29yay4gc29tZXRoaW5nIGZ1bm55IHdpdGggdGhlaXIgc2FtcGxpbmcgcmF0ZXMgb3IgYnVmZmVyIHNpemVzXG4gICAgLy8gdGhlIGRhdGEgaXMgZmFpcmx5IGdhcmJsZWQsIGxpa2UgdGhleSBhcmUgc2VydmluZyAyMmtoeiBhcyA0NGtoeiBvciBzb21ldGhpbmcgbGlrZSB0aGF0XG4gICAgc3RhcnRBdXRvbWF0aWNFbmNvZGluZyhtZWRpYVN0cmVhbSkge1xuICAgICAgICB0aGlzLl9hdWRpb0VuY29kZXIgPSBuZXcgTWVkaWFSZWNvcmRlcihtZWRpYVN0cmVhbSk7XG5cbiAgICAgICAgdGhpcy5fYXVkaW9FbmNvZGVyLm9uZGF0YWF2YWlsYWJsZSA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkF1ZGlvQ2FwdHVyZTo6c3RhcnRBdXRvbWF0aWNFbmNvZGluZygpOyBNZWRpYVJlY29yZGVyLm9uZGF0YWF2YWlsYWJsZSgpOyBuZXcgYmxvYjogc2l6ZT1cIiArIGUuZGF0YS5zaXplICsgXCIgdHlwZT1cIiArIGUuZGF0YS50eXBlKTtcbiAgICAgICAgICAgIHRoaXMuX2xhdGVzdEF1ZGlvQnVmZmVyLnB1c2goZS5kYXRhKTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLl9hdWRpb0VuY29kZXIub25zdG9wID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJBdWRpb0NhcHR1cmU6OnN0YXJ0QXV0b21hdGljRW5jb2RpbmcoKTsgTWVkaWFSZWNvcmRlci5vbnN0b3AoKTsgaGl0XCIpO1xuXG4gICAgICAgICAgICAvLyBzZW5kIHRoZSBsYXN0IGNhcHR1cmVkIGF1ZGlvIGJ1ZmZlclxuICAgICAgICAgICAgdmFyIGVuY29kZWRfYmxvYiA9IG5ldyBCbG9iKHRoaXMuX2xhdGVzdEF1ZGlvQnVmZmVyLCB7dHlwZTogJ2F1ZGlvL29nZyd9KTtcblxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJBdWRpb0NhcHR1cmU6OnN0YXJ0QXV0b21hdGljRW5jb2RpbmcoKTsgTWVkaWFSZWNvcmRlci5vbnN0b3AoKTsgZ290IGVuY29kZWQgYmxvYjogc2l6ZT1cIiArIGVuY29kZWRfYmxvYi5zaXplICsgXCIgdHlwZT1cIiArIGVuY29kZWRfYmxvYi50eXBlKTtcblxuICAgICAgICAgICAgaWYgKHRoaXMuX29uQ2FwdHVyZUNvbXBsZXRlQ2FsbGJhY2spXG4gICAgICAgICAgICAgICAgdGhpcy5fb25DYXB0dXJlQ29tcGxldGVDYWxsYmFjayhlbmNvZGVkX2Jsb2IpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiQXVkaW9DYXB0dXJlOjpzdGFydEF1dG9tYXRpY0VuY29kaW5nKCk7IE1lZGlhUmVjb3JkZXIuc3RhcnQoKVwiKTtcbiAgICAgICAgdGhpcy5fYXVkaW9FbmNvZGVyLnN0YXJ0KDApO1xuICAgIH1cblxuICAgIGNvbXByZXNzQXVkaW8oZGF0YSkge1xuICAgICAgICB0aGlzLmF1ZGlvQ29udGV4dE9mZmxpbmUgPSBuZXcgT2ZmbGluZUF1ZGlvQ29udGV4dCgxLCA0ODAwMCAqIDMwLCA0ODAwMCk7XG5cbiAgICAgICAgdmFyIHNvdXJjZSA9IHRoaXMuYXVkaW9Db250ZXh0T2ZmbGluZS5jcmVhdGVCdWZmZXJTb3VyY2UoKTtcbiAgICAgICAgdmFyIGF1ZGlvQnVmZmVyID0gdGhpcy5hdWRpb0NvbnRleHRPZmZsaW5lLmNyZWF0ZUJ1ZmZlcigxLCBlLmRhdGEuYnVmZmVyLmxlbmd0aCwgNDQxMDApO1xuICAgICAgICBhdWRpb0J1ZmZlci5nZXRDaGFubmVsRGF0YSgwKS5zZXQoZS5kYXRhLmJ1ZmZlcik7XG5cbiAgICAgICAgc291cmNlLmJ1ZmZlciA9IGF1ZGlvQnVmZmVyO1xuICAgICAgICBzb3VyY2UuY29ubmVjdCh0aGlzLmF1ZGlvQ29udGV4dE9mZmxpbmUuZGVzdGluYXRpb24pO1xuICAgICAgICBzb3VyY2Uuc3RhcnQoKTtcblxuICAgICAgICB0aGlzLl9hdWRpb0xpc3RlbmVyLm9uYXVkaW9wcm9jZXNzID0gKGUpID0+IHtcbiAgICAgICAgICAgIGlmICghdGhpcy5faXNSZWNvcmRpbmcpIHJldHVybjtcblxuICAgICAgICAgICAgdGhpcy5fZW5jb2Rlci5lbmNvZGUoW2UuaW5wdXRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCldKTtcblxuICAgICAgICAgICAgdGhpcy5fdG90YWxOdW1TYW1wbGVzICs9IG1zZy5sZWZ0Lmxlbmd0aDtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBjcmVhdGVBdWRpb0NvbnRleHQobWVkaWFTdHJlYW0pIHtcbiAgICAgICAgLy8gYnVpbGQgY2FwdHVyZSBncmFwaFxuICAgICAgICB0aGlzLl9hdWRpb0NvbnRleHQgPSBuZXcgd2luZG93LkF1ZGlvQ29udGV4dCgpO1xuICAgICAgICB0aGlzLl9hdWRpb0lucHV0ID0gdGhpcy5fYXVkaW9Db250ZXh0LmNyZWF0ZU1lZGlhU3RyZWFtU291cmNlKG1lZGlhU3RyZWFtKTtcbiAgICAgICAgLy90aGlzLl9hdWRpb0Rlc3RpbmF0aW9uID0gdGhpcy5fYXVkaW9Db250ZXh0LmNyZWF0ZU1lZGlhU3RyZWFtRGVzdGluYXRpb24oKTtcblxuICAgICAgICAvL3RoaXMuX2F1ZGlvT2ZmbGluZUNvbnRleHQgPSBuZXcgT2ZmbGluZUF1ZGlvQ29udGV4dCgxLCA0ODAwMCAqIDMwLCA0ODAwMCk7XG4gICAgICAgIHRoaXMuX2F1ZGlvRGVzdGluYXRpb24gPSB0aGlzLl9hdWRpb0NvbnRleHQuZGVzdGluYXRpb247XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJBdWRpb0NhcHR1cmU6OnN0YXJ0TWFudWFsRW5jb2RpbmcoKTsgX2F1ZGlvQ29udGV4dC5zYW1wbGVSYXRlOiBcIiArIHRoaXMuX2F1ZGlvQ29udGV4dC5zYW1wbGVSYXRlICsgXCIgSHpcIik7XG5cbiAgICAgICAgLy8gY3JlYXRlIGEgbGlzdGVuZXIgbm9kZSB0byBncmFiIG1pY3JvcGhvbmUgc2FtcGxlcyBhbmQgZmVlZCBpdCB0byBvdXIgYmFja2dyb3VuZCB3b3JrZXJcbiAgICAgICAgdGhpcy5fYXVkaW9MaXN0ZW5lciA9IHRoaXMuX2F1ZGlvQ29udGV4dC5jcmVhdGVTY3JpcHRQcm9jZXNzb3IoMTYzODQsIDEsIDEpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwidGhpcy5fY2FjaGVkR2FpblZhbHVlID0gXCIgKyB0aGlzLl9jYWNoZWRHYWluVmFsdWUpO1xuXG4gICAgICAgIHRoaXMuX2F1ZGlvR2FpbiA9IHRoaXMuX2F1ZGlvQ29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgICAgIHRoaXMuX2F1ZGlvR2Fpbi5nYWluLnZhbHVlID0gdGhpcy5fY2FjaGVkR2FpblZhbHVlO1xuXG4gICAgICAgIC8vdGhpcy5fYXVkaW9BbmFseXplciA9IHRoaXMuX2F1ZGlvQ29udGV4dC5jcmVhdGVBbmFseXNlcigpO1xuICAgICAgICAvL3RoaXMuX2F1ZGlvQW5hbHl6ZXIuZmZ0U2l6ZSA9IHRoaXMuX2ZmdFNpemU7XG4gICAgICAgIC8vdGhpcy5fYXVkaW9BbmFseXplci5zbW9vdGhpbmdUaW1lQ29uc3RhbnQgPSB0aGlzLl9mZnRTbW9vdGhpbmc7XG4gICAgfVxuXG4gICAgc3RhcnRNYW51YWxFbmNvZGluZyhtZWRpYVN0cmVhbSkge1xuXG4gICAgICAgIGlmICghdGhpcy5fYXVkaW9Db250ZXh0KSB7XG4gICAgICAgICAgICB0aGlzLmNyZWF0ZUF1ZGlvQ29udGV4dChtZWRpYVN0cmVhbSk7XG4gICAgICAgIH1cblxuICAgICAgICAvL2lmICghdGhpcy5fZW5jb2RpbmdXb3JrZXIpXG4gICAgICAgIC8vICAgIHRoaXMuX2VuY29kaW5nV29ya2VyID0gbmV3IFdvcmtlcihcIi9hc3NldHMvanMvd29ya2VyLWVuY29kZXIubWluLmpzXCIpO1xuXG4gICAgICAgIC8vIHJlLWhvb2sgYXVkaW8gbGlzdGVuZXIgbm9kZSBldmVyeSB0aW1lIHdlIHN0YXJ0LCBiZWNhdXNlIF9lbmNvZGluZ1dvcmtlciByZWZlcmVuY2Ugd2lsbCBjaGFuZ2VcbiAgICAgICAgdGhpcy5fYXVkaW9MaXN0ZW5lci5vbmF1ZGlvcHJvY2VzcyA9IChlKSA9PiB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuX2lzUmVjb3JkaW5nKSByZXR1cm47XG5cbiAgICAgICAgICAgIC8vdGhpcy5fZW5jb2Rlci5lbmNvZGUoW2UuaW5wdXRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCldKTtcblxuICAgICAgICAgICAgdmFyIHNyYyA9IGUuaW5wdXRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCk7XG4gICAgICAgICAgICAvL3ZhciBzcmMyID0gZS5pbnB1dEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgxKTtcbiAgICAgICAgICAgIHZhciBidWYgPSBuZXcgRmxvYXQzMkFycmF5KHNyYy5sZW5ndGgpO1xuXG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiZnJhbWVzPVwiICsgc3JjLmxlbmd0aCArIFwiIGR1cmF0aW9uPVwiICsgZS5pbnB1dEJ1ZmZlci5kdXJhdGlvbiArIFwiIGNoYW5uZWxzPVwiICsgZS5pbnB1dEJ1ZmZlci5udW1iZXJPZkNoYW5uZWxzKTtcblxuICAgICAgICAgICAgZS5pbnB1dEJ1ZmZlci5jb3B5RnJvbUNoYW5uZWwoYnVmLCAwLCAwKTtcblxuICAgICAgICAgICAgLy9mb3IgKHZhciBpID0gMDsgaSA8IHNyYy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgLy8gICAgdGhpcy5fbG9jYWxCdWZmZXJbdGhpcy5fbG9jYWxCdWZmZXJTaXplKytdID0gc3JjW2ldO1xuICAgICAgICAgICAgLy8gICAgLy9idWZbaV0gPSBzcmNbaV07XG4gICAgICAgICAgICAvLyAgICAvL2J1ZltpXSA9IE1hdGguc2luKDQwMCAqIGkgLyBidWYubGVuZ3RoKTtcbiAgICAgICAgICAgIC8vfVxuXG4gICAgICAgICAgICAvL2ZvciAodmFyIGkgPSAwOyBpIDwgYnVmLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAvLyAgICBidWZbaV0gKz0gTWF0aC5zaW4oNDQwICogaSAvIGJ1Zi5sZW5ndGgpIC8gMy4wO1xuICAgICAgICAgICAgLy99XG5cbiAgICAgICAgICAgIC8vZm9yICh2YXIgaSA9IDA7IGkgPCBidWYubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIC8vICAgIGJ1ZltpXSA9IHNyY1tpXTtcbiAgICAgICAgICAgIC8vfVxuXG4gICAgICAgICAgICB0aGlzLl9idWZmZXJBcnJheS5wdXNoKGJ1Zik7XG5cbiAgICAgICAgICAgIC8vZm9yICh2YXIgaSA9IDA7IGkgPCBidWYubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIC8vICAgIHRoaXMuX2xvY2FsQnVmZmVyW3RoaXMuX2xvY2FsQnVmZmVyU2l6ZSsrXSA9IGJ1ZltpXTtcbiAgICAgICAgICAgIC8vfVxuXG4gICAgICAgICAgICAvL3RoaXMuX3RvdGFsTnVtU2FtcGxlcyArPSBtc2cubGVmdC5sZW5ndGg7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gVE9ETzogaXQgbWlnaHQgYmUgYmV0dGVyIHRvIGxpc3RlbiBmb3IgYSBtZXNzYWdlIGJhY2sgZnJvbSB0aGUgYmFja2dyb3VuZCB3b3JrZXIgYmVmb3JlIGNvbnNpZGVyaW5nIHRoYXQgcmVjb3JkaW5nIGhhcyBiZWdhblxuICAgICAgICAvLyBpdCdzIGVhc2llciB0byB0cmltIGF1ZGlvIHRoYW4gY2FwdHVyZSBhIG1pc3Npbmcgd29yZCBhdCB0aGUgc3RhcnQgb2YgYSBzZW50ZW5jZVxuICAgICAgICB0aGlzLl9pc1JlY29yZGluZyA9IGZhbHNlO1xuXG4gICAgICAgIC8vIGNvbm5lY3QgYXVkaW8gbm9kZXNcbiAgICAgICAgLy8gYXVkaW8taW5wdXQgLT4gZ2FpbiAtPiBmZnQtYW5hbHl6ZXIgLT4gUENNLWRhdGEgY2FwdHVyZSAtPiBkZXN0aW5hdGlvblxuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiQXVkaW9DYXB0dXJlOjpzdGFydE1hbnVhbEVuY29kaW5nKCk7IENvbm5lY3RpbmcgQXVkaW8gTm9kZXMuLlwiKTtcblxuICAgICAgICBjb25zb2xlLmxvZyhcImNvbm5lY3Rpbmc6IGlucHV0LT5nYWluXCIpO1xuICAgICAgICAvL3RoaXMuX2F1ZGlvSW5wdXQuY29ubmVjdCh0aGlzLl9hdWRpb0dhaW4pO1xuICAgICAgICAvL2NvbnNvbGUubG9nKFwiY29ubmVjdGluZzogZ2Fpbi0+YW5hbHl6ZXJcIik7XG4gICAgICAgIC8vdGhpcy5fYXVkaW9HYWluLmNvbm5lY3QodGhpcy5fYXVkaW9BbmFseXplcik7XG4gICAgICAgIC8vY29uc29sZS5sb2coXCJjb25uZWN0aW5nOiBhbmFseXplci0+bGlzdGVzbmVyXCIpO1xuICAgICAgICAvL3RoaXMuX2F1ZGlvQW5hbHl6ZXIuY29ubmVjdCh0aGlzLl9hdWRpb0xpc3RlbmVyKTtcbiAgICAgICAgLy8gY29ubmVjdCBnYWluIGRpcmVjdGx5IGludG8gbGlzdGVuZXIsIGJ5cGFzc2luZyBhbmFseXplclxuICAgICAgICBjb25zb2xlLmxvZyhcImNvbm5lY3Rpbmc6IGdhaW4tPmxpc3RlbmVyXCIpO1xuICAgICAgICB0aGlzLl9hdWRpb0lucHV0LmNvbm5lY3QodGhpcy5fYXVkaW9MaXN0ZW5lcik7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiY29ubmVjdGluZzogbGlzdGVuZXItPmRlc3RpbmF0aW9uXCIpO1xuICAgICAgICB0aGlzLl9hdWRpb0xpc3RlbmVyLmNvbm5lY3QodGhpcy5fYXVkaW9EZXN0aW5hdGlvbik7XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgc2h1dGRvd25NYW51YWxFbmNvZGluZygpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJBdWRpb0NhcHR1cmU6OnNodXRkb3duTWFudWFsRW5jb2RpbmcoKTsgVGVhcmluZyBkb3duIEF1ZGlvQVBJIGNvbm5lY3Rpb25zLi5cIik7XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJkaXNjb25uZWN0aW5nOiBsaXN0ZW5lci0+ZGVzdGluYXRpb25cIik7XG4gICAgICAgIHRoaXMuX2F1ZGlvTGlzdGVuZXIuZGlzY29ubmVjdCh0aGlzLl9hdWRpb0Rlc3RpbmF0aW9uKTtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcImRpc2Nvbm5lY3Rpbmc6IGFuYWx5emVyLT5saXN0ZXNuZXJcIik7XG4gICAgICAgIC8vdGhpcy5fYXVkaW9BbmFseXplci5kaXNjb25uZWN0KHRoaXMuX2F1ZGlvTGlzdGVuZXIpO1xuICAgICAgICAvL2NvbnNvbGUubG9nKFwiZGlzY29ubmVjdGluZzogZ2Fpbi0+YW5hbHl6ZXJcIik7XG4gICAgICAgIC8vdGhpcy5fYXVkaW9HYWluLmRpc2Nvbm5lY3QodGhpcy5fYXVkaW9BbmFseXplcik7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiZGlzY29ubmVjdGluZzogZ2Fpbi0+bGlzdGVuZXJcIik7XG4gICAgICAgIHRoaXMuX2F1ZGlvSW5wdXQuZGlzY29ubmVjdCh0aGlzLl9hdWRpb0xpc3RlbmVyKTtcbiAgICAgICAgY29uc29sZS5sb2coXCJkaXNjb25uZWN0aW5nOiBpbnB1dC0+Z2FpblwiKTtcbiAgICAgICAgLy90aGlzLl9hdWRpb0lucHV0LmRpc2Nvbm5lY3QodGhpcy5fYXVkaW9HYWluKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUaGUgbWljcm9waG9uZSBtYXkgYmUgbGl2ZSwgYnV0IGl0IGlzbid0IHJlY29yZGluZy4gVGhpcyB0b2dnbGVzIHRoZSBhY3R1YWwgd3JpdGluZyB0byB0aGUgY2FwdHVyZSBzdHJlYW0uXG4gICAgICogY2FwdHVyZUF1ZGlvU2FtcGxlcyBib29sIGluZGljYXRlcyB3aGV0aGVyIHRvIHJlY29yZCBmcm9tIG1pY1xuICAgICAqL1xuICAgIHRvZ2dsZU1pY3JvcGhvbmVSZWNvcmRpbmcoY2FwdHVyZUF1ZGlvU2FtcGxlcykge1xuICAgICAgICB0aGlzLl9pc1JlY29yZGluZyA9IGNhcHR1cmVBdWRpb1NhbXBsZXM7XG4gICAgfVxuXG4gICAgLy8gY2FsbGVkIHdoZW4gdXNlciBhbGxvd3MgdXMgdXNlIG9mIHRoZWlyIG1pY3JvcGhvbmVcbiAgICBvbk1pY3JvcGhvbmVQcm92aWRlZChtZWRpYVN0cmVhbSwgb25TdGFydGVkQ2FsbGJhY2spIHtcblxuICAgICAgICB0aGlzLl9jYWNoZWRNZWRpYVN0cmVhbSA9IG1lZGlhU3RyZWFtO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwibWVkaWFTdHJlYW0uZ2V0QXVkaW9UcmFja3NcIiwgbWVkaWFTdHJlYW0uZ2V0QXVkaW9UcmFja3MoKSk7XG5cbiAgICAgICAgLy8gd2UgY291bGQgY2hlY2sgaWYgdGhlIGJyb3dzZXIgY2FuIHBlcmZvcm0gaXRzIG93biBlbmNvZGluZyBhbmQgdXNlIHRoYXRcbiAgICAgICAgLy8gRmlyZWZveCBjYW4gcHJvdmlkZSB1cyBvZ2crc3BlZXggb3Igb2dnK29wdXM/IGZpbGVzLCBidXQgdW5mb3J0dW5hdGVseSB0aGF0IGNvZGVjIGlzbid0IHN1cHBvcnRlZCB3aWRlbHkgZW5vdWdoXG4gICAgICAgIC8vIHNvIGluc3RlYWQgd2UgcGVyZm9ybSBtYW51YWwgZW5jb2RpbmcgZXZlcnl3aGVyZSByaWdodCBub3cgdG8gZ2V0IHVzIG9nZyt2b3JiaXNcbiAgICAgICAgLy8gdGhvdWdoIG9uZSBkYXksIGkgd2FudCBvZ2crb3B1cyEgb3B1cyBoYXMgYSB3b25kZXJmdWwgcmFuZ2Ugb2YgcXVhbGl0eSBzZXR0aW5ncyBwZXJmZWN0IGZvciB0aGlzIHByb2plY3RcblxuICAgICAgICAvL2lmIChmYWxzZSAmJiB0eXBlb2YoTWVkaWFSZWNvcmRlcikgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgLy8gICAgdGhpcy5zdGFydEF1dG9tYXRpY0VuY29kaW5nKG1lZGlhU3RyZWFtKTtcbiAgICAgICAgLy99IGVsc2Uge1xuICAgICAgICAvLyAgICAvLyBubyBtZWRpYSByZWNvcmRlciBhdmFpbGFibGUsIGRvIGl0IG1hbnVhbGx5XG4gICAgICAgIC8vICAgIHRoaXMuc3RhcnRNYW51YWxFbmNvZGluZyhtZWRpYVN0cmVhbSk7XG4gICAgICAgIC8vfVxuXG4gICAgICAgIHRoaXMuc3RhcnRNYW51YWxFbmNvZGluZyhtZWRpYVN0cmVhbSk7XG5cbiAgICAgICAgLy8gVE9ETzogbWlnaHQgYmUgYSBnb29kIHRpbWUgdG8gc3RhcnQgYSBzcGVjdHJhbCBhbmFseXplclxuICAgICAgICBpZiAob25TdGFydGVkQ2FsbGJhY2spXG4gICAgICAgICAgICBvblN0YXJ0ZWRDYWxsYmFjaygpO1xuICAgIH1cblxuICAgIHNldEdhaW4oZ2Fpbikge1xuICAgICAgICBpZiAodGhpcy5fYXVkaW9HYWluKVxuICAgICAgICAgICAgdGhpcy5fYXVkaW9HYWluLmdhaW4udmFsdWUgPSBnYWluO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwic2V0dGluZyBnYWluOiBcIiArIGdhaW4pO1xuICAgICAgICB0aGlzLl9jYWNoZWRHYWluVmFsdWUgPSBnYWluO1xuICAgIH1cblxuICAgIHBvbHlmaWxsKCkge1xuICAgICAgICB3aW5kb3cuQXVkaW9Db250ZXh0ID0gd2luZG93LkF1ZGlvQ29udGV4dCB8fCB3aW5kb3cud2Via2l0QXVkaW9Db250ZXh0IHx8IGZhbHNlO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwibmF2aWdhdG9yIFwiLCBuYXZpZ2F0b3IpO1xuICAgICAgICBjb25zb2xlLmxvZyhcIm5hdmlnYXRvci5tZWRpYURldmljZSA9IFwiLCBuYXZpZ2F0b3IubWVkaWFEZXZpY2UpO1xuXG4gICAgICAgIGlmIChuYXZpZ2F0b3IubWVkaWFEZXZpY2UgPT0gbnVsbCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJwb2x5ZmlsbGluZyBtZWRpYURldmljZS5nZXRVc2VyTWVkaWFcIik7XG4gICAgICAgICAgICBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhID0gbmF2aWdhdG9yLmdldFVzZXJNZWRpYSB8fCBuYXZpZ2F0b3Iud2Via2l0R2V0VXNlck1lZGlhIHx8IG5hdmlnYXRvci5tb3pHZXRVc2VyTWVkaWEgfHwgbmF2aWdhdG9yLm1zR2V0VXNlck1lZGlhIHx8IGZhbHNlO1xuICAgICAgICAgICAgbmF2aWdhdG9yLm1lZGlhRGV2aWNlID0ge1xuICAgICAgICAgICAgICAgIGdldFVzZXJNZWRpYTogKHByb3BzKSA9PiBuZXcgUHJvbWlzZSgoeSwgbikgPT4gbmF2aWdhdG9yLmdldFVzZXJNZWRpYShwcm9wcywgeSwgbikpXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIW5hdmlnYXRvci5nZXRVc2VyTWVkaWEpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJBdWRpb0NhcHR1cmU6OnBvbHlmaWxsKCk7IGdldFVzZXJNZWRpYSgpIG5vdCBzdXBwb3J0ZWQuXCIpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJlbG9hZE1lZGlhU3RyZWFtKCkge1xuICAgICAgICBpZiAodGhpcy5fY2FjaGVkTWVkaWFTdHJlYW0pXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgbmF2aWdhdG9yLm1lZGlhRGV2aWNlLmdldFVzZXJNZWRpYSh7YXVkaW86IHRydWUsIHZpZGVvOiBmYWxzZSwgc3RlcmVvOiBmYWxzZSxcbiAgICAgICAgICAgIGdvb2dFY2hvQ2FuY2VsbGF0aW9uOiBmYWxzZSwgZ29vZ05vaXNlU3VwcHJlc3Npb246IGZhbHNlLCBnb29nTm9pc2VSZWR1Y3Rpb246IGZhbHNlLCBnb29nVHlwaW5nTm9pc2VEZXRlY3Rpb246IGZhbHNlLFxuICAgICAgICAgICAgZ29vZ0F1ZGlvTWlycm9yaW5nOiBmYWxzZSwgZ29vZ0F1dG9HYWluQ29udHJvbDI6IGZhbHNlLCBnb29nRWNob0NhbmNlbGxhdGlvbjI6IGZhbHNlLCBnb29nQXV0b0dhaW5Db250cm9sOiBmYWxzZSwgZ29vZ0xlYWt5QnVja2V0OiBmYWxzZVxuICAgICAgICB9KVxuICAgICAgICAgICAgLnRoZW4oKG1zKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fY2FjaGVkTWVkaWFTdHJlYW0gPSBtcztcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihcIkF1ZGlvQ2FwdHVyZTo6cHJlbG9hZE1lZGlhU3RyZWFtKCk7IGNvdWxkIG5vdCBncmFiIG1pY3JvcGhvbmUuIHBlcmhhcHMgdXNlciBkaWRuJ3QgZ2l2ZSB1cyBwZXJtaXNzaW9uP1wiLCBlcnIpO1xuICAgICAgICAgICAgfSlcbiAgICB9O1xuXG4gICAgc3RhcnQob25TdGFydGVkQ2FsbGJhY2spIHtcbiAgICAgICAgaWYgKHRoaXMuX2NhY2hlZE1lZGlhU3RyZWFtKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMub25NaWNyb3Bob25lUHJvdmlkZWQodGhpcy5fY2FjaGVkTWVkaWFTdHJlYW0sIG9uU3RhcnRlZENhbGxiYWNrKTtcblxuICAgICAgICBuYXZpZ2F0b3IubWVkaWFEZXZpY2UuZ2V0VXNlck1lZGlhKHthdWRpbzogdHJ1ZX0pXG4gICAgICAgICAgICAudGhlbigobXMpID0+IHRoaXMub25NaWNyb3Bob25lUHJvdmlkZWQobXMsIG9uU3RhcnRlZENhbGxiYWNrKSlcbiAgICAgICAgICAgIC5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFwiQXVkaW9DYXB0dXJlOjpzdGFydCgpOyBjb3VsZCBub3QgZ3JhYiBtaWNyb3Bob25lLiBwZXJoYXBzIHVzZXIgZGlkbid0IGdpdmUgdXMgcGVybWlzc2lvbj9cIiwgZXJyKTtcbiAgICAgICAgICAgIH0pXG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgc3RvcChjYXB0dXJlQ29tcGxldGVDYWxsYmFjaykge1xuICAgICAgICB0aGlzLl9vbkNhcHR1cmVDb21wbGV0ZUNhbGxiYWNrID0gY2FwdHVyZUNvbXBsZXRlQ2FsbGJhY2s7XG4gICAgICAgIHRoaXMuX2lzUmVjb3JkaW5nID0gZmFsc2U7XG5cbiAgICAgICAgaWYgKHRoaXMuX2F1ZGlvQ29udGV4dCkge1xuICAgICAgICAgICAgLy8gc3RvcCB0aGUgbWFudWFsIGVuY29kZXJcbiAgICAgICAgICAgIC8vdGhpcy5fZW5jb2RpbmdXb3JrZXIucG9zdE1lc3NhZ2Uoe2FjdGlvbjogXCJmaW5pc2hcIn0pO1xuICAgICAgICAgICAgdGhpcy5zaHV0ZG93bk1hbnVhbEVuY29kaW5nKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5fYXVkaW9FbmNvZGVyKSB7XG4gICAgICAgICAgICAvLyBzdG9wIHRoZSBhdXRvbWF0aWMgZW5jb2RlclxuXG4gICAgICAgICAgICBpZiAodGhpcy5fYXVkaW9FbmNvZGVyLnN0YXRlICE9PSAncmVjb3JkaW5nJykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihcIkF1ZGlvQ2FwdHVyZTo6c3RvcCgpOyBfYXVkaW9FbmNvZGVyLnN0YXRlICE9ICdyZWNvcmRpbmcnXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLl9hdWRpb0VuY29kZXIucmVxdWVzdERhdGEoKTtcbiAgICAgICAgICAgIHRoaXMuX2F1ZGlvRW5jb2Rlci5zdG9wKCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zb2xlLmxvZyhcIl9idWZmZXJBcnJheSA9IFwiICsgdGhpcy5fYnVmZmVyQXJyYXkubGVuZ3RoKTtcblxuICAgICAgICAvL3ZhciBidWZzID0gW107XG4gICAgICAgIC8vXG4gICAgICAgIC8vZm9yKCB2YXIgYSA9IDA7IGEgPCA1OyBhKyspIHtcbiAgICAgICAgLy8gICAgdmFyIGJ1ZiA9IG5ldyBGbG9hdDMyQXJyYXkoNDQxMDApO1xuICAgICAgICAvL1xuICAgICAgICAvLyAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJ1Zi5sZW5ndGg7IGkrKykge1xuICAgICAgICAvLyAgICAgICAgdmFyIHNlY29uZCA9IChpIC8gYnVmLmxlbmd0aCk7XG4gICAgICAgIC8vICAgICAgICBidWZbaV0gPSBNYXRoLnNpbigyLjAgKiBNYXRoLlBJICogNDQwICogc2Vjb25kKTtcbiAgICAgICAgLy8gICAgfVxuICAgICAgICAvL1xuICAgICAgICAvLyAgICBidWZzLnB1c2goYnVmKTtcbiAgICAgICAgLy99XG5cbiAgICAgICAgdGhpcy5fZW5jb2RlciA9IG5ldyBXYXZBdWRpb0VuY29kZXIoNDgwMDAsIDEpO1xuXG4gICAgICAgIHRoaXMuX2VuY29kZXIuZW5jb2RlKHRoaXMuX2J1ZmZlckFycmF5KTtcblxuICAgICAgICB2YXIgZW5jb2RlZF9ibG9iID0gdGhpcy5fZW5jb2Rlci5maW5pc2goXCJhdWRpby93YXZcIik7XG5cbiAgICAgICAgaWYgKHRoaXMuX29uQ2FwdHVyZUNvbXBsZXRlQ2FsbGJhY2spXG4gICAgICAgICAgICB0aGlzLl9vbkNhcHR1cmVDb21wbGV0ZUNhbGxiYWNrKGVuY29kZWRfYmxvYik7XG5cbiAgICAgICAgLy8gVE9ETzogc3RvcCBhbnkgYWN0aXZlIHNwZWN0cmFsIGFuYWx5c2lzXG4gICAgfTtcbn1cblxuLy8gdW51c2VkIGF0IHRoZSBtb21lbnRcbmZ1bmN0aW9uIEFuYWx5emVyKCkge1xuXG4gICAgdmFyIF9hdWRpb0NhbnZhc0FuaW1hdGlvbklkLFxuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhc1xuICAgICAgICA7XG5cbiAgICB0aGlzLnN0YXJ0QW5hbHl6ZXJVcGRhdGVzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB1cGRhdGVBbmFseXplcigpO1xuICAgIH07XG5cbiAgICB0aGlzLnN0b3BBbmFseXplclVwZGF0ZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghX2F1ZGlvQ2FudmFzQW5pbWF0aW9uSWQpXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lKF9hdWRpb0NhbnZhc0FuaW1hdGlvbklkKTtcbiAgICAgICAgX2F1ZGlvQ2FudmFzQW5pbWF0aW9uSWQgPSBudWxsO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiB1cGRhdGVBbmFseXplcigpIHtcblxuICAgICAgICBpZiAoIV9hdWRpb1NwZWN0cnVtQ2FudmFzKVxuICAgICAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInJlY29yZGluZy12aXN1YWxpemVyXCIpLmdldENvbnRleHQoXCIyZFwiKTtcblxuICAgICAgICB2YXIgZnJlcURhdGEgPSBuZXcgVWludDhBcnJheShfYXVkaW9BbmFseXplci5mcmVxdWVuY3lCaW5Db3VudCk7XG4gICAgICAgIF9hdWRpb0FuYWx5emVyLmdldEJ5dGVGcmVxdWVuY3lEYXRhKGZyZXFEYXRhKTtcblxuICAgICAgICB2YXIgbnVtQmFycyA9IF9hdWRpb0FuYWx5emVyLmZyZXF1ZW5jeUJpbkNvdW50O1xuICAgICAgICB2YXIgYmFyV2lkdGggPSBNYXRoLmZsb29yKF9jYW52YXNXaWR0aCAvIG51bUJhcnMpIC0gX2ZmdEJhclNwYWNpbmc7XG5cblxuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb24gPSBcInNvdXJjZS1vdmVyXCI7XG5cbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuY2xlYXJSZWN0KDAsIDAsIF9jYW52YXNXaWR0aCwgX2NhbnZhc0hlaWdodCk7XG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmZpbGxTdHlsZSA9ICcjZjZkNTY1JztcbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMubGluZUNhcCA9ICdyb3VuZCc7XG5cbiAgICAgICAgdmFyIHgsIHksIHcsIGg7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBudW1CYXJzOyBpKyspIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IGZyZXFEYXRhW2ldO1xuICAgICAgICAgICAgdmFyIHNjYWxlZF92YWx1ZSA9ICh2YWx1ZSAvIDI1NikgKiBfY2FudmFzSGVpZ2h0O1xuXG4gICAgICAgICAgICB4ID0gaSAqIChiYXJXaWR0aCArIF9mZnRCYXJTcGFjaW5nKTtcbiAgICAgICAgICAgIHkgPSBfY2FudmFzSGVpZ2h0IC0gc2NhbGVkX3ZhbHVlO1xuICAgICAgICAgICAgdyA9IGJhcldpZHRoO1xuICAgICAgICAgICAgaCA9IHNjYWxlZF92YWx1ZTtcblxuICAgICAgICAgICAgdmFyIGdyYWRpZW50ID0gX2F1ZGlvU3BlY3RydW1DYW52YXMuY3JlYXRlTGluZWFyR3JhZGllbnQoeCwgX2NhbnZhc0hlaWdodCwgeCwgeSk7XG4gICAgICAgICAgICBncmFkaWVudC5hZGRDb2xvclN0b3AoMS4wLCBcInJnYmEoMCwwLDAsMS4wKVwiKTtcbiAgICAgICAgICAgIGdyYWRpZW50LmFkZENvbG9yU3RvcCgwLjAsIFwicmdiYSgwLDAsMCwxLjApXCIpO1xuXG4gICAgICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5maWxsU3R5bGUgPSBncmFkaWVudDtcbiAgICAgICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmZpbGxSZWN0KHgsIHksIHcsIGgpO1xuXG4gICAgICAgICAgICBpZiAoc2NhbGVkX3ZhbHVlID4gX2hpdEhlaWdodHNbaV0pIHtcbiAgICAgICAgICAgICAgICBfaGl0VmVsb2NpdGllc1tpXSArPSAoc2NhbGVkX3ZhbHVlIC0gX2hpdEhlaWdodHNbaV0pICogNjtcbiAgICAgICAgICAgICAgICBfaGl0SGVpZ2h0c1tpXSA9IHNjYWxlZF92YWx1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgX2hpdFZlbG9jaXRpZXNbaV0gLT0gNDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgX2hpdEhlaWdodHNbaV0gKz0gX2hpdFZlbG9jaXRpZXNbaV0gKiAwLjAxNjtcblxuICAgICAgICAgICAgaWYgKF9oaXRIZWlnaHRzW2ldIDwgMClcbiAgICAgICAgICAgICAgICBfaGl0SGVpZ2h0c1tpXSA9IDA7XG4gICAgICAgIH1cblxuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb24gPSBcInNvdXJjZS1hdG9wXCI7XG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmRyYXdJbWFnZShfY2FudmFzQmcsIDAsIDApO1xuXG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbiA9IFwic291cmNlLW92ZXJcIjtcbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZmlsbFN0eWxlID0gXCJyZ2JhKDI1NSwyNTUsMjU1LDAuNylcIjtcblxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbnVtQmFyczsgaSsrKSB7XG4gICAgICAgICAgICB4ID0gaSAqIChiYXJXaWR0aCArIF9mZnRCYXJTcGFjaW5nKTtcbiAgICAgICAgICAgIHkgPSBfY2FudmFzSGVpZ2h0IC0gTWF0aC5yb3VuZChfaGl0SGVpZ2h0c1tpXSkgLSAyO1xuICAgICAgICAgICAgdyA9IGJhcldpZHRoO1xuICAgICAgICAgICAgaCA9IGJhcldpZHRoO1xuXG4gICAgICAgICAgICBpZiAoX2hpdEhlaWdodHNbaV0gPT09IDApXG4gICAgICAgICAgICAgICAgY29udGludWU7XG5cbiAgICAgICAgICAgIC8vX2F1ZGlvU3BlY3RydW1DYW52YXMuZmlsbFN0eWxlID0gXCJyZ2JhKDI1NSwgMjU1LCAyNTUsXCIrIE1hdGgubWF4KDAsIDEgLSBNYXRoLmFicyhfaGl0VmVsb2NpdGllc1tpXS8xNTApKSArIFwiKVwiO1xuICAgICAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZmlsbFJlY3QoeCwgeSwgdywgaCk7XG4gICAgICAgIH1cblxuICAgICAgICBfYXVkaW9DYW52YXNBbmltYXRpb25JZCA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUodXBkYXRlQW5hbHl6ZXIpO1xuICAgIH1cblxuICAgIHZhciBfY2FudmFzV2lkdGgsIF9jYW52YXNIZWlnaHQ7XG4gICAgdmFyIF9mZnRTaXplID0gMjU2O1xuICAgIHZhciBfZmZ0U21vb3RoaW5nID0gMC44O1xuICAgIHZhciBfZmZ0QmFyU3BhY2luZyA9IDE7XG5cbiAgICB2YXIgX2hpdEhlaWdodHMgPSBbXTtcbiAgICB2YXIgX2hpdFZlbG9jaXRpZXMgPSBbXTtcblxuICAgIHRoaXMudGVzdENhbnZhcyA9IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICB2YXIgY2FudmFzQ29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyZWNvcmRpbmctdmlzdWFsaXplclwiKTtcblxuICAgICAgICBfY2FudmFzV2lkdGggPSBjYW52YXNDb250YWluZXIud2lkdGg7XG4gICAgICAgIF9jYW52YXNIZWlnaHQgPSBjYW52YXNDb250YWluZXIuaGVpZ2h0O1xuXG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzID0gY2FudmFzQ29udGFpbmVyLmdldENvbnRleHQoXCIyZFwiKTtcbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uID0gXCJzb3VyY2Utb3ZlclwiO1xuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5maWxsU3R5bGUgPSBcInJnYmEoMCwwLDAsMClcIjtcbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZmlsbFJlY3QoMCwgMCwgX2NhbnZhc1dpZHRoLCBfY2FudmFzSGVpZ2h0KTtcblxuICAgICAgICB2YXIgbnVtQmFycyA9IF9mZnRTaXplIC8gMjtcbiAgICAgICAgdmFyIGJhclNwYWNpbmcgPSBfZmZ0QmFyU3BhY2luZztcbiAgICAgICAgdmFyIGJhcldpZHRoID0gTWF0aC5mbG9vcihfY2FudmFzV2lkdGggLyBudW1CYXJzKSAtIGJhclNwYWNpbmc7XG5cbiAgICAgICAgdmFyIHgsIHksIHcsIGgsIGk7XG5cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IG51bUJhcnM7IGkrKykge1xuICAgICAgICAgICAgX2hpdEhlaWdodHNbaV0gPSBfY2FudmFzSGVpZ2h0IC0gMTtcbiAgICAgICAgICAgIF9oaXRWZWxvY2l0aWVzW2ldID0gMDtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBudW1CYXJzOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBzY2FsZWRfdmFsdWUgPSBNYXRoLmFicyhNYXRoLnNpbihNYXRoLlBJICogNiAqIChpIC8gbnVtQmFycykpKSAqIF9jYW52YXNIZWlnaHQ7XG5cbiAgICAgICAgICAgIHggPSBpICogKGJhcldpZHRoICsgYmFyU3BhY2luZyk7XG4gICAgICAgICAgICB5ID0gX2NhbnZhc0hlaWdodCAtIHNjYWxlZF92YWx1ZTtcbiAgICAgICAgICAgIHcgPSBiYXJXaWR0aDtcbiAgICAgICAgICAgIGggPSBzY2FsZWRfdmFsdWU7XG5cbiAgICAgICAgICAgIHZhciBncmFkaWVudCA9IF9hdWRpb1NwZWN0cnVtQ2FudmFzLmNyZWF0ZUxpbmVhckdyYWRpZW50KHgsIF9jYW52YXNIZWlnaHQsIHgsIHkpO1xuICAgICAgICAgICAgZ3JhZGllbnQuYWRkQ29sb3JTdG9wKDEuMCwgXCJyZ2JhKDAsMCwwLDAuMClcIik7XG4gICAgICAgICAgICBncmFkaWVudC5hZGRDb2xvclN0b3AoMC4wLCBcInJnYmEoMCwwLDAsMS4wKVwiKTtcblxuICAgICAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZmlsbFN0eWxlID0gZ3JhZGllbnQ7XG4gICAgICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5maWxsUmVjdCh4LCB5LCB3LCBoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbiA9IFwic291cmNlLWF0b3BcIjtcbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZHJhd0ltYWdlKF9jYW52YXNCZywgMCwgMCk7XG5cbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uID0gXCJzb3VyY2Utb3ZlclwiO1xuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5maWxsU3R5bGUgPSBcIiNmZmZmZmZcIjtcblxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbnVtQmFyczsgaSsrKSB7XG4gICAgICAgICAgICB4ID0gaSAqIChiYXJXaWR0aCArIGJhclNwYWNpbmcpO1xuICAgICAgICAgICAgeSA9IF9jYW52YXNIZWlnaHQgLSBfaGl0SGVpZ2h0c1tpXTtcbiAgICAgICAgICAgIHcgPSBiYXJXaWR0aDtcbiAgICAgICAgICAgIGggPSAyO1xuXG4gICAgICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5maWxsUmVjdCh4LCB5LCB3LCBoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgX3Njb3BlID0gdGhpcztcblxuICAgIHZhciBfY2FudmFzQmcgPSBuZXcgSW1hZ2UoKTtcbiAgICBfY2FudmFzQmcub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBfc2NvcGUudGVzdENhbnZhcygpO1xuICAgIH07XG4gICAgLy9fY2FudmFzQmcuc3JjID0gXCIvaW1nL2JnNXMuanBnXCI7XG4gICAgX2NhbnZhc0JnLnNyYyA9IFwiL2ltZy9iZzYtd2lkZS5qcGdcIjtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGNsYXNzIFNvdW5kUGxheWVyIHtcbiAgICBzdGF0aWMgY3JlYXRlIChtb2RlbCkge1xuICAgICAgICB2YXIgcmVzdW1lUG9zaXRpb24gPSBwYXJzZUludChtb2RlbC5nZXQoJ3Bvc2l0aW9uJykgfHwgMCk7XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJDcmVhdGluZyBzb3VuZCBwbGF5ZXIgZm9yIG1vZGVsOlwiLCBtb2RlbCk7XG5cbiAgICAgICAgcmV0dXJuIHNvdW5kTWFuYWdlci5jcmVhdGVTb3VuZCh7XG4gICAgICAgICAgICBpZDogbW9kZWwuaWQsXG4gICAgICAgICAgICB1cmw6IG1vZGVsLnVybCxcbiAgICAgICAgICAgIHZvbHVtZTogMTAwLFxuICAgICAgICAgICAgYXV0b0xvYWQ6IHRydWUsXG4gICAgICAgICAgICBhdXRvUGxheTogZmFsc2UsXG4gICAgICAgICAgICBmcm9tOiByZXN1bWVQb3NpdGlvbixcbiAgICAgICAgICAgIHdoaWxlbG9hZGluZzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibG9hZGVkOiBcIiArIHRoaXMuYnl0ZXNMb2FkZWQgKyBcIiBvZiBcIiArIHRoaXMuYnl0ZXNUb3RhbCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25sb2FkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1NvdW5kOyBhdWRpbyBsb2FkZWQ7IHBvc2l0aW9uID0gJyArIHJlc3VtZVBvc2l0aW9uICsgJywgZHVyYXRpb24gPSAnICsgdGhpcy5kdXJhdGlvbik7XG5cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5kdXJhdGlvbiA9PSBudWxsIHx8IHRoaXMuZHVyYXRpb24gPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImR1cmF0aW9uIGlzIG51bGxcIik7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoKHJlc3VtZVBvc2l0aW9uICsgMTApID4gdGhpcy5kdXJhdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAvLyB0aGUgdHJhY2sgaXMgcHJldHR5IG11Y2ggY29tcGxldGUsIGxvb3AgaXRcbiAgICAgICAgICAgICAgICAgICAgLy8gRklYTUU6IHRoaXMgc2hvdWxkIGFjdHVhbGx5IGhhcHBlbiBlYXJsaWVyLCB3ZSBzaG91bGQga25vdyB0aGF0IHRoZSBhY3Rpb24gd2lsbCBjYXVzZSBhIHJld2luZFxuICAgICAgICAgICAgICAgICAgICAvLyAgICAgICAgYW5kIGluZGljYXRlIHRoZSByZXdpbmQgdmlzdWFsbHkgc28gdGhlcmUgaXMgbm8gc3VycHJpc2VcbiAgICAgICAgICAgICAgICAgICAgcmVzdW1lUG9zaXRpb24gPSAwO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnU291bmQ7IHRyYWNrIG5lZWRlZCBhIHJld2luZCcpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEZJWE1FOiByZXN1bWUgY29tcGF0aWJpbGl0eSB3aXRoIHZhcmlvdXMgYnJvd3NlcnNcbiAgICAgICAgICAgICAgICAvLyBGSVhNRTogc29tZXRpbWVzIHlvdSByZXN1bWUgYSBmaWxlIGFsbCB0aGUgd2F5IGF0IHRoZSBlbmQsIHNob3VsZCBsb29wIHRoZW0gYXJvdW5kXG4gICAgICAgICAgICAgICAgdGhpcy5zZXRQb3NpdGlvbihyZXN1bWVQb3NpdGlvbik7XG4gICAgICAgICAgICAgICAgdGhpcy5wbGF5KCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgd2hpbGVwbGF5aW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIHByb2dyZXNzID0gKHRoaXMuZHVyYXRpb24gPiAwID8gMTAwICogdGhpcy5wb3NpdGlvbiAvIHRoaXMuZHVyYXRpb24gOiAwKS50b0ZpeGVkKDApICsgJyUnO1xuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwicXVpcDpcIiArIHRoaXMuaWQgKyBcIjpwcm9ncmVzc1wiLCBwcm9ncmVzcyk7XG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJxdWlwOlwiICsgdGhpcy5pZCArIFwiOnBvc2l0aW9uXCIsIHRoaXMucG9zaXRpb24udG9GaXhlZCgwKSk7XG4gICAgICAgICAgICAgICAgbW9kZWwuc2V0KHsncHJvZ3Jlc3MnOiBwcm9ncmVzc30pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9ucGF1c2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlNvdW5kOyBwYXVzZWQ6IFwiICsgdGhpcy5pZCk7XG4gICAgICAgICAgICAgICAgdmFyIHBvc2l0aW9uID0gdGhpcy5wb3NpdGlvbiA/IHRoaXMucG9zaXRpb24udG9GaXhlZCgwKSA6IDA7XG4gICAgICAgICAgICAgICAgdmFyIHByb2dyZXNzID0gKHRoaXMuZHVyYXRpb24gPiAwID8gMTAwICogcG9zaXRpb24gLyB0aGlzLmR1cmF0aW9uIDogMCkudG9GaXhlZCgwKSArICclJztcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcInF1aXA6XCIgKyB0aGlzLmlkICsgXCI6cHJvZ3Jlc3NcIiwgcHJvZ3Jlc3MpO1xuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwicXVpcDpcIiArIHRoaXMuaWQgKyBcIjpwb3NpdGlvblwiLCBwb3NpdGlvbik7XG4gICAgICAgICAgICAgICAgbW9kZWwuc2V0KHsncHJvZ3Jlc3MnOiBwcm9ncmVzc30pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uZmluaXNoOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJTb3VuZDsgZmluaXNoZWQgcGxheWluZzogXCIgKyB0aGlzLmlkKTtcblxuICAgICAgICAgICAgICAgIC8vIHN0b3JlIGNvbXBsZXRpb24gaW4gYnJvd3NlclxuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwicXVpcDpcIiArIHRoaXMuaWQgKyBcIjpwcm9ncmVzc1wiLCAnMTAwJScpO1xuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwicXVpcDpcIiArIHRoaXMuaWQgKyBcIjpwb3NpdGlvblwiLCB0aGlzLmR1cmF0aW9uLnRvRml4ZWQoMCkpO1xuICAgICAgICAgICAgICAgIG1vZGVsLnNldCh7J3Byb2dyZXNzJzogJzEwMCUnfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBUT0RPOiB1bmxvY2sgc29tZSBzb3J0IG9mIGFjaGlldmVtZW50IGZvciBmaW5pc2hpbmcgdGhpcyB0cmFjaywgbWFyayBpdCBhIGRpZmYgY29sb3IsIGV0Y1xuICAgICAgICAgICAgICAgIC8vIFRPRE86IHRoaXMgaXMgYSBnb29kIHBsYWNlIHRvIGZpcmUgYSBob29rIHRvIGEgcGxheWJhY2sgbWFuYWdlciB0byBtb3ZlIG9udG8gdGhlIG5leHQgYXVkaW8gY2xpcFxuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgIH1cbn1cbiIsImltcG9ydCBCYWNrYm9uZSBmcm9tICdiYWNrYm9uZSdcbmltcG9ydCB7IFF1aXBNb2RlbCwgUXVpcFZpZXcsIFF1aXBzLCBBdWRpb1BsYXllclZpZXcgfSBmcm9tICcuL3F1aXAtY29udHJvbC5qcydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUmVjb3JkaW5nc0xpc3QgZXh0ZW5kcyBCYWNrYm9uZS5WaWV3IHtcbiAgICBpbml0aWFsaXplKCkge1xuXG4gICAgICAgIHZhciBhdWRpb1BsYXllciA9IG5ldyBBdWRpb1BsYXllclZpZXcoKTtcblxuICAgICAgICBzb3VuZE1hbmFnZXIuc2V0dXAoe1xuICAgICAgICAgICAgZGVidWdNb2RlOiB0cnVlLFxuICAgICAgICAgICAgdXJsOiAnL2Fzc2V0cy9zd2YvJyxcbiAgICAgICAgICAgIHByZWZlckZsYXNoOiBmYWxzZSxcbiAgICAgICAgICAgIG9ucmVhZHk6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInNvdW5kTWFuYWdlciByZWFkeVwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgJCgnLnF1aXAnKS5lYWNoKGVsZW0gPT4ge1xuICAgICAgICAgICAgdmFyIHZpZXcgPSBuZXcgUXVpcFZpZXcoe1xuICAgICAgICAgICAgICAgIGVsOiBlbGVtLFxuICAgICAgICAgICAgICAgIG1vZGVsOiBuZXcgUXVpcE1vZGVsKHtwcm9ncmVzczogMH0pXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgUXVpcHMuYWRkKHZpZXcubW9kZWwpO1xuICAgICAgICAgICAgdmlldy5yZW5kZXIoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gcHJvY2VzcyBhbGwgdGltZXN0YW1wc1xuICAgICAgICB2YXIgdmFndWVUaW1lID0gcmVxdWlyZSgndmFndWUtdGltZScpO1xuICAgICAgICB2YXIgbm93ID0gbmV3IERhdGUoKTtcblxuICAgICAgICAkKFwidGltZVtkYXRldGltZV1cIikuZWFjaChmdW5jdGlvbiBnZW5lcmF0ZVZhZ3VlRGF0ZShlbGUpIHtcbiAgICAgICAgICAgIGVsZS50ZXh0Q29udGVudCA9IHZhZ3VlVGltZS5nZXQoe2Zyb206IG5vdywgdG86IG5ldyBEYXRlKGVsZS5nZXRBdHRyaWJ1dGUoJ2RhdGV0aW1lJykpfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMubGlzdGVuVG8oUXVpcHMsICdhZGQnLCB0aGlzLnF1aXBBZGRlZCk7XG4gICAgfVxuXG4gICAgcXVpcEFkZGVkKHF1aXApIHtcbiAgICB9XG59XG5cbiIsImltcG9ydCBCYWNrYm9uZSBmcm9tICdiYWNrYm9uZSdcbmltcG9ydCBTb3VuZFBsYXllciBmcm9tICcuL2F1ZGlvLXBsYXllci5qcydcblxuLyoqXG4gKiBRdWlwXG4gKiBQbGF5cyBhdWRpbyBhbmQgdHJhY2tzIHBvc2l0aW9uXG4gKi9cblxuY2xhc3MgUXVpcE1vZGVsIGV4dGVuZHMgQmFja2JvbmUuTW9kZWwge1xuICAgIGRlZmF1bHRzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaWQ6IDAsIC8vIGd1aWRcbiAgICAgICAgICAgIHByb2dyZXNzOiAwLCAvLyBbMC0xMDBdIHBlcmNlbnRhZ2VcbiAgICAgICAgICAgIHBvc2l0aW9uOiAwLCAvLyBtc2VjXG4gICAgICAgICAgICBkdXJhdGlvbjogMCwgLy8gbXNlY1xuICAgICAgICAgICAgaXNQdWJsaWM6IGZhbHNlXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICB9XG5cbiAgICBzYXZlKGF0dHJpYnV0ZXMpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJRdWlwIE1vZGVsIHNhdmluZyB0byBsb2NhbFN0b3JhZ2VcIik7XG4gICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKHRoaXMuaWQsIEpTT04uc3RyaW5naWZ5KHRoaXMudG9KU09OKCkpKTtcbiAgICB9XG5cbiAgICBmZXRjaCgpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJRdWlwIE1vZGVsIGxvYWRpbmcgZnJvbSBsb2NhbFN0b3JhZ2VcIik7XG4gICAgICAgIHRoaXMuc2V0KEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmdldEl0ZW0odGhpcy5pZCkpKTtcbiAgICB9XG5cbiAgICB1cGRhdGVQcm9ncmVzcygpIHtcbiAgICAgICAgdGhpcy5zZXQoe1xuICAgICAgICAgICAgcHJvZ3Jlc3M6IChkdXJhdGlvbiA+IDAgPyBwb3NpdGlvbiAvIGR1cmF0aW9uIDogMCkudG9GaXhlZCgwKSArIFwiJVwiXG4gICAgICAgIH0pO1xuICAgIH1cbn1cblxuY2xhc3MgQXVkaW9QbGF5ZXJFdmVudHMgZXh0ZW5kcyBCYWNrYm9uZS5Nb2RlbCB7XG4gICAgZ2V0UGF1c2VVcmwoaWQpIHtcbiAgICAgICAgdmFyIHVybCA9IFwiL1wiICsgaWQgKyBcIi9wYXVzZWRcIjtcbiAgICAgICAgY29uc29sZS5sb2coXCJwYXVzZSB1cmxcIiArIHVybCk7XG4gICAgICAgIHJldHVybiB1cmw7XG4gICAgfVxuXG4gICAgb25QYXVzZShpZCwgY2FsbGJhY2spIHtcbiAgICAgICAgdGhpcy5vbih0aGlzLmdldFBhdXNlVXJsKGlkKSwgY2FsbGJhY2spO1xuICAgIH1cblxuICAgIHRyaWdnZXJQYXVzZShpZCkge1xuICAgICAgICB0aGlzLnRyaWdnZXIodGhpcy5nZXRQYXVzZVVybChpZCkpO1xuICAgIH1cbn1cblxudmFyIEF1ZGlvUGxheWVyID0gbmV3IEF1ZGlvUGxheWVyRXZlbnRzKCk7XG5cbi8vY2xhc3MgQXVkaW9QbGF5ZXJFdmVudHMgZXh0ZW5kcyBCYWNrYm9uZS5FdmVudHMge1xuLy9cbi8vfVxuXG5jbGFzcyBBdWRpb1BsYXllclZpZXcgZXh0ZW5kcyBCYWNrYm9uZS5WaWV3IHtcbiAgICBkZWZhdWx0cygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGF1ZGlvUGxheWVyOiBudWxsLFxuICAgICAgICAgICAgcXVpcE1vZGVsOiBudWxsXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIkF1ZGlvUGxheWVyVmlldyBpbml0aWFsaXplZFwiKTtcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiYXVkaW8tcGxheWVyXCIpO1xuICAgICAgICBBdWRpb1BsYXllci5vbihcInRvZ2dsZVwiLCAocXVpcCkgPT4gdGhpcy5vblRvZ2dsZShxdWlwKSk7XG4gICAgfVxuXG4gICAgY2xvc2UoKSB7XG4gICAgICAgIHRoaXMuc3RvcFBlcmlvZGljVGltZXIoKTtcbiAgICB9XG5cbiAgICBzdGFydFBlcmlvZGljVGltZXIoKSB7XG4gICAgICAgIGlmKHRoaXMucGVyaW9kaWNUaW1lciA9PSBudWxsKSB7XG4gICAgICAgICAgICB0aGlzLnBlcmlvZGljVGltZXIgPSBzZXRJbnRlcnZhbCgoKSA9PiB0aGlzLmNoZWNrUHJvZ3Jlc3MoKSwgMTAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHN0b3BQZXJpb2RpY1RpbWVyKCkge1xuICAgICAgICBpZih0aGlzLnBlcmlvZGljVGltZXIgIT0gbnVsbCkge1xuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLnBlcmlvZGljVGltZXIpO1xuICAgICAgICAgICAgdGhpcy5wZXJpb2RpY1RpbWVyID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNoZWNrUHJvZ3Jlc3MoKSB7XG4gICAgICAgIGlmKHRoaXMucXVpcE1vZGVsID09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBwcm9ncmVzc1VwZGF0ZSA9IHtcbiAgICAgICAgICAgIGN1cnJlbnRUaW1lOiB0aGlzLmF1ZGlvUGxheWVyLmN1cnJlbnRUaW1lLFxuICAgICAgICAgICAgZHVyYXRpb246IHRoaXMuYXVkaW9QbGF5ZXIuZHVyYXRpb24sXG4gICAgICAgICAgICBwcm9ncmVzczogMTAwICogdGhpcy5hdWRpb1BsYXllci5jdXJyZW50VGltZSAvIHRoaXMuYXVkaW9QbGF5ZXIuZHVyYXRpb25cbiAgICAgICAgfVxuXG4gICAgICAgIEF1ZGlvUGxheWVyLnRyaWdnZXIoXCIvXCIgKyB0aGlzLnF1aXBNb2RlbC5pZCArIFwiL3Byb2dyZXNzXCIsIHByb2dyZXNzVXBkYXRlKTtcbiAgICB9XG5cbiAgICBvblRvZ2dsZShxdWlwTW9kZWwpIHtcbiAgICAgICAgdGhpcy5xdWlwTW9kZWwgPSBxdWlwTW9kZWw7XG5cbiAgICAgICAgaWYoIXRoaXMudHJhY2tJc0xvYWRlZChxdWlwTW9kZWwudXJsKSkge1xuICAgICAgICAgICAgdGhpcy5sb2FkVHJhY2socXVpcE1vZGVsLnVybCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZighdGhpcy50cmFja0lzTG9hZGVkKHF1aXBNb2RlbC51cmwpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZih0aGlzLmF1ZGlvUGxheWVyLnBhdXNlZCkge1xuICAgICAgICAgICAgdGhpcy5wbGF5KHF1aXBNb2RlbCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnBhdXNlKHF1aXBNb2RlbCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwbGF5KHF1aXBNb2RlbCkge1xuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnBsYXkoKTtcbiAgICAgICAgQXVkaW9QbGF5ZXIudHJpZ2dlcihcIi9cIiArIHF1aXBNb2RlbC5pZCArIFwiL3BsYXlpbmdcIik7XG4gICAgICAgIHRoaXMuc3RhcnRQZXJpb2RpY1RpbWVyKCk7XG4gICAgfVxuXG4gICAgcGF1c2UocXVpcE1vZGVsKSB7XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIucGF1c2UoKTtcbiAgICAgICAgQXVkaW9QbGF5ZXIudHJpZ2dlcihcIi9cIiArIHF1aXBNb2RlbC5pZCArIFwiL3BhdXNlZFwiKTtcbiAgICAgICAgdGhpcy5zdG9wUGVyaW9kaWNUaW1lcigpO1xuICAgIH1cblxuICAgIHRyYWNrSXNMb2FkZWQodXJsKSB7XG4gICAgICAgIHJldHVybiB+dGhpcy5hdWRpb1BsYXllci5zcmMuaW5kZXhPZih1cmwpO1xuICAgIH1cblxuICAgIGxvYWRUcmFjayh1cmwpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJMb2FkaW5nIGF1ZGlvOiBcIiArIHVybCk7XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIuc3JjID0gdXJsO1xuICAgIH1cbn1cblxuY2xhc3MgUXVpcFZpZXcgZXh0ZW5kcyBCYWNrYm9uZS5WaWV3IHtcbiAgICBkZWZhdWx0cygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHF1aXBJZDogMCxcbiAgICAgICAgICAgIGF1ZGlvUGxheWVyOiBudWxsXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBldmVudHMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBcImNsaWNrIC5xdWlwLWFjdGlvbnMgLmxvY2staW5kaWNhdG9yXCI6IFwidG9nZ2xlUHVibGljXCIsXG4gICAgICAgICAgICBcImNsaWNrIC5xdWlwLXBsYXllclwiOiBcInRvZ2dsZVwiXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBvblBhdXNlKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlF1aXBWaWV3OyBwYXVzZWRcIik7XG5cbiAgICAgICAgJCh0aGlzLmVsKVxuICAgICAgICAgICAgLmZpbmQoJy5mYS1wbGF5JylcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZmEtcGxheScpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ2ZhLXBhdXNlJyk7XG4gICAgfVxuXG4gICAgb25QbGF5KCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlF1aXBWaWV3OyBwbGF5aW5nXCIpO1xuXG4gICAgICAgICQodGhpcy5lbClcbiAgICAgICAgICAgIC5maW5kKCcuZmEtcGF1c2UnKVxuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdmYS1wYXVzZScpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ2ZhLXBsYXknKTtcbiAgICB9XG5cbiAgICBvblByb2dyZXNzKHByb2dyZXNzVXBkYXRlKSB7XG4gICAgICAgIHRoaXMubW9kZWwuc2V0KHsncHJvZ3Jlc3MnOiBwcm9ncmVzc1VwZGF0ZS5wcm9ncmVzc30pO1xuICAgIH1cblxuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIHRoaXMucXVpcElkID0gdGhpcy4kZWwuZGF0YShcInF1aXBJZFwiKTtcbiAgICAgICAgdGhpcy5wdWJsaWNMaW5rID0gJy91LycgKyB0aGlzLnF1aXBJZDtcblxuICAgICAgICBBdWRpb1BsYXllci5vbihcIi9cIiArIHRoaXMucXVpcElkICsgXCIvcGF1c2VkXCIsICgpID0+IHRoaXMub25QYXVzZSgpKTtcbiAgICAgICAgQXVkaW9QbGF5ZXIub24oXCIvXCIgKyB0aGlzLnF1aXBJZCArIFwiL3BsYXlpbmdcIiwgKCkgPT4gdGhpcy5vblBsYXkoKSk7XG4gICAgICAgIEF1ZGlvUGxheWVyLm9uKFwiL1wiICsgdGhpcy5xdWlwSWQgKyBcIi9wcm9ncmVzc1wiLCAodXBkYXRlKSA9PiB0aGlzLm9uUHJvZ3Jlc3ModXBkYXRlKSk7XG5cbiAgICAgICAgdGhpcy5sb2FkTW9kZWwoKTtcblxuICAgICAgICAvLyB1cGRhdGUgdmlzdWFscyB0byBpbmRpY2F0ZSBwbGF5YmFjayBwcm9ncmVzc1xuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMubW9kZWwsICdjaGFuZ2U6cHJvZ3Jlc3MnLCAobW9kZWwsIHByb2dyZXNzKSA9PiB7XG4gICAgICAgICAgICAkKHRoaXMuZWwpLmZpbmQoXCIucHJvZ3Jlc3MtYmFyXCIpLmNzcyhcIndpZHRoXCIsIHByb2dyZXNzICsgXCIlXCIpO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMubW9kZWwsIFwiY2hhbmdlXCIsIHRoaXMucmVuZGVyKTtcbiAgICB9XG5cbiAgICBsb2FkTW9kZWwoKSB7XG4gICAgICAgIHZhciBwcm9ncmVzcyA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwicXVpcDpcIiArIHRoaXMucXVpcElkICsgXCI6cHJvZ3Jlc3NcIik7XG4gICAgICAgIHZhciBwb3NpdGlvbiA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwicXVpcDpcIiArIHRoaXMucXVpcElkICsgXCI6cG9zaXRpb25cIik7XG5cbiAgICAgICAgdGhpcy5tb2RlbC5zZXQoe1xuICAgICAgICAgICAgJ2lkJzogdGhpcy5xdWlwSWQsXG4gICAgICAgICAgICAncHJvZ3Jlc3MnOiBwcm9ncmVzcyxcbiAgICAgICAgICAgICdwb3NpdGlvbic6IHBvc2l0aW9uLFxuICAgICAgICAgICAgJ2lzUHVibGljJzogdGhpcy4kZWwuZGF0YShcImlzUHVibGljXCIpID09ICdUcnVlJyxcbiAgICAgICAgICAgICdpc01pbmUnOiB0aGlzLiRlbC5kYXRhKFwiaXNNaW5lXCIpID09ICdUcnVlJ1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICB0b2dnbGVQdWJsaWMoZXYpIHtcbiAgICAgICAgdmFyIG5ld1N0YXRlID0gIXRoaXMubW9kZWwuZ2V0KCdpc1B1YmxpYycpO1xuICAgICAgICB0aGlzLm1vZGVsLnNldCh7J2lzUHVibGljJzogbmV3U3RhdGV9KTtcblxuICAgICAgICBjb25zb2xlLmxvZyhcInRvZ2dsaW5nIG5ldyBwdWJsaXNoZWQgc3RhdGU6IFwiICsgbmV3U3RhdGUpO1xuXG4gICAgICAgICQuYWpheCh7XG4gICAgICAgICAgICB1cmw6ICcvcmVjb3JkaW5nL3B1Ymxpc2gvJyArIHRoaXMucXVpcElkLFxuICAgICAgICAgICAgbWV0aG9kOiAncG9zdCcsXG4gICAgICAgICAgICBkYXRhOiB7aXNQdWJsaWM6IG5ld1N0YXRlfSxcbiAgICAgICAgICAgIGNvbXBsZXRlOiBmdW5jdGlvbiAocmVzcCkge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwICYmIHJlc3Auc3RhdHVzID09ICdzdWNjZXNzJykge1xuICAgICAgICAgICAgICAgICAgICAvLyBjaGFuZ2Ugc3VjY2Vzc2Z1bFxuICAgICAgICAgICAgICAgIH0gZWxzZSB7ICAgLy8gY2hhbmdlIGZhaWxlZFxuICAgICAgICAgICAgICAgICAgICAvLyBUT0RPOiBhZGQgdmlzdWFsIHRvIGluZGljYXRlIGNoYW5nZS1mYWlsdXJlXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihcIlRvZ2dsaW5nIHJlY29yZGluZyBwdWJsaWNhdGlvbiBzdGF0ZSBmYWlsZWQ6XCIpO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmRpcihyZXNwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBdWRpbyBlbGVtZW50IGZpZWxkc1xuICAgICAqIC5kdXJhdGlvbiAoc2Vjb25kcylcbiAgICAgKiAub25wcm9ncmVzc1xuICAgICAqIC5vbnBsYXlcbiAgICAgKiAub25wYXVzZVxuICAgICAqIC5wYXVzZWRcbiAgICAgKiAudm9sdW1lXG4gICAgICogLmVuZGVkXG4gICAgICogLmN1cnJlbnRUaW1lXG4gICAgICovXG5cbiAgICB0b2dnbGUoZXZlbnQpIHtcbiAgICAgICAgdmFyIHF1aXBJZCA9ICQodGhpcy5lbCkuZGF0YShcInF1aXBJZFwiKTtcbiAgICAgICAgdGhpcy5tb2RlbC51cmwgPSAnL3JlY29yZGluZ3MvJyArIHF1aXBJZCArICcub2dnJztcblxuICAgICAgICBBdWRpb1BsYXllci50cmlnZ2VyKFwidG9nZ2xlXCIsIHRoaXMubW9kZWwpO1xuICAgIH1cblxuICAgIHJlbmRlcigpIHtcbiAgICAgICAgLy90aGlzLiRlbC5odG1sKF8udGVtcGxhdGUoJCgnI3F1aXAtdGVtcGxhdGUnKS5odG1sKCkpKTtcbiAgICAgICAgLy9yZXR1cm4gdGhpcztcbiAgICAgICAgdmFyIHJlc3VsdCA9ICQodGhpcy5lbCkuZmluZCgnLnF1aXAtYWN0aW9ucycpLmZpbmQoJy5sb2NrLWluZGljYXRvcicpO1xuICAgICAgICBpZiAocmVzdWx0KVxuICAgICAgICAgICAgcmVzdWx0LnJlbW92ZSgpO1xuXG4gICAgICAgIGlmICh0aGlzLm1vZGVsLmdldCgnaXNNaW5lJykpIHtcbiAgICAgICAgICAgIHZhciBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpO1xuICAgICAgICAgICAgdmFyIGh0bWwgPSBfLnRlbXBsYXRlKCQoXCIjcXVpcC1jb250cm9sLXByaXZhY3lcIikuaHRtbCgpKTtcblxuICAgICAgICAgICAgJCh0aGlzLmVsKS5maW5kKFwiLnF1aXAtYWN0aW9uc1wiKS5hcHBlbmQoaHRtbCh7XG4gICAgICAgICAgICAgICAgaXNQdWJsaWM6IHRoaXMubW9kZWwuZ2V0KCdpc1B1YmxpYycpLFxuICAgICAgICAgICAgICAgIHB1YmxpY0xpbms6IHRoaXMucHVibGljTGlua1xuICAgICAgICAgICAgfSkpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5jbGFzcyBRdWlwTGlzdCBleHRlbmRzIEJhY2tib25lLkNvbGxlY3Rpb24ge1xuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnMpIHtcbiAgICAgICAgc3VwZXIob3B0aW9ucyk7XG4gICAgICAgIHRoaXMubW9kZWwgPSBRdWlwTW9kZWw7XG4gICAgfVxufVxuXG52YXIgUXVpcHMgPSBuZXcgUXVpcExpc3QoKTtcblxuZXhwb3J0IHsgUXVpcE1vZGVsLCBRdWlwVmlldywgUXVpcExpc3QsIFF1aXBzLCBBdWRpb1BsYXllclZpZXcgfTtcbiIsImltcG9ydCBCYWNrYm9uZSBmcm9tICdiYWNrYm9uZSdcbmltcG9ydCB7IFF1aXBNb2RlbCwgUXVpcFZpZXcsIFF1aXBzLCBBdWRpb1BsYXllclZpZXcgfSBmcm9tICcuL3F1aXAtY29udHJvbC5qcydcbmltcG9ydCB7IEF1ZGlvQ2FwdHVyZSB9IGZyb20gJy4vYXVkaW8tY2FwdHVyZSdcblxuZXhwb3J0IGNsYXNzIFJlY29yZGVyIGV4dGVuZHMgQmFja2JvbmUuTW9kZWwge1xuICAgIGRlZmF1bHRzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVjb3JkaW5nVGltZTogMFxuICAgICAgICB9XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgUmVjb3JkZXJWaWV3IGV4dGVuZHMgQmFja2JvbmUuVmlldyB7XG4gICAgLy8gICAgZWw6ICcubS1yZWNvcmRpbmctY29udGFpbmVyJyxcblxuICAgIEludFRvVGltZSh2YWx1ZSkge1xuICAgICAgICB2YXIgbWludXRlcyA9IE1hdGguZmxvb3IodmFsdWUgLyA2MCk7XG4gICAgICAgIHZhciBzZWNvbmRzID0gTWF0aC5yb3VuZCh2YWx1ZSAtIG1pbnV0ZXMgKiA2MCk7XG5cbiAgICAgICAgcmV0dXJuIChcIjAwXCIgKyBtaW51dGVzKS5zdWJzdHIoLTIpICsgXCI6XCIgKyAoXCIwMFwiICsgc2Vjb25kcykuc3Vic3RyKC0yKTtcbiAgICB9XG5cbiAgICBkZWZhdWx0cygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGF1ZGlvQ2FwdHVyZTogbnVsbCxcbiAgICAgICAgICAgIGF1ZGlvQmxvYjogbnVsbCxcbiAgICAgICAgICAgIGF1ZGlvQmxvYlVybDogbnVsbCxcbiAgICAgICAgICAgIGF1ZGlvUGxheWVyOiBudWxsLFxuICAgICAgICAgICAgaXNSZWNvcmRpbmc6IGZhbHNlLFxuICAgICAgICAgICAgdGltZXJJZDogMCxcbiAgICAgICAgICAgIHRpbWVyU3RhcnQ6IDNcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGV2ZW50cygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIFwiY2xpY2sgLnJlY29yZGluZy10b2dnbGVcIjogXCJ0b2dnbGVcIixcbiAgICAgICAgICAgIFwiY2xpY2sgI2NhbmNlbC1yZWNvcmRpbmdcIjogXCJjYW5jZWxSZWNvcmRpbmdcIixcbiAgICAgICAgICAgIFwiY2xpY2sgI3VwbG9hZC1yZWNvcmRpbmdcIjogXCJ1cGxvYWRSZWNvcmRpbmdcIixcbiAgICAgICAgICAgIFwiY2xpY2sgI2hlbHBlci1idG5cIjogXCJwbGF5UHJldmlld1wiXG4gICAgICAgIH1cbiAgICB9XG5cblxuICAgIGluaXRpYWxpemUob3B0aW9ucykge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlJlY29yZGVyVmlldyBpbml0XCIpO1xuICAgICAgICB0aGlzLmF1ZGlvQ2FwdHVyZSA9IG5ldyBBdWRpb0NhcHR1cmUoKTtcblxuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyZWNvcmRlZC1wcmV2aWV3XCIpO1xuICAgICAgICBpZiAodGhpcy5hdWRpb1BsYXllciA9PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zb2xlLmxvZyhcImNhbiBwbGF5IHZvcmJpczogXCIsICEhdGhpcy5hdWRpb1BsYXllci5jYW5QbGF5VHlwZSAmJiBcIlwiICE9IHRoaXMuYXVkaW9QbGF5ZXIuY2FuUGxheVR5cGUoJ2F1ZGlvL29nZzsgY29kZWNzPVwidm9yYmlzXCInKSk7XG5cbiAgICAgICAgLy90aGlzLmF1ZGlvUGxheWVyLmxvb3AgPSBcImxvb3BcIjtcbiAgICAgICAgLy90aGlzLmF1ZGlvUGxheWVyLmF1dG9wbGF5ID0gXCJhdXRvcGxheVwiO1xuICAgICAgICAvL3RoaXMuYXVkaW9QbGF5ZXIuc3JjID0gXCIvYXNzZXRzL3NvdW5kcy9iZWVwX3Nob3J0X29uLm9nZ1wiO1xuICAgICAgICAvL3RoaXMuYXVkaW9QbGF5ZXIucGxheSgpO1xuXG4gICAgICAgIHRoaXMubW9kZWwub24oJ2NoYW5nZTpyZWNvcmRpbmdUaW1lJywgZnVuY3Rpb24gKG1vZGVsLCB0aW1lKSB7XG4gICAgICAgICAgICAkKFwiLnJlY29yZGluZy10aW1lXCIpLnRleHQodGltZSk7XG4gICAgICAgIH0pXG5cbiAgICAgICAgLy8gYXR0ZW1wdCB0byBmZXRjaCBtZWRpYS1zdHJlYW0gb24gcGFnZS1sb2FkXG4gICAgICAgIHRoaXMuYXVkaW9DYXB0dXJlLnByZWxvYWRNZWRpYVN0cmVhbSgpO1xuXG4gICAgICAgIC8vIFRPRE86IGEgcHJldHR5IGFkdmFuY2VkIGJ1dCBuZWF0IGZlYXR1cmUgbWF5IGJlIHRvIHN0b3JlIGEgYmFja3VwIGNvcHkgb2YgYSByZWNvcmRpbmcgbG9jYWxseSBpbiBjYXNlIG9mIGEgY3Jhc2ggb3IgdXNlci1lcnJvclxuICAgICAgICAvKlxuICAgICAgICAgLy8gY2hlY2sgaG93IG11Y2ggdGVtcG9yYXJ5IHN0b3JhZ2Ugc3BhY2Ugd2UgaGF2ZS4gaXQncyBhIGdvb2Qgd2F5IHRvIHNhdmUgcmVjb3JkaW5nIHdpdGhvdXQgbG9zaW5nIGl0XG4gICAgICAgICB3aW5kb3cud2Via2l0U3RvcmFnZUluZm8ucXVlcnlVc2FnZUFuZFF1b3RhKFxuICAgICAgICAgd2Via2l0U3RvcmFnZUluZm8uVEVNUE9SQVJZLFxuICAgICAgICAgZnVuY3Rpb24odXNlZCwgcmVtYWluaW5nKSB7XG4gICAgICAgICB2YXIgcm1iID0gKHJlbWFpbmluZyAvIDEwMjQgLyAxMDI0KS50b0ZpeGVkKDQpO1xuICAgICAgICAgdmFyIHVtYiA9ICh1c2VkIC8gMTAyNCAvIDEwMjQpLnRvRml4ZWQoNCk7XG4gICAgICAgICBjb25zb2xlLmxvZyhcIlVzZWQgcXVvdGE6IFwiICsgdW1iICsgXCJtYiwgcmVtYWluaW5nIHF1b3RhOiBcIiArIHJtYiArIFwibWJcIik7XG4gICAgICAgICB9LCBmdW5jdGlvbihlKSB7XG4gICAgICAgICBjb25zb2xlLmxvZygnRXJyb3InLCBlKTtcbiAgICAgICAgIH1cbiAgICAgICAgICk7XG5cbiAgICAgICAgIGZ1bmN0aW9uIG9uRXJyb3JJbkZTKCkge1xuICAgICAgICAgdmFyIG1zZyA9ICcnO1xuXG4gICAgICAgICBzd2l0Y2ggKGUuY29kZSkge1xuICAgICAgICAgY2FzZSBGaWxlRXJyb3IuUVVPVEFfRVhDRUVERURfRVJSOlxuICAgICAgICAgbXNnID0gJ1FVT1RBX0VYQ0VFREVEX0VSUic7XG4gICAgICAgICBicmVhaztcbiAgICAgICAgIGNhc2UgRmlsZUVycm9yLk5PVF9GT1VORF9FUlI6XG4gICAgICAgICBtc2cgPSAnTk9UX0ZPVU5EX0VSUic7XG4gICAgICAgICBicmVhaztcbiAgICAgICAgIGNhc2UgRmlsZUVycm9yLlNFQ1VSSVRZX0VSUjpcbiAgICAgICAgIG1zZyA9ICdTRUNVUklUWV9FUlInO1xuICAgICAgICAgYnJlYWs7XG4gICAgICAgICBjYXNlIEZpbGVFcnJvci5JTlZBTElEX01PRElGSUNBVElPTl9FUlI6XG4gICAgICAgICBtc2cgPSAnSU5WQUxJRF9NT0RJRklDQVRJT05fRVJSJztcbiAgICAgICAgIGJyZWFrO1xuICAgICAgICAgY2FzZSBGaWxlRXJyb3IuSU5WQUxJRF9TVEFURV9FUlI6XG4gICAgICAgICBtc2cgPSAnSU5WQUxJRF9TVEFURV9FUlInO1xuICAgICAgICAgYnJlYWs7XG4gICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgbXNnID0gJ1Vua25vd24gRXJyb3InO1xuICAgICAgICAgYnJlYWs7XG4gICAgICAgICB9XG5cbiAgICAgICAgIGNvbnNvbGUubG9nKCdFcnJvcjogJyArIG1zZyk7XG4gICAgICAgICB9XG5cbiAgICAgICAgIHdpbmRvdy5yZXF1ZXN0RmlsZVN5c3RlbSAgPSB3aW5kb3cucmVxdWVzdEZpbGVTeXN0ZW0gfHwgd2luZG93LndlYmtpdFJlcXVlc3RGaWxlU3lzdGVtO1xuXG4gICAgICAgICB3aW5kb3cucmVxdWVzdEZpbGVTeXN0ZW0od2luZG93LlRFTVBPUkFSWSwgNSAqIDEwMjQgKiAxMDI0LCBmdW5jdGlvbiBvblN1Y2Nlc3MoZnMpIHtcblxuICAgICAgICAgY29uc29sZS5sb2coJ29wZW5pbmcgZmlsZScpO1xuXG4gICAgICAgICBmcy5yb290LmdldEZpbGUoXCJ0ZXN0XCIsIHtjcmVhdGU6dHJ1ZX0sIGZ1bmN0aW9uKGZlKSB7XG5cbiAgICAgICAgIGNvbnNvbGUubG9nKCdzcGF3bmVkIHdyaXRlcicpO1xuXG4gICAgICAgICBmZS5jcmVhdGVXcml0ZXIoZnVuY3Rpb24oZncpIHtcblxuICAgICAgICAgZncub253cml0ZWVuZCA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgIGNvbnNvbGUubG9nKCd3cml0ZSBjb21wbGV0ZWQnKTtcbiAgICAgICAgIH07XG5cbiAgICAgICAgIGZ3Lm9uZXJyb3IgPSBmdW5jdGlvbihlKSB7XG4gICAgICAgICBjb25zb2xlLmxvZygnd3JpdGUgZmFpbGVkOiAnICsgZS50b1N0cmluZygpKTtcbiAgICAgICAgIH07XG5cbiAgICAgICAgIGNvbnNvbGUubG9nKCd3cml0aW5nIGJsb2IgdG8gZmlsZS4uJyk7XG5cbiAgICAgICAgIHZhciBibG9iID0gbmV3IEJsb2IoWyd5ZWggdGhpcyBpcyBhIHRlc3QhJ10sIHt0eXBlOiAndGV4dC9wbGFpbid9KTtcbiAgICAgICAgIGZ3LndyaXRlKGJsb2IpO1xuXG4gICAgICAgICB9LCBvbkVycm9ySW5GUyk7XG5cbiAgICAgICAgIH0sIG9uRXJyb3JJbkZTKTtcblxuICAgICAgICAgfSwgb25FcnJvckluRlMpO1xuICAgICAgICAgKi9cbiAgICB9XG5cbiAgICB0b2dnbGUoZXZlbnQpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNSZWNvcmRpbmcpIHtcbiAgICAgICAgICAgIHRoaXMuaXNSZWNvcmRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuc3RvcFJlY29yZGluZygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5pc1JlY29yZGluZyA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLnN0YXJ0UmVjb3JkaW5nKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjYW5jZWxSZWNvcmRpbmcoZXZlbnQpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJSZWNvcmRlcjo6b25SZWNvcmRpbmdDb21wbGV0ZWQoKTsgY2FuY2VsaW5nIHJlY29yZGluZ1wiKTtcbiAgICAgICAgJChcIiNyZWNvcmRlci1mdWxsXCIpLnJlbW92ZUNsYXNzKFwiZGlzYWJsZWRcIik7XG4gICAgICAgICQoXCIjcmVjb3JkZXItdXBsb2FkZXJcIikuYWRkQ2xhc3MoXCJkaXNhYmxlZFwiKTtcbiAgICAgICAgJChcIi5tLXJlY29yZGluZy1jb250YWluZXJcIikucmVtb3ZlQ2xhc3MoXCJmbGlwcGVkXCIpO1xuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnNyYyA9IFwiXCI7XG4gICAgICAgIHRoaXMubW9kZWwuc2V0KCdyZWNvcmRpbmdUaW1lJywgMyk7XG4gICAgfVxuXG4gICAgdXBsb2FkUmVjb3JkaW5nKGV2ZW50KSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiUmVjb3JkZXI6Om9uUmVjb3JkaW5nQ29tcGxldGVkKCk7IHVwbG9hZGluZyByZWNvcmRpbmdcIik7XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIuc3JjID0gXCJcIjtcblxuICAgICAgICAkKFwiI3JlY29yZGVyLWZ1bGxcIikuYWRkQ2xhc3MoXCJkaXNhYmxlZFwiKTtcbiAgICAgICAgJChcIiNyZWNvcmRlci11cGxvYWRlclwiKS5yZW1vdmVDbGFzcyhcImRpc2FibGVkXCIpO1xuICAgICAgICAkKFwiLm0tcmVjb3JkaW5nLWNvbnRhaW5lclwiKS5yZW1vdmVDbGFzcyhcImZsaXBwZWRcIik7XG5cbiAgICAgICAgdmFyIGRlc2NyaXB0aW9uID0gJCgndGV4dGFyZWFbbmFtZT1kZXNjcmlwdGlvbl0nKVswXS52YWx1ZTtcblxuICAgICAgICB2YXIgZGF0YSA9IG5ldyBGb3JtRGF0YSgpO1xuICAgICAgICBkYXRhLmFwcGVuZCgnZGVzY3JpcHRpb24nLCBkZXNjcmlwdGlvbik7XG4gICAgICAgIGRhdGEuYXBwZW5kKCdpc1B1YmxpYycsIDEpO1xuICAgICAgICBkYXRhLmFwcGVuZCgnYXVkaW8tYmxvYicsIHRoaXMuYXVkaW9CbG9iKTtcblxuICAgICAgICAvLyBzZW5kIHJhdyBibG9iIGFuZCBtZXRhZGF0YVxuXG4gICAgICAgIC8vIFRPRE86IGdldCBhIHJlcGxhY2VtZW50IGFqYXggbGlicmFyeSAobWF5YmUgcGF0Y2ggcmVxd2VzdCB0byBzdXBwb3J0IGJpbmFyeT8pXG4gICAgICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICAgICAgeGhyLm9wZW4oJ3Bvc3QnLCAnL3JlY29yZGluZy9jcmVhdGUnLCB0cnVlKTtcbiAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoJ0FjY2VwdCcsICdhcHBsaWNhdGlvbi9qc29uJyk7XG4gICAgICAgIHhoci51cGxvYWQub25wcm9ncmVzcyA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICB2YXIgcGVyY2VudCA9ICgoZS5sb2FkZWQgLyBlLnRvdGFsKSAqIDEwMCkudG9GaXhlZCgwKSArICclJztcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicGVyY2VudGFnZTogXCIgKyBwZXJjZW50KTtcbiAgICAgICAgICAgICQoXCIjcmVjb3JkZXItdXBsb2FkZXJcIikuZmluZChcIi5iYXJcIikuY3NzKCd3aWR0aCcsIHBlcmNlbnQpO1xuICAgICAgICB9O1xuICAgICAgICB4aHIub25sb2FkID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICQoXCIjcmVjb3JkZXItdXBsb2FkZXJcIikuZmluZChcIi5iYXJcIikuY3NzKCd3aWR0aCcsICcxMDAlJyk7XG4gICAgICAgICAgICBpZiAoeGhyLnN0YXR1cyA9PSAyMDApIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlJlY29yZGVyOjpvblJlY29yZGluZ0NvbXBsZXRlZCgpOyBtYW51YWwgeGhyIHN1Y2Nlc3NmdWxcIik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUmVjb3JkZXI6Om9uUmVjb3JkaW5nQ29tcGxldGVkKCk7IG1hbnVhbCB4aHIgZXJyb3JcIiwgeGhyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBKU09OLnBhcnNlKHhoci5yZXNwb25zZSk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcInhoci5yZXNwb25zZVwiLCB4aHIucmVzcG9uc2UpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJyZXN1bHRcIiwgcmVzdWx0KTtcblxuICAgICAgICAgICAgaWYgKHJlc3VsdC5zdGF0dXMgPT0gXCJzdWNjZXNzXCIpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IHJlc3VsdC51cmw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHhoci5zZW5kKGRhdGEpO1xuICAgIH1cblxuICAgIG9uUmVjb3JkaW5nVGljaygpIHtcbiAgICAgICAgdmFyIHRpbWVTcGFuID0gcGFyc2VJbnQoKChuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIHRoaXMudGltZXJTdGFydCkgLyAxMDAwKS50b0ZpeGVkKCkpO1xuICAgICAgICB2YXIgdGltZVN0ciA9IHRoaXMuSW50VG9UaW1lKHRpbWVTcGFuKTtcbiAgICAgICAgdGhpcy5tb2RlbC5zZXQoJ3JlY29yZGluZ1RpbWUnLCB0aW1lU3RyKTtcbiAgICB9XG5cbiAgICBvbkNvdW50ZG93blRpY2soKSB7XG4gICAgICAgIGlmICgtLXRoaXMudGltZXJTdGFydCA+IDApIHtcbiAgICAgICAgICAgIHRoaXMubW9kZWwuc2V0KCdyZWNvcmRpbmdUaW1lJywgdGhpcy50aW1lclN0YXJ0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiY291bnRkb3duIGhpdCB6ZXJvLiBiZWdpbiByZWNvcmRpbmcuXCIpO1xuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLnRpbWVySWQpO1xuICAgICAgICAgICAgdGhpcy5tb2RlbC5zZXQoJ3JlY29yZGluZ1RpbWUnLCB0aGlzLkludFRvVGltZSgwKSk7XG4gICAgICAgICAgICB0aGlzLm9uTWljUmVjb3JkaW5nKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzdGFydFJlY29yZGluZygpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJzdGFydGluZyByZWNvcmRpbmdcIik7XG4gICAgICAgIHRoaXMuYXVkaW9DYXB0dXJlLnN0YXJ0KCgpID0+IHRoaXMub25NaWNSZWFkeSgpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNaWNyb3Bob25lIGlzIHJlYWR5IHRvIHJlY29yZC4gRG8gYSBjb3VudC1kb3duLCB0aGVuIHNpZ25hbCBmb3IgaW5wdXQtc2lnbmFsIHRvIGJlZ2luIHJlY29yZGluZ1xuICAgICAqL1xuICAgIG9uTWljUmVhZHkoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwibWljIHJlYWR5IHRvIHJlY29yZC4gZG8gY291bnRkb3duLlwiKTtcbiAgICAgICAgdGhpcy50aW1lclN0YXJ0ID0gMztcbiAgICAgICAgLy8gcnVuIGNvdW50ZG93blxuICAgICAgICAvL3RoaXMudGltZXJJZCA9IHNldEludGVydmFsKHRoaXMub25Db3VudGRvd25UaWNrLmJpbmQodGhpcyksIDEwMDApO1xuXG4gICAgICAgIC8vIG9yIGxhdW5jaCBjYXB0dXJlIGltbWVkaWF0ZWx5XG4gICAgICAgIHRoaXMubW9kZWwuc2V0KCdyZWNvcmRpbmdUaW1lJywgdGhpcy5JbnRUb1RpbWUoMCkpO1xuICAgICAgICB0aGlzLm9uTWljUmVjb3JkaW5nKCk7XG5cbiAgICAgICAgJChcIi5yZWNvcmRpbmctdGltZVwiKS5hZGRDbGFzcyhcImlzLXZpc2libGVcIik7XG4gICAgfVxuXG4gICAgb25NaWNSZWNvcmRpbmcoKSB7XG4gICAgICAgIHRoaXMudGltZXJTdGFydCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgICB0aGlzLnRpbWVySWQgPSBzZXRJbnRlcnZhbCh0aGlzLm9uUmVjb3JkaW5nVGljay5iaW5kKHRoaXMpLCAxMDAwKTtcbiAgICAgICAgJChcIi5tLXJlY29yZGluZy1zY3JlZW5cIikuYWRkQ2xhc3MoXCJpcy1yZWNvcmRpbmdcIik7XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJNaWMgcmVjb3JkaW5nIHN0YXJ0ZWRcIik7XG5cbiAgICAgICAgLy8gVE9ETzogdGhlIG1pYyBjYXB0dXJlIGlzIGFscmVhZHkgYWN0aXZlLCBzbyBhdWRpbyBidWZmZXJzIGFyZSBnZXR0aW5nIGJ1aWx0IHVwXG4gICAgICAgIC8vIHdoZW4gdG9nZ2xpbmcgdGhpcyBvbiwgd2UgbWF5IGFscmVhZHkgYmUgY2FwdHVyaW5nIGEgYnVmZmVyIHRoYXQgaGFzIGF1ZGlvIHByaW9yIHRvIHRoZSBjb3VudGRvd25cbiAgICAgICAgLy8gaGl0dGluZyB6ZXJvLiB3ZSBjYW4gZG8gYSBmZXcgdGhpbmdzIGhlcmU6XG4gICAgICAgIC8vIDEpIGZpZ3VyZSBvdXQgaG93IG11Y2ggYXVkaW8gd2FzIGFscmVhZHkgY2FwdHVyZWQsIGFuZCBjdXQgaXQgb3V0XG4gICAgICAgIC8vIDIpIHVzZSBhIGZhZGUtaW4gdG8gY292ZXIgdXAgdGhhdCBzcGxpdC1zZWNvbmQgb2YgYXVkaW9cbiAgICAgICAgLy8gMykgYWxsb3cgdGhlIHVzZXIgdG8gZWRpdCBwb3N0LXJlY29yZCBhbmQgY2xpcCBhcyB0aGV5IHdpc2ggKGJldHRlciBidXQgbW9yZSBjb21wbGV4IG9wdGlvbiEpXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4gdGhpcy5hdWRpb0NhcHR1cmUudG9nZ2xlTWljcm9waG9uZVJlY29yZGluZyh0cnVlKSwgNTAwKTtcbiAgICB9XG5cbiAgICBzdG9wUmVjb3JkaW5nKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcInN0b3BwaW5nIHJlY29yZGluZ1wiKTtcbiAgICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLnRpbWVySWQpO1xuXG4gICAgICAgIC8vIHBsYXkgc291bmQgaW1tZWRpYXRlbHkgdG8gYnlwYXNzIG1vYmlsZSBjaHJvbWUncyBcInVzZXIgaW5pdGlhdGVkIG1lZGlhXCIgcmVxdWlyZW1lbnRcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5zcmMgPSBcIi9hc3NldHMvc291bmRzL2JlZXBfc2hvcnRfb24ub2dnXCI7XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIucGxheSgpO1xuXG4gICAgICAgIHRoaXMuYXVkaW9DYXB0dXJlLnN0b3AoKGJsb2IpID0+IHRoaXMub25SZWNvcmRpbmdDb21wbGV0ZWQoYmxvYikpO1xuXG4gICAgICAgICQoXCIucmVjb3JkaW5nLXRpbWVcIikucmVtb3ZlQ2xhc3MoXCJpcy12aXNpYmxlXCIpO1xuICAgICAgICAkKFwiLm0tcmVjb3JkaW5nLXNjcmVlblwiKS5yZW1vdmVDbGFzcyhcImlzLXJlY29yZGluZ1wiKTtcblxuICAgICAgICAvLyBUT0RPOiBhbmltYXRlIHJlY29yZGVyIG91dFxuICAgICAgICAvLyBUT0RPOiBhbmltYXRlIHVwbG9hZGVyIGluXG4gICAgfVxuXG4gICAgb25SZWNvcmRpbmdDb21wbGV0ZWQoYmxvYikge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlJlY29yZGVyOjpvblJlY29yZGluZ0NvbXBsZXRlZCgpOyBwcmV2aWV3aW5nIHJlY29yZGVkIGF1ZGlvXCIpO1xuICAgICAgICB0aGlzLmF1ZGlvQmxvYiA9IGJsb2I7XG4gICAgICAgIHRoaXMuc2hvd0NvbXBsZXRpb25TY3JlZW4oKTtcbiAgICB9XG5cbiAgICBwbGF5UHJldmlldygpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJwbGF5aW5nIHByZXZpZXcuLlwiKTtcbiAgICAgICAgY29uc29sZS5sb2coXCJhdWRpbyBibG9iXCIsIHRoaXMuYXVkaW9CbG9iKTtcbiAgICAgICAgY29uc29sZS5sb2coXCJhdWRpbyBibG9iIHVybFwiLCB0aGlzLmF1ZGlvQmxvYlVybCk7XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIuc3JjID0gdGhpcy5hdWRpb0Jsb2JVcmw7XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIucGxheSgpO1xuICAgIH1cblxuICAgIHNob3dDb21wbGV0aW9uU2NyZWVuKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlJlY29yZGVyOjpvblJlY29yZGluZ0NvbXBsZXRlZCgpOyBmbGlwcGluZyB0byBhdWRpbyBwbGF5YmFja1wiKTtcbiAgICAgICAgdGhpcy5hdWRpb0Jsb2JVcmwgPSB3aW5kb3cuVVJMLmNyZWF0ZU9iamVjdFVSTCh0aGlzLmF1ZGlvQmxvYik7XG4gICAgICAgICQoXCIubS1yZWNvcmRpbmctY29udGFpbmVyXCIpLmFkZENsYXNzKFwiZmxpcHBlZFwiKTtcblxuICAgICAgICAvL2NvbnNvbGUuZGlyKHRoaXMuYXVkaW9CbG9iVXJsKTtcbiAgICAgICAgLy9cbiAgICAgICAgLy90aGlzLmF1ZGlvUGxheWVyLnNyYyA9IHRoaXMuYXVkaW9CbG9iVXJsO1xuICAgICAgICAvL3RoaXMuYXVkaW9QbGF5ZXIucGxheSgpO1xuICAgICAgICAvL3JldHVybjtcblxuICAgICAgICAvLyBIQUNLOiByb3V0ZSBibG9iIHRocm91Z2ggeGhyIHRvIGxldCBBbmRyb2lkIENocm9tZSBwbGF5IGJsb2JzIHZpYSA8YXVkaW8+XG4gICAgICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICAgICAgeGhyLm9wZW4oJ0dFVCcsIHRoaXMuYXVkaW9CbG9iVXJsLCB0cnVlKTtcbiAgICAgICAgeGhyLnJlc3BvbnNlVHlwZSA9ICdibG9iJztcbiAgICAgICAgeGhyLm92ZXJyaWRlTWltZVR5cGUoJ2F1ZGlvL3dhdicpO1xuXG4gICAgICAgIHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoeGhyLnJlYWR5U3RhdGUgPT09IDQgJiYgeGhyLnN0YXR1cyA9PSAyMDApIHtcbiAgICAgICAgICAgICAgICB2YXIgeGhyQmxvYlVybCA9IHdpbmRvdy5VUkwuY3JlYXRlT2JqZWN0VVJMKHhoci5yZXNwb25zZSk7XG5cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkxvYWRlZCBibG9iIGZyb20gY2FjaGUgdXJsOiBcIiArIHRoaXMuYXVkaW9CbG9iVXJsKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlJvdXRlZCBpbnRvIGJsb2IgdXJsOiBcIiArIHhockJsb2JVcmwpO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5hdWRpb1BsYXllci5zcmMgPSB4aHJCbG9iVXJsO1xuICAgICAgICAgICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIucGxheSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICB4aHIuc2VuZCgpO1xuICAgIH1cbn1cbiJdfQ==
