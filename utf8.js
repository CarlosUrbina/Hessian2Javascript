define(function() {
    var utf8 = {};

    utf8.toByteArray = function(str) {
	var byteArray = [];
	for (var i = 0; i < str.length; i++)
	    if (str.charCodeAt(i) <= 0x7F)
		byteArray.push(str.charCodeAt(i));
	    else {
		var h = encodeURIComponent(str.charAt(i)).substr(1).split('%');
		for (var j = 0; j < h.length; j++)
		    byteArray.push(parseInt(h[j], 16));
	    }
	return byteArray;
    };

    utf8.parse = function(byteArray) {
	var str = '';
	for (var i = 0; i < byteArray.length; i++)
	    str += byteArray[i] <= 0x7F ?
		    byteArray[i] === 0x25 ? "%25" : // %
		    String.fromCharCode(byteArray[i]) :
		    "%" + byteArray[i].toString(16).toUpperCase();
	var parsedString;
	try {
	    parsedString = decodeURIComponent(str);
	}
	catch (error) {
	    console.warn("Error parsing string ", str, byteArray);
	    parsedString = " ";
	}

	return parsedString;
    };

    return utf8;
});