import Backbone from 'backbone'
import * as Views from '../Views'
import { QuipModel, MyQuipCollection } from '../../models/Quip'
import template from './UserAllRecordings.hbs'

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
        this.render();
        new UserPodCollection(username)
            .fetch()
            .then(quips => this.createChildViews(quips))
    }

    render() {
        this.$el.html(template());
    }

    shutdown() {
        AudioPlayer.pause();
        this.destroyChildViews();
    }

    createChildViews(quips) {
        this.quipViews = [];
        var list = this.$el.find('.g-quips-list');

        for (var quip of quips) {
            var quipView = new Views.QuipView({model: new QuipModel(quip)});
            this.quipViews.push(quipView);
            list.append(quipView.el);
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

