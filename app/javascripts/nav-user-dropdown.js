/**
 * Primary Nav User Dropdown Widget
 */

App.Loaders.DropdownWidget = (function(){
    'use strict';

    App.Views.DropdownWidget = Backbone.View.extend({
        el: '.m-dropdown',
        overlay: null,

        events: {
            "click" : "toggle"
        },

        initialize: function() {
            this.el = $(this.el);
        },

        toggle: function() {
            if($(this.el).data("dropdown-state") === "open") {
                Log.log("close");
                $(this.el).data("dropdown-state", "closed");
                $(this.el).removeClass("opened");
                this.overlay.removeClass("opened");

            } else {
                Log.log("open");
                $(this.el).data("dropdown-state", "open");
                $(this.el).addClass("opened");

                if(!this.overlay) {
                    // create the overlay for the first time
                    this.overlay = $('<div class="capture-overlay"></div>');
                    $(this.el).append(this.overlay);
                }

                this.overlay.addClass("opened");
            }
        },

        render: function() {
            //$(this.el).html(this.template());
            return this.bindModel();
        }
    });

    var widget = new App.Views.DropdownWidget();
    widget.render();

});

App.Loaders.DropdownWidgetJquery = (function($, window, document, undefined) {
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
        };

        this.toggle = function() {
            if(element.data("dropdown-state") === "open")
            {
                this.hideMenu();
            } else
            {
                this.showMenu();
            }
        };

        this.hideMenu = function() {
            element.data("dropdown-state", "closed");
            element.find(".dropdown-content").fadeOut(150);
            overlay.fadeOut(150);
        };

        this.showMenu = function() {
            element.data("dropdown-state", "open");
            element.find(".dropdown-content").fadeIn(100);

            if(!overlay) {
                // create the overlay for the first time
                overlay = $('<div class="capture-overlay"></div>');
                element.append(overlay);
            }

            overlay.fadeIn(100);
        };

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

});