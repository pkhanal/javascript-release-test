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
function URI(a){a=a||"";var b=0,c=a.indexOf("://");if(-1!=c){this.scheme=a.slice(0,c),b=c+3;var d=a.indexOf("/",b);-1==d&&(d=a.length,a+="/");var e=a.slice(b,d);this.authority=e,b=d,this.host=e;var f=e.indexOf(":");if(-1!=f&&(this.host=e.slice(0,f),this.port=parseInt(e.slice(f+1),10),isNaN(this.port)))throw new Error("Invalid URI syntax")}var g=a.indexOf("?",b);-1!=g&&(this.path=a.slice(b,g),b=g+1);var h=a.indexOf("#",b);-1!=h?(-1!=g?this.query=a.slice(b,h):this.path=a.slice(b,h),b=h+1,this.fragment=a.slice(b)):-1!=g?this.query=a.slice(b):this.path=a.slice(b)}var browser=null;if("undefined"!=typeof ActiveXObject)browser=-1!=navigator.userAgent.indexOf("MSIE 10")?"chrome":"ie";else if(-1!=navigator.userAgent.indexOf("Trident/7")&&-1!=navigator.userAgent.indexOf("rv:11"))browser="chrome";else if("[object Opera]"==Object.prototype.toString.call(window.opera))browser="opera";else if(-1!=navigator.vendor.indexOf("Apple"))browser="safari",(-1!=navigator.userAgent.indexOf("iPad")||-1!=navigator.userAgent.indexOf("iPhone"))&&(browser.ios=!0);else if(-1!=navigator.vendor.indexOf("Google"))browser=-1!=navigator.userAgent.indexOf("Android")&&-1==navigator.userAgent.indexOf("Chrome")?"android":"chrome";else{if("Gecko"!=navigator.product||!window.find||navigator.savePreferences)throw new Error("couldn't detect browser");browser="firefox"}!function(){var a=URI.prototype;a.toString=function(){var a=[],b=this.scheme;if(void 0!==b){a.push(b),a.push("://"),a.push(this.host);var c=this.port;void 0!==c&&(a.push(":"),a.push(c.toString()))}return void 0!==this.path&&a.push(this.path),void 0!==this.query&&(a.push("?"),a.push(this.query)),void 0!==this.fragment&&(a.push("#"),a.push(this.fragment)),a.join("")};var b={http:80,ws:80,https:443,wss:443};URI.replaceProtocol=function(a,b){var c=a.indexOf("://");return c>0?b+a.substr(c):""}}(),function(){function a(){var b=new URI("ie"==browser?document.URL:location.href),c={http:80,https:443};if(null==b.port&&(b.port=c[b.scheme],b.authority=b.host+":"+b.port),0==(b.fragment||"").length)return void setTimeout(a,20);var d=unescape(b.fragment),e=d.split(","),f=e.shift(),g=e.shift(),h=unescape(e.shift()),i=b.scheme+"://"+b.authority;sourceBridge=parent,"undefined"!=typeof ActiveXObject&&(sourceBridge=sourceBridge.opener);var j=sourceBridge.parent;try{j.location.hash}catch(k){document.domain=document.domain;try{j.location.hash}catch(l){return void location.reload()}}var m=j.postMessage0;"undefined"!=typeof m&&setTimeout(function(){m.attach(j.parent,f,g,window,parent,h)},0)}var b;window.onload=a,window.onunload=function(){if(void 0!=sourceBridge){var a=sourceBridge.parent;try{var b=a.postMessage0;"undefined"!=typeof b&&b.detach(a.parent)}catch(c){}}}}();