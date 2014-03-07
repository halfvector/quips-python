import tornado.options
from tornado.wsgi import WSGIContainer
from tornado.httpserver import HTTPServer
from tornado.ioloop import IOLoop
from app import app

#tr = tornado.wsgi.WSGIContainer(app)
#application = tornado.web.Application([
#    (r"/", 
#])

tornado.options.parse_command_line()

# standalone, boot our server
if __name__ == "__main__":

    ws = HTTPServer(WSGIContainer(app))
    ws.listen(5000)
    IOLoop.instance().start()
