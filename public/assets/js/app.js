(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _backbone = require('backbone');

var _backbone2 = _interopRequireDefault(_backbone);

var _jquery = require('jquery');

var _jquery2 = _interopRequireDefault(_jquery);

var _modelsListenState = require('./models/ListenState');

var _modelsCurrentUser = require('./models/CurrentUser');

var _router = require('./router');

var _router2 = _interopRequireDefault(_router);

$ = require('jquery');

var Application = (function () {
    function Application() {
        var _this = this;

        _classCallCheck(this, Application);

        var router = new _router2['default']();

        _backbone2['default'].$ = $;
        _backbone2['default'].history.start({ pushState: true, hashChange: false });
        //if (!Backbone.history.start({pushState: true, hashChange: false})) router.navigate('404', {trigger: true});

        // Use delegation to avoid initial DOM selection and allow all matching elements to bubble
        $(document).delegate("a", "click", function (evt) {
            // Get the anchor href and protcol
            var href = $(this).attr("href");
            var protocol = this.protocol + "//";

            var openLinkInTab = false;

            // Ensure the protocol is not part of URL, meaning its relative.
            // Stop the event bubbling to ensure the link will not cause a page refresh.
            if (!openLinkInTab && href.slice(protocol.length) !== protocol) {
                evt.preventDefault();

                // Note by using Backbone.history.navigate, router events will not be
                // triggered.  If this is a problem, change this to navigate on your
                // router.
                _backbone2['default'].history.navigate(href, true);
            }
        });

        // load user
        var model = new _modelsCurrentUser.CurrentUserModel();
        model.fetch().then(function () {
            return _this.onModelLoaded(model);
        });

        //new ListenStateCollection().fetch().then((state) => console.log("got listen states", state));
    }

    _createClass(Application, [{
        key: 'onModelLoaded',
        value: function onModelLoaded(user) {
            console.log("Loaded current user", user.attributes);
            this.currentUser = user;
        }
    }]);

    return Application;
})();

$(function () {
    // setup raven to push messages to our sentry
    //Raven.config('https://d098712cb7064cf08b74d01b6f3be3da@app.getsentry.com/20973', {
    //    whitelistUrls: ['staging.couchpod.com', 'couchpod.com'] // production only
    //}).install();

    Raven.config('https://db2a7d58107c4975ae7de736a6308a1e@app.getsentry.com/53456', {
        whitelistUrls: ['staging.couchpod.com', 'couchpod.com'] // production only
    }).install();

    var app = new Application();

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

},{"./models/CurrentUser":5,"./models/ListenState":6,"./router":11,"backbone":"backbone","jquery":"jquery"}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _polyfillJs = require('./polyfill.js');

var _polyfillJs2 = _interopRequireDefault(_polyfillJs);

var AudioCapture = (function () {
    function AudioCapture() {
        _classCallCheck(this, AudioCapture);

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
        this._cachedMediaStream = null;

        this._audioEncoder = null;
        this._latestAudioBuffer = [];
        this._cachedGainValue = 1;
        this._onStartedCallback = null;

        this._fftSize = 256;
        this._fftSmoothing = 0.8;
        this._totalNumSamples = 0;

        _polyfillJs2['default'].install();
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
        key: 'createAudioContext',
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
        key: 'startManualEncoding',
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
            this._audioGain.disconnect(this._audioListener);
            console.log("disconnecting: input->gain");
            this._audioInput.disconnect(this._audioGain);
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
        key: 'setGain',
        value: function setGain(gain) {
            if (this._audioGain) this._audioGain.gain.value = gain;

            console.log("setting gain: " + gain);
            this._cachedGainValue = gain;
        }
    }, {
        key: 'preloadMediaStream',
        value: function preloadMediaStream() {
            var _this2 = this;

            if (this._cachedMediaStream) return;

            navigator.mediaDevice.getUserMedia({ audio: true }).then(function (ms) {
                _this2._cachedMediaStream = ms;
            })['catch'](function (err) {
                console.log("AudioCapture::start(); could not grab microphone. perhaps user didn't give us permission?");
                console.warn(err);
            });
        }
    }, {
        key: 'start',
        value: function start(onStartedCallback) {
            var _this3 = this;

            this._onStartedCallback = onStartedCallback;

            if (this._cachedMediaStream) return this.onMicrophoneProvided(this._cachedMediaStream);

            navigator.mediaDevice.getUserMedia({ audio: true }).then(function (ms) {
                return _this3.onMicrophoneProvided(ms);
            })['catch'](function (err) {
                console.log("AudioCapture::start(); could not grab microphone. perhaps user didn't give us permission?");
                console.warn(err);
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

},{"./polyfill.js":8,"underscore":"underscore"}],3:[function(require,module,exports){
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

var _vagueTime = require('vague-time');

var _vagueTime2 = _interopRequireDefault(_vagueTime);

var _quipControlJs = require('./quip-control.js');

var _modelsQuip = require('./models/Quip');

var RecordingsList = (function (_Backbone$View) {
    _inherits(RecordingsList, _Backbone$View);

    function RecordingsList() {
        _classCallCheck(this, RecordingsList);

        _get(Object.getPrototypeOf(RecordingsList.prototype), 'constructor', this).apply(this, arguments);
    }

    _createClass(RecordingsList, [{
        key: 'initialize',
        value: function initialize() {
            var _this = this;

            var audioPlayer = new _quipControlJs.AudioPlayerView({ el: '#audio-player' });

            // load recordings
            new _modelsQuip.MyQuipCollection().fetch().then(function (quips) {
                return _this.onQuipsLoaded(quips);
            });

            return;

            $('.quip').each(function (elem) {
                var view = new _quipControlJs.QuipView({
                    el: elem,
                    model: new _modelsQuip.QuipModel()
                });

                _quipControlJs.Quips.add(view.model);
                view.render();
            });

            // process all timestamps
            var vagueTime = require('vague-time');
            var now = new Date();

            $("time[datetime]").each(function (idx, ele) {
                ele.textContent = vagueTime.get({ from: now, to: new Date(ele.getAttribute('datetime')) });
            });

            this.listenTo(_quipControlJs.Quips, 'add', this.quipAdded);
        }
    }, {
        key: 'onQuipsLoaded',
        value: function onQuipsLoaded(quips) {
            console.log("loaded quips", quips);

            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = quips[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var quip = _step.value;

                    var quipView = new _quipControlJs.QuipView({ model: new _modelsQuip.QuipModel(quip) });
                    this.$el.append(quipView.el);
                }
            } catch (err) {
                _didIteratorError = true;
                _iteratorError = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion && _iterator['return']) {
                        _iterator['return']();
                    }
                } finally {
                    if (_didIteratorError) {
                        throw _iteratorError;
                    }
                }
            }
        }
    }, {
        key: 'quipAdded',
        value: function quipAdded(quip) {}
    }, {
        key: 'render',
        value: function render() {}
    }]);

    return RecordingsList;
})(_backbone2['default'].View);

exports['default'] = RecordingsList;
;
module.exports = exports['default'];

},{"./models/Quip":7,"./quip-control.js":9,"backbone":"backbone","vague-time":"vague-time"}],5:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _backbone = require('backbone');

var _backbone2 = _interopRequireDefault(_backbone);

var CurrentUserModel = (function (_Backbone$Model) {
    _inherits(CurrentUserModel, _Backbone$Model);

    _createClass(CurrentUserModel, [{
        key: "defaults",
        value: function defaults() {
            return {
                username: "",
                profileImage: "",
                createdAt: "",
                id: ""
            };
        }
    }]);

    function CurrentUserModel(props) {
        _classCallCheck(this, CurrentUserModel);

        _get(Object.getPrototypeOf(CurrentUserModel.prototype), "constructor", this).call(this, props);
        this.url = "/current_user";
    }

    return CurrentUserModel;
})(_backbone2["default"].Model);

exports.CurrentUserModel = CurrentUserModel;

},{"backbone":"backbone"}],6:[function(require,module,exports){
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

var ListenState = (function (_Backbone$Model) {
    _inherits(ListenState, _Backbone$Model);

    _createClass(ListenState, [{
        key: 'defaults',
        value: function defaults() {
            return {
                audioId: 0, // id string of quip
                progress: 0 };
        }
    }]);

    // [0-100]

    function ListenState(props) {
        _classCallCheck(this, ListenState);

        _get(Object.getPrototypeOf(ListenState.prototype), 'constructor', this).call(this, props);
        this.urlRoot = '/listen';
    }

    return ListenState;
})(_backbone2['default'].Model);

var ListenStateCollection = (function (_Backbone$Collection) {
    _inherits(ListenStateCollection, _Backbone$Collection);

    function ListenStateCollection(opts) {
        _classCallCheck(this, ListenStateCollection);

        _get(Object.getPrototypeOf(ListenStateCollection.prototype), 'constructor', this).call(this, opts);
        this.model = ListenState;
        this.url = "/listen";
    }

    return ListenStateCollection;
})(_backbone2['default'].Collection);

exports.ListenState = ListenState;
exports.ListenStateCollection = ListenStateCollection;

},{"backbone":"backbone"}],7:[function(require,module,exports){
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

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var QuipModel = (function (_Backbone$Model) {
    _inherits(QuipModel, _Backbone$Model);

    _createClass(QuipModel, [{
        key: 'defaults',
        value: function defaults() {
            return {
                id: 0, // guid
                progress: 0, // [0-100] percentage
                position: 0, // seconds
                duration: 0, // seconds
                isPublic: false
            };
        }
    }]);

    function QuipModel(props) {
        _classCallCheck(this, QuipModel);

        _get(Object.getPrototypeOf(QuipModel.prototype), 'constructor', this).call(this, props);
        this.urlRoot = "/quips";

        // save listening progress at most every 3 seconds
        this.throttledSave = _underscore2['default'].throttle(this.save, 3000);
    }

    //save(attributes) {
    //    console.log("Quip Model saving to localStorage");
    //    localStorage.setItem(this.id, JSON.stringify(this.toJSON()));
    //}
    //
    //fetch() {
    //    console.log("Quip Model loading from localStorage");
    //    this.set(JSON.parse(localStorage.getItem(this.id)));
    //}
    return QuipModel;
})(_backbone2['default'].Model);

var MyQuipCollection = (function (_Backbone$Collection) {
    _inherits(MyQuipCollection, _Backbone$Collection);

    function MyQuipCollection(opts) {
        _classCallCheck(this, MyQuipCollection);

        _get(Object.getPrototypeOf(MyQuipCollection.prototype), 'constructor', this).call(this, opts);
        this.model = QuipModel;
        this.url = "/quips";
    }

    return MyQuipCollection;
})(_backbone2['default'].Collection);

exports.QuipModel = QuipModel;
exports.MyQuipCollection = MyQuipCollection;

},{"backbone":"backbone","underscore":"underscore"}],8:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Polyfill = (function () {
    function Polyfill() {
        _classCallCheck(this, Polyfill);
    }

    _createClass(Polyfill, null, [{
        key: "install",
        value: function install() {
            window.AudioContext = window.AudioContext || window.webkitAudioContext || false;
            navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia || false;

            if (navigator.mediaDevice == null) {
                console.log("polyfilling mediaDevice.getUserMedia");

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
    }]);

    return Polyfill;
})();

exports["default"] = Polyfill;
module.exports = exports["default"];

},{}],9:[function(require,module,exports){
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

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _audioPlayerJs = require('./audio-player.js');

var _audioPlayerJs2 = _interopRequireDefault(_audioPlayerJs);

var _modelsQuip = require('./models/Quip');

var AudioPlayerEvents = (function (_Backbone$Model) {
    _inherits(AudioPlayerEvents, _Backbone$Model);

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
                position: this.audioPlayer.currentTime, // sec
                duration: this.audioPlayer.duration, // sec
                progress: 100 * this.audioPlayer.currentTime / this.audioPlayer.duration // %
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
            this.audioPlayer.currentTime = Math.floor(quipModel.position);
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
            this.audioPlayer.load();
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
        key: 'onPause',
        value: function onPause() {
            console.log("QuipView; paused");

            $(this.el).find('.fa-pause').removeClass('fa-pause').addClass('fa-play');
        }
    }, {
        key: 'onPlay',
        value: function onPlay() {
            console.log("QuipView; playing");

            $(this.el).find('.fa-play').removeClass('fa-play').addClass('fa-pause');
        }
    }, {
        key: 'onProgress',
        value: function onProgress(progressUpdate) {
            this.model.set({ 'position': progressUpdate.position }); // sec
            this.model.set({ 'duration': progressUpdate.duration }); // sec
            this.model.set({ 'progress': progressUpdate.progress }); // %
            this.model.throttledSave();
        }
    }, {
        key: 'initialize',
        value: function initialize() {
            var _this3 = this;

            this.template = _underscore2['default'].template($('#quip-template').html());

            var id = this.model.get("id");

            AudioPlayer.on("/" + id + "/paused", function () {
                return _this3.onPause();
            });
            AudioPlayer.on("/" + id + "/playing", function () {
                return _this3.onPlay();
            });
            AudioPlayer.on("/" + id + "/progress", function (update) {
                return _this3.onProgress(update);
            });

            this.render();

            $(this.el).find(".progress-bar").css("width", this.model.get('progress') + "%");

            // update visuals to indicate playback progress
            this.model.on('change:progress', function (model, progress) {
                $(_this3.el).find(".progress-bar").css("width", progress + "%");
            });

            //this.on(this.model, "change", this.render);
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

            this.model.save();

            return false;
        }
    }, {
        key: 'togglePlayback',
        value: function togglePlayback(event) {
            AudioPlayer.trigger("toggle", this.model.attributes);
        }
    }, {
        key: 'render',
        value: function render() {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        }
    }, {
        key: 'defaults',
        get: function get() {
            return {
                quipId: 0,
                audioPlayer: null
            };
        }
    }, {
        key: 'events',
        get: function get() {
            return {
                "click .quip-actions .lock-indicator": "togglePublic",
                "click .quip-player": "togglePlayback"
            };
        }
    }, {
        key: 'tagName',
        get: function get() {
            return 'div';
        }
    }]);

    return QuipView;
})(_backbone2['default'].View);

var QuipList = (function (_Backbone$Collection) {
    _inherits(QuipList, _Backbone$Collection);

    function QuipList(options) {
        _classCallCheck(this, QuipList);

        _get(Object.getPrototypeOf(QuipList.prototype), 'constructor', this).call(this, options);
        this.model = _modelsQuip.QuipModel;
    }

    return QuipList;
})(_backbone2['default'].Collection);

var Quips = new QuipList();

