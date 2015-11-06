export default class SoundPlayer {
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

                if (this.duration == null) {
                    console.log("duration is null")
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
                var progress = (this.duration > 0 ? 100 * this.position / this.duration : 0).toFixed(0) + '%';
                localStorage.setItem("quip:" + this.id + ":progress", progress);
                localStorage.setItem("quip:" + this.id + ":position", this.position.toFixed(0));
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
