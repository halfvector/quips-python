import Backbone from 'backbone'
import { QuipView, } from './quip-control.js'
import { AudioPlayer, AudioPlayerView } from './audio-player'
import { QuipModel, MyQuipCollection } from './models/Quip'

class UserPodView extends Backbone.View {
    initialize(quipId) {
        new QuipModel({id: quipId})
            .fetch()
            .then(quip => this.createChildViews(quip))
    }

    shutdown() {
        AudioPlayer.pause();
        this.destroyChildViews();
    }

    createChildViews(quip) {
        console.log("loaded single pod", quip);

        this.quipView = new QuipView({model: new QuipModel(quip)});
        this.$el.append(this.quipView.el);
    }

    destroyChildViews() {
        this.quipView.shutdown();
    }
}

export { UserPodView }

