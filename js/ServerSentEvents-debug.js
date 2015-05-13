/**
 * Copyright (c) 2007-2014 Kaazing Corporation. All rights reserved.
 * 
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 * 
 *   http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */



/**
 * @ignore
 */
var XDRHttpDirect = (function() {

	var id = 0;

    //console.log("XDRHttpRequest");
    // IE8, IE9 XDomainRequest is cross-domain
    function XDRHttpDirect(outer) {
        this.outer = outer;
    }
        
    var $prototype = XDRHttpDirect.prototype;         
    $prototype.open = function(method, location) {
        //console.log("xdr "+ id + " .open(" + [method, location] + ")" + new Date().getTime());
        var $this = this;
        var xhr = this.outer;
        
        xhr.responseText = "";
        var readyState = 2;
        var progressAt = 0;
        var startOfResponseAt = 0;
        
        this._method = method;        
        this._location = location;
              
        if (location.indexOf("?") == -1) {
            location += "?.kac=ex&.kct=application/x-message-http";
        }
        else {
            location += "&.kac=ex&.kct=application/x-message-http";
        }
        this.location = location;              
        var xdr = this.xdr = new XDomainRequest();
        
        var onProgressFunc = function(e) {
            //console.log("xdr "+ id + " .onprogress1(" + [e] + ")" + new Date().getTime());
            try {
                // process emulated headers in payload
                var responseText = xdr.responseText;
                if(readyState <= 2) {
                    var endOfHeadersAt = responseText.indexOf("\r\n\r\n");
                    //console.log("endOfHeadersAt: " + endOfHeadersAt);
                    if (endOfHeadersAt == -1) {
                        return;  //wait for header to complete
                    }
                    var endOfStartAt = responseText.indexOf("\r\n");
                    var startText = responseText.substring(0, endOfStartAt);
                    var startMatch = startText.match(/HTTP\/1\.\d\s(\d+)\s([^\r\n]+)/);  // match all line endings
                    // assert start[0] === "HTTP/1.1"
                    xhr.status = parseInt(startMatch[1]);
                    xhr.statusText = startMatch[2];

                    var startOfHeadersAt = endOfStartAt + 2; // "\r\n".length
                    startOfResponseAt = endOfHeadersAt + 4; // "\r\n\r\n".length
                    var headerLines = responseText.substring(startOfHeadersAt, endOfHeadersAt).split("\r\n");
                    //console.log("_responseHeaders: " + headerLines);
                    xhr._responseHeaders = {};
                    for (var i=0; i < headerLines.length; i++) {
                        var header = headerLines[i].split(":");
                        xhr._responseHeaders[header[0].replace(/^\s+|\s+$/g,"")] = header[1].replace(/^\s+|\s+$/g,"");
                    }
        	        progressAt = startOfResponseAt;
              	    //console.log("xdr "+ id + " .readyState = 2");
                    readyState = xhr.readyState = 3;
                    if (typeof($this.onreadystatechange) == "function") {
  	                    $this.onreadystatechange(xhr);
    	            }

                }
 
                // detect new data
                var newDataLength = xdr.responseText.length;
                if (newDataLength > progressAt) {
                	xhr.responseText = responseText.slice(startOfResponseAt);
                    progressAt = newDataLength;
                 
                    if (typeof($this.onprogress) == "function") {
                        //console.log("onprogress: " + xhr.responseText);
                        $this.onprogress(xhr);
                    }
                } else {
                    //console.log("xdr " + id + " onprogress fired, but no new data");
                }
            }
            catch (e1) {
               $this.onload(xhr);
            }
            //console.log("xdr "+ id + " .onprogress2(" + [e] + ")" + new Date().getTime());
        }

        xdr.onprogress = onProgressFunc;
        xdr.onerror = function(e) {
            //console.log("xdr.onerror(" + [e] + ")" + new Date().getTime());
            xhr.readyState = 0;
            if (typeof(xhr.onerror) == "function") {
                xhr.onerror(xhr);
            }
        }
        xdr.onload = function(e) {
            //console.log("xdr "+ id + " .onload(" + [e] + ")" + new Date().getTime());
            if (readyState <= 3) {
            	onProgressFunc(e);
            }
            reayState = xhr.readyState = 4;
	        if (typeof(xhr.onreadystatechange) == "function") {
  	             xhr.onreadystatechange(xhr);
    	    }
            if (typeof(xhr.onload) == "function") {
                xhr.onload(xhr);
            }
        }
        xdr.open("POST", location);
     }
            
     $prototype.send = function(payload) {
         //console.log("xdr "+ id + " .send()" + new Date().getTime());
         
         // wrapper http request, remove &.kct=application%2Fx-message-http to match outer request path
         var wpayload = this._method + " " + this.location.substring(this.location.indexOf("/", 9), this.location.indexOf("&.kct")) + " HTTP/1.1\r\n";
         //headers
         for (var i = 0; i < this.outer._requestHeaders.length; i++) {
  	         wpayload += this.outer._requestHeaders[i][0] + ": " + this.outer._requestHeaders[i][1] + "\r\n";
         }
         var content = payload || "";
         if (content.length > 0 || this._method.toUpperCase() === "POST") {
             // calculate content-length
             var len = 0;
             for (var i = 0; i < content.length; i++) {
                 len++;
                 if (content.charCodeAt(i) >= 0x80) {
                     // handle \u0100 as well as \u0080 
                     len++;
                 }
             }
             wpayload += "Content-Length: " + len + "\r\n";
         }
         // end of header
         wpayload += "\r\n";
         wpayload += content;
         this.xdr.send(wpayload);
     }

     $prototype.abort = function() {
          //console.log("xdr "+ id + " .abort() + new Date().getTime()" + new Date().getTime());
          this.xdr.abort();
     }
                        
     return XDRHttpDirect;
})();




/**
 * @ignore
 */