exports.QuipModel = _modelsQuip.QuipModel;
exports.QuipView = QuipView;
exports.QuipList = QuipList;
exports.Quips = Quips;
exports.AudioPlayerView = AudioPlayerView;

},{"./audio-player.js":3,"./models/Quip":7,"backbone":"backbone","underscore":"underscore"}],10:[function(require,module,exports){
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

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

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
        key: 'render',
        value: function render() {
            console.log("rendering recorder control");
            this.template = _underscore2['default'].template($('#quip-recorder-template').html());
            this.$el.html(this.template(this.model.toJSON()));
        }
    }, {
        key: 'initialize',
        value: function initialize(options) {
            console.log("RecorderView init");
            this.audioCapture = new _audioCapture.AudioCapture();

            this.render();

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

},{"./audio-capture":2,"./quip-control.js":9,"backbone":"backbone","underscore":"underscore"}],11:[function(require,module,exports){
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

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _homepage = require('./homepage');

var _homepage2 = _interopRequireDefault(_homepage);

var _recordingControl = require('./recording-control');

var Router = (function (_Backbone$Router) {
    _inherits(Router, _Backbone$Router);

    function Router() {
        _classCallCheck(this, Router);

        _get(Object.getPrototypeOf(Router.prototype), 'constructor', this).call(this, {
            routes: {
                '': 'home',
                'record': 'record',
                'u/:username': 'user'
            }
        });
    }

    _createClass(Router, [{
        key: 'home',
        value: function home() {
            console.log('Router#home called');

            var view = new _homepage2['default']({ className: "transitionable" });
            this.switchView(view);
        }
    }, {
        key: 'user',
        value: function user(username) {
            console.log('Router#user called for username = ' + username);
        }
    }, {
        key: 'record',
        value: function record() {
            console.log('Router#record called');

            var view = new _recordingControl.RecorderView({
                className: "transitionable",
                model: new _recordingControl.Recorder({ recordingTime: -3 })
            });

            this.switchView(view);
        }
    }, {
        key: 'switchView',
        value: function switchView(newView) {
            if (this.view) {
                var oldView = this.view;
                oldView.$el.removeClass("transition-in");
                oldView.$el.addClass("transition-out");
                oldView.$el.one("animationend", function () {
                    console.log("animation ended");
                    oldView.remove();
                });
            }

            newView.$el.addClass("transition-in");
            newView.$el.one("animationend", function () {
                console.log("animation-in ended");
                newView.$el.removeClass("transition-in");
            });

            $('#view-container').append(newView.el);
            this.view = newView;
        }
    }]);

    return Router;
})(_backbone2['default'].Router);

exports['default'] = Router;
module.exports = exports['default'];

},{"./homepage":4,"./recording-control":10,"backbone":"backbone","underscore":"underscore"}]},{},[1])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvYWJhcmthbi9hbGV4LWRldi9xdWlwcy1weXRob24vYXBwL2phdmFzY3JpcHRzL2FwcC5qcyIsIi9Vc2Vycy9hYmFya2FuL2FsZXgtZGV2L3F1aXBzLXB5dGhvbi9hcHAvamF2YXNjcmlwdHMvYXVkaW8tY2FwdHVyZS5qcyIsIi9Vc2Vycy9hYmFya2FuL2FsZXgtZGV2L3F1aXBzLXB5dGhvbi9hcHAvamF2YXNjcmlwdHMvYXVkaW8tcGxheWVyLmpzIiwiL1VzZXJzL2FiYXJrYW4vYWxleC1kZXYvcXVpcHMtcHl0aG9uL2FwcC9qYXZhc2NyaXB0cy9ob21lcGFnZS5qcyIsIi9Vc2Vycy9hYmFya2FuL2FsZXgtZGV2L3F1aXBzLXB5dGhvbi9hcHAvamF2YXNjcmlwdHMvbW9kZWxzL0N1cnJlbnRVc2VyLmpzIiwiL1VzZXJzL2FiYXJrYW4vYWxleC1kZXYvcXVpcHMtcHl0aG9uL2FwcC9qYXZhc2NyaXB0cy9tb2RlbHMvTGlzdGVuU3RhdGUuanMiLCIvVXNlcnMvYWJhcmthbi9hbGV4LWRldi9xdWlwcy1weXRob24vYXBwL2phdmFzY3JpcHRzL21vZGVscy9RdWlwLmpzIiwiL1VzZXJzL2FiYXJrYW4vYWxleC1kZXYvcXVpcHMtcHl0aG9uL2FwcC9qYXZhc2NyaXB0cy9wb2x5ZmlsbC5qcyIsIi9Vc2Vycy9hYmFya2FuL2FsZXgtZGV2L3F1aXBzLXB5dGhvbi9hcHAvamF2YXNjcmlwdHMvcXVpcC1jb250cm9sLmpzIiwiL1VzZXJzL2FiYXJrYW4vYWxleC1kZXYvcXVpcHMtcHl0aG9uL2FwcC9qYXZhc2NyaXB0cy9yZWNvcmRpbmctY29udHJvbC5qcyIsIi9Vc2Vycy9hYmFya2FuL2FsZXgtZGV2L3F1aXBzLXB5dGhvbi9hcHAvamF2YXNjcmlwdHMvcm91dGVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7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LENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxDQUFDO2FBQzVDLENBQUMsQ0FBQzs7QUFFSCxhQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ3hDLGdCQUFJLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQztTQUN2Qjs7O1dBckRDLE1BQU07R0FBUyxzQkFBUyxNQUFNOztxQkF3RHJCLE1BQU0iLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiaW1wb3J0IEJhY2tib25lIGZyb20gJ2JhY2tib25lJ1xuaW1wb3J0IGpRdWVyeSBmcm9tICdqcXVlcnknXG5pbXBvcnQgeyBMaXN0ZW5TdGF0ZSwgTGlzdGVuU3RhdGVDb2xsZWN0aW9uIH0gZnJvbSAnLi9tb2RlbHMvTGlzdGVuU3RhdGUnXG5pbXBvcnQgeyBDdXJyZW50VXNlck1vZGVsIH0gZnJvbSAnLi9tb2RlbHMvQ3VycmVudFVzZXInXG5pbXBvcnQgUm91dGVyIGZyb20gJy4vcm91dGVyJ1xuXG4kID0gcmVxdWlyZSgnanF1ZXJ5Jyk7XG5cbmNsYXNzIEFwcGxpY2F0aW9uIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdmFyIHJvdXRlciA9IG5ldyBSb3V0ZXIoKTtcblxuICAgICAgICBCYWNrYm9uZS4kID0gJDtcbiAgICAgICAgQmFja2JvbmUuaGlzdG9yeS5zdGFydCh7cHVzaFN0YXRlOiB0cnVlLCBoYXNoQ2hhbmdlOiBmYWxzZX0pO1xuICAgICAgICAvL2lmICghQmFja2JvbmUuaGlzdG9yeS5zdGFydCh7cHVzaFN0YXRlOiB0cnVlLCBoYXNoQ2hhbmdlOiBmYWxzZX0pKSByb3V0ZXIubmF2aWdhdGUoJzQwNCcsIHt0cmlnZ2VyOiB0cnVlfSk7XG5cbiAgICAgICAgLy8gVXNlIGRlbGVnYXRpb24gdG8gYXZvaWQgaW5pdGlhbCBET00gc2VsZWN0aW9uIGFuZCBhbGxvdyBhbGwgbWF0Y2hpbmcgZWxlbWVudHMgdG8gYnViYmxlXG4gICAgICAgICQoZG9jdW1lbnQpLmRlbGVnYXRlKFwiYVwiLCBcImNsaWNrXCIsIGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICAgICAgLy8gR2V0IHRoZSBhbmNob3IgaHJlZiBhbmQgcHJvdGNvbFxuICAgICAgICAgICAgdmFyIGhyZWYgPSAkKHRoaXMpLmF0dHIoXCJocmVmXCIpO1xuICAgICAgICAgICAgdmFyIHByb3RvY29sID0gdGhpcy5wcm90b2NvbCArIFwiLy9cIjtcblxuICAgICAgICAgICAgdmFyIG9wZW5MaW5rSW5UYWIgPSBmYWxzZTtcblxuICAgICAgICAgICAgLy8gRW5zdXJlIHRoZSBwcm90b2NvbCBpcyBub3QgcGFydCBvZiBVUkwsIG1lYW5pbmcgaXRzIHJlbGF0aXZlLlxuICAgICAgICAgICAgLy8gU3RvcCB0aGUgZXZlbnQgYnViYmxpbmcgdG8gZW5zdXJlIHRoZSBsaW5rIHdpbGwgbm90IGNhdXNlIGEgcGFnZSByZWZyZXNoLlxuICAgICAgICAgICAgaWYgKCFvcGVuTGlua0luVGFiICYmIGhyZWYuc2xpY2UocHJvdG9jb2wubGVuZ3RoKSAhPT0gcHJvdG9jb2wpIHtcbiAgICAgICAgICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICAgICAgICAgIC8vIE5vdGUgYnkgdXNpbmcgQmFja2JvbmUuaGlzdG9yeS5uYXZpZ2F0ZSwgcm91dGVyIGV2ZW50cyB3aWxsIG5vdCBiZVxuICAgICAgICAgICAgICAgIC8vIHRyaWdnZXJlZC4gIElmIHRoaXMgaXMgYSBwcm9ibGVtLCBjaGFuZ2UgdGhpcyB0byBuYXZpZ2F0ZSBvbiB5b3VyXG4gICAgICAgICAgICAgICAgLy8gcm91dGVyLlxuICAgICAgICAgICAgICAgIEJhY2tib25lLmhpc3RvcnkubmF2aWdhdGUoaHJlZiwgdHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIGxvYWQgdXNlclxuICAgICAgICB2YXIgbW9kZWwgPSBuZXcgQ3VycmVudFVzZXJNb2RlbCgpO1xuICAgICAgICBtb2RlbC5mZXRjaCgpLnRoZW4oKCkgPT4gdGhpcy5vbk1vZGVsTG9hZGVkKG1vZGVsKSk7XG5cbiAgICAgICAgLy9uZXcgTGlzdGVuU3RhdGVDb2xsZWN0aW9uKCkuZmV0Y2goKS50aGVuKChzdGF0ZSkgPT4gY29uc29sZS5sb2coXCJnb3QgbGlzdGVuIHN0YXRlc1wiLCBzdGF0ZSkpO1xuICAgIH1cblxuICAgIG9uTW9kZWxMb2FkZWQodXNlcikge1xuICAgICAgICBjb25zb2xlLmxvZyhcIkxvYWRlZCBjdXJyZW50IHVzZXJcIiwgdXNlci5hdHRyaWJ1dGVzKTtcbiAgICAgICAgdGhpcy5jdXJyZW50VXNlciA9IHVzZXI7XG4gICAgfVxufVxuXG4kKCgpID0+IHtcbiAgICAvLyBzZXR1cCByYXZlbiB0byBwdXNoIG1lc3NhZ2VzIHRvIG91ciBzZW50cnlcbiAgICAvL1JhdmVuLmNvbmZpZygnaHR0cHM6Ly9kMDk4NzEyY2I3MDY0Y2YwOGI3NGQwMWI2ZjNiZTNkYUBhcHAuZ2V0c2VudHJ5LmNvbS8yMDk3MycsIHtcbiAgICAvLyAgICB3aGl0ZWxpc3RVcmxzOiBbJ3N0YWdpbmcuY291Y2hwb2QuY29tJywgJ2NvdWNocG9kLmNvbSddIC8vIHByb2R1Y3Rpb24gb25seVxuICAgIC8vfSkuaW5zdGFsbCgpO1xuXG4gICAgUmF2ZW4uY29uZmlnKCdodHRwczovL2RiMmE3ZDU4MTA3YzQ5NzVhZTdkZTczNmE2MzA4YTFlQGFwcC5nZXRzZW50cnkuY29tLzUzNDU2Jywge1xuICAgICAgICB3aGl0ZWxpc3RVcmxzOiBbJ3N0YWdpbmcuY291Y2hwb2QuY29tJywgJ2NvdWNocG9kLmNvbSddIC8vIHByb2R1Y3Rpb24gb25seVxuICAgIH0pLmluc3RhbGwoKVxuXG4gICAgdmFyIGFwcCA9IG5ldyBBcHBsaWNhdGlvbigpO1xuXG4gICAgLy8gZm9yIHByb2R1Y3Rpb24sIGNvdWxkIHdyYXAgZG9tUmVhZHlDYWxsYmFjayBhbmQgbGV0IHJhdmVuIGhhbmRsZSBhbnkgZXhjZXB0aW9uc1xuXG4gICAgLypcbiAgICAgdHJ5IHtcbiAgICAgZG9tUmVhZHlDYWxsYmFjaygpO1xuICAgICB9IGNhdGNoKGVycikge1xuICAgICBSYXZlbi5jYXB0dXJlRXhjZXB0aW9uKGVycik7XG4gICAgIGNvbnNvbGUubG9nKFwiW0Vycm9yXSBVbmhhbmRsZWQgRXhjZXB0aW9uIHdhcyBjYXVnaHQgYW5kIHNlbnQgdmlhIFJhdmVuOlwiKTtcbiAgICAgY29uc29sZS5kaXIoZXJyKTtcbiAgICAgfVxuICAgICAqL1xufSlcblxuZXhwb3J0IGRlZmF1bHQge0FwcGxpY2F0aW9ufVxuIiwiaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSdcbmltcG9ydCBQb2x5ZmlsbCBmcm9tICcuL3BvbHlmaWxsLmpzJ1xuXG5leHBvcnQgY2xhc3MgQXVkaW9DYXB0dXJlIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgLy8gc3Bhd24gYmFja2dyb3VuZCB3b3JrZXJcbiAgICAgICAgdGhpcy5fZW5jb2RpbmdXb3JrZXIgPSBuZXcgV29ya2VyKFwiL2Fzc2V0cy9qcy93b3JrZXItZW5jb2Rlci5taW4uanNcIik7XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJJbml0aWFsaXplZCBBdWRpb0NhcHR1cmVcIik7XG5cbiAgICAgICAgdGhpcy5fYXVkaW9Db250ZXh0ID0gbnVsbDtcbiAgICAgICAgdGhpcy5fYXVkaW9JbnB1dCA9IG51bGw7XG4gICAgICAgIHRoaXMuX2VuY29kaW5nV29ya2VyID0gbnVsbDtcbiAgICAgICAgdGhpcy5faXNSZWNvcmRpbmcgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5fYXVkaW9MaXN0ZW5lciA9IG51bGw7XG4gICAgICAgIHRoaXMuX29uQ2FwdHVyZUNvbXBsZXRlQ2FsbGJhY2sgPSBudWxsO1xuICAgICAgICB0aGlzLl9hdWRpb0FuYWx5emVyID0gbnVsbDtcbiAgICAgICAgdGhpcy5fYXVkaW9HYWluID0gbnVsbDtcbiAgICAgICAgdGhpcy5fY2FjaGVkTWVkaWFTdHJlYW0gPSBudWxsO1xuXG4gICAgICAgIHRoaXMuX2F1ZGlvRW5jb2RlciA9IG51bGw7XG4gICAgICAgIHRoaXMuX2xhdGVzdEF1ZGlvQnVmZmVyID0gW107XG4gICAgICAgIHRoaXMuX2NhY2hlZEdhaW5WYWx1ZSA9IDE7XG4gICAgICAgIHRoaXMuX29uU3RhcnRlZENhbGxiYWNrID0gbnVsbDtcblxuICAgICAgICB0aGlzLl9mZnRTaXplID0gMjU2O1xuICAgICAgICB0aGlzLl9mZnRTbW9vdGhpbmcgPSAwLjg7XG4gICAgICAgIHRoaXMuX3RvdGFsTnVtU2FtcGxlcyA9IDA7XG5cbiAgICAgICAgUG9seWZpbGwuaW5zdGFsbCgpO1xuICAgIH1cblxuICAgIC8vIFRPRE86IGZpcmVmb3gncyBidWlsdC1pbiBvZ2ctY3JlYXRpb24gcm91dGVcbiAgICAvLyBGaXJlZm94IDI3J3MgbWFudWFsIHJlY29yZGluZyBkb2Vzbid0IHdvcmsuIHNvbWV0aGluZyBmdW5ueSB3aXRoIHRoZWlyIHNhbXBsaW5nIHJhdGVzIG9yIGJ1ZmZlciBzaXplc1xuICAgIC8vIHRoZSBkYXRhIGlzIGZhaXJseSBnYXJibGVkLCBsaWtlIHRoZXkgYXJlIHNlcnZpbmcgMjJraHogYXMgNDRraHogb3Igc29tZXRoaW5nIGxpa2UgdGhhdFxuICAgIHN0YXJ0QXV0b21hdGljRW5jb2RpbmcobWVkaWFTdHJlYW0pIHtcbiAgICAgICAgdGhpcy5fYXVkaW9FbmNvZGVyID0gbmV3IE1lZGlhUmVjb3JkZXIobWVkaWFTdHJlYW0pO1xuXG4gICAgICAgIHRoaXMuX2F1ZGlvRW5jb2Rlci5vbmRhdGFhdmFpbGFibGUgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJBdWRpb0NhcHR1cmU6OnN0YXJ0QXV0b21hdGljRW5jb2RpbmcoKTsgTWVkaWFSZWNvcmRlci5vbmRhdGFhdmFpbGFibGUoKTsgbmV3IGJsb2I6IHNpemU9XCIgKyBlLmRhdGEuc2l6ZSArIFwiIHR5cGU9XCIgKyBlLmRhdGEudHlwZSk7XG4gICAgICAgICAgICB0aGlzLl9sYXRlc3RBdWRpb0J1ZmZlci5wdXNoKGUuZGF0YSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5fYXVkaW9FbmNvZGVyLm9uc3RvcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQXVkaW9DYXB0dXJlOjpzdGFydEF1dG9tYXRpY0VuY29kaW5nKCk7IE1lZGlhUmVjb3JkZXIub25zdG9wKCk7IGhpdFwiKTtcblxuICAgICAgICAgICAgLy8gc2VuZCB0aGUgbGFzdCBjYXB0dXJlZCBhdWRpbyBidWZmZXJcbiAgICAgICAgICAgIHZhciBlbmNvZGVkX2Jsb2IgPSBuZXcgQmxvYih0aGlzLl9sYXRlc3RBdWRpb0J1ZmZlciwge3R5cGU6ICdhdWRpby9vZ2cnfSk7XG5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQXVkaW9DYXB0dXJlOjpzdGFydEF1dG9tYXRpY0VuY29kaW5nKCk7IE1lZGlhUmVjb3JkZXIub25zdG9wKCk7IGdvdCBlbmNvZGVkIGJsb2I6IHNpemU9XCIgKyBlbmNvZGVkX2Jsb2Iuc2l6ZSArIFwiIHR5cGU9XCIgKyBlbmNvZGVkX2Jsb2IudHlwZSk7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLl9vbkNhcHR1cmVDb21wbGV0ZUNhbGxiYWNrKVxuICAgICAgICAgICAgICAgIHRoaXMuX29uQ2FwdHVyZUNvbXBsZXRlQ2FsbGJhY2soZW5jb2RlZF9ibG9iKTtcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zb2xlLmxvZyhcIkF1ZGlvQ2FwdHVyZTo6c3RhcnRBdXRvbWF0aWNFbmNvZGluZygpOyBNZWRpYVJlY29yZGVyLnN0YXJ0KClcIik7XG4gICAgICAgIHRoaXMuX2F1ZGlvRW5jb2Rlci5zdGFydCgwKTtcbiAgICB9XG5cbiAgICBjcmVhdGVBdWRpb0NvbnRleHQobWVkaWFTdHJlYW0pIHtcbiAgICAgICAgLy8gYnVpbGQgY2FwdHVyZSBncmFwaFxuICAgICAgICB0aGlzLl9hdWRpb0NvbnRleHQgPSBuZXcgKHdpbmRvdy5BdWRpb0NvbnRleHQgfHwgd2luZG93LndlYmtpdEF1ZGlvQ29udGV4dCkoKTtcbiAgICAgICAgdGhpcy5fYXVkaW9JbnB1dCA9IHRoaXMuX2F1ZGlvQ29udGV4dC5jcmVhdGVNZWRpYVN0cmVhbVNvdXJjZShtZWRpYVN0cmVhbSk7XG4gICAgICAgIHRoaXMuX2F1ZGlvRGVzdGluYXRpb24gPSB0aGlzLl9hdWRpb0NvbnRleHQuY3JlYXRlTWVkaWFTdHJlYW1EZXN0aW5hdGlvbigpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiQXVkaW9DYXB0dXJlOjpzdGFydE1hbnVhbEVuY29kaW5nKCk7IF9hdWRpb0NvbnRleHQuc2FtcGxlUmF0ZTogXCIgKyB0aGlzLl9hdWRpb0NvbnRleHQuc2FtcGxlUmF0ZSArIFwiIEh6XCIpO1xuXG4gICAgICAgIC8vIGNyZWF0ZSBhIGxpc3RlbmVyIG5vZGUgdG8gZ3JhYiBtaWNyb3Bob25lIHNhbXBsZXMgYW5kIGZlZWQgaXQgdG8gb3VyIGJhY2tncm91bmQgd29ya2VyXG4gICAgICAgIHRoaXMuX2F1ZGlvTGlzdGVuZXIgPSAodGhpcy5fYXVkaW9Db250ZXh0LmNyZWF0ZVNjcmlwdFByb2Nlc3NvciB8fCB0aGlzLl9hdWRpb0NvbnRleHQuY3JlYXRlSmF2YVNjcmlwdE5vZGUpLmNhbGwodGhpcy5fYXVkaW9Db250ZXh0LCAxNjM4NCwgMSwgMSk7XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJ0aGlzLl9jYWNoZWRHYWluVmFsdWUgPSBcIiArIHRoaXMuX2NhY2hlZEdhaW5WYWx1ZSk7XG5cbiAgICAgICAgdGhpcy5fYXVkaW9HYWluID0gdGhpcy5fYXVkaW9Db250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICAgICAgdGhpcy5fYXVkaW9HYWluLmdhaW4udmFsdWUgPSB0aGlzLl9jYWNoZWRHYWluVmFsdWU7XG5cbiAgICAgICAgLy90aGlzLl9hdWRpb0FuYWx5emVyID0gdGhpcy5fYXVkaW9Db250ZXh0LmNyZWF0ZUFuYWx5c2VyKCk7XG4gICAgICAgIC8vdGhpcy5fYXVkaW9BbmFseXplci5mZnRTaXplID0gdGhpcy5fZmZ0U2l6ZTtcbiAgICAgICAgLy90aGlzLl9hdWRpb0FuYWx5emVyLnNtb290aGluZ1RpbWVDb25zdGFudCA9IHRoaXMuX2ZmdFNtb290aGluZztcbiAgICB9XG5cbiAgICBzdGFydE1hbnVhbEVuY29kaW5nKG1lZGlhU3RyZWFtKSB7XG5cbiAgICAgICAgaWYgKCF0aGlzLl9hdWRpb0NvbnRleHQpIHtcbiAgICAgICAgICAgIHRoaXMuY3JlYXRlQXVkaW9Db250ZXh0KG1lZGlhU3RyZWFtKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdGhpcy5fZW5jb2RpbmdXb3JrZXIpXG4gICAgICAgICAgICB0aGlzLl9lbmNvZGluZ1dvcmtlciA9IG5ldyBXb3JrZXIoXCIvYXNzZXRzL2pzL3dvcmtlci1lbmNvZGVyLm1pbi5qc1wiKTtcblxuICAgICAgICAvLyByZS1ob29rIGF1ZGlvIGxpc3RlbmVyIG5vZGUgZXZlcnkgdGltZSB3ZSBzdGFydCwgYmVjYXVzZSBfZW5jb2RpbmdXb3JrZXIgcmVmZXJlbmNlIHdpbGwgY2hhbmdlXG4gICAgICAgIHRoaXMuX2F1ZGlvTGlzdGVuZXIub25hdWRpb3Byb2Nlc3MgPSAoZSkgPT4ge1xuICAgICAgICAgICAgaWYgKCF0aGlzLl9pc1JlY29yZGluZykgcmV0dXJuO1xuXG4gICAgICAgICAgICB2YXIgbXNnID0ge1xuICAgICAgICAgICAgICAgIGFjdGlvbjogXCJwcm9jZXNzXCIsXG5cbiAgICAgICAgICAgICAgICAvLyB0d28gRmxvYXQzMkFycmF5c1xuICAgICAgICAgICAgICAgIGxlZnQ6IGUuaW5wdXRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMClcbiAgICAgICAgICAgICAgICAvL3JpZ2h0OiBlLmlucHV0QnVmZmVyLmdldENoYW5uZWxEYXRhKDEpXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvL3ZhciBsZWZ0T3V0ID0gZS5vdXRwdXRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCk7XG4gICAgICAgICAgICAvL2Zvcih2YXIgaSA9IDA7IGkgPCBtc2cubGVmdC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgLy8gICAgbGVmdE91dFtpXSA9IG1zZy5sZWZ0W2ldO1xuICAgICAgICAgICAgLy99XG5cbiAgICAgICAgICAgIHRoaXMuX3RvdGFsTnVtU2FtcGxlcyArPSBtc2cubGVmdC5sZW5ndGg7XG5cbiAgICAgICAgICAgIHRoaXMuX2VuY29kaW5nV29ya2VyLnBvc3RNZXNzYWdlKG1zZyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gaGFuZGxlIG1lc3NhZ2VzIGZyb20gdGhlIGVuY29kaW5nLXdvcmtlclxuICAgICAgICB0aGlzLl9lbmNvZGluZ1dvcmtlci5vbm1lc3NhZ2UgPSAoZSkgPT4ge1xuXG4gICAgICAgICAgICAvLyB3b3JrZXIgZmluaXNoZWQgYW5kIGhhcyB0aGUgZmluYWwgZW5jb2RlZCBhdWRpbyBidWZmZXIgZm9yIHVzXG4gICAgICAgICAgICBpZiAoZS5kYXRhLmFjdGlvbiA9PT0gXCJlbmNvZGVkXCIpIHtcbiAgICAgICAgICAgICAgICB2YXIgZW5jb2RlZF9ibG9iID0gbmV3IEJsb2IoW2UuZGF0YS5idWZmZXJdLCB7dHlwZTogJ2F1ZGlvL29nZyd9KTtcblxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZS5kYXRhLmJ1ZmZlci5idWZmZXIgPSBcIiArIGUuZGF0YS5idWZmZXIuYnVmZmVyKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImUuZGF0YS5idWZmZXIuYnl0ZUxlbmd0aCA9IFwiICsgZS5kYXRhLmJ1ZmZlci5ieXRlTGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInNhbXBsZVJhdGUgPSBcIiArIHRoaXMuX2F1ZGlvQ29udGV4dC5zYW1wbGVSYXRlKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInRvdGFsTnVtU2FtcGxlcyA9IFwiICsgdGhpcy5fdG90YWxOdW1TYW1wbGVzKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkR1cmF0aW9uIG9mIHJlY29yZGluZyA9IFwiICsgKHRoaXMuX3RvdGFsTnVtU2FtcGxlcyAvIHRoaXMuX2F1ZGlvQ29udGV4dC5zYW1wbGVSYXRlKSArIFwiIHNlY29uZHNcIik7XG5cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImdvdCBlbmNvZGVkIGJsb2I6IHNpemU9XCIgKyBlbmNvZGVkX2Jsb2Iuc2l6ZSArIFwiIHR5cGU9XCIgKyBlbmNvZGVkX2Jsb2IudHlwZSk7XG5cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fb25DYXB0dXJlQ29tcGxldGVDYWxsYmFjaylcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fb25DYXB0dXJlQ29tcGxldGVDYWxsYmFjayhlbmNvZGVkX2Jsb2IpO1xuXG4gICAgICAgICAgICAgICAgLy8gd29ya2VyIGhhcyBleGl0ZWQsIHVucmVmZXJlbmNlIGl0XG4gICAgICAgICAgICAgICAgdGhpcy5fZW5jb2RpbmdXb3JrZXIgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIGNvbmZpZ3VyZSB3b3JrZXIgd2l0aCBhIHNhbXBsaW5nIHJhdGUgYW5kIGJ1ZmZlci1zaXplXG4gICAgICAgIHRoaXMuX2VuY29kaW5nV29ya2VyLnBvc3RNZXNzYWdlKHtcbiAgICAgICAgICAgIGFjdGlvbjogXCJpbml0aWFsaXplXCIsXG4gICAgICAgICAgICBzYW1wbGVfcmF0ZTogdGhpcy5fYXVkaW9Db250ZXh0LnNhbXBsZVJhdGUsXG4gICAgICAgICAgICBidWZmZXJfc2l6ZTogdGhpcy5fYXVkaW9MaXN0ZW5lci5idWZmZXJTaXplXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFRPRE86IGl0IG1pZ2h0IGJlIGJldHRlciB0byBsaXN0ZW4gZm9yIGEgbWVzc2FnZSBiYWNrIGZyb20gdGhlIGJhY2tncm91bmQgd29ya2VyIGJlZm9yZSBjb25zaWRlcmluZyB0aGF0IHJlY29yZGluZyBoYXMgYmVnYW5cbiAgICAgICAgLy8gaXQncyBlYXNpZXIgdG8gdHJpbSBhdWRpbyB0aGFuIGNhcHR1cmUgYSBtaXNzaW5nIHdvcmQgYXQgdGhlIHN0YXJ0IG9mIGEgc2VudGVuY2VcbiAgICAgICAgdGhpcy5faXNSZWNvcmRpbmcgPSBmYWxzZTtcblxuICAgICAgICAvLyBjb25uZWN0IGF1ZGlvIG5vZGVzXG4gICAgICAgIC8vIGF1ZGlvLWlucHV0IC0+IGdhaW4gLT4gZmZ0LWFuYWx5emVyIC0+IFBDTS1kYXRhIGNhcHR1cmUgLT4gZGVzdGluYXRpb25cblxuICAgICAgICBjb25zb2xlLmxvZyhcIkF1ZGlvQ2FwdHVyZTo6c3RhcnRNYW51YWxFbmNvZGluZygpOyBDb25uZWN0aW5nIEF1ZGlvIE5vZGVzLi5cIik7XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJjb25uZWN0aW5nOiBpbnB1dC0+Z2FpblwiKTtcbiAgICAgICAgdGhpcy5fYXVkaW9JbnB1dC5jb25uZWN0KHRoaXMuX2F1ZGlvR2Fpbik7XG4gICAgICAgIC8vY29uc29sZS5sb2coXCJjb25uZWN0aW5nOiBnYWluLT5hbmFseXplclwiKTtcbiAgICAgICAgLy90aGlzLl9hdWRpb0dhaW4uY29ubmVjdCh0aGlzLl9hdWRpb0FuYWx5emVyKTtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcImNvbm5lY3Rpbmc6IGFuYWx5emVyLT5saXN0ZXNuZXJcIik7XG4gICAgICAgIC8vdGhpcy5fYXVkaW9BbmFseXplci5jb25uZWN0KHRoaXMuX2F1ZGlvTGlzdGVuZXIpO1xuICAgICAgICAvLyBjb25uZWN0IGdhaW4gZGlyZWN0bHkgaW50byBsaXN0ZW5lciwgYnlwYXNzaW5nIGFuYWx5emVyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiY29ubmVjdGluZzogZ2Fpbi0+bGlzdGVuZXJcIik7XG4gICAgICAgIHRoaXMuX2F1ZGlvR2Fpbi5jb25uZWN0KHRoaXMuX2F1ZGlvTGlzdGVuZXIpO1xuICAgICAgICBjb25zb2xlLmxvZyhcImNvbm5lY3Rpbmc6IGxpc3RlbmVyLT5kZXN0aW5hdGlvblwiKTtcbiAgICAgICAgdGhpcy5fYXVkaW9MaXN0ZW5lci5jb25uZWN0KHRoaXMuX2F1ZGlvRGVzdGluYXRpb24pO1xuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHNodXRkb3duTWFudWFsRW5jb2RpbmcoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiQXVkaW9DYXB0dXJlOjpzaHV0ZG93bk1hbnVhbEVuY29kaW5nKCk7IFRlYXJpbmcgZG93biBBdWRpb0FQSSBjb25uZWN0aW9ucy4uXCIpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiZGlzY29ubmVjdGluZzogbGlzdGVuZXItPmRlc3RpbmF0aW9uXCIpO1xuICAgICAgICB0aGlzLl9hdWRpb0xpc3RlbmVyLmRpc2Nvbm5lY3QodGhpcy5fYXVkaW9EZXN0aW5hdGlvbik7XG4gICAgICAgIC8vY29uc29sZS5sb2coXCJkaXNjb25uZWN0aW5nOiBhbmFseXplci0+bGlzdGVzbmVyXCIpO1xuICAgICAgICAvL3RoaXMuX2F1ZGlvQW5hbHl6ZXIuZGlzY29ubmVjdCh0aGlzLl9hdWRpb0xpc3RlbmVyKTtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcImRpc2Nvbm5lY3Rpbmc6IGdhaW4tPmFuYWx5emVyXCIpO1xuICAgICAgICAvL3RoaXMuX2F1ZGlvR2Fpbi5kaXNjb25uZWN0KHRoaXMuX2F1ZGlvQW5hbHl6ZXIpO1xuICAgICAgICBjb25zb2xlLmxvZyhcImRpc2Nvbm5lY3Rpbmc6IGdhaW4tPmxpc3RlbmVyXCIpO1xuICAgICAgICB0aGlzLl9hdWRpb0dhaW4uZGlzY29ubmVjdCh0aGlzLl9hdWRpb0xpc3RlbmVyKTtcbiAgICAgICAgY29uc29sZS5sb2coXCJkaXNjb25uZWN0aW5nOiBpbnB1dC0+Z2FpblwiKTtcbiAgICAgICAgdGhpcy5fYXVkaW9JbnB1dC5kaXNjb25uZWN0KHRoaXMuX2F1ZGlvR2Fpbik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVGhlIG1pY3JvcGhvbmUgbWF5IGJlIGxpdmUsIGJ1dCBpdCBpc24ndCByZWNvcmRpbmcuIFRoaXMgdG9nZ2xlcyB0aGUgYWN0dWFsIHdyaXRpbmcgdG8gdGhlIGNhcHR1cmUgc3RyZWFtLlxuICAgICAqIGNhcHR1cmVBdWRpb1NhbXBsZXMgYm9vbCBpbmRpY2F0ZXMgd2hldGhlciB0byByZWNvcmQgZnJvbSBtaWNcbiAgICAgKi9cbiAgICB0b2dnbGVNaWNyb3Bob25lUmVjb3JkaW5nKGNhcHR1cmVBdWRpb1NhbXBsZXMpIHtcbiAgICAgICAgdGhpcy5faXNSZWNvcmRpbmcgPSBjYXB0dXJlQXVkaW9TYW1wbGVzO1xuICAgIH1cblxuICAgIC8vIGNhbGxlZCB3aGVuIHVzZXIgYWxsb3dzIHVzIHVzZSBvZiB0aGVpciBtaWNyb3Bob25lXG4gICAgb25NaWNyb3Bob25lUHJvdmlkZWQobWVkaWFTdHJlYW0pIHtcblxuICAgICAgICB0aGlzLl9jYWNoZWRNZWRpYVN0cmVhbSA9IG1lZGlhU3RyZWFtO1xuXG4gICAgICAgIC8vIHdlIGNvdWxkIGNoZWNrIGlmIHRoZSBicm93c2VyIGNhbiBwZXJmb3JtIGl0cyBvd24gZW5jb2RpbmcgYW5kIHVzZSB0aGF0XG4gICAgICAgIC8vIEZpcmVmb3ggY2FuIHByb3ZpZGUgdXMgb2dnK3NwZWV4IG9yIG9nZytvcHVzPyBmaWxlcywgYnV0IHVuZm9ydHVuYXRlbHkgdGhhdCBjb2RlYyBpc24ndCBzdXBwb3J0ZWQgd2lkZWx5IGVub3VnaFxuICAgICAgICAvLyBzbyBpbnN0ZWFkIHdlIHBlcmZvcm0gbWFudWFsIGVuY29kaW5nIGV2ZXJ5d2hlcmUgcmlnaHQgbm93IHRvIGdldCB1cyBvZ2crdm9yYmlzXG4gICAgICAgIC8vIHRob3VnaCBvbmUgZGF5LCBpIHdhbnQgb2dnK29wdXMhIG9wdXMgaGFzIGEgd29uZGVyZnVsIHJhbmdlIG9mIHF1YWxpdHkgc2V0dGluZ3MgcGVyZmVjdCBmb3IgdGhpcyBwcm9qZWN0XG5cbiAgICAgICAgaWYgKGZhbHNlICYmIHR5cGVvZihNZWRpYVJlY29yZGVyKSAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgdGhpcy5zdGFydEF1dG9tYXRpY0VuY29kaW5nKG1lZGlhU3RyZWFtKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIG5vIG1lZGlhIHJlY29yZGVyIGF2YWlsYWJsZSwgZG8gaXQgbWFudWFsbHlcbiAgICAgICAgICAgIHRoaXMuc3RhcnRNYW51YWxFbmNvZGluZyhtZWRpYVN0cmVhbSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUT0RPOiBtaWdodCBiZSBhIGdvb2QgdGltZSB0byBzdGFydCBhIHNwZWN0cmFsIGFuYWx5emVyXG4gICAgICAgIGlmICh0aGlzLl9vblN0YXJ0ZWRDYWxsYmFjaylcbiAgICAgICAgICAgIHRoaXMuX29uU3RhcnRlZENhbGxiYWNrKCk7XG4gICAgfVxuXG4gICAgc2V0R2FpbihnYWluKSB7XG4gICAgICAgIGlmICh0aGlzLl9hdWRpb0dhaW4pXG4gICAgICAgICAgICB0aGlzLl9hdWRpb0dhaW4uZ2Fpbi52YWx1ZSA9IGdhaW47XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJzZXR0aW5nIGdhaW46IFwiICsgZ2Fpbik7XG4gICAgICAgIHRoaXMuX2NhY2hlZEdhaW5WYWx1ZSA9IGdhaW47XG4gICAgfVxuXG4gICAgcHJlbG9hZE1lZGlhU3RyZWFtKCkge1xuICAgICAgICBpZiAodGhpcy5fY2FjaGVkTWVkaWFTdHJlYW0pXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgbmF2aWdhdG9yLm1lZGlhRGV2aWNlXG4gICAgICAgICAgICAuZ2V0VXNlck1lZGlhKHthdWRpbzogdHJ1ZX0pXG4gICAgICAgICAgICAudGhlbigobXMpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9jYWNoZWRNZWRpYVN0cmVhbSA9IG1zO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJBdWRpb0NhcHR1cmU6OnN0YXJ0KCk7IGNvdWxkIG5vdCBncmFiIG1pY3JvcGhvbmUuIHBlcmhhcHMgdXNlciBkaWRuJ3QgZ2l2ZSB1cyBwZXJtaXNzaW9uP1wiKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oZXJyKTtcbiAgICAgICAgICAgIH0pXG4gICAgfTtcblxuXG5cbiAgICBzdGFydChvblN0YXJ0ZWRDYWxsYmFjaykge1xuICAgICAgICB0aGlzLl9vblN0YXJ0ZWRDYWxsYmFjayA9IG9uU3RhcnRlZENhbGxiYWNrO1xuXG4gICAgICAgIGlmICh0aGlzLl9jYWNoZWRNZWRpYVN0cmVhbSlcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm9uTWljcm9waG9uZVByb3ZpZGVkKHRoaXMuX2NhY2hlZE1lZGlhU3RyZWFtKTtcblxuICAgICAgICBuYXZpZ2F0b3IubWVkaWFEZXZpY2VcbiAgICAgICAgICAgIC5nZXRVc2VyTWVkaWEoe2F1ZGlvOiB0cnVlfSlcbiAgICAgICAgICAgIC50aGVuKChtcykgPT4gdGhpcy5vbk1pY3JvcGhvbmVQcm92aWRlZChtcykpXG4gICAgICAgICAgICAuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQXVkaW9DYXB0dXJlOjpzdGFydCgpOyBjb3VsZCBub3QgZ3JhYiBtaWNyb3Bob25lLiBwZXJoYXBzIHVzZXIgZGlkbid0IGdpdmUgdXMgcGVybWlzc2lvbj9cIik7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGVycik7XG4gICAgICAgICAgICB9KVxuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHN0b3AoY2FwdHVyZUNvbXBsZXRlQ2FsbGJhY2spIHtcbiAgICAgICAgdGhpcy5fb25DYXB0dXJlQ29tcGxldGVDYWxsYmFjayA9IGNhcHR1cmVDb21wbGV0ZUNhbGxiYWNrO1xuICAgICAgICB0aGlzLl9pc1JlY29yZGluZyA9IGZhbHNlO1xuXG4gICAgICAgIGlmICh0aGlzLl9hdWRpb0NvbnRleHQpIHtcbiAgICAgICAgICAgIC8vIHN0b3AgdGhlIG1hbnVhbCBlbmNvZGVyXG4gICAgICAgICAgICB0aGlzLl9lbmNvZGluZ1dvcmtlci5wb3N0TWVzc2FnZSh7YWN0aW9uOiBcImZpbmlzaFwifSk7XG4gICAgICAgICAgICB0aGlzLnNodXRkb3duTWFudWFsRW5jb2RpbmcoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9hdWRpb0VuY29kZXIpIHtcbiAgICAgICAgICAgIC8vIHN0b3AgdGhlIGF1dG9tYXRpYyBlbmNvZGVyXG5cbiAgICAgICAgICAgIGlmICh0aGlzLl9hdWRpb0VuY29kZXIuc3RhdGUgIT09ICdyZWNvcmRpbmcnKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFwiQXVkaW9DYXB0dXJlOjpzdG9wKCk7IF9hdWRpb0VuY29kZXIuc3RhdGUgIT0gJ3JlY29yZGluZydcIik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuX2F1ZGlvRW5jb2Rlci5yZXF1ZXN0RGF0YSgpO1xuICAgICAgICAgICAgdGhpcy5fYXVkaW9FbmNvZGVyLnN0b3AoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRPRE86IHN0b3AgYW55IGFjdGl2ZSBzcGVjdHJhbCBhbmFseXNpc1xuICAgIH07XG59XG5cbi8vIHVudXNlZCBhdCB0aGUgbW9tZW50XG5mdW5jdGlvbiBBbmFseXplcigpIHtcblxuICAgIHZhciBfYXVkaW9DYW52YXNBbmltYXRpb25JZCxcbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXNcbiAgICAgICAgO1xuXG4gICAgdGhpcy5zdGFydEFuYWx5emVyVXBkYXRlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdXBkYXRlQW5hbHl6ZXIoKTtcbiAgICB9O1xuXG4gICAgdGhpcy5zdG9wQW5hbHl6ZXJVcGRhdGVzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIV9hdWRpb0NhbnZhc0FuaW1hdGlvbklkKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZShfYXVkaW9DYW52YXNBbmltYXRpb25JZCk7XG4gICAgICAgIF9hdWRpb0NhbnZhc0FuaW1hdGlvbklkID0gbnVsbDtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gdXBkYXRlQW5hbHl6ZXIoKSB7XG5cbiAgICAgICAgaWYgKCFfYXVkaW9TcGVjdHJ1bUNhbnZhcylcbiAgICAgICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyZWNvcmRpbmctdmlzdWFsaXplclwiKS5nZXRDb250ZXh0KFwiMmRcIik7XG5cbiAgICAgICAgdmFyIGZyZXFEYXRhID0gbmV3IFVpbnQ4QXJyYXkoX2F1ZGlvQW5hbHl6ZXIuZnJlcXVlbmN5QmluQ291bnQpO1xuICAgICAgICBfYXVkaW9BbmFseXplci5nZXRCeXRlRnJlcXVlbmN5RGF0YShmcmVxRGF0YSk7XG5cbiAgICAgICAgdmFyIG51bUJhcnMgPSBfYXVkaW9BbmFseXplci5mcmVxdWVuY3lCaW5Db3VudDtcbiAgICAgICAgdmFyIGJhcldpZHRoID0gTWF0aC5mbG9vcihfY2FudmFzV2lkdGggLyBudW1CYXJzKSAtIF9mZnRCYXJTcGFjaW5nO1xuXG5cbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uID0gXCJzb3VyY2Utb3ZlclwiO1xuXG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmNsZWFyUmVjdCgwLCAwLCBfY2FudmFzV2lkdGgsIF9jYW52YXNIZWlnaHQpO1xuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5maWxsU3R5bGUgPSAnI2Y2ZDU2NSc7XG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmxpbmVDYXAgPSAncm91bmQnO1xuXG4gICAgICAgIHZhciB4LCB5LCB3LCBoO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbnVtQmFyczsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBmcmVxRGF0YVtpXTtcbiAgICAgICAgICAgIHZhciBzY2FsZWRfdmFsdWUgPSAodmFsdWUgLyAyNTYpICogX2NhbnZhc0hlaWdodDtcblxuICAgICAgICAgICAgeCA9IGkgKiAoYmFyV2lkdGggKyBfZmZ0QmFyU3BhY2luZyk7XG4gICAgICAgICAgICB5ID0gX2NhbnZhc0hlaWdodCAtIHNjYWxlZF92YWx1ZTtcbiAgICAgICAgICAgIHcgPSBiYXJXaWR0aDtcbiAgICAgICAgICAgIGggPSBzY2FsZWRfdmFsdWU7XG5cbiAgICAgICAgICAgIHZhciBncmFkaWVudCA9IF9hdWRpb1NwZWN0cnVtQ2FudmFzLmNyZWF0ZUxpbmVhckdyYWRpZW50KHgsIF9jYW52YXNIZWlnaHQsIHgsIHkpO1xuICAgICAgICAgICAgZ3JhZGllbnQuYWRkQ29sb3JTdG9wKDEuMCwgXCJyZ2JhKDAsMCwwLDEuMClcIik7XG4gICAgICAgICAgICBncmFkaWVudC5hZGRDb2xvclN0b3AoMC4wLCBcInJnYmEoMCwwLDAsMS4wKVwiKTtcblxuICAgICAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZmlsbFN0eWxlID0gZ3JhZGllbnQ7XG4gICAgICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5maWxsUmVjdCh4LCB5LCB3LCBoKTtcblxuICAgICAgICAgICAgaWYgKHNjYWxlZF92YWx1ZSA+IF9oaXRIZWlnaHRzW2ldKSB7XG4gICAgICAgICAgICAgICAgX2hpdFZlbG9jaXRpZXNbaV0gKz0gKHNjYWxlZF92YWx1ZSAtIF9oaXRIZWlnaHRzW2ldKSAqIDY7XG4gICAgICAgICAgICAgICAgX2hpdEhlaWdodHNbaV0gPSBzY2FsZWRfdmFsdWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIF9oaXRWZWxvY2l0aWVzW2ldIC09IDQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIF9oaXRIZWlnaHRzW2ldICs9IF9oaXRWZWxvY2l0aWVzW2ldICogMC4wMTY7XG5cbiAgICAgICAgICAgIGlmIChfaGl0SGVpZ2h0c1tpXSA8IDApXG4gICAgICAgICAgICAgICAgX2hpdEhlaWdodHNbaV0gPSAwO1xuICAgICAgICB9XG5cbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uID0gXCJzb3VyY2UtYXRvcFwiO1xuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5kcmF3SW1hZ2UoX2NhbnZhc0JnLCAwLCAwKTtcblxuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb24gPSBcInNvdXJjZS1vdmVyXCI7XG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmZpbGxTdHlsZSA9IFwicmdiYSgyNTUsMjU1LDI1NSwwLjcpXCI7XG5cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IG51bUJhcnM7IGkrKykge1xuICAgICAgICAgICAgeCA9IGkgKiAoYmFyV2lkdGggKyBfZmZ0QmFyU3BhY2luZyk7XG4gICAgICAgICAgICB5ID0gX2NhbnZhc0hlaWdodCAtIE1hdGgucm91bmQoX2hpdEhlaWdodHNbaV0pIC0gMjtcbiAgICAgICAgICAgIHcgPSBiYXJXaWR0aDtcbiAgICAgICAgICAgIGggPSBiYXJXaWR0aDtcblxuICAgICAgICAgICAgaWYgKF9oaXRIZWlnaHRzW2ldID09PSAwKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICAvL19hdWRpb1NwZWN0cnVtQ2FudmFzLmZpbGxTdHlsZSA9IFwicmdiYSgyNTUsIDI1NSwgMjU1LFwiKyBNYXRoLm1heCgwLCAxIC0gTWF0aC5hYnMoX2hpdFZlbG9jaXRpZXNbaV0vMTUwKSkgKyBcIilcIjtcbiAgICAgICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmZpbGxSZWN0KHgsIHksIHcsIGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgX2F1ZGlvQ2FudmFzQW5pbWF0aW9uSWQgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKHVwZGF0ZUFuYWx5emVyKTtcbiAgICB9XG5cbiAgICB2YXIgX2NhbnZhc1dpZHRoLCBfY2FudmFzSGVpZ2h0O1xuICAgIHZhciBfZmZ0U2l6ZSA9IDI1NjtcbiAgICB2YXIgX2ZmdFNtb290aGluZyA9IDAuODtcbiAgICB2YXIgX2ZmdEJhclNwYWNpbmcgPSAxO1xuXG4gICAgdmFyIF9oaXRIZWlnaHRzID0gW107XG4gICAgdmFyIF9oaXRWZWxvY2l0aWVzID0gW107XG5cbiAgICB0aGlzLnRlc3RDYW52YXMgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgdmFyIGNhbnZhc0NvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicmVjb3JkaW5nLXZpc3VhbGl6ZXJcIik7XG5cbiAgICAgICAgX2NhbnZhc1dpZHRoID0gY2FudmFzQ29udGFpbmVyLndpZHRoO1xuICAgICAgICBfY2FudmFzSGVpZ2h0ID0gY2FudmFzQ29udGFpbmVyLmhlaWdodDtcblxuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcyA9IGNhbnZhc0NvbnRhaW5lci5nZXRDb250ZXh0KFwiMmRcIik7XG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbiA9IFwic291cmNlLW92ZXJcIjtcbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZmlsbFN0eWxlID0gXCJyZ2JhKDAsMCwwLDApXCI7XG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmZpbGxSZWN0KDAsIDAsIF9jYW52YXNXaWR0aCwgX2NhbnZhc0hlaWdodCk7XG5cbiAgICAgICAgdmFyIG51bUJhcnMgPSBfZmZ0U2l6ZSAvIDI7XG4gICAgICAgIHZhciBiYXJTcGFjaW5nID0gX2ZmdEJhclNwYWNpbmc7XG4gICAgICAgIHZhciBiYXJXaWR0aCA9IE1hdGguZmxvb3IoX2NhbnZhc1dpZHRoIC8gbnVtQmFycykgLSBiYXJTcGFjaW5nO1xuXG4gICAgICAgIHZhciB4LCB5LCB3LCBoLCBpO1xuXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBudW1CYXJzOyBpKyspIHtcbiAgICAgICAgICAgIF9oaXRIZWlnaHRzW2ldID0gX2NhbnZhc0hlaWdodCAtIDE7XG4gICAgICAgICAgICBfaGl0VmVsb2NpdGllc1tpXSA9IDA7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbnVtQmFyczsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgc2NhbGVkX3ZhbHVlID0gTWF0aC5hYnMoTWF0aC5zaW4oTWF0aC5QSSAqIDYgKiAoaSAvIG51bUJhcnMpKSkgKiBfY2FudmFzSGVpZ2h0O1xuXG4gICAgICAgICAgICB4ID0gaSAqIChiYXJXaWR0aCArIGJhclNwYWNpbmcpO1xuICAgICAgICAgICAgeSA9IF9jYW52YXNIZWlnaHQgLSBzY2FsZWRfdmFsdWU7XG4gICAgICAgICAgICB3ID0gYmFyV2lkdGg7XG4gICAgICAgICAgICBoID0gc2NhbGVkX3ZhbHVlO1xuXG4gICAgICAgICAgICB2YXIgZ3JhZGllbnQgPSBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5jcmVhdGVMaW5lYXJHcmFkaWVudCh4LCBfY2FudmFzSGVpZ2h0LCB4LCB5KTtcbiAgICAgICAgICAgIGdyYWRpZW50LmFkZENvbG9yU3RvcCgxLjAsIFwicmdiYSgwLDAsMCwwLjApXCIpO1xuICAgICAgICAgICAgZ3JhZGllbnQuYWRkQ29sb3JTdG9wKDAuMCwgXCJyZ2JhKDAsMCwwLDEuMClcIik7XG5cbiAgICAgICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmZpbGxTdHlsZSA9IGdyYWRpZW50O1xuICAgICAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZmlsbFJlY3QoeCwgeSwgdywgaCk7XG4gICAgICAgIH1cblxuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb24gPSBcInNvdXJjZS1hdG9wXCI7XG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmRyYXdJbWFnZShfY2FudmFzQmcsIDAsIDApO1xuXG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbiA9IFwic291cmNlLW92ZXJcIjtcbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZmlsbFN0eWxlID0gXCIjZmZmZmZmXCI7XG5cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IG51bUJhcnM7IGkrKykge1xuICAgICAgICAgICAgeCA9IGkgKiAoYmFyV2lkdGggKyBiYXJTcGFjaW5nKTtcbiAgICAgICAgICAgIHkgPSBfY2FudmFzSGVpZ2h0IC0gX2hpdEhlaWdodHNbaV07XG4gICAgICAgICAgICB3ID0gYmFyV2lkdGg7XG4gICAgICAgICAgICBoID0gMjtcblxuICAgICAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZmlsbFJlY3QoeCwgeSwgdywgaCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIF9zY29wZSA9IHRoaXM7XG5cbiAgICB2YXIgX2NhbnZhc0JnID0gbmV3IEltYWdlKCk7XG4gICAgX2NhbnZhc0JnLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgX3Njb3BlLnRlc3RDYW52YXMoKTtcbiAgICB9O1xuICAgIC8vX2NhbnZhc0JnLnNyYyA9IFwiL2ltZy9iZzVzLmpwZ1wiO1xuICAgIF9jYW52YXNCZy5zcmMgPSBcIi9pbWcvYmc2LXdpZGUuanBnXCI7XG59XG4iLCJleHBvcnQgZGVmYXVsdCBjbGFzcyBTb3VuZFBsYXllciB7XG4gICAgc3RhdGljIGNyZWF0ZSAobW9kZWwpIHtcbiAgICAgICAgdmFyIHJlc3VtZVBvc2l0aW9uID0gcGFyc2VJbnQobW9kZWwuZ2V0KCdwb3NpdGlvbicpIHx8IDApO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiQ3JlYXRpbmcgc291bmQgcGxheWVyIGZvciBtb2RlbDpcIiwgbW9kZWwpO1xuXG4gICAgICAgIHJldHVybiBzb3VuZE1hbmFnZXIuY3JlYXRlU291bmQoe1xuICAgICAgICAgICAgaWQ6IG1vZGVsLmlkLFxuICAgICAgICAgICAgdXJsOiBtb2RlbC51cmwsXG4gICAgICAgICAgICB2b2x1bWU6IDEwMCxcbiAgICAgICAgICAgIGF1dG9Mb2FkOiB0cnVlLFxuICAgICAgICAgICAgYXV0b1BsYXk6IGZhbHNlLFxuICAgICAgICAgICAgZnJvbTogcmVzdW1lUG9zaXRpb24sXG4gICAgICAgICAgICB3aGlsZWxvYWRpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImxvYWRlZDogXCIgKyB0aGlzLmJ5dGVzTG9hZGVkICsgXCIgb2YgXCIgKyB0aGlzLmJ5dGVzVG90YWwpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9ubG9hZDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdTb3VuZDsgYXVkaW8gbG9hZGVkOyBwb3NpdGlvbiA9ICcgKyByZXN1bWVQb3NpdGlvbiArICcsIGR1cmF0aW9uID0gJyArIHRoaXMuZHVyYXRpb24pO1xuXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZHVyYXRpb24gPT0gbnVsbCB8fCB0aGlzLmR1cmF0aW9uID09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJkdXJhdGlvbiBpcyBudWxsXCIpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKChyZXN1bWVQb3NpdGlvbiArIDEwKSA+IHRoaXMuZHVyYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gdGhlIHRyYWNrIGlzIHByZXR0eSBtdWNoIGNvbXBsZXRlLCBsb29wIGl0XG4gICAgICAgICAgICAgICAgICAgIC8vIEZJWE1FOiB0aGlzIHNob3VsZCBhY3R1YWxseSBoYXBwZW4gZWFybGllciwgd2Ugc2hvdWxkIGtub3cgdGhhdCB0aGUgYWN0aW9uIHdpbGwgY2F1c2UgYSByZXdpbmRcbiAgICAgICAgICAgICAgICAgICAgLy8gICAgICAgIGFuZCBpbmRpY2F0ZSB0aGUgcmV3aW5kIHZpc3VhbGx5IHNvIHRoZXJlIGlzIG5vIHN1cnByaXNlXG4gICAgICAgICAgICAgICAgICAgIHJlc3VtZVBvc2l0aW9uID0gMDtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1NvdW5kOyB0cmFjayBuZWVkZWQgYSByZXdpbmQnKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBGSVhNRTogcmVzdW1lIGNvbXBhdGliaWxpdHkgd2l0aCB2YXJpb3VzIGJyb3dzZXJzXG4gICAgICAgICAgICAgICAgLy8gRklYTUU6IHNvbWV0aW1lcyB5b3UgcmVzdW1lIGEgZmlsZSBhbGwgdGhlIHdheSBhdCB0aGUgZW5kLCBzaG91bGQgbG9vcCB0aGVtIGFyb3VuZFxuICAgICAgICAgICAgICAgIHRoaXMuc2V0UG9zaXRpb24ocmVzdW1lUG9zaXRpb24pO1xuICAgICAgICAgICAgICAgIHRoaXMucGxheSgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHdoaWxlcGxheWluZzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBwcm9ncmVzcyA9ICh0aGlzLmR1cmF0aW9uID4gMCA/IDEwMCAqIHRoaXMucG9zaXRpb24gLyB0aGlzLmR1cmF0aW9uIDogMCkudG9GaXhlZCgwKSArICclJztcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcInF1aXA6XCIgKyB0aGlzLmlkICsgXCI6cHJvZ3Jlc3NcIiwgcHJvZ3Jlc3MpO1xuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwicXVpcDpcIiArIHRoaXMuaWQgKyBcIjpwb3NpdGlvblwiLCB0aGlzLnBvc2l0aW9uLnRvRml4ZWQoMCkpO1xuICAgICAgICAgICAgICAgIG1vZGVsLnNldCh7J3Byb2dyZXNzJzogcHJvZ3Jlc3N9KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbnBhdXNlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJTb3VuZDsgcGF1c2VkOiBcIiArIHRoaXMuaWQpO1xuICAgICAgICAgICAgICAgIHZhciBwb3NpdGlvbiA9IHRoaXMucG9zaXRpb24gPyB0aGlzLnBvc2l0aW9uLnRvRml4ZWQoMCkgOiAwO1xuICAgICAgICAgICAgICAgIHZhciBwcm9ncmVzcyA9ICh0aGlzLmR1cmF0aW9uID4gMCA/IDEwMCAqIHBvc2l0aW9uIC8gdGhpcy5kdXJhdGlvbiA6IDApLnRvRml4ZWQoMCkgKyAnJSc7XG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJxdWlwOlwiICsgdGhpcy5pZCArIFwiOnByb2dyZXNzXCIsIHByb2dyZXNzKTtcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcInF1aXA6XCIgKyB0aGlzLmlkICsgXCI6cG9zaXRpb25cIiwgcG9zaXRpb24pO1xuICAgICAgICAgICAgICAgIG1vZGVsLnNldCh7J3Byb2dyZXNzJzogcHJvZ3Jlc3N9KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbmZpbmlzaDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiU291bmQ7IGZpbmlzaGVkIHBsYXlpbmc6IFwiICsgdGhpcy5pZCk7XG5cbiAgICAgICAgICAgICAgICAvLyBzdG9yZSBjb21wbGV0aW9uIGluIGJyb3dzZXJcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcInF1aXA6XCIgKyB0aGlzLmlkICsgXCI6cHJvZ3Jlc3NcIiwgJzEwMCUnKTtcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcInF1aXA6XCIgKyB0aGlzLmlkICsgXCI6cG9zaXRpb25cIiwgdGhpcy5kdXJhdGlvbi50b0ZpeGVkKDApKTtcbiAgICAgICAgICAgICAgICBtb2RlbC5zZXQoeydwcm9ncmVzcyc6ICcxMDAlJ30pO1xuXG4gICAgICAgICAgICAgICAgLy8gVE9ETzogdW5sb2NrIHNvbWUgc29ydCBvZiBhY2hpZXZlbWVudCBmb3IgZmluaXNoaW5nIHRoaXMgdHJhY2ssIG1hcmsgaXQgYSBkaWZmIGNvbG9yLCBldGNcbiAgICAgICAgICAgICAgICAvLyBUT0RPOiB0aGlzIGlzIGEgZ29vZCBwbGFjZSB0byBmaXJlIGEgaG9vayB0byBhIHBsYXliYWNrIG1hbmFnZXIgdG8gbW92ZSBvbnRvIHRoZSBuZXh0IGF1ZGlvIGNsaXBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICB9XG59XG4iLCJpbXBvcnQgQmFja2JvbmUgZnJvbSAnYmFja2JvbmUnXG5pbXBvcnQgdmFndWVUaW1lIGZyb20gJ3ZhZ3VlLXRpbWUnXG5pbXBvcnQgeyBRdWlwVmlldywgUXVpcHMsIEF1ZGlvUGxheWVyVmlldyB9IGZyb20gJy4vcXVpcC1jb250cm9sLmpzJ1xuaW1wb3J0IHsgUXVpcE1vZGVsLCBNeVF1aXBDb2xsZWN0aW9uIH0gZnJvbSAnLi9tb2RlbHMvUXVpcCdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUmVjb3JkaW5nc0xpc3QgZXh0ZW5kcyBCYWNrYm9uZS5WaWV3IHtcbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICB2YXIgYXVkaW9QbGF5ZXIgPSBuZXcgQXVkaW9QbGF5ZXJWaWV3KHtlbDogJyNhdWRpby1wbGF5ZXInfSk7XG5cbiAgICAgICAgLy8gbG9hZCByZWNvcmRpbmdzXG4gICAgICAgIG5ldyBNeVF1aXBDb2xsZWN0aW9uKCkuZmV0Y2goKS50aGVuKHF1aXBzID0+IHRoaXMub25RdWlwc0xvYWRlZChxdWlwcykpXG5cbiAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgICQoJy5xdWlwJykuZWFjaChlbGVtID0+IHtcbiAgICAgICAgICAgIHZhciB2aWV3ID0gbmV3IFF1aXBWaWV3KHtcbiAgICAgICAgICAgICAgICBlbDogZWxlbSxcbiAgICAgICAgICAgICAgICBtb2RlbDogbmV3IFF1aXBNb2RlbCgpXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgUXVpcHMuYWRkKHZpZXcubW9kZWwpO1xuICAgICAgICAgICAgdmlldy5yZW5kZXIoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gcHJvY2VzcyBhbGwgdGltZXN0YW1wc1xuICAgICAgICB2YXIgdmFndWVUaW1lID0gcmVxdWlyZSgndmFndWUtdGltZScpO1xuICAgICAgICB2YXIgbm93ID0gbmV3IERhdGUoKTtcblxuICAgICAgICAkKFwidGltZVtkYXRldGltZV1cIikuZWFjaCgoaWR4LCBlbGUpID0+IHtcbiAgICAgICAgICAgIGVsZS50ZXh0Q29udGVudCA9IHZhZ3VlVGltZS5nZXQoe2Zyb206IG5vdywgdG86IG5ldyBEYXRlKGVsZS5nZXRBdHRyaWJ1dGUoJ2RhdGV0aW1lJykpfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMubGlzdGVuVG8oUXVpcHMsICdhZGQnLCB0aGlzLnF1aXBBZGRlZCk7XG4gICAgfVxuXG4gICAgb25RdWlwc0xvYWRlZChxdWlwcykge1xuICAgICAgICBjb25zb2xlLmxvZyhcImxvYWRlZCBxdWlwc1wiLCBxdWlwcyk7XG5cbiAgICAgICAgZm9yKCB2YXIgcXVpcCBvZiBxdWlwcykge1xuICAgICAgICAgICAgdmFyIHF1aXBWaWV3ID0gbmV3IFF1aXBWaWV3KHttb2RlbDogbmV3IFF1aXBNb2RlbChxdWlwKX0pO1xuICAgICAgICAgICAgdGhpcy4kZWwuYXBwZW5kKHF1aXBWaWV3LmVsKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHF1aXBBZGRlZChxdWlwKSB7XG4gICAgfVxuXG4gICAgcmVuZGVyKCkge1xuXG4gICAgfVxufTtcblxuIiwiaW1wb3J0IEJhY2tib25lIGZyb20gJ2JhY2tib25lJ1xuXG5jbGFzcyBDdXJyZW50VXNlck1vZGVsIGV4dGVuZHMgQmFja2JvbmUuTW9kZWwge1xuICAgIGRlZmF1bHRzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdXNlcm5hbWU6IFwiXCIsXG4gICAgICAgICAgICBwcm9maWxlSW1hZ2U6IFwiXCIsXG4gICAgICAgICAgICBjcmVhdGVkQXQ6IFwiXCIsXG4gICAgICAgICAgICBpZDogXCJcIlxuICAgICAgICB9XG4gICAgfVxuXG4gICAgY29uc3RydWN0b3IocHJvcHMpIHtcbiAgICAgICAgc3VwZXIocHJvcHMpO1xuICAgICAgICB0aGlzLnVybCA9IFwiL2N1cnJlbnRfdXNlclwiO1xuICAgIH1cbn1cblxuZXhwb3J0IHsgQ3VycmVudFVzZXJNb2RlbCB9XG4iLCJpbXBvcnQgQmFja2JvbmUgZnJvbSAnYmFja2JvbmUnXG5cbmNsYXNzIExpc3RlblN0YXRlIGV4dGVuZHMgQmFja2JvbmUuTW9kZWwge1xuICAgIGRlZmF1bHRzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgYXVkaW9JZDogMCwgLy8gaWQgc3RyaW5nIG9mIHF1aXBcbiAgICAgICAgICAgIHByb2dyZXNzOiAwLCAvLyBbMC0xMDBdXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdHJ1Y3Rvcihwcm9wcykge1xuICAgICAgICBzdXBlcihwcm9wcyk7XG4gICAgICAgIHRoaXMudXJsUm9vdCA9ICcvbGlzdGVuJztcbiAgICB9XG59XG5cbmNsYXNzIExpc3RlblN0YXRlQ29sbGVjdGlvbiBleHRlbmRzIEJhY2tib25lLkNvbGxlY3Rpb24ge1xuICAgIGNvbnN0cnVjdG9yKG9wdHMpIHtcbiAgICAgICAgc3VwZXIob3B0cyk7XG4gICAgICAgIHRoaXMubW9kZWwgPSBMaXN0ZW5TdGF0ZTtcbiAgICAgICAgdGhpcy51cmwgPSBcIi9saXN0ZW5cIjtcbiAgICB9XG59XG5cbmV4cG9ydCB7IExpc3RlblN0YXRlLCBMaXN0ZW5TdGF0ZUNvbGxlY3Rpb24gfVxuIiwiaW1wb3J0IEJhY2tib25lIGZyb20gJ2JhY2tib25lJ1xuaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSdcblxuY2xhc3MgUXVpcE1vZGVsIGV4dGVuZHMgQmFja2JvbmUuTW9kZWwge1xuICAgIGRlZmF1bHRzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaWQ6IDAsIC8vIGd1aWRcbiAgICAgICAgICAgIHByb2dyZXNzOiAwLCAvLyBbMC0xMDBdIHBlcmNlbnRhZ2VcbiAgICAgICAgICAgIHBvc2l0aW9uOiAwLCAvLyBzZWNvbmRzXG4gICAgICAgICAgICBkdXJhdGlvbjogMCwgLy8gc2Vjb25kc1xuICAgICAgICAgICAgaXNQdWJsaWM6IGZhbHNlXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdHJ1Y3Rvcihwcm9wcykge1xuICAgICAgICBzdXBlcihwcm9wcyk7XG4gICAgICAgIHRoaXMudXJsUm9vdCA9IFwiL3F1aXBzXCI7XG5cbiAgICAgICAgLy8gc2F2ZSBsaXN0ZW5pbmcgcHJvZ3Jlc3MgYXQgbW9zdCBldmVyeSAzIHNlY29uZHNcbiAgICAgICAgdGhpcy50aHJvdHRsZWRTYXZlID0gXy50aHJvdHRsZSh0aGlzLnNhdmUsIDMwMDApO1xuICAgIH1cblxuICAgIC8vc2F2ZShhdHRyaWJ1dGVzKSB7XG4gICAgLy8gICAgY29uc29sZS5sb2coXCJRdWlwIE1vZGVsIHNhdmluZyB0byBsb2NhbFN0b3JhZ2VcIik7XG4gICAgLy8gICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0odGhpcy5pZCwgSlNPTi5zdHJpbmdpZnkodGhpcy50b0pTT04oKSkpO1xuICAgIC8vfVxuICAgIC8vXG4gICAgLy9mZXRjaCgpIHtcbiAgICAvLyAgICBjb25zb2xlLmxvZyhcIlF1aXAgTW9kZWwgbG9hZGluZyBmcm9tIGxvY2FsU3RvcmFnZVwiKTtcbiAgICAvLyAgICB0aGlzLnNldChKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKHRoaXMuaWQpKSk7XG4gICAgLy99XG59XG5cbmNsYXNzIE15UXVpcENvbGxlY3Rpb24gZXh0ZW5kcyBCYWNrYm9uZS5Db2xsZWN0aW9uIHtcbiAgICBjb25zdHJ1Y3RvcihvcHRzKSB7XG4gICAgICAgIHN1cGVyKG9wdHMpO1xuICAgICAgICB0aGlzLm1vZGVsID0gUXVpcE1vZGVsO1xuICAgICAgICB0aGlzLnVybCA9IFwiL3F1aXBzXCI7XG4gICAgfVxufVxuXG5leHBvcnQgeyBRdWlwTW9kZWwsIE15UXVpcENvbGxlY3Rpb24gfVxuIiwiZXhwb3J0IGRlZmF1bHQgY2xhc3MgUG9seWZpbGwge1xuICAgIHN0YXRpYyBpbnN0YWxsKCkge1xuICAgICAgICB3aW5kb3cuQXVkaW9Db250ZXh0ID0gd2luZG93LkF1ZGlvQ29udGV4dCB8fCB3aW5kb3cud2Via2l0QXVkaW9Db250ZXh0IHx8IGZhbHNlO1xuICAgICAgICBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhID0gbmF2aWdhdG9yLmdldFVzZXJNZWRpYSB8fCBuYXZpZ2F0b3Iud2Via2l0R2V0VXNlck1lZGlhIHx8IG5hdmlnYXRvci5tb3pHZXRVc2VyTWVkaWEgfHwgbmF2aWdhdG9yLm1zR2V0VXNlck1lZGlhIHx8IGZhbHNlO1xuXG4gICAgICAgIGlmIChuYXZpZ2F0b3IubWVkaWFEZXZpY2UgPT0gbnVsbCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJwb2x5ZmlsbGluZyBtZWRpYURldmljZS5nZXRVc2VyTWVkaWFcIik7XG5cbiAgICAgICAgICAgIG5hdmlnYXRvci5tZWRpYURldmljZSA9IHtcbiAgICAgICAgICAgICAgICBnZXRVc2VyTWVkaWE6IChwcm9wcykgPT4gbmV3IFByb21pc2UoKHksIG4pID0+IG5hdmlnYXRvci5nZXRVc2VyTWVkaWEocHJvcHMsIHksIG4pKVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiQXVkaW9DYXB0dXJlOjpwb2x5ZmlsbCgpOyBnZXRVc2VyTWVkaWEoKSBub3Qgc3VwcG9ydGVkLlwiKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbn1cbiIsImltcG9ydCBCYWNrYm9uZSBmcm9tICdiYWNrYm9uZSdcbmltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnXG5pbXBvcnQgU291bmRQbGF5ZXIgZnJvbSAnLi9hdWRpby1wbGF5ZXIuanMnXG5pbXBvcnQgeyBRdWlwTW9kZWwgfSBmcm9tICcuL21vZGVscy9RdWlwJ1xuXG5cbmNsYXNzIEF1ZGlvUGxheWVyRXZlbnRzIGV4dGVuZHMgQmFja2JvbmUuTW9kZWwge1xuICAgIGdldFBhdXNlVXJsKGlkKSB7XG4gICAgICAgIHZhciB1cmwgPSBcIi9cIiArIGlkICsgXCIvcGF1c2VkXCI7XG4gICAgICAgIGNvbnNvbGUubG9nKFwicGF1c2UgdXJsXCIgKyB1cmwpO1xuICAgICAgICByZXR1cm4gdXJsO1xuICAgIH1cblxuICAgIG9uUGF1c2UoaWQsIGNhbGxiYWNrKSB7XG4gICAgICAgIHRoaXMub24odGhpcy5nZXRQYXVzZVVybChpZCksIGNhbGxiYWNrKTtcbiAgICB9XG5cbiAgICB0cmlnZ2VyUGF1c2UoaWQpIHtcbiAgICAgICAgdGhpcy50cmlnZ2VyKHRoaXMuZ2V0UGF1c2VVcmwoaWQpKTtcbiAgICB9XG59XG5cbnZhciBBdWRpb1BsYXllciA9IG5ldyBBdWRpb1BsYXllckV2ZW50cygpO1xuXG4vL2NsYXNzIEF1ZGlvUGxheWVyRXZlbnRzIGV4dGVuZHMgQmFja2JvbmUuRXZlbnRzIHtcbi8vXG4vL31cblxuY2xhc3MgQXVkaW9QbGF5ZXJWaWV3IGV4dGVuZHMgQmFja2JvbmUuVmlldyB7XG4gICAgZGVmYXVsdHMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBhdWRpb1BsYXllcjogbnVsbCxcbiAgICAgICAgICAgIHF1aXBNb2RlbDogbnVsbFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJBdWRpb1BsYXllclZpZXcgaW5pdGlhbGl6ZWRcIik7XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImF1ZGlvLXBsYXllclwiKTtcbiAgICAgICAgQXVkaW9QbGF5ZXIub24oXCJ0b2dnbGVcIiwgKHF1aXApID0+IHRoaXMub25Ub2dnbGUocXVpcCkpO1xuICAgIH1cblxuICAgIGNsb3NlKCkge1xuICAgICAgICB0aGlzLnN0b3BQZXJpb2RpY1RpbWVyKCk7XG4gICAgfVxuXG4gICAgc3RhcnRQZXJpb2RpY1RpbWVyKCkge1xuICAgICAgICBpZih0aGlzLnBlcmlvZGljVGltZXIgPT0gbnVsbCkge1xuICAgICAgICAgICAgdGhpcy5wZXJpb2RpY1RpbWVyID0gc2V0SW50ZXJ2YWwoKCkgPT4gdGhpcy5jaGVja1Byb2dyZXNzKCksIDEwMCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzdG9wUGVyaW9kaWNUaW1lcigpIHtcbiAgICAgICAgaWYodGhpcy5wZXJpb2RpY1RpbWVyICE9IG51bGwpIHtcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5wZXJpb2RpY1RpbWVyKTtcbiAgICAgICAgICAgIHRoaXMucGVyaW9kaWNUaW1lciA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjaGVja1Byb2dyZXNzKCkge1xuICAgICAgICBpZih0aGlzLnF1aXBNb2RlbCA9PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcHJvZ3Jlc3NVcGRhdGUgPSB7XG4gICAgICAgICAgICBwb3NpdGlvbjogdGhpcy5hdWRpb1BsYXllci5jdXJyZW50VGltZSwgLy8gc2VjXG4gICAgICAgICAgICBkdXJhdGlvbjogdGhpcy5hdWRpb1BsYXllci5kdXJhdGlvbiwgLy8gc2VjXG4gICAgICAgICAgICBwcm9ncmVzczogMTAwICogdGhpcy5hdWRpb1BsYXllci5jdXJyZW50VGltZSAvIHRoaXMuYXVkaW9QbGF5ZXIuZHVyYXRpb24gLy8gJVxuICAgICAgICB9XG5cbiAgICAgICAgQXVkaW9QbGF5ZXIudHJpZ2dlcihcIi9cIiArIHRoaXMucXVpcE1vZGVsLmlkICsgXCIvcHJvZ3Jlc3NcIiwgcHJvZ3Jlc3NVcGRhdGUpO1xuICAgIH1cblxuICAgIG9uVG9nZ2xlKHF1aXBNb2RlbCkge1xuICAgICAgICB0aGlzLnF1aXBNb2RlbCA9IHF1aXBNb2RlbDtcblxuICAgICAgICBpZighdGhpcy50cmFja0lzTG9hZGVkKHF1aXBNb2RlbC51cmwpKSB7XG4gICAgICAgICAgICB0aGlzLmxvYWRUcmFjayhxdWlwTW9kZWwudXJsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKCF0aGlzLnRyYWNrSXNMb2FkZWQocXVpcE1vZGVsLnVybCkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKHRoaXMuYXVkaW9QbGF5ZXIucGF1c2VkKSB7XG4gICAgICAgICAgICB0aGlzLnBsYXkocXVpcE1vZGVsKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMucGF1c2UocXVpcE1vZGVsKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHBsYXkocXVpcE1vZGVsKSB7XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIuY3VycmVudFRpbWUgPSBNYXRoLmZsb29yKHF1aXBNb2RlbC5wb3NpdGlvbik7XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIucGxheSgpO1xuXG4gICAgICAgIEF1ZGlvUGxheWVyLnRyaWdnZXIoXCIvXCIgKyBxdWlwTW9kZWwuaWQgKyBcIi9wbGF5aW5nXCIpO1xuICAgICAgICB0aGlzLnN0YXJ0UGVyaW9kaWNUaW1lcigpO1xuICAgIH1cblxuICAgIHBhdXNlKHF1aXBNb2RlbCkge1xuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnBhdXNlKCk7XG4gICAgICAgIEF1ZGlvUGxheWVyLnRyaWdnZXIoXCIvXCIgKyBxdWlwTW9kZWwuaWQgKyBcIi9wYXVzZWRcIik7XG4gICAgICAgIHRoaXMuc3RvcFBlcmlvZGljVGltZXIoKTtcbiAgICB9XG5cbiAgICB0cmFja0lzTG9hZGVkKHVybCkge1xuICAgICAgICByZXR1cm4gfnRoaXMuYXVkaW9QbGF5ZXIuc3JjLmluZGV4T2YodXJsKTtcbiAgICB9XG5cbiAgICBsb2FkVHJhY2sodXJsKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiTG9hZGluZyBhdWRpbzogXCIgKyB1cmwpO1xuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnNyYyA9IHVybDtcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5sb2FkKCk7XG4gICAgfVxufVxuXG5jbGFzcyBRdWlwVmlldyBleHRlbmRzIEJhY2tib25lLlZpZXcge1xuICAgIGdldCBkZWZhdWx0cygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHF1aXBJZDogMCxcbiAgICAgICAgICAgIGF1ZGlvUGxheWVyOiBudWxsXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBnZXQgZXZlbnRzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgXCJjbGljayAucXVpcC1hY3Rpb25zIC5sb2NrLWluZGljYXRvclwiOiBcInRvZ2dsZVB1YmxpY1wiLFxuICAgICAgICAgICAgXCJjbGljayAucXVpcC1wbGF5ZXJcIjogXCJ0b2dnbGVQbGF5YmFja1wiXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBnZXQgdGFnTmFtZSgpIHsgcmV0dXJuICdkaXYnOyB9XG5cbiAgICBvblBhdXNlKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlF1aXBWaWV3OyBwYXVzZWRcIik7XG5cbiAgICAgICAgJCh0aGlzLmVsKVxuICAgICAgICAgICAgLmZpbmQoJy5mYS1wYXVzZScpXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2ZhLXBhdXNlJylcbiAgICAgICAgICAgIC5hZGRDbGFzcygnZmEtcGxheScpO1xuICAgIH1cblxuICAgIG9uUGxheSgpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJRdWlwVmlldzsgcGxheWluZ1wiKTtcblxuICAgICAgICAkKHRoaXMuZWwpXG4gICAgICAgICAgICAuZmluZCgnLmZhLXBsYXknKVxuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdmYS1wbGF5JylcbiAgICAgICAgICAgIC5hZGRDbGFzcygnZmEtcGF1c2UnKTtcbiAgICB9XG5cbiAgICBvblByb2dyZXNzKHByb2dyZXNzVXBkYXRlKSB7XG4gICAgICAgIHRoaXMubW9kZWwuc2V0KHsncG9zaXRpb24nOiBwcm9ncmVzc1VwZGF0ZS5wb3NpdGlvbn0pOyAvLyBzZWNcbiAgICAgICAgdGhpcy5tb2RlbC5zZXQoeydkdXJhdGlvbic6IHByb2dyZXNzVXBkYXRlLmR1cmF0aW9ufSk7IC8vIHNlY1xuICAgICAgICB0aGlzLm1vZGVsLnNldCh7J3Byb2dyZXNzJzogcHJvZ3Jlc3NVcGRhdGUucHJvZ3Jlc3N9KTsgLy8gJVxuICAgICAgICB0aGlzLm1vZGVsLnRocm90dGxlZFNhdmUoKTtcbiAgICB9XG5cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICB0aGlzLnRlbXBsYXRlID0gXy50ZW1wbGF0ZSgkKCcjcXVpcC10ZW1wbGF0ZScpLmh0bWwoKSk7XG5cbiAgICAgICAgdmFyIGlkID0gdGhpcy5tb2RlbC5nZXQoXCJpZFwiKTtcblxuICAgICAgICBBdWRpb1BsYXllci5vbihcIi9cIiArIGlkICsgXCIvcGF1c2VkXCIsICgpID0+IHRoaXMub25QYXVzZSgpKTtcbiAgICAgICAgQXVkaW9QbGF5ZXIub24oXCIvXCIgKyBpZCArIFwiL3BsYXlpbmdcIiwgKCkgPT4gdGhpcy5vblBsYXkoKSk7XG4gICAgICAgIEF1ZGlvUGxheWVyLm9uKFwiL1wiICsgaWQgKyBcIi9wcm9ncmVzc1wiLCAodXBkYXRlKSA9PiB0aGlzLm9uUHJvZ3Jlc3ModXBkYXRlKSk7XG5cbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcblxuICAgICAgICAkKHRoaXMuZWwpLmZpbmQoXCIucHJvZ3Jlc3MtYmFyXCIpLmNzcyhcIndpZHRoXCIsIHRoaXMubW9kZWwuZ2V0KCdwcm9ncmVzcycpICsgXCIlXCIpO1xuXG4gICAgICAgIC8vIHVwZGF0ZSB2aXN1YWxzIHRvIGluZGljYXRlIHBsYXliYWNrIHByb2dyZXNzXG4gICAgICAgIHRoaXMubW9kZWwub24oJ2NoYW5nZTpwcm9ncmVzcycsIChtb2RlbCwgcHJvZ3Jlc3MpID0+IHtcbiAgICAgICAgICAgICQodGhpcy5lbCkuZmluZChcIi5wcm9ncmVzcy1iYXJcIikuY3NzKFwid2lkdGhcIiwgcHJvZ3Jlc3MgKyBcIiVcIik7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vdGhpcy5vbih0aGlzLm1vZGVsLCBcImNoYW5nZVwiLCB0aGlzLnJlbmRlcik7XG4gICAgfVxuXG4gICAgbG9hZE1vZGVsKCkge1xuICAgICAgICB2YXIgcHJvZ3Jlc3MgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcInF1aXA6XCIgKyB0aGlzLnF1aXBJZCArIFwiOnByb2dyZXNzXCIpO1xuICAgICAgICB2YXIgcG9zaXRpb24gPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcInF1aXA6XCIgKyB0aGlzLnF1aXBJZCArIFwiOnBvc2l0aW9uXCIpO1xuXG4gICAgICAgIHRoaXMubW9kZWwuc2V0KHtcbiAgICAgICAgICAgICdpZCc6IHRoaXMucXVpcElkLFxuICAgICAgICAgICAgJ3Byb2dyZXNzJzogcHJvZ3Jlc3MsXG4gICAgICAgICAgICAncG9zaXRpb24nOiBwb3NpdGlvbixcbiAgICAgICAgICAgICdpc1B1YmxpYyc6IHRoaXMuJGVsLmRhdGEoXCJpc1B1YmxpY1wiKSA9PSAnVHJ1ZScsXG4gICAgICAgICAgICAnaXNNaW5lJzogdGhpcy4kZWwuZGF0YShcImlzTWluZVwiKSA9PSAnVHJ1ZSdcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgdG9nZ2xlUHVibGljKGV2KSB7XG4gICAgICAgIHZhciBuZXdTdGF0ZSA9ICF0aGlzLm1vZGVsLmdldCgnaXNQdWJsaWMnKTtcbiAgICAgICAgdGhpcy5tb2RlbC5zZXQoeydpc1B1YmxpYyc6IG5ld1N0YXRlfSk7XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJ0b2dnbGluZyBuZXcgcHVibGlzaGVkIHN0YXRlOiBcIiArIG5ld1N0YXRlKTtcblxuICAgICAgICB0aGlzLm1vZGVsLnNhdmUoKTtcblxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgdG9nZ2xlUGxheWJhY2soZXZlbnQpIHtcbiAgICAgICAgQXVkaW9QbGF5ZXIudHJpZ2dlcihcInRvZ2dsZVwiLCB0aGlzLm1vZGVsLmF0dHJpYnV0ZXMpO1xuICAgIH1cblxuICAgIHJlbmRlcigpIHtcbiAgICAgICAgdGhpcy4kZWwuaHRtbCh0aGlzLnRlbXBsYXRlKHRoaXMubW9kZWwudG9KU09OKCkpKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufVxuXG5jbGFzcyBRdWlwTGlzdCBleHRlbmRzIEJhY2tib25lLkNvbGxlY3Rpb24ge1xuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnMpIHtcbiAgICAgICAgc3VwZXIob3B0aW9ucyk7XG4gICAgICAgIHRoaXMubW9kZWwgPSBRdWlwTW9kZWw7XG4gICAgfVxufVxuXG52YXIgUXVpcHMgPSBuZXcgUXVpcExpc3QoKTtcblxuZXhwb3J0IHsgUXVpcE1vZGVsLCBRdWlwVmlldywgUXVpcExpc3QsIFF1aXBzLCBBdWRpb1BsYXllclZpZXcgfTtcbiIsImltcG9ydCBCYWNrYm9uZSBmcm9tICdiYWNrYm9uZSdcbmltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnXG5pbXBvcnQgeyBRdWlwTW9kZWwsIFF1aXBWaWV3LCBRdWlwcywgQXVkaW9QbGF5ZXJWaWV3IH0gZnJvbSAnLi9xdWlwLWNvbnRyb2wuanMnXG5pbXBvcnQgeyBBdWRpb0NhcHR1cmUgfSBmcm9tICcuL2F1ZGlvLWNhcHR1cmUnXG5cbmV4cG9ydCBjbGFzcyBSZWNvcmRlciBleHRlbmRzIEJhY2tib25lLk1vZGVsIHtcbiAgICBkZWZhdWx0cygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlY29yZGluZ1RpbWU6IDBcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFJlY29yZGVyVmlldyBleHRlbmRzIEJhY2tib25lLlZpZXcge1xuICAgIC8vICAgIGVsOiAnLm0tcmVjb3JkaW5nLWNvbnRhaW5lcicsXG5cbiAgICBJbnRUb1RpbWUodmFsdWUpIHtcbiAgICAgICAgdmFyIG1pbnV0ZXMgPSBNYXRoLmZsb29yKHZhbHVlIC8gNjApO1xuICAgICAgICB2YXIgc2Vjb25kcyA9IE1hdGgucm91bmQodmFsdWUgLSBtaW51dGVzICogNjApO1xuXG4gICAgICAgIHJldHVybiAoXCIwMFwiICsgbWludXRlcykuc3Vic3RyKC0yKSArIFwiOlwiICsgKFwiMDBcIiArIHNlY29uZHMpLnN1YnN0cigtMik7XG4gICAgfVxuXG4gICAgZGVmYXVsdHMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBhdWRpb0NhcHR1cmU6IG51bGwsXG4gICAgICAgICAgICBhdWRpb0Jsb2I6IG51bGwsXG4gICAgICAgICAgICBhdWRpb0Jsb2JVcmw6IG51bGwsXG4gICAgICAgICAgICBhdWRpb1BsYXllcjogbnVsbCxcbiAgICAgICAgICAgIGlzUmVjb3JkaW5nOiBmYWxzZSxcbiAgICAgICAgICAgIHRpbWVySWQ6IDAsXG4gICAgICAgICAgICB0aW1lclN0YXJ0OiAzXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBldmVudHMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBcImNsaWNrIC5yZWNvcmRpbmctdG9nZ2xlXCI6IFwidG9nZ2xlXCIsXG4gICAgICAgICAgICBcImNsaWNrICNjYW5jZWwtcmVjb3JkaW5nXCI6IFwiY2FuY2VsUmVjb3JkaW5nXCIsXG4gICAgICAgICAgICBcImNsaWNrICN1cGxvYWQtcmVjb3JkaW5nXCI6IFwidXBsb2FkUmVjb3JkaW5nXCIsXG4gICAgICAgICAgICBcImNsaWNrICNoZWxwZXItYnRuXCI6IFwicGxheVByZXZpZXdcIlxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmVuZGVyKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcInJlbmRlcmluZyByZWNvcmRlciBjb250cm9sXCIpO1xuICAgICAgICB0aGlzLnRlbXBsYXRlID0gXy50ZW1wbGF0ZSgkKCcjcXVpcC1yZWNvcmRlci10ZW1wbGF0ZScpLmh0bWwoKSk7XG4gICAgICAgIHRoaXMuJGVsLmh0bWwodGhpcy50ZW1wbGF0ZSh0aGlzLm1vZGVsLnRvSlNPTigpKSk7XG4gICAgfVxuXG4gICAgaW5pdGlhbGl6ZShvcHRpb25zKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiUmVjb3JkZXJWaWV3IGluaXRcIik7XG4gICAgICAgIHRoaXMuYXVkaW9DYXB0dXJlID0gbmV3IEF1ZGlvQ2FwdHVyZSgpO1xuXG4gICAgICAgIHRoaXMucmVuZGVyKCk7XG5cbiAgICAgICAgdGhpcy5hdWRpb1BsYXllciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicmVjb3JkZWQtcHJldmlld1wiKTtcbiAgICAgICAgaWYgKHRoaXMuYXVkaW9QbGF5ZXIgPT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJjYW4gcGxheSB2b3JiaXM6IFwiLCAhIXRoaXMuYXVkaW9QbGF5ZXIuY2FuUGxheVR5cGUgJiYgXCJcIiAhPSB0aGlzLmF1ZGlvUGxheWVyLmNhblBsYXlUeXBlKCdhdWRpby9vZ2c7IGNvZGVjcz1cInZvcmJpc1wiJykpO1xuXG4gICAgICAgIC8vdGhpcy5hdWRpb1BsYXllci5sb29wID0gXCJsb29wXCI7XG4gICAgICAgIC8vdGhpcy5hdWRpb1BsYXllci5hdXRvcGxheSA9IFwiYXV0b3BsYXlcIjtcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5zcmMgPSBcIi9hc3NldHMvc291bmRzL2JlZXBfc2hvcnRfb24ub2dnXCI7XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIucGxheSgpO1xuXG4gICAgICAgIHRoaXMubW9kZWwub24oJ2NoYW5nZTpyZWNvcmRpbmdUaW1lJywgZnVuY3Rpb24gKG1vZGVsLCB0aW1lKSB7XG4gICAgICAgICAgICAkKFwiLnJlY29yZGluZy10aW1lXCIpLnRleHQodGltZSk7XG4gICAgICAgIH0pXG5cbiAgICAgICAgLy8gYXR0ZW1wdCB0byBmZXRjaCBtZWRpYS1zdHJlYW0gb24gcGFnZS1sb2FkXG4gICAgICAgIHRoaXMuYXVkaW9DYXB0dXJlLnByZWxvYWRNZWRpYVN0cmVhbSgpO1xuXG5cbiAgICAgICAgLy8gVE9ETzogYSBwcmV0dHkgYWR2YW5jZWQgYnV0IG5lYXQgZmVhdHVyZSBtYXkgYmUgdG8gc3RvcmUgYSBiYWNrdXAgY29weSBvZiBhIHJlY29yZGluZyBsb2NhbGx5IGluIGNhc2Ugb2YgYSBjcmFzaCBvciB1c2VyLWVycm9yXG4gICAgICAgIC8qXG4gICAgICAgICAvLyBjaGVjayBob3cgbXVjaCB0ZW1wb3Jhcnkgc3RvcmFnZSBzcGFjZSB3ZSBoYXZlLiBpdCdzIGEgZ29vZCB3YXkgdG8gc2F2ZSByZWNvcmRpbmcgd2l0aG91dCBsb3NpbmcgaXRcbiAgICAgICAgIHdpbmRvdy53ZWJraXRTdG9yYWdlSW5mby5xdWVyeVVzYWdlQW5kUXVvdGEoXG4gICAgICAgICB3ZWJraXRTdG9yYWdlSW5mby5URU1QT1JBUlksXG4gICAgICAgICBmdW5jdGlvbih1c2VkLCByZW1haW5pbmcpIHtcbiAgICAgICAgIHZhciBybWIgPSAocmVtYWluaW5nIC8gMTAyNCAvIDEwMjQpLnRvRml4ZWQoNCk7XG4gICAgICAgICB2YXIgdW1iID0gKHVzZWQgLyAxMDI0IC8gMTAyNCkudG9GaXhlZCg0KTtcbiAgICAgICAgIGNvbnNvbGUubG9nKFwiVXNlZCBxdW90YTogXCIgKyB1bWIgKyBcIm1iLCByZW1haW5pbmcgcXVvdGE6IFwiICsgcm1iICsgXCJtYlwiKTtcbiAgICAgICAgIH0sIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgIGNvbnNvbGUubG9nKCdFcnJvcicsIGUpO1xuICAgICAgICAgfVxuICAgICAgICAgKTtcblxuICAgICAgICAgZnVuY3Rpb24gb25FcnJvckluRlMoKSB7XG4gICAgICAgICB2YXIgbXNnID0gJyc7XG5cbiAgICAgICAgIHN3aXRjaCAoZS5jb2RlKSB7XG4gICAgICAgICBjYXNlIEZpbGVFcnJvci5RVU9UQV9FWENFRURFRF9FUlI6XG4gICAgICAgICBtc2cgPSAnUVVPVEFfRVhDRUVERURfRVJSJztcbiAgICAgICAgIGJyZWFrO1xuICAgICAgICAgY2FzZSBGaWxlRXJyb3IuTk9UX0ZPVU5EX0VSUjpcbiAgICAgICAgIG1zZyA9ICdOT1RfRk9VTkRfRVJSJztcbiAgICAgICAgIGJyZWFrO1xuICAgICAgICAgY2FzZSBGaWxlRXJyb3IuU0VDVVJJVFlfRVJSOlxuICAgICAgICAgbXNnID0gJ1NFQ1VSSVRZX0VSUic7XG4gICAgICAgICBicmVhaztcbiAgICAgICAgIGNhc2UgRmlsZUVycm9yLklOVkFMSURfTU9ESUZJQ0FUSU9OX0VSUjpcbiAgICAgICAgIG1zZyA9ICdJTlZBTElEX01PRElGSUNBVElPTl9FUlInO1xuICAgICAgICAgYnJlYWs7XG4gICAgICAgICBjYXNlIEZpbGVFcnJvci5JTlZBTElEX1NUQVRFX0VSUjpcbiAgICAgICAgIG1zZyA9ICdJTlZBTElEX1NUQVRFX0VSUic7XG4gICAgICAgICBicmVhaztcbiAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICBtc2cgPSAnVW5rbm93biBFcnJvcic7XG4gICAgICAgICBicmVhaztcbiAgICAgICAgIH1cblxuICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yOiAnICsgbXNnKTtcbiAgICAgICAgIH1cblxuICAgICAgICAgd2luZG93LnJlcXVlc3RGaWxlU3lzdGVtICA9IHdpbmRvdy5yZXF1ZXN0RmlsZVN5c3RlbSB8fCB3aW5kb3cud2Via2l0UmVxdWVzdEZpbGVTeXN0ZW07XG5cbiAgICAgICAgIHdpbmRvdy5yZXF1ZXN0RmlsZVN5c3RlbSh3aW5kb3cuVEVNUE9SQVJZLCA1ICogMTAyNCAqIDEwMjQsIGZ1bmN0aW9uIG9uU3VjY2Vzcyhmcykge1xuXG4gICAgICAgICBjb25zb2xlLmxvZygnb3BlbmluZyBmaWxlJyk7XG5cbiAgICAgICAgIGZzLnJvb3QuZ2V0RmlsZShcInRlc3RcIiwge2NyZWF0ZTp0cnVlfSwgZnVuY3Rpb24oZmUpIHtcblxuICAgICAgICAgY29uc29sZS5sb2coJ3NwYXduZWQgd3JpdGVyJyk7XG5cbiAgICAgICAgIGZlLmNyZWF0ZVdyaXRlcihmdW5jdGlvbihmdykge1xuXG4gICAgICAgICBmdy5vbndyaXRlZW5kID0gZnVuY3Rpb24oZSkge1xuICAgICAgICAgY29uc29sZS5sb2coJ3dyaXRlIGNvbXBsZXRlZCcpO1xuICAgICAgICAgfTtcblxuICAgICAgICAgZncub25lcnJvciA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgIGNvbnNvbGUubG9nKCd3cml0ZSBmYWlsZWQ6ICcgKyBlLnRvU3RyaW5nKCkpO1xuICAgICAgICAgfTtcblxuICAgICAgICAgY29uc29sZS5sb2coJ3dyaXRpbmcgYmxvYiB0byBmaWxlLi4nKTtcblxuICAgICAgICAgdmFyIGJsb2IgPSBuZXcgQmxvYihbJ3llaCB0aGlzIGlzIGEgdGVzdCEnXSwge3R5cGU6ICd0ZXh0L3BsYWluJ30pO1xuICAgICAgICAgZncud3JpdGUoYmxvYik7XG5cbiAgICAgICAgIH0sIG9uRXJyb3JJbkZTKTtcblxuICAgICAgICAgfSwgb25FcnJvckluRlMpO1xuXG4gICAgICAgICB9LCBvbkVycm9ySW5GUyk7XG4gICAgICAgICAqL1xuICAgIH1cblxuICAgIHRvZ2dsZShldmVudCkge1xuICAgICAgICBpZiAodGhpcy5pc1JlY29yZGluZykge1xuICAgICAgICAgICAgdGhpcy5pc1JlY29yZGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5zdG9wUmVjb3JkaW5nKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmlzUmVjb3JkaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuc3RhcnRSZWNvcmRpbmcoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNhbmNlbFJlY29yZGluZyhldmVudCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlJlY29yZGVyOjpvblJlY29yZGluZ0NvbXBsZXRlZCgpOyBjYW5jZWxpbmcgcmVjb3JkaW5nXCIpO1xuICAgICAgICAkKFwiI3JlY29yZGVyLWZ1bGxcIikucmVtb3ZlQ2xhc3MoXCJkaXNhYmxlZFwiKTtcbiAgICAgICAgJChcIiNyZWNvcmRlci11cGxvYWRlclwiKS5hZGRDbGFzcyhcImRpc2FibGVkXCIpO1xuICAgICAgICAkKFwiLm0tcmVjb3JkaW5nLWNvbnRhaW5lclwiKS5yZW1vdmVDbGFzcyhcImZsaXBwZWRcIik7XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIuc3JjID0gXCJcIjtcbiAgICAgICAgdGhpcy5tb2RlbC5zZXQoJ3JlY29yZGluZ1RpbWUnLCAzKTtcbiAgICB9XG5cbiAgICB1cGxvYWRSZWNvcmRpbmcoZXZlbnQpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJSZWNvcmRlcjo6b25SZWNvcmRpbmdDb21wbGV0ZWQoKTsgdXBsb2FkaW5nIHJlY29yZGluZ1wiKTtcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5zcmMgPSBcIlwiO1xuXG4gICAgICAgICQoXCIjcmVjb3JkZXItZnVsbFwiKS5hZGRDbGFzcyhcImRpc2FibGVkXCIpO1xuICAgICAgICAkKFwiI3JlY29yZGVyLXVwbG9hZGVyXCIpLnJlbW92ZUNsYXNzKFwiZGlzYWJsZWRcIik7XG4gICAgICAgICQoXCIubS1yZWNvcmRpbmctY29udGFpbmVyXCIpLnJlbW92ZUNsYXNzKFwiZmxpcHBlZFwiKTtcblxuICAgICAgICB2YXIgZGVzY3JpcHRpb24gPSAkKCd0ZXh0YXJlYVtuYW1lPWRlc2NyaXB0aW9uXScpWzBdLnZhbHVlO1xuXG4gICAgICAgIHZhciBkYXRhID0gbmV3IEZvcm1EYXRhKCk7XG4gICAgICAgIGRhdGEuYXBwZW5kKCdkZXNjcmlwdGlvbicsIGRlc2NyaXB0aW9uKTtcbiAgICAgICAgZGF0YS5hcHBlbmQoJ2lzUHVibGljJywgMSk7XG4gICAgICAgIGRhdGEuYXBwZW5kKCdhdWRpby1ibG9iJywgdGhpcy5hdWRpb0Jsb2IpO1xuXG4gICAgICAgIC8vIHNlbmQgcmF3IGJsb2IgYW5kIG1ldGFkYXRhXG5cbiAgICAgICAgLy8gVE9ETzogZ2V0IGEgcmVwbGFjZW1lbnQgYWpheCBsaWJyYXJ5IChtYXliZSBwYXRjaCByZXF3ZXN0IHRvIHN1cHBvcnQgYmluYXJ5PylcbiAgICAgICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICB4aHIub3BlbigncG9zdCcsICcvcmVjb3JkaW5nL2NyZWF0ZScsIHRydWUpO1xuICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcignQWNjZXB0JywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcbiAgICAgICAgeGhyLnVwbG9hZC5vbnByb2dyZXNzID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIHZhciBwZXJjZW50ID0gKChlLmxvYWRlZCAvIGUudG90YWwpICogMTAwKS50b0ZpeGVkKDApICsgJyUnO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJwZXJjZW50YWdlOiBcIiArIHBlcmNlbnQpO1xuICAgICAgICAgICAgJChcIiNyZWNvcmRlci11cGxvYWRlclwiKS5maW5kKFwiLmJhclwiKS5jc3MoJ3dpZHRoJywgcGVyY2VudCk7XG4gICAgICAgIH07XG4gICAgICAgIHhoci5vbmxvYWQgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgJChcIiNyZWNvcmRlci11cGxvYWRlclwiKS5maW5kKFwiLmJhclwiKS5jc3MoJ3dpZHRoJywgJzEwMCUnKTtcbiAgICAgICAgICAgIGlmICh4aHIuc3RhdHVzID09IDIwMCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUmVjb3JkZXI6Om9uUmVjb3JkaW5nQ29tcGxldGVkKCk7IG1hbnVhbCB4aHIgc3VjY2Vzc2Z1bFwiKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJSZWNvcmRlcjo6b25SZWNvcmRpbmdDb21wbGV0ZWQoKTsgbWFudWFsIHhociBlcnJvclwiLCB4aHIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IEpTT04ucGFyc2UoeGhyLnJlc3BvbnNlKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwieGhyLnJlc3BvbnNlXCIsIHhoci5yZXNwb25zZSk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcInJlc3VsdFwiLCByZXN1bHQpO1xuXG4gICAgICAgICAgICBpZiAocmVzdWx0LnN0YXR1cyA9PSBcInN1Y2Nlc3NcIikge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gcmVzdWx0LnVybDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgeGhyLnNlbmQoZGF0YSk7XG4gICAgfVxuXG4gICAgb25SZWNvcmRpbmdUaWNrKCkge1xuICAgICAgICB2YXIgdGltZVNwYW4gPSBwYXJzZUludCgoKG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gdGhpcy50aW1lclN0YXJ0KSAvIDEwMDApLnRvRml4ZWQoKSk7XG4gICAgICAgIHZhciB0aW1lU3RyID0gdGhpcy5JbnRUb1RpbWUodGltZVNwYW4pO1xuICAgICAgICB0aGlzLm1vZGVsLnNldCgncmVjb3JkaW5nVGltZScsIHRpbWVTdHIpO1xuICAgIH1cblxuICAgIG9uQ291bnRkb3duVGljaygpIHtcbiAgICAgICAgaWYgKC0tdGhpcy50aW1lclN0YXJ0ID4gMCkge1xuICAgICAgICAgICAgdGhpcy5tb2RlbC5zZXQoJ3JlY29yZGluZ1RpbWUnLCB0aGlzLnRpbWVyU3RhcnQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJjb3VudGRvd24gaGl0IHplcm8uIGJlZ2luIHJlY29yZGluZy5cIik7XG4gICAgICAgICAgICBjbGVhckludGVydmFsKHRoaXMudGltZXJJZCk7XG4gICAgICAgICAgICB0aGlzLm1vZGVsLnNldCgncmVjb3JkaW5nVGltZScsIHRoaXMuSW50VG9UaW1lKDApKTtcbiAgICAgICAgICAgIHRoaXMub25NaWNSZWNvcmRpbmcoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHN0YXJ0UmVjb3JkaW5nKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcInN0YXJ0aW5nIHJlY29yZGluZ1wiKTtcbiAgICAgICAgdGhpcy5hdWRpb0NhcHR1cmUuc3RhcnQoKCkgPT4gdGhpcy5vbk1pY1JlYWR5KCkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1pY3JvcGhvbmUgaXMgcmVhZHkgdG8gcmVjb3JkLiBEbyBhIGNvdW50LWRvd24sIHRoZW4gc2lnbmFsIGZvciBpbnB1dC1zaWduYWwgdG8gYmVnaW4gcmVjb3JkaW5nXG4gICAgICovXG4gICAgb25NaWNSZWFkeSgpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJtaWMgcmVhZHkgdG8gcmVjb3JkLiBkbyBjb3VudGRvd24uXCIpO1xuICAgICAgICB0aGlzLnRpbWVyU3RhcnQgPSAzO1xuICAgICAgICAvLyBydW4gY291bnRkb3duXG4gICAgICAgIC8vdGhpcy50aW1lcklkID0gc2V0SW50ZXJ2YWwodGhpcy5vbkNvdW50ZG93blRpY2suYmluZCh0aGlzKSwgMTAwMCk7XG5cbiAgICAgICAgLy8gb3IgbGF1bmNoIGNhcHR1cmUgaW1tZWRpYXRlbHlcbiAgICAgICAgdGhpcy5tb2RlbC5zZXQoJ3JlY29yZGluZ1RpbWUnLCB0aGlzLkludFRvVGltZSgwKSk7XG4gICAgICAgIHRoaXMub25NaWNSZWNvcmRpbmcoKTtcblxuICAgICAgICAkKFwiLnJlY29yZGluZy10aW1lXCIpLmFkZENsYXNzKFwiaXMtdmlzaWJsZVwiKTtcbiAgICB9XG5cbiAgICBvbk1pY1JlY29yZGluZygpIHtcbiAgICAgICAgdGhpcy50aW1lclN0YXJ0ID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgICAgIHRoaXMudGltZXJJZCA9IHNldEludGVydmFsKHRoaXMub25SZWNvcmRpbmdUaWNrLmJpbmQodGhpcyksIDEwMDApO1xuICAgICAgICAkKFwiLm0tcmVjb3JkaW5nLXNjcmVlblwiKS5hZGRDbGFzcyhcImlzLXJlY29yZGluZ1wiKTtcblxuICAgICAgICBjb25zb2xlLmxvZyhcIk1pYyByZWNvcmRpbmcgc3RhcnRlZFwiKTtcblxuICAgICAgICAvLyBUT0RPOiB0aGUgbWljIGNhcHR1cmUgaXMgYWxyZWFkeSBhY3RpdmUsIHNvIGF1ZGlvIGJ1ZmZlcnMgYXJlIGdldHRpbmcgYnVpbHQgdXBcbiAgICAgICAgLy8gd2hlbiB0b2dnbGluZyB0aGlzIG9uLCB3ZSBtYXkgYWxyZWFkeSBiZSBjYXB0dXJpbmcgYSBidWZmZXIgdGhhdCBoYXMgYXVkaW8gcHJpb3IgdG8gdGhlIGNvdW50ZG93blxuICAgICAgICAvLyBoaXR0aW5nIHplcm8uIHdlIGNhbiBkbyBhIGZldyB0aGluZ3MgaGVyZTpcbiAgICAgICAgLy8gMSkgZmlndXJlIG91dCBob3cgbXVjaCBhdWRpbyB3YXMgYWxyZWFkeSBjYXB0dXJlZCwgYW5kIGN1dCBpdCBvdXRcbiAgICAgICAgLy8gMikgdXNlIGEgZmFkZS1pbiB0byBjb3ZlciB1cCB0aGF0IHNwbGl0LXNlY29uZCBvZiBhdWRpb1xuICAgICAgICAvLyAzKSBhbGxvdyB0aGUgdXNlciB0byBlZGl0IHBvc3QtcmVjb3JkIGFuZCBjbGlwIGFzIHRoZXkgd2lzaCAoYmV0dGVyIGJ1dCBtb3JlIGNvbXBsZXggb3B0aW9uISlcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB0aGlzLmF1ZGlvQ2FwdHVyZS50b2dnbGVNaWNyb3Bob25lUmVjb3JkaW5nKHRydWUpLCA1MDApO1xuICAgIH1cblxuICAgIHN0b3BSZWNvcmRpbmcoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwic3RvcHBpbmcgcmVjb3JkaW5nXCIpO1xuICAgICAgICBjbGVhckludGVydmFsKHRoaXMudGltZXJJZCk7XG5cbiAgICAgICAgLy8gcGxheSBzb3VuZCBpbW1lZGlhdGVseSB0byBieXBhc3MgbW9iaWxlIGNocm9tZSdzIFwidXNlciBpbml0aWF0ZWQgbWVkaWFcIiByZXF1aXJlbWVudFxuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnNyYyA9IFwiL2Fzc2V0cy9zb3VuZHMvYmVlcF9zaG9ydF9vbi5vZ2dcIjtcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5wbGF5KCk7XG5cbiAgICAgICAgdGhpcy5hdWRpb0NhcHR1cmUuc3RvcCgoYmxvYikgPT4gdGhpcy5vblJlY29yZGluZ0NvbXBsZXRlZChibG9iKSk7XG5cbiAgICAgICAgJChcIi5yZWNvcmRpbmctdGltZVwiKS5yZW1vdmVDbGFzcyhcImlzLXZpc2libGVcIik7XG4gICAgICAgICQoXCIubS1yZWNvcmRpbmctc2NyZWVuXCIpLnJlbW92ZUNsYXNzKFwiaXMtcmVjb3JkaW5nXCIpO1xuXG4gICAgICAgIC8vIFRPRE86IGFuaW1hdGUgcmVjb3JkZXIgb3V0XG4gICAgICAgIC8vIFRPRE86IGFuaW1hdGUgdXBsb2FkZXIgaW5cbiAgICB9XG5cbiAgICBvblJlY29yZGluZ0NvbXBsZXRlZChibG9iKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiUmVjb3JkZXI6Om9uUmVjb3JkaW5nQ29tcGxldGVkKCk7IHByZXZpZXdpbmcgcmVjb3JkZWQgYXVkaW9cIik7XG4gICAgICAgIHRoaXMuYXVkaW9CbG9iID0gYmxvYjtcbiAgICAgICAgdGhpcy5zaG93Q29tcGxldGlvblNjcmVlbigpO1xuICAgIH1cblxuICAgIHBsYXlQcmV2aWV3KCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcInBsYXlpbmcgcHJldmlldy4uXCIpO1xuICAgICAgICBjb25zb2xlLmxvZyhcImF1ZGlvIGJsb2JcIiwgdGhpcy5hdWRpb0Jsb2IpO1xuICAgICAgICBjb25zb2xlLmxvZyhcImF1ZGlvIGJsb2IgdXJsXCIsIHRoaXMuYXVkaW9CbG9iVXJsKTtcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5zcmMgPSB0aGlzLmF1ZGlvQmxvYlVybDtcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5wbGF5KCk7XG4gICAgfVxuXG4gICAgc2hvd0NvbXBsZXRpb25TY3JlZW4oKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiUmVjb3JkZXI6Om9uUmVjb3JkaW5nQ29tcGxldGVkKCk7IGZsaXBwaW5nIHRvIGF1ZGlvIHBsYXliYWNrXCIpO1xuICAgICAgICB0aGlzLmF1ZGlvQmxvYlVybCA9IHdpbmRvdy5VUkwuY3JlYXRlT2JqZWN0VVJMKHRoaXMuYXVkaW9CbG9iKTtcbiAgICAgICAgJChcIi5tLXJlY29yZGluZy1jb250YWluZXJcIikuYWRkQ2xhc3MoXCJmbGlwcGVkXCIpO1xuXG4gICAgICAgIC8vIEhBQ0s6IHJvdXRlIGJsb2IgdGhyb3VnaCB4aHIgdG8gbGV0IEFuZHJvaWQgQ2hyb21lIHBsYXkgYmxvYnMgdmlhIDxhdWRpbz5cbiAgICAgICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICB4aHIub3BlbignR0VUJywgdGhpcy5hdWRpb0Jsb2JVcmwsIHRydWUpO1xuICAgICAgICB4aHIucmVzcG9uc2VUeXBlID0gJ2Jsb2InO1xuICAgICAgICB4aHIub3ZlcnJpZGVNaW1lVHlwZSgnYXVkaW8vb2dnJyk7XG5cbiAgICAgICAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9ICgpID0+IHtcbiAgICAgICAgICAgIGlmICh4aHIucmVhZHlTdGF0ZSA9PT0gNCAmJiB4aHIuc3RhdHVzID09IDIwMCkge1xuICAgICAgICAgICAgICAgIHZhciB4aHJCbG9iVXJsID0gd2luZG93LlVSTC5jcmVhdGVPYmplY3RVUkwoeGhyLnJlc3BvbnNlKTtcblxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiTG9hZGVkIGJsb2IgZnJvbSBjYWNoZSB1cmw6IFwiICsgdGhpcy5hdWRpb0Jsb2JVcmwpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUm91dGVkIGludG8gYmxvYiB1cmw6IFwiICsgeGhyQmxvYlVybCk7XG5cbiAgICAgICAgICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnNyYyA9IHhockJsb2JVcmw7XG4gICAgICAgICAgICAgICAgdGhpcy5hdWRpb1BsYXllci5wbGF5KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHhoci5zZW5kKCk7XG4gICAgfVxufVxuIiwiaW1wb3J0IEJhY2tib25lIGZyb20gJ2JhY2tib25lJ1xuaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSdcbmltcG9ydCBSZWNvcmRpbmdzTGlzdCBmcm9tICcuL2hvbWVwYWdlJ1xuaW1wb3J0IHsgUmVjb3JkZXJWaWV3LCBSZWNvcmRlciB9IGZyb20gJy4vcmVjb3JkaW5nLWNvbnRyb2wnXG5cbmNsYXNzIFJvdXRlciBleHRlbmRzIEJhY2tib25lLlJvdXRlciB7XG5cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoe1xuICAgICAgICAgICAgcm91dGVzOiB7XG4gICAgICAgICAgICAgICAgJyc6ICdob21lJyxcbiAgICAgICAgICAgICAgICAncmVjb3JkJzogJ3JlY29yZCcsXG4gICAgICAgICAgICAgICAgJ3UvOnVzZXJuYW1lJzogJ3VzZXInXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGhvbWUoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdSb3V0ZXIjaG9tZSBjYWxsZWQnKTtcblxuICAgICAgICB2YXIgdmlldyA9IG5ldyBSZWNvcmRpbmdzTGlzdCh7Y2xhc3NOYW1lOiBcInRyYW5zaXRpb25hYmxlXCJ9KTtcbiAgICAgICAgdGhpcy5zd2l0Y2hWaWV3KHZpZXcpO1xuICAgIH1cblxuICAgIHVzZXIodXNlcm5hbWUpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ1JvdXRlciN1c2VyIGNhbGxlZCBmb3IgdXNlcm5hbWUgPSAnICsgdXNlcm5hbWUpO1xuICAgIH1cblxuICAgIHJlY29yZCgpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ1JvdXRlciNyZWNvcmQgY2FsbGVkJyk7XG5cbiAgICAgICAgdmFyIHZpZXcgPSBuZXcgUmVjb3JkZXJWaWV3KHtcbiAgICAgICAgICAgIGNsYXNzTmFtZTogXCJ0cmFuc2l0aW9uYWJsZVwiLFxuICAgICAgICAgICAgbW9kZWw6IG5ldyBSZWNvcmRlcih7cmVjb3JkaW5nVGltZTogLTN9KVxuICAgICAgICB9KVxuXG4gICAgICAgIHRoaXMuc3dpdGNoVmlldyh2aWV3KTtcbiAgICB9XG5cbiAgICBzd2l0Y2hWaWV3KG5ld1ZpZXcpIHtcbiAgICAgICAgaWYodGhpcy52aWV3KSB7XG4gICAgICAgICAgICB2YXIgb2xkVmlldyA9IHRoaXMudmlldztcbiAgICAgICAgICAgIG9sZFZpZXcuJGVsLnJlbW92ZUNsYXNzKFwidHJhbnNpdGlvbi1pblwiKTtcbiAgICAgICAgICAgIG9sZFZpZXcuJGVsLmFkZENsYXNzKFwidHJhbnNpdGlvbi1vdXRcIik7XG4gICAgICAgICAgICBvbGRWaWV3LiRlbC5vbmUoXCJhbmltYXRpb25lbmRcIiwgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYW5pbWF0aW9uIGVuZGVkXCIpO1xuICAgICAgICAgICAgICAgIG9sZFZpZXcucmVtb3ZlKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIG5ld1ZpZXcuJGVsLmFkZENsYXNzKFwidHJhbnNpdGlvbi1pblwiKTtcbiAgICAgICAgbmV3Vmlldy4kZWwub25lKFwiYW5pbWF0aW9uZW5kXCIsICgpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYW5pbWF0aW9uLWluIGVuZGVkXCIpO1xuICAgICAgICAgICAgbmV3Vmlldy4kZWwucmVtb3ZlQ2xhc3MoXCJ0cmFuc2l0aW9uLWluXCIpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkKCcjdmlldy1jb250YWluZXInKS5hcHBlbmQobmV3Vmlldy5lbCk7XG4gICAgICAgIHRoaXMudmlldyA9IG5ld1ZpZXc7XG4gICAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBSb3V0ZXI7XG4iXX0=
