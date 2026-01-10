const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./web-M2IUKxrF.js","./vendor-capacitor-Bm7NWSxP.js","./vendor-firebase-B8qz7irO.js","./vendor-react-1wgkHQEd.js","./web-BcY0cBRu.js","./App-Cnx-z95_.js","./App-DL08hcqP.css"])))=>i.map(i=>d[i]);
import{r as $e,_ as de,C as je}from"./vendor-capacitor-Bm7NWSxP.js";import{r as qe,g as ze,a as Ct}from"./vendor-react-1wgkHQEd.js";import{a6 as ie,a7 as ae,a8 as ce,a9 as Pt,aa as It,ab as Ot,ac as Ke,ad as F,ae as Y,af as Dt,ag as We,ah as St,ai as Nt,aj as xt,ak as Ut,al as Lt,am as B,an as Bt,ao as Ve,ap as Mt,aq as Ft,ar as Ht,g as $t,as as jt,at as qt,au as zt,av as Kt,aw as Wt,a5 as Vt,Y as Gt,a2 as Xt,a3 as Yt,a0 as Jt}from"./vendor-firebase-B8qz7irO.js";function Zt(e,t){for(var n=0;n<t.length;n++){const r=t[n];if(typeof r!="string"&&!Array.isArray(r)){for(const o in r)if(o!=="default"&&!(o in e)){const s=Object.getOwnPropertyDescriptor(r,o);s&&Object.defineProperty(e,o,s.get?s:{enumerable:!0,get:()=>r[o]})}}}return Object.freeze(Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}))}(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))r(o);new MutationObserver(o=>{for(const s of o)if(s.type==="childList")for(const i of s.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&r(i)}).observe(document,{childList:!0,subtree:!0});function n(o){const s={};return o.integrity&&(s.integrity=o.integrity),o.referrerPolicy&&(s.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?s.credentials="include":o.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function r(o){if(o.ep)return;o.ep=!0;const s=n(o);fetch(o.href,s)}})();var te={exports:{}},x={};/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var ve;function Qt(){if(ve)return x;ve=1;var e=qe(),t=Symbol.for("react.element"),n=Symbol.for("react.fragment"),r=Object.prototype.hasOwnProperty,o=e.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,s={key:!0,ref:!0,__self:!0,__source:!0};function i(c,a,u){var l,h={},g=null,_=null;u!==void 0&&(g=""+u),a.key!==void 0&&(g=""+a.key),a.ref!==void 0&&(_=a.ref);for(l in a)r.call(a,l)&&!s.hasOwnProperty(l)&&(h[l]=a[l]);if(c&&c.defaultProps)for(l in a=c.defaultProps,a)h[l]===void 0&&(h[l]=a[l]);return{$$typeof:t,type:c,key:g,ref:_,props:h,_owner:o.current}}return x.Fragment=n,x.jsx=i,x.jsxs=i,x}var Ce;function en(){return Ce||(Ce=1,te.exports=Qt()),te.exports}var Pe=en(),Ge=qe();const Xe=ze(Ge),fo=Zt({__proto__:null,default:Xe},[Ge]);var $={},Ie;function tn(){if(Ie)return $;Ie=1;var e=Ct();return $.createRoot=e.createRoot,$.hydrateRoot=e.hydrateRoot,$}var nn=tn();const rn=ze(nn);var Oe;(function(e){e.IndexedDbLocal="INDEXED_DB_LOCAL",e.InMemory="IN_MEMORY",e.BrowserLocal="BROWSER_LOCAL",e.BrowserSession="BROWSER_SESSION"})(Oe||(Oe={}));var De;(function(e){e.APPLE="apple.com",e.FACEBOOK="facebook.com",e.GAME_CENTER="gc.apple.com",e.GITHUB="github.com",e.GOOGLE="google.com",e.MICROSOFT="microsoft.com",e.PLAY_GAMES="playgames.google.com",e.TWITTER="twitter.com",e.YAHOO="yahoo.com",e.PASSWORD="password",e.PHONE="phone"})(De||(De={}));const Se=$e("FirebaseAuthentication",{web:()=>de(()=>import("./web-M2IUKxrF.js"),__vite__mapDeps([0,1,2,3]),import.meta.url).then(e=>new e.FirebaseAuthenticationWeb)}),on=$e("FirebaseAppCheck",{web:()=>de(()=>import("./web-BcY0cBRu.js"),__vite__mapDeps([4,1,2,3]),import.meta.url).then(e=>new e.FirebaseAppCheckWeb)});/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ye="firebasestorage.googleapis.com",Je="storageBucket",sn=120*1e3,an=600*1e3;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class p extends Ot{constructor(t,n,r=0){super(ne(t),`Firebase Storage: ${n} (${ne(t)})`),this.status_=r,this.customData={serverResponse:null},this._baseMessage=this.message,Object.setPrototypeOf(this,p.prototype)}get status(){return this.status_}set status(t){this.status_=t}_codeEquals(t){return ne(t)===this.code}get serverResponse(){return this.customData.serverResponse}set serverResponse(t){this.customData.serverResponse=t,this.customData.serverResponse?this.message=`${this._baseMessage}
${this.customData.serverResponse}`:this.message=this._baseMessage}}var f;(function(e){e.UNKNOWN="unknown",e.OBJECT_NOT_FOUND="object-not-found",e.BUCKET_NOT_FOUND="bucket-not-found",e.PROJECT_NOT_FOUND="project-not-found",e.QUOTA_EXCEEDED="quota-exceeded",e.UNAUTHENTICATED="unauthenticated",e.UNAUTHORIZED="unauthorized",e.UNAUTHORIZED_APP="unauthorized-app",e.RETRY_LIMIT_EXCEEDED="retry-limit-exceeded",e.INVALID_CHECKSUM="invalid-checksum",e.CANCELED="canceled",e.INVALID_EVENT_NAME="invalid-event-name",e.INVALID_URL="invalid-url",e.INVALID_DEFAULT_BUCKET="invalid-default-bucket",e.NO_DEFAULT_BUCKET="no-default-bucket",e.CANNOT_SLICE_BLOB="cannot-slice-blob",e.SERVER_FILE_WRONG_SIZE="server-file-wrong-size",e.NO_DOWNLOAD_URL="no-download-url",e.INVALID_ARGUMENT="invalid-argument",e.INVALID_ARGUMENT_COUNT="invalid-argument-count",e.APP_DELETED="app-deleted",e.INVALID_ROOT_OPERATION="invalid-root-operation",e.INVALID_FORMAT="invalid-format",e.INTERNAL_ERROR="internal-error",e.UNSUPPORTED_ENVIRONMENT="unsupported-environment"})(f||(f={}));function ne(e){return"storage/"+e}function fe(){const e="An unknown error occurred, please check the error payload for server response.";return new p(f.UNKNOWN,e)}function cn(e){return new p(f.OBJECT_NOT_FOUND,"Object '"+e+"' does not exist.")}function un(e){return new p(f.QUOTA_EXCEEDED,"Quota for bucket '"+e+"' exceeded, please view quota on https://firebase.google.com/pricing/.")}function ln(){const e="User is not authenticated, please authenticate using Firebase Authentication and try again.";return new p(f.UNAUTHENTICATED,e)}function hn(){return new p(f.UNAUTHORIZED_APP,"This app does not have permission to access Firebase Storage on this project.")}function dn(e){return new p(f.UNAUTHORIZED,"User does not have permission to access '"+e+"'.")}function fn(){return new p(f.RETRY_LIMIT_EXCEEDED,"Max retry time for operation exceeded, please try again.")}function pn(){return new p(f.CANCELED,"User canceled the upload/download.")}function gn(e){return new p(f.INVALID_URL,"Invalid URL '"+e+"'.")}function _n(e){return new p(f.INVALID_DEFAULT_BUCKET,"Invalid default bucket '"+e+"'.")}function mn(){return new p(f.NO_DEFAULT_BUCKET,"No default bucket found. Did you set the '"+Je+"' property when initializing the app?")}function wn(){return new p(f.CANNOT_SLICE_BLOB,"Cannot slice blob for upload. Please retry the upload.")}function bn(){return new p(f.NO_DOWNLOAD_URL,"The given file does not have any download URLs.")}function Tn(e){return new p(f.UNSUPPORTED_ENVIRONMENT,`${e} is missing. Make sure to install the required polyfills. See https://firebase.google.com/docs/web/environments-js-sdk#polyfills for more information.`)}function ue(e){return new p(f.INVALID_ARGUMENT,e)}function Ze(){return new p(f.APP_DELETED,"The Firebase app was deleted.")}function kn(e){return new p(f.INVALID_ROOT_OPERATION,"The operation '"+e+"' cannot be performed on a root reference, create a non-root reference using child, such as .child('file.png').")}function L(e,t){return new p(f.INVALID_FORMAT,"String does not match format '"+e+"': "+t)}function U(e){throw new p(f.INTERNAL_ERROR,"Internal error: "+e)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class E{constructor(t,n){this.bucket=t,this.path_=n}get path(){return this.path_}get isRoot(){return this.path.length===0}fullServerUrl(){const t=encodeURIComponent;return"/b/"+t(this.bucket)+"/o/"+t(this.path)}bucketOnlyServerUrl(){return"/b/"+encodeURIComponent(this.bucket)+"/o"}static makeFromBucketSpec(t,n){let r;try{r=E.makeFromUrl(t,n)}catch{return new E(t,"")}if(r.path==="")return r;throw _n(t)}static makeFromUrl(t,n){let r=null;const o="([A-Za-z0-9.\\-_]+)";function s(k){k.path.charAt(k.path.length-1)==="/"&&(k.path_=k.path_.slice(0,-1))}const i="(/(.*))?$",c=new RegExp("^gs://"+o+i,"i"),a={bucket:1,path:3};function u(k){k.path_=decodeURIComponent(k.path)}const l="v[A-Za-z0-9_]+",h=n.replace(/[.]/g,"\\."),g="(/([^?#]*).*)?$",_=new RegExp(`^https?://${h}/${l}/b/${o}/o${g}`,"i"),T={bucket:1,path:3},R=n===Ye?"(?:storage.googleapis.com|storage.cloud.google.com)":n,w="([^?#]*)",v=new RegExp(`^https?://${R}/${o}/${w}`,"i"),y=[{regex:c,indices:a,postModify:s},{regex:_,indices:T,postModify:u},{regex:v,indices:{bucket:1,path:2},postModify:u}];for(let k=0;k<y.length;k++){const H=y[k],Q=H.regex.exec(t);if(Q){const vt=Q[H.indices.bucket];let ee=Q[H.indices.path];ee||(ee=""),r=new E(vt,ee),H.postModify(r);break}}if(r==null)throw gn(t);return r}}class En{constructor(t){this.promise_=Promise.reject(t)}getPromise(){return this.promise_}cancel(t=!1){}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Rn(e,t,n){let r=1,o=null,s=null,i=!1,c=0;function a(){return c===2}let u=!1;function l(...w){u||(u=!0,t.apply(null,w))}function h(w){o=setTimeout(()=>{o=null,e(_,a())},w)}function g(){s&&clearTimeout(s)}function _(w,...v){if(u){g();return}if(w){g(),l.call(null,w,...v);return}if(a()||i){g(),l.call(null,w,...v);return}r<64&&(r*=2);let y;c===1?(c=2,y=0):y=(r+Math.random())*1e3,h(y)}let T=!1;function R(w){T||(T=!0,g(),!u&&(o!==null?(w||(c=2),clearTimeout(o),h(0)):w||(c=1)))}return h(0),s=setTimeout(()=>{i=!0,R(!0)},n),R}function yn(e){e(!1)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function An(e){return e!==void 0}function vn(e){return typeof e=="object"&&!Array.isArray(e)}function pe(e){return typeof e=="string"||e instanceof String}function Ne(e){return ge()&&e instanceof Blob}function ge(){return typeof Blob<"u"}function xe(e,t,n,r){if(r<t)throw ue(`Invalid value for '${e}'. Expected ${t} or greater.`);if(r>n)throw ue(`Invalid value for '${e}'. Expected ${n} or less.`)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function _e(e,t,n){let r=t;return n==null&&(r=`https://${t}`),`${n}://${r}/v0${e}`}function Qe(e){const t=encodeURIComponent;let n="?";for(const r in e)if(e.hasOwnProperty(r)){const o=t(r)+"="+t(e[r]);n=n+o+"&"}return n=n.slice(0,-1),n}var O;(function(e){e[e.NO_ERROR=0]="NO_ERROR",e[e.NETWORK_ERROR=1]="NETWORK_ERROR",e[e.ABORT=2]="ABORT"})(O||(O={}));/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Cn(e,t){const n=e>=500&&e<600,o=[408,429].indexOf(e)!==-1,s=t.indexOf(e)!==-1;return n||o||s}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Pn{constructor(t,n,r,o,s,i,c,a,u,l,h,g=!0,_=!1){this.url_=t,this.method_=n,this.headers_=r,this.body_=o,this.successCodes_=s,this.additionalRetryCodes_=i,this.callback_=c,this.errorCallback_=a,this.timeout_=u,this.progressCallback_=l,this.connectionFactory_=h,this.retry=g,this.isUsingEmulator=_,this.pendingConnection_=null,this.backoffId_=null,this.canceled_=!1,this.appDelete_=!1,this.promise_=new Promise((T,R)=>{this.resolve_=T,this.reject_=R,this.start_()})}start_(){const t=(r,o)=>{if(o){r(!1,new j(!1,null,!0));return}const s=this.connectionFactory_();this.pendingConnection_=s;const i=c=>{const a=c.loaded,u=c.lengthComputable?c.total:-1;this.progressCallback_!==null&&this.progressCallback_(a,u)};this.progressCallback_!==null&&s.addUploadProgressListener(i),s.send(this.url_,this.method_,this.isUsingEmulator,this.body_,this.headers_).then(()=>{this.progressCallback_!==null&&s.removeUploadProgressListener(i),this.pendingConnection_=null;const c=s.getErrorCode()===O.NO_ERROR,a=s.getStatus();if(!c||Cn(a,this.additionalRetryCodes_)&&this.retry){const l=s.getErrorCode()===O.ABORT;r(!1,new j(!1,null,l));return}const u=this.successCodes_.indexOf(a)!==-1;r(!0,new j(u,s))})},n=(r,o)=>{const s=this.resolve_,i=this.reject_,c=o.connection;if(o.wasSuccessCode)try{const a=this.callback_(c,c.getResponse());An(a)?s(a):s()}catch(a){i(a)}else if(c!==null){const a=fe();a.serverResponse=c.getErrorText(),this.errorCallback_?i(this.errorCallback_(c,a)):i(a)}else if(o.canceled){const a=this.appDelete_?Ze():pn();i(a)}else{const a=fn();i(a)}};this.canceled_?n(!1,new j(!1,null,!0)):this.backoffId_=Rn(t,n,this.timeout_)}getPromise(){return this.promise_}cancel(t){this.canceled_=!0,this.appDelete_=t||!1,this.backoffId_!==null&&yn(this.backoffId_),this.pendingConnection_!==null&&this.pendingConnection_.abort()}}class j{constructor(t,n,r){this.wasSuccessCode=t,this.connection=n,this.canceled=!!r}}function In(e,t){t!==null&&t.length>0&&(e.Authorization="Firebase "+t)}function On(e,t){e["X-Firebase-Storage-Version"]="webjs/"+(t??"AppManager")}function Dn(e,t){t&&(e["X-Firebase-GMPID"]=t)}function Sn(e,t){t!==null&&(e["X-Firebase-AppCheck"]=t)}function Nn(e,t,n,r,o,s,i=!0,c=!1){const a=Qe(e.urlParams),u=e.url+a,l=Object.assign({},e.headers);return Dn(l,t),In(l,n),On(l,s),Sn(l,r),new Pn(u,e.method,l,e.body,e.successCodes,e.additionalRetryCodes,e.handler,e.errorHandler,e.timeout,e.progressCallback,o,i,c)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function xn(){return typeof BlobBuilder<"u"?BlobBuilder:typeof WebKitBlobBuilder<"u"?WebKitBlobBuilder:void 0}function Un(...e){const t=xn();if(t!==void 0){const n=new t;for(let r=0;r<e.length;r++)n.append(e[r]);return n.getBlob()}else{if(ge())return new Blob(e);throw new p(f.UNSUPPORTED_ENVIRONMENT,"This browser doesn't seem to support creating Blobs")}}function Ln(e,t,n){return e.webkitSlice?e.webkitSlice(t,n):e.mozSlice?e.mozSlice(t,n):e.slice?e.slice(t,n):null}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Bn(e){if(typeof atob>"u")throw Tn("base-64");return atob(e)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const A={RAW:"raw",BASE64:"base64",BASE64URL:"base64url",DATA_URL:"data_url"};class re{constructor(t,n){this.data=t,this.contentType=n||null}}function Mn(e,t){switch(e){case A.RAW:return new re(et(t));case A.BASE64:case A.BASE64URL:return new re(tt(e,t));case A.DATA_URL:return new re(Hn(t),$n(t))}throw fe()}function et(e){const t=[];for(let n=0;n<e.length;n++){let r=e.charCodeAt(n);if(r<=127)t.push(r);else if(r<=2047)t.push(192|r>>6,128|r&63);else if((r&64512)===55296)if(!(n<e.length-1&&(e.charCodeAt(n+1)&64512)===56320))t.push(239,191,189);else{const s=r,i=e.charCodeAt(++n);r=65536|(s&1023)<<10|i&1023,t.push(240|r>>18,128|r>>12&63,128|r>>6&63,128|r&63)}else(r&64512)===56320?t.push(239,191,189):t.push(224|r>>12,128|r>>6&63,128|r&63)}return new Uint8Array(t)}function Fn(e){let t;try{t=decodeURIComponent(e)}catch{throw L(A.DATA_URL,"Malformed data URL.")}return et(t)}function tt(e,t){switch(e){case A.BASE64:{const o=t.indexOf("-")!==-1,s=t.indexOf("_")!==-1;if(o||s)throw L(e,"Invalid character '"+(o?"-":"_")+"' found: is it base64url encoded?");break}case A.BASE64URL:{const o=t.indexOf("+")!==-1,s=t.indexOf("/")!==-1;if(o||s)throw L(e,"Invalid character '"+(o?"+":"/")+"' found: is it base64 encoded?");t=t.replace(/-/g,"+").replace(/_/g,"/");break}}let n;try{n=Bn(t)}catch(o){throw o.message.includes("polyfill")?o:L(e,"Invalid character found")}const r=new Uint8Array(n.length);for(let o=0;o<n.length;o++)r[o]=n.charCodeAt(o);return r}class nt{constructor(t){this.base64=!1,this.contentType=null;const n=t.match(/^data:([^,]+)?,/);if(n===null)throw L(A.DATA_URL,"Must be formatted 'data:[<mediatype>][;base64],<data>");const r=n[1]||null;r!=null&&(this.base64=jn(r,";base64"),this.contentType=this.base64?r.substring(0,r.length-7):r),this.rest=t.substring(t.indexOf(",")+1)}}function Hn(e){const t=new nt(e);return t.base64?tt(A.BASE64,t.rest):Fn(t.rest)}function $n(e){return new nt(e).contentType}function jn(e,t){return e.length>=t.length?e.substring(e.length-t.length)===t:!1}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class C{constructor(t,n){let r=0,o="";Ne(t)?(this.data_=t,r=t.size,o=t.type):t instanceof ArrayBuffer?(n?this.data_=new Uint8Array(t):(this.data_=new Uint8Array(t.byteLength),this.data_.set(new Uint8Array(t))),r=this.data_.length):t instanceof Uint8Array&&(n?this.data_=t:(this.data_=new Uint8Array(t.length),this.data_.set(t)),r=t.length),this.size_=r,this.type_=o}size(){return this.size_}type(){return this.type_}slice(t,n){if(Ne(this.data_)){const r=this.data_,o=Ln(r,t,n);return o===null?null:new C(o)}else{const r=new Uint8Array(this.data_.buffer,t,n-t);return new C(r,!0)}}static getBlob(...t){if(ge()){const n=t.map(r=>r instanceof C?r.data_:r);return new C(Un.apply(null,n))}else{const n=t.map(i=>pe(i)?Mn(A.RAW,i).data:i.data_);let r=0;n.forEach(i=>{r+=i.byteLength});const o=new Uint8Array(r);let s=0;return n.forEach(i=>{for(let c=0;c<i.length;c++)o[s++]=i[c]}),new C(o,!0)}}uploadData(){return this.data_}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function rt(e){let t;try{t=JSON.parse(e)}catch{return null}return vn(t)?t:null}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function qn(e){if(e.length===0)return null;const t=e.lastIndexOf("/");return t===-1?"":e.slice(0,t)}function zn(e,t){const n=t.split("/").filter(r=>r.length>0).join("/");return e.length===0?n:e+"/"+n}function ot(e){const t=e.lastIndexOf("/",e.length-2);return t===-1?e:e.slice(t+1)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Kn(e,t){return t}class b{constructor(t,n,r,o){this.server=t,this.local=n||t,this.writable=!!r,this.xform=o||Kn}}let q=null;function Wn(e){return!pe(e)||e.length<2?e:ot(e)}function st(){if(q)return q;const e=[];e.push(new b("bucket")),e.push(new b("generation")),e.push(new b("metageneration")),e.push(new b("name","fullPath",!0));function t(s,i){return Wn(i)}const n=new b("name");n.xform=t,e.push(n);function r(s,i){return i!==void 0?Number(i):i}const o=new b("size");return o.xform=r,e.push(o),e.push(new b("timeCreated")),e.push(new b("updated")),e.push(new b("md5Hash",null,!0)),e.push(new b("cacheControl",null,!0)),e.push(new b("contentDisposition",null,!0)),e.push(new b("contentEncoding",null,!0)),e.push(new b("contentLanguage",null,!0)),e.push(new b("contentType",null,!0)),e.push(new b("metadata","customMetadata",!0)),q=e,q}function Vn(e,t){function n(){const r=e.bucket,o=e.fullPath,s=new E(r,o);return t._makeStorageReference(s)}Object.defineProperty(e,"ref",{get:n})}function Gn(e,t,n){const r={};r.type="file";const o=n.length;for(let s=0;s<o;s++){const i=n[s];r[i.local]=i.xform(r,t[i.server])}return Vn(r,e),r}function it(e,t,n){const r=rt(t);return r===null?null:Gn(e,r,n)}function Xn(e,t,n,r){const o=rt(t);if(o===null||!pe(o.downloadTokens))return null;const s=o.downloadTokens;if(s.length===0)return null;const i=encodeURIComponent;return s.split(",").map(u=>{const l=e.bucket,h=e.fullPath,g="/b/"+i(l)+"/o/"+i(h),_=_e(g,n,r),T=Qe({alt:"media",token:u});return _+T})[0]}function Yn(e,t){const n={},r=t.length;for(let o=0;o<r;o++){const s=t[o];s.writable&&(n[s.server]=e[s.local])}return JSON.stringify(n)}class at{constructor(t,n,r,o){this.url=t,this.method=n,this.handler=r,this.timeout=o,this.urlParams={},this.headers={},this.body=null,this.errorHandler=null,this.progressCallback=null,this.successCodes=[200],this.additionalRetryCodes=[]}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ct(e){if(!e)throw fe()}function Jn(e,t){function n(r,o){const s=it(e,o,t);return ct(s!==null),s}return n}function Zn(e,t){function n(r,o){const s=it(e,o,t);return ct(s!==null),Xn(s,o,e.host,e._protocol)}return n}function ut(e){function t(n,r){let o;return n.getStatus()===401?n.getErrorText().includes("Firebase App Check token is invalid")?o=hn():o=ln():n.getStatus()===402?o=un(e.bucket):n.getStatus()===403?o=dn(e.path):o=r,o.status=n.getStatus(),o.serverResponse=r.serverResponse,o}return t}function Qn(e){const t=ut(e);function n(r,o){let s=t(r,o);return r.getStatus()===404&&(s=cn(e.path)),s.serverResponse=o.serverResponse,s}return n}function er(e,t,n){const r=t.fullServerUrl(),o=_e(r,e.host,e._protocol),s="GET",i=e.maxOperationRetryTime,c=new at(o,s,Zn(e,n),i);return c.errorHandler=Qn(t),c}function tr(e,t){return e&&e.contentType||t&&t.type()||"application/octet-stream"}function nr(e,t,n){const r=Object.assign({},n);return r.fullPath=e.path,r.size=t.size(),r.contentType||(r.contentType=tr(null,t)),r}function rr(e,t,n,r,o){const s=t.bucketOnlyServerUrl(),i={"X-Goog-Upload-Protocol":"multipart"};function c(){let y="";for(let k=0;k<2;k++)y=y+Math.random().toString().slice(2);return y}const a=c();i["Content-Type"]="multipart/related; boundary="+a;const u=nr(t,r,o),l=Yn(u,n),h="--"+a+`\r
Content-Type: application/json; charset=utf-8\r
\r
`+l+`\r
--`+a+`\r
Content-Type: `+u.contentType+`\r
\r
`,g=`\r
--`+a+"--",_=C.getBlob(h,r,g);if(_===null)throw wn();const T={name:u.fullPath},R=_e(s,e.host,e._protocol),w="POST",v=e.maxUploadRetryTime,I=new at(R,w,Jn(e,n),v);return I.urlParams=T,I.headers=i,I.body=_.uploadData(),I.errorHandler=ut(t),I}class or{constructor(){this.sent_=!1,this.xhr_=new XMLHttpRequest,this.initXhr(),this.errorCode_=O.NO_ERROR,this.sendPromise_=new Promise(t=>{this.xhr_.addEventListener("abort",()=>{this.errorCode_=O.ABORT,t()}),this.xhr_.addEventListener("error",()=>{this.errorCode_=O.NETWORK_ERROR,t()}),this.xhr_.addEventListener("load",()=>{t()})})}send(t,n,r,o,s){if(this.sent_)throw U("cannot .send() more than once");if(We(t)&&r&&(this.xhr_.withCredentials=!0),this.sent_=!0,this.xhr_.open(n,t,!0),s!==void 0)for(const i in s)s.hasOwnProperty(i)&&this.xhr_.setRequestHeader(i,s[i].toString());return o!==void 0?this.xhr_.send(o):this.xhr_.send(),this.sendPromise_}getErrorCode(){if(!this.sent_)throw U("cannot .getErrorCode() before sending");return this.errorCode_}getStatus(){if(!this.sent_)throw U("cannot .getStatus() before sending");try{return this.xhr_.status}catch{return-1}}getResponse(){if(!this.sent_)throw U("cannot .getResponse() before sending");return this.xhr_.response}getErrorText(){if(!this.sent_)throw U("cannot .getErrorText() before sending");return this.xhr_.statusText}abort(){this.xhr_.abort()}getResponseHeader(t){return this.xhr_.getResponseHeader(t)}addUploadProgressListener(t){this.xhr_.upload!=null&&this.xhr_.upload.addEventListener("progress",t)}removeUploadProgressListener(t){this.xhr_.upload!=null&&this.xhr_.upload.removeEventListener("progress",t)}}class sr extends or{initXhr(){this.xhr_.responseType="text"}}function lt(){return new sr}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class D{constructor(t,n){this._service=t,n instanceof E?this._location=n:this._location=E.makeFromUrl(n,t.host)}toString(){return"gs://"+this._location.bucket+"/"+this._location.path}_newRef(t,n){return new D(t,n)}get root(){const t=new E(this._location.bucket,"");return this._newRef(this._service,t)}get bucket(){return this._location.bucket}get fullPath(){return this._location.path}get name(){return ot(this._location.path)}get storage(){return this._service}get parent(){const t=qn(this._location.path);if(t===null)return null;const n=new E(this._location.bucket,t);return new D(this._service,n)}_throwIfRoot(t){if(this._location.path==="")throw kn(t)}}function ir(e,t,n){e._throwIfRoot("uploadBytes");const r=rr(e.storage,e._location,st(),new C(t,!0),n);return e.storage.makeRequestWithTokens(r,lt).then(o=>({metadata:o,ref:e}))}function ar(e){e._throwIfRoot("getDownloadURL");const t=er(e.storage,e._location,st());return e.storage.makeRequestWithTokens(t,lt).then(n=>{if(n===null)throw bn();return n})}function cr(e,t){const n=zn(e._location.path,t),r=new E(e._location.bucket,n);return new D(e.storage,r)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ur(e){return/^[A-Za-z]+:\/\//.test(e)}function lr(e,t){return new D(e,t)}function ht(e,t){if(e instanceof me){const n=e;if(n._bucket==null)throw mn();const r=new D(n,n._bucket);return t!=null?ht(r,t):r}else return t!==void 0?cr(e,t):e}function hr(e,t){if(t&&ur(t)){if(e instanceof me)return lr(e,t);throw ue("To use ref(service, url), the first argument must be a Storage instance.")}else return ht(e,t)}function Ue(e,t){const n=t?.[Je];return n==null?null:E.makeFromBucketSpec(n,e)}function dr(e,t,n,r={}){e.host=`${t}:${n}`;const o=We(t);o&&(St(`https://${e.host}/b`),Nt("Storage",!0)),e._isUsingEmulator=!0,e._protocol=o?"https":"http";const{mockUserToken:s}=r;s&&(e._overrideAuthToken=typeof s=="string"?s:xt(s,e.app.options.projectId))}class me{constructor(t,n,r,o,s,i=!1){this.app=t,this._authProvider=n,this._appCheckProvider=r,this._url=o,this._firebaseVersion=s,this._isUsingEmulator=i,this._bucket=null,this._host=Ye,this._protocol="https",this._appId=null,this._deleted=!1,this._maxOperationRetryTime=sn,this._maxUploadRetryTime=an,this._requests=new Set,o!=null?this._bucket=E.makeFromBucketSpec(o,this._host):this._bucket=Ue(this._host,this.app.options)}get host(){return this._host}set host(t){this._host=t,this._url!=null?this._bucket=E.makeFromBucketSpec(this._url,t):this._bucket=Ue(t,this.app.options)}get maxUploadRetryTime(){return this._maxUploadRetryTime}set maxUploadRetryTime(t){xe("time",0,Number.POSITIVE_INFINITY,t),this._maxUploadRetryTime=t}get maxOperationRetryTime(){return this._maxOperationRetryTime}set maxOperationRetryTime(t){xe("time",0,Number.POSITIVE_INFINITY,t),this._maxOperationRetryTime=t}async _getAuthToken(){if(this._overrideAuthToken)return this._overrideAuthToken;const t=this._authProvider.getImmediate({optional:!0});if(t){const n=await t.getToken();if(n!==null)return n.accessToken}return null}async _getAppCheckToken(){if(It(this.app)&&this.app.settings.appCheckToken)return this.app.settings.appCheckToken;const t=this._appCheckProvider.getImmediate({optional:!0});return t?(await t.getToken()).token:null}_delete(){return this._deleted||(this._deleted=!0,this._requests.forEach(t=>t.cancel()),this._requests.clear()),Promise.resolve()}_makeStorageReference(t){return new D(this,t)}_makeRequest(t,n,r,o,s=!0){if(this._deleted)return new En(Ze());{const i=Nn(t,this._appId,r,o,n,this._firebaseVersion,s,this._isUsingEmulator);return this._requests.add(i),i.getPromise().then(()=>this._requests.delete(i),()=>this._requests.delete(i)),i}}async makeRequestWithTokens(t,n){const[r,o]=await Promise.all([this._getAuthToken(),this._getAppCheckToken()]);return this._makeRequest(t,n,r,o).getPromise()}}const Le="@firebase/storage",Be="0.13.14";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const dt="storage";function po(e,t,n){return e=F(e),ir(e,t,n)}function go(e){return e=F(e),ar(e)}function _o(e,t){return e=F(e),hr(e,t)}function fr(e=Ke(),t){e=F(e);const r=Y(e,dt).getImmediate({identifier:t}),o=Dt("storage");return o&&pr(r,...o),r}function pr(e,t,n,r={}){dr(e,t,n,r)}function gr(e,{instanceIdentifier:t}){const n=e.getProvider("app").getImmediate(),r=e.getProvider("auth-internal"),o=e.getProvider("app-check-internal");return new me(n,r,o,t,Pt)}function _r(){ie(new ae(dt,gr,"PUBLIC").setMultipleInstances(!0)),ce(Le,Be,""),ce(Le,Be,"esm2017")}_r();/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const le=new Map,ft={activated:!1,tokenObservers:[]},mr={initialized:!1,enabled:!1};function d(e){return le.get(e)||Object.assign({},ft)}function wr(e,t){return le.set(e,t),le.get(e)}function J(){return mr}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const we="https://content-firebaseappcheck.googleapis.com/v1",br="exchangeRecaptchaV3Token",Tr="exchangeRecaptchaEnterpriseToken",kr="exchangeDebugToken",Me={RETRIAL_MIN_WAIT:30*1e3,RETRIAL_MAX_WAIT:960*1e3},Er=1440*60*1e3;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Rr{constructor(t,n,r,o,s){if(this.operation=t,this.retryPolicy=n,this.getWaitDuration=r,this.lowerBound=o,this.upperBound=s,this.pending=null,this.nextErrorWaitInterval=o,o>s)throw new Error("Proactive refresh lower bound greater than upper bound!")}start(){this.nextErrorWaitInterval=this.lowerBound,this.process(!0).catch(()=>{})}stop(){this.pending&&(this.pending.reject("cancelled"),this.pending=null)}isRunning(){return!!this.pending}async process(t){this.stop();try{this.pending=new B,this.pending.promise.catch(n=>{}),await yr(this.getNextRun(t)),this.pending.resolve(),await this.pending.promise,this.pending=new B,this.pending.promise.catch(n=>{}),await this.operation(),this.pending.resolve(),await this.pending.promise,this.process(!0).catch(()=>{})}catch(n){this.retryPolicy(n)?this.process(!1).catch(()=>{}):this.stop()}}getNextRun(t){if(t)return this.nextErrorWaitInterval=this.lowerBound,this.getWaitDuration();{const n=this.nextErrorWaitInterval;return this.nextErrorWaitInterval*=2,this.nextErrorWaitInterval>this.upperBound&&(this.nextErrorWaitInterval=this.upperBound),n}}}function yr(e){return new Promise(t=>{setTimeout(t,e)})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ar={"already-initialized":"You have already called initializeAppCheck() for FirebaseApp {$appName} with different options. To avoid this error, call initializeAppCheck() with the same options as when it was originally called. This will return the already initialized instance.","use-before-activation":"App Check is being used before initializeAppCheck() is called for FirebaseApp {$appName}. Call initializeAppCheck() before instantiating other Firebase services.","fetch-network-error":"Fetch failed to connect to a network. Check Internet connection. Original error: {$originalErrorMessage}.","fetch-parse-error":"Fetch client could not parse response. Original error: {$originalErrorMessage}.","fetch-status-error":"Fetch server returned an HTTP error status. HTTP status: {$httpStatus}.","storage-open":"Error thrown when opening storage. Original error: {$originalErrorMessage}.","storage-get":"Error thrown when reading from storage. Original error: {$originalErrorMessage}.","storage-set":"Error thrown when writing to storage. Original error: {$originalErrorMessage}.","recaptcha-error":"ReCAPTCHA error.","initial-throttle":"{$httpStatus} error. Attempts allowed again after {$time}",throttled:"Requests throttled due to previous {$httpStatus} error. Attempts allowed again after {$time}"},m=new Ut("appCheck","AppCheck",Ar);/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function V(e=!1){var t;return e?(t=self.grecaptcha)===null||t===void 0?void 0:t.enterprise:self.grecaptcha}function be(e){if(!d(e).activated)throw m.create("use-before-activation",{appName:e.name})}function Te(e){const t=Math.round(e/1e3),n=Math.floor(t/(3600*24)),r=Math.floor((t-n*3600*24)/3600),o=Math.floor((t-n*3600*24-r*3600)/60),s=t-n*3600*24-r*3600-o*60;let i="";return n&&(i+=z(n)+"d:"),r&&(i+=z(r)+"h:"),i+=z(o)+"m:"+z(s)+"s",i}function z(e){return e===0?"00":e>=10?e.toString():"0"+e}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Z({url:e,body:t},n){const r={"Content-Type":"application/json"},o=n.getImmediate({optional:!0});if(o){const h=await o.getHeartbeatsHeader();h&&(r["X-Firebase-Client"]=h)}const s={method:"POST",body:JSON.stringify(t),headers:r};let i;try{i=await fetch(e,s)}catch(h){throw m.create("fetch-network-error",{originalErrorMessage:h?.message})}if(i.status!==200)throw m.create("fetch-status-error",{httpStatus:i.status});let c;try{c=await i.json()}catch(h){throw m.create("fetch-parse-error",{originalErrorMessage:h?.message})}const a=c.ttl.match(/^([\d.]+)(s)$/);if(!a||!a[2]||isNaN(Number(a[1])))throw m.create("fetch-parse-error",{originalErrorMessage:`ttl field (timeToLive) is not in standard Protobuf Duration format: ${c.ttl}`});const u=Number(a[1])*1e3,l=Date.now();return{token:c.token,expireTimeMillis:l+u,issuedAtTimeMillis:l}}function vr(e,t){const{projectId:n,appId:r,apiKey:o}=e.options;return{url:`${we}/projects/${n}/apps/${r}:${br}?key=${o}`,body:{recaptcha_v3_token:t}}}function Cr(e,t){const{projectId:n,appId:r,apiKey:o}=e.options;return{url:`${we}/projects/${n}/apps/${r}:${Tr}?key=${o}`,body:{recaptcha_enterprise_token:t}}}function pt(e,t){const{projectId:n,appId:r,apiKey:o}=e.options;return{url:`${we}/projects/${n}/apps/${r}:${kr}?key=${o}`,body:{debug_token:t}}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Pr="firebase-app-check-database",Ir=1,M="firebase-app-check-store",gt="debug-token";let K=null;function _t(){return K||(K=new Promise((e,t)=>{try{const n=indexedDB.open(Pr,Ir);n.onsuccess=r=>{e(r.target.result)},n.onerror=r=>{var o;t(m.create("storage-open",{originalErrorMessage:(o=r.target.error)===null||o===void 0?void 0:o.message}))},n.onupgradeneeded=r=>{const o=r.target.result;switch(r.oldVersion){case 0:o.createObjectStore(M,{keyPath:"compositeKey"})}}}catch(n){t(m.create("storage-open",{originalErrorMessage:n?.message}))}}),K)}function Or(e){return wt(bt(e))}function Dr(e,t){return mt(bt(e),t)}function Sr(e){return mt(gt,e)}function Nr(){return wt(gt)}async function mt(e,t){const r=(await _t()).transaction(M,"readwrite"),s=r.objectStore(M).put({compositeKey:e,value:t});return new Promise((i,c)=>{s.onsuccess=a=>{i()},r.onerror=a=>{var u;c(m.create("storage-set",{originalErrorMessage:(u=a.target.error)===null||u===void 0?void 0:u.message}))}})}async function wt(e){const n=(await _t()).transaction(M,"readonly"),o=n.objectStore(M).get(e);return new Promise((s,i)=>{o.onsuccess=c=>{const a=c.target.result;s(a?a.value:void 0)},n.onerror=c=>{var a;i(m.create("storage-get",{originalErrorMessage:(a=c.target.error)===null||a===void 0?void 0:a.message}))}})}function bt(e){return`${e.options.appId}-${e.name}`}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const P=new Lt("@firebase/app-check");/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function xr(e){if(Ve()){let t;try{t=await Or(e)}catch(n){P.warn(`Failed to read token from IndexedDB. Error: ${n}`)}return t}}function oe(e,t){return Ve()?Dr(e,t).catch(n=>{P.warn(`Failed to write token to IndexedDB. Error: ${n}`)}):Promise.resolve()}async function Ur(){let e;try{e=await Nr()}catch{}if(e)return e;{const t=crypto.randomUUID();return Sr(t).catch(n=>P.warn(`Failed to persist debug token to IndexedDB. Error: ${n}`)),t}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ke(){return J().enabled}async function Ee(){const e=J();if(e.enabled&&e.token)return e.token.promise;throw Error(`
            Can't get debug token in production mode.
        `)}function Lr(){const e=Bt(),t=J();if(t.initialized=!0,typeof e.FIREBASE_APPCHECK_DEBUG_TOKEN!="string"&&e.FIREBASE_APPCHECK_DEBUG_TOKEN!==!0)return;t.enabled=!0;const n=new B;t.token=n,typeof e.FIREBASE_APPCHECK_DEBUG_TOKEN=="string"?n.resolve(e.FIREBASE_APPCHECK_DEBUG_TOKEN):n.resolve(Ur())}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Br={error:"UNKNOWN_ERROR"};function Mr(e){return Ft.encodeString(JSON.stringify(e),!1)}async function G(e,t=!1,n=!1){const r=e.app;be(r);const o=d(r);let s=o.token,i;if(s&&!S(s)&&(o.token=void 0,s=void 0),!s){const u=await o.cachedTokenPromise;u&&(S(u)?s=u:await oe(r,void 0))}if(!t&&s&&S(s))return{token:s.token};let c=!1;if(ke())try{o.exchangeTokenPromise||(o.exchangeTokenPromise=Z(pt(r,await Ee()),e.heartbeatServiceProvider).finally(()=>{o.exchangeTokenPromise=void 0}),c=!0);const u=await o.exchangeTokenPromise;return await oe(r,u),o.token=u,{token:u.token}}catch(u){return u.code==="appCheck/throttled"||u.code==="appCheck/initial-throttle"?P.warn(u.message):n&&P.error(u),se(u)}try{o.exchangeTokenPromise||(o.exchangeTokenPromise=o.provider.getToken().finally(()=>{o.exchangeTokenPromise=void 0}),c=!0),s=await d(r).exchangeTokenPromise}catch(u){u.code==="appCheck/throttled"||u.code==="appCheck/initial-throttle"?P.warn(u.message):n&&P.error(u),i=u}let a;return s?i?S(s)?a={token:s.token,internalError:i}:a=se(i):(a={token:s.token},o.token=s,await oe(r,s)):a=se(i),c&&Tt(r,a),a}async function Fr(e){const t=e.app;be(t);const{provider:n}=d(t);if(ke()){const r=await Ee(),{token:o}=await Z(pt(t,r),e.heartbeatServiceProvider);return{token:o}}else{const{token:r}=await n.getToken();return{token:r}}}function Re(e,t,n,r){const{app:o}=e,s=d(o),i={next:n,error:r,type:t};if(s.tokenObservers=[...s.tokenObservers,i],s.token&&S(s.token)){const c=s.token;Promise.resolve().then(()=>{n({token:c.token}),Fe(e)}).catch(()=>{})}s.cachedTokenPromise.then(()=>Fe(e))}function ye(e,t){const n=d(e),r=n.tokenObservers.filter(o=>o.next!==t);r.length===0&&n.tokenRefresher&&n.tokenRefresher.isRunning()&&n.tokenRefresher.stop(),n.tokenObservers=r}function Fe(e){const{app:t}=e,n=d(t);let r=n.tokenRefresher;r||(r=Hr(e),n.tokenRefresher=r),!r.isRunning()&&n.isTokenAutoRefreshEnabled&&r.start()}function Hr(e){const{app:t}=e;return new Rr(async()=>{const n=d(t);let r;if(n.token?r=await G(e,!0):r=await G(e),r.error)throw r.error;if(r.internalError)throw r.internalError},()=>!0,()=>{const n=d(t);if(n.token){let r=n.token.issuedAtTimeMillis+(n.token.expireTimeMillis-n.token.issuedAtTimeMillis)*.5+3e5;const o=n.token.expireTimeMillis-300*1e3;return r=Math.min(r,o),Math.max(0,r-Date.now())}else return 0},Me.RETRIAL_MIN_WAIT,Me.RETRIAL_MAX_WAIT)}function Tt(e,t){const n=d(e).tokenObservers;for(const r of n)try{r.type==="EXTERNAL"&&t.error!=null?r.error(t.error):r.next(t)}catch{}}function S(e){return e.expireTimeMillis-Date.now()>0}function se(e){return{token:Mr(Br),error:e}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class $r{constructor(t,n){this.app=t,this.heartbeatServiceProvider=n}_delete(){const{tokenObservers:t}=d(this.app);for(const n of t)ye(this.app,n.next);return Promise.resolve()}}function jr(e,t){return new $r(e,t)}function qr(e){return{getToken:t=>G(e,t),getLimitedUseToken:()=>Fr(e),addTokenListener:t=>Re(e,"INTERNAL",t),removeTokenListener:t=>ye(e.app,t)}}const zr="@firebase/app-check",Kr="0.10.1";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Wr="https://www.google.com/recaptcha/api.js",Vr="https://www.google.com/recaptcha/enterprise.js";function Gr(e,t){const n=new B,r=d(e);r.reCAPTCHAState={initialized:n};const o=kt(e),s=V(!1);return s?X(e,t,s,o,n):Jr(()=>{const i=V(!1);if(!i)throw new Error("no recaptcha");X(e,t,i,o,n)}),n.promise}function Xr(e,t){const n=new B,r=d(e);r.reCAPTCHAState={initialized:n};const o=kt(e),s=V(!0);return s?X(e,t,s,o,n):Zr(()=>{const i=V(!0);if(!i)throw new Error("no recaptcha");X(e,t,i,o,n)}),n.promise}function X(e,t,n,r,o){n.ready(()=>{Yr(e,t,n,r),o.resolve(n)})}function kt(e){const t=`fire_app_check_${e.name}`,n=document.createElement("div");return n.id=t,n.style.display="none",document.body.appendChild(n),t}async function Et(e){be(e);const n=await d(e).reCAPTCHAState.initialized.promise;return new Promise((r,o)=>{const s=d(e).reCAPTCHAState;n.ready(()=>{r(n.execute(s.widgetId,{action:"fire_app_check"}))})})}function Yr(e,t,n,r){const o=n.render(r,{sitekey:t,size:"invisible",callback:()=>{d(e).reCAPTCHAState.succeeded=!0},"error-callback":()=>{d(e).reCAPTCHAState.succeeded=!1}}),s=d(e);s.reCAPTCHAState=Object.assign(Object.assign({},s.reCAPTCHAState),{widgetId:o})}function Jr(e){const t=document.createElement("script");t.src=Wr,t.onload=e,document.head.appendChild(t)}function Zr(e){const t=document.createElement("script");t.src=Vr,t.onload=e,document.head.appendChild(t)}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Rt{constructor(t){this._siteKey=t,this._throttleData=null}async getToken(){var t,n,r;At(this._throttleData);const o=await Et(this._app).catch(i=>{throw m.create("recaptcha-error")});if(!(!((t=d(this._app).reCAPTCHAState)===null||t===void 0)&&t.succeeded))throw m.create("recaptcha-error");let s;try{s=await Z(vr(this._app,o),this._heartbeatServiceProvider)}catch(i){throw!((n=i.code)===null||n===void 0)&&n.includes("fetch-status-error")?(this._throttleData=yt(Number((r=i.customData)===null||r===void 0?void 0:r.httpStatus),this._throttleData),m.create("initial-throttle",{time:Te(this._throttleData.allowRequestsAfter-Date.now()),httpStatus:this._throttleData.httpStatus})):i}return this._throttleData=null,s}initialize(t){this._app=t,this._heartbeatServiceProvider=Y(t,"heartbeat"),Gr(t,this._siteKey).catch(()=>{})}isEqual(t){return t instanceof Rt?this._siteKey===t._siteKey:!1}}class Ae{constructor(t){this._siteKey=t,this._throttleData=null}async getToken(){var t,n,r;At(this._throttleData);const o=await Et(this._app).catch(i=>{throw m.create("recaptcha-error")});if(!(!((t=d(this._app).reCAPTCHAState)===null||t===void 0)&&t.succeeded))throw m.create("recaptcha-error");let s;try{s=await Z(Cr(this._app,o),this._heartbeatServiceProvider)}catch(i){throw!((n=i.code)===null||n===void 0)&&n.includes("fetch-status-error")?(this._throttleData=yt(Number((r=i.customData)===null||r===void 0?void 0:r.httpStatus),this._throttleData),m.create("initial-throttle",{time:Te(this._throttleData.allowRequestsAfter-Date.now()),httpStatus:this._throttleData.httpStatus})):i}return this._throttleData=null,s}initialize(t){this._app=t,this._heartbeatServiceProvider=Y(t,"heartbeat"),Xr(t,this._siteKey).catch(()=>{})}isEqual(t){return t instanceof Ae?this._siteKey===t._siteKey:!1}}function yt(e,t){if(e===404||e===403)return{backoffCount:1,allowRequestsAfter:Date.now()+Er,httpStatus:e};{const n=t?t.backoffCount:0,r=Mt(n,1e3,2);return{backoffCount:n+1,allowRequestsAfter:Date.now()+r,httpStatus:e}}}function At(e){if(e&&Date.now()-e.allowRequestsAfter<=0)throw m.create("throttled",{time:Te(e.allowRequestsAfter-Date.now()),httpStatus:e.httpStatus})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Qr(e=Ke(),t){e=F(e);const n=Y(e,"app-check");if(J().initialized||Lr(),ke()&&Ee().then(o=>{}),n.isInitialized()){const o=n.getImmediate(),s=n.getOptions();if(s.isTokenAutoRefreshEnabled===t.isTokenAutoRefreshEnabled&&s.provider.isEqual(t.provider))return o;throw m.create("already-initialized",{appName:e.name})}const r=n.initialize({options:t});return eo(e,t.provider,t.isTokenAutoRefreshEnabled),d(e).isTokenAutoRefreshEnabled&&Re(r,"INTERNAL",()=>{}),r}function eo(e,t,n=!1){const r=wr(e,Object.assign({},ft));r.activated=!0,r.provider=t,r.cachedTokenPromise=xr(e).then(o=>(o&&S(o)&&(r.token=o,Tt(e,{token:o.token})),o)),r.isTokenAutoRefreshEnabled=n&&e.automaticDataCollectionEnabled,!e.automaticDataCollectionEnabled&&n&&P.warn("`isTokenAutoRefreshEnabled` is true but `automaticDataCollectionEnabled` was set to false during `initializeApp()`. This blocks automatic token refresh."),r.provider.initialize(e)}function mo(e,t){const n=e.app,r=d(n);r.tokenRefresher&&(t===!0?r.tokenRefresher.start():r.tokenRefresher.stop()),r.isTokenAutoRefreshEnabled=t}async function wo(e,t){const n=await G(e,t);if(n.error)throw n.error;if(n.internalError)throw n.internalError;return{token:n.token}}function bo(e,t,n,r){let o=()=>{},s=()=>{};return t.next!=null?o=t.next.bind(t):o=t,t.error!=null&&(s=t.error.bind(t)),Re(e,"EXTERNAL",o,s),()=>ye(e.app,o)}const to="app-check",He="app-check-internal";function no(){ie(new ae(to,e=>{const t=e.getProvider("app").getImmediate(),n=e.getProvider("heartbeat");return jr(t,n)},"PUBLIC").setInstantiationMode("EXPLICIT").setInstanceCreatedCallback((e,t,n)=>{e.getProvider(He).initialize()})),ie(new ae(He,e=>{const t=e.getProvider("app-check").getImmediate();return qr(t)},"PUBLIC").setInstantiationMode("EXPLICIT")),ce(zr,Kr)}no();const ro={apiKey:"AIzaSyBYpxHaQ-WDuj-c7pTT4zu7Kf5Kpx7FgUk",authDomain:"dddd-e6a52.firebaseapp.com",projectId:"dddd-e6a52",storageBucket:"dddd-e6a52.firebasestorage.app",messagingSenderId:"852428184810",appId:"1:852428184810:web:c97e9be32fe18600ae4b93"},N=Ht(ro),To=$t(N);let he;try{he=jt(N,{localCache:qt({tabManager:Kt(),cacheSizeBytes:zt})})}catch{he=Wt(N)}const ko=Vt(N,"asia-northeast3"),Eo=fr(N);let oo=null,W=null;async function so(){return Promise.resolve()}async function io(){return W||(W=(async()=>{je.isNativePlatform();const e="6LeA4B0sAAAAAEf9UN-uyRJlqnH5pozFf0X-Me4C";try{oo=Qr(N,{provider:new Ae(e),isTokenAutoRefreshEnabled:!0})}catch{}})(),W)}async function Ro(e){const t=Gt(he,"users",e.uid);(await Xt(t)).exists()||await Yt(t,{uid:e.uid,email:e.email,provider:e.providerData[0]?.providerId??"unknown",createdAt:Jt(),createdBy:"client"},{merge:!0})}async function ao(){}async function co(){await ao();const e=window.requestIdleCallback||(n=>setTimeout(n,1));if(typeof window<"u"){const n=()=>{const o=document.documentElement,s=getComputedStyle(o),i=s.getPropertyValue("--safe-area-inset-bottom").trim(),c=parseFloat(i)||0,a=window.outerHeight||window.innerHeight,u=window.innerHeight,l=Math.max(0,a-u);l>0&&(c===0||l>c)&&o.style.setProperty("--safe-area-inset-bottom",`${l}px`);const h=s.getPropertyValue("--safe-area-inset-top").trim(),g=parseFloat(h)||0;let _=0;if(window.visualViewport&&window.visualViewport.offsetTop!==void 0)_=Math.max(0,window.visualViewport.offsetTop);else if(window.screen&&window.screen.height){const T=window.screen.height,R=window.innerHeight,w=T-R,v=Math.max(0,w-l);_=Math.min(Math.max(v,24),48)}if(_>0&&(g===0||_>g))o.style.setProperty("--safe-area-inset-top",`${_}px`);else if(g===0){const T=window.devicePixelRatio||1,R=Math.round(24*Math.min(T,1.5));o.style.setProperty("--safe-area-inset-top",`${R}px`)}},r=()=>{setTimeout(n,100)};document.readyState==="loading"?document.addEventListener("DOMContentLoaded",r):r(),window.addEventListener("resize",n),window.addEventListener("orientationchange",()=>{setTimeout(n,200)})}if(e(()=>{so()}),io().catch(()=>{}),je.isNativePlatform())try{on.initialize({provider:"playIntegrity",isTokenAutoRefreshEnabled:!0})}catch{}Se.removeAllListeners().then(()=>Se.addListener("authStateChange",()=>{})).catch(()=>{});const{default:t}=await de(async()=>{const{default:n}=await import("./App-Cnx-z95_.js").then(r=>r.aG);return{default:n}},__vite__mapDeps([5,1,2,3,6]),import.meta.url);rn.createRoot(document.getElementById("root")).render(Pe.jsx(Xe.StrictMode,{children:Pe.jsx(t,{})})),typeof window<"u"&&"serviceWorker"in navigator&&window.addEventListener("load",()=>{navigator.serviceWorker.register("./sw.js").then(r=>{}).catch(r=>{})})}co();export{Se as F,De as P,Xe as R,Oe as a,To as b,N as c,he as d,fo as e,ko as f,Ro as g,_o as h,io as i,Pe as j,go as k,wo as l,Qr as m,mo as n,bo as o,Ae as p,Rt as q,Ge as r,Eo as s,po as u};
