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
            _fftSmoothing: 0.8
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
                console.log("AudioCapture::startManualEncoding(); MediaRecorder.ondataavailable(); new blob: size=" + e.data.size + " type=" + e.data.type);
                this._latestAudioBuffer.push(e.data);
            };

            this._audioEncoder.onstop = function () {
                console.log("AudioCapture::startManualEncoding(); MediaRecorder.onstop(); hit");

                // send the last captured audio buffer
                var encoded_blob = new Blob(this._latestAudioBuffer, { type: 'audio/ogg' });

                console.log("AudioCapture::startManualEncoding(); MediaRecorder.onstop(); got encoded blob: size=" + encoded_blob.size + " type=" + encoded_blob.type);

                if (this._onCaptureCompleteCallback) this._onCaptureCompleteCallback(encoded_blob);
            };

            console.log("AudioCapture::startManualEncoding(); MediaRecorder.start()");
            this._audioEncoder.start(0);
        }
    }, {
        key: "createAudioContext",
        value: function createAudioContext(mediaStream) {
            // build capture graph
            var AudioContextCreator = window.webkitAudioContext || window.AudioContext;

            this._audioContext = new AudioContextCreator();
            this._audioInput = this._audioContext.createMediaStreamSource(mediaStream);

            console.log("AudioCapture::startManualEncoding(); _audioContext.sampleRate: " + this._audioContext.sampleRate + " Hz");

            // create a listener node to grab microphone samples and feed it to our background worker
            this._audioListener = (this._audioContext.createScriptProcessor || this._audioContext.createJavaScriptNode).call(this._audioContext, 8192, 2, 2);

            console.log("this._cachedGainValue = " + this._cachedGainValue);

            this._audioGain = this._audioContext.createGain();
            this._audioGain.gain.value = this._cachedGainValue;

            this._audioAnalyzer = this._audioContext.createAnalyser();
            this._audioAnalyzer.fftSize = this._fftSize;
            this._audioAnalyzer.smoothingTimeConstant = this._fftSmoothing;
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
                    right: e.inputBuffer.getChannelData(1)
                };

                _this._encodingWorker.postMessage(msg);
            };

            // handle messages from the encoding-worker
            this._encodingWorker.onmessage = function (e) {

                // worker finished and has the final encoded audio buffer for us
                if (e.data.action === "encoded") {
                    var encoded_blob = new Blob([e.data.buffer], { type: 'audio/ogg' });

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

            console.log("input->gain");
            this._audioInput.connect(this._audioGain);
            console.log("gain->analyzer");
            this._audioGain.connect(this._audioAnalyzer);
            console.log("analyzer->listesner");
            this._audioAnalyzer.connect(this._audioListener);
            console.log("listener->destination");
            this._audioListener.connect(this._audioContext.destination);

            return true;
        }
    }, {
        key: "shutdownManualEncoding",
        value: function shutdownManualEncoding() {
            console.log("AudioCapture::shutdownManualEncoding(); Tearing down AudioAPI connections..");

            console.log("listener->destination");
            this._audioListener.disconnect(this._audioContext.destination);
            console.log("analyzer->listesner");
            this._audioAnalyzer.disconnect(this._audioListener);
            console.log("gain->analyzer");
            this._audioGain.disconnect(this._audioAnalyzer);
            console.log("input->gain");
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
                "click #upload-recording": "uploadRecording"
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
        key: 'showCompletionScreen',
        value: function showCompletionScreen() {
            console.log("Recorder::onRecordingCompleted(); flipping card");
            var url = URL.createObjectURL(this.audioBlob);
            $(".m-recording-container").addClass("flipped");

            // TODO: get a chainable animations library that supports delays
            //setTimeout(() => {
            console.log("Recorder::onRecordingCompleted(); changing audioplayer");
            this.audioPlayer.src = url;
            this.audioPlayer.play();
            console.log("audio player with blob", this.audioPlayer);
            //}, 200);
        }
    }]);

    return RecorderView;
})(_backbone2['default'].View);

