import Backbone from 'backbone'
import _ from 'underscore'
import "babel-polyfill"
import { HomepageView } from './homepage'
import { RecorderView, Recorder } from './recording-control'
import { GetMicrophoneView } from './get-mic-view'
import { UserPodCollectionView } from './user-pod-collection'
import { CreateRecordingModel } from './models/CreateRecordingModel'
import { ChangelogView } from './changelog-view'
import { RootPresenter } from './presenter'
import { HeaderNavView } from './header-nav-view'
import { UserPodView } from './user-pod'

class MicrophonePermissions {
    constructor() {
        this.microphoneMediaStream = null;
    }

    haveMicrophone() {
        return this.microphoneMediaStream != null ? true : false;
    }

    setMicrophone(ms) {
        this.microphoneMediaStream = ms;
    }

    grabMicrophone(onMicrophoneGranted, onMicrophoneDenied) {
        if (this.haveMicrophone()) {
            onMicrophoneGranted();
            return;
        }

        navigator.mediaDevice
            .getUserMedia({audio: true})
            .then((ms) => {
                this.setMicrophone(ms);
                onMicrophoneGranted(ms);
            })
            .catch((err) => {
                console.log("AudioCapture::start(); could not grab microphone. perhaps user didn't give us permission?");
                console.warn(err);
                onMicrophoneDenied(err);
            })
    }
}

class RecorderController {
    constructor() {
        new MicrophonePermissions()
            .grabMicrophone(this.onMicrophoneAcquired, this.onMicrophoneDenied);
    }

    onMicrophoneAcquired(microphoneMediaStream) {
        RootPresenter.switchView(new RecorderView(microphoneMediaStream));
    }

    onMicrophoneDenied() {
        RootPresenter.switchView(new GetMicrophoneView());
    }
}

class HomeController {
    constructor() {
        RootPresenter.switchView(new HomepageView());
    }
}

class UserController {
    constructor(username) {
        RootPresenter.switchView(new UserPodCollectionView(username));
    }
}

class ChangelogController {
    constructor() {
        RootPresenter.switchView(new ChangelogView());
    }
}

class SinglePodController {
    constructor(id) {
        RootPresenter.switchView(new UserPodView(id));
    }
}

class Router extends Backbone.Router {
    constructor() {
        super({
            routes: {
                '': 'home',
                'record': 'record',
                'u/:username': 'user',
                'changelog': 'changelog',
                'q/:quipid': 'single_item'
            }
        });
    }

    initialize() {
    }

    setUser(user) {
        RootPresenter.showHeaderNav(new HeaderNavView(user))
    }

    single_item(id) {
        console.log('Router#single_item called');
        new SinglePodController(id);
    }

    home() {
        console.log('Router#home called');
        new HomeController();
    }

    user(username) {
        console.log('Router#user called for username = ' + username);
        new UserController(username);
    }

    changelog() {
        new ChangelogController();
    }

    record() {
        console.log('Router#record called');
        new RecorderController();

        //this.switchView(new RecorderView());

        //new CreateRecordingModel().fetch()
        //    .then(model => this.switchView(new RecorderView({'model': new CreateRecordingModel(model)})));

        //fetch("/api/create_recording", {credentials: 'include'})
        //    .then(res => res.json())
        //    .then(json => this.switchView(new RecorderView(json)));
    }


}

export default Router;
