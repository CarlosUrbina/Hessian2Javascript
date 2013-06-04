Hessian2Javascript
==================

Support for encoding, decoding and calling Hessian 2.0 web services from browser, using just JavaScript.

I only implemented the data types I needed. But extending this component for supporting the missing ones shouldn't be difficult, just fullow the specs:

http://hessian.caucho.com/doc/hessian-serialization.html for plain seralization
http://hessian.caucho.com/doc/hessian-ws.html for the Web services envelopes and calls.

I know, it's not the greatest documented protocol around. Good luck with that.

This component is AMD ready. For use it, just need to call it with the right configuration object, and provide the appropiated callback:

Hessian.callRemote({url : url,
		method : 'remoteMethodToBeCalled',
		arguments : [list of arguments. Right now, only integer and list of int are supported],
		done : callback(response,status,request) {...}
		});
