from flask import g, url_for
from mongoengine import Q

from app import tinyurl
from ..models import Listen


class QuipMapper:
    def __init__(self):
        pass

    @staticmethod
    def to_web_dto(entity):
        tiny_id = tinyurl.encode(str(entity.id))

        try:
            listen = Listen.objects.get(Q(user=g.user['id']) & Q(recording=entity.id))
            progress, position, duration = listen.progress, listen.position, listen.duration
        except Listen.DoesNotExist:
            progress, position, duration = 0, 0, 0

        return {
            'timestamp': entity.postedAt.isoformat(),
            'isMine': entity.user.id == g.user['id'],
            'username': entity.user.username,
            'profileImage': entity.user.profileImage,
            'isPublic': entity.isPublic,
            'description': entity.description or "(no description)",
            'id': entity.id,
            'url': '/recordings/' + str(entity.id) + '.ogg',
            'tinyId': tiny_id,
            'publicUrl': url_for('spa_web.single_recording', recording_id=tiny_id),
            'progress': progress,
            'position': position,
            'duration': duration,
        }
