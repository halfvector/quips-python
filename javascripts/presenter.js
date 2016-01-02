class Presenter {
    showHeaderNav(view) {
        $("body > header").append(view.el);
    }

    switchView(newView) {
        if(this.view) {
            var oldView = this.view;
            oldView.$el.removeClass("transition-in");
            oldView.$el.addClass("transition-out");
            oldView.$el.one("animationend", () => {
                oldView.remove();
                oldView.unbind();
                if(oldView.shutdown != null) {
                    oldView.shutdown();
                }
            });
        }

        newView.$el.addClass("transitionable transition-in");
        newView.$el.one("animationend", () => {
            newView.$el.removeClass("transition-in");
        });

        $('#view-container').append(newView.el);
        this.view = newView;
    }
}

export let RootPresenter = new Presenter();
