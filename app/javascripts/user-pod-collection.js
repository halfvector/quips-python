import Backbone from 'backbone'
import { QuipView, } from './quip-control.js'
import { AudioPlayer, AudioPlayerView } from './audio-player'
import { QuipModel, MyQuipCollection } from './models/Quip'

class UserPodCollection extends Backbone.Collection {
    constructor(username) {
        super();
        this.model = QuipModel;
        this.username = username;
    }

    url() {
        return "/api/u/" + this.username + "/quips";
    }
}

class UserPodCollectionView extends Backbone.View {
    constructor(username) {
        super(username);
    }

    initialize(username) {
        new UserPodCollection(username)
            .fetch()
            .then(quips => this.createChildViews(quips))
    }

    shutdown() {
        AudioPlayer.pause();
        this.destroyChildViews();
    }

    createChildViews(quips) {
        this.quipViews = [];

        for (var quip of quips) {
            var quipView = new QuipView({model: new QuipModel(quip)});
            this.quipViews.push(quipView);
            this.$el.append(quipView.el);
        }
    }

    destroyChildViews() {
        if (this.quipViews != null) {
            for (var quip of this.quipViews) {
                quip.shutdown();
            }
        }
    }
}

export { UserPodCollection, UserPodCollectionView }

