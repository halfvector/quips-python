App.Loaders.RecordingController = (function(){
    'use strict';

    App.Converters.IntToTime = function(value) {

        var minutes = Math.round(value / 60);
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
            });

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
