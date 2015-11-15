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
                    left: e.inputBuffer.getChannelData(0)
                    //right: e.inputBuffer.getChannelData(1)
                };

                //var leftOut = e.outputBuffer.getChannelData(0);
                //for(var i = 0; i < msg.left.length; i++) {
                //    leftOut[i] = msg.left[i];
                //}

                _this._totalNumSamples += msg.left.length;

                _this._encodingWorker.postMessage(msg);
            };

            // handle messages from the encoding-worker
            this._encodingWorker.onmessage = function (e) {

                // worker finished and has the final encoded audio buffer for us
                if (e.data.action === "encoded") {
                    var encoded_blob = new Blob([e.data.buffer], { type: 'audio/ogg' });

                    console.log("e.data.buffer.buffer = " + e.data.buffer.buffer);
                    console.log("e.data.buffer.byteLength = " + e.data.buffer.byteLength);
                    console.log("sampleRate = " + _this._audioContext.sampleRate);
                    console.log("totalNumSamples = " + _this._totalNumSamples);
                    console.log("Duration of recording = " + _this._totalNumSamples / _this._audioContext.sampleRate + " seconds");

                    console.log("got encoded blob: size=" + encoded_blob.size + " type=" + encoded_blob.type);

                    if (_this._onCaptureCompleteCallback) _this._onCaptureCompleteCallback(encoded_blob);

                    // worker has exited, unreference it
                    _this._encodingWorker = null;
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
    }, {
        key: "shutdownManualEncoding",
        value: function shutdownManualEncoding() {
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
            if (this.audioPlayer == null) {
                return;
            }

            console.log("can play vorbis: ", !!this.audioPlayer.canPlayType && "" != this.audioPlayer.canPlayType('audio/ogg; codecs="vorbis"'));

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

            // HACK: route blob through xhr to let Android Chrome play blobs via <audio>
            var xhr = new XMLHttpRequest();
            xhr.open('GET', this.audioBlobUrl, true);
            xhr.responseType = 'blob';
            xhr.overrideMimeType('audio/ogg');

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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvYWJhcmthbi9hbGV4LWRldi9xdWlwcy1weXRob24vYXBwL2phdmFzY3JpcHRzL2FwcC5qcyIsIi9Vc2Vycy9hYmFya2FuL2FsZXgtZGV2L3F1aXBzLXB5dGhvbi9hcHAvamF2YXNjcmlwdHMvYXVkaW8tY2FwdHVyZS5qcyIsIi9Vc2Vycy9hYmFya2FuL2FsZXgtZGV2L3F1aXBzLXB5dGhvbi9hcHAvamF2YXNjcmlwdHMvYXVkaW8tcGxheWVyLmpzIiwiL1VzZXJzL2FiYXJrYW4vYWxleC1kZXYvcXVpcHMtcHl0aG9uL2FwcC9qYXZhc2NyaXB0cy9ob21lcGFnZS5qcyIsIi9Vc2Vycy9hYmFya2FuL2FsZXgtZGV2L3F1aXBzLXB5dGhvbi9hcHAvamF2YXNjcmlwdHMvcXVpcC1jb250cm9sLmpzIiwiL1VzZXJzL2FiYXJrYW4vYWxleC1kZXYvcXVpcHMtcHl0aG9uL2FwcC9qYXZhc2NyaXB0cy9yZWNvcmRpbmctY29udHJvbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7d0JDQXFCLFVBQVU7Ozs7d0JBQ0osWUFBWTs7OztnQ0FDQSxxQkFBcUI7O0lBRXRELFdBQVcsR0FDRixTQURULFdBQVcsR0FDQzswQkFEWixXQUFXOztBQUVULDBCQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDZiwwQkFBUyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7O0FBRXpCLFFBQUksSUFBSSxHQUFHLDJCQUFvQixDQUFDO0FBQ2hDLFFBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQzs7QUFFZCxRQUFJLFFBQVEsR0FBRyxtQ0FBaUI7QUFDNUIsVUFBRSxFQUFFLENBQUMsQ0FBQyx3QkFBd0IsQ0FBQztBQUMvQixhQUFLLEVBQUUsK0JBQWEsRUFBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQztLQUMzQyxDQUFDLENB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Q0FBQyxDQUFDOztBQUUxRCwyQkFBTyxDQUFDLEdBQUcsQ0FBQyw4QkFBOEIsR0FBRyxPQUFLLFlBQVksQ0FBQyxDQUFDO0FBQ2hFLDJCQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QixHQUFHLFVBQVUsQ0FBQyxDQUFDOztBQUVuRCwyQkFBSyxXQUFXLENBQUMsR0FBRyxHQUFHLFVBQVUsQ0FBQztBQUNsQywyQkFBSyxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUM7aUJBQzNCO2FBQ0osQ0FBQztBQUNGLGVBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQztTQUNkOzs7V0E1U1EsWUFBWTtHQUFTLHNCQUFTLElBQUkiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiaW1wb3J0IEJhY2tib25lIGZyb20gJ2JhY2tib25lJ1xuaW1wb3J0IFJlY29yZGluZ3NMaXN0IGZyb20gJy4vaG9tZXBhZ2UnXG5pbXBvcnQgeyBSZWNvcmRlclZpZXcsIFJlY29yZGVyIH0gZnJvbSAnLi9yZWNvcmRpbmctY29udHJvbCdcblxuY2xhc3MgQXBwbGljYXRpb24ge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBCYWNrYm9uZS4kID0gJDtcbiAgICAgICAgQmFja2JvbmUuaGlzdG9yeS5zdGFydCgpO1xuXG4gICAgICAgIHZhciB2aWV3ID0gbmV3IFJlY29yZGluZ3NMaXN0KCk7XG4gICAgICAgIHZpZXcucmVuZGVyKCk7XG5cbiAgICAgICAgdmFyIHJlY29yZGVyID0gbmV3IFJlY29yZGVyVmlldyh7XG4gICAgICAgICAgICBlbDogJCgnLm0tcmVjb3JkaW5nLWNvbnRhaW5lcicpLFxuICAgICAgICAgICAgbW9kZWw6IG5ldyBSZWNvcmRlcih7cmVjb3JkaW5nVGltZTogLTN9KVxuICAgICAgICB9KTtcblxuICAgICAgICAvLy8vIGxvY2F0ZSBhbnkgY29udHJvbGxlcnMgb24gdGhlIHBhZ2UgYW5kIGxvYWQgdGhlaXIgcmVxdWlyZW1lbnRzXG4gICAgICAgIC8vLy8gdGhpcyBpcyBhIHBhcnQgb2YgQW5ndWxhciBpIHJlYWxseSBsaWtlZCwgdGhlIGN1c3RvbSBkaXJlY3RpdmVzXG4gICAgICAgIC8vJCgnW2JhY2tib25lLWNvbnRyb2xsZXJdJykuZWFjaChmdW5jdGlvbihlbCkge1xuICAgICAgICAvL1xuICAgICAgICAvLyAgICB2YXIgY29udHJvbGxlck5hbWUgPSAkKGVsKS5hdHRyKCdiYWNrYm9uZS1jb250cm9sbGVyJyk7XG4gICAgICAgIC8vICAgIGlmKGNvbnRyb2xsZXJOYW1lIGluIEFwcC5Mb2FkZXJzKVxuICAgICAgICAvLyAgICAgICAgQXBwLkxvYWRlcnNbY29udHJvbGxlck5hbWVdKCk7XG4gICAgICAgIC8vICAgIGVsc2VcbiAgICAgICAgLy8gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJDb250cm9sbGVyOiAnXCIgKyBjb250cm9sbGVyTmFtZSArIFwiJyBub3QgZm91bmRcIik7XG4gICAgICAgIC8vfSk7XG4gICAgfVxufVxuXG4kKCgpID0+IHtcbiAgICAvLyBzZXR1cCByYXZlbiB0byBwdXNoIG1lc3NhZ2VzIHRvIG91ciBzZW50cnlcbiAgICAvL1JhdmVuLmNvbmZpZygnaHR0cHM6Ly9kMDk4NzEyY2I3MDY0Y2YwOGI3NGQwMWI2ZjNiZTNkYUBhcHAuZ2V0c2VudHJ5LmNvbS8yMDk3MycsIHtcbiAgICAvLyAgICB3aGl0ZWxpc3RVcmxzOiBbJ3N0YWdpbmcuY291Y2hwb2QuY29tJywgJ2NvdWNocG9kLmNvbSddIC8vIHByb2R1Y3Rpb24gb25seVxuICAgIC8vfSkuaW5zdGFsbCgpO1xuXG4gICAgUmF2ZW4uY29uZmlnKCdodHRwczovL2RiMmE3ZDU4MTA3YzQ5NzVhZTdkZTczNmE2MzA4YTFlQGFwcC5nZXRzZW50cnkuY29tLzUzNDU2Jywge1xuICAgICAgICB3aGl0ZWxpc3RVcmxzOiBbJ3N0YWdpbmcuY291Y2hwb2QuY29tJywgJ2NvdWNocG9kLmNvbSddIC8vIHByb2R1Y3Rpb24gb25seVxuICAgIH0pLmluc3RhbGwoKVxuXG4gICAgbmV3IEFwcGxpY2F0aW9uKCk7XG5cbiAgICAvLyBmb3IgcHJvZHVjdGlvbiwgY291bGQgd3JhcCBkb21SZWFkeUNhbGxiYWNrIGFuZCBsZXQgcmF2ZW4gaGFuZGxlIGFueSBleGNlcHRpb25zXG5cbiAgICAvKlxuICAgIHRyeSB7XG4gICAgICAgIGRvbVJlYWR5Q2FsbGJhY2soKTtcbiAgICB9IGNhdGNoKGVycikge1xuICAgICAgICBSYXZlbi5jYXB0dXJlRXhjZXB0aW9uKGVycik7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiW0Vycm9yXSBVbmhhbmRsZWQgRXhjZXB0aW9uIHdhcyBjYXVnaHQgYW5kIHNlbnQgdmlhIFJhdmVuOlwiKTtcbiAgICAgICAgY29uc29sZS5kaXIoZXJyKTtcbiAgICB9XG4gICAgKi9cbn0pXG5cbmV4cG9ydCBkZWZhdWx0IHsgQXBwbGljYXRpb24gfVxuIiwiaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSdcblxuZXhwb3J0IGNsYXNzIEF1ZGlvQ2FwdHVyZSB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIC8vIHNwYXduIGJhY2tncm91bmQgd29ya2VyXG4gICAgICAgIHRoaXMuX2VuY29kaW5nV29ya2VyID0gbmV3IFdvcmtlcihcIi9hc3NldHMvanMvd29ya2VyLWVuY29kZXIubWluLmpzXCIpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiSW5pdGlhbGl6ZWQgQXVkaW9DYXB0dXJlXCIpO1xuXG4gICAgICAgIF8uZXh0ZW5kKHRoaXMsIHtcbiAgICAgICAgICAgIF9hdWRpb0NvbnRleHQ6IG51bGwsXG4gICAgICAgICAgICBfYXVkaW9JbnB1dDogbnVsbCxcbiAgICAgICAgICAgIF9lbmNvZGluZ1dvcmtlcjogbnVsbCxcbiAgICAgICAgICAgIF9pc1JlY29yZGluZzogZmFsc2UsXG4gICAgICAgICAgICBfYXVkaW9MaXN0ZW5lcjogbnVsbCxcbiAgICAgICAgICAgIF9vbkNhcHR1cmVDb21wbGV0ZUNhbGxiYWNrOiBudWxsLFxuICAgICAgICAgICAgX2F1ZGlvQW5hbHl6ZXI6IG51bGwsXG4gICAgICAgICAgICBfYXVkaW9HYWluOiBudWxsLFxuICAgICAgICAgICAgX2NhY2hlZE1lZGlhU3RyZWFtOiBudWxsLFxuXG4gICAgICAgICAgICBfYXVkaW9FbmNvZGVyOiBudWxsLFxuICAgICAgICAgICAgX2xhdGVzdEF1ZGlvQnVmZmVyOiBbXSxcbiAgICAgICAgICAgIF9jYWNoZWRHYWluVmFsdWU6IDEsXG4gICAgICAgICAgICBfb25TdGFydGVkQ2FsbGJhY2s6IG51bGwsXG5cbiAgICAgICAgICAgIF9mZnRTaXplOiAyNTYsXG4gICAgICAgICAgICBfZmZ0U21vb3RoaW5nOiAwLjgsXG4gICAgICAgICAgICBfdG90YWxOdW1TYW1wbGVzOiAwXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIFRPRE86IGZpcmVmb3gncyBidWlsdC1pbiBvZ2ctY3JlYXRpb24gcm91dGVcbiAgICAvLyBGaXJlZm94IDI3J3MgbWFudWFsIHJlY29yZGluZyBkb2Vzbid0IHdvcmsuIHNvbWV0aGluZyBmdW5ueSB3aXRoIHRoZWlyIHNhbXBsaW5nIHJhdGVzIG9yIGJ1ZmZlciBzaXplc1xuICAgIC8vIHRoZSBkYXRhIGlzIGZhaXJseSBnYXJibGVkLCBsaWtlIHRoZXkgYXJlIHNlcnZpbmcgMjJraHogYXMgNDRraHogb3Igc29tZXRoaW5nIGxpa2UgdGhhdFxuICAgIHN0YXJ0QXV0b21hdGljRW5jb2RpbmcobWVkaWFTdHJlYW0pIHtcbiAgICAgICAgdGhpcy5fYXVkaW9FbmNvZGVyID0gbmV3IE1lZGlhUmVjb3JkZXIobWVkaWFTdHJlYW0pO1xuXG4gICAgICAgIHRoaXMuX2F1ZGlvRW5jb2Rlci5vbmRhdGFhdmFpbGFibGUgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJBdWRpb0NhcHR1cmU6OnN0YXJ0QXV0b21hdGljRW5jb2RpbmcoKTsgTWVkaWFSZWNvcmRlci5vbmRhdGFhdmFpbGFibGUoKTsgbmV3IGJsb2I6IHNpemU9XCIgKyBlLmRhdGEuc2l6ZSArIFwiIHR5cGU9XCIgKyBlLmRhdGEudHlwZSk7XG4gICAgICAgICAgICB0aGlzLl9sYXRlc3RBdWRpb0J1ZmZlci5wdXNoKGUuZGF0YSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5fYXVkaW9FbmNvZGVyLm9uc3RvcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQXVkaW9DYXB0dXJlOjpzdGFydEF1dG9tYXRpY0VuY29kaW5nKCk7IE1lZGlhUmVjb3JkZXIub25zdG9wKCk7IGhpdFwiKTtcblxuICAgICAgICAgICAgLy8gc2VuZCB0aGUgbGFzdCBjYXB0dXJlZCBhdWRpbyBidWZmZXJcbiAgICAgICAgICAgIHZhciBlbmNvZGVkX2Jsb2IgPSBuZXcgQmxvYih0aGlzLl9sYXRlc3RBdWRpb0J1ZmZlciwge3R5cGU6ICdhdWRpby9vZ2cnfSk7XG5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQXVkaW9DYXB0dXJlOjpzdGFydEF1dG9tYXRpY0VuY29kaW5nKCk7IE1lZGlhUmVjb3JkZXIub25zdG9wKCk7IGdvdCBlbmNvZGVkIGJsb2I6IHNpemU9XCIgKyBlbmNvZGVkX2Jsb2Iuc2l6ZSArIFwiIHR5cGU9XCIgKyBlbmNvZGVkX2Jsb2IudHlwZSk7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLl9vbkNhcHR1cmVDb21wbGV0ZUNhbGxiYWNrKVxuICAgICAgICAgICAgICAgIHRoaXMuX29uQ2FwdHVyZUNvbXBsZXRlQ2FsbGJhY2soZW5jb2RlZF9ibG9iKTtcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zb2xlLmxvZyhcIkF1ZGlvQ2FwdHVyZTo6c3RhcnRBdXRvbWF0aWNFbmNvZGluZygpOyBNZWRpYVJlY29yZGVyLnN0YXJ0KClcIik7XG4gICAgICAgIHRoaXMuX2F1ZGlvRW5jb2Rlci5zdGFydCgwKTtcbiAgICB9XG5cbiAgICBjcmVhdGVBdWRpb0NvbnRleHQobWVkaWFTdHJlYW0pIHtcbiAgICAgICAgLy8gYnVpbGQgY2FwdHVyZSBncmFwaFxuICAgICAgICB0aGlzLl9hdWRpb0NvbnRleHQgPSBuZXcgKHdpbmRvdy5BdWRpb0NvbnRleHQgfHwgd2luZG93LndlYmtpdEF1ZGlvQ29udGV4dCkoKTtcbiAgICAgICAgdGhpcy5fYXVkaW9JbnB1dCA9IHRoaXMuX2F1ZGlvQ29udGV4dC5jcmVhdGVNZWRpYVN0cmVhbVNvdXJjZShtZWRpYVN0cmVhbSk7XG4gICAgICAgIHRoaXMuX2F1ZGlvRGVzdGluYXRpb24gPSB0aGlzLl9hdWRpb0NvbnRleHQuY3JlYXRlTWVkaWFTdHJlYW1EZXN0aW5hdGlvbigpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiQXVkaW9DYXB0dXJlOjpzdGFydE1hbnVhbEVuY29kaW5nKCk7IF9hdWRpb0NvbnRleHQuc2FtcGxlUmF0ZTogXCIgKyB0aGlzLl9hdWRpb0NvbnRleHQuc2FtcGxlUmF0ZSArIFwiIEh6XCIpO1xuXG4gICAgICAgIC8vIGNyZWF0ZSBhIGxpc3RlbmVyIG5vZGUgdG8gZ3JhYiBtaWNyb3Bob25lIHNhbXBsZXMgYW5kIGZlZWQgaXQgdG8gb3VyIGJhY2tncm91bmQgd29ya2VyXG4gICAgICAgIHRoaXMuX2F1ZGlvTGlzdGVuZXIgPSAodGhpcy5fYXVkaW9Db250ZXh0LmNyZWF0ZVNjcmlwdFByb2Nlc3NvciB8fCB0aGlzLl9hdWRpb0NvbnRleHQuY3JlYXRlSmF2YVNjcmlwdE5vZGUpLmNhbGwodGhpcy5fYXVkaW9Db250ZXh0LCAxNjM4NCwgMSwgMSk7XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJ0aGlzLl9jYWNoZWRHYWluVmFsdWUgPSBcIiArIHRoaXMuX2NhY2hlZEdhaW5WYWx1ZSk7XG5cbiAgICAgICAgdGhpcy5fYXVkaW9HYWluID0gdGhpcy5fYXVkaW9Db250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICAgICAgdGhpcy5fYXVkaW9HYWluLmdhaW4udmFsdWUgPSB0aGlzLl9jYWNoZWRHYWluVmFsdWU7XG5cbiAgICAgICAgLy90aGlzLl9hdWRpb0FuYWx5emVyID0gdGhpcy5fYXVkaW9Db250ZXh0LmNyZWF0ZUFuYWx5c2VyKCk7XG4gICAgICAgIC8vdGhpcy5fYXVkaW9BbmFseXplci5mZnRTaXplID0gdGhpcy5fZmZ0U2l6ZTtcbiAgICAgICAgLy90aGlzLl9hdWRpb0FuYWx5emVyLnNtb290aGluZ1RpbWVDb25zdGFudCA9IHRoaXMuX2ZmdFNtb290aGluZztcbiAgICB9XG5cbiAgICBzdGFydE1hbnVhbEVuY29kaW5nKG1lZGlhU3RyZWFtKSB7XG5cbiAgICAgICAgaWYgKCF0aGlzLl9hdWRpb0NvbnRleHQpIHtcbiAgICAgICAgICAgIHRoaXMuY3JlYXRlQXVkaW9Db250ZXh0KG1lZGlhU3RyZWFtKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdGhpcy5fZW5jb2RpbmdXb3JrZXIpXG4gICAgICAgICAgICB0aGlzLl9lbmNvZGluZ1dvcmtlciA9IG5ldyBXb3JrZXIoXCIvYXNzZXRzL2pzL3dvcmtlci1lbmNvZGVyLm1pbi5qc1wiKTtcblxuICAgICAgICAvLyByZS1ob29rIGF1ZGlvIGxpc3RlbmVyIG5vZGUgZXZlcnkgdGltZSB3ZSBzdGFydCwgYmVjYXVzZSBfZW5jb2RpbmdXb3JrZXIgcmVmZXJlbmNlIHdpbGwgY2hhbmdlXG4gICAgICAgIHRoaXMuX2F1ZGlvTGlzdGVuZXIub25hdWRpb3Byb2Nlc3MgPSAoZSkgPT4ge1xuICAgICAgICAgICAgaWYgKCF0aGlzLl9pc1JlY29yZGluZykgcmV0dXJuO1xuXG4gICAgICAgICAgICB2YXIgbXNnID0ge1xuICAgICAgICAgICAgICAgIGFjdGlvbjogXCJwcm9jZXNzXCIsXG5cbiAgICAgICAgICAgICAgICAvLyB0d28gRmxvYXQzMkFycmF5c1xuICAgICAgICAgICAgICAgIGxlZnQ6IGUuaW5wdXRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMClcbiAgICAgICAgICAgICAgICAvL3JpZ2h0OiBlLmlucHV0QnVmZmVyLmdldENoYW5uZWxEYXRhKDEpXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvL3ZhciBsZWZ0T3V0ID0gZS5vdXRwdXRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCk7XG4gICAgICAgICAgICAvL2Zvcih2YXIgaSA9IDA7IGkgPCBtc2cubGVmdC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgLy8gICAgbGVmdE91dFtpXSA9IG1zZy5sZWZ0W2ldO1xuICAgICAgICAgICAgLy99XG5cbiAgICAgICAgICAgIHRoaXMuX3RvdGFsTnVtU2FtcGxlcyArPSBtc2cubGVmdC5sZW5ndGg7XG5cbiAgICAgICAgICAgIHRoaXMuX2VuY29kaW5nV29ya2VyLnBvc3RNZXNzYWdlKG1zZyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gaGFuZGxlIG1lc3NhZ2VzIGZyb20gdGhlIGVuY29kaW5nLXdvcmtlclxuICAgICAgICB0aGlzLl9lbmNvZGluZ1dvcmtlci5vbm1lc3NhZ2UgPSAoZSkgPT4ge1xuXG4gICAgICAgICAgICAvLyB3b3JrZXIgZmluaXNoZWQgYW5kIGhhcyB0aGUgZmluYWwgZW5jb2RlZCBhdWRpbyBidWZmZXIgZm9yIHVzXG4gICAgICAgICAgICBpZiAoZS5kYXRhLmFjdGlvbiA9PT0gXCJlbmNvZGVkXCIpIHtcbiAgICAgICAgICAgICAgICB2YXIgZW5jb2RlZF9ibG9iID0gbmV3IEJsb2IoW2UuZGF0YS5idWZmZXJdLCB7dHlwZTogJ2F1ZGlvL29nZyd9KTtcblxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZS5kYXRhLmJ1ZmZlci5idWZmZXIgPSBcIiArIGUuZGF0YS5idWZmZXIuYnVmZmVyKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImUuZGF0YS5idWZmZXIuYnl0ZUxlbmd0aCA9IFwiICsgZS5kYXRhLmJ1ZmZlci5ieXRlTGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInNhbXBsZVJhdGUgPSBcIiArIHRoaXMuX2F1ZGlvQ29udGV4dC5zYW1wbGVSYXRlKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInRvdGFsTnVtU2FtcGxlcyA9IFwiICsgdGhpcy5fdG90YWxOdW1TYW1wbGVzKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkR1cmF0aW9uIG9mIHJlY29yZGluZyA9IFwiICsgKHRoaXMuX3RvdGFsTnVtU2FtcGxlcyAvIHRoaXMuX2F1ZGlvQ29udGV4dC5zYW1wbGVSYXRlKSArIFwiIHNlY29uZHNcIik7XG5cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImdvdCBlbmNvZGVkIGJsb2I6IHNpemU9XCIgKyBlbmNvZGVkX2Jsb2Iuc2l6ZSArIFwiIHR5cGU9XCIgKyBlbmNvZGVkX2Jsb2IudHlwZSk7XG5cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fb25DYXB0dXJlQ29tcGxldGVDYWxsYmFjaylcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fb25DYXB0dXJlQ29tcGxldGVDYWxsYmFjayhlbmNvZGVkX2Jsb2IpO1xuXG4gICAgICAgICAgICAgICAgLy8gd29ya2VyIGhhcyBleGl0ZWQsIHVucmVmZXJlbmNlIGl0XG4gICAgICAgICAgICAgICAgdGhpcy5fZW5jb2RpbmdXb3JrZXIgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIGNvbmZpZ3VyZSB3b3JrZXIgd2l0aCBhIHNhbXBsaW5nIHJhdGUgYW5kIGJ1ZmZlci1zaXplXG4gICAgICAgIHRoaXMuX2VuY29kaW5nV29ya2VyLnBvc3RNZXNzYWdlKHtcbiAgICAgICAgICAgIGFjdGlvbjogXCJpbml0aWFsaXplXCIsXG4gICAgICAgICAgICBzYW1wbGVfcmF0ZTogdGhpcy5fYXVkaW9Db250ZXh0LnNhbXBsZVJhdGUsXG4gICAgICAgICAgICBidWZmZXJfc2l6ZTogdGhpcy5fYXVkaW9MaXN0ZW5lci5idWZmZXJTaXplXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFRPRE86IGl0IG1pZ2h0IGJlIGJldHRlciB0byBsaXN0ZW4gZm9yIGEgbWVzc2FnZSBiYWNrIGZyb20gdGhlIGJhY2tncm91bmQgd29ya2VyIGJlZm9yZSBjb25zaWRlcmluZyB0aGF0IHJlY29yZGluZyBoYXMgYmVnYW5cbiAgICAgICAgLy8gaXQncyBlYXNpZXIgdG8gdHJpbSBhdWRpbyB0aGFuIGNhcHR1cmUgYSBtaXNzaW5nIHdvcmQgYXQgdGhlIHN0YXJ0IG9mIGEgc2VudGVuY2VcbiAgICAgICAgdGhpcy5faXNSZWNvcmRpbmcgPSBmYWxzZTtcblxuICAgICAgICAvLyBjb25uZWN0IGF1ZGlvIG5vZGVzXG4gICAgICAgIC8vIGF1ZGlvLWlucHV0IC0+IGdhaW4gLT4gZmZ0LWFuYWx5emVyIC0+IFBDTS1kYXRhIGNhcHR1cmUgLT4gZGVzdGluYXRpb25cblxuICAgICAgICBjb25zb2xlLmxvZyhcIkF1ZGlvQ2FwdHVyZTo6c3RhcnRNYW51YWxFbmNvZGluZygpOyBDb25uZWN0aW5nIEF1ZGlvIE5vZGVzLi5cIik7XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJjb25uZWN0aW5nOiBpbnB1dC0+Z2FpblwiKTtcbiAgICAgICAgdGhpcy5fYXVkaW9JbnB1dC5jb25uZWN0KHRoaXMuX2F1ZGlvR2Fpbik7XG4gICAgICAgIC8vY29uc29sZS5sb2coXCJjb25uZWN0aW5nOiBnYWluLT5hbmFseXplclwiKTtcbiAgICAgICAgLy90aGlzLl9hdWRpb0dhaW4uY29ubmVjdCh0aGlzLl9hdWRpb0FuYWx5emVyKTtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcImNvbm5lY3Rpbmc6IGFuYWx5emVyLT5saXN0ZXNuZXJcIik7XG4gICAgICAgIC8vdGhpcy5fYXVkaW9BbmFseXplci5jb25uZWN0KHRoaXMuX2F1ZGlvTGlzdGVuZXIpO1xuICAgICAgICAvLyBjb25uZWN0IGdhaW4gZGlyZWN0bHkgaW50byBsaXN0ZW5lciwgYnlwYXNzaW5nIGFuYWx5emVyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiY29ubmVjdGluZzogZ2Fpbi0+bGlzdGVuZXJcIik7XG4gICAgICAgIHRoaXMuX2F1ZGlvR2Fpbi5jb25uZWN0KHRoaXMuX2F1ZGlvTGlzdGVuZXIpO1xuICAgICAgICBjb25zb2xlLmxvZyhcImNvbm5lY3Rpbmc6IGxpc3RlbmVyLT5kZXN0aW5hdGlvblwiKTtcbiAgICAgICAgdGhpcy5fYXVkaW9MaXN0ZW5lci5jb25uZWN0KHRoaXMuX2F1ZGlvRGVzdGluYXRpb24pO1xuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHNodXRkb3duTWFudWFsRW5jb2RpbmcoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiQXVkaW9DYXB0dXJlOjpzaHV0ZG93bk1hbnVhbEVuY29kaW5nKCk7IFRlYXJpbmcgZG93biBBdWRpb0FQSSBjb25uZWN0aW9ucy4uXCIpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiZGlzY29ubmVjdGluZzogbGlzdGVuZXItPmRlc3RpbmF0aW9uXCIpO1xuICAgICAgICB0aGlzLl9hdWRpb0xpc3RlbmVyLmRpc2Nvbm5lY3QodGhpcy5fYXVkaW9EZXN0aW5hdGlvbik7XG4gICAgICAgIC8vY29uc29sZS5sb2coXCJkaXNjb25uZWN0aW5nOiBhbmFseXplci0+bGlzdGVzbmVyXCIpO1xuICAgICAgICAvL3RoaXMuX2F1ZGlvQW5hbHl6ZXIuZGlzY29ubmVjdCh0aGlzLl9hdWRpb0xpc3RlbmVyKTtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcImRpc2Nvbm5lY3Rpbmc6IGdhaW4tPmFuYWx5emVyXCIpO1xuICAgICAgICAvL3RoaXMuX2F1ZGlvR2Fpbi5kaXNjb25uZWN0KHRoaXMuX2F1ZGlvQW5hbHl6ZXIpO1xuICAgICAgICBjb25zb2xlLmxvZyhcImRpc2Nvbm5lY3Rpbmc6IGdhaW4tPmxpc3RlbmVyXCIpO1xuICAgICAgICB0aGlzLl9hdWRpb0dhaW4uZGlzY29ubmVjdCh0aGlzLl9hdWRpb0xpc3RlbmVyKTtcbiAgICAgICAgY29uc29sZS5sb2coXCJkaXNjb25uZWN0aW5nOiBpbnB1dC0+Z2FpblwiKTtcbiAgICAgICAgdGhpcy5fYXVkaW9JbnB1dC5kaXNjb25uZWN0KHRoaXMuX2F1ZGlvR2Fpbik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVGhlIG1pY3JvcGhvbmUgbWF5IGJlIGxpdmUsIGJ1dCBpdCBpc24ndCByZWNvcmRpbmcuIFRoaXMgdG9nZ2xlcyB0aGUgYWN0dWFsIHdyaXRpbmcgdG8gdGhlIGNhcHR1cmUgc3RyZWFtLlxuICAgICAqIGNhcHR1cmVBdWRpb1NhbXBsZXMgYm9vbCBpbmRpY2F0ZXMgd2hldGhlciB0byByZWNvcmQgZnJvbSBtaWNcbiAgICAgKi9cbiAgICB0b2dnbGVNaWNyb3Bob25lUmVjb3JkaW5nKGNhcHR1cmVBdWRpb1NhbXBsZXMpIHtcbiAgICAgICAgdGhpcy5faXNSZWNvcmRpbmcgPSBjYXB0dXJlQXVkaW9TYW1wbGVzO1xuICAgIH1cblxuICAgIC8vIGNhbGxlZCB3aGVuIHVzZXIgYWxsb3dzIHVzIHVzZSBvZiB0aGVpciBtaWNyb3Bob25lXG4gICAgb25NaWNyb3Bob25lUHJvdmlkZWQobWVkaWFTdHJlYW0pIHtcblxuICAgICAgICB0aGlzLl9jYWNoZWRNZWRpYVN0cmVhbSA9IG1lZGlhU3RyZWFtO1xuXG4gICAgICAgIC8vIHdlIGNvdWxkIGNoZWNrIGlmIHRoZSBicm93c2VyIGNhbiBwZXJmb3JtIGl0cyBvd24gZW5jb2RpbmcgYW5kIHVzZSB0aGF0XG4gICAgICAgIC8vIEZpcmVmb3ggY2FuIHByb3ZpZGUgdXMgb2dnK3NwZWV4IG9yIG9nZytvcHVzPyBmaWxlcywgYnV0IHVuZm9ydHVuYXRlbHkgdGhhdCBjb2RlYyBpc24ndCBzdXBwb3J0ZWQgd2lkZWx5IGVub3VnaFxuICAgICAgICAvLyBzbyBpbnN0ZWFkIHdlIHBlcmZvcm0gbWFudWFsIGVuY29kaW5nIGV2ZXJ5d2hlcmUgcmlnaHQgbm93IHRvIGdldCB1cyBvZ2crdm9yYmlzXG4gICAgICAgIC8vIHRob3VnaCBvbmUgZGF5LCBpIHdhbnQgb2dnK29wdXMhIG9wdXMgaGFzIGEgd29uZGVyZnVsIHJhbmdlIG9mIHF1YWxpdHkgc2V0dGluZ3MgcGVyZmVjdCBmb3IgdGhpcyBwcm9qZWN0XG5cbiAgICAgICAgaWYgKGZhbHNlICYmIHR5cGVvZihNZWRpYVJlY29yZGVyKSAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgdGhpcy5zdGFydEF1dG9tYXRpY0VuY29kaW5nKG1lZGlhU3RyZWFtKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIG5vIG1lZGlhIHJlY29yZGVyIGF2YWlsYWJsZSwgZG8gaXQgbWFudWFsbHlcbiAgICAgICAgICAgIHRoaXMuc3RhcnRNYW51YWxFbmNvZGluZyhtZWRpYVN0cmVhbSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUT0RPOiBtaWdodCBiZSBhIGdvb2QgdGltZSB0byBzdGFydCBhIHNwZWN0cmFsIGFuYWx5emVyXG4gICAgICAgIGlmICh0aGlzLl9vblN0YXJ0ZWRDYWxsYmFjaylcbiAgICAgICAgICAgIHRoaXMuX29uU3RhcnRlZENhbGxiYWNrKCk7XG4gICAgfVxuXG4gICAgc2V0R2FpbihnYWluKSB7XG4gICAgICAgIGlmICh0aGlzLl9hdWRpb0dhaW4pXG4gICAgICAgICAgICB0aGlzLl9hdWRpb0dhaW4uZ2Fpbi52YWx1ZSA9IGdhaW47XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJzZXR0aW5nIGdhaW46IFwiICsgZ2Fpbik7XG4gICAgICAgIHRoaXMuX2NhY2hlZEdhaW5WYWx1ZSA9IGdhaW47XG4gICAgfVxuXG4gICAgcHJlbG9hZE1lZGlhU3RyZWFtKCkge1xuICAgICAgICBpZiAodGhpcy5fY2FjaGVkTWVkaWFTdHJlYW0pXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcyA9IG5hdmlnYXRvci5tZWRpYURldmljZXMgfHwgKChuYXZpZ2F0b3IubW96R2V0VXNlck1lZGlhIHx8IG5hdmlnYXRvci53ZWJraXRHZXRVc2VyTWVkaWEpID8ge1xuICAgICAgICAgICAgICAgIGdldFVzZXJNZWRpYTogZnVuY3Rpb24gKGMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uICh5LCBuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAobmF2aWdhdG9yLm1vekdldFVzZXJNZWRpYSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgbmF2aWdhdG9yLndlYmtpdEdldFVzZXJNZWRpYSkuY2FsbChuYXZpZ2F0b3IsIGMsIHksIG4pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IDogbnVsbCk7XG5cbiAgICAgICAgaWYgKCFuYXZpZ2F0b3IubWVkaWFEZXZpY2VzKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oXCJzdGFydCgpOyBnZXRVc2VyTWVkaWEoKSBub3Qgc3VwcG9ydGVkLlwiKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIG5hdmlnYXRvci5tZWRpYURldmljZXNcbiAgICAgICAgICAgIC5nZXRVc2VyTWVkaWEoe2F1ZGlvOiB0cnVlfSlcbiAgICAgICAgICAgIC50aGVuKChtcykgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuX2NhY2hlZE1lZGlhU3RyZWFtID0gbXM7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkF1ZGlvQ2FwdHVyZTo6c3RhcnQoKTsgY291bGQgbm90IGdyYWIgbWljcm9waG9uZS4gcGVyaGFwcyB1c2VyIGRpZG4ndCBnaXZlIHVzIHBlcm1pc3Npb24/XCIpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihlcnIpO1xuICAgICAgICAgICAgfSlcbiAgICB9O1xuXG4gICAgc3RhcnQob25TdGFydGVkQ2FsbGJhY2spIHtcblxuICAgICAgICB0aGlzLl9vblN0YXJ0ZWRDYWxsYmFjayA9IG9uU3RhcnRlZENhbGxiYWNrO1xuXG4gICAgICAgIGlmICh0aGlzLl9jYWNoZWRNZWRpYVN0cmVhbSlcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm9uTWljcm9waG9uZVByb3ZpZGVkKHRoaXMuX2NhY2hlZE1lZGlhU3RyZWFtKTtcblxuICAgICAgICBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzID0gbmF2aWdhdG9yLm1lZGlhRGV2aWNlcyB8fCAoKG5hdmlnYXRvci5tb3pHZXRVc2VyTWVkaWEgfHwgbmF2aWdhdG9yLndlYmtpdEdldFVzZXJNZWRpYSkgPyB7XG4gICAgICAgICAgICAgICAgZ2V0VXNlck1lZGlhOiBmdW5jdGlvbiAoYykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHksIG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIChuYXZpZ2F0b3IubW96R2V0VXNlck1lZGlhIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICBuYXZpZ2F0b3Iud2Via2l0R2V0VXNlck1lZGlhKS5jYWxsKG5hdmlnYXRvciwgYywgeSwgbik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gOiBudWxsKTtcblxuICAgICAgICBpZiAoIW5hdmlnYXRvci5tZWRpYURldmljZXMpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihcInN0YXJ0KCk7IGdldFVzZXJNZWRpYSgpIG5vdCBzdXBwb3J0ZWQuXCIpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgbmF2aWdhdG9yLm1lZGlhRGV2aWNlc1xuICAgICAgICAgICAgLmdldFVzZXJNZWRpYSh7YXVkaW86IHRydWV9KVxuICAgICAgICAgICAgLnRoZW4oKG1zKSA9PiB0aGlzLm9uTWljcm9waG9uZVByb3ZpZGVkKG1zKSlcbiAgICAgICAgICAgIC5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJBdWRpb0NhcHR1cmU6OnN0YXJ0KCk7IGNvdWxkIG5vdCBncmFiIG1pY3JvcGhvbmUuIHBlcmhhcHMgdXNlciBkaWRuJ3QgZ2l2ZSB1cyBwZXJtaXNzaW9uP1wiKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oZXJyKTtcbiAgICAgICAgICAgIH0pXG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgc3RvcChjYXB0dXJlQ29tcGxldGVDYWxsYmFjaykge1xuICAgICAgICB0aGlzLl9vbkNhcHR1cmVDb21wbGV0ZUNhbGxiYWNrID0gY2FwdHVyZUNvbXBsZXRlQ2FsbGJhY2s7XG4gICAgICAgIHRoaXMuX2lzUmVjb3JkaW5nID0gZmFsc2U7XG5cbiAgICAgICAgaWYgKHRoaXMuX2F1ZGlvQ29udGV4dCkge1xuICAgICAgICAgICAgLy8gc3RvcCB0aGUgbWFudWFsIGVuY29kZXJcbiAgICAgICAgICAgIHRoaXMuX2VuY29kaW5nV29ya2VyLnBvc3RNZXNzYWdlKHthY3Rpb246IFwiZmluaXNoXCJ9KTtcbiAgICAgICAgICAgIHRoaXMuc2h1dGRvd25NYW51YWxFbmNvZGluZygpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX2F1ZGlvRW5jb2Rlcikge1xuICAgICAgICAgICAgLy8gc3RvcCB0aGUgYXV0b21hdGljIGVuY29kZXJcblxuICAgICAgICAgICAgaWYgKHRoaXMuX2F1ZGlvRW5jb2Rlci5zdGF0ZSAhPT0gJ3JlY29yZGluZycpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJBdWRpb0NhcHR1cmU6OnN0b3AoKTsgX2F1ZGlvRW5jb2Rlci5zdGF0ZSAhPSAncmVjb3JkaW5nJ1wiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5fYXVkaW9FbmNvZGVyLnJlcXVlc3REYXRhKCk7XG4gICAgICAgICAgICB0aGlzLl9hdWRpb0VuY29kZXIuc3RvcCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVE9ETzogc3RvcCBhbnkgYWN0aXZlIHNwZWN0cmFsIGFuYWx5c2lzXG4gICAgfTtcbn1cblxuLy8gdW51c2VkIGF0IHRoZSBtb21lbnRcbmZ1bmN0aW9uIEFuYWx5emVyKCkge1xuXG4gICAgdmFyIF9hdWRpb0NhbnZhc0FuaW1hdGlvbklkLFxuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhc1xuICAgICAgICA7XG5cbiAgICB0aGlzLnN0YXJ0QW5hbHl6ZXJVcGRhdGVzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB1cGRhdGVBbmFseXplcigpO1xuICAgIH07XG5cbiAgICB0aGlzLnN0b3BBbmFseXplclVwZGF0ZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghX2F1ZGlvQ2FudmFzQW5pbWF0aW9uSWQpXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lKF9hdWRpb0NhbnZhc0FuaW1hdGlvbklkKTtcbiAgICAgICAgX2F1ZGlvQ2FudmFzQW5pbWF0aW9uSWQgPSBudWxsO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiB1cGRhdGVBbmFseXplcigpIHtcblxuICAgICAgICBpZiAoIV9hdWRpb1NwZWN0cnVtQ2FudmFzKVxuICAgICAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInJlY29yZGluZy12aXN1YWxpemVyXCIpLmdldENvbnRleHQoXCIyZFwiKTtcblxuICAgICAgICB2YXIgZnJlcURhdGEgPSBuZXcgVWludDhBcnJheShfYXVkaW9BbmFseXplci5mcmVxdWVuY3lCaW5Db3VudCk7XG4gICAgICAgIF9hdWRpb0FuYWx5emVyLmdldEJ5dGVGcmVxdWVuY3lEYXRhKGZyZXFEYXRhKTtcblxuICAgICAgICB2YXIgbnVtQmFycyA9IF9hdWRpb0FuYWx5emVyLmZyZXF1ZW5jeUJpbkNvdW50O1xuICAgICAgICB2YXIgYmFyV2lkdGggPSBNYXRoLmZsb29yKF9jYW52YXNXaWR0aCAvIG51bUJhcnMpIC0gX2ZmdEJhclNwYWNpbmc7XG5cblxuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb24gPSBcInNvdXJjZS1vdmVyXCI7XG5cbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuY2xlYXJSZWN0KDAsIDAsIF9jYW52YXNXaWR0aCwgX2NhbnZhc0hlaWdodCk7XG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmZpbGxTdHlsZSA9ICcjZjZkNTY1JztcbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMubGluZUNhcCA9ICdyb3VuZCc7XG5cbiAgICAgICAgdmFyIHgsIHksIHcsIGg7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBudW1CYXJzOyBpKyspIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IGZyZXFEYXRhW2ldO1xuICAgICAgICAgICAgdmFyIHNjYWxlZF92YWx1ZSA9ICh2YWx1ZSAvIDI1NikgKiBfY2FudmFzSGVpZ2h0O1xuXG4gICAgICAgICAgICB4ID0gaSAqIChiYXJXaWR0aCArIF9mZnRCYXJTcGFjaW5nKTtcbiAgICAgICAgICAgIHkgPSBfY2FudmFzSGVpZ2h0IC0gc2NhbGVkX3ZhbHVlO1xuICAgICAgICAgICAgdyA9IGJhcldpZHRoO1xuICAgICAgICAgICAgaCA9IHNjYWxlZF92YWx1ZTtcblxuICAgICAgICAgICAgdmFyIGdyYWRpZW50ID0gX2F1ZGlvU3BlY3RydW1DYW52YXMuY3JlYXRlTGluZWFyR3JhZGllbnQoeCwgX2NhbnZhc0hlaWdodCwgeCwgeSk7XG4gICAgICAgICAgICBncmFkaWVudC5hZGRDb2xvclN0b3AoMS4wLCBcInJnYmEoMCwwLDAsMS4wKVwiKTtcbiAgICAgICAgICAgIGdyYWRpZW50LmFkZENvbG9yU3RvcCgwLjAsIFwicmdiYSgwLDAsMCwxLjApXCIpO1xuXG4gICAgICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5maWxsU3R5bGUgPSBncmFkaWVudDtcbiAgICAgICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmZpbGxSZWN0KHgsIHksIHcsIGgpO1xuXG4gICAgICAgICAgICBpZiAoc2NhbGVkX3ZhbHVlID4gX2hpdEhlaWdodHNbaV0pIHtcbiAgICAgICAgICAgICAgICBfaGl0VmVsb2NpdGllc1tpXSArPSAoc2NhbGVkX3ZhbHVlIC0gX2hpdEhlaWdodHNbaV0pICogNjtcbiAgICAgICAgICAgICAgICBfaGl0SGVpZ2h0c1tpXSA9IHNjYWxlZF92YWx1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgX2hpdFZlbG9jaXRpZXNbaV0gLT0gNDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgX2hpdEhlaWdodHNbaV0gKz0gX2hpdFZlbG9jaXRpZXNbaV0gKiAwLjAxNjtcblxuICAgICAgICAgICAgaWYgKF9oaXRIZWlnaHRzW2ldIDwgMClcbiAgICAgICAgICAgICAgICBfaGl0SGVpZ2h0c1tpXSA9IDA7XG4gICAgICAgIH1cblxuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb24gPSBcInNvdXJjZS1hdG9wXCI7XG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmRyYXdJbWFnZShfY2FudmFzQmcsIDAsIDApO1xuXG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbiA9IFwic291cmNlLW92ZXJcIjtcbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZmlsbFN0eWxlID0gXCJyZ2JhKDI1NSwyNTUsMjU1LDAuNylcIjtcblxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbnVtQmFyczsgaSsrKSB7XG4gICAgICAgICAgICB4ID0gaSAqIChiYXJXaWR0aCArIF9mZnRCYXJTcGFjaW5nKTtcbiAgICAgICAgICAgIHkgPSBfY2FudmFzSGVpZ2h0IC0gTWF0aC5yb3VuZChfaGl0SGVpZ2h0c1tpXSkgLSAyO1xuICAgICAgICAgICAgdyA9IGJhcldpZHRoO1xuICAgICAgICAgICAgaCA9IGJhcldpZHRoO1xuXG4gICAgICAgICAgICBpZiAoX2hpdEhlaWdodHNbaV0gPT09IDApXG4gICAgICAgICAgICAgICAgY29udGludWU7XG5cbiAgICAgICAgICAgIC8vX2F1ZGlvU3BlY3RydW1DYW52YXMuZmlsbFN0eWxlID0gXCJyZ2JhKDI1NSwgMjU1LCAyNTUsXCIrIE1hdGgubWF4KDAsIDEgLSBNYXRoLmFicyhfaGl0VmVsb2NpdGllc1tpXS8xNTApKSArIFwiKVwiO1xuICAgICAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZmlsbFJlY3QoeCwgeSwgdywgaCk7XG4gICAgICAgIH1cblxuICAgICAgICBfYXVkaW9DYW52YXNBbmltYXRpb25JZCA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUodXBkYXRlQW5hbHl6ZXIpO1xuICAgIH1cblxuICAgIHZhciBfY2FudmFzV2lkdGgsIF9jYW52YXNIZWlnaHQ7XG4gICAgdmFyIF9mZnRTaXplID0gMjU2O1xuICAgIHZhciBfZmZ0U21vb3RoaW5nID0gMC44O1xuICAgIHZhciBfZmZ0QmFyU3BhY2luZyA9IDE7XG5cbiAgICB2YXIgX2hpdEhlaWdodHMgPSBbXTtcbiAgICB2YXIgX2hpdFZlbG9jaXRpZXMgPSBbXTtcblxuICAgIHRoaXMudGVzdENhbnZhcyA9IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICB2YXIgY2FudmFzQ29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyZWNvcmRpbmctdmlzdWFsaXplclwiKTtcblxuICAgICAgICBfY2FudmFzV2lkdGggPSBjYW52YXNDb250YWluZXIud2lkdGg7XG4gICAgICAgIF9jYW52YXNIZWlnaHQgPSBjYW52YXNDb250YWluZXIuaGVpZ2h0O1xuXG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzID0gY2FudmFzQ29udGFpbmVyLmdldENvbnRleHQoXCIyZFwiKTtcbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uID0gXCJzb3VyY2Utb3ZlclwiO1xuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5maWxsU3R5bGUgPSBcInJnYmEoMCwwLDAsMClcIjtcbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZmlsbFJlY3QoMCwgMCwgX2NhbnZhc1dpZHRoLCBfY2FudmFzSGVpZ2h0KTtcblxuICAgICAgICB2YXIgbnVtQmFycyA9IF9mZnRTaXplIC8gMjtcbiAgICAgICAgdmFyIGJhclNwYWNpbmcgPSBfZmZ0QmFyU3BhY2luZztcbiAgICAgICAgdmFyIGJhcldpZHRoID0gTWF0aC5mbG9vcihfY2FudmFzV2lkdGggLyBudW1CYXJzKSAtIGJhclNwYWNpbmc7XG5cbiAgICAgICAgdmFyIHgsIHksIHcsIGgsIGk7XG5cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IG51bUJhcnM7IGkrKykge1xuICAgICAgICAgICAgX2hpdEhlaWdodHNbaV0gPSBfY2FudmFzSGVpZ2h0IC0gMTtcbiAgICAgICAgICAgIF9oaXRWZWxvY2l0aWVzW2ldID0gMDtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBudW1CYXJzOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBzY2FsZWRfdmFsdWUgPSBNYXRoLmFicyhNYXRoLnNpbihNYXRoLlBJICogNiAqIChpIC8gbnVtQmFycykpKSAqIF9jYW52YXNIZWlnaHQ7XG5cbiAgICAgICAgICAgIHggPSBpICogKGJhcldpZHRoICsgYmFyU3BhY2luZyk7XG4gICAgICAgICAgICB5ID0gX2NhbnZhc0hlaWdodCAtIHNjYWxlZF92YWx1ZTtcbiAgICAgICAgICAgIHcgPSBiYXJXaWR0aDtcbiAgICAgICAgICAgIGggPSBzY2FsZWRfdmFsdWU7XG5cbiAgICAgICAgICAgIHZhciBncmFkaWVudCA9IF9hdWRpb1NwZWN0cnVtQ2FudmFzLmNyZWF0ZUxpbmVhckdyYWRpZW50KHgsIF9jYW52YXNIZWlnaHQsIHgsIHkpO1xuICAgICAgICAgICAgZ3JhZGllbnQuYWRkQ29sb3JTdG9wKDEuMCwgXCJyZ2JhKDAsMCwwLDAuMClcIik7XG4gICAgICAgICAgICBncmFkaWVudC5hZGRDb2xvclN0b3AoMC4wLCBcInJnYmEoMCwwLDAsMS4wKVwiKTtcblxuICAgICAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZmlsbFN0eWxlID0gZ3JhZGllbnQ7XG4gICAgICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5maWxsUmVjdCh4LCB5LCB3LCBoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbiA9IFwic291cmNlLWF0b3BcIjtcbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZHJhd0ltYWdlKF9jYW52YXNCZywgMCwgMCk7XG5cbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uID0gXCJzb3VyY2Utb3ZlclwiO1xuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5maWxsU3R5bGUgPSBcIiNmZmZmZmZcIjtcblxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbnVtQmFyczsgaSsrKSB7XG4gICAgICAgICAgICB4ID0gaSAqIChiYXJXaWR0aCArIGJhclNwYWNpbmcpO1xuICAgICAgICAgICAgeSA9IF9jYW52YXNIZWlnaHQgLSBfaGl0SGVpZ2h0c1tpXTtcbiAgICAgICAgICAgIHcgPSBiYXJXaWR0aDtcbiAgICAgICAgICAgIGggPSAyO1xuXG4gICAgICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5maWxsUmVjdCh4LCB5LCB3LCBoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgX3Njb3BlID0gdGhpcztcblxuICAgIHZhciBfY2FudmFzQmcgPSBuZXcgSW1hZ2UoKTtcbiAgICBfY2FudmFzQmcub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBfc2NvcGUudGVzdENhbnZhcygpO1xuICAgIH07XG4gICAgLy9fY2FudmFzQmcuc3JjID0gXCIvaW1nL2JnNXMuanBnXCI7XG4gICAgX2NhbnZhc0JnLnNyYyA9IFwiL2ltZy9iZzYtd2lkZS5qcGdcIjtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGNsYXNzIFNvdW5kUGxheWVyIHtcbiAgICBzdGF0aWMgY3JlYXRlIChtb2RlbCkge1xuICAgICAgICB2YXIgcmVzdW1lUG9zaXRpb24gPSBwYXJzZUludChtb2RlbC5nZXQoJ3Bvc2l0aW9uJykgfHwgMCk7XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJDcmVhdGluZyBzb3VuZCBwbGF5ZXIgZm9yIG1vZGVsOlwiLCBtb2RlbCk7XG5cbiAgICAgICAgcmV0dXJuIHNvdW5kTWFuYWdlci5jcmVhdGVTb3VuZCh7XG4gICAgICAgICAgICBpZDogbW9kZWwuaWQsXG4gICAgICAgICAgICB1cmw6IG1vZGVsLnVybCxcbiAgICAgICAgICAgIHZvbHVtZTogMTAwLFxuICAgICAgICAgICAgYXV0b0xvYWQ6IHRydWUsXG4gICAgICAgICAgICBhdXRvUGxheTogZmFsc2UsXG4gICAgICAgICAgICBmcm9tOiByZXN1bWVQb3NpdGlvbixcbiAgICAgICAgICAgIHdoaWxlbG9hZGluZzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibG9hZGVkOiBcIiArIHRoaXMuYnl0ZXNMb2FkZWQgKyBcIiBvZiBcIiArIHRoaXMuYnl0ZXNUb3RhbCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25sb2FkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1NvdW5kOyBhdWRpbyBsb2FkZWQ7IHBvc2l0aW9uID0gJyArIHJlc3VtZVBvc2l0aW9uICsgJywgZHVyYXRpb24gPSAnICsgdGhpcy5kdXJhdGlvbik7XG5cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5kdXJhdGlvbiA9PSBudWxsIHx8IHRoaXMuZHVyYXRpb24gPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImR1cmF0aW9uIGlzIG51bGxcIik7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoKHJlc3VtZVBvc2l0aW9uICsgMTApID4gdGhpcy5kdXJhdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAvLyB0aGUgdHJhY2sgaXMgcHJldHR5IG11Y2ggY29tcGxldGUsIGxvb3AgaXRcbiAgICAgICAgICAgICAgICAgICAgLy8gRklYTUU6IHRoaXMgc2hvdWxkIGFjdHVhbGx5IGhhcHBlbiBlYXJsaWVyLCB3ZSBzaG91bGQga25vdyB0aGF0IHRoZSBhY3Rpb24gd2lsbCBjYXVzZSBhIHJld2luZFxuICAgICAgICAgICAgICAgICAgICAvLyAgICAgICAgYW5kIGluZGljYXRlIHRoZSByZXdpbmQgdmlzdWFsbHkgc28gdGhlcmUgaXMgbm8gc3VycHJpc2VcbiAgICAgICAgICAgICAgICAgICAgcmVzdW1lUG9zaXRpb24gPSAwO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnU291bmQ7IHRyYWNrIG5lZWRlZCBhIHJld2luZCcpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEZJWE1FOiByZXN1bWUgY29tcGF0aWJpbGl0eSB3aXRoIHZhcmlvdXMgYnJvd3NlcnNcbiAgICAgICAgICAgICAgICAvLyBGSVhNRTogc29tZXRpbWVzIHlvdSByZXN1bWUgYSBmaWxlIGFsbCB0aGUgd2F5IGF0IHRoZSBlbmQsIHNob3VsZCBsb29wIHRoZW0gYXJvdW5kXG4gICAgICAgICAgICAgICAgdGhpcy5zZXRQb3NpdGlvbihyZXN1bWVQb3NpdGlvbik7XG4gICAgICAgICAgICAgICAgdGhpcy5wbGF5KCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgd2hpbGVwbGF5aW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIHByb2dyZXNzID0gKHRoaXMuZHVyYXRpb24gPiAwID8gMTAwICogdGhpcy5wb3NpdGlvbiAvIHRoaXMuZHVyYXRpb24gOiAwKS50b0ZpeGVkKDApICsgJyUnO1xuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwicXVpcDpcIiArIHRoaXMuaWQgKyBcIjpwcm9ncmVzc1wiLCBwcm9ncmVzcyk7XG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJxdWlwOlwiICsgdGhpcy5pZCArIFwiOnBvc2l0aW9uXCIsIHRoaXMucG9zaXRpb24udG9GaXhlZCgwKSk7XG4gICAgICAgICAgICAgICAgbW9kZWwuc2V0KHsncHJvZ3Jlc3MnOiBwcm9ncmVzc30pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9ucGF1c2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlNvdW5kOyBwYXVzZWQ6IFwiICsgdGhpcy5pZCk7XG4gICAgICAgICAgICAgICAgdmFyIHBvc2l0aW9uID0gdGhpcy5wb3NpdGlvbiA/IHRoaXMucG9zaXRpb24udG9GaXhlZCgwKSA6IDA7XG4gICAgICAgICAgICAgICAgdmFyIHByb2dyZXNzID0gKHRoaXMuZHVyYXRpb24gPiAwID8gMTAwICogcG9zaXRpb24gLyB0aGlzLmR1cmF0aW9uIDogMCkudG9GaXhlZCgwKSArICclJztcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcInF1aXA6XCIgKyB0aGlzLmlkICsgXCI6cHJvZ3Jlc3NcIiwgcHJvZ3Jlc3MpO1xuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwicXVpcDpcIiArIHRoaXMuaWQgKyBcIjpwb3NpdGlvblwiLCBwb3NpdGlvbik7XG4gICAgICAgICAgICAgICAgbW9kZWwuc2V0KHsncHJvZ3Jlc3MnOiBwcm9ncmVzc30pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uZmluaXNoOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJTb3VuZDsgZmluaXNoZWQgcGxheWluZzogXCIgKyB0aGlzLmlkKTtcblxuICAgICAgICAgICAgICAgIC8vIHN0b3JlIGNvbXBsZXRpb24gaW4gYnJvd3NlclxuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwicXVpcDpcIiArIHRoaXMuaWQgKyBcIjpwcm9ncmVzc1wiLCAnMTAwJScpO1xuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwicXVpcDpcIiArIHRoaXMuaWQgKyBcIjpwb3NpdGlvblwiLCB0aGlzLmR1cmF0aW9uLnRvRml4ZWQoMCkpO1xuICAgICAgICAgICAgICAgIG1vZGVsLnNldCh7J3Byb2dyZXNzJzogJzEwMCUnfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBUT0RPOiB1bmxvY2sgc29tZSBzb3J0IG9mIGFjaGlldmVtZW50IGZvciBmaW5pc2hpbmcgdGhpcyB0cmFjaywgbWFyayBpdCBhIGRpZmYgY29sb3IsIGV0Y1xuICAgICAgICAgICAgICAgIC8vIFRPRE86IHRoaXMgaXMgYSBnb29kIHBsYWNlIHRvIGZpcmUgYSBob29rIHRvIGEgcGxheWJhY2sgbWFuYWdlciB0byBtb3ZlIG9udG8gdGhlIG5leHQgYXVkaW8gY2xpcFxuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgIH1cbn1cbiIsImltcG9ydCBCYWNrYm9uZSBmcm9tICdiYWNrYm9uZSdcbmltcG9ydCB7IFF1aXBNb2RlbCwgUXVpcFZpZXcsIFF1aXBzLCBBdWRpb1BsYXllclZpZXcgfSBmcm9tICcuL3F1aXAtY29udHJvbC5qcydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUmVjb3JkaW5nc0xpc3QgZXh0ZW5kcyBCYWNrYm9uZS5WaWV3IHtcbiAgICBpbml0aWFsaXplKCkge1xuXG4gICAgICAgIHZhciBhdWRpb1BsYXllciA9IG5ldyBBdWRpb1BsYXllclZpZXcoKTtcblxuICAgICAgICBzb3VuZE1hbmFnZXIuc2V0dXAoe1xuICAgICAgICAgICAgZGVidWdNb2RlOiB0cnVlLFxuICAgICAgICAgICAgdXJsOiAnL2Fzc2V0cy9zd2YvJyxcbiAgICAgICAgICAgIHByZWZlckZsYXNoOiBmYWxzZSxcbiAgICAgICAgICAgIG9ucmVhZHk6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInNvdW5kTWFuYWdlciByZWFkeVwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgJCgnLnF1aXAnKS5lYWNoKGVsZW0gPT4ge1xuICAgICAgICAgICAgdmFyIHZpZXcgPSBuZXcgUXVpcFZpZXcoe1xuICAgICAgICAgICAgICAgIGVsOiBlbGVtLFxuICAgICAgICAgICAgICAgIG1vZGVsOiBuZXcgUXVpcE1vZGVsKHtwcm9ncmVzczogMH0pXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgUXVpcHMuYWRkKHZpZXcubW9kZWwpO1xuICAgICAgICAgICAgdmlldy5yZW5kZXIoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gcHJvY2VzcyBhbGwgdGltZXN0YW1wc1xuICAgICAgICB2YXIgdmFndWVUaW1lID0gcmVxdWlyZSgndmFndWUtdGltZScpO1xuICAgICAgICB2YXIgbm93ID0gbmV3IERhdGUoKTtcblxuICAgICAgICAkKFwidGltZVtkYXRldGltZV1cIikuZWFjaChmdW5jdGlvbiBnZW5lcmF0ZVZhZ3VlRGF0ZShlbGUpIHtcbiAgICAgICAgICAgIGVsZS50ZXh0Q29udGVudCA9IHZhZ3VlVGltZS5nZXQoe2Zyb206IG5vdywgdG86IG5ldyBEYXRlKGVsZS5nZXRBdHRyaWJ1dGUoJ2RhdGV0aW1lJykpfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMubGlzdGVuVG8oUXVpcHMsICdhZGQnLCB0aGlzLnF1aXBBZGRlZCk7XG4gICAgfVxuXG4gICAgcXVpcEFkZGVkKHF1aXApIHtcbiAgICB9XG59XG5cbiIsImltcG9ydCBCYWNrYm9uZSBmcm9tICdiYWNrYm9uZSdcbmltcG9ydCBTb3VuZFBsYXllciBmcm9tICcuL2F1ZGlvLXBsYXllci5qcydcblxuLyoqXG4gKiBRdWlwXG4gKiBQbGF5cyBhdWRpbyBhbmQgdHJhY2tzIHBvc2l0aW9uXG4gKi9cblxuY2xhc3MgUXVpcE1vZGVsIGV4dGVuZHMgQmFja2JvbmUuTW9kZWwge1xuICAgIGRlZmF1bHRzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaWQ6IDAsIC8vIGd1aWRcbiAgICAgICAgICAgIHByb2dyZXNzOiAwLCAvLyBbMC0xMDBdIHBlcmNlbnRhZ2VcbiAgICAgICAgICAgIHBvc2l0aW9uOiAwLCAvLyBtc2VjXG4gICAgICAgICAgICBkdXJhdGlvbjogMCwgLy8gbXNlY1xuICAgICAgICAgICAgaXNQdWJsaWM6IGZhbHNlXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICB9XG5cbiAgICBzYXZlKGF0dHJpYnV0ZXMpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJRdWlwIE1vZGVsIHNhdmluZyB0byBsb2NhbFN0b3JhZ2VcIik7XG4gICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKHRoaXMuaWQsIEpTT04uc3RyaW5naWZ5KHRoaXMudG9KU09OKCkpKTtcbiAgICB9XG5cbiAgICBmZXRjaCgpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJRdWlwIE1vZGVsIGxvYWRpbmcgZnJvbSBsb2NhbFN0b3JhZ2VcIik7XG4gICAgICAgIHRoaXMuc2V0KEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmdldEl0ZW0odGhpcy5pZCkpKTtcbiAgICB9XG5cbiAgICB1cGRhdGVQcm9ncmVzcygpIHtcbiAgICAgICAgdGhpcy5zZXQoe1xuICAgICAgICAgICAgcHJvZ3Jlc3M6IChkdXJhdGlvbiA+IDAgPyBwb3NpdGlvbiAvIGR1cmF0aW9uIDogMCkudG9GaXhlZCgwKSArIFwiJVwiXG4gICAgICAgIH0pO1xuICAgIH1cbn1cblxuY2xhc3MgQXVkaW9QbGF5ZXJFdmVudHMgZXh0ZW5kcyBCYWNrYm9uZS5Nb2RlbCB7XG4gICAgZ2V0UGF1c2VVcmwoaWQpIHtcbiAgICAgICAgdmFyIHVybCA9IFwiL1wiICsgaWQgKyBcIi9wYXVzZWRcIjtcbiAgICAgICAgY29uc29sZS5sb2coXCJwYXVzZSB1cmxcIiArIHVybCk7XG4gICAgICAgIHJldHVybiB1cmw7XG4gICAgfVxuXG4gICAgb25QYXVzZShpZCwgY2FsbGJhY2spIHtcbiAgICAgICAgdGhpcy5vbih0aGlzLmdldFBhdXNlVXJsKGlkKSwgY2FsbGJhY2spO1xuICAgIH1cblxuICAgIHRyaWdnZXJQYXVzZShpZCkge1xuICAgICAgICB0aGlzLnRyaWdnZXIodGhpcy5nZXRQYXVzZVVybChpZCkpO1xuICAgIH1cbn1cblxudmFyIEF1ZGlvUGxheWVyID0gbmV3IEF1ZGlvUGxheWVyRXZlbnRzKCk7XG5cbi8vY2xhc3MgQXVkaW9QbGF5ZXJFdmVudHMgZXh0ZW5kcyBCYWNrYm9uZS5FdmVudHMge1xuLy9cbi8vfVxuXG5jbGFzcyBBdWRpb1BsYXllclZpZXcgZXh0ZW5kcyBCYWNrYm9uZS5WaWV3IHtcbiAgICBkZWZhdWx0cygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGF1ZGlvUGxheWVyOiBudWxsLFxuICAgICAgICAgICAgcXVpcE1vZGVsOiBudWxsXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIkF1ZGlvUGxheWVyVmlldyBpbml0aWFsaXplZFwiKTtcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiYXVkaW8tcGxheWVyXCIpO1xuICAgICAgICBBdWRpb1BsYXllci5vbihcInRvZ2dsZVwiLCAocXVpcCkgPT4gdGhpcy5vblRvZ2dsZShxdWlwKSk7XG4gICAgfVxuXG4gICAgY2xvc2UoKSB7XG4gICAgICAgIHRoaXMuc3RvcFBlcmlvZGljVGltZXIoKTtcbiAgICB9XG5cbiAgICBzdGFydFBlcmlvZGljVGltZXIoKSB7XG4gICAgICAgIGlmKHRoaXMucGVyaW9kaWNUaW1lciA9PSBudWxsKSB7XG4gICAgICAgICAgICB0aGlzLnBlcmlvZGljVGltZXIgPSBzZXRJbnRlcnZhbCgoKSA9PiB0aGlzLmNoZWNrUHJvZ3Jlc3MoKSwgMTAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHN0b3BQZXJpb2RpY1RpbWVyKCkge1xuICAgICAgICBpZih0aGlzLnBlcmlvZGljVGltZXIgIT0gbnVsbCkge1xuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLnBlcmlvZGljVGltZXIpO1xuICAgICAgICAgICAgdGhpcy5wZXJpb2RpY1RpbWVyID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNoZWNrUHJvZ3Jlc3MoKSB7XG4gICAgICAgIGlmKHRoaXMucXVpcE1vZGVsID09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBwcm9ncmVzc1VwZGF0ZSA9IHtcbiAgICAgICAgICAgIGN1cnJlbnRUaW1lOiB0aGlzLmF1ZGlvUGxheWVyLmN1cnJlbnRUaW1lLFxuICAgICAgICAgICAgZHVyYXRpb246IHRoaXMuYXVkaW9QbGF5ZXIuZHVyYXRpb24sXG4gICAgICAgICAgICBwcm9ncmVzczogMTAwICogdGhpcy5hdWRpb1BsYXllci5jdXJyZW50VGltZSAvIHRoaXMuYXVkaW9QbGF5ZXIuZHVyYXRpb25cbiAgICAgICAgfVxuXG4gICAgICAgIEF1ZGlvUGxheWVyLnRyaWdnZXIoXCIvXCIgKyB0aGlzLnF1aXBNb2RlbC5pZCArIFwiL3Byb2dyZXNzXCIsIHByb2dyZXNzVXBkYXRlKTtcbiAgICB9XG5cbiAgICBvblRvZ2dsZShxdWlwTW9kZWwpIHtcbiAgICAgICAgdGhpcy5xdWlwTW9kZWwgPSBxdWlwTW9kZWw7XG5cbiAgICAgICAgaWYoIXRoaXMudHJhY2tJc0xvYWRlZChxdWlwTW9kZWwudXJsKSkge1xuICAgICAgICAgICAgdGhpcy5sb2FkVHJhY2socXVpcE1vZGVsLnVybCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZighdGhpcy50cmFja0lzTG9hZGVkKHF1aXBNb2RlbC51cmwpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZih0aGlzLmF1ZGlvUGxheWVyLnBhdXNlZCkge1xuICAgICAgICAgICAgdGhpcy5wbGF5KHF1aXBNb2RlbCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnBhdXNlKHF1aXBNb2RlbCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwbGF5KHF1aXBNb2RlbCkge1xuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnBsYXkoKTtcbiAgICAgICAgQXVkaW9QbGF5ZXIudHJpZ2dlcihcIi9cIiArIHF1aXBNb2RlbC5pZCArIFwiL3BsYXlpbmdcIik7XG4gICAgICAgIHRoaXMuc3RhcnRQZXJpb2RpY1RpbWVyKCk7XG4gICAgfVxuXG4gICAgcGF1c2UocXVpcE1vZGVsKSB7XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIucGF1c2UoKTtcbiAgICAgICAgQXVkaW9QbGF5ZXIudHJpZ2dlcihcIi9cIiArIHF1aXBNb2RlbC5pZCArIFwiL3BhdXNlZFwiKTtcbiAgICAgICAgdGhpcy5zdG9wUGVyaW9kaWNUaW1lcigpO1xuICAgIH1cblxuICAgIHRyYWNrSXNMb2FkZWQodXJsKSB7XG4gICAgICAgIHJldHVybiB+dGhpcy5hdWRpb1BsYXllci5zcmMuaW5kZXhPZih1cmwpO1xuICAgIH1cblxuICAgIGxvYWRUcmFjayh1cmwpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJMb2FkaW5nIGF1ZGlvOiBcIiArIHVybCk7XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIuc3JjID0gdXJsO1xuICAgIH1cbn1cblxuY2xhc3MgUXVpcFZpZXcgZXh0ZW5kcyBCYWNrYm9uZS5WaWV3IHtcbiAgICBkZWZhdWx0cygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHF1aXBJZDogMCxcbiAgICAgICAgICAgIGF1ZGlvUGxheWVyOiBudWxsXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBldmVudHMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBcImNsaWNrIC5xdWlwLWFjdGlvbnMgLmxvY2staW5kaWNhdG9yXCI6IFwidG9nZ2xlUHVibGljXCIsXG4gICAgICAgICAgICBcImNsaWNrIC5xdWlwLXBsYXllclwiOiBcInRvZ2dsZVwiXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBvblBhdXNlKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlF1aXBWaWV3OyBwYXVzZWRcIik7XG5cbiAgICAgICAgJCh0aGlzLmVsKVxuICAgICAgICAgICAgLmZpbmQoJy5mYS1wbGF5JylcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZmEtcGxheScpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ2ZhLXBhdXNlJyk7XG4gICAgfVxuXG4gICAgb25QbGF5KCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlF1aXBWaWV3OyBwbGF5aW5nXCIpO1xuXG4gICAgICAgICQodGhpcy5lbClcbiAgICAgICAgICAgIC5maW5kKCcuZmEtcGF1c2UnKVxuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdmYS1wYXVzZScpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ2ZhLXBsYXknKTtcbiAgICB9XG5cbiAgICBvblByb2dyZXNzKHByb2dyZXNzVXBkYXRlKSB7XG4gICAgICAgIHRoaXMubW9kZWwuc2V0KHsncHJvZ3Jlc3MnOiBwcm9ncmVzc1VwZGF0ZS5wcm9ncmVzc30pO1xuICAgIH1cblxuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIHRoaXMucXVpcElkID0gdGhpcy4kZWwuZGF0YShcInF1aXBJZFwiKTtcbiAgICAgICAgdGhpcy5wdWJsaWNMaW5rID0gJy91LycgKyB0aGlzLnF1aXBJZDtcblxuICAgICAgICBBdWRpb1BsYXllci5vbihcIi9cIiArIHRoaXMucXVpcElkICsgXCIvcGF1c2VkXCIsICgpID0+IHRoaXMub25QYXVzZSgpKTtcbiAgICAgICAgQXVkaW9QbGF5ZXIub24oXCIvXCIgKyB0aGlzLnF1aXBJZCArIFwiL3BsYXlpbmdcIiwgKCkgPT4gdGhpcy5vblBsYXkoKSk7XG4gICAgICAgIEF1ZGlvUGxheWVyLm9uKFwiL1wiICsgdGhpcy5xdWlwSWQgKyBcIi9wcm9ncmVzc1wiLCAodXBkYXRlKSA9PiB0aGlzLm9uUHJvZ3Jlc3ModXBkYXRlKSk7XG5cbiAgICAgICAgdGhpcy5sb2FkTW9kZWwoKTtcblxuICAgICAgICAvLyB1cGRhdGUgdmlzdWFscyB0byBpbmRpY2F0ZSBwbGF5YmFjayBwcm9ncmVzc1xuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMubW9kZWwsICdjaGFuZ2U6cHJvZ3Jlc3MnLCAobW9kZWwsIHByb2dyZXNzKSA9PiB7XG4gICAgICAgICAgICAkKHRoaXMuZWwpLmZpbmQoXCIucHJvZ3Jlc3MtYmFyXCIpLmNzcyhcIndpZHRoXCIsIHByb2dyZXNzICsgXCIlXCIpO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMubW9kZWwsIFwiY2hhbmdlXCIsIHRoaXMucmVuZGVyKTtcbiAgICB9XG5cbiAgICBsb2FkTW9kZWwoKSB7XG4gICAgICAgIHZhciBwcm9ncmVzcyA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwicXVpcDpcIiArIHRoaXMucXVpcElkICsgXCI6cHJvZ3Jlc3NcIik7XG4gICAgICAgIHZhciBwb3NpdGlvbiA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwicXVpcDpcIiArIHRoaXMucXVpcElkICsgXCI6cG9zaXRpb25cIik7XG5cbiAgICAgICAgdGhpcy5tb2RlbC5zZXQoe1xuICAgICAgICAgICAgJ2lkJzogdGhpcy5xdWlwSWQsXG4gICAgICAgICAgICAncHJvZ3Jlc3MnOiBwcm9ncmVzcyxcbiAgICAgICAgICAgICdwb3NpdGlvbic6IHBvc2l0aW9uLFxuICAgICAgICAgICAgJ2lzUHVibGljJzogdGhpcy4kZWwuZGF0YShcImlzUHVibGljXCIpID09ICdUcnVlJyxcbiAgICAgICAgICAgICdpc01pbmUnOiB0aGlzLiRlbC5kYXRhKFwiaXNNaW5lXCIpID09ICdUcnVlJ1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICB0b2dnbGVQdWJsaWMoZXYpIHtcbiAgICAgICAgdmFyIG5ld1N0YXRlID0gIXRoaXMubW9kZWwuZ2V0KCdpc1B1YmxpYycpO1xuICAgICAgICB0aGlzLm1vZGVsLnNldCh7J2lzUHVibGljJzogbmV3U3RhdGV9KTtcblxuICAgICAgICBjb25zb2xlLmxvZyhcInRvZ2dsaW5nIG5ldyBwdWJsaXNoZWQgc3RhdGU6IFwiICsgbmV3U3RhdGUpO1xuXG4gICAgICAgICQuYWpheCh7XG4gICAgICAgICAgICB1cmw6ICcvcmVjb3JkaW5nL3B1Ymxpc2gvJyArIHRoaXMucXVpcElkLFxuICAgICAgICAgICAgbWV0aG9kOiAncG9zdCcsXG4gICAgICAgICAgICBkYXRhOiB7aXNQdWJsaWM6IG5ld1N0YXRlfSxcbiAgICAgICAgICAgIGNvbXBsZXRlOiBmdW5jdGlvbiAocmVzcCkge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwICYmIHJlc3Auc3RhdHVzID09ICdzdWNjZXNzJykge1xuICAgICAgICAgICAgICAgICAgICAvLyBjaGFuZ2Ugc3VjY2Vzc2Z1bFxuICAgICAgICAgICAgICAgIH0gZWxzZSB7ICAgLy8gY2hhbmdlIGZhaWxlZFxuICAgICAgICAgICAgICAgICAgICAvLyBUT0RPOiBhZGQgdmlzdWFsIHRvIGluZGljYXRlIGNoYW5nZS1mYWlsdXJlXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihcIlRvZ2dsaW5nIHJlY29yZGluZyBwdWJsaWNhdGlvbiBzdGF0ZSBmYWlsZWQ6XCIpO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmRpcihyZXNwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBdWRpbyBlbGVtZW50IGZpZWxkc1xuICAgICAqIC5kdXJhdGlvbiAoc2Vjb25kcylcbiAgICAgKiAub25wcm9ncmVzc1xuICAgICAqIC5vbnBsYXlcbiAgICAgKiAub25wYXVzZVxuICAgICAqIC5wYXVzZWRcbiAgICAgKiAudm9sdW1lXG4gICAgICogLmVuZGVkXG4gICAgICogLmN1cnJlbnRUaW1lXG4gICAgICovXG5cbiAgICB0b2dnbGUoZXZlbnQpIHtcbiAgICAgICAgdmFyIHF1aXBJZCA9ICQodGhpcy5lbCkuZGF0YShcInF1aXBJZFwiKTtcbiAgICAgICAgdGhpcy5tb2RlbC51cmwgPSAnL3JlY29yZGluZ3MvJyArIHF1aXBJZCArICcub2dnJztcblxuICAgICAgICBBdWRpb1BsYXllci50cmlnZ2VyKFwidG9nZ2xlXCIsIHRoaXMubW9kZWwpO1xuICAgIH1cblxuICAgIHJlbmRlcigpIHtcbiAgICAgICAgLy90aGlzLiRlbC5odG1sKF8udGVtcGxhdGUoJCgnI3F1aXAtdGVtcGxhdGUnKS5odG1sKCkpKTtcbiAgICAgICAgLy9yZXR1cm4gdGhpcztcbiAgICAgICAgdmFyIHJlc3VsdCA9ICQodGhpcy5lbCkuZmluZCgnLnF1aXAtYWN0aW9ucycpLmZpbmQoJy5sb2NrLWluZGljYXRvcicpO1xuICAgICAgICBpZiAocmVzdWx0KVxuICAgICAgICAgICAgcmVzdWx0LnJlbW92ZSgpO1xuXG4gICAgICAgIGlmICh0aGlzLm1vZGVsLmdldCgnaXNNaW5lJykpIHtcbiAgICAgICAgICAgIHZhciBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpO1xuICAgICAgICAgICAgdmFyIGh0bWwgPSBfLnRlbXBsYXRlKCQoXCIjcXVpcC1jb250cm9sLXByaXZhY3lcIikuaHRtbCgpKTtcblxuICAgICAgICAgICAgJCh0aGlzLmVsKS5maW5kKFwiLnF1aXAtYWN0aW9uc1wiKS5hcHBlbmQoaHRtbCh7XG4gICAgICAgICAgICAgICAgaXNQdWJsaWM6IHRoaXMubW9kZWwuZ2V0KCdpc1B1YmxpYycpLFxuICAgICAgICAgICAgICAgIHB1YmxpY0xpbms6IHRoaXMucHVibGljTGlua1xuICAgICAgICAgICAgfSkpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5jbGFzcyBRdWlwTGlzdCBleHRlbmRzIEJhY2tib25lLkNvbGxlY3Rpb24ge1xuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnMpIHtcbiAgICAgICAgc3VwZXIob3B0aW9ucyk7XG4gICAgICAgIHRoaXMubW9kZWwgPSBRdWlwTW9kZWw7XG4gICAgfVxufVxuXG52YXIgUXVpcHMgPSBuZXcgUXVpcExpc3QoKTtcblxuZXhwb3J0IHsgUXVpcE1vZGVsLCBRdWlwVmlldywgUXVpcExpc3QsIFF1aXBzLCBBdWRpb1BsYXllclZpZXcgfTtcbiIsImltcG9ydCBCYWNrYm9uZSBmcm9tICdiYWNrYm9uZSdcbmltcG9ydCB7IFF1aXBNb2RlbCwgUXVpcFZpZXcsIFF1aXBzLCBBdWRpb1BsYXllclZpZXcgfSBmcm9tICcuL3F1aXAtY29udHJvbC5qcydcbmltcG9ydCB7IEF1ZGlvQ2FwdHVyZSB9IGZyb20gJy4vYXVkaW8tY2FwdHVyZSdcblxuZXhwb3J0IGNsYXNzIFJlY29yZGVyIGV4dGVuZHMgQmFja2JvbmUuTW9kZWwge1xuICAgIGRlZmF1bHRzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVjb3JkaW5nVGltZTogMFxuICAgICAgICB9XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgUmVjb3JkZXJWaWV3IGV4dGVuZHMgQmFja2JvbmUuVmlldyB7XG4gICAgLy8gICAgZWw6ICcubS1yZWNvcmRpbmctY29udGFpbmVyJyxcblxuICAgIEludFRvVGltZSh2YWx1ZSkge1xuICAgICAgICB2YXIgbWludXRlcyA9IE1hdGguZmxvb3IodmFsdWUgLyA2MCk7XG4gICAgICAgIHZhciBzZWNvbmRzID0gTWF0aC5yb3VuZCh2YWx1ZSAtIG1pbnV0ZXMgKiA2MCk7XG5cbiAgICAgICAgcmV0dXJuIChcIjAwXCIgKyBtaW51dGVzKS5zdWJzdHIoLTIpICsgXCI6XCIgKyAoXCIwMFwiICsgc2Vjb25kcykuc3Vic3RyKC0yKTtcbiAgICB9XG5cbiAgICBkZWZhdWx0cygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGF1ZGlvQ2FwdHVyZTogbnVsbCxcbiAgICAgICAgICAgIGF1ZGlvQmxvYjogbnVsbCxcbiAgICAgICAgICAgIGF1ZGlvQmxvYlVybDogbnVsbCxcbiAgICAgICAgICAgIGF1ZGlvUGxheWVyOiBudWxsLFxuICAgICAgICAgICAgaXNSZWNvcmRpbmc6IGZhbHNlLFxuICAgICAgICAgICAgdGltZXJJZDogMCxcbiAgICAgICAgICAgIHRpbWVyU3RhcnQ6IDNcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGV2ZW50cygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIFwiY2xpY2sgLnJlY29yZGluZy10b2dnbGVcIjogXCJ0b2dnbGVcIixcbiAgICAgICAgICAgIFwiY2xpY2sgI2NhbmNlbC1yZWNvcmRpbmdcIjogXCJjYW5jZWxSZWNvcmRpbmdcIixcbiAgICAgICAgICAgIFwiY2xpY2sgI3VwbG9hZC1yZWNvcmRpbmdcIjogXCJ1cGxvYWRSZWNvcmRpbmdcIixcbiAgICAgICAgICAgIFwiY2xpY2sgI2hlbHBlci1idG5cIjogXCJwbGF5UHJldmlld1wiXG4gICAgICAgIH1cbiAgICB9XG5cblxuICAgIGluaXRpYWxpemUob3B0aW9ucykge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlJlY29yZGVyVmlldyBpbml0XCIpO1xuICAgICAgICB0aGlzLmF1ZGlvQ2FwdHVyZSA9IG5ldyBBdWRpb0NhcHR1cmUoKTtcblxuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyZWNvcmRlZC1wcmV2aWV3XCIpO1xuICAgICAgICBpZiAodGhpcy5hdWRpb1BsYXllciA9PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zb2xlLmxvZyhcImNhbiBwbGF5IHZvcmJpczogXCIsICEhdGhpcy5hdWRpb1BsYXllci5jYW5QbGF5VHlwZSAmJiBcIlwiICE9IHRoaXMuYXVkaW9QbGF5ZXIuY2FuUGxheVR5cGUoJ2F1ZGlvL29nZzsgY29kZWNzPVwidm9yYmlzXCInKSk7XG5cbiAgICAgICAgLy90aGlzLmF1ZGlvUGxheWVyLmxvb3AgPSBcImxvb3BcIjtcbiAgICAgICAgLy90aGlzLmF1ZGlvUGxheWVyLmF1dG9wbGF5ID0gXCJhdXRvcGxheVwiO1xuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnNyYyA9IFwiL2Fzc2V0cy9zb3VuZHMvYmVlcF9zaG9ydF9vbi5vZ2dcIjtcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5wbGF5KCk7XG5cbiAgICAgICAgdGhpcy5tb2RlbC5vbignY2hhbmdlOnJlY29yZGluZ1RpbWUnLCBmdW5jdGlvbiAobW9kZWwsIHRpbWUpIHtcbiAgICAgICAgICAgICQoXCIucmVjb3JkaW5nLXRpbWVcIikudGV4dCh0aW1lKTtcbiAgICAgICAgfSlcblxuICAgICAgICAvLyBhdHRlbXB0IHRvIGZldGNoIG1lZGlhLXN0cmVhbSBvbiBwYWdlLWxvYWRcbiAgICAgICAgdGhpcy5hdWRpb0NhcHR1cmUucHJlbG9hZE1lZGlhU3RyZWFtKCk7XG5cbiAgICAgICAgLy8gVE9ETzogYSBwcmV0dHkgYWR2YW5jZWQgYnV0IG5lYXQgZmVhdHVyZSBtYXkgYmUgdG8gc3RvcmUgYSBiYWNrdXAgY29weSBvZiBhIHJlY29yZGluZyBsb2NhbGx5IGluIGNhc2Ugb2YgYSBjcmFzaCBvciB1c2VyLWVycm9yXG4gICAgICAgIC8qXG4gICAgICAgICAvLyBjaGVjayBob3cgbXVjaCB0ZW1wb3Jhcnkgc3RvcmFnZSBzcGFjZSB3ZSBoYXZlLiBpdCdzIGEgZ29vZCB3YXkgdG8gc2F2ZSByZWNvcmRpbmcgd2l0aG91dCBsb3NpbmcgaXRcbiAgICAgICAgIHdpbmRvdy53ZWJraXRTdG9yYWdlSW5mby5xdWVyeVVzYWdlQW5kUXVvdGEoXG4gICAgICAgICB3ZWJraXRTdG9yYWdlSW5mby5URU1QT1JBUlksXG4gICAgICAgICBmdW5jdGlvbih1c2VkLCByZW1haW5pbmcpIHtcbiAgICAgICAgIHZhciBybWIgPSAocmVtYWluaW5nIC8gMTAyNCAvIDEwMjQpLnRvRml4ZWQoNCk7XG4gICAgICAgICB2YXIgdW1iID0gKHVzZWQgLyAxMDI0IC8gMTAyNCkudG9GaXhlZCg0KTtcbiAgICAgICAgIGNvbnNvbGUubG9nKFwiVXNlZCBxdW90YTogXCIgKyB1bWIgKyBcIm1iLCByZW1haW5pbmcgcXVvdGE6IFwiICsgcm1iICsgXCJtYlwiKTtcbiAgICAgICAgIH0sIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgIGNvbnNvbGUubG9nKCdFcnJvcicsIGUpO1xuICAgICAgICAgfVxuICAgICAgICAgKTtcblxuICAgICAgICAgZnVuY3Rpb24gb25FcnJvckluRlMoKSB7XG4gICAgICAgICB2YXIgbXNnID0gJyc7XG5cbiAgICAgICAgIHN3aXRjaCAoZS5jb2RlKSB7XG4gICAgICAgICBjYXNlIEZpbGVFcnJvci5RVU9UQV9FWENFRURFRF9FUlI6XG4gICAgICAgICBtc2cgPSAnUVVPVEFfRVhDRUVERURfRVJSJztcbiAgICAgICAgIGJyZWFrO1xuICAgICAgICAgY2FzZSBGaWxlRXJyb3IuTk9UX0ZPVU5EX0VSUjpcbiAgICAgICAgIG1zZyA9ICdOT1RfRk9VTkRfRVJSJztcbiAgICAgICAgIGJyZWFrO1xuICAgICAgICAgY2FzZSBGaWxlRXJyb3IuU0VDVVJJVFlfRVJSOlxuICAgICAgICAgbXNnID0gJ1NFQ1VSSVRZX0VSUic7XG4gICAgICAgICBicmVhaztcbiAgICAgICAgIGNhc2UgRmlsZUVycm9yLklOVkFMSURfTU9ESUZJQ0FUSU9OX0VSUjpcbiAgICAgICAgIG1zZyA9ICdJTlZBTElEX01PRElGSUNBVElPTl9FUlInO1xuICAgICAgICAgYnJlYWs7XG4gICAgICAgICBjYXNlIEZpbGVFcnJvci5JTlZBTElEX1NUQVRFX0VSUjpcbiAgICAgICAgIG1zZyA9ICdJTlZBTElEX1NUQVRFX0VSUic7XG4gICAgICAgICBicmVhaztcbiAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICBtc2cgPSAnVW5rbm93biBFcnJvcic7XG4gICAgICAgICBicmVhaztcbiAgICAgICAgIH1cblxuICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yOiAnICsgbXNnKTtcbiAgICAgICAgIH1cblxuICAgICAgICAgd2luZG93LnJlcXVlc3RGaWxlU3lzdGVtICA9IHdpbmRvdy5yZXF1ZXN0RmlsZVN5c3RlbSB8fCB3aW5kb3cud2Via2l0UmVxdWVzdEZpbGVTeXN0ZW07XG5cbiAgICAgICAgIHdpbmRvdy5yZXF1ZXN0RmlsZVN5c3RlbSh3aW5kb3cuVEVNUE9SQVJZLCA1ICogMTAyNCAqIDEwMjQsIGZ1bmN0aW9uIG9uU3VjY2Vzcyhmcykge1xuXG4gICAgICAgICBjb25zb2xlLmxvZygnb3BlbmluZyBmaWxlJyk7XG5cbiAgICAgICAgIGZzLnJvb3QuZ2V0RmlsZShcInRlc3RcIiwge2NyZWF0ZTp0cnVlfSwgZnVuY3Rpb24oZmUpIHtcblxuICAgICAgICAgY29uc29sZS5sb2coJ3NwYXduZWQgd3JpdGVyJyk7XG5cbiAgICAgICAgIGZlLmNyZWF0ZVdyaXRlcihmdW5jdGlvbihmdykge1xuXG4gICAgICAgICBmdy5vbndyaXRlZW5kID0gZnVuY3Rpb24oZSkge1xuICAgICAgICAgY29uc29sZS5sb2coJ3dyaXRlIGNvbXBsZXRlZCcpO1xuICAgICAgICAgfTtcblxuICAgICAgICAgZncub25lcnJvciA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgIGNvbnNvbGUubG9nKCd3cml0ZSBmYWlsZWQ6ICcgKyBlLnRvU3RyaW5nKCkpO1xuICAgICAgICAgfTtcblxuICAgICAgICAgY29uc29sZS5sb2coJ3dyaXRpbmcgYmxvYiB0byBmaWxlLi4nKTtcblxuICAgICAgICAgdmFyIGJsb2IgPSBuZXcgQmxvYihbJ3llaCB0aGlzIGlzIGEgdGVzdCEnXSwge3R5cGU6ICd0ZXh0L3BsYWluJ30pO1xuICAgICAgICAgZncud3JpdGUoYmxvYik7XG5cbiAgICAgICAgIH0sIG9uRXJyb3JJbkZTKTtcblxuICAgICAgICAgfSwgb25FcnJvckluRlMpO1xuXG4gICAgICAgICB9LCBvbkVycm9ySW5GUyk7XG4gICAgICAgICAqL1xuICAgIH1cblxuICAgIHRvZ2dsZShldmVudCkge1xuICAgICAgICBpZiAodGhpcy5pc1JlY29yZGluZykge1xuICAgICAgICAgICAgdGhpcy5pc1JlY29yZGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5zdG9wUmVjb3JkaW5nKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmlzUmVjb3JkaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuc3RhcnRSZWNvcmRpbmcoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNhbmNlbFJlY29yZGluZyhldmVudCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlJlY29yZGVyOjpvblJlY29yZGluZ0NvbXBsZXRlZCgpOyBjYW5jZWxpbmcgcmVjb3JkaW5nXCIpO1xuICAgICAgICAkKFwiI3JlY29yZGVyLWZ1bGxcIikucmVtb3ZlQ2xhc3MoXCJkaXNhYmxlZFwiKTtcbiAgICAgICAgJChcIiNyZWNvcmRlci11cGxvYWRlclwiKS5hZGRDbGFzcyhcImRpc2FibGVkXCIpO1xuICAgICAgICAkKFwiLm0tcmVjb3JkaW5nLWNvbnRhaW5lclwiKS5yZW1vdmVDbGFzcyhcImZsaXBwZWRcIik7XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIuc3JjID0gXCJcIjtcbiAgICAgICAgdGhpcy5tb2RlbC5zZXQoJ3JlY29yZGluZ1RpbWUnLCAzKTtcbiAgICB9XG5cbiAgICB1cGxvYWRSZWNvcmRpbmcoZXZlbnQpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJSZWNvcmRlcjo6b25SZWNvcmRpbmdDb21wbGV0ZWQoKTsgdXBsb2FkaW5nIHJlY29yZGluZ1wiKTtcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5zcmMgPSBcIlwiO1xuXG4gICAgICAgICQoXCIjcmVjb3JkZXItZnVsbFwiKS5hZGRDbGFzcyhcImRpc2FibGVkXCIpO1xuICAgICAgICAkKFwiI3JlY29yZGVyLXVwbG9hZGVyXCIpLnJlbW92ZUNsYXNzKFwiZGlzYWJsZWRcIik7XG4gICAgICAgICQoXCIubS1yZWNvcmRpbmctY29udGFpbmVyXCIpLnJlbW92ZUNsYXNzKFwiZmxpcHBlZFwiKTtcblxuICAgICAgICB2YXIgZGVzY3JpcHRpb24gPSAkKCd0ZXh0YXJlYVtuYW1lPWRlc2NyaXB0aW9uXScpWzBdLnZhbHVlO1xuXG4gICAgICAgIHZhciBkYXRhID0gbmV3IEZvcm1EYXRhKCk7XG4gICAgICAgIGRhdGEuYXBwZW5kKCdkZXNjcmlwdGlvbicsIGRlc2NyaXB0aW9uKTtcbiAgICAgICAgZGF0YS5hcHBlbmQoJ2lzUHVibGljJywgMSk7XG4gICAgICAgIGRhdGEuYXBwZW5kKCdhdWRpby1ibG9iJywgdGhpcy5hdWRpb0Jsb2IpO1xuXG4gICAgICAgIC8vIHNlbmQgcmF3IGJsb2IgYW5kIG1ldGFkYXRhXG5cbiAgICAgICAgLy8gVE9ETzogZ2V0IGEgcmVwbGFjZW1lbnQgYWpheCBsaWJyYXJ5IChtYXliZSBwYXRjaCByZXF3ZXN0IHRvIHN1cHBvcnQgYmluYXJ5PylcbiAgICAgICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICB4aHIub3BlbigncG9zdCcsICcvcmVjb3JkaW5nL2NyZWF0ZScsIHRydWUpO1xuICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcignQWNjZXB0JywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcbiAgICAgICAgeGhyLnVwbG9hZC5vbnByb2dyZXNzID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIHZhciBwZXJjZW50ID0gKChlLmxvYWRlZCAvIGUudG90YWwpICogMTAwKS50b0ZpeGVkKDApICsgJyUnO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJwZXJjZW50YWdlOiBcIiArIHBlcmNlbnQpO1xuICAgICAgICAgICAgJChcIiNyZWNvcmRlci11cGxvYWRlclwiKS5maW5kKFwiLmJhclwiKS5jc3MoJ3dpZHRoJywgcGVyY2VudCk7XG4gICAgICAgIH07XG4gICAgICAgIHhoci5vbmxvYWQgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgJChcIiNyZWNvcmRlci11cGxvYWRlclwiKS5maW5kKFwiLmJhclwiKS5jc3MoJ3dpZHRoJywgJzEwMCUnKTtcbiAgICAgICAgICAgIGlmICh4aHIuc3RhdHVzID09IDIwMCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUmVjb3JkZXI6Om9uUmVjb3JkaW5nQ29tcGxldGVkKCk7IG1hbnVhbCB4aHIgc3VjY2Vzc2Z1bFwiKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJSZWNvcmRlcjo6b25SZWNvcmRpbmdDb21wbGV0ZWQoKTsgbWFudWFsIHhociBlcnJvclwiLCB4aHIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IEpTT04ucGFyc2UoeGhyLnJlc3BvbnNlKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwieGhyLnJlc3BvbnNlXCIsIHhoci5yZXNwb25zZSk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcInJlc3VsdFwiLCByZXN1bHQpO1xuXG4gICAgICAgICAgICBpZiAocmVzdWx0LnN0YXR1cyA9PSBcInN1Y2Nlc3NcIikge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gcmVzdWx0LnVybDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgeGhyLnNlbmQoZGF0YSk7XG4gICAgfVxuXG4gICAgb25SZWNvcmRpbmdUaWNrKCkge1xuICAgICAgICB2YXIgdGltZVNwYW4gPSBwYXJzZUludCgoKG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gdGhpcy50aW1lclN0YXJ0KSAvIDEwMDApLnRvRml4ZWQoKSk7XG4gICAgICAgIHZhciB0aW1lU3RyID0gdGhpcy5JbnRUb1RpbWUodGltZVNwYW4pO1xuICAgICAgICB0aGlzLm1vZGVsLnNldCgncmVjb3JkaW5nVGltZScsIHRpbWVTdHIpO1xuICAgIH1cblxuICAgIG9uQ291bnRkb3duVGljaygpIHtcbiAgICAgICAgaWYgKC0tdGhpcy50aW1lclN0YXJ0ID4gMCkge1xuICAgICAgICAgICAgdGhpcy5tb2RlbC5zZXQoJ3JlY29yZGluZ1RpbWUnLCB0aGlzLnRpbWVyU3RhcnQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJjb3VudGRvd24gaGl0IHplcm8uIGJlZ2luIHJlY29yZGluZy5cIik7XG4gICAgICAgICAgICBjbGVhckludGVydmFsKHRoaXMudGltZXJJZCk7XG4gICAgICAgICAgICB0aGlzLm1vZGVsLnNldCgncmVjb3JkaW5nVGltZScsIHRoaXMuSW50VG9UaW1lKDApKTtcbiAgICAgICAgICAgIHRoaXMub25NaWNSZWNvcmRpbmcoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHN0YXJ0UmVjb3JkaW5nKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcInN0YXJ0aW5nIHJlY29yZGluZ1wiKTtcbiAgICAgICAgdGhpcy5hdWRpb0NhcHR1cmUuc3RhcnQoKCkgPT4gdGhpcy5vbk1pY1JlYWR5KCkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1pY3JvcGhvbmUgaXMgcmVhZHkgdG8gcmVjb3JkLiBEbyBhIGNvdW50LWRvd24sIHRoZW4gc2lnbmFsIGZvciBpbnB1dC1zaWduYWwgdG8gYmVnaW4gcmVjb3JkaW5nXG4gICAgICovXG4gICAgb25NaWNSZWFkeSgpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJtaWMgcmVhZHkgdG8gcmVjb3JkLiBkbyBjb3VudGRvd24uXCIpO1xuICAgICAgICB0aGlzLnRpbWVyU3RhcnQgPSAzO1xuICAgICAgICAvLyBydW4gY291bnRkb3duXG4gICAgICAgIC8vdGhpcy50aW1lcklkID0gc2V0SW50ZXJ2YWwodGhpcy5vbkNvdW50ZG93blRpY2suYmluZCh0aGlzKSwgMTAwMCk7XG5cbiAgICAgICAgLy8gb3IgbGF1bmNoIGNhcHR1cmUgaW1tZWRpYXRlbHlcbiAgICAgICAgdGhpcy5tb2RlbC5zZXQoJ3JlY29yZGluZ1RpbWUnLCB0aGlzLkludFRvVGltZSgwKSk7XG4gICAgICAgIHRoaXMub25NaWNSZWNvcmRpbmcoKTtcblxuICAgICAgICAkKFwiLnJlY29yZGluZy10aW1lXCIpLmFkZENsYXNzKFwiaXMtdmlzaWJsZVwiKTtcbiAgICB9XG5cbiAgICBvbk1pY1JlY29yZGluZygpIHtcbiAgICAgICAgdGhpcy50aW1lclN0YXJ0ID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgICAgIHRoaXMudGltZXJJZCA9IHNldEludGVydmFsKHRoaXMub25SZWNvcmRpbmdUaWNrLmJpbmQodGhpcyksIDEwMDApO1xuICAgICAgICAkKFwiLm0tcmVjb3JkaW5nLXNjcmVlblwiKS5hZGRDbGFzcyhcImlzLXJlY29yZGluZ1wiKTtcblxuICAgICAgICBjb25zb2xlLmxvZyhcIk1pYyByZWNvcmRpbmcgc3RhcnRlZFwiKTtcblxuICAgICAgICAvLyBUT0RPOiB0aGUgbWljIGNhcHR1cmUgaXMgYWxyZWFkeSBhY3RpdmUsIHNvIGF1ZGlvIGJ1ZmZlcnMgYXJlIGdldHRpbmcgYnVpbHQgdXBcbiAgICAgICAgLy8gd2hlbiB0b2dnbGluZyB0aGlzIG9uLCB3ZSBtYXkgYWxyZWFkeSBiZSBjYXB0dXJpbmcgYSBidWZmZXIgdGhhdCBoYXMgYXVkaW8gcHJpb3IgdG8gdGhlIGNvdW50ZG93blxuICAgICAgICAvLyBoaXR0aW5nIHplcm8uIHdlIGNhbiBkbyBhIGZldyB0aGluZ3MgaGVyZTpcbiAgICAgICAgLy8gMSkgZmlndXJlIG91dCBob3cgbXVjaCBhdWRpbyB3YXMgYWxyZWFkeSBjYXB0dXJlZCwgYW5kIGN1dCBpdCBvdXRcbiAgICAgICAgLy8gMikgdXNlIGEgZmFkZS1pbiB0byBjb3ZlciB1cCB0aGF0IHNwbGl0LXNlY29uZCBvZiBhdWRpb1xuICAgICAgICAvLyAzKSBhbGxvdyB0aGUgdXNlciB0byBlZGl0IHBvc3QtcmVjb3JkIGFuZCBjbGlwIGFzIHRoZXkgd2lzaCAoYmV0dGVyIGJ1dCBtb3JlIGNvbXBsZXggb3B0aW9uISlcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB0aGlzLmF1ZGlvQ2FwdHVyZS50b2dnbGVNaWNyb3Bob25lUmVjb3JkaW5nKHRydWUpLCA1MDApO1xuICAgIH1cblxuICAgIHN0b3BSZWNvcmRpbmcoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwic3RvcHBpbmcgcmVjb3JkaW5nXCIpO1xuICAgICAgICBjbGVhckludGVydmFsKHRoaXMudGltZXJJZCk7XG5cbiAgICAgICAgLy8gcGxheSBzb3VuZCBpbW1lZGlhdGVseSB0byBieXBhc3MgbW9iaWxlIGNocm9tZSdzIFwidXNlciBpbml0aWF0ZWQgbWVkaWFcIiByZXF1aXJlbWVudFxuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnNyYyA9IFwiL2Fzc2V0cy9zb3VuZHMvYmVlcF9zaG9ydF9vbi5vZ2dcIjtcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5wbGF5KCk7XG5cbiAgICAgICAgdGhpcy5hdWRpb0NhcHR1cmUuc3RvcCgoYmxvYikgPT4gdGhpcy5vblJlY29yZGluZ0NvbXBsZXRlZChibG9iKSk7XG5cbiAgICAgICAgJChcIi5yZWNvcmRpbmctdGltZVwiKS5yZW1vdmVDbGFzcyhcImlzLXZpc2libGVcIik7XG4gICAgICAgICQoXCIubS1yZWNvcmRpbmctc2NyZWVuXCIpLnJlbW92ZUNsYXNzKFwiaXMtcmVjb3JkaW5nXCIpO1xuXG4gICAgICAgIC8vIFRPRE86IGFuaW1hdGUgcmVjb3JkZXIgb3V0XG4gICAgICAgIC8vIFRPRE86IGFuaW1hdGUgdXBsb2FkZXIgaW5cbiAgICB9XG5cbiAgICBvblJlY29yZGluZ0NvbXBsZXRlZChibG9iKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiUmVjb3JkZXI6Om9uUmVjb3JkaW5nQ29tcGxldGVkKCk7IHByZXZpZXdpbmcgcmVjb3JkZWQgYXVkaW9cIik7XG4gICAgICAgIHRoaXMuYXVkaW9CbG9iID0gYmxvYjtcbiAgICAgICAgdGhpcy5zaG93Q29tcGxldGlvblNjcmVlbigpO1xuICAgIH1cblxuICAgIHBsYXlQcmV2aWV3KCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcInBsYXlpbmcgcHJldmlldy4uXCIpO1xuICAgICAgICBjb25zb2xlLmxvZyhcImF1ZGlvIGJsb2JcIiwgdGhpcy5hdWRpb0Jsb2IpO1xuICAgICAgICBjb25zb2xlLmxvZyhcImF1ZGlvIGJsb2IgdXJsXCIsIHRoaXMuYXVkaW9CbG9iVXJsKTtcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5zcmMgPSB0aGlzLmF1ZGlvQmxvYlVybDtcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5wbGF5KCk7XG4gICAgfVxuXG4gICAgc2hvd0NvbXBsZXRpb25TY3JlZW4oKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiUmVjb3JkZXI6Om9uUmVjb3JkaW5nQ29tcGxldGVkKCk7IGZsaXBwaW5nIHRvIGF1ZGlvIHBsYXliYWNrXCIpO1xuICAgICAgICB0aGlzLmF1ZGlvQmxvYlVybCA9IHdpbmRvdy5VUkwuY3JlYXRlT2JqZWN0VVJMKHRoaXMuYXVkaW9CbG9iKTtcbiAgICAgICAgJChcIi5tLXJlY29yZGluZy1jb250YWluZXJcIikuYWRkQ2xhc3MoXCJmbGlwcGVkXCIpO1xuXG4gICAgICAgIC8vIEhBQ0s6IHJvdXRlIGJsb2IgdGhyb3VnaCB4aHIgdG8gbGV0IEFuZHJvaWQgQ2hyb21lIHBsYXkgYmxvYnMgdmlhIDxhdWRpbz5cbiAgICAgICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICB4aHIub3BlbignR0VUJywgdGhpcy5hdWRpb0Jsb2JVcmwsIHRydWUpO1xuICAgICAgICB4aHIucmVzcG9uc2VUeXBlID0gJ2Jsb2InO1xuICAgICAgICB4aHIub3ZlcnJpZGVNaW1lVHlwZSgnYXVkaW8vb2dnJyk7XG5cbiAgICAgICAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9ICgpID0+IHtcbiAgICAgICAgICAgIGlmICh4aHIucmVhZHlTdGF0ZSA9PT0gNCAmJiB4aHIuc3RhdHVzID09IDIwMCkge1xuICAgICAgICAgICAgICAgIHZhciB4aHJCbG9iVXJsID0gd2luZG93LlVSTC5jcmVhdGVPYmplY3RVUkwoeGhyLnJlc3BvbnNlKTtcblxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiTG9hZGVkIGJsb2IgZnJvbSBjYWNoZSB1cmw6IFwiICsgdGhpcy5hdWRpb0Jsb2JVcmwpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUm91dGVkIGludG8gYmxvYiB1cmw6IFwiICsgeGhyQmxvYlVybCk7XG5cbiAgICAgICAgICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnNyYyA9IHhockJsb2JVcmw7XG4gICAgICAgICAgICAgICAgdGhpcy5hdWRpb1BsYXllci5wbGF5KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHhoci5zZW5kKCk7XG4gICAgfVxufVxuIl19
