/**
 * Hessian Binary Web Service Protocol Encoder
 * 
 * After unsuccessfully attempt to adapt third party librariers, at the end, I wrote my own
 * 
 * @see <a href="http://hessian.caucho.com/doc/hessian-serialization.html"> The Hessian 2.0</a>
 * @date 2013/05/23, 16:56
 */

define(['hessian/util'], function(HessianUtil) {

	/*
	 * Function for deserialize Hessian messages.
	 * So far, I only added support for those types I needed, but every time the parser founds an unsupported type, will let you know.
	 * Implementing new types is not that hard if you follow the spec (most of the times).
	 * 
	 * From the spec: "A Hessian reader is essentially a switch statement on the initial octet"
	 * http://hessian.caucho.com/doc/hessian-serialization.html
	 * So, here it is
	 * 
	 * @param {workingBuffer} the buffer to be decoded
	 * @param {offset} The offset from wich we want to start to decode 
	 * 
	 * @returns A javascript object representing the hessian object serialized. The return object always must provide the following four values: <br/>
	 * -length: The total lenght, in bytes, the current parsed data is taking in the array. This is required for the offset calculation
	 * -value: The object decoded. Could be a primitive type, an array or an object.
	 * -type: A string specifying the type of the data returned. Might be useful for collections, or for different numebr types, for instance
	 * -encodedAs: Tell us wich case of the hessian spec was used to decode this particular object. It is useful for debugging purposes, but
	 * 		since it takes a lot of space, I may consider to delete this field
	 */
	function hessianDeserialize(workingBuffer, offset) {
		var currentOffset = offset || 0;
		switch (true) {
			case (0x00 <= workingBuffer[currentOffset] && workingBuffer[currentOffset] <= 0x1f) :
				/*
				 * # utf-8 string length 0-32
				 * working with less than 32 bytes. The total length is specified by the first byte 
				 */
				var stringLength = workingBuffer[currentOffset];
				var stringBuffer = new Uint32Array(workingBuffer.subarray(currentOffset + 1, currentOffset + stringLength + 1));
				var deserializedString = String.fromCharCode.apply(null, stringBuffer);
				stringBuffer = null;
				workingBuffer = null;
				return {length : stringLength + 1,
				value : deserializedString,
				type : 'string',
				encodedAs : 'utf-8 string length 0-32'
				};
			break;
			case (0x20 <= workingBuffer[currentOffset] && workingBuffer[currentOffset] <= 0x2f) :
				/*
				 * # binary data length 0-16
				 * working with less than 32 bytes. The total length is specified by the first byte 
				 */
				var currentLenght = workingBuffer[currentOffset] - 0x20;
				currentOffset++;
				var bytes = new Uint8Array(workingBuffer.subarray(currentOffset, currentOffset + currentLenght));
				workingBuffer = null;
				return {length : currentLenght + 1,
				value : bytes,
				type : 'binary',
				encodedAs : 'binary data length 0-16'
				};
			break;
			case (0x30 <= workingBuffer[currentOffset] && workingBuffer[currentOffset] <= 0x33) :
				/*
				 * # utf-8 string length 0-1023
				 * working with less than 32 bytes. The total length is specified by the first byte 
				 */
				var stringLength = workingBuffer[currentOffset + 1];//The lenght is on the first byte
				//Read all the bytes from the current offset (plus two bytes)
				var stringBuffer = new Uint32Array(workingBuffer.subarray(currentOffset + 2, currentOffset + stringLength + 2));
				var deserializedString = String.fromCharCode.apply(null, stringBuffer);

				stringBuffer = null;
				workingBuffer = null;
				return {length : stringLength + 2,
				value : deserializedString,
				type : 'string',
				encodedAs : 'utf-8 string length 0-1023'
				};
			break;
			case (0x34 <= workingBuffer[currentOffset] && workingBuffer[currentOffset] <= 0x37) :
				/*
				 * # utf-8 string length 0-1023
				 * I didn't find this type in the spec, but in other sources 
				 */
				//The length of this chunk is in the first two bytes
				var currentLength = (workingBuffer[currentOffset] - 0x34) * 256 + workingBuffer[currentOffset + 1];
				currentOffset += 2;
				var bytesArray = new Uint8Array(workingBuffer.subarray(currentOffset, currentOffset + currentLength));
				return {length : (currentLength + 2),
				value : bytesArray,
				type : 'binary',
				encodedAs : 'binary data length 0-1023'
				};
			break;
			case (0x38 <= workingBuffer[currentOffset] && workingBuffer[currentOffset] <= 0x3f) :
				throw new Error("three-octet compact long (-0x40000 to 0x3ffff) data type is not implemented. value 0x"
						+ workingBuffer[currentOffset].toString(16) + " address 0x" + currentOffset.toString(16));
			break;
			case (workingBuffer[currentOffset] === 0x40) :
				throw new Error("reserved (expansion/escape) data type is not implemented. value 0x"
						+ workingBuffer[currentOffset].toString(16) + " address 0x" + currentOffset.toString(16));
			break;
			case (workingBuffer[currentOffset] === 0x41) :
				/*
				 * 8-bit binary data non-final chunk ('A')  
				 */
				currentOffset++;
				var chunkLength = 256 * workingBuffer[currentOffset] + workingBuffer[currentOffset + 1];
				currentOffset += 2;
				var thisChunk = new Uint8Array(workingBuffer.subarray(currentOffset, currentOffset + chunkLength));
				//Since this is not the final chunk, we wait for the rest of the chunks
				currentOffset += chunkLength;
				var nextChunks = hessianDeserialize(workingBuffer, currentOffset);
				if (nextChunks.type != 'binary') {
					throw new Error("Deserialize error. Binary chunk expected. Got " + nextChunks.type);
				}
				var resultChunk = HessianUtil.concatByteArray(thisChunk, nextChunks.value);

				return {length : (chunkLength + 3) + nextChunks.length,
				value : resultChunk,
				type : 'binary',
				encodedAs : '8-bit binary data non-final chunk ("A")'
				};
			break;
			case (workingBuffer[currentOffset] === 0x42) :
				/*
				 * 8-bit binary data final chunk ('B')  
				 */
				currentOffset++;
				var chunkLength = 256 * workingBuffer[currentOffset] + workingBuffer[currentOffset + 1];
				currentOffset += 2;
				var thisChunk = new Uint8Array(workingBuffer.subarray(currentOffset, currentOffset + chunkLength));
				return {length : chunkLength + 3,
				value : thisChunk,
				type : 'binary',
				encodedAs : '8-bit binary data final chunk ("B")'
				};
			break;
			case (workingBuffer[currentOffset] === 0x43) :
				/*
				 * # object type definition ('C')				 
				 */
				//Working with the first byte, the lenght of the name
				var newObject = {};
				newObject.length = 0;
				currentOffset++;

				var deserializedName = hessianDeserialize(workingBuffer, currentOffset);
				newObject.name = deserializedName.value;
				newObject.length += deserializedName.length;
				currentOffset += deserializedName.length;

				//Now, working with the amount of fields in the object (the immediate bytes after the name
				var numberOfFields = hessianDeserialize(workingBuffer, currentOffset);
				newObject.numberOfFields = numberOfFields.value;
				newObject.length += numberOfFields.length;
				currentOffset += numberOfFields.length;

				//create the list of fields				
				var fieldNames = [];
				for ( var i = 0; i < numberOfFields.value; i++) {
					var newFieldName = hessianDeserialize(workingBuffer, currentOffset);
					fieldNames.push(newFieldName.value);
					//Move the offset to the next item
					newObject.length += newFieldName.length;
					currentOffset += newFieldName.length;
				}
				newObject.fieldNames = fieldNames;

				//The offset stays at the end of the list of fields. Keep working on the buffer								
				var decodedValues = hessianDeserialize(workingBuffer, currentOffset);
				newObject.values = decodedValues.value;
				newObject.length += decodedValues.length;
				newObject.type = 'object';
				newObject.encodedAs = 'object type definition ("C")';

				return newObject;

			break;
			case (workingBuffer[currentOffset] === 0x44) :
				throw new Error("64-bit IEEE encoded double ('D') data type is not implemented. value 0x"
						+ workingBuffer[currentOffset].toString(16) + " address 0x" + currentOffset.toString(16));
			break;
			case (workingBuffer[currentOffset] === 0x45) :
				throw new Error("reserved");
			break;
			case (workingBuffer[currentOffset] === 0x46) :
				throw new Error("boolean false ('F')");
			break;
			case (workingBuffer[currentOffset] === 0x47) :
				throw new Error("reserved data type is not implemented. value 0x" + workingBuffer[currentOffset].toString(16)
						+ " address 0x" + currentOffset.toString(16));
			break;
			case (workingBuffer[currentOffset] === 0x48) :
				/*
				 * # untyped map ('H') 
				 */
				currentOffset++;
				var map = [];
				var mapLength = 1;
				var nextIndex = hessianDeserialize(workingBuffer, currentOffset);
				while (nextIndex.type != "terminator") {
					var nextValue = hessianDeserialize(workingBuffer, currentOffset + nextIndex.length);
					map[nextIndex.value] = nextValue.value;
					console.log(map);
					currentOffset = currentOffset + nextIndex.length + nextValue.length;
					mapLength = mapLength + nextIndex.length + nextValue.length;
					nextIndex = hessianDeserialize(workingBuffer, currentOffset);
				}
				return {length : mapLength,
				value : map,
				type : 'map',
				encodedAs : "untyped map ('H') "
				};
			break;
			case (workingBuffer[currentOffset] === 0x49) :
				/*
				 * # 32-bit signed integer ('I')
				 * working with 5 bytes.
				 * Byte 0 is the I
				 * Byte 1 - 4 are the four bytes with the integer value
				 */
				var byteBuffer = new Uint8Array(workingBuffer.subarray(currentOffset + 1, currentOffset + 5)); //We just use a 32bits view to parse the 2 bytes
				var intValueBuffer = new Uint32Array(byteBuffer.buffer);

				var intValue = HessianUtil.swapInt32Endianness(intValueBuffer[0]);

				return {length : 5,
				value : intValue,
				type : 'number',
				encodedAs : "32-bit signed integer ('I')"
				};
			break;
			case (workingBuffer[currentOffset] === 0x4a) :
				throw new Error("64-bit UTC millisecond date data type is not implemented. value 0x"
						+ workingBuffer[currentOffset].toString(16) + " address 0x" + currentOffset.toString(16));
			break;
			case (workingBuffer[currentOffset] === 0x4b) :
				throw new Error("32-bit UTC minute date data type is not implemented. value 0x" + workingBuffer[currentOffset].toString(16)
						+ " address 0x" + currentOffset.toString(16));
			break;
			case (workingBuffer[currentOffset] === 0x4c) :
				throw new Error("64-bit signed long integer ('L') data type is not implemented. value 0x"
						+ workingBuffer[currentOffset].toString(16) + " address 0x" + currentOffset.toString(16));
			break;
			case (workingBuffer[currentOffset] === 0x4d) :
				throw new Error("map with type ('M') data type is not implemented. value 0x" + workingBuffer[currentOffset].toString(16)
						+ " address 0x" + currentOffset.toString(16));
			break;
			case (workingBuffer[currentOffset] === 0x4e) :
				/*
				 * # null ('N')
				 */
				return {length : 1,
				value : null,
				type : 'null',
				encodedAs : "null ('N')"
				};
			break;
			case (workingBuffer[currentOffset] === 0x4f) :
				throw new Error("object instance ('O') data type is not implemented. value 0x" + workingBuffer[currentOffset].toString(16)
						+ " address 0x" + currentOffset.toString(16));
			break;
			case (workingBuffer[currentOffset] === 0x50) :
				throw new Error("reserved data type is not implemented. value 0x" + workingBuffer[currentOffset].toString(16)
						+ " address 0x" + currentOffset.toString(16));
			break;
			case (workingBuffer[currentOffset] === 0x51) :
				/*
				 * # reference to map/list/object - integer ('Q')
				 */
				currentOffset++;
				var reference = hessianDeserialize(workingBuffer, currentOffset);
				return {length : 1 + reference.length,
				value : reference.value,
				type : 'reference',
				encodedAs : "reference to map/list/object - integer ('Q')"
				};
			break;
			case (workingBuffer[currentOffset] === 0x52) :
				throw new Error("utf-8 string non-final chunk ('R') data type is not implemented. value 0x"
						+ workingBuffer[currentOffset].toString(16) + " address 0x" + currentOffset.toString(16));
			break;
			case (workingBuffer[currentOffset] === 0x53) :
				throw new Error("utf-8 string final chunk ('S') data type is not implemented. value 0x"
						+ workingBuffer[currentOffset].toString(16) + " address 0x" + currentOffset.toString(16));
			break;
			case (workingBuffer[currentOffset] === 0x54) :
				throw new Error("boolean true ('T') data type is not implemented. value 0x" + workingBuffer[currentOffset].toString(16)
						+ " address 0x" + currentOffset.toString(16));
			break;
			case (workingBuffer[currentOffset] === 0x55) :
				throw new Error("variable-length list/vector ('U') data type is not implemented. value 0x"
						+ workingBuffer[currentOffset].toString(16) + " address 0x" + currentOffset.toString(16));
			break;
			case (workingBuffer[currentOffset] === 0x56) :
				/*
				 * fixed-length list/vector ('V')
				 */
				console.log("fixed length list/vector V");

				var newList = [];
				var listLength = 1;//The length in bytes for the current object
				//
				currentOffset++;
				var listType = hessianDeserialize(workingBuffer, currentOffset);
				currentOffset += listType.length;
				listLength += listType.length;
				var numberOfItems = hessianDeserialize(workingBuffer, currentOffset);
				currentOffset += numberOfItems.length;
				listLength += numberOfItems.length;

				for ( var i = 0; i < numberOfItems.value; i++) {
					newItem = hessianDeserialize(workingBuffer, currentOffset);
					console.log(newItem);
					newList.push(newItem.value);
					currentOffset += newItem.length;
					listLength += newItem.length;
				}

				var lastElement = hessianDeserialize(workingBuffer, currentOffset);
				currentOffset += lastElement.length;
				listLength += lastElement.length;
				//I'll be expecting the last element of the list would be a terminator, however, the spec is not clear in this point, so
				//This check might be not necesary
				if (lastElement.type != 'terminator') {
					throw new Error("Last element in list is not a terminator. value 0x" + workingBuffer[currentOffset].toString(16)
							+ " address 0x" + currentOffset.toString(16));
				}
				newList.type = listType;
				newList.length = numberOfItems;

				return {length : listLength,
				value : newList,
				type : 'list',
				encodedAs : "fixed-length list/vector ('V')"
				};
			break;
			case (workingBuffer[currentOffset] === 0x57) :
				throw new Error("variable-length untyped list/vector ('W') data type is not implemented. value 0x"
						+ workingBuffer[currentOffset].toString(16) + " address 0x" + currentOffset.toString(16));
			break;
			case (workingBuffer[currentOffset] === 0x58) :
				/*
				 * fixed-length untyped list/vector ('0x') 
				 */
				var newList = [];
				var listLength = 1;//The length in bytes for the current object

				currentOffset++;
				var numberOfItems = hessianDeserialize(workingBuffer, currentOffset);

				currentOffset += numberOfItems.length;
				listLength += numberOfItems.length;//Add to the list lenght the (generally) two bytes encoding the size
				for ( var i = 0; i < numberOfItems.value; i++) {
					var newItem = hessianDeserialize(workingBuffer, currentOffset);
					newList.push(newItem.value);
					currentOffset += newItem.length;
					listLength += newItem.length;
				}
				return {length : listLength,
				value : newList,
				type : 'list',
				encodedAs : "fixed-length untyped list/vector ('0x')"
				};
			break;
			case (workingBuffer[currentOffset] === 0x59) :
				throw new Error("long encoded as 32-bit int ('Y') data type is not implemented. value 0x"
						+ workingBuffer[currentOffset].toString(16) + " address 0x" + currentOffset.toString(16));
			break;
			case (workingBuffer[currentOffset] === 0x5a) :
				/*
				 * list/map terminator ('Z') as per the Hessian spec.
				 * Not to be confused with this http://upload.wikimedia.org/wikipedia/en/thumb/b/b9/Terminator-2-judgement-day.jpg/250px-Terminator-2-judgement-day.jpg 
				 */
				return {length : 1,
				value : 'Z',
				type : 'terminator',
				encodedAs : "list/map terminator ('Z')"
				};
			break;
			case (workingBuffer[currentOffset] === 0x5b) :
				throw new Error("double 0.0 data type is not implemented. value 0x" + workingBuffer[currentOffset].toString(16)
						+ " address 0x" + currentOffset.toString(16));
			break;
			case (workingBuffer[currentOffset] === 0x5c) :
				throw new Error("double 1.0 data type is not implemented. value 0x" + workingBuffer[currentOffset].toString(16)
						+ " address 0x" + currentOffset.toString(16));
			break;
			case (workingBuffer[currentOffset] === 0x5d) :
				throw new Error("double represented as byte (-128.0 to 127.0) data type is not implemented. value 0x"
						+ workingBuffer[currentOffset].toString(16) + " address 0x" + currentOffset.toString(16));
			break;
			case (workingBuffer[currentOffset] === 0x5e) :
				throw new Error("double represented as short (-32768.0 to 327676.0) data type is not implemented. value 0x"
						+ workingBuffer[currentOffset].toString(16) + " address 0x" + currentOffset.toString(16));
			break;
			case (workingBuffer[currentOffset] === 0x5f) :
				throw new Error("double represented as float data type is not implemented. value 0x"
						+ workingBuffer[currentOffset].toString(16) + " address 0x" + currentOffset.toString(16));
			break;
			case (0x60 <= workingBuffer[currentOffset] && workingBuffer[currentOffset] <= 0x6f) :
				/*
				 * # object with direct type
				 * Keep parsing the rest of the object
				 */
				var values = [];
				currentOffset++;
				var currentLength = 1;
				while (currentOffset < workingBuffer.length) {
					var newObject = hessianDeserialize(workingBuffer, currentOffset);
					//Not sure where I need to break the serialization of an object.
					//					if (newObject.type === 'object' || newObject.type==='terminator'){//means that another object is found, so, we break the cycle for avoiding recursive objects
					//						break;
					//					}
					values.push(newObject);
					currentOffset += newObject.length;
					currentLength += newObject.length;
				}
				return {length : currentLength,
				value : values,
				type : 'object',
				encodedAs : "object with direct type"
				};
			break;
			case (0x70 <= workingBuffer[currentOffset] && workingBuffer[currentOffset] <= 0x77) :
				throw new Error("fixed list with direct length data type is not implemented. value 0x"
						+ workingBuffer[currentOffset].toString(16) + " address 0x" + currentOffset.toString(16));
			break;
			case (0x78 <= workingBuffer[currentOffset] && workingBuffer[currentOffset] <= 0x7f) :
				/*
				 * fixed untyped list with direct length
				 */
				var listLength = 1;
				var newList = [];
				var numberOfItems = workingBuffer[currentOffset] - 0x78;
				currentOffset++;
				for ( var i = 0; i < numberOfItems; i++) {
					var newElement = hessianDeserialize(workingBuffer, currentOffset);
					newList.push(newElement);
					listLength += newElement.length;
					currentOffset += newElement.length;
				}

				return {length : listLength,
				value : newList,
				type : 'list',
				encodedAs : "fixed untyped list with direct length"
				};
			break;
			case (0x80 <= workingBuffer[currentOffset] && workingBuffer[currentOffset] <= 0xbf) :
				/*
				 * # one-octet compact int (-0x10 to 0x3f, 0x90 is 0) 				 
				 */
				//This formula is in the spec for compact int
				var intValue = workingBuffer[currentOffset] - 0x90;

				//Keep decoding the object
				return {length : 1,
				value : intValue,
				type : 'number',
				encodedAs : "one-octet compact int (-0x10 to 0x3f, 0x90 is 0)"
				};
			break;
			case (0xc0 <= workingBuffer[currentOffset] && workingBuffer[currentOffset] <= 0xcf) :
				/*
				 * # two-octet compact int (-0x800 to 0x7ff)
				 * working with 2 bytes.				 
				 */
				//This formula is in the spec for compact int
				var intValue = ((workingBuffer[currentOffset] - 0xc8) << 8) + workingBuffer[currentOffset + 1];

				//Keep decoding the object
				return {length : 2,
				value : intValue,
				type : 'number',
				encodedAs : "two-octet compact int (-0x800 to 0x7ff)"
				};
			break;
			case (0xd0 <= workingBuffer[currentOffset] && workingBuffer[currentOffset] <= 0xd7) :
				/*
				 * # three-octet compact int (-0x40000 to 0x3ffff)
				 * working with 2 bytes.				 
				 */
				//This formula is in the spec for compact int				
				var intValue = ((workingBuffer[currentOffset] - 0xd4) << 16) + (workingBuffer[currentOffset + 1] << 8)
						+ workingBuffer[currentOffset + 2];
				return {length : 3,
				value : intValue,
				type : 'number',
				encodedAs : "three-octet compact int (-0x40000 to 0x3ffff)"
				};
			break;
			case (0xd8 <= workingBuffer[currentOffset] && workingBuffer[currentOffset] <= 0xef) :
				throw new Error("one-octet compact long (-0x8 to 0xf, 0xe0 is 0) data type is not implemented. value 0x"
						+ workingBuffer[currentOffset].toString(16) + " address 0x" + currentOffset.toString(16));
			break;
			case (0xf0 <= workingBuffer[currentOffset] && workingBuffer[currentOffset] <= 0xff) :
				throw new Error("two-octet compact long (-0x800 to 0x7ff, 0xf8 is 0) data type is not implemented. value 0x"
						+ workingBuffer[currentOffset].toString(16) + " address 0x" + currentOffset.toString(16));
			break;
		}
	}

	/*
	 * Serialization of the RPC envelopes and messages from the hessian Web services protocol
	 * So far, I only added support for those types I needed, but every time the parser founds an unsupported type, will let you know.
	 * Implementing new types is not that hard if you follow the spec (most of the times).
	 * 
	 * From the spec: "A Hessian reader is essentially a switch statement on the initial octet" 
	 * So, here it is
	 * 
	 * @param {workingBuffer} the buffer to be decoded
	 * @param {offset} The offset from wich we want to start to decode 
	 *  @see: <a href="http://hessian.caucho.com/doc/hessian-ws.html">The hessian 2.0 Web Services Protocol</a>
	 * 
	 * @returns A javascript object representing the hessian object serialized.
	 */
	function hessianDeserializeRPC(workingBuffer, offset, length) {
		var currentLength = length || workingBuffer.length;
		var currentOffset = offset || 0;
		if (currentOffset >= currentLength) {
			return;
		}
		switch (true) {
			case (0x00 <= workingBuffer[currentOffset] && workingBuffer[currentOffset] <= 0x42) :
				throw new Error("reserved data type is not implemented. value 0x" + workingBuffer[currentOffset].toString(16)
						+ " address 0x" + currentOffset.toString(16));
			break;
			case (workingBuffer[currentOffset] === 0x43) :
				throw new Error("RPC Call ('C') data type is not implemented. value 0x" + workingBuffer[currentOffset].toString(16)
						+ " address 0x" + currentOffset.toString(16));
			break;
			case (workingBuffer[currentOffset] === 0x44) :
				throw new Error("Reserved data type is not implemented. value 0x" + workingBuffer[currentOffset].toString(16)
						+ " address 0x" + currentOffset.toString(16));
			break;
			case (workingBuffer[currentOffset] === 0x45) :
				throw new Error("envelope ('E') data type is not implemented. value 0x" + workingBuffer[currentOffset].toString(16)
						+ " address 0x" + currentOffset.toString(16));
			break;
			case (workingBuffer[currentOffset] === 0x46) :
				/*
				 * # Hessian fault ('F')
				 * Parse the next value, wich are a map containint the error information
				 */
				currentOffset++;
				var error = hessianDeserialize(workingBuffer, currentOffset);
				console.error(error);
				throw new Error("Hessian responsed with an error");
			break;
			case (workingBuffer[currentOffset] === 0x47) :
				throw new Error("reserved data type is not implemented. value 0x" + workingBuffer[currentOffset].toString(16)
						+ " address 0x" + currentOffset.toString(16));
			break;
			case (workingBuffer[currentOffset] === 0x48) :
				/*
				 * # hessian version ('H')
				 * working with 3 bytes.
				 * Byte 0 is the H
				 * Byte 1 - 2 are the two bytes for the version
				 */
				var version = new Uint16Array(workingBuffer.subarray(currentOffset + 1, currentOffset + 3));
				if (version[0] != 2) {
					throw new Error("This encoder only supports Hessian 2.0, but the response calls for Hessian " + version);
				}
				else {
					//Increase the offset in 3 bytes and keep parsing
					return hessianDeserializeRPC(workingBuffer, currentOffset + 3, currentLength);
				}
			break;
			case (0x49 <= workingBuffer[currentOffset] && workingBuffer[currentOffset] <= 0x4e) :
				throw new Error("reserved data type is not implemented. value 0x" + workingBuffer[currentOffset].toString(16)
						+ " address 0x" + currentOffset.toString(16));
			break;
			case (workingBuffer[currentOffset] === 0x4f) :
				throw new Error("packet chunk ('O') data type is not implemented. value 0x" + workingBuffer[currentOffset].toString(16)
						+ " address 0x" + currentOffset.toString(16));
			break;
			case (workingBuffer[currentOffset] === 0x50) :
				throw new Error("packet end ('P') data type is not implemented. value 0x" + workingBuffer[currentOffset].toString(16)
						+ " address 0x" + currentOffset.toString(16));
			break;
			case (workingBuffer[currentOffset] === 0x51) :
				throw new Error("reserved data type is not implemented. value 0x" + workingBuffer[currentOffset].toString(16)
						+ " address 0x" + currentOffset.toString(16));
			break;
			case (workingBuffer[currentOffset] === 0x52) :
				/*
				 * # From here, starts the hessian object containing the response, so, we parse the rest of the object. 
				 */
				return hessianDeserialize(workingBuffer, currentOffset + 1);
			break;
			case (0x53 <= workingBuffer[currentOffset] && workingBuffer[currentOffset] <= 0x59) :
				throw new Error("reserved data type is not implemented. value 0x" + workingBuffer[currentOffset].toString(16)
						+ " address 0x" + currentOffset.toString(16));
			break;
			case (workingBuffer[currentOffset] === 0x5a) :
				throw new Error("terminator ('Z') data type is not implemented. value 0x" + workingBuffer[currentOffset].toString(16)
						+ " address 0x" + currentOffset.toString(16));
			break;
			case (0x5b <= workingBuffer[currentOffset] && workingBuffer[currentOffset] <= 0x5f) :
				throw new Error("reserved data type is not implemented. value 0x" + workingBuffer[currentOffset].toString(16)
						+ " address 0x" + currentOffset.toString(16));
			break;
			case (0x70 <= workingBuffer[currentOffset] && workingBuffer[currentOffset] <= 0x7f) :
				throw new Error("final packet (0 - 4096) data type is not implemented. value 0x"
						+ workingBuffer[currentOffset].toString(16) + " address 0x" + currentOffset.toString(16));
			break;
			case (0x80 <= workingBuffer[currentOffset] && workingBuffer[currentOffset] <= 0xff) :
				throw new Error("final packet for envelope (0 - 127) data type is not implemented. value 0x"
						+ workingBuffer[currentOffset].toString(16) + " address 0x" + currentOffset.toString(16));
			break;
		}
	}

	function decode(byteBuffer) {
		var resultObject = {};
		if (byteBuffer) {
			resultObject = hessianDeserializeRPC(byteBuffer, 0, 10);
		}
		else {
			console.warn("The buffer to decode is null or empty");
		}
		return resultObject;
	}

	return {decode : decode
	};
});