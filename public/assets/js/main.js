'use strict';
//var app = app || {};

var App = {
    Models: {},
    Collections: {},
    Views: {}

//    init: function() {
//        new this.Views.TodosView({
//            collection: new this.Collections.TodosCollection()
//        });
//    }
};

App.Router = Backbone.Router.extend({
    routes: {
        ""          : "index",
        "/q/:id"    : "quip"
    },

    initialize: function() {
    },

    index: function(page) {
    },

    quip: function(page) {
    }
});

Backbone.View.Binders['csswidth'] = function(model, attr, prop) {
    return {
        get: function() {
            return this.css('width');
        },
        set: function(value) {
            console.log('setting prop: ' + value);
            this.css('width', value);
        }
    };
};

App.Models.Quip = Backbone.Model.extend({
    default: {
        title: '',
        position: 0,
        duration: 0,
        progress: 0
    },

    initialize: function() {
    },

    save: function(attributes) {
        console.dir(attributes);
        localStorage.setItem(this.id, JSON.stringify(this.toJSON()));
    },

    fetch: function() {
        this.set(JSON.parse(localStorage.getItem(this.id)));
    },

    id: 0, // guid
    progress: 0, // percentage
    position: 0, // msec
    duration: 0, // msec

    updateProgress: function() {
        this.set({
            progress: (duration > 0 ? position / duration : 0).toFixed(0) + "%"
        });
    }
});

App.Collections.Quips = Backbone.Collection.extend({
    model: App.Models.Quip
    //localStorage: new Backbone.LocalStorage("quips")
});

App.Quips = new App.Collections.Quips();
App.CurrentQuipAudio = null;

App.Views.Quip = Backbone.View.extend({

    el: '.m-quip',

    initialize: function(options) {
        //console.log("initializing quip");
        this.el = options.el;
        this.model.view = this;

        var quipId = $(this.el).data("quipId");
        this.model.set({'id' : quipId});
        //this.model.sync();

        var value = localStorage.getItem("quip:" + quipId + ":progress");
        if(value != null) {
            this.model.set({'progress':value});
        }

        value = localStorage.getItem("quip:" + quipId + ":position");
        if(value != null)
            this.model.set({'position':value});
    },

    events: {
        "click .text" : "toggle"
    },

    bindings: {
        "csswidth .progress-bar" : "progress"
    },

    toggle: function(event) {
        var quipId = $(this.el).data("quipId");
        var url = '/recordings/' + quipId + '.ogg';
        console.log("toggling recording: " + url);

        //$("#main-player")[0].play();
        //return;

        /*
        if(App.CurrentQuipAudio && App.CurrentQuipAudio.id == quipId){
            if(!App.CurrentQuipAudio.paused && App.CurrentQuipAudio.playState) {
                console.log("pausing");
                App.CurrentQuipAudio.pause();
            } else {
                console.log("resuming");
                App.CurrentQuipAudio.play();
            }

            return;
        }
        */

        var that = this;

        var resumePosition = that.model.get('position');
        if(typeof resumePosition == "undefined")
            resumePosition = 0;
        console.log('resumePosition = ' + resumePosition);

        // check if sound is already buffered
        var existingQuip = soundManager.getSoundById(quipId);
        if( existingQuip ) {
            
            console.log('existingQuip.paused = ' + existingQuip.paused);
            console.log('existingQuip.playState = ' + existingQuip.playState);
            console.log('existingQuip.position = ' + existingQuip.position);
            console.log('existingQuip.duration = ' + existingQuip.duration);
            console.log('existingQuip.isHTML5 = ' + existingQuip.isHTML5);
            console.log('existingQuip.readyState = ' + existingQuip.readyState);
            
            // resume existing audio clip
            if(!existingQuip.paused && existingQuip.playState) {
                //existingQuip.pause();
                soundManager.pauseAll();
                console.log("pausing existing clip");
            } else {
                soundManager.pauseAll();

                if(!existingQuip.playState) {
                    existingQuip.setPosition(0);
                }

                existingQuip.play();
                console.log("resuming existing clip");
            }
        }

        console.log('existingQuip = ' + existingQuip);

        if(existingQuip)
            return;

        soundManager.pauseAll();


        App.CurrentQuipAudio = soundManager.createSound({
            id: quipId,
            url: url,
            volume: 100,
            autoLoad: true,
            autoPlay: false,
            from: resumePosition,
            onload: function() {
                console.log("loaded: " + url);
                console.log('playing at position = ' + resumePosition);
                this.setPosition(resumePosition);
                this.play();
            },
            onfinish: function() {
                console.log("finished: " + this.id);
            },
            whileloading: function() {
                console.log("loaded: " + this.bytesLoaded + " of " + this.bytesTotal);
            },
            whileplaying: function() {
                console.log("playing: " + this.position + " of " + this.duration);
                var progress = this.duration > 0 ? 100 * this.position / this.duration : 0;
                progress = progress.toFixed(0) + "%";
                that.model.set({'progress' : progress});
                localStorage.setItem("quip:" + this.id + ":progress", progress);
                localStorage.setItem("quip:" + this.id + ":position", this.position.toFixed(0));
            }
        });
    },

    render: function() {
        //$(this.el).html(this.template());
        return this.bindModel();
    }

});

