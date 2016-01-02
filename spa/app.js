import Backbone from 'backbone'
import jQuery from 'jquery'
import { CurrentUserModel } from './models/CurrentUser'
import { AudioPlayerView } from './partials/AudioPlayerView'
import Router from './router'
import Polyfill from './polyfill.js'

$ = require('jquery');

export default class Application {
    constructor() {
        this.router = null;
    }

    initialize() {
        Polyfill.install();
        Backbone.$ = $;

        this.router = new Router();
        this.redirectUrlClicksToRouter();

        var audioPlayer = new AudioPlayerView({el: '#audio-player'});

        // load user
        new CurrentUserModel().fetch()
            .then(model => this.onUserAuthenticated(model), response => this.onUserAuthFail(response));
    }

    redirectUrlClicksToRouter() {
        // Use delegation to avoid initial DOM selection and allow all matching elements to bubble
        $(document).delegate("a", "click", function (evt) {
            // Get the anchor href and protcol
            var href = $(this).attr("href");
            var protocol = this.protocol + "//";

            var openLinkInTab = false;

            if(href == null) {
                // no url specified, don't do anything.
                return;
            }

            // special cases that we want to hit the server
            if(href == "/auth") {
                return;
            }

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
    }

    onUserAuthFail(response) {
        // user not authenticated
        if (response.status == 401) {
        }

        this.router.setUser(null);
        this.startRouterNavigation();
    }

    onUserAuthenticated(user) {
        console.log("Loaded current user", user);
        this.router.setUser(user);
        this.startRouterNavigation();
    }

    startRouterNavigation() {
        Backbone.history.start({pushState: true, hashChange: false});
        //if (!Backbone.history.start({pushState: true, hashChange: false})) router.navigate('404', {trigger: true});
    }
}

export let app = new Application();


$(() => {
    // setup raven to push messages to our sentry
    //Raven.config('https://db2a7d58107c4975ae7de736a6308a1e@app.getsentry.com/53456', {
    //    whitelistUrls: ['staging.couchpod.com', 'couchpod.com'] // production only
    //}).install()

    window.app = app;
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
