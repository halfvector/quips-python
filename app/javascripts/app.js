import Backbone from 'backbone'
import RecordingsList from './homepage'
import { RecorderView, Recorder } from './recording-control'

class Application {
    constructor() {
        Backbone.$ = $;
        Backbone.history.start();

        var view = new RecordingsList();
        view.render();

        var recorder = new RecorderView({
            el: $('.m-recording-container'),
            model: new Recorder({recordingTime: -3})
        });

        //// locate any controllers on the page and load their requirements
        //// this is a part of Angular i really liked, the custom directives
        //$('[backbone-controller]').each(function(el) {
        //
        //    var controllerName = $(el).attr('backbone-controller');
        //    if(controllerName in App.Loaders)
        //        App.Loaders[controllerName]();
        //    else
        //        console.error("Controller: '" + controllerName + "' not found");
        //});
    }
}

$(() => {
    // setup raven to push messages to our sentry
    Raven.config('https://d098712cb7064cf08b74d01b6f3be3da@app.getsentry.com/20973', {
        whitelistUrls: ['staging.couchpod.com', 'couchpod.com'] // production only
    }).install();

    new Application();

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

export default { Application }
