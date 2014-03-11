var App = {
    Models: {},
    Collections: {},
    Views: {},
    Converters: {},
    Instances: {}
};



(function(){
    'use strict';
    //var app = app || {};


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

    Backbone.View.Binders.csswidth = function(model, attr, prop) {
        return {
            get: function() {
                return this.css('width');
            },
            set: function(value) {
                //console.log('setting prop: ' + value);
                this.css('width', value);
            }
        };
    };

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



    $(function(){
        new App.Views.Main();
    });


})();
