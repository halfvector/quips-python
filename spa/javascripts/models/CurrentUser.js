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
        this.url = "/api/current_user";
    }
}

export { CurrentUserModel }
