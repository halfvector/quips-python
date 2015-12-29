# borrowed from https://gist.github.com/akhenakh/2954605

import datetime
import json

import arrow as arrow
from bson import DBRef
from bson.objectid import ObjectId
from flask import Response
from flask.ext.mongoengine import BaseQuerySet
from flask.ext.mongoengine.json import MongoEngineJSONEncoder
from flask.json import JSONEncoder
from mongoengine.base import BaseDocument


class MongoJsonEncoder(MongoEngineJSONEncoder):
    def default(self, obj):

        if isinstance(obj, BaseDocument):
            return obj._data
        elif isinstance(obj, (datetime.datetime, datetime.date)):
            return arrow.get(obj).isoformat()
        elif isinstance(obj, DBRef):
            return str(obj)
        elif isinstance(obj, ObjectId):
            return unicode(obj)
        elif isinstance(obj, BaseQuerySet):
            return list(obj)
            # return json_util._json_convert(obj.as_pymongo())
            # return [MongoJsonEncoder().default(item) for item in obj]

        return JSONEncoder.default(self, obj)


# jsonify with support for MongoDB ObjectId
def mongo_doc_to_json_response(obj, status):
    # return Response(obj.to_json(), status=status, mimetype="application/json")
    return Response(json.dumps(obj, cls=MongoJsonEncoder), status=status, mimetype="application/json")
