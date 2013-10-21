Hessian2Javascript
==================

Support for encoding, decoding and calling Hessian 2.0 web services from browser, using just JavaScript.

I only implemented the data types I needed. But extending this component for supporting the missing ones shouldn't be difficult, just fullow the specs:

http://hessian.caucho.com/doc/hessian-serialization.html for plain seralization
http://hessian.caucho.com/doc/hessian-ws.html for the Web services envelopes and calls.

The hessian protocol is actually very compact and works good if you need to send data with a very small footprint. Unfortunately, documentation is not great, and it seems is no longer supported. If you are reading this, means you really need it, so, good luck.

The library works with require.js, so I hope you are familiar with AMD. Also, it uses some jquery methods, I think you can easily modify it to not use it, in case you cannot include it in your project.

--HOW TO USE
	this instructions are assuming you are using require.js and jquery

1.- copy the hessian.js and utf8.js files, and the Hessian folder to your base url path in your project
2. Add the proper path to your requirejs.config
	requirejs.config({
		baseUrl: 'scripts/lib',		
		paths: {
			hessian: './hessian',//This may change if you don't put it in your baseUrl folder
			...
			}
	});

3. Include "hessian" in the script you are goint to use it
	define(['hessian'], function(Hessian) {
	 ...
	}
	
4. Create a config object, having the URL of the web service, the method name, and an array of arguments.
	var params = {url : 'someUrl',
		method : 'someMethodName',
		arguments : [1,2,'someString',[1,2,3]],//Array of arguments. I have only tested with int. and [int] arguments.		
		}

5. Call your remote method. Hessian.js now works with jQuery deferred objects
	Hessian.callRemote(params).done(function(jsonResponse) {
		//Hessian2Javascript will parse the response into a JSON object. You can handle it from here.
	}.fail(){
		//Hessian2Javascript support jQuery deferred objects
	}
	
And that's it. 

--Know issues:

-If you get an error like this: "[SomeDataType] type is not implemented. value 0x[SomeHexNumber] address 0x[SomeHexNumber]", it means you hit a data type I actually did not implemented. I tried to add support for as many data types as I need for my project. That covers basically strings, numbers, objects and lists. If you need some other different data type, I'm afraid you are going to need to implement it. Is tedious, but is not hard. Please check the file HessianDecoder.js, and check how I am doing the decryption. Also, check http://hessian.caucho.com/doc/hessian-serialization.html for the spec of the data type you need. I tried to keep my code commented, so I hope you don't find too hard to do it.

-If your service responded with a java exception, Hessian2Javascript tries to parse it as nested object, and at some point, is going to fail. I think I am not managing the nested objects quite well, but I haven't had the time to fix it. You still will be able to see the exception, if you look for the request data in your browser's dev tools.

-I have only test this in the latest version of Chrome.

-It only supports POST request. Implementing GET request should be pretty straight forward, tough

-If at some point you find your POST requests are turning into OPTIONS requests, it means you are calling a different domain from the original one, and browsers doesn't like that (Is a security feature). Make sure your server can handle OPTIONS requests properly.







