from mitmproxy import ctx
import tornado.ioloop

def running():
    ctx.master.shutdown()
