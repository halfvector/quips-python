import Backbone from 'backbone'
import _ from 'underscore'
import HomepageView from './homepage'
import { RecorderView, Recorder } from './recording-control'
import { UserPodCollectionView } from './user-pod-collection'

class Router extends Backbone.Router {
    constructor() {
        super({
            routes: {
                '': 'home',
                'record': 'record',
                'u/:username': 'user'
            }
        });
    }

    home() {
        console.log('Router#home called');

        var view = new HomepageView();
        this.switchView(view);
    }

    user(username) {
        console.log('Router#user called for username = ' + username);
        var view = new UserPodCollectionView(username);
        this.switchView(view);
    }

    record() {
        console.log('Router#record called');

        var view = new RecorderView({
            model: new Recorder({recordingTime: -3})
        })

        this.switchView(view);
    }

    switchView(newView) {
        if(this.view) {
            var oldView = this.view;
            oldView.$el.removeClass("transition-in");
            oldView.$el.addClass("transition-out");
            oldView.$el.one("animationend", () => {
                oldView.remove();
                oldView.unbind();
                if(oldView.shutdown != null) {
                    oldView.shutdown();
                }
            });
        }

        newView.$el.addClass("transitionable transition-in");
        newView.$el.one("animationend", () => {
            newView.$el.removeClass("transition-in");
        });

        $('#view-container').append(newView.el);
        this.view = newView;
    }
}

export default Router;
