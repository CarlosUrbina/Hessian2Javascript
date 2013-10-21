/**
 * Hessian Binary Web Service Protocol Encoder
 * 
 * After unsuccessfully attempt to adapt third party libraries, at the end, I wrote my own
 * 
 * @see <a href="http://hessian.caucho.com/doc/hessian-serialization.html"> The Hessian 2.0</a>
 * @date 2013/05/23, 14:39
 */

define(['hessian/util'], function(HessianUtil) {
    /**
     * Encodes the data passed to it's representation in the Hessian Protocol.
     * Currently, only int and list of int are supported
     *
     * @param Data to be encoded
     * @returns Byte array (Uint8Array) representing the data encoded
     */
    function encode(toEncode) {
	var result = null;

	var type = typeof toEncode;
	if (type == 'object') {
	    if ('list' in toEncode) {
		result = encodeList(toEncode);
	    }
	    else {
		throw new Error("Unsupported object");
	    }
	}
	else if (type == 'number') {
	    result = encodeNumber(toEncode);
	}
	else {
	    throw new Error("Unsupported type " + type);
	}
	return result;
    }

    /**
     * Encodes a number into a hessian byte array, as per the Hessian spec
     *
     * @param Number to be encoded
     * @returns String encoded bytes representing the number, in hessian format
     * @see <a href="http://hessian.caucho.com/doc/hessian-1.0-spec.xtp#int"> The Hessian Spec regarding integers </a>
     */
    function encodeNumber(number) {
	// As per the spec of Hessian 2
	// http://hessian.caucho.com/doc/hessian-serialization.html##int :
	// A 32-bit signed integer. An integer is represented by the octet x49 ('I')
	// followed by the 4 octets of the integer in big-endian order.
	if (number >= -2147483648 || number <= 2147483647) {

	    var hessianBuffer = new ArrayBuffer(5); // 1 byte for the control char I, 4 for the 32bit integer

	    var numberView = new Uint32Array(hessianBuffer, 0, 1);
	    // Javascript is Little Endian, so we need to invert the order
	    numberView[0] = HessianUtil.swapInt32Endianness(number);// Write the integer on the first 4 bytes of the array

	    var byteView = new Uint8Array(hessianBuffer);

	    // Write I on the first byte, shift data to the following 4 bytes
	    for (var i = byteView.length - 1; i >= 0; i--) {
		if (i > 0) {
		    byteView[i] = byteView[i - 1];
		}
		else {
		    byteView[i] = 73;// The I char
		}
	    }

	}
	else {
	    throw "Non supported number";
	}

	return byteView;
    }

    /**
     * Encodes an object to it's representation of hessian lists, as per the Hessian spec
     *
     * @param listObject
     *            with two properties expected<br/> list: an array of integers type:The data type of the elements in the array. Currently
     *            only 'int' is supported
     * @returns String encoded bytes representing the list, in hessian format
     * @see <a href="http://hessian.caucho.com/doc/hessian-1.0-spec.xtp#int"> The Hessian Spec regarding integers </a>
     */
    function encodeList(listObject) {
	var result = new Uint8Array();
	result = HessianUtil.concatByteArray(result, 'V');// Starting a list
	var list = listObject.list;
	result = HessianUtil.concatByteArray(result, encodeNumber(list.length));
	result[result.length - 5] = 'l'.charCodeAt(0);// Indicate the lenght of the list

	if ('type' in listObject) {
	    if (listObject.type = 'int') {// So far, only integers list are supported
		for (index in list) {
		    result = HessianUtil.concatByteArray(result, encodeNumber(list[index]));// Add each element on the list
		}
	    }
	    else {
		throw new Error('Not supported type. "int" expected');
	    }
	}
	else {
	    throw new Error('Type is not specified');
	}
	result = HessianUtil.concatByteArray(result, 'z');// End of list
	return result;
    }

    return {encode: encode
    };
});