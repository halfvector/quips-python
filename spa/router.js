import Backbone from 'backbone'
import * as Controllers from './pages/Controllers'
import HeaderNavView from './partials/HeaderNavView'
import { RootPresenter } from './presenter'

export default class Router extends Backbone.Router {
    constructor() {
        super({
            routes: {
                '': 'home',
                'record': 'record',
                'u/:username': 'user',
                'changelog': 'changelog',
                'q/:quipid': 'single_item',
                'streams': 'list_streams',
                'streams/:id': 'stream_details'
            }
        });
    }

    setUser(user) {
        RootPresenter.showHeaderNav(new HeaderNavView(user))
    }

    single_item(id) {
        new Controllers.SinglePodController(RootPresenter, id);
    }

    home() {
        new Controllers.HomeController(RootPresenter);
    }

    user(username) {
        new Controllers.UserController(RootPresenter, username);
    }

    changelog() {
        new Controllers.ChangelogController(RootPresenter);
    }

    record() {
        new Controllers.RecorderController(RootPresenter);
    }

    list_streams() {
        var controller = new Controllers.StreamController(RootPresenter);
        controller.create();
    }

    stream_details(id) {
        var controller = new Controllers.StreamController(RootPresenter);
        controller.details(id);
    }
}
