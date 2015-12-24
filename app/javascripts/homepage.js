import Backbone from 'backbone'
import { QuipView, } from './quip-control.js'
import { AudioPlayer, AudioPlayerView } from './audio-player'
import { QuipModel, MyQuipCollection } from './models/Quip'

class HomepageView extends Backbone.View {
    initialize() {
        new MyQuipCollection().fetch().then(quips => this.onQuipsLoaded(quips))
    }

    shutdown() {
        if (this.quipViews != null) {
            for (var quip of this.quipViews) {
                quip.shutdown();
            }
        }

        AudioPlayer.trigger("pause");
    }

    onQuipsLoaded(quips) {
        console.log("loaded quips", quips);

        this.quipViews = [];

        for (var quip of quips) {
            var quipView = new QuipView({model: new QuipModel(quip)});
            this.quipViews.push(quipView);
            this.$el.append(quipView.el);
        }
    }
};

export { HomepageView }
