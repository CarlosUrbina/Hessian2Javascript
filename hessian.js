/**
 * Hessian Binary Web Service Protocol Encoder
 * 
 * A full rewrite of the Hessian Encoder / Decoder protocol
 * 
 * @see <a href="http://hessian.caucho.com/doc/hessian-serialization.html"> The Hessian 2.0</a>
 * @date 2013/05/23, 14:39
 */

define(['hessian/hessianEncoder', 'hessian/hessianPost', 'hessian/hessianDecoder', 'hessian/util', 'jquery'], function(encoder, hessianPost, decoder,
	hessianUtil, $) {
    function configurationException(message) {
	throw new Error(message + " missing from configuration object");
    }

    /*
     * Calls a Hessian Remote Method at the specified URL and then decodes the binary response to a jSON format
     *
     * @param {object} The configuration object needed to make the call. Requires 4 parameters:<br/>
     * url - The address for the hessian endpoint<br/>
     * method - The method name on the hessian endpoint<br/>
     * tileParameters - the arguments to be passed in the method call. Currently, only integers and lists of integers are supported<br/>
     *
     * @returns A promise, on done, a javascript object representing the hessian object already decoded
     *
     */
    function callRemote(config) {
	var deferred = $.Deferred();
	var promise = deferred.promise();
	if (config) {
	    //Check the config object has all the required information
	    var url = config.url || configurationException("url");
	    var method = config.method || configurationException("method name");
	    var tileParameters = config.tileParameters || null;
	}
	else {
	    throw new Error("Configuration object is missing");
	}
	//Prepare the data to be send
	var sendData = new Uint8Array();
	sendData = hessianUtil.concatByteArray(sendData, 'c' + String.fromCharCode(0x02) + String.fromCharCode(0x00)); // call for Hessian 2.0
	sendData = hessianUtil.concatByteArray(sendData, 'm' +
		String.fromCharCode(method.length >>> 8) + //We need to put the length of the method name string in two bytes
		String.fromCharCode(method.length) +
		method); // method name
	//Add the encoded representation of each argument
	for (index in tileParameters) {
	    sendData = hessianUtil.concatByteArray(sendData, encoder.encode(tileParameters[index]));
	}
	sendData = hessianUtil.concatByteArray(sendData, 'z'); // end of argument marker
	//Call for hessian post
	var postConfig = {url: url,
	    timeout: 3000,
	    data: sendData
	};
	deferred.notify("downloading");
	var hessianPostPromise = hessianPost.post(postConfig).done(function(hessianResponse) {
	    deferred.notify("downloaded");
	    //Decode the hessian response to a javascript object
	    try {
		var decodedResponse = decoder.decode(hessianResponse);
	    }
	    catch (hessianError) {
		deferred.reject("Hessian decoder error: " + hessianError);
		throw hessianError;
	    }
	    decodedResponse.byteLength = hessianResponse.length;
	    hessianResponse = null; //We no longer need the hessian response. Mark for collection
	    //Send the javascript decoded object to the callback, on success
	    deferred.resolve(decodedResponse);
	}).fail(function(message) {
	    deferred.reject("Comunication error: " + message);
	});
	promise.abort = hessianPostPromise.abort;
	return promise;
    }

    //Public methods
    return {encode: encoder.encode,
	decode: decoder.decode,
	callRemote: callRemote
    };

});