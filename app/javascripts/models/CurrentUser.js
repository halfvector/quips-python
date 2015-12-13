import Backbone from 'backbone'

class CurrentUserModel extends Backbone.Model {
    defaults() {
        return {
            username: "",
            profileImage: "",
            createdAt: "",
            id: ""
        }
    }

    constructor(props) {
        super(props);
        this.url = "/current_user";
    }
}

export { CurrentUserModel }
