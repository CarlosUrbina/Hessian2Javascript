/**
 * A small function around XMLHttpRequest to allow us to call hessian web services and get the response in arrayBuffer type
 * 
 * @see <a href="http://hessian.caucho.com/doc/hessian-serialization.html"> The Hessian 2.0</a>
 * @date 2013/05/23, 14:39
 */

define(function() {
	function configurationException(message) {
		throw new Error(message + " missing from configuration object");
	}

	/*
	 * Create a XMLHttpRequest with responseType = ArrayBuffer.
	 * @returns On success, returns the binary response, along with the progress object and the request itself, for tracking purposes
	 */
	function post(config) {
		var request = new XMLHttpRequest();

		if (config) {
			var url = config.url || configurationException("url");
			var done = config.done || configurationException("callback function");
			var timeout = config.timeout || 10000;
			var data;
			if (config.data) {
				data = config.data;
			}
			else {
				data = null;
				console.warn('No data is specified in hessianPost');
			}

			var fail = config.fail || function(progressEvent) {
				/*
				 * Please note that, because we are specifying the response type as ArrayBuffer, any unsuccessful response cannot be parsed
				 * The progress event always return with status 0, statusText = "" and responseText: [Exception: DOMException], so, there's not
				 * so much useful information to be showed here. The same thing applies to progress monitoring. Therefore, I did not include
				 * any onprogress or onreadystatechange events. There's no really to helpful information there
				 */
				throw new Error("Hessian Request failed");
			};

			request.open("POST", url, true);
			request.timeout = timeout;
			request.responseType = "arraybuffer"; //This way, we don't have to convert anything in the response
			request.setRequestHeader("Content-Type", "x-application/hessian;"); //Hessian web services in java often throw an error if the Content type is not the appropiate. So we overwrite it 

			//Here, we catch the response
			request.onload = function(progressObj) {
				if (progressObj.currentTarget.status === 200) {
					var arrayBuffer = request.response; // Note: not oReq.responseText
					if (arrayBuffer) {
						var byteArray = new Uint8Array(arrayBuffer);
						done(byteArray, progressObj, request);//Execute callback, with different info about the request
					}
				}
			};
			request.ontimeout = function(progressEvent) {
				throw new Error("Hessian Request timed out");
			};
			request.onerror = fail;

			request.send(data);
		}
		else {
			throw new Error("Configuration object is missing");
		}
	}

	return {post : post
	};
});