var XMLHttpBridge = (function() {
	/*
    //
    // The emulation of cross-origin XMLHttpRequest uses postMessage.
    //
    // Each message is of the form opcode [hex(int-id) [ parameters... ]], for example:
    //
    //    - init -
    //    --> "I"
    //
    //    - send -
    //    --> "s" 00000001 4 "POST" 0029 "http://gateway.example.com:8000/stomp" 
    //            0001 000b "Content-Type" 000a "text/plain" 0000000c "Hello, world" 0005 t|f]
    //
    //    - abort -
    //    --> "a" 00000001
    //
    //    - delete -
    //    --> "d" 00000001
    //
    //    - readystate -
    //    <-- "r" 00000001 01 000b "Content-Type" 000a "text/plain" 00c2 02 "OK"
    //
    //    - progress -
    //    <-- "p" 00000001 3 0000000c "Hello, world"
    //
    //    - error -
    //    <-- "e" 00000001
    //
    //    - timeout -
    //    <-- "t" 00000001
    //
    */
    // IE6 cannot access window.location after document.domain is assigned, use document.URL instead
    var locationURI = new URI((browser == "ie") ? document.URL : location.href);
    var defaultPorts = { "http": 80, "https": 443 };
    if (locationURI.port == null) {
    	locationURI.port = defaultPorts[locationURI.scheme];
    	locationURI.authority = locationURI.host + ":" + locationURI.port;
    }

    var pipes = {};
    var registry = {};
    var nextId = 0;
   
	//Creates a new XMLHttpRequest0 instance.
	function XMLHttpBridge(outer) {
        // TODO implement Agent capabilities instead of browser checks
        // detect IE8 or higher

        // KG-2454: disable native XHR, use bridge to send out request
        // Note: IE10 reports as "chrome"
        this.outer = outer;
    }
    
    var $prototype = XMLHttpBridge.prototype;
    
    $prototype.open = function(method, location) {

        // attach this instance to the pipe
        var id = register(this);
        var pipe = supplyPipe(this, location);
        pipe.attach(id);

        this._pipe = pipe;
        this._method = method;
        this._location = location;
        this.outer.readyState = 1;

        // reset properties
        // in case of reuse        
        this.outer.status = 0;
        this.outer.statusText = "";
        this.outer.responseText = "";

        // allow handler to be assigned after open completes
        var $this = this;
        setTimeout(function() { 
	        $this.outer.readyState = 1; // opened
        	onreadystatechange($this); 
        }, 0);
    }
    
    $prototype.send = function(payload) {        
        doSend(this, payload);
    }
    
    $prototype.abort = function() {
    	var pipe = this._pipe;
    	if (pipe !== undefined) {
    	    //    - abort -
    	    //    --> "a" 00000001
	        pipe.post(["a", this._id].join(""));
	        pipe.detach(this._id);
	    }
    }
    
    function onreadystatechange($this) {
        if (typeof($this.onreadystatechange) !== "undefined") {
            $this.onreadystatechange($this.outer);
        }
        
        switch ($this.outer.readyState) {
        case 3:
	        if (typeof($this.onprogress) !== "undefined") {
	            $this.onprogress($this.outer);
	        }
            break;
        case 4:
            if ($this.outer.status < 100 || $this.outer.status >= 500) {
		        if (typeof($this.onerror) !== "undefined") {
			        $this.onerror($this.outer);
			    }
            }
            else {
		        if (typeof($this.onprogress) !== "undefined") {
		            $this.onprogress($this.outer);
		        }
	            if (typeof($this.onload) !== "undefined") {
	                $this.onload($this.outer);
	            }
        	}
            break;
        }
    }
    function fromHex(formatted) {
        return parseInt(formatted, 16);
    }
    
    function toPaddedHex(value, width) {
        var hex = value.toString(16);
        var parts = [];
        width -= hex.length;
        while (width-- > 0) {
            parts.push("0");
        }
        parts.push(hex);
        return parts.join("");
    }
    function register($this) {
        var id = toPaddedHex(nextId++, 8);
        registry[id] = $this;
        $this._id = id;
        return id;
    }
    
    function doSend($this, payload) {
        
        // sending null causes FF not to send any Content-Length header
        // which Squid rejects with status 411 Content-Length Required
        if (typeof(payload) !== "string") {
            payload = "";
        }

        //    - send -
        //    --> "s" 00000001 4 "POST" 0029 "http://gateway.example.com:8000/stomp" 
        //            0001 000b "Content-Type" 000a "text/plain" 0000000c "Hello, world" 0005 t|f]
        
        var method = $this._method.substring(0, 10); // single digit length
        var location = $this._location;
        var requestHeaders = $this.outer._requestHeaders;
        var timeout = toPaddedHex($this.outer.timeout, 4);
        var streaming = ($this.outer.onprogress !== undefined) ? "t" : "f";

        var message = ["s", $this._id, method.length, method, toPaddedHex(location.length, 4), location, toPaddedHex(requestHeaders.length, 4)];
        for (var i=0; i < requestHeaders.length; i++) {
            var requestHeader = requestHeaders[i];
            message.push(toPaddedHex(requestHeader[0].length, 4));
            message.push(requestHeader[0]);
            message.push(toPaddedHex(requestHeader[1].length, 4));
            message.push(requestHeader[1]);
        }
        
        message.push(toPaddedHex(payload.length, 8), payload, toPaddedHex(timeout, 4), streaming);
        
        // schedule post after readyState 2, as pipe.post can schedule readyState 4 (error condition)        
        $this._pipe.post(message.join(""));
    }
    
    // Fetch the pipe for the target origin of the location specified.
    function supplyPipe($this, location) {
        var uri = new URI(location);
        var hasTargetOrigin = (uri.scheme != null && uri.authority != null);
        var targetScheme = hasTargetOrigin ? uri.scheme : locationURI.scheme;
        var targetAuthority = hasTargetOrigin ? uri.authority : locationURI.authority;
        if (targetAuthority != null && uri.port == null) {
            targetAuthority = uri.host + ":" + defaultPorts[targetScheme];
        }
        var targetOrigin = targetScheme + "://" + targetAuthority;

        // IE8 "converts" the iframe contentWindow to type "unknown"
        // under certain conditions (including in jsTestFramework)
        var pipe = pipes[targetOrigin];
        if (pipe !== undefined) {
            if (!("iframe" in pipe &&
                  "contentWindow" in pipe.iframe &&
                  typeof pipe.iframe.contentWindow == 'object')) {
                pipe = pipes[targetOrigin] = undefined;
            }
        }

        if (pipe === undefined) {
            var iframe = document.createElement("iframe");
            iframe.style.position = "absolute";
            iframe.style.left = "-10px";
            iframe.style.top = "10px";
            iframe.style.visibility = "hidden";
            iframe.style.width = "0px";
            iframe.style.height = "0px";
            
            var bridgeURI = new URI(targetOrigin);
            bridgeURI.query = ".kr=xs";  // cross-site bridge
            bridgeURI.path = "/";
            iframe.src = bridgeURI.toString();
            
            function post(message) {
                this.buffer.push(message);
            }
            
            function attach(id) {
                // lookup previously attached entry
                var entry = this.attached[id];
                
                // attach new entry if necessary 
                if (entry === undefined) {
                    entry = {};
                    this.attached[id] = entry;
                }
                
                // cancel entry cleanup if necessary
                if (entry.timerID !== undefined) {
                    clearTimeout(entry.timerID);
                    delete entry.timerID;
                }
            }
            
            function detach(id) {
                // lookup previously attached entry
                var entry = this.attached[id];
                
                // schedule entry cleanup if necessary
                if (entry !== undefined && entry.timerID === undefined) {
                    var $this = this;
                    entry.timerID = setTimeout(function() {
                        // detach entry
                        delete $this.attached[id];
                        
                        // unregister xhr, unless reused by different pipe
                        // this occurs if xhr opens a subsequent request
                        // to a different target origin
                        var xhr = registry[id];
                        if (xhr._pipe == pipe) {
	                        delete registry[id];
	                        delete xhr._id;
	                        delete xhr._pipe;
                        }

                        // send message to cleanup delegate instance
                        // Note: do not use $this.post in case pipe has changed
                        //    - delete -
                        //    --> "d" 00000001
                        postMessage0(pipe.iframe.contentWindow, ["d", id].join(""), pipe.targetOrigin);
                    }, 0);
                }
            }
            
            pipe = {'targetOrigin':targetOrigin, 'iframe':iframe, 'buffer':[], 'post':post, 'attach':attach, 'detach':detach, 'attached':{count:0}};
            pipes[targetOrigin] = pipe;

            // initialize postMessage from parent
            function sendInitWhenReady() {
                var targetWindow = iframe.contentWindow;
                if (!targetWindow) {
                   	setTimeout(sendInitWhenReady, 20);
                }
                else {
                    postMessage0(targetWindow, "I", targetOrigin);
                }
            }
            
            // 30 sec timeout for cross-origin iframe wrapper initialization
            // TODO: cancel timerID when "I" arrives from embedded iframe
            pipe.handshakeID = setTimeout(function() {
	          	// when timeout occurs, then clearing previously associated
	          	// targetOrigin pipe because we cannot wait for success to
	          	// associate the targetOrigin pipe, otherwise 2 parallel requests  
	          	// in-flight could have different pipes for same targetOrigin
	          	// and we require them to have the same pipe for the same targetOrigin
	            pipes[targetOrigin] = undefined;
               	pipe.post = function(message) {
	           		// pipe.post will first be called
	           		// when XMLHttpRequest0.send() is called
	           		// triggering the onerror callback
			        $this.readyState = 4; // loaded
			        $this.status = 0; // error
		        	onreadystatechange($this); 
               	}
               	// if already attempting to send,
               	// then trigger onerror callback
               	if (pipe.buffer.length > 0) {
               		pipe.post();
               	}
            }, 30000);

			// append the iframe to trigger the HTTP request
			// successful handshake will receive "I" message from iframe
            document.body.appendChild(iframe);

			// delay calling until after iframe appended, otherwise
			// this produces a general error on IE.
            // Browsers implementing postMessage natively do not require
            // Init to be sent (special case Chrome only for now).
            if (typeof(postMessage) === "undefined") {
                sendInitWhenReady();
            }
        }
        
        return pipe;
    }
     
    function onmessage(event) {
        var origin = event.origin;
        var defaultPorts = {"http":":80", "https": ":443"};
        var originParts = origin.split(":");
        if (originParts.length === 2) {
            origin += defaultPorts[originParts[0]];
        }
        var pipe = pipes[origin];
        
        if (pipe !== undefined && pipe.iframe !== undefined && event.source == pipe.iframe.contentWindow) {
	        if (event.data == "I") {
                // now that cross-domain pipeline has been established,
                // clear the handshake timer, flush buffered messages and update post function
                clearTimeout(pipe.handshakeID);
                var message;
                while ((message = pipe.buffer.shift()) !== undefined) {
                    postMessage0(pipe.iframe.contentWindow, message, pipe.targetOrigin);
                }
                pipe.post = function(message) {
                    postMessage0(pipe.iframe.contentWindow, message, pipe.targetOrigin);
                }
            }
            else {
                var message = event.data;
	            if (message.length >= 9) {
	                var position = 0;
	                var type = message.substring(position, position += 1);
	                var id = message.substring(position, position += 8);
	                var xmlHttp = registry[id];
	                if (xmlHttp !== undefined) {
	                    switch (type) {
	                    case "r":
                            /*    - readystate -
                            //    <-- "r" 00000001 01 000b "Content-Type" 000a "text/plain" 00c2 02 "OK"
                            */
	                        var responseHeaders = {};
	                        var responseHeaderCount = fromHex(message.substring(position, position += 2));
	                        for (var i=0; i < responseHeaderCount; i++) {
	                            var labelSize = fromHex(message.substring(position, position += 4));
	                            var label = message.substring(position, position += labelSize);
                                var valueSize = fromHex(message.substring(position, position += 4));
                                var value = message.substring(position, position += valueSize);
                                responseHeaders[label] = value;
	                        }
	                        
	                        var status = fromHex(message.substring(position, position += 4));
                            var statusTextSize = fromHex(message.substring(position, position += 2));
                            var statusText = message.substring(position, position += statusTextSize);
                            
                            switch (status) {
                            case 301:
                            case 302:
                            case 307:
                                var redirectURI = responseHeaders["Location"];
                                var originalURI = event.origin;

                                // If redirect policy is supported then onredirectallowed handler
                                // will be setup. And, we will use it to determine if the redirect
                                // is legal based on the specified policy. If redirect policy is
                                // not supported, then we just continue to do what we always did.
                                if (typeof(xmlHttp.outer.onredirectallowed) === "function") {
                                    if (!xmlHttp.outer.onredirectallowed(originalURI, redirectURI)) {
                                        // Cannot redirect. Error message must have been reported
                                        // in the appropriate layer(WS or SSE) above the transport.
                                        return;
                                    }
                                }

                                var id = register(xmlHttp);
                                var pipe = supplyPipe(xmlHttp, redirectURI);
                                pipe.attach(id);
                                xmlHttp._pipe = pipe;
                                xmlHttp._method = "GET";
                                xmlHttp._location = redirectURI;
                                xmlHttp._redirect = true;
                                break
                            case 403:
                                // trigger callback handler
                                xmlHttp.outer.status = status;
                                onreadystatechange(xmlHttp);
                                break;                                
                            default:
                                xmlHttp.outer._responseHeaders = responseHeaders;
                                xmlHttp.outer.status = status;
                                xmlHttp.outer.statusText = statusText;
                                break;
                            }
	                        
	                        break;
	                    case "p":
                            /*
                            //    - progress -
                            //    <-- "p" 00000001 3 0000000c "Hello, world"
	                        */
	                    	
	                        // update the readyState
	                        var readyState = parseInt(message.substring(position, position += 1));
                            
	                        if (xmlHttp._id === id) {
		                        xmlHttp.outer.readyState = readyState;
		                        
		                        // handle case where response text includes separator character
		                        var responseChunkSize = fromHex(message.substring(position, position += 8));
		                        var responseChunk = message.substring(position, position += responseChunkSize);
		                        if (responseChunk.length > 0) {
		                            xmlHttp.outer.responseText += responseChunk;
		                        }
		                           
		                        // trigger callback handler
		                        onreadystatechange(xmlHttp);
	                        }
	                        else if (xmlHttp._redirect) {
	                        	xmlHttp._redirect = false;
                                doSend(xmlHttp, "");
	                        }
	
	                        // detach from pipe
	                        if (readyState == 4) {
	                            pipe.detach(id);
	                    	}
	                    	break;
	                    case "e":
	                        /*    - error -
	                        //    <-- "e" 00000001
                            */
	                        if (xmlHttp._id === id) {
		                        // reset status
		                        xmlHttp.outer.status = 0;
		                        xmlHttp.outer.statusText = "";
		                        
		                        // complete readyState
		                        xmlHttp.outer.readyState = 4;
		                        
		                        // trigger callback handler
		                        onreadystatechange(xmlHttp);
	                        }
		
	                    	// detach from pipe
                            pipe.detach(id);
                            break;
	                    case "t":
	                        /*    - timeout -
	                        //    <-- "t" 00000001
                            */
	                        if (xmlHttp._id === id) {
		                        // reset status
		                        xmlHttp.outer.status = 0;
		                        xmlHttp.outer.statusText = "";
		                        
		                        // complete readyState
		                        xmlHttp.outer.readyState = 4;
		                        
		                        // trigger callback handler
		            	        if (typeof(xmlHttp.ontimeout) !== "undefined") {
		            	        	xmlHttp.ontimeout();
		            	        }
	                        }
	
	                    	// detach from pipe
                            pipe.detach(id);
                            break;
	                    }
	                }
	            }
	        }
        } else {
            //throw new Error("Could not perform x-domain XHR emulation: message pipe not found");
        }
    }
    

    // attach message processing
    window.addEventListener("message", onmessage, false);
    
    return XMLHttpBridge;
})();




