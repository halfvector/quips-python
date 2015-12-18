import Backbone from 'backbone'
import _ from 'underscore'

class AudioPlayerEvents extends Backbone.Model {
    pause() {
        this.trigger("pause");
    }
}

export let AudioPlayer = new AudioPlayerEvents();

class AudioPlayerView extends Backbone.View {
    defaults() {
        return {
            audioPlayer: null,
            quipModel: null
        }
    }

    initialize() {
        console.log("AudioPlayerView initialized");
        this.audioPlayer = document.getElementById("audio-player");
        AudioPlayer.on("toggle", (quip) => this.onToggle(quip), this);
        AudioPlayer.on("pause", (quip) => this.pause(quip), this);
    }

    close() {
        this.stopPeriodicTimer();
    }

    startPeriodicTimer() {
        if(this.periodicTimer == null) {
            this.periodicTimer = setInterval(() => this.checkProgress(), 100);
        }
    }

    stopPeriodicTimer() {
        if(this.periodicTimer != null) {
            clearInterval(this.periodicTimer);
            this.periodicTimer = null;
        }
    }

    checkProgress() {
        if(this.quipModel == null) {
            return;
        }

        var progressUpdate = {
            position: this.audioPlayer.currentTime, // sec
            duration: this.audioPlayer.duration, // sec
            progress: 100 * this.audioPlayer.currentTime / this.audioPlayer.duration // %
        }

        AudioPlayer.trigger("/" + this.quipModel.id + "/progress", progressUpdate);
    }

    onToggle(quipModel) {
        this.quipModel = quipModel;

        if(!this.trackIsLoaded(quipModel.url)) {
            this.loadTrack(quipModel.url);
        }

        if(!this.trackIsLoaded(quipModel.url)) {
            return;
        }

        if(this.audioPlayer.paused) {
            this.play(quipModel);
        } else {
            this.pause(quipModel);
        }
    }

    play(quipModel) {
        this.audioPlayer.currentTime = Math.floor(quipModel.position);
        this.audioPlayer.play();

        AudioPlayer.trigger("/" + quipModel.id + "/playing");
        this.startPeriodicTimer();
    }

    pause(quipModel) {
        this.audioPlayer.pause();
        if(quipModel != null) {
            AudioPlayer.trigger("/" + quipModel.id + "/paused");
        }
        this.stopPeriodicTimer();
    }

    trackIsLoaded(url) {
        return ~this.audioPlayer.src.indexOf(url);
    }

    loadTrack(url) {
        console.log("Loading audio: " + url);
        this.audioPlayer.src = url;
        this.audioPlayer.load();
    }
}

class SoundPlayer {
    static create (model) {
        var resumePosition = parseInt(model.get('position') || 0);

        console.log("Creating sound player for model:", model);

        return soundManager.createSound({
            id: model.id,
            url: model.url,
            volume: 100,
            autoLoad: true,
            autoPlay: false,
            from: resumePosition,
            whileloading: function () {
                console.log("loaded: " + this.bytesLoaded + " of " + this.bytesTotal);
            },
            onload: function () {
                console.log('Sound; audio loaded; position = ' + resumePosition + ', duration = ' + this.duration);

                if (this.duration == null || this.duration == 0) {
                    console.log("duration is null");
                    return;
                }

                if ((resumePosition + 10) > this.duration) {
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
            whileplaying: function () {
                var progress = (this.duration > 0 ? 100 * this.position / this.duration : 0).toFixed(0) + '%';
                localStorage.setItem("quip:" + this.id + ":progress", progress);
                localStorage.setItem("quip:" + this.id + ":position", this.position.toFixed(0));
                model.set({'progress': progress});
            },
            onpause: function () {
                console.log("Sound; paused: " + this.id);
                var position = this.position ? this.position.toFixed(0) : 0;
                var progress = (this.duration > 0 ? 100 * position / this.duration : 0).toFixed(0) + '%';
                localStorage.setItem("quip:" + this.id + ":progress", progress);
                localStorage.setItem("quip:" + this.id + ":position", position);
                model.set({'progress': progress});
            },
            onfinish: function () {
                console.log("Sound; finished playing: " + this.id);

                // store completion in browser
                localStorage.setItem("quip:" + this.id + ":progress", '100%');
                localStorage.setItem("quip:" + this.id + ":position", this.duration.toFixed(0));
                model.set({'progress': '100%'});

                // TODO: unlock some sort of achievement for finishing this track, mark it a diff color, etc
                // TODO: this is a good place to fire a hook to a playback manager to move onto the next audio clip
            }
        })
    }
}

export { SoundPlayer, AudioPlayerView, AudioPlayerEvents };
