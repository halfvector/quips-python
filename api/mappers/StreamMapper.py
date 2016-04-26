def to_web_dto(entity):
    return {
        'id': entity.id,
        'createdAt': entity.createdAt.isoformat(),
        'isPublic': entity.isPublic,
        'name': entity.name,
        'description': entity.description
    }