/**
 * @ignore
 */
var XMLHttpRequest0 = (function() {
    //
    // The emulation of cross-origin XMLHttpRequest uses postMessage.
    //
 
    // IE6 cannot access window.location after document.domain is assigned, use document.URL instead
    var locationURI = new URI((browser == "ie") ? document.URL : location.href);
    var defaultPorts = { "http": 80, "https": 443 };
    if (locationURI.port == null) {
    	locationURI.port = defaultPorts[locationURI.scheme];
    	locationURI.authority = locationURI.host + ":" + locationURI.port;
    }

    function onreadystatechange($this) {
        if (typeof($this.onreadystatechange) !== "undefined") {
            $this.onreadystatechange();
        }
    }

    function onprogress($this) {
        if (typeof($this.onprogress) !== "undefined") {
            $this.onprogress();
        }
    }

    function onerror($this) {
        if (typeof($this.onerror) !== "undefined") {
            $this.onerror();
        }
    }
    
    function onload($this) {
        if (typeof($this.onload) !== "undefined") {
            $this.onload();
        }
    }
	/**
	 * Creates a new XMLHttpRequest0 instance.
	 *
	 * @constructor
	 * @name XMLHttpRequest0
	 * 
	 * @class  XMLHttpRequest0 emulates cross-origin XMLHttpRequest.
	 * @ignore
	 */
    function XMLHttpRequest0() {
    	this._requestHeaders = [];
    	this.responseHeaders = {};
    	this.withCredentials = false;
    }
    
    var $prototype = XMLHttpRequest0.prototype;
    
    /**
     * The readyState property specifies the current state of the request.
     *
     * @public
     * @field
     * @name readyState
     * @type int
     * @memberOf XMLHttpRequest0
     */
    $prototype.readyState = 0;
    
    /**
     * The responseText property specifies the response text of the request.
     *
     * @public
     * @field
     * @name responseText
     * @type String
     * @memberOf XMLHttpRequest0
     */
    $prototype.responseText = "";
    
    /**
     * The status property specifies the response status code of the request.
     *
     * @public
     * @field
     * @name status
     * @type int
     * @memberOf XMLHttpRequest0
     */
    $prototype.status = 0;
    
    /**
     * The statusText property specifies the response status text of the request.
     *
     * @public
     * @field
     * @name statusText
     * @type String
     * @memberOf XMLHttpRequest0
     */
    $prototype.statusText = "";
    
    /**
     * The timeout property specifies the timeout period for the initial request connection.
     *
     * @public
     * @field
     * @name timeout
     * @type int
     * @memberOf XMLHttpRequest0
     */
    $prototype.timeout = 0;
    
    /**
     * The onreadystatechange handler is called each time the responseState is updated.
     *
     * @public
     * @field
     * @name onreadystatechange
     * @type Function
     * @memberOf XMLHttpRequest0
     */
    $prototype.onreadystatechange;

    /**
     * The onerror handler is called when the request has an error.
     *
     * @public
     * @field
     * @name onerror
     * @type Function
     * @memberOf XMLHttpRequest0
     */
    $prototype.onerror;

    /**
     * The onload handler is called when the request has completed successfully.
     *
     * @public
     * @field
     * @name onload
     * @type Function
     * @memberOf XMLHttpRequest0
     */
    $prototype.onload;

    /**
     * The onprogress handler is called each time the responseText is updated.
     *
     * @public
     * @field
     * @name onprogress
     * @type Function
     * @memberOf XMLHttpRequest0
     */
    $prototype.onprogress;

    /**
     * The onredirectallowed handler is setup in the appropriate layer(WS or SSE)
     * above the transport based on whether the support for HTTP redirect policy
     * is present. This function is typically used to confirm whether the redirect
     * is allowed based on the specified policy.
     *
     * @public
     * @field
     * @name onredirectallowed
     * @type Function
     * @param originalLoc {String}
     * @param redirectLoc {String}
     * @return {boolean} true, if redirect is allowed; otherwise false
     * @memberOf XMLHttpRequest0
     */
    $prototype.onredirectallowed;

    /**
     * Opens the request.
     *
     * @param {String} method    the request method
     * @param {String} location  the request location
     * @param {boolean} async    whether or not the request is asynchronous
     *
     * @return {void}
     *
     * @public
     * @function
     * @name open
     * @memberOf XMLHttpRequest0
     */
    $prototype.open = function(method, location, async) {
        if (!async) {
            throw new Error("Asynchronous is required for cross-origin XMLHttpRequest emulation");
        }
        
        switch (this.readyState) {
          case 0:
          case 4:
            break;
          default:
            throw new Error("Invalid ready state");
        }

        var $this = this;
        this._method = method;
        this._location = location;
        this.readyState = 1;

        // reset properties
        // in case of reuse        
        this.status = 0;
        this.statusText = "";
        this.responseText = "";

    	var xhr;
    	var targetURI = new URI(location);
    	if (targetURI.port == null) {
    		targetURI.port = defaultPorts[targetURI.scheme];
    		targetURI.authority = targetURI.host + ":" + targetURI.port;
        }
    	if (browser == "ie" && typeof(XDomainRequest) !== "undefined" &&     
        		targetURI.scheme == locationURI.scheme &&
        		!this.withCredentials) {
        	//use XDR?
        	xhr = new XDRHttpDirect(this);

        }
        else if(targetURI.scheme == locationURI.scheme && targetURI.authority == locationURI.authority) {
        	//same origin - use XMLHttpDirect
        	try {
        		xhr = new XMLHttpBridge(this);    // use XMLHttpDirect  new XMLHttpDirect(this);
        	} catch (e) {
        		xhr = new XMLHttpBridge(this);
        	}
        }
        else {
        	//use bridge
        	xhr = new XMLHttpBridge(this);
        }
        
        xhr.onload = onload;
        xhr.onprogress = onprogress;
        xhr.onreadystatechange = onreadystatechange;
        xhr.onerror = onerror;
        xhr.open(method,location);
        
        this.xhr = xhr;
        setTimeout(function() {
            if ($this.readyState > 1) {
               return; // readystatechange already fired for readyState=2 or bigger vaue
            }
            if ($this.readyState < 1) {	
                $this.readyState = 1; // opened
            }
            onreadystatechange($this); 
        }, 0);
    }
    
    /**
     * Sets the request header.
     *
     * @param {String} label  the request header name
     * @param {String} value  the request header value
     *
     * @return {void}
     *
     * @public
     * @function
     * @name setRequestHeader
     * @memberOf XMLHttpRequest0
     */
    $prototype.setRequestHeader = function(label, value) {
        if (this.readyState !== 1) {
            throw new Error("Invalid ready state");
        }
        
        this._requestHeaders.push([label, value]);
    }
    
    /**
     * Sends the request payload.
     *
     * @param {String} payload  the request payload
     *
     * @return {void}
     *
     * @public
     * @function
     * @name send
     * @memberOf XMLHttpRequest0
     */
    $prototype.send = function(payload) {
        if (this.readyState !== 1) {
            throw new Error("Invalid ready state");
        }
        
        // allow handler to be assigned after open completes
        var $this = this;
        setTimeout(function() {
            if ($this.readyState > 2) {
                return; // readystatechange already fired for readyState=2
            }
            if ($this.readyState < 2) {
                $this.readyState = 2;
            }
            onreadystatechange($this); 
        }, 0);
        
        this.xhr.send(payload);
    }
    
    /**
     * Aborts the request.
     *
     * @return {void}
     *
     * @public
     * @function
     * @name abort
     * @memberOf XMLHttpRequest0
     */
    $prototype.abort = function() {
    	this.xhr.abort();
    }
    
    /**
     * Returns the response header.
     *
     * @param {String} label  the response header name
     *
     * @return {String}  the response header value
     *
     * @public
     * @function
     * @name getResponseHeader
     * @memberOf XMLHttpRequest0
     */
    $prototype.getResponseHeader = function(label) {
        if (this.status == 0) {
            throw new Error("Invalid ready state");
        }

        var headers = this._responseHeaders;
        return headers[label];
    }
    
    /**
     * Returns the response header.
     *
     * @return {String}  all response header values
     *
     * @public
     * @function
     * @name getAllResponseHeaders
     * @memberOf XMLHttpRequest0
     */
    $prototype.getAllResponseHeaders = function() {
        if (this.status == 0) {
            throw new Error("Invalid ready state");
        }
        
        return this._responseHeaders;
    }
    
    return XMLHttpRequest0;
})();
    
    



