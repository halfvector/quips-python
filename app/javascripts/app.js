import Backbone from 'backbone'
import jQuery from 'jquery'
import { ListenState, ListenStateCollection } from './models/ListenState'
import { CurrentUserModel } from './models/CurrentUser'
import { AudioPlayerView } from './audio-player'
import Router from './router'

$ = require('jquery');

class Application {
    constructor() {

    }

    initialize() {
        var router = new Router();

        Backbone.$ = $;
        Backbone.history.start({pushState: true, hashChange: false});
        //if (!Backbone.history.start({pushState: true, hashChange: false})) router.navigate('404', {trigger: true});

        // Use delegation to avoid initial DOM selection and allow all matching elements to bubble
        $(document).delegate("a", "click", function (evt) {
            // Get the anchor href and protcol
            var href = $(this).attr("href");
            var protocol = this.protocol + "//";

            var openLinkInTab = false;

            // Ensure the protocol is not part of URL, meaning its relative.
            // Stop the event bubbling to ensure the link will not cause a page refresh.
            if (!openLinkInTab && href.slice(protocol.length) !== protocol) {
                evt.preventDefault();

                // Note by using Backbone.history.navigate, router events will not be
                // triggered.  If this is a problem, change this to navigate on your
                // router.
                Backbone.history.navigate(href, true);
            }
        });

        var audioPlayer = new AudioPlayerView({el: '#audio-player'});

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

export let app = new Application();


$(() => {
    // setup raven to push messages to our sentry
    //Raven.config('https://db2a7d58107c4975ae7de736a6308a1e@app.getsentry.com/53456', {
    //    whitelistUrls: ['staging.couchpod.com', 'couchpod.com'] // production only
    //}).install()

    app.initialize();

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
