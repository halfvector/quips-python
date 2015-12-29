class UserMapper:
    def __init__(self):
        pass

    @staticmethod
    def to_web_dto(entity):
        return {
            'createdAt': entity.createdAt.isoformat(),
            'id': entity.id,
            'oauthToken': entity.oauthToken,
            'profileImage': entity.profileImage,
            'username': entity.username
        }
