import Backbone from 'backbone'

class UserModel extends Backbone.Model {
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
        this.urlRoot = "/api/users";
        //this.idAttribute = "username";
    }
}

class UserCollection extends Backbone.Collection {
    constructor(opts) {
        super(opts);
        this.model = UserModel;
        this.url = "/api/users";
    }
}

export { UserModel, UserCollection }
