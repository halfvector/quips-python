from flask import g, url_for
from flask.ext.restful import reqparse
from flask_restful import Resource
from mongoengine import Q

from app import tinyurl
from ..models import *


class QuipMapper:
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
            'publicUrl': url_for('user.one_recording', recordingId=tiny_id),
            'progress': progress,
            'position': position,
            'duration': duration,
        }


class QuipResource(Resource):
    def get(self, user_id):
        recordings = Recording.objects.get_or_404(Q(isPublic=True) & Q(user=user_id))
        return map(QuipMapper.to_web_dto, recordings)

    def put(self, quip_id):
        parser = reqparse.RequestParser()
        parser.add_argument('duration', type=int, location='json')
        parser.add_argument('position', type=int, location='json')
        parser.add_argument('progress', type=int, location='json')
        update = parser.parse_args()
        print "updating progress", update['progress']

        Listen.objects(Q(user=g.user['id']) & Q(recording=quip_id)).modify(
            upsert=True,
            set__progress=update['progress'],
            set__position=update['position'],
            set__duration=update['duration'],
        )

        return {}, 200


class QuipListResource(Resource):
    def get(self):
        entities = Recording.objects(Q(isPublic=True))[:50].order_by('-postedAt')
        return map(QuipMapper.to_web_dto, entities)

    def post(self):
        return {}
