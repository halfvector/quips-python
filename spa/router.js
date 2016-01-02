import Backbone from 'backbone'

import ChangelogView from './pages/Changelog/ChangelogView'
import HomepageView from './pages/Homepage/HomepageView'
import RecorderView from './pages/Recorder/RecorderView'
import GetMicrophoneView from './pages/GetMicrophone/GetMicrophoneView'
import UserPodView from './pages/User/UserSingleRecordingView'
import HeaderNavView from './partials/HeaderNavView'
import QuipView from './partials/QuipView'
import { UserPodCollectionView } from './pages/User/UserAllRecordingsView'
import MicrophonePermissions from './pages/GetMicrophone/MicrophonePermissions'

import { RootPresenter } from './presenter'

class RecorderController {
    constructor(presenter) {
        this.presenter = presenter;
        new MicrophonePermissions()
            .grabMicrophone(this.onMicrophoneAcquired, this.onMicrophoneDenied);
    }

    onMicrophoneAcquired(microphoneMediaStream) {
        this.presenter.switchView(new RecorderView(microphoneMediaStream));
    }

    onMicrophoneDenied() {
        this.presenter.switchView(new GetMicrophoneView());
    }
}

class HomeController {
    constructor(presenter) {
        presenter.switchView(new HomepageView());
    }
}

class UserController {
    constructor(presenter, username) {
        presenter.switchView(new UserPodCollectionView(username));
    }
}

class ChangelogController {
    constructor(presenter) {
        presenter.switchView(new ChangelogView());
    }
}

class SinglePodController {
    constructor(presenter, id) {
        presenter.switchView(new UserPodView(id));
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
        new SinglePodController(RootPresenter, id);
    }

    home() {
        new HomeController(RootPresenter);
    }

    user(username) {
        new UserController(RootPresenter, username);
    }

    changelog() {
        new ChangelogController(RootPresenter);
    }

    record() {
        new RecorderController(RootPresenter);
    }


}

export default Router;
