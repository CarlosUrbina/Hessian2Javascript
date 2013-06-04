/**
 * Hessian Binary Web Service Protocol Encoder
 * 
 * A full rewrite of the Hessian Encoder / Decoder protocol
 * 
 * @see <a href="http://hessian.caucho.com/doc/hessian-serialization.html"> The Hessian 2.0</a>
 * @date 2013/05/23, 14:39
 */

define(['hessian/hessianEncoder', 'hessian/hessianPost', 'hessian/hessianDecoder', 'hessian/util'], function(encoder, hessianPost, decoder,
		hessianUtil) {
	function configurationException(message) {
		throw new Error(message + " missing from configuration object");
	}

	/*
	 * Calls a Hessian Remote Method at the specified URL
	 *  
	 * @param {object} The configuration object needed to make the call. Requires 4 parameters:<br/>
	 * url - The address for the hessian endpoint<br/>
	 * method - The method name on the hessian endpoint<br/>
	 * arguments - the arguments to be passed in the method call. Currently, only integers and lists of integers are supported<br/>
	 * callback - Function to be executed on successfull call<br/>
	 * (optional) always - Function to be executed regardless of the response status
	 * (optional) fail - Error handler
	 * 
	 * @returns A javascript object representing the hessian object already decoded
	 *  
	 */
	function callRemote(config) {
		if (config) {
			//Check the config object has all the required information
			var url = config.url || configurationException("url");
			var method = config.method || configurationException("method name");
			var arguments = config.arguments || null;
			var done = config.done || configurationException("callback function");
			var fail = config.fail || null;
			var always = config.always || null;
		}
		else {
			throw new Error("Configuration object is missing");
		}

		//Prepare the data to be send
		var sendData = new Uint8Array();
		sendData = hessianUtil.concatByteArray(sendData, 'c' + String.fromCharCode(0x02) + String.fromCharCode(0x00)); // call for Hessian 2.0
		sendData = hessianUtil.concatByteArray(sendData, 'm' + String.fromCharCode(0x00) + String.fromCharCode(0x0a) + method); // method name
		//Add the encoded representation of each argument
		for (index in arguments) {
			sendData = hessianUtil.concatByteArray(sendData, encoder.encode(arguments[index]));
		}
		sendData = hessianUtil.concatByteArray(sendData, 'z'); // end of argument marker

		//Call for hessian post
		hessianPost.post({url : url,
		timeout : 3000,
		data : sendData,
		done : function(hessianResponse) {
			//Decode the hessian response to a javascript object
			var decodedResponse = decoder.decode(hessianResponse);
			//Send the javascript decoded object to the callback, on success
			done(decodedResponse);
		},
		fail : fail,//Just passing fail and always to HessianPost if exist. He will handle them
		always : always
		});
	}

	//Public methods
	return {encode : encoder.encode,
	decode : decoder.decode,
	callRemote : callRemote
	};

});