import Backbone from 'backbone'
import _ from 'underscore'
import Handlebars from 'handlebars'
import { QuipModel, QuipView, Quips } from './quip-control.js'
import { AudioCapture } from './audio-capture'
import { AudioPlayerView } from './audio-player'
import { CreateRecordingModel } from './models/CreateRecordingModel'

import template from '../templates/get_microphone.hbs'

export class GetMicrophoneView extends Backbone.View {
    defaults() {
        return {}
    }

    events() {
        return {}
    }

    render() {
        console.log("rendering recorder control");
        this.$el.html(template(this.model.toJSON()));
    }

    build(model) {
        this.model = model;

        this.audioCapture = new AudioCapture();

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
        })

        // attempt to fetch media-stream on page-load
        this.audioCapture.grabMicrophone(onMicrophoneGranted, onMicrophoneDenied);
    }

    onMicrophoneDenied() {
        // show screen asking user for permission
    }

    onMicrophoneGranted() {
        // show recorder
    }

    initialize(options) {
        console.log("RecorderView init");
        new CreateRecordingModel().fetch()
            .then(model => this.build(new CreateRecordingModel(model)));


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

    toggle(event) {
        if (this.isRecording) {
            this.isRecording = false;
            this.stopRecording();
        } else {
            this.isRecording = true;
            this.startRecording();
        }
    }

    cancelRecording(event) {
        console.log("Recorder::onRecordingCompleted(); canceling recording");
        $("#recorder-full").removeClass("disabled");
        $("#recorder-uploader").addClass("disabled");
        $(".m-recording-container").removeClass("flipped");
        this.audioPlayer.src = "";
        this.model.set('recordingTime', 3);
    }

    uploadRecording(event) {
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
            var percent = ((e.loaded / e.total) * 100).toFixed(0) + '%';
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

    onRecordingTick() {
        var timeSpan = parseInt(((new Date().getTime() - this.timerStart) / 1000).toFixed());
        var timeStr = this.IntToTime(timeSpan);
        this.model.set('recordingTime', timeStr);
    }

    onCountdownTick() {
        if (--this.timerStart > 0) {
            this.model.set('recordingTime', this.timerStart);
        } else {
            console.log("countdown hit zero. begin recording.");
            clearInterval(this.timerId);
            this.model.set('recordingTime', this.IntToTime(0));
            this.onMicRecording();
        }
    }

    startRecording() {
        console.log("starting recording");
        this.audioCapture.start(() => this.onMicReady());
    }

    /**
     * Microphone is ready to record. Do a count-down, then signal for input-signal to begin recording
     */
    onMicReady() {
        console.log("mic ready to record. do countdown.");
        this.timerStart = 3;
        // run countdown
        //this.timerId = setInterval(this.onCountdownTick.bind(this), 1000);

        // or launch capture immediately
        this.model.set('recordingTime', this.IntToTime(0));
        this.onMicRecording();

        $(".recording-time").addClass("is-visible");
    }

    onMicRecording() {
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
        setTimeout(() => this.audioCapture.toggleMicrophoneRecording(true), 500);
    }

    stopRecording() {
        console.log("stopping recording");
        clearInterval(this.timerId);

        // play sound immediately to bypass mobile chrome's "user initiated media" requirement
        this.audioPlayer.src = "/assets/sounds/beep_short_on.ogg";
        this.audioPlayer.play();

        this.audioCapture.stop((blob) => this.onRecordingCompleted(blob));

        $(".recording-time").removeClass("is-visible");
        $(".m-recording-screen").removeClass("is-recording");

        // TODO: animate recorder out
        // TODO: animate uploader in
    }

    onRecordingCompleted(blob) {
        console.log("Recorder::onRecordingCompleted(); previewing recorded audio");
        this.audioBlob = blob;
        this.showCompletionScreen();
    }

    playPreview() {
        console.log("playing preview..");
        console.log("audio blob", this.audioBlob);
        console.log("audio blob url", this.audioBlobUrl);
        this.audioPlayer.src = this.audioBlobUrl;
        this.audioPlayer.play();
    }

    showCompletionScreen() {
        console.log("Recorder::onRecordingCompleted(); flipping to audio playback");
        this.audioBlobUrl = window.URL.createObjectURL(this.audioBlob);
        $(".m-recording-container").addClass("flipped");

        // HACK: route blob through xhr to let Android Chrome play blobs via <audio>
        var xhr = new XMLHttpRequest();
        xhr.open('GET', this.audioBlobUrl, true);
        xhr.responseType = 'blob';
        xhr.overrideMimeType('audio/ogg');

        xhr.onreadystatechange = () => {
            if (xhr.readyState === 4 && xhr.status == 200) {
                var xhrBlobUrl = window.URL.createObjectURL(xhr.response);

                console.log("Loaded blob from cache url: " + this.audioBlobUrl);
                console.log("Routed into blob url: " + xhrBlobUrl);

                this.audioPlayer.src = xhrBlobUrl;
                this.audioPlayer.play();
            }
        };
        xhr.send();
    }
}
