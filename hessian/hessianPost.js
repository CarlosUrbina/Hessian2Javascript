/**
 * A small function around XMLHttpRequest to allow us to call hessian web services and get the response in arrayBuffer type
 * 
 * @see <a href="http://hessian.caucho.com/doc/hessian-serialization.html"> The Hessian 2.0</a>
 * @date 2013/05/23, 14:39
 */

define(['jquery','app/Utilities'], function($,Util) {
    function configurationException(message) {
	throw new Error(message + " missing from configuration object");
    }

    /*
     * Create a XMLHttpRequest with responseType = ArrayBuffer.
     * @returns A promise object. On success, returns the binary response
     */
    function post(config) {
	var request = new XMLHttpRequest();

	var deferred = $.Deferred();
	var promise = deferred.promise();
	//We need to extend the functionality of the promise by returning an abort method
	promise.abort = function() {
	    console.warn("Request aborted");
	    request.abort();
	};

	if (config) {
	    var url = config.url || configurationException("url");
	    var timeout = config.timeout || 10000;
	    var data;
	    if (config.data) {
		data = config.data;
	    }
	    else {
		data = null;
		console.warn('No data is specified in hessianPost');
	    }

	    /*
	     * Please note that, because we are specifying the response type as ArrayBuffer, any unsuccessful response cannot be parsed
	     * The progress event always return with status 0, statusText = "" and responseText: [Exception: DOMException], so, there's not
	     * so much useful information to be showed here. The same thing applies to progress monitoring. Therefore, I did not include
	     * any onprogress or onreadystatechange events. There's no really to helpful information there
	     */


	    request.open("POST", url, true);
	    request.timeout = timeout;
	    request.responseType = "arraybuffer"; //This way, we don't have to convert anything in the response

	    //Here, we catch the response. This is a callback, not the actual send method
	    request.onload = function(progressObj) {
		if (progressObj.currentTarget.status === 200) {
		    var arrayBuffer = request.response; // Note: not oReq.responseText
		    if (arrayBuffer) {
			var byteArray = new Uint8Array(arrayBuffer);
			//This line sets an artificial delay, just for debugging purposes
			//setTimeout(function(){deferred.resolve(byteArray)}, 3*1000);			
			deferred.resolve(byteArray);
		    }
		}
		else {
		    //If return code is not succesful
		    deferred.reject(url + " | Code> " + progressObj.currentTarget.status + " " + progressObj.currentTarget.statusText);
		}
	    };
	    //Handlers for all the posible errors
	    request.ontimeout = function(progressEvent) {
		deferred.reject("Timeout");
	    };
	    request.onerror = function() {
		deferred.reject("Error");
	    };
	    request.onabort = function() {
		deferred.reject("Abort");
	    };
	    //Here we actually send the request
	    request.send(data);
	}
	else {
	    deferred.reject("Configuration object is missing");
	}
	//Note how is important to return the promise.
	return promise;
    }

    return {post: post
    };
});