exports.RecorderView = RecorderView;

},{"./audio-capture":2,"./quip-control.js":5,"backbone":"backbone"}]},{},[1])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvYWJhcmthbi9hbGV4LWRldi9xdWlwcy1weXRob24vYXBwL2phdmFzY3JpcHRzL2FwcC5qcyIsIi9Vc2Vycy9hYmFya2FuL2FsZXgtZGV2L3F1aXBzLXB5dGhvbi9hcHAvamF2YXNjcmlwdHMvYXVkaW8tY2FwdHVyZS5qcyIsIi9Vc2Vycy9hYmFya2FuL2FsZXgtZGV2L3F1aXBzLXB5dGhvbi9hcHAvamF2YXNjcmlwdHMvYXVkaW8tcGxheWVyLmpzIiwiL1VzZXJzL2FiYXJrYW4vYWxleC1kZXYvcXVpcHMtcHl0aG9uL2FwcC9qYXZhc2NyaXB0cy9ob21lcGFnZS5qcyIsIi9Vc2Vycy9hYmFya2FuL2FsZXgtZGV2L3F1aXBzLXB5dGhvbi9hcHAvamF2YXNjcmlwdHMvcXVpcC1jb250cm9sLmpzIiwiL1VzZXJzL2FiYXJrYW4vYWxleC1kZXYvcXVpcHMtcHl0aG9uL2FwcC9qYXZhc2NyaXB0cy9yZWNvcmRpbmctY29udHJvbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7d0JDQXFCLFVBQVU7Ozs7d0JBQ0osWUFBWTs7OztnQ0FDQSxxQkFBcUI7O0lBRXRELFdBQVcsR0FDRixTQURULFdBQVcsR0FDQzswQkFEWixXQUFXOztBQUVULDBCQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDZiwwQkFBUyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7O0FBRXpCLFFBQUksSUFBSSxHQUFHLDJCQUFvQixDQUFDO0FBQ2hDLFFBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQzs7QUFFZCxRQUFJLFFBQVEsR0FBRyxtQ0FBaUI7QUFDNUIsVUFBRSxFQUFFLENBQUMsQ0FBQyx3QkFBd0IsQ0FBQztBQUMvQixhQUFLLEVBQUUsK0JBQWEsRUFBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQztLQUMzQyxDQUFDLENB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M0IsZ0JBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUM7QUFDNUIsbUJBQU8sQ0FBQyxHQUFHLENBQUMsd0JBQXdCLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDOztTQUUzRDs7O1dBbFJRLFlBQVk7R0FBUyxzQkFBUyxJQUFJIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImltcG9ydCBCYWNrYm9uZSBmcm9tICdiYWNrYm9uZSdcbmltcG9ydCBSZWNvcmRpbmdzTGlzdCBmcm9tICcuL2hvbWVwYWdlJ1xuaW1wb3J0IHsgUmVjb3JkZXJWaWV3LCBSZWNvcmRlciB9IGZyb20gJy4vcmVjb3JkaW5nLWNvbnRyb2wnXG5cbmNsYXNzIEFwcGxpY2F0aW9uIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgQmFja2JvbmUuJCA9ICQ7XG4gICAgICAgIEJhY2tib25lLmhpc3Rvcnkuc3RhcnQoKTtcblxuICAgICAgICB2YXIgdmlldyA9IG5ldyBSZWNvcmRpbmdzTGlzdCgpO1xuICAgICAgICB2aWV3LnJlbmRlcigpO1xuXG4gICAgICAgIHZhciByZWNvcmRlciA9IG5ldyBSZWNvcmRlclZpZXcoe1xuICAgICAgICAgICAgZWw6ICQoJy5tLXJlY29yZGluZy1jb250YWluZXInKSxcbiAgICAgICAgICAgIG1vZGVsOiBuZXcgUmVjb3JkZXIoe3JlY29yZGluZ1RpbWU6IC0zfSlcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8vLyBsb2NhdGUgYW55IGNvbnRyb2xsZXJzIG9uIHRoZSBwYWdlIGFuZCBsb2FkIHRoZWlyIHJlcXVpcmVtZW50c1xuICAgICAgICAvLy8vIHRoaXMgaXMgYSBwYXJ0IG9mIEFuZ3VsYXIgaSByZWFsbHkgbGlrZWQsIHRoZSBjdXN0b20gZGlyZWN0aXZlc1xuICAgICAgICAvLyQoJ1tiYWNrYm9uZS1jb250cm9sbGVyXScpLmVhY2goZnVuY3Rpb24oZWwpIHtcbiAgICAgICAgLy9cbiAgICAgICAgLy8gICAgdmFyIGNvbnRyb2xsZXJOYW1lID0gJChlbCkuYXR0cignYmFja2JvbmUtY29udHJvbGxlcicpO1xuICAgICAgICAvLyAgICBpZihjb250cm9sbGVyTmFtZSBpbiBBcHAuTG9hZGVycylcbiAgICAgICAgLy8gICAgICAgIEFwcC5Mb2FkZXJzW2NvbnRyb2xsZXJOYW1lXSgpO1xuICAgICAgICAvLyAgICBlbHNlXG4gICAgICAgIC8vICAgICAgICBjb25zb2xlLmVycm9yKFwiQ29udHJvbGxlcjogJ1wiICsgY29udHJvbGxlck5hbWUgKyBcIicgbm90IGZvdW5kXCIpO1xuICAgICAgICAvL30pO1xuICAgIH1cbn1cblxuJCgoKSA9PiB7XG4gICAgLy8gc2V0dXAgcmF2ZW4gdG8gcHVzaCBtZXNzYWdlcyB0byBvdXIgc2VudHJ5XG4gICAgUmF2ZW4uY29uZmlnKCdodHRwczovL2QwOTg3MTJjYjcwNjRjZjA4Yjc0ZDAxYjZmM2JlM2RhQGFwcC5nZXRzZW50cnkuY29tLzIwOTczJywge1xuICAgICAgICB3aGl0ZWxpc3RVcmxzOiBbJ3N0YWdpbmcuY291Y2hwb2QuY29tJywgJ2NvdWNocG9kLmNvbSddIC8vIHByb2R1Y3Rpb24gb25seVxuICAgIH0pLmluc3RhbGwoKTtcblxuICAgIG5ldyBBcHBsaWNhdGlvbigpO1xuXG4gICAgLy8gZm9yIHByb2R1Y3Rpb24sIGNvdWxkIHdyYXAgZG9tUmVhZHlDYWxsYmFjayBhbmQgbGV0IHJhdmVuIGhhbmRsZSBhbnkgZXhjZXB0aW9uc1xuXG4gICAgLypcbiAgICB0cnkge1xuICAgICAgICBkb21SZWFkeUNhbGxiYWNrKCk7XG4gICAgfSBjYXRjaChlcnIpIHtcbiAgICAgICAgUmF2ZW4uY2FwdHVyZUV4Y2VwdGlvbihlcnIpO1xuICAgICAgICBjb25zb2xlLmxvZyhcIltFcnJvcl0gVW5oYW5kbGVkIEV4Y2VwdGlvbiB3YXMgY2F1Z2h0IGFuZCBzZW50IHZpYSBSYXZlbjpcIik7XG4gICAgICAgIGNvbnNvbGUuZGlyKGVycik7XG4gICAgfVxuICAgICovXG59KVxuXG5leHBvcnQgZGVmYXVsdCB7IEFwcGxpY2F0aW9uIH1cbiIsImltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnXG5cbmV4cG9ydCBjbGFzcyBBdWRpb0NhcHR1cmUge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICAvLyBzcGF3biBiYWNrZ3JvdW5kIHdvcmtlclxuICAgICAgICB0aGlzLl9lbmNvZGluZ1dvcmtlciA9IG5ldyBXb3JrZXIoXCIvYXNzZXRzL2pzL3dvcmtlci1lbmNvZGVyLm1pbi5qc1wiKTtcblxuICAgICAgICBjb25zb2xlLmxvZyhcIkluaXRpYWxpemVkIEF1ZGlvQ2FwdHVyZVwiKTtcblxuICAgICAgICBfLmV4dGVuZCh0aGlzLCB7XG4gICAgICAgICAgICBfYXVkaW9Db250ZXh0OiBudWxsLFxuICAgICAgICAgICAgX2F1ZGlvSW5wdXQ6IG51bGwsXG4gICAgICAgICAgICBfZW5jb2RpbmdXb3JrZXI6IG51bGwsXG4gICAgICAgICAgICBfaXNSZWNvcmRpbmc6IGZhbHNlLFxuICAgICAgICAgICAgX2F1ZGlvTGlzdGVuZXI6IG51bGwsXG4gICAgICAgICAgICBfb25DYXB0dXJlQ29tcGxldGVDYWxsYmFjazogbnVsbCxcbiAgICAgICAgICAgIF9hdWRpb0FuYWx5emVyOiBudWxsLFxuICAgICAgICAgICAgX2F1ZGlvR2FpbjogbnVsbCxcbiAgICAgICAgICAgIF9jYWNoZWRNZWRpYVN0cmVhbTogbnVsbCxcblxuICAgICAgICAgICAgX2F1ZGlvRW5jb2RlcjogbnVsbCxcbiAgICAgICAgICAgIF9sYXRlc3RBdWRpb0J1ZmZlcjogW10sXG4gICAgICAgICAgICBfY2FjaGVkR2FpblZhbHVlOiAxLFxuICAgICAgICAgICAgX29uU3RhcnRlZENhbGxiYWNrOiBudWxsLFxuXG4gICAgICAgICAgICBfZmZ0U2l6ZTogMjU2LFxuICAgICAgICAgICAgX2ZmdFNtb290aGluZzogMC44XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIFRPRE86IGZpcmVmb3gncyBidWlsdC1pbiBvZ2ctY3JlYXRpb24gcm91dGVcbiAgICAvLyBGaXJlZm94IDI3J3MgbWFudWFsIHJlY29yZGluZyBkb2Vzbid0IHdvcmsuIHNvbWV0aGluZyBmdW5ueSB3aXRoIHRoZWlyIHNhbXBsaW5nIHJhdGVzIG9yIGJ1ZmZlciBzaXplc1xuICAgIC8vIHRoZSBkYXRhIGlzIGZhaXJseSBnYXJibGVkLCBsaWtlIHRoZXkgYXJlIHNlcnZpbmcgMjJraHogYXMgNDRraHogb3Igc29tZXRoaW5nIGxpa2UgdGhhdFxuICAgIHN0YXJ0QXV0b21hdGljRW5jb2RpbmcobWVkaWFTdHJlYW0pIHtcbiAgICAgICAgdGhpcy5fYXVkaW9FbmNvZGVyID0gbmV3IE1lZGlhUmVjb3JkZXIobWVkaWFTdHJlYW0pO1xuXG4gICAgICAgIHRoaXMuX2F1ZGlvRW5jb2Rlci5vbmRhdGFhdmFpbGFibGUgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJBdWRpb0NhcHR1cmU6OnN0YXJ0TWFudWFsRW5jb2RpbmcoKTsgTWVkaWFSZWNvcmRlci5vbmRhdGFhdmFpbGFibGUoKTsgbmV3IGJsb2I6IHNpemU9XCIgKyBlLmRhdGEuc2l6ZSArIFwiIHR5cGU9XCIgKyBlLmRhdGEudHlwZSk7XG4gICAgICAgICAgICB0aGlzLl9sYXRlc3RBdWRpb0J1ZmZlci5wdXNoKGUuZGF0YSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5fYXVkaW9FbmNvZGVyLm9uc3RvcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQXVkaW9DYXB0dXJlOjpzdGFydE1hbnVhbEVuY29kaW5nKCk7IE1lZGlhUmVjb3JkZXIub25zdG9wKCk7IGhpdFwiKTtcblxuICAgICAgICAgICAgLy8gc2VuZCB0aGUgbGFzdCBjYXB0dXJlZCBhdWRpbyBidWZmZXJcbiAgICAgICAgICAgIHZhciBlbmNvZGVkX2Jsb2IgPSBuZXcgQmxvYih0aGlzLl9sYXRlc3RBdWRpb0J1ZmZlciwge3R5cGU6ICdhdWRpby9vZ2cnfSk7XG5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQXVkaW9DYXB0dXJlOjpzdGFydE1hbnVhbEVuY29kaW5nKCk7IE1lZGlhUmVjb3JkZXIub25zdG9wKCk7IGdvdCBlbmNvZGVkIGJsb2I6IHNpemU9XCIgKyBlbmNvZGVkX2Jsb2Iuc2l6ZSArIFwiIHR5cGU9XCIgKyBlbmNvZGVkX2Jsb2IudHlwZSk7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLl9vbkNhcHR1cmVDb21wbGV0ZUNhbGxiYWNrKVxuICAgICAgICAgICAgICAgIHRoaXMuX29uQ2FwdHVyZUNvbXBsZXRlQ2FsbGJhY2soZW5jb2RlZF9ibG9iKTtcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zb2xlLmxvZyhcIkF1ZGlvQ2FwdHVyZTo6c3RhcnRNYW51YWxFbmNvZGluZygpOyBNZWRpYVJlY29yZGVyLnN0YXJ0KClcIik7XG4gICAgICAgIHRoaXMuX2F1ZGlvRW5jb2Rlci5zdGFydCgwKTtcbiAgICB9XG5cbiAgICBjcmVhdGVBdWRpb0NvbnRleHQobWVkaWFTdHJlYW0pIHtcbiAgICAgICAgLy8gYnVpbGQgY2FwdHVyZSBncmFwaFxuICAgICAgICB2YXIgQXVkaW9Db250ZXh0Q3JlYXRvciA9IHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQgfHwgd2luZG93LkF1ZGlvQ29udGV4dDtcblxuICAgICAgICB0aGlzLl9hdWRpb0NvbnRleHQgPSBuZXcgQXVkaW9Db250ZXh0Q3JlYXRvcigpO1xuICAgICAgICB0aGlzLl9hdWRpb0lucHV0ID0gdGhpcy5fYXVkaW9Db250ZXh0LmNyZWF0ZU1lZGlhU3RyZWFtU291cmNlKG1lZGlhU3RyZWFtKTtcblxuICAgICAgICBjb25zb2xlLmxvZyhcIkF1ZGlvQ2FwdHVyZTo6c3RhcnRNYW51YWxFbmNvZGluZygpOyBfYXVkaW9Db250ZXh0LnNhbXBsZVJhdGU6IFwiICsgdGhpcy5fYXVkaW9Db250ZXh0LnNhbXBsZVJhdGUgKyBcIiBIelwiKTtcblxuICAgICAgICAvLyBjcmVhdGUgYSBsaXN0ZW5lciBub2RlIHRvIGdyYWIgbWljcm9waG9uZSBzYW1wbGVzIGFuZCBmZWVkIGl0IHRvIG91ciBiYWNrZ3JvdW5kIHdvcmtlclxuICAgICAgICB0aGlzLl9hdWRpb0xpc3RlbmVyID0gKHRoaXMuX2F1ZGlvQ29udGV4dC5jcmVhdGVTY3JpcHRQcm9jZXNzb3IgfHwgdGhpcy5fYXVkaW9Db250ZXh0LmNyZWF0ZUphdmFTY3JpcHROb2RlKS5jYWxsKHRoaXMuX2F1ZGlvQ29udGV4dCwgODE5MiwgMiwgMik7XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJ0aGlzLl9jYWNoZWRHYWluVmFsdWUgPSBcIiArIHRoaXMuX2NhY2hlZEdhaW5WYWx1ZSk7XG5cbiAgICAgICAgdGhpcy5fYXVkaW9HYWluID0gdGhpcy5fYXVkaW9Db250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICAgICAgdGhpcy5fYXVkaW9HYWluLmdhaW4udmFsdWUgPSB0aGlzLl9jYWNoZWRHYWluVmFsdWU7XG5cbiAgICAgICAgdGhpcy5fYXVkaW9BbmFseXplciA9IHRoaXMuX2F1ZGlvQ29udGV4dC5jcmVhdGVBbmFseXNlcigpO1xuICAgICAgICB0aGlzLl9hdWRpb0FuYWx5emVyLmZmdFNpemUgPSB0aGlzLl9mZnRTaXplO1xuICAgICAgICB0aGlzLl9hdWRpb0FuYWx5emVyLnNtb290aGluZ1RpbWVDb25zdGFudCA9IHRoaXMuX2ZmdFNtb290aGluZztcbiAgICB9XG5cbiAgICBzdGFydE1hbnVhbEVuY29kaW5nKG1lZGlhU3RyZWFtKSB7XG5cbiAgICAgICAgaWYgKCF0aGlzLl9hdWRpb0NvbnRleHQpIHtcbiAgICAgICAgICAgIHRoaXMuY3JlYXRlQXVkaW9Db250ZXh0KG1lZGlhU3RyZWFtKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdGhpcy5fZW5jb2RpbmdXb3JrZXIpXG4gICAgICAgICAgICB0aGlzLl9lbmNvZGluZ1dvcmtlciA9IG5ldyBXb3JrZXIoXCIvYXNzZXRzL2pzL3dvcmtlci1lbmNvZGVyLm1pbi5qc1wiKTtcblxuICAgICAgICAvLyByZS1ob29rIGF1ZGlvIGxpc3RlbmVyIG5vZGUgZXZlcnkgdGltZSB3ZSBzdGFydCwgYmVjYXVzZSBfZW5jb2RpbmdXb3JrZXIgcmVmZXJlbmNlIHdpbGwgY2hhbmdlXG4gICAgICAgIHRoaXMuX2F1ZGlvTGlzdGVuZXIub25hdWRpb3Byb2Nlc3MgPSAoZSkgPT4ge1xuICAgICAgICAgICAgaWYgKCF0aGlzLl9pc1JlY29yZGluZykgcmV0dXJuO1xuXG4gICAgICAgICAgICB2YXIgbXNnID0ge1xuICAgICAgICAgICAgICAgIGFjdGlvbjogXCJwcm9jZXNzXCIsXG5cbiAgICAgICAgICAgICAgICAvLyB0d28gRmxvYXQzMkFycmF5c1xuICAgICAgICAgICAgICAgIGxlZnQ6IGUuaW5wdXRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCksXG4gICAgICAgICAgICAgICAgcmlnaHQ6IGUuaW5wdXRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMSlcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHRoaXMuX2VuY29kaW5nV29ya2VyLnBvc3RNZXNzYWdlKG1zZyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gaGFuZGxlIG1lc3NhZ2VzIGZyb20gdGhlIGVuY29kaW5nLXdvcmtlclxuICAgICAgICB0aGlzLl9lbmNvZGluZ1dvcmtlci5vbm1lc3NhZ2UgPSAoZSkgPT4ge1xuXG4gICAgICAgICAgICAvLyB3b3JrZXIgZmluaXNoZWQgYW5kIGhhcyB0aGUgZmluYWwgZW5jb2RlZCBhdWRpbyBidWZmZXIgZm9yIHVzXG4gICAgICAgICAgICBpZiAoZS5kYXRhLmFjdGlvbiA9PT0gXCJlbmNvZGVkXCIpIHtcbiAgICAgICAgICAgICAgICB2YXIgZW5jb2RlZF9ibG9iID0gbmV3IEJsb2IoW2UuZGF0YS5idWZmZXJdLCB7dHlwZTogJ2F1ZGlvL29nZyd9KTtcblxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZ290IGVuY29kZWQgYmxvYjogc2l6ZT1cIiArIGVuY29kZWRfYmxvYi5zaXplICsgXCIgdHlwZT1cIiArIGVuY29kZWRfYmxvYi50eXBlKTtcblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9vbkNhcHR1cmVDb21wbGV0ZUNhbGxiYWNrKVxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9vbkNhcHR1cmVDb21wbGV0ZUNhbGxiYWNrKGVuY29kZWRfYmxvYik7XG5cbiAgICAgICAgICAgICAgICAvLyB3b3JrZXIgaGFzIGV4aXRlZCwgdW5yZWZlcmVuY2UgaXRcbiAgICAgICAgICAgICAgICB0aGlzLl9lbmNvZGluZ1dvcmtlciA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gY29uZmlndXJlIHdvcmtlciB3aXRoIGEgc2FtcGxpbmcgcmF0ZSBhbmQgYnVmZmVyLXNpemVcbiAgICAgICAgdGhpcy5fZW5jb2RpbmdXb3JrZXIucG9zdE1lc3NhZ2Uoe1xuICAgICAgICAgICAgYWN0aW9uOiBcImluaXRpYWxpemVcIixcbiAgICAgICAgICAgIHNhbXBsZV9yYXRlOiB0aGlzLl9hdWRpb0NvbnRleHQuc2FtcGxlUmF0ZSxcbiAgICAgICAgICAgIGJ1ZmZlcl9zaXplOiB0aGlzLl9hdWRpb0xpc3RlbmVyLmJ1ZmZlclNpemVcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVE9ETzogaXQgbWlnaHQgYmUgYmV0dGVyIHRvIGxpc3RlbiBmb3IgYSBtZXNzYWdlIGJhY2sgZnJvbSB0aGUgYmFja2dyb3VuZCB3b3JrZXIgYmVmb3JlIGNvbnNpZGVyaW5nIHRoYXQgcmVjb3JkaW5nIGhhcyBiZWdhblxuICAgICAgICAvLyBpdCdzIGVhc2llciB0byB0cmltIGF1ZGlvIHRoYW4gY2FwdHVyZSBhIG1pc3Npbmcgd29yZCBhdCB0aGUgc3RhcnQgb2YgYSBzZW50ZW5jZVxuICAgICAgICB0aGlzLl9pc1JlY29yZGluZyA9IGZhbHNlO1xuXG4gICAgICAgIC8vIGNvbm5lY3QgYXVkaW8gbm9kZXNcbiAgICAgICAgLy8gYXVkaW8taW5wdXQgLT4gZ2FpbiAtPiBmZnQtYW5hbHl6ZXIgLT4gUENNLWRhdGEgY2FwdHVyZSAtPiBkZXN0aW5hdGlvblxuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiQXVkaW9DYXB0dXJlOjpzdGFydE1hbnVhbEVuY29kaW5nKCk7IENvbm5lY3RpbmcgQXVkaW8gTm9kZXMuLlwiKTtcblxuICAgICAgICBjb25zb2xlLmxvZyhcImlucHV0LT5nYWluXCIpO1xuICAgICAgICB0aGlzLl9hdWRpb0lucHV0LmNvbm5lY3QodGhpcy5fYXVkaW9HYWluKTtcbiAgICAgICAgY29uc29sZS5sb2coXCJnYWluLT5hbmFseXplclwiKTtcbiAgICAgICAgdGhpcy5fYXVkaW9HYWluLmNvbm5lY3QodGhpcy5fYXVkaW9BbmFseXplcik7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiYW5hbHl6ZXItPmxpc3Rlc25lclwiKTtcbiAgICAgICAgdGhpcy5fYXVkaW9BbmFseXplci5jb25uZWN0KHRoaXMuX2F1ZGlvTGlzdGVuZXIpO1xuICAgICAgICBjb25zb2xlLmxvZyhcImxpc3RlbmVyLT5kZXN0aW5hdGlvblwiKTtcbiAgICAgICAgdGhpcy5fYXVkaW9MaXN0ZW5lci5jb25uZWN0KHRoaXMuX2F1ZGlvQ29udGV4dC5kZXN0aW5hdGlvbik7XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgc2h1dGRvd25NYW51YWxFbmNvZGluZygpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJBdWRpb0NhcHR1cmU6OnNodXRkb3duTWFudWFsRW5jb2RpbmcoKTsgVGVhcmluZyBkb3duIEF1ZGlvQVBJIGNvbm5lY3Rpb25zLi5cIik7XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJsaXN0ZW5lci0+ZGVzdGluYXRpb25cIik7XG4gICAgICAgIHRoaXMuX2F1ZGlvTGlzdGVuZXIuZGlzY29ubmVjdCh0aGlzLl9hdWRpb0NvbnRleHQuZGVzdGluYXRpb24pO1xuICAgICAgICBjb25zb2xlLmxvZyhcImFuYWx5emVyLT5saXN0ZXNuZXJcIik7XG4gICAgICAgIHRoaXMuX2F1ZGlvQW5hbHl6ZXIuZGlzY29ubmVjdCh0aGlzLl9hdWRpb0xpc3RlbmVyKTtcbiAgICAgICAgY29uc29sZS5sb2coXCJnYWluLT5hbmFseXplclwiKTtcbiAgICAgICAgdGhpcy5fYXVkaW9HYWluLmRpc2Nvbm5lY3QodGhpcy5fYXVkaW9BbmFseXplcik7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiaW5wdXQtPmdhaW5cIik7XG4gICAgICAgIHRoaXMuX2F1ZGlvSW5wdXQuZGlzY29ubmVjdCh0aGlzLl9hdWRpb0dhaW4pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRoZSBtaWNyb3Bob25lIG1heSBiZSBsaXZlLCBidXQgaXQgaXNuJ3QgcmVjb3JkaW5nLiBUaGlzIHRvZ2dsZXMgdGhlIGFjdHVhbCB3cml0aW5nIHRvIHRoZSBjYXB0dXJlIHN0cmVhbS5cbiAgICAgKiBjYXB0dXJlQXVkaW9TYW1wbGVzIGJvb2wgaW5kaWNhdGVzIHdoZXRoZXIgdG8gcmVjb3JkIGZyb20gbWljXG4gICAgICovXG4gICAgdG9nZ2xlTWljcm9waG9uZVJlY29yZGluZyhjYXB0dXJlQXVkaW9TYW1wbGVzKSB7XG4gICAgICAgIHRoaXMuX2lzUmVjb3JkaW5nID0gY2FwdHVyZUF1ZGlvU2FtcGxlcztcbiAgICB9XG5cbiAgICAvLyBjYWxsZWQgd2hlbiB1c2VyIGFsbG93cyB1cyB1c2Ugb2YgdGhlaXIgbWljcm9waG9uZVxuICAgIG9uTWljcm9waG9uZVByb3ZpZGVkKG1lZGlhU3RyZWFtKSB7XG5cbiAgICAgICAgdGhpcy5fY2FjaGVkTWVkaWFTdHJlYW0gPSBtZWRpYVN0cmVhbTtcblxuICAgICAgICAvLyB3ZSBjb3VsZCBjaGVjayBpZiB0aGUgYnJvd3NlciBjYW4gcGVyZm9ybSBpdHMgb3duIGVuY29kaW5nIGFuZCB1c2UgdGhhdFxuICAgICAgICAvLyBGaXJlZm94IGNhbiBwcm92aWRlIHVzIG9nZytzcGVleCBvciBvZ2crb3B1cz8gZmlsZXMsIGJ1dCB1bmZvcnR1bmF0ZWx5IHRoYXQgY29kZWMgaXNuJ3Qgc3VwcG9ydGVkIHdpZGVseSBlbm91Z2hcbiAgICAgICAgLy8gc28gaW5zdGVhZCB3ZSBwZXJmb3JtIG1hbnVhbCBlbmNvZGluZyBldmVyeXdoZXJlIHJpZ2h0IG5vdyB0byBnZXQgdXMgb2dnK3ZvcmJpc1xuICAgICAgICAvLyB0aG91Z2ggb25lIGRheSwgaSB3YW50IG9nZytvcHVzISBvcHVzIGhhcyBhIHdvbmRlcmZ1bCByYW5nZSBvZiBxdWFsaXR5IHNldHRpbmdzIHBlcmZlY3QgZm9yIHRoaXMgcHJvamVjdFxuXG4gICAgICAgIGlmIChmYWxzZSAmJiB0eXBlb2YoTWVkaWFSZWNvcmRlcikgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICAgIHRoaXMuc3RhcnRBdXRvbWF0aWNFbmNvZGluZyhtZWRpYVN0cmVhbSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBubyBtZWRpYSByZWNvcmRlciBhdmFpbGFibGUsIGRvIGl0IG1hbnVhbGx5XG4gICAgICAgICAgICB0aGlzLnN0YXJ0TWFudWFsRW5jb2RpbmcobWVkaWFTdHJlYW0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVE9ETzogbWlnaHQgYmUgYSBnb29kIHRpbWUgdG8gc3RhcnQgYSBzcGVjdHJhbCBhbmFseXplclxuICAgICAgICBpZiAodGhpcy5fb25TdGFydGVkQ2FsbGJhY2spXG4gICAgICAgICAgICB0aGlzLl9vblN0YXJ0ZWRDYWxsYmFjaygpO1xuICAgIH1cblxuICAgIHNldEdhaW4oZ2Fpbikge1xuICAgICAgICBpZiAodGhpcy5fYXVkaW9HYWluKVxuICAgICAgICAgICAgdGhpcy5fYXVkaW9HYWluLmdhaW4udmFsdWUgPSBnYWluO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwic2V0dGluZyBnYWluOiBcIiArIGdhaW4pO1xuICAgICAgICB0aGlzLl9jYWNoZWRHYWluVmFsdWUgPSBnYWluO1xuICAgIH1cblxuICAgIHByZWxvYWRNZWRpYVN0cmVhbSgpIHtcbiAgICAgICAgaWYgKHRoaXMuX2NhY2hlZE1lZGlhU3RyZWFtKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgICBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzID0gbmF2aWdhdG9yLm1lZGlhRGV2aWNlcyB8fCAoKG5hdmlnYXRvci5tb3pHZXRVc2VyTWVkaWEgfHwgbmF2aWdhdG9yLndlYmtpdEdldFVzZXJNZWRpYSkgPyB7XG4gICAgICAgICAgICAgICAgZ2V0VXNlck1lZGlhOiBmdW5jdGlvbiAoYykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHksIG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIChuYXZpZ2F0b3IubW96R2V0VXNlck1lZGlhIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICBuYXZpZ2F0b3Iud2Via2l0R2V0VXNlck1lZGlhKS5jYWxsKG5hdmlnYXRvciwgYywgeSwgbik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gOiBudWxsKTtcblxuICAgICAgICBpZiAoIW5hdmlnYXRvci5tZWRpYURldmljZXMpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihcInN0YXJ0KCk7IGdldFVzZXJNZWRpYSgpIG5vdCBzdXBwb3J0ZWQuXCIpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgbmF2aWdhdG9yLm1lZGlhRGV2aWNlc1xuICAgICAgICAgICAgLmdldFVzZXJNZWRpYSh7YXVkaW86IHRydWV9KVxuICAgICAgICAgICAgLnRoZW4oKG1zKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fY2FjaGVkTWVkaWFTdHJlYW0gPSBtcztcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQXVkaW9DYXB0dXJlOjpzdGFydCgpOyBjb3VsZCBub3QgZ3JhYiBtaWNyb3Bob25lLiBwZXJoYXBzIHVzZXIgZGlkbid0IGdpdmUgdXMgcGVybWlzc2lvbj9cIik7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGVycik7XG4gICAgICAgICAgICB9KVxuICAgIH07XG5cbiAgICBzdGFydChvblN0YXJ0ZWRDYWxsYmFjaykge1xuXG4gICAgICAgIHRoaXMuX29uU3RhcnRlZENhbGxiYWNrID0gb25TdGFydGVkQ2FsbGJhY2s7XG5cbiAgICAgICAgaWYgKHRoaXMuX2NhY2hlZE1lZGlhU3RyZWFtKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMub25NaWNyb3Bob25lUHJvdmlkZWQodGhpcy5fY2FjaGVkTWVkaWFTdHJlYW0pO1xuXG4gICAgICAgIG5hdmlnYXRvci5tZWRpYURldmljZXMgPSBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzIHx8ICgobmF2aWdhdG9yLm1vekdldFVzZXJNZWRpYSB8fCBuYXZpZ2F0b3Iud2Via2l0R2V0VXNlck1lZGlhKSA/IHtcbiAgICAgICAgICAgICAgICBnZXRVc2VyTWVkaWE6IGZ1bmN0aW9uIChjKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAoeSwgbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgKG5hdmlnYXRvci5tb3pHZXRVc2VyTWVkaWEgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hdmlnYXRvci53ZWJraXRHZXRVc2VyTWVkaWEpLmNhbGwobmF2aWdhdG9yLCBjLCB5LCBuKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSA6IG51bGwpO1xuXG4gICAgICAgIGlmICghbmF2aWdhdG9yLm1lZGlhRGV2aWNlcykge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKFwic3RhcnQoKTsgZ2V0VXNlck1lZGlhKCkgbm90IHN1cHBvcnRlZC5cIik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzXG4gICAgICAgICAgICAuZ2V0VXNlck1lZGlhKHthdWRpbzogdHJ1ZX0pXG4gICAgICAgICAgICAudGhlbigobXMpID0+IHRoaXMub25NaWNyb3Bob25lUHJvdmlkZWQobXMpKVxuICAgICAgICAgICAgLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkF1ZGlvQ2FwdHVyZTo6c3RhcnQoKTsgY291bGQgbm90IGdyYWIgbWljcm9waG9uZS4gcGVyaGFwcyB1c2VyIGRpZG4ndCBnaXZlIHVzIHBlcm1pc3Npb24/XCIpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihlcnIpO1xuICAgICAgICAgICAgfSlcblxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBzdG9wKGNhcHR1cmVDb21wbGV0ZUNhbGxiYWNrKSB7XG4gICAgICAgIHRoaXMuX29uQ2FwdHVyZUNvbXBsZXRlQ2FsbGJhY2sgPSBjYXB0dXJlQ29tcGxldGVDYWxsYmFjaztcbiAgICAgICAgdGhpcy5faXNSZWNvcmRpbmcgPSBmYWxzZTtcblxuICAgICAgICBpZiAodGhpcy5fYXVkaW9Db250ZXh0KSB7XG4gICAgICAgICAgICAvLyBzdG9wIHRoZSBtYW51YWwgZW5jb2RlclxuICAgICAgICAgICAgdGhpcy5fZW5jb2RpbmdXb3JrZXIucG9zdE1lc3NhZ2Uoe2FjdGlvbjogXCJmaW5pc2hcIn0pO1xuICAgICAgICAgICAgdGhpcy5zaHV0ZG93bk1hbnVhbEVuY29kaW5nKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5fYXVkaW9FbmNvZGVyKSB7XG4gICAgICAgICAgICAvLyBzdG9wIHRoZSBhdXRvbWF0aWMgZW5jb2RlclxuXG4gICAgICAgICAgICBpZiAodGhpcy5fYXVkaW9FbmNvZGVyLnN0YXRlICE9PSAncmVjb3JkaW5nJykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihcIkF1ZGlvQ2FwdHVyZTo6c3RvcCgpOyBfYXVkaW9FbmNvZGVyLnN0YXRlICE9ICdyZWNvcmRpbmcnXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLl9hdWRpb0VuY29kZXIucmVxdWVzdERhdGEoKTtcbiAgICAgICAgICAgIHRoaXMuX2F1ZGlvRW5jb2Rlci5zdG9wKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUT0RPOiBzdG9wIGFueSBhY3RpdmUgc3BlY3RyYWwgYW5hbHlzaXNcbiAgICB9O1xufVxuXG4vLyB1bnVzZWQgYXQgdGhlIG1vbWVudFxuZnVuY3Rpb24gQW5hbHl6ZXIoKSB7XG5cbiAgICB2YXIgX2F1ZGlvQ2FudmFzQW5pbWF0aW9uSWQsXG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzXG4gICAgICAgIDtcblxuICAgIHRoaXMuc3RhcnRBbmFseXplclVwZGF0ZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHVwZGF0ZUFuYWx5emVyKCk7XG4gICAgfTtcblxuICAgIHRoaXMuc3RvcEFuYWx5emVyVXBkYXRlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCFfYXVkaW9DYW52YXNBbmltYXRpb25JZClcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUoX2F1ZGlvQ2FudmFzQW5pbWF0aW9uSWQpO1xuICAgICAgICBfYXVkaW9DYW52YXNBbmltYXRpb25JZCA9IG51bGw7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIHVwZGF0ZUFuYWx5emVyKCkge1xuXG4gICAgICAgIGlmICghX2F1ZGlvU3BlY3RydW1DYW52YXMpXG4gICAgICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicmVjb3JkaW5nLXZpc3VhbGl6ZXJcIikuZ2V0Q29udGV4dChcIjJkXCIpO1xuXG4gICAgICAgIHZhciBmcmVxRGF0YSA9IG5ldyBVaW50OEFycmF5KF9hdWRpb0FuYWx5emVyLmZyZXF1ZW5jeUJpbkNvdW50KTtcbiAgICAgICAgX2F1ZGlvQW5hbHl6ZXIuZ2V0Qnl0ZUZyZXF1ZW5jeURhdGEoZnJlcURhdGEpO1xuXG4gICAgICAgIHZhciBudW1CYXJzID0gX2F1ZGlvQW5hbHl6ZXIuZnJlcXVlbmN5QmluQ291bnQ7XG4gICAgICAgIHZhciBiYXJXaWR0aCA9IE1hdGguZmxvb3IoX2NhbnZhc1dpZHRoIC8gbnVtQmFycykgLSBfZmZ0QmFyU3BhY2luZztcblxuXG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbiA9IFwic291cmNlLW92ZXJcIjtcblxuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5jbGVhclJlY3QoMCwgMCwgX2NhbnZhc1dpZHRoLCBfY2FudmFzSGVpZ2h0KTtcbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZmlsbFN0eWxlID0gJyNmNmQ1NjUnO1xuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5saW5lQ2FwID0gJ3JvdW5kJztcblxuICAgICAgICB2YXIgeCwgeSwgdywgaDtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG51bUJhcnM7IGkrKykge1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gZnJlcURhdGFbaV07XG4gICAgICAgICAgICB2YXIgc2NhbGVkX3ZhbHVlID0gKHZhbHVlIC8gMjU2KSAqIF9jYW52YXNIZWlnaHQ7XG5cbiAgICAgICAgICAgIHggPSBpICogKGJhcldpZHRoICsgX2ZmdEJhclNwYWNpbmcpO1xuICAgICAgICAgICAgeSA9IF9jYW52YXNIZWlnaHQgLSBzY2FsZWRfdmFsdWU7XG4gICAgICAgICAgICB3ID0gYmFyV2lkdGg7XG4gICAgICAgICAgICBoID0gc2NhbGVkX3ZhbHVlO1xuXG4gICAgICAgICAgICB2YXIgZ3JhZGllbnQgPSBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5jcmVhdGVMaW5lYXJHcmFkaWVudCh4LCBfY2FudmFzSGVpZ2h0LCB4LCB5KTtcbiAgICAgICAgICAgIGdyYWRpZW50LmFkZENvbG9yU3RvcCgxLjAsIFwicmdiYSgwLDAsMCwxLjApXCIpO1xuICAgICAgICAgICAgZ3JhZGllbnQuYWRkQ29sb3JTdG9wKDAuMCwgXCJyZ2JhKDAsMCwwLDEuMClcIik7XG5cbiAgICAgICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmZpbGxTdHlsZSA9IGdyYWRpZW50O1xuICAgICAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZmlsbFJlY3QoeCwgeSwgdywgaCk7XG5cbiAgICAgICAgICAgIGlmIChzY2FsZWRfdmFsdWUgPiBfaGl0SGVpZ2h0c1tpXSkge1xuICAgICAgICAgICAgICAgIF9oaXRWZWxvY2l0aWVzW2ldICs9IChzY2FsZWRfdmFsdWUgLSBfaGl0SGVpZ2h0c1tpXSkgKiA2O1xuICAgICAgICAgICAgICAgIF9oaXRIZWlnaHRzW2ldID0gc2NhbGVkX3ZhbHVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBfaGl0VmVsb2NpdGllc1tpXSAtPSA0O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBfaGl0SGVpZ2h0c1tpXSArPSBfaGl0VmVsb2NpdGllc1tpXSAqIDAuMDE2O1xuXG4gICAgICAgICAgICBpZiAoX2hpdEhlaWdodHNbaV0gPCAwKVxuICAgICAgICAgICAgICAgIF9oaXRIZWlnaHRzW2ldID0gMDtcbiAgICAgICAgfVxuXG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbiA9IFwic291cmNlLWF0b3BcIjtcbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZHJhd0ltYWdlKF9jYW52YXNCZywgMCwgMCk7XG5cbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uID0gXCJzb3VyY2Utb3ZlclwiO1xuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5maWxsU3R5bGUgPSBcInJnYmEoMjU1LDI1NSwyNTUsMC43KVwiO1xuXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBudW1CYXJzOyBpKyspIHtcbiAgICAgICAgICAgIHggPSBpICogKGJhcldpZHRoICsgX2ZmdEJhclNwYWNpbmcpO1xuICAgICAgICAgICAgeSA9IF9jYW52YXNIZWlnaHQgLSBNYXRoLnJvdW5kKF9oaXRIZWlnaHRzW2ldKSAtIDI7XG4gICAgICAgICAgICB3ID0gYmFyV2lkdGg7XG4gICAgICAgICAgICBoID0gYmFyV2lkdGg7XG5cbiAgICAgICAgICAgIGlmIChfaGl0SGVpZ2h0c1tpXSA9PT0gMClcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcblxuICAgICAgICAgICAgLy9fYXVkaW9TcGVjdHJ1bUNhbnZhcy5maWxsU3R5bGUgPSBcInJnYmEoMjU1LCAyNTUsIDI1NSxcIisgTWF0aC5tYXgoMCwgMSAtIE1hdGguYWJzKF9oaXRWZWxvY2l0aWVzW2ldLzE1MCkpICsgXCIpXCI7XG4gICAgICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5maWxsUmVjdCh4LCB5LCB3LCBoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIF9hdWRpb0NhbnZhc0FuaW1hdGlvbklkID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSh1cGRhdGVBbmFseXplcik7XG4gICAgfVxuXG4gICAgdmFyIF9jYW52YXNXaWR0aCwgX2NhbnZhc0hlaWdodDtcbiAgICB2YXIgX2ZmdFNpemUgPSAyNTY7XG4gICAgdmFyIF9mZnRTbW9vdGhpbmcgPSAwLjg7XG4gICAgdmFyIF9mZnRCYXJTcGFjaW5nID0gMTtcblxuICAgIHZhciBfaGl0SGVpZ2h0cyA9IFtdO1xuICAgIHZhciBfaGl0VmVsb2NpdGllcyA9IFtdO1xuXG4gICAgdGhpcy50ZXN0Q2FudmFzID0gZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIHZhciBjYW52YXNDb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInJlY29yZGluZy12aXN1YWxpemVyXCIpO1xuXG4gICAgICAgIF9jYW52YXNXaWR0aCA9IGNhbnZhc0NvbnRhaW5lci53aWR0aDtcbiAgICAgICAgX2NhbnZhc0hlaWdodCA9IGNhbnZhc0NvbnRhaW5lci5oZWlnaHQ7XG5cbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMgPSBjYW52YXNDb250YWluZXIuZ2V0Q29udGV4dChcIjJkXCIpO1xuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb24gPSBcInNvdXJjZS1vdmVyXCI7XG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmZpbGxTdHlsZSA9IFwicmdiYSgwLDAsMCwwKVwiO1xuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5maWxsUmVjdCgwLCAwLCBfY2FudmFzV2lkdGgsIF9jYW52YXNIZWlnaHQpO1xuXG4gICAgICAgIHZhciBudW1CYXJzID0gX2ZmdFNpemUgLyAyO1xuICAgICAgICB2YXIgYmFyU3BhY2luZyA9IF9mZnRCYXJTcGFjaW5nO1xuICAgICAgICB2YXIgYmFyV2lkdGggPSBNYXRoLmZsb29yKF9jYW52YXNXaWR0aCAvIG51bUJhcnMpIC0gYmFyU3BhY2luZztcblxuICAgICAgICB2YXIgeCwgeSwgdywgaCwgaTtcblxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbnVtQmFyczsgaSsrKSB7XG4gICAgICAgICAgICBfaGl0SGVpZ2h0c1tpXSA9IF9jYW52YXNIZWlnaHQgLSAxO1xuICAgICAgICAgICAgX2hpdFZlbG9jaXRpZXNbaV0gPSAwO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IG51bUJhcnM7IGkrKykge1xuICAgICAgICAgICAgdmFyIHNjYWxlZF92YWx1ZSA9IE1hdGguYWJzKE1hdGguc2luKE1hdGguUEkgKiA2ICogKGkgLyBudW1CYXJzKSkpICogX2NhbnZhc0hlaWdodDtcblxuICAgICAgICAgICAgeCA9IGkgKiAoYmFyV2lkdGggKyBiYXJTcGFjaW5nKTtcbiAgICAgICAgICAgIHkgPSBfY2FudmFzSGVpZ2h0IC0gc2NhbGVkX3ZhbHVlO1xuICAgICAgICAgICAgdyA9IGJhcldpZHRoO1xuICAgICAgICAgICAgaCA9IHNjYWxlZF92YWx1ZTtcblxuICAgICAgICAgICAgdmFyIGdyYWRpZW50ID0gX2F1ZGlvU3BlY3RydW1DYW52YXMuY3JlYXRlTGluZWFyR3JhZGllbnQoeCwgX2NhbnZhc0hlaWdodCwgeCwgeSk7XG4gICAgICAgICAgICBncmFkaWVudC5hZGRDb2xvclN0b3AoMS4wLCBcInJnYmEoMCwwLDAsMC4wKVwiKTtcbiAgICAgICAgICAgIGdyYWRpZW50LmFkZENvbG9yU3RvcCgwLjAsIFwicmdiYSgwLDAsMCwxLjApXCIpO1xuXG4gICAgICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5maWxsU3R5bGUgPSBncmFkaWVudDtcbiAgICAgICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmZpbGxSZWN0KHgsIHksIHcsIGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uID0gXCJzb3VyY2UtYXRvcFwiO1xuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5kcmF3SW1hZ2UoX2NhbnZhc0JnLCAwLCAwKTtcblxuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb24gPSBcInNvdXJjZS1vdmVyXCI7XG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmZpbGxTdHlsZSA9IFwiI2ZmZmZmZlwiO1xuXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBudW1CYXJzOyBpKyspIHtcbiAgICAgICAgICAgIHggPSBpICogKGJhcldpZHRoICsgYmFyU3BhY2luZyk7XG4gICAgICAgICAgICB5ID0gX2NhbnZhc0hlaWdodCAtIF9oaXRIZWlnaHRzW2ldO1xuICAgICAgICAgICAgdyA9IGJhcldpZHRoO1xuICAgICAgICAgICAgaCA9IDI7XG5cbiAgICAgICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmZpbGxSZWN0KHgsIHksIHcsIGgpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciBfc2NvcGUgPSB0aGlzO1xuXG4gICAgdmFyIF9jYW52YXNCZyA9IG5ldyBJbWFnZSgpO1xuICAgIF9jYW52YXNCZy5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIF9zY29wZS50ZXN0Q2FudmFzKCk7XG4gICAgfTtcbiAgICAvL19jYW52YXNCZy5zcmMgPSBcIi9pbWcvYmc1cy5qcGdcIjtcbiAgICBfY2FudmFzQmcuc3JjID0gXCIvaW1nL2JnNi13aWRlLmpwZ1wiO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgY2xhc3MgU291bmRQbGF5ZXIge1xuICAgIHN0YXRpYyBjcmVhdGUgKG1vZGVsKSB7XG4gICAgICAgIHZhciByZXN1bWVQb3NpdGlvbiA9IHBhcnNlSW50KG1vZGVsLmdldCgncG9zaXRpb24nKSB8fCAwKTtcblxuICAgICAgICBjb25zb2xlLmxvZyhcIkNyZWF0aW5nIHNvdW5kIHBsYXllciBmb3IgbW9kZWw6XCIsIG1vZGVsKTtcblxuICAgICAgICByZXR1cm4gc291bmRNYW5hZ2VyLmNyZWF0ZVNvdW5kKHtcbiAgICAgICAgICAgIGlkOiBtb2RlbC5pZCxcbiAgICAgICAgICAgIHVybDogbW9kZWwudXJsLFxuICAgICAgICAgICAgdm9sdW1lOiAxMDAsXG4gICAgICAgICAgICBhdXRvTG9hZDogdHJ1ZSxcbiAgICAgICAgICAgIGF1dG9QbGF5OiBmYWxzZSxcbiAgICAgICAgICAgIGZyb206IHJlc3VtZVBvc2l0aW9uLFxuICAgICAgICAgICAgd2hpbGVsb2FkaW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJsb2FkZWQ6IFwiICsgdGhpcy5ieXRlc0xvYWRlZCArIFwiIG9mIFwiICsgdGhpcy5ieXRlc1RvdGFsKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbmxvYWQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnU291bmQ7IGF1ZGlvIGxvYWRlZDsgcG9zaXRpb24gPSAnICsgcmVzdW1lUG9zaXRpb24gKyAnLCBkdXJhdGlvbiA9ICcgKyB0aGlzLmR1cmF0aW9uKTtcblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmR1cmF0aW9uID09IG51bGwgfHwgdGhpcy5kdXJhdGlvbiA9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZHVyYXRpb24gaXMgbnVsbFwiKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICgocmVzdW1lUG9zaXRpb24gKyAxMCkgPiB0aGlzLmR1cmF0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHRoZSB0cmFjayBpcyBwcmV0dHkgbXVjaCBjb21wbGV0ZSwgbG9vcCBpdFxuICAgICAgICAgICAgICAgICAgICAvLyBGSVhNRTogdGhpcyBzaG91bGQgYWN0dWFsbHkgaGFwcGVuIGVhcmxpZXIsIHdlIHNob3VsZCBrbm93IHRoYXQgdGhlIGFjdGlvbiB3aWxsIGNhdXNlIGEgcmV3aW5kXG4gICAgICAgICAgICAgICAgICAgIC8vICAgICAgICBhbmQgaW5kaWNhdGUgdGhlIHJld2luZCB2aXN1YWxseSBzbyB0aGVyZSBpcyBubyBzdXJwcmlzZVxuICAgICAgICAgICAgICAgICAgICByZXN1bWVQb3NpdGlvbiA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdTb3VuZDsgdHJhY2sgbmVlZGVkIGEgcmV3aW5kJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gRklYTUU6IHJlc3VtZSBjb21wYXRpYmlsaXR5IHdpdGggdmFyaW91cyBicm93c2Vyc1xuICAgICAgICAgICAgICAgIC8vIEZJWE1FOiBzb21ldGltZXMgeW91IHJlc3VtZSBhIGZpbGUgYWxsIHRoZSB3YXkgYXQgdGhlIGVuZCwgc2hvdWxkIGxvb3AgdGhlbSBhcm91bmRcbiAgICAgICAgICAgICAgICB0aGlzLnNldFBvc2l0aW9uKHJlc3VtZVBvc2l0aW9uKTtcbiAgICAgICAgICAgICAgICB0aGlzLnBsYXkoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB3aGlsZXBsYXlpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgcHJvZ3Jlc3MgPSAodGhpcy5kdXJhdGlvbiA+IDAgPyAxMDAgKiB0aGlzLnBvc2l0aW9uIC8gdGhpcy5kdXJhdGlvbiA6IDApLnRvRml4ZWQoMCkgKyAnJSc7XG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJxdWlwOlwiICsgdGhpcy5pZCArIFwiOnByb2dyZXNzXCIsIHByb2dyZXNzKTtcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcInF1aXA6XCIgKyB0aGlzLmlkICsgXCI6cG9zaXRpb25cIiwgdGhpcy5wb3NpdGlvbi50b0ZpeGVkKDApKTtcbiAgICAgICAgICAgICAgICBtb2RlbC5zZXQoeydwcm9ncmVzcyc6IHByb2dyZXNzfSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25wYXVzZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiU291bmQ7IHBhdXNlZDogXCIgKyB0aGlzLmlkKTtcbiAgICAgICAgICAgICAgICB2YXIgcG9zaXRpb24gPSB0aGlzLnBvc2l0aW9uID8gdGhpcy5wb3NpdGlvbi50b0ZpeGVkKDApIDogMDtcbiAgICAgICAgICAgICAgICB2YXIgcHJvZ3Jlc3MgPSAodGhpcy5kdXJhdGlvbiA+IDAgPyAxMDAgKiBwb3NpdGlvbiAvIHRoaXMuZHVyYXRpb24gOiAwKS50b0ZpeGVkKDApICsgJyUnO1xuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwicXVpcDpcIiArIHRoaXMuaWQgKyBcIjpwcm9ncmVzc1wiLCBwcm9ncmVzcyk7XG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJxdWlwOlwiICsgdGhpcy5pZCArIFwiOnBvc2l0aW9uXCIsIHBvc2l0aW9uKTtcbiAgICAgICAgICAgICAgICBtb2RlbC5zZXQoeydwcm9ncmVzcyc6IHByb2dyZXNzfSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25maW5pc2g6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlNvdW5kOyBmaW5pc2hlZCBwbGF5aW5nOiBcIiArIHRoaXMuaWQpO1xuXG4gICAgICAgICAgICAgICAgLy8gc3RvcmUgY29tcGxldGlvbiBpbiBicm93c2VyXG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJxdWlwOlwiICsgdGhpcy5pZCArIFwiOnByb2dyZXNzXCIsICcxMDAlJyk7XG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJxdWlwOlwiICsgdGhpcy5pZCArIFwiOnBvc2l0aW9uXCIsIHRoaXMuZHVyYXRpb24udG9GaXhlZCgwKSk7XG4gICAgICAgICAgICAgICAgbW9kZWwuc2V0KHsncHJvZ3Jlc3MnOiAnMTAwJSd9KTtcblxuICAgICAgICAgICAgICAgIC8vIFRPRE86IHVubG9jayBzb21lIHNvcnQgb2YgYWNoaWV2ZW1lbnQgZm9yIGZpbmlzaGluZyB0aGlzIHRyYWNrLCBtYXJrIGl0IGEgZGlmZiBjb2xvciwgZXRjXG4gICAgICAgICAgICAgICAgLy8gVE9ETzogdGhpcyBpcyBhIGdvb2QgcGxhY2UgdG8gZmlyZSBhIGhvb2sgdG8gYSBwbGF5YmFjayBtYW5hZ2VyIHRvIG1vdmUgb250byB0aGUgbmV4dCBhdWRpbyBjbGlwXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgfVxufVxuIiwiaW1wb3J0IEJhY2tib25lIGZyb20gJ2JhY2tib25lJ1xuaW1wb3J0IHsgUXVpcE1vZGVsLCBRdWlwVmlldywgUXVpcHMsIEF1ZGlvUGxheWVyVmlldyB9IGZyb20gJy4vcXVpcC1jb250cm9sLmpzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSZWNvcmRpbmdzTGlzdCBleHRlbmRzIEJhY2tib25lLlZpZXcge1xuICAgIGluaXRpYWxpemUoKSB7XG5cbiAgICAgICAgdmFyIGF1ZGlvUGxheWVyID0gbmV3IEF1ZGlvUGxheWVyVmlldygpO1xuXG4gICAgICAgIHNvdW5kTWFuYWdlci5zZXR1cCh7XG4gICAgICAgICAgICBkZWJ1Z01vZGU6IHRydWUsXG4gICAgICAgICAgICB1cmw6ICcvYXNzZXRzL3N3Zi8nLFxuICAgICAgICAgICAgcHJlZmVyRmxhc2g6IGZhbHNlLFxuICAgICAgICAgICAgb25yZWFkeTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwic291bmRNYW5hZ2VyIHJlYWR5XCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAkKCcucXVpcCcpLmVhY2goZWxlbSA9PiB7XG4gICAgICAgICAgICB2YXIgdmlldyA9IG5ldyBRdWlwVmlldyh7XG4gICAgICAgICAgICAgICAgZWw6IGVsZW0sXG4gICAgICAgICAgICAgICAgbW9kZWw6IG5ldyBRdWlwTW9kZWwoe3Byb2dyZXNzOiAwfSlcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBRdWlwcy5hZGQodmlldy5tb2RlbCk7XG4gICAgICAgICAgICB2aWV3LnJlbmRlcigpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBwcm9jZXNzIGFsbCB0aW1lc3RhbXBzXG4gICAgICAgIHZhciB2YWd1ZVRpbWUgPSByZXF1aXJlKCd2YWd1ZS10aW1lJyk7XG4gICAgICAgIHZhciBub3cgPSBuZXcgRGF0ZSgpO1xuXG4gICAgICAgICQoXCJ0aW1lW2RhdGV0aW1lXVwiKS5lYWNoKGZ1bmN0aW9uIGdlbmVyYXRlVmFndWVEYXRlKGVsZSkge1xuICAgICAgICAgICAgZWxlLnRleHRDb250ZW50ID0gdmFndWVUaW1lLmdldCh7ZnJvbTogbm93LCB0bzogbmV3IERhdGUoZWxlLmdldEF0dHJpYnV0ZSgnZGF0ZXRpbWUnKSl9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5saXN0ZW5UbyhRdWlwcywgJ2FkZCcsIHRoaXMucXVpcEFkZGVkKTtcbiAgICB9XG5cbiAgICBxdWlwQWRkZWQocXVpcCkge1xuICAgIH1cbn1cblxuIiwiaW1wb3J0IEJhY2tib25lIGZyb20gJ2JhY2tib25lJ1xuaW1wb3J0IFNvdW5kUGxheWVyIGZyb20gJy4vYXVkaW8tcGxheWVyLmpzJ1xuXG4vKipcbiAqIFF1aXBcbiAqIFBsYXlzIGF1ZGlvIGFuZCB0cmFja3MgcG9zaXRpb25cbiAqL1xuXG5jbGFzcyBRdWlwTW9kZWwgZXh0ZW5kcyBCYWNrYm9uZS5Nb2RlbCB7XG4gICAgZGVmYXVsdHMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBpZDogMCwgLy8gZ3VpZFxuICAgICAgICAgICAgcHJvZ3Jlc3M6IDAsIC8vIFswLTEwMF0gcGVyY2VudGFnZVxuICAgICAgICAgICAgcG9zaXRpb246IDAsIC8vIG1zZWNcbiAgICAgICAgICAgIGR1cmF0aW9uOiAwLCAvLyBtc2VjXG4gICAgICAgICAgICBpc1B1YmxpYzogZmFsc2VcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuICAgIH1cblxuICAgIHNhdmUoYXR0cmlidXRlcykge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlF1aXAgTW9kZWwgc2F2aW5nIHRvIGxvY2FsU3RvcmFnZVwiKTtcbiAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0odGhpcy5pZCwgSlNPTi5zdHJpbmdpZnkodGhpcy50b0pTT04oKSkpO1xuICAgIH1cblxuICAgIGZldGNoKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlF1aXAgTW9kZWwgbG9hZGluZyBmcm9tIGxvY2FsU3RvcmFnZVwiKTtcbiAgICAgICAgdGhpcy5zZXQoSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuZ2V0SXRlbSh0aGlzLmlkKSkpO1xuICAgIH1cblxuICAgIHVwZGF0ZVByb2dyZXNzKCkge1xuICAgICAgICB0aGlzLnNldCh7XG4gICAgICAgICAgICBwcm9ncmVzczogKGR1cmF0aW9uID4gMCA/IHBvc2l0aW9uIC8gZHVyYXRpb24gOiAwKS50b0ZpeGVkKDApICsgXCIlXCJcbiAgICAgICAgfSk7XG4gICAgfVxufVxuXG5jbGFzcyBBdWRpb1BsYXllckV2ZW50cyBleHRlbmRzIEJhY2tib25lLk1vZGVsIHtcbiAgICBnZXRQYXVzZVVybChpZCkge1xuICAgICAgICB2YXIgdXJsID0gXCIvXCIgKyBpZCArIFwiL3BhdXNlZFwiO1xuICAgICAgICBjb25zb2xlLmxvZyhcInBhdXNlIHVybFwiICsgdXJsKTtcbiAgICAgICAgcmV0dXJuIHVybDtcbiAgICB9XG5cbiAgICBvblBhdXNlKGlkLCBjYWxsYmFjaykge1xuICAgICAgICB0aGlzLm9uKHRoaXMuZ2V0UGF1c2VVcmwoaWQpLCBjYWxsYmFjayk7XG4gICAgfVxuXG4gICAgdHJpZ2dlclBhdXNlKGlkKSB7XG4gICAgICAgIHRoaXMudHJpZ2dlcih0aGlzLmdldFBhdXNlVXJsKGlkKSk7XG4gICAgfVxufVxuXG52YXIgQXVkaW9QbGF5ZXIgPSBuZXcgQXVkaW9QbGF5ZXJFdmVudHMoKTtcblxuLy9jbGFzcyBBdWRpb1BsYXllckV2ZW50cyBleHRlbmRzIEJhY2tib25lLkV2ZW50cyB7XG4vL1xuLy99XG5cbmNsYXNzIEF1ZGlvUGxheWVyVmlldyBleHRlbmRzIEJhY2tib25lLlZpZXcge1xuICAgIGRlZmF1bHRzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgYXVkaW9QbGF5ZXI6IG51bGwsXG4gICAgICAgICAgICBxdWlwTW9kZWw6IG51bGxcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiQXVkaW9QbGF5ZXJWaWV3IGluaXRpYWxpemVkXCIpO1xuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJhdWRpby1wbGF5ZXJcIik7XG4gICAgICAgIEF1ZGlvUGxheWVyLm9uKFwidG9nZ2xlXCIsIChxdWlwKSA9PiB0aGlzLm9uVG9nZ2xlKHF1aXApKTtcbiAgICB9XG5cbiAgICBjbG9zZSgpIHtcbiAgICAgICAgdGhpcy5zdG9wUGVyaW9kaWNUaW1lcigpO1xuICAgIH1cblxuICAgIHN0YXJ0UGVyaW9kaWNUaW1lcigpIHtcbiAgICAgICAgaWYodGhpcy5wZXJpb2RpY1RpbWVyID09IG51bGwpIHtcbiAgICAgICAgICAgIHRoaXMucGVyaW9kaWNUaW1lciA9IHNldEludGVydmFsKCgpID0+IHRoaXMuY2hlY2tQcm9ncmVzcygpLCAxMDApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgc3RvcFBlcmlvZGljVGltZXIoKSB7XG4gICAgICAgIGlmKHRoaXMucGVyaW9kaWNUaW1lciAhPSBudWxsKSB7XG4gICAgICAgICAgICBjbGVhckludGVydmFsKHRoaXMucGVyaW9kaWNUaW1lcik7XG4gICAgICAgICAgICB0aGlzLnBlcmlvZGljVGltZXIgPSBudWxsO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgY2hlY2tQcm9ncmVzcygpIHtcbiAgICAgICAgaWYodGhpcy5xdWlwTW9kZWwgPT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHByb2dyZXNzVXBkYXRlID0ge1xuICAgICAgICAgICAgY3VycmVudFRpbWU6IHRoaXMuYXVkaW9QbGF5ZXIuY3VycmVudFRpbWUsXG4gICAgICAgICAgICBkdXJhdGlvbjogdGhpcy5hdWRpb1BsYXllci5kdXJhdGlvbixcbiAgICAgICAgICAgIHByb2dyZXNzOiAxMDAgKiB0aGlzLmF1ZGlvUGxheWVyLmN1cnJlbnRUaW1lIC8gdGhpcy5hdWRpb1BsYXllci5kdXJhdGlvblxuICAgICAgICB9XG5cbiAgICAgICAgQXVkaW9QbGF5ZXIudHJpZ2dlcihcIi9cIiArIHRoaXMucXVpcE1vZGVsLmlkICsgXCIvcHJvZ3Jlc3NcIiwgcHJvZ3Jlc3NVcGRhdGUpO1xuICAgIH1cblxuICAgIG9uVG9nZ2xlKHF1aXBNb2RlbCkge1xuICAgICAgICB0aGlzLnF1aXBNb2RlbCA9IHF1aXBNb2RlbDtcblxuICAgICAgICBpZighdGhpcy50cmFja0lzTG9hZGVkKHF1aXBNb2RlbC51cmwpKSB7XG4gICAgICAgICAgICB0aGlzLmxvYWRUcmFjayhxdWlwTW9kZWwudXJsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKCF0aGlzLnRyYWNrSXNMb2FkZWQocXVpcE1vZGVsLnVybCkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKHRoaXMuYXVkaW9QbGF5ZXIucGF1c2VkKSB7XG4gICAgICAgICAgICB0aGlzLnBsYXkocXVpcE1vZGVsKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMucGF1c2UocXVpcE1vZGVsKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHBsYXkocXVpcE1vZGVsKSB7XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIucGxheSgpO1xuICAgICAgICBBdWRpb1BsYXllci50cmlnZ2VyKFwiL1wiICsgcXVpcE1vZGVsLmlkICsgXCIvcGxheWluZ1wiKTtcbiAgICAgICAgdGhpcy5zdGFydFBlcmlvZGljVGltZXIoKTtcbiAgICB9XG5cbiAgICBwYXVzZShxdWlwTW9kZWwpIHtcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5wYXVzZSgpO1xuICAgICAgICBBdWRpb1BsYXllci50cmlnZ2VyKFwiL1wiICsgcXVpcE1vZGVsLmlkICsgXCIvcGF1c2VkXCIpO1xuICAgICAgICB0aGlzLnN0b3BQZXJpb2RpY1RpbWVyKCk7XG4gICAgfVxuXG4gICAgdHJhY2tJc0xvYWRlZCh1cmwpIHtcbiAgICAgICAgcmV0dXJuIH50aGlzLmF1ZGlvUGxheWVyLnNyYy5pbmRleE9mKHVybCk7XG4gICAgfVxuXG4gICAgbG9hZFRyYWNrKHVybCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIkxvYWRpbmcgYXVkaW86IFwiICsgdXJsKTtcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5zcmMgPSB1cmw7XG4gICAgfVxufVxuXG5jbGFzcyBRdWlwVmlldyBleHRlbmRzIEJhY2tib25lLlZpZXcge1xuICAgIGRlZmF1bHRzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcXVpcElkOiAwLFxuICAgICAgICAgICAgYXVkaW9QbGF5ZXI6IG51bGxcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGV2ZW50cygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIFwiY2xpY2sgLnF1aXAtYWN0aW9ucyAubG9jay1pbmRpY2F0b3JcIjogXCJ0b2dnbGVQdWJsaWNcIixcbiAgICAgICAgICAgIFwiY2xpY2sgLnF1aXAtcGxheWVyXCI6IFwidG9nZ2xlXCJcbiAgICAgICAgfVxuICAgIH1cblxuICAgIG9uUGF1c2UoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiUXVpcFZpZXc7IHBhdXNlZFwiKTtcblxuICAgICAgICAkKHRoaXMuZWwpXG4gICAgICAgICAgICAuZmluZCgnLmZhLXBsYXknKVxuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdmYS1wbGF5JylcbiAgICAgICAgICAgIC5hZGRDbGFzcygnZmEtcGF1c2UnKTtcbiAgICB9XG5cbiAgICBvblBsYXkoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiUXVpcFZpZXc7IHBsYXlpbmdcIik7XG5cbiAgICAgICAgJCh0aGlzLmVsKVxuICAgICAgICAgICAgLmZpbmQoJy5mYS1wYXVzZScpXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2ZhLXBhdXNlJylcbiAgICAgICAgICAgIC5hZGRDbGFzcygnZmEtcGxheScpO1xuICAgIH1cblxuICAgIG9uUHJvZ3Jlc3MocHJvZ3Jlc3NVcGRhdGUpIHtcbiAgICAgICAgdGhpcy5tb2RlbC5zZXQoeydwcm9ncmVzcyc6IHByb2dyZXNzVXBkYXRlLnByb2dyZXNzfSk7XG4gICAgfVxuXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgdGhpcy5xdWlwSWQgPSB0aGlzLiRlbC5kYXRhKFwicXVpcElkXCIpO1xuICAgICAgICB0aGlzLnB1YmxpY0xpbmsgPSAnL3UvJyArIHRoaXMucXVpcElkO1xuXG4gICAgICAgIEF1ZGlvUGxheWVyLm9uKFwiL1wiICsgdGhpcy5xdWlwSWQgKyBcIi9wYXVzZWRcIiwgKCkgPT4gdGhpcy5vblBhdXNlKCkpO1xuICAgICAgICBBdWRpb1BsYXllci5vbihcIi9cIiArIHRoaXMucXVpcElkICsgXCIvcGxheWluZ1wiLCAoKSA9PiB0aGlzLm9uUGxheSgpKTtcbiAgICAgICAgQXVkaW9QbGF5ZXIub24oXCIvXCIgKyB0aGlzLnF1aXBJZCArIFwiL3Byb2dyZXNzXCIsICh1cGRhdGUpID0+IHRoaXMub25Qcm9ncmVzcyh1cGRhdGUpKTtcblxuICAgICAgICB0aGlzLmxvYWRNb2RlbCgpO1xuXG4gICAgICAgIC8vIHVwZGF0ZSB2aXN1YWxzIHRvIGluZGljYXRlIHBsYXliYWNrIHByb2dyZXNzXG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5tb2RlbCwgJ2NoYW5nZTpwcm9ncmVzcycsIChtb2RlbCwgcHJvZ3Jlc3MpID0+IHtcbiAgICAgICAgICAgICQodGhpcy5lbCkuZmluZChcIi5wcm9ncmVzcy1iYXJcIikuY3NzKFwid2lkdGhcIiwgcHJvZ3Jlc3MgKyBcIiVcIik7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5tb2RlbCwgXCJjaGFuZ2VcIiwgdGhpcy5yZW5kZXIpO1xuICAgIH1cblxuICAgIGxvYWRNb2RlbCgpIHtcbiAgICAgICAgdmFyIHByb2dyZXNzID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJxdWlwOlwiICsgdGhpcy5xdWlwSWQgKyBcIjpwcm9ncmVzc1wiKTtcbiAgICAgICAgdmFyIHBvc2l0aW9uID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJxdWlwOlwiICsgdGhpcy5xdWlwSWQgKyBcIjpwb3NpdGlvblwiKTtcblxuICAgICAgICB0aGlzLm1vZGVsLnNldCh7XG4gICAgICAgICAgICAnaWQnOiB0aGlzLnF1aXBJZCxcbiAgICAgICAgICAgICdwcm9ncmVzcyc6IHByb2dyZXNzLFxuICAgICAgICAgICAgJ3Bvc2l0aW9uJzogcG9zaXRpb24sXG4gICAgICAgICAgICAnaXNQdWJsaWMnOiB0aGlzLiRlbC5kYXRhKFwiaXNQdWJsaWNcIikgPT0gJ1RydWUnLFxuICAgICAgICAgICAgJ2lzTWluZSc6IHRoaXMuJGVsLmRhdGEoXCJpc01pbmVcIikgPT0gJ1RydWUnXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHRvZ2dsZVB1YmxpYyhldikge1xuICAgICAgICB2YXIgbmV3U3RhdGUgPSAhdGhpcy5tb2RlbC5nZXQoJ2lzUHVibGljJyk7XG4gICAgICAgIHRoaXMubW9kZWwuc2V0KHsnaXNQdWJsaWMnOiBuZXdTdGF0ZX0pO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwidG9nZ2xpbmcgbmV3IHB1Ymxpc2hlZCBzdGF0ZTogXCIgKyBuZXdTdGF0ZSk7XG5cbiAgICAgICAgJC5hamF4KHtcbiAgICAgICAgICAgIHVybDogJy9yZWNvcmRpbmcvcHVibGlzaC8nICsgdGhpcy5xdWlwSWQsXG4gICAgICAgICAgICBtZXRob2Q6ICdwb3N0JyxcbiAgICAgICAgICAgIGRhdGE6IHtpc1B1YmxpYzogbmV3U3RhdGV9LFxuICAgICAgICAgICAgY29tcGxldGU6IGZ1bmN0aW9uIChyZXNwKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3AgJiYgcmVzcC5zdGF0dXMgPT0gJ3N1Y2Nlc3MnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGNoYW5nZSBzdWNjZXNzZnVsXG4gICAgICAgICAgICAgICAgfSBlbHNlIHsgICAvLyBjaGFuZ2UgZmFpbGVkXG4gICAgICAgICAgICAgICAgICAgIC8vIFRPRE86IGFkZCB2aXN1YWwgdG8gaW5kaWNhdGUgY2hhbmdlLWZhaWx1cmVcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFwiVG9nZ2xpbmcgcmVjb3JkaW5nIHB1YmxpY2F0aW9uIHN0YXRlIGZhaWxlZDpcIik7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZGlyKHJlc3ApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEF1ZGlvIGVsZW1lbnQgZmllbGRzXG4gICAgICogLmR1cmF0aW9uIChzZWNvbmRzKVxuICAgICAqIC5vbnByb2dyZXNzXG4gICAgICogLm9ucGxheVxuICAgICAqIC5vbnBhdXNlXG4gICAgICogLnBhdXNlZFxuICAgICAqIC52b2x1bWVcbiAgICAgKiAuZW5kZWRcbiAgICAgKiAuY3VycmVudFRpbWVcbiAgICAgKi9cblxuICAgIHRvZ2dsZShldmVudCkge1xuICAgICAgICB2YXIgcXVpcElkID0gJCh0aGlzLmVsKS5kYXRhKFwicXVpcElkXCIpO1xuICAgICAgICB0aGlzLm1vZGVsLnVybCA9ICcvcmVjb3JkaW5ncy8nICsgcXVpcElkICsgJy5vZ2cnO1xuXG4gICAgICAgIEF1ZGlvUGxheWVyLnRyaWdnZXIoXCJ0b2dnbGVcIiwgdGhpcy5tb2RlbCk7XG4gICAgfVxuXG4gICAgcmVuZGVyKCkge1xuICAgICAgICAvL3RoaXMuJGVsLmh0bWwoXy50ZW1wbGF0ZSgkKCcjcXVpcC10ZW1wbGF0ZScpLmh0bWwoKSkpO1xuICAgICAgICAvL3JldHVybiB0aGlzO1xuICAgICAgICB2YXIgcmVzdWx0ID0gJCh0aGlzLmVsKS5maW5kKCcucXVpcC1hY3Rpb25zJykuZmluZCgnLmxvY2staW5kaWNhdG9yJyk7XG4gICAgICAgIGlmIChyZXN1bHQpXG4gICAgICAgICAgICByZXN1bHQucmVtb3ZlKCk7XG5cbiAgICAgICAgaWYgKHRoaXMubW9kZWwuZ2V0KCdpc01pbmUnKSkge1xuICAgICAgICAgICAgdmFyIF8gPSByZXF1aXJlKCd1bmRlcnNjb3JlJyk7XG4gICAgICAgICAgICB2YXIgaHRtbCA9IF8udGVtcGxhdGUoJChcIiNxdWlwLWNvbnRyb2wtcHJpdmFjeVwiKS5odG1sKCkpO1xuXG4gICAgICAgICAgICAkKHRoaXMuZWwpLmZpbmQoXCIucXVpcC1hY3Rpb25zXCIpLmFwcGVuZChodG1sKHtcbiAgICAgICAgICAgICAgICBpc1B1YmxpYzogdGhpcy5tb2RlbC5nZXQoJ2lzUHVibGljJyksXG4gICAgICAgICAgICAgICAgcHVibGljTGluazogdGhpcy5wdWJsaWNMaW5rXG4gICAgICAgICAgICB9KSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmNsYXNzIFF1aXBMaXN0IGV4dGVuZHMgQmFja2JvbmUuQ29sbGVjdGlvbiB7XG4gICAgY29uc3RydWN0b3Iob3B0aW9ucykge1xuICAgICAgICBzdXBlcihvcHRpb25zKTtcbiAgICAgICAgdGhpcy5tb2RlbCA9IFF1aXBNb2RlbDtcbiAgICB9XG59XG5cbnZhciBRdWlwcyA9IG5ldyBRdWlwTGlzdCgpO1xuXG5leHBvcnQgeyBRdWlwTW9kZWwsIFF1aXBWaWV3LCBRdWlwTGlzdCwgUXVpcHMsIEF1ZGlvUGxheWVyVmlldyB9O1xuIiwiaW1wb3J0IEJhY2tib25lIGZyb20gJ2JhY2tib25lJ1xuaW1wb3J0IHsgUXVpcE1vZGVsLCBRdWlwVmlldywgUXVpcHMsIEF1ZGlvUGxheWVyVmlldyB9IGZyb20gJy4vcXVpcC1jb250cm9sLmpzJ1xuaW1wb3J0IHsgQXVkaW9DYXB0dXJlIH0gZnJvbSAnLi9hdWRpby1jYXB0dXJlJ1xuXG5leHBvcnQgY2xhc3MgUmVjb3JkZXIgZXh0ZW5kcyBCYWNrYm9uZS5Nb2RlbCB7XG4gICAgZGVmYXVsdHMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZWNvcmRpbmdUaW1lOiAwXG4gICAgICAgIH1cbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBSZWNvcmRlclZpZXcgZXh0ZW5kcyBCYWNrYm9uZS5WaWV3IHtcbiAgICAvLyAgICBlbDogJy5tLXJlY29yZGluZy1jb250YWluZXInLFxuXG4gICAgSW50VG9UaW1lKHZhbHVlKSB7XG4gICAgICAgIHZhciBtaW51dGVzID0gTWF0aC5mbG9vcih2YWx1ZSAvIDYwKTtcbiAgICAgICAgdmFyIHNlY29uZHMgPSBNYXRoLnJvdW5kKHZhbHVlIC0gbWludXRlcyAqIDYwKTtcblxuICAgICAgICByZXR1cm4gKFwiMDBcIiArIG1pbnV0ZXMpLnN1YnN0cigtMikgKyBcIjpcIiArIChcIjAwXCIgKyBzZWNvbmRzKS5zdWJzdHIoLTIpO1xuICAgIH1cblxuICAgIGRlZmF1bHRzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgYXVkaW9DYXB0dXJlOiBudWxsLFxuICAgICAgICAgICAgYXVkaW9CbG9iOiBudWxsLFxuICAgICAgICAgICAgYXVkaW9QbGF5ZXI6IG51bGwsXG4gICAgICAgICAgICBpc1JlY29yZGluZzogZmFsc2UsXG4gICAgICAgICAgICB0aW1lcklkOiAwLFxuICAgICAgICAgICAgdGltZXJTdGFydDogM1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZXZlbnRzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgXCJjbGljayAucmVjb3JkaW5nLXRvZ2dsZVwiOiBcInRvZ2dsZVwiLFxuICAgICAgICAgICAgXCJjbGljayAjY2FuY2VsLXJlY29yZGluZ1wiOiBcImNhbmNlbFJlY29yZGluZ1wiLFxuICAgICAgICAgICAgXCJjbGljayAjdXBsb2FkLXJlY29yZGluZ1wiOiBcInVwbG9hZFJlY29yZGluZ1wiXG4gICAgICAgIH1cbiAgICB9XG5cblxuICAgIGluaXRpYWxpemUob3B0aW9ucykge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlJlY29yZGVyVmlldyBpbml0XCIpO1xuICAgICAgICB0aGlzLmF1ZGlvQ2FwdHVyZSA9IG5ldyBBdWRpb0NhcHR1cmUoKTtcblxuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyZWNvcmRlZC1wcmV2aWV3XCIpO1xuICAgICAgICBjb25zb2xlLmxvZygndGhpcy5hdWRpb1BsYXllciA9ICcgKyB0aGlzLmF1ZGlvUGxheWVyKTtcblxuICAgICAgICAvL3RoaXMuYXVkaW9QbGF5ZXIubG9vcCA9IFwibG9vcFwiO1xuICAgICAgICAvL3RoaXMuYXVkaW9QbGF5ZXIuYXV0b3BsYXkgPSBcImF1dG9wbGF5XCI7XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIuc3JjID0gXCIvYXNzZXRzL3NvdW5kcy9iZWVwX3Nob3J0X29uLm9nZ1wiO1xuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnBsYXkoKTtcblxuICAgICAgICB0aGlzLm1vZGVsLm9uKCdjaGFuZ2U6cmVjb3JkaW5nVGltZScsIGZ1bmN0aW9uIChtb2RlbCwgdGltZSkge1xuICAgICAgICAgICAgJChcIi5yZWNvcmRpbmctdGltZVwiKS50ZXh0KHRpbWUpO1xuICAgICAgICB9KVxuXG4gICAgICAgIC8vIGF0dGVtcHQgdG8gZmV0Y2ggbWVkaWEtc3RyZWFtIG9uIHBhZ2UtbG9hZFxuICAgICAgICB0aGlzLmF1ZGlvQ2FwdHVyZS5wcmVsb2FkTWVkaWFTdHJlYW0oKTtcblxuICAgICAgICAvLyBUT0RPOiBhIHByZXR0eSBhZHZhbmNlZCBidXQgbmVhdCBmZWF0dXJlIG1heSBiZSB0byBzdG9yZSBhIGJhY2t1cCBjb3B5IG9mIGEgcmVjb3JkaW5nIGxvY2FsbHkgaW4gY2FzZSBvZiBhIGNyYXNoIG9yIHVzZXItZXJyb3JcbiAgICAgICAgLypcbiAgICAgICAgIC8vIGNoZWNrIGhvdyBtdWNoIHRlbXBvcmFyeSBzdG9yYWdlIHNwYWNlIHdlIGhhdmUuIGl0J3MgYSBnb29kIHdheSB0byBzYXZlIHJlY29yZGluZyB3aXRob3V0IGxvc2luZyBpdFxuICAgICAgICAgd2luZG93LndlYmtpdFN0b3JhZ2VJbmZvLnF1ZXJ5VXNhZ2VBbmRRdW90YShcbiAgICAgICAgIHdlYmtpdFN0b3JhZ2VJbmZvLlRFTVBPUkFSWSxcbiAgICAgICAgIGZ1bmN0aW9uKHVzZWQsIHJlbWFpbmluZykge1xuICAgICAgICAgdmFyIHJtYiA9IChyZW1haW5pbmcgLyAxMDI0IC8gMTAyNCkudG9GaXhlZCg0KTtcbiAgICAgICAgIHZhciB1bWIgPSAodXNlZCAvIDEwMjQgLyAxMDI0KS50b0ZpeGVkKDQpO1xuICAgICAgICAgY29uc29sZS5sb2coXCJVc2VkIHF1b3RhOiBcIiArIHVtYiArIFwibWIsIHJlbWFpbmluZyBxdW90YTogXCIgKyBybWIgKyBcIm1iXCIpO1xuICAgICAgICAgfSwgZnVuY3Rpb24oZSkge1xuICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yJywgZSk7XG4gICAgICAgICB9XG4gICAgICAgICApO1xuXG4gICAgICAgICBmdW5jdGlvbiBvbkVycm9ySW5GUygpIHtcbiAgICAgICAgIHZhciBtc2cgPSAnJztcblxuICAgICAgICAgc3dpdGNoIChlLmNvZGUpIHtcbiAgICAgICAgIGNhc2UgRmlsZUVycm9yLlFVT1RBX0VYQ0VFREVEX0VSUjpcbiAgICAgICAgIG1zZyA9ICdRVU9UQV9FWENFRURFRF9FUlInO1xuICAgICAgICAgYnJlYWs7XG4gICAgICAgICBjYXNlIEZpbGVFcnJvci5OT1RfRk9VTkRfRVJSOlxuICAgICAgICAgbXNnID0gJ05PVF9GT1VORF9FUlInO1xuICAgICAgICAgYnJlYWs7XG4gICAgICAgICBjYXNlIEZpbGVFcnJvci5TRUNVUklUWV9FUlI6XG4gICAgICAgICBtc2cgPSAnU0VDVVJJVFlfRVJSJztcbiAgICAgICAgIGJyZWFrO1xuICAgICAgICAgY2FzZSBGaWxlRXJyb3IuSU5WQUxJRF9NT0RJRklDQVRJT05fRVJSOlxuICAgICAgICAgbXNnID0gJ0lOVkFMSURfTU9ESUZJQ0FUSU9OX0VSUic7XG4gICAgICAgICBicmVhaztcbiAgICAgICAgIGNhc2UgRmlsZUVycm9yLklOVkFMSURfU1RBVEVfRVJSOlxuICAgICAgICAgbXNnID0gJ0lOVkFMSURfU1RBVEVfRVJSJztcbiAgICAgICAgIGJyZWFrO1xuICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgIG1zZyA9ICdVbmtub3duIEVycm9yJztcbiAgICAgICAgIGJyZWFrO1xuICAgICAgICAgfVxuXG4gICAgICAgICBjb25zb2xlLmxvZygnRXJyb3I6ICcgKyBtc2cpO1xuICAgICAgICAgfVxuXG4gICAgICAgICB3aW5kb3cucmVxdWVzdEZpbGVTeXN0ZW0gID0gd2luZG93LnJlcXVlc3RGaWxlU3lzdGVtIHx8IHdpbmRvdy53ZWJraXRSZXF1ZXN0RmlsZVN5c3RlbTtcblxuICAgICAgICAgd2luZG93LnJlcXVlc3RGaWxlU3lzdGVtKHdpbmRvdy5URU1QT1JBUlksIDUgKiAxMDI0ICogMTAyNCwgZnVuY3Rpb24gb25TdWNjZXNzKGZzKSB7XG5cbiAgICAgICAgIGNvbnNvbGUubG9nKCdvcGVuaW5nIGZpbGUnKTtcblxuICAgICAgICAgZnMucm9vdC5nZXRGaWxlKFwidGVzdFwiLCB7Y3JlYXRlOnRydWV9LCBmdW5jdGlvbihmZSkge1xuXG4gICAgICAgICBjb25zb2xlLmxvZygnc3Bhd25lZCB3cml0ZXInKTtcblxuICAgICAgICAgZmUuY3JlYXRlV3JpdGVyKGZ1bmN0aW9uKGZ3KSB7XG5cbiAgICAgICAgIGZ3Lm9ud3JpdGVlbmQgPSBmdW5jdGlvbihlKSB7XG4gICAgICAgICBjb25zb2xlLmxvZygnd3JpdGUgY29tcGxldGVkJyk7XG4gICAgICAgICB9O1xuXG4gICAgICAgICBmdy5vbmVycm9yID0gZnVuY3Rpb24oZSkge1xuICAgICAgICAgY29uc29sZS5sb2coJ3dyaXRlIGZhaWxlZDogJyArIGUudG9TdHJpbmcoKSk7XG4gICAgICAgICB9O1xuXG4gICAgICAgICBjb25zb2xlLmxvZygnd3JpdGluZyBibG9iIHRvIGZpbGUuLicpO1xuXG4gICAgICAgICB2YXIgYmxvYiA9IG5ldyBCbG9iKFsneWVoIHRoaXMgaXMgYSB0ZXN0ISddLCB7dHlwZTogJ3RleHQvcGxhaW4nfSk7XG4gICAgICAgICBmdy53cml0ZShibG9iKTtcblxuICAgICAgICAgfSwgb25FcnJvckluRlMpO1xuXG4gICAgICAgICB9LCBvbkVycm9ySW5GUyk7XG5cbiAgICAgICAgIH0sIG9uRXJyb3JJbkZTKTtcbiAgICAgICAgICovXG4gICAgfVxuXG4gICAgdG9nZ2xlKGV2ZW50KSB7XG4gICAgICAgIGlmICh0aGlzLmlzUmVjb3JkaW5nKSB7XG4gICAgICAgICAgICB0aGlzLmlzUmVjb3JkaW5nID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLnN0b3BSZWNvcmRpbmcoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuaXNSZWNvcmRpbmcgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5zdGFydFJlY29yZGluZygpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgY2FuY2VsUmVjb3JkaW5nKGV2ZW50KSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiUmVjb3JkZXI6Om9uUmVjb3JkaW5nQ29tcGxldGVkKCk7IGNhbmNlbGluZyByZWNvcmRpbmdcIik7XG4gICAgICAgICQoXCIjcmVjb3JkZXItZnVsbFwiKS5yZW1vdmVDbGFzcyhcImRpc2FibGVkXCIpO1xuICAgICAgICAkKFwiI3JlY29yZGVyLXVwbG9hZGVyXCIpLmFkZENsYXNzKFwiZGlzYWJsZWRcIik7XG4gICAgICAgICQoXCIubS1yZWNvcmRpbmctY29udGFpbmVyXCIpLnJlbW92ZUNsYXNzKFwiZmxpcHBlZFwiKTtcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5zcmMgPSBcIlwiO1xuICAgICAgICB0aGlzLm1vZGVsLnNldCgncmVjb3JkaW5nVGltZScsIDMpO1xuICAgIH1cblxuICAgIHVwbG9hZFJlY29yZGluZyhldmVudCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlJlY29yZGVyOjpvblJlY29yZGluZ0NvbXBsZXRlZCgpOyB1cGxvYWRpbmcgcmVjb3JkaW5nXCIpO1xuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnNyYyA9IFwiXCI7XG5cbiAgICAgICAgJChcIiNyZWNvcmRlci1mdWxsXCIpLmFkZENsYXNzKFwiZGlzYWJsZWRcIik7XG4gICAgICAgICQoXCIjcmVjb3JkZXItdXBsb2FkZXJcIikucmVtb3ZlQ2xhc3MoXCJkaXNhYmxlZFwiKTtcbiAgICAgICAgJChcIi5tLXJlY29yZGluZy1jb250YWluZXJcIikucmVtb3ZlQ2xhc3MoXCJmbGlwcGVkXCIpO1xuXG4gICAgICAgIHZhciBkZXNjcmlwdGlvbiA9ICQoJ3RleHRhcmVhW25hbWU9ZGVzY3JpcHRpb25dJylbMF0udmFsdWU7XG5cbiAgICAgICAgdmFyIGRhdGEgPSBuZXcgRm9ybURhdGEoKTtcbiAgICAgICAgZGF0YS5hcHBlbmQoJ2Rlc2NyaXB0aW9uJywgZGVzY3JpcHRpb24pO1xuICAgICAgICBkYXRhLmFwcGVuZCgnaXNQdWJsaWMnLCAxKTtcbiAgICAgICAgZGF0YS5hcHBlbmQoJ2F1ZGlvLWJsb2InLCB0aGlzLmF1ZGlvQmxvYik7XG5cbiAgICAgICAgLy8gc2VuZCByYXcgYmxvYiBhbmQgbWV0YWRhdGFcblxuICAgICAgICAvLyBUT0RPOiBnZXQgYSByZXBsYWNlbWVudCBhamF4IGxpYnJhcnkgKG1heWJlIHBhdGNoIHJlcXdlc3QgdG8gc3VwcG9ydCBiaW5hcnk/KVxuICAgICAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICAgIHhoci5vcGVuKCdwb3N0JywgJy9yZWNvcmRpbmcvY3JlYXRlJywgdHJ1ZSk7XG4gICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCdBY2NlcHQnLCAnYXBwbGljYXRpb24vanNvbicpO1xuICAgICAgICB4aHIudXBsb2FkLm9ucHJvZ3Jlc3MgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgdmFyIHBlcmNlbnQgPSAoKGUubG9hZGVkIC8gZS50b3RhbCkgKiAxMDApLnRvRml4ZWQoMCkgKyAnJSc7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcInBlcmNlbnRhZ2U6IFwiICsgcGVyY2VudCk7XG4gICAgICAgICAgICAkKFwiI3JlY29yZGVyLXVwbG9hZGVyXCIpLmZpbmQoXCIuYmFyXCIpLmNzcygnd2lkdGgnLCBwZXJjZW50KTtcbiAgICAgICAgfTtcbiAgICAgICAgeGhyLm9ubG9hZCA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAkKFwiI3JlY29yZGVyLXVwbG9hZGVyXCIpLmZpbmQoXCIuYmFyXCIpLmNzcygnd2lkdGgnLCAnMTAwJScpO1xuICAgICAgICAgICAgaWYgKHhoci5zdGF0dXMgPT0gMjAwKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJSZWNvcmRlcjo6b25SZWNvcmRpbmdDb21wbGV0ZWQoKTsgbWFudWFsIHhociBzdWNjZXNzZnVsXCIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlJlY29yZGVyOjpvblJlY29yZGluZ0NvbXBsZXRlZCgpOyBtYW51YWwgeGhyIGVycm9yXCIsIHhocik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gSlNPTi5wYXJzZSh4aHIucmVzcG9uc2UpO1xuICAgICAgICAgICAgY29uc29sZS5kaXIocmVzdWx0KTtcblxuICAgICAgICAgICAgaWYgKHJlc3VsdC5zdGF0dXMgPT0gXCJzdWNjZXNzXCIpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IHJlc3VsdC51cmw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHhoci5zZW5kKGRhdGEpO1xuICAgIH1cblxuICAgIG9uUmVjb3JkaW5nVGljaygpIHtcbiAgICAgICAgdmFyIHRpbWVTcGFuID0gcGFyc2VJbnQoKChuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIHRoaXMudGltZXJTdGFydCkgLyAxMDAwKS50b0ZpeGVkKCkpO1xuICAgICAgICB2YXIgdGltZVN0ciA9IHRoaXMuSW50VG9UaW1lKHRpbWVTcGFuKTtcbiAgICAgICAgdGhpcy5tb2RlbC5zZXQoJ3JlY29yZGluZ1RpbWUnLCB0aW1lU3RyKTtcbiAgICB9XG5cbiAgICBvbkNvdW50ZG93blRpY2soKSB7XG4gICAgICAgIGlmICgtLXRoaXMudGltZXJTdGFydCA+IDApIHtcbiAgICAgICAgICAgIHRoaXMubW9kZWwuc2V0KCdyZWNvcmRpbmdUaW1lJywgdGhpcy50aW1lclN0YXJ0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiY291bnRkb3duIGhpdCB6ZXJvLiBiZWdpbiByZWNvcmRpbmcuXCIpO1xuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLnRpbWVySWQpO1xuICAgICAgICAgICAgdGhpcy5tb2RlbC5zZXQoJ3JlY29yZGluZ1RpbWUnLCB0aGlzLkludFRvVGltZSgwKSk7XG4gICAgICAgICAgICB0aGlzLm9uTWljUmVjb3JkaW5nKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzdGFydFJlY29yZGluZygpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJzdGFydGluZyByZWNvcmRpbmdcIik7XG4gICAgICAgIHRoaXMuYXVkaW9DYXB0dXJlLnN0YXJ0KCgpID0+IHRoaXMub25NaWNSZWFkeSgpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNaWNyb3Bob25lIGlzIHJlYWR5IHRvIHJlY29yZC4gRG8gYSBjb3VudC1kb3duLCB0aGVuIHNpZ25hbCBmb3IgaW5wdXQtc2lnbmFsIHRvIGJlZ2luIHJlY29yZGluZ1xuICAgICAqL1xuICAgIG9uTWljUmVhZHkoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwibWljIHJlYWR5IHRvIHJlY29yZC4gZG8gY291bnRkb3duLlwiKTtcbiAgICAgICAgdGhpcy50aW1lclN0YXJ0ID0gMztcbiAgICAgICAgLy8gcnVuIGNvdW50ZG93blxuICAgICAgICAvL3RoaXMudGltZXJJZCA9IHNldEludGVydmFsKHRoaXMub25Db3VudGRvd25UaWNrLmJpbmQodGhpcyksIDEwMDApO1xuXG4gICAgICAgIC8vIG9yIGxhdW5jaCBjYXB0dXJlIGltbWVkaWF0ZWx5XG4gICAgICAgIHRoaXMubW9kZWwuc2V0KCdyZWNvcmRpbmdUaW1lJywgdGhpcy5JbnRUb1RpbWUoMCkpO1xuICAgICAgICB0aGlzLm9uTWljUmVjb3JkaW5nKCk7XG5cbiAgICAgICAgJChcIi5yZWNvcmRpbmctdGltZVwiKS5hZGRDbGFzcyhcImlzLXZpc2libGVcIik7XG4gICAgfVxuXG4gICAgb25NaWNSZWNvcmRpbmcoKSB7XG4gICAgICAgIHRoaXMudGltZXJTdGFydCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgICB0aGlzLnRpbWVySWQgPSBzZXRJbnRlcnZhbCh0aGlzLm9uUmVjb3JkaW5nVGljay5iaW5kKHRoaXMpLCAxMDAwKTtcbiAgICAgICAgJChcIi5tLXJlY29yZGluZy1zY3JlZW5cIikuYWRkQ2xhc3MoXCJpcy1yZWNvcmRpbmdcIik7XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJNaWMgcmVjb3JkaW5nIHN0YXJ0ZWRcIik7XG5cbiAgICAgICAgLy8gVE9ETzogdGhlIG1pYyBjYXB0dXJlIGlzIGFscmVhZHkgYWN0aXZlLCBzbyBhdWRpbyBidWZmZXJzIGFyZSBnZXR0aW5nIGJ1aWx0IHVwXG4gICAgICAgIC8vIHdoZW4gdG9nZ2xpbmcgdGhpcyBvbiwgd2UgbWF5IGFscmVhZHkgYmUgY2FwdHVyaW5nIGEgYnVmZmVyIHRoYXQgaGFzIGF1ZGlvIHByaW9yIHRvIHRoZSBjb3VudGRvd25cbiAgICAgICAgLy8gaGl0dGluZyB6ZXJvLiB3ZSBjYW4gZG8gYSBmZXcgdGhpbmdzIGhlcmU6XG4gICAgICAgIC8vIDEpIGZpZ3VyZSBvdXQgaG93IG11Y2ggYXVkaW8gd2FzIGFscmVhZHkgY2FwdHVyZWQsIGFuZCBjdXQgaXQgb3V0XG4gICAgICAgIC8vIDIpIHVzZSBhIGZhZGUtaW4gdG8gY292ZXIgdXAgdGhhdCBzcGxpdC1zZWNvbmQgb2YgYXVkaW9cbiAgICAgICAgLy8gMykgYWxsb3cgdGhlIHVzZXIgdG8gZWRpdCBwb3N0LXJlY29yZCBhbmQgY2xpcCBhcyB0aGV5IHdpc2ggKGJldHRlciBidXQgbW9yZSBjb21wbGV4IG9wdGlvbiEpXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4gdGhpcy5hdWRpb0NhcHR1cmUudG9nZ2xlTWljcm9waG9uZVJlY29yZGluZyh0cnVlKSwgNTAwKTtcbiAgICB9XG5cbiAgICBzdG9wUmVjb3JkaW5nKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcInN0b3BwaW5nIHJlY29yZGluZ1wiKTtcbiAgICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLnRpbWVySWQpO1xuXG4gICAgICAgIC8vIHBsYXkgc291bmQgaW1tZWRpYXRlbHkgdG8gYnlwYXNzIG1vYmlsZSBjaHJvbWUncyBcInVzZXIgaW5pdGlhdGVkIG1lZGlhXCIgcmVxdWlyZW1lbnRcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5zcmMgPSBcIi9hc3NldHMvc291bmRzL2JlZXBfc2hvcnRfb2ZmLm9nZ1wiO1xuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnBsYXkoKTtcblxuICAgICAgICB0aGlzLmF1ZGlvQ2FwdHVyZS5zdG9wKChibG9iKSA9PiB0aGlzLm9uUmVjb3JkaW5nQ29tcGxldGVkKGJsb2IpKTtcblxuICAgICAgICAkKFwiLnJlY29yZGluZy10aW1lXCIpLnJlbW92ZUNsYXNzKFwiaXMtdmlzaWJsZVwiKTtcbiAgICAgICAgJChcIi5tLXJlY29yZGluZy1zY3JlZW5cIikucmVtb3ZlQ2xhc3MoXCJpcy1yZWNvcmRpbmdcIik7XG5cbiAgICAgICAgLy8gVE9ETzogYW5pbWF0ZSByZWNvcmRlciBvdXRcbiAgICAgICAgLy8gVE9ETzogYW5pbWF0ZSB1cGxvYWRlciBpblxuICAgIH1cblxuICAgIG9uUmVjb3JkaW5nQ29tcGxldGVkKGJsb2IpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJSZWNvcmRlcjo6b25SZWNvcmRpbmdDb21wbGV0ZWQoKTsgcHJldmlld2luZyByZWNvcmRlZCBhdWRpb1wiKTtcbiAgICAgICAgdGhpcy5hdWRpb0Jsb2IgPSBibG9iO1xuICAgICAgICB0aGlzLnNob3dDb21wbGV0aW9uU2NyZWVuKCk7XG4gICAgfVxuXG4gICAgc2hvd0NvbXBsZXRpb25TY3JlZW4oKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiUmVjb3JkZXI6Om9uUmVjb3JkaW5nQ29tcGxldGVkKCk7IGZsaXBwaW5nIGNhcmRcIik7XG4gICAgICAgIHZhciB1cmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKHRoaXMuYXVkaW9CbG9iKTtcbiAgICAgICAgJChcIi5tLXJlY29yZGluZy1jb250YWluZXJcIikuYWRkQ2xhc3MoXCJmbGlwcGVkXCIpO1xuXG4gICAgICAgIC8vIFRPRE86IGdldCBhIGNoYWluYWJsZSBhbmltYXRpb25zIGxpYnJhcnkgdGhhdCBzdXBwb3J0cyBkZWxheXNcbiAgICAgICAgLy9zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUmVjb3JkZXI6Om9uUmVjb3JkaW5nQ29tcGxldGVkKCk7IGNoYW5naW5nIGF1ZGlvcGxheWVyXCIpO1xuICAgICAgICAgICAgdGhpcy5hdWRpb1BsYXllci5zcmMgPSB1cmw7XG4gICAgICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnBsYXkoKTtcbiAgICAgICAgY29uc29sZS5sb2coXCJhdWRpbyBwbGF5ZXIgd2l0aCBibG9iXCIsIHRoaXMuYXVkaW9QbGF5ZXIpO1xuICAgICAgICAvL30sIDIwMCk7XG4gICAgfVxufVxuIl19
