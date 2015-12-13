import Backbone from 'backbone'
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

        new RecordingsList({el: $('#recordings-container')});
    }

    user(username) {
        console.log('Router#user called for username = ' + username);
    }

    record() {
        console.log('Router#record called');

        var recorder = new RecorderView({
            el: $('.m-recording-container'),
            model: new Recorder({recordingTime: -3})
        });
    }
}

export default Router;
