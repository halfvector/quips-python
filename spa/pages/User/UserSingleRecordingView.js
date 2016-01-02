import Backbone from 'backbone'
import * as Views from '../Views'
import { QuipModel } from '../../models/Quip'

export default class UserPodView extends Backbone.View {
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

        this.quipView = new Views.QuipView({model: new QuipModel(quip)});
        this.$el.append(this.quipView.el);
    }

    destroyChildViews() {
        this.quipView.shutdown();
    }
}

export { UserPodView }

