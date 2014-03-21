'use strict';

// our globals
var App = {
    Models: {},
    Collections: {},
    Views: {},
    Converters: {},
    Instances: {},
    Loaders: {}
};

var Log = {
    log: function log(msg) {
        console.log.apply(console, arguments);
    },

    debug: function debug(msg) {
        console.debug.apply(console, arguments);
    },

    info: function info(msg) {
        console.info.apply(console, arguments);
    },

    warn: function warn(msg) {
        console.warn.apply(console, arguments);
    },

    error: function error(msg) {
        console.error.apply(console, arguments);
    }
};

var Backbone = null;

function domReadyCallback(){

    // start backbone
    Backbone = require('backbone');
    Backbone.$ = $;

    // start all of our controllers
    $('[backbone-controller]').each(function(el) {

        var controllerName = $(el).attr('backbone-controller');

        if(controllerName in App.Loaders)
            App.Loaders[controllerName]();
        else
            console.log("Controller: " + controllerName + " not found");

    });
}

$.domReady(function(){

    //domReadyCallback();
    //return;

    // setup raven to push messages to our sentry
    Raven.config('https://d098712cb7064cf08b74d01b6f3be3da@app.getsentry.com/20973', {
        whitelistUrls: ['www.bugvote.com'] // set for production
    }).install();

    domReadyCallback();

    /*
    try {
        domReadyCallback();
    } catch(err) {
        Raven.captureException(err);
        console.log("[Error] Unhandled Exception was caught and sent via Raven:");
        console.dir(err);
    }
    */
});
