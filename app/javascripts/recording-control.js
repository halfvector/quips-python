(function(){
    'use strict';

    App.Converters.IntToTime = function(value) {
        //console.log("value = " + value);
        var minutes = Math.round(value / 60);
        var seconds = Math.round(value - minutes * 60);
        var str = ("00" + minutes).substr(-2) + ":" + ("00" + seconds).substr(-2);
        return str;
    };

    App.Models.Recorder = Backbone.Model.extend({
        defaults: {
            recordingTime: 0
        }
    });

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

        bindings: {
            "text .recording-time": ["recordingTime", App.Converters.IntToTime]
        },

        initialize: function(options) {
            this.audioPlayer = document.getElementById("recorded-preview");
            console.log('this.audioPlayer = ' + this.audioPlayer);

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
            $(".m-recording-container").removeClass("flipped");
            this.audioPlayer.src = "";
        },

        uploadRecording: function(event) {
            console.log("Recorder::onRecordingCompleted(); uploading recording");

            var description = $('textarea[name=description]')[0].value;

            var data = new FormData();
            data.append('description', description);
            data.append('isPublic', 1);
            data.append('audio-blob', this.audioBlob);

            // send raw blob and metadata
            $.ajax({
                url: '/recording/create',
                data: data,
                processData: false,
                contentType: false,
                type: 'POST',
                success: function(result) {
                    console.log("Main::post(); posted");
                }
            });

            $(".m-recording-container").removeClass("flipped");
        },

        isRecording: false,
        timerId: 0,
        timerStart: 0,

        onTimerTick: function() {
            var timeSpan = parseInt(((new Date().getTime() - this.timerStart) / 1000).toFixed());
            this.model.set('recordingTime', timeSpan);
        },

        startRecording: function() {
            console.log("starting recording");
            this.timerStart = new Date().getTime();
            this.timerId = setInterval(this.onTimerTick.bind(this), 1000);

            this.audioCapture.start();
        },

        stopRecording: function() {
            console.log("stopping recording");
            clearInterval(this.timerId);
            this.audioCapture.stop(this.onRecordingCompleted.bind(this));

            // animate recorder out
            // animate uploader in
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

            setTimeout(function() {
                console.log("Recorder::onRecordingCompleted(); changing audioplayer");

                this.audioPlayer = document.getElementById("recorded-preview");
                this.audioPlayer.src = url;
                this.audioPlayer.play();

                this.render();
            }.bind(this), 200);
        },

        render: function() {
            console.log("Recorder::render(); binding model..");
            return this.bindModel();
        }
    });

    (function(){
        App.Instances.Recorder = new App.Views.Recorder({
            model: new App.Models.Recorder({recordingTime: 5})
        });

        App.Instances.Recorder.render();
    })(jQuery);

})(App);