(function($) {

    App.Views.Main = Backbone.View.extend({
        el: '.m-quips',

        initialize: function() {
            console.log('initializing main view');

            console.log('spawning audio player..');

            soundManager.setup({
                debugMode: true,
                url: '/assets/swf/',
                preferFlash: false,
                onready: function() {
                    console.log("soundManager ready");
                }
            });

            $('.m-quip').each(function(idx, elem){
                var view = new App.Views.Quip({
                    el: elem,
                    model: new App.Models.Quip({progress: 0})
                });

                App.Quips.add(view.model);

                view.render();
            });

            // listen to collection
            this.listenTo(App.Quips, 'add', this.quipAdded);
        },

        quipAdded: function(quip) {
            console.log("quip added!");
        }
    });

    setTimeout(function() {
        new App.Views.Main();
    }, 1000);

})(jQuery);

//ContactManager.Collections.Contacts = Backbone.Collection.extend({
//    model: ContactManager.Models.Contact
//});


(function($, window, document, undefined) {
    'use strict';

    if(!$.fn.lexy)
        $.fn.lexy = {};

    function Dropdown(target, options) {
        var element = $(target);
        var overlay = null;

        this.init = function() {
            var that = this;

            element.on('click.lexy.dropdown', function(e) {
                e.stopPropagation();
                that.toggle();
            });

            //this.toggle();
        }

        this.toggle = function() {
            if(element.data("dropdown-state") === "open")
            {
                this.hideMenu();
            } else
            {
                this.showMenu();
            }
        }

        this.hideMenu = function() {
            element.data("dropdown-state", "closed");
            element.find(".dropdown-content").fadeOut(150);
            overlay.fadeOut(150);
        }

        this.showMenu = function() {
            element.data("dropdown-state", "open");
            element.find(".dropdown-content").fadeIn(100);

            if(!overlay) {
                // create the overlay for the first time
                overlay = $('<div class="capture-overlay"></div>');
                element.append(overlay);
            }

            overlay.fadeIn(100);
        }

        this.init();
    }

    $.fn.dropdown = function(options) {
        options = $.extend({}, $.fn.dropdown.options, options);

        return this.each(function() {
            // only instantiate once
            if(!$.data(this, "plugin_lexy_dropdown"))
                $.data(this, "plugin_lexy_dropdown", new Dropdown(this, options));
        });
    };

    $.fn.dropdown.options = {
        className: "m-dropdown",
        dropdownElement: "dropdown-content"
    };

    /*
     // hook to close dropdowns on an outside click event
     $(document).on('click.lexy.dropdown', ".dropdown-trigger", function(e) {
     $(e.currentTarget).lexy.dropdown();
     });
     */

    $(".m-dropdown").dropdown();

}(jQuery));