var coverNativeSSE = true;
if (coverNativeSSE || typeof(window.EventSource) === "undefined") {
    var EventSource = (function() {
        /**
         * Creates a new EventSource instance and connects to the stream location.
         *
         * @param {String} location      the stream location
         *
         * @constructor
         * @name EventSource
         * 
         * @class  EventSource provides a text-based stream abstraction for JavaScript.
         */
        function EventSource(location) {
            this.lastEventId = null;
            this.immediate = false;
            this.retry = 3000;  // default retry to 3s
            
            // determine event source origin
            var locationURI = new URI(location);
            var defaultPorts = { "http":80, "https":443 };
            if (locationURI.port == null) {
                locationURI.port = defaultPorts[locationURI.scheme];
                locationURI.authority = locationURI.host + ":" + locationURI.port;
            }
            this.origin = locationURI.scheme + "://" + locationURI.authority;
            
            this.location = location;
            this.lineQueue = [];
            
            this.xhr = null;
            this.reconnectTimer = null;
            
            // allow onopen to be assigned before triggering
            var $this = this;
            setTimeout(function() { _connect($this, false) }, 0);
        }
        
        var $prototype = EventSource.prototype;
        
        /**
         * The ready state indicates the stream status, 
         * Possible values are 0 (CONNECTING), 1 (OPEN) and 2 (CLOSED)
         *
         * @public
         * @field
         * @name readyState
         * @type Number
         * @memberOf EventSource#
         */
        $prototype.readyState = 0;

        /**
         * The onopen handler is called when the stream is established.
         *
         * @public
         * @field
         * @name onopen
         * @type Function
         * @memberOf EventSource#
         */
        $prototype.onopen = function() {};
        
        /**
         * The onmessage handler is called when data arrives.
         *
         * @public
         * @field
         * @name onmessage
         * @type Function
         * @memberOf EventSource#
         */
        $prototype.onmessage = function(event) {};

        /**
         * The onerror handler is called when the stream has a network or server error.
         *
         * @public
         * @field
         * @name onerror
         * @type Function
         * @memberOf EventSource#
         */
        $prototype.onerror = function() {};

        /**
         * Disconnects the stream.
         *
         * @return {void}
         *
         * @public
         * @function
         * @name disconnect
         * @memberOf EventSource#
         */
        $prototype.disconnect = function() {
            // disconnect only if not already disconnected
            if (this.readyState !== 2) {
                _disconnect(this);
            }
        };
        
        function _connect($this, immediate, queryParams) {
            // ensure reconnect timer is null
            if ($this.reconnectTimer !== null) {
                $this.reconnectTimer = null;
            }
            
            // construct XDR destination
            var connectURI = new URI($this.location);
            if (queryParams === undefined){ 
                queryParams = [];
            }
            if ($this.lastEventId !== null) {
                queryParams.push(".ka=" + this.lastEventId);
            }
            
            // check for existing threshold
            if ($this.location.indexOf("&.kb=") === -1 && $this.location.indexOf("?.kb=") === -1) {
                queryParams.push(".kb=512");  // stream threshold in KB
            }
                
            switch (browser) {
            case 'ie':
            case 'safari':
                // TODO: "safari" seems to work without the padding, 
                //       but might only be for recent versions
                queryParams.push(".kp=256");  // stream padding in bytes
                break;
            case 'firefox':
                queryParams.push(".kp=1025");  // stream padding in bytes
                
                // FF will not open multiple "GET" streams to the same URI
                queryParams.push(String(Math.random()).substring(2));
                break;

            case 'android':
                // Android requires 4K buffer to start (on 2.2.1), 
                // plus 4K buffer to be filled since previous message
                queryParams.push(".kp=4096");  // "initial padding" in bytes
                queryParams.push(".kbp=4096"); // "block padding" in bytes
                break;
            }
           
            if (queryParams.length > 0) {
                if (connectURI.query === undefined) {
                   connectURI.query = queryParams.join("&");
                }
                else {
                   connectURI.query += "&" + queryParams.join("&");
                }
            }

            // initialize CS-XHR (FF3.5 cannot reuse CS-XHRs)
            var xhr = $this.xhr = new XMLHttpRequest0();
            var progress = { "xhr":xhr, "position":0 };
    
            // attach listeners and send request
            // if in proxy mode and not secure, don't attach progress handler
            // this prevents use of iframe for IE, allowing us to detect timeout
            if ($this.location.indexOf(".ki=p") == -1 || $this.location.indexOf("https://") == 0) {
                xhr.onprogress = function() { 
                    // FF 3.5 updates responseText after onprogress
                    setTimeout(function() {_process($this, progress); }, 0);
                };
            }

            xhr.onload = function() { 
                _process($this, progress);
                if ($this.xhr == progress.xhr && $this.readyState != 2) { // CLOSED
                    _reconnect($this);
                }
            };
            xhr.onerror = function() {
                if ($this.readyState != 2) { // CLOSED
                    _disconnect($this);
                    _error($this);
                   }
            };
            xhr.ontimeout = function() { 
                if ($this.readyState != 2) { // CLOSED
                    _disconnect($this);
                    _error($this);
                   }
            };
            xhr.onreadystatechange = function() {
                if (!immediate) {
                    if (xhr.readyState >= 3) {
                        $this.readyState = 1; // OPEN
                        if (typeof($this.onopen) === "function") {
                            $this.onopen();
                        }
                        xhr.onreadystatechange = function() {};
                    }
                }
            };
            
            // FF 3.5 requires onprogress handler attached before calling open()
            // FF will not open multiple "GET" streams to the same URI (see random query param above)
            xhr.open("GET", connectURI.toString(), true);

            xhr.send(null);
            
            // TODO: use ontimeout instead if it means timeout to start response (not complete response)
            // if an intermediate transparent proxy defeats HTTP streaming response
            // then force proxy mode, resulting in either HTTPS streaming or long-polling
            if ($this.location.indexOf(".ki=p") == -1) {
                setTimeout(function() {
                    // successful XHR streaming mode will already be in XHR readyState 3
                    // and EventSource is not disconnected if SSE readyState < 2
                    if(xhr.readyState < 3 && $this.readyState < 2) {
                        // force proxy mode on the location (reused by reconnects)
                        // reconnect in force proxy mode
                        _connect($this, false, new Array(".ki=p"));
                    }
                }, 
                3000);
            }
        }
        
        function _disconnect($this) {
            if ($this.reconnectTimer !== null) {
                clearTimeout($this.reconnectTimer);
                $this.reconnectTimer = null;
            }
            
            $this.lineQueue = [];
            $this.lastEventId = null;
            $this.location = null;
            $this.readyState = 2; // CLOSED
            
            if ($this.xhr !== null) {
                $this.xhr.onprogress = function() { };
                $this.xhr.onload = function() { };
                $this.xhr.onerror = function() { };
                $this.xhr.onreadystatechange = function() {};
                $this.xhr.abort();
            }
        }

        function _reconnect($this) {
            $this.readyState = 0; // CONNECTING
            
            // schedule connect after retry milliseconds, unless disconnected
            if ($this.location !== null) {
                var delay = $this.retry;
                var immediate = $this.immediate;
                if (immediate) {
                    $this.immediate = false;
                    delay = 0;
                }
                else {
                    _error($this);
                }
                
                // onerror callback can disconnect
                // so verify readyState before scheduling reconnect
                if ($this.readyState == 0) {
                    $this.reconnectTimer = setTimeout(function() { _connect($this, immediate); }, delay);
                }
            }
        }
    
        // end of line can be \r, \n or \r\n
        var linesPattern = /[^\r\n]+|\r\n|\r|\n/g;
        
        function _process($this, progress) {
            var responseText = progress.xhr.responseText;
            var progressText = responseText.slice(progress.position);
            
            // return an array of line data interspersed with end-of-line sequences
            var matchInfo = progressText.match(linesPattern) || [];
            var lineQueue = $this.lineQueue;
    
            // walk the array of matches, dispatching events
            var lineInfo = "";
            while (matchInfo.length > 0) {
                var matchItem = matchInfo.shift();
                switch (matchItem.charAt(0)) {
                case '\r':
                case '\n':
                        // advance the pointer only on the new line in the data
                    progress.position += lineInfo.length + matchItem.length;
                    // end-of-line sequence detected
                    if (lineInfo === "") {
                        // empty line, dispatch line queue as complete event
                        _dispatch($this);
                    }
                    else {
                        // non-empty line, add to line queue
                        lineQueue.push(lineInfo);
                        lineInfo = "";
                    }
                    break;
                default:
                    // line data detected
                    lineInfo = matchItem;
                    break;
                }
            }
        }
    
        function _dispatch($this) {
            var data = "";
            var name = "message";
            var lineQueue = $this.lineQueue;
    
            // process line queue as a complete event
            while (lineQueue.length > 0) {
                var line = lineQueue.shift();
    
                var field = null;
                var value = "";
    
                var colonAt = line.indexOf(':');
                if (colonAt == -1) {
                    // no colon, line is field name with empty value
                    field = line;
                    value = "";
                }
                else if (colonAt === 0) {
                    // leading colon indicates comment line
                    continue;
                }
                else {
                    // field:[ ]value
                    field = line.slice(0, colonAt);
                    
                    var valueAt = colonAt + 1;
                    if (line.charAt(valueAt) == " ") {
                        valueAt++;
                    }
                    value = line.slice(valueAt);
                }
    
                // process field of completed event            
                switch (field) {
                  case "event":
                    name = value;
                    break;
                  case "id":
                    $this.lastEventId = value;
                    break;
                  case "retry":
                    value = parseInt(value, 10);
                    if (!isNaN(value)) {
                        $this.retry = value;
                    }
                    break;
                  case "data":
                    if (data.length > 0) {
                        data += "\n";
                    }
                    data += value;
                    break;
                  case "location":
                    if (value != "") {
                       $this.location = value;
                    }
                    break;
                  case "reconnect":
                    $this.immediate = true;
                    break;
                  default:
                    // ignore other field names
                    break;
                }
            }
    
            // dispatch if the data is non-null, or the event name is specified and not "message"        
            if (data.length > 0 || (name.length > 0 && name != "message")) {
                var e = document.createEvent("Events");
                e.initEvent(name, true, true);
                e.lastEventId = $this.lastEventId;
                e.data = data;
                e.origin = $this.origin;
    
                // ie8 fails on assigning event source (already null, readonly)             
                if (e.source !== null) {
                    e.source = null;
                }
    
                if (typeof($this.onmessage) === "function") {
                    $this.onmessage(e);
                }
            }
        }

        function _error($this) {
            var e = document.createEvent("Events");
            e.initEvent("error", true, true);
            if (typeof($this.onerror) === "function") {
                $this.onerror(e);
            }
        }
        
        return EventSource;
    })();
} else {
    // overwrite native EventSource with cross-origin bridged version
    window.EventSource = (function() {
        // emulating cross-origin EventSource uses postMessage
        //
        //  init
        //      -> I
        //
        //  connect
        //      -> c
        //
        //  event
        //      <- E 
        //          id (byte)
        //          event name (length prefixed string)
        //          event data (length prefixed string)


        var pipes = {};
        var registry = {};
        var nextId = 0;


        function EventSource(location) {
            this.readyState = 0;

            // attach this instance to the pipe
            var id = register(this);
            var pipe = supplyPipe(this, location);
            pipe.attach(id);

            // connect message
            var message = ["c", id, toPaddedHex(location.length, 4), location].join("");
            pipe.post(message);

            this._id = id;
            this._pipe = pipe;
        }

        var $prototype = EventSource.prototype;

        $prototype.disconnect = function() {
            var pipe = this._pipe;
            if (pipe !== undefined) {
                //    - abort -
                //    --> "a" 00000001
                pipe.post(["a", this._id].join(""));
                pipe.detach(this._id);
            }
            this.readyState = 2;
        }

        function register($this) {
            var id = toPaddedHex(nextId++, 8);
            registry[id] = $this;
            $this._id = id;
            return id;
        }

        function supplyPipe($this, location) {
            var uri = new URI(location);
            var hasTargetOrigin = (uri.scheme != null && uri.authority != null);
            var targetScheme = hasTargetOrigin ? uri.scheme : locationURI.scheme;
            var targetAuthority = hasTargetOrigin ? uri.authority : locationURI.authority;
            if (targetAuthority != null && uri.port == null) {
                targetAuthority = uri.host + ":" + defaultPorts[targetScheme];
            }
            var targetOrigin = targetScheme + "://" + targetAuthority;
            var pipe = pipes[targetOrigin];
            if (pipe === undefined) {
                var iframe = document.createElement("iframe");
                iframe.style.position = "absolute";
                iframe.style.left = "-10px";
                iframe.style.top = "10px";
                iframe.style.visibility = "hidden";
                iframe.style.width = "0px";
                iframe.style.height = "0px";
                
                var bridgeURI = new URI(targetOrigin);
                bridgeURI.query = ".kr=xse&.kv=10.05";  // cross-site bridge
                bridgeURI.path = "/";
                iframe.src = bridgeURI.toString();
                
                function post(message) {
                    this.buffer.push(message);
                }
                
                function attach(id) {
                    // lookup previously attached entry
                    var entry = this.attached[id];
                    
                    // attach new entry if necessary 
                    if (entry === undefined) {
                        entry = {};
                        this.attached[id] = entry;
                    }
                    
                    // cancel entry cleanup if necessary
                    if (entry.timerID !== undefined) {
                        clearTimeout(entry.timerID);
                        delete entry.timerID;
                    }
                }
                
                function detach(id) {
                    // lookup previously attached entry
                    var entry = this.attached[id];
                    
                    // schedule entry cleanup if necessary
                    if (entry !== undefined && entry.timerID === undefined) {
                        var $this = this;
                        entry.timerID = setTimeout(function() {
                            // detach entry
                            delete $this.attached[id];
                            
                            // send message to cleanup delegate instance
                            // Note: do not use $this.post in case pipe has changed
                            //    - delete -
                            //    --> "d" 00000001
                            postMessage0(pipe.iframe.contentWindow, ["d", id].join(""), pipe.targetOrigin);
                        }, 10000);
                    }
                }
                
                pipe = {'targetOrigin':targetOrigin, 'iframe':iframe, 'buffer':[], 'post':post, 'attach':attach, 'detach':detach, 'attached':{count:0}};
                pipes[targetOrigin] = pipe;

                // initialize postMessage from parent
                function sendInitWhenReady() {
                    var targetWindow = iframe.contentWindow;
                    if (!targetWindow) {
                        setTimeout(sendInitWhenReady, 20);
                    }
                    else {
                        postMessage0(targetWindow, "I", targetOrigin);
                    }
                }
                
                // 30 sec timeout for cross-origin iframe wrapper initialization
                // TODO: cancel timerID when "I" arrives from embedded iframe
                pipe.handshakeID = setTimeout(function() {
                      // when timeout occurs, then clearing previously associated
                      // targetOrigin pipe because we cannot wait for success to
                      // associate the targetOrigin pipe, otherwise 2 parallel requests  
                      // in-flight could have different pipes for same targetOrigin
                      // and we require them to have the same pipe for the same targetOrigin
                    pipes[targetOrigin] = undefined;
                        pipe.post = function(message) {
                        // pipe.post will first be called
                        // when XMLHttpRequest0.send() is called
                        // triggering the onerror callback
                        // TODO understand and change this
                        $this.readyState = 4; // loaded
                        $this.status = 0; // error
                        onreadystatechange($this); 
                       }
                       // if already attempting to send,
                       // then trigger onerror callback
                       if (pipe.buffer.length > 0) {
                           pipe.post();
                       }
                }, 30000);

                // append the iframe to trigger the HTTP request
                // successful handshake will receive "I" message from iframe
                document.body.appendChild(iframe);

                // delay calling until after iframe appended, otherwise
                // this produces a general error on IE
                sendInitWhenReady();
            }
            
            return pipe;
        }

        function onmessage(event) {
            var origin = event.origin;
            var defaultPorts = {"http":":80", "https": ":443"};
            var originParts = origin.split(":");
            if (originParts.length === 2) {
                origin += defaultPorts[originParts[0]];
            }
            var pipe = pipes[origin];
            
            if (pipe !== undefined && pipe.iframe !== undefined && event.source == pipe.iframe.contentWindow) {
                if (event.data == "I") {
                    // now that cross-domain pipeline has been established,
                    // clear the handshake timer, flush buffered messages and update post function
                    clearTimeout(pipe.handshakeID);
                    var message;
                    while ((message = pipe.buffer.shift()) !== undefined) {
                        postMessage0(pipe.iframe.contentWindow, message, pipe.targetOrigin);
                    }
                    pipe.post = function(message) {
                        postMessage0(pipe.iframe.contentWindow, message, pipe.targetOrigin);
                    }
                }
                else {
                    var message = event.data;
                    if (message.length >= 9) {
                        var position = 0;
                        var type = message.substring(position, position += 1);
                        var id = message.substring(position, position += 8);
                        var eventsource = registry[id];
                        if (eventsource !== undefined) {
                            switch (type) {
                            case "D":
                                // data
                                // d id, nameLength, name, dataLength, data
                                var nameLength = fromHex(message.substring(position, position += 4));
                                var name = message.substring(position, position += nameLength);
                                var dataLength = fromHex(message.substring(position, position += 4));
                                var data = message.substring(position, position += dataLength);

                                // dispatch if the data is non-null, or 
                                // the event name is specified and not "message"
                                if (data.length > 0 || (name.length > 0 && name != "message")) {
                                    var e = document.createEvent("Events");
                                    e.initEvent(name, true, true);
                                    e.lastEventId = eventsource.lastEventId;
                                    e.data = data;
                                    e.origin = eventsource.origin;

                                    if (typeof(eventsource.onmessage) === "function") {
                                        eventsource.onmessage(e);
                                    }
                                }

                                break;
                            case "O":
                                // open event
                                eventsource.readyState = 1;
                                eventsource.onopen();
                                break;
                            case "E":
                                //    - error -
                                //    <-- "e" 00000001
                                if (eventsource._id === id) {
                                    eventsource.onerror();
                                }
                                break;
                            }
                        }
                    }
                }
            } else {
                //throw new Error("Could not perform x-domain EventSource emulation: message pipe not found");
            }
        }



        function fromHex(formatted) {
            return parseInt(formatted, 16);
        }
        
        function toPaddedHex(value, width) {
            var hex = value.toString(16);
            var parts = [];
            width -= hex.length;
            while (width-- > 0) {
                parts.push("0");
            }
            parts.push(hex);
            return parts.join("");
        }

    // attach message processing
    window.addEventListener("message", onmessage, false);

        return EventSource;
    })();


}
