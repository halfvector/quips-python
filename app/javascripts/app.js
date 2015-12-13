import Backbone from 'backbone'
import jQuery from 'jquery'
import { ListenState, ListenStateCollection } from './models/ListenState'
import { CurrentUserModel } from './models/CurrentUser'
import Router from './router'

$ = require('jquery');

class Application {
    constructor() {
        var router = new Router();

        Backbone.$ = $;
        Backbone.history.start({pushState: true, hashChange: false});
        //if (!Backbone.history.start({pushState: true, hashChange: false})) router.navigate('404', {trigger: true});

        // load user
        var model = new CurrentUserModel();
        model.fetch().then(() => this.onModelLoaded(model));

        //new ListenStateCollection().fetch().then((state) => console.log("got listen states", state));
    }

    onModelLoaded(user) {
        console.log("Loaded current user", user.attributes);
        this.currentUser = user;
    }
}

$(() => {
    // setup raven to push messages to our sentry
    //Raven.config('https://d098712cb7064cf08b74d01b6f3be3da@app.getsentry.com/20973', {
    //    whitelistUrls: ['staging.couchpod.com', 'couchpod.com'] // production only
    //}).install();

    Raven.config('https://db2a7d58107c4975ae7de736a6308a1e@app.getsentry.com/53456', {
        whitelistUrls: ['staging.couchpod.com', 'couchpod.com'] // production only
    }).install()

    var app = new Application();

    // for production, could wrap domReadyCallback and let raven handle any exceptions

    /*
     try {
     domReadyCallback();
     } catch(err) {
     Raven.captureException(err);
     console.log("[Error] Unhandled Exception was caught and sent via Raven:");
     console.dir(err);
     }
     */
})

export default {Application}
