import * as Views from './Views'

import StreamController from './Streams/StreamController.js'
import RecorderController from './Recorder/RecorderController'

export class HomeController {
    constructor(presenter) {
        presenter.switchView(new Views.HomepageView());
    }
}

export class UserController {
    constructor(presenter, username) {
        presenter.switchView(new Views.UserPodCollectionView(username));
    }
}

export class ChangelogController {
    constructor(presenter) {
        presenter.switchView(new Views.ChangelogView());
    }
}

export class SinglePodController {
    constructor(presenter, id) {
        presenter.switchView(new Views.UserPodView(id));
    }
}

export { StreamController, RecorderController }
