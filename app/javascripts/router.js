import Backbone from 'backbone'
import _ from 'underscore'
import RecordingsList from './homepage'
import { RecorderView, Recorder } from './recording-control'

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

        var view = new RecordingsList({className: "transitionable"});
        this.switchView(view);
    }

    user(username) {
        console.log('Router#user called for username = ' + username);
    }

    record() {
        console.log('Router#record called');

        var view = new RecorderView({
            className: "transitionable",
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
                console.log("animation ended");
                oldView.remove();
            });
        }

        newView.$el.addClass("transition-in");
        newView.$el.one("animationend", () => {
            console.log("animation-in ended");
            newView.$el.removeClass("transition-in");
        });

        $('#view-container').append(newView.el);
        this.view = newView;
    }
}

export default Router;
