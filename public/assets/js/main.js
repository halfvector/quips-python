'use strict';

// our globals
var App = {
    Models: {},
    Collections: {},
    Views: {},
    Converters: {},
    Instances: {},
    Loaders: {}
};

var Backbone = null;

function domReadyCallback(){

    // start backbone
    Backbone = require('backbone');
    Backbone.$ = $;

    // locate any controllers on the page and load their requirements
    // this is a part of Angular i really liked, the custom directives
    $('[backbone-controller]').each(function(el) {

        var controllerName = $(el).attr('backbone-controller');
        if(controllerName in App.Loaders)
            App.Loaders[controllerName]();
        else
            console.error("Controller: '" + controllerName + "' not found");
    });
}

$.domReady(function(){

    // setup raven to push messages to our sentry
    Raven.config('https://d098712cb7064cf08b74d01b6f3be3da@app.getsentry.com/20973', {
        whitelistUrls: ['icanhaserror.com'] // production only
    }).install();

    domReadyCallback();

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
App.Loaders.RecordingsList = (function(){
    'use strict';

    // load our Quip MVC
    App.Loaders.QuipController();

    App.Views.RecordingsList = Backbone.View.extend({
        el: '.m-quips',

        initialize: function() {

            console.log("RecordingsList initialized");

            soundManager.setup({
                debugMode: true,
                url: '/assets/swf/',
                preferFlash: false,
                onready: function() {
                    console.log("soundManager ready");
                }
            });

            $('.m-quip').each(function spawnQuipController(elem){

                var view = new App.Views.Quip({
                    el: elem,
                    model: new App.Models.Quip({progress: 0})
                });

                App.Quips.add(view.model);
                view.render();
            });

            // process all timestamps
            var vagueTime = require('vague-time');
            var now = new Date();

            $("time[datetime]").each(function generateVagueDate(ele){
                ele.textContent = vagueTime.get({from:now, to:new Date(ele.getAttribute('datetime'))});
            });

            this.listenTo(App.Quips, 'add', this.quipAdded);
        },

        quipAdded: function(quip) {

        }
    });

    var view = new App.Views.RecordingsList();
    view.render();

});

App.Loaders.RecordingController = (function(){
    'use strict';

    App.Converters.IntToTime = function(value) {

        var minutes = Math.floor(value / 60);
        var seconds = Math.round(value - minutes * 60);
        
        return ("00" + minutes).substr(-2) + ":" + ("00" + seconds).substr(-2);
    };
    
    App.Models.Recorder = Backbone.Model.extend({
        defaults: {
            recordingTime: 0
        }
    });

    console.log("spawning recorder view");

    App.Views.Recorder = Backbone.View.extend({
        el: '.m-recording-container',

        audioCapture: new App.AudioCapture(),
        audioBlob: null,
        audioPlayer: null,

        events: {
            "click .recording-toggle": "toggle",
            "click #cancel-recording": "cancelRecording",
            "click #upload-recording": "uploadRecording"
        },


        initialize: function(options) {
            this.audioPlayer = document.getElementById("recorded-preview");
            console.log('this.audioPlayer = ' + this.audioPlayer);
            
            this.model.on('change:recordingTime', function(model, time) {
                $(".recording-time").text(time);
            })
            
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
        },

        toggle: function(event) {
            if(this.isRecording) {
                this.isRecording = false;
                this.stopRecording();
            } else {
                this.isRecording = true;
                this.startRecording();
            }
        },

        cancelRecording: function(event) {
            console.log("Recorder::onRecordingCompleted(); canceling recording");
            $("#recorder-full").removeClass("disabled");
            $("#recorder-uploader").addClass("disabled");
            $(".m-recording-container").removeClass("flipped");
            this.audioPlayer.src = "";
            this.model.set('recordingTime', 3);
        },

        uploadRecording: function(event) {
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
            xhr.upload.onprogress = function(e) {
                var percent = ((e.loaded / e.total) * 100).toFixed(0) + '%';
                console.log("percentage: " + percent);
                $("#recorder-uploader").find(".bar").css('width', percent);
            };
            xhr.onload = function(e) {
                $("#recorder-uploader").find(".bar").css('width', '100%');
                if(xhr.status == 200) {
                    console.log("Recorder::onRecordingCompleted(); manual xhr successful");
                } else {
                    console.log("Recorder::onRecordingCompleted(); manual xhr error", xhr);
                }
                var result = JSON.parse(xhr.response);
                console.dir(result);
                
                if(result.status == "success") {
                    window.location.href = result.url;
                }
            };
            xhr.send(data);
        },

        isRecording: false,
        timerId: 0,
        timerStart: 3,

        onRecordingTick: function() {
            var timeSpan = parseInt(((new Date().getTime() - this.timerStart) / 1000).toFixed());
            var timeStr = App.Converters.IntToTime(timeSpan);
            this.model.set('recordingTime', timeStr);
        },
        
        onCountdownTick: function() {
            if( --this.timerStart > 0 ) {
                this.model.set('recordingTime', this.timerStart);
            } else {
                console.log("countdown hit zero. begin recording.");
                clearInterval(this.timerId);
                this.model.set('recordingTime', App.Converters.IntToTime(0));
                this.onMicRecording();
            }
        },

        startRecording: function() {
            console.log("starting recording");
            this.audioCapture.start(this.onMicReady.bind(this));
        },

        /**
         * Microphone is ready to record. Do a count-down, then signal for input-signal to begin recording
         */
        onMicReady: function() {
            console.log("mic ready to record. do countdown.");
            this.timerStart = 3;
            // run ncountdown
            //this.timerId = setInterval(this.onCountdownTick.bind(this), 1000);
            
            // or launch capture immediately
            this.model.set('recordingTime', App.Converters.IntToTime(0));
            this.onMicRecording();
            
            $(".recording-time").addClass("is-visible");
        },
        
        onMicRecording: function() {
            this.timerStart = new Date().getTime();
            this.timerId = setInterval(this.onRecordingTick.bind(this), 1000);
            $(".m-recording-screen").addClass("is-recording");
            
            // TODO: the mic capture is already active, so audio buffers are getting built up
            // when toggling this on, we may already be capturing a buffer that has audio prior to the countdown
            // hitting zero. we can do a few things here:
            // 1) figure out how much audio was already captured, and cut it out
            // 2) use a fade-in to cover up that split-second of audio
            // 3) allow the user to edit post-record and clip as they wish (better but more complex option!)
            var that = this;
            setTimeout(function() { that.audioCapture.toggleMicrophoneRecording(true); }, 500);
        },

        stopRecording: function() {
            console.log("stopping recording");
            clearInterval(this.timerId);
            this.audioCapture.stop(this.onRecordingCompleted.bind(this));
            
            $(".recording-time").removeClass("is-visible");
            $(".m-recording-screen").removeClass("is-recording");

            // TODO: animate recorder out
            // TODO: animate uploader in
        },

        onRecordingCompleted: function(blob) {
            console.log("Recorder::onRecordingCompleted(); previewing recorded audio");
            this.audioBlob = blob;
            this.showCompletionScreen();
        },

        showCompletionScreen: function() {
            console.log("Recorder::onRecordingCompleted(); flipping card");
            var url = URL.createObjectURL(this.audioBlob);
            $(".m-recording-container").addClass("flipped");

            // TODO: get a chainable animations library that supports delays
            setTimeout(function() {
                console.log("Recorder::onRecordingCompleted(); changing audioplayer");

                this.audioPlayer = document.getElementById("recorded-preview");
                this.audioPlayer.src = url;
                this.audioPlayer.play();
            }.bind(this), 200);
        }

    });

    App.Instances.Recorder = new App.Views.Recorder({
        model: new App.Models.Recorder({recordingTime: -3})
    });

    App.Instances.Recorder.render();
});

/**
 * Quip
 * Plays audio clips
 * Manages their state tracking
 */
App.Loaders.QuipController = (function QuipControlLoader(){
    'use strict';
    
    App.Models.Quip = Backbone.Model.extend({
        default: {
            id: 0,
            progress: 0,
            position: 0,
            duration: 0,
            isPublic: false,
        },

        initialize: function() {
        },

        save: function(attributes) {
            console.log("Quip Model saving to localStorage");
            localStorage.setItem(this.id, JSON.stringify(this.toJSON()));
        },

        fetch: function() {
            console.log("Quip Model loading from localStorage");
            this.set(JSON.parse(localStorage.getItem(this.id)));
        },

        id: 0, // guid
        progress: 0, // percentage
        position: 0, // msec
        duration: 0, // msec
        isPublic: false,

        updateProgress: function() {
            this.set({
                progress: (duration > 0 ? position / duration : 0).toFixed(0) + "%"
            });
        }
    });

    App.Collections.Quips = Backbone.Collection.extend({
        model: App.Models.Quip
    });

    App.Quips = new App.Collections.Quips();

    App.CurrentQuipAudio = null;

    App.Views.Quip = Backbone.View.extend({

        el: '.m-quip',

        quipId: 0,

        initialize: function(options) {
            var $this = this;

            this.el = options.el;
            this.model.view = this;
            this.quipId = this.$el.data("quipId");

            var progress = localStorage.getItem("quip:" + $this.quipId + ":progress");
            var position = localStorage.getItem("quip:" + $this.quipId + ":position");

            // update visuals to indicate playback progress
            this.model.on('change:progress', function(model, progress) {
                $("div[data-quip-id='" + $this.quipId + "'] .progress-bar").css("width", progress);
            });
            
            //var desc = $($this.el).find('.description')[0];
            //Hammer(desc).on("swipeleft", this.onRevealControls.bind(this));
            //Hammer(desc).on("swiperight", this.onHideControls.bind(this));
            
            this.publicLink = '/u/' + this.quipId;
            
            this.model.set({
                'id' : $this.quipId,
                'progress':progress,
                'position':position,
                'isPublic':  this.$el.data("isPublic") == 'True',
                'isMine':  this.$el.data("isMine") == 'True'
            });
            
            // only redraw template on data change 
            this.model.on('change:isPublic', this.render, this);
            this.model.on('change:isMine', this.render, this);
        },

        events: {
            "click .description .lock-indicator" : "togglePublic",
            "click .description .text" : "toggle"
        },
        
        
        togglePublic: function(ev) {

            var newState = !this.model.get('isPublic');
            this.model.set({'isPublic': newState});
            
            console.log("toggling new published state: " + newState);
            
            $.ajax({
                url: '/recording/publish/' + this.quipId,
                method: 'post',
                data: { isPublic: newState },
                complete: function(resp) {
                    if(resp && resp.status == 'success') {
                        // change successful
                    } else
                    {   // change failed
                        // TODO: add visual to indicate change-failure
                        console.warn("Toggling recording publication state failed:");
                        console.dir(resp);
                    }
                }
            });
            
            return false;
        },
        
        onRevealControls: function(ev) {
            ev.gesture.preventDefault();
            $(this.el).find(".controls").css("right", "100px");
            console.log("swiped left");
            
        },
        
        onHideControls: function(ev) {
            ev.gesture.preventDefault();
            $(this.el).find(".controls").css("right", "0px");
            console.log("swiped right");
        },

        toggle: function(event) {
            var quipId = $(this.el).data("quipId");
            var url = '/recordings/' + quipId + '.ogg';
            console.log("toggling recording playback: " + url);

            var that = this;

            var resumePosition = parseInt(that.model.get('position') || 0);
            console.log('resumePosition = ' + resumePosition);

            // check if sound is already buffered
            var existingQuip = soundManager.getSoundById(quipId);
            if( existingQuip ) {
                // resume existing audio clip
                if(!existingQuip.paused && existingQuip.playState) {
                    soundManager.pauseAll();
                    console.log("pausing existing clip");
                } else {
                    soundManager.pauseAll();

                    if(!existingQuip.playState) {
                        existingQuip.setPosition(0);
                    }

                    existingQuip.play();
                    console.log("resuming existing clip");
                }
            }

            if(existingQuip)
                return;

            soundManager.pauseAll();

            // would be better if this was a completely single-page ajax app and there was a persistent audio player
            App.CurrentQuipAudio = soundManager.createSound({
                id: quipId,
                url: url,
                volume: 100,
                autoLoad: true,
                autoPlay: false,
                from: resumePosition,
                whileloading: function() {
                    //console.log("loaded: " + this.bytesLoaded + " of " + this.bytesTotal);
                },
                onload: function() {
                    console.log('App.CurrentQuipAudio(); starting playback at position = ' + resumePosition + '/' + this.duration);

                    if((resumePosition + 10) > this.duration) {
                        // the track is pretty much complete, loop it
                        // FIXME: this should actually happen earlier, we should know that the action will cause a rewind
                        //        and indicate the rewind visually so there is no surprise
                        resumePosition = 0;
                        console.log('App.CurrentQuipAudio(); track needed a rewind');
                    }

                    // FIXME: resume compatibility with various browsers
                    // FIXME: sometimes you resume a file all the way at the end, should loop them around
                    this.setPosition(resumePosition);
                    this.play();
                },
                whileplaying: function() {
                    var progress = (this.duration > 0 ? 100 * this.position / this.duration : 0).toFixed(0) + '%';
                    localStorage.setItem("quip:" + this.id + ":progress", progress);
                    localStorage.setItem("quip:" + this.id + ":position", this.position.toFixed(0));
                    that.model.set({'progress' : progress});
                },
                onpause: function() {
                    console.log("App.CurrentQuipAudio(); paused: " + this.id);
                    var progress = (this.duration > 0 ? 100 * this.position / this.duration : 0).toFixed(0) + '%';
                    localStorage.setItem("quip:" + this.id + ":progress", progress);
                    localStorage.setItem("quip:" + this.id + ":position", this.position.toFixed(0));
                    that.model.set({'progress' : progress});
                },
                onfinish: function() {
                    console.log("App.CurrentQuipAudio(); finished playing: " + this.id);

                    // store completion in browser
                    localStorage.setItem("quip:" + this.id + ":progress", '100%');
                    localStorage.setItem("quip:" + this.id + ":position", this.duration.toFixed(0));
                    that.model.set({'progress' : '100%'});

                    // TODO: unlock some sort of achievement for finishing this track, mark it a diff color, etc
                    // TODO: this is a good place to fire a hook to a playback manager to move onto the next audio clip
                }
            });
        },
        
        _fullyRendered: false,
        renderOnce: function() {
            var _ = require('underscore');
            
            if(this.model.get('isMine')) {
                var html = _.template($("#quip-control-privacy").html());
                $(this.el).find(".controls").prepend(html({
                    isPublic: this.model.get('isPublic'),
                    publicLink: this.publicLink
                }));
            }
        },
        
        render: function() {
            
            console.log("quip-control redraw");
            
            var result = $(this.el).find('.controls').find('.lock-indicator');
            if(result)
                result.remove();
            
            if(this.model.get('isMine')) {
                var _ = require('underscore');
                var html = _.template($("#quip-control-privacy").html());
                
                $(this.el).find(".controls").prepend(html({
                    isPublic: this.model.get('isPublic'),
                    publicLink: this.publicLink
                }));
            }
        }
    });
});
/**
 * Primary Nav User Dropdown Widget
 */

// the backbone variant
App.Loaders.DropdownWidget = (function(){
    'use strict';

    App.Views.DropdownWidget = Backbone.View.extend({
        el: '.m-dropdown',
        overlay: null,

        events: {
            "click" : "toggle"
        },

        initialize: function() {
            this.el = $(this.el);
        },

        // toggle dropdown and shade
        toggle: function() {
            if($(this.el).data("dropdown-state") === "open") {
                $(this.el).data("dropdown-state", "closed");
                $(this.el).removeClass("opened");
                this.overlay.removeClass("opened");
            } else {
                $(this.el).data("dropdown-state", "open");
                $(this.el).addClass("opened");

                if(!this.overlay) {
                    // create the overlay for the first time
                    this.overlay = $('<div class="capture-overlay"></div>');
                    $(this.el).append(this.overlay);
                }

                this.overlay.addClass("opened");
            }
        }
    });

    var widget = new App.Views.DropdownWidget();
    widget.render();

});

// this was the jquery variant
App.Loaders.DropdownWidgetJquery = (function($, window, document, undefined) {
    'use strict';

    if(!$.fn.lexy)
        $.fn.lexy = {};

    function Dropdown(target, options) {
        var element = $(target);
        var overlay = null;

        this.init = function() {
            var that = this;

            element.on('click.lexy.dropdown', function(e) {
                e.stopPropagation();
                that.toggle();
            });
        };

        this.toggle = function() {
            if(element.data("dropdown-state") === "open")
                this.hideMenu();
            else
                this.showMenu();
        };

        this.hideMenu = function() {
            element.data("dropdown-state", "closed");
            element.find(".dropdown-content").fadeOut(150);
            overlay.fadeOut(150);
        };

        this.showMenu = function() {
            element.data("dropdown-state", "open");
            element.find(".dropdown-content").fadeIn(100);

            if(!overlay) {
                // create the overlay for the first time
                overlay = $('<div class="capture-overlay"></div>');
                element.append(overlay);
            }

            overlay.fadeIn(100);
        };

        this.init();
    }

    $.fn.dropdown = function(options) {
        options = $.extend({}, $.fn.dropdown.options, options);

        return this.each(function() {
            // only instantiate once
            if(!$.data(this, "plugin_lexy_dropdown"))
                $.data(this, "plugin_lexy_dropdown", new Dropdown(this, options));
        });
    };

    $.fn.dropdown.options = {
        className: "m-dropdown",
        dropdownElement: "dropdown-content"
    };

    /*
     // hook to close dropdowns on an outside click event
     $(document).on('click.lexy.dropdown', ".dropdown-trigger", function(e) {
     $(e.currentTarget).lexy.dropdown();
     });
     */

    $(".m-dropdown").dropdown();

});