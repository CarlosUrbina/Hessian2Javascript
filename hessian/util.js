define(function() {
    /**
     * Small util for swapping endianness, since javascript is Little Endian
     *
     * @param Int32
     *            value to be swapped
     * @returns a Int32 value changed to Big Endian
     * @see <a href="http://stackoverflow.com/questions/5320439/how-do-i-swap-endian-ness-byte-order-of-a-variable-in-javascript"> Link to
     *      the original source of this function</a>
     */
    function swapInt32Endianness(val) {
	return ((val & 0xFF) << 24) | ((val & 0xFF00) << 8) | ((val >> 8) & 0xFF00) | ((val >> 24) & 0xFF);
    }

    /**
     * Allow us to concatenate Uint8Arrays to each other, also, strings and integers
     *
     * @param byteArray the uInt8Array to be modified
     * @param dataToAdd the byteArray, char or integer to add
     * @returns uInt8Array with new data added
     */
    function concatByteArray(byteArray, dataToAdd) {
	//Validate that data is supported. Only Byte array, number less than 255 and strings are allowed
	if (byteArray instanceof Uint8Array
		&& ((typeof dataToAdd === "number" && (dataToAdd >= 0 && dataToAdd <= 255)) || (typeof dataToAdd === "string") || (dataToAdd instanceof Uint8Array))) {
	    var trailArray;
	    if (dataToAdd instanceof Number) {
		trailArray = new Uint8Array(1);
		trailArray[0] = dataToAdd;
	    }
	    else if (typeof dataToAdd === "string") {
		trailArray = stringToBytes(dataToAdd);
	    }
	    else {
		trailArray = dataToAdd;
	    }

	    var resultArray = new Uint8Array(byteArray.length + trailArray.length);
	    resultArray.set(byteArray);
	    resultArray.set(trailArray, byteArray.length);
	    return resultArray;

	}
	else {
	    throw new Error("Non supported data type for concatenation");
	}

    }

    function stringToBytes(str) {
	var bytes = new Uint8Array(str.length);
	for (var i = 0; i < str.length; i++) {
	    bytes[i] = str.charCodeAt(i);
	}
	return bytes;
    }

    return {concatByteArray: concatByteArray,
	swapInt32Endianness: swapInt32Endianness
    };

});