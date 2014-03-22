App.Loaders.RecordingsList = (function(){
    'use strict';

    // load our Quip MVC
    App.Loaders.QuipController();

    App.Views.RecordingsList = Backbone.View.extend({
        el: '.m-quips',

        initialize: function() {

            console.log("RecordingsList initialized");

            soundManager.setup({
                debugMode: true,
                url: '/assets/swf/',
                preferFlash: false,
                onready: function() {
                    console.log("soundManager ready");
                }
            });

            $('.m-quip').each(function spawnQuipController(elem){

                var view = new App.Views.Quip({
                    el: elem,
                    model: new App.Models.Quip({progress: 0})
                });

                App.Quips.add(view.model);
                view.render();
            });

            // process all timestamps
            var vagueTime = require('vague-time');
            var now = new Date();

            $("time[datetime]").each(function generateVagueDate(ele){
                ele.textContent = vagueTime.get({from:now, to:new Date(ele.getAttribute('datetime'))});
            });

            this.listenTo(App.Quips, 'add', this.quipAdded);
        },

        quipAdded: function(quip) {

        }
    });

    var view = new App.Views.RecordingsList();
    view.render();

});
