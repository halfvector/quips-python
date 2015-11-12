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
    Raven.config('https://d098712cb7064cf08b74d01b6f3be3da@app.getsentry.com/20973', {
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
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var AudioCapture = (function () {
    function AudioCapture() {
        _classCallCheck(this, AudioCapture);

        // spawn background worker
        this._encodingWorker = new Worker("/assets/js/worker-encoder.min.js");

        console.log("Initialized AudioCapture");

        _underscore2["default"].extend(this, {
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
            _cachedGainValue: 1,
            _onStartedCallback: null,

            _fftSize: 256,
            _fftSmoothing: 0.8,
            _totalNumSamples: 0
        });
    }

    // unused at the moment

    // TODO: firefox's built-in ogg-creation route
    // Firefox 27's manual recording doesn't work. something funny with their sampling rates or buffer sizes
    // the data is fairly garbled, like they are serving 22khz as 44khz or something like that

    _createClass(AudioCapture, [{
        key: "startAutomaticEncoding",
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
        key: "createAudioContext",
        value: function createAudioContext(mediaStream) {
            // build capture graph
            var AudioContextCreator = window.AudioContext || window.webkitAudioContext;

            this._audioContext = new AudioContextCreator();
            this._audioInput = this._audioContext.createMediaStreamSource(mediaStream);

            console.log("AudioCapture::startManualEncoding(); _audioContext.sampleRate: " + this._audioContext.sampleRate + " Hz");

            // create a listener node to grab microphone samples and feed it to our background worker
            this._audioListener = (this._audioContext.createScriptProcessor || this._audioContext.createJavaScriptNode).call(this._audioContext, 1024, 1, 1);

            console.log("this._cachedGainValue = " + this._cachedGainValue);

            this._audioGain = this._audioContext.createGain();
            this._audioGain.gain.value = this._cachedGainValue;

            //this._audioAnalyzer = this._audioContext.createAnalyser();
            //this._audioAnalyzer.fftSize = this._fftSize;
            //this._audioAnalyzer.smoothingTimeConstant = this._fftSmoothing;
        }
    }, {
        key: "startManualEncoding",
        value: function startManualEncoding(mediaStream) {
            var _this = this;

            if (!this._audioContext) {
                this.createAudioContext(mediaStream);
            }

            if (!this._encodingWorker) this._encodingWorker = new Worker("/assets/js/worker-encoder.min.js");

            // re-hook audio listener node every time we start, because _encodingWorker reference will change
            this._audioListener.onaudioprocess = function (e) {
                if (!_this._isRecording) return;

                var msg = {
                    action: "process",

                    // two Float32Arrays
                    left: e.inputBuffer.getChannelData(0),
                    right: e.inputBuffer.getChannelData(0)
                };

                _this._totalNumSamples += e.inputBuffer.getChannelData(0).length / 4;

                _this._encodingWorker.postMessage(msg);
            };

            // handle messages from the encoding-worker
            this._encodingWorker.onmessage = function (e) {

                // worker finished and has the final encoded audio buffer for us
                if (e.data.action === "encoded") {
                    var oggBuffer = e.data.buffer.slice(0);

                    var encoded_blob = new Blob([oggBuffer], { type: 'audio/ogx' });

                    console.log("this._totalNumSamples = " + _this._totalNumSamples);
                    console.log("this._audioContext.sampleRate = " + _this._audioContext.sampleRate);

                    console.log("got encoded blob: size=" + encoded_blob.size + " type=" + encoded_blob.type);

                    if (_this._onCaptureCompleteCallback) _this._onCaptureCompleteCallback(encoded_blob);

                    // worker has exited, unreference it
                    _this._encodingWorker = null;

                    //var buffer = this._audioContext.createBuffer(1, this._totalNumSamples, this._audioContext.sampleRate);
                    //var buf = buffer.getChannelData(0);
                    //for (var i = 0; i < e.data.buffer.length; ++i) {
                    //    buf[i] = e.data.buffer[i];
                    //}

                    //var dst = this._audioContext.destination;
                    //var source = this._audioContext.createBufferSource();
                    //this._audioContext.decodeAudioData(buf.buffer, (result) => {
                    //    console.log("decoded audio");
                    //    source.buffer = result;
                    //    source.connect(dst);
                    //    source.start(0);
                    //}, (error) => { console.log("hit a snag decoding audio data:", error)});
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
            this._audioListener.connect(this._audioContext.destination);

            return true;
        }
    }, {
        key: "shutdownManualEncoding",
        value: function shutdownManualEncoding() {
            console.log("AudioCapture::shutdownManualEncoding(); Tearing down AudioAPI connections..");

            console.log("disconnecting: listener->destination");
            this._audioListener.disconnect(this._audioContext.destination);
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
    }, {
        key: "toggleMicrophoneRecording",
        value: function toggleMicrophoneRecording(captureAudioSamples) {
            this._isRecording = captureAudioSamples;
        }

        // called when user allows us use of their microphone
    }, {
        key: "onMicrophoneProvided",
        value: function onMicrophoneProvided(mediaStream) {

            this._cachedMediaStream = mediaStream;

            // we could check if the browser can perform its own encoding and use that
            // Firefox can provide us ogg+speex or ogg+opus? files, but unfortunately that codec isn't supported widely enough
            // so instead we perform manual encoding everywhere right now to get us ogg+vorbis
            // though one day, i want ogg+opus! opus has a wonderful range of quality settings perfect for this project

            if (false && typeof MediaRecorder !== "undefined") {
                this.startAutomaticEncoding(mediaStream);
            } else {
                // no media recorder available, do it manually
                this.startManualEncoding(mediaStream);
            }

            // TODO: might be a good time to start a spectral analyzer
            if (this._onStartedCallback) this._onStartedCallback();
        }
    }, {
        key: "setGain",
        value: function setGain(gain) {
            if (this._audioGain) this._audioGain.gain.value = gain;

            console.log("setting gain: " + gain);
            this._cachedGainValue = gain;
        }
    }, {
        key: "preloadMediaStream",
        value: function preloadMediaStream() {
            var _this2 = this;

            if (this._cachedMediaStream) return;

            navigator.mediaDevices = navigator.mediaDevices || (navigator.mozGetUserMedia || navigator.webkitGetUserMedia ? {
                getUserMedia: function getUserMedia(c) {
                    return new Promise(function (y, n) {
                        (navigator.mozGetUserMedia || navigator.webkitGetUserMedia).call(navigator, c, y, n);
                    });
                }
            } : null);

            if (!navigator.mediaDevices) {
                console.warn("start(); getUserMedia() not supported.");
                return;
            }

            navigator.mediaDevices.getUserMedia({ audio: true }).then(function (ms) {
                _this2._cachedMediaStream = ms;
            })["catch"](function (err) {
                console.log("AudioCapture::start(); could not grab microphone. perhaps user didn't give us permission?");
                console.warn(err);
            });
        }
    }, {
        key: "start",
        value: function start(onStartedCallback) {
            var _this3 = this;

            this._onStartedCallback = onStartedCallback;

            if (this._cachedMediaStream) return this.onMicrophoneProvided(this._cachedMediaStream);

            navigator.mediaDevices = navigator.mediaDevices || (navigator.mozGetUserMedia || navigator.webkitGetUserMedia ? {
                getUserMedia: function getUserMedia(c) {
                    return new Promise(function (y, n) {
                        (navigator.mozGetUserMedia || navigator.webkitGetUserMedia).call(navigator, c, y, n);
                    });
                }
            } : null);

            if (!navigator.mediaDevices) {
                console.warn("start(); getUserMedia() not supported.");
                return;
            }

            navigator.mediaDevices.getUserMedia({ audio: true }).then(function (ms) {
                return _this3.onMicrophoneProvided(ms);
            })["catch"](function (err) {
                console.log("AudioCapture::start(); could not grab microphone. perhaps user didn't give us permission?");
                console.warn(err);
            });

            return true;
        }
    }, {
        key: "stop",
        value: function stop(captureCompleteCallback) {
            this._onCaptureCompleteCallback = captureCompleteCallback;
            this._isRecording = false;

            if (this._audioContext) {
                // stop the manual encoder
                this._encodingWorker.postMessage({ action: "finish" });
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
            console.log('this.audioPlayer = ' + this.audioPlayer);

            //this.audioPlayer.loop = "loop";
            //this.audioPlayer.autoplay = "autoplay";
            this.audioPlayer.src = "/assets/sounds/beep_short_on.ogg";
            this.audioPlayer.play();

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
                console.dir(result);

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
            this.audioPlayer.src = "/assets/sounds/beep_short_off.ogg";
            this.audioPlayer.play();
            this.audioPlayer.loop = true;

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
            console.log("Recorder::onRecordingCompleted(); flipping card");
            this.audioBlobUrl = window.URL.createObjectURL(this.audioBlob);
            $(".m-recording-container").addClass("flipped");

            // TODO: get a chainable animations library that supports delays
            //setTimeout(() => {
            //    console.log("Recorder::onRecordingCompleted(); assigning blob url: " + url);
            //this.audioPlayer.src = url;
            //this.audioPlayer.play();
            this.audioPlayer.loop = false;
            console.log("audio player with blob", this.audioPlayer);
            //}, 200);
        }
    }]);

    return RecorderView;
})(_backbone2['default'].View);

exports.RecorderView = RecorderView;

},{"./audio-capture":2,"./quip-control.js":5,"backbone":"backbone"}]},{},[1])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvYWJhcmthbi9hbGV4LWRldi9xdWlwcy1weXRob24vYXBwL2phdmFzY3JpcHRzL2FwcC5qcyIsIi9Vc2Vycy9hYmFya2FuL2FsZXgtZGV2L3F1aXBzLXB5dGhvbi9hcHAvamF2YXNjcmlwdHMvYXVkaW8tY2FwdHVyZS5qcyIsIi9Vc2Vycy9hYmFya2FuL2FsZXgtZGV2L3F1aXBzLXB5dGhvbi9hcHAvamF2YXNjcmlwdHMvYXVkaW8tcGxheWVyLmpzIiwiL1VzZXJzL2FiYXJrYW4vYWxleC1kZXYvcXVpcHMtcHl0aG9uL2FwcC9qYXZhc2NyaXB0cy9ob21lcGFnZS5qcyIsIi9Vc2Vycy9hYmFya2FuL2FsZXgtZGV2L3F1aXBzLXB5dGhvbi9hcHAvamF2YXNjcmlwdHMvcXVpcC1jb250cm9sLmpzIiwiL1VzZXJzL2FiYXJrYW4vYWxleC1kZXYvcXVpcHMtcHl0aG9uL2FwcC9qYXZhc2NyaXB0cy9yZWNvcmRpbmctY29udHJvbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7d0JDQXFCLFVBQVU7Ozs7d0JBQ0osWUFBWTs7OztnQ0FDQSxxQkFBcUI7O0lBRXRELFdBQVcsR0FDRixTQURULFdBQVcsR0FDQzswQkFEWixXQUFXOztBQUVULDBCQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDZiwwQkFBUyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7O0FBRXpCLFFBQUksSUFBSSxHQUFHLDJCQUFvQixDQUFDO0FBQ2hDLFFBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQzs7QUFFZCxRQUFJLFFBQVEsR0FBRyxtQ0FBaUI7QUFDNUIsVUFBRSxFQUFFLENBQUMsQ0FBQyx3QkFBd0IsQ0FBQztBQUMvQixhQUFLLEVBQUUsK0JBQWEsRUFBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQztLQUMzQyxDQUFDLENB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LGdCQUFJLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxDQUFDO1NBQzNCOzs7ZUFFbUIsZ0NBQUc7QUFDbkIsbUJBQU8sQ0FBQyxHQUFHLENBQUMsaURBQWlELENBQUMsQ0FBQztBQUMvRCxnQkFBSSxDQUFDLFlBQVksR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDL0QsYUFBQyxDQUFDLHdCQUF3QixDQUFDLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDOzs7Ozs7O0FBTzVDLGdCQUFJLENBQUMsV0FBVyxDQUFDLElBQUksR0FBRyxLQUFLLENBQUM7QUFDOUIsbUJBQU8sQ0FBQyxHQUFHLENBQUMsd0JBQXdCLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDOztTQUUvRDs7O1dBaFNRLFlBQVk7R0FBUyxzQkFBUyxJQUFJIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImltcG9ydCBCYWNrYm9uZSBmcm9tICdiYWNrYm9uZSdcbmltcG9ydCBSZWNvcmRpbmdzTGlzdCBmcm9tICcuL2hvbWVwYWdlJ1xuaW1wb3J0IHsgUmVjb3JkZXJWaWV3LCBSZWNvcmRlciB9IGZyb20gJy4vcmVjb3JkaW5nLWNvbnRyb2wnXG5cbmNsYXNzIEFwcGxpY2F0aW9uIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgQmFja2JvbmUuJCA9ICQ7XG4gICAgICAgIEJhY2tib25lLmhpc3Rvcnkuc3RhcnQoKTtcblxuICAgICAgICB2YXIgdmlldyA9IG5ldyBSZWNvcmRpbmdzTGlzdCgpO1xuICAgICAgICB2aWV3LnJlbmRlcigpO1xuXG4gICAgICAgIHZhciByZWNvcmRlciA9IG5ldyBSZWNvcmRlclZpZXcoe1xuICAgICAgICAgICAgZWw6ICQoJy5tLXJlY29yZGluZy1jb250YWluZXInKSxcbiAgICAgICAgICAgIG1vZGVsOiBuZXcgUmVjb3JkZXIoe3JlY29yZGluZ1RpbWU6IC0zfSlcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8vLyBsb2NhdGUgYW55IGNvbnRyb2xsZXJzIG9uIHRoZSBwYWdlIGFuZCBsb2FkIHRoZWlyIHJlcXVpcmVtZW50c1xuICAgICAgICAvLy8vIHRoaXMgaXMgYSBwYXJ0IG9mIEFuZ3VsYXIgaSByZWFsbHkgbGlrZWQsIHRoZSBjdXN0b20gZGlyZWN0aXZlc1xuICAgICAgICAvLyQoJ1tiYWNrYm9uZS1jb250cm9sbGVyXScpLmVhY2goZnVuY3Rpb24oZWwpIHtcbiAgICAgICAgLy9cbiAgICAgICAgLy8gICAgdmFyIGNvbnRyb2xsZXJOYW1lID0gJChlbCkuYXR0cignYmFja2JvbmUtY29udHJvbGxlcicpO1xuICAgICAgICAvLyAgICBpZihjb250cm9sbGVyTmFtZSBpbiBBcHAuTG9hZGVycylcbiAgICAgICAgLy8gICAgICAgIEFwcC5Mb2FkZXJzW2NvbnRyb2xsZXJOYW1lXSgpO1xuICAgICAgICAvLyAgICBlbHNlXG4gICAgICAgIC8vICAgICAgICBjb25zb2xlLmVycm9yKFwiQ29udHJvbGxlcjogJ1wiICsgY29udHJvbGxlck5hbWUgKyBcIicgbm90IGZvdW5kXCIpO1xuICAgICAgICAvL30pO1xuICAgIH1cbn1cblxuJCgoKSA9PiB7XG4gICAgLy8gc2V0dXAgcmF2ZW4gdG8gcHVzaCBtZXNzYWdlcyB0byBvdXIgc2VudHJ5XG4gICAgUmF2ZW4uY29uZmlnKCdodHRwczovL2QwOTg3MTJjYjcwNjRjZjA4Yjc0ZDAxYjZmM2JlM2RhQGFwcC5nZXRzZW50cnkuY29tLzIwOTczJywge1xuICAgICAgICB3aGl0ZWxpc3RVcmxzOiBbJ3N0YWdpbmcuY291Y2hwb2QuY29tJywgJ2NvdWNocG9kLmNvbSddIC8vIHByb2R1Y3Rpb24gb25seVxuICAgIH0pLmluc3RhbGwoKTtcblxuICAgIG5ldyBBcHBsaWNhdGlvbigpO1xuXG4gICAgLy8gZm9yIHByb2R1Y3Rpb24sIGNvdWxkIHdyYXAgZG9tUmVhZHlDYWxsYmFjayBhbmQgbGV0IHJhdmVuIGhhbmRsZSBhbnkgZXhjZXB0aW9uc1xuXG4gICAgLypcbiAgICB0cnkge1xuICAgICAgICBkb21SZWFkeUNhbGxiYWNrKCk7XG4gICAgfSBjYXRjaChlcnIpIHtcbiAgICAgICAgUmF2ZW4uY2FwdHVyZUV4Y2VwdGlvbihlcnIpO1xuICAgICAgICBjb25zb2xlLmxvZyhcIltFcnJvcl0gVW5oYW5kbGVkIEV4Y2VwdGlvbiB3YXMgY2F1Z2h0IGFuZCBzZW50IHZpYSBSYXZlbjpcIik7XG4gICAgICAgIGNvbnNvbGUuZGlyKGVycik7XG4gICAgfVxuICAgICovXG59KVxuXG5leHBvcnQgZGVmYXVsdCB7IEFwcGxpY2F0aW9uIH1cbiIsImltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnXG5cbmV4cG9ydCBjbGFzcyBBdWRpb0NhcHR1cmUge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICAvLyBzcGF3biBiYWNrZ3JvdW5kIHdvcmtlclxuICAgICAgICB0aGlzLl9lbmNvZGluZ1dvcmtlciA9IG5ldyBXb3JrZXIoXCIvYXNzZXRzL2pzL3dvcmtlci1lbmNvZGVyLm1pbi5qc1wiKTtcblxuICAgICAgICBjb25zb2xlLmxvZyhcIkluaXRpYWxpemVkIEF1ZGlvQ2FwdHVyZVwiKTtcblxuICAgICAgICBfLmV4dGVuZCh0aGlzLCB7XG4gICAgICAgICAgICBfYXVkaW9Db250ZXh0OiBudWxsLFxuICAgICAgICAgICAgX2F1ZGlvSW5wdXQ6IG51bGwsXG4gICAgICAgICAgICBfZW5jb2RpbmdXb3JrZXI6IG51bGwsXG4gICAgICAgICAgICBfaXNSZWNvcmRpbmc6IGZhbHNlLFxuICAgICAgICAgICAgX2F1ZGlvTGlzdGVuZXI6IG51bGwsXG4gICAgICAgICAgICBfb25DYXB0dXJlQ29tcGxldGVDYWxsYmFjazogbnVsbCxcbiAgICAgICAgICAgIF9hdWRpb0FuYWx5emVyOiBudWxsLFxuICAgICAgICAgICAgX2F1ZGlvR2FpbjogbnVsbCxcbiAgICAgICAgICAgIF9jYWNoZWRNZWRpYVN0cmVhbTogbnVsbCxcblxuICAgICAgICAgICAgX2F1ZGlvRW5jb2RlcjogbnVsbCxcbiAgICAgICAgICAgIF9sYXRlc3RBdWRpb0J1ZmZlcjogW10sXG4gICAgICAgICAgICBfY2FjaGVkR2FpblZhbHVlOiAxLFxuICAgICAgICAgICAgX29uU3RhcnRlZENhbGxiYWNrOiBudWxsLFxuXG4gICAgICAgICAgICBfZmZ0U2l6ZTogMjU2LFxuICAgICAgICAgICAgX2ZmdFNtb290aGluZzogMC44LFxuICAgICAgICAgICAgX3RvdGFsTnVtU2FtcGxlczogMFxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBUT0RPOiBmaXJlZm94J3MgYnVpbHQtaW4gb2dnLWNyZWF0aW9uIHJvdXRlXG4gICAgLy8gRmlyZWZveCAyNydzIG1hbnVhbCByZWNvcmRpbmcgZG9lc24ndCB3b3JrLiBzb21ldGhpbmcgZnVubnkgd2l0aCB0aGVpciBzYW1wbGluZyByYXRlcyBvciBidWZmZXIgc2l6ZXNcbiAgICAvLyB0aGUgZGF0YSBpcyBmYWlybHkgZ2FyYmxlZCwgbGlrZSB0aGV5IGFyZSBzZXJ2aW5nIDIya2h6IGFzIDQ0a2h6IG9yIHNvbWV0aGluZyBsaWtlIHRoYXRcbiAgICBzdGFydEF1dG9tYXRpY0VuY29kaW5nKG1lZGlhU3RyZWFtKSB7XG4gICAgICAgIHRoaXMuX2F1ZGlvRW5jb2RlciA9IG5ldyBNZWRpYVJlY29yZGVyKG1lZGlhU3RyZWFtKTtcblxuICAgICAgICB0aGlzLl9hdWRpb0VuY29kZXIub25kYXRhYXZhaWxhYmxlID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQXVkaW9DYXB0dXJlOjpzdGFydEF1dG9tYXRpY0VuY29kaW5nKCk7IE1lZGlhUmVjb3JkZXIub25kYXRhYXZhaWxhYmxlKCk7IG5ldyBibG9iOiBzaXplPVwiICsgZS5kYXRhLnNpemUgKyBcIiB0eXBlPVwiICsgZS5kYXRhLnR5cGUpO1xuICAgICAgICAgICAgdGhpcy5fbGF0ZXN0QXVkaW9CdWZmZXIucHVzaChlLmRhdGEpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuX2F1ZGlvRW5jb2Rlci5vbnN0b3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkF1ZGlvQ2FwdHVyZTo6c3RhcnRBdXRvbWF0aWNFbmNvZGluZygpOyBNZWRpYVJlY29yZGVyLm9uc3RvcCgpOyBoaXRcIik7XG5cbiAgICAgICAgICAgIC8vIHNlbmQgdGhlIGxhc3QgY2FwdHVyZWQgYXVkaW8gYnVmZmVyXG4gICAgICAgICAgICB2YXIgZW5jb2RlZF9ibG9iID0gbmV3IEJsb2IodGhpcy5fbGF0ZXN0QXVkaW9CdWZmZXIsIHt0eXBlOiAnYXVkaW8vb2dnJ30pO1xuXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkF1ZGlvQ2FwdHVyZTo6c3RhcnRBdXRvbWF0aWNFbmNvZGluZygpOyBNZWRpYVJlY29yZGVyLm9uc3RvcCgpOyBnb3QgZW5jb2RlZCBibG9iOiBzaXplPVwiICsgZW5jb2RlZF9ibG9iLnNpemUgKyBcIiB0eXBlPVwiICsgZW5jb2RlZF9ibG9iLnR5cGUpO1xuXG4gICAgICAgICAgICBpZiAodGhpcy5fb25DYXB0dXJlQ29tcGxldGVDYWxsYmFjaylcbiAgICAgICAgICAgICAgICB0aGlzLl9vbkNhcHR1cmVDb21wbGV0ZUNhbGxiYWNrKGVuY29kZWRfYmxvYik7XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJBdWRpb0NhcHR1cmU6OnN0YXJ0QXV0b21hdGljRW5jb2RpbmcoKTsgTWVkaWFSZWNvcmRlci5zdGFydCgpXCIpO1xuICAgICAgICB0aGlzLl9hdWRpb0VuY29kZXIuc3RhcnQoMCk7XG4gICAgfVxuXG4gICAgY3JlYXRlQXVkaW9Db250ZXh0KG1lZGlhU3RyZWFtKSB7XG4gICAgICAgIC8vIGJ1aWxkIGNhcHR1cmUgZ3JhcGhcbiAgICAgICAgdmFyIEF1ZGlvQ29udGV4dENyZWF0b3IgPSB3aW5kb3cuQXVkaW9Db250ZXh0IHx8IHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQ7XG5cbiAgICAgICAgdGhpcy5fYXVkaW9Db250ZXh0ID0gbmV3IEF1ZGlvQ29udGV4dENyZWF0b3IoKTtcbiAgICAgICAgdGhpcy5fYXVkaW9JbnB1dCA9IHRoaXMuX2F1ZGlvQ29udGV4dC5jcmVhdGVNZWRpYVN0cmVhbVNvdXJjZShtZWRpYVN0cmVhbSk7XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJBdWRpb0NhcHR1cmU6OnN0YXJ0TWFudWFsRW5jb2RpbmcoKTsgX2F1ZGlvQ29udGV4dC5zYW1wbGVSYXRlOiBcIiArIHRoaXMuX2F1ZGlvQ29udGV4dC5zYW1wbGVSYXRlICsgXCIgSHpcIik7XG5cbiAgICAgICAgLy8gY3JlYXRlIGEgbGlzdGVuZXIgbm9kZSB0byBncmFiIG1pY3JvcGhvbmUgc2FtcGxlcyBhbmQgZmVlZCBpdCB0byBvdXIgYmFja2dyb3VuZCB3b3JrZXJcbiAgICAgICAgdGhpcy5fYXVkaW9MaXN0ZW5lciA9ICh0aGlzLl9hdWRpb0NvbnRleHQuY3JlYXRlU2NyaXB0UHJvY2Vzc29yIHx8IHRoaXMuX2F1ZGlvQ29udGV4dC5jcmVhdGVKYXZhU2NyaXB0Tm9kZSkuY2FsbCh0aGlzLl9hdWRpb0NvbnRleHQsIDEwMjQsIDEsIDEpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwidGhpcy5fY2FjaGVkR2FpblZhbHVlID0gXCIgKyB0aGlzLl9jYWNoZWRHYWluVmFsdWUpO1xuXG4gICAgICAgIHRoaXMuX2F1ZGlvR2FpbiA9IHRoaXMuX2F1ZGlvQ29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgICAgIHRoaXMuX2F1ZGlvR2Fpbi5nYWluLnZhbHVlID0gdGhpcy5fY2FjaGVkR2FpblZhbHVlO1xuXG4gICAgICAgIC8vdGhpcy5fYXVkaW9BbmFseXplciA9IHRoaXMuX2F1ZGlvQ29udGV4dC5jcmVhdGVBbmFseXNlcigpO1xuICAgICAgICAvL3RoaXMuX2F1ZGlvQW5hbHl6ZXIuZmZ0U2l6ZSA9IHRoaXMuX2ZmdFNpemU7XG4gICAgICAgIC8vdGhpcy5fYXVkaW9BbmFseXplci5zbW9vdGhpbmdUaW1lQ29uc3RhbnQgPSB0aGlzLl9mZnRTbW9vdGhpbmc7XG4gICAgfVxuXG4gICAgc3RhcnRNYW51YWxFbmNvZGluZyhtZWRpYVN0cmVhbSkge1xuXG4gICAgICAgIGlmICghdGhpcy5fYXVkaW9Db250ZXh0KSB7XG4gICAgICAgICAgICB0aGlzLmNyZWF0ZUF1ZGlvQ29udGV4dChtZWRpYVN0cmVhbSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXRoaXMuX2VuY29kaW5nV29ya2VyKVxuICAgICAgICAgICAgdGhpcy5fZW5jb2RpbmdXb3JrZXIgPSBuZXcgV29ya2VyKFwiL2Fzc2V0cy9qcy93b3JrZXItZW5jb2Rlci5taW4uanNcIik7XG5cbiAgICAgICAgLy8gcmUtaG9vayBhdWRpbyBsaXN0ZW5lciBub2RlIGV2ZXJ5IHRpbWUgd2Ugc3RhcnQsIGJlY2F1c2UgX2VuY29kaW5nV29ya2VyIHJlZmVyZW5jZSB3aWxsIGNoYW5nZVxuICAgICAgICB0aGlzLl9hdWRpb0xpc3RlbmVyLm9uYXVkaW9wcm9jZXNzID0gKGUpID0+IHtcbiAgICAgICAgICAgIGlmICghdGhpcy5faXNSZWNvcmRpbmcpIHJldHVybjtcblxuICAgICAgICAgICAgdmFyIG1zZyA9IHtcbiAgICAgICAgICAgICAgICBhY3Rpb246IFwicHJvY2Vzc1wiLFxuXG4gICAgICAgICAgICAgICAgLy8gdHdvIEZsb2F0MzJBcnJheXNcbiAgICAgICAgICAgICAgICBsZWZ0OiBlLmlucHV0QnVmZmVyLmdldENoYW5uZWxEYXRhKDApLFxuICAgICAgICAgICAgICAgIHJpZ2h0OiBlLmlucHV0QnVmZmVyLmdldENoYW5uZWxEYXRhKDApXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB0aGlzLl90b3RhbE51bVNhbXBsZXMgKz0gZS5pbnB1dEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKS5sZW5ndGggLyA0O1xuXG4gICAgICAgICAgICB0aGlzLl9lbmNvZGluZ1dvcmtlci5wb3N0TWVzc2FnZShtc2cpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIGhhbmRsZSBtZXNzYWdlcyBmcm9tIHRoZSBlbmNvZGluZy13b3JrZXJcbiAgICAgICAgdGhpcy5fZW5jb2RpbmdXb3JrZXIub25tZXNzYWdlID0gKGUpID0+IHtcblxuICAgICAgICAgICAgLy8gd29ya2VyIGZpbmlzaGVkIGFuZCBoYXMgdGhlIGZpbmFsIGVuY29kZWQgYXVkaW8gYnVmZmVyIGZvciB1c1xuICAgICAgICAgICAgaWYgKGUuZGF0YS5hY3Rpb24gPT09IFwiZW5jb2RlZFwiKSB7XG4gICAgICAgICAgICAgICAgdmFyIG9nZ0J1ZmZlciA9IGUuZGF0YS5idWZmZXIuc2xpY2UoMCk7XG5cbiAgICAgICAgICAgICAgICB2YXIgZW5jb2RlZF9ibG9iID0gbmV3IEJsb2IoW29nZ0J1ZmZlcl0sIHt0eXBlOiAnYXVkaW8vb2d4J30pO1xuXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJ0aGlzLl90b3RhbE51bVNhbXBsZXMgPSBcIiArIHRoaXMuX3RvdGFsTnVtU2FtcGxlcyk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJ0aGlzLl9hdWRpb0NvbnRleHQuc2FtcGxlUmF0ZSA9IFwiICsgdGhpcy5fYXVkaW9Db250ZXh0LnNhbXBsZVJhdGUpO1xuXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJnb3QgZW5jb2RlZCBibG9iOiBzaXplPVwiICsgZW5jb2RlZF9ibG9iLnNpemUgKyBcIiB0eXBlPVwiICsgZW5jb2RlZF9ibG9iLnR5cGUpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX29uQ2FwdHVyZUNvbXBsZXRlQ2FsbGJhY2spXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX29uQ2FwdHVyZUNvbXBsZXRlQ2FsbGJhY2soZW5jb2RlZF9ibG9iKTtcblxuICAgICAgICAgICAgICAgIC8vIHdvcmtlciBoYXMgZXhpdGVkLCB1bnJlZmVyZW5jZSBpdFxuICAgICAgICAgICAgICAgIHRoaXMuX2VuY29kaW5nV29ya2VyID0gbnVsbDtcblxuICAgICAgICAgICAgICAgIC8vdmFyIGJ1ZmZlciA9IHRoaXMuX2F1ZGlvQ29udGV4dC5jcmVhdGVCdWZmZXIoMSwgdGhpcy5fdG90YWxOdW1TYW1wbGVzLCB0aGlzLl9hdWRpb0NvbnRleHQuc2FtcGxlUmF0ZSk7XG4gICAgICAgICAgICAgICAgLy92YXIgYnVmID0gYnVmZmVyLmdldENoYW5uZWxEYXRhKDApO1xuICAgICAgICAgICAgICAgIC8vZm9yICh2YXIgaSA9IDA7IGkgPCBlLmRhdGEuYnVmZmVyLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICAgICAgLy8gICAgYnVmW2ldID0gZS5kYXRhLmJ1ZmZlcltpXTtcbiAgICAgICAgICAgICAgICAvL31cblxuICAgICAgICAgICAgICAgIC8vdmFyIGRzdCA9IHRoaXMuX2F1ZGlvQ29udGV4dC5kZXN0aW5hdGlvbjtcbiAgICAgICAgICAgICAgICAvL3ZhciBzb3VyY2UgPSB0aGlzLl9hdWRpb0NvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKCk7XG4gICAgICAgICAgICAgICAgLy90aGlzLl9hdWRpb0NvbnRleHQuZGVjb2RlQXVkaW9EYXRhKGJ1Zi5idWZmZXIsIChyZXN1bHQpID0+IHtcbiAgICAgICAgICAgICAgICAvLyAgICBjb25zb2xlLmxvZyhcImRlY29kZWQgYXVkaW9cIik7XG4gICAgICAgICAgICAgICAgLy8gICAgc291cmNlLmJ1ZmZlciA9IHJlc3VsdDtcbiAgICAgICAgICAgICAgICAvLyAgICBzb3VyY2UuY29ubmVjdChkc3QpO1xuICAgICAgICAgICAgICAgIC8vICAgIHNvdXJjZS5zdGFydCgwKTtcbiAgICAgICAgICAgICAgICAvL30sIChlcnJvcikgPT4geyBjb25zb2xlLmxvZyhcImhpdCBhIHNuYWcgZGVjb2RpbmcgYXVkaW8gZGF0YTpcIiwgZXJyb3IpfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gY29uZmlndXJlIHdvcmtlciB3aXRoIGEgc2FtcGxpbmcgcmF0ZSBhbmQgYnVmZmVyLXNpemVcbiAgICAgICAgdGhpcy5fZW5jb2RpbmdXb3JrZXIucG9zdE1lc3NhZ2Uoe1xuICAgICAgICAgICAgYWN0aW9uOiBcImluaXRpYWxpemVcIixcbiAgICAgICAgICAgIHNhbXBsZV9yYXRlOiB0aGlzLl9hdWRpb0NvbnRleHQuc2FtcGxlUmF0ZSxcbiAgICAgICAgICAgIGJ1ZmZlcl9zaXplOiB0aGlzLl9hdWRpb0xpc3RlbmVyLmJ1ZmZlclNpemVcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVE9ETzogaXQgbWlnaHQgYmUgYmV0dGVyIHRvIGxpc3RlbiBmb3IgYSBtZXNzYWdlIGJhY2sgZnJvbSB0aGUgYmFja2dyb3VuZCB3b3JrZXIgYmVmb3JlIGNvbnNpZGVyaW5nIHRoYXQgcmVjb3JkaW5nIGhhcyBiZWdhblxuICAgICAgICAvLyBpdCdzIGVhc2llciB0byB0cmltIGF1ZGlvIHRoYW4gY2FwdHVyZSBhIG1pc3Npbmcgd29yZCBhdCB0aGUgc3RhcnQgb2YgYSBzZW50ZW5jZVxuICAgICAgICB0aGlzLl9pc1JlY29yZGluZyA9IGZhbHNlO1xuXG4gICAgICAgIC8vIGNvbm5lY3QgYXVkaW8gbm9kZXNcbiAgICAgICAgLy8gYXVkaW8taW5wdXQgLT4gZ2FpbiAtPiBmZnQtYW5hbHl6ZXIgLT4gUENNLWRhdGEgY2FwdHVyZSAtPiBkZXN0aW5hdGlvblxuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiQXVkaW9DYXB0dXJlOjpzdGFydE1hbnVhbEVuY29kaW5nKCk7IENvbm5lY3RpbmcgQXVkaW8gTm9kZXMuLlwiKTtcblxuICAgICAgICBjb25zb2xlLmxvZyhcImNvbm5lY3Rpbmc6IGlucHV0LT5nYWluXCIpO1xuICAgICAgICB0aGlzLl9hdWRpb0lucHV0LmNvbm5lY3QodGhpcy5fYXVkaW9HYWluKTtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcImNvbm5lY3Rpbmc6IGdhaW4tPmFuYWx5emVyXCIpO1xuICAgICAgICAvL3RoaXMuX2F1ZGlvR2Fpbi5jb25uZWN0KHRoaXMuX2F1ZGlvQW5hbHl6ZXIpO1xuICAgICAgICAvL2NvbnNvbGUubG9nKFwiY29ubmVjdGluZzogYW5hbHl6ZXItPmxpc3Rlc25lclwiKTtcbiAgICAgICAgLy90aGlzLl9hdWRpb0FuYWx5emVyLmNvbm5lY3QodGhpcy5fYXVkaW9MaXN0ZW5lcik7XG4gICAgICAgIC8vIGNvbm5lY3QgZ2FpbiBkaXJlY3RseSBpbnRvIGxpc3RlbmVyLCBieXBhc3NpbmcgYW5hbHl6ZXJcbiAgICAgICAgY29uc29sZS5sb2coXCJjb25uZWN0aW5nOiBnYWluLT5saXN0ZW5lclwiKTtcbiAgICAgICAgdGhpcy5fYXVkaW9HYWluLmNvbm5lY3QodGhpcy5fYXVkaW9MaXN0ZW5lcik7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiY29ubmVjdGluZzogbGlzdGVuZXItPmRlc3RpbmF0aW9uXCIpO1xuICAgICAgICB0aGlzLl9hdWRpb0xpc3RlbmVyLmNvbm5lY3QodGhpcy5fYXVkaW9Db250ZXh0LmRlc3RpbmF0aW9uKTtcblxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBzaHV0ZG93bk1hbnVhbEVuY29kaW5nKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIkF1ZGlvQ2FwdHVyZTo6c2h1dGRvd25NYW51YWxFbmNvZGluZygpOyBUZWFyaW5nIGRvd24gQXVkaW9BUEkgY29ubmVjdGlvbnMuLlwiKTtcblxuICAgICAgICBjb25zb2xlLmxvZyhcImRpc2Nvbm5lY3Rpbmc6IGxpc3RlbmVyLT5kZXN0aW5hdGlvblwiKTtcbiAgICAgICAgdGhpcy5fYXVkaW9MaXN0ZW5lci5kaXNjb25uZWN0KHRoaXMuX2F1ZGlvQ29udGV4dC5kZXN0aW5hdGlvbik7XG4gICAgICAgIC8vY29uc29sZS5sb2coXCJkaXNjb25uZWN0aW5nOiBhbmFseXplci0+bGlzdGVzbmVyXCIpO1xuICAgICAgICAvL3RoaXMuX2F1ZGlvQW5hbHl6ZXIuZGlzY29ubmVjdCh0aGlzLl9hdWRpb0xpc3RlbmVyKTtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcImRpc2Nvbm5lY3Rpbmc6IGdhaW4tPmFuYWx5emVyXCIpO1xuICAgICAgICAvL3RoaXMuX2F1ZGlvR2Fpbi5kaXNjb25uZWN0KHRoaXMuX2F1ZGlvQW5hbHl6ZXIpO1xuICAgICAgICBjb25zb2xlLmxvZyhcImRpc2Nvbm5lY3Rpbmc6IGdhaW4tPmxpc3RlbmVyXCIpO1xuICAgICAgICB0aGlzLl9hdWRpb0dhaW4uZGlzY29ubmVjdCh0aGlzLl9hdWRpb0xpc3RlbmVyKTtcbiAgICAgICAgY29uc29sZS5sb2coXCJkaXNjb25uZWN0aW5nOiBpbnB1dC0+Z2FpblwiKTtcbiAgICAgICAgdGhpcy5fYXVkaW9JbnB1dC5kaXNjb25uZWN0KHRoaXMuX2F1ZGlvR2Fpbik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVGhlIG1pY3JvcGhvbmUgbWF5IGJlIGxpdmUsIGJ1dCBpdCBpc24ndCByZWNvcmRpbmcuIFRoaXMgdG9nZ2xlcyB0aGUgYWN0dWFsIHdyaXRpbmcgdG8gdGhlIGNhcHR1cmUgc3RyZWFtLlxuICAgICAqIGNhcHR1cmVBdWRpb1NhbXBsZXMgYm9vbCBpbmRpY2F0ZXMgd2hldGhlciB0byByZWNvcmQgZnJvbSBtaWNcbiAgICAgKi9cbiAgICB0b2dnbGVNaWNyb3Bob25lUmVjb3JkaW5nKGNhcHR1cmVBdWRpb1NhbXBsZXMpIHtcbiAgICAgICAgdGhpcy5faXNSZWNvcmRpbmcgPSBjYXB0dXJlQXVkaW9TYW1wbGVzO1xuICAgIH1cblxuICAgIC8vIGNhbGxlZCB3aGVuIHVzZXIgYWxsb3dzIHVzIHVzZSBvZiB0aGVpciBtaWNyb3Bob25lXG4gICAgb25NaWNyb3Bob25lUHJvdmlkZWQobWVkaWFTdHJlYW0pIHtcblxuICAgICAgICB0aGlzLl9jYWNoZWRNZWRpYVN0cmVhbSA9IG1lZGlhU3RyZWFtO1xuXG4gICAgICAgIC8vIHdlIGNvdWxkIGNoZWNrIGlmIHRoZSBicm93c2VyIGNhbiBwZXJmb3JtIGl0cyBvd24gZW5jb2RpbmcgYW5kIHVzZSB0aGF0XG4gICAgICAgIC8vIEZpcmVmb3ggY2FuIHByb3ZpZGUgdXMgb2dnK3NwZWV4IG9yIG9nZytvcHVzPyBmaWxlcywgYnV0IHVuZm9ydHVuYXRlbHkgdGhhdCBjb2RlYyBpc24ndCBzdXBwb3J0ZWQgd2lkZWx5IGVub3VnaFxuICAgICAgICAvLyBzbyBpbnN0ZWFkIHdlIHBlcmZvcm0gbWFudWFsIGVuY29kaW5nIGV2ZXJ5d2hlcmUgcmlnaHQgbm93IHRvIGdldCB1cyBvZ2crdm9yYmlzXG4gICAgICAgIC8vIHRob3VnaCBvbmUgZGF5LCBpIHdhbnQgb2dnK29wdXMhIG9wdXMgaGFzIGEgd29uZGVyZnVsIHJhbmdlIG9mIHF1YWxpdHkgc2V0dGluZ3MgcGVyZmVjdCBmb3IgdGhpcyBwcm9qZWN0XG5cbiAgICAgICAgaWYgKGZhbHNlICYmIHR5cGVvZihNZWRpYVJlY29yZGVyKSAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgdGhpcy5zdGFydEF1dG9tYXRpY0VuY29kaW5nKG1lZGlhU3RyZWFtKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIG5vIG1lZGlhIHJlY29yZGVyIGF2YWlsYWJsZSwgZG8gaXQgbWFudWFsbHlcbiAgICAgICAgICAgIHRoaXMuc3RhcnRNYW51YWxFbmNvZGluZyhtZWRpYVN0cmVhbSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUT0RPOiBtaWdodCBiZSBhIGdvb2QgdGltZSB0byBzdGFydCBhIHNwZWN0cmFsIGFuYWx5emVyXG4gICAgICAgIGlmICh0aGlzLl9vblN0YXJ0ZWRDYWxsYmFjaylcbiAgICAgICAgICAgIHRoaXMuX29uU3RhcnRlZENhbGxiYWNrKCk7XG4gICAgfVxuXG4gICAgc2V0R2FpbihnYWluKSB7XG4gICAgICAgIGlmICh0aGlzLl9hdWRpb0dhaW4pXG4gICAgICAgICAgICB0aGlzLl9hdWRpb0dhaW4uZ2Fpbi52YWx1ZSA9IGdhaW47XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJzZXR0aW5nIGdhaW46IFwiICsgZ2Fpbik7XG4gICAgICAgIHRoaXMuX2NhY2hlZEdhaW5WYWx1ZSA9IGdhaW47XG4gICAgfVxuXG4gICAgcHJlbG9hZE1lZGlhU3RyZWFtKCkge1xuICAgICAgICBpZiAodGhpcy5fY2FjaGVkTWVkaWFTdHJlYW0pXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgIG5hdmlnYXRvci5tZWRpYURldmljZXMgPSBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzIHx8ICgobmF2aWdhdG9yLm1vekdldFVzZXJNZWRpYSB8fCBuYXZpZ2F0b3Iud2Via2l0R2V0VXNlck1lZGlhKSA/IHtcbiAgICAgICAgICAgICAgICBnZXRVc2VyTWVkaWE6IGZ1bmN0aW9uIChjKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAoeSwgbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgKG5hdmlnYXRvci5tb3pHZXRVc2VyTWVkaWEgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hdmlnYXRvci53ZWJraXRHZXRVc2VyTWVkaWEpLmNhbGwobmF2aWdhdG9yLCBjLCB5LCBuKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSA6IG51bGwpO1xuXG4gICAgICAgIGlmICghbmF2aWdhdG9yLm1lZGlhRGV2aWNlcykge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKFwic3RhcnQoKTsgZ2V0VXNlck1lZGlhKCkgbm90IHN1cHBvcnRlZC5cIik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzXG4gICAgICAgICAgICAuZ2V0VXNlck1lZGlhKHthdWRpbzogdHJ1ZX0pXG4gICAgICAgICAgICAudGhlbigobXMpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9jYWNoZWRNZWRpYVN0cmVhbSA9IG1zO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJBdWRpb0NhcHR1cmU6OnN0YXJ0KCk7IGNvdWxkIG5vdCBncmFiIG1pY3JvcGhvbmUuIHBlcmhhcHMgdXNlciBkaWRuJ3QgZ2l2ZSB1cyBwZXJtaXNzaW9uP1wiKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oZXJyKTtcbiAgICAgICAgICAgIH0pXG4gICAgfTtcblxuICAgIHN0YXJ0KG9uU3RhcnRlZENhbGxiYWNrKSB7XG5cbiAgICAgICAgdGhpcy5fb25TdGFydGVkQ2FsbGJhY2sgPSBvblN0YXJ0ZWRDYWxsYmFjaztcblxuICAgICAgICBpZiAodGhpcy5fY2FjaGVkTWVkaWFTdHJlYW0pXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5vbk1pY3JvcGhvbmVQcm92aWRlZCh0aGlzLl9jYWNoZWRNZWRpYVN0cmVhbSk7XG5cbiAgICAgICAgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcyA9IG5hdmlnYXRvci5tZWRpYURldmljZXMgfHwgKChuYXZpZ2F0b3IubW96R2V0VXNlck1lZGlhIHx8IG5hdmlnYXRvci53ZWJraXRHZXRVc2VyTWVkaWEpID8ge1xuICAgICAgICAgICAgICAgIGdldFVzZXJNZWRpYTogZnVuY3Rpb24gKGMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uICh5LCBuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAobmF2aWdhdG9yLm1vekdldFVzZXJNZWRpYSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgbmF2aWdhdG9yLndlYmtpdEdldFVzZXJNZWRpYSkuY2FsbChuYXZpZ2F0b3IsIGMsIHksIG4pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IDogbnVsbCk7XG5cbiAgICAgICAgaWYgKCFuYXZpZ2F0b3IubWVkaWFEZXZpY2VzKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oXCJzdGFydCgpOyBnZXRVc2VyTWVkaWEoKSBub3Qgc3VwcG9ydGVkLlwiKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIG5hdmlnYXRvci5tZWRpYURldmljZXNcbiAgICAgICAgICAgIC5nZXRVc2VyTWVkaWEoe2F1ZGlvOiB0cnVlfSlcbiAgICAgICAgICAgIC50aGVuKChtcykgPT4gdGhpcy5vbk1pY3JvcGhvbmVQcm92aWRlZChtcykpXG4gICAgICAgICAgICAuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQXVkaW9DYXB0dXJlOjpzdGFydCgpOyBjb3VsZCBub3QgZ3JhYiBtaWNyb3Bob25lLiBwZXJoYXBzIHVzZXIgZGlkbid0IGdpdmUgdXMgcGVybWlzc2lvbj9cIik7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGVycik7XG4gICAgICAgICAgICB9KVxuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHN0b3AoY2FwdHVyZUNvbXBsZXRlQ2FsbGJhY2spIHtcbiAgICAgICAgdGhpcy5fb25DYXB0dXJlQ29tcGxldGVDYWxsYmFjayA9IGNhcHR1cmVDb21wbGV0ZUNhbGxiYWNrO1xuICAgICAgICB0aGlzLl9pc1JlY29yZGluZyA9IGZhbHNlO1xuXG4gICAgICAgIGlmICh0aGlzLl9hdWRpb0NvbnRleHQpIHtcbiAgICAgICAgICAgIC8vIHN0b3AgdGhlIG1hbnVhbCBlbmNvZGVyXG4gICAgICAgICAgICB0aGlzLl9lbmNvZGluZ1dvcmtlci5wb3N0TWVzc2FnZSh7YWN0aW9uOiBcImZpbmlzaFwifSk7XG4gICAgICAgICAgICB0aGlzLnNodXRkb3duTWFudWFsRW5jb2RpbmcoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9hdWRpb0VuY29kZXIpIHtcbiAgICAgICAgICAgIC8vIHN0b3AgdGhlIGF1dG9tYXRpYyBlbmNvZGVyXG5cbiAgICAgICAgICAgIGlmICh0aGlzLl9hdWRpb0VuY29kZXIuc3RhdGUgIT09ICdyZWNvcmRpbmcnKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFwiQXVkaW9DYXB0dXJlOjpzdG9wKCk7IF9hdWRpb0VuY29kZXIuc3RhdGUgIT0gJ3JlY29yZGluZydcIik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuX2F1ZGlvRW5jb2Rlci5yZXF1ZXN0RGF0YSgpO1xuICAgICAgICAgICAgdGhpcy5fYXVkaW9FbmNvZGVyLnN0b3AoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRPRE86IHN0b3AgYW55IGFjdGl2ZSBzcGVjdHJhbCBhbmFseXNpc1xuICAgIH07XG59XG5cbi8vIHVudXNlZCBhdCB0aGUgbW9tZW50XG5mdW5jdGlvbiBBbmFseXplcigpIHtcblxuICAgIHZhciBfYXVkaW9DYW52YXNBbmltYXRpb25JZCxcbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXNcbiAgICAgICAgO1xuXG4gICAgdGhpcy5zdGFydEFuYWx5emVyVXBkYXRlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdXBkYXRlQW5hbHl6ZXIoKTtcbiAgICB9O1xuXG4gICAgdGhpcy5zdG9wQW5hbHl6ZXJVcGRhdGVzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIV9hdWRpb0NhbnZhc0FuaW1hdGlvbklkKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZShfYXVkaW9DYW52YXNBbmltYXRpb25JZCk7XG4gICAgICAgIF9hdWRpb0NhbnZhc0FuaW1hdGlvbklkID0gbnVsbDtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gdXBkYXRlQW5hbHl6ZXIoKSB7XG5cbiAgICAgICAgaWYgKCFfYXVkaW9TcGVjdHJ1bUNhbnZhcylcbiAgICAgICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyZWNvcmRpbmctdmlzdWFsaXplclwiKS5nZXRDb250ZXh0KFwiMmRcIik7XG5cbiAgICAgICAgdmFyIGZyZXFEYXRhID0gbmV3IFVpbnQ4QXJyYXkoX2F1ZGlvQW5hbHl6ZXIuZnJlcXVlbmN5QmluQ291bnQpO1xuICAgICAgICBfYXVkaW9BbmFseXplci5nZXRCeXRlRnJlcXVlbmN5RGF0YShmcmVxRGF0YSk7XG5cbiAgICAgICAgdmFyIG51bUJhcnMgPSBfYXVkaW9BbmFseXplci5mcmVxdWVuY3lCaW5Db3VudDtcbiAgICAgICAgdmFyIGJhcldpZHRoID0gTWF0aC5mbG9vcihfY2FudmFzV2lkdGggLyBudW1CYXJzKSAtIF9mZnRCYXJTcGFjaW5nO1xuXG5cbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uID0gXCJzb3VyY2Utb3ZlclwiO1xuXG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmNsZWFyUmVjdCgwLCAwLCBfY2FudmFzV2lkdGgsIF9jYW52YXNIZWlnaHQpO1xuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5maWxsU3R5bGUgPSAnI2Y2ZDU2NSc7XG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmxpbmVDYXAgPSAncm91bmQnO1xuXG4gICAgICAgIHZhciB4LCB5LCB3LCBoO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbnVtQmFyczsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBmcmVxRGF0YVtpXTtcbiAgICAgICAgICAgIHZhciBzY2FsZWRfdmFsdWUgPSAodmFsdWUgLyAyNTYpICogX2NhbnZhc0hlaWdodDtcblxuICAgICAgICAgICAgeCA9IGkgKiAoYmFyV2lkdGggKyBfZmZ0QmFyU3BhY2luZyk7XG4gICAgICAgICAgICB5ID0gX2NhbnZhc0hlaWdodCAtIHNjYWxlZF92YWx1ZTtcbiAgICAgICAgICAgIHcgPSBiYXJXaWR0aDtcbiAgICAgICAgICAgIGggPSBzY2FsZWRfdmFsdWU7XG5cbiAgICAgICAgICAgIHZhciBncmFkaWVudCA9IF9hdWRpb1NwZWN0cnVtQ2FudmFzLmNyZWF0ZUxpbmVhckdyYWRpZW50KHgsIF9jYW52YXNIZWlnaHQsIHgsIHkpO1xuICAgICAgICAgICAgZ3JhZGllbnQuYWRkQ29sb3JTdG9wKDEuMCwgXCJyZ2JhKDAsMCwwLDEuMClcIik7XG4gICAgICAgICAgICBncmFkaWVudC5hZGRDb2xvclN0b3AoMC4wLCBcInJnYmEoMCwwLDAsMS4wKVwiKTtcblxuICAgICAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZmlsbFN0eWxlID0gZ3JhZGllbnQ7XG4gICAgICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5maWxsUmVjdCh4LCB5LCB3LCBoKTtcblxuICAgICAgICAgICAgaWYgKHNjYWxlZF92YWx1ZSA+IF9oaXRIZWlnaHRzW2ldKSB7XG4gICAgICAgICAgICAgICAgX2hpdFZlbG9jaXRpZXNbaV0gKz0gKHNjYWxlZF92YWx1ZSAtIF9oaXRIZWlnaHRzW2ldKSAqIDY7XG4gICAgICAgICAgICAgICAgX2hpdEhlaWdodHNbaV0gPSBzY2FsZWRfdmFsdWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIF9oaXRWZWxvY2l0aWVzW2ldIC09IDQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIF9oaXRIZWlnaHRzW2ldICs9IF9oaXRWZWxvY2l0aWVzW2ldICogMC4wMTY7XG5cbiAgICAgICAgICAgIGlmIChfaGl0SGVpZ2h0c1tpXSA8IDApXG4gICAgICAgICAgICAgICAgX2hpdEhlaWdodHNbaV0gPSAwO1xuICAgICAgICB9XG5cbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uID0gXCJzb3VyY2UtYXRvcFwiO1xuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5kcmF3SW1hZ2UoX2NhbnZhc0JnLCAwLCAwKTtcblxuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb24gPSBcInNvdXJjZS1vdmVyXCI7XG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmZpbGxTdHlsZSA9IFwicmdiYSgyNTUsMjU1LDI1NSwwLjcpXCI7XG5cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IG51bUJhcnM7IGkrKykge1xuICAgICAgICAgICAgeCA9IGkgKiAoYmFyV2lkdGggKyBfZmZ0QmFyU3BhY2luZyk7XG4gICAgICAgICAgICB5ID0gX2NhbnZhc0hlaWdodCAtIE1hdGgucm91bmQoX2hpdEhlaWdodHNbaV0pIC0gMjtcbiAgICAgICAgICAgIHcgPSBiYXJXaWR0aDtcbiAgICAgICAgICAgIGggPSBiYXJXaWR0aDtcblxuICAgICAgICAgICAgaWYgKF9oaXRIZWlnaHRzW2ldID09PSAwKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICAvL19hdWRpb1NwZWN0cnVtQ2FudmFzLmZpbGxTdHlsZSA9IFwicmdiYSgyNTUsIDI1NSwgMjU1LFwiKyBNYXRoLm1heCgwLCAxIC0gTWF0aC5hYnMoX2hpdFZlbG9jaXRpZXNbaV0vMTUwKSkgKyBcIilcIjtcbiAgICAgICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmZpbGxSZWN0KHgsIHksIHcsIGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgX2F1ZGlvQ2FudmFzQW5pbWF0aW9uSWQgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKHVwZGF0ZUFuYWx5emVyKTtcbiAgICB9XG5cbiAgICB2YXIgX2NhbnZhc1dpZHRoLCBfY2FudmFzSGVpZ2h0O1xuICAgIHZhciBfZmZ0U2l6ZSA9IDI1NjtcbiAgICB2YXIgX2ZmdFNtb290aGluZyA9IDAuODtcbiAgICB2YXIgX2ZmdEJhclNwYWNpbmcgPSAxO1xuXG4gICAgdmFyIF9oaXRIZWlnaHRzID0gW107XG4gICAgdmFyIF9oaXRWZWxvY2l0aWVzID0gW107XG5cbiAgICB0aGlzLnRlc3RDYW52YXMgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgdmFyIGNhbnZhc0NvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicmVjb3JkaW5nLXZpc3VhbGl6ZXJcIik7XG5cbiAgICAgICAgX2NhbnZhc1dpZHRoID0gY2FudmFzQ29udGFpbmVyLndpZHRoO1xuICAgICAgICBfY2FudmFzSGVpZ2h0ID0gY2FudmFzQ29udGFpbmVyLmhlaWdodDtcblxuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcyA9IGNhbnZhc0NvbnRhaW5lci5nZXRDb250ZXh0KFwiMmRcIik7XG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbiA9IFwic291cmNlLW92ZXJcIjtcbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZmlsbFN0eWxlID0gXCJyZ2JhKDAsMCwwLDApXCI7XG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmZpbGxSZWN0KDAsIDAsIF9jYW52YXNXaWR0aCwgX2NhbnZhc0hlaWdodCk7XG5cbiAgICAgICAgdmFyIG51bUJhcnMgPSBfZmZ0U2l6ZSAvIDI7XG4gICAgICAgIHZhciBiYXJTcGFjaW5nID0gX2ZmdEJhclNwYWNpbmc7XG4gICAgICAgIHZhciBiYXJXaWR0aCA9IE1hdGguZmxvb3IoX2NhbnZhc1dpZHRoIC8gbnVtQmFycykgLSBiYXJTcGFjaW5nO1xuXG4gICAgICAgIHZhciB4LCB5LCB3LCBoLCBpO1xuXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBudW1CYXJzOyBpKyspIHtcbiAgICAgICAgICAgIF9oaXRIZWlnaHRzW2ldID0gX2NhbnZhc0hlaWdodCAtIDE7XG4gICAgICAgICAgICBfaGl0VmVsb2NpdGllc1tpXSA9IDA7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbnVtQmFyczsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgc2NhbGVkX3ZhbHVlID0gTWF0aC5hYnMoTWF0aC5zaW4oTWF0aC5QSSAqIDYgKiAoaSAvIG51bUJhcnMpKSkgKiBfY2FudmFzSGVpZ2h0O1xuXG4gICAgICAgICAgICB4ID0gaSAqIChiYXJXaWR0aCArIGJhclNwYWNpbmcpO1xuICAgICAgICAgICAgeSA9IF9jYW52YXNIZWlnaHQgLSBzY2FsZWRfdmFsdWU7XG4gICAgICAgICAgICB3ID0gYmFyV2lkdGg7XG4gICAgICAgICAgICBoID0gc2NhbGVkX3ZhbHVlO1xuXG4gICAgICAgICAgICB2YXIgZ3JhZGllbnQgPSBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5jcmVhdGVMaW5lYXJHcmFkaWVudCh4LCBfY2FudmFzSGVpZ2h0LCB4LCB5KTtcbiAgICAgICAgICAgIGdyYWRpZW50LmFkZENvbG9yU3RvcCgxLjAsIFwicmdiYSgwLDAsMCwwLjApXCIpO1xuICAgICAgICAgICAgZ3JhZGllbnQuYWRkQ29sb3JTdG9wKDAuMCwgXCJyZ2JhKDAsMCwwLDEuMClcIik7XG5cbiAgICAgICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmZpbGxTdHlsZSA9IGdyYWRpZW50O1xuICAgICAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZmlsbFJlY3QoeCwgeSwgdywgaCk7XG4gICAgICAgIH1cblxuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb24gPSBcInNvdXJjZS1hdG9wXCI7XG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmRyYXdJbWFnZShfY2FudmFzQmcsIDAsIDApO1xuXG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbiA9IFwic291cmNlLW92ZXJcIjtcbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZmlsbFN0eWxlID0gXCIjZmZmZmZmXCI7XG5cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IG51bUJhcnM7IGkrKykge1xuICAgICAgICAgICAgeCA9IGkgKiAoYmFyV2lkdGggKyBiYXJTcGFjaW5nKTtcbiAgICAgICAgICAgIHkgPSBfY2FudmFzSGVpZ2h0IC0gX2hpdEhlaWdodHNbaV07XG4gICAgICAgICAgICB3ID0gYmFyV2lkdGg7XG4gICAgICAgICAgICBoID0gMjtcblxuICAgICAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZmlsbFJlY3QoeCwgeSwgdywgaCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIF9zY29wZSA9IHRoaXM7XG5cbiAgICB2YXIgX2NhbnZhc0JnID0gbmV3IEltYWdlKCk7XG4gICAgX2NhbnZhc0JnLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgX3Njb3BlLnRlc3RDYW52YXMoKTtcbiAgICB9O1xuICAgIC8vX2NhbnZhc0JnLnNyYyA9IFwiL2ltZy9iZzVzLmpwZ1wiO1xuICAgIF9jYW52YXNCZy5zcmMgPSBcIi9pbWcvYmc2LXdpZGUuanBnXCI7XG59XG4iLCJleHBvcnQgZGVmYXVsdCBjbGFzcyBTb3VuZFBsYXllciB7XG4gICAgc3RhdGljIGNyZWF0ZSAobW9kZWwpIHtcbiAgICAgICAgdmFyIHJlc3VtZVBvc2l0aW9uID0gcGFyc2VJbnQobW9kZWwuZ2V0KCdwb3NpdGlvbicpIHx8IDApO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiQ3JlYXRpbmcgc291bmQgcGxheWVyIGZvciBtb2RlbDpcIiwgbW9kZWwpO1xuXG4gICAgICAgIHJldHVybiBzb3VuZE1hbmFnZXIuY3JlYXRlU291bmQoe1xuICAgICAgICAgICAgaWQ6IG1vZGVsLmlkLFxuICAgICAgICAgICAgdXJsOiBtb2RlbC51cmwsXG4gICAgICAgICAgICB2b2x1bWU6IDEwMCxcbiAgICAgICAgICAgIGF1dG9Mb2FkOiB0cnVlLFxuICAgICAgICAgICAgYXV0b1BsYXk6IGZhbHNlLFxuICAgICAgICAgICAgZnJvbTogcmVzdW1lUG9zaXRpb24sXG4gICAgICAgICAgICB3aGlsZWxvYWRpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImxvYWRlZDogXCIgKyB0aGlzLmJ5dGVzTG9hZGVkICsgXCIgb2YgXCIgKyB0aGlzLmJ5dGVzVG90YWwpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9ubG9hZDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdTb3VuZDsgYXVkaW8gbG9hZGVkOyBwb3NpdGlvbiA9ICcgKyByZXN1bWVQb3NpdGlvbiArICcsIGR1cmF0aW9uID0gJyArIHRoaXMuZHVyYXRpb24pO1xuXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZHVyYXRpb24gPT0gbnVsbCB8fCB0aGlzLmR1cmF0aW9uID09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJkdXJhdGlvbiBpcyBudWxsXCIpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKChyZXN1bWVQb3NpdGlvbiArIDEwKSA+IHRoaXMuZHVyYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gdGhlIHRyYWNrIGlzIHByZXR0eSBtdWNoIGNvbXBsZXRlLCBsb29wIGl0XG4gICAgICAgICAgICAgICAgICAgIC8vIEZJWE1FOiB0aGlzIHNob3VsZCBhY3R1YWxseSBoYXBwZW4gZWFybGllciwgd2Ugc2hvdWxkIGtub3cgdGhhdCB0aGUgYWN0aW9uIHdpbGwgY2F1c2UgYSByZXdpbmRcbiAgICAgICAgICAgICAgICAgICAgLy8gICAgICAgIGFuZCBpbmRpY2F0ZSB0aGUgcmV3aW5kIHZpc3VhbGx5IHNvIHRoZXJlIGlzIG5vIHN1cnByaXNlXG4gICAgICAgICAgICAgICAgICAgIHJlc3VtZVBvc2l0aW9uID0gMDtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1NvdW5kOyB0cmFjayBuZWVkZWQgYSByZXdpbmQnKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBGSVhNRTogcmVzdW1lIGNvbXBhdGliaWxpdHkgd2l0aCB2YXJpb3VzIGJyb3dzZXJzXG4gICAgICAgICAgICAgICAgLy8gRklYTUU6IHNvbWV0aW1lcyB5b3UgcmVzdW1lIGEgZmlsZSBhbGwgdGhlIHdheSBhdCB0aGUgZW5kLCBzaG91bGQgbG9vcCB0aGVtIGFyb3VuZFxuICAgICAgICAgICAgICAgIHRoaXMuc2V0UG9zaXRpb24ocmVzdW1lUG9zaXRpb24pO1xuICAgICAgICAgICAgICAgIHRoaXMucGxheSgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHdoaWxlcGxheWluZzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBwcm9ncmVzcyA9ICh0aGlzLmR1cmF0aW9uID4gMCA/IDEwMCAqIHRoaXMucG9zaXRpb24gLyB0aGlzLmR1cmF0aW9uIDogMCkudG9GaXhlZCgwKSArICclJztcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcInF1aXA6XCIgKyB0aGlzLmlkICsgXCI6cHJvZ3Jlc3NcIiwgcHJvZ3Jlc3MpO1xuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwicXVpcDpcIiArIHRoaXMuaWQgKyBcIjpwb3NpdGlvblwiLCB0aGlzLnBvc2l0aW9uLnRvRml4ZWQoMCkpO1xuICAgICAgICAgICAgICAgIG1vZGVsLnNldCh7J3Byb2dyZXNzJzogcHJvZ3Jlc3N9KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbnBhdXNlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJTb3VuZDsgcGF1c2VkOiBcIiArIHRoaXMuaWQpO1xuICAgICAgICAgICAgICAgIHZhciBwb3NpdGlvbiA9IHRoaXMucG9zaXRpb24gPyB0aGlzLnBvc2l0aW9uLnRvRml4ZWQoMCkgOiAwO1xuICAgICAgICAgICAgICAgIHZhciBwcm9ncmVzcyA9ICh0aGlzLmR1cmF0aW9uID4gMCA/IDEwMCAqIHBvc2l0aW9uIC8gdGhpcy5kdXJhdGlvbiA6IDApLnRvRml4ZWQoMCkgKyAnJSc7XG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJxdWlwOlwiICsgdGhpcy5pZCArIFwiOnByb2dyZXNzXCIsIHByb2dyZXNzKTtcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcInF1aXA6XCIgKyB0aGlzLmlkICsgXCI6cG9zaXRpb25cIiwgcG9zaXRpb24pO1xuICAgICAgICAgICAgICAgIG1vZGVsLnNldCh7J3Byb2dyZXNzJzogcHJvZ3Jlc3N9KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbmZpbmlzaDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiU291bmQ7IGZpbmlzaGVkIHBsYXlpbmc6IFwiICsgdGhpcy5pZCk7XG5cbiAgICAgICAgICAgICAgICAvLyBzdG9yZSBjb21wbGV0aW9uIGluIGJyb3dzZXJcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcInF1aXA6XCIgKyB0aGlzLmlkICsgXCI6cHJvZ3Jlc3NcIiwgJzEwMCUnKTtcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcInF1aXA6XCIgKyB0aGlzLmlkICsgXCI6cG9zaXRpb25cIiwgdGhpcy5kdXJhdGlvbi50b0ZpeGVkKDApKTtcbiAgICAgICAgICAgICAgICBtb2RlbC5zZXQoeydwcm9ncmVzcyc6ICcxMDAlJ30pO1xuXG4gICAgICAgICAgICAgICAgLy8gVE9ETzogdW5sb2NrIHNvbWUgc29ydCBvZiBhY2hpZXZlbWVudCBmb3IgZmluaXNoaW5nIHRoaXMgdHJhY2ssIG1hcmsgaXQgYSBkaWZmIGNvbG9yLCBldGNcbiAgICAgICAgICAgICAgICAvLyBUT0RPOiB0aGlzIGlzIGEgZ29vZCBwbGFjZSB0byBmaXJlIGEgaG9vayB0byBhIHBsYXliYWNrIG1hbmFnZXIgdG8gbW92ZSBvbnRvIHRoZSBuZXh0IGF1ZGlvIGNsaXBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICB9XG59XG4iLCJpbXBvcnQgQmFja2JvbmUgZnJvbSAnYmFja2JvbmUnXG5pbXBvcnQgeyBRdWlwTW9kZWwsIFF1aXBWaWV3LCBRdWlwcywgQXVkaW9QbGF5ZXJWaWV3IH0gZnJvbSAnLi9xdWlwLWNvbnRyb2wuanMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJlY29yZGluZ3NMaXN0IGV4dGVuZHMgQmFja2JvbmUuVmlldyB7XG4gICAgaW5pdGlhbGl6ZSgpIHtcblxuICAgICAgICB2YXIgYXVkaW9QbGF5ZXIgPSBuZXcgQXVkaW9QbGF5ZXJWaWV3KCk7XG5cbiAgICAgICAgc291bmRNYW5hZ2VyLnNldHVwKHtcbiAgICAgICAgICAgIGRlYnVnTW9kZTogdHJ1ZSxcbiAgICAgICAgICAgIHVybDogJy9hc3NldHMvc3dmLycsXG4gICAgICAgICAgICBwcmVmZXJGbGFzaDogZmFsc2UsXG4gICAgICAgICAgICBvbnJlYWR5OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJzb3VuZE1hbmFnZXIgcmVhZHlcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgICQoJy5xdWlwJykuZWFjaChlbGVtID0+IHtcbiAgICAgICAgICAgIHZhciB2aWV3ID0gbmV3IFF1aXBWaWV3KHtcbiAgICAgICAgICAgICAgICBlbDogZWxlbSxcbiAgICAgICAgICAgICAgICBtb2RlbDogbmV3IFF1aXBNb2RlbCh7cHJvZ3Jlc3M6IDB9KVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIFF1aXBzLmFkZCh2aWV3Lm1vZGVsKTtcbiAgICAgICAgICAgIHZpZXcucmVuZGVyKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIHByb2Nlc3MgYWxsIHRpbWVzdGFtcHNcbiAgICAgICAgdmFyIHZhZ3VlVGltZSA9IHJlcXVpcmUoJ3ZhZ3VlLXRpbWUnKTtcbiAgICAgICAgdmFyIG5vdyA9IG5ldyBEYXRlKCk7XG5cbiAgICAgICAgJChcInRpbWVbZGF0ZXRpbWVdXCIpLmVhY2goZnVuY3Rpb24gZ2VuZXJhdGVWYWd1ZURhdGUoZWxlKSB7XG4gICAgICAgICAgICBlbGUudGV4dENvbnRlbnQgPSB2YWd1ZVRpbWUuZ2V0KHtmcm9tOiBub3csIHRvOiBuZXcgRGF0ZShlbGUuZ2V0QXR0cmlidXRlKCdkYXRldGltZScpKX0pO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmxpc3RlblRvKFF1aXBzLCAnYWRkJywgdGhpcy5xdWlwQWRkZWQpO1xuICAgIH1cblxuICAgIHF1aXBBZGRlZChxdWlwKSB7XG4gICAgfVxufVxuXG4iLCJpbXBvcnQgQmFja2JvbmUgZnJvbSAnYmFja2JvbmUnXG5pbXBvcnQgU291bmRQbGF5ZXIgZnJvbSAnLi9hdWRpby1wbGF5ZXIuanMnXG5cbi8qKlxuICogUXVpcFxuICogUGxheXMgYXVkaW8gYW5kIHRyYWNrcyBwb3NpdGlvblxuICovXG5cbmNsYXNzIFF1aXBNb2RlbCBleHRlbmRzIEJhY2tib25lLk1vZGVsIHtcbiAgICBkZWZhdWx0cygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGlkOiAwLCAvLyBndWlkXG4gICAgICAgICAgICBwcm9ncmVzczogMCwgLy8gWzAtMTAwXSBwZXJjZW50YWdlXG4gICAgICAgICAgICBwb3NpdGlvbjogMCwgLy8gbXNlY1xuICAgICAgICAgICAgZHVyYXRpb246IDAsIC8vIG1zZWNcbiAgICAgICAgICAgIGlzUHVibGljOiBmYWxzZVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgfVxuXG4gICAgc2F2ZShhdHRyaWJ1dGVzKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiUXVpcCBNb2RlbCBzYXZpbmcgdG8gbG9jYWxTdG9yYWdlXCIpO1xuICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSh0aGlzLmlkLCBKU09OLnN0cmluZ2lmeSh0aGlzLnRvSlNPTigpKSk7XG4gICAgfVxuXG4gICAgZmV0Y2goKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiUXVpcCBNb2RlbCBsb2FkaW5nIGZyb20gbG9jYWxTdG9yYWdlXCIpO1xuICAgICAgICB0aGlzLnNldChKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKHRoaXMuaWQpKSk7XG4gICAgfVxuXG4gICAgdXBkYXRlUHJvZ3Jlc3MoKSB7XG4gICAgICAgIHRoaXMuc2V0KHtcbiAgICAgICAgICAgIHByb2dyZXNzOiAoZHVyYXRpb24gPiAwID8gcG9zaXRpb24gLyBkdXJhdGlvbiA6IDApLnRvRml4ZWQoMCkgKyBcIiVcIlxuICAgICAgICB9KTtcbiAgICB9XG59XG5cbmNsYXNzIEF1ZGlvUGxheWVyRXZlbnRzIGV4dGVuZHMgQmFja2JvbmUuTW9kZWwge1xuICAgIGdldFBhdXNlVXJsKGlkKSB7XG4gICAgICAgIHZhciB1cmwgPSBcIi9cIiArIGlkICsgXCIvcGF1c2VkXCI7XG4gICAgICAgIGNvbnNvbGUubG9nKFwicGF1c2UgdXJsXCIgKyB1cmwpO1xuICAgICAgICByZXR1cm4gdXJsO1xuICAgIH1cblxuICAgIG9uUGF1c2UoaWQsIGNhbGxiYWNrKSB7XG4gICAgICAgIHRoaXMub24odGhpcy5nZXRQYXVzZVVybChpZCksIGNhbGxiYWNrKTtcbiAgICB9XG5cbiAgICB0cmlnZ2VyUGF1c2UoaWQpIHtcbiAgICAgICAgdGhpcy50cmlnZ2VyKHRoaXMuZ2V0UGF1c2VVcmwoaWQpKTtcbiAgICB9XG59XG5cbnZhciBBdWRpb1BsYXllciA9IG5ldyBBdWRpb1BsYXllckV2ZW50cygpO1xuXG4vL2NsYXNzIEF1ZGlvUGxheWVyRXZlbnRzIGV4dGVuZHMgQmFja2JvbmUuRXZlbnRzIHtcbi8vXG4vL31cblxuY2xhc3MgQXVkaW9QbGF5ZXJWaWV3IGV4dGVuZHMgQmFja2JvbmUuVmlldyB7XG4gICAgZGVmYXVsdHMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBhdWRpb1BsYXllcjogbnVsbCxcbiAgICAgICAgICAgIHF1aXBNb2RlbDogbnVsbFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJBdWRpb1BsYXllclZpZXcgaW5pdGlhbGl6ZWRcIik7XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImF1ZGlvLXBsYXllclwiKTtcbiAgICAgICAgQXVkaW9QbGF5ZXIub24oXCJ0b2dnbGVcIiwgKHF1aXApID0+IHRoaXMub25Ub2dnbGUocXVpcCkpO1xuICAgIH1cblxuICAgIGNsb3NlKCkge1xuICAgICAgICB0aGlzLnN0b3BQZXJpb2RpY1RpbWVyKCk7XG4gICAgfVxuXG4gICAgc3RhcnRQZXJpb2RpY1RpbWVyKCkge1xuICAgICAgICBpZih0aGlzLnBlcmlvZGljVGltZXIgPT0gbnVsbCkge1xuICAgICAgICAgICAgdGhpcy5wZXJpb2RpY1RpbWVyID0gc2V0SW50ZXJ2YWwoKCkgPT4gdGhpcy5jaGVja1Byb2dyZXNzKCksIDEwMCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzdG9wUGVyaW9kaWNUaW1lcigpIHtcbiAgICAgICAgaWYodGhpcy5wZXJpb2RpY1RpbWVyICE9IG51bGwpIHtcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5wZXJpb2RpY1RpbWVyKTtcbiAgICAgICAgICAgIHRoaXMucGVyaW9kaWNUaW1lciA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjaGVja1Byb2dyZXNzKCkge1xuICAgICAgICBpZih0aGlzLnF1aXBNb2RlbCA9PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcHJvZ3Jlc3NVcGRhdGUgPSB7XG4gICAgICAgICAgICBjdXJyZW50VGltZTogdGhpcy5hdWRpb1BsYXllci5jdXJyZW50VGltZSxcbiAgICAgICAgICAgIGR1cmF0aW9uOiB0aGlzLmF1ZGlvUGxheWVyLmR1cmF0aW9uLFxuICAgICAgICAgICAgcHJvZ3Jlc3M6IDEwMCAqIHRoaXMuYXVkaW9QbGF5ZXIuY3VycmVudFRpbWUgLyB0aGlzLmF1ZGlvUGxheWVyLmR1cmF0aW9uXG4gICAgICAgIH1cblxuICAgICAgICBBdWRpb1BsYXllci50cmlnZ2VyKFwiL1wiICsgdGhpcy5xdWlwTW9kZWwuaWQgKyBcIi9wcm9ncmVzc1wiLCBwcm9ncmVzc1VwZGF0ZSk7XG4gICAgfVxuXG4gICAgb25Ub2dnbGUocXVpcE1vZGVsKSB7XG4gICAgICAgIHRoaXMucXVpcE1vZGVsID0gcXVpcE1vZGVsO1xuXG4gICAgICAgIGlmKCF0aGlzLnRyYWNrSXNMb2FkZWQocXVpcE1vZGVsLnVybCkpIHtcbiAgICAgICAgICAgIHRoaXMubG9hZFRyYWNrKHF1aXBNb2RlbC51cmwpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYoIXRoaXMudHJhY2tJc0xvYWRlZChxdWlwTW9kZWwudXJsKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYodGhpcy5hdWRpb1BsYXllci5wYXVzZWQpIHtcbiAgICAgICAgICAgIHRoaXMucGxheShxdWlwTW9kZWwpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5wYXVzZShxdWlwTW9kZWwpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcGxheShxdWlwTW9kZWwpIHtcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5wbGF5KCk7XG4gICAgICAgIEF1ZGlvUGxheWVyLnRyaWdnZXIoXCIvXCIgKyBxdWlwTW9kZWwuaWQgKyBcIi9wbGF5aW5nXCIpO1xuICAgICAgICB0aGlzLnN0YXJ0UGVyaW9kaWNUaW1lcigpO1xuICAgIH1cblxuICAgIHBhdXNlKHF1aXBNb2RlbCkge1xuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnBhdXNlKCk7XG4gICAgICAgIEF1ZGlvUGxheWVyLnRyaWdnZXIoXCIvXCIgKyBxdWlwTW9kZWwuaWQgKyBcIi9wYXVzZWRcIik7XG4gICAgICAgIHRoaXMuc3RvcFBlcmlvZGljVGltZXIoKTtcbiAgICB9XG5cbiAgICB0cmFja0lzTG9hZGVkKHVybCkge1xuICAgICAgICByZXR1cm4gfnRoaXMuYXVkaW9QbGF5ZXIuc3JjLmluZGV4T2YodXJsKTtcbiAgICB9XG5cbiAgICBsb2FkVHJhY2sodXJsKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiTG9hZGluZyBhdWRpbzogXCIgKyB1cmwpO1xuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnNyYyA9IHVybDtcbiAgICB9XG59XG5cbmNsYXNzIFF1aXBWaWV3IGV4dGVuZHMgQmFja2JvbmUuVmlldyB7XG4gICAgZGVmYXVsdHMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBxdWlwSWQ6IDAsXG4gICAgICAgICAgICBhdWRpb1BsYXllcjogbnVsbFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZXZlbnRzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgXCJjbGljayAucXVpcC1hY3Rpb25zIC5sb2NrLWluZGljYXRvclwiOiBcInRvZ2dsZVB1YmxpY1wiLFxuICAgICAgICAgICAgXCJjbGljayAucXVpcC1wbGF5ZXJcIjogXCJ0b2dnbGVcIlxuICAgICAgICB9XG4gICAgfVxuXG4gICAgb25QYXVzZSgpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJRdWlwVmlldzsgcGF1c2VkXCIpO1xuXG4gICAgICAgICQodGhpcy5lbClcbiAgICAgICAgICAgIC5maW5kKCcuZmEtcGxheScpXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2ZhLXBsYXknKVxuICAgICAgICAgICAgLmFkZENsYXNzKCdmYS1wYXVzZScpO1xuICAgIH1cblxuICAgIG9uUGxheSgpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJRdWlwVmlldzsgcGxheWluZ1wiKTtcblxuICAgICAgICAkKHRoaXMuZWwpXG4gICAgICAgICAgICAuZmluZCgnLmZhLXBhdXNlJylcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZmEtcGF1c2UnKVxuICAgICAgICAgICAgLmFkZENsYXNzKCdmYS1wbGF5Jyk7XG4gICAgfVxuXG4gICAgb25Qcm9ncmVzcyhwcm9ncmVzc1VwZGF0ZSkge1xuICAgICAgICB0aGlzLm1vZGVsLnNldCh7J3Byb2dyZXNzJzogcHJvZ3Jlc3NVcGRhdGUucHJvZ3Jlc3N9KTtcbiAgICB9XG5cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICB0aGlzLnF1aXBJZCA9IHRoaXMuJGVsLmRhdGEoXCJxdWlwSWRcIik7XG4gICAgICAgIHRoaXMucHVibGljTGluayA9ICcvdS8nICsgdGhpcy5xdWlwSWQ7XG5cbiAgICAgICAgQXVkaW9QbGF5ZXIub24oXCIvXCIgKyB0aGlzLnF1aXBJZCArIFwiL3BhdXNlZFwiLCAoKSA9PiB0aGlzLm9uUGF1c2UoKSk7XG4gICAgICAgIEF1ZGlvUGxheWVyLm9uKFwiL1wiICsgdGhpcy5xdWlwSWQgKyBcIi9wbGF5aW5nXCIsICgpID0+IHRoaXMub25QbGF5KCkpO1xuICAgICAgICBBdWRpb1BsYXllci5vbihcIi9cIiArIHRoaXMucXVpcElkICsgXCIvcHJvZ3Jlc3NcIiwgKHVwZGF0ZSkgPT4gdGhpcy5vblByb2dyZXNzKHVwZGF0ZSkpO1xuXG4gICAgICAgIHRoaXMubG9hZE1vZGVsKCk7XG5cbiAgICAgICAgLy8gdXBkYXRlIHZpc3VhbHMgdG8gaW5kaWNhdGUgcGxheWJhY2sgcHJvZ3Jlc3NcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLm1vZGVsLCAnY2hhbmdlOnByb2dyZXNzJywgKG1vZGVsLCBwcm9ncmVzcykgPT4ge1xuICAgICAgICAgICAgJCh0aGlzLmVsKS5maW5kKFwiLnByb2dyZXNzLWJhclwiKS5jc3MoXCJ3aWR0aFwiLCBwcm9ncmVzcyArIFwiJVwiKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLm1vZGVsLCBcImNoYW5nZVwiLCB0aGlzLnJlbmRlcik7XG4gICAgfVxuXG4gICAgbG9hZE1vZGVsKCkge1xuICAgICAgICB2YXIgcHJvZ3Jlc3MgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcInF1aXA6XCIgKyB0aGlzLnF1aXBJZCArIFwiOnByb2dyZXNzXCIpO1xuICAgICAgICB2YXIgcG9zaXRpb24gPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcInF1aXA6XCIgKyB0aGlzLnF1aXBJZCArIFwiOnBvc2l0aW9uXCIpO1xuXG4gICAgICAgIHRoaXMubW9kZWwuc2V0KHtcbiAgICAgICAgICAgICdpZCc6IHRoaXMucXVpcElkLFxuICAgICAgICAgICAgJ3Byb2dyZXNzJzogcHJvZ3Jlc3MsXG4gICAgICAgICAgICAncG9zaXRpb24nOiBwb3NpdGlvbixcbiAgICAgICAgICAgICdpc1B1YmxpYyc6IHRoaXMuJGVsLmRhdGEoXCJpc1B1YmxpY1wiKSA9PSAnVHJ1ZScsXG4gICAgICAgICAgICAnaXNNaW5lJzogdGhpcy4kZWwuZGF0YShcImlzTWluZVwiKSA9PSAnVHJ1ZSdcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgdG9nZ2xlUHVibGljKGV2KSB7XG4gICAgICAgIHZhciBuZXdTdGF0ZSA9ICF0aGlzLm1vZGVsLmdldCgnaXNQdWJsaWMnKTtcbiAgICAgICAgdGhpcy5tb2RlbC5zZXQoeydpc1B1YmxpYyc6IG5ld1N0YXRlfSk7XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJ0b2dnbGluZyBuZXcgcHVibGlzaGVkIHN0YXRlOiBcIiArIG5ld1N0YXRlKTtcblxuICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgICAgdXJsOiAnL3JlY29yZGluZy9wdWJsaXNoLycgKyB0aGlzLnF1aXBJZCxcbiAgICAgICAgICAgIG1ldGhvZDogJ3Bvc3QnLFxuICAgICAgICAgICAgZGF0YToge2lzUHVibGljOiBuZXdTdGF0ZX0sXG4gICAgICAgICAgICBjb21wbGV0ZTogZnVuY3Rpb24gKHJlc3ApIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcCAmJiByZXNwLnN0YXR1cyA9PSAnc3VjY2VzcycpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gY2hhbmdlIHN1Y2Nlc3NmdWxcbiAgICAgICAgICAgICAgICB9IGVsc2UgeyAgIC8vIGNoYW5nZSBmYWlsZWRcbiAgICAgICAgICAgICAgICAgICAgLy8gVE9ETzogYWRkIHZpc3VhbCB0byBpbmRpY2F0ZSBjaGFuZ2UtZmFpbHVyZVxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJUb2dnbGluZyByZWNvcmRpbmcgcHVibGljYXRpb24gc3RhdGUgZmFpbGVkOlwiKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5kaXIocmVzcCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQXVkaW8gZWxlbWVudCBmaWVsZHNcbiAgICAgKiAuZHVyYXRpb24gKHNlY29uZHMpXG4gICAgICogLm9ucHJvZ3Jlc3NcbiAgICAgKiAub25wbGF5XG4gICAgICogLm9ucGF1c2VcbiAgICAgKiAucGF1c2VkXG4gICAgICogLnZvbHVtZVxuICAgICAqIC5lbmRlZFxuICAgICAqIC5jdXJyZW50VGltZVxuICAgICAqL1xuXG4gICAgdG9nZ2xlKGV2ZW50KSB7XG4gICAgICAgIHZhciBxdWlwSWQgPSAkKHRoaXMuZWwpLmRhdGEoXCJxdWlwSWRcIik7XG4gICAgICAgIHRoaXMubW9kZWwudXJsID0gJy9yZWNvcmRpbmdzLycgKyBxdWlwSWQgKyAnLm9nZyc7XG5cbiAgICAgICAgQXVkaW9QbGF5ZXIudHJpZ2dlcihcInRvZ2dsZVwiLCB0aGlzLm1vZGVsKTtcbiAgICB9XG5cbiAgICByZW5kZXIoKSB7XG4gICAgICAgIC8vdGhpcy4kZWwuaHRtbChfLnRlbXBsYXRlKCQoJyNxdWlwLXRlbXBsYXRlJykuaHRtbCgpKSk7XG4gICAgICAgIC8vcmV0dXJuIHRoaXM7XG4gICAgICAgIHZhciByZXN1bHQgPSAkKHRoaXMuZWwpLmZpbmQoJy5xdWlwLWFjdGlvbnMnKS5maW5kKCcubG9jay1pbmRpY2F0b3InKTtcbiAgICAgICAgaWYgKHJlc3VsdClcbiAgICAgICAgICAgIHJlc3VsdC5yZW1vdmUoKTtcblxuICAgICAgICBpZiAodGhpcy5tb2RlbC5nZXQoJ2lzTWluZScpKSB7XG4gICAgICAgICAgICB2YXIgXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKTtcbiAgICAgICAgICAgIHZhciBodG1sID0gXy50ZW1wbGF0ZSgkKFwiI3F1aXAtY29udHJvbC1wcml2YWN5XCIpLmh0bWwoKSk7XG5cbiAgICAgICAgICAgICQodGhpcy5lbCkuZmluZChcIi5xdWlwLWFjdGlvbnNcIikuYXBwZW5kKGh0bWwoe1xuICAgICAgICAgICAgICAgIGlzUHVibGljOiB0aGlzLm1vZGVsLmdldCgnaXNQdWJsaWMnKSxcbiAgICAgICAgICAgICAgICBwdWJsaWNMaW5rOiB0aGlzLnB1YmxpY0xpbmtcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuY2xhc3MgUXVpcExpc3QgZXh0ZW5kcyBCYWNrYm9uZS5Db2xsZWN0aW9uIHtcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zKSB7XG4gICAgICAgIHN1cGVyKG9wdGlvbnMpO1xuICAgICAgICB0aGlzLm1vZGVsID0gUXVpcE1vZGVsO1xuICAgIH1cbn1cblxudmFyIFF1aXBzID0gbmV3IFF1aXBMaXN0KCk7XG5cbmV4cG9ydCB7IFF1aXBNb2RlbCwgUXVpcFZpZXcsIFF1aXBMaXN0LCBRdWlwcywgQXVkaW9QbGF5ZXJWaWV3IH07XG4iLCJpbXBvcnQgQmFja2JvbmUgZnJvbSAnYmFja2JvbmUnXG5pbXBvcnQgeyBRdWlwTW9kZWwsIFF1aXBWaWV3LCBRdWlwcywgQXVkaW9QbGF5ZXJWaWV3IH0gZnJvbSAnLi9xdWlwLWNvbnRyb2wuanMnXG5pbXBvcnQgeyBBdWRpb0NhcHR1cmUgfSBmcm9tICcuL2F1ZGlvLWNhcHR1cmUnXG5cbmV4cG9ydCBjbGFzcyBSZWNvcmRlciBleHRlbmRzIEJhY2tib25lLk1vZGVsIHtcbiAgICBkZWZhdWx0cygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlY29yZGluZ1RpbWU6IDBcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFJlY29yZGVyVmlldyBleHRlbmRzIEJhY2tib25lLlZpZXcge1xuICAgIC8vICAgIGVsOiAnLm0tcmVjb3JkaW5nLWNvbnRhaW5lcicsXG5cbiAgICBJbnRUb1RpbWUodmFsdWUpIHtcbiAgICAgICAgdmFyIG1pbnV0ZXMgPSBNYXRoLmZsb29yKHZhbHVlIC8gNjApO1xuICAgICAgICB2YXIgc2Vjb25kcyA9IE1hdGgucm91bmQodmFsdWUgLSBtaW51dGVzICogNjApO1xuXG4gICAgICAgIHJldHVybiAoXCIwMFwiICsgbWludXRlcykuc3Vic3RyKC0yKSArIFwiOlwiICsgKFwiMDBcIiArIHNlY29uZHMpLnN1YnN0cigtMik7XG4gICAgfVxuXG4gICAgZGVmYXVsdHMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBhdWRpb0NhcHR1cmU6IG51bGwsXG4gICAgICAgICAgICBhdWRpb0Jsb2I6IG51bGwsXG4gICAgICAgICAgICBhdWRpb0Jsb2JVcmw6IG51bGwsXG4gICAgICAgICAgICBhdWRpb1BsYXllcjogbnVsbCxcbiAgICAgICAgICAgIGlzUmVjb3JkaW5nOiBmYWxzZSxcbiAgICAgICAgICAgIHRpbWVySWQ6IDAsXG4gICAgICAgICAgICB0aW1lclN0YXJ0OiAzXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBldmVudHMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBcImNsaWNrIC5yZWNvcmRpbmctdG9nZ2xlXCI6IFwidG9nZ2xlXCIsXG4gICAgICAgICAgICBcImNsaWNrICNjYW5jZWwtcmVjb3JkaW5nXCI6IFwiY2FuY2VsUmVjb3JkaW5nXCIsXG4gICAgICAgICAgICBcImNsaWNrICN1cGxvYWQtcmVjb3JkaW5nXCI6IFwidXBsb2FkUmVjb3JkaW5nXCIsXG4gICAgICAgICAgICBcImNsaWNrICNoZWxwZXItYnRuXCI6IFwicGxheVByZXZpZXdcIlxuICAgICAgICB9XG4gICAgfVxuXG5cbiAgICBpbml0aWFsaXplKG9wdGlvbnMpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJSZWNvcmRlclZpZXcgaW5pdFwiKTtcbiAgICAgICAgdGhpcy5hdWRpb0NhcHR1cmUgPSBuZXcgQXVkaW9DYXB0dXJlKCk7XG5cbiAgICAgICAgdGhpcy5hdWRpb1BsYXllciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicmVjb3JkZWQtcHJldmlld1wiKTtcbiAgICAgICAgY29uc29sZS5sb2coJ3RoaXMuYXVkaW9QbGF5ZXIgPSAnICsgdGhpcy5hdWRpb1BsYXllcik7XG5cbiAgICAgICAgLy90aGlzLmF1ZGlvUGxheWVyLmxvb3AgPSBcImxvb3BcIjtcbiAgICAgICAgLy90aGlzLmF1ZGlvUGxheWVyLmF1dG9wbGF5ID0gXCJhdXRvcGxheVwiO1xuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnNyYyA9IFwiL2Fzc2V0cy9zb3VuZHMvYmVlcF9zaG9ydF9vbi5vZ2dcIjtcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5wbGF5KCk7XG5cbiAgICAgICAgdGhpcy5tb2RlbC5vbignY2hhbmdlOnJlY29yZGluZ1RpbWUnLCBmdW5jdGlvbiAobW9kZWwsIHRpbWUpIHtcbiAgICAgICAgICAgICQoXCIucmVjb3JkaW5nLXRpbWVcIikudGV4dCh0aW1lKTtcbiAgICAgICAgfSlcblxuICAgICAgICAvLyBhdHRlbXB0IHRvIGZldGNoIG1lZGlhLXN0cmVhbSBvbiBwYWdlLWxvYWRcbiAgICAgICAgdGhpcy5hdWRpb0NhcHR1cmUucHJlbG9hZE1lZGlhU3RyZWFtKCk7XG5cbiAgICAgICAgLy8gVE9ETzogYSBwcmV0dHkgYWR2YW5jZWQgYnV0IG5lYXQgZmVhdHVyZSBtYXkgYmUgdG8gc3RvcmUgYSBiYWNrdXAgY29weSBvZiBhIHJlY29yZGluZyBsb2NhbGx5IGluIGNhc2Ugb2YgYSBjcmFzaCBvciB1c2VyLWVycm9yXG4gICAgICAgIC8qXG4gICAgICAgICAvLyBjaGVjayBob3cgbXVjaCB0ZW1wb3Jhcnkgc3RvcmFnZSBzcGFjZSB3ZSBoYXZlLiBpdCdzIGEgZ29vZCB3YXkgdG8gc2F2ZSByZWNvcmRpbmcgd2l0aG91dCBsb3NpbmcgaXRcbiAgICAgICAgIHdpbmRvdy53ZWJraXRTdG9yYWdlSW5mby5xdWVyeVVzYWdlQW5kUXVvdGEoXG4gICAgICAgICB3ZWJraXRTdG9yYWdlSW5mby5URU1QT1JBUlksXG4gICAgICAgICBmdW5jdGlvbih1c2VkLCByZW1haW5pbmcpIHtcbiAgICAgICAgIHZhciBybWIgPSAocmVtYWluaW5nIC8gMTAyNCAvIDEwMjQpLnRvRml4ZWQoNCk7XG4gICAgICAgICB2YXIgdW1iID0gKHVzZWQgLyAxMDI0IC8gMTAyNCkudG9GaXhlZCg0KTtcbiAgICAgICAgIGNvbnNvbGUubG9nKFwiVXNlZCBxdW90YTogXCIgKyB1bWIgKyBcIm1iLCByZW1haW5pbmcgcXVvdGE6IFwiICsgcm1iICsgXCJtYlwiKTtcbiAgICAgICAgIH0sIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgIGNvbnNvbGUubG9nKCdFcnJvcicsIGUpO1xuICAgICAgICAgfVxuICAgICAgICAgKTtcblxuICAgICAgICAgZnVuY3Rpb24gb25FcnJvckluRlMoKSB7XG4gICAgICAgICB2YXIgbXNnID0gJyc7XG5cbiAgICAgICAgIHN3aXRjaCAoZS5jb2RlKSB7XG4gICAgICAgICBjYXNlIEZpbGVFcnJvci5RVU9UQV9FWENFRURFRF9FUlI6XG4gICAgICAgICBtc2cgPSAnUVVPVEFfRVhDRUVERURfRVJSJztcbiAgICAgICAgIGJyZWFrO1xuICAgICAgICAgY2FzZSBGaWxlRXJyb3IuTk9UX0ZPVU5EX0VSUjpcbiAgICAgICAgIG1zZyA9ICdOT1RfRk9VTkRfRVJSJztcbiAgICAgICAgIGJyZWFrO1xuICAgICAgICAgY2FzZSBGaWxlRXJyb3IuU0VDVVJJVFlfRVJSOlxuICAgICAgICAgbXNnID0gJ1NFQ1VSSVRZX0VSUic7XG4gICAgICAgICBicmVhaztcbiAgICAgICAgIGNhc2UgRmlsZUVycm9yLklOVkFMSURfTU9ESUZJQ0FUSU9OX0VSUjpcbiAgICAgICAgIG1zZyA9ICdJTlZBTElEX01PRElGSUNBVElPTl9FUlInO1xuICAgICAgICAgYnJlYWs7XG4gICAgICAgICBjYXNlIEZpbGVFcnJvci5JTlZBTElEX1NUQVRFX0VSUjpcbiAgICAgICAgIG1zZyA9ICdJTlZBTElEX1NUQVRFX0VSUic7XG4gICAgICAgICBicmVhaztcbiAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICBtc2cgPSAnVW5rbm93biBFcnJvcic7XG4gICAgICAgICBicmVhaztcbiAgICAgICAgIH1cblxuICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yOiAnICsgbXNnKTtcbiAgICAgICAgIH1cblxuICAgICAgICAgd2luZG93LnJlcXVlc3RGaWxlU3lzdGVtICA9IHdpbmRvdy5yZXF1ZXN0RmlsZVN5c3RlbSB8fCB3aW5kb3cud2Via2l0UmVxdWVzdEZpbGVTeXN0ZW07XG5cbiAgICAgICAgIHdpbmRvdy5yZXF1ZXN0RmlsZVN5c3RlbSh3aW5kb3cuVEVNUE9SQVJZLCA1ICogMTAyNCAqIDEwMjQsIGZ1bmN0aW9uIG9uU3VjY2Vzcyhmcykge1xuXG4gICAgICAgICBjb25zb2xlLmxvZygnb3BlbmluZyBmaWxlJyk7XG5cbiAgICAgICAgIGZzLnJvb3QuZ2V0RmlsZShcInRlc3RcIiwge2NyZWF0ZTp0cnVlfSwgZnVuY3Rpb24oZmUpIHtcblxuICAgICAgICAgY29uc29sZS5sb2coJ3NwYXduZWQgd3JpdGVyJyk7XG5cbiAgICAgICAgIGZlLmNyZWF0ZVdyaXRlcihmdW5jdGlvbihmdykge1xuXG4gICAgICAgICBmdy5vbndyaXRlZW5kID0gZnVuY3Rpb24oZSkge1xuICAgICAgICAgY29uc29sZS5sb2coJ3dyaXRlIGNvbXBsZXRlZCcpO1xuICAgICAgICAgfTtcblxuICAgICAgICAgZncub25lcnJvciA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgIGNvbnNvbGUubG9nKCd3cml0ZSBmYWlsZWQ6ICcgKyBlLnRvU3RyaW5nKCkpO1xuICAgICAgICAgfTtcblxuICAgICAgICAgY29uc29sZS5sb2coJ3dyaXRpbmcgYmxvYiB0byBmaWxlLi4nKTtcblxuICAgICAgICAgdmFyIGJsb2IgPSBuZXcgQmxvYihbJ3llaCB0aGlzIGlzIGEgdGVzdCEnXSwge3R5cGU6ICd0ZXh0L3BsYWluJ30pO1xuICAgICAgICAgZncud3JpdGUoYmxvYik7XG5cbiAgICAgICAgIH0sIG9uRXJyb3JJbkZTKTtcblxuICAgICAgICAgfSwgb25FcnJvckluRlMpO1xuXG4gICAgICAgICB9LCBvbkVycm9ySW5GUyk7XG4gICAgICAgICAqL1xuICAgIH1cblxuICAgIHRvZ2dsZShldmVudCkge1xuICAgICAgICBpZiAodGhpcy5pc1JlY29yZGluZykge1xuICAgICAgICAgICAgdGhpcy5pc1JlY29yZGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5zdG9wUmVjb3JkaW5nKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmlzUmVjb3JkaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuc3RhcnRSZWNvcmRpbmcoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNhbmNlbFJlY29yZGluZyhldmVudCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlJlY29yZGVyOjpvblJlY29yZGluZ0NvbXBsZXRlZCgpOyBjYW5jZWxpbmcgcmVjb3JkaW5nXCIpO1xuICAgICAgICAkKFwiI3JlY29yZGVyLWZ1bGxcIikucmVtb3ZlQ2xhc3MoXCJkaXNhYmxlZFwiKTtcbiAgICAgICAgJChcIiNyZWNvcmRlci11cGxvYWRlclwiKS5hZGRDbGFzcyhcImRpc2FibGVkXCIpO1xuICAgICAgICAkKFwiLm0tcmVjb3JkaW5nLWNvbnRhaW5lclwiKS5yZW1vdmVDbGFzcyhcImZsaXBwZWRcIik7XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIuc3JjID0gXCJcIjtcbiAgICAgICAgdGhpcy5tb2RlbC5zZXQoJ3JlY29yZGluZ1RpbWUnLCAzKTtcbiAgICB9XG5cbiAgICB1cGxvYWRSZWNvcmRpbmcoZXZlbnQpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJSZWNvcmRlcjo6b25SZWNvcmRpbmdDb21wbGV0ZWQoKTsgdXBsb2FkaW5nIHJlY29yZGluZ1wiKTtcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5zcmMgPSBcIlwiO1xuXG4gICAgICAgICQoXCIjcmVjb3JkZXItZnVsbFwiKS5hZGRDbGFzcyhcImRpc2FibGVkXCIpO1xuICAgICAgICAkKFwiI3JlY29yZGVyLXVwbG9hZGVyXCIpLnJlbW92ZUNsYXNzKFwiZGlzYWJsZWRcIik7XG4gICAgICAgICQoXCIubS1yZWNvcmRpbmctY29udGFpbmVyXCIpLnJlbW92ZUNsYXNzKFwiZmxpcHBlZFwiKTtcblxuICAgICAgICB2YXIgZGVzY3JpcHRpb24gPSAkKCd0ZXh0YXJlYVtuYW1lPWRlc2NyaXB0aW9uXScpWzBdLnZhbHVlO1xuXG4gICAgICAgIHZhciBkYXRhID0gbmV3IEZvcm1EYXRhKCk7XG4gICAgICAgIGRhdGEuYXBwZW5kKCdkZXNjcmlwdGlvbicsIGRlc2NyaXB0aW9uKTtcbiAgICAgICAgZGF0YS5hcHBlbmQoJ2lzUHVibGljJywgMSk7XG4gICAgICAgIGRhdGEuYXBwZW5kKCdhdWRpby1ibG9iJywgdGhpcy5hdWRpb0Jsb2IpO1xuXG4gICAgICAgIC8vIHNlbmQgcmF3IGJsb2IgYW5kIG1ldGFkYXRhXG5cbiAgICAgICAgLy8gVE9ETzogZ2V0IGEgcmVwbGFjZW1lbnQgYWpheCBsaWJyYXJ5IChtYXliZSBwYXRjaCByZXF3ZXN0IHRvIHN1cHBvcnQgYmluYXJ5PylcbiAgICAgICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICB4aHIub3BlbigncG9zdCcsICcvcmVjb3JkaW5nL2NyZWF0ZScsIHRydWUpO1xuICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcignQWNjZXB0JywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcbiAgICAgICAgeGhyLnVwbG9hZC5vbnByb2dyZXNzID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIHZhciBwZXJjZW50ID0gKChlLmxvYWRlZCAvIGUudG90YWwpICogMTAwKS50b0ZpeGVkKDApICsgJyUnO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJwZXJjZW50YWdlOiBcIiArIHBlcmNlbnQpO1xuICAgICAgICAgICAgJChcIiNyZWNvcmRlci11cGxvYWRlclwiKS5maW5kKFwiLmJhclwiKS5jc3MoJ3dpZHRoJywgcGVyY2VudCk7XG4gICAgICAgIH07XG4gICAgICAgIHhoci5vbmxvYWQgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgJChcIiNyZWNvcmRlci11cGxvYWRlclwiKS5maW5kKFwiLmJhclwiKS5jc3MoJ3dpZHRoJywgJzEwMCUnKTtcbiAgICAgICAgICAgIGlmICh4aHIuc3RhdHVzID09IDIwMCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUmVjb3JkZXI6Om9uUmVjb3JkaW5nQ29tcGxldGVkKCk7IG1hbnVhbCB4aHIgc3VjY2Vzc2Z1bFwiKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJSZWNvcmRlcjo6b25SZWNvcmRpbmdDb21wbGV0ZWQoKTsgbWFudWFsIHhociBlcnJvclwiLCB4aHIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IEpTT04ucGFyc2UoeGhyLnJlc3BvbnNlKTtcbiAgICAgICAgICAgIGNvbnNvbGUuZGlyKHJlc3VsdCk7XG5cbiAgICAgICAgICAgIGlmIChyZXN1bHQuc3RhdHVzID09IFwic3VjY2Vzc1wiKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSByZXN1bHQudXJsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICB4aHIuc2VuZChkYXRhKTtcbiAgICB9XG5cbiAgICBvblJlY29yZGluZ1RpY2soKSB7XG4gICAgICAgIHZhciB0aW1lU3BhbiA9IHBhcnNlSW50KCgobmV3IERhdGUoKS5nZXRUaW1lKCkgLSB0aGlzLnRpbWVyU3RhcnQpIC8gMTAwMCkudG9GaXhlZCgpKTtcbiAgICAgICAgdmFyIHRpbWVTdHIgPSB0aGlzLkludFRvVGltZSh0aW1lU3Bhbik7XG4gICAgICAgIHRoaXMubW9kZWwuc2V0KCdyZWNvcmRpbmdUaW1lJywgdGltZVN0cik7XG4gICAgfVxuXG4gICAgb25Db3VudGRvd25UaWNrKCkge1xuICAgICAgICBpZiAoLS10aGlzLnRpbWVyU3RhcnQgPiAwKSB7XG4gICAgICAgICAgICB0aGlzLm1vZGVsLnNldCgncmVjb3JkaW5nVGltZScsIHRoaXMudGltZXJTdGFydCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImNvdW50ZG93biBoaXQgemVyby4gYmVnaW4gcmVjb3JkaW5nLlwiKTtcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy50aW1lcklkKTtcbiAgICAgICAgICAgIHRoaXMubW9kZWwuc2V0KCdyZWNvcmRpbmdUaW1lJywgdGhpcy5JbnRUb1RpbWUoMCkpO1xuICAgICAgICAgICAgdGhpcy5vbk1pY1JlY29yZGluZygpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgc3RhcnRSZWNvcmRpbmcoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwic3RhcnRpbmcgcmVjb3JkaW5nXCIpO1xuICAgICAgICB0aGlzLmF1ZGlvQ2FwdHVyZS5zdGFydCgoKSA9PiB0aGlzLm9uTWljUmVhZHkoKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTWljcm9waG9uZSBpcyByZWFkeSB0byByZWNvcmQuIERvIGEgY291bnQtZG93biwgdGhlbiBzaWduYWwgZm9yIGlucHV0LXNpZ25hbCB0byBiZWdpbiByZWNvcmRpbmdcbiAgICAgKi9cbiAgICBvbk1pY1JlYWR5KCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIm1pYyByZWFkeSB0byByZWNvcmQuIGRvIGNvdW50ZG93bi5cIik7XG4gICAgICAgIHRoaXMudGltZXJTdGFydCA9IDM7XG4gICAgICAgIC8vIHJ1biBjb3VudGRvd25cbiAgICAgICAgLy90aGlzLnRpbWVySWQgPSBzZXRJbnRlcnZhbCh0aGlzLm9uQ291bnRkb3duVGljay5iaW5kKHRoaXMpLCAxMDAwKTtcblxuICAgICAgICAvLyBvciBsYXVuY2ggY2FwdHVyZSBpbW1lZGlhdGVseVxuICAgICAgICB0aGlzLm1vZGVsLnNldCgncmVjb3JkaW5nVGltZScsIHRoaXMuSW50VG9UaW1lKDApKTtcbiAgICAgICAgdGhpcy5vbk1pY1JlY29yZGluZygpO1xuXG4gICAgICAgICQoXCIucmVjb3JkaW5nLXRpbWVcIikuYWRkQ2xhc3MoXCJpcy12aXNpYmxlXCIpO1xuICAgIH1cblxuICAgIG9uTWljUmVjb3JkaW5nKCkge1xuICAgICAgICB0aGlzLnRpbWVyU3RhcnQgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICAgICAgdGhpcy50aW1lcklkID0gc2V0SW50ZXJ2YWwodGhpcy5vblJlY29yZGluZ1RpY2suYmluZCh0aGlzKSwgMTAwMCk7XG4gICAgICAgICQoXCIubS1yZWNvcmRpbmctc2NyZWVuXCIpLmFkZENsYXNzKFwiaXMtcmVjb3JkaW5nXCIpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiTWljIHJlY29yZGluZyBzdGFydGVkXCIpO1xuXG4gICAgICAgIC8vIFRPRE86IHRoZSBtaWMgY2FwdHVyZSBpcyBhbHJlYWR5IGFjdGl2ZSwgc28gYXVkaW8gYnVmZmVycyBhcmUgZ2V0dGluZyBidWlsdCB1cFxuICAgICAgICAvLyB3aGVuIHRvZ2dsaW5nIHRoaXMgb24sIHdlIG1heSBhbHJlYWR5IGJlIGNhcHR1cmluZyBhIGJ1ZmZlciB0aGF0IGhhcyBhdWRpbyBwcmlvciB0byB0aGUgY291bnRkb3duXG4gICAgICAgIC8vIGhpdHRpbmcgemVyby4gd2UgY2FuIGRvIGEgZmV3IHRoaW5ncyBoZXJlOlxuICAgICAgICAvLyAxKSBmaWd1cmUgb3V0IGhvdyBtdWNoIGF1ZGlvIHdhcyBhbHJlYWR5IGNhcHR1cmVkLCBhbmQgY3V0IGl0IG91dFxuICAgICAgICAvLyAyKSB1c2UgYSBmYWRlLWluIHRvIGNvdmVyIHVwIHRoYXQgc3BsaXQtc2Vjb25kIG9mIGF1ZGlvXG4gICAgICAgIC8vIDMpIGFsbG93IHRoZSB1c2VyIHRvIGVkaXQgcG9zdC1yZWNvcmQgYW5kIGNsaXAgYXMgdGhleSB3aXNoIChiZXR0ZXIgYnV0IG1vcmUgY29tcGxleCBvcHRpb24hKVxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHRoaXMuYXVkaW9DYXB0dXJlLnRvZ2dsZU1pY3JvcGhvbmVSZWNvcmRpbmcodHJ1ZSksIDUwMCk7XG4gICAgfVxuXG4gICAgc3RvcFJlY29yZGluZygpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJzdG9wcGluZyByZWNvcmRpbmdcIik7XG4gICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy50aW1lcklkKTtcblxuICAgICAgICAvLyBwbGF5IHNvdW5kIGltbWVkaWF0ZWx5IHRvIGJ5cGFzcyBtb2JpbGUgY2hyb21lJ3MgXCJ1c2VyIGluaXRpYXRlZCBtZWRpYVwiIHJlcXVpcmVtZW50XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIuc3JjID0gXCIvYXNzZXRzL3NvdW5kcy9iZWVwX3Nob3J0X29mZi5vZ2dcIjtcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5wbGF5KCk7XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIubG9vcCA9IHRydWU7XG5cbiAgICAgICAgdGhpcy5hdWRpb0NhcHR1cmUuc3RvcCgoYmxvYikgPT4gdGhpcy5vblJlY29yZGluZ0NvbXBsZXRlZChibG9iKSk7XG5cbiAgICAgICAgJChcIi5yZWNvcmRpbmctdGltZVwiKS5yZW1vdmVDbGFzcyhcImlzLXZpc2libGVcIik7XG4gICAgICAgICQoXCIubS1yZWNvcmRpbmctc2NyZWVuXCIpLnJlbW92ZUNsYXNzKFwiaXMtcmVjb3JkaW5nXCIpO1xuXG4gICAgICAgIC8vIFRPRE86IGFuaW1hdGUgcmVjb3JkZXIgb3V0XG4gICAgICAgIC8vIFRPRE86IGFuaW1hdGUgdXBsb2FkZXIgaW5cbiAgICB9XG5cbiAgICBvblJlY29yZGluZ0NvbXBsZXRlZChibG9iKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiUmVjb3JkZXI6Om9uUmVjb3JkaW5nQ29tcGxldGVkKCk7IHByZXZpZXdpbmcgcmVjb3JkZWQgYXVkaW9cIik7XG4gICAgICAgIHRoaXMuYXVkaW9CbG9iID0gYmxvYjtcbiAgICAgICAgdGhpcy5zaG93Q29tcGxldGlvblNjcmVlbigpO1xuICAgIH1cblxuXG5cbiAgICBwbGF5UHJldmlldygpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJwbGF5aW5nIHByZXZpZXcuLlwiKTtcbiAgICAgICAgY29uc29sZS5sb2coXCJhdWRpbyBibG9iXCIsIHRoaXMuYXVkaW9CbG9iKTtcbiAgICAgICAgY29uc29sZS5sb2coXCJhdWRpbyBibG9iIHVybFwiLCB0aGlzLmF1ZGlvQmxvYlVybCk7XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIuc3JjID0gdGhpcy5hdWRpb0Jsb2JVcmw7XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIucGxheSgpO1xuICAgIH1cblxuICAgIHNob3dDb21wbGV0aW9uU2NyZWVuKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlJlY29yZGVyOjpvblJlY29yZGluZ0NvbXBsZXRlZCgpOyBmbGlwcGluZyBjYXJkXCIpO1xuICAgICAgICB0aGlzLmF1ZGlvQmxvYlVybCA9IHdpbmRvdy5VUkwuY3JlYXRlT2JqZWN0VVJMKHRoaXMuYXVkaW9CbG9iKTtcbiAgICAgICAgJChcIi5tLXJlY29yZGluZy1jb250YWluZXJcIikuYWRkQ2xhc3MoXCJmbGlwcGVkXCIpO1xuXG4gICAgICAgIC8vIFRPRE86IGdldCBhIGNoYWluYWJsZSBhbmltYXRpb25zIGxpYnJhcnkgdGhhdCBzdXBwb3J0cyBkZWxheXNcbiAgICAgICAgLy9zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgLy8gICAgY29uc29sZS5sb2coXCJSZWNvcmRlcjo6b25SZWNvcmRpbmdDb21wbGV0ZWQoKTsgYXNzaWduaW5nIGJsb2IgdXJsOiBcIiArIHVybCk7XG4gICAgICAgICAgICAvL3RoaXMuYXVkaW9QbGF5ZXIuc3JjID0gdXJsO1xuICAgICAgICAgICAgLy90aGlzLmF1ZGlvUGxheWVyLnBsYXkoKTtcbiAgICAgICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIubG9vcCA9IGZhbHNlO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJhdWRpbyBwbGF5ZXIgd2l0aCBibG9iXCIsIHRoaXMuYXVkaW9QbGF5ZXIpO1xuICAgICAgICAvL30sIDIwMCk7XG4gICAgfVxufVxuIl19
