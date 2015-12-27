import Backbone from 'backbone'
import _ from 'underscore'
import Handlebars from 'handlebars'
import template from '../templates/create_recording.hbs'
import { QuipModel, QuipView, Quips } from './quip-control.js'
import { AudioCapture } from './audio-capture'
import { AudioPlayerView } from './audio-player'
import { CreateRecordingModel } from './models/CreateRecordingModel'

export class Recorder extends Backbone.Model {
    defaults() {
        return {
            recordingTime: 0
        }
    }
}

export class RecorderView extends Backbone.View {
    //    el: '.m-recording-container',

    IntToTime(value) {
        var minutes = Math.floor(value / 60);
        var seconds = Math.round(value - minutes * 60);

        return ("00" + minutes).substr(-2) + ":" + ("00" + seconds).substr(-2);
    }

    defaults() {
        return {
            audioCapture: null,
            audioBlob: null,
            audioBlobUrl: null,
            audioPlayer: null,
            isRecording: false,
            timerId: 0,
            timerStart: 3
        }
    }

    events() {
        return {
            "click .recording-toggle": "toggle",
            "click #cancel-recording": "cancelRecording",
            "click #upload-recording": "uploadRecording",
            "click #preview-btn": "playPreview"
        }
    }

    render() {
        this.$el.html(template(this.model.toJSON()));
    }

    build(model) {
        this.model = model;

        console.log("model", model);

        this.render();

        this.audioPlayer = document.getElementById("recorded-preview");
        if (this.audioPlayer == null) {
            return;
        }

        //console.log("can play vorbis: ", !!this.audioPlayer.canPlayType && "" != this.audioPlayer.canPlayType('audio/ogg; codecs="vorbis"'));

        // play a beep
        this.audioPlayer.src = "/assets/sounds/beep_short_on.ogg";
        this.audioPlayer.play();

        this.model.on('change:recordingTime', function (model, time) {
            $(".recording-time").text(time);
        })
    }

    initialize(microphoneMediaStream) {
        this.audioCapture = new AudioCapture(microphoneMediaStream);

        new CreateRecordingModel().fetch()
            .then(model => this.build(new CreateRecordingModel(model)));
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
        xhr.open('post', '/api/quips', true);
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

    startRecording() {
        console.log("starting recording");
        this.audioCapture.start(() => this.onRecordingStarted());
    }

    /**
     * Microphone is ready to record. Do a count-down, then signal for input-signal to begin recording
     */
    onRecordingStarted() {
        console.log("mic ready to record. do countdown.");

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
        setTimeout(() => this.audioCapture.toggleMicrophoneRecording(true), 200);
    }

    stopRecording() {
        console.log("stopping recording");
        clearInterval(this.timerId);

        // play sound immediately to bypass mobile chrome's "user initiated media" requirement
        this.audioPlayer.src = "/assets/sounds/beep_short_off.ogg";
        this.audioPlayer.play();

        // request recording stop
        // wait for sync to complete
        // and then callback transition to next screen
        this.audioCapture.stop((blob) => this.onRecordingCompleted(blob));

        $(".recording-time").removeClass("is-visible");
        $(".m-recording-screen").removeClass("is-recording");
    }

    onRecordingCompleted(blob) {
        console.log("Recorder::onRecordingCompleted(); previewing recorded audio");
        this.audioBlob = blob;
        this.showCompletionScreen();
    }

    playPreview() {
        // at this point a playable audio blob should already be loaded in audioPlayer
        // so just play it again
        this.audioPlayer.play();
    }

    showCompletionScreen() {
        console.log("Recorder::onRecordingCompleted(); flipping to audio playback");
        this.audioBlobUrl = window.URL.createObjectURL(this.audioBlob);
        $(".m-recording-container").addClass("flipped");

        this.makeAudioBlobUrlPlayable(this.audioBlobUrl, (playableAudioBlobUrl) => {
            this.audioPlayer.src = playableAudioBlobUrl;
            this.audioPlayer.play();
        });
    }

    /**
     * HACK: route blob through xhr to let Android Chrome play blobs via <audio>
     * @param audioBlobUrl representing potentially non-disk-backed blob url
     * @param callback function accepts a disk-backed blob url
     */
    makeAudioBlobUrlPlayable(audioBlobUrl, callback) {
        // this request happens over loopback
        var xhr = new XMLHttpRequest();
        xhr.open('GET', audioBlobUrl, true);
        xhr.responseType = 'blob';
        xhr.overrideMimeType('audio/ogg');

        xhr.onreadystatechange = () => {
            if (xhr.readyState === 4 && xhr.status == 200) {
                var xhrBlobUrl = window.URL.createObjectURL(xhr.response);

                console.log("Loaded blob from cache url: " + audioBlobUrl);
                console.log("Routed into blob url: " + xhrBlobUrl);

                callback(xhrBlobUrl);
            }
        };
        xhr.send();
    }
}
