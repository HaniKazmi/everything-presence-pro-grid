function e(e,t,i,s){var o,r=arguments.length,a=r<3?t:null===s?s=Object.getOwnPropertyDescriptor(t,i):s;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,i,s);else for(var n=e.length-1;n>=0;n--)(o=e[n])&&(a=(r<3?o(a):r>3?o(t,i,a):o(t,i))||a);return r>3&&a&&Object.defineProperty(t,i,a),a}"function"==typeof SuppressedError&&SuppressedError;
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const t=globalThis,i=t.ShadowRoot&&(void 0===t.ShadyCSS||t.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,s=Symbol(),o=new WeakMap;let r=class{constructor(e,t,i){if(this._$cssResult$=!0,i!==s)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o;const t=this.t;if(i&&void 0===e){const i=void 0!==t&&1===t.length;i&&(e=o.get(t)),void 0===e&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),i&&o.set(t,e))}return e}toString(){return this.cssText}};const a=(e,...t)=>{const i=1===e.length?e[0]:t.reduce((t,i,s)=>t+(e=>{if(!0===e._$cssResult$)return e.cssText;if("number"==typeof e)return e;throw Error("Value passed to 'css' function must be a 'css' function result: "+e+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+e[s+1],e[0]);return new r(i,e,s)},n=i?e=>e:e=>e instanceof CSSStyleSheet?(e=>{let t="";for(const i of e.cssRules)t+=i.cssText;return(e=>new r("string"==typeof e?e:e+"",void 0,s))(t)})(e):e,{is:l,defineProperty:c,getOwnPropertyDescriptor:h,getOwnPropertyNames:d,getOwnPropertySymbols:A,getPrototypeOf:g}=Object,u=globalThis,p=u.trustedTypes,_=p?p.emptyScript:"",f=u.reactiveElementPolyfillSupport,w=(e,t)=>e,E={toAttribute(e,t){switch(t){case Boolean:e=e?_:null;break;case Object:case Array:e=null==e?e:JSON.stringify(e)}return e},fromAttribute(e,t){let i=e;switch(t){case Boolean:i=null!==e;break;case Number:i=null===e?null:Number(e);break;case Object:case Array:try{i=JSON.parse(e)}catch(e){i=null}}return i}},m=(e,t)=>!l(e,t),b={attribute:!0,type:String,converter:E,reflect:!1,useDefault:!1,hasChanged:m};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */Symbol.metadata??=Symbol("metadata"),u.litPropertyMetadata??=new WeakMap;let y=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=b){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){const i=Symbol(),s=this.getPropertyDescriptor(e,i,t);void 0!==s&&c(this.prototype,e,s)}}static getPropertyDescriptor(e,t,i){const{get:s,set:o}=h(this.prototype,e)??{get(){return this[t]},set(e){this[t]=e}};return{get:s,set(t){const r=s?.call(this);o?.call(this,t),this.requestUpdate(e,r,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??b}static _$Ei(){if(this.hasOwnProperty(w("elementProperties")))return;const e=g(this);e.finalize(),void 0!==e.l&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(w("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(w("properties"))){const e=this.properties,t=[...d(e),...A(e)];for(const i of t)this.createProperty(i,e[i])}const e=this[Symbol.metadata];if(null!==e){const t=litPropertyMetadata.get(e);if(void 0!==t)for(const[e,i]of t)this.elementProperties.set(e,i)}this._$Eh=new Map;for(const[e,t]of this.elementProperties){const i=this._$Eu(e,t);void 0!==i&&this._$Eh.set(i,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){const t=[];if(Array.isArray(e)){const i=new Set(e.flat(1/0).reverse());for(const e of i)t.unshift(n(e))}else void 0!==e&&t.push(n(e));return t}static _$Eu(e,t){const i=t.attribute;return!1===i?void 0:"string"==typeof i?i:"string"==typeof e?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=new Set).add(e),void 0!==this.renderRoot&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){const e=new Map,t=this.constructor.elementProperties;for(const i of t.keys())this.hasOwnProperty(i)&&(e.set(i,this[i]),delete this[i]);e.size>0&&(this._$Ep=e)}createRenderRoot(){const e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((e,s)=>{if(i)e.adoptedStyleSheets=s.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(const i of s){const s=document.createElement("style"),o=t.litNonce;void 0!==o&&s.setAttribute("nonce",o),s.textContent=i.cssText,e.appendChild(s)}})(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,i){this._$AK(e,i)}_$ET(e,t){const i=this.constructor.elementProperties.get(e),s=this.constructor._$Eu(e,i);if(void 0!==s&&!0===i.reflect){const o=(void 0!==i.converter?.toAttribute?i.converter:E).toAttribute(t,i.type);this._$Em=e,null==o?this.removeAttribute(s):this.setAttribute(s,o),this._$Em=null}}_$AK(e,t){const i=this.constructor,s=i._$Eh.get(e);if(void 0!==s&&this._$Em!==s){const e=i.getPropertyOptions(s),o="function"==typeof e.converter?{fromAttribute:e.converter}:void 0!==e.converter?.fromAttribute?e.converter:E;this._$Em=s;const r=o.fromAttribute(t,e.type);this[s]=r??this._$Ej?.get(s)??r,this._$Em=null}}requestUpdate(e,t,i,s=!1,o){if(void 0!==e){const r=this.constructor;if(!1===s&&(o=this[e]),i??=r.getPropertyOptions(e),!((i.hasChanged??m)(o,t)||i.useDefault&&i.reflect&&o===this._$Ej?.get(e)&&!this.hasAttribute(r._$Eu(e,i))))return;this.C(e,t,i)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(e,t,{useDefault:i,reflect:s,wrapped:o},r){i&&!(this._$Ej??=new Map).has(e)&&(this._$Ej.set(e,r??t??this[e]),!0!==o||void 0!==r)||(this._$AL.has(e)||(this.hasUpdated||i||(t=void 0),this._$AL.set(e,t)),!0===s&&this._$Em!==e&&(this._$Eq??=new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}const e=this.scheduleUpdate();return null!=e&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[e,t]of this._$Ep)this[e]=t;this._$Ep=void 0}const e=this.constructor.elementProperties;if(e.size>0)for(const[t,i]of e){const{wrapped:e}=i,s=this[t];!0!==e||this._$AL.has(t)||void 0===s||this.C(t,void 0,i,s)}}let e=!1;const t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(e=>e.hostUpdate?.()),this.update(t)):this._$EM()}catch(t){throw e=!1,this._$EM(),t}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(e){}firstUpdated(e){}};y.elementStyles=[],y.shadowRootOptions={mode:"open"},y[w("elementProperties")]=new Map,y[w("finalized")]=new Map,f?.({ReactiveElement:y}),(u.reactiveElementVersions??=[]).push("2.1.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const v=globalThis,C=e=>e,B=v.trustedTypes,x=B?B.createPolicy("lit-html",{createHTML:e=>e}):void 0,S="$lit$",I=`lit$${Math.random().toFixed(9).slice(2)}$`,D="?"+I,M=`<${D}>`,k=document,R=()=>k.createComment(""),T=e=>null===e||"object"!=typeof e&&"function"!=typeof e,F=Array.isArray,P="[ \t\n\f\r]",U=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,Q=/-->/g,z=/>/g,O=RegExp(`>|${P}(?:([^\\s"'>=/]+)(${P}*=${P}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),H=/'/g,G=/"/g,L=/^(?:script|style|textarea|title)$/i,N=e=>(t,...i)=>({_$litType$:e,strings:t,values:i}),Y=N(1),$=N(2),K=Symbol.for("lit-noChange"),J=Symbol.for("lit-nothing"),W=new WeakMap,j=k.createTreeWalker(k,129);function V(e,t){if(!F(e)||!e.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==x?x.createHTML(t):t}const Z=(e,t)=>{const i=e.length-1,s=[];let o,r=2===t?"<svg>":3===t?"<math>":"",a=U;for(let t=0;t<i;t++){const i=e[t];let n,l,c=-1,h=0;for(;h<i.length&&(a.lastIndex=h,l=a.exec(i),null!==l);)h=a.lastIndex,a===U?"!--"===l[1]?a=Q:void 0!==l[1]?a=z:void 0!==l[2]?(L.test(l[2])&&(o=RegExp("</"+l[2],"g")),a=O):void 0!==l[3]&&(a=O):a===O?">"===l[0]?(a=o??U,c=-1):void 0===l[1]?c=-2:(c=a.lastIndex-l[2].length,n=l[1],a=void 0===l[3]?O:'"'===l[3]?G:H):a===G||a===H?a=O:a===Q||a===z?a=U:(a=O,o=void 0);const d=a===O&&e[t+1].startsWith("/>")?" ":"";r+=a===U?i+M:c>=0?(s.push(n),i.slice(0,c)+S+i.slice(c)+I+d):i+I+(-2===c?t:d)}return[V(e,r+(e[i]||"<?>")+(2===t?"</svg>":3===t?"</math>":"")),s]};class X{constructor({strings:e,_$litType$:t},i){let s;this.parts=[];let o=0,r=0;const a=e.length-1,n=this.parts,[l,c]=Z(e,t);if(this.el=X.createElement(l,i),j.currentNode=this.el.content,2===t||3===t){const e=this.el.content.firstChild;e.replaceWith(...e.childNodes)}for(;null!==(s=j.nextNode())&&n.length<a;){if(1===s.nodeType){if(s.hasAttributes())for(const e of s.getAttributeNames())if(e.endsWith(S)){const t=c[r++],i=s.getAttribute(e).split(I),a=/([.?@])?(.*)/.exec(t);n.push({type:1,index:o,name:a[2],strings:i,ctor:"."===a[1]?se:"?"===a[1]?oe:"@"===a[1]?re:ie}),s.removeAttribute(e)}else e.startsWith(I)&&(n.push({type:6,index:o}),s.removeAttribute(e));if(L.test(s.tagName)){const e=s.textContent.split(I),t=e.length-1;if(t>0){s.textContent=B?B.emptyScript:"";for(let i=0;i<t;i++)s.append(e[i],R()),j.nextNode(),n.push({type:2,index:++o});s.append(e[t],R())}}}else if(8===s.nodeType)if(s.data===D)n.push({type:2,index:o});else{let e=-1;for(;-1!==(e=s.data.indexOf(I,e+1));)n.push({type:7,index:o}),e+=I.length-1}o++}}static createElement(e,t){const i=k.createElement("template");return i.innerHTML=e,i}}function q(e,t,i=e,s){if(t===K)return t;let o=void 0!==s?i._$Co?.[s]:i._$Cl;const r=T(t)?void 0:t._$litDirective$;return o?.constructor!==r&&(o?._$AO?.(!1),void 0===r?o=void 0:(o=new r(e),o._$AT(e,i,s)),void 0!==s?(i._$Co??=[])[s]=o:i._$Cl=o),void 0!==o&&(t=q(e,o._$AS(e,t.values),o,s)),t}class ee{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){const{el:{content:t},parts:i}=this._$AD,s=(e?.creationScope??k).importNode(t,!0);j.currentNode=s;let o=j.nextNode(),r=0,a=0,n=i[0];for(;void 0!==n;){if(r===n.index){let t;2===n.type?t=new te(o,o.nextSibling,this,e):1===n.type?t=new n.ctor(o,n.name,n.strings,this,e):6===n.type&&(t=new ae(o,this,e)),this._$AV.push(t),n=i[++a]}r!==n?.index&&(o=j.nextNode(),r++)}return j.currentNode=k,s}p(e){let t=0;for(const i of this._$AV)void 0!==i&&(void 0!==i.strings?(i._$AI(e,i,t),t+=i.strings.length-2):i._$AI(e[t])),t++}}class te{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,i,s){this.type=2,this._$AH=J,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=i,this.options=s,this._$Cv=s?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode;const t=this._$AM;return void 0!==t&&11===e?.nodeType&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=q(this,e,t),T(e)?e===J||null==e||""===e?(this._$AH!==J&&this._$AR(),this._$AH=J):e!==this._$AH&&e!==K&&this._(e):void 0!==e._$litType$?this.$(e):void 0!==e.nodeType?this.T(e):(e=>F(e)||"function"==typeof e?.[Symbol.iterator])(e)?this.k(e):this._(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==J&&T(this._$AH)?this._$AA.nextSibling.data=e:this.T(k.createTextNode(e)),this._$AH=e}$(e){const{values:t,_$litType$:i}=e,s="number"==typeof i?this._$AC(e):(void 0===i.el&&(i.el=X.createElement(V(i.h,i.h[0]),this.options)),i);if(this._$AH?._$AD===s)this._$AH.p(t);else{const e=new ee(s,this),i=e.u(this.options);e.p(t),this.T(i),this._$AH=e}}_$AC(e){let t=W.get(e.strings);return void 0===t&&W.set(e.strings,t=new X(e)),t}k(e){F(this._$AH)||(this._$AH=[],this._$AR());const t=this._$AH;let i,s=0;for(const o of e)s===t.length?t.push(i=new te(this.O(R()),this.O(R()),this,this.options)):i=t[s],i._$AI(o),s++;s<t.length&&(this._$AR(i&&i._$AB.nextSibling,s),t.length=s)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){const t=C(e).nextSibling;C(e).remove(),e=t}}setConnected(e){void 0===this._$AM&&(this._$Cv=e,this._$AP?.(e))}}class ie{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,i,s,o){this.type=1,this._$AH=J,this._$AN=void 0,this.element=e,this.name=t,this._$AM=s,this.options=o,i.length>2||""!==i[0]||""!==i[1]?(this._$AH=Array(i.length-1).fill(new String),this.strings=i):this._$AH=J}_$AI(e,t=this,i,s){const o=this.strings;let r=!1;if(void 0===o)e=q(this,e,t,0),r=!T(e)||e!==this._$AH&&e!==K,r&&(this._$AH=e);else{const s=e;let a,n;for(e=o[0],a=0;a<o.length-1;a++)n=q(this,s[i+a],t,a),n===K&&(n=this._$AH[a]),r||=!T(n)||n!==this._$AH[a],n===J?e=J:e!==J&&(e+=(n??"")+o[a+1]),this._$AH[a]=n}r&&!s&&this.j(e)}j(e){e===J?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??"")}}class se extends ie{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===J?void 0:e}}class oe extends ie{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==J)}}class re extends ie{constructor(e,t,i,s,o){super(e,t,i,s,o),this.type=5}_$AI(e,t=this){if((e=q(this,e,t,0)??J)===K)return;const i=this._$AH,s=e===J&&i!==J||e.capture!==i.capture||e.once!==i.once||e.passive!==i.passive,o=e!==J&&(i===J||s);s&&this.element.removeEventListener(this.name,this,i),o&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}}class ae{constructor(e,t,i){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=i}get _$AU(){return this._$AM._$AU}_$AI(e){q(this,e)}}const ne=v.litHtmlPolyfillSupport;ne?.(X,te),(v.litHtmlVersions??=[]).push("3.3.2");const le=globalThis;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let ce=class extends y{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){const t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=((e,t,i)=>{const s=i?.renderBefore??t;let o=s._$litPart$;if(void 0===o){const e=i?.renderBefore??null;s._$litPart$=o=new te(t.insertBefore(R(),e),e,void 0,i??{})}return o._$AI(e),o})(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return K}};ce._$litElement$=!0,ce.finalized=!0,le.litElementHydrateSupport?.({LitElement:ce});const he=le.litElementPolyfillSupport;he?.({LitElement:ce}),(le.litElementVersions??=[]).push("4.2.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const de={attribute:!0,type:String,converter:E,reflect:!1,hasChanged:m},Ae=(e=de,t,i)=>{const{kind:s,metadata:o}=i;let r=globalThis.litPropertyMetadata.get(o);if(void 0===r&&globalThis.litPropertyMetadata.set(o,r=new Map),"setter"===s&&((e=Object.create(e)).wrapped=!0),r.set(i.name,e),"accessor"===s){const{name:s}=i;return{set(i){const o=t.get.call(this);t.set.call(this,i),this.requestUpdate(s,o,e,!0,i)},init(t){return void 0!==t&&this.C(s,void 0,e,t),t}}}if("setter"===s){const{name:s}=i;return function(i){const o=this[s];t.call(this,i),this.requestUpdate(s,o,e,!0,i)}}throw Error("Unsupported decorator location: "+s)};function ge(e){return(t,i)=>"object"==typeof i?Ae(e,t,i):((e,t,i)=>{const s=t.hasOwnProperty(i);return t.constructor.createProperty(i,e),s?Object.getOwnPropertyDescriptor(t,i):void 0})(e,t,i)}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function ue(e){return ge({...e,state:!0,attribute:!1})}function pe(e,t){const i=t&&t.cache?t.cache:ye,s=t&&t.serializer?t.serializer:me;return(t&&t.strategy?t.strategy:Ee)(e,{cache:i,serializer:s})}function _e(e,t,i,s){const o=null==(r=s)||"number"==typeof r||"boolean"==typeof r?s:i(s);var r;let a=t.get(o);return void 0===a&&(a=e.call(this,s),t.set(o,a)),a}function fe(e,t,i){const s=Array.prototype.slice.call(arguments,3),o=i(s);let r=t.get(o);return void 0===r&&(r=e.apply(this,s),t.set(o,r)),r}function we(e,t,i,s,o){return i.bind(t,e,s,o)}function Ee(e,t){return we(e,this,1===e.length?_e:fe,t.cache.create(),t.serializer)}const me=function(){return JSON.stringify(arguments)};class be{cache;constructor(){this.cache=Object.create(null)}get(e){return this.cache[e]}set(e,t){this.cache[e]=t}}const ye={create:function(){return new be}},ve={variadic:function(e,t){return we(e,this,fe,t.cache.create(),t.serializer)}},Ce=/(?:[Eec]{1,6}|G{1,5}|[Qq]{1,5}|(?:[yYur]+|U{1,5})|[ML]{1,5}|d{1,2}|D{1,3}|F{1}|[abB]{1,5}|[hkHK]{1,2}|w{1,2}|W{1}|m{1,2}|s{1,2}|[zZOvVxX]{1,4})(?=([^']*'[^']*')*[^']*$)/g;function Be(e){const t={};return e.replace(Ce,e=>{const i=e.length;switch(e[0]){case"G":t.era=4===i?"long":5===i?"narrow":"short";break;case"y":t.year=2===i?"2-digit":"numeric";break;case"Y":case"u":case"U":case"r":throw new RangeError("`Y/u/U/r` (year) patterns are not supported, use `y` instead");case"q":case"Q":throw new RangeError("`q/Q` (quarter) patterns are not supported");case"M":case"L":t.month=["numeric","2-digit","short","long","narrow"][i-1];break;case"w":case"W":throw new RangeError("`w/W` (week) patterns are not supported");case"d":t.day=["numeric","2-digit"][i-1];break;case"D":case"F":case"g":throw new RangeError("`D/F/g` (day) patterns are not supported, use `d` instead");case"E":t.weekday=4===i?"long":5===i?"narrow":"short";break;case"e":if(i<4)throw new RangeError("`e..eee` (weekday) patterns are not supported");t.weekday=["short","long","narrow","short"][i-4];break;case"c":if(i<4)throw new RangeError("`c..ccc` (weekday) patterns are not supported");t.weekday=["short","long","narrow","short"][i-4];break;case"a":t.hour12=!0;break;case"b":case"B":throw new RangeError("`b/B` (period) patterns are not supported, use `a` instead");case"h":t.hourCycle="h12",t.hour=["numeric","2-digit"][i-1];break;case"H":t.hourCycle="h23",t.hour=["numeric","2-digit"][i-1];break;case"K":t.hourCycle="h11",t.hour=["numeric","2-digit"][i-1];break;case"k":t.hourCycle="h24",t.hour=["numeric","2-digit"][i-1];break;case"j":case"J":case"C":throw new RangeError("`j/J/C` (hour) patterns are not supported, use `h/H/K/k` instead");case"m":t.minute=["numeric","2-digit"][i-1];break;case"s":t.second=["numeric","2-digit"][i-1];break;case"S":case"A":throw new RangeError("`S/A` (second) patterns are not supported, use `s` instead");case"z":t.timeZoneName=i<4?"short":"long";break;case"Z":case"O":case"v":case"V":case"X":case"x":throw new RangeError("`Z/O/v/V/X/x` (timeZone) patterns are not supported, use `z` instead")}return""}),t}const xe=/[\t-\r \x85\u200E\u200F\u2028\u2029]/i;function Se(e){return e.replace(/^(.*?)-/,"")}const Ie=/^\.(?:(0+)(\*)?|(#+)|(0+)(#+))$/g,De=/^(@+)?(\+|#+)?[rs]?$/g,Me=/(\*)(0+)|(#+)(0+)|(0+)/g,ke=/^(0+)$/;function Re(e){const t={};return"r"===e[e.length-1]?t.roundingPriority="morePrecision":"s"===e[e.length-1]&&(t.roundingPriority="lessPrecision"),e.replace(De,function(e,i,s){return"string"!=typeof s?(t.minimumSignificantDigits=i.length,t.maximumSignificantDigits=i.length):"+"===s?t.minimumSignificantDigits=i.length:"#"===i[0]?t.maximumSignificantDigits=i.length:(t.minimumSignificantDigits=i.length,t.maximumSignificantDigits=i.length+("string"==typeof s?s.length:0)),""}),t}function Te(e){switch(e){case"sign-auto":return{signDisplay:"auto"};case"sign-accounting":case"()":return{currencySign:"accounting"};case"sign-always":case"+!":return{signDisplay:"always"};case"sign-accounting-always":case"()!":return{signDisplay:"always",currencySign:"accounting"};case"sign-except-zero":case"+?":return{signDisplay:"exceptZero"};case"sign-accounting-except-zero":case"()?":return{signDisplay:"exceptZero",currencySign:"accounting"};case"sign-never":case"+_":return{signDisplay:"never"}}}function Fe(e){let t;if("E"===e[0]&&"E"===e[1]?(t={notation:"engineering"},e=e.slice(2)):"E"===e[0]&&(t={notation:"scientific"},e=e.slice(1)),t){const i=e.slice(0,2);if("+!"===i?(t.signDisplay="always",e=e.slice(2)):"+?"===i&&(t.signDisplay="exceptZero",e=e.slice(2)),!ke.test(e))throw new Error("Malformed concise eng/scientific notation");t.minimumIntegerDigits=e.length}return t}function Pe(e){const t=Te(e);return t||{}}function Ue(e){let t={};for(const i of e){switch(i.stem){case"percent":case"%":t.style="percent";continue;case"%x100":t.style="percent",t.scale=100;continue;case"currency":t.style="currency",t.currency=i.options[0];continue;case"group-off":case",_":t.useGrouping=!1;continue;case"precision-integer":case".":t.maximumFractionDigits=0;continue;case"measure-unit":case"unit":t.style="unit",t.unit=Se(i.options[0]);continue;case"compact-short":case"K":t.notation="compact",t.compactDisplay="short";continue;case"compact-long":case"KK":t.notation="compact",t.compactDisplay="long";continue;case"scientific":t={...t,notation:"scientific",...i.options.reduce((e,t)=>({...e,...Pe(t)}),{})};continue;case"engineering":t={...t,notation:"engineering",...i.options.reduce((e,t)=>({...e,...Pe(t)}),{})};continue;case"notation-simple":t.notation="standard";continue;case"unit-width-narrow":t.currencyDisplay="narrowSymbol",t.unitDisplay="narrow";continue;case"unit-width-short":t.currencyDisplay="code",t.unitDisplay="short";continue;case"unit-width-full-name":t.currencyDisplay="name",t.unitDisplay="long";continue;case"unit-width-iso-code":t.currencyDisplay="symbol";continue;case"scale":t.scale=parseFloat(i.options[0]);continue;case"rounding-mode-floor":t.roundingMode="floor";continue;case"rounding-mode-ceiling":t.roundingMode="ceil";continue;case"rounding-mode-down":t.roundingMode="trunc";continue;case"rounding-mode-up":t.roundingMode="expand";continue;case"rounding-mode-half-even":t.roundingMode="halfEven";continue;case"rounding-mode-half-down":t.roundingMode="halfTrunc";continue;case"rounding-mode-half-up":t.roundingMode="halfExpand";continue;case"integer-width":if(i.options.length>1)throw new RangeError("integer-width stems only accept a single optional option");i.options[0].replace(Me,function(e,i,s,o,r,a){if(i)t.minimumIntegerDigits=s.length;else{if(o&&r)throw new Error("We currently do not support maximum integer digits");if(a)throw new Error("We currently do not support exact integer digits")}return""});continue}if(ke.test(i.stem)){t.minimumIntegerDigits=i.stem.length;continue}if(Ie.test(i.stem)){if(i.options.length>1)throw new RangeError("Fraction-precision stems only accept a single optional option");i.stem.replace(Ie,function(e,i,s,o,r,a){return"*"===s?t.minimumFractionDigits=i.length:o&&"#"===o[0]?t.maximumFractionDigits=o.length:r&&a?(t.minimumFractionDigits=r.length,t.maximumFractionDigits=r.length+a.length):(t.minimumFractionDigits=i.length,t.maximumFractionDigits=i.length),""});const e=i.options[0];"w"===e?t={...t,trailingZeroDisplay:"stripIfInteger"}:e&&(t={...t,...Re(e)});continue}if(De.test(i.stem)){t={...t,...Re(i.stem)};continue}const e=Te(i.stem);e&&(t={...t,...e});const s=Fe(i.stem);s&&(t={...t,...s})}return t}let Qe=function(e){return e[e.literal=0]="literal",e[e.argument=1]="argument",e[e.number=2]="number",e[e.date=3]="date",e[e.time=4]="time",e[e.select=5]="select",e[e.plural=6]="plural",e[e.pound=7]="pound",e[e.tag=8]="tag",e}({}),ze=function(e){return e[e.number=0]="number",e[e.dateTime=1]="dateTime",e}({});function Oe(e){return e.type===Qe.literal}function He(e){return e.type===Qe.argument}function Ge(e){return e.type===Qe.number}function Le(e){return e.type===Qe.date}function Ne(e){return e.type===Qe.time}function Ye(e){return e.type===Qe.select}function $e(e){return e.type===Qe.plural}function Ke(e){return e.type===Qe.pound}function Je(e){return e.type===Qe.tag}function We(e){return!(!e||"object"!=typeof e||e.type!==ze.number)}function je(e){return!(!e||"object"!=typeof e||e.type!==ze.dateTime)}let Ve=function(e){return e[e.EXPECT_ARGUMENT_CLOSING_BRACE=1]="EXPECT_ARGUMENT_CLOSING_BRACE",e[e.EMPTY_ARGUMENT=2]="EMPTY_ARGUMENT",e[e.MALFORMED_ARGUMENT=3]="MALFORMED_ARGUMENT",e[e.EXPECT_ARGUMENT_TYPE=4]="EXPECT_ARGUMENT_TYPE",e[e.INVALID_ARGUMENT_TYPE=5]="INVALID_ARGUMENT_TYPE",e[e.EXPECT_ARGUMENT_STYLE=6]="EXPECT_ARGUMENT_STYLE",e[e.INVALID_NUMBER_SKELETON=7]="INVALID_NUMBER_SKELETON",e[e.INVALID_DATE_TIME_SKELETON=8]="INVALID_DATE_TIME_SKELETON",e[e.EXPECT_NUMBER_SKELETON=9]="EXPECT_NUMBER_SKELETON",e[e.EXPECT_DATE_TIME_SKELETON=10]="EXPECT_DATE_TIME_SKELETON",e[e.UNCLOSED_QUOTE_IN_ARGUMENT_STYLE=11]="UNCLOSED_QUOTE_IN_ARGUMENT_STYLE",e[e.EXPECT_SELECT_ARGUMENT_OPTIONS=12]="EXPECT_SELECT_ARGUMENT_OPTIONS",e[e.EXPECT_PLURAL_ARGUMENT_OFFSET_VALUE=13]="EXPECT_PLURAL_ARGUMENT_OFFSET_VALUE",e[e.INVALID_PLURAL_ARGUMENT_OFFSET_VALUE=14]="INVALID_PLURAL_ARGUMENT_OFFSET_VALUE",e[e.EXPECT_SELECT_ARGUMENT_SELECTOR=15]="EXPECT_SELECT_ARGUMENT_SELECTOR",e[e.EXPECT_PLURAL_ARGUMENT_SELECTOR=16]="EXPECT_PLURAL_ARGUMENT_SELECTOR",e[e.EXPECT_SELECT_ARGUMENT_SELECTOR_FRAGMENT=17]="EXPECT_SELECT_ARGUMENT_SELECTOR_FRAGMENT",e[e.EXPECT_PLURAL_ARGUMENT_SELECTOR_FRAGMENT=18]="EXPECT_PLURAL_ARGUMENT_SELECTOR_FRAGMENT",e[e.INVALID_PLURAL_ARGUMENT_SELECTOR=19]="INVALID_PLURAL_ARGUMENT_SELECTOR",e[e.DUPLICATE_PLURAL_ARGUMENT_SELECTOR=20]="DUPLICATE_PLURAL_ARGUMENT_SELECTOR",e[e.DUPLICATE_SELECT_ARGUMENT_SELECTOR=21]="DUPLICATE_SELECT_ARGUMENT_SELECTOR",e[e.MISSING_OTHER_CLAUSE=22]="MISSING_OTHER_CLAUSE",e[e.INVALID_TAG=23]="INVALID_TAG",e[e.INVALID_TAG_NAME=25]="INVALID_TAG_NAME",e[e.UNMATCHED_CLOSING_TAG=26]="UNMATCHED_CLOSING_TAG",e[e.UNCLOSED_TAG=27]="UNCLOSED_TAG",e}({});const Ze=/[ \xA0\u1680\u2000-\u200A\u202F\u205F\u3000]/,Xe={"001":["H","h"],419:["h","H","hB","hb"],AC:["H","h","hb","hB"],AD:["H","hB"],AE:["h","hB","hb","H"],AF:["H","hb","hB","h"],AG:["h","hb","H","hB"],AI:["H","h","hb","hB"],AL:["h","H","hB"],AM:["H","hB"],AO:["H","hB"],AR:["h","H","hB","hb"],AS:["h","H"],AT:["H","hB"],AU:["h","hb","H","hB"],AW:["H","hB"],AX:["H"],AZ:["H","hB","h"],BA:["H","hB","h"],BB:["h","hb","H","hB"],BD:["h","hB","H"],BE:["H","hB"],BF:["H","hB"],BG:["H","hB","h"],BH:["h","hB","hb","H"],BI:["H","h"],BJ:["H","hB"],BL:["H","hB"],BM:["h","hb","H","hB"],BN:["hb","hB","h","H"],BO:["h","H","hB","hb"],BQ:["H"],BR:["H","hB"],BS:["h","hb","H","hB"],BT:["h","H"],BW:["H","h","hb","hB"],BY:["H","h"],BZ:["H","h","hb","hB"],CA:["h","hb","H","hB"],CC:["H","h","hb","hB"],CD:["hB","H"],CF:["H","h","hB"],CG:["H","hB"],CH:["H","hB","h"],CI:["H","hB"],CK:["H","h","hb","hB"],CL:["h","H","hB","hb"],CM:["H","h","hB"],CN:["H","hB","hb","h"],CO:["h","H","hB","hb"],CP:["H"],CR:["h","H","hB","hb"],CU:["h","H","hB","hb"],CV:["H","hB"],CW:["H","hB"],CX:["H","h","hb","hB"],CY:["h","H","hb","hB"],CZ:["H"],DE:["H","hB"],DG:["H","h","hb","hB"],DJ:["h","H"],DK:["H"],DM:["h","hb","H","hB"],DO:["h","H","hB","hb"],DZ:["h","hB","hb","H"],EA:["H","h","hB","hb"],EC:["h","H","hB","hb"],EE:["H","hB"],EG:["h","hB","hb","H"],EH:["h","hB","hb","H"],ER:["h","H"],ES:["H","hB","h","hb"],ET:["hB","hb","h","H"],FI:["H"],FJ:["h","hb","H","hB"],FK:["H","h","hb","hB"],FM:["h","hb","H","hB"],FO:["H","h"],FR:["H","hB"],GA:["H","hB"],GB:["H","h","hb","hB"],GD:["h","hb","H","hB"],GE:["H","hB","h"],GF:["H","hB"],GG:["H","h","hb","hB"],GH:["h","H"],GI:["H","h","hb","hB"],GL:["H","h"],GM:["h","hb","H","hB"],GN:["H","hB"],GP:["H","hB"],GQ:["H","hB","h","hb"],GR:["h","H","hb","hB"],GS:["H","h","hb","hB"],GT:["h","H","hB","hb"],GU:["h","hb","H","hB"],GW:["H","hB"],GY:["h","hb","H","hB"],HK:["h","hB","hb","H"],HN:["h","H","hB","hb"],HR:["H","hB"],HU:["H","h"],IC:["H","h","hB","hb"],ID:["H"],IE:["H","h","hb","hB"],IL:["H","hB"],IM:["H","h","hb","hB"],IN:["h","H"],IO:["H","h","hb","hB"],IQ:["h","hB","hb","H"],IR:["hB","H"],IS:["H"],IT:["H","hB"],JE:["H","h","hb","hB"],JM:["h","hb","H","hB"],JO:["h","hB","hb","H"],JP:["H","K","h"],KE:["hB","hb","H","h"],KG:["H","h","hB","hb"],KH:["hB","h","H","hb"],KI:["h","hb","H","hB"],KM:["H","h","hB","hb"],KN:["h","hb","H","hB"],KP:["h","H","hB","hb"],KR:["h","H","hB","hb"],KW:["h","hB","hb","H"],KY:["h","hb","H","hB"],KZ:["H","hB"],LA:["H","hb","hB","h"],LB:["h","hB","hb","H"],LC:["h","hb","H","hB"],LI:["H","hB","h"],LK:["H","h","hB","hb"],LR:["h","hb","H","hB"],LS:["h","H"],LT:["H","h","hb","hB"],LU:["H","h","hB"],LV:["H","hB","hb","h"],LY:["h","hB","hb","H"],MA:["H","h","hB","hb"],MC:["H","hB"],MD:["H","hB"],ME:["H","hB","h"],MF:["H","hB"],MG:["H","h"],MH:["h","hb","H","hB"],MK:["H","h","hb","hB"],ML:["H"],MM:["hB","hb","H","h"],MN:["H","h","hb","hB"],MO:["h","hB","hb","H"],MP:["h","hb","H","hB"],MQ:["H","hB"],MR:["h","hB","hb","H"],MS:["H","h","hb","hB"],MT:["H","h"],MU:["H","h"],MV:["H","h"],MW:["h","hb","H","hB"],MX:["h","H","hB","hb"],MY:["hb","hB","h","H"],MZ:["H","hB"],NA:["h","H","hB","hb"],NC:["H","hB"],NE:["H"],NF:["H","h","hb","hB"],NG:["H","h","hb","hB"],NI:["h","H","hB","hb"],NL:["H","hB"],NO:["H","h"],NP:["H","h","hB"],NR:["H","h","hb","hB"],NU:["H","h","hb","hB"],NZ:["h","hb","H","hB"],OM:["h","hB","hb","H"],PA:["h","H","hB","hb"],PE:["h","H","hB","hb"],PF:["H","h","hB"],PG:["h","H"],PH:["h","hB","hb","H"],PK:["h","hB","H"],PL:["H","h"],PM:["H","hB"],PN:["H","h","hb","hB"],PR:["h","H","hB","hb"],PS:["h","hB","hb","H"],PT:["H","hB"],PW:["h","H"],PY:["h","H","hB","hb"],QA:["h","hB","hb","H"],RE:["H","hB"],RO:["H","hB"],RS:["H","hB","h"],RU:["H"],RW:["H","h"],SA:["h","hB","hb","H"],SB:["h","hb","H","hB"],SC:["H","h","hB"],SD:["h","hB","hb","H"],SE:["H"],SG:["h","hb","H","hB"],SH:["H","h","hb","hB"],SI:["H","hB"],SJ:["H"],SK:["H"],SL:["h","hb","H","hB"],SM:["H","h","hB"],SN:["H","h","hB"],SO:["h","H"],SR:["H","hB"],SS:["h","hb","H","hB"],ST:["H","hB"],SV:["h","H","hB","hb"],SX:["H","h","hb","hB"],SY:["h","hB","hb","H"],SZ:["h","hb","H","hB"],TA:["H","h","hb","hB"],TC:["h","hb","H","hB"],TD:["h","H","hB"],TF:["H","h","hB"],TG:["H","hB"],TH:["H","h"],TJ:["H","h"],TL:["H","hB","hb","h"],TM:["H","h"],TN:["h","hB","hb","H"],TO:["h","H"],TR:["H","hB"],TT:["h","hb","H","hB"],TW:["hB","hb","h","H"],TZ:["hB","hb","H","h"],UA:["H","hB","h"],UG:["hB","hb","H","h"],UM:["h","hb","H","hB"],US:["h","hb","H","hB"],UY:["h","H","hB","hb"],UZ:["H","hB","h"],VA:["H","h","hB"],VC:["h","hb","H","hB"],VE:["h","H","hB","hb"],VG:["h","hb","H","hB"],VI:["h","hb","H","hB"],VN:["H","h"],VU:["h","H"],WF:["H","hB"],WS:["h","H"],XK:["H","hB","h"],YE:["h","hB","hb","H"],YT:["H","hB"],ZA:["H","h","hb","hB"],ZM:["h","hb","H","hB"],ZW:["H","h"],"af-ZA":["H","h","hB","hb"],"ar-001":["h","hB","hb","H"],"ca-ES":["H","h","hB"],"en-001":["h","hb","H","hB"],"en-HK":["h","hb","H","hB"],"en-IL":["H","h","hb","hB"],"en-MY":["h","hb","H","hB"],"es-BR":["H","h","hB","hb"],"es-ES":["H","h","hB","hb"],"es-GQ":["H","h","hB","hb"],"fr-CA":["H","h","hB"],"gl-ES":["H","h","hB"],"gu-IN":["hB","hb","h","H"],"hi-IN":["hB","h","H"],"it-CH":["H","h","hB"],"it-IT":["H","h","hB"],"kn-IN":["hB","h","H"],"ku-SY":["H","hB"],"ml-IN":["hB","h","H"],"mr-IN":["hB","hb","h","H"],"pa-IN":["hB","hb","h","H"],"ta-IN":["hB","h","hb","H"],"te-IN":["hB","h","H"],"zu-ZA":["H","hB","hb","h"]};function qe(e){let t=e.hourCycle;if(void 0===t&&e.hourCycles&&e.hourCycles.length&&(t=e.hourCycles[0]),t)switch(t){case"h24":return"k";case"h23":return"H";case"h12":return"h";case"h11":return"K";default:throw new Error("Invalid hourCycle")}const i=e.language;let s;"root"!==i&&(s=e.maximize().region);return(Xe[s||""]||Xe[i||""]||Xe[`${i}-001`]||Xe["001"])[0]}const et=new RegExp(`^${Ze.source}*`),tt=new RegExp(`${Ze.source}*$`);function it(e,t){return{start:e,end:t}}const st=!!Object.fromEntries,ot=!!String.prototype.trimStart,rt=!!String.prototype.trimEnd,at=st?Object.fromEntries:function(e){const t={};for(const[i,s]of e)t[i]=s;return t},nt=ot?function(e){return e.trimStart()}:function(e){return e.replace(et,"")},lt=rt?function(e){return e.trimEnd()}:function(e){return e.replace(tt,"")},ct=new RegExp("([^\\p{White_Space}\\p{Pattern_Syntax}]*)","yu");class ht{message;position;locale;ignoreTag;requiresOtherClause;shouldParseSkeletons;constructor(e,t={}){this.message=e,this.position={offset:0,line:1,column:1},this.ignoreTag=!!t.ignoreTag,this.locale=t.locale,this.requiresOtherClause=!!t.requiresOtherClause,this.shouldParseSkeletons=!!t.shouldParseSkeletons}parse(){if(0!==this.offset())throw Error("parser can only be used once");return this.parseMessage(0,"",!1)}parseMessage(e,t,i){let s=[];for(;!this.isEOF();){const o=this.char();if(123===o){const t=this.parseArgument(e,i);if(t.err)return t;s.push(t.val)}else{if(125===o&&e>0)break;if(35!==o||"plural"!==t&&"selectordinal"!==t){if(60===o&&!this.ignoreTag&&47===this.peek()){if(i)break;return this.error(Ve.UNMATCHED_CLOSING_TAG,it(this.clonePosition(),this.clonePosition()))}if(60===o&&!this.ignoreTag&&dt(this.peek()||0)){const i=this.parseTag(e,t);if(i.err)return i;s.push(i.val)}else{const i=this.parseLiteral(e,t);if(i.err)return i;s.push(i.val)}}else{const e=this.clonePosition();this.bump(),s.push({type:Qe.pound,location:it(e,this.clonePosition())})}}}return{val:s,err:null}}parseTag(e,t){const i=this.clonePosition();this.bump();const s=this.parseTagName();if(this.bumpSpace(),this.bumpIf("/>"))return{val:{type:Qe.literal,value:`<${s}/>`,location:it(i,this.clonePosition())},err:null};if(this.bumpIf(">")){const o=this.parseMessage(e+1,t,!0);if(o.err)return o;const r=o.val,a=this.clonePosition();if(this.bumpIf("</")){if(this.isEOF()||!dt(this.char()))return this.error(Ve.INVALID_TAG,it(a,this.clonePosition()));const e=this.clonePosition();return s!==this.parseTagName()?this.error(Ve.UNMATCHED_CLOSING_TAG,it(e,this.clonePosition())):(this.bumpSpace(),this.bumpIf(">")?{val:{type:Qe.tag,value:s,children:r,location:it(i,this.clonePosition())},err:null}:this.error(Ve.INVALID_TAG,it(a,this.clonePosition())))}return this.error(Ve.UNCLOSED_TAG,it(i,this.clonePosition()))}return this.error(Ve.INVALID_TAG,it(i,this.clonePosition()))}parseTagName(){const e=this.offset();for(this.bump();!this.isEOF()&&At(this.char());)this.bump();return this.message.slice(e,this.offset())}parseLiteral(e,t){const i=this.clonePosition();let s="";for(;;){const i=this.tryParseQuote(t);if(i){s+=i;continue}const o=this.tryParseUnquoted(e,t);if(o){s+=o;continue}const r=this.tryParseLeftAngleBracket();if(!r)break;s+=r}const o=it(i,this.clonePosition());return{val:{type:Qe.literal,value:s,location:o},err:null}}tryParseLeftAngleBracket(){return this.isEOF()||60!==this.char()||!this.ignoreTag&&(dt(e=this.peek()||0)||47===e)?null:(this.bump(),"<");var e}tryParseQuote(e){if(this.isEOF()||39!==this.char())return null;switch(this.peek()){case 39:return this.bump(),this.bump(),"'";case 123:case 60:case 62:case 125:break;case 35:if("plural"===e||"selectordinal"===e)break;return null;default:return null}this.bump();const t=[this.char()];for(this.bump();!this.isEOF();){const e=this.char();if(39===e){if(39!==this.peek()){this.bump();break}t.push(39),this.bump()}else t.push(e);this.bump()}return String.fromCodePoint(...t)}tryParseUnquoted(e,t){if(this.isEOF())return null;const i=this.char();return 60===i||123===i||35===i&&("plural"===t||"selectordinal"===t)||125===i&&e>0?null:(this.bump(),String.fromCodePoint(i))}parseArgument(e,t){const i=this.clonePosition();if(this.bump(),this.bumpSpace(),this.isEOF())return this.error(Ve.EXPECT_ARGUMENT_CLOSING_BRACE,it(i,this.clonePosition()));if(125===this.char())return this.bump(),this.error(Ve.EMPTY_ARGUMENT,it(i,this.clonePosition()));let s=this.parseIdentifierIfPossible().value;if(!s)return this.error(Ve.MALFORMED_ARGUMENT,it(i,this.clonePosition()));if(this.bumpSpace(),this.isEOF())return this.error(Ve.EXPECT_ARGUMENT_CLOSING_BRACE,it(i,this.clonePosition()));switch(this.char()){case 125:return this.bump(),{val:{type:Qe.argument,value:s,location:it(i,this.clonePosition())},err:null};case 44:return this.bump(),this.bumpSpace(),this.isEOF()?this.error(Ve.EXPECT_ARGUMENT_CLOSING_BRACE,it(i,this.clonePosition())):this.parseArgumentOptions(e,t,s,i);default:return this.error(Ve.MALFORMED_ARGUMENT,it(i,this.clonePosition()))}}parseIdentifierIfPossible(){const e=this.clonePosition(),t=this.offset(),i=function(e,t){return ct.lastIndex=t,ct.exec(e)[1]??""}(this.message,t),s=t+i.length;this.bumpTo(s);return{value:i,location:it(e,this.clonePosition())}}parseArgumentOptions(e,t,i,s){let o=this.clonePosition(),r=this.parseIdentifierIfPossible().value,a=this.clonePosition();switch(r){case"":return this.error(Ve.EXPECT_ARGUMENT_TYPE,it(o,a));case"number":case"date":case"time":{this.bumpSpace();let e=null;if(this.bumpIf(",")){this.bumpSpace();const t=this.clonePosition(),i=this.parseSimpleArgStyleIfPossible();if(i.err)return i;const s=lt(i.val);if(0===s.length)return this.error(Ve.EXPECT_ARGUMENT_STYLE,it(this.clonePosition(),this.clonePosition()));e={style:s,styleLocation:it(t,this.clonePosition())}}const t=this.tryParseArgumentClose(s);if(t.err)return t;const o=it(s,this.clonePosition());if(e&&e.style.startsWith("::")){let t=nt(e.style.slice(2));if("number"===r){const s=this.parseNumberSkeletonFromString(t,e.styleLocation);return s.err?s:{val:{type:Qe.number,value:i,location:o,style:s.val},err:null}}{if(0===t.length)return this.error(Ve.EXPECT_DATE_TIME_SKELETON,o);let s=t;this.locale&&(s=function(e,t){let i="";for(let s=0;s<e.length;s++){const o=e.charAt(s);if("j"===o){let r=0;for(;s+1<e.length&&e.charAt(s+1)===o;)r++,s++;let a=1+(1&r),n=r<2?1:3+(r>>1),l="a",c=qe(t);for("H"!=c&&"k"!=c||(n=0);n-- >0;)i+=l;for(;a-- >0;)i=c+i}else i+="J"===o?"H":o}return i}(t,this.locale));const a={type:ze.dateTime,pattern:s,location:e.styleLocation,parsedOptions:this.shouldParseSkeletons?Be(s):{}};return{val:{type:"date"===r?Qe.date:Qe.time,value:i,location:o,style:a},err:null}}}return{val:{type:"number"===r?Qe.number:"date"===r?Qe.date:Qe.time,value:i,location:o,style:e?.style??null},err:null}}case"plural":case"selectordinal":case"select":{const o=this.clonePosition();if(this.bumpSpace(),!this.bumpIf(","))return this.error(Ve.EXPECT_SELECT_ARGUMENT_OPTIONS,it(o,{...o}));this.bumpSpace();let a=this.parseIdentifierIfPossible(),n=0;if("select"!==r&&"offset"===a.value){if(!this.bumpIf(":"))return this.error(Ve.EXPECT_PLURAL_ARGUMENT_OFFSET_VALUE,it(this.clonePosition(),this.clonePosition()));this.bumpSpace();const e=this.tryParseDecimalInteger(Ve.EXPECT_PLURAL_ARGUMENT_OFFSET_VALUE,Ve.INVALID_PLURAL_ARGUMENT_OFFSET_VALUE);if(e.err)return e;this.bumpSpace(),a=this.parseIdentifierIfPossible(),n=e.val}const l=this.tryParsePluralOrSelectOptions(e,r,t,a);if(l.err)return l;const c=this.tryParseArgumentClose(s);if(c.err)return c;const h=it(s,this.clonePosition());return"select"===r?{val:{type:Qe.select,value:i,options:at(l.val),location:h},err:null}:{val:{type:Qe.plural,value:i,options:at(l.val),offset:n,pluralType:"plural"===r?"cardinal":"ordinal",location:h},err:null}}default:return this.error(Ve.INVALID_ARGUMENT_TYPE,it(o,a))}}tryParseArgumentClose(e){return this.isEOF()||125!==this.char()?this.error(Ve.EXPECT_ARGUMENT_CLOSING_BRACE,it(e,this.clonePosition())):(this.bump(),{val:!0,err:null})}parseSimpleArgStyleIfPossible(){let e=0;const t=this.clonePosition();for(;!this.isEOF();){switch(this.char()){case 39:{this.bump();let e=this.clonePosition();if(!this.bumpUntil("'"))return this.error(Ve.UNCLOSED_QUOTE_IN_ARGUMENT_STYLE,it(e,this.clonePosition()));this.bump();break}case 123:e+=1,this.bump();break;case 125:if(!(e>0))return{val:this.message.slice(t.offset,this.offset()),err:null};e-=1;break;default:this.bump()}}return{val:this.message.slice(t.offset,this.offset()),err:null}}parseNumberSkeletonFromString(e,t){let i=[];try{i=function(e){if(0===e.length)throw new Error("Number skeleton cannot be empty");const t=e.split(xe).filter(e=>e.length>0),i=[];for(const e of t){let t=e.split("/");if(0===t.length)throw new Error("Invalid number skeleton");const[s,...o]=t;for(const e of o)if(0===e.length)throw new Error("Invalid number skeleton");i.push({stem:s,options:o})}return i}(e)}catch{return this.error(Ve.INVALID_NUMBER_SKELETON,t)}return{val:{type:ze.number,tokens:i,location:t,parsedOptions:this.shouldParseSkeletons?Ue(i):{}},err:null}}tryParsePluralOrSelectOptions(e,t,i,s){let o=!1;const r=[],a=new Set;let{value:n,location:l}=s;for(;;){if(0===n.length){const e=this.clonePosition();if("select"===t||!this.bumpIf("="))break;{const t=this.tryParseDecimalInteger(Ve.EXPECT_PLURAL_ARGUMENT_SELECTOR,Ve.INVALID_PLURAL_ARGUMENT_SELECTOR);if(t.err)return t;l=it(e,this.clonePosition()),n=this.message.slice(e.offset,this.offset())}}if(a.has(n))return this.error("select"===t?Ve.DUPLICATE_SELECT_ARGUMENT_SELECTOR:Ve.DUPLICATE_PLURAL_ARGUMENT_SELECTOR,l);"other"===n&&(o=!0),this.bumpSpace();const s=this.clonePosition();if(!this.bumpIf("{"))return this.error("select"===t?Ve.EXPECT_SELECT_ARGUMENT_SELECTOR_FRAGMENT:Ve.EXPECT_PLURAL_ARGUMENT_SELECTOR_FRAGMENT,it(this.clonePosition(),this.clonePosition()));const c=this.parseMessage(e+1,t,i);if(c.err)return c;const h=this.tryParseArgumentClose(s);if(h.err)return h;r.push([n,{value:c.val,location:it(s,this.clonePosition())}]),a.add(n),this.bumpSpace(),({value:n,location:l}=this.parseIdentifierIfPossible())}return 0===r.length?this.error("select"===t?Ve.EXPECT_SELECT_ARGUMENT_SELECTOR:Ve.EXPECT_PLURAL_ARGUMENT_SELECTOR,it(this.clonePosition(),this.clonePosition())):this.requiresOtherClause&&!o?this.error(Ve.MISSING_OTHER_CLAUSE,it(this.clonePosition(),this.clonePosition())):{val:r,err:null}}tryParseDecimalInteger(e,t){let i=1;const s=this.clonePosition();this.bumpIf("+")||this.bumpIf("-")&&(i=-1);let o=!1,r=0;for(;!this.isEOF();){const e=this.char();if(!(e>=48&&e<=57))break;o=!0,r=10*r+(e-48),this.bump()}const a=it(s,this.clonePosition());return o?(r*=i,Number.isSafeInteger(r)?{val:r,err:null}:this.error(t,a)):this.error(e,a)}offset(){return this.position.offset}isEOF(){return this.offset()===this.message.length}clonePosition(){return{offset:this.position.offset,line:this.position.line,column:this.position.column}}char(){const e=this.position.offset;if(e>=this.message.length)throw Error("out of bound");const t=this.message.codePointAt(e);if(void 0===t)throw Error(`Offset ${e} is at invalid UTF-16 code unit boundary`);return t}error(e,t){return{val:null,err:{kind:e,message:this.message,location:t}}}bump(){if(this.isEOF())return;const e=this.char();10===e?(this.position.line+=1,this.position.column=1,this.position.offset+=1):(this.position.column+=1,this.position.offset+=e<65536?1:2)}bumpIf(e){if(this.message.startsWith(e,this.offset())){for(let t=0;t<e.length;t++)this.bump();return!0}return!1}bumpUntil(e){const t=this.offset(),i=this.message.indexOf(e,t);return i>=0?(this.bumpTo(i),!0):(this.bumpTo(this.message.length),!1)}bumpTo(e){if(this.offset()>e)throw Error(`targetOffset ${e} must be greater than or equal to the current offset ${this.offset()}`);for(e=Math.min(e,this.message.length);;){const t=this.offset();if(t===e)break;if(t>e)throw Error(`targetOffset ${e} is at invalid UTF-16 code unit boundary`);if(this.bump(),this.isEOF())break}}bumpSpace(){for(;!this.isEOF()&&gt(this.char());)this.bump()}peek(){if(this.isEOF())return null;const e=this.char(),t=this.offset();return this.message.charCodeAt(t+(e>=65536?2:1))??null}}function dt(e){return e>=97&&e<=122||e>=65&&e<=90}function At(e){return 45===e||46===e||e>=48&&e<=57||95===e||e>=97&&e<=122||e>=65&&e<=90||183==e||e>=192&&e<=214||e>=216&&e<=246||e>=248&&e<=893||e>=895&&e<=8191||e>=8204&&e<=8205||e>=8255&&e<=8256||e>=8304&&e<=8591||e>=11264&&e<=12271||e>=12289&&e<=55295||e>=63744&&e<=64975||e>=65008&&e<=65533||e>=65536&&e<=983039}function gt(e){return e>=9&&e<=13||32===e||133===e||e>=8206&&e<=8207||8232===e||8233===e}function ut(e){e.forEach(e=>{if(delete e.location,Ye(e)||$e(e))for(const t in e.options)delete e.options[t].location,ut(e.options[t].value);else Ge(e)&&We(e.style)||(Le(e)||Ne(e))&&je(e.style)?delete e.style.location:Je(e)&&ut(e.children)})}function pt(e,t={}){t={shouldParseSkeletons:!0,requiresOtherClause:!0,...t};const i=new ht(e,t).parse();if(i.err){const e=SyntaxError(Ve[i.err.kind]);throw e.location=i.err.location,e.originalMessage=i.err.message,e}return t?.captureLocation||ut(i.val),i.val}let _t=function(e){return e.MISSING_VALUE="MISSING_VALUE",e.INVALID_VALUE="INVALID_VALUE",e.MISSING_INTL_API="MISSING_INTL_API",e}({});class ft extends Error{code;originalMessage;constructor(e,t,i){super(e),this.code=t,this.originalMessage=i}toString(){return`[formatjs Error: ${this.code}] ${this.message}`}}class wt extends ft{constructor(e,t,i,s){super(`Invalid values for "${e}": "${t}". Options are "${Object.keys(i).join('", "')}"`,_t.INVALID_VALUE,s)}}class Et extends ft{constructor(e,t,i){super(`Value for "${e}" must be of type ${t}`,_t.INVALID_VALUE,i)}}class mt extends ft{constructor(e,t){super(`The intl string context variable "${e}" was not provided to the string "${t}"`,_t.MISSING_VALUE,t)}}let bt=function(e){return e[e.literal=0]="literal",e[e.object=1]="object",e}({});function yt(e){return"function"==typeof e}function vt(e,t,i,s,o,r,a){if(1===e.length&&Oe(e[0]))return[{type:bt.literal,value:e[0].value}];const n=[];for(const l of e){if(Oe(l)){n.push({type:bt.literal,value:l.value});continue}if(Ke(l)){"number"==typeof r&&n.push({type:bt.literal,value:i.getNumberFormat(t).format(r)});continue}const{value:e}=l;if(!o||!(e in o))throw new mt(e,a);let c=o[e];if(He(l))c&&"string"!=typeof c&&"number"!=typeof c&&"bigint"!=typeof c||(c="string"==typeof c||"number"==typeof c||"bigint"==typeof c?String(c):""),n.push({type:"string"==typeof c?bt.literal:bt.object,value:c});else{if(Le(l)){const e="string"==typeof l.style?s.date[l.style]:je(l.style)?l.style.parsedOptions:void 0;n.push({type:bt.literal,value:i.getDateTimeFormat(t,e).format(c)});continue}if(Ne(l)){const e="string"==typeof l.style?s.time[l.style]:je(l.style)?l.style.parsedOptions:s.time.medium;n.push({type:bt.literal,value:i.getDateTimeFormat(t,e).format(c)});continue}if(Ge(l)){const e="string"==typeof l.style?s.number[l.style]:We(l.style)?l.style.parsedOptions:void 0;if(e&&e.scale){const t=e.scale||1;if("bigint"==typeof c){if(!Number.isInteger(t))throw new TypeError(`Cannot apply fractional scale ${t} to bigint value. Scale must be an integer when formatting bigint.`);c*=BigInt(t)}else c*=t}n.push({type:bt.literal,value:i.getNumberFormat(t,e).format(c)});continue}if(Je(l)){const{children:e,value:c}=l,h=o[c];if(!yt(h))throw new Et(c,"function",a);let d=h(vt(e,t,i,s,o,r).map(e=>e.value));Array.isArray(d)||(d=[d]),n.push(...d.map(e=>({type:"string"==typeof e?bt.literal:bt.object,value:e})))}if(Ye(l)){const e=c,r=(Object.prototype.hasOwnProperty.call(l.options,e)?l.options[e]:void 0)||l.options.other;if(!r)throw new wt(l.value,c,Object.keys(l.options),a);n.push(...vt(r.value,t,i,s,o));continue}if($e(l)){const e=`=${c}`;let r=Object.prototype.hasOwnProperty.call(l.options,e)?l.options[e]:void 0;if(!r){if(!Intl.PluralRules)throw new ft('Intl.PluralRules is not available in this environment.\nTry polyfilling it using "@formatjs/intl-pluralrules"\n',_t.MISSING_INTL_API,a);const e="bigint"==typeof c?Number(c):c,s=i.getPluralRules(t,{type:l.pluralType}).select(e-(l.offset||0));r=(Object.prototype.hasOwnProperty.call(l.options,s)?l.options[s]:void 0)||l.options.other}if(!r)throw new wt(l.value,c,Object.keys(l.options),a);const h="bigint"==typeof c?Number(c):c;n.push(...vt(r.value,t,i,s,o,h-(l.offset||0)));continue}}}return(l=n).length<2?l:l.reduce((e,t)=>{const i=e[e.length-1];return i&&i.type===bt.literal&&t.type===bt.literal?i.value+=t.value:e.push(t),e},[]);var l}function Ct(e,t){return t?Object.keys(e).reduce((i,s)=>{var o,r;return i[s]=(o=e[s],(r=t[s])?{...o,...r,...Object.keys(o).reduce((e,t)=>(e[t]={...o[t],...r[t]},e),{})}:o),i},{...e}):e}function Bt(e){return{create:()=>({get:t=>e[t],set(t,i){e[t]=i}})}}class xt{ast;locales;resolvedLocale;formatters;formats;message;formatterCache={number:{},dateTime:{},pluralRules:{}};constructor(e,t=xt.defaultLocale,i,s){if(this.locales=t,this.resolvedLocale=xt.resolveLocale(t),"string"==typeof e){if(this.message=e,!xt.__parse)throw new TypeError("IntlMessageFormat.__parse must be set to process `message` of type `string`");const{...t}=s||{};this.ast=xt.__parse(e,{...t,locale:this.resolvedLocale})}else this.ast=e;if(!Array.isArray(this.ast))throw new TypeError("A message must be provided as a String or AST.");this.formats=Ct(xt.formats,i),this.formatters=s&&s.formatters||function(e={number:{},dateTime:{},pluralRules:{}}){return{getNumberFormat:pe((...e)=>new Intl.NumberFormat(...e),{cache:Bt(e.number),strategy:ve.variadic}),getDateTimeFormat:pe((...e)=>new Intl.DateTimeFormat(...e),{cache:Bt(e.dateTime),strategy:ve.variadic}),getPluralRules:pe((...e)=>new Intl.PluralRules(...e),{cache:Bt(e.pluralRules),strategy:ve.variadic})}}(this.formatterCache)}format=e=>{const t=this.formatToParts(e);if(1===t.length)return t[0].value;const i=t.reduce((e,t)=>(e.length&&t.type===bt.literal&&"string"==typeof e[e.length-1]?e[e.length-1]+=t.value:e.push(t.value),e),[]);return i.length<=1?i[0]||"":i};formatToParts=e=>vt(this.ast,this.locales,this.formatters,this.formats,e,void 0,this.message);resolvedOptions=()=>({locale:this.resolvedLocale?.toString()||Intl.NumberFormat.supportedLocalesOf(this.locales)[0]});getAst=()=>this.ast;static memoizedDefaultLocale=null;static get defaultLocale(){return xt.memoizedDefaultLocale||(xt.memoizedDefaultLocale=(new Intl.NumberFormat).resolvedOptions().locale),xt.memoizedDefaultLocale}static resolveLocale=e=>{if(void 0===Intl.Locale)return;const t=Intl.NumberFormat.supportedLocalesOf(e);return t.length>0?new Intl.Locale(t[0]):new Intl.Locale("string"==typeof e?e:e[0])};static __parse=pt;static formats={number:{integer:{maximumFractionDigits:0},currency:{style:"currency"},percent:{style:"percent"}},date:{short:{month:"numeric",day:"numeric",year:"2-digit"},medium:{month:"short",day:"numeric",year:"numeric"},long:{month:"long",day:"numeric",year:"numeric"},full:{weekday:"long",month:"long",day:"numeric",year:"numeric"}},time:{short:{hour:"numeric",minute:"numeric"},medium:{hour:"numeric",minute:"numeric",second:"numeric"},long:{hour:"numeric",minute:"numeric",second:"numeric",timeZoneName:"short"},full:{hour:"numeric",minute:"numeric",second:"numeric",timeZoneName:"short"}}}}const St={en:{common:{save:"Save",saving:"Saving...",cancel:"Cancel",delete:"Delete",close:"Close",add:"Add",remove:"Remove",skip:"Skip",rename:"Rename",discard:"Discard",apply:"Apply",load:"Load",loading:"Loading..."},furniture:{armchair:"Armchair",bath:"Bath",bedside_table:"Bedside table",bidet:"Bidet",car:"Car",carpet:"Carpet",cat_bed:"Cat bed",cabinet:"Cabinet",counter:"Counter",cupboard:"Cupboard",desk:"Desk",dog_bed:"Dog bed",dining_table:"Dining table",door_left_swing:"Door (left swing)",door_right_swing:"Door (right swing)",double_bed:"Double bed",fridge:"Fridge",hot_tub:"Hot tub",kitchen_island:"Kitchen island",lamp:"Lamp",oven_stove:"Oven / stove",plant:"Plant",pool:"Pool",round_table:"Round table",shower:"Shower",side_table:"Side table",single_bed:"Single bed",sliding_door:"Sliding door",sofa_2_seat:"Sofa (2 seat)",sofa_3_seat:"Sofa (3 seat)",speaker:"Speaker",tv:"TV",washing_machine:"Washing machine",toilet:"Toilet",window:"Window",custom_icon:"Custom icon",custom:"Custom",search_placeholder:"Search furniture..."},corners:{front_left:"Front-left",front_right:"Front-right",back_right:"Back-right",back_left:"Back-left",left_wall:"left wall",right_wall:"right wall",front_wall:"front wall",back_wall:"back wall"},wizard:{how_calibration_works:"How room calibration works",calibrate_room_size:"Calibrate room size",start_calibration:"Start room size calibration",begin_marking:"Begin marking corners",mark_corner:"Mark {corner}",recording:"Recording... {current}s / {total}s",paused:"Paused — need exactly one target visible",stand_still:"Stand still",no_target:"No target detected. Make sure you are visible to the sensor.",multiple_targets:"Multiple targets detected. Only one person should be in the room during calibration.",save_prompt:"Click Save to store this room's calibration, or click a corner above to re-mark it.",walk_instruction_full:"<strong>Walk to each corner</strong> in order (1 → 2 → 3 → 4) and click Mark. Stand still for a few seconds so the sensor can lock on.",cant_reach:"<strong>Can't reach a corner?</strong> Stand as close as you can and enter the distance from each wall in the offset fields — like corner 4 in the diagram above, where a plant is in the way.",corner_sensor_hint:"In this example, your sensor is mounted in Corner 2, but it can be anywhere. You can stand right in front of it.",walk_instruction:"Walk to each corner of the room and click Mark. The sensor will record your position over {duration} seconds.",corner_step:"Corner {index}/4: Walk to the {corner}",distance_from:"Distance from:",distance_from_side:"Distance from {wall} (cm)",how_to_position:"How to position your sensor",mount_height:"Mount height",mount_height_desc:"Place the sensor <strong>1.5 to 2 meters</strong> from the floor",placement:"Placement",placement_desc:"Place in a <strong>corner or on a wall</strong>, pointing toward the most distant opposite corner",beam_direction:"Beam direction",beam_direction_desc:"Keep the beam <strong>horizontal</strong> — not angled up or down",front_wall_label:"Front wall (sensor side)",back_wall_label:"Back wall",sensor:"Sensor",horizontal_correct:"Horizontal ✓",angled_wrong:"Angled ✗",no_presence:"No presence"},dialogs:{delete_calibration_title:"Delete room calibration?",delete_calibration_body:"This will also delete all detection zones and furniture. This cannot be undone.",unsaved_changes:"You have unsaved changes",unsaved_changes_body:"Your changes will be lost if you navigate away without applying.",update_entity_ids:"Update entity IDs?",update_entity_ids_body:"Zone names changed. Would you like to update the entity IDs to match?",save_template:"Save template",load_template:"Load template",no_templates:"No saved templates.",template_name:"Template name"},menu:{settings:"Settings",room_calibration:"Room size calibration",delete_calibration:"Delete room calibration",detection_zones:"Detection zones",furniture:"Furniture",overlays:"Overlays"},settings:{title:"Settings",detection_ranges:"Detection Ranges",sensor_calibration:"Sensor Calibration",entities:"Entities",target_sensor:"Target Sensor",static_sensor:"Static Sensor",motion_sensor:"Motion Sensor",environmental:"Environmental",auto:"Auto",max_distance:"Max distance",min_distance:"Min distance",presence_timeout:"Presence timeout",trigger_threshold:"Trigger threshold",renew_threshold:"Renew threshold",illuminance_offset:"Illuminance offset",humidity_offset:"Humidity offset",temperature_offset:"Temperature offset",presence_delay:"Presence delay",furthest_point:"Current furthest point from sensor:",logging:"Logging",log_system:"System",log_epp:"Zone Engine",log_led:"LED",log_networking:"Network",log_ble:"Bluetooth",log_co2:"CO2",led_and_relay:"LED and Relay",led:"LED",led_mode:"Mode",led_brightness:"Brightness",led_presence_color:"Occupancy color",manual_control:"Manual Control",presence:"Occupancy",environmental_presence:"Environmental + Occupancy",relay:"Relay",relay_trigger_mode:"Trigger Mode",relay_contact_mode:"Contact Mode",relay_disabled:"Disabled",relay_motion:"Motion Only",relay_presence:"Presence Only",relay_occupancy:"Occupancy",relay_normally_open:"Normally Open (NO)",relay_normally_closed:"Normally Closed (NC)",update_rate:"Update rate",reset_to_default:"Reset to default",show_info:"Show info",frequency:{"5hz":"5 Hz","2hz":"2 Hz","1hz":"1 Hz","0_5hz":"0.5 Hz"},log_level:{none:"None",error:"Error",warning:"Warning",info:"Info",debug:"Debug"}},sidebar:{detection_zones:"Detection zones",furniture:"Furniture",overlays:"Overlays",live_overview:"Live overview",add_zone:"Add zone",rest_of_room:"Rest of room",room:"Room"},zones:{zone_name:"Zone name",type:"Type",normal:"Normal",thoroughfare:"Thoroughfare",rest_area:"Rest area",custom:"Custom",trigger:"Trigger",renew:"Renew",presence_timeout:"Presence timeout",handoff_timeout:"Handoff timeout",seconds_suffix:"s"},overlays:{entry_exit:"Entry / Exit",interference:"Interference",suppress:"Suppress",click_to_paint:"Click to paint"},live:{presence:"Presence",detected:"Detected",clear:"Clear",environment:"Environment",occupancy:"Occupancy",static_presence:"Static presence",motion_presence:"Motion presence",target_presence:"Target presence",target_count:"Target count",delete_target:"Delete target",mark_interference:"Mark as interference source",suppress_detection:"Suppress detection",grid_dimensions:"{width, number, ::.1}m × {depth, number, ::.1}m · Furthest point: {furthest, number, ::.1}m",illuminance_value:"{value, number, ::.1} lux",temperature_value:"{value, number, ::.1} °C",humidity_value:"{value, number, ::.1} %",co2_value:"{value, number} ppm",debug:{detection_events:"Detection events",copy_all:"Copy all",clear:"Clear",waiting_for_events:"Waiting for events...",static:"Static",motion:"Motion",occ:"Occ",on:"on",off:"off",active:"active",pending:"pending",inactive:"inactive",occupied:"occupied",room:"Room",no_targets:"no targets",all_clear:"all clear",zone_n:"Zone {n}"}},entities:{room_level:"Room level",zone_level:"Zone level",target_level:"Target level",occupancy:"Occupancy",static_presence:"Static presence",motion_presence:"Motion presence",target_presence:"Target presence",target_count:"Target count",zone_presence:"Presence",zone_target_count:"Target count",xy_sensor:"XY position, relative to sensor",xy:"XY position",active:"Active",target_signal:"Signal",target_zone:"Zone",distance:"Distance",angle:"Angle",speed:"Speed",resolution:"Resolution",illuminance:"Illuminance",humidity:"Humidity",temperature:"Temperature",co2:"CO₂"},info:{occupancy:"Combined occupancy from all sources — PIR motion, static mmWave presence, and zone tracking. Shows detected if any source detects presence.",static_presence:"mmWave radar detects stationary people by measuring micro-movements like breathing. Works through furniture and blankets.",motion_presence:"Passive infrared sensor detects movement by sensing body heat. Fast response but only triggers on motion, not stationary presence.",target_presence:"Whether any target is actively tracked by the mmWave radar. Detected when at least one target point is being reported.",zone_occupancy:"Zone {slot} occupancy. Currently {count} {count, plural, one {target} other {targets}} detected. Sensitivity determines how many consecutive frames are needed to confirm presence.",rest_of_room_occupancy:"Covers the entire room outside of any defined zones. Currently {count} {count, plural, one {target} other {targets}} detected.",target_auto_range:"Automatically set max distance from room dimensions.",target_max_distance:"Maximum detection distance for the target sensor (LD2450). Hardware limit: 6m.",static_min_distance:"Minimum detection distance for the static sensor.",static_max_distance:"Maximum detection distance for the static sensor. Hardware limit: 16m.",motion_timeout:"Time after last motion before the motion sensor clears.",static_timeout:"Time after last static detection before the sensor clears.",trigger_threshold:"Minimum signal strength needed to initially detect static presence. Higher = harder to trigger.",renew_threshold:"Minimum signal strength needed to maintain static presence detection. Higher = harder to renew.",illuminance_offset:"Adjust the illuminance reading by a fixed amount.",humidity_offset:"Adjust the humidity reading by a fixed amount.",temperature_offset:"Adjust the temperature reading by a fixed amount.",presence_delay:"Delay before reporting presence after initial detection. Helps filter brief false positives.",room_occupancy:"Combined room occupancy from all sensors.",room_static:"mmWave static presence detection.",room_motion:"PIR motion detection.",room_target_presence:"Whether any target is actively tracked.",room_target_count:"Number of targets detected in the room.",zone_presence:"Per-zone occupancy based on target tracking.",zone_target_count:"Number of targets in each zone.",xy_sensor:"Raw XY coordinates from the sensor.",xy:"XY coordinates mapped to the room grid.",active:"Whether each target slot is actively tracking.",target_signal:"Signal strength for each target (higher = stronger detection).",target_zone:"Which zone each target is currently in.",distance:"Distance from sensor to each target.",angle:"Angle from sensor to each target.",speed:"Movement speed of each target.",resolution:"Detection resolution for each target.",illuminance:"BH1750 illuminance sensor.",humidity:"SHTC3 humidity sensor.",temperature:"SHTC3 temperature sensor.",co2:"SCD40 CO₂ sensor (optional module).",log_system:"Framework logs including OTA, API, mDNS, I2C, and sensor drivers.",log_epp:"Zone engine logs — zone detection, target tracking, and configuration.",log_led:"LED control script logs — mode transitions and decision tree.",log_networking:"WiFi or Ethernet connection and DHCP logs.",log_ble:"Bluetooth Low Energy scanner and proxy logs.",log_co2:"CO2 sensor (SCD4x) logs.",led_mode:"Controls the RGB LED behavior. Manual Control disables automatic LED and lets you control it as a standard HA light entity.",led_brightness:"Brightness multiplier for the RGB LED in automatic modes.",led_presence_color:"Color used for occupancy indication when LED is in Occupancy or Environmental + Occupancy mode."},dimensions:{width_cm:"W (cm)",height_cm:"H (cm)",rotation:"Rot"},protocol:{firmware_behind:"This sensor's firmware needs to be updated to work with this version of the integration.",firmware_ahead:"This sensor's firmware is newer than the integration. Update the Everything Presence Pro Grid integration via HACS.",open_hacs:"Open in HACS",unavailable:"Device is offline — firmware version cannot be determined.",update_firmware:"Update Firmware"},tabs:{device_configuration:"Device Configuration",flash_firmware:"Flash Firmware"},flasher:{title:"Flash Firmware",devices_on_network:"Installed Devices",no_devices:"No Everything Presence Pro devices installed.",no_eppgrid_devices:"No devices with Everything Presence Pro Grid firmware found.",flash_from_tab:"Flash your devices from the Flash Firmware tab",flash:"Flash",offline:"Offline",usb_title:"USB Connection",usb_description:"Connect a device via USB to flash firmware and configure WiFi.",usb_connect:"Connect via USB",usb_flash_title:"Flash Firmware",usb_flash_desc:"Install or update firmware and configure WiFi.",usb_wifi_title:"Configure WiFi",usb_wifi_desc:"Set up WiFi on an already flashed device.",usb_browser_warning:"USB flashing requires Chrome or Edge browser.",flash_device:"Flash {name}",select_variant:"Select firmware variant:",wifi:"WiFi",ethernet:"Ethernet",confirm_flash:"This will replace the firmware on {name} ({host}). The device will be temporarily unavailable.",cancel:"Cancel",flashing_title:"Flashing Firmware",go_to_config:"Go to Device Configuration",flash_failed:"Flash failed. Device may need USB recovery.",step_removing:"Removing old device...",step_downloading:"Downloading firmware...",step_flashing:"Flashing firmware...",step_rebooting:"Waiting for reboot...",step_adding:"Adding to Home Assistant...",step_complete:"Complete!",original:"Original",eppgrid:"Everything Presence Pro Grid",flash_usb:"Flash firmware over USB",loading:"Loading devices...",configure_wifi:"Configure WiFi",scan:"Scan Again",scanning:"Scanning...",select_network:"Click Scan to find networks",select_a_network:"Select a network...",manual_ssid:"Enter SSID manually (hidden network)",enter_ssid:"Enter SSID",wifi_password:"WiFi password",connected_to:"Connected to {ssid}",ip_address:"IP Address: {ip}",continue:"Continue",connect:"Connect",usb_flash:"Flash via USB",usb_step_connecting:"Connecting to device...",usb_step_flashing:"Flashing firmware {version}...",usb_step_scanning:"Scanning for WiFi networks...",wifi_scan_hint:"If the device is already connected to WiFi, scanning may not work. Use manual SSID entry instead.",usb_step_provisioning:"Configuring WiFi...",usb_step_wifi_connecting:"Connecting to WiFi...",usb_step_reading_ip:"Detecting device IP address...",usb_step_adding:"Adding device to Home Assistant...",usb_step_complete:"Device configured successfully!",usb_ethernet_complete:"Firmware flashed successfully!",usb_ethernet_hint:"Connect the device to your network via ethernet cable. It will be automatically detected by ESPHome.",go_to_devices:"Go to Settings → Devices",wifi_connected:"WiFi connected",done:"Done",usb_error_connect:"Could not connect to device. Hold the BOOT button and try again.",usb_error_wifi:"WiFi provisioning failed.",usb_error_ip:"Connected to WiFi but could not detect IP address.",usb_retry:"Retry",usb_back:"Back",confirm_delete_message:"This device was previously configured with the original firmware. The old configuration will be removed from Home Assistant.",update:"Update",needs_update:"Update needed",integration_update:"Integration update needed",integration_outdated_title:"Integration update required",integration_outdated_body:"One or more devices have firmware that is newer than this version of the integration. Update the Everything Presence Pro Grid integration to restore full functionality.",open_hacs:"Open in HACS",ota_retry:"Retry",ota_error_timeout:"Update timed out",ota_error_connection_lost:"Connection lost during update",ota_error_failed:"Update failed",errors:{start_failed:"Failed to start update. Is the device online?",connect_failed:"Failed to connect to device",connection_lost:"Connection lost during update",update_timeout:"Update timed out",device_offline:"Device went offline during update",update_failed_generic:"Update failed",ota_failed_version_unchanged:"Update failed — firmware version unchanged",flash_cancelled:"Flash cancelled",timeout:"Timeout"}},connection:{connecting:"Connecting to device...",offline:"Device is offline",failed:"Cannot connect to device",client_count:"{count} client(s) are currently connected.",check_connections:"Check for other browser tabs with this panel open, ESPHome log sessions, or additional Home Assistant instances.",retry:"Retry",ha_reconnecting:"Reconnecting to Home Assistant..."},usb:{errors:{serial_port_busy:"Serial port is busy from a previous operation. Refresh the page and try again.",serial_port_unavailable:"Serial port not available",device_disconnected:"Device disconnected. Unplug, plug it back in, and try again.",manifest_download_failed:"Failed to download firmware manifest",file_download_failed:"Failed to download firmware file: {file}",port_open_failed:"Could not open serial port. Unplug the device, plug it back in, and try again.",no_device_response:"No response from device — it may be flashed with ethernet firmware which does not support WiFi configuration.",base_url_required:"baseUrl is required for firmware download",flash_failed:"Firmware flash failed."}},wifi:{errors:{provisioning_failed:"WiFi provisioning failed",scan_failed:"WiFi scan failed",connection_failed:"WiFi connection failed — check SSID/password and try again",error_code:"WiFi error (code {code})",invalid_command:"Invalid command — device may need to be power-cycled",unknown_command:"Unknown command",not_authorized:"Not authorized"}}},es:{common:{save:"Guardar",saving:"Guardando...",cancel:"Cancelar",delete:"Eliminar",close:"Cerrar",add:"Añadir",remove:"Quitar",skip:"Omitir",rename:"Renombrar",discard:"Descartar",apply:"Aplicar",load:"Cargar",loading:"Cargando..."},furniture:{armchair:"Sillón",bath:"Bañera",bedside_table:"Mesita de noche",bidet:"Bidé",car:"Coche",carpet:"Alfombra",cat_bed:"Cama para gato",cabinet:"Armario",counter:"Mostrador",cupboard:"Alacena",desk:"Escritorio",dog_bed:"Cama para perro",dining_table:"Mesa de comedor",door_left_swing:"Puerta (apertura izquierda)",door_right_swing:"Puerta (apertura derecha)",double_bed:"Cama doble",fridge:"Nevera",hot_tub:"Jacuzzi",kitchen_island:"Isla de cocina",lamp:"Lámpara",oven_stove:"Horno / cocina",plant:"Planta",pool:"Piscina",round_table:"Mesa redonda",shower:"Ducha",side_table:"Mesa auxiliar",single_bed:"Cama individual",sliding_door:"Puerta corredera",sofa_2_seat:"Sofá (2 plazas)",sofa_3_seat:"Sofá (3 plazas)",speaker:"Altavoz",tv:"TV",washing_machine:"Lavadora",toilet:"Inodoro",window:"Ventana",custom_icon:"Icono personalizado",custom:"Personalizado",search_placeholder:"Buscar mobiliario..."},corners:{front_left:"Frente-izquierda",front_right:"Frente-derecha",back_right:"Fondo-derecha",back_left:"Fondo-izquierda",left_wall:"pared izquierda",right_wall:"pared derecha",front_wall:"pared frontal",back_wall:"pared del fondo"},wizard:{how_calibration_works:"Cómo funciona la calibración de la habitación",calibrate_room_size:"Calibrar tamaño de la habitación",start_calibration:"Iniciar calibración de tamaño de la habitación",begin_marking:"Comenzar a marcar esquinas",mark_corner:"Marcar {corner}",recording:"Grabando... {current}s / {total}s",paused:"En pausa — se necesita exactamente un objetivo visible",stand_still:"Permanece inmóvil",no_target:"No se detecta ningún objetivo. Asegúrate de que el sensor pueda verte.",multiple_targets:"Se detectan varios objetivos. Solo debe haber una persona en la habitación durante la calibración.",save_prompt:"Haz clic en Guardar para almacenar la calibración de esta habitación, o haz clic en una esquina superior para volver a marcarla.",walk_instruction_full:"<strong>Camina hasta cada esquina</strong> en orden (1 → 2 → 3 → 4) y haz clic en Marcar. Permanece inmóvil unos segundos para que el sensor pueda registrar tu posición.",cant_reach:"<strong>¿No puedes llegar a una esquina?</strong> Acércate todo lo que puedas e introduce la distancia a cada pared en los campos de desplazamiento, como en la esquina 4 del diagrama superior, donde hay una planta en el camino.",corner_sensor_hint:"En este ejemplo, el sensor está montado en la esquina 2, pero puede estar en cualquier lugar. Puedes colocarte justo delante de él.",walk_instruction:"Camina hasta cada esquina de la habitación y haz clic en Marcar. El sensor registrará tu posición durante {duration} segundos.",corner_step:"Esquina {index}/4: Camina hasta la {corner}",distance_from:"Distancia desde:",distance_from_side:"Distancia desde {wall} (cm)",how_to_position:"Cómo colocar el sensor",mount_height:"Altura de montaje",mount_height_desc:"Coloca el sensor a <strong>1,5 o 2 metros</strong> del suelo",placement:"Ubicación",placement_desc:"Colócalo en <strong>una esquina o en una pared</strong>, apuntando hacia la esquina opuesta más lejana",beam_direction:"Dirección del haz",beam_direction_desc:"Mantén el haz <strong>horizontal</strong>, sin inclinarlo hacia arriba ni hacia abajo",front_wall_label:"Pared frontal (lado del sensor)",back_wall_label:"Pared del fondo",sensor:"Sensor",horizontal_correct:"Horizontal ✓",angled_wrong:"Inclinado ✗",no_presence:"Sin presencia"},dialogs:{delete_calibration_title:"¿Eliminar la calibración de la habitación?",delete_calibration_body:"Esto también eliminará todas las zonas de detección y el mobiliario. Esta acción no se puede deshacer.",unsaved_changes:"Tienes cambios sin guardar",unsaved_changes_body:"Los cambios se perderán si navegas a otra página sin aplicarlos.",update_entity_ids:"¿Actualizar los IDs de entidad?",update_entity_ids_body:"Los nombres de las zonas han cambiado. ¿Deseas actualizar los IDs de entidad para que coincidan?",save_template:"Guardar plantilla",load_template:"Cargar plantilla",no_templates:"No hay plantillas guardadas.",template_name:"Nombre de la plantilla"},menu:{settings:"Ajustes",room_calibration:"Calibración de tamaño de la habitación",delete_calibration:"Eliminar calibración de la habitación",detection_zones:"Zonas de detección",furniture:"Mobiliario",overlays:"Capas"},settings:{title:"Ajustes",detection_ranges:"Rangos de detección",sensor_calibration:"Calibración del sensor",entities:"Entidades",target_sensor:"Sensor de objetivos",static_sensor:"Sensor estático",motion_sensor:"Sensor de movimiento",environmental:"Ambiental",auto:"Auto",max_distance:"Distancia máxima",min_distance:"Distancia mínima",presence_timeout:"Tiempo de espera de presencia",trigger_threshold:"Umbral de activación",renew_threshold:"Umbral de renovación",illuminance_offset:"Desplazamiento de iluminancia",humidity_offset:"Desplazamiento de humedad",temperature_offset:"Desplazamiento de temperatura",presence_delay:"Retardo de presencia",furthest_point:"Punto más lejano actual del sensor:",logging:"Registro",log_system:"Sistema",log_epp:"Motor de zonas",log_led:"LED",log_networking:"Red",log_ble:"Bluetooth",log_co2:"CO2",led_and_relay:"LED y relé",led:"LED",led_mode:"Modo",led_brightness:"Brillo",led_presence_color:"Color de ocupación",manual_control:"Control manual",presence:"Ocupación",environmental_presence:"Ambiental + Ocupación",relay:"Relé",relay_trigger_mode:"Modo de activación",relay_contact_mode:"Modo de contacto",relay_disabled:"Desactivado",relay_motion:"Solo movimiento",relay_presence:"Solo presencia",relay_occupancy:"Ocupación",relay_normally_open:"Normalmente abierto (NA)",relay_normally_closed:"Normalmente cerrado (NC)",update_rate:"Frecuencia de actualización",reset_to_default:"Restablecer valores predeterminados",show_info:"Mostrar información",frequency:{"5hz":"5 Hz","2hz":"2 Hz","1hz":"1 Hz","0_5hz":"0,5 Hz"},log_level:{none:"Ninguno",error:"Error",warning:"Advertencia",info:"Información",debug:"Depuración"}},sidebar:{detection_zones:"Zonas de detección",furniture:"Mobiliario",overlays:"Capas",live_overview:"Vista en directo",add_zone:"Añadir zona",rest_of_room:"Resto de la habitación",room:"Habitación"},zones:{zone_name:"Nombre de la zona",type:"Tipo",normal:"Normal",thoroughfare:"Paso",rest_area:"Zona de descanso",custom:"Personalizado",trigger:"Activación",renew:"Renovación",presence_timeout:"Tiempo de espera de presencia",handoff_timeout:"Tiempo de espera de transferencia",seconds_suffix:"s"},overlays:{entry_exit:"Entrada / Salida",interference:"Interferencia",suppress:"Suprimir",click_to_paint:"Haz clic para pintar"},live:{presence:"Presencia",detected:"Detectado",clear:"Sin detección",environment:"Entorno",occupancy:"Ocupación",static_presence:"Presencia estática",motion_presence:"Presencia en movimiento",target_presence:"Presencia de objetivo",target_count:"Número de objetivos",delete_target:"Eliminar objetivo",mark_interference:"Marcar como fuente de interferencia",suppress_detection:"Suprimir detección",grid_dimensions:"{width, number, ::.1}m × {depth, number, ::.1}m · Punto más lejano: {furthest, number, ::.1}m",illuminance_value:"{value, number, ::.1} lux",temperature_value:"{value, number, ::.1} °C",humidity_value:"{value, number, ::.1} %",co2_value:"{value, number} ppm",debug:{detection_events:"Eventos de detección",copy_all:"Copiar todo",clear:"Borrar",waiting_for_events:"Esperando eventos...",static:"Estático",motion:"Movimiento",occ:"Ocup",on:"sí",off:"no",active:"activo",pending:"pendiente",inactive:"inactivo",occupied:"ocupada",room:"Habitación",no_targets:"sin objetivos",all_clear:"todo despejado",zone_n:"Zona {n}"}},entities:{room_level:"Nivel de habitación",zone_level:"Nivel de zona",target_level:"Nivel de objetivo",occupancy:"Ocupación",static_presence:"Presencia estática",motion_presence:"Presencia en movimiento",target_presence:"Presencia de objetivo",target_count:"Número de objetivos",zone_presence:"Presencia",zone_target_count:"Número de objetivos",xy_sensor:"Posición XY, relativa al sensor",xy:"Posición XY",active:"Activo",target_signal:"Señal",target_zone:"Zona",distance:"Distancia",angle:"Ángulo",speed:"Velocidad",resolution:"Resolución",illuminance:"Iluminancia",humidity:"Humedad",temperature:"Temperatura",co2:"CO₂"},info:{occupancy:"Ocupación combinada de todas las fuentes: sensor PIR de movimiento, presencia estática por radar mmWave y seguimiento de zonas. Muestra «detectado» si alguna fuente detecta presencia.",static_presence:"El radar mmWave detecta personas inmóviles midiendo micromovimientos como la respiración. Funciona a través de muebles y mantas.",motion_presence:"El sensor infrarrojo pasivo detecta movimiento captando el calor corporal. Respuesta rápida, pero solo se activa con movimiento, no con presencia estática.",target_presence:"Indica si el radar mmWave está rastreando activamente algún objetivo. Se muestra como detectado cuando se está reportando al menos un punto objetivo.",zone_occupancy:"Ocupación de la zona {slot}. Actualmente se detectan {count} {count, plural, one {objetivo} other {objetivos}}. La sensibilidad determina cuántos fotogramas consecutivos son necesarios para confirmar presencia.",rest_of_room_occupancy:"Cubre toda la habitación fuera de las zonas definidas. Actualmente se detectan {count} {count, plural, one {objetivo} other {objetivos}}.",target_auto_range:"Establece automáticamente la distancia máxima a partir de las dimensiones de la habitación.",target_max_distance:"Distancia máxima de detección para el sensor de objetivos (LD2450). Límite hardware: 6 m.",static_min_distance:"Distancia mínima de detección para el sensor estático.",static_max_distance:"Distancia máxima de detección para el sensor estático. Límite hardware: 16 m.",motion_timeout:"Tiempo tras el último movimiento antes de que el sensor de movimiento se limpie.",static_timeout:"Tiempo tras la última detección estática antes de que el sensor se limpie.",trigger_threshold:"Intensidad de señal mínima necesaria para detectar inicialmente presencia estática. Más alto = más difícil de activar.",renew_threshold:"Intensidad de señal mínima necesaria para mantener la detección de presencia estática. Más alto = más difícil de renovar.",illuminance_offset:"Ajusta la lectura de iluminancia en un valor fijo.",humidity_offset:"Ajusta la lectura de humedad en un valor fijo.",temperature_offset:"Ajusta la lectura de temperatura en un valor fijo.",presence_delay:"Retardo antes de notificar presencia tras la detección inicial. Ayuda a filtrar falsos positivos breves.",room_occupancy:"Ocupación combinada de la habitación procedente de todos los sensores.",room_static:"Detección de presencia estática por radar mmWave.",room_motion:"Detección de movimiento por PIR.",room_target_presence:"Indica si se está rastreando activamente algún objetivo.",room_target_count:"Número de objetivos detectados en la habitación.",zone_presence:"Ocupación por zona basada en el seguimiento de objetivos.",zone_target_count:"Número de objetivos en cada zona.",xy_sensor:"Coordenadas XY brutas del sensor.",xy:"Coordenadas XY mapeadas a la cuadrícula de la habitación.",active:"Indica si cada ranura de objetivo está rastreando activamente.",target_signal:"Intensidad de señal de cada objetivo (más alta = detección más sólida).",target_zone:"Zona en la que se encuentra actualmente cada objetivo.",distance:"Distancia desde el sensor a cada objetivo.",angle:"Ángulo desde el sensor a cada objetivo.",speed:"Velocidad de desplazamiento de cada objetivo.",resolution:"Resolución de detección de cada objetivo.",illuminance:"Sensor de iluminancia BH1750.",humidity:"Sensor de humedad SHTC3.",temperature:"Sensor de temperatura SHTC3.",co2:"Sensor de CO₂ SCD40 (módulo opcional).",log_system:"Registros del framework: OTA, API, mDNS, I2C y controladores de sensores.",log_epp:"Registros del motor de zonas: detección de zonas, seguimiento de objetivos y configuración.",log_led:"Registros del script de control del LED: transiciones de modo y árbol de decisión.",log_networking:"Registros de conexión WiFi o Ethernet y DHCP.",log_ble:"Registros del escáner y proxy Bluetooth de baja energía.",log_co2:"Registros del sensor de CO2 (SCD4x).",led_mode:"Controla el comportamiento del LED RGB. El control manual desactiva el LED automático y permite controlarlo como una entidad de luz estándar de HA.",led_brightness:"Multiplicador de brillo para el LED RGB en los modos automáticos.",led_presence_color:"Color utilizado para indicar ocupación cuando el LED está en modo Ocupación o Ambiental + Ocupación."},dimensions:{width_cm:"An (cm)",height_cm:"Al (cm)",rotation:"Rot"},protocol:{firmware_behind:"El firmware de este sensor debe actualizarse para funcionar con esta versión de la integración.",firmware_ahead:"El firmware de este sensor es más reciente que la integración. Actualiza la integración Everything Presence Pro Grid desde HACS.",open_hacs:"Abrir en HACS",unavailable:"El dispositivo no está disponible — no se puede determinar la versión del firmware.",update_firmware:"Actualizar firmware"},tabs:{device_configuration:"Configuración del dispositivo",flash_firmware:"Instalar firmware"},flasher:{title:"Instalar firmware",devices_on_network:"Dispositivos instalados",no_devices:"No hay dispositivos Everything Presence Pro instalados.",no_eppgrid_devices:"No se han encontrado dispositivos con firmware Everything Presence Pro Grid.",flash_from_tab:"Instala el firmware de tus dispositivos desde la pestaña Instalar firmware",flash:"Instalar",offline:"Sin conexión",usb_title:"Conexión USB",usb_description:"Conecta un dispositivo por USB para instalar el firmware y configurar el WiFi.",usb_connect:"Conectar por USB",usb_flash_title:"Instalar firmware",usb_flash_desc:"Instala o actualiza el firmware y configura el WiFi.",usb_wifi_title:"Configurar WiFi",usb_wifi_desc:"Configura el WiFi en un dispositivo que ya tiene firmware instalado.",usb_browser_warning:"La instalación por USB requiere el navegador Chrome o Edge.",flash_device:"Instalar firmware en {name}",select_variant:"Selecciona la variante de firmware:",wifi:"WiFi",ethernet:"Ethernet",confirm_flash:"Esto reemplazará el firmware de {name} ({host}). El dispositivo no estará disponible temporalmente.",cancel:"Cancelar",flashing_title:"Instalando firmware",go_to_config:"Ir a la configuración del dispositivo",flash_failed:"Error al instalar el firmware. Es posible que el dispositivo necesite recuperación por USB.",step_removing:"Eliminando dispositivo antiguo...",step_downloading:"Descargando firmware...",step_flashing:"Instalando firmware...",step_rebooting:"Esperando reinicio...",step_adding:"Añadiendo a Home Assistant...",step_complete:"¡Completado!",original:"Original",eppgrid:"Everything Presence Pro Grid",flash_usb:"Instalar firmware por USB",loading:"Cargando dispositivos...",configure_wifi:"Configurar WiFi",scan:"Buscar de nuevo",scanning:"Buscando...",select_network:"Haz clic en Buscar para encontrar redes",select_a_network:"Selecciona una red...",manual_ssid:"Introducir SSID manualmente (red oculta)",enter_ssid:"Introducir SSID",wifi_password:"Contraseña WiFi",connected_to:"Conectado a {ssid}",ip_address:"Dirección IP: {ip}",continue:"Continuar",connect:"Conectar",usb_flash:"Instalar por USB",usb_step_connecting:"Conectando al dispositivo...",usb_step_flashing:"Instalando firmware {version}...",usb_step_scanning:"Buscando redes WiFi...",wifi_scan_hint:"Si el dispositivo ya está conectado al WiFi, es posible que la búsqueda no funcione. Usa la entrada manual de SSID en su lugar.",usb_step_provisioning:"Configurando WiFi...",usb_step_wifi_connecting:"Conectando al WiFi...",usb_step_reading_ip:"Detectando la dirección IP del dispositivo...",usb_step_adding:"Añadiendo dispositivo a Home Assistant...",usb_step_complete:"¡Dispositivo configurado correctamente!",usb_ethernet_complete:"¡Firmware instalado correctamente!",usb_ethernet_hint:"Conecta el dispositivo a tu red mediante cable Ethernet. ESPHome lo detectará automáticamente.",go_to_devices:"Ir a Ajustes → Dispositivos",wifi_connected:"WiFi conectado",done:"Hecho",usb_error_connect:"No se ha podido conectar al dispositivo. Mantén pulsado el botón BOOT e inténtalo de nuevo.",usb_error_wifi:"Error al configurar el WiFi.",usb_error_ip:"Conectado al WiFi, pero no se ha podido detectar la dirección IP.",usb_retry:"Reintentar",usb_back:"Atrás",confirm_delete_message:"Este dispositivo se configuró anteriormente con el firmware original. La configuración antigua se eliminará de Home Assistant.",update:"Actualizar",needs_update:"Actualización necesaria",integration_update:"Actualización de la integración necesaria",integration_outdated_title:"Se requiere actualización de la integración",integration_outdated_body:"Uno o más dispositivos tienen un firmware más reciente que esta versión de la integración. Actualiza la integración Everything Presence Pro Grid para restaurar toda la funcionalidad.",open_hacs:"Abrir en HACS",ota_retry:"Reintentar",ota_error_timeout:"La actualización ha agotado el tiempo de espera",ota_error_connection_lost:"Se perdió la conexión durante la actualización",ota_error_failed:"Error en la actualización",errors:{start_failed:"No se ha podido iniciar la actualización. ¿El dispositivo está en línea?",connect_failed:"No se ha podido conectar al dispositivo",connection_lost:"Se perdió la conexión durante la actualización",update_timeout:"La actualización ha agotado el tiempo de espera",device_offline:"El dispositivo se desconectó durante la actualización",update_failed_generic:"Error en la actualización",ota_failed_version_unchanged:"Actualización fallida — la versión del firmware no ha cambiado",flash_cancelled:"Instalación cancelada",timeout:"Tiempo de espera agotado"}},connection:{connecting:"Conectando al dispositivo...",offline:"El dispositivo no está disponible",failed:"No se puede conectar al dispositivo",client_count:"Hay {count} cliente(s) conectados actualmente.",check_connections:"Comprueba si hay otras pestañas del navegador con este panel abierto, sesiones de registro de ESPHome o instancias adicionales de Home Assistant.",retry:"Reintentar",ha_reconnecting:"Reconectando a Home Assistant..."},usb:{errors:{serial_port_busy:"El puerto serie está ocupado por una operación anterior. Actualiza la página e inténtalo de nuevo.",serial_port_unavailable:"Puerto serie no disponible",device_disconnected:"Dispositivo desconectado. Desconéctalo, vuelve a conectarlo e inténtalo de nuevo.",manifest_download_failed:"No se ha podido descargar el manifiesto del firmware",file_download_failed:"No se ha podido descargar el archivo de firmware: {file}",port_open_failed:"No se ha podido abrir el puerto serie. Desconecta el dispositivo, vuelve a conectarlo e inténtalo de nuevo.",no_device_response:"Sin respuesta del dispositivo — puede que tenga instalado el firmware Ethernet, que no admite configuración WiFi.",base_url_required:"baseUrl es obligatorio para la descarga del firmware",flash_failed:"Error al instalar el firmware."}},wifi:{errors:{provisioning_failed:"Error al configurar el WiFi",scan_failed:"Error al buscar redes WiFi",connection_failed:"Error de conexión WiFi — comprueba el SSID y la contraseña e inténtalo de nuevo",error_code:"Error de WiFi (código {code})",invalid_command:"Comando no válido — puede que el dispositivo necesite reiniciarse",unknown_command:"Comando desconocido",not_authorized:"No autorizado"}}}},It=Object.assign(e=>e,{formatNumber:(e,t=1)=>e.toFixed(t),lang:"en"});function Dt(e,t){const i=t.split(".");let s=e;for(const e of i){if(null==s||"object"!=typeof s)return;s=s[e]}return"string"==typeof s?s:void 0}const Mt=a`
  :host {
    display: flex;
    height: 100%;
    background: var(--primary-background-color, #fafafa);
    color: var(--primary-text-color, #212121);
    font-family: var(--paper-font-body1_-_font-family, "Roboto", sans-serif);
  }
`,kt=a`
  .panel {
    padding: 24px;
    max-width: 1100px;
    margin: 0 auto;
    font-size: 14px;
  }
`,Rt=a`
  .template-dialog {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .template-dialog-card {
    background: var(--card-background-color, #fff);
    border-radius: 16px;
    padding: 24px;
    min-width: 320px;
    max-width: 440px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
  }

  .template-dialog-card h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 500;
  }

  .template-dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

  .template-name-input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 8px;
    font-size: 15px;
    box-sizing: border-box;
    background: var(--card-background-color, #fff);
    color: var(--primary-text-color, #212121);
  }

  .template-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    border-radius: 8px;
    border: 1px solid var(--divider-color, #e0e0e0);
  }

  .template-item-name {
    flex: 1;
    font-size: 14px;
    font-weight: 500;
  }

  .template-item-size {
    font-size: 12px;
    color: var(--secondary-text-color, #757575);
  }

  .template-item-btn {
    padding: 4px 12px;
    font-size: 13px;
  }

  .template-card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 12px;
  }

  .template-card {
    position: relative;
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    transition: box-shadow 0.15s;
  }

  .template-card:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  }

  .template-card:focus-visible,
  .template-card-delete:focus-visible {
    outline: 2px solid var(--primary-color, #03a9f4);
    outline-offset: 2px;
  }

  .template-card-thumbnail {
    background: var(--secondary-background-color, #f5f5f5);
    padding: 8px;
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .template-card-thumbnail svg {
    width: 100%;
    height: 100%;
  }

  .template-card-info {
    padding: 6px 8px;
  }

  .template-card-name {
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .template-card-size {
    font-size: 10px;
    color: var(--secondary-text-color, #757575);
  }

  .template-card-delete {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: none;
    background: rgba(0, 0, 0, 0.4);
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    z-index: 1;
  }

  .template-card-delete:hover {
    background: var(--error-color, #f44336);
  }

  .template-card-delete ha-icon {
    --mdc-icon-size: 14px;
  }
`,Tt=a`
  .wizard-btn {
    padding: 10px 24px;
    border-radius: 10px;
    border: none;
    cursor: pointer;
    font-size: 15px;
    font-weight: 500;
  }

  .wizard-btn-primary {
    background: var(--primary-color, #03a9f4);
    color: #fff;
  }

  .wizard-btn-primary:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .wizard-btn-back {
    background: transparent;
    color: var(--secondary-text-color, #757575);
  }
`,Ft=a`
  .accordion {
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 12px;
    margin-bottom: 12px;
    background: var(--card-background-color, #fff);
  }

  .accordion-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 16px;
    cursor: pointer;
    user-select: none;
    background: var(--card-background-color, #fff);
    border: none;
    border-radius: 12px;
    width: 100%;
    text-align: left;
    font-size: 15px;
    font-weight: 500;
    color: var(--primary-text-color, #212121);
  }

  .accordion-header[data-open] {
    border-radius: 12px 12px 0 0;
  }

  .accordion-header:hover {
    background: var(--secondary-background-color, #f5f5f5);
  }

  .accordion-header ha-icon {
    --mdc-icon-size: 20px;
    color: var(--secondary-text-color, #757575);
  }

  .accordion-header .accordion-title {
    flex: 1;
  }

  .accordion-chevron {
    transition: transform 0.2s ease;
    --mdc-icon-size: 20px;
    color: var(--secondary-text-color, #757575);
  }

  .accordion-chevron[data-open] {
    transform: rotate(180deg);
  }

  .accordion-body {
    padding: 0 16px 16px;
  }
`,Pt=a`
  .settings-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .setting-group {
    background: var(--card-background-color, #fff);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 12px;
    border: 1px solid var(--divider-color, #e0e0e0);
  }

  .setting-group h4 {
    margin: 0 0 12px;
    font-size: 14px;
    font-weight: 600;
    color: var(--primary-text-color, #212121);
  }

  .setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    padding: 8px 0;
    gap: 4px;
    border-bottom: 1px solid var(--divider-color, #f0f0f0);
  }

  .setting-row:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  .setting-row label:not(.toggle-switch) {
    font-size: 14px;
    color: var(--primary-text-color, #212121);
    flex: 1;
    min-width: 120px;
  }

  .setting-input-unit {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--secondary-text-color, #757575);
    flex: 1;
    min-width: 0;
    justify-content: flex-end;
  }

  .setting-range {
    flex: 1;
    min-width: 80px;
    accent-color: var(--primary-color, #03a9f4);
  }

  .setting-value {
    font-size: 14px;
    color: var(--secondary-text-color, #757575);
    font-weight: 500;
    display: inline-block;
    width: 36px;
    text-align: right;
    flex-shrink: 0;
  }

  .setting-unit {
    display: inline-block;
    width: 24px;
    font-size: 13px;
    color: var(--secondary-text-color, #757575);
    flex-shrink: 0;
  }
`,Ut=a`
  .toggle-switch {
    position: relative;
    display: inline-block;
    width: 40px;
    min-width: 40px;
    max-width: 40px;
    height: 22px;
    flex: 0 0 40px;
  }

  .toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .toggle-slider {
    position: absolute;
    cursor: pointer;
    inset: 0;
    background-color: var(--divider-color, #ccc);
    border-radius: 22px;
    transition: background-color 0.2s;
  }

  .toggle-slider::before {
    content: "";
    position: absolute;
    height: 16px;
    width: 16px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    border-radius: 50%;
    transition: transform 0.2s;
  }

  .toggle-switch input:checked + .toggle-slider {
    background-color: var(--primary-color, #03a9f4);
  }

  .toggle-switch input:checked + .toggle-slider::before {
    transform: translateX(18px);
  }
`,Qt=a`
  .protocol-fullpage {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 48px 24px;
    margin: 16px;
    border-radius: 12px;
    text-align: center;
    flex: 1;
  }
  .protocol-fullpage-warning {
    background: var(--warning-color, #ff9800);
    color: white;
  }
  .protocol-fullpage-info {
    background: var(--info-color, #2196f3);
    color: white;
  }
  .protocol-fullpage ha-icon {
    --mdc-icon-size: 48px;
  }
  .protocol-fullpage p {
    margin: 0;
    font-size: 16px;
    max-width: 480px;
    line-height: 1.5;
  }
  .protocol-fullpage .wizard-btn {
    box-shadow: inset 0 0 0 2px white;
  }
  .protocol-link {
    color: white;
    font-weight: 500;
    text-decoration: underline;
    font-size: 16px;
  }
`,zt=a`
  .panel-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    font-size: 20px;
    font-weight: 500;
    margin-bottom: 16px;
    text-align: center;
  }

  .panel-header ha-select {
    --mdc-typography-subtitle1-font-size: 16px;
    --mdc-typography-subtitle1-font-weight: 500;
    min-width: 200px;
  }
`,Ot=a`
  .setting-info {
    position: relative;
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
    margin-left: 8px;
  }

  button.setting-info {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: inherit;
    font: inherit;
  }

  .setting-info ha-icon {
    --mdc-icon-size: 18px;
    color: var(--primary-text-color, #212121);
    cursor: default;
  }

  .setting-info .setting-info-tooltip {
    display: none;
    position: fixed;
    background: var(--card-background-color, #fff);
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 12px;
    color: var(--primary-text-color, #212121);
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    white-space: normal;
    width: 240px;
    z-index: 9999;
    line-height: 1.4;
    pointer-events: none;
  }
`,Ht=a`
  .editor-layout {
    display: flex;
    gap: 24px;
    align-items: flex-start;
  }

  .grid-column {
    min-width: 0;
    max-width: min-content;
  }

  .grid-container {
    position: relative;
    max-width: 100%;
    overflow: visible;
  }

  .sidebar-scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  .zone-sidebar {
    width: 240px;
    flex-shrink: 0;
    background: var(--card-background-color, #fff);
    border-left: 1px solid var(--divider-color, #e0e0e0);
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow: visible;
  }

  .zone-sidebar.scrollable {
    max-height: 70vh;
  }

  .sidebar-title {
    font-size: 15px;
    font-weight: 600;
    padding: 10px 12px 8px;
    color: var(--primary-text-color, #212121);
  }
`,Gt=a`
  :host {
    display: block;
    padding: 16px;
  }

  .flasher-content {
    max-width: 600px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .card-header {
    font-size: 18px;
    font-weight: 400;
    line-height: 48px;
    padding: 8px 16px 0;
    color: var(--ha-card-header-color, var(--primary-text-color, #212121));
  }

  .card-content {
    padding: 16px;
  }

  .device-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .device-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    min-height: 60px;
    background: var(--card-background-color, #fff);
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 10px;
  }
  .device-info-faded {
    opacity: 0.5;
  }

  .device-info {
    flex: 1;
    min-width: 0;
  }

  .device-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--primary-text-color, #212121);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .device-mac {
    font-weight: 400;
    color: var(--secondary-text-color, #757575);
  }
  .device-host {
    font-size: 12px;
    color: var(--secondary-text-color, #757575);
    margin-top: 2px;
  }

  .firmware-badge {
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 10px;
    flex-shrink: 0;
  }

  .firmware-badge-original {
    background: #ff980020;
    color: #e65100;
  }

  .firmware-badge-offline {
    background: #9e9e9e20;
    color: #616161;
  }

  .firmware-badge-behind {
    background: var(--warning-color, #ff9800);
    color: white;
  }

  .firmware-badge-ahead {
    background: var(--info-color, #2196f3);
    color: white;
  }

  /* OTA progress indicators */
  .ota-progress {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    flex-shrink: 0;
  }
  .ota-progress svg {
    transform: rotate(-90deg);
  }
  .ota-track {
    fill: none;
    stroke: var(--divider-color, #e0e0e0);
    stroke-width: 3;
  }
  .ota-fill {
    fill: none;
    stroke: var(--primary-color, #03a9f4);
    stroke-width: 3;
    stroke-linecap: round;
    transition: stroke-dashoffset 0.3s ease;
  }
  .ota-pct {
    position: absolute;
    font-size: 10px;
    font-weight: 600;
    color: var(--primary-text-color, #212121);
  }
  .ota-spinner {
    width: 31px;
    height: 31px;
    border: 3px solid var(--divider-color, #e0e0e0);
    border-top-color: var(--primary-color, #03a9f4);
    border-radius: 50%;
    box-sizing: border-box;
    animation: ota-spin 0.8s linear infinite;
    flex-shrink: 0;
  }
  @keyframes ota-spin {
    to { transform: rotate(360deg); }
  }
  .ota-success {
    --mdc-icon-size: 36px;
    color: var(--success-color, #4caf50);
    flex-shrink: 0;
  }
  .ota-error {
    display: flex;
    align-items: center;
    gap: 4px;
    position: relative;
    flex-shrink: 0;
  }
  .ota-error-icon {
    --mdc-icon-size: 20px;
    color: var(--error-color, #f44336);
    cursor: pointer;
  }
  .ota-error-popover {
    position: absolute;
    bottom: 100%;
    right: 0;
    background: var(--error-color, #f44336);
    color: white;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 12px;
    white-space: nowrap;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    z-index: 10;
    margin-bottom: 4px;
  }

  .integration-version {
    font-size: 0.8em;
    font-weight: normal;
    opacity: 0.7;
    margin-left: 8px;
  }

  .update-banner {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    margin-bottom: 16px;
    background: var(--info-color, #2196f3);
    color: white;
    border-radius: 8px;
  }
  .update-banner ha-icon {
    --mdc-icon-size: 24px;
    flex-shrink: 0;
    margin-top: 2px;
  }
  .update-banner p {
    margin: 4px 0 8px;
  }
  .update-banner .update-link {
    color: white;
    font-weight: 500;
    text-decoration: underline;
  }

  ha-button[raised] {
    --mdc-theme-primary: var(--primary-color, #03a9f4);
  }

  .usb-section {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px 8px;
  }

  .usb-icon {
    --mdc-icon-size: 32px;
    color: var(--secondary-text-color, #757575);
    flex-shrink: 0;
  }

  .usb-section-text {
    flex: 1;
    min-width: 0;
  }

  .usb-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--primary-text-color, #212121);
  }

  .usb-description {
    font-size: 13px;
    color: var(--secondary-text-color, #757575);
    margin-top: 2px;
  }

  .usb-actions {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .usb-action {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 12px;
    cursor: pointer;
    transition: background 0.15s;
  }

  .usb-action:hover {
    background: var(--secondary-background-color, #f5f5f5);
  }

  .usb-action ha-icon {
    --mdc-icon-size: 28px;
    color: var(--primary-color, #03a9f4);
    flex-shrink: 0;
  }

  .usb-action-text {
    flex: 1;
    min-width: 0;
  }

  .usb-action-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--primary-text-color, #212121);
  }

  .usb-action-desc {
    font-size: 13px;
    color: var(--secondary-text-color, #757575);
    margin-top: 2px;
  }

  .usb-connect-btn {
    padding: 8px 20px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    background: var(--primary-color, #03a9f4);
    color: var(--text-primary-color, #fff);
    flex-shrink: 0;
  }

  .usb-flash-iframe {
    display: block;
    width: 100%;
    height: 500px;
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 12px;
    margin: 16px 0;
    background: var(--card-background-color, #fff);
  }

  .browser-warning {
    margin-top: 8px;
    font-size: 12px;
    color: var(--warning-color, #ff9800);
  }

  .usb-select-label {
    margin: 0 0 12px;
    font-size: 14px;
    color: var(--secondary-text-color, #757575);
  }

  .usb-error {
    text-align: center;
    padding: 24px 0;
    color: var(--error-color, #f44336);
  }

  .usb-error ha-icon {
    --mdc-icon-size: 48px;
    margin-bottom: 8px;
  }

  .usb-error p {
    margin: 0;
    font-size: 14px;
  }

  .usb-complete {
    text-align: center;
    padding: 24px 0;
    color: var(--success-color, #4caf50);
    max-width: 400px;
    margin: 0 auto;
  }

  .usb-complete ha-icon {
    --mdc-icon-size: 48px;
    margin-bottom: 16px;
  }

  .usb-complete p {
    margin: 4px 0;
    font-size: 14px;
  }

  .usb-ip {
    color: var(--primary-text-color, #212121);
    font-weight: 500;
    margin-top: 4px;
  }

  .usb-status {
    text-align: center;
    padding: 24px 0;
  }

  .usb-status p {
    margin: 0;
    font-size: 14px;
    color: var(--primary-text-color, #212121);
  }

  .usb-hint {
    margin-top: 12px !important;
    font-size: 12px !important;
    color: var(--secondary-text-color, #757575) !important;
  }

  .wifi-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  ha-select,
  ha-textfield {
    width: 100%;
  }

  .usb-progress {
    margin-top: 16px;
    background: var(--divider-color, #e0e0e0);
    border-radius: 4px;
    height: 8px;
    position: relative;
    overflow: hidden;
  }

  .usb-progress-bar {
    height: 100%;
    background: var(--primary-color, #03a9f4);
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .usb-progress span {
    display: block;
    text-align: center;
    margin-top: 8px;
    font-size: 13px;
    color: var(--secondary-text-color, #757575);
  }

  .flasher-loading {
    padding: 32px 24px;
    text-align: center;
    color: var(--secondary-text-color, #757575);
    font-size: 14px;
  }

  .flasher-empty {
    padding: 24px 16px 32px;
    text-align: center;
    color: var(--secondary-text-color, #757575);
  }

  .flasher-empty ha-icon {
    --mdc-icon-size: 48px;
    margin-bottom: 8px;
    opacity: 0.5;
  }

  .flasher-empty p {
    margin: 0;
    font-size: 14px;
  }

  .variant-selector {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
  }


  .confirm-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

`,Lt=a`
  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 4px 4px 12px;
  }

  .sidebar-header .sidebar-title {
    padding: 0;
  }

  .sidebar-menu-wrapper {
    position: relative;
  }

  .sidebar-menu-btn {
    background: none;
    border: none;
    color: var(--secondary-text-color, #757575);
    cursor: pointer;
    padding: 4px;
    border-radius: 6px;
    display: flex;
  }

  .sidebar-menu-btn:hover {
    background: var(--secondary-background-color, #f0f0f0);
  }

  .sidebar-menu {
    position: absolute;
    top: 100%;
    right: 0;
    background: var(--card-background-color, #fff);
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 10px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    z-index: 100;
    min-width: 220px;
    padding: 4px 0;
  }

  .sidebar-menu-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px 14px;
    border: none;
    background: none;
    color: var(--primary-text-color, #212121);
    font-size: 13px;
    cursor: pointer;
    text-align: left;
  }

  .sidebar-menu-item:hover {
    background: var(--secondary-background-color, #f5f5f5);
  }
`,Nt=["M12 13C12.8 13 13.61 13.13 14.38 13.36C14.28 13.73 14.2 14.11 14.2 14.5V14.74C13.5 15.34 13 16.24 13 17.2V20.24L12 21.5C7.88 16.37 4.39 12.06 .365 7C3.69 4.41 7.78 3 12 3C16.2 3 20.31 4.41 23.64 7L20.91 10.39C20.32 10.14 19.68 10 19 10C18.87 10 18.75 10.03 18.62 10.04L20.7 7.45C18.08 5.86 15.06 5 12 5S5.9 5.85 3.26 7.44L8.38 13.8C9.5 13.28 10.74 13 12 13M23 17.3V20.8C23 21.4 22.4 22 21.7 22H16.2C15.6 22 15 21.4 15 20.7V17.2C15 16.6 15.6 16 16.2 16V14.5C16.2 13.1 17.6 12 19 12S21.8 13.1 21.8 14.5V16C22.4 16 23 16.6 23 17.3M20.5 14.5C20.5 13.7 19.8 13.2 19 13.2S17.5 13.7 17.5 14.5V16H20.5V14.5Z","M14.2 14.5V14.74C13.5 15.34 13 16.24 13 17.2V20.24L12 21.5C7.88 16.37 4.39 12.06 .365 7C3.69 4.41 7.78 3 12 3C16.2 3 20.31 4.41 23.64 7L20.91 10.39C20.32 10.14 19.68 10 19 10C18.87 10 18.74 10.03 18.61 10.04L20.7 7.45C18.08 5.86 15.06 5 12 5S5.9 5.85 3.26 7.44L6.5 11.43C7.73 10.75 9.61 10 12 10C13.68 10 15.12 10.38 16.26 10.84C15.03 11.67 14.2 13 14.2 14.5M23 17.3V20.8C23 21.4 22.4 22 21.7 22H16.2C15.6 22 15 21.4 15 20.7V17.2C15 16.6 15.6 16 16.2 16V14.5C16.2 13.1 17.6 12 19 12S21.8 13.1 21.8 14.5V16C22.4 16 23 16.6 23 17.3M20.5 14.5C20.5 13.7 19.8 13.2 19 13.2S17.5 13.7 17.5 14.5V16H20.5V14.5Z","M19 10C19.68 10 20.32 10.14 20.91 10.39L23.64 7C20.31 4.41 16.2 3 12 3C7.78 3 3.69 4.41 .365 7C4.39 12.06 7.88 16.37 12 21.5L13 20.24V17.2C13 16.24 13.5 15.34 14.2 14.74V14.5C14.2 12.06 16.4 10 19 10M12 8C9 8 6.67 9 5.2 9.84L3.26 7.44C5.9 5.85 8.91 5 12 5S18.08 5.86 20.7 7.45L18.76 9.88C17.25 9 14.87 8 12 8M21.8 16V14.5C21.8 13.1 20.4 12 19 12S16.2 13.1 16.2 14.5V16C15.6 16 15 16.6 15 17.2V20.7C15 21.4 15.6 22 16.2 22H21.7C22.4 22 23 21.4 23 20.8V17.3C23 16.6 22.4 16 21.8 16M20.5 16H17.5V14.5C17.5 13.7 18.2 13.2 19 13.2S20.5 13.7 20.5 14.5V16Z","M14.2 14.5V14.74C13.5 15.34 13 16.24 13 17.2V20.24L12 21.5C7.88 16.37 4.39 12.06 .365 7C3.69 4.41 7.78 3 12 3C16.2 3 20.31 4.41 23.64 7L20.91 10.39C20.32 10.14 19.68 10 19 10C16.4 10 14.2 12.06 14.2 14.5M23 17.3V20.8C23 21.4 22.4 22 21.7 22H16.2C15.6 22 15 21.4 15 20.7V17.2C15 16.6 15.6 16 16.2 16V14.5C16.2 13.1 17.6 12 19 12S21.8 13.1 21.8 14.5V16C22.4 16 23 16.6 23 17.3M20.5 14.5C20.5 13.7 19.8 13.2 19 13.2S17.5 13.7 17.5 14.5V16H20.5V14.5Z"],Yt=["M12 13C12.74 13 13.5 13.12 14.22 13.31C14.22 13.38 14.2 13.44 14.2 13.5V14.74C13.5 15.34 13 16.24 13 17.2V20.24L12 21.5C7.88 16.37 4.39 12.06 .365 7C3.69 4.41 7.78 3 12 3C16.2 3 20.31 4.41 23.64 7L21.5 9.69C20.86 9.33 20.16 9.11 19.42 9.04L20.7 7.45C18.08 5.86 15.06 5 12 5S5.9 5.85 3.26 7.44L8.38 13.8C9.5 13.28 10.74 13 12 13M21.8 16H17.5V13.5C17.5 12.7 18.2 12.2 19 12.2S20.5 12.7 20.5 13.5V14H21.8V13.5C21.8 12.1 20.4 11 19 11S16.2 12.1 16.2 13.5V16C15.6 16 15 16.6 15 17.2V20.7C15 21.4 15.6 22 16.2 22H21.7C22.4 22 23 21.4 23 20.8V17.3C23 16.6 22.4 16 21.8 16Z","M15.44 10.55C14.68 11.35 14.2 12.38 14.2 13.5V14.74C13.5 15.34 13 16.24 13 17.2V20.24L12 21.5C7.88 16.37 4.39 12.06 .365 7C3.69 4.41 7.78 3 12 3C16.2 3 20.31 4.41 23.64 7L21.5 9.69C20.86 9.33 20.16 9.1 19.41 9.04L20.7 7.45C18.08 5.86 15.06 5 12 5S5.9 5.85 3.26 7.44L6.5 11.43C7.73 10.75 9.61 10 12 10C13.29 10 14.45 10.23 15.44 10.55M21.8 16H17.5V13.5C17.5 12.7 18.2 12.2 19 12.2S20.5 12.7 20.5 13.5V14H21.8V13.5C21.8 12.1 20.4 11 19 11S16.2 12.1 16.2 13.5V16C15.6 16 15 16.6 15 17.2V20.7C15 21.4 15.6 22 16.2 22H21.7C22.4 22 23 21.4 23 20.8V17.3C23 16.6 22.4 16 21.8 16Z","M14.2 13.5V14.74C13.5 15.34 13 16.24 13 17.2V20.24L12 21.5C7.88 16.37 4.39 12.06 .365 7C3.69 4.41 7.78 3 12 3C16.2 3 20.31 4.41 23.64 7L21.5 9.69C20.86 9.33 20.17 9.11 19.42 9.04L20.7 7.45C18.08 5.86 15.06 5 12 5S5.9 5.85 3.26 7.44L5.2 9.84C6.67 9 9 8 12 8C14.18 8 16.08 8.58 17.53 9.25C15.63 9.85 14.2 11.54 14.2 13.5M21.8 16H17.5V13.5C17.5 12.7 18.2 12.2 19 12.2S20.5 12.7 20.5 13.5V14H21.8V13.5C21.8 12.1 20.4 11 19 11S16.2 12.1 16.2 13.5V16C15.6 16 15 16.6 15 17.2V20.7C15 21.4 15.6 22 16.2 22H21.7C22.4 22 23 21.4 23 20.8V17.3C23 16.6 22.4 16 21.8 16Z","M14.2 13.5V14.74C13.5 15.34 13 16.24 13 17.2V20.24L12 21.5C7.88 16.37 4.39 12.06 .365 7C3.69 4.41 7.78 3 12 3C16.2 3 20.31 4.41 23.64 7L21.5 9.69C20.75 9.26 19.9 9 19 9C16.4 9 14.2 11.06 14.2 13.5M21.8 16H17.5V13.5C17.5 12.7 18.2 12.2 19 12.2S20.5 12.7 20.5 13.5V14H21.8V13.5C21.8 12.1 20.4 11 19 11S16.2 12.1 16.2 13.5V16C15.6 16 15 16.6 15 17.2V20.7C15 21.4 15.6 22 16.2 22H21.7C22.4 22 23 21.4 23 20.8V17.3C23 16.6 22.4 16 21.8 16Z"];function $t(e,t){const i=e>=-50?3:e>=-65?2:e>=-75?1:0;return t?Nt[i]:Yt[i]}class Kt extends ce{constructor(){super(...arguments),this.flashableDevices=[],this.loading=!1,this.localize=It,this._selectedVariant="wifi",this.firmwareBaseUrl="",this.firmwareVersion="",this.integrationVersion="",this.usbFlashState=null,this.wifiNetworks=[],this.otaStates={},this._hasWebSerial="undefined"!=typeof navigator&&"serial"in navigator,this._showUsbFlash=!1,this._wifiScanning=!1,this._selectedSsid="",this._manualSsid=!1,this._wifiPassword="",this._wifiConnected=!1,this._deviceIp=null,this._showWifiProvisioning=!1,this._errorPopoverMac=null}_dispatchUpdateFirmware(e){this.dispatchEvent(new CustomEvent("update-firmware",{detail:{mac:e.mac},bubbles:!0,composed:!0}))}_toggleErrorPopover(e,t){e.stopPropagation(),this._errorPopoverMac=this._errorPopoverMac===t?null:t}_dispatchRetryOta(e){this._errorPopoverMac=null,this.dispatchEvent(new CustomEvent("retry-ota",{detail:{mac:e.mac},bubbles:!0,composed:!0}))}_renderOtaIndicator(e){const t=this.otaStates[e.mac];if(!t)return J;switch(t.state){case"updating":{if(null==t.progress)return Y`<div class="ota-spinner"></div>`;const e=14,i=2*Math.PI*e,s=i-t.progress/100*i;return Y`
					<div class="ota-progress">
						<svg width="36" height="36" viewBox="0 0 36 36">
							<circle class="ota-track" cx="18" cy="18" r="${e}" />
							<circle class="ota-fill" cx="18" cy="18" r="${e}"
								stroke-dasharray="${i}"
								stroke-dashoffset="${s}" />
						</svg>
						<span class="ota-pct">${Math.round(t.progress)}</span>
					</div>`}case"success":return Y`<ha-icon class="ota-success" icon="mdi:check-circle"></ha-icon>`;case"error":return Y`
					<div class="ota-error">
						<ha-icon class="ota-error-icon"
							icon="mdi:alert-circle"
							@click=${t=>this._toggleErrorPopover(t,e.mac)}
						></ha-icon>
						${e.available?Y`<ha-button @click=${()=>this._dispatchRetryOta(e)}>
								${this.localize("flasher.ota_retry")}
							</ha-button>`:J}
						${this._errorPopoverMac===e.mac?Y`<div class="ota-error-popover">${t.errorKey?this.localize(t.errorKey,t.errorParams):""}</div>`:J}
					</div>`}}_onUsbConnect(){this._showUsbFlash=!0}_dispatchFlashComplete(){this.dispatchEvent(new CustomEvent("flash-complete",{bubbles:!0,composed:!0}))}_dispatchUsbFlash(){this.dispatchEvent(new CustomEvent("usb-flash",{detail:{variant:this._getFirmwareVariant()},bubbles:!0,composed:!0}))}_dispatchUsbRetry(){this.dispatchEvent(new CustomEvent("usb-retry",{bubbles:!0,composed:!0}))}_onUsbBack(){this._showUsbFlash=!1,this._showWifiProvisioning=!1,this.dispatchEvent(new CustomEvent("usb-retry",{bubbles:!0,composed:!0}))}_dispatchWifiScan(){this.dispatchEvent(new CustomEvent("wifi-scan",{bubbles:!0,composed:!0}))}_dispatchWifiProvision(){this.dispatchEvent(new CustomEvent("wifi-provision",{detail:{ssid:this._selectedSsid,password:this._wifiPassword},bubbles:!0,composed:!0}))}_dispatchWifiComplete(){this.dispatchEvent(new CustomEvent("wifi-complete",{bubbles:!0,composed:!0}))}_renderLoading(){return Y`<div class="flasher-loading">${this.localize("flasher.loading")}</div>`}_renderWifiProvisioning(){if(this._wifiConnected)return Y`
        <div class="flasher-content">
          <ha-card>
            <div class="card-header">${this.localize("flasher.configure_wifi")}</div>
            <div class="card-content">
              <div class="usb-complete">
                <ha-icon icon="mdi:wifi-check"></ha-icon>
                <p>${this.localize("flasher.connected_to",{ssid:this._selectedSsid})}</p>
                ${this._deviceIp?Y`<p class="usb-ip">${this.localize("flasher.ip_address",{ip:this._deviceIp})}</p>`:J}
              </div>
              <div class="confirm-actions">
                <ha-button raised @click=${this._dispatchWifiComplete}>
                  ${this.localize("flasher.continue")}
                </ha-button>
              </div>
            </div>
          </ha-card>
        </div>
      `;const e=[...this.wifiNetworks].sort((e,t)=>t.rssi-e.rssi),t=this._manualSsid||0===e.length;return Y`
      <div class="flasher-content">
        <ha-card>
          <div class="card-header">${this.localize("flasher.configure_wifi")}</div>
          <div class="card-content wifi-form">

            ${e.length>0?Y`
                <ha-select
                  .label=${this.localize("flasher.select_a_network")}
                  .value=${this._selectedSsid}
                  .options=${e.map(e=>({value:e.ssid,label:e.ssid,iconPath:$t(e.rssi,e.authRequired)}))}
                  @selected=${e=>{this._selectedSsid=e.detail.value,this._manualSsid=!1}}
                  @closed=${e=>e.stopPropagation()}
                ></ha-select>
              `:J}

            <ha-formfield .label=${this.localize("flasher.manual_ssid")}>
              <ha-checkbox
                .checked=${t}
                @change=${e=>{this._manualSsid=e.target.checked,this._manualSsid||(this._selectedSsid="")}}
              ></ha-checkbox>
            </ha-formfield>

            ${t?Y`
                <ha-textfield
                  .label=${this.localize("flasher.enter_ssid")}
                  autocomplete="off"
                  .value=${this._selectedSsid}
                  @input=${e=>{this._selectedSsid=e.target.value}}
                ></ha-textfield>
              `:J}

            <ha-textfield
              .label=${this.localize("flasher.wifi_password")}
              type="password"
              autocomplete="new-password"
              .value=${this._wifiPassword}
              @input=${e=>{this._wifiPassword=e.target.value}}
            ></ha-textfield>

            <div class="confirm-actions">
              <ha-button @click=${this._onUsbBack}>
                ${this.localize("flasher.usb_back")}
              </ha-button>
              <ha-button @click=${this._dispatchWifiScan}>
                ${this._wifiScanning?this.localize("flasher.scanning"):this.localize("flasher.scan")}
              </ha-button>
              <ha-button
                raised
                .disabled=${!this._selectedSsid}
                @click=${this._dispatchWifiProvision}
              >
                ${this.localize("flasher.connect")}
              </ha-button>
            </div>
          </div>
        </ha-card>
      </div>
    `}_renderDeviceList(){const{flashableDevices:e}=this,t=e.some(e=>"eppgrid"===e.firmware_type&&"firmware_ahead"===e.firmware_status);return Y`
      <div class="flasher-content">
        ${t?Y`
          <div class="update-banner">
            <ha-icon icon="mdi:information"></ha-icon>
            <div>
              <strong>${this.localize("flasher.integration_outdated_title")}</strong>
              <p>${this.localize("flasher.integration_outdated_body")}</p>
              <a href="/hacs/repository/1172848595" class="update-link">${this.localize("flasher.open_hacs")}</a>
            </div>
          </div>
        `:J}
        <ha-card>
          <div class="card-header">
            ${this.localize("flasher.devices_on_network")}
            ${this.integrationVersion?Y`<span class="integration-version">v${this.integrationVersion}</span>`:J}
          </div>
          <div class="card-content">
            ${0===e.length?Y`<div class="flasher-empty">
                  <ha-icon icon="mdi:access-point-off"></ha-icon>
                  <p>${this.localize("flasher.no_devices")}</p>
                </div>`:Y`
                <div class="device-list">
                  ${e.map(e=>{const t=!e.available||"original"===e.firmware_type;return Y`
                      <div class="device-row">
                        <div class="device-info${t?" device-info-faded":""}">
                          <div class="device-name">${e.name} <span class="device-mac">(${e.mac.replace(/:/g,"").slice(-6).toLowerCase()})</span></div>
                          <div class="device-host">${e.host??this.localize("flasher.offline")}${"eppgrid"===e.firmware_type&&e.firmware_version&&"unknown"!==e.firmware_version?` - v${e.firmware_version}`:""}</div>
                        </div>
                        ${e.available?J:Y`<span class="firmware-badge firmware-badge-offline">${this.localize("flasher.offline")}</span>`}
                        ${"original"===e.firmware_type?Y`<span class="firmware-badge firmware-badge-original">${this.localize("flasher.flash_usb")}</span>`:J}
                        ${"eppgrid"===e.firmware_type&&"firmware_ahead"===e.firmware_status?Y`<span class="firmware-badge firmware-badge-ahead">${this.localize("flasher.integration_update")}</span>`:J}
                        ${this.otaStates[e.mac]?this._renderOtaIndicator(e):"eppgrid"!==e.firmware_type||!e.update_available&&"firmware_behind"!==e.firmware_status?J:Y`<ha-button
																		raised
																		@click=${()=>this._dispatchUpdateFirmware(e)}
																	>${this.localize("flasher.update")}</ha-button>`}
                      </div>
                    `})}
                </div>
              `}
          </div>
        </ha-card>
        ${this._renderUsbSection()}
      </div>
    `}_dispatchUsbWifiConfig(){this.dispatchEvent(new CustomEvent("usb-wifi-config",{bubbles:!0,composed:!0}))}_renderUsbSection(){return Y`
      <ha-card>
        <div class="card-header">${this.localize("flasher.usb_title")}</div>
        <div class="card-content">
          ${this._hasWebSerial?J:Y`<div class="browser-warning">
                ${this.localize("flasher.usb_browser_warning")}
              </div>`}
          <div class="usb-actions">
            <div class="usb-action" @click=${this._onUsbConnect}>
              <ha-icon icon="mdi:chip"></ha-icon>
              <div class="usb-action-text">
                <div class="usb-action-title">${this.localize("flasher.usb_flash_title")}</div>
                <div class="usb-action-desc">${this.localize("flasher.usb_flash_desc")}</div>
              </div>
            </div>
            <div class="usb-action" @click=${this._dispatchUsbWifiConfig}>
              <ha-icon icon="mdi:wifi-cog"></ha-icon>
              <div class="usb-action-text">
                <div class="usb-action-title">${this.localize("flasher.usb_wifi_title")}</div>
                <div class="usb-action-desc">${this.localize("flasher.usb_wifi_desc")}</div>
              </div>
            </div>
          </div>
        </div>
      </ha-card>
    `}render(){return this.loading?this._renderLoading():this._showWifiProvisioning?this._renderWifiProvisioning():this._showUsbFlash||this.usbFlashState?this._renderUsbFlash():this._renderDeviceList()}_getFirmwareVariant(){return"wifi"===this._selectedVariant?"wifi-ble-co2":"ethernet-ble-co2"}_getManifestUrl(){const e=this._getFirmwareVariant();return`${this.firmwareBaseUrl}/everything-presence-pro-${e}-manifest.json`}_renderUsbFlash(){const e=this.usbFlashState;if("wifi_provision"===e?.step)return this._renderWifiProvisioning();if("error"===e?.step)return Y`
				<div class="flasher-content">
					<ha-card>
						<div class="card-content">
							<div class="usb-error">
								<ha-icon icon="mdi:alert-circle-outline"></ha-icon>
								<p>${e.errorKey?this.localize(e.errorKey,e.errorParams):""}</p>
							</div>
							<div class="confirm-actions">
								<ha-button @click=${this._onUsbBack}>
									${this.localize("flasher.usb_back")}
								</ha-button>
								${e.fatal?J:Y`<ha-button raised @click=${this._dispatchUsbRetry}>
									${this.localize("flasher.usb_retry")}
								</ha-button>`}
							</div>
						</div>
					</ha-card>
				</div>
			`;if("complete"===e?.step){const t=e.variant?.startsWith("ethernet");return Y`
				<div class="flasher-content">
					<ha-card>
						<div class="card-content">
							<div class="usb-complete">
								<ha-icon icon="mdi:check-circle-outline"></ha-icon>
								${t?Y`<p>${this.localize("flasher.usb_ethernet_complete")}</p>
											<p>${this.localize("flasher.usb_ethernet_hint")}</p>`:e.ip?Y`
											<p>${this.localize("flasher.usb_step_complete")}</p>
											<p class="usb-ip">${this.localize("flasher.ip_address")}: ${e.ip}</p>
										`:Y`
											<p>${this.localize("flasher.wifi_connected")}</p>
										`}
							</div>
							<div class="confirm-actions">
								${t?Y`<a href="/config/devices/dashboard">
										<ha-button raised>${this.localize("flasher.go_to_devices")}</ha-button>
									</a>`:e.ip?Y`<ha-button raised @click=${this._dispatchFlashComplete}>
											${this.localize("flasher.go_to_config")}
										</ha-button>`:Y`<ha-button raised @click=${this._dispatchFlashComplete}>
											${this.localize("flasher.done")}
										</ha-button>`}
							</div>
						</div>
					</ha-card>
				</div>
			`}if(e&&"idle"!==e.step){const t={connecting:"flasher.usb_step_connecting",flashing:"flasher.usb_step_flashing",wifi_scan:"flasher.usb_step_scanning",wifi_provision:"flasher.usb_step_provisioning",wifi_connecting:"flasher.usb_step_wifi_connecting",reading_ip:"flasher.usb_step_reading_ip",adding_device:"flasher.usb_step_adding"}[e.step]??e.step,i="flashing"===e.step?{version:this.firmwareVersion}:void 0;return Y`
				<div class="flasher-content">
					<ha-card>
						<div class="card-content">
							<div class="usb-status">
								<p>${this.localize(t,i)}</p>
								${"flashing"===e.step&&null!=e.progress?Y`<div class="usb-progress">
											<div class="usb-progress-bar" style="width: ${e.progress}%"></div>
											<span>${e.progress}%</span>
										</div>`:J}
								${"wifi_scan"===e.step?Y`<p class="usb-hint">${this.localize("flasher.wifi_scan_hint")}</p>`:J}
							</div>
						</div>
					</ha-card>
				</div>
			`}return Y`
			<div class="flasher-content">
				<ha-card>
					<div class="card-header">${this.localize("flasher.title")}</div>
					<div class="card-content">
						<p class="usb-select-label">${this.localize("flasher.select_variant")}</p>
						<div class="variant-selector">
							<ha-button
								class="${"wifi"===this._selectedVariant?"selected":"unselected"}"
								appearance="${"wifi"===this._selectedVariant?"accent":"outlined"}"
								@click=${()=>{this._selectedVariant="wifi"}}
							>${this.localize("flasher.wifi")}</ha-button>
							<ha-button
								class="${"ethernet"===this._selectedVariant?"selected":"unselected"}"
								appearance="${"ethernet"===this._selectedVariant?"accent":"outlined"}"
								@click=${()=>{this._selectedVariant="ethernet"}}
							>${this.localize("flasher.ethernet")}</ha-button>
						</div>
						<div class="confirm-actions">
							<ha-button @click=${this._onUsbBack}>
								${this.localize("flasher.usb_back")}
							</ha-button>
							<ha-button raised @click=${this._dispatchUsbFlash}>
								${this.localize("flasher.usb_flash")}
							</ha-button>
						</div>
					</div>
				</ha-card>
			</div>
		`}}Kt.styles=[Gt],e([ge({attribute:!1})],Kt.prototype,"hass",void 0),e([ge({attribute:!1})],Kt.prototype,"flashableDevices",void 0),e([ge({type:Boolean})],Kt.prototype,"loading",void 0),e([ge({attribute:!1})],Kt.prototype,"localize",void 0),e([ue()],Kt.prototype,"_selectedVariant",void 0),e([ge()],Kt.prototype,"firmwareBaseUrl",void 0),e([ge()],Kt.prototype,"firmwareVersion",void 0),e([ge()],Kt.prototype,"integrationVersion",void 0),e([ge({attribute:!1})],Kt.prototype,"usbFlashState",void 0),e([ge({attribute:!1})],Kt.prototype,"wifiNetworks",void 0),e([ge({attribute:!1})],Kt.prototype,"otaStates",void 0),e([ue()],Kt.prototype,"_hasWebSerial",void 0),e([ue()],Kt.prototype,"_showUsbFlash",void 0),e([ue()],Kt.prototype,"_wifiScanning",void 0),e([ue()],Kt.prototype,"_selectedSsid",void 0),e([ue()],Kt.prototype,"_manualSsid",void 0),e([ue()],Kt.prototype,"_wifiPassword",void 0),e([ue()],Kt.prototype,"_wifiConnected",void 0),e([ue()],Kt.prototype,"_deviceIp",void 0),e([ue()],Kt.prototype,"_showWifiProvisioning",void 0),e([ue()],Kt.prototype,"_errorPopoverMac",void 0),customElements.get("epp-flasher-view")||customElements.define("epp-flasher-view",Kt)
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */;const Jt=2,Wt=e=>(...t)=>({_$litDirective$:e,values:t});class jt{constructor(e){}get _$AU(){return this._$AM._$AU}_$AT(e,t,i){this._$Ct=e,this._$AM=t,this._$Ci=i}_$AS(e,t){return this.update(e,t)}update(e,t){return this.render(...t)}}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class Vt extends jt{constructor(e){if(super(e),this.it=J,e.type!==Jt)throw Error(this.constructor.directiveName+"() can only be used in child bindings")}render(e){if(e===J||null==e)return this._t=void 0,this.it=e;if(e===K)return e;if("string"!=typeof e)throw Error(this.constructor.directiveName+"() called with a non-string value");if(e===this.it)return this._t;this.it=e;const t=[e];return t.raw=t,this._t={_$litType$:this.constructor.resultType,strings:t,values:[]}}}Vt.directiveName="unsafeHTML",Vt.resultType=1;const Zt=Wt(Vt);
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class Xt extends Vt{}Xt.directiveName="unsafeSVG",Xt.resultType=2;const qt=Wt(Xt),ei=20,ti=20,ii=400,si=300,oi=6e3,ri=e=>!!(1&e),ai=e=>e>>1&7,ni=(e,t)=>-15&e|(7&t)<<1,li=e=>!!(16&e),ci=e=>e>>5&7,hi=(e,t)=>t>0?-17&(-225&e|(7&t)<<5):-225&e;function di(e){let t=ei,i=0,s=ti,o=0;for(let r=0;r<ii;r++)if(ri(e[r])){const e=r%ei,a=Math.floor(r/ei);e<t&&(t=e),e>i&&(i=e),a<s&&(s=a),a>o&&(o=a)}return{minCol:Math.max(0,t-1),maxCol:Math.min(19,i+1),minRow:Math.max(0,s-1),maxRow:Math.min(19,o+1)}}function Ai(e){let t=ei,i=0,s=ti,o=0;for(let r=0;r<ii;r++)if(ri(e[r])){const e=r%ei,a=Math.floor(r/ei);e<t&&(t=e),e>i&&(i=e),a<s&&(s=a),a>o&&(o=a)}return{minCol:t,maxCol:i,minRow:s,maxRow:o}}function gi(e,t){const i=new Uint8Array(ii),s=Math.ceil(e/si),o=Math.ceil(t/si),r=Math.floor((ei-s)/2);for(let e=0;e<ti;e++)for(let t=0;t<ei;t++){t>=r&&t<r+s&&e>=0&&e<0+o&&(i[e*ei+t]=1)}return i}const ui={armchair:{viewBox:"0 0 100 100",content:'<path d="M 15,10 Q 15,5 20,5 L 80,5 Q 85,5 85,10 L 85,25 L 15,25 Z" stroke="black" stroke-width="2" fill="none"/><path d="M 10,15 Q 5,15 5,20 L 5,80 Q 5,85 10,85 L 20,85 L 20,15 Z" stroke="black" stroke-width="2" fill="none"/><path d="M 80,15 L 80,85 L 90,85 Q 95,85 95,80 L 95,20 Q 95,15 90,15 Z" stroke="black" stroke-width="2" fill="none"/><rect x="20" y="25" width="60" height="60" rx="3" ry="3" stroke="black" stroke-width="2" fill="none"/>'},car:{viewBox:"0 0 80 160",content:'<rect x="8" y="5" width="64" height="150" rx="20" ry="20" stroke="black" stroke-width="2" fill="none"/><path d="M 14,35 L 14,50 Q 14,55 20,55 L 60,55 Q 66,55 66,50 L 66,35" stroke="black" stroke-width="1.5" fill="none"/><path d="M 14,125 L 14,115 Q 14,110 20,110 L 60,110 Q 66,110 66,115 L 66,125" stroke="black" stroke-width="1.5" fill="none"/><rect x="14" y="55" width="52" height="55" rx="3" ry="3" stroke="black" stroke-width="1.5" fill="none"/><ellipse cx="4" cy="48" rx="4" ry="3" stroke="black" stroke-width="2" fill="none"/><ellipse cx="76" cy="48" rx="4" ry="3" stroke="black" stroke-width="2" fill="none"/><rect x="2" y="25" width="6" height="16" rx="2" ry="2" fill="black"/><rect x="72" y="25" width="6" height="16" rx="2" ry="2" fill="black"/><rect x="2" y="118" width="6" height="16" rx="2" ry="2" fill="black"/><rect x="72" y="118" width="6" height="16" rx="2" ry="2" fill="black"/><circle cx="22" cy="12" r="4" stroke="black" stroke-width="2" fill="none"/><circle cx="58" cy="12" r="4" stroke="black" stroke-width="2" fill="none"/>'},carpet:{viewBox:"0 0 140 90",content:'<rect x="5" y="5" width="130" height="80" rx="2" ry="2" stroke="black" stroke-width="2" fill="none"/><rect x="15" y="15" width="110" height="60" rx="1" ry="1" stroke="black" stroke-width="1" fill="none"/><line x1="15" y1="5" x2="15" y2="1" stroke="black" stroke-width="1.5"/><line x1="25" y1="5" x2="25" y2="1" stroke="black" stroke-width="1.5"/><line x1="35" y1="5" x2="35" y2="1" stroke="black" stroke-width="1.5"/><line x1="45" y1="5" x2="45" y2="1" stroke="black" stroke-width="1.5"/><line x1="55" y1="5" x2="55" y2="1" stroke="black" stroke-width="1.5"/><line x1="65" y1="5" x2="65" y2="1" stroke="black" stroke-width="1.5"/><line x1="75" y1="5" x2="75" y2="1" stroke="black" stroke-width="1.5"/><line x1="85" y1="5" x2="85" y2="1" stroke="black" stroke-width="1.5"/><line x1="95" y1="5" x2="95" y2="1" stroke="black" stroke-width="1.5"/><line x1="105" y1="5" x2="105" y2="1" stroke="black" stroke-width="1.5"/><line x1="115" y1="5" x2="115" y2="1" stroke="black" stroke-width="1.5"/><line x1="125" y1="5" x2="125" y2="1" stroke="black" stroke-width="1.5"/><line x1="15" y1="85" x2="15" y2="89" stroke="black" stroke-width="1.5"/><line x1="25" y1="85" x2="25" y2="89" stroke="black" stroke-width="1.5"/><line x1="35" y1="85" x2="35" y2="89" stroke="black" stroke-width="1.5"/><line x1="45" y1="85" x2="45" y2="89" stroke="black" stroke-width="1.5"/><line x1="55" y1="85" x2="55" y2="89" stroke="black" stroke-width="1.5"/><line x1="65" y1="85" x2="65" y2="89" stroke="black" stroke-width="1.5"/><line x1="75" y1="85" x2="75" y2="89" stroke="black" stroke-width="1.5"/><line x1="85" y1="85" x2="85" y2="89" stroke="black" stroke-width="1.5"/><line x1="95" y1="85" x2="95" y2="89" stroke="black" stroke-width="1.5"/><line x1="105" y1="85" x2="105" y2="89" stroke="black" stroke-width="1.5"/><line x1="115" y1="85" x2="115" y2="89" stroke="black" stroke-width="1.5"/><line x1="125" y1="85" x2="125" y2="89" stroke="black" stroke-width="1.5"/>'},"cat-bed":{viewBox:"0 0 70 70",content:'<circle cx="35" cy="35" r="30" stroke="black" stroke-width="2" fill="none"/><circle cx="35" cy="35" r="20" stroke="black" stroke-width="2" fill="none"/><path d="M 38,30 Q 45,28 44,35 Q 43,42 35,41 Q 28,40 30,34" stroke="black" stroke-width="1.5" fill="none"/><path d="M 36,28 L 38,23 L 41,27" stroke="black" stroke-width="1.5" fill="none"/>'},"dog-bed":{viewBox:"0 0 100 80",content:'<ellipse cx="50" cy="40" rx="45" ry="35" stroke="black" stroke-width="2" fill="none"/><ellipse cx="50" cy="40" rx="32" ry="22" stroke="black" stroke-width="2" fill="none"/><circle cx="46" cy="36" r="4" stroke="black" stroke-width="1.5" fill="none"/><circle cx="40" cy="29" r="2" stroke="black" stroke-width="1" fill="none"/><circle cx="47" cy="27" r="2" stroke="black" stroke-width="1" fill="none"/><circle cx="53" cy="29" r="2" stroke="black" stroke-width="1" fill="none"/>'},bath:{viewBox:"0 0 200 90",content:'<rect x="5" y="5" width="190" height="80" rx="20" ry="20" stroke="black" stroke-width="2" fill="none"/><rect x="15" y="15" width="170" height="60" rx="14" ry="14" stroke="black" stroke-width="2" fill="none"/><circle cx="32" cy="38" r="5" stroke="black" stroke-width="2" fill="none"/><circle cx="32" cy="52" r="5" stroke="black" stroke-width="2" fill="none"/><rect x="28" y="40" width="8" height="10" rx="2" ry="2" stroke="black" stroke-width="2" fill="none"/><circle cx="170" cy="45" r="4" stroke="black" stroke-width="2" fill="none"/><circle cx="170" cy="45" r="1.5" fill="black" stroke="none"/>'},"bed-double":{viewBox:"0 0 150 200",content:'<rect x="5" y="5" width="140" height="190" rx="3" ry="3" stroke="black" stroke-width="2" fill="none"/><rect x="5" y="5" width="140" height="20" rx="3" ry="3" stroke="black" stroke-width="2" fill="none"/><rect x="12" y="30" width="58" height="28" rx="6" ry="6" stroke="black" stroke-width="2" fill="none"/><rect x="80" y="30" width="58" height="28" rx="6" ry="6" stroke="black" stroke-width="2" fill="none"/><line x1="15" y1="70" x2="135" y2="70" stroke="black" stroke-width="2"/>'},"bed-single":{viewBox:"0 0 90 200",content:'<rect x="5" y="5" width="80" height="190" rx="3" ry="3" stroke="black" stroke-width="2" fill="none"/><rect x="5" y="5" width="80" height="20" rx="3" ry="3" stroke="black" stroke-width="2" fill="none"/><rect x="12" y="30" width="66" height="28" rx="6" ry="6" stroke="black" stroke-width="2" fill="none"/><line x1="15" y1="70" x2="75" y2="70" stroke="black" stroke-width="2"/>'},"door-left":{viewBox:"0 0 100 100",content:'<line x1="0" y1="97" x2="7" y2="97" stroke="black" stroke-width="5"/><line x1="93" y1="97" x2="100" y2="97" stroke="black" stroke-width="5"/><line x1="7" y1="97" x2="7" y2="11" stroke="black" stroke-width="2.5"/><path d="M 7,11 A 86,86 0 0,1 93,97" stroke="black" stroke-width="1.5" fill="none" stroke-dasharray="4 3"/>'},"door-right":{viewBox:"0 0 100 100",content:'<line x1="0" y1="97" x2="7" y2="97" stroke="black" stroke-width="5"/><line x1="93" y1="97" x2="100" y2="97" stroke="black" stroke-width="5"/><line x1="93" y1="97" x2="93" y2="11" stroke="black" stroke-width="2.5"/><path d="M 93,11 A 86,86 0 0,0 7,97" stroke="black" stroke-width="1.5" fill="none" stroke-dasharray="4 3"/>'},"hot-tub":{viewBox:"0 0 100 100",content:'<circle cx="50" cy="50" r="42" stroke="black" stroke-width="2" fill="none"/><circle cx="50" cy="50" r="35" stroke="black" stroke-width="2" fill="none"/><path d="M 30,40 Q 33,36 36,40 Q 39,44 42,40" stroke="black" stroke-width="1.5" fill="none"/><path d="M 50,35 Q 53,31 56,35 Q 59,39 62,35" stroke="black" stroke-width="1.5" fill="none"/><path d="M 38,55 Q 41,51 44,55 Q 47,59 50,55" stroke="black" stroke-width="1.5" fill="none"/><path d="M 56,50 Q 59,46 62,50 Q 65,54 68,50" stroke="black" stroke-width="1.5" fill="none"/><circle cx="50" cy="15" r="2" fill="black" stroke="none"/><circle cx="50" cy="85" r="2" fill="black" stroke="none"/><circle cx="15" cy="50" r="2" fill="black" stroke="none"/><circle cx="85" cy="50" r="2" fill="black" stroke="none"/>'},"floor-lamp":{viewBox:"0 0 45 60",content:'<path d="M 8,56 Q 18,52 28,56" stroke="black" stroke-width="2" fill="none"/><line x1="18" y1="54" x2="18" y2="12" stroke="black" stroke-width="2"/><path d="M 18,12 Q 18,6 24,6 L 30,6" stroke="black" stroke-width="2" fill="none"/><rect x="24" y="2" width="16" height="14" rx="2" ry="2" stroke="black" stroke-width="2" fill="none"/>'},oven:{viewBox:"0 0 100 100",content:'<rect x="5" y="5" width="90" height="90" rx="3" ry="3" stroke="black" stroke-width="2" fill="none"/><circle cx="30" cy="30" r="14" stroke="black" stroke-width="2" fill="none"/><circle cx="30" cy="30" r="7" stroke="black" stroke-width="2" fill="none"/><circle cx="70" cy="30" r="14" stroke="black" stroke-width="2" fill="none"/><circle cx="70" cy="30" r="7" stroke="black" stroke-width="2" fill="none"/><circle cx="30" cy="70" r="14" stroke="black" stroke-width="2" fill="none"/><circle cx="30" cy="70" r="7" stroke="black" stroke-width="2" fill="none"/><circle cx="70" cy="70" r="14" stroke="black" stroke-width="2" fill="none"/><circle cx="70" cy="70" r="7" stroke="black" stroke-width="2" fill="none"/>'},plant:{viewBox:"0 0 60 60",content:'<circle cx="30" cy="30" r="25" stroke="black" stroke-width="1.5" fill="none"/><g transform="translate(30,30)"><path d="M 0,0 C -5,-10 -3,-18 0,-20 C 3,-18 5,-10 0,0 Z" stroke="black" stroke-width="1.5" fill="none"/><path d="M 0,0 C -5,-10 -3,-18 0,-20 C 3,-18 5,-10 0,0 Z" transform="rotate(72)" stroke="black" stroke-width="1.5" fill="none"/><path d="M 0,0 C -5,-10 -3,-18 0,-20 C 3,-18 5,-10 0,0 Z" transform="rotate(144)" stroke="black" stroke-width="1.5" fill="none"/><path d="M 0,0 C -5,-10 -3,-18 0,-20 C 3,-18 5,-10 0,0 Z" transform="rotate(216)" stroke="black" stroke-width="1.5" fill="none"/><path d="M 0,0 C -5,-10 -3,-18 0,-20 C 3,-18 5,-10 0,0 Z" transform="rotate(288)" stroke="black" stroke-width="1.5" fill="none"/></g>'},pool:{viewBox:"0 0 180 100",content:'<rect x="5" y="5" width="170" height="90" rx="20" ry="20" stroke="black" stroke-width="2" fill="none"/><rect x="12" y="12" width="156" height="76" rx="16" ry="16" stroke="black" stroke-width="2" fill="none"/><line x1="25" y1="30" x2="155" y2="30" stroke="black" stroke-width="1" stroke-dasharray="4 3"/><line x1="25" y1="50" x2="155" y2="50" stroke="black" stroke-width="1" stroke-dasharray="4 3"/><line x1="25" y1="70" x2="155" y2="70" stroke="black" stroke-width="1" stroke-dasharray="4 3"/><path d="M 20,12 L 20,25 L 35,25 L 35,18 L 28,18 L 28,12" stroke="black" stroke-width="1.5" fill="none"/>'},shower:{viewBox:"0 0 100 100",content:'<rect x="5" y="5" width="90" height="90" rx="5" ry="5" stroke="black" stroke-width="2" fill="none"/><circle cx="22" cy="22" r="9" stroke="black" stroke-width="2" fill="none"/><circle cx="22" cy="22" r="4" stroke="black" stroke-width="2" fill="none"/><circle cx="50" cy="50" r="5" stroke="black" stroke-width="2" fill="none"/><circle cx="50" cy="50" r="2" fill="black" stroke="none"/>'},"sofa-two-seater":{viewBox:"0 0 160 100",content:'<path d="M 15,10 Q 15,5 20,5 L 140,5 Q 145,5 145,10 L 145,25 L 15,25 Z" stroke="black" stroke-width="2" fill="none"/><path d="M 10,15 Q 5,15 5,20 L 5,80 Q 5,85 10,85 L 20,85 L 20,15 Z" stroke="black" stroke-width="2" fill="none"/><path d="M 140,15 L 140,85 L 150,85 Q 155,85 155,80 L 155,20 Q 155,15 150,15 Z" stroke="black" stroke-width="2" fill="none"/><rect x="20" y="25" width="120" height="60" rx="3" ry="3" stroke="black" stroke-width="2" fill="none"/><line x1="80" y1="28" x2="80" y2="82" stroke="black" stroke-width="2"/>'},"sofa-three-seater":{viewBox:"0 0 220 100",content:'<path d="M 15,10 Q 15,5 20,5 L 200,5 Q 205,5 205,10 L 205,25 L 15,25 Z" stroke="black" stroke-width="2" fill="none"/><path d="M 10,15 Q 5,15 5,20 L 5,80 Q 5,85 10,85 L 20,85 L 20,15 Z" stroke="black" stroke-width="2" fill="none"/><path d="M 200,15 L 200,85 L 210,85 Q 215,85 215,80 L 215,20 Q 215,15 210,15 Z" stroke="black" stroke-width="2" fill="none"/><rect x="20" y="25" width="180" height="60" rx="3" ry="3" stroke="black" stroke-width="2" fill="none"/><line x1="80" y1="28" x2="80" y2="82" stroke="black" stroke-width="2"/><line x1="140" y1="28" x2="140" y2="82" stroke="black" stroke-width="2"/>'},"table-dining-room":{viewBox:"0 0 180 120",content:'<rect x="35" y="28" width="110" height="64" rx="3" ry="3" stroke="black" stroke-width="2" fill="none"/><rect x="52" y="5" width="30" height="16" rx="4" ry="4" stroke="black" stroke-width="2" fill="none"/><rect x="98" y="5" width="30" height="16" rx="4" ry="4" stroke="black" stroke-width="2" fill="none"/><rect x="52" y="99" width="30" height="16" rx="4" ry="4" stroke="black" stroke-width="2" fill="none"/><rect x="98" y="99" width="30" height="16" rx="4" ry="4" stroke="black" stroke-width="2" fill="none"/><rect x="8" y="45" width="16" height="30" rx="4" ry="4" stroke="black" stroke-width="2" fill="none"/><rect x="156" y="45" width="16" height="30" rx="4" ry="4" stroke="black" stroke-width="2" fill="none"/>'},"table-dining-room-round":{viewBox:"0 0 120 120",content:'<circle cx="60" cy="60" r="30" stroke="black" stroke-width="2" fill="none"/><rect x="42" y="8" width="36" height="14" rx="4" ry="4" stroke="black" stroke-width="2" fill="none"/><rect x="42" y="98" width="36" height="14" rx="4" ry="4" stroke="black" stroke-width="2" fill="none"/><rect x="8" y="42" width="14" height="36" rx="4" ry="4" stroke="black" stroke-width="2" fill="none"/><rect x="98" y="42" width="14" height="36" rx="4" ry="4" stroke="black" stroke-width="2" fill="none"/>'},television:{viewBox:"0 0 160 20",content:'<rect x="5" y="2" width="150" height="8" rx="1" ry="1" stroke="black" stroke-width="2" fill="none"/><rect x="60" y="10" width="40" height="7" rx="2" ry="2" stroke="black" stroke-width="2" fill="none"/>'},"bedside-table":{viewBox:"0 0 50 50",content:'<rect x="5" y="5" width="40" height="40" rx="2" ry="2" stroke="black" stroke-width="2" fill="none"/><line x1="5" y1="25" x2="45" y2="25" stroke="black" stroke-width="2"/>'},bidet:{viewBox:"0 0 80 100",content:'<ellipse cx="40" cy="50" rx="30" ry="40" stroke="black" stroke-width="2" fill="none"/><ellipse cx="40" cy="53" rx="20" ry="28" stroke="black" stroke-width="2" fill="none"/><circle cx="40" cy="18" r="4" stroke="black" stroke-width="2" fill="none"/><circle cx="40" cy="18" r="1.5" fill="black" stroke="none"/>'},cabinet:{viewBox:"0 0 80 40",content:'<rect x="5" y="5" width="70" height="30" rx="2" ry="2" stroke="black" stroke-width="2" fill="none"/><line x1="8" y1="15" x2="72" y2="15" stroke="black" stroke-width="1" stroke-dasharray="3 2"/><line x1="8" y1="25" x2="72" y2="25" stroke="black" stroke-width="1" stroke-dasharray="3 2"/>'},counter:{viewBox:"0 0 200 40",content:'<rect x="5" y="5" width="190" height="30" rx="2" ry="2" stroke="black" stroke-width="2" fill="none"/>'},cupboard:{viewBox:"0 0 100 50",content:'<rect x="5" y="5" width="90" height="40" rx="2" ry="2" stroke="black" stroke-width="2" fill="none"/><line x1="50" y1="5" x2="50" y2="45" stroke="black" stroke-width="2"/><circle cx="43" cy="25" r="2" fill="black" stroke="none"/><circle cx="57" cy="25" r="2" fill="black" stroke="none"/>'},desk:{viewBox:"0 0 140 100",content:'<rect x="30" y="64" width="66" height="14" rx="4" ry="4" stroke="black" stroke-width="2" fill="none"/><line x1="33" y1="78" x2="30" y2="86" stroke="black" stroke-width="2"/><line x1="93" y1="78" x2="96" y2="86" stroke="black" stroke-width="2"/><path d="M 30,86 Q 63,94 96,86" stroke="black" stroke-width="2.5" fill="none"/><rect x="5" y="5" width="130" height="55" rx="2" ry="2" stroke="black" stroke-width="2" fill="none"/><rect x="40" y="12" width="42" height="12" rx="1" ry="1" stroke="black" stroke-width="2" fill="none"/><rect x="40" y="26" width="42" height="26" rx="2" ry="2" stroke="black" stroke-width="2" fill="none"/><line x1="45" y1="32" x2="77" y2="32" stroke="black" stroke-width="1"/><line x1="45" y1="37" x2="77" y2="37" stroke="black" stroke-width="1"/><line x1="45" y1="42" x2="77" y2="42" stroke="black" stroke-width="1"/><rect x="54" y="44" width="14" height="6" rx="1" ry="1" stroke="black" stroke-width="1" fill="none"/><circle cx="110" cy="22" r="10" stroke="black" stroke-width="2" fill="none"/><circle cx="110" cy="22" r="4" stroke="black" stroke-width="2" fill="none"/>'},fridge:{viewBox:"0 0 70 70",content:'<rect x="5" y="5" width="60" height="60" rx="3" ry="3" stroke="black" stroke-width="2" fill="none"/><rect x="9" y="9" width="52" height="52" rx="2" ry="2" stroke="black" stroke-width="2" fill="none"/><line x1="14" y1="22" x2="14" y2="48" stroke="black" stroke-width="2.5"/><circle cx="57" cy="20" r="1.5" fill="black" stroke="none"/><circle cx="57" cy="50" r="1.5" fill="black" stroke="none"/>'},"kitchen-island":{viewBox:"0 0 200 80",content:'<rect x="5" y="5" width="190" height="70" rx="3" ry="3" stroke="black" stroke-width="2" fill="none"/><rect x="20" y="35" width="35" height="25" rx="5" ry="5" stroke="black" stroke-width="2" fill="none"/><circle cx="37" cy="47" r="3" stroke="black" stroke-width="2" fill="none"/><circle cx="37" cy="47" r="1" fill="black" stroke="none"/><circle cx="16" cy="32" r="3" stroke="black" stroke-width="2" fill="none"/><path d="M 16,32 Q 28,32 28,42" stroke="black" stroke-width="2" fill="none"/><circle cx="130" cy="25" r="10" stroke="black" stroke-width="2" fill="none"/><circle cx="130" cy="25" r="5" stroke="black" stroke-width="2" fill="none"/><circle cx="165" cy="25" r="10" stroke="black" stroke-width="2" fill="none"/><circle cx="165" cy="25" r="5" stroke="black" stroke-width="2" fill="none"/><circle cx="130" cy="55" r="10" stroke="black" stroke-width="2" fill="none"/><circle cx="130" cy="55" r="5" stroke="black" stroke-width="2" fill="none"/><circle cx="165" cy="55" r="10" stroke="black" stroke-width="2" fill="none"/><circle cx="165" cy="55" r="5" stroke="black" stroke-width="2" fill="none"/>'},"side-table":{viewBox:"0 0 54 54",content:'<circle cx="27" cy="25" r="18" stroke="black" stroke-width="2" fill="none"/><path d="M 21,8 Q 27,1 33,8" stroke="black" stroke-width="2" fill="none"/><path d="M 9,28 Q 6,37 15,39" stroke="black" stroke-width="2" fill="none"/><path d="M 39,39 Q 48,37 45,28" stroke="black" stroke-width="2" fill="none"/>'},"sliding-door":{viewBox:"0 0 100 20",content:'<line x1="0" y1="10" x2="8" y2="10" stroke="black" stroke-width="5"/><line x1="92" y1="10" x2="100" y2="10" stroke="black" stroke-width="5"/><line x1="8" y1="6" x2="52" y2="6" stroke="black" stroke-width="2.5"/><line x1="48" y1="14" x2="92" y2="14" stroke="black" stroke-width="2.5"/>'},speaker:{viewBox:"0 0 30 40",content:'<rect x="3" y="3" width="24" height="34" rx="3" ry="3" stroke="black" stroke-width="1.5" fill="none"/><circle cx="15" cy="25" r="8" stroke="black" stroke-width="1.5" fill="none"/><circle cx="15" cy="25" r="4" stroke="black" stroke-width="1.5" fill="none"/><circle cx="15" cy="11" r="4" stroke="black" stroke-width="1.5" fill="none"/><circle cx="15" cy="11" r="1.5" fill="black" stroke="none"/>'},"washing-machine":{viewBox:"0 0 80 80",content:'<rect x="5" y="5" width="70" height="70" rx="5" ry="5" stroke="black" stroke-width="2" fill="none"/><line x1="5" y1="20" x2="75" y2="20" stroke="black" stroke-width="2"/><circle cx="22" cy="13" r="5" stroke="black" stroke-width="2" fill="none"/><line x1="22" y1="13" x2="22" y2="9" stroke="black" stroke-width="1.5"/><circle cx="55" cy="13" r="2.5" fill="black" stroke="none"/><circle cx="65" cy="13" r="2.5" fill="black" stroke="none"/><circle cx="40" cy="48" r="20" stroke="black" stroke-width="2" fill="none"/><circle cx="40" cy="48" r="14" stroke="black" stroke-width="2" fill="none"/>'},window:{viewBox:"0 0 100 14",content:'<line x1="0" y1="2" x2="100" y2="2" stroke="black" stroke-width="2"/><line x1="0" y1="12" x2="100" y2="12" stroke="black" stroke-width="2"/><line x1="0" y1="7" x2="100" y2="7" stroke="black" stroke-width="1"/><line x1="50" y1="2" x2="50" y2="12" stroke="black" stroke-width="1.5"/>'},toilet:{viewBox:"0 0 100 130",content:'<rect x="18" y="4" width="64" height="24" rx="4" ry="4" stroke="black" stroke-width="2" fill="none"/><rect x="22" y="7" width="56" height="18" rx="2" ry="2" stroke="black" stroke-width="2" fill="none"/><ellipse cx="50" cy="16" rx="6" ry="4" stroke="black" stroke-width="2" fill="none"/><circle cx="30" cy="30" r="2.5" fill="black" stroke="none"/><circle cx="70" cy="30" r="2.5" fill="black" stroke="none"/><path d="M 20,32 L 20,60 Q 20,100 50,105 Q 80,100 80,60 L 80,32" stroke="black" stroke-width="2" fill="none"/><path d="M 24,34 L 24,58 Q 24,94 50,99 Q 76,94 76,58 L 76,34" stroke="black" stroke-width="2" fill="none"/><path d="M 32,40 L 32,58 Q 32,86 50,90 Q 68,86 68,58 L 68,40 Q 68,36 50,36 Q 32,36 32,40 Z" stroke="black" stroke-width="2" fill="none"/><line x1="24" y1="34" x2="76" y2="34" stroke="black" stroke-width="2"/>'}},pi=[{type:"svg",icon:"armchair",label:"furniture.armchair",defaultWidth:800,defaultHeight:800},{type:"svg",icon:"bath",label:"furniture.bath",defaultWidth:1700,defaultHeight:700},{type:"svg",icon:"bed-double",label:"furniture.double_bed",defaultWidth:1600,defaultHeight:2e3},{type:"svg",icon:"bed-single",label:"furniture.single_bed",defaultWidth:900,defaultHeight:2e3},{type:"svg",icon:"door-left",label:"furniture.door_left_swing",defaultWidth:800,defaultHeight:800},{type:"svg",icon:"door-right",label:"furniture.door_right_swing",defaultWidth:800,defaultHeight:800},{type:"svg",icon:"table-dining-room",label:"furniture.dining_table",defaultWidth:1600,defaultHeight:900},{type:"svg",icon:"table-dining-room-round",label:"furniture.round_table",defaultWidth:1e3,defaultHeight:1e3},{type:"svg",icon:"floor-lamp",label:"furniture.lamp",defaultWidth:400,defaultHeight:400},{type:"svg",icon:"oven",label:"furniture.oven_stove",defaultWidth:600,defaultHeight:600},{type:"svg",icon:"plant",label:"furniture.plant",defaultWidth:400,defaultHeight:400},{type:"svg",icon:"shower",label:"furniture.shower",defaultWidth:900,defaultHeight:900},{type:"svg",icon:"sofa-two-seater",label:"furniture.sofa_2_seat",defaultWidth:1600,defaultHeight:800},{type:"svg",icon:"sofa-three-seater",label:"furniture.sofa_3_seat",defaultWidth:2400,defaultHeight:800},{type:"svg",icon:"television",label:"furniture.tv",defaultWidth:1200,defaultHeight:200},{type:"svg",icon:"toilet",label:"furniture.toilet",defaultWidth:400,defaultHeight:700},{type:"svg",icon:"car",label:"furniture.car",defaultWidth:1800,defaultHeight:4500},{type:"svg",icon:"carpet",label:"furniture.carpet",defaultWidth:2e3,defaultHeight:1400},{type:"svg",icon:"cat-bed",label:"furniture.cat_bed",defaultWidth:500,defaultHeight:500},{type:"svg",icon:"dog-bed",label:"furniture.dog_bed",defaultWidth:800,defaultHeight:600},{type:"svg",icon:"pool",label:"furniture.pool",defaultWidth:5e3,defaultHeight:3e3},{type:"svg",icon:"bedside-table",label:"furniture.bedside_table",defaultWidth:500,defaultHeight:500},{type:"svg",icon:"bidet",label:"furniture.bidet",defaultWidth:400,defaultHeight:500},{type:"svg",icon:"hot-tub",label:"furniture.hot_tub",defaultWidth:1500,defaultHeight:1500},{type:"svg",icon:"cabinet",label:"furniture.cabinet",defaultWidth:800,defaultHeight:400},{type:"svg",icon:"counter",label:"furniture.counter",defaultWidth:2e3,defaultHeight:400},{type:"svg",icon:"cupboard",label:"furniture.cupboard",defaultWidth:1e3,defaultHeight:500},{type:"svg",icon:"desk",label:"furniture.desk",defaultWidth:1400,defaultHeight:700},{type:"svg",icon:"fridge",label:"furniture.fridge",defaultWidth:700,defaultHeight:700},{type:"svg",icon:"kitchen-island",label:"furniture.kitchen_island",defaultWidth:2e3,defaultHeight:800},{type:"svg",icon:"side-table",label:"furniture.side_table",defaultWidth:500,defaultHeight:500},{type:"svg",icon:"sliding-door",label:"furniture.sliding_door",defaultWidth:1e3,defaultHeight:200},{type:"svg",icon:"speaker",label:"furniture.speaker",defaultWidth:300,defaultHeight:300},{type:"svg",icon:"washing-machine",label:"furniture.washing_machine",defaultWidth:600,defaultHeight:600},{type:"svg",icon:"window",label:"furniture.window",defaultWidth:1e3,defaultHeight:150}],_i=["corners.front_left","corners.front_right","corners.back_right","corners.back_left"],fi=[["corners.left_wall","corners.front_wall"],["corners.right_wall","corners.front_wall"],["corners.right_wall","corners.back_wall"],["corners.left_wall","corners.back_wall"]],wi=["#2196F3","#FF5722","#4CAF50"],Ei=100,mi=Math.PI/3,bi=oi*Math.sin(Math.PI/3);function yi(e,t){return e/si*(t+1)}function vi(e,t){return e/(t+1)*si}function Ci(e,t,i){const s=i-t;return Math.round((e+s+360)%360)}class Bi extends ce{constructor(){super(...arguments),this.furniture=[],this.selectedFurnitureId=null,this.roomWidth=3e3,this.cellPx=28,this.minCol=0,this.minRow=0,this.visCols=20,this.visRows=20,this.sidebarTab="zones",this.localize=It}_mmToPx(e){return yi(e,this.cellPx)}_fireEvent(e,t){this.dispatchEvent(new CustomEvent(e,{bubbles:!0,composed:!0,detail:t}))}_onItemPointerDown(e,t){this._fireEvent("furniture-select",t),this._fireEvent("furniture-pointer-down",{e:e,id:t,type:"move"})}_onResizePointerDown(e,t,i){this._fireEvent("furniture-pointer-down",{e:e,id:t,type:"resize",handle:i})}_onRotatePointerDown(e,t){this._fireEvent("furniture-pointer-down",{e:e,id:t,type:"rotate"})}_onDeletePointerDown(e,t){e.stopPropagation(),this._fireEvent("furniture-delete",t)}render(){if(!this.furniture.length)return J;const e=Math.ceil(this.roomWidth/si),t=Math.floor((ei-e)/2),i=this.cellPx+1,s="furniture"===this.sidebarTab;return Y`
			<div class="furniture-overlay ${s?"":"non-interactive"}">
				${this.furniture.map(e=>{const s=(t-this.minCol)*i+this._mmToPx(e.x),o=(0-this.minRow)*i+this._mmToPx(e.y),r=this._mmToPx(e.width),a=this._mmToPx(e.height),n=this.selectedFurnitureId===e.id;return Y`
						<div
							class="furniture-item ${n?"selected":""}"
							data-id="${e.id}"
							style="
								left: ${s}px; top: ${o}px;
								width: ${r}px; height: ${a}px;
								transform: rotate(${e.rotation}deg);
							"
							@pointerdown=${t=>this._onItemPointerDown(t,e.id)}
						>
							${"svg"===e.type&&ui[e.icon]?$`<svg viewBox="${ui[e.icon].viewBox}" preserveAspectRatio="none" class="furn-svg">
										${qt(ui[e.icon].content)}
									</svg>`:Y`<ha-icon icon="${e.icon}" style="--mdc-icon-size: ${.6*Math.min(r,a)}px;"></ha-icon>`}
							${n?Y`
										<!-- Resize handles (cursor follows visual rotation) -->
										${["n","s","e","w","ne","nw","se","sw"].map(t=>Y`
												<div
													class="furn-handle furn-handle-${t}"
													style="cursor: ${function(e,t){const i=e.includes("e")?1:e.includes("w")?-1:0,s=e.includes("s")?1:e.includes("n")?-1:0,o=((180*Math.atan2(i,-s)/Math.PI+t)%180+180)%180;switch(45*Math.round(o/45)%180){case 0:return"ns-resize";case 45:return"nesw-resize";case 90:return"ew-resize";case 135:return"nwse-resize";default:return"default"}}(t,e.rotation)};"
													@pointerdown=${i=>this._onResizePointerDown(i,e.id,t)}
												></div>
											`)}
										<!-- Rotate handle with stem -->
										<div class="furn-rotate-stem"></div>
										<div class="furn-rotate-handle" @pointerdown=${t=>this._onRotatePointerDown(t,e.id)}>
											<ha-icon icon="mdi:rotate-right" style="--mdc-icon-size: 14px;"></ha-icon>
										</div>
										<!-- Delete button -->
										<div class="furn-delete-btn" @pointerdown=${t=>this._onDeletePointerDown(t,e.id)}>
											<ha-icon icon="mdi:close" style="--mdc-icon-size: 14px;"></ha-icon>
										</div>
									`:J}
						</div>
					`})}
			</div>
		`}}Bi.styles=a`
		:host {
			display: contents;
		}

		.furniture-overlay {
			position: absolute;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			pointer-events: none;
			z-index: 15;
		}

		.furniture-overlay.non-interactive {
			pointer-events: none !important;
		}

		.furniture-overlay.non-interactive .furniture-item {
			pointer-events: none !important;
			opacity: 0.6;
		}

		.furniture-item {
			position: absolute;
			display: flex;
			align-items: center;
			justify-content: center;
			border: 1px solid rgba(0, 0, 0, 0.3);
			border-radius: 4px;
			background: transparent;
			pointer-events: auto;
			cursor: grab;
			transform-origin: center center;
			user-select: none;
		}

		.furniture-item:hover {
			border-color: var(--primary-color, #03a9f4);
		}

		.furniture-item.selected {
			outline: 2px solid var(--primary-color, #03a9f4);
			outline-offset: -1px;
			box-shadow: 0 0 8px rgba(3, 169, 244, 0.4);
			z-index: 10;
		}

		.furniture-item ha-icon {
			color: rgba(0, 0, 0, 0.6);
			pointer-events: none;
		}

		.furn-svg {
			width: 100%;
			height: 100%;
			pointer-events: none;
		}

		.furn-handle {
			position: absolute;
			width: 8px;
			height: 8px;
			background: var(--primary-color, #03a9f4);
			border: 1px solid #fff;
			border-radius: 2px;
			pointer-events: auto;
			z-index: 2;
		}

		.furn-handle-n { top: -4px; left: 50%; transform: translateX(-50%); }
		.furn-handle-s { bottom: -4px; left: 50%; transform: translateX(-50%); }
		.furn-handle-e { right: -4px; top: 50%; transform: translateY(-50%); }
		.furn-handle-w { left: -4px; top: 50%; transform: translateY(-50%); }
		.furn-handle-ne { top: -4px; right: -4px; }
		.furn-handle-nw { top: -4px; left: -4px; }
		.furn-handle-se { bottom: -4px; right: -4px; }
		.furn-handle-sw { bottom: -4px; left: -4px; }

		.furn-rotate-stem {
			position: absolute;
			top: -32px;
			left: 50%;
			transform: translateX(-50%);
			width: 2px;
			height: 32px;
			background: var(--primary-color, #03a9f4);
			pointer-events: none;
		}

		.furn-rotate-handle {
			position: absolute;
			top: -48px;
			left: 50%;
			transform: translateX(-50%);
			width: 20px;
			height: 20px;
			background: var(--primary-color, #03a9f4);
			border: 2px solid #fff;
			border-radius: 50%;
			display: flex;
			align-items: center;
			justify-content: center;
			cursor: grab;
			pointer-events: auto;
			color: #fff;
		}

		.furn-delete-btn {
			position: absolute;
			top: -24px;
			right: -4px;
			width: 20px;
			height: 20px;
			background: var(--error-color, #f44336);
			border: 1px solid #fff;
			border-radius: 50%;
			display: flex;
			align-items: center;
			justify-content: center;
			cursor: pointer;
			pointer-events: auto;
			color: #fff;
		}
	`,e([ge({attribute:!1})],Bi.prototype,"furniture",void 0),e([ge({attribute:!1})],Bi.prototype,"selectedFurnitureId",void 0),e([ge({type:Number})],Bi.prototype,"roomWidth",void 0),e([ge({type:Number})],Bi.prototype,"cellPx",void 0),e([ge({type:Number})],Bi.prototype,"minCol",void 0),e([ge({type:Number})],Bi.prototype,"minRow",void 0),e([ge({type:Number})],Bi.prototype,"visCols",void 0),e([ge({type:Number})],Bi.prototype,"visRows",void 0),e([ge({attribute:!1})],Bi.prototype,"sidebarTab",void 0),e([ge({attribute:!1})],Bi.prototype,"localize",void 0),customElements.get("epp-furniture-overlay")||customElements.define("epp-furniture-overlay",Bi);class xi extends ce{constructor(){super(...arguments),this.furniture=[],this.selectedFurnitureId=null,this.hass=void 0,this.localize=It,this.showCustomIconPicker=!1,this.customIconValue="",this._searchQuery=""}render(){return this._renderFurnitureSidebar()}_renderFurnitureSidebar(){const e=this.furniture.find(e=>e.id===this.selectedFurnitureId);return Y`
			${e?Y`
						<div class="furn-selected-info">
							<div class="zone-item-row">
								<ha-icon icon="${e.icon}" style="--mdc-icon-size: 20px;"></ha-icon>
								<strong>${this.localize(e.label)}</strong>
								<button class="zone-remove-btn" @click=${()=>this._fireRemove(e.id)}>
									<ha-icon icon="mdi:close"></ha-icon>
								</button>
							</div>
							<div class="furn-dims">
								<label>
									${this.localize("dimensions.width_cm")}
									<input type="number" min="10" step="5" .value=${String(Math.round(e.width/10))}
										@change=${t=>this._fireUpdate(e.id,{width:10*parseInt(t.target.value,10)})}
									/>
								</label>
								<label>
									${this.localize("dimensions.height_cm")}
									<input type="number" min="10" step="5" .value=${String(Math.round(e.height/10))}
										@change=${t=>this._fireUpdate(e.id,{height:10*parseInt(t.target.value,10)})}
									/>
								</label>
								<label>
									${this.localize("dimensions.rotation")}
									<input type="number" step="5" .value=${String(Math.round(e.rotation))}
										@change=${t=>this._fireUpdate(e.id,{rotation:parseInt(t.target.value,10)%360})}
									/>
								</label>
							</div>
						</div>
					`:J}

			<input
				type="search"
				class="furn-search"
				.value=${this._searchQuery}
				placeholder=${this.localize("furniture.search_placeholder")}
				aria-label=${this.localize("furniture.search_placeholder")}
				@input=${e=>{this._searchQuery=e.target.value}}
			/>

			<div class="furn-catalog">
				${function(e,t,i){const s=t.trim().toLowerCase(),o=e.map(e=>{const t=i(e.label);return{sticker:e,localizedLabel:t,normalizedLabel:t.toLowerCase()}}),r=s?o.filter(e=>e.normalizedLabel.includes(s)):o;return r.slice().sort((e,t)=>e.localizedLabel.localeCompare(t.localizedLabel)).map(e=>e.sticker)}(pi,this._searchQuery,this.localize).map(e=>Y`
						<button class="furn-sticker" @click=${()=>this._fireAdd(e)}>
							${"svg"===e.type&&ui[e.icon]?$`<svg viewBox="${ui[e.icon].viewBox}" class="furn-sticker-svg">
										${qt(ui[e.icon].content)}
									</svg>`:Y`<ha-icon icon="${e.icon}" style="--mdc-icon-size: 24px;"></ha-icon>`}
							<span>${this.localize(e.label)}</span>
						</button>
					`)}
				<button class="furn-sticker furn-custom" @click=${()=>{this.dispatchEvent(new CustomEvent("custom-icon-toggle",{bubbles:!0,composed:!0}))}}>
					<ha-icon icon="mdi:plus" style="--mdc-icon-size: 24px;"></ha-icon>
					<span>${this.localize("furniture.custom_icon")}</span>
				</button>
			</div>
			${this.showCustomIconPicker?Y`
						<div class="template-dialog">
							<div class="template-dialog-card">
								<h3>${this.localize("furniture.custom_icon")}</h3>
								<ha-icon-picker
									.hass=${this.hass}
									.value=${this.customIconValue}
									@value-changed=${e=>{this.dispatchEvent(new CustomEvent("custom-icon-change",{detail:e.detail.value||"",bubbles:!0,composed:!0}))}}
								></ha-icon-picker>
								${this.customIconValue.trim()?Y`
											<div style="text-align: center;">
												<ha-icon icon="${this.customIconValue.trim()}" style="--mdc-icon-size: 48px;"></ha-icon>
											</div>
										`:J}
								<div class="template-dialog-actions">
									<button class="wizard-btn wizard-btn-back"
										@click=${()=>{this.dispatchEvent(new CustomEvent("custom-icon-toggle",{bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("custom-icon-change",{detail:"",bubbles:!0,composed:!0}))}}
									>${this.localize("common.cancel")}</button>
									<button class="wizard-btn wizard-btn-primary"
										?disabled=${!this.customIconValue.trim()}
										@click=${()=>{this.dispatchEvent(new CustomEvent("furniture-add-custom",{detail:this.customIconValue.trim(),bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("custom-icon-change",{detail:"",bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("custom-icon-toggle",{bubbles:!0,composed:!0}))}}
									>${this.localize("common.add")}</button>
								</div>
							</div>
						</div>
					`:J}
		`}_fireAdd(e){this.dispatchEvent(new CustomEvent("furniture-add",{detail:e,bubbles:!0,composed:!0}))}_fireRemove(e){this.dispatchEvent(new CustomEvent("furniture-remove",{detail:e,bubbles:!0,composed:!0}))}_fireUpdate(e,t){this.dispatchEvent(new CustomEvent("furniture-update",{detail:{id:e,updates:t},bubbles:!0,composed:!0}))}}function Si(e,t,i,s){if(i<=0||s<=0)return null;const o=Math.ceil(i/si);return{col:Math.floor((ei-o)/2)+e/si,row:t/si}}xi.styles=[Rt,Tt,a`
			:host {
				display: block;
			}

			.zone-item-row {
				display: flex;
				align-items: center;
				gap: 8px;
			}

			.zone-remove-btn {
				background: none;
				border: none;
				color: var(--secondary-text-color, #757575);
				cursor: pointer;
				padding: 4px;
				border-radius: 4px;
			}

			.zone-remove-btn:hover {
				color: var(--error-color, #f44336);
			}

			.furn-selected-info {
				display: flex;
				flex-direction: column;
				gap: 8px;
				padding: 8px;
				border: 2px solid var(--primary-color, #03a9f4);
				border-radius: 8px;
				margin-bottom: 8px;
			}

			.furn-dims {
				display: flex;
				gap: 6px;
			}

			.furn-dims label {
				flex: 1;
				font-size: 11px;
				color: var(--secondary-text-color, #757575);
				display: flex;
				flex-direction: column;
				gap: 2px;
			}

			.furn-dims input {
				width: 100%;
				padding: 4px;
				border: 1px solid var(--divider-color, #e0e0e0);
				border-radius: 4px;
				font-size: 12px;
				box-sizing: border-box;
				background: var(--card-background-color, #fff);
				color: var(--primary-text-color, #212121);
			}

			.furn-search {
				width: 100%;
				padding: 6px 8px;
				margin-bottom: 6px;
				border: 1px solid var(--divider-color, #e0e0e0);
				border-radius: 4px;
				font-size: 12px;
				box-sizing: border-box;
				background: var(--card-background-color, #fff);
				color: var(--primary-text-color, #212121);
			}

			.furn-catalog {
				display: grid;
				grid-template-columns: 1fr 1fr;
				gap: 4px;
				overflow-y: auto;
				flex: 1;
				min-height: 0;
			}

			.furn-sticker {
				display: flex;
				flex-direction: column;
				align-items: center;
				gap: 4px;
				padding: 8px 4px;
				border: 1px solid var(--divider-color, #e0e0e0);
				border-radius: 8px;
				background: var(--card-background-color, #fff);
				cursor: pointer;
				font-size: 11px;
				color: var(--primary-text-color, #212121);
				text-align: center;
				transition: background 0.15s;
			}

			.furn-sticker:hover {
				background: var(--secondary-background-color, #f5f5f5);
			}

			.furn-sticker span {
				line-height: 1.2;
			}

			.furn-sticker-svg {
				width: 28px;
				height: 28px;
			}
		`],e([ge({attribute:!1})],xi.prototype,"furniture",void 0),e([ge({attribute:!1})],xi.prototype,"selectedFurnitureId",void 0),e([ge({attribute:!1})],xi.prototype,"hass",void 0),e([ge({attribute:!1})],xi.prototype,"localize",void 0),e([ge({attribute:!1})],xi.prototype,"showCustomIconPicker",void 0),e([ge({attribute:!1})],xi.prototype,"customIconValue",void 0),e([ue()],xi.prototype,"_searchQuery",void 0),customElements.get("epp-furniture-sidebar")||customElements.define("epp-furniture-sidebar",xi);const Ii=oi*Math.sin(Math.PI/3);const Di="repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(0,0,0,0.13) 3px, rgba(0,0,0,0.13) 4px), repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(0,0,0,0.13) 3px, rgba(0,0,0,0.13) 4px), #c8c8c8";function Mi(e,t){if(!ri(e))return"var(--secondary-background-color, #e0e0e0)";const i=ai(e);if(i>0&&i<=7){const e=t[i-1];if(e)return e.color}return"var(--card-background-color, #fff)"}function ki(e){return{r:parseInt(e.slice(1,3),16),g:parseInt(e.slice(3,5),16),b:parseInt(e.slice(5,7),16)}}function Ri(e,t,i){const s=e[6]*t+e[7]*i+1;return{x:(e[0]*t+e[1]*i+e[2])/s,y:(e[3]*t+e[4]*i+e[5])/s}}function Ti(e){const t=Ri(e,0,0),i=Ri(e,0,1e3),s=i.x-t.x,o=i.y-t.y,r=Math.sqrt(s*s+o*o);return{sensorPos:t,dirX:s/r,dirY:o/r}}function Fi(e){return e?Ri(e,0,0):null}function Pi(e,t,i,s,o){if(!i)return!0;const r=Math.ceil(s/si),a=Math.floor((ei-r)/2),n=(t+.5)*si,l=(e-a+.5)*si-i.sensorPos.x,c=n-i.sensorPos.y,h=l*l+c*c;if(h<1)return!0;if(h>o*o)return!1;const d=l*i.dirX+c*i.dirY;return!(d<=0)&&!(d*d<.25*h)}function Ui(e,t,i){return 1e3*(e?t>0?Math.min(t,6):6:i)}function Qi(e,t,i,s){if(e<=0||t<=0)return 0;const o=Fi(i);if(o){const t=Math.ceil(e/si),i=Math.floor((ei-t)/2);let r=0;const a=Ai(s);for(let e=a.minRow;e<=a.maxRow;e++)for(let t=a.minCol;t<=a.maxCol;t++){if(!ri(s[e*ei+t]))continue;const a=(e+.5)*si,n=(t-i+.5)*si-o.x,l=a-o.y,c=Math.sqrt(n*n+l*l);c>r&&(r=c)}if(r>0){const e=r/1e3;return Math.ceil(2*e)/2}}const r=Math.max(e,t)/1e3;return Math.ceil(2*r)/2}function zi(e){if(0===e.length)return 0;const t=[...e].sort((e,t)=>e-t),i=Math.floor(t.length/2);return t.length%2?t[i]:(t[i-1]+t[i])/2}function Oi(e,t,i){const s=Ai(e);if(s.minCol>s.maxCol)return null;const o=s.maxCol-s.minCol+1,r=s.maxRow-s.minRow+1,a=o*si,n=r*si,l=Fi(i),c=Math.ceil(t/si),h=Math.floor((ei-c)/2),d=l?l.x:a/2,A=l?l.y:0;let g=0;for(let t=0;t<ii;t++){if(!ri(e[t]))continue;const i=t%ei,s=Math.floor(t/ei),o=(i-h+.5)*si-d,r=(s+.5)*si-A,a=o*o+r*r;a>g&&(g=a)}return{widthM:a/1e3,depthM:n/1e3,furthestM:Math.sqrt(g)/1e3}}class Hi extends ce{constructor(){super(...arguments),this.grid=new Uint8Array(0),this.zoneConfigs=[],this.targets=[],this.roomWidth=0,this.roomDepth=0,this.perspective=null,this.furniture=[],this.selectedFurnitureId=null,this.sidebarTab="zones",this.editable=!1,this.activeZone=null,this.showHitCounts=!1,this.occupancy={},this.targetPrevXY=[],this.heatmapColors=null,this.localize=It,this.maxRangeMm=oi,this.dismissedTargets=new Map,this.maxGridPx=480,this.frozenBounds=null,this._fovCache=null,this._fovPerspective=null}render(){const e=this.frozenBounds??di(this.grid),t=e.minCol>e.maxCol,i=t?0:e.minCol,s=t?19:e.maxCol,o=t?0:e.minRow,r=e.maxRow,a=s-i+1,n=r-o+1,l=Math.min(Math.floor(this.maxGridPx/a),Math.floor(this.maxGridPx/n),32);return Y`
			<div class="grid-targets-wrapper">
				<div
					class="grid"
					style="grid-template-columns: repeat(${a}, ${l}px); grid-template-rows: repeat(${n}, ${l}px);"
					@mouseup=${this._onCellMouseUp}
				>
					${this._renderVisibleCells(i,s,o,r,l)}
				</div>
				${this._renderFurnitureOverlay(l,i,o,a,n)}
				${this._renderTargetDots(i,o,a,n)}
			</div>
			${this._renderGridDimensions()}
		`}_getSensorFov(){return this.perspective?(this._fovCache&&this._fovPerspective===this.perspective||(this._fovCache=Ti(this.perspective),this._fovPerspective=this.perspective),this._fovCache):null}_renderVisibleCells(e,t,i,s,o){const r=this.heatmapColors,a=this.occupancy,n=this._getSensorFov(),l=this.maxRangeMm,c=[];for(let h=i;h<=s;h++)for(let i=e;i<=t;i++){const e=h*ei+i,t=this.grid[e],s=Pi(i,h,n,this.roomWidth,l);let d=s?Mi(t,this.zoneConfigs):Di,A="";if(s&&ri(t)){const e=ai(t);if(r){const t=r.get(e);t&&(d=`linear-gradient(${t}, ${t}), linear-gradient(${d}, ${d})`)}a[e]&&(A="box-shadow: inset 0 0 0 1px rgba(0,0,0,0.4);")}let g="";if(s&&ri(t))if(li(t))g="background-image: repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(60,60,60,0.7) 6px, rgba(60,60,60,0.7) 8px);";else{const e=ci(t);2===e?g="background-image: repeating-linear-gradient(-45deg, transparent, transparent 5px, #cc3333 5px, #cc3333 7px), repeating-linear-gradient(45deg, transparent, transparent 5px, #cc3333 5px, #cc3333 7px);":e>0&&(g="background-image: repeating-linear-gradient(-45deg, transparent, transparent 5px, #cc3333 5px, #cc3333 7px);")}c.push(Y`
					<div
						class="cell"
						style="background: ${d}; width: ${o}px; height: ${o}px; ${A} ${g}"
						@mousedown=${()=>{s&&this._onCellMouseDown(e)}}
						@mouseenter=${()=>{s&&this._onCellMouseEnter(e)}}
					></div>
				`)}return c}_onCellMouseDown(e){this.dispatchEvent(new CustomEvent("cell-paint",{detail:{index:e,action:"down"},bubbles:!0,composed:!0}))}_onCellMouseEnter(e){this.dispatchEvent(new CustomEvent("cell-paint",{detail:{index:e,action:"enter"},bubbles:!0,composed:!0}))}_onCellMouseUp(){this.dispatchEvent(new CustomEvent("cell-paint",{detail:{action:"up"},bubbles:!0,composed:!0}))}_renderTargetDots(e,t,i,s){return Y`
			<div class="targets-overlay" style="pointer-events: none;">
				${this.targets.map((o,r)=>{if("inactive"===o.status)return J;let a=null!=o.x?Si(o.x,o.y,this.roomWidth,this.roomDepth):null;const n=a&&a.col>=e&&a.col<=e+i&&a.row>=t&&a.row<=t+s;if("pending"===o.status&&!n&&this.targetPrevXY[r]&&(a=Si(this.targetPrevXY[r].x,this.targetPrevXY[r].y,this.roomWidth,this.roomDepth)),!a)return J;const l=Math.max(0,Math.min(100,(a.col-e)/i*100)),c=Math.max(0,Math.min(100,(a.row-t)/s*100));if(this.dismissedTargets.has(r)){const e=Math.floor(a.col),t=Math.floor(a.row)*ei+e;if(this.dismissedTargets.get(r)===t)return J;this.dismissedTargets.delete(r),this.dispatchEvent(new CustomEvent("target-undismissed",{detail:{targetIndex:r},bubbles:!0,composed:!0}))}if(this.grid.length>0){const e=Math.floor(a.col),t=Math.floor(a.row)*ei+e;if(t>=0&&t<this.grid.length){if(ci(this.grid[t])>0){const e=ai(this.grid[t]);if(!this.occupancy[e])return J}}}const h="pending"===o.status?.3:1;return Y`
						<div
							class="target-dot ${this.editable?"":"clickable"}"
							style="left: ${l}%; top: ${c}%; background: ${wi[r]||wi[0]}; opacity: ${h}; transition: opacity 0.5s ease;"
							@click=${e=>{this.editable||(e.stopPropagation(),this.dispatchEvent(new CustomEvent("target-click",{detail:{targetIndex:r,x:o.x,y:o.y,pctX:l,pctY:c},bubbles:!0,composed:!0})))}}
						></div>
						${"active"===o.status&&o.signal>0?Y`
									<div style="position: absolute; left: ${l}%; top: ${c}%; transform: translate(-50%, -280%); background: rgba(0,0,0,0.7); color: #fff; font-size: 10px; font-weight: bold; padding: 0 4px; border-radius: 6px; pointer-events: none;">
										${o.signal}
									</div>
								`:J}
					`})}
			</div>
		`}_renderGridDimensions(){const e=Oi(this.grid,this.roomWidth,this.perspective);return e?Y`
			<div class="grid-dimensions">
				${this.localize("live.grid_dimensions",{width:e.widthM,depth:e.depthM,furthest:e.furthestM})}
			</div>
		`:J}_renderFurnitureOverlay(e,t,i,s,o){return this.furniture.length?Y`
			<epp-furniture-overlay
				.furniture=${this.furniture}
				.selectedFurnitureId=${this.selectedFurnitureId}
				.roomWidth=${this.roomWidth}
				.cellPx=${e}
				.minCol=${t}
				.minRow=${i}
				.visCols=${s}
				.visRows=${o}
				.sidebarTab=${this.sidebarTab}
				.localize=${this.localize}
				@furniture-select=${e=>{e.stopPropagation(),this.dispatchEvent(new CustomEvent("furniture-select",{detail:e.detail,bubbles:!0,composed:!0}))}}
				@furniture-pointer-down=${e=>{e.stopPropagation(),this.dispatchEvent(new CustomEvent("furniture-pointer-down",{detail:e.detail,bubbles:!0,composed:!0}))}}
				@furniture-delete=${e=>{e.stopPropagation(),this.dispatchEvent(new CustomEvent("furniture-delete",{detail:e.detail,bubbles:!0,composed:!0}))}}
			></epp-furniture-overlay>
		`:J}}Hi.styles=a`
		:host {
			display: block;
		}

		.grid-targets-wrapper {
			position: relative;
			display: inline-block;
		}

		:host(:not([editable])) .grid-targets-wrapper {
			overflow: hidden;
		}

		.grid {
			display: grid;
			gap: 1px;
			background: var(--divider-color, #e0e0e0);
			border: 2px solid var(--divider-color, #e0e0e0);
			border-radius: 8px;
			overflow: hidden;
			user-select: none;
		}

		.cell {
			cursor: pointer;
			transition: opacity 0.1s;
		}

		.cell:hover {
			opacity: 0.75;
		}

		.targets-overlay {
			position: absolute;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			pointer-events: none;
			z-index: 20;
		}

		.target-dot {
			position: absolute;
			width: 14px;
			height: 14px;
			border-radius: 50%;
			background: var(--primary-color, #03a9f4);
			border: 2px solid #fff;
			box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
			transform: translate(-50%, -50%);
			z-index: 10;
			pointer-events: auto;
		}

		.target-dot.clickable {
			cursor: pointer;
		}

		:host([editable]) .target-dot {
			pointer-events: none;
		}

		.target-dot.moving {
			background: #4caf50;
		}

		.target-dot.stationary {
			background: #ff9800;
		}

		.grid-dimensions {
			text-align: center;
			font-size: 12px;
			color: var(--secondary-text-color, #757575);
			margin-top: 8px;
		}
	`,e([ge({attribute:!1})],Hi.prototype,"grid",void 0),e([ge({attribute:!1})],Hi.prototype,"zoneConfigs",void 0),e([ge({attribute:!1})],Hi.prototype,"targets",void 0),e([ge({type:Number})],Hi.prototype,"roomWidth",void 0),e([ge({type:Number})],Hi.prototype,"roomDepth",void 0),e([ge({attribute:!1})],Hi.prototype,"perspective",void 0),e([ge({attribute:!1})],Hi.prototype,"furniture",void 0),e([ge({attribute:!1})],Hi.prototype,"selectedFurnitureId",void 0),e([ge({attribute:!1})],Hi.prototype,"sidebarTab",void 0),e([ge({type:Boolean,reflect:!0})],Hi.prototype,"editable",void 0),e([ge({attribute:!1})],Hi.prototype,"activeZone",void 0),e([ge({type:Boolean})],Hi.prototype,"showHitCounts",void 0),e([ge({attribute:!1})],Hi.prototype,"occupancy",void 0),e([ge({attribute:!1})],Hi.prototype,"targetPrevXY",void 0),e([ge({attribute:!1})],Hi.prototype,"heatmapColors",void 0),e([ge({attribute:!1})],Hi.prototype,"localize",void 0),e([ge({type:Number})],Hi.prototype,"maxRangeMm",void 0),e([ge({attribute:!1})],Hi.prototype,"dismissedTargets",void 0),e([ge({type:Number})],Hi.prototype,"maxGridPx",void 0),e([ge({attribute:!1})],Hi.prototype,"frozenBounds",void 0),customElements.get("epp-grid")||customElements.define("epp-grid",Hi);class Gi extends ce{constructor(){super(...arguments),this.sensorState={occupancy:!1,static_presence:!1,motion_presence:!1,target_presence:!1,illuminance:null,temperature:null,humidity:null,co2:null},this.zoneState={occupancy:{},target_counts:{},frame_count:0},this.zoneConfigs=[],this.perspective=null,this.localize=It,this._expandedSensorInfo=null}render(){const e=this.sensorState,t=this.zoneState,i=[{id:"occupancy",label:this.localize("live.occupancy"),on:e.occupancy_state??e.occupancy,info:this.localize("info.occupancy")},{id:"static",label:this.localize("live.static_presence"),on:e.static_state?"I"!==e.static_state:e.static_presence,info:this.localize("info.static_presence")},{id:"motion",label:this.localize("live.motion_presence"),on:e.motion_state?"I"!==e.motion_state:e.motion_presence,info:this.localize("info.motion_presence")},{id:"target",label:this.localize("live.target_presence"),on:e.target_presence,info:this.localize("info.target_presence")}],s=[];for(let e=0;e<7;e++){const i=this.zoneConfigs[e];if(!i)continue;const o=e+1,r=t.occupancy[o]??!1,a=t.target_counts[o]??0;s.push({id:`zone_${o}`,label:i.name,on:r,info:this.localize("info.zone_occupancy",{slot:o,count:a})})}const o=t.occupancy[0]??!1,r=t.target_counts[0]??0;s.push({id:"zone_0",label:this.localize("sidebar.rest_of_room"),on:o,info:this.localize("info.rest_of_room_occupancy",{count:r})});const a=[];return null!==e.illuminance&&a.push({id:"illuminance",label:this.localize("entities.illuminance"),value:this.localize("live.illuminance_value",{value:e.illuminance})}),null!==e.temperature&&a.push({id:"temperature",label:this.localize("entities.temperature"),value:this.localize("live.temperature_value",{value:e.temperature})}),null!==e.humidity&&a.push({id:"humidity",label:this.localize("entities.humidity"),value:this.localize("live.humidity_value",{value:e.humidity})}),null!==e.co2&&a.push({id:"co2",label:this.localize("entities.co2"),value:this.localize("live.co2_value",{value:e.co2})}),Y`
      <div style="padding: 8px 0;">
        <div class="live-section-header">${this.localize("live.presence")}</div>
        ${i.map(e=>Y`
          <div class="live-sensor-row">
            <div class="live-sensor-dot ${e.on?"on":"off"}"></div>
            <span class="live-sensor-label">${e.label}</span>
            <span class="live-sensor-state ${e.on?"detected":""}">${e.on?this.localize("live.detected"):this.localize("live.clear")}</span>
            <button class="live-sensor-info-btn"
              @click=${()=>{this._expandedSensorInfo=this._expandedSensorInfo===e.id?null:e.id}}
            >
              <ha-icon icon="mdi:information-outline" style="--mdc-icon-size: 16px;"></ha-icon>
            </button>
          </div>
          ${this._expandedSensorInfo===e.id?Y`
            <div class="live-sensor-info-text">${e.info}</div>
          `:J}
        `)}

        ${this.perspective?Y`
        <hr style="border: none; border-top: 1px solid var(--divider-color, #eee); margin: 10px 12px;"/>

        <button class="live-section-header live-section-link" @click=${()=>{this.dispatchEvent(new CustomEvent("view-change",{detail:{view:"editor",sidebarTab:"zones"},bubbles:!0,composed:!0}))}}>${this.localize("sidebar.detection_zones")}</button>
        ${s.map(e=>Y`
          <div class="live-sensor-row">
            <div class="live-sensor-dot ${e.on?"on":"off"}"></div>
            <span class="live-sensor-label">${e.label}</span>
            <span class="live-sensor-state ${e.on?"detected":""}">${e.on?this.localize("live.detected"):this.localize("live.clear")}</span>
            <button class="live-sensor-info-btn"
              @click=${()=>{this._expandedSensorInfo=this._expandedSensorInfo===e.id?null:e.id}}
            >
              <ha-icon icon="mdi:information-outline" style="--mdc-icon-size: 16px;"></ha-icon>
            </button>
          </div>
          ${this._expandedSensorInfo===e.id?Y`
            <div class="live-sensor-info-text">${e.info}</div>
          `:J}
        `)}
        `:J}

        <hr style="border: none; border-top: 1px solid var(--divider-color, #eee); margin: 10px 12px;"/>

        ${a.length?Y`
          <div class="live-section-header">${this.localize("live.environment")}</div>
          ${a.map(e=>Y`
            <div class="live-sensor-row">
              <span class="live-sensor-label">${e.label}</span>
              <span class="live-sensor-value">${e.value}</span>
            </div>
          `)}
        `:J}

      </div>
    `}}Gi.styles=a`
    :host {
      display: block;
    }

    .live-section-link {
      cursor: pointer;
      background: none;
      border: none;
      color: var(--primary-color, #03a9f4);
    }

    .live-section-link:hover {
      text-decoration: underline;
    }

    .live-section-header {
      font-size: 11px;
      font-weight: 600;
      color: var(--secondary-text-color, #888);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 4px 12px 6px;
    }

    .live-sensor-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      font-size: 13px;
    }

    .live-sensor-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .live-sensor-dot.on {
      background: #4CAF50;
    }

    .live-sensor-dot.off {
      background: var(--disabled-text-color, #bbb);
    }

    .live-sensor-label {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .live-sensor-state {
      font-size: 12px;
      color: var(--secondary-text-color, #888);
      flex-shrink: 0;
    }

    .live-sensor-state.detected {
      color: #4CAF50;
      font-weight: 500;
    }

    .live-sensor-value {
      font-size: 13px;
      font-weight: 500;
      color: var(--primary-text-color, #212121);
      margin-left: auto;
    }

    .live-sensor-info-btn {
      background: none;
      border: none;
      color: var(--secondary-text-color, #aaa);
      cursor: pointer;
      padding: 2px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
    }

    .live-sensor-info-btn:hover {
      color: var(--primary-color, #03a9f4);
    }

    .live-sensor-info-text {
      font-size: 12px;
      color: var(--secondary-text-color, #757575);
      padding: 2px 12px 8px 30px;
      line-height: 1.4;
    }

    .live-nav-link {
      display: flex;
      align-items: center;
      gap: 8px;
      background: none;
      border: none;
      color: var(--primary-color, #03a9f4);
      cursor: pointer;
      padding: 6px 4px;
      font-size: 13px;
      border-radius: 6px;
      text-align: left;
    }

    .live-nav-link:hover {
      background: var(--secondary-background-color, #f5f5f5);
    }
  `,e([ge({attribute:!1})],Gi.prototype,"sensorState",void 0),e([ge({attribute:!1})],Gi.prototype,"zoneState",void 0),e([ge({attribute:!1})],Gi.prototype,"zoneConfigs",void 0),e([ge({attribute:!1})],Gi.prototype,"perspective",void 0),e([ge({attribute:!1})],Gi.prototype,"localize",void 0),e([ue()],Gi.prototype,"_expandedSensorInfo",void 0),customElements.get("epp-live-sidebar")||customElements.define("epp-live-sidebar",Gi);class Li extends ce{constructor(){super(...arguments),this.sensorState={occupancy:!1,static_presence:!1,motion_presence:!1,target_presence:!1,illuminance:null,temperature:null,humidity:null,co2:null},this.targetAutoDistance=!0,this.targetMaxDistance=6,this.staticAutoDistance=!0,this.staticMinDistance=.3,this.staticMaxDistance=16,this.openAccordions=new Set,this.perspective=null,this.roomWidth=0,this.roomDepth=0,this.grid=new Uint8Array(0),this.saving=!1,this.dirty=!1,this.temperatureOffset=0,this.humidityOffset=0,this.illuminanceOffset=0,this.motionTimeout=5,this.staticTimeout=30,this.staticTriggerThreshold=3,this.staticRenewThreshold=3,this.staticOnDelay=0,this.entitiesConfig={},this.logLevels={},this.bluetoothEnabled=!1,this.co2Enabled=!1,this.ledMode="Manual Control",this.ledBrightness=1,this.ledPresenceColor="#CC33FF",this.relayTriggerMode="disabled",this.relayContactMode="no",this.targetUpdateRateMs=1e3,this.zoneUpdateRateMs=1e3,this._overrides={},this.localize=It}render(){return Y`
      <div class="settings-container">
        <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 500;">${this.localize("settings.title")}</h2>
        ${[{id:"reporting",label:"settings.entities",icon:"mdi:format-list-checks"},{id:"detection",label:"settings.detection_ranges",icon:"mdi:signal-distance-variant"},{id:"sensitivity",label:"settings.sensor_calibration",icon:"mdi:tune-vertical"},{id:"led_relay",label:"settings.led_and_relay",icon:"mdi:led-variant-on"},{id:"logging",label:"settings.logging",icon:"mdi:math-log"}].map(e=>{const t=this.openAccordions.has(e.id);return Y`
            <div class="accordion">
              <button class="accordion-header" ?data-open=${t} @click=${()=>this.toggleAccordion(e.id)}>
                <ha-icon icon=${e.icon}></ha-icon>
                <span class="accordion-title">${this.localize(e.label)}</span>
                <ha-icon class="accordion-chevron" icon="mdi:chevron-down" ?data-open=${t}></ha-icon>
              </button>
              ${t?Y`
                <div class="accordion-body">
                  ${this.renderSettingsSection(e.id)}
                </div>
              `:J}
            </div>
          `})}
        ${this.renderSaveCancelButtons()}
      </div>
    `}toggleAccordion(e){const t=this.openAccordions.has(e)?new Set:new Set([e]);this.openAccordions=t,this.dispatchEvent(new CustomEvent("accordion-toggle",{detail:t,bubbles:!0,composed:!0}))}renderSettingsSection(e){switch(e){case"detection":return this.renderDetectionRanges();case"sensitivity":return this.renderSensitivities();case"reporting":return this.renderEntities();case"led_relay":return Y`${this.renderLed()}${this.renderRelay()}`;case"logging":return this.renderLogging();default:return J}}renderEnvOffset(e,t,i,s,o,r,a,n,l,c=-1/0,h=1/0){const d=this[`${i}Offset`]??0,A=null!=t?t-d:null,g=e=>Math.max(c,Math.min(h,e)),u=null!=A?this.localize.formatNumber(g(A+d),n):"—";return Y`
      <div class="setting-row">
        <label>${e}</label>
        <span class="setting-input-unit"><input type="range" class="setting-range" data-offset-key=${i} data-precision=${n} data-display-min=${c} data-display-max=${h} min=${s} max=${o} step=${r} .value=${String(d)} @input=${e=>{const t=e.target,s=parseFloat(t.value),o=null!=A?this.localize.formatNumber(g(A+s),n):"—";this._setText(t.nextElementSibling,o),this._overrides[`${i}Offset`]=s,this._fireDirty()}} /><span class="setting-value">${u}</span> ${a}</span>
        ${this.resetBtn(0)}${this.infoTip(l)}
      </div>
    `}_setText(e,t){const i=document.createTreeWalker(e,NodeFilter.SHOW_TEXT).nextNode();i?i.data=t:e.textContent=t}_resetSlider(e,t,i){const s=e.querySelector(".setting-range");if(!s)return;const o=parseFloat(s.value);s.value=String(t);const r=s.nextElementSibling;if(r){const e=parseFloat(r.textContent||"");if(s.dataset.offsetKey&&!Number.isNaN(e)){const i=parseInt(s.dataset.precision??"0",10),a=parseFloat(s.dataset.displayMin??"-Infinity"),n=parseFloat(s.dataset.displayMax??"Infinity"),l=Math.max(a,Math.min(n,e-o+t));this._setText(r,this.localize.formatNumber(l,i)),this._overrides[`${s.dataset.offsetKey}Offset`]=t}else this._setText(r,String(t))}i&&(this._overrides[i]=t);const a=this.shadowRoot?.querySelector(".save-btn");a&&(a.disabled=!1)}resetBtn(e,t){return Y`<button
			type="button"
			class="setting-info"
			aria-label=${this.localize("settings.reset_to_default")}
			title=${this.localize("settings.reset_to_default")}
			@click=${i=>{i.stopPropagation();const s=i.currentTarget.closest(".setting-row");s&&this._resetSlider(s,e,t),t?this._fireChange(t,e):this._fireDirty()}}
		><ha-icon icon="mdi:restart"></ha-icon></button>`}infoTip(e){return Y`<button
			type="button"
			class="setting-info"
			aria-label=${this.localize("settings.show_info")}
			title=${this.localize("settings.show_info")}
			@click=${e=>{e.stopPropagation();const t=e.currentTarget,i=t.querySelector(".setting-info-tooltip");if(!i)return;const s="block"===i.style.display;if(this.shadowRoot.querySelectorAll(".setting-info-tooltip").forEach(e=>{e.style.display="none"}),s)return;const o=t.getBoundingClientRect();i.style.display="block",i.style.left=`${Math.max(8,Math.min(o.right-240,window.innerWidth-256))}px`,i.style.top=`${o.bottom+6}px`}}
		><ha-icon icon="mdi:help-circle-outline"></ha-icon><span class="setting-info-tooltip">${e}</span></button>`}renderDetectionRanges(){const e=Qi(this.roomWidth,this.roomDepth,this.perspective,this.grid),t=Oi(this.grid,this.roomWidth,this.perspective),i=e>0?Math.min(e,6):6,s=e>0?Math.min(e,16):16,o=this.targetAutoDistance?i:this.targetMaxDistance,r=this.staticAutoDistance?s:this.staticMaxDistance,a="opacity: 0.5; pointer-events: none;";return Y`
      <div class="settings-section">
        ${t?Y`<p style="font-size: 13px; color: var(--secondary-text-color, #757575); margin: 0 0 12px;">${this.localize("settings.furthest_point")} <span style="font-weight: 700; color: var(--error-color, #db4437);">${this.localize.formatNumber(t.furthestM,1)}m</span></p>`:J}
        <div class="setting-group">
          <h4>${this.localize("settings.target_sensor")}</h4>
          <div class="setting-row">
            <label>${this.localize("settings.auto")}</label>
            <label class="toggle-switch">
              <input type="checkbox" .checked=${this.targetAutoDistance}
                @change=${e=>{const t=e.target.checked;t||(this._overrides.targetMaxDistance=o,this._fireChange("targetMaxDistance",o)),this._overrides.targetAutoDistance=t,this._fireChange("targetAutoDistance",t)}} />
              <span class="toggle-slider"></span>
            </label>
            ${this.infoTip(this.localize("info.target_auto_range"))}
          </div>
          <div class="setting-row" style="${this.targetAutoDistance?a:""}">
            <label>${this.localize("settings.max_distance")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" .value=${String(o)} min="0.5" max="6" step="0.1"
              @input=${e=>{const t=e.target,i=Number(t.value);this._overrides.targetMaxDistance=i,this._fireChange("targetMaxDistance",i),this._setText(t.nextElementSibling,this.localize.formatNumber(i,1))}} /><span class="setting-value">${this.localize.formatNumber(o,1)}</span><span class="setting-unit">m</span></span>
            ${this.resetBtn(i,"targetMaxDistance")}${this.infoTip(this.localize("info.target_max_distance"))}
          </div>
        </div>
        <div class="setting-group">
          <h4>${this.localize("settings.static_sensor")}</h4>
          <div class="setting-row">
            <label>${this.localize("settings.auto")}</label>
            <label class="toggle-switch">
              <input type="checkbox" .checked=${this.staticAutoDistance}
                @change=${e=>{const t=e.target.checked;t||(this._overrides.staticMinDistance=.3,this._fireChange("staticMinDistance",.3),this._overrides.staticMaxDistance=r,this._fireChange("staticMaxDistance",r)),this._overrides.staticAutoDistance=t,this._fireChange("staticAutoDistance",t)}} />
              <span class="toggle-slider"></span>
            </label>
            ${this.infoTip(this.localize("info.target_auto_range"))}
          </div>
          <div class="setting-row" style="${this.staticAutoDistance?a:""}">
            <label>${this.localize("settings.min_distance")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" .value=${String(this.staticAutoDistance?.3:this.staticMinDistance)} min="0.3" max="16" step="0.1"
              @input=${e=>{const t=e.target;let i=Number(t.value);const s=this._overrides.staticMaxDistance??this.staticMaxDistance;i>=s&&(i=Math.round(10*(s-.1))/10,t.value=String(i)),this._overrides.staticMinDistance=i,this._fireChange("staticMinDistance",i),this._setText(t.nextElementSibling,this.localize.formatNumber(i,1))}} /><span class="setting-value">${this.localize.formatNumber(this.staticAutoDistance?.3:this.staticMinDistance,1)}</span><span class="setting-unit">m</span></span>
            ${this.resetBtn(.3,"staticMinDistance")}${this.infoTip(this.localize("info.static_min_distance"))}
          </div>
          <div class="setting-row" style="${this.staticAutoDistance?a:""}">
            <label>${this.localize("settings.max_distance")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" .value=${String(r)} min="2.4" max="16" step="0.1"
              @input=${e=>{const t=e.target;let i=Number(t.value);const s=this._overrides.staticMinDistance??this.staticMinDistance;i<=s&&(i=Math.round(10*(s+.1))/10,t.value=String(i)),this._overrides.staticMaxDistance=i,this._fireChange("staticMaxDistance",i),this._setText(t.nextElementSibling,this.localize.formatNumber(i,1))}} /><span class="setting-value">${this.localize.formatNumber(r,1)}</span><span class="setting-unit">m</span></span>
            ${this.resetBtn(s,"staticMaxDistance")}${this.infoTip(this.localize("info.static_max_distance"))}
          </div>
        </div>
      </div>
    `}renderSensitivities(){return Y`
      <div class="settings-section">
        <div class="setting-group">
          <h4>${this.localize("settings.motion_sensor")}</h4>
          <div class="setting-row">
            <label>${this.localize("settings.presence_timeout")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" .value=${String(this.motionTimeout)} min="0" max="120" step="1" @input=${e=>{const t=e.target;this._overrides.motionTimeout=Number(t.value),this._setText(t.nextElementSibling,t.value),this._fireDirty()}} /><span class="setting-value">${this.motionTimeout}</span><span class="setting-unit">s</span></span>
            ${this.resetBtn(5,"motionTimeout")}${this.infoTip(this.localize("info.motion_timeout"))}
          </div>
        </div>
        <div class="setting-group">
          <h4>${this.localize("settings.static_sensor")}</h4>
          <div class="setting-row">
            <label>${this.localize("settings.presence_delay")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" .value=${String(this.staticOnDelay)} min="0" max="30" step="0.5" @input=${e=>{const t=e.target;this._overrides.staticOnDelay=Number(t.value),this._setText(t.nextElementSibling,t.value),this._fireDirty()}} /><span class="setting-value">${this.staticOnDelay}</span><span class="setting-unit">s</span></span>
            ${this.resetBtn(0,"staticOnDelay")}${this.infoTip(this.localize("info.presence_delay"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("settings.presence_timeout")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" .value=${String(this.staticTimeout)} min="0" max="120" step="1" @input=${e=>{const t=e.target;this._overrides.staticTimeout=Number(t.value),this._setText(t.nextElementSibling,t.value),this._fireDirty()}} /><span class="setting-value">${this.staticTimeout}</span><span class="setting-unit">s</span></span>
            ${this.resetBtn(30,"staticTimeout")}${this.infoTip(this.localize("info.static_timeout"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("settings.trigger_threshold")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" min="0" max="9" .value=${String(this.staticTriggerThreshold)} @input=${e=>{const t=e.target;this._overrides.staticTriggerThreshold=Number(t.value),this._setText(t.nextElementSibling,t.value),this._fireDirty()}} /><span class="setting-value">${this.staticTriggerThreshold}</span><span class="setting-unit"></span></span>
            ${this.resetBtn(3,"staticTriggerThreshold")}${this.infoTip(this.localize("info.trigger_threshold"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("settings.renew_threshold")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" min="0" max="9" .value=${String(this.staticRenewThreshold)} @input=${e=>{const t=e.target;this._overrides.staticRenewThreshold=Number(t.value),this._setText(t.nextElementSibling,t.value),this._fireDirty()}} /><span class="setting-value">${this.staticRenewThreshold}</span><span class="setting-unit"></span></span>
            ${this.resetBtn(3,"staticRenewThreshold")}${this.infoTip(this.localize("info.renew_threshold"))}
          </div>
        </div>
        <div class="setting-group">
          <h4>${this.localize("settings.environmental")}</h4>
          ${this.renderEnvOffset(this.localize("settings.illuminance_offset"),this.sensorState.illuminance,"illuminance",-500,500,1,"lux",1,this.localize("info.illuminance_offset"),0)}
          ${this.renderEnvOffset(this.localize("settings.humidity_offset"),this.sensorState.humidity,"humidity",-50,50,.1,"%",1,this.localize("info.humidity_offset"),0,100)}
          ${this.renderEnvOffset(this.localize("settings.temperature_offset"),this.sensorState.temperature,"temperature",-20,20,.1,"°C",1,this.localize("info.temperature_offset"))}
        </div>
      </div>
    `}renderEntities(){const e=this.entitiesConfig||{},t=this._overrides.entities||{},i=(i,s)=>t[i]??e[i]??s,s=e=>{const t=e.target,i=t.dataset.entityKey;this._overrides.entities||(this._overrides.entities={}),this._overrides.entities[i]=t.checked,this._fireDirty()},o=this._overrides,r=i("zone_presence",!0)||i("zone_target_count",!1),a=i("target_xy",!1)||i("target_active",!1)||i("target_signal",!1)||i("target_zone",!1)||i("target_count",!1),n=[{value:"200",label:this.localize("settings.frequency.5hz")},{value:"500",label:this.localize("settings.frequency.2hz")},{value:"1000",label:this.localize("settings.frequency.1hz")},{value:"2000",label:this.localize("settings.frequency.0_5hz")}];return Y`
      <div class="settings-section">
        <div class="setting-group">
          <h4>${this.localize("entities.room_level")}</h4>
          <div class="setting-row">
            <label>${this.localize("entities.occupancy")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${e=>{const t=e.target,i=t.dataset.entityKey;this._overrides.entities||(this._overrides.entities={}),this._overrides.entities[i]=t.checked,this._fireDirty()}} data-entity-key="room_occupancy" .checked=${i("room_occupancy",!0)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.room_occupancy"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.static_presence")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${e=>{const t=e.target,i=t.dataset.entityKey;this._overrides.entities||(this._overrides.entities={}),this._overrides.entities[i]=t.checked,this._fireDirty()}} data-entity-key="room_static_presence" .checked=${i("room_static_presence",!1)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.room_static"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.motion_presence")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${e=>{const t=e.target,i=t.dataset.entityKey;this._overrides.entities||(this._overrides.entities={}),this._overrides.entities[i]=t.checked,this._fireDirty()}} data-entity-key="room_motion_presence" .checked=${i("room_motion_presence",!1)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.room_motion"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.target_presence")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${e=>{const t=e.target,i=t.dataset.entityKey;this._overrides.entities||(this._overrides.entities={}),this._overrides.entities[i]=t.checked,this._fireDirty()}} data-entity-key="room_target_presence" .checked=${i("room_target_presence",!1)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.room_target_presence"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.target_count")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${s} data-entity-key="target_count" .checked=${i("target_count",!1)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.room_target_count"))}
          </div>
        </div>
        <div class="setting-group">
          <h4>${this.localize("entities.zone_level")}</h4>
          <div class="setting-row">
            <label>${this.localize("entities.zone_presence")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${s} data-entity-key="zone_presence" .checked=${i("zone_presence",!0)} .disabled=${!this.perspective} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.zone_presence"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.zone_target_count")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${s} data-entity-key="zone_target_count" .checked=${i("zone_target_count",!1)} .disabled=${!this.perspective} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.zone_target_count"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("settings.update_rate")}</label>
            <ha-select
              .value=${String(o.zoneUpdateRateMs??this.zoneUpdateRateMs)}
              .options=${n}
              .disabled=${!r}
              @selected=${e=>{const t=e.detail.value;t&&(this._overrides.zoneUpdateRateMs=Number(t),this._fireDirty(),this.requestUpdate())}}
              @closed=${e=>e.stopPropagation()}>
            </ha-select>
          </div>
        </div>
        <div class="setting-group">
          <h4>${this.localize("entities.target_level")}</h4>
          <div class="setting-row">
            <label>${this.localize("entities.xy")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${s} data-entity-key="target_xy" .checked=${i("target_xy",!1)} .disabled=${!this.perspective} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.xy"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.active")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${s} data-entity-key="target_active" .checked=${i("target_active",!1)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.active"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.target_signal")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${s} data-entity-key="target_signal" .checked=${i("target_signal",!1)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.target_signal"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.target_zone")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${s} data-entity-key="target_zone" .checked=${i("target_zone",!1)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.target_zone"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("settings.update_rate")}</label>
            <ha-select
              .value=${String(o.targetUpdateRateMs??this.targetUpdateRateMs)}
              .options=${n}
              .disabled=${!a}
              @selected=${e=>{const t=e.detail.value;t&&(this._overrides.targetUpdateRateMs=Number(t),this._fireDirty(),this.requestUpdate())}}
              @closed=${e=>e.stopPropagation()}>
            </ha-select>
          </div>
        </div>
        <div class="setting-group">
          <h4>${this.localize("settings.environmental")}</h4>
          <div class="setting-row">
            <label>${this.localize("entities.illuminance")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${e=>{const t=e.target,i=t.dataset.entityKey;this._overrides.entities||(this._overrides.entities={}),this._overrides.entities[i]=t.checked,this._fireDirty()}} data-entity-key="env_illuminance" .checked=${i("env_illuminance",!1)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.illuminance"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.humidity")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${e=>{const t=e.target,i=t.dataset.entityKey;this._overrides.entities||(this._overrides.entities={}),this._overrides.entities[i]=t.checked,this._fireDirty()}} data-entity-key="env_humidity" .checked=${i("env_humidity",!1)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.humidity"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.temperature")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${e=>{const t=e.target,i=t.dataset.entityKey;this._overrides.entities||(this._overrides.entities={}),this._overrides.entities[i]=t.checked,this._fireDirty()}} data-entity-key="env_temperature" .checked=${i("env_temperature",!1)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.temperature"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.co2")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${e=>{const t=e.target,i=t.dataset.entityKey;this._overrides.entities||(this._overrides.entities={}),this._overrides.entities[i]=t.checked,this._fireDirty()}} data-entity-key="env_co2" .checked=${i("env_co2",!1)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.co2"))}
          </div>
        </div>
      </div>
    `}renderLogging(){const e=["None","Error","Warning","Info","Debug"],t=[{key:"system",label:"settings.log_system",tip:"info.log_system",show:!0},{key:"epp",label:"settings.log_epp",tip:"info.log_epp",show:!0},{key:"led",label:"settings.log_led",tip:"info.log_led",show:!0},{key:"networking",label:"settings.log_networking",tip:"info.log_networking",show:!0},{key:"ble",label:"settings.log_ble",tip:"info.log_ble",show:this.bluetoothEnabled},{key:"co2",label:"settings.log_co2",tip:"info.log_co2",show:this.co2Enabled}];return Y`
      <div class="settings-section">
        <div class="setting-group">
          ${t.filter(e=>e.show).map(t=>{const i=(this._overrides.logLevels||{})[t.key]??this.logLevels[t.key]??"None";return Y`
              <div class="setting-row">
                <label>${this.localize(t.label)}</label>
                <ha-select
                  .value=${i}
                  .options=${e.map(e=>({value:e,label:this.localize(`settings.log_level.${e.toLowerCase()}`)}))}
                  @selected=${e=>{const s=e.detail.value;s&&s!==i&&(this._overrides.logLevels||(this._overrides.logLevels={}),this._overrides.logLevels[t.key]=s,this._fireDirty(),this.requestUpdate())}}
                  @closed=${e=>e.stopPropagation()}
                ></ha-select>
                <button
								type="button"
								class="setting-info"
								aria-label=${this.localize("settings.reset_to_default")}
								title=${this.localize("settings.reset_to_default")}
								@click=${e=>{e.stopPropagation(),this._overrides.logLevels||(this._overrides.logLevels={}),this._overrides.logLevels[t.key]="None",this._fireDirty(),this.requestUpdate()}}
							><ha-icon icon="mdi:restart"></ha-icon></button>
                ${this.infoTip(this.localize(t.tip))}
              </div>
            `})}
        </div>
      </div>
    `}renderLed(){const e=this._overrides.ledMode??this.ledMode,t="Manual Control"!==e,i="Presence"===e||"Environmental + Presence"===e,s=[{value:"Manual Control",label:this.localize("settings.manual_control")},{value:"Presence",label:this.localize("settings.presence")}];this.co2Enabled&&s.push({value:"Environmental",label:this.localize("settings.environmental")},{value:"Environmental + Presence",label:this.localize("settings.environmental_presence")});const o=this._overrides.ledBrightness??this.ledBrightness,r=this._overrides.ledPresenceColor??this.ledPresenceColor;return Y`
      <div class="settings-section">
        <div class="setting-group">
          <h4>${this.localize("settings.led")}</h4>
          <div class="setting-row">
            <label>${this.localize("settings.led_mode")}</label>
            <ha-select class="wide-select" .value=${e} .options=${s} @selected=${e=>{const t=e.detail.value;t&&(this._overrides.ledMode=t,this._fireDirty(),this.requestUpdate())}} @closed=${e=>e.stopPropagation()}>
            </ha-select>
            ${this.infoTip(this.localize("info.led_mode"))}
          </div>
          ${t?Y`
          <div class="setting-row">
            <label>${this.localize("settings.led_brightness")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" data-led-brightness min="0.1" max="1" step="0.05" .value=${String(o)} @input=${e=>{const t=e.target;this._overrides.ledBrightness=parseFloat(t.value),this._setText(t.nextElementSibling,`${Math.round(100*parseFloat(t.value))}%`),this._fireDirty()}} /><span class="setting-value">${Math.round(100*o)}%</span></span>
            ${this.resetBtn(1,"ledBrightness")}${this.infoTip(this.localize("info.led_brightness"))}
          </div>`:J}
          ${i?Y`
          <div class="setting-row">
            <label>${this.localize("settings.led_presence_color")}</label>
            <input type="color" .value=${r} @input=${e=>{this._overrides.ledPresenceColor=e.target.value,this._fireDirty()}} />
            ${this.infoTip(this.localize("info.led_presence_color"))}
          </div>`:J}
        </div>
      </div>
    `}renderRelay(){const e=[{value:"disabled",label:this.localize("settings.relay_disabled")},{value:"motion",label:this.localize("settings.relay_motion")},{value:"presence",label:this.localize("settings.relay_presence")},{value:"occupancy",label:this.localize("settings.relay_occupancy")}],t=[{value:"no",label:this.localize("settings.relay_normally_open")},{value:"nc",label:this.localize("settings.relay_normally_closed")}],i=this._overrides.relayTriggerMode??this.relayTriggerMode,s=this._overrides.relayContactMode??this.relayContactMode,o="disabled"!==i;return Y`
      <div class="settings-section">
        <div class="setting-group">
          <h4>${this.localize("settings.relay")}</h4>
          <div class="setting-row">
            <label>${this.localize("settings.relay_trigger_mode")}</label>
            <ha-select class="wide-select"
              .value=${i}
              .options=${e}
              @selected=${e=>{const t=e.detail.value;t&&t!==i&&(this._overrides.relayTriggerMode=t,this._fireChange("relayTriggerMode",t),this.requestUpdate())}}
              @closed=${e=>e.stopPropagation()}
            ></ha-select>
          </div>
          ${o?Y`
            <div class="setting-row">
              <label>${this.localize("settings.relay_contact_mode")}</label>
              <ha-select class="wide-select"
                .value=${s}
                .options=${t}
                @selected=${e=>{const t=e.detail.value;t&&t!==s&&(this._overrides.relayContactMode=t,this._fireChange("relayContactMode",t),this.requestUpdate())}}
                @closed=${e=>e.stopPropagation()}
              ></ha-select>
            </div>
          `:J}
        </div>
      </div>
    `}renderSaveCancelButtons(){return Y`
      <div class="save-cancel-bar">
        <button class="wizard-btn wizard-btn-back"
          @click=${()=>{this.dispatchEvent(new CustomEvent("cancel",{bubbles:!0,composed:!0}))}}
        >${this.localize("common.cancel")}</button>
        <button class="wizard-btn wizard-btn-primary save-btn"
          ?disabled=${this.saving||!this.dirty}
          @click=${()=>{this._emitSave()}}
        >${this.saving?this.localize("common.saving"):this.localize("common.save")}</button>
      </div>
    `}_emitSave(){const e=this._overrides,t={...this.entitiesConfig,...e.entities||{}},i=e.targetAutoDistance??this.targetAutoDistance,s=e.staticAutoDistance??this.staticAutoDistance;let o=e.targetMaxDistance??this.targetMaxDistance,r=e.staticMinDistance??this.staticMinDistance,a=e.staticMaxDistance??this.staticMaxDistance;if(i||s){const e=Qi(this.roomWidth,this.roomDepth,this.perspective,this.grid);i&&(o=e>0?Math.min(e,6):6),s&&(r=.3,a=e>0?Math.min(e,16):16)}this.dispatchEvent(new CustomEvent("save",{detail:{target_auto_distance:i,target_max_distance:o,static_auto_distance:s,static_min_distance:r,static_max_distance:a,motion_timeout:e.motionTimeout??this.motionTimeout,static_timeout:e.staticTimeout??this.staticTimeout,static_trigger_threshold:e.staticTriggerThreshold??this.staticTriggerThreshold,static_renew_threshold:e.staticRenewThreshold??this.staticRenewThreshold,static_on_delay:e.staticOnDelay??this.staticOnDelay,temperature_offset:e.temperatureOffset??this.temperatureOffset,humidity_offset:e.humidityOffset??this.humidityOffset,illuminance_offset:e.illuminanceOffset??this.illuminanceOffset,entities:t,log_levels:{...this.logLevels,...e.logLevels||{}},led_mode:e.ledMode??this.ledMode,led_brightness:e.ledBrightness??this.ledBrightness,led_presence_color:e.ledPresenceColor??this.ledPresenceColor,relay_trigger_mode:e.relayTriggerMode??this.relayTriggerMode,relay_contact_mode:e.relayContactMode??this.relayContactMode,target_update_rate_ms:e.targetUpdateRateMs??this.targetUpdateRateMs,zone_update_rate_ms:e.zoneUpdateRateMs??this.zoneUpdateRateMs},bubbles:!0,composed:!0}))}_fireChange(e,t){this.dispatchEvent(new CustomEvent("setting-change",{detail:{key:e,value:t},bubbles:!0,composed:!0})),this._fireDirty()}_fireDirty(){const e=this.shadowRoot?.querySelector(".save-btn");e&&(e.disabled=!1),this.dispatchEvent(new CustomEvent("dirty",{bubbles:!0,composed:!0}))}}Li.styles=[Ft,Tt,Pt,Ut,Ot,a`
      :host {
        display: block;
      }

      .settings-container {
        width: 560px;
        max-width: 100%;
        margin: 0 auto;
        padding: 0 16px;
        box-sizing: border-box;
      }

      .setting-row ha-select {
        width: 140px;
        flex-shrink: 0;
      }

      .setting-row ha-select.wide-select {
        width: 220px;
      }

      .save-cancel-bar {
        display: flex;
        justify-content: space-between;
        padding: 12px;
        border-top: 1px solid var(--divider-color, #eee);
        margin-top: auto;
      }
    `],e([ge({attribute:!1})],Li.prototype,"sensorState",void 0),e([ge({type:Boolean})],Li.prototype,"targetAutoDistance",void 0),e([ge({type:Number})],Li.prototype,"targetMaxDistance",void 0),e([ge({type:Boolean})],Li.prototype,"staticAutoDistance",void 0),e([ge({type:Number})],Li.prototype,"staticMinDistance",void 0),e([ge({type:Number})],Li.prototype,"staticMaxDistance",void 0),e([ge({attribute:!1})],Li.prototype,"openAccordions",void 0),e([ge({attribute:!1})],Li.prototype,"perspective",void 0),e([ge({type:Number})],Li.prototype,"roomWidth",void 0),e([ge({type:Number})],Li.prototype,"roomDepth",void 0),e([ge({attribute:!1})],Li.prototype,"grid",void 0),e([ge({type:Boolean})],Li.prototype,"saving",void 0),e([ge({type:Boolean})],Li.prototype,"dirty",void 0),e([ge({type:Number})],Li.prototype,"temperatureOffset",void 0),e([ge({type:Number})],Li.prototype,"humidityOffset",void 0),e([ge({type:Number})],Li.prototype,"illuminanceOffset",void 0),e([ge({type:Number})],Li.prototype,"motionTimeout",void 0),e([ge({type:Number})],Li.prototype,"staticTimeout",void 0),e([ge({type:Number})],Li.prototype,"staticTriggerThreshold",void 0),e([ge({type:Number})],Li.prototype,"staticRenewThreshold",void 0),e([ge({type:Number})],Li.prototype,"staticOnDelay",void 0),e([ge({attribute:!1})],Li.prototype,"entitiesConfig",void 0),e([ge({attribute:!1})],Li.prototype,"logLevels",void 0),e([ge({type:Boolean})],Li.prototype,"bluetoothEnabled",void 0),e([ge({type:Boolean})],Li.prototype,"co2Enabled",void 0),e([ge({type:String})],Li.prototype,"ledMode",void 0),e([ge({type:Number})],Li.prototype,"ledBrightness",void 0),e([ge({type:String})],Li.prototype,"ledPresenceColor",void 0),e([ge({type:String})],Li.prototype,"relayTriggerMode",void 0),e([ge({type:String})],Li.prototype,"relayContactMode",void 0),e([ge({type:Number})],Li.prototype,"targetUpdateRateMs",void 0),e([ge({type:Number})],Li.prototype,"zoneUpdateRateMs",void 0),e([ge({attribute:!1})],Li.prototype,"localize",void 0),customElements.get("epp-settings-view")||customElements.define("epp-settings-view",Li);class Ni extends ce{constructor(){super(...arguments),this.selectedMac="",this.rawTargets=[],this.sensorState={occupancy:!1},this.devices=[],this.localize=It,this.initialRoomWidth=0,this.initialRoomDepth=0,this.mode="wizard",this._setupStep="guide",this._wizardSaving=!1,this._wizardCornerIndex=0,this._wizardCorners=[null,null,null,null],this._wizardRoomWidth=0,this._wizardRoomDepth=0,this._wizardCapturing=!1,this._wizardCaptureProgress=0,this._wizardCapturePaused=!1,this._wizardOffsetSide="",this._wizardOffsetFb="",this._wizardCaptureCancelled=!1,this._smoothBuffer=[],this._perspective=null}connectedCallback(){super.connectedCallback(),this._wizardRoomWidth=this.initialRoomWidth,this._wizardRoomDepth=this.initialRoomDepth}_syncCornerOffsets(){const e=this._wizardCorners[this._wizardCornerIndex];this._wizardOffsetSide=e?.offset_side?String(e.offset_side/10):"",this._wizardOffsetFb=e?.offset_fb?String(e.offset_fb/10):""}_getSmoothedRaw(){const e=this.rawTargets.find(e=>null!=e.raw_x&&null!=e.raw_y);if(!e)return null;const t=function(e,t,i,s){const o=[...e,{x:t,y:i,t:s}];let r=0;for(;r<o.length&&s-o[r].t>1e3;)r++;const a=o.slice(r);if(0===a.length)return{x:t,y:i,buffer:a};const n=e=>{const t=e.slice().sort((e,t)=>e-t),i=Math.floor(t.length/2);return t.length%2?t[i]:(t[i-1]+t[i])/2};return{x:n(a.map(e=>e.x)),y:n(a.map(e=>e.y)),buffer:a}}(this._smoothBuffer,e.raw_x,e.raw_y,Date.now());return this._smoothBuffer=t.buffer,{x:t.x,y:t.y}}_wizardCancelCapture(){this._wizardCaptureCancelled=!0,this._wizardCapturing=!1,this._wizardCapturePaused=!1}_wizardStartCapture(){const e=this.rawTargets.find(e=>null!=e.raw_x&&null!=e.raw_y);if(!e)return;this._wizardCapturing=!0,this._wizardCaptureProgress=0,this._wizardCapturePaused=!1,this._wizardCaptureCancelled=!1;const t=[];let i=0,s=Date.now();const o=()=>{if(this._wizardCaptureCancelled)return;const e=Date.now(),r=e-s;s=e;const a=this.rawTargets.filter(e=>null!=e.raw_x&&null!=e.raw_y),n=1===a.length;if(this._wizardCapturePaused=!n,n&&(i+=r,t.push({x:a[0].raw_x,y:a[0].raw_y})),this._wizardCaptureProgress=Math.min(i/5e3,1),i<5e3)return void requestAnimationFrame(o);if(this._wizardCapturing=!1,this._wizardCapturePaused=!1,0===t.length)return;const l=function(e){return 0===e.length?null:{x:zi(e.map(e=>e.x)),y:zi(e.map(e=>e.y))}}(t);if(!l)return;const c=this._wizardCornerIndex;this._wizardCorners=[...this._wizardCorners],this._wizardCorners[c]={raw_x:l.x,raw_y:l.y,offset_side:10*(parseFloat(this._wizardOffsetSide)||0),offset_fb:10*(parseFloat(this._wizardOffsetFb)||0)},c<3&&(this._wizardCornerIndex=c+1),this._syncCornerOffsets(),this._wizardCorners.every(e=>null!==e)&&this._autoComputeRoomDimensions()};requestAnimationFrame(o)}_autoComputeRoomDimensions(){const e=function(e){const t=(e,t)=>Math.sqrt((e.raw_x-t.raw_x)**2+(e.raw_y-t.raw_y)**2),i=Math.round(t(e[0],e[1])),s=t(e[0],e[3]),o=t(e[1],e[2]);return{width:i,depth:Math.round((s+o)/2)}}(this._wizardCorners);this._wizardRoomWidth=e.width,this._wizardRoomDepth=e.depth}_solvePerspective(e,t){return function(e,t){const i=[],s=[];for(let o=0;o<4;o++){const r=e[o].x,a=e[o].y,n=t[o].x,l=t[o].y;i.push([r,a,1,0,0,0,-r*n,-a*n]),s.push(n),i.push([0,0,0,r,a,1,-r*l,-a*l]),s.push(l)}const o=i.map((e,t)=>[...e,s[t]]);for(let e=0;e<8;e++){let t=Math.abs(o[e][e]),i=e;for(let s=e+1;s<8;s++)Math.abs(o[s][e])>t&&(t=Math.abs(o[s][e]),i=s);if(t<1e-12)return null;[o[e],o[i]]=[o[i],o[e]];for(let t=e+1;t<8;t++){const i=o[t][e]/o[e][e];for(let s=e;s<=8;s++)o[t][s]-=i*o[e][s]}}const r=new Array(8);for(let e=7;e>=0;e--){r[e]=o[e][8];for(let t=e+1;t<8;t++)r[e]-=o[e][t]*r[t];r[e]/=o[e][e]}return r}(e,t)}_computeWizardPerspective(){const e=this._wizardCorners;if(!e.every(e=>null!==e))return;const t=this._wizardRoomWidth,i=this._wizardRoomDepth,s=e.map(e=>({x:e.raw_x,y:e.raw_y})),o=[{x:e[0].offset_side,y:e[0].offset_fb},{x:t-e[1].offset_side,y:e[1].offset_fb},{x:t-e[2].offset_side,y:i-e[2].offset_fb},{x:e[3].offset_side,y:i-e[3].offset_fb}];this._perspective=this._solvePerspective(s,o)}async _wizardFinish(){if(this._perspective){this._wizardSaving=!0;try{await this.hass.callWS({type:"eppgrid/set_setup",mac:this.selectedMac,perspective:this._perspective,room_width:this._wizardRoomWidth,room_depth:this._wizardRoomDepth}),this.dispatchEvent(new CustomEvent("calibration-complete",{detail:{perspective:this._perspective,roomWidth:this._wizardRoomWidth,roomDepth:this._wizardRoomDepth},bubbles:!0,composed:!0}))}finally{this._wizardSaving=!1}}}_rawToFovPct(e,t){return function(e,t){return{xPct:(e+Ii)/(2*Ii)*100,yPct:t/oi*100}}(e,t)}_getWizardTargetStyle(e){const{xPct:t,yPct:i}=this._rawToFovPct(e.raw_x??0,e.raw_y??0);return`left: ${t}%; top: ${i}%;`}render(){switch(this.mode){case"uncalibrated-fov":return this._renderUncalibratedFov();case"needs-calibration":return this._renderNeedsCalibration();default:return null===this._setupStep?J:this._renderWizard()}}_renderHeader(){return Y`
      <div class="panel-header">
        <ha-select
          .value=${this.selectedMac}
          .disabled=${!0}
          .options=${this.devices.map(e=>({value:e.mac,label:e.name}))}
        ></ha-select>
      </div>
    `}_renderWizard(){let e;switch(this._setupStep){case"guide":e=this._renderWizardGuide();break;case"corners":e=this._renderWizardCorners()}return Y`
      <div class="wizard-container">
        ${this._renderHeader()} ${e}
        ${this._wizardCapturing?Y`
          <div class="capture-overlay">
            <div class="capture-overlay-content">
              <div class="capture-progress" style="width: 200px;">
                <div class="capture-bar">
                  <div class="capture-fill" style="width: ${100*this._wizardCaptureProgress}%"></div>
                </div>
                <span>${this.localize("wizard.recording",{current:Math.round(5*this._wizardCaptureProgress),total:5})}</span>
              </div>
              <p style="margin: 8px 0 0; font-size: 13px; color: ${this._wizardCapturePaused?"var(--error-color, #e53935)":"var(--secondary-text-color)"};">
                ${this._wizardCapturePaused?this.localize("wizard.paused"):this.localize("wizard.stand_still")}
              </p>
              <button
                class="wizard-btn wizard-btn-back"
                style="margin-top: 12px;"
                @click=${()=>this._wizardCancelCapture()}
              >${this.localize("common.cancel")}</button>
            </div>
          </div>
        `:J}
      </div>
    `}_renderWizardGuide(){const e=(e,t,i=!1,s=0)=>$`
      <g transform="translate(${e}, ${t}) rotate(${s}) scale(${i?-.7:.7}, 0.7)">
        <circle cx="0" cy="-12" r="4" fill="var(--primary-color, #03a9f4)"/>
        <line x1="0" y1="-8" x2="0" y2="2" stroke="var(--primary-color, #03a9f4)" stroke-width="2" stroke-linecap="round"/>
        <line x1="0" y1="2" x2="-4" y2="10" stroke="var(--primary-color, #03a9f4)" stroke-width="2" stroke-linecap="round"/>
        <line x1="0" y1="2" x2="4" y2="10" stroke="var(--primary-color, #03a9f4)" stroke-width="2" stroke-linecap="round"/>
        <line x1="0" y1="-4" x2="-5" y2="2" stroke="var(--primary-color, #03a9f4)" stroke-width="2" stroke-linecap="round"/>
        <line x1="0" y1="-4" x2="5" y2="-1" stroke="var(--primary-color, #03a9f4)" stroke-width="2" stroke-linecap="round"/>
      </g>
    `,t=(e,t,i,s)=>{const o=i-e,r=s-t,a=Math.sqrt(o*o+r*r),n=o/a,l=r/a,c=i-40*n,h=s-40*l;return $`
        <line x1="${e+40*n}" y1="${t+40*l}" x2="${c}" y2="${h}" stroke="var(--primary-color, #03a9f4)" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
        <polygon points="${c},${h} ${c-8*n+4*l},${h-8*l-4*n} ${c-8*n-4*l},${h-8*l+4*n}" fill="var(--primary-color, #03a9f4)" opacity="0.5"/>
      `},i=50,s=55,o=290,r=55,a=290,n=225,l=50,c=235,h=98,d=225,A=$`
      <svg viewBox="0 0 360 290" width="360" height="290" style="display: block; margin: 0 auto;">
        <!-- Room with rounded corners, soft fill -->
        <rect x="30" y="35" width="280" height="210" rx="8"
              fill="var(--secondary-background-color, #f5f5f5)"
              stroke="var(--divider-color, #d0d0d0)" stroke-width="2.5"/>

        <!-- Wall labels -->
        <text x="170" y="28" font-size="9" fill="var(--secondary-text-color, #aaa)" text-anchor="middle">${this.localize("wizard.front_wall_label")}</text>
        <text x="170" y="262" font-size="9" fill="var(--secondary-text-color, #aaa)" text-anchor="middle">${this.localize("wizard.back_wall_label")}</text>

        <!-- Arrows with walking figures: 1->2->3->4 -->
        ${t(i,s,o,r)}
        ${e(170,72)}
        ${t(o,r,a,n)}
        ${e(265,145,!1,90)}
        <!-- 3rd arrow flat from 3 to 4 badge, same gap as arrow 1 has from 2 -->
        ${t(a,n,h-15,n)}
        ${e(190,n-17,!0)}

        <!-- Corner 4 badge: same height as 3, just past arrow end -->
        <circle cx="${h}" cy="${d}" r="14" fill="#FF9800" opacity="0.15"/>
        <circle cx="${h}" cy="${d}" r="14" fill="none" stroke="#FF9800" stroke-width="2.5" stroke-dasharray="5 3"/>
        <text x="${h}" y="${d+5}" font-size="14" fill="#FF9800" font-weight="bold" text-anchor="middle">4</text>

        <!-- Pot plant in the corner (BL) -->
        <g transform="translate(${l+5}, ${c-5})">
          <!-- Pot -->
          <path d="M -12 -2 L -10 12 L 10 12 L 12 -2 Z" fill="#C68642" stroke="#A0522D" stroke-width="1.5"/>
          <rect x="-14" y="-5" width="28" height="5" rx="2" fill="#A0522D"/>
          <!-- Plant leaves -->
          <ellipse cx="0" cy="-18" rx="12" ry="10" fill="#66BB6A" stroke="#43A047" stroke-width="1"/>
          <ellipse cx="-10" cy="-12" rx="9" ry="7" fill="#81C784" stroke="#43A047" stroke-width="1"/>
          <ellipse cx="10" cy="-12" rx="9" ry="7" fill="#81C784" stroke="#43A047" stroke-width="1"/>
          <ellipse cx="-6" cy="-22" rx="7" ry="6" fill="#A5D6A7" stroke="#66BB6A" stroke-width="1"/>
          <ellipse cx="6" cy="-22" rx="7" ry="6" fill="#A5D6A7" stroke="#66BB6A" stroke-width="1"/>
        </g>

        <!-- Horizontal distance measure below the room -->
        <line x1="30" y1="${c+18}" x2="${h}" y2="${c+18}" stroke="#FF9800" stroke-width="1.5"/>
        <line x1="30" y1="${c+12}" x2="30" y2="${c+24}" stroke="#FF9800" stroke-width="1.5"/>
        <line x1="${h}" y1="${c+12}" x2="${h}" y2="${c+24}" stroke="#FF9800" stroke-width="1.5"/>
        <text x="${(30+h)/2}" y="${c+32}" font-size="9" fill="#FF9800" text-anchor="middle" font-weight="500">65cm</text>

        <!-- Corner 1: front-left -->
        <circle cx="${i}" cy="${s}" r="14" fill="#4CAF50" opacity="0.15"/>
        <circle cx="${i}" cy="${s}" r="14" fill="none" stroke="#4CAF50" stroke-width="2.5"/>
        <text x="${i}" y="${s+5}" font-size="14" fill="#4CAF50" font-weight="bold" text-anchor="middle">1</text>

        <!-- Corner 2: front-right (sensor here) -->
        <circle cx="${o}" cy="${r}" r="14" fill="#4CAF50" opacity="0.15"/>
        <circle cx="${o}" cy="${r}" r="14" fill="none" stroke="#4CAF50" stroke-width="2.5"/>
        <text x="${o}" y="${r+5}" font-size="14" fill="#4CAF50" font-weight="bold" text-anchor="middle">2</text>

        <!-- Corner 3: back-right -->
        <circle cx="${a}" cy="${n}" r="14" fill="#4CAF50" opacity="0.15"/>
        <circle cx="${a}" cy="${n}" r="14" fill="none" stroke="#4CAF50" stroke-width="2.5"/>
        <text x="${a}" y="${n+5}" font-size="14" fill="#4CAF50" font-weight="bold" text-anchor="middle">3</text>

        <!-- Sensor icon outside the top-right corner -->
        <g transform="translate(${o+18}, ${r-18}) rotate(-45)">
          <rect x="-5" y="-7" width="10" height="14" rx="3" fill="var(--primary-color, #03a9f4)"/>
          <circle cx="0" cy="-11" r="3.5" fill="var(--primary-color, #03a9f4)" opacity="0.4"/>
        </g>
        <text x="${o+24}" y="${r-24}" font-size="10" fill="var(--primary-color, #03a9f4)" font-weight="500">${this.localize("wizard.sensor")}</text>
      </svg>
    `;return Y`
      <div style="max-width: 560px; margin: 0 auto;">
        <div class="setting-group">
          <h4 style="text-align: center; margin-bottom: 16px;">${this.localize("wizard.how_calibration_works")}</h4>

          ${A}

          <div style="display: flex; flex-direction: column; gap: 14px; padding: 16px 4px 0;">
            <div style="display: flex; align-items: flex-start; gap: 10px;">
              <div style="min-width: 22px; height: 22px; border-radius: 50%; background: #4CAF50; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; color: white;">1</div>
              <div style="font-size: 13px;">
                ${Zt(this.localize("wizard.walk_instruction_full"))}
              </div>
            </div>

            <div style="display: flex; align-items: flex-start; gap: 10px;">
              <div style="min-width: 22px; height: 22px; border-radius: 50%; background: #FF9800; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; color: white;">!</div>
              <div style="font-size: 13px;">
                ${Zt(this.localize("wizard.cant_reach"))}
              </div>
            </div>

            <div style="display: flex; align-items: flex-start; gap: 10px;">
              <ha-icon icon="mdi:information-outline" style="--mdc-icon-size: 20px; color: var(--primary-color); flex-shrink: 0; margin-top: 1px;"></ha-icon>
              <div style="font-size: 13px; color: var(--secondary-text-color, #757575);">
                ${this.localize("wizard.corner_sensor_hint")}
              </div>
            </div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; margin-top: 20px;">
          <button class="wizard-btn wizard-btn-back"
            @click=${()=>{this._fireCancel()}}
          >${this.localize("common.cancel")}</button>
          <button class="wizard-btn wizard-btn-primary"
            @click=${()=>{this._setupStep="corners"}}
          >${this.localize("wizard.begin_marking")}</button>
        </div>
      </div>
    `}_renderWizardCorners(){const e=this._wizardCornerIndex,t=this.rawTargets.filter(e=>null!=e.raw_x&&null!=e.raw_y),i=t.length>0,s=t.length>1,o=this._wizardCorners.every(e=>null!==e),r=_i[e]||"",[a,n]=fi[e]||["",""];return Y`
      <div class="wizard-card">
        <h2>${this.localize("wizard.calibrate_room_size")}</h2>
        <p>
          ${this.localize("wizard.walk_instruction",{duration:5})}
        </p>

        ${o?J:Y`
            <p class="corner-instruction">
              ${this.localize("wizard.corner_step",{index:e+1,corner:this.localize(r)})}
            </p>
        `}

        <div class="corner-progress">
          ${_i.map((t,i)=>{const s=!!this._wizardCorners[i],o=i<3,r=i<e;return Y`
                <span
                  class="corner-chip ${s?"done":""} ${i===e?"active":""}"
                  @click=${()=>{const e=this._wizardCorners[i];this._wizardCornerIndex=i,this._wizardCorners=[...this._wizardCorners],this._wizardCorners[i]=null,this._wizardOffsetSide=e?.offset_side?String(e.offset_side/10):"",this._wizardOffsetFb=e?.offset_fb?String(e.offset_fb/10):""}}
                >
                  ${this.localize(t)} ${s?"✓":""}
                </span>
                ${o?Y`
                  <span class="corner-arrow ${r?"done":""}">›</span>
                `:J}
              `})}
        </div>

        <div class="corner-offsets" key="${e}">
          <span class="offset-label">${this.localize("wizard.distance_from")}</span>
          <input
            type="number"
            class="offset-input"
            min="0"
            step="1"
            placeholder="${this.localize("wizard.distance_from_side",{wall:this.localize(a)})}"
            .value=${this._wizardOffsetSide}
            @input=${t=>{this._wizardOffsetSide=t.target.value;const i=10*(parseFloat(this._wizardOffsetSide)||0),s=this._wizardCorners[e];s&&(s.offset_side=i)}}
          />
          <input
            type="number"
            class="offset-input"
            min="0"
            step="1"
            placeholder="${this.localize("wizard.distance_from_side",{wall:this.localize(n)})}"
            .value=${this._wizardOffsetFb}
            @input=${t=>{this._wizardOffsetFb=t.target.value;const i=10*(parseFloat(this._wizardOffsetFb)||0),s=this._wizardCorners[e];s&&(s.offset_fb=i)}}
          />
        </div>

        ${this._renderMiniSensorView()}

        ${o?Y`
          <p style="font-size: 13px; color: var(--secondary-text-color); margin: 12px 0 4px;">
            ${this.localize("wizard.save_prompt")}
          </p>
        `:Y`
          <p class="no-target-warning" style="visibility: ${!i||s?"visible":"hidden"};">
            ${i?this.localize("wizard.multiple_targets"):this.localize("wizard.no_target")}
          </p>
        `}

        <div class="wizard-actions">
          <button
            class="wizard-btn wizard-btn-back"
            @click=${()=>{this._fireCancel()}}
          >${this.localize("common.cancel")}</button>
          ${o?Y`
            <button
              class="wizard-btn wizard-btn-primary"
              ?disabled=${this._wizardSaving}
              @click=${()=>{this._computeWizardPerspective(),this._wizardFinish()}}
            >
              ${this._wizardSaving?this.localize("common.saving"):this.localize("common.save")}
            </button>
          `:Y`
            <button
              class="wizard-btn wizard-btn-primary"
              ?disabled=${!i||s||this._wizardCapturing}
              @click=${()=>this._wizardStartCapture()}
            >
              ${this.localize("wizard.mark_corner",{corner:this.localize(r)})}
            </button>
          `}
        </div>
      </div>
    `}_renderMiniSensorView(){const e=bi,t=oi,i=200,s=-e,o=t*Math.cos(mi),r=`M 0 0 L ${s} ${o} A 6000 6000 0 0 0 ${e} ${o} Z`,a=[2e3,4e3].map(e=>{const t=e*Math.sin(mi),i=e*Math.cos(mi);return`M ${-t} ${i} A ${e} ${e} 0 0 0 ${t} ${i}`});return Y`
      <div class="mini-grid-container">
        <div class="sensor-fov-view">
          <svg
            class="sensor-fov-svg"
            viewBox="${-e-i} ${-200} ${2*e+400} ${6400}"
            preserveAspectRatio="xMidYMid meet"
          >
            <path
              d="${r}"
              fill="rgba(3, 169, 244, 0.10)"
              stroke="rgba(3, 169, 244, 0.3)"
              stroke-width="30"
            />
            ${a.map(e=>$`
                <path
                  d="${e}"
                  fill="none"
                  stroke="rgba(255,255,255,0.15)"
                  stroke-width="40"
                  stroke-dasharray="80 80"
                />
              `)}
            <!-- Sensor dot -->
            <circle cx="0" cy="0" r="100" fill="var(--primary-color, #03a9f4)" stroke="#fff" stroke-width="40" />
          </svg>
          <!-- Marked corners (positioned via CSS %) -->
          ${this._wizardCorners.filter(e=>null!==e).map((e,t)=>{const{xPct:i,yPct:s}=this._rawToFovPct(e.raw_x,e.raw_y);return Y`
                <div
                  class="mini-grid-captured"
                  style="left: ${i}%; top: ${s}%;"
                  title="${this.localize(_i[t])}"
                ></div>
              `})}
          <!-- Live targets (per-target colors) -->
          ${this.rawTargets.map((e,t)=>null!=e.raw_x&&null!=e.raw_y?Y`
              <div
                class="mini-grid-target"
                style="${this._getWizardTargetStyle(e)} background: ${wi[t]||wi[0]};"
              ></div>
            `:J)}
        </div>
      </div>
    `}_renderUncalibratedFov(){const e=this.sensorState.occupancy,t=e?"#4CAF50":"var(--primary-color, #03a9f4)",i=160,s=14,o=180,r=30*Math.PI/180,a=150*Math.PI/180,n=i+o*Math.cos(r),l=s+o*Math.sin(r),c=i+o*Math.cos(a),h=s+o*Math.sin(a);return Y`
      <div style="display: flex; flex-direction: column; align-items: center; padding: 24px;">
        <svg viewBox="0 0 320 210" width="320" height="210" style="display: block;">
          <!-- Sensor at top center -->
          <rect x="${154}" y="0" width="12" height="8" rx="3" fill="${t}"/>
          <circle cx="${i}" cy="0" r="4" fill="${t}" opacity="0.4"/>

          <!-- 120 deg FOV wedge with rounded arc end -->
          <path d="M ${i} ${s} L ${n} ${l} A ${o} ${o} 0 0 1 ${c} ${h} Z"
                fill="${t}" fill-opacity="${e?.15:.06}"
                stroke="${t}" stroke-width="1" stroke-opacity="0.2"/>

          <!-- Range arcs -->
          ${[60,120,180].map(e=>{const o=i+e*Math.cos(r),n=s+e*Math.sin(r),l=i+e*Math.cos(a),c=s+e*Math.sin(a);return $`
              <path d="M ${o} ${n} A ${e} ${e} 0 0 1 ${l} ${c}"
                    fill="none" stroke="${t}" stroke-width="1"
                    stroke-dasharray="4 3" opacity="0.2"/>
            `})}

          <!-- Edge lines -->
          <line x1="${i}" y1="${s}" x2="${n}" y2="${l}" stroke="${t}" stroke-width="0.5" opacity="0.2"/>
          <line x1="${i}" y1="${s}" x2="${c}" y2="${h}" stroke="${t}" stroke-width="0.5" opacity="0.2"/>

          <!-- Target dots -->
          ${this.rawTargets.map((e,t)=>{if(null==e.raw_x||null==e.raw_y)return J;const r=Math.sqrt(e.raw_x*e.raw_x+e.raw_y*e.raw_y),a=Math.atan2(e.raw_x,e.raw_y),n=Math.min(r/6e3,1)*o,l=Math.PI/2-a,c=i+n*Math.cos(l),h=s+n*Math.sin(l);return $`<circle cx="${c}" cy="${h}" r="5" fill="${wi[t]||wi[0]}"/>`})}

          ${e?$`
            <text x="${i}" y="120" font-size="13" fill="${t}" text-anchor="middle" font-weight="500">${this.localize("live.detected")}</text>
          `:$`
            <text x="${i}" y="120" font-size="13" fill="var(--secondary-text-color, #aaa)" text-anchor="middle">${this.localize("wizard.no_presence")}</text>
          `}
        </svg>

        <button
          class="live-nav-link" style="margin-top: 16px;"
          @click=${()=>{this._fireStartCalibration()}}
        >
          <ha-icon icon="mdi:target" style="--mdc-icon-size: 16px;"></ha-icon>
          ${this.localize("wizard.calibrate_room_size")}
        </button>
      </div>
    `}_renderNeedsCalibration(){const e=$`
      <svg viewBox="0 0 200 160" width="200" height="160" style="display: block;">
        <!-- Floor and wall -->
        <line x1="20" y1="150" x2="180" y2="150" stroke="var(--divider-color, #ccc)" stroke-width="2"/>
        <line x1="20" y1="10" x2="20" y2="150" stroke="var(--divider-color, #ccc)" stroke-width="2"/>
        <!-- Person outline -->
        <circle cx="130" cy="50" r="10" fill="none" stroke="var(--secondary-text-color, #888)" stroke-width="1.5"/>
        <line x1="130" y1="60" x2="130" y2="105" stroke="var(--secondary-text-color, #888)" stroke-width="1.5"/>
        <line x1="130" y1="105" x2="118" y2="148" stroke="var(--secondary-text-color, #888)" stroke-width="1.5"/>
        <line x1="130" y1="105" x2="142" y2="148" stroke="var(--secondary-text-color, #888)" stroke-width="1.5"/>
        <line x1="130" y1="75" x2="115" y2="95" stroke="var(--secondary-text-color, #888)" stroke-width="1.5"/>
        <line x1="130" y1="75" x2="145" y2="95" stroke="var(--secondary-text-color, #888)" stroke-width="1.5"/>
        <!-- Sensor on wall -->
        <rect x="14" y="52" width="12" height="8" rx="2" fill="var(--primary-color, #03a9f4)"/>
        <!-- Height bracket -->
        <line x1="40" y1="56" x2="40" y2="150" stroke="var(--primary-color, #03a9f4)" stroke-width="1" stroke-dasharray="4 2"/>
        <line x1="36" y1="56" x2="44" y2="56" stroke="var(--primary-color, #03a9f4)" stroke-width="1.5"/>
        <line x1="36" y1="150" x2="44" y2="150" stroke="var(--primary-color, #03a9f4)" stroke-width="1.5"/>
        <text x="48" y="108" font-size="11" fill="var(--primary-color, #03a9f4)">1.5–2m</text>
        <!-- Detection cone -->
        <path d="M 26 56 L 100 30 L 100 82 Z" fill="var(--primary-color, #03a9f4)" opacity="0.1" stroke="var(--primary-color, #03a9f4)" stroke-width="0.5"/>
      </svg>
    `,t=(()=>{const e=28,t=28,i=180,s=-15*Math.PI/180,o=105*Math.PI/180,r=e+i*Math.cos(s),a=t+i*Math.sin(s),n=e+i*Math.cos(o),l=t+i*Math.sin(o),c=(i,r)=>{const a=e+i*Math.cos(s),n=t+i*Math.sin(s),l=e+i*Math.cos(o),c=t+i*Math.sin(o),h=45*Math.PI/180,d=e+(i-10)*Math.cos(h),A=t+(i-10)*Math.sin(h);return $`
          <path d="M ${a} ${n} A ${i} ${i} 0 0 1 ${l} ${c}"
                fill="none" stroke="var(--primary-color, #03a9f4)" stroke-width="1"
                stroke-dasharray="4 3" opacity="0.35" clip-path="url(#room-clip)"/>
          <text x="${d}" y="${A}" font-size="8" fill="var(--secondary-text-color, #aaa)"
                text-anchor="middle" clip-path="url(#room-clip)">${r}</text>
        `};return $`
        <svg viewBox="0 0 200 160" width="200" height="160" style="display: block;">
          <defs>
            <clipPath id="room-clip"><rect x="20" y="20" width="160" height="120"/></clipPath>
          </defs>
          <!-- Room outline -->
          <rect x="20" y="20" width="160" height="120" fill="none" stroke="var(--divider-color, #ccc)" stroke-width="2" rx="2"/>
          <!-- 120 deg FOV wedge clipped to room -->
          <path d="M ${e} ${t} L ${n} ${l} A ${i} ${i} 0 0 0 ${r} ${a} Z"
                fill="var(--primary-color, #03a9f4)" opacity="0.08"
                clip-path="url(#room-clip)"/>
          <!-- Cone edge lines -->
          <line x1="${e}" y1="${t}" x2="${r}" y2="${a}" stroke="var(--primary-color, #03a9f4)" stroke-width="0.5" opacity="0.3" clip-path="url(#room-clip)"/>
          <line x1="${e}" y1="${t}" x2="${n}" y2="${l}" stroke="var(--primary-color, #03a9f4)" stroke-width="0.5" opacity="0.3" clip-path="url(#room-clip)"/>
          <!-- Range arcs -->
          ${c(60,"2m")}
          ${c(120,"4m")}
          ${c(180,"")}
          <!-- Sensor dot -->
          <circle cx="${e}" cy="${t}" r="6" fill="var(--primary-color, #03a9f4)"/>
          <!-- Labels -->
          <text x="30" y="16" font-size="10" fill="var(--primary-color, #03a9f4)">${this.localize("wizard.sensor")}</text>
          <text x="152" y="136" font-size="8" fill="var(--secondary-text-color, #aaa)" text-anchor="end">6m</text>
        </svg>
      `})(),i=$`
      <svg viewBox="0 0 200 160" width="200" height="160" style="display: block;">
        <!-- Wall -->
        <line x1="20" y1="10" x2="20" y2="150" stroke="var(--divider-color, #ccc)" stroke-width="2"/>
        <line x1="20" y1="150" x2="180" y2="150" stroke="var(--divider-color, #ccc)" stroke-width="2"/>
        <!-- Sensor -->
        <rect x="14" y="56" width="12" height="8" rx="2" fill="var(--primary-color, #03a9f4)"/>
        <!-- Correct: horizontal beam -->
        <line x1="26" y1="60" x2="170" y2="60" stroke="var(--primary-color, #03a9f4)" stroke-width="1.5"/>
        <polygon points="170,60 162,56 162,64" fill="var(--primary-color, #03a9f4)"/>
        <text x="70" y="52" font-size="10" fill="var(--primary-color, #03a9f4)">${this.localize("wizard.horizontal_correct")}</text>
        <!-- Wrong: angled down -->
        <line x1="26" y1="60" x2="140" y2="140" stroke="var(--error-color, #f44336)" stroke-width="1" stroke-dasharray="4 2" opacity="0.6"/>
        <text x="90" y="118" font-size="10" fill="var(--error-color, #f44336)" opacity="0.7">${this.localize("wizard.angled_wrong")}</text>
        <!-- Wrong: angled up -->
        <line x1="26" y1="60" x2="120" y2="22" stroke="var(--error-color, #f44336)" stroke-width="1" stroke-dasharray="4 2" opacity="0.6"/>
        <text x="75" y="18" font-size="10" fill="var(--error-color, #f44336)" opacity="0.7">${this.localize("wizard.angled_wrong")}</text>
      </svg>
    `;return Y`
      <div style="max-width: 560px; margin: 0 auto; padding: 0 24px;">
        <div class="setting-group">
          <h4>${this.localize("wizard.how_to_position")}</h4>
          <div style="display: flex; flex-direction: column; gap: 20px; padding: 8px 0;">

            <div style="display: flex; align-items: center; gap: 16px;">
              <div style="flex-shrink: 0;">${e}</div>
              <div>
                <div style="font-weight: 500; margin-bottom: 4px;">${this.localize("wizard.mount_height")}</div>
                <div style="font-size: 13px; color: var(--secondary-text-color, #757575);">
                  ${Zt(this.localize("wizard.mount_height_desc"))}
                </div>
              </div>
            </div>

            <hr style="border: none; border-top: 1px solid var(--divider-color, #eee); margin: 0;"/>

            <div style="display: flex; align-items: center; gap: 16px;">
              <div style="flex-shrink: 0;">${t}</div>
              <div>
                <div style="font-weight: 500; margin-bottom: 4px;">${this.localize("wizard.placement")}</div>
                <div style="font-size: 13px; color: var(--secondary-text-color, #757575);">
                  ${Zt(this.localize("wizard.placement_desc"))}
                </div>
              </div>
            </div>

            <hr style="border: none; border-top: 1px solid var(--divider-color, #eee); margin: 0;"/>

            <div style="display: flex; align-items: center; gap: 16px;">
              <div style="flex-shrink: 0;">${i}</div>
              <div>
                <div style="font-weight: 500; margin-bottom: 4px;">${this.localize("wizard.beam_direction")}</div>
                <div style="font-size: 13px; color: var(--secondary-text-color, #757575);">
                  ${Zt(this.localize("wizard.beam_direction_desc"))}
                </div>
              </div>
            </div>

          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; margin-top: 24px;">
          <button
            class="wizard-btn wizard-btn-primary"
            @click=${()=>{this._fireStartCalibration()}}
          >
            ${this.localize("wizard.start_calibration")}
          </button>
        </div>
      </div>
    `}_fireStartCalibration(){this.dispatchEvent(new CustomEvent("start-calibration",{bubbles:!0,composed:!0}))}_fireCancel(){this._setupStep=null,this._wizardCorners=[null,null,null,null],this._wizardCornerIndex=0,this._wizardOffsetSide="",this._wizardOffsetFb="",this.dispatchEvent(new CustomEvent("wizard-cancel",{bubbles:!0,composed:!0}))}}Ni.styles=[Tt,zt,Pt,a`
      :host {
        display: block;
      }

      .wizard-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        width: 100%;
        padding: 32px;
        box-sizing: border-box;
      }

      .wizard-card {
        max-width: 560px;
        width: 100%;
        background: var(--card-background-color, #fff);
        border-radius: 16px;
        padding: 32px;
        display: flex;
        flex-direction: column;
        gap: 24px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
      }

      .wizard-card h2 {
        margin: 0;
        font-size: 22px;
        font-weight: 500;
      }

      .wizard-card p {
        margin: 0;
        color: var(--secondary-text-color, #757575);
        font-size: 15px;
        line-height: 1.5;
      }

      .wizard-card label {
        display: flex;
        flex-direction: column;
        gap: 6px;
        font-size: 14px;
        font-weight: 500;
        color: var(--secondary-text-color, #757575);
      }

      .wizard-card input[type="text"] {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid var(--divider-color, #e0e0e0);
        border-radius: 8px;
        font-size: 15px;
        box-sizing: border-box;
        background: var(--card-background-color, #fff);
        color: var(--primary-text-color, #212121);
      }

      .wizard-actions {
        display: flex;
        justify-content: space-between;
        gap: 12px;
      }

      .wizard-btn-secondary {
        background: var(--secondary-background-color, #e0e0e0);
        color: var(--primary-text-color, #212121);
      }

      .wizard-btn-secondary:hover {
        opacity: 0.85;
      }

      .mini-grid-container {
        display: flex;
        justify-content: center;
      }

      .mini-grid-target {
        position: absolute;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #4caf50;
        border: 2px solid #fff;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
        transform: translate(-50%, -50%);
        z-index: 10;
        transition: left 0.15s, top 0.15s;
      }

      .mini-grid-captured {
        position: absolute;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #ff9800;
        border: 2px solid #fff;
        transform: translate(-50%, -50%);
        z-index: 8;
      }

      .sensor-fov-view {
        width: 480px;
        aspect-ratio: 1.732 / 1;
        background: #1a1a2e;
        border: 2px solid var(--divider-color, #e0e0e0);
        border-radius: 8px;
        position: relative;
        overflow: hidden;
      }

      .sensor-fov-svg {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }

      .no-target-warning {
        color: var(--error-color, #f44336);
        font-size: 13px;
        text-align: center;
      }

      .corner-progress {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .corner-chip {
        padding: 5px 11px;
        border-radius: 16px;
        font-size: 13px;
        background: var(--secondary-background-color, #e0e0e0);
        color: var(--secondary-text-color, #757575);
        cursor: pointer;
        transition: background 0.2s, border-color 0.2s;
        border: 2px solid transparent;
      }

      .corner-chip.active {
        background: var(--primary-color, #03a9f4);
        color: #fff;
        border-color: var(--primary-color, #03a9f4);
      }

      .corner-chip.done {
        background: #4caf50;
        color: #fff;
      }

      .corner-chip.done.active {
        border-color: var(--primary-color, #03a9f4);
      }

      .corner-arrow {
        font-size: 18px;
        color: var(--disabled-text-color, #ccc);
        font-weight: bold;
      }

      .corner-arrow.done {
        color: var(--primary-color, #03a9f4);
      }

      .corner-instruction {
        font-size: 15px;
        color: var(--primary-text-color, #212121);
      }

      .corner-offsets {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .offset-label {
        font-size: 13px;
        color: var(--secondary-text-color, #888);
        white-space: nowrap;
        flex-shrink: 0;
      }

      .capture-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.4);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .capture-overlay-content {
        background: var(--card-background-color, #fff);
        padding: 24px 32px;
        border-radius: 16px;
        text-align: center;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      }

      .offset-input {
        flex: 1;
        width: 100%;
        padding: 14px 12px 6px;
        border: 1px solid var(--divider-color, #e0e0e0);
        border-radius: 10px;
        font-size: 16px;
        box-sizing: border-box;
        background: var(--card-background-color, #fff);
        color: var(--primary-text-color, #212121);
      }

      .offset-input::placeholder {
        color: var(--secondary-text-color, #888);
        font-size: 13px;
      }

      .offset-input:focus {
        outline: none;
        border-color: var(--primary-color, #03a9f4);
      }

      .capture-progress {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
      }

      .capture-bar {
        flex: 1;
        height: 8px;
        background: var(--secondary-background-color, #e0e0e0);
        border-radius: 4px;
        overflow: hidden;
      }

      .capture-fill {
        height: 100%;
        background: var(--primary-color, #03a9f4);
        border-radius: 4px;
        transition: width 0.1s linear;
      }

      .capture-progress span {
        font-size: 13px;
        color: var(--secondary-text-color, #757575);
        white-space: nowrap;
      }

      .live-nav-link {
        display: flex;
        align-items: center;
        gap: 8px;
        background: none;
        border: none;
        color: var(--primary-color, #03a9f4);
        cursor: pointer;
        padding: 6px 4px;
        font-size: 13px;
        border-radius: 6px;
        text-align: left;
      }

      .live-nav-link:hover {
        background: var(--secondary-background-color, #f5f5f5);
      }
    `],e([ge({attribute:!1})],Ni.prototype,"hass",void 0),e([ge({type:String})],Ni.prototype,"selectedMac",void 0),e([ge({attribute:!1})],Ni.prototype,"rawTargets",void 0),e([ge({attribute:!1})],Ni.prototype,"sensorState",void 0),e([ge({attribute:!1})],Ni.prototype,"devices",void 0),e([ge({attribute:!1})],Ni.prototype,"localize",void 0),e([ge({type:Number})],Ni.prototype,"initialRoomWidth",void 0),e([ge({type:Number})],Ni.prototype,"initialRoomDepth",void 0),e([ge({type:String})],Ni.prototype,"mode",void 0),e([ue()],Ni.prototype,"_setupStep",void 0),e([ue()],Ni.prototype,"_wizardSaving",void 0),e([ue()],Ni.prototype,"_wizardCornerIndex",void 0),e([ue()],Ni.prototype,"_wizardCorners",void 0),e([ue()],Ni.prototype,"_wizardRoomWidth",void 0),e([ue()],Ni.prototype,"_wizardRoomDepth",void 0),e([ue()],Ni.prototype,"_wizardCapturing",void 0),e([ue()],Ni.prototype,"_wizardCaptureProgress",void 0),e([ue()],Ni.prototype,"_wizardCapturePaused",void 0),e([ue()],Ni.prototype,"_wizardOffsetSide",void 0),e([ue()],Ni.prototype,"_wizardOffsetFb",void 0),customElements.get("epp-wizard")||customElements.define("epp-wizard",Ni);class Yi extends ce{constructor(){super(...arguments),this.overlayMode=null,this.localize=It}render(){return Y`
			<div class="overlay-scroll-area">
				<!-- Entry / Exit -->
				<div
					class="overlay-item ${"entry"===this.overlayMode?"active":""}"
					@click=${()=>{this.dispatchEvent(new CustomEvent("overlay-select",{detail:{mode:"entry"===this.overlayMode?null:"entry"},bubbles:!0,composed:!0}))}}
				>
					<div class="overlay-item-row">
						<div
							class="overlay-dot"
							style="background: repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(60,60,60,0.6) 4px, rgba(60,60,60,0.6) 6px);"
						></div>
						<span class="overlay-name"
							>${this.localize("overlays.entry_exit")}</span
						>
						<span class="overlay-hint"
							>${this.localize("overlays.click_to_paint")}</span
						>
					</div>
				</div>

				<!-- Interference -->
				<div
					class="overlay-item ${"interference"===this.overlayMode?"active":""}"
					@click=${()=>{this.dispatchEvent(new CustomEvent("overlay-select",{detail:{mode:"interference"===this.overlayMode?null:"interference"},bubbles:!0,composed:!0}))}}
				>
					<div class="overlay-item-row">
						<div
							class="overlay-dot"
							style="background: repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(200,0,0,0.6) 4px, rgba(200,0,0,0.6) 6px);"
						></div>
						<span class="overlay-name"
							>${this.localize("overlays.interference")}</span
						>
						<span class="overlay-hint"
							>${this.localize("overlays.click_to_paint")}</span
						>
					</div>
				</div>

				<!-- Suppress -->
				<div
					class="overlay-item ${"suppress"===this.overlayMode?"active":""}"
					@click=${()=>{this.dispatchEvent(new CustomEvent("overlay-select",{detail:{mode:"suppress"===this.overlayMode?null:"suppress"},bubbles:!0,composed:!0}))}}
				>
					<div class="overlay-item-row">
						<div
							class="overlay-dot"
							style="background: repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(200,0,0,0.6) 4px, rgba(200,0,0,0.6) 6px), repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(200,0,0,0.6) 4px, rgba(200,0,0,0.6) 6px);"
						></div>
						<span class="overlay-name"
							>${this.localize("overlays.suppress")}</span
						>
						<span class="overlay-hint"
							>${this.localize("overlays.click_to_paint")}</span
						>
					</div>
				</div>
			</div>
		`}}Yi.styles=a`
		:host {
			display: block;
		}

		.overlay-scroll-area {
			display: flex;
			flex-direction: column;
			gap: 6px;
		}

		.overlay-item {
			display: flex;
			flex-direction: column;
			gap: 4px;
			padding: 6px 8px;
			border-radius: 8px;
			cursor: pointer;
			border: 2px solid var(--divider-color, #e0e0e0);
			transition: border-color 0.2s;
		}

		.overlay-item:hover {
			background: var(--secondary-background-color, #f5f5f5);
		}

		.overlay-item.active {
			border-color: var(--primary-color, #03a9f4);
		}

		.overlay-item-row {
			display: flex;
			align-items: center;
			gap: 8px;
		}

		.overlay-dot {
			width: 16px;
			height: 16px;
			border-radius: 50%;
			flex-shrink: 0;
			border: 1px solid #ccc;
		}

		.overlay-name {
			flex: 1;
			font-size: 14px;
		}

		.overlay-hint {
			font-size: 11px;
			color: var(--secondary-text-color, #757575);
		}

		.level-selector {
			padding: 4px 0 2px 0;
		}

		.level-label {
			font-size: 11px;
			color: var(--secondary-text-color, #757575);
			margin-bottom: 4px;
		}

		.level-buttons {
			display: flex;
			gap: 4px;
		}

	`,e([ge({attribute:!1})],Yi.prototype,"overlayMode",void 0),e([ge({attribute:!1})],Yi.prototype,"localize",void 0),customElements.get("epp-overlay-sidebar")||customElements.define("epp-overlay-sidebar",Yi);const $i={normal:{trigger:5,renew:3,timeout:10,handoff_timeout:3},thoroughfare:{trigger:3,renew:2,timeout:3,handoff_timeout:1},rest:{trigger:7,renew:1,timeout:30,handoff_timeout:10}},Ki=["#B8E7FF","#CFDB70","#FFC4CF","#F3E7AC","#7CCFB8","#A0C4E7","#F3AC94"];function Ji(e,t,i,s,o,r,a){if(0===e){const e=$i[i]||$i.normal;return"custom"===i?{trigger:s,renew:o,timeout:r,handoffTimeout:a}:{trigger:e.trigger,renew:e.renew,timeout:e.timeout,handoffTimeout:e.handoff_timeout}}if(e>0&&e<=t.length){const i=t[e-1];if(i){const e=$i[i.type]||$i.normal;return"custom"===i.type?{trigger:i.trigger??e.trigger,renew:i.renew??e.renew,timeout:i.timeout??e.timeout,handoffTimeout:i.handoff_timeout??e.handoff_timeout}:{trigger:e.trigger,renew:e.renew,timeout:e.timeout,handoffTimeout:e.handoff_timeout}}}return{trigger:5,renew:3,timeout:10,handoffTimeout:3}}class Wi extends ce{constructor(){super(...arguments),this.zoneConfigs=[],this.activeZone=null,this.roomType="normal",this.roomTrigger=$i.normal.trigger,this.roomRenew=$i.normal.renew,this.roomTimeout=$i.normal.timeout,this.roomHandoffTimeout=$i.normal.handoff_timeout,this.localZoneState=new Map,this.localize=It}render(){return this._renderZoneSidebar()}_renderZoneSidebar(){return Y`
			<div class="zone-scroll-area">
				<!-- Room -->
				<div
					class="zone-item ${0===this.activeZone?"active":""}"
					@click=${()=>{this.dispatchEvent(new CustomEvent("zone-select",{detail:{zone:0},bubbles:!0,composed:!0}))}}
				>
					<div class="zone-item-row">
						<div
							class="zone-color-dot"
							style="background: #fff; border: 1px solid #ccc;${this.localZoneState.get(0)?.occupied?" box-shadow: 0 0 6px 2px #999;":""}"
						></div>
						<span class="zone-name"
							>${this.localize("sidebar.room")}</span
						>
					</div>
					${0===this.activeZone?Y` ${this._renderBoundaryTypeControls()} `:J}
				</div>

				<hr class="zone-separator" />
				<!-- Named zones 1..N -->
				${this.zoneConfigs.map((e,t)=>{if(null===e)return J;const i=t+1;return Y`
						<div
							class="zone-item ${this.activeZone===i?"active":""}"
							@click=${()=>{this.dispatchEvent(new CustomEvent("zone-select",{detail:{zone:i},bubbles:!0,composed:!0}))}}
						>
							<div class="zone-item-row">
								${this.activeZone===i?Y`
											<input
												type="color"
												class="zone-color-picker"
												style="width: 16px; height: 16px; border-radius: 50%;${this.localZoneState.get(i)?.occupied?` box-shadow: 0 0 6px 2px ${e.color};`:""}"
												.value=${e.color}
												@input=${e=>{const i=e.target.value;this.dispatchEvent(new CustomEvent("zone-config-change",{detail:{index:t,updates:{color:i}},bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("dirty",{bubbles:!0,composed:!0}))}}
												@click=${e=>e.stopPropagation()}
											/>
										`:Y`
											<div
												class="zone-color-dot"
												style="background: ${e.color};${this.localZoneState.get(i)?.occupied?` box-shadow: 0 0 6px 2px ${e.color};`:""}"
											></div>
										`}
								<input
									class="zone-name-input"
									type="text"
									.value=${e.name}
									@input=${e=>{const i=e.target.value;this.dispatchEvent(new CustomEvent("zone-config-change",{detail:{index:t,updates:{name:i}},bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("dirty",{bubbles:!0,composed:!0}))}}
									@click=${e=>{e.stopPropagation(),this.dispatchEvent(new CustomEvent("zone-select",{detail:{zone:i},bubbles:!0,composed:!0}))}}
									@focus=${()=>{this.dispatchEvent(new CustomEvent("zone-select",{detail:{zone:i},bubbles:!0,composed:!0}))}}
								/>
								<button
									class="zone-remove-btn"
									@click=${e=>{e.stopPropagation(),this.dispatchEvent(new CustomEvent("zone-remove",{detail:{slot:i},bubbles:!0,composed:!0}))}}
								>
									<ha-icon icon="mdi:close"></ha-icon>
								</button>
							</div>
							${this.activeZone===i?Y`
										${this._renderZoneTypeControls(e,t)}
									`:J}
						</div>
					`})}

				${this.zoneConfigs.some(e=>null===e)?Y`
							<button
								class="add-zone-btn"
								@click=${()=>{this.dispatchEvent(new CustomEvent("zone-add",{bubbles:!0,composed:!0}))}}
							>
								<ha-icon icon="mdi:plus"></ha-icon>
								${this.localize("sidebar.add_zone")}
							</button>
						`:J}

			</div>
		`}_renderBoundaryTypeControls(){const e="custom"===this.roomType,t=$i[this.roomType]||$i.normal,i=e?this.roomTrigger:t.trigger,s=e?this.roomRenew:t.renew,o=e?this.roomTimeout:t.timeout,r=e?this.roomHandoffTimeout:t.handoff_timeout,a=`width: 100%; display: flex; align-items: center; gap: 4px; font-size: 12px; opacity: ${e?1:.5};`;return Y`
			<div
				class="zone-item-row zone-settings-row"
				style="flex-wrap: wrap; gap: 3px; padding: 4px 8px;"
			>
				<div
					style="width: 100%; display: flex; align-items: center; gap: 4px;"
				>
					<label
						style="width: 80px; flex-shrink: 0; font-size: 12px;"
						>${this.localize("zones.type")}</label
					>
					<select
						class="sensitivity-select"
						style="flex: 1; min-width: 0;"
						.value=${this.roomType}
						@change=${e=>{const t=e.target.value,i=$i[t]||$i.normal;this.dispatchEvent(new CustomEvent("room-config-change",{detail:{updates:{roomType:t,roomTrigger:i.trigger,roomRenew:i.renew,roomTimeout:i.timeout,roomHandoffTimeout:i.handoff_timeout}},bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("dirty",{bubbles:!0,composed:!0}))}}
						@click=${e=>e.stopPropagation()}
					>
						<option value="normal">
							${this.localize("zones.normal")}
						</option>
						<option value="thoroughfare">
							${this.localize("zones.thoroughfare")}
						</option>
						<option value="rest">
							${this.localize("zones.rest_area")}
						</option>
						<option value="custom">
							${this.localize("zones.custom")}
						</option>
					</select>
				</div>
				<div style="${a}">
					<label style="width: 80px; flex-shrink: 0;"
						>${this.localize("zones.trigger")}</label
					>
					<input
						type="range"
						min="1"
						max="9"
						style="flex: 1; min-width: 0;"
						.value=${String(i)}
						?disabled=${!e}
						@input=${e=>{this.dispatchEvent(new CustomEvent("room-config-change",{detail:{updates:{roomTrigger:Number(e.target.value)}},bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("dirty",{bubbles:!0,composed:!0}))}}
						@click=${e=>e.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0;"
						>${i}</span
					>
				</div>
				<div style="${a}">
					<label style="width: 80px; flex-shrink: 0;"
						>${this.localize("zones.renew")}</label
					>
					<input
						type="range"
						min="1"
						max="9"
						style="flex: 1; min-width: 0;"
						.value=${String(s)}
						?disabled=${!e}
						@input=${e=>{this.dispatchEvent(new CustomEvent("room-config-change",{detail:{updates:{roomRenew:Number(e.target.value)}},bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("dirty",{bubbles:!0,composed:!0}))}}
						@click=${e=>e.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0;"
						>${s}</span
					>
				</div>
				<div style="${a}">
					<label style="width: 80px; flex-shrink: 0;"
						>${this.localize("zones.presence_timeout")}</label
					>
					<span style="flex: 1;"></span>
					<input
						type="number"
						min="1"
						max="300"
						style="width: 48px; text-align: right; font: inherit; font-size: 12px;"
						.value=${String(o)}
						?disabled=${!e}
						@input=${e=>{const t=Number(e.target.value);t>0&&(this.dispatchEvent(new CustomEvent("room-config-change",{detail:{updates:{roomTimeout:t}},bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("dirty",{bubbles:!0,composed:!0})))}}
						@click=${e=>e.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0; font-size: 12px;"
						>${this.localize("zones.seconds_suffix")}</span
					>
				</div>
				<div style="${a}">
					<label style="width: 80px; flex-shrink: 0;"
						>${this.localize("zones.handoff_timeout")}</label
					>
					<span style="flex: 1;"></span>
					<input
						type="number"
						min="1"
						max="300"
						style="width: 48px; text-align: right; font: inherit; font-size: 12px;"
						.value=${String(r)}
						?disabled=${!e}
						@input=${e=>{const t=Number(e.target.value);t>0&&(this.dispatchEvent(new CustomEvent("room-config-change",{detail:{updates:{roomHandoffTimeout:t}},bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("dirty",{bubbles:!0,composed:!0})))}}
						@click=${e=>e.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0; font-size: 12px;"
						>${this.localize("zones.seconds_suffix")}</span
					>
				</div>
			</div>
		`}_renderZoneTypeControls(e,t){const i="custom"===e.type,s=$i[e.type]||$i.normal,o=e.trigger??s.trigger,r=e.renew??s.renew,a=e.timeout??s.timeout,n=e.handoff_timeout??s.handoff_timeout,l=`width: 100%; display: flex; align-items: center; gap: 4px; font-size: 12px; opacity: ${i?1:.5};`;return Y`
			<div
				class="zone-item-row zone-settings-row"
				style="flex-wrap: wrap; gap: 3px; padding: 4px 8px;"
			>
				<div
					style="width: 100%; display: flex; align-items: center; gap: 4px;"
				>
					<label
						style="width: 80px; flex-shrink: 0; font-size: 12px;"
						>${this.localize("zones.type")}</label
					>
					<select
						class="sensitivity-select"
						style="flex: 1; min-width: 0;"
						.value=${e.type}
						@change=${e=>{const i=e.target.value,s=$i[i]||$i.normal;this.dispatchEvent(new CustomEvent("zone-config-change",{detail:{index:t,updates:{type:i,trigger:s.trigger,renew:s.renew,timeout:s.timeout,handoff_timeout:s.handoff_timeout}},bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("dirty",{bubbles:!0,composed:!0}))}}
						@click=${e=>e.stopPropagation()}
					>
						<option value="normal">
							${this.localize("zones.normal")}
						</option>
						<option value="thoroughfare">
							${this.localize("zones.thoroughfare")}
						</option>
						<option value="rest">
							${this.localize("zones.rest_area")}
						</option>
						<option value="custom">
							${this.localize("zones.custom")}
						</option>
					</select>
				</div>
				<div style="${l}">
					<label style="width: 80px; flex-shrink: 0;"
						>${this.localize("zones.trigger")}</label
					>
					<input
						type="range"
						min="1"
						max="9"
						style="flex: 1; min-width: 0;"
						.value=${String(o)}
						?disabled=${!i}
						@input=${e=>{this.dispatchEvent(new CustomEvent("zone-config-change",{detail:{index:t,updates:{trigger:Number(e.target.value)}},bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("dirty",{bubbles:!0,composed:!0}))}}
						@click=${e=>e.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0;"
						>${o}</span
					>
				</div>
				<div style="${l}">
					<label style="width: 80px; flex-shrink: 0;"
						>${this.localize("zones.renew")}</label
					>
					<input
						type="range"
						min="1"
						max="9"
						style="flex: 1; min-width: 0;"
						.value=${String(r)}
						?disabled=${!i}
						@input=${e=>{this.dispatchEvent(new CustomEvent("zone-config-change",{detail:{index:t,updates:{renew:Number(e.target.value)}},bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("dirty",{bubbles:!0,composed:!0}))}}
						@click=${e=>e.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0;"
						>${r}</span
					>
				</div>
				<div style="${l}">
					<label style="width: 80px; flex-shrink: 0;"
						>${this.localize("zones.presence_timeout")}</label
					>
					<span style="flex: 1;"></span>
					<input
						type="number"
						min="1"
						max="300"
						style="width: 48px; text-align: right; font: inherit; font-size: 12px; margin-right: 0;"
						.value=${String(a)}
						?disabled=${!i}
						@input=${e=>{const i=Number(e.target.value);i>0&&(this.dispatchEvent(new CustomEvent("zone-config-change",{detail:{index:t,updates:{timeout:i}},bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("dirty",{bubbles:!0,composed:!0})))}}
						@click=${e=>e.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0; font-size: 12px;"
						>${this.localize("zones.seconds_suffix")}</span
					>
				</div>
				<div style="${l}">
					<label style="width: 80px; flex-shrink: 0;"
						>${this.localize("zones.handoff_timeout")}</label
					>
					<span style="flex: 1;"></span>
					<input
						type="number"
						min="1"
						max="300"
						style="width: 48px; text-align: right; font: inherit; font-size: 12px; margin-right: 0;"
						.value=${String(n)}
						?disabled=${!i}
						@input=${e=>{const i=Number(e.target.value);i>0&&(this.dispatchEvent(new CustomEvent("zone-config-change",{detail:{index:t,updates:{handoff_timeout:i}},bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("dirty",{bubbles:!0,composed:!0})))}}
						@click=${e=>e.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0; font-size: 12px;"
						>${this.localize("zones.seconds_suffix")}</span
					>
				</div>
			</div>
		`}}Wi.styles=[Ut,a`
			:host {
				display: block;
			}

			.zone-name-input {
				flex: 1;
				border: none;
				border-bottom: 1px solid var(--divider-color, #e0e0e0);
				background: transparent;
				font-size: 14px;
				color: var(--primary-text-color, #212121);
				padding: 2px 4px;
				min-width: 0;
			}

			.zone-name-input:focus {
				outline: none;
				border-bottom: 1px solid var(--primary-color, #03a9f4);
			}

			.sensitivity-select {
				padding: 2px 4px;
				border: 1px solid var(--divider-color, #e0e0e0);
				border-radius: 4px;
				font-size: 12px;
				background: var(--card-background-color, #fff);
				color: var(--primary-text-color, #212121);
				cursor: pointer;
				flex-shrink: 0;
			}

			.zone-color-picker {
				width: 24px;
				height: 24px;
				border: none;
				padding: 0;
				cursor: pointer;
				border-radius: 4px;
				flex-shrink: 0;
			}

			.zone-scroll-area {
				display: flex;
				flex-direction: column;
				gap: 6px;
				overflow-y: auto;
				flex: 1;
				min-height: 0;
			}

			.zone-item {
				display: flex;
				flex-direction: column;
				gap: 4px;
				padding: 6px 8px;
				border-radius: 8px;
				cursor: pointer;
				border: 2px solid var(--divider-color, #e0e0e0);
				transition: border-color 0.2s;
			}

			.zone-item:hover {
				background: var(--secondary-background-color, #f5f5f5);
			}

			.zone-item.active {
				border-color: var(--primary-color, #03a9f4);
			}

			.zone-item-row {
				display: flex;
				align-items: center;
				gap: 8px;
			}

			.zone-settings-row {
				padding-left: 24px;
				gap: 6px;
			}

			.zone-separator {
				border: none;
				border-top: 1px solid var(--divider-color, #e0e0e0);
				margin: 4px 0;
				flex-shrink: 0;
			}

			.zone-color-dot {
				width: 16px;
				height: 16px;
				border-radius: 50%;
				flex-shrink: 0;
			}

			.zone-name {
				flex: 1;
				font-size: 14px;
			}

			.zone-remove-btn {
				background: none;
				border: none;
				color: var(--secondary-text-color, #757575);
				cursor: pointer;
				padding: 4px;
				border-radius: 4px;
			}

			.zone-remove-btn:hover {
				color: var(--error-color, #f44336);
			}

			.add-zone-btn {
				display: flex;
				align-items: center;
				justify-content: center;
				gap: 6px;
				padding: 10px;
				border: 2px dashed var(--divider-color, #e0e0e0);
				border-radius: 8px;
				background: none;
				color: var(--primary-color, #03a9f4);
				cursor: pointer;
				font-size: 14px;
				transition: background 0.2s;
			}

			.add-zone-btn:hover {
				background: var(--secondary-background-color, #f5f5f5);
			}
		`],e([ge({attribute:!1})],Wi.prototype,"grid",void 0),e([ge({attribute:!1})],Wi.prototype,"zoneConfigs",void 0),e([ge({attribute:!1})],Wi.prototype,"activeZone",void 0),e([ge({attribute:!1})],Wi.prototype,"roomType",void 0),e([ge({attribute:!1})],Wi.prototype,"roomTrigger",void 0),e([ge({attribute:!1})],Wi.prototype,"roomRenew",void 0),e([ge({attribute:!1})],Wi.prototype,"roomTimeout",void 0),e([ge({attribute:!1})],Wi.prototype,"roomHandoffTimeout",void 0),e([ge({attribute:!1})],Wi.prototype,"localZoneState",void 0),e([ge({attribute:!1})],Wi.prototype,"localize",void 0),customElements.get("epp-zone-sidebar")||customElements.define("epp-zone-sidebar",Wi);class ji{constructor(e){this.devices=[],this.selectedMac="",this.loading=!0,this._hass=null,this._reconnecting=!1,this._connectionFailed=!1,this._host=e,e.addController(this)}hostConnected(){}hostDisconnected(){this.unsubscribeDeviceList(),this.closeDeviceSession()}get hass(){return this._hass}set hass(e){const t=this._hass?.connection;this._hass=e,e?.connection&&e.connection!==t&&t&&(this._unsubDevice=void 0,this._unsubTargets=void 0,this._unsubDisplay=void 0)}get hasDeviceSession(){return!!this._unsubDevice}get reconnecting(){return this._reconnecting}get connectionFailed(){return this._connectionFailed}async loadDevices(){if(!this._hass)return;try{const e=await this._hass.callWS({type:"eppgrid/list_devices"});this.devices=e.devices.sort((e,t)=>(e.name||"").localeCompare(t.name||""))}catch{return this.devices=[],void this._host.requestUpdate()}const e=localStorage.getItem("epp_selected_mac"),t=e&&this.devices.find(t=>t.mac===e);this.selectedMac=t?e:this.devices[0]?.mac??"",this._host.requestUpdate()}async subscribeDeviceList(){if(this.unsubscribeDeviceList(),this._hass)try{this._unsubDeviceList=await this._hass.connection.subscribeMessage(e=>{this._applyDeviceList(e.devices)},{type:"eppgrid/subscribe_device_list"})}catch{await this.loadDevices()}}unsubscribeDeviceList(){if(this._unsubDeviceList){try{this._unsubDeviceList()}catch{}this._unsubDeviceList=void 0}}_applyDeviceList(e){this.devices=e.sort((e,t)=>(e.name||"").localeCompare(t.name||""));const t=localStorage.getItem("epp_selected_mac"),i=t&&this.devices.find(e=>e.mac===t);this.selectedMac=i?t:this.devices[0]?.mac??"",this.onDeviceListChanged?.(),this._host.requestUpdate()}async loadDeviceConfig(e){if(this._reconnecting)return null;this._reconnecting=!0,this._host.requestUpdate();try{let t=null;try{t=(await this._hass.callWS({type:"eppgrid/get_config",mac:e})).config}catch{}return await this.openDeviceSession(e),this._unsubDevice&&this.subscribeTargets(e),t}finally{this._reconnecting=!1,this._host.requestUpdate()}}async openDeviceSession(e){if(this.closeDeviceSession(),this._hass&&e)try{this._unsubDevice=await this._hass.connection.subscribeMessage(()=>{},{type:"eppgrid/subscribe_device",mac:e}),this._connectionFailed=!1,this._host.requestUpdate()}catch(e){console.warn("Failed to open device session:",e);const t=e;this._connectionFailed="connection_failed"===t?.code||"not_found"===t?.code,this._host.requestUpdate()}}closeDeviceSession(){if(this.unsubscribeTargets(),this._unsubDevice){try{this._unsubDevice()}catch{}this._unsubDevice=void 0}}subscribeTargets(e){if(this.unsubscribeDisplay(),this._targetRetryTimer&&(clearTimeout(this._targetRetryTimer),this._targetRetryTimer=void 0),this._unsubTargets&&(this._unsubTargets(),this._unsubTargets=void 0),!this._hass||!e)return;const t=this._hass.connection;this._subscribeGridTargets(t,e),this.subscribeDisplay(e)}unsubscribeTargets(){if(this.unsubscribeDisplay(),this._targetRetryTimer&&(clearTimeout(this._targetRetryTimer),this._targetRetryTimer=void 0),this._unsubTargets){try{this._unsubTargets()}catch{}this._unsubTargets=void 0}}_subscribeGridTargets(e,t){e.subscribeMessage(e=>{const t=(e.targets||[]).map(e=>({x:e.x,y:e.y,speed:0,status:e.status??"inactive",signal:e.signal??0})),i=e.sensors?{occupancy:e.sensors.occupancy??!1,static_presence:e.sensors.static_presence??!1,motion_presence:e.sensors.motion_presence??!1,target_presence:e.sensors.target_presence??!1,static_state:e.sensors.static_state,motion_state:e.sensors.motion_state,occupancy_state:e.sensors.occupancy_state,illuminance:e.sensors.illuminance??null,temperature:e.sensors.temperature??null,humidity:e.sensors.humidity??null,co2:e.sensors.co2??null}:{occupancy:!1,static_presence:!1,motion_presence:!1,target_presence:!1,static_state:void 0,motion_state:void 0,occupancy_state:void 0,illuminance:null,temperature:null,humidity:null,co2:null},s=e.zones?{occupancy:e.zones.occupancy??{},target_counts:e.zones.target_counts??{},frame_count:e.zones.frame_count??0,debug_log:e.zones.debug_log}:null;this.onTargetData?.({targets:t,sensors:i,zones:s})},{type:"eppgrid/subscribe_grid_targets",mac:t}).then(e=>{this._unsubTargets=e}).catch(()=>{this._targetRetryTimer&&clearTimeout(this._targetRetryTimer),this._targetRetryTimer=setTimeout(()=>{this._targetRetryTimer=void 0,this._hass?.connection===e&&this._subscribeGridTargets(e,t)},2e3)})}subscribeDisplay(e){this.unsubscribeDisplay(),this._hass&&e&&this._hass.connection.subscribeMessage(e=>{const t=(e.targets||[]).map(e=>({raw_x:e.raw_x,raw_y:e.raw_y}));this.onRawTargetData?.(t)},{type:"eppgrid/subscribe_raw_targets",mac:e}).then(e=>{this._unsubDisplay=e}).catch(()=>{})}unsubscribeDisplay(){if(this._unsubDisplay){try{this._unsubDisplay()}catch{}this._unsubDisplay=void 0}}selectDevice(e){this.selectedMac=e,this._connectionFailed=!1,localStorage.setItem("epp_selected_mac",e),this._host.requestUpdate()}}class Vi{constructor(e){this.flashableDevices=[],this.firmwareBaseUrl="",this.firmwareVersion="",this.integrationVersion="",this.loading=!0,this.usbConnected=!1,this.usbDeviceMac=null,this.usbExistingDevice=null,this.usbFlashState=null,this.wifiNetworks=[],this.otaStates={},this._hass=null,this._serialPort=null,this._opId=0,this._opRunning=!1,this._otaUnsubs={},this._otaTimeouts={},this._host=e,e.addController(this)}hostConnected(){}hostDisconnected(){this.unsubscribeDeviceList(),this._serialPort?.close().catch(()=>{}),this._serialPort=null;for(const e of Object.keys(this._otaUnsubs))this._unsubOta(e);for(const e of Object.keys(this._otaTimeouts))this._resetOtaTimeout(e);this.otaStates={}}async startOta(e){this.otaStates[e]={state:"updating",progress:0,errorKey:null},this._host.requestUpdate();try{await this._hass.callWS({type:"eppgrid/update_firmware",mac:e})}catch{return this.otaStates[e]={state:"error",progress:null,errorKey:"flasher.errors.start_failed"},void this._host.requestUpdate()}try{const t=await this._hass.connection.subscribeMessage(t=>{this._handleOtaEvent(e,t)},{type:"eppgrid/subscribe_ota_progress",mac:e});this._otaUnsubs[e]=t,this._startOtaTimeout(e,15e3)}catch{this.otaStates[e]={state:"error",progress:null,errorKey:"flasher.errors.connect_failed"},this._host.requestUpdate()}}_handleOtaEvent(e,t){switch(this._resetOtaTimeout(e),t.state){case"updating":{const i=t.progress??null;null!=i&&i>=100?this._otaSuccess(e):(this.otaStates[e]={state:"updating",progress:i,errorKey:null},this._startOtaTimeout(e,null!=i&&i>0?1e4:15e3));break}case"success":this._otaSuccess(e);break;case"error":{const i=t.error_key??"flasher.errors.update_failed_generic";this.otaStates[e]={state:"error",progress:null,errorKey:i},this._unsubOta(e);break}}this._host.requestUpdate()}_otaSuccess(e){this.otaStates[e]={state:"success",progress:null,errorKey:null},this._unsubOta(e),this._resetOtaTimeout(e),setTimeout(()=>{"success"===this.otaStates[e]?.state&&(delete this.otaStates[e],this._host.requestUpdate())},5e3)}_startOtaTimeout(e,t){this._resetOtaTimeout(e),this._otaTimeouts[e]=setTimeout(()=>{const t=this.otaStates[e];t&&"updating"===t.state&&(null!=t.progress&&t.progress>0?this.otaStates[e]={state:"error",progress:null,errorKey:"flasher.errors.connection_lost"}:this.otaStates[e]={state:"error",progress:null,errorKey:"flasher.errors.update_timeout"},this._unsubOta(e),this._host.requestUpdate())},t)}_resetOtaTimeout(e){const t=this._otaTimeouts[e];t&&(clearTimeout(t),delete this._otaTimeouts[e])}dismissOtaError(e){this._unsubOta(e),this._resetOtaTimeout(e),delete this.otaStates[e],this._host.requestUpdate()}_unsubOta(e){const t=this._otaUnsubs[e];t&&(t(),delete this._otaUnsubs[e])}get hass(){return this._hass}set hass(e){this._hass=e}async loadDevices(){if(!this._hass)return this.loading=!1,void this._host.requestUpdate();try{const e=await this._hass.callWS({type:"eppgrid/list_flashable_devices"});this.flashableDevices=e.devices,this.firmwareBaseUrl=e.firmware_base_url??"",this.firmwareVersion=e.latest_firmware_version??""}catch{this.flashableDevices=[]}this.loading=!1,this._host.requestUpdate()}async subscribeDeviceList(){if(this.unsubscribeDeviceList(),this._hass)try{this._unsubDeviceList=await this._hass.connection.subscribeMessage(e=>{this._applyDeviceList(e)},{type:"eppgrid/subscribe_flashable_devices"})}catch{await this.loadDevices()}}unsubscribeDeviceList(){if(this._unsubDeviceList){try{this._unsubDeviceList()}catch{}this._unsubDeviceList=void 0}}_applyDeviceList(e){this.flashableDevices=e.devices??[],this.firmwareBaseUrl=e.firmware_base_url??"",this.firmwareVersion=e.latest_firmware_version??"",this.integrationVersion=e.integration_version??"",this.loading=!1,this.onDeviceListChanged?.(),this._host.requestUpdate(),this._checkOtaDevicesOffline()}_checkOtaDevicesOffline(){for(const[e,t]of Object.entries(this.otaStates)){if("updating"!==t.state)continue;const i=this.flashableDevices.find(t=>t.mac===e);i&&!i.available&&(this.otaStates[e]={state:"error",progress:null,errorKey:"flasher.errors.device_offline"},this._unsubOta(e),this._resetOtaTimeout(e),this._host.requestUpdate())}}async deleteEsphomeDevice(e){this._hass&&await this._hass.callWS({type:"eppgrid/delete_esphome_device",config_entry_id:e})}async addEsphomeDevice(e){this._hass&&await this._hass.callWS({type:"eppgrid/add_esphome_device",host:e})}updateUsbState(e){this.usbFlashState=e,this._host.requestUpdate()}get opId(){return this._opId}get opRunning(){return this._opRunning}set opRunning(e){this._opRunning=e}resetUsbState(){this.usbFlashState=null,this.wifiNetworks=[],this._opId++;try{this._serialReader?.releaseLock()}catch{}try{this._serialWriter?.releaseLock()}catch{}this._serialReader=null,this._serialWriter=null,this._serialPort=null,this._host.requestUpdate()}set serialPort(e){this._serialPort=e}get serialPort(){return this._serialPort}}class Zi{constructor(e){this.host=e,e.addController(this)}hostConnected(){}hostDisconnected(){}onCellMouseDown(e){if("furniture"===this.host._sidebarTab)return void(this.host._selectedFurnitureId=null);if("interference"===this.host._overlayMode||"suppress"===this.host._overlayMode){const t="suppress"===this.host._overlayMode?2:1;this.host._isPainting=!0,this.host._frozenBounds=di(this.host._grid),this.host._paintAction=function(e,t){return ci(e)===t?"clear":"set"}(this.host._grid[e],t),this.applyPaintToCell(e);const i=()=>{this.onCellMouseUp(),window.removeEventListener("mouseup",i)};return void window.addEventListener("mouseup",i)}if("entry"===this.host._overlayMode){this.host._isPainting=!0,this.host._frozenBounds=di(this.host._grid),this.host._paintAction=(t=this.host._grid[e],li(t)?"clear":"set"),this.applyPaintToCell(e);const i=()=>{this.onCellMouseUp(),window.removeEventListener("mouseup",i)};return void window.addEventListener("mouseup",i)}var t;if("zones"!==this.host._sidebarTab||null===this.host._activeZone)return;this.host._isPainting=!0,this.host._frozenBounds=di(this.host._grid),this.host._paintAction=function(e,t){if(0===t)return ri(e)&&0===ai(e)?"clear":"set";return ai(e)===t?"clear":"set"}(this.host._grid[e],this.host._activeZone),this.applyPaintToCell(e);const i=()=>{this.onCellMouseUp(),window.removeEventListener("mouseup",i)};window.addEventListener("mouseup",i)}onCellMouseEnter(e){this.host._isPainting&&this.applyPaintToCell(e)}onCellMouseUp(){this.host._isPainting&&(this.host._justPainted=!0,requestAnimationFrame(()=>{this.host._justPainted=!1})),this.host._isPainting=!1,this.host._frozenBounds=null}applyPaintToCell(e){let t;if("interference"===this.host._overlayMode||"suppress"===this.host._overlayMode){const i="suppress"===this.host._overlayMode?2:1;t=function(e,t,i){return ri(e)?hi(e,"set"===i?t:0):null}(this.host._grid[e],i,this.host._paintAction)}else if("entry"===this.host._overlayMode)i=this.host._grid[e],s=this.host._paintAction,t=ri(i)?((e,t)=>t?-225&e|16:-17&e)(i,"set"===s):null;else{if(null===this.host._activeZone)return;t=function(e,t,i){return 0===t?"set"===i?1:0:ri(e)?"set"===i?ni(1|e,t):ni(e,0):null}(this.host._grid[e],this.host._activeZone,this.host._paintAction)}var i,s;null!==t&&(this.host._grid=new Uint8Array(this.host._grid),this.host._grid[e]=t,this.host._dirty=!0,this.host.requestUpdate())}initGridFromRoom(){this.host._grid=gi(this.host._roomWidth,this.host._roomDepth)}addZone(){const e=this.host._zoneConfigs.findIndex(e=>null===e);if(-1===e)return;const t=new Set(this.host._zoneConfigs.filter(e=>null!==e).map(e=>e.color)),i=Ki.find(e=>!t.has(e))??Ki[e%Ki.length],s=[...this.host._zoneConfigs];s[e]={name:`Zone ${e+1}`,color:i,type:"normal"},this.host._zoneConfigs=s,this.host._activeZone=e+1,this.host._dirty=!0}removeZone(e){if(e<1||e>7||null===this.host._zoneConfigs[e-1])return;const t=function(e,t){if(t<1||t>7)return null;const i=new Uint8Array(e);let s=!1;for(let e=0;e<ii;e++)ai(i[e])===t&&(i[e]=ni(i[e],0),s=!0);return s?i:new Uint8Array(e)}(this.host._grid,e);t&&(this.host._grid=t);const i=[...this.host._zoneConfigs];i[e-1]=null,this.host._zoneConfigs=i,this.host._activeZone===e&&(this.host._activeZone=null),this.host._dirty=!0,this.host.requestUpdate()}addFurniture(e){const t=`f_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,i=function(e,t,i,s){return{id:s,type:e.type,icon:e.icon,label:e.label,x:Math.max(0,(t-e.defaultWidth)/2),y:Math.max(0,(i-e.defaultHeight)/2),width:e.defaultWidth,height:e.defaultHeight,rotation:0,lockAspect:e.lockAspect??"icon"===e.type}}(e,this.host._roomWidth,this.host._roomDepth,t);this.host._furniture=[...this.host._furniture,i],this.host._selectedFurnitureId=i.id,this.host._dirty=!0}addCustomFurniture(e){this.addFurniture({type:"icon",icon:e,label:"furniture.custom",defaultWidth:600,defaultHeight:600,lockAspect:!1})}removeFurniture(e){this.host._furniture=function(e,t){return e.filter(e=>e.id!==t)}(this.host._furniture,e),this.host._selectedFurnitureId===e&&(this.host._selectedFurnitureId=null),this.host._dirty=!0}updateFurniture(e,t){this.host._furniture=function(e,t,i){return e.map(e=>e.id===t?{...e,...i}:e)}(this.host._furniture,e,t),this.host._dirty=!0}onFurniturePointerDown(e,t,i,s){e.preventDefault(),e.stopPropagation(),this.host._selectedFurnitureId=t;const o=this.host._furniture.find(e=>e.id===t);if(!o)return;let r=0,a=0,n=0;if("rotate"===i){const i=this.host.shadowRoot?.querySelector("epp-grid")?.shadowRoot?.querySelector("epp-furniture-overlay")?.shadowRoot?.querySelector(`.furniture-item[data-id="${t}"]`);if(i){const t=i.getBoundingClientRect();r=t.left+t.width/2,a=t.top+t.height/2,n=Math.atan2(e.clientY-a,e.clientX-r)*(180/Math.PI)}}this.host._dragState={type:i,id:t,startX:e.clientX,startY:e.clientY,origX:o.x,origY:o.y,origW:o.width,origH:o.height,origRot:o.rotation,handle:s,centerX:r,centerY:a,startAngle:n};const l=e=>this.onFurnitureDrag(e),c=()=>{this.host._dragState=null,window.removeEventListener("pointermove",l),window.removeEventListener("pointerup",c)};window.addEventListener("pointermove",l),window.addEventListener("pointerup",c)}onFurnitureDrag(e){if(!this.host._dragState)return;const t=this.host._dragState,i=this.host.shadowRoot?.querySelector("epp-grid")?.shadowRoot?.querySelector(".grid");if(!i)return;const s=i.firstElementChild?i.firstElementChild.offsetWidth:28,o=e.clientX-t.startX,r=e.clientY-t.startY;if("move"===t.type){const e=this.host._furniture.find(e=>e.id===t.id),i=di(this.host._grid),a=Math.ceil(this.host._roomWidth/si),n=Math.floor((ei-a)/2),l=(i.minCol-n)*si,c=(i.maxCol+1-n)*si,h=i.minRow*si,d=(i.maxRow+1)*si,A=function(e,t,i,s,o,r,a,n,l,c,h){const d=vi(i,o),A=vi(s,o);return{x:Math.max(n,Math.min(l-r,e+d)),y:Math.max(c,Math.min(h-a,t+A))}}(t.origX,t.origY,o,r,s,e?.width??0,e?.height??0,l,c,h,d);this.updateFurniture(t.id,A)}else if("resize"===t.type&&t.handle){const e=this.host._furniture.find(e=>e.id===t.id),i=function(e,t,i,s,o,r,a,n,l,c){const h=c*Math.PI/180,d=Math.cos(h),A=Math.sin(h),g=-t*A+i*d,u=vi(t*d+i*A,s),p=vi(g,s),_=e.includes("e")?1:e.includes("w")?-1:0,f=e.includes("s")?1:e.includes("n")?-1:0;let w=a,E=n;if(l){const e=Math.abs(u)>Math.abs(p)?u:p,t=a/n,i=_<0||f<0?-1:1;w=Math.max(100,a+i*e),E=Math.max(100,w/t),w=E*t}else 0!==_&&(w=Math.max(100,a+_*u)),0!==f&&(E=Math.max(100,n+f*p));const m=w-a,b=E-n,y=_*m/2,v=f*b/2;return{x:o-m/2+(y*d-v*A),y:r-b/2+(y*A+v*d),width:w,height:E}}(t.handle,o,r,s,t.origX,t.origY,t.origW,t.origH,e?.lockAspect??!1,t.origRot);this.updateFurniture(t.id,i)}else if("rotate"===t.type){const i=Math.atan2(e.clientY-(t.centerY??0),e.clientX-(t.centerX??0))*(180/Math.PI);this.updateFurniture(t.id,{rotation:Ci(t.origRot,t.startAngle??0,i)})}}getTemplates(){try{return JSON.parse(localStorage.getItem("epp_layout_templates")||"[]")}catch{return[]}}saveTemplate(){const e=this.host._templateName.trim();if(!e)return;const t=this.getTemplates(),i=t.findIndex(t=>t.name===e),s={name:e,grid:Array.from(this.host._grid),zones:this.host._zoneConfigs.map(e=>null!==e?{...e}:null),roomWidth:this.host._roomWidth,roomDepth:this.host._roomDepth,furniture:this.host._furniture.map(e=>({...e}))};i>=0?t[i]=s:t.push(s),localStorage.setItem("epp_layout_templates",JSON.stringify(t)),this.host._showTemplateSave=!1,this.host._templateName=""}loadTemplate(e){const t=this.getTemplates().find(t=>t.name===e);if(!t)return;this.host._grid=new Uint8Array(t.grid);const i=t.zones||[];this.host._zoneConfigs=Array.from({length:7},(e,t)=>i[t]??null),this.host._roomWidth=t.roomWidth,this.host._roomDepth=t.roomDepth,this.host._furniture=(t.furniture||[]).map(e=>({...e})),this.host._showTemplateLoad=!1}deleteTemplate(e){const t=this.getTemplates().filter(t=>t.name!==e);localStorage.setItem("epp_layout_templates",JSON.stringify(t)),this.host.requestUpdate()}async applyLayout(){const e=new Map;for(let t=0;t<this.host._grid.length;t++)if(ri(this.host._grid[t])){const i=ai(this.host._grid[t]);i>0&&e.set(i,(e.get(i)??0)+1)}for(let t=0;t<this.host._zoneConfigs.length;t++)null!==this.host._zoneConfigs[t]&&0===(e.get(t+1)??0)&&(this.host._zoneConfigs[t]=null);const t=di(this.host._grid);let i=this.host._furniture;if(t.minCol<=t.maxCol&&t.minRow<=t.maxRow){const e=Math.ceil(this.host._roomWidth/si),s=Math.floor((ei-e)/2),o=(t.minCol-s)*si,r=(t.maxCol+1-s)*si,a=t.minRow*si,n=(t.maxRow+1)*si;i=i.filter(e=>{return i=o,s=r,l=a,c=n,!((t=e).x+t.width<=i||t.x>=s||t.y+t.height<=l||t.y>=c);var t,i,s,l,c})}this.host._saving=!0;try{if(await this.host.hass.callWS({type:"eppgrid/set_room_layout",mac:this.host._selectedMac,grid_bytes:Array.from(this.host._grid),room_type:this.host._roomType,room_trigger:this.host._roomTrigger,room_renew:this.host._roomRenew,room_timeout:this.host._roomTimeout,room_handoff_timeout:this.host._roomHandoffTimeout,zone_slots:this.host._zoneConfigs.map(e=>null!==e?{name:e.name,color:e.color,type:e.type,trigger:e.trigger,renew:e.renew,timeout:e.timeout,handoff_timeout:e.handoff_timeout}:null),furniture:i.map(e=>({type:e.type,icon:e.icon,label:e.label,x:e.x,y:e.y,width:e.width,height:e.height,rotation:e.rotation,lockAspect:e.lockAspect}))}),this.host._furniture=i,this.host._targetAutoDistance||this.host._staticAutoDistance){const e=Qi(this.host._roomWidth,this.host._roomDepth,this.host._perspective,this.host._grid),t=this.host._targetAutoDistance?e>0?Math.min(e,6):6:this.host._targetMaxDistance,i=this.host._staticAutoDistance?.3:this.host._staticMinDistance,s=this.host._staticAutoDistance?e>0?Math.min(e,16):16:this.host._staticMaxDistance;await this.host.hass.callWS({type:"eppgrid/set_settings",mac:this.host._selectedMac,temperature_offset:this.host._temperatureOffset,humidity_offset:this.host._humidityOffset,illuminance_offset:this.host._illuminanceOffset,motion_timeout:this.host._motionTimeout,target_auto_distance:this.host._targetAutoDistance,target_max_distance:t,static_auto_distance:this.host._staticAutoDistance,static_min_distance:i,static_max_distance:s,static_trigger_threshold:this.host._staticTriggerThreshold,static_renew_threshold:this.host._staticRenewThreshold,static_timeout:this.host._staticTimeout,static_on_delay:this.host._staticOnDelay,led_mode:this.host._ledMode,led_brightness:this.host._ledBrightness,led_presence_color:this.host._ledPresenceColor,relay_trigger_mode:this.host._relayTriggerMode,relay_contact_mode:this.host._relayContactMode,entities:this.host._entitiesConfig||{}})}this.host._dirty=!1,this.host._selectedFurnitureId=null,this.host._overlayMode=null,this.host._view="live"}finally{this.host._saving=!1}}async saveSettings(e){this.host._saving=!0;try{await this.host.hass.callWS({type:"eppgrid/set_settings",mac:this.host._selectedMac,...e}),e.entities&&(this.host._entitiesConfig=e.entities),this.host._temperatureOffset=e.temperature_offset??this.host._temperatureOffset,this.host._humidityOffset=e.humidity_offset??this.host._humidityOffset,this.host._illuminanceOffset=e.illuminance_offset??this.host._illuminanceOffset,this.host._motionTimeout=e.motion_timeout??this.host._motionTimeout,this.host._staticTimeout=e.static_timeout??this.host._staticTimeout,this.host._staticTriggerThreshold=e.static_trigger_threshold??this.host._staticTriggerThreshold,this.host._staticRenewThreshold=e.static_renew_threshold??this.host._staticRenewThreshold,this.host._staticOnDelay=e.static_on_delay??this.host._staticOnDelay,this.host._logLevels=e.log_levels??this.host._logLevels,this.host._targetAutoDistance=e.target_auto_distance??this.host._targetAutoDistance,this.host._targetMaxDistance=e.target_max_distance??this.host._targetMaxDistance,this.host._staticAutoDistance=e.static_auto_distance??this.host._staticAutoDistance,this.host._staticMinDistance=e.static_min_distance??this.host._staticMinDistance,this.host._staticMaxDistance=e.static_max_distance??this.host._staticMaxDistance,this.host._ledMode=e.led_mode??this.host._ledMode,this.host._ledBrightness=e.led_brightness??this.host._ledBrightness,this.host._ledPresenceColor=e.led_presence_color??this.host._ledPresenceColor,this.host._relayTriggerMode=e.relay_trigger_mode??this.host._relayTriggerMode,this.host._relayContactMode=e.relay_contact_mode??this.host._relayContactMode,this.host._targetUpdateRateMs=e.target_update_rate_ms??this.host._targetUpdateRateMs,this.host._zoneUpdateRateMs=e.zone_update_rate_ms??this.host._zoneUpdateRateMs,this.host._dirty=!1,this.host._view="live"}catch(e){console.error("Failed to save settings:",e)}finally{this.host._saving=!1}}}function Xi(){return{localZoneState:new Map,targetPrev:[null,null,null],targetGateCount:[0,0,0],targetPrevXY:[null,null,null],staticState:"inactive",motionState:"inactive",staticPendingSince:null,motionPendingSince:null,sensorsEverActive:!1}}class qi{constructor(e){this._zoneEngineState=Xi(),this.host=e,e.addController(this)}hostConnected(){}hostDisconnected(){}get zoneEngineState(){return this._zoneEngineState}set zoneEngineState(e){this._zoneEngineState=e}resetZoneEngineState(){this._zoneEngineState=Xi()}handleTargetData(e){"settings"!==this.host._view&&(this.host._targets=e.targets,this.host._sensorState=e.sensors,e.zones&&(this.host._zoneState={occupancy:e.zones.occupancy,target_counts:e.zones.target_counts,frame_count:e.zones.frame_count},this.host._showBackendDebugLog&&e.zones.debug_log&&this.appendBackendDebugLog(e.zones.debug_log)))}handleRawTargetData(e){"settings"!==this.host._view&&(this.host._rawTargets=e)}runLocalZoneEngine(){const e=this.host._sensorState,t=function(e,t){const i=t.now??Date.now()/1e3,s=new Map,o=new Map,r=[null,null,null],a=[null,null,null],n=[!1,!1,!1],l=[!1,!1,!1],c=[null,null,null];for(let i=0;i<3&&i<t.targets.length;i++){const s=e.targetPrev[i];if(null!==s){const e=s.row*ei+s.col;if(e>=0&&e<ii&&ri(t.grid[e])){const o=ai(t.grid[e]);c[i]=o;for(let e=-1;e<=1&&!l[i];e++)for(let r=-1;r<=1&&!l[i];r++){const a=s.row+e,n=s.col+r;if(a>=0&&a<ti&&n>=0&&n<ei){const e=a*ei+n;li(t.grid[e])&&ai(t.grid[e])===o&&(l[i]=!0)}}}}}for(let i=0;i<3&&i<t.targets.length;i++){const l=t.targets[i];if(null==l.x||null==l.y){e.targetPrev[i]=null,e.targetGateCount[i]=0;continue}const c=l.signal;if(c<=0)continue;o.set(i,c);const h=Si(l.x,l.y,t.roomWidth,t.roomDepth);if(!h){n[i]=!0,e.targetPrev[i]=null,e.targetGateCount[i]=0;continue}const d=Math.floor(h.col),A=Math.floor(h.row);if(d<0||d>=ei||A<0||A>=ti){n[i]=!0,e.targetPrev[i]=null,e.targetGateCount[i]=0;continue}const g=A*ei+d,u=t.grid[g];if(!ri(u)){n[i]=!0,e.targetPrev[i]=null,e.targetGateCount[i]=0;continue}const p=ci(u);if(2===p){e.targetPrev[i]=null,e.targetGateCount[i]=0;continue}const _=ai(u);a[i]=_;const f=e.targetPrev[i];if(null!==f){const e=f.row*ei+f.col;e>=0&&e<ii&&ri(t.grid[e])&&(r[i]=ai(t.grid[e]))}e.targetPrevXY[i]={x:l.x,y:l.y};let w=!1;null!==f&&(w=Math.max(Math.abs(d-f.col),Math.abs(A-f.row))<=5);const E=Ji(_,t.zoneConfigs,t.roomType,t.roomTrigger,t.roomRenew,t.roomTimeout,t.roomHandoffTimeout),{trigger:m,renew:b}=E,y=e.localZoneState.get(_),v=!y?.occupied;if(p>0&&!w&&v){e.targetPrev[i]=null,e.targetGateCount[i]=0;continue}let C=v?m:p>0?9:b,B=li(u);if(!B)for(let e=-1;e<=1&&!B;e++)for(let i=-1;i<=1&&!B;i++){const s=A+e,o=d+i;if(s>=0&&s<ti&&o>=0&&o<ei){const e=s*ei+o;li(t.grid[e])&&ai(t.grid[e])===_&&(B=!0)}}B&&v&&0===p&&(C=1),B||w||!v?c>=C?(s.set(_,!0),y&&y.confirmedTargets.add(i),e.targetPrev[i]={col:d,row:A},e.targetGateCount[i]=0):e.targetPrev[i]={col:d,row:A}:c>=Math.min(C+2,8)?(e.targetGateCount[i]++,e.targetGateCount[i]>=2?(s.set(_,!0),y&&y.confirmedTargets.add(i),e.targetPrev[i]={col:d,row:A},e.targetGateCount[i]=0):e.targetPrev[i]={col:d,row:A}):(e.targetPrev[i]=null,e.targetGateCount[i]=0)}for(let s=0;s<3;s++){const o=r[s],n=a[s];if(null===o||null===n||o===n)continue;const l=e.localZoneState.get(o);if(l&&(l.confirmedTargets.delete(s),0===l.confirmedTargets.size&&l.occupied&&null===l.pendingSince)){const e=Ji(o,t.zoneConfigs,t.roomType,t.roomTrigger,t.roomRenew,t.roomTimeout,t.roomHandoffTimeout),{timeout:s,handoffTimeout:r}=e;l.pendingSince=i-(s-r)}}for(let s=0;s<3&&s<t.targets.length;s++){const o=t.targets[s];if((null==o.x||null==o.y||n[s])&&l[s]&&null!==c[s]){const o=c[s],r=e.localZoneState.get(o);if(r?.occupied){let e=0;for(const t of r.confirmedTargets)t!==s&&e++;if(0===e){const e=Ji(o,t.zoneConfigs,t.roomType,t.roomTrigger,t.roomRenew,t.roomTimeout,t.roomHandoffTimeout),s=i-(e.timeout-e.handoffTimeout);(null===r.pendingSince||r.pendingSince>s)&&(r.pendingSince=s)}}}}const h={},d=new Set;for(let e=0;e<t.grid.length;e++)ri(t.grid[e])&&d.add(ai(t.grid[e]));for(const o of d){let r=e.localZoneState.get(o);r||(r={occupied:!1,pendingSince:null,confirmedTargets:new Set},e.localZoneState.set(o,r));const a=Ji(o,t.zoneConfigs,t.roomType,t.roomTrigger,t.roomRenew,t.roomTimeout,t.roomHandoffTimeout),{timeout:n}=a,l=s.get(o)??!1;r.occupied?null===r.pendingSince?l||(r.pendingSince=i):l?r.pendingSince=null:i-r.pendingSince>=n&&(r.occupied=!1,r.pendingSince=null,r.confirmedTargets.clear()):l&&(r.occupied=!0,r.pendingSince=null),h[o]=r.occupied}for(const t of e.localZoneState.keys())d.has(t)||e.localZoneState.delete(t);const A=new Set;for(let e=0;e<3&&e<t.targets.length;e++)null!=t.targets[e].x&&null!=t.targets[e].y&&A.add(e);for(let i=0;i<3&&i<t.targets.length;i++)if(!A.has(i))for(const t of e.localZoneState.values())null===t.pendingSince&&t.confirmedTargets.delete(i);const g=t.staticPresence??!1,u=t.motionPresence??!1,p=t.staticTimeout??10,_=t.motionTimeout??10;if(g?(e.staticState="active",e.staticPendingSince=null,e.sensorsEverActive=!0):"active"===e.staticState?(e.staticState="pending",e.staticPendingSince=i):"pending"===e.staticState&&null!==e.staticPendingSince&&i-e.staticPendingSince>=p&&(e.staticState="inactive",e.staticPendingSince=null),u?(e.motionState="active",e.motionPendingSince=null,e.sensorsEverActive=!0):"active"===e.motionState?(e.motionState="pending",e.motionPendingSince=i):"pending"===e.motionState&&null!==e.motionPendingSince&&i-e.motionPendingSince>=_&&(e.motionState="inactive",e.motionPendingSince=null),e.sensorsEverActive&&"inactive"===e.staticState&&"inactive"===e.motionState){let t=!1;for(const[,i]of e.localZoneState)if(i.occupied&&null===i.pendingSince){t=!0;break}if(!t)for(const[t,i]of e.localZoneState)i.occupied&&null!==i.pendingSince&&(i.occupied=!1,i.pendingSince=null,i.confirmedTargets.clear(),h[t]=!1)}const f="inactive"!==e.staticState||"inactive"!==e.motionState||Object.values(h).some(e=>e),w=[];for(let i=0;i<3&&i<t.targets.length;i++){const t=o.get(i)??0,s=null!==a[i];if(A.has(i)&&t>0&&s)w.push({status:"active"});else{let t=!1;if(!A.has(i)||!s)for(const[,s]of e.localZoneState)if(s.occupied&&null!==s.pendingSince&&s.confirmedTargets.has(i)){t=!0;break}w.push({status:t?"pending":"inactive"})}}return{occupancy:h,targets:w,staticState:e.staticState,motionState:e.motionState,sensorOccupancy:f}}(this._zoneEngineState,{targets:this.host._targets,grid:this.host._grid,roomWidth:this.host._roomWidth,roomDepth:this.host._roomDepth,zoneConfigs:this.host._zoneConfigs,roomType:this.host._roomType,roomTrigger:this.host._roomTrigger,roomRenew:this.host._roomRenew,roomTimeout:this.host._roomTimeout,roomHandoffTimeout:this.host._roomHandoffTimeout,staticPresence:e?.static_presence??!1,motionPresence:e?.motion_presence??!1,staticTimeout:10,motionTimeout:10});return this.host._showDebugLog&&this._buildFrontendDebugLog(t),t}enrichDebugLog(e){const t=this.host._localize,i=e=>{if(0===e)return t("live.debug.room");const i=this.host._zoneConfigs[e-1];return i?i.name:t("live.debug.zone_n",{n:e})},s={A:t("live.debug.active"),P:t("live.debug.pending"),I:t("live.debug.inactive"),O:t("live.debug.occupied")},o=t("live.debug.static"),r=t("live.debug.motion"),a=t("live.debug.occ"),n=t("live.debug.on"),l=t("live.debug.off"),c=e.split("|");let h,d,A;c.length>=3?(h=c[0],d=c[1],A=c[2]):(h="",d=c[0]||"",A=c[1]||"");let g="";if(h.trim()){const e=h.trim().split(/\s+/),t=[];for(const i of e){const[e,c]=i.split(":");"S"===e?t.push(`${o}: ${s[c]??c}`):"M"===e?t.push(`${r}: ${s[c]??c}`):"Occ"===e&&t.push(`${a}: ${"1"===c?n:l}`)}g=t.join(", ")}const u=(d||"").trim().split(/\s+/).filter(Boolean).map(e=>{const[t,o,r,a]=e.split(":"),n=parseInt(o?.replace("Z","")??"0",10);return`${t}→${i(n)}(${s[r]??r},${a})`}),p=(A||"").trim().split(/\s+/).filter(Boolean).map(e=>{const[t,o,r]=e.split(":"),a=parseInt(t?.replace("Z","")??"0",10);return`${i(a)}: ${s[o]??o}(${r})`}),_=u.length?u.join(" "):t("live.debug.no_targets"),f=p.length?p.join(", "):t("live.debug.all_clear");return g?`${g} | ${_} | ${f}`:`${_} | ${f}`}computeHeatmapColors(){return function(e,t){const i=new Map;for(const[s,o]of Object.entries(e)){const e=Number(s);if(o<=0)continue;const r=Math.min(o,9)/9*.6;let a=100,n=180,l=255;if(e>0&&e<=7){const i=t[e-1];if(i){const e=ki(i.color);a=e.r,n=e.g,l=e.b}}i.set(e,`rgba(${a}, ${n}, ${l}, ${r})`)}return i}(this.host._zoneState.target_counts,this.host._zoneConfigs)}appendBackendDebugLog(e){let t=e;if(e.split("|").length<3){const i=this.host._sensorState;t=`S:${i?.static_presence?"A":"I"} M:${i?.motion_presence?"A":"I"} Occ:${i?.occupancy?"1":"0"}|${e}`}const i=this.enrichDebugLog(t);if(i===this.host._backendDebugLogPrev)return;this.host._backendDebugLogPrev=i;const s=`${(new Date).toLocaleTimeString(this.host._localize?.lang??"en-GB",{hour12:!1,hour:"2-digit",minute:"2-digit",second:"2-digit",fractionalSecondDigits:1})} ${i}`;this.host._backendDebugLogLines.push(s),this.host._backendDebugLogLines.length>Ei&&(this.host._backendDebugLogLines=this.host._backendDebugLogLines.slice(-100)),this._appendToLogContainer("backend-debug-log-scroll",s)}_appendFrontendDebugLog(e){if(e===this.host._debugLogPrev)return;this.host._debugLogPrev=e;const t=`${(new Date).toLocaleTimeString(this.host._localize?.lang??"en-GB",{hour12:!1,hour:"2-digit",minute:"2-digit",second:"2-digit",fractionalSecondDigits:1})} ${e}`;this.host._debugLogLines.push(t),this.host._debugLogLines.length>Ei&&(this.host._debugLogLines=this.host._debugLogLines.slice(-100)),this._appendToLogContainer("debug-log-scroll",t)}_appendToLogContainer(e,t){const i=this.host.shadowRoot?.getElementById(e);if(!i)return;1!==i.children.length||i.children[0].classList.contains("debug-log-line")||(i.innerHTML="");const s=document.createElement("div");for(s.className="debug-log-line",s.textContent=t,i.appendChild(s);i.children.length>Ei;)i.firstChild?.remove();i.scrollTop=i.scrollHeight}_buildFrontendDebugLog(e){const t=[null,null,null];for(let e=0;e<3&&e<this.host._targets.length;e++){const i=this.host._targets[e];if(null==i.x||null==i.y||i.signal<=0)continue;const s=Si(i.x,i.y,this.host._roomWidth,this.host._roomDepth);if(!s)continue;const o=Math.floor(s.col),r=Math.floor(s.row);if(o<0||o>=ei||r<0||r>=ti)continue;const a=r*ei+o;ri(this.host._grid[a])&&(t[e]=ai(this.host._grid[a]))}const i=new Map;for(let e=0;e<3&&e<this.host._targets.length;e++){const s=this.host._targets[e];if(null==s.x||null==s.y||s.signal<=0)continue;const o=t[e];null!==o&&i.set(o,Math.max(i.get(o)??0,s.signal))}const s=[];for(let i=0;i<3&&i<this.host._targets.length;i++){const o=this.host._targets[i];if(null==o.x||null==o.y)continue;const r=o.signal;if(r<=0)continue;const a=t[i],n="pending"===e.targets[i]?.status?"P":"A";s.push(`T${i}:Z${a??0}:${n}:${r}`)}const o=new Set;for(let e=0;e<this.host._grid.length;e++)ri(this.host._grid[e])&&o.add(ai(this.host._grid[e]));const r=[];for(const e of o){const t=this._zoneEngineState.localZoneState.get(e);if(t?.occupied){const s=null!==t.pendingSince?"P":"O";r.push(`Z${e}:${s}:${i.get(e)??0}`)}}const a=`${`S:${"active"===e.staticState?"A":"pending"===e.staticState?"P":"I"} M:${"active"===e.motionState?"A":"pending"===e.motionState?"P":"I"} Occ:${e.sensorOccupancy?"1":"0"}`}|${s.join(" ")}|${r.join(" ")}`,n=this.enrichDebugLog(a);this._appendFrontendDebugLog(n)}}function es(e,t,i){const s=e||{};return{temperatureOffset:s.temperature_offset??0,humidityOffset:s.humidity_offset??0,illuminanceOffset:s.illuminance_offset??0,motionTimeout:s.motion_timeout??5,targetAutoDistance:s.target_auto_distance??!0,targetMaxDistance:s.target_max_distance??6,staticAutoDistance:s.static_auto_distance??!0,staticMinDistance:s.static_min_distance??.3,staticMaxDistance:s.static_max_distance??16,staticTriggerThreshold:s.static_trigger_threshold??3,staticRenewThreshold:s.static_renew_threshold??3,staticTimeout:s.static_timeout??30,staticOnDelay:s.static_on_delay??0,entities:t||{},logLevels:i??{},ledMode:s.led_mode??"Manual Control",ledBrightness:s.led_brightness??1,ledPresenceColor:s.led_presence_color??"#CC33FF",relayTriggerMode:s.relay_trigger_mode??"disabled",relayContactMode:s.relay_contact_mode??"no",targetUpdateRateMs:s.target_update_rate_ms??1e3,zoneUpdateRateMs:s.zone_update_rate_ms??1e3}}function ts(e){const t=function(e){const t=e?.calibration;return t?.perspective&&t.room_width>0?{perspective:t.perspective,roomWidth:t.room_width||0,roomDepth:t.room_depth||0}:{perspective:null,roomWidth:0,roomDepth:0}}(e),i=e?.room_layout||{},s=(i.furniture||[]).map((e,t)=>({id:e.id||`f_load_${t}`,type:e.type||"icon",icon:e.icon||"mdi:help",label:e.label||"Item",x:e.x??0,y:e.y??0,width:e.width??600,height:e.height??600,rotation:e.rotation??0,lockAspect:e.lockAspect??"svg"!==e.type}));const o=function(e,t,i){return e?.grid_bytes&&Array.isArray(e.grid_bytes)?new Uint8Array(e.grid_bytes):t>0&&i>0?gi(t,i):new Uint8Array(ii)}(i,t.roomWidth,t.roomDepth),r=function(e){const t=e?.zone_slots||e?.zones||[];return Array.from({length:7},(e,i)=>{const s=t[i];return s?{name:s.name||`Zone ${i+1}`,color:s.color||Ki[i%Ki.length],type:s.type??"normal",trigger:s.trigger,renew:s.renew,timeout:s.timeout,handoff_timeout:s.handoff_timeout}:null})}(i),a=function(e){const t=e?.room_type??"normal",i=$i[t]??$i.normal;return{roomType:t,roomTrigger:e?.room_trigger??i?.trigger??5,roomRenew:e?.room_renew??i?.renew??3,roomTimeout:e?.room_timeout??i?.timeout??10,roomHandoffTimeout:e?.room_handoff_timeout??i?.handoff_timeout??3}}(i);return{calibration:t,furniture:s,grid:o,zoneConfigs:r,roomThresholds:a,settings:es(e?.settings,e?.entities,e?.log_levels)}}const is=[73,77,80,82,79,86];function ss(e,t){const i=is.length+1+1+1+t.length+1+1,s=new Uint8Array(i);let o=0;for(const e of is)s[o++]=e;s[o++]=1,s[o++]=e,s[o++]=t.length;for(const e of t)s[o++]=e;let r=0;for(let e=0;e<o;e++)r=r+s[e]&255;return s[o++]=r,s[o]=10,s}function os(){return ss(3,[4,0])}function rs(){return ss(3,[2,0])}function as(e){const t=[],i=is.length;let s=0,o=0;for(;s<=e.length-i;){let r=!0;for(let t=0;t<i;t++)if(e[s+t]!==is[t]){r=!1;break}if(!r){s++;continue}const a=s+i;if(a+3>=e.length)break;const n=e[a+1],l=e[a+2],c=a+3+l+1;if(c>e.length)break;let h=0;for(let t=s;t<c-1;t++)h=h+e[t]&255;if(h!==e[c-1]){s++;continue}const d=e.slice(a+3,a+3+l);t.push({type:n,data:d}),s=c,s<e.length&&10===e[s]&&s++,o=s}return{packets:t,consumed:o}}async function ns(e,t){await e.write(t)}async function ls(e,t,i){const s=i?[...i]:[],o=Date.now()+t;for(;Date.now()<o;){const t=o-Date.now();if(t<=0)break;const i=await Promise.race([e.read(),new Promise(e=>setTimeout(()=>e({value:void 0,done:!0}),t))]);if(i.value){s.push(...i.value);const{packets:e,consumed:t}=as(new Uint8Array(s));if(e.length>0)return s.splice(0,t),{packets:e,buffer:s}}if(i.done)break}throw Object.assign(new Error("timeout"),{errorKey:"flasher.errors.timeout"})}function cs(e){if(0===e.length)return null;const t=new TextDecoder;let i=0;const s=()=>{if(i>=e.length)return null;const s=e[i++];if(i+s>e.length)return null;const o=t.decode(e.slice(i,i+s));return i+=s,o},o=s();if(null===o)return null;const r=s();if(null===r)return null;const a=s();if(null===a)return null;const n=Number.parseInt(r,10);return Number.isNaN(n)?null:{ssid:o,rssi:n,authRequired:"YES"===a}}class hs extends Error{}
/*! pako 2.1.0 https://github.com/nodeca/pako @license (MIT AND Zlib) */function ds(e){let t=e.length;for(;--t>=0;)e[t]=0}const As=256,gs=286,us=30,ps=15,_s=new Uint8Array([0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0]),fs=new Uint8Array([0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13]),ws=new Uint8Array([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7]),Es=new Uint8Array([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]),ms=new Array(576);ds(ms);const bs=new Array(60);ds(bs);const ys=new Array(512);ds(ys);const vs=new Array(256);ds(vs);const Cs=new Array(29);ds(Cs);const Bs=new Array(us);function xs(e,t,i,s,o){this.static_tree=e,this.extra_bits=t,this.extra_base=i,this.elems=s,this.max_length=o,this.has_stree=e&&e.length}let Ss,Is,Ds;function Ms(e,t){this.dyn_tree=e,this.max_code=0,this.stat_desc=t}ds(Bs);const ks=e=>e<256?ys[e]:ys[256+(e>>>7)],Rs=(e,t)=>{e.pending_buf[e.pending++]=255&t,e.pending_buf[e.pending++]=t>>>8&255},Ts=(e,t,i)=>{e.bi_valid>16-i?(e.bi_buf|=t<<e.bi_valid&65535,Rs(e,e.bi_buf),e.bi_buf=t>>16-e.bi_valid,e.bi_valid+=i-16):(e.bi_buf|=t<<e.bi_valid&65535,e.bi_valid+=i)},Fs=(e,t,i)=>{Ts(e,i[2*t],i[2*t+1])},Ps=(e,t)=>{let i=0;do{i|=1&e,e>>>=1,i<<=1}while(--t>0);return i>>>1},Us=(e,t,i)=>{const s=new Array(16);let o,r,a=0;for(o=1;o<=ps;o++)a=a+i[o-1]<<1,s[o]=a;for(r=0;r<=t;r++){let t=e[2*r+1];0!==t&&(e[2*r]=Ps(s[t]++,t))}},Qs=e=>{let t;for(t=0;t<gs;t++)e.dyn_ltree[2*t]=0;for(t=0;t<us;t++)e.dyn_dtree[2*t]=0;for(t=0;t<19;t++)e.bl_tree[2*t]=0;e.dyn_ltree[512]=1,e.opt_len=e.static_len=0,e.sym_next=e.matches=0},zs=e=>{e.bi_valid>8?Rs(e,e.bi_buf):e.bi_valid>0&&(e.pending_buf[e.pending++]=e.bi_buf),e.bi_buf=0,e.bi_valid=0},Os=(e,t,i,s)=>{const o=2*t,r=2*i;return e[o]<e[r]||e[o]===e[r]&&s[t]<=s[i]},Hs=(e,t,i)=>{const s=e.heap[i];let o=i<<1;for(;o<=e.heap_len&&(o<e.heap_len&&Os(t,e.heap[o+1],e.heap[o],e.depth)&&o++,!Os(t,s,e.heap[o],e.depth));)e.heap[i]=e.heap[o],i=o,o<<=1;e.heap[i]=s},Gs=(e,t,i)=>{let s,o,r,a,n=0;if(0!==e.sym_next)do{s=255&e.pending_buf[e.sym_buf+n++],s+=(255&e.pending_buf[e.sym_buf+n++])<<8,o=e.pending_buf[e.sym_buf+n++],0===s?Fs(e,o,t):(r=vs[o],Fs(e,r+As+1,t),a=_s[r],0!==a&&(o-=Cs[r],Ts(e,o,a)),s--,r=ks(s),Fs(e,r,i),a=fs[r],0!==a&&(s-=Bs[r],Ts(e,s,a)))}while(n<e.sym_next);Fs(e,256,t)},Ls=(e,t)=>{const i=t.dyn_tree,s=t.stat_desc.static_tree,o=t.stat_desc.has_stree,r=t.stat_desc.elems;let a,n,l,c=-1;for(e.heap_len=0,e.heap_max=573,a=0;a<r;a++)0!==i[2*a]?(e.heap[++e.heap_len]=c=a,e.depth[a]=0):i[2*a+1]=0;for(;e.heap_len<2;)l=e.heap[++e.heap_len]=c<2?++c:0,i[2*l]=1,e.depth[l]=0,e.opt_len--,o&&(e.static_len-=s[2*l+1]);for(t.max_code=c,a=e.heap_len>>1;a>=1;a--)Hs(e,i,a);l=r;do{a=e.heap[1],e.heap[1]=e.heap[e.heap_len--],Hs(e,i,1),n=e.heap[1],e.heap[--e.heap_max]=a,e.heap[--e.heap_max]=n,i[2*l]=i[2*a]+i[2*n],e.depth[l]=(e.depth[a]>=e.depth[n]?e.depth[a]:e.depth[n])+1,i[2*a+1]=i[2*n+1]=l,e.heap[1]=l++,Hs(e,i,1)}while(e.heap_len>=2);e.heap[--e.heap_max]=e.heap[1],((e,t)=>{const i=t.dyn_tree,s=t.max_code,o=t.stat_desc.static_tree,r=t.stat_desc.has_stree,a=t.stat_desc.extra_bits,n=t.stat_desc.extra_base,l=t.stat_desc.max_length;let c,h,d,A,g,u,p=0;for(A=0;A<=ps;A++)e.bl_count[A]=0;for(i[2*e.heap[e.heap_max]+1]=0,c=e.heap_max+1;c<573;c++)h=e.heap[c],A=i[2*i[2*h+1]+1]+1,A>l&&(A=l,p++),i[2*h+1]=A,h>s||(e.bl_count[A]++,g=0,h>=n&&(g=a[h-n]),u=i[2*h],e.opt_len+=u*(A+g),r&&(e.static_len+=u*(o[2*h+1]+g)));if(0!==p){do{for(A=l-1;0===e.bl_count[A];)A--;e.bl_count[A]--,e.bl_count[A+1]+=2,e.bl_count[l]--,p-=2}while(p>0);for(A=l;0!==A;A--)for(h=e.bl_count[A];0!==h;)d=e.heap[--c],d>s||(i[2*d+1]!==A&&(e.opt_len+=(A-i[2*d+1])*i[2*d],i[2*d+1]=A),h--)}})(e,t),Us(i,c,e.bl_count)},Ns=(e,t,i)=>{let s,o,r=-1,a=t[1],n=0,l=7,c=4;for(0===a&&(l=138,c=3),t[2*(i+1)+1]=65535,s=0;s<=i;s++)o=a,a=t[2*(s+1)+1],++n<l&&o===a||(n<c?e.bl_tree[2*o]+=n:0!==o?(o!==r&&e.bl_tree[2*o]++,e.bl_tree[32]++):n<=10?e.bl_tree[34]++:e.bl_tree[36]++,n=0,r=o,0===a?(l=138,c=3):o===a?(l=6,c=3):(l=7,c=4))},Ys=(e,t,i)=>{let s,o,r=-1,a=t[1],n=0,l=7,c=4;for(0===a&&(l=138,c=3),s=0;s<=i;s++)if(o=a,a=t[2*(s+1)+1],!(++n<l&&o===a)){if(n<c)do{Fs(e,o,e.bl_tree)}while(0!==--n);else 0!==o?(o!==r&&(Fs(e,o,e.bl_tree),n--),Fs(e,16,e.bl_tree),Ts(e,n-3,2)):n<=10?(Fs(e,17,e.bl_tree),Ts(e,n-3,3)):(Fs(e,18,e.bl_tree),Ts(e,n-11,7));n=0,r=o,0===a?(l=138,c=3):o===a?(l=6,c=3):(l=7,c=4)}};let $s=!1;const Ks=(e,t,i,s)=>{Ts(e,0+(s?1:0),3),zs(e),Rs(e,i),Rs(e,~i),i&&e.pending_buf.set(e.window.subarray(t,t+i),e.pending),e.pending+=i};var Js=e=>{$s||((()=>{let e,t,i,s,o;const r=new Array(16);for(i=0,s=0;s<28;s++)for(Cs[s]=i,e=0;e<1<<_s[s];e++)vs[i++]=s;for(vs[i-1]=s,o=0,s=0;s<16;s++)for(Bs[s]=o,e=0;e<1<<fs[s];e++)ys[o++]=s;for(o>>=7;s<us;s++)for(Bs[s]=o<<7,e=0;e<1<<fs[s]-7;e++)ys[256+o++]=s;for(t=0;t<=ps;t++)r[t]=0;for(e=0;e<=143;)ms[2*e+1]=8,e++,r[8]++;for(;e<=255;)ms[2*e+1]=9,e++,r[9]++;for(;e<=279;)ms[2*e+1]=7,e++,r[7]++;for(;e<=287;)ms[2*e+1]=8,e++,r[8]++;for(Us(ms,287,r),e=0;e<us;e++)bs[2*e+1]=5,bs[2*e]=Ps(e,5);Ss=new xs(ms,_s,257,gs,ps),Is=new xs(bs,fs,0,us,ps),Ds=new xs(new Array(0),ws,0,19,7)})(),$s=!0),e.l_desc=new Ms(e.dyn_ltree,Ss),e.d_desc=new Ms(e.dyn_dtree,Is),e.bl_desc=new Ms(e.bl_tree,Ds),e.bi_buf=0,e.bi_valid=0,Qs(e)},Ws=(e,t,i,s)=>{let o,r,a=0;e.level>0?(2===e.strm.data_type&&(e.strm.data_type=(e=>{let t,i=4093624447;for(t=0;t<=31;t++,i>>>=1)if(1&i&&0!==e.dyn_ltree[2*t])return 0;if(0!==e.dyn_ltree[18]||0!==e.dyn_ltree[20]||0!==e.dyn_ltree[26])return 1;for(t=32;t<As;t++)if(0!==e.dyn_ltree[2*t])return 1;return 0})(e)),Ls(e,e.l_desc),Ls(e,e.d_desc),a=(e=>{let t;for(Ns(e,e.dyn_ltree,e.l_desc.max_code),Ns(e,e.dyn_dtree,e.d_desc.max_code),Ls(e,e.bl_desc),t=18;t>=3&&0===e.bl_tree[2*Es[t]+1];t--);return e.opt_len+=3*(t+1)+5+5+4,t})(e),o=e.opt_len+3+7>>>3,r=e.static_len+3+7>>>3,r<=o&&(o=r)):o=r=i+5,i+4<=o&&-1!==t?Ks(e,t,i,s):4===e.strategy||r===o?(Ts(e,2+(s?1:0),3),Gs(e,ms,bs)):(Ts(e,4+(s?1:0),3),((e,t,i,s)=>{let o;for(Ts(e,t-257,5),Ts(e,i-1,5),Ts(e,s-4,4),o=0;o<s;o++)Ts(e,e.bl_tree[2*Es[o]+1],3);Ys(e,e.dyn_ltree,t-1),Ys(e,e.dyn_dtree,i-1)})(e,e.l_desc.max_code+1,e.d_desc.max_code+1,a+1),Gs(e,e.dyn_ltree,e.dyn_dtree)),Qs(e),s&&zs(e)},js=(e,t,i)=>(e.pending_buf[e.sym_buf+e.sym_next++]=t,e.pending_buf[e.sym_buf+e.sym_next++]=t>>8,e.pending_buf[e.sym_buf+e.sym_next++]=i,0===t?e.dyn_ltree[2*i]++:(e.matches++,t--,e.dyn_ltree[2*(vs[i]+As+1)]++,e.dyn_dtree[2*ks(t)]++),e.sym_next===e.sym_end),Vs=e=>{Ts(e,2,3),Fs(e,256,ms),(e=>{16===e.bi_valid?(Rs(e,e.bi_buf),e.bi_buf=0,e.bi_valid=0):e.bi_valid>=8&&(e.pending_buf[e.pending++]=255&e.bi_buf,e.bi_buf>>=8,e.bi_valid-=8)})(e)},Zs={_tr_init:Js,_tr_stored_block:Ks,_tr_flush_block:Ws,_tr_tally:js,_tr_align:Vs};var Xs=(e,t,i,s)=>{let o=65535&e,r=e>>>16&65535,a=0;for(;0!==i;){a=i>2e3?2e3:i,i-=a;do{o=o+t[s++]|0,r=r+o|0}while(--a);o%=65521,r%=65521}return o|r<<16};const qs=new Uint32Array((()=>{let e,t=[];for(var i=0;i<256;i++){e=i;for(var s=0;s<8;s++)e=1&e?3988292384^e>>>1:e>>>1;t[i]=e}return t})());var eo=(e,t,i,s)=>{const o=qs,r=s+i;e^=-1;for(let i=s;i<r;i++)e=e>>>8^o[255&(e^t[i])];return-1^e},to={2:"need dictionary",1:"stream end",0:"","-1":"file error","-2":"stream error","-3":"data error","-4":"insufficient memory","-5":"buffer error","-6":"incompatible version"},io={Z_NO_FLUSH:0,Z_PARTIAL_FLUSH:1,Z_SYNC_FLUSH:2,Z_FULL_FLUSH:3,Z_FINISH:4,Z_BLOCK:5,Z_TREES:6,Z_OK:0,Z_STREAM_END:1,Z_NEED_DICT:2,Z_STREAM_ERROR:-2,Z_DATA_ERROR:-3,Z_MEM_ERROR:-4,Z_BUF_ERROR:-5,Z_DEFAULT_COMPRESSION:-1,Z_FILTERED:1,Z_HUFFMAN_ONLY:2,Z_RLE:3,Z_FIXED:4,Z_DEFAULT_STRATEGY:0,Z_UNKNOWN:2,Z_DEFLATED:8};const{_tr_init:so,_tr_stored_block:oo,_tr_flush_block:ro,_tr_tally:ao,_tr_align:no}=Zs,{Z_NO_FLUSH:lo,Z_PARTIAL_FLUSH:co,Z_FULL_FLUSH:ho,Z_FINISH:Ao,Z_BLOCK:go,Z_OK:uo,Z_STREAM_END:po,Z_STREAM_ERROR:_o,Z_DATA_ERROR:fo,Z_BUF_ERROR:wo,Z_DEFAULT_COMPRESSION:Eo,Z_FILTERED:mo,Z_HUFFMAN_ONLY:bo,Z_RLE:yo,Z_FIXED:vo,Z_DEFAULT_STRATEGY:Co,Z_UNKNOWN:Bo,Z_DEFLATED:xo}=io,So=258,Io=262,Do=42,Mo=113,ko=666,Ro=(e,t)=>(e.msg=to[t],t),To=e=>2*e-(e>4?9:0),Fo=e=>{let t=e.length;for(;--t>=0;)e[t]=0},Po=e=>{let t,i,s,o=e.w_size;t=e.hash_size,s=t;do{i=e.head[--s],e.head[s]=i>=o?i-o:0}while(--t);t=o,s=t;do{i=e.prev[--s],e.prev[s]=i>=o?i-o:0}while(--t)};let Uo=(e,t,i)=>(t<<e.hash_shift^i)&e.hash_mask;const Qo=e=>{const t=e.state;let i=t.pending;i>e.avail_out&&(i=e.avail_out),0!==i&&(e.output.set(t.pending_buf.subarray(t.pending_out,t.pending_out+i),e.next_out),e.next_out+=i,t.pending_out+=i,e.total_out+=i,e.avail_out-=i,t.pending-=i,0===t.pending&&(t.pending_out=0))},zo=(e,t)=>{ro(e,e.block_start>=0?e.block_start:-1,e.strstart-e.block_start,t),e.block_start=e.strstart,Qo(e.strm)},Oo=(e,t)=>{e.pending_buf[e.pending++]=t},Ho=(e,t)=>{e.pending_buf[e.pending++]=t>>>8&255,e.pending_buf[e.pending++]=255&t},Go=(e,t,i,s)=>{let o=e.avail_in;return o>s&&(o=s),0===o?0:(e.avail_in-=o,t.set(e.input.subarray(e.next_in,e.next_in+o),i),1===e.state.wrap?e.adler=Xs(e.adler,t,o,i):2===e.state.wrap&&(e.adler=eo(e.adler,t,o,i)),e.next_in+=o,e.total_in+=o,o)},Lo=(e,t)=>{let i,s,o=e.max_chain_length,r=e.strstart,a=e.prev_length,n=e.nice_match;const l=e.strstart>e.w_size-Io?e.strstart-(e.w_size-Io):0,c=e.window,h=e.w_mask,d=e.prev,A=e.strstart+So;let g=c[r+a-1],u=c[r+a];e.prev_length>=e.good_match&&(o>>=2),n>e.lookahead&&(n=e.lookahead);do{if(i=t,c[i+a]===u&&c[i+a-1]===g&&c[i]===c[r]&&c[++i]===c[r+1]){r+=2,i++;do{}while(c[++r]===c[++i]&&c[++r]===c[++i]&&c[++r]===c[++i]&&c[++r]===c[++i]&&c[++r]===c[++i]&&c[++r]===c[++i]&&c[++r]===c[++i]&&c[++r]===c[++i]&&r<A);if(s=So-(A-r),r=A-So,s>a){if(e.match_start=t,a=s,s>=n)break;g=c[r+a-1],u=c[r+a]}}}while((t=d[t&h])>l&&0!==--o);return a<=e.lookahead?a:e.lookahead},No=e=>{const t=e.w_size;let i,s,o;do{if(s=e.window_size-e.lookahead-e.strstart,e.strstart>=t+(t-Io)&&(e.window.set(e.window.subarray(t,t+t-s),0),e.match_start-=t,e.strstart-=t,e.block_start-=t,e.insert>e.strstart&&(e.insert=e.strstart),Po(e),s+=t),0===e.strm.avail_in)break;if(i=Go(e.strm,e.window,e.strstart+e.lookahead,s),e.lookahead+=i,e.lookahead+e.insert>=3)for(o=e.strstart-e.insert,e.ins_h=e.window[o],e.ins_h=Uo(e,e.ins_h,e.window[o+1]);e.insert&&(e.ins_h=Uo(e,e.ins_h,e.window[o+3-1]),e.prev[o&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=o,o++,e.insert--,!(e.lookahead+e.insert<3)););}while(e.lookahead<Io&&0!==e.strm.avail_in)},Yo=(e,t)=>{let i,s,o,r=e.pending_buf_size-5>e.w_size?e.w_size:e.pending_buf_size-5,a=0,n=e.strm.avail_in;do{if(i=65535,o=e.bi_valid+42>>3,e.strm.avail_out<o)break;if(o=e.strm.avail_out-o,s=e.strstart-e.block_start,i>s+e.strm.avail_in&&(i=s+e.strm.avail_in),i>o&&(i=o),i<r&&(0===i&&t!==Ao||t===lo||i!==s+e.strm.avail_in))break;a=t===Ao&&i===s+e.strm.avail_in?1:0,oo(e,0,0,a),e.pending_buf[e.pending-4]=i,e.pending_buf[e.pending-3]=i>>8,e.pending_buf[e.pending-2]=~i,e.pending_buf[e.pending-1]=~i>>8,Qo(e.strm),s&&(s>i&&(s=i),e.strm.output.set(e.window.subarray(e.block_start,e.block_start+s),e.strm.next_out),e.strm.next_out+=s,e.strm.avail_out-=s,e.strm.total_out+=s,e.block_start+=s,i-=s),i&&(Go(e.strm,e.strm.output,e.strm.next_out,i),e.strm.next_out+=i,e.strm.avail_out-=i,e.strm.total_out+=i)}while(0===a);return n-=e.strm.avail_in,n&&(n>=e.w_size?(e.matches=2,e.window.set(e.strm.input.subarray(e.strm.next_in-e.w_size,e.strm.next_in),0),e.strstart=e.w_size,e.insert=e.strstart):(e.window_size-e.strstart<=n&&(e.strstart-=e.w_size,e.window.set(e.window.subarray(e.w_size,e.w_size+e.strstart),0),e.matches<2&&e.matches++,e.insert>e.strstart&&(e.insert=e.strstart)),e.window.set(e.strm.input.subarray(e.strm.next_in-n,e.strm.next_in),e.strstart),e.strstart+=n,e.insert+=n>e.w_size-e.insert?e.w_size-e.insert:n),e.block_start=e.strstart),e.high_water<e.strstart&&(e.high_water=e.strstart),a?4:t!==lo&&t!==Ao&&0===e.strm.avail_in&&e.strstart===e.block_start?2:(o=e.window_size-e.strstart,e.strm.avail_in>o&&e.block_start>=e.w_size&&(e.block_start-=e.w_size,e.strstart-=e.w_size,e.window.set(e.window.subarray(e.w_size,e.w_size+e.strstart),0),e.matches<2&&e.matches++,o+=e.w_size,e.insert>e.strstart&&(e.insert=e.strstart)),o>e.strm.avail_in&&(o=e.strm.avail_in),o&&(Go(e.strm,e.window,e.strstart,o),e.strstart+=o,e.insert+=o>e.w_size-e.insert?e.w_size-e.insert:o),e.high_water<e.strstart&&(e.high_water=e.strstart),o=e.bi_valid+42>>3,o=e.pending_buf_size-o>65535?65535:e.pending_buf_size-o,r=o>e.w_size?e.w_size:o,s=e.strstart-e.block_start,(s>=r||(s||t===Ao)&&t!==lo&&0===e.strm.avail_in&&s<=o)&&(i=s>o?o:s,a=t===Ao&&0===e.strm.avail_in&&i===s?1:0,oo(e,e.block_start,i,a),e.block_start+=i,Qo(e.strm)),a?3:1)},$o=(e,t)=>{let i,s;for(;;){if(e.lookahead<Io){if(No(e),e.lookahead<Io&&t===lo)return 1;if(0===e.lookahead)break}if(i=0,e.lookahead>=3&&(e.ins_h=Uo(e,e.ins_h,e.window[e.strstart+3-1]),i=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart),0!==i&&e.strstart-i<=e.w_size-Io&&(e.match_length=Lo(e,i)),e.match_length>=3)if(s=ao(e,e.strstart-e.match_start,e.match_length-3),e.lookahead-=e.match_length,e.match_length<=e.max_lazy_match&&e.lookahead>=3){e.match_length--;do{e.strstart++,e.ins_h=Uo(e,e.ins_h,e.window[e.strstart+3-1]),i=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart}while(0!==--e.match_length);e.strstart++}else e.strstart+=e.match_length,e.match_length=0,e.ins_h=e.window[e.strstart],e.ins_h=Uo(e,e.ins_h,e.window[e.strstart+1]);else s=ao(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++;if(s&&(zo(e,!1),0===e.strm.avail_out))return 1}return e.insert=e.strstart<2?e.strstart:2,t===Ao?(zo(e,!0),0===e.strm.avail_out?3:4):e.sym_next&&(zo(e,!1),0===e.strm.avail_out)?1:2},Ko=(e,t)=>{let i,s,o;for(;;){if(e.lookahead<Io){if(No(e),e.lookahead<Io&&t===lo)return 1;if(0===e.lookahead)break}if(i=0,e.lookahead>=3&&(e.ins_h=Uo(e,e.ins_h,e.window[e.strstart+3-1]),i=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart),e.prev_length=e.match_length,e.prev_match=e.match_start,e.match_length=2,0!==i&&e.prev_length<e.max_lazy_match&&e.strstart-i<=e.w_size-Io&&(e.match_length=Lo(e,i),e.match_length<=5&&(e.strategy===mo||3===e.match_length&&e.strstart-e.match_start>4096)&&(e.match_length=2)),e.prev_length>=3&&e.match_length<=e.prev_length){o=e.strstart+e.lookahead-3,s=ao(e,e.strstart-1-e.prev_match,e.prev_length-3),e.lookahead-=e.prev_length-1,e.prev_length-=2;do{++e.strstart<=o&&(e.ins_h=Uo(e,e.ins_h,e.window[e.strstart+3-1]),i=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart)}while(0!==--e.prev_length);if(e.match_available=0,e.match_length=2,e.strstart++,s&&(zo(e,!1),0===e.strm.avail_out))return 1}else if(e.match_available){if(s=ao(e,0,e.window[e.strstart-1]),s&&zo(e,!1),e.strstart++,e.lookahead--,0===e.strm.avail_out)return 1}else e.match_available=1,e.strstart++,e.lookahead--}return e.match_available&&(s=ao(e,0,e.window[e.strstart-1]),e.match_available=0),e.insert=e.strstart<2?e.strstart:2,t===Ao?(zo(e,!0),0===e.strm.avail_out?3:4):e.sym_next&&(zo(e,!1),0===e.strm.avail_out)?1:2};function Jo(e,t,i,s,o){this.good_length=e,this.max_lazy=t,this.nice_length=i,this.max_chain=s,this.func=o}const Wo=[new Jo(0,0,0,0,Yo),new Jo(4,4,8,4,$o),new Jo(4,5,16,8,$o),new Jo(4,6,32,32,$o),new Jo(4,4,16,16,Ko),new Jo(8,16,32,32,Ko),new Jo(8,16,128,128,Ko),new Jo(8,32,128,256,Ko),new Jo(32,128,258,1024,Ko),new Jo(32,258,258,4096,Ko)];function jo(){this.strm=null,this.status=0,this.pending_buf=null,this.pending_buf_size=0,this.pending_out=0,this.pending=0,this.wrap=0,this.gzhead=null,this.gzindex=0,this.method=xo,this.last_flush=-1,this.w_size=0,this.w_bits=0,this.w_mask=0,this.window=null,this.window_size=0,this.prev=null,this.head=null,this.ins_h=0,this.hash_size=0,this.hash_bits=0,this.hash_mask=0,this.hash_shift=0,this.block_start=0,this.match_length=0,this.prev_match=0,this.match_available=0,this.strstart=0,this.match_start=0,this.lookahead=0,this.prev_length=0,this.max_chain_length=0,this.max_lazy_match=0,this.level=0,this.strategy=0,this.good_match=0,this.nice_match=0,this.dyn_ltree=new Uint16Array(1146),this.dyn_dtree=new Uint16Array(122),this.bl_tree=new Uint16Array(78),Fo(this.dyn_ltree),Fo(this.dyn_dtree),Fo(this.bl_tree),this.l_desc=null,this.d_desc=null,this.bl_desc=null,this.bl_count=new Uint16Array(16),this.heap=new Uint16Array(573),Fo(this.heap),this.heap_len=0,this.heap_max=0,this.depth=new Uint16Array(573),Fo(this.depth),this.sym_buf=0,this.lit_bufsize=0,this.sym_next=0,this.sym_end=0,this.opt_len=0,this.static_len=0,this.matches=0,this.insert=0,this.bi_buf=0,this.bi_valid=0}const Vo=e=>{if(!e)return 1;const t=e.state;return!t||t.strm!==e||t.status!==Do&&57!==t.status&&69!==t.status&&73!==t.status&&91!==t.status&&103!==t.status&&t.status!==Mo&&t.status!==ko?1:0},Zo=e=>{if(Vo(e))return Ro(e,_o);e.total_in=e.total_out=0,e.data_type=Bo;const t=e.state;return t.pending=0,t.pending_out=0,t.wrap<0&&(t.wrap=-t.wrap),t.status=2===t.wrap?57:t.wrap?Do:Mo,e.adler=2===t.wrap?0:1,t.last_flush=-2,so(t),uo},Xo=e=>{const t=Zo(e);return t===uo&&(e=>{e.window_size=2*e.w_size,Fo(e.head),e.max_lazy_match=Wo[e.level].max_lazy,e.good_match=Wo[e.level].good_length,e.nice_match=Wo[e.level].nice_length,e.max_chain_length=Wo[e.level].max_chain,e.strstart=0,e.block_start=0,e.lookahead=0,e.insert=0,e.match_length=e.prev_length=2,e.match_available=0,e.ins_h=0})(e.state),t},qo=(e,t,i,s,o,r)=>{if(!e)return _o;let a=1;if(t===Eo&&(t=6),s<0?(a=0,s=-s):s>15&&(a=2,s-=16),o<1||o>9||i!==xo||s<8||s>15||t<0||t>9||r<0||r>vo||8===s&&1!==a)return Ro(e,_o);8===s&&(s=9);const n=new jo;return e.state=n,n.strm=e,n.status=Do,n.wrap=a,n.gzhead=null,n.w_bits=s,n.w_size=1<<n.w_bits,n.w_mask=n.w_size-1,n.hash_bits=o+7,n.hash_size=1<<n.hash_bits,n.hash_mask=n.hash_size-1,n.hash_shift=~~((n.hash_bits+3-1)/3),n.window=new Uint8Array(2*n.w_size),n.head=new Uint16Array(n.hash_size),n.prev=new Uint16Array(n.w_size),n.lit_bufsize=1<<o+6,n.pending_buf_size=4*n.lit_bufsize,n.pending_buf=new Uint8Array(n.pending_buf_size),n.sym_buf=n.lit_bufsize,n.sym_end=3*(n.lit_bufsize-1),n.level=t,n.strategy=r,n.method=i,Xo(e)};var er=(e,t)=>{if(Vo(e)||t>go||t<0)return e?Ro(e,_o):_o;const i=e.state;if(!e.output||0!==e.avail_in&&!e.input||i.status===ko&&t!==Ao)return Ro(e,0===e.avail_out?wo:_o);const s=i.last_flush;if(i.last_flush=t,0!==i.pending){if(Qo(e),0===e.avail_out)return i.last_flush=-1,uo}else if(0===e.avail_in&&To(t)<=To(s)&&t!==Ao)return Ro(e,wo);if(i.status===ko&&0!==e.avail_in)return Ro(e,wo);if(i.status===Do&&0===i.wrap&&(i.status=Mo),i.status===Do){let t=xo+(i.w_bits-8<<4)<<8,s=-1;if(s=i.strategy>=bo||i.level<2?0:i.level<6?1:6===i.level?2:3,t|=s<<6,0!==i.strstart&&(t|=32),t+=31-t%31,Ho(i,t),0!==i.strstart&&(Ho(i,e.adler>>>16),Ho(i,65535&e.adler)),e.adler=1,i.status=Mo,Qo(e),0!==i.pending)return i.last_flush=-1,uo}if(57===i.status)if(e.adler=0,Oo(i,31),Oo(i,139),Oo(i,8),i.gzhead)Oo(i,(i.gzhead.text?1:0)+(i.gzhead.hcrc?2:0)+(i.gzhead.extra?4:0)+(i.gzhead.name?8:0)+(i.gzhead.comment?16:0)),Oo(i,255&i.gzhead.time),Oo(i,i.gzhead.time>>8&255),Oo(i,i.gzhead.time>>16&255),Oo(i,i.gzhead.time>>24&255),Oo(i,9===i.level?2:i.strategy>=bo||i.level<2?4:0),Oo(i,255&i.gzhead.os),i.gzhead.extra&&i.gzhead.extra.length&&(Oo(i,255&i.gzhead.extra.length),Oo(i,i.gzhead.extra.length>>8&255)),i.gzhead.hcrc&&(e.adler=eo(e.adler,i.pending_buf,i.pending,0)),i.gzindex=0,i.status=69;else if(Oo(i,0),Oo(i,0),Oo(i,0),Oo(i,0),Oo(i,0),Oo(i,9===i.level?2:i.strategy>=bo||i.level<2?4:0),Oo(i,3),i.status=Mo,Qo(e),0!==i.pending)return i.last_flush=-1,uo;if(69===i.status){if(i.gzhead.extra){let t=i.pending,s=(65535&i.gzhead.extra.length)-i.gzindex;for(;i.pending+s>i.pending_buf_size;){let o=i.pending_buf_size-i.pending;if(i.pending_buf.set(i.gzhead.extra.subarray(i.gzindex,i.gzindex+o),i.pending),i.pending=i.pending_buf_size,i.gzhead.hcrc&&i.pending>t&&(e.adler=eo(e.adler,i.pending_buf,i.pending-t,t)),i.gzindex+=o,Qo(e),0!==i.pending)return i.last_flush=-1,uo;t=0,s-=o}let o=new Uint8Array(i.gzhead.extra);i.pending_buf.set(o.subarray(i.gzindex,i.gzindex+s),i.pending),i.pending+=s,i.gzhead.hcrc&&i.pending>t&&(e.adler=eo(e.adler,i.pending_buf,i.pending-t,t)),i.gzindex=0}i.status=73}if(73===i.status){if(i.gzhead.name){let t,s=i.pending;do{if(i.pending===i.pending_buf_size){if(i.gzhead.hcrc&&i.pending>s&&(e.adler=eo(e.adler,i.pending_buf,i.pending-s,s)),Qo(e),0!==i.pending)return i.last_flush=-1,uo;s=0}t=i.gzindex<i.gzhead.name.length?255&i.gzhead.name.charCodeAt(i.gzindex++):0,Oo(i,t)}while(0!==t);i.gzhead.hcrc&&i.pending>s&&(e.adler=eo(e.adler,i.pending_buf,i.pending-s,s)),i.gzindex=0}i.status=91}if(91===i.status){if(i.gzhead.comment){let t,s=i.pending;do{if(i.pending===i.pending_buf_size){if(i.gzhead.hcrc&&i.pending>s&&(e.adler=eo(e.adler,i.pending_buf,i.pending-s,s)),Qo(e),0!==i.pending)return i.last_flush=-1,uo;s=0}t=i.gzindex<i.gzhead.comment.length?255&i.gzhead.comment.charCodeAt(i.gzindex++):0,Oo(i,t)}while(0!==t);i.gzhead.hcrc&&i.pending>s&&(e.adler=eo(e.adler,i.pending_buf,i.pending-s,s))}i.status=103}if(103===i.status){if(i.gzhead.hcrc){if(i.pending+2>i.pending_buf_size&&(Qo(e),0!==i.pending))return i.last_flush=-1,uo;Oo(i,255&e.adler),Oo(i,e.adler>>8&255),e.adler=0}if(i.status=Mo,Qo(e),0!==i.pending)return i.last_flush=-1,uo}if(0!==e.avail_in||0!==i.lookahead||t!==lo&&i.status!==ko){let s=0===i.level?Yo(i,t):i.strategy===bo?((e,t)=>{let i;for(;;){if(0===e.lookahead&&(No(e),0===e.lookahead)){if(t===lo)return 1;break}if(e.match_length=0,i=ao(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++,i&&(zo(e,!1),0===e.strm.avail_out))return 1}return e.insert=0,t===Ao?(zo(e,!0),0===e.strm.avail_out?3:4):e.sym_next&&(zo(e,!1),0===e.strm.avail_out)?1:2})(i,t):i.strategy===yo?((e,t)=>{let i,s,o,r;const a=e.window;for(;;){if(e.lookahead<=So){if(No(e),e.lookahead<=So&&t===lo)return 1;if(0===e.lookahead)break}if(e.match_length=0,e.lookahead>=3&&e.strstart>0&&(o=e.strstart-1,s=a[o],s===a[++o]&&s===a[++o]&&s===a[++o])){r=e.strstart+So;do{}while(s===a[++o]&&s===a[++o]&&s===a[++o]&&s===a[++o]&&s===a[++o]&&s===a[++o]&&s===a[++o]&&s===a[++o]&&o<r);e.match_length=So-(r-o),e.match_length>e.lookahead&&(e.match_length=e.lookahead)}if(e.match_length>=3?(i=ao(e,1,e.match_length-3),e.lookahead-=e.match_length,e.strstart+=e.match_length,e.match_length=0):(i=ao(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++),i&&(zo(e,!1),0===e.strm.avail_out))return 1}return e.insert=0,t===Ao?(zo(e,!0),0===e.strm.avail_out?3:4):e.sym_next&&(zo(e,!1),0===e.strm.avail_out)?1:2})(i,t):Wo[i.level].func(i,t);if(3!==s&&4!==s||(i.status=ko),1===s||3===s)return 0===e.avail_out&&(i.last_flush=-1),uo;if(2===s&&(t===co?no(i):t!==go&&(oo(i,0,0,!1),t===ho&&(Fo(i.head),0===i.lookahead&&(i.strstart=0,i.block_start=0,i.insert=0))),Qo(e),0===e.avail_out))return i.last_flush=-1,uo}return t!==Ao?uo:i.wrap<=0?po:(2===i.wrap?(Oo(i,255&e.adler),Oo(i,e.adler>>8&255),Oo(i,e.adler>>16&255),Oo(i,e.adler>>24&255),Oo(i,255&e.total_in),Oo(i,e.total_in>>8&255),Oo(i,e.total_in>>16&255),Oo(i,e.total_in>>24&255)):(Ho(i,e.adler>>>16),Ho(i,65535&e.adler)),Qo(e),i.wrap>0&&(i.wrap=-i.wrap),0!==i.pending?uo:po)},tr=(e,t)=>{let i=t.length;if(Vo(e))return _o;const s=e.state,o=s.wrap;if(2===o||1===o&&s.status!==Do||s.lookahead)return _o;if(1===o&&(e.adler=Xs(e.adler,t,i,0)),s.wrap=0,i>=s.w_size){0===o&&(Fo(s.head),s.strstart=0,s.block_start=0,s.insert=0);let e=new Uint8Array(s.w_size);e.set(t.subarray(i-s.w_size,i),0),t=e,i=s.w_size}const r=e.avail_in,a=e.next_in,n=e.input;for(e.avail_in=i,e.next_in=0,e.input=t,No(s);s.lookahead>=3;){let e=s.strstart,t=s.lookahead-2;do{s.ins_h=Uo(s,s.ins_h,s.window[e+3-1]),s.prev[e&s.w_mask]=s.head[s.ins_h],s.head[s.ins_h]=e,e++}while(--t);s.strstart=e,s.lookahead=2,No(s)}return s.strstart+=s.lookahead,s.block_start=s.strstart,s.insert=s.lookahead,s.lookahead=0,s.match_length=s.prev_length=2,s.match_available=0,e.next_in=a,e.input=n,e.avail_in=r,s.wrap=o,uo},ir={deflateInit:(e,t)=>qo(e,t,xo,15,8,Co),deflateInit2:qo,deflateReset:Xo,deflateResetKeep:Zo,deflateSetHeader:(e,t)=>Vo(e)||2!==e.state.wrap?_o:(e.state.gzhead=t,uo),deflate:er,deflateEnd:e=>{if(Vo(e))return _o;const t=e.state.status;return e.state=null,t===Mo?Ro(e,fo):uo},deflateSetDictionary:tr,deflateInfo:"pako deflate (from Nodeca project)"};const sr=(e,t)=>Object.prototype.hasOwnProperty.call(e,t);var or=function(e){const t=Array.prototype.slice.call(arguments,1);for(;t.length;){const i=t.shift();if(i){if("object"!=typeof i)throw new TypeError(i+"must be non-object");for(const t in i)sr(i,t)&&(e[t]=i[t])}}return e},rr=e=>{let t=0;for(let i=0,s=e.length;i<s;i++)t+=e[i].length;const i=new Uint8Array(t);for(let t=0,s=0,o=e.length;t<o;t++){let o=e[t];i.set(o,s),s+=o.length}return i};let ar=!0;try{String.fromCharCode.apply(null,new Uint8Array(1))}catch(e){ar=!1}const nr=new Uint8Array(256);for(let e=0;e<256;e++)nr[e]=e>=252?6:e>=248?5:e>=240?4:e>=224?3:e>=192?2:1;nr[254]=nr[254]=1;var lr=e=>{if("function"==typeof TextEncoder&&TextEncoder.prototype.encode)return(new TextEncoder).encode(e);let t,i,s,o,r,a=e.length,n=0;for(o=0;o<a;o++)i=e.charCodeAt(o),55296==(64512&i)&&o+1<a&&(s=e.charCodeAt(o+1),56320==(64512&s)&&(i=65536+(i-55296<<10)+(s-56320),o++)),n+=i<128?1:i<2048?2:i<65536?3:4;for(t=new Uint8Array(n),r=0,o=0;r<n;o++)i=e.charCodeAt(o),55296==(64512&i)&&o+1<a&&(s=e.charCodeAt(o+1),56320==(64512&s)&&(i=65536+(i-55296<<10)+(s-56320),o++)),i<128?t[r++]=i:i<2048?(t[r++]=192|i>>>6,t[r++]=128|63&i):i<65536?(t[r++]=224|i>>>12,t[r++]=128|i>>>6&63,t[r++]=128|63&i):(t[r++]=240|i>>>18,t[r++]=128|i>>>12&63,t[r++]=128|i>>>6&63,t[r++]=128|63&i);return t},cr=(e,t)=>{const i=t||e.length;if("function"==typeof TextDecoder&&TextDecoder.prototype.decode)return(new TextDecoder).decode(e.subarray(0,t));let s,o;const r=new Array(2*i);for(o=0,s=0;s<i;){let t=e[s++];if(t<128){r[o++]=t;continue}let a=nr[t];if(a>4)r[o++]=65533,s+=a-1;else{for(t&=2===a?31:3===a?15:7;a>1&&s<i;)t=t<<6|63&e[s++],a--;a>1?r[o++]=65533:t<65536?r[o++]=t:(t-=65536,r[o++]=55296|t>>10&1023,r[o++]=56320|1023&t)}}return((e,t)=>{if(t<65534&&e.subarray&&ar)return String.fromCharCode.apply(null,e.length===t?e:e.subarray(0,t));let i="";for(let s=0;s<t;s++)i+=String.fromCharCode(e[s]);return i})(r,o)},hr=(e,t)=>{(t=t||e.length)>e.length&&(t=e.length);let i=t-1;for(;i>=0&&128==(192&e[i]);)i--;return i<0||0===i?t:i+nr[e[i]]>t?i:t};var dr=function(){this.input=null,this.next_in=0,this.avail_in=0,this.total_in=0,this.output=null,this.next_out=0,this.avail_out=0,this.total_out=0,this.msg="",this.state=null,this.data_type=2,this.adler=0};const Ar=Object.prototype.toString,{Z_NO_FLUSH:gr,Z_SYNC_FLUSH:ur,Z_FULL_FLUSH:pr,Z_FINISH:_r,Z_OK:fr,Z_STREAM_END:wr,Z_DEFAULT_COMPRESSION:Er,Z_DEFAULT_STRATEGY:mr,Z_DEFLATED:br}=io;function yr(e){this.options=or({level:Er,method:br,chunkSize:16384,windowBits:15,memLevel:8,strategy:mr},e||{});let t=this.options;t.raw&&t.windowBits>0?t.windowBits=-t.windowBits:t.gzip&&t.windowBits>0&&t.windowBits<16&&(t.windowBits+=16),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new dr,this.strm.avail_out=0;let i=ir.deflateInit2(this.strm,t.level,t.method,t.windowBits,t.memLevel,t.strategy);if(i!==fr)throw new Error(to[i]);if(t.header&&ir.deflateSetHeader(this.strm,t.header),t.dictionary){let e;if(e="string"==typeof t.dictionary?lr(t.dictionary):"[object ArrayBuffer]"===Ar.call(t.dictionary)?new Uint8Array(t.dictionary):t.dictionary,i=ir.deflateSetDictionary(this.strm,e),i!==fr)throw new Error(to[i]);this._dict_set=!0}}yr.prototype.push=function(e,t){const i=this.strm,s=this.options.chunkSize;let o,r;if(this.ended)return!1;for(r=t===~~t?t:!0===t?_r:gr,"string"==typeof e?i.input=lr(e):"[object ArrayBuffer]"===Ar.call(e)?i.input=new Uint8Array(e):i.input=e,i.next_in=0,i.avail_in=i.input.length;;)if(0===i.avail_out&&(i.output=new Uint8Array(s),i.next_out=0,i.avail_out=s),(r===ur||r===pr)&&i.avail_out<=6)this.onData(i.output.subarray(0,i.next_out)),i.avail_out=0;else{if(o=ir.deflate(i,r),o===wr)return i.next_out>0&&this.onData(i.output.subarray(0,i.next_out)),o=ir.deflateEnd(this.strm),this.onEnd(o),this.ended=!0,o===fr;if(0!==i.avail_out){if(r>0&&i.next_out>0)this.onData(i.output.subarray(0,i.next_out)),i.avail_out=0;else if(0===i.avail_in)break}else this.onData(i.output)}return!0},yr.prototype.onData=function(e){this.chunks.push(e)},yr.prototype.onEnd=function(e){e===fr&&(this.result=rr(this.chunks)),this.chunks=[],this.err=e,this.msg=this.strm.msg};var vr={deflate:function(e,t){const i=new yr(t);if(i.push(e,!0),i.err)throw i.msg||to[i.err];return i.result}};const Cr=16209;var Br=function(e,t){let i,s,o,r,a,n,l,c,h,d,A,g,u,p,_,f,w,E,m,b,y,v,C,B;const x=e.state;i=e.next_in,C=e.input,s=i+(e.avail_in-5),o=e.next_out,B=e.output,r=o-(t-e.avail_out),a=o+(e.avail_out-257),n=x.dmax,l=x.wsize,c=x.whave,h=x.wnext,d=x.window,A=x.hold,g=x.bits,u=x.lencode,p=x.distcode,_=(1<<x.lenbits)-1,f=(1<<x.distbits)-1;e:do{g<15&&(A+=C[i++]<<g,g+=8,A+=C[i++]<<g,g+=8),w=u[A&_];t:for(;;){if(E=w>>>24,A>>>=E,g-=E,E=w>>>16&255,0===E)B[o++]=65535&w;else{if(!(16&E)){if(64&E){if(32&E){x.mode=16191;break e}e.msg="invalid literal/length code",x.mode=Cr;break e}w=u[(65535&w)+(A&(1<<E)-1)];continue t}for(m=65535&w,E&=15,E&&(g<E&&(A+=C[i++]<<g,g+=8),m+=A&(1<<E)-1,A>>>=E,g-=E),g<15&&(A+=C[i++]<<g,g+=8,A+=C[i++]<<g,g+=8),w=p[A&f];;){if(E=w>>>24,A>>>=E,g-=E,E=w>>>16&255,16&E){if(b=65535&w,E&=15,g<E&&(A+=C[i++]<<g,g+=8,g<E&&(A+=C[i++]<<g,g+=8)),b+=A&(1<<E)-1,b>n){e.msg="invalid distance too far back",x.mode=Cr;break e}if(A>>>=E,g-=E,E=o-r,b>E){if(E=b-E,E>c&&x.sane){e.msg="invalid distance too far back",x.mode=Cr;break e}if(y=0,v=d,0===h){if(y+=l-E,E<m){m-=E;do{B[o++]=d[y++]}while(--E);y=o-b,v=B}}else if(h<E){if(y+=l+h-E,E-=h,E<m){m-=E;do{B[o++]=d[y++]}while(--E);if(y=0,h<m){E=h,m-=E;do{B[o++]=d[y++]}while(--E);y=o-b,v=B}}}else if(y+=h-E,E<m){m-=E;do{B[o++]=d[y++]}while(--E);y=o-b,v=B}for(;m>2;)B[o++]=v[y++],B[o++]=v[y++],B[o++]=v[y++],m-=3;m&&(B[o++]=v[y++],m>1&&(B[o++]=v[y++]))}else{y=o-b;do{B[o++]=B[y++],B[o++]=B[y++],B[o++]=B[y++],m-=3}while(m>2);m&&(B[o++]=B[y++],m>1&&(B[o++]=B[y++]))}break}if(64&E){e.msg="invalid distance code",x.mode=Cr;break e}w=p[(65535&w)+(A&(1<<E)-1)]}}break}}while(i<s&&o<a);m=g>>3,i-=m,g-=m<<3,A&=(1<<g)-1,e.next_in=i,e.next_out=o,e.avail_in=i<s?s-i+5:5-(i-s),e.avail_out=o<a?a-o+257:257-(o-a),x.hold=A,x.bits=g};const xr=15,Sr=new Uint16Array([3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0]),Ir=new Uint8Array([16,16,16,16,16,16,16,16,17,17,17,17,18,18,18,18,19,19,19,19,20,20,20,20,21,21,21,21,16,72,78]),Dr=new Uint16Array([1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577,0,0]),Mr=new Uint8Array([16,16,16,16,17,17,18,18,19,19,20,20,21,21,22,22,23,23,24,24,25,25,26,26,27,27,28,28,29,29,64,64]);var kr=(e,t,i,s,o,r,a,n)=>{const l=n.bits;let c,h,d,A,g,u,p=0,_=0,f=0,w=0,E=0,m=0,b=0,y=0,v=0,C=0,B=null;const x=new Uint16Array(16),S=new Uint16Array(16);let I,D,M,k=null;for(p=0;p<=xr;p++)x[p]=0;for(_=0;_<s;_++)x[t[i+_]]++;for(E=l,w=xr;w>=1&&0===x[w];w--);if(E>w&&(E=w),0===w)return o[r++]=20971520,o[r++]=20971520,n.bits=1,0;for(f=1;f<w&&0===x[f];f++);for(E<f&&(E=f),y=1,p=1;p<=xr;p++)if(y<<=1,y-=x[p],y<0)return-1;if(y>0&&(0===e||1!==w))return-1;for(S[1]=0,p=1;p<xr;p++)S[p+1]=S[p]+x[p];for(_=0;_<s;_++)0!==t[i+_]&&(a[S[t[i+_]]++]=_);if(0===e?(B=k=a,u=20):1===e?(B=Sr,k=Ir,u=257):(B=Dr,k=Mr,u=0),C=0,_=0,p=f,g=r,m=E,b=0,d=-1,v=1<<E,A=v-1,1===e&&v>852||2===e&&v>592)return 1;for(;;){I=p-b,a[_]+1<u?(D=0,M=a[_]):a[_]>=u?(D=k[a[_]-u],M=B[a[_]-u]):(D=96,M=0),c=1<<p-b,h=1<<m,f=h;do{h-=c,o[g+(C>>b)+h]=I<<24|D<<16|M}while(0!==h);for(c=1<<p-1;C&c;)c>>=1;if(0!==c?(C&=c-1,C+=c):C=0,_++,0===--x[p]){if(p===w)break;p=t[i+a[_]]}if(p>E&&(C&A)!==d){for(0===b&&(b=E),g+=f,m=p-b,y=1<<m;m+b<w&&(y-=x[m+b],!(y<=0));)m++,y<<=1;if(v+=1<<m,1===e&&v>852||2===e&&v>592)return 1;d=C&A,o[d]=E<<24|m<<16|g-r}}return 0!==C&&(o[g+C]=p-b<<24|64<<16),n.bits=E,0};const{Z_FINISH:Rr,Z_BLOCK:Tr,Z_TREES:Fr,Z_OK:Pr,Z_STREAM_END:Ur,Z_NEED_DICT:Qr,Z_STREAM_ERROR:zr,Z_DATA_ERROR:Or,Z_MEM_ERROR:Hr,Z_BUF_ERROR:Gr,Z_DEFLATED:Lr}=io,Nr=16180,Yr=16190,$r=16191,Kr=16192,Jr=16194,Wr=16199,jr=16200,Vr=16206,Zr=16209,Xr=e=>(e>>>24&255)+(e>>>8&65280)+((65280&e)<<8)+((255&e)<<24);function qr(){this.strm=null,this.mode=0,this.last=!1,this.wrap=0,this.havedict=!1,this.flags=0,this.dmax=0,this.check=0,this.total=0,this.head=null,this.wbits=0,this.wsize=0,this.whave=0,this.wnext=0,this.window=null,this.hold=0,this.bits=0,this.length=0,this.offset=0,this.extra=0,this.lencode=null,this.distcode=null,this.lenbits=0,this.distbits=0,this.ncode=0,this.nlen=0,this.ndist=0,this.have=0,this.next=null,this.lens=new Uint16Array(320),this.work=new Uint16Array(288),this.lendyn=null,this.distdyn=null,this.sane=0,this.back=0,this.was=0}const ea=e=>{if(!e)return 1;const t=e.state;return!t||t.strm!==e||t.mode<Nr||t.mode>16211?1:0},ta=e=>{if(ea(e))return zr;const t=e.state;return e.total_in=e.total_out=t.total=0,e.msg="",t.wrap&&(e.adler=1&t.wrap),t.mode=Nr,t.last=0,t.havedict=0,t.flags=-1,t.dmax=32768,t.head=null,t.hold=0,t.bits=0,t.lencode=t.lendyn=new Int32Array(852),t.distcode=t.distdyn=new Int32Array(592),t.sane=1,t.back=-1,Pr},ia=e=>{if(ea(e))return zr;const t=e.state;return t.wsize=0,t.whave=0,t.wnext=0,ta(e)},sa=(e,t)=>{let i;if(ea(e))return zr;const s=e.state;return t<0?(i=0,t=-t):(i=5+(t>>4),t<48&&(t&=15)),t&&(t<8||t>15)?zr:(null!==s.window&&s.wbits!==t&&(s.window=null),s.wrap=i,s.wbits=t,ia(e))},oa=(e,t)=>{if(!e)return zr;const i=new qr;e.state=i,i.strm=e,i.window=null,i.mode=Nr;const s=sa(e,t);return s!==Pr&&(e.state=null),s};let ra,aa,na=!0;const la=e=>{if(na){ra=new Int32Array(512),aa=new Int32Array(32);let t=0;for(;t<144;)e.lens[t++]=8;for(;t<256;)e.lens[t++]=9;for(;t<280;)e.lens[t++]=7;for(;t<288;)e.lens[t++]=8;for(kr(1,e.lens,0,288,ra,0,e.work,{bits:9}),t=0;t<32;)e.lens[t++]=5;kr(2,e.lens,0,32,aa,0,e.work,{bits:5}),na=!1}e.lencode=ra,e.lenbits=9,e.distcode=aa,e.distbits=5},ca=(e,t,i,s)=>{let o;const r=e.state;return null===r.window&&(r.wsize=1<<r.wbits,r.wnext=0,r.whave=0,r.window=new Uint8Array(r.wsize)),s>=r.wsize?(r.window.set(t.subarray(i-r.wsize,i),0),r.wnext=0,r.whave=r.wsize):(o=r.wsize-r.wnext,o>s&&(o=s),r.window.set(t.subarray(i-s,i-s+o),r.wnext),(s-=o)?(r.window.set(t.subarray(i-s,i),0),r.wnext=s,r.whave=r.wsize):(r.wnext+=o,r.wnext===r.wsize&&(r.wnext=0),r.whave<r.wsize&&(r.whave+=o))),0};var ha=(e,t)=>{let i,s,o,r,a,n,l,c,h,d,A,g,u,p,_,f,w,E,m,b,y,v,C=0;const B=new Uint8Array(4);let x,S;const I=new Uint8Array([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]);if(ea(e)||!e.output||!e.input&&0!==e.avail_in)return zr;i=e.state,i.mode===$r&&(i.mode=Kr),a=e.next_out,o=e.output,l=e.avail_out,r=e.next_in,s=e.input,n=e.avail_in,c=i.hold,h=i.bits,d=n,A=l,v=Pr;e:for(;;)switch(i.mode){case Nr:if(0===i.wrap){i.mode=Kr;break}for(;h<16;){if(0===n)break e;n--,c+=s[r++]<<h,h+=8}if(2&i.wrap&&35615===c){0===i.wbits&&(i.wbits=15),i.check=0,B[0]=255&c,B[1]=c>>>8&255,i.check=eo(i.check,B,2,0),c=0,h=0,i.mode=16181;break}if(i.head&&(i.head.done=!1),!(1&i.wrap)||(((255&c)<<8)+(c>>8))%31){e.msg="incorrect header check",i.mode=Zr;break}if((15&c)!==Lr){e.msg="unknown compression method",i.mode=Zr;break}if(c>>>=4,h-=4,y=8+(15&c),0===i.wbits&&(i.wbits=y),y>15||y>i.wbits){e.msg="invalid window size",i.mode=Zr;break}i.dmax=1<<i.wbits,i.flags=0,e.adler=i.check=1,i.mode=512&c?16189:$r,c=0,h=0;break;case 16181:for(;h<16;){if(0===n)break e;n--,c+=s[r++]<<h,h+=8}if(i.flags=c,(255&i.flags)!==Lr){e.msg="unknown compression method",i.mode=Zr;break}if(57344&i.flags){e.msg="unknown header flags set",i.mode=Zr;break}i.head&&(i.head.text=c>>8&1),512&i.flags&&4&i.wrap&&(B[0]=255&c,B[1]=c>>>8&255,i.check=eo(i.check,B,2,0)),c=0,h=0,i.mode=16182;case 16182:for(;h<32;){if(0===n)break e;n--,c+=s[r++]<<h,h+=8}i.head&&(i.head.time=c),512&i.flags&&4&i.wrap&&(B[0]=255&c,B[1]=c>>>8&255,B[2]=c>>>16&255,B[3]=c>>>24&255,i.check=eo(i.check,B,4,0)),c=0,h=0,i.mode=16183;case 16183:for(;h<16;){if(0===n)break e;n--,c+=s[r++]<<h,h+=8}i.head&&(i.head.xflags=255&c,i.head.os=c>>8),512&i.flags&&4&i.wrap&&(B[0]=255&c,B[1]=c>>>8&255,i.check=eo(i.check,B,2,0)),c=0,h=0,i.mode=16184;case 16184:if(1024&i.flags){for(;h<16;){if(0===n)break e;n--,c+=s[r++]<<h,h+=8}i.length=c,i.head&&(i.head.extra_len=c),512&i.flags&&4&i.wrap&&(B[0]=255&c,B[1]=c>>>8&255,i.check=eo(i.check,B,2,0)),c=0,h=0}else i.head&&(i.head.extra=null);i.mode=16185;case 16185:if(1024&i.flags&&(g=i.length,g>n&&(g=n),g&&(i.head&&(y=i.head.extra_len-i.length,i.head.extra||(i.head.extra=new Uint8Array(i.head.extra_len)),i.head.extra.set(s.subarray(r,r+g),y)),512&i.flags&&4&i.wrap&&(i.check=eo(i.check,s,g,r)),n-=g,r+=g,i.length-=g),i.length))break e;i.length=0,i.mode=16186;case 16186:if(2048&i.flags){if(0===n)break e;g=0;do{y=s[r+g++],i.head&&y&&i.length<65536&&(i.head.name+=String.fromCharCode(y))}while(y&&g<n);if(512&i.flags&&4&i.wrap&&(i.check=eo(i.check,s,g,r)),n-=g,r+=g,y)break e}else i.head&&(i.head.name=null);i.length=0,i.mode=16187;case 16187:if(4096&i.flags){if(0===n)break e;g=0;do{y=s[r+g++],i.head&&y&&i.length<65536&&(i.head.comment+=String.fromCharCode(y))}while(y&&g<n);if(512&i.flags&&4&i.wrap&&(i.check=eo(i.check,s,g,r)),n-=g,r+=g,y)break e}else i.head&&(i.head.comment=null);i.mode=16188;case 16188:if(512&i.flags){for(;h<16;){if(0===n)break e;n--,c+=s[r++]<<h,h+=8}if(4&i.wrap&&c!==(65535&i.check)){e.msg="header crc mismatch",i.mode=Zr;break}c=0,h=0}i.head&&(i.head.hcrc=i.flags>>9&1,i.head.done=!0),e.adler=i.check=0,i.mode=$r;break;case 16189:for(;h<32;){if(0===n)break e;n--,c+=s[r++]<<h,h+=8}e.adler=i.check=Xr(c),c=0,h=0,i.mode=Yr;case Yr:if(0===i.havedict)return e.next_out=a,e.avail_out=l,e.next_in=r,e.avail_in=n,i.hold=c,i.bits=h,Qr;e.adler=i.check=1,i.mode=$r;case $r:if(t===Tr||t===Fr)break e;case Kr:if(i.last){c>>>=7&h,h-=7&h,i.mode=Vr;break}for(;h<3;){if(0===n)break e;n--,c+=s[r++]<<h,h+=8}switch(i.last=1&c,c>>>=1,h-=1,3&c){case 0:i.mode=16193;break;case 1:if(la(i),i.mode=Wr,t===Fr){c>>>=2,h-=2;break e}break;case 2:i.mode=16196;break;case 3:e.msg="invalid block type",i.mode=Zr}c>>>=2,h-=2;break;case 16193:for(c>>>=7&h,h-=7&h;h<32;){if(0===n)break e;n--,c+=s[r++]<<h,h+=8}if((65535&c)!=(c>>>16^65535)){e.msg="invalid stored block lengths",i.mode=Zr;break}if(i.length=65535&c,c=0,h=0,i.mode=Jr,t===Fr)break e;case Jr:i.mode=16195;case 16195:if(g=i.length,g){if(g>n&&(g=n),g>l&&(g=l),0===g)break e;o.set(s.subarray(r,r+g),a),n-=g,r+=g,l-=g,a+=g,i.length-=g;break}i.mode=$r;break;case 16196:for(;h<14;){if(0===n)break e;n--,c+=s[r++]<<h,h+=8}if(i.nlen=257+(31&c),c>>>=5,h-=5,i.ndist=1+(31&c),c>>>=5,h-=5,i.ncode=4+(15&c),c>>>=4,h-=4,i.nlen>286||i.ndist>30){e.msg="too many length or distance symbols",i.mode=Zr;break}i.have=0,i.mode=16197;case 16197:for(;i.have<i.ncode;){for(;h<3;){if(0===n)break e;n--,c+=s[r++]<<h,h+=8}i.lens[I[i.have++]]=7&c,c>>>=3,h-=3}for(;i.have<19;)i.lens[I[i.have++]]=0;if(i.lencode=i.lendyn,i.lenbits=7,x={bits:i.lenbits},v=kr(0,i.lens,0,19,i.lencode,0,i.work,x),i.lenbits=x.bits,v){e.msg="invalid code lengths set",i.mode=Zr;break}i.have=0,i.mode=16198;case 16198:for(;i.have<i.nlen+i.ndist;){for(;C=i.lencode[c&(1<<i.lenbits)-1],_=C>>>24,f=C>>>16&255,w=65535&C,!(_<=h);){if(0===n)break e;n--,c+=s[r++]<<h,h+=8}if(w<16)c>>>=_,h-=_,i.lens[i.have++]=w;else{if(16===w){for(S=_+2;h<S;){if(0===n)break e;n--,c+=s[r++]<<h,h+=8}if(c>>>=_,h-=_,0===i.have){e.msg="invalid bit length repeat",i.mode=Zr;break}y=i.lens[i.have-1],g=3+(3&c),c>>>=2,h-=2}else if(17===w){for(S=_+3;h<S;){if(0===n)break e;n--,c+=s[r++]<<h,h+=8}c>>>=_,h-=_,y=0,g=3+(7&c),c>>>=3,h-=3}else{for(S=_+7;h<S;){if(0===n)break e;n--,c+=s[r++]<<h,h+=8}c>>>=_,h-=_,y=0,g=11+(127&c),c>>>=7,h-=7}if(i.have+g>i.nlen+i.ndist){e.msg="invalid bit length repeat",i.mode=Zr;break}for(;g--;)i.lens[i.have++]=y}}if(i.mode===Zr)break;if(0===i.lens[256]){e.msg="invalid code -- missing end-of-block",i.mode=Zr;break}if(i.lenbits=9,x={bits:i.lenbits},v=kr(1,i.lens,0,i.nlen,i.lencode,0,i.work,x),i.lenbits=x.bits,v){e.msg="invalid literal/lengths set",i.mode=Zr;break}if(i.distbits=6,i.distcode=i.distdyn,x={bits:i.distbits},v=kr(2,i.lens,i.nlen,i.ndist,i.distcode,0,i.work,x),i.distbits=x.bits,v){e.msg="invalid distances set",i.mode=Zr;break}if(i.mode=Wr,t===Fr)break e;case Wr:i.mode=jr;case jr:if(n>=6&&l>=258){e.next_out=a,e.avail_out=l,e.next_in=r,e.avail_in=n,i.hold=c,i.bits=h,Br(e,A),a=e.next_out,o=e.output,l=e.avail_out,r=e.next_in,s=e.input,n=e.avail_in,c=i.hold,h=i.bits,i.mode===$r&&(i.back=-1);break}for(i.back=0;C=i.lencode[c&(1<<i.lenbits)-1],_=C>>>24,f=C>>>16&255,w=65535&C,!(_<=h);){if(0===n)break e;n--,c+=s[r++]<<h,h+=8}if(f&&!(240&f)){for(E=_,m=f,b=w;C=i.lencode[b+((c&(1<<E+m)-1)>>E)],_=C>>>24,f=C>>>16&255,w=65535&C,!(E+_<=h);){if(0===n)break e;n--,c+=s[r++]<<h,h+=8}c>>>=E,h-=E,i.back+=E}if(c>>>=_,h-=_,i.back+=_,i.length=w,0===f){i.mode=16205;break}if(32&f){i.back=-1,i.mode=$r;break}if(64&f){e.msg="invalid literal/length code",i.mode=Zr;break}i.extra=15&f,i.mode=16201;case 16201:if(i.extra){for(S=i.extra;h<S;){if(0===n)break e;n--,c+=s[r++]<<h,h+=8}i.length+=c&(1<<i.extra)-1,c>>>=i.extra,h-=i.extra,i.back+=i.extra}i.was=i.length,i.mode=16202;case 16202:for(;C=i.distcode[c&(1<<i.distbits)-1],_=C>>>24,f=C>>>16&255,w=65535&C,!(_<=h);){if(0===n)break e;n--,c+=s[r++]<<h,h+=8}if(!(240&f)){for(E=_,m=f,b=w;C=i.distcode[b+((c&(1<<E+m)-1)>>E)],_=C>>>24,f=C>>>16&255,w=65535&C,!(E+_<=h);){if(0===n)break e;n--,c+=s[r++]<<h,h+=8}c>>>=E,h-=E,i.back+=E}if(c>>>=_,h-=_,i.back+=_,64&f){e.msg="invalid distance code",i.mode=Zr;break}i.offset=w,i.extra=15&f,i.mode=16203;case 16203:if(i.extra){for(S=i.extra;h<S;){if(0===n)break e;n--,c+=s[r++]<<h,h+=8}i.offset+=c&(1<<i.extra)-1,c>>>=i.extra,h-=i.extra,i.back+=i.extra}if(i.offset>i.dmax){e.msg="invalid distance too far back",i.mode=Zr;break}i.mode=16204;case 16204:if(0===l)break e;if(g=A-l,i.offset>g){if(g=i.offset-g,g>i.whave&&i.sane){e.msg="invalid distance too far back",i.mode=Zr;break}g>i.wnext?(g-=i.wnext,u=i.wsize-g):u=i.wnext-g,g>i.length&&(g=i.length),p=i.window}else p=o,u=a-i.offset,g=i.length;g>l&&(g=l),l-=g,i.length-=g;do{o[a++]=p[u++]}while(--g);0===i.length&&(i.mode=jr);break;case 16205:if(0===l)break e;o[a++]=i.length,l--,i.mode=jr;break;case Vr:if(i.wrap){for(;h<32;){if(0===n)break e;n--,c|=s[r++]<<h,h+=8}if(A-=l,e.total_out+=A,i.total+=A,4&i.wrap&&A&&(e.adler=i.check=i.flags?eo(i.check,o,A,a-A):Xs(i.check,o,A,a-A)),A=l,4&i.wrap&&(i.flags?c:Xr(c))!==i.check){e.msg="incorrect data check",i.mode=Zr;break}c=0,h=0}i.mode=16207;case 16207:if(i.wrap&&i.flags){for(;h<32;){if(0===n)break e;n--,c+=s[r++]<<h,h+=8}if(4&i.wrap&&c!==(4294967295&i.total)){e.msg="incorrect length check",i.mode=Zr;break}c=0,h=0}i.mode=16208;case 16208:v=Ur;break e;case Zr:v=Or;break e;case 16210:return Hr;default:return zr}return e.next_out=a,e.avail_out=l,e.next_in=r,e.avail_in=n,i.hold=c,i.bits=h,(i.wsize||A!==e.avail_out&&i.mode<Zr&&(i.mode<Vr||t!==Rr))&&ca(e,e.output,e.next_out,A-e.avail_out),d-=e.avail_in,A-=e.avail_out,e.total_in+=d,e.total_out+=A,i.total+=A,4&i.wrap&&A&&(e.adler=i.check=i.flags?eo(i.check,o,A,e.next_out-A):Xs(i.check,o,A,e.next_out-A)),e.data_type=i.bits+(i.last?64:0)+(i.mode===$r?128:0)+(i.mode===Wr||i.mode===Jr?256:0),(0===d&&0===A||t===Rr)&&v===Pr&&(v=Gr),v},da={inflateReset:ia,inflateReset2:sa,inflateResetKeep:ta,inflateInit:e=>oa(e,15),inflateInit2:oa,inflate:ha,inflateEnd:e=>{if(ea(e))return zr;let t=e.state;return t.window&&(t.window=null),e.state=null,Pr},inflateGetHeader:(e,t)=>{if(ea(e))return zr;const i=e.state;return 2&i.wrap?(i.head=t,t.done=!1,Pr):zr},inflateSetDictionary:(e,t)=>{const i=t.length;let s,o,r;return ea(e)?zr:(s=e.state,0!==s.wrap&&s.mode!==Yr?zr:s.mode===Yr&&(o=1,o=Xs(o,t,i,0),o!==s.check)?Or:(r=ca(e,t,i,i),r?(s.mode=16210,Hr):(s.havedict=1,Pr)))},inflateInfo:"pako inflate (from Nodeca project)"};var Aa=function(){this.text=0,this.time=0,this.xflags=0,this.os=0,this.extra=null,this.extra_len=0,this.name="",this.comment="",this.hcrc=0,this.done=!1};const ga=Object.prototype.toString,{Z_NO_FLUSH:ua,Z_FINISH:pa,Z_OK:_a,Z_STREAM_END:fa,Z_NEED_DICT:wa,Z_STREAM_ERROR:Ea,Z_DATA_ERROR:ma,Z_MEM_ERROR:ba}=io;function ya(e){this.options=or({chunkSize:65536,windowBits:15,to:""},e||{});const t=this.options;t.raw&&t.windowBits>=0&&t.windowBits<16&&(t.windowBits=-t.windowBits,0===t.windowBits&&(t.windowBits=-15)),!(t.windowBits>=0&&t.windowBits<16)||e&&e.windowBits||(t.windowBits+=32),t.windowBits>15&&t.windowBits<48&&(15&t.windowBits||(t.windowBits|=15)),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new dr,this.strm.avail_out=0;let i=da.inflateInit2(this.strm,t.windowBits);if(i!==_a)throw new Error(to[i]);if(this.header=new Aa,da.inflateGetHeader(this.strm,this.header),t.dictionary&&("string"==typeof t.dictionary?t.dictionary=lr(t.dictionary):"[object ArrayBuffer]"===ga.call(t.dictionary)&&(t.dictionary=new Uint8Array(t.dictionary)),t.raw&&(i=da.inflateSetDictionary(this.strm,t.dictionary),i!==_a)))throw new Error(to[i])}ya.prototype.push=function(e,t){const i=this.strm,s=this.options.chunkSize,o=this.options.dictionary;let r,a,n;if(this.ended)return!1;for(a=t===~~t?t:!0===t?pa:ua,"[object ArrayBuffer]"===ga.call(e)?i.input=new Uint8Array(e):i.input=e,i.next_in=0,i.avail_in=i.input.length;;){for(0===i.avail_out&&(i.output=new Uint8Array(s),i.next_out=0,i.avail_out=s),r=da.inflate(i,a),r===wa&&o&&(r=da.inflateSetDictionary(i,o),r===_a?r=da.inflate(i,a):r===ma&&(r=wa));i.avail_in>0&&r===fa&&i.state.wrap>0&&0!==e[i.next_in];)da.inflateReset(i),r=da.inflate(i,a);switch(r){case Ea:case ma:case wa:case ba:return this.onEnd(r),this.ended=!0,!1}if(n=i.avail_out,i.next_out&&(0===i.avail_out||r===fa))if("string"===this.options.to){let e=hr(i.output,i.next_out),t=i.next_out-e,o=cr(i.output,e);i.next_out=t,i.avail_out=s-t,t&&i.output.set(i.output.subarray(e,e+t),0),this.onData(o)}else this.onData(i.output.length===i.next_out?i.output:i.output.subarray(0,i.next_out));if(r!==_a||0!==n){if(r===fa)return r=da.inflateEnd(this.strm),this.onEnd(r),this.ended=!0,!0;if(0===i.avail_in)break}}return!0},ya.prototype.onData=function(e){this.chunks.push(e)},ya.prototype.onEnd=function(e){e===_a&&("string"===this.options.to?this.result=this.chunks.join(""):this.result=rr(this.chunks)),this.chunks=[],this.err=e,this.msg=this.strm.msg};var va={Inflate:ya};const{deflate:Ca}=vr,{Inflate:Ba}=va;var xa=Ca,Sa=Ba;function Ia(e,t,i=255){const s=e.length%t;if(0!==s){const o=new Uint8Array(t-s).fill(i),r=new Uint8Array(e.length+o.length);return r.set(e),r.set(o,e.length),r}return e}function Da(e,t=239){for(let i=0;i<e.length;i++)t^=e[i];return t}function Ma(e){const t=new Uint8Array(e.length);for(let i=0;i<e.length;i++)t[i]=e.charCodeAt(i);return t}function ka(e){return new Promise(t=>setTimeout(t,e))}class Ra{constructor(e,t=!1,i=!0){this.device=e,this.tracing=t,this.slipReaderEnabled=!1,this.baudrate=0,this.traceLog="",this.lastTraceTime=Date.now(),this.buffer=new Uint8Array(0),this.onDeviceLostCallback=null,this.SLIP_END=192,this.SLIP_ESC=219,this.SLIP_ESC_END=220,this.SLIP_ESC_ESC=221,this._DTR_state=!1,this.slipReaderEnabled=i}setDeviceLostCallback(e){this.onDeviceLostCallback=e}updateDevice(e){this.device=e,this.trace("Device reference updated")}getInfo(){const e=this.device.getInfo();return e.usbVendorId&&e.usbProductId?`WebSerial VendorID 0x${e.usbVendorId.toString(16)} ProductID 0x${e.usbProductId.toString(16)}`:""}getPid(){return this.device.getInfo().usbProductId}trace(e){const t=`${`TRACE ${(Date.now()-this.lastTraceTime).toFixed(3)}`} ${e}`;console.log(t),this.traceLog+=t+"\n"}async returnTrace(){try{await navigator.clipboard.writeText(this.traceLog),console.log("Text copied to clipboard!")}catch(e){console.error("Failed to copy text:",e)}}hexify(e){return Array.from(e).map(e=>e.toString(16).padStart(2,"0")).join("").padEnd(16," ")}hexConvert(e,t=!0){if(t&&e.length>16){let t="",i=e;for(;i.length>0;){const e=i.slice(0,16),s=String.fromCharCode(...e).split("").map(e=>" "===e||e>=" "&&e<="~"&&"  "!==e?e:".").join("");i=i.slice(16),t+=`\n    ${this.hexify(e.slice(0,8))} ${this.hexify(e.slice(8))} | ${s}`}return t}return this.hexify(e)}slipWriter(e){const t=[];t.push(192);for(let i=0;i<e.length;i++)219===e[i]?t.push(219,221):192===e[i]?t.push(219,220):t.push(e[i]);return t.push(192),new Uint8Array(t)}async write(e){const t=this.slipWriter(e);if(this.device.writable){const e=this.device.writable.getWriter();this.tracing&&this.trace(`Write ${t.length} bytes: ${this.hexConvert(t)}`),await e.write(t),e.releaseLock()}}appendArray(e,t){const i=new Uint8Array(e.length+t.length);return i.set(e),i.set(t,e.length),i}async readLoop(){for(var e;this.device.readable;){this.reader=null===(e=this.device.readable)||void 0===e?void 0:e.getReader();try{const{value:e,done:t}=await this.reader.read();if(t){this.trace("Serial port done");break}if(e&&e.length){const t=Uint8Array.from(e);this.buffer=this.appendArray(this.buffer,t)}}catch(e){if(e instanceof Error){if(["BufferOverrunError","FramingError","BreakError","ParityError"].includes(e.name)){this.trace(`Recoverable serial port error: ${e.message}`);continue}this.trace(`Unrecoverable serial port error: ${e.message}`);break}if(e instanceof DOMException){this.onDeviceLostCallback?this.onDeviceLostCallback():this.trace(`Unrecoverable serial port error: ${e.message}`);break}this.trace(`Unrecoverable serial port error: ${e}`);break}finally{this.reader.releaseLock()}}this.trace("readLoop exited")}flushInput(){this.buffer=new Uint8Array(0)}async flushOutput(){try{if(this.device.writable){const e=this.device.writable.getWriter();await e.close(),e.releaseLock()}}catch(e){this.trace(`Error while flushing output: ${e}`)}}inWaiting(){return this.buffer.length}peek(){return this.buffer}detectPanicHandler(e){const t=new TextDecoder("utf-8").decode(e),i=t.match(/G?uru Meditation Error: (?:Core \d panic'ed \(([a-zA-Z ]*)\))?/)||t.match(/F?atal exception \(\d+\): (?:([a-zA-Z ]*)?.*epc)?/);if(i){const e=i[1]||i[2];throw new Error("Guru Meditation Error detected"+(e?` (${e})`:""))}}async read(e){let t=null,i=!1,s=null;for(;;){const o=Date.now();for(s=new Uint8Array(0);Date.now()-o<e;){if(this.buffer.length>0){s=this.buffer,this.buffer=new Uint8Array(0);break}await ka(1)}if(!s||0===s.length){const e=null===t?"Serial data stream stopped: Possible serial noise or corruption.":"No serial data received.";throw this.tracing&&this.trace(e),new Error(e)}this.tracing&&this.trace(`Read ${s.length} bytes: ${this.hexConvert(s)}`);for(let e=0;e<s.length;e++){const o=s[e];if(null===t){if(o!==this.SLIP_END){this.tracing&&this.trace(`Read invalid data: ${this.hexConvert(s)}`);const e=this.buffer;throw this.tracing&&this.trace(`Remaining data in serial buffer: ${this.hexConvert(e)}`),this.detectPanicHandler(new Uint8Array([...s,...e||[]])),new Error(`Invalid head of packet (0x${o.toString(16)}): Possible serial noise or corruption.`)}t=new Uint8Array(0)}else if(i)if(i=!1,o===this.SLIP_ESC_END)t=this.appendArray(t,new Uint8Array([this.SLIP_END]));else{if(o!==this.SLIP_ESC_ESC){this.tracing&&this.trace(`Read invalid data: ${this.hexConvert(s)}`);const e=this.buffer;throw this.tracing&&this.trace(`Remaining data in serial buffer: ${this.hexConvert(e)}`),this.detectPanicHandler(new Uint8Array([...s,...e||[]])),new Error(`Invalid SLIP escape (0xdb, 0x${o.toString(16)})`)}t=this.appendArray(t,new Uint8Array([this.SLIP_ESC]))}else if(o===this.SLIP_ESC)i=!0;else{if(o===this.SLIP_END){if(this.tracing&&this.trace(`Received full packet: ${this.hexConvert(t)}`),e+1<s.length){const t=s.slice(e+1);this.buffer=this.appendArray(t,this.buffer)}return t}t=this.appendArray(t,new Uint8Array([o]))}}}}async rawRead(e,t){let i;try{if(!this.device.readable)return;for(i=this.device.readable.getReader();!t();){const{value:t,done:s}=await i.read();if(s||!t)break;this.tracing&&this.trace(`Read ${t.length} bytes: ${this.hexConvert(t)}`),e(t)}}catch(e){this.trace(`Error reading from serial port: ${e}`),e instanceof Error&&"NetworkError"===e.name&&e.message.includes("device has been lost")&&(this.trace("Device lost detected (NetworkError)"),this.onDeviceLostCallback&&this.onDeviceLostCallback())}finally{null==i||i.releaseLock()}}async setRTS(e){await this.device.setSignals({requestToSend:e}),await this.setDTR(this._DTR_state)}async setDTR(e){this._DTR_state=e,await this.device.setSignals({dataTerminalReady:e})}async connect(e=115200,t={}){await this.device.open({baudRate:e,dataBits:null==t?void 0:t.dataBits,stopBits:null==t?void 0:t.stopBits,bufferSize:null==t?void 0:t.bufferSize,parity:null==t?void 0:t.parity,flowControl:null==t?void 0:t.flowControl}),this.baudrate=e}async waitForUnlock(e){for(;this.device.readable&&this.device.readable.locked||this.device.writable&&this.device.writable.locked;)await ka(e)}async disconnect(){var e,t;(null===(e=this.device.readable)||void 0===e?void 0:e.locked)&&await(null===(t=this.reader)||void 0===t?void 0:t.cancel()),await this.waitForUnlock(400),await this.device.close(),this.reader=void 0}}function Ta(e){return new Promise(t=>setTimeout(t,e))}class Fa{constructor(e,t){this.resetDelay=t,this.transport=e}async reset(){await this.transport.setDTR(!1),await this.transport.setRTS(!0),await Ta(100),await this.transport.setDTR(!0),await this.transport.setRTS(!1),await Ta(this.resetDelay),await this.transport.setDTR(!1)}}class Pa{constructor(e){this.transport=e}async reset(){await this.transport.setRTS(!1),await this.transport.setDTR(!1),await Ta(100),await this.transport.setDTR(!0),await this.transport.setRTS(!1),await Ta(100),await this.transport.setRTS(!0),await this.transport.setDTR(!1),await this.transport.setRTS(!0),await Ta(100),await this.transport.setRTS(!1),await this.transport.setDTR(!1)}}class Ua{constructor(e,t=!1){this.transport=e,this.usingUsbOtg=t,this.transport=e}async reset(){this.usingUsbOtg?(await Ta(200),await this.transport.setRTS(!1),await Ta(200)):(await Ta(100),await this.transport.setRTS(!1))}}class Qa{constructor(e,t){this.transport=e,this.sequenceString=t,this.transport=e}async reset(){const e={D:async e=>await this.transport.setDTR(e),R:async e=>await this.transport.setRTS(e),W:async e=>await Ta(e)};try{if(!function(e){const t=["D","R","W"],i=e.split("|");for(const e of i){const i=e[0],s=e.slice(1);if(!t.includes(i))return!1;if("D"===i||"R"===i){if("0"!==s&&"1"!==s)return!1}else if("W"===i){const e=parseInt(s);if(isNaN(e)||e<=0)return!1}}return!0}(this.sequenceString))return;const t=this.sequenceString.split("|");for(const i of t){const t=i[0],s=i.slice(1);"W"===t?await e.W(Number(s)):"D"!==t&&"R"!==t||await e[t]("1"===s)}}catch(e){throw new Error("Invalid custom reset sequence")}}}function za(e){return e&&e.__esModule&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e}var Oa,Ha;var Ga=za(Ha?Oa:(Ha=1,Oa=function(e){return atob(e)}));async function La(e,t){let i;switch(e){case"ESP32":i=await Promise.resolve().then(function(){return In});break;case"ESP32-C2":i=await Promise.resolve().then(function(){return Un});break;case"ESP32-C3":i=await Promise.resolve().then(function(){return Yn});break;case"ESP32-C5":i=await Promise.resolve().then(function(){return Xn});break;case"ESP32-C6":i=await Promise.resolve().then(function(){return al});break;case"ESP32-C61":i=await Promise.resolve().then(function(){return ul});break;case"ESP32-H2":i=await Promise.resolve().then(function(){return yl});break;case"ESP32-P4":i=t&&t<300?await Promise.resolve().then(function(){return Ml}):await Promise.resolve().then(function(){return zl});break;case"ESP32-S2":i=await Promise.resolve().then(function(){return Kl});break;case"ESP32-S3":i=await Promise.resolve().then(function(){return ec});break;case"ESP8266":i=await Promise.resolve().then(function(){return lc})}if(i)return{bss_start:i.bss_start,data:i.data,data_start:i.data_start,entry:i.entry,text:i.text,text_start:i.text_start,decodedData:Na(i.data),decodedText:Na(i.text)}}function Na(e){const t=Ga(e).split("").map(function(e){return e.charCodeAt(0)});return new Uint8Array(t)}class Ya{constructor(){this.FLASH_SIZES={"1MB":0,"2MB":16,"4MB":32,"8MB":48,"16MB":64,"32MB":80,"64MB":96,"128MB":112},this.FLASH_FREQUENCY={"80m":15,"40m":0,"26m":1,"20m":2}}getEraseSize(e,t){return t}}class $a extends Ya{constructor(){super(...arguments),this.CHIP_NAME="ESP8266",this.CHIP_DETECT_MAGIC_VALUE=[4293968129],this.EFUSE_RD_REG_BASE=1072693328,this.UART_CLKDIV_REG=1610612756,this.UART_CLKDIV_MASK=1048575,this.XTAL_CLK_DIVIDER=2,this.FLASH_WRITE_SIZE=16384,this.BOOTLOADER_FLASH_OFFSET=0,this.UART_DATE_REG_ADDR=0,this.FLASH_SIZES={"512KB":0,"256KB":16,"1MB":32,"2MB":48,"4MB":64,"2MB-c1":80,"4MB-c1":96,"8MB":128,"16MB":144},this.FLASH_FREQUENCY={"80m":15,"40m":0,"26m":1,"20m":2},this.MEMORY_MAP=[[1072693248,1072693264,"DPORT"],[1073643520,1073741824,"DRAM"],[1074790400,1074823168,"IRAM"],[1075843088,1076760592,"IROM"]],this.SPI_REG_BASE=1610613248,this.SPI_USR_OFFS=28,this.SPI_USR1_OFFS=32,this.SPI_USR2_OFFS=36,this.SPI_MOSI_DLEN_OFFS=0,this.SPI_MISO_DLEN_OFFS=0,this.SPI_W0_OFFS=64,this.getChipFeatures=async e=>{const t=["WiFi"];return"ESP8285"==await this.getChipDescription(e)&&t.push("Embedded Flash"),t}}async readEfuse(e,t){const i=this.EFUSE_RD_REG_BASE+4*t;return e.debug("Read efuse "+i),await e.readReg(i)}async getChipDescription(e){const t=await this.readEfuse(e,2);return!!(16&await this.readEfuse(e,0)|65536&t)?"ESP8285":"ESP8266EX"}async getCrystalFreq(e){const t=await e.readReg(this.UART_CLKDIV_REG)&this.UART_CLKDIV_MASK,i=e.transport.baudrate*t/1e6/this.XTAL_CLK_DIVIDER;let s;return s=i>33?40:26,Math.abs(s-i)>1&&e.info("WARNING: Detected crystal freq "+i+"MHz is quite different to normalized freq "+s+"MHz. Unsupported crystal in use?"),s}_d2h(e){const t=(+e).toString(16);return 1===t.length?"0"+t:t}async readMac(e){let t=await this.readEfuse(e,0);t>>>=0;let i=await this.readEfuse(e,1);i>>>=0;let s=await this.readEfuse(e,3);s>>>=0;const o=new Uint8Array(6);return 0!=s?(o[0]=s>>16&255,o[1]=s>>8&255,o[2]=255&s):i>>16&255?1==(i>>16&255)?(o[0]=172,o[1]=208,o[2]=116):e.error("Unknown OUI"):(o[0]=24,o[1]=254,o[2]=52),o[3]=i>>8&255,o[4]=255&i,o[5]=t>>24&255,this._d2h(o[0])+":"+this._d2h(o[1])+":"+this._d2h(o[2])+":"+this._d2h(o[3])+":"+this._d2h(o[4])+":"+this._d2h(o[5])}getEraseSize(e,t){return t}}$a.IROM_MAP_START=1075838976,$a.IROM_MAP_END=1076887552;var Ka=Object.freeze({__proto__:null,ESP8266ROM:$a});const Ja=233;function Wa(e,t){return e+(t-1-e%t)}function ja(e,t){return e[t]|e[t+1]<<8|e[t+2]<<16|e[t+3]<<24}class Va{constructor(e,t,i=null,s=0){this.addr=e,this.data=t,this.fileOffs=i,this.flags=s,this.includeInChecksum=!0,0!==this.addr&&this.padToAlignment(4)}copyWithNewAddr(e){return new Va(e,this.data,0)}splitImage(e){const t=new Va(this.addr,this.data.slice(0,e),0);return this.data=this.data.slice(e),this.addr+=e,this.fileOffs=null,t}toString(){let e=`len 0x${this.data.length.toString(16).padStart(5,"0")} load 0x${this.addr.toString(16).padStart(8,"0")}`;return null!==this.fileOffs&&(e+=` file_offs 0x${this.fileOffs.toString(16).padStart(8,"0")}`),e}getMemoryType(e){return e.ROM_LOADER.MEMORY_MAP.filter(e=>e[0]<=this.addr&&this.addr<e[1]).map(e=>e[2])}padToAlignment(e){this.data=Ia(this.data,e,0)}}class Za extends Va{constructor(e,t,i,s){super(t,i,null,s),this.name=e}toString(){return`${this.name} ${super.toString()}`}}class Xa{constructor(e){this.SEG_HEADER_LEN=8,this.SHA256_DIGEST_LEN=32,this.ELF_FLAG_WRITE=1,this.ELF_FLAG_READ=2,this.ELF_FLAG_EXEC=4,this.segments=[],this.entrypoint=0,this.elfSha256=null,this.elfSha256Offset=0,this.padToSize=0,this.flashMode=0,this.flashSizeFreq=0,this.checksum=0,this.datalength=0,this.IROM_ALIGN=0,this.MMU_PAGE_SIZE_CONF=[],this.ROM_LOADER=e}loadCommonHeader(e,t,i){const s=e[t],o=e[t+1];if(this.flashMode=e[t+2],this.flashSizeFreq=e[t+3],this.entrypoint=ja(e,t+4),s!==i)throw new hs(`Invalid firmware image magic=0x${s.toString(16)}`);return o}verify(){if(this.segments.length>16)throw new hs(`Invalid segment count ${this.segments.length} (max 16). Usually this indicates a linker script problem.`)}loadSegment(e,t,i=!1){const s=t,o=ja(e,t),r=ja(e,t+4);this.warnIfUnusualSegment(o,r,i);const a=e.slice(t+8,t+8+r);if(a.length<r)throw new hs(`End of file reading segment 0x${o.toString(16)}, length ${r} (actual length ${a.length})`);const n=new Va(o,a,s);return this.segments.push(n),n}warnIfUnusualSegment(e,t,i){i||(e>1075838976||e<1073610752||t>65536)&&console.warn(`WARNING: Suspicious segment 0x${e.toString(16)}, length ${t}`)}maybePatchSegmentData(e,t){const i=e.length;if(this.elfSha256Offset>=t&&this.elfSha256Offset<t+i){const s=this.elfSha256Offset-t;if(s<this.SEG_HEADER_LEN||s+this.SHA256_DIGEST_LEN>i)throw new hs(`Cannot place SHA256 digest on segment boundary(elf_sha256_offset=${this.elfSha256Offset}, file_pos=${t}, segment_size=${i})`);const o=s-this.SEG_HEADER_LEN;if(!e.slice(o,o+this.SHA256_DIGEST_LEN).every(e=>0===e))throw new hs(`Contents of segment at SHA256 digest offset 0x${this.elfSha256Offset.toString(16)} are not all zero. Refusing to overwrite.`);if(!this.elfSha256||this.elfSha256.length!==this.SHA256_DIGEST_LEN)throw new hs("ELF SHA256 digest is not properly initialized");const r=e.slice(0,o),a=e.slice(o+this.SHA256_DIGEST_LEN),n=r.length+this.elfSha256.length+a.length,l=new Uint8Array(n);return l.set(r,0),l.set(this.elfSha256,r.length),l.set(a,r.length+this.elfSha256.length),l}return e}saveSegment(e,t,i,s=null){const o=this.maybePatchSegmentData(i.data,t),r=new DataView(e.buffer,t);return r.setUint32(0,i.addr,!0),r.setUint32(4,o.length,!0),e.set(o,t+8),null!==s?Da(o,s):0}saveFlashSegment(e,t,i,s=null){if("ESP32"===this.ROM_LOADER.CHIP_NAME){const e=(t+i.data.length+this.SEG_HEADER_LEN)%this.IROM_ALIGN;if(e<36){const t=new Uint8Array(i.data.length+(36-e));t.set(i.data),t.fill(0,i.data.length),i.data=t}}return this.saveSegment(e,t,i,s)}readChecksum(e,t){return e[Wa(t,16)]}calculateChecksum(){let e=239;for(const t of this.segments)t.includeInChecksum&&(e=Da(t.data,e));return e}appendChecksum(e,t,i){e[Wa(t,16)]=i}writeCommonHeader(e,t,i){e[t]=Ja,e[t+1]=i,e[t+2]=this.flashMode,e[t+3]=this.flashSizeFreq;new DataView(e.buffer,t+4).setUint32(0,this.entrypoint,!0)}isIromAddr(e){return $a.IROM_MAP_START<=e&&e<$a.IROM_MAP_END}getIromSegment(){const e=this.segments.filter(e=>this.isIromAddr(e.addr));if(e.length>0){if(1!==e.length)throw new hs(`Found ${e.length} segments that could be irom0. Bad ELF file?`);return e[0]}return null}getNonIromSegments(){const e=this.getIromSegment();return this.segments.filter(t=>t!==e)}sortSegments(){this.segments.length&&this.segments.sort((e,t)=>e.addr-t.addr)}mergeAdjacentSegments(){if(!this.segments.length)return;const e=[];for(let t=this.segments.length-1;t>0;t--){const i=this.segments[t-1],s=this.segments[t];if(i.getMemoryType(this).join(",")===s.getMemoryType(this).join(",")&&i.includeInChecksum===s.includeInChecksum&&s.addr===i.addr+i.data.length&&(s.flags&this.ELF_FLAG_EXEC)===(i.flags&this.ELF_FLAG_EXEC)){const e=new Uint8Array(i.data.length+s.data.length);e.set(i.data),e.set(s.data,i.data.length),i.data=e}else e.unshift(s)}e.unshift(this.segments[0]),this.segments=e}setMmuPageSize(e){if(this.MMU_PAGE_SIZE_CONF||e===this.IROM_ALIGN){if(this.MMU_PAGE_SIZE_CONF&&!this.MMU_PAGE_SIZE_CONF.includes(e)){const t=this.MMU_PAGE_SIZE_CONF.map(e=>e/1024+"KB").join(", ");throw new hs(`${e} bytes is not a valid ${this.ROM_LOADER.CHIP_NAME} page size, select from ${t}.`)}this.IROM_ALIGN=e}else console.warn(`WARNING: Changing MMU page size is not supported on ${this.ROM_LOADER.CHIP_NAME}! `+(0!==this.IROM_ALIGN?`Defaulting to ${this.IROM_ALIGN/1024}KB.`:""))}}class qa extends Xa{constructor(e,t=null,i=!0,s=!1){super(e),this.securePad=null,this.flashMode=0,this.flashSizeFreq=0,this.version=1,this.WP_PIN_DISABLED=238,this.wpPin=this.WP_PIN_DISABLED,this.clkDrv=0,this.qDrv=0,this.dDrv=0,this.csDrv=0,this.hdDrv=0,this.wpDrv=0,this.chipId=0,this.minRev=0,this.minRevFull=0,this.maxRevFull=0,this.storedDigest=null,this.calcDigest=null,this.dataLength=0,this.IROM_ALIGN=65536,this.ROM_LOADER=e,this.appendDigest=i,this.ramOnlyHeader=s,null!==t&&this.loadFromFile(t)}async loadFromFile(e){const t=e instanceof Uint8Array?e:Ma(e);let i=0;const s=this.loadCommonHeader(t,i,Ja);i+=8,this.loadExtendedHeader(t,i),i+=16;for(let e=0;e<s;e++){i+=8+this.loadSegment(t,i).data.length}if(this.checksum=this.readChecksum(t,i),i=Wa(i,16),this.appendDigest){const e=i;this.storedDigest=t.slice(i,i+this.SHA256_DIGEST_LEN);const s=await crypto.subtle.digest("SHA-256",t.slice(0,e));this.calcDigest=new Uint8Array(s),this.dataLength=e-0}this.verify()}isFlashAddr(e){return this.ROM_LOADER.IROM_MAP_START<=e&&e<this.ROM_LOADER.IROM_MAP_END||this.ROM_LOADER.DROM_MAP_START<=e&&e<this.ROM_LOADER.DROM_MAP_END}async save(){let e=0;const t=new Uint8Array(1048576);let i=0;this.writeCommonHeader(t,i,this.segments.length),i+=8,this.saveExtendedHeader(t,i),i+=16;let s=239;const o=this.segments.filter(e=>this.isFlashAddr(e.addr)).sort((e,t)=>e.addr-t.addr),r=this.segments.filter(e=>!this.isFlashAddr(e.addr)).sort((e,t)=>e.addr-t.addr);for(let e=0;e<o.length;e++){const t=o[e];if(t instanceof Za&&".flash.appdesc"===t.name){o.splice(e,1),o.unshift(t);break}}for(let e=0;e<r.length;e++){const t=r[e];if(t instanceof Za&&".dram0.bootdesc"===t.name){r.splice(e,1),r.unshift(t);break}}if(o.length>0){let e=o[0].addr;for(const t of o.slice(1)){if(Math.floor(t.addr/this.IROM_ALIGN)===Math.floor(e/this.IROM_ALIGN))throw new hs(`Segment loaded at 0x${t.addr.toString(16)} lands in same 64KB flash mapping as segment loaded at 0x${e.toString(16)}. Can't generate binary. Suggest changing linker script or ELF to merge sections.`);e=t.addr}}if(this.ramOnlyHeader){for(const o of r)s=this.saveSegment(t,i,o,s),i+=8+o.data.length,e++;this.appendChecksum(t,i,s),i=Wa(i,16);for(const r of o.reverse()){let o=this.getAlignmentDataNeeded(r,i);if(o>0){o<this.ROM_LOADER.BOOTLOADER_FLASH_OFFSET-this.SEG_HEADER_LEN&&(o+=this.IROM_ALIGN),o-=this.ROM_LOADER.BOOTLOADER_FLASH_OFFSET;const r=new Va(0,new Uint8Array(o).fill(0),i);s=this.saveSegment(t,i,r,s),i+=8+o,e++}this.saveFlashSegment(t,i,r),i+=8+r.data.length,e++}}else{for(;o.length>0;){const a=o[0],n=this.getAlignmentDataNeeded(a,i);if(n>0){if(r.length>0&&n>this.SEG_HEADER_LEN){const e=r[0].splitImage(n);0===r[0].data.length&&r.shift(),s=this.saveSegment(t,i,e,s)}else{const e=new Va(0,new Uint8Array(n).fill(0),i);s=this.saveSegment(t,i,e,s)}i+=8+n,e++}else{if((i+8)%this.IROM_ALIGN!==a.addr%this.IROM_ALIGN)throw new Error("Flash segment alignment mismatch");s=this.saveFlashSegment(t,i,a,s),o.shift(),i+=8+a.data.length,e++}}for(const o of r)s=this.saveSegment(t,i,o,s),i+=8+o.data.length,e++}if(this.securePad){if(!this.appendDigest)throw new Error("secure_pad only applies if a SHA-256 digest is also appended to the image");const o=(i+this.SEG_HEADER_LEN)%this.IROM_ALIGN,r=16;let a=0;"1"===this.securePad?a=112:"2"===this.securePad&&(a=32);const n=(this.IROM_ALIGN-o-r-a)%this.IROM_ALIGN,l=new Va(0,new Uint8Array(n).fill(0),i);s=this.saveSegment(t,i,l,s),i+=8+n,e++}this.ramOnlyHeader||(this.appendChecksum(t,i,s),i=Wa(i,16));const a=i;if(this.ramOnlyHeader?t[1]=r.length:t[1]=e,this.appendDigest){const e=await crypto.subtle.digest("SHA-256",t.slice(0,a)),s=new Uint8Array(e);t.set(s,a),i+=32}if(this.padToSize&&i%this.padToSize!==0){const e=this.padToSize-i%this.padToSize,s=new Uint8Array(e);s.fill(255),t.set(s,i),i+=e}return t}loadExtendedHeader(e,t){const i=new DataView(e.buffer,t);this.wpPin=i.getUint8(0);const s=i.getUint8(1);[this.clkDrv,this.qDrv]=this.splitByte(s);const o=i.getUint8(2);[this.dDrv,this.csDrv]=this.splitByte(o);const r=i.getUint8(3);[this.hdDrv,this.wpDrv]=this.splitByte(r),this.chipId=i.getUint8(4),this.chipId!==this.ROM_LOADER.IMAGE_CHIP_ID&&console.warn(`Unexpected chip id in image. Expected ${this.ROM_LOADER.IMAGE_CHIP_ID} but value was ${this.chipId}. Is this image for a different chip model?`),this.minRev=i.getUint8(5),this.minRevFull=i.getUint16(6,!0),this.maxRevFull=i.getUint16(8,!0);const a=i.getUint8(15);if(0!==a&&1!==a)throw new Error(`Invalid value for append_digest field (0x${a.toString(16)}). Should be 0 or 1.`);this.appendDigest=1===a}saveExtendedHeader(e,t){const i=new ArrayBuffer(16),s=new DataView(i);s.setUint8(0,this.wpPin),s.setUint8(1,this.joinByte(this.clkDrv,this.qDrv)),s.setUint8(2,this.joinByte(this.dDrv,this.csDrv)),s.setUint8(3,this.joinByte(this.hdDrv,this.wpDrv)),s.setUint8(4,this.ROM_LOADER.IMAGE_CHIP_ID),s.setUint8(5,this.minRev),s.setUint16(6,this.minRevFull,!0),s.setUint16(8,this.maxRevFull,!0);for(let e=9;e<15;e++)s.setUint8(e,0);s.setUint8(15,this.appendDigest?1:0),e.set(new Uint8Array(i),t)}splitByte(e){return[15&e,e>>4&15]}joinByte(e,t){return 15&e|(15&t)<<4}getAlignmentDataNeeded(e,t){const i=e.addr%this.IROM_ALIGN-this.SEG_HEADER_LEN;let s=this.IROM_ALIGN-t%this.IROM_ALIGN+i;return 0===s||s===this.IROM_ALIGN?0:(s-=this.SEG_HEADER_LEN,s<0&&(s+=this.IROM_ALIGN),s)}}class en extends Xa{constructor(e,t=null){super(e),this.version=1,this.ROM_LOADER=e,this.flashMode=0,this.flashSizeFreq=0,null!==t&&this.loadFromFile(t)}loadFromFile(e){const t=e instanceof Uint8Array?e:Ma(e);let i=0;const s=this.loadCommonHeader(t,i,Ja);i+=8;for(let e=0;e<s;e++){i+=8+this.loadSegment(t,i).data.length}this.checksum=this.readChecksum(t,i),this.verify()}defaultOutputName(e){return e+"-"}}class tn extends Xa{constructor(e,t=null){super(e),this.version=2,this.ROM_LOADER=e,this.flashMode=0,this.flashSizeFreq=0,null!==t&&this.loadFromFile(t)}async loadFromFile(e){const t=e instanceof Uint8Array?e:Ma(e);let i=0;const s=this.loadCommonHeader(t,i,tn.IMAGE_V2_MAGIC);i+=8,s!==tn.IMAGE_V2_SEGMENT&&console.warn(`Warning: V2 header has unexpected "segment" count ${s} (usually 4)`);const o=this.flashMode,r=this.flashSizeFreq,a=this.entrypoint,n=this.loadSegment(t,i,!0);n.addr=0,n.includeInChecksum=!1,i+=8+n.data.length;const l=this.loadCommonHeader(t,i,Ja);i+=8,o!==this.flashMode&&console.warn(`WARNING: Flash mode value in first header (0x${o.toString(16)}) disagrees with second (0x${this.flashMode.toString(16)}). Using second value.`),r!==this.flashSizeFreq&&console.warn(`WARNING: Flash size/freq value in first header (0x${r.toString(16)}) disagrees with second (0x${this.flashSizeFreq.toString(16)}). Using second value.`),a!==this.entrypoint&&console.warn(`WARNING: Entrypoint address in first header (0x${a.toString(16)}) disagrees with second header (0x${this.entrypoint.toString(16)}). Using second value.`);for(let e=0;e<l;e++){i+=8+this.loadSegment(t,i).data.length}this.checksum=this.readChecksum(t,i),this.verify()}defaultOutputName(e){const t=this.getIromSegment();let i=0;null!==t&&(i=t.addr-$a.IROM_MAP_START);return`${e.replace(/\.[^/.]+$/,"")}-0x${(-4096&i).toString(16).padStart(5,"0")}.bin`}}tn.IMAGE_V2_MAGIC=234,tn.IMAGE_V2_SEGMENT=4;class sn extends qa{constructor(e,t=null,i=!0,s=!1){super(e,t,i,s),this.ROM_LOADER=e}}class on extends qa{constructor(e,t=null,i=!0,s=!1){super(e,t,i,s),this.ROM_LOADER=e}}class rn extends qa{constructor(e,t=null,i=!0,s=!1){super(e,t,i,s),this.ROM_LOADER=e}}class an extends qa{constructor(e,t=null,i=!0,s=!1){super(e,t,i,s),this.MMU_PAGE_SIZE_CONF=[16384,32768,65536],this.ROM_LOADER=e}}class nn extends qa{constructor(e,t=null,i=!0,s=!1){super(e,t,i,s),this.MMU_PAGE_SIZE_CONF=[8192,16384,32768,65536],this.ROM_LOADER=e}}class ln extends nn{constructor(e,t=null,i=!0,s=!1){super(e,t,i,s),this.ROM_LOADER=e}}class cn extends qa{constructor(e,t=null,i=!0,s=!1){super(e,t,i,s),this.ROM_LOADER=e}}class hn extends qa{constructor(e,t=null,i=!0,s=!1){super(e,t,i,s),this.ROM_LOADER=e}}class dn extends nn{constructor(e,t=null,i=!0,s=!1){super(e,t,i,s),this.ROM_LOADER=e}}async function An(e,t){const i=t instanceof Uint8Array?t:Ma(t),s=e.CHIP_NAME.toLowerCase().replace(/[-()]/g,"");let o;if("esp8266"!==s)switch(s){case"esp32":o=qa;break;case"esp32s2":o=sn;break;case"esp32s3":o=on;break;case"esp32c3":o=rn;break;case"esp32c2":o=an;break;case"esp32c6":o=nn;break;case"esp32c61":o=ln;break;case"esp32c5":o=cn;break;case"esp32h2":o=dn;break;case"esp32p4":o=hn;break;default:throw new hs(`Unsupported chip name: ${s}`)}else{const e=i[0];if(e===Ja)o=en;else{if(e!==tn.IMAGE_V2_MAGIC)throw new hs(`Invalid image magic number: ${e}`);o=tn}}const r=new o(e),a=r;if("function"==typeof a.loadFromFile){const e=a.loadFromFile(i);e instanceof Promise&&await e}return r}class gn{constructor(e){var t,i,s,o,r,a,n,l;this.ESP_RAM_BLOCK=6144,this.ESP_FLASH_BEGIN=2,this.ESP_FLASH_DATA=3,this.ESP_FLASH_END=4,this.ESP_MEM_BEGIN=5,this.ESP_MEM_END=6,this.ESP_MEM_DATA=7,this.ESP_WRITE_REG=9,this.ESP_READ_REG=10,this.ESP_SPI_ATTACH=13,this.ESP_CHANGE_BAUDRATE=15,this.ESP_FLASH_DEFL_BEGIN=16,this.ESP_FLASH_DEFL_DATA=17,this.ESP_FLASH_DEFL_END=18,this.ESP_SPI_FLASH_MD5=19,this.ESP_ERASE_FLASH=208,this.ESP_ERASE_REGION=209,this.ESP_READ_FLASH=210,this.ESP_RUN_USER_CODE=211,this.ESP_IMAGE_MAGIC=233,this.ESP_CHECKSUM_MAGIC=239,this.ROM_INVALID_RECV_MSG=5,this.DEFAULT_TIMEOUT=3e3,this.ERASE_REGION_TIMEOUT_PER_MB=3e4,this.ERASE_WRITE_TIMEOUT_PER_MB=4e4,this.MD5_TIMEOUT_PER_MB=8e3,this.CHIP_ERASE_TIMEOUT=12e4,this.FLASH_READ_TIMEOUT=1e5,this.MAX_TIMEOUT=2*this.CHIP_ERASE_TIMEOUT,this.SPI_ADDR_REG_MSB=!0,this.CHIP_DETECT_MAGIC_REG_ADDR=1073745920,this.DETECTED_FLASH_SIZES={18:"256KB",19:"512KB",20:"1MB",21:"2MB",22:"4MB",23:"8MB",24:"16MB",25:"32MB",26:"64MB",27:"128MB",28:"256MB",32:"64MB",33:"128MB",34:"256MB",50:"256KB",51:"512KB",52:"1MB",53:"2MB",54:"4MB",55:"8MB",56:"16MB",57:"32MB",58:"64MB"},this.USB_JTAG_SERIAL_PID=4097,this.romBaudrate=115200,this.debugLogging=!1,this.syncStubDetected=!1,this.IS_STUB=!1,this.FLASH_WRITE_SIZE=16384,this.transport=e.transport,this.baudrate=e.baudrate,this.resetConstructors={classicReset:(e,t)=>new Fa(e,t),customReset:(e,t)=>new Qa(e,t),hardReset:(e,t)=>new Ua(e,t),usbJTAGSerialReset:e=>new Pa(e)},e.serialOptions&&(this.serialOptions=e.serialOptions),e.terminal&&(this.terminal=e.terminal,this.terminal.clean()),void 0!==e.debugLogging&&(this.debugLogging=e.debugLogging),e.port&&(this.transport=new Ra(e.port)),void 0!==e.enableTracing&&(this.transport.tracing=e.enableTracing),(null===(t=e.resetConstructors)||void 0===t?void 0:t.classicReset)&&(this.resetConstructors.classicReset=null===(i=e.resetConstructors)||void 0===i?void 0:i.classicReset),(null===(s=e.resetConstructors)||void 0===s?void 0:s.customReset)&&(this.resetConstructors.customReset=null===(o=e.resetConstructors)||void 0===o?void 0:o.customReset),(null===(r=e.resetConstructors)||void 0===r?void 0:r.hardReset)&&(this.resetConstructors.hardReset=null===(a=e.resetConstructors)||void 0===a?void 0:a.hardReset),(null===(n=e.resetConstructors)||void 0===n?void 0:n.usbJTAGSerialReset)&&(this.resetConstructors.usbJTAGSerialReset=null===(l=e.resetConstructors)||void 0===l?void 0:l.usbJTAGSerialReset),this.info("esptool.js"),this.info("Serial port "+this.transport.getInfo())}write(e,t=!0){this.terminal?t?this.terminal.writeLine(e):this.terminal.write(e):console.log(e)}error(e,t=!0){this.write(`Error: ${e}`,t)}info(e,t=!0){this.write(e,t)}debug(e,t=!0){this.debugLogging&&this.write(`Debug: ${e}`,t)}_shortToBytearray(e){return new Uint8Array([255&e,e>>8&255])}_intToByteArray(e){return new Uint8Array([255&e,e>>8&255,e>>16&255,e>>24&255])}_byteArrayToShort(e,t){return e|t>>8}_byteArrayToInt(e,t,i,s){return e|t<<8|i<<16|s<<24}_appendBuffer(e,t){const i=new Uint8Array(e.byteLength+t.byteLength);return i.set(new Uint8Array(e),0),i.set(new Uint8Array(t),e.byteLength),i.buffer}_appendArray(e,t){const i=new Uint8Array(e.length+t.length);return i.set(e,0),i.set(t,e.length),i}ui8ToBstr(e){let t="";for(let i=0;i<e.length;i++)t+=String.fromCharCode(e[i]);return t}bstrToUi8(e){const t=new Uint8Array(e.length);for(let i=0;i<e.length;i++)t[i]=e.charCodeAt(i);return t}async readPacket(e=null,t=this.DEFAULT_TIMEOUT){for(let i=0;i<100;i++){const i=await this.transport.read(t);if(!i||i.length<8)continue;const s=i[0];if(1!==s)continue;const o=i[1],r=this._byteArrayToInt(i[4],i[5],i[6],i[7]),a=i.slice(8);if(1==s){if(null==e||o==e)return[r,a];if(0!=a[0]&&a[1]==this.ROM_INVALID_RECV_MSG)throw this.transport.flushInput(),new hs("unsupported command error")}}throw new hs("invalid response")}async command(e=null,t=new Uint8Array(0),i=0,s=!0,o=this.DEFAULT_TIMEOUT){if(null!=e){this.transport.tracing&&this.transport.trace(`command op:0x${e.toString(16).padStart(2,"0")} data len=${t.length} wait_response=${s?1:0} timeout=${(o/1e3).toFixed(3)} data=${this.transport.hexConvert(t)}`);const r=new Uint8Array(8+t.length);let a;for(r[0]=0,r[1]=e,r[2]=this._shortToBytearray(t.length)[0],r[3]=this._shortToBytearray(t.length)[1],r[4]=this._intToByteArray(i)[0],r[5]=this._intToByteArray(i)[1],r[6]=this._intToByteArray(i)[2],r[7]=this._intToByteArray(i)[3],a=0;a<t.length;a++)r[8+a]=t[a];await this.transport.write(r)}return s?this.readPacket(e,o):[0,new Uint8Array(0)]}async readReg(e,t=this.DEFAULT_TIMEOUT){this.debug(`Read Register:${this.toHex(e)}`);const i=this._intToByteArray(e),s=await this.command(this.ESP_READ_REG,i,void 0,void 0,t);return this.debug(`Read Register Value:${s[0]}`),s[0]}async writeReg(e,t,i=4294967295,s=0,o=0){let r=this._appendArray(this._intToByteArray(e),this._intToByteArray(t));r=this._appendArray(r,this._intToByteArray(i)),r=this._appendArray(r,this._intToByteArray(s)),o>0&&(r=this._appendArray(r,this._intToByteArray(this.chip.UART_DATE_REG_ADDR)),r=this._appendArray(r,this._intToByteArray(0)),r=this._appendArray(r,this._intToByteArray(0)),r=this._appendArray(r,this._intToByteArray(o))),await this.checkCommand("write target memory",this.ESP_WRITE_REG,r)}async sync(){this.debug("Sync");const e=new Uint8Array(36);let t;for(e[0]=7,e[1]=7,e[2]=18,e[3]=32,t=0;t<32;t++)e[4+t]=85;try{let t=await this.command(8,e,void 0,void 0,100);this.syncStubDetected=0===t[0];for(let e=0;e<7;e++)t=await this.readPacket(8,100),this.syncStubDetected=this.syncStubDetected&&0===t[0];return t}catch(e){throw this.debug("Sync err "+e),e}}async _connectAttempt(e="default_reset",t){this.debug("_connect_attempt "+e),t&&await t.reset();const i=this.transport.peek(),s=Array.from(i,e=>String.fromCharCode(e)).join("").match(/boot:(0x[0-9a-fA-F]+)([\s\S]*?waiting for download)?/);let o=!1,r="",a=!1;s&&(o=!0,r=s[1],a=!!s[2]),this.debug(`bootMode:${r} downloadMode:${a}`);let n="";for(let e=0;e<5;e++)try{this.debug(`Sync connect attempt ${e}`),this.transport.flushInput();const t=await this.sync();return this.debug(t[0].toString()),"success"}catch(e){this.debug(`Error at sync ${e}`),n=e instanceof Error?e.message:"string"==typeof e?e:JSON.stringify(e)}return o&&(n=`Wrong boot mode detected (${r}).\n        This chip needs to be in download mode.`,a&&(n="Download mode successfully detected, but getting no sync reply:\n           The serial TX path seems to be down.")),n}constructResetSequence(e){if("no_reset"!==e)if("usb_reset"===e||this.transport.getPid()===this.USB_JTAG_SERIAL_PID){if(this.resetConstructors.usbJTAGSerialReset)return this.debug("using USB JTAG Serial Reset"),[this.resetConstructors.usbJTAGSerialReset(this.transport)]}else{const e=50,t=e+500;if(this.resetConstructors.classicReset)return this.debug("using Classic Serial Reset"),[this.resetConstructors.classicReset(this.transport,e),this.resetConstructors.classicReset(this.transport,t)]}return[]}async connect(e="default_reset",t=7,i=!0){let s;this.info("Connecting...",!1),await this.transport.connect(this.romBaudrate,this.serialOptions),this.transport.readLoop();const o=this.constructResetSequence(e);for(let i=0;i<t;i++){const t=o.length>0?o[i%o.length]:null;if(s=await this._connectAttempt(e,t),"success"===s)break}if("success"!==s)throw new hs("Failed to connect with the device");if(this.debug("Connect attempt successful."),this.info("\n\r",!1),i){const e=await this.readReg(this.CHIP_DETECT_MAGIC_REG_ADDR)>>>0;this.debug("Chip Magic "+e.toString(16));const t=await async function(e){switch(e){case 15736195:{const{ESP32ROM:e}=await Promise.resolve().then(function(){return hc});return new e}case 203546735:case 1867591791:case 2084675695:{const{ESP32C2ROM:e}=await Promise.resolve().then(function(){return gc});return new e}case 1763790959:case 456216687:case 1216438383:case 1130455151:{const{ESP32C3ROM:e}=await Promise.resolve().then(function(){return Ac});return new e}case 752910447:{const{ESP32C6ROM:e}=await Promise.resolve().then(function(){return pc});return new e}case 606167151:case 871374959:case 1333878895:{const{ESP32C61ROM:e}=await Promise.resolve().then(function(){return _c});return new e}case 285294703:case 1675706479:case 1607549039:{const{ESP32C5ROM:e}=await Promise.resolve().then(function(){return fc});return new e}case 3619110528:case 2548236392:{const{ESP32H2ROM:e}=await Promise.resolve().then(function(){return wc});return new e}case 9:{const{ESP32S3ROM:e}=await Promise.resolve().then(function(){return Ec});return new e}case 1990:{const{ESP32S2ROM:e}=await Promise.resolve().then(function(){return mc});return new e}case 4293968129:{const{ESP8266ROM:e}=await Promise.resolve().then(function(){return Ka});return new e}case 0:case 182303440:case 117676761:{const{ESP32P4ROM:e}=await Promise.resolve().then(function(){return bc});return new e}default:return null}}(e);if(null===typeof this.chip)throw new hs(`Unexpected CHIP magic value ${e}. Failed to autodetect chip type.`);this.chip=t}}async detectChip(e="default_reset"){await this.connect(e),this.info("Detecting chip type... ",!1),null!=this.chip?this.info(this.chip.CHIP_NAME):this.info("unknown!")}async checkCommand(e="",t=null,i=new Uint8Array(0),s=0,o=0,r=this.DEFAULT_TIMEOUT){this.debug("check_command "+e);const a=await this.command(t,i,s,void 0,r);if(a&&a[1]&&a[1].length<o+2){const t=a[1].slice(0,2);throw 0!==t[0]?new hs(`Failed to ${e} failed with status ${t}`):new hs(`Failed to ${e}.\n Only got ${a[1].length} bytes of data.`)}const n=a[1].slice(o,o+2);if(0!==n[0])throw new hs(`Failed to ${e} failed with status ${n}`);return o>0?a[1].slice(0,o):a[0]}async memBegin(e,t,i,s){if(this.IS_STUB){const t=s,i=s+e,o=this.chip.getChipRevision?await this.chip.getChipRevision(this):void 0,r=await La(this.chip.CHIP_NAME,o);if(r){const e=[[r.bss_start||r.data_start,r.data_start+r.decodedData.length],[r.text_start,r.text_start+r.decodedText.length]];for(const[s,o]of e)if(t<o&&i>s)throw new hs(`Software loader is resident at 0x${s.toString(16).padStart(8,"0")}-0x${o.toString(16).padStart(8,"0")}.\n            Can't load binary at overlapping address range 0x${t.toString(16).padStart(8,"0")}-0x${i.toString(16).padStart(8,"0")}.\n            Either change binary loading address, or use the no-stub option to disable the software loader.`)}}this.debug("mem_begin "+e+" "+t+" "+i+" "+s.toString(16));let o=this._appendArray(this._intToByteArray(e),this._intToByteArray(t));o=this._appendArray(o,this._intToByteArray(i)),o=this._appendArray(o,this._intToByteArray(s)),await this.checkCommand("enter RAM download mode",this.ESP_MEM_BEGIN,o)}checksum(e,t=this.ESP_CHECKSUM_MAGIC){for(let i=0;i<e.length;i++)t^=e[i];return t}async memBlock(e,t){let i=this._appendArray(this._intToByteArray(e.length),this._intToByteArray(t));i=this._appendArray(i,this._intToByteArray(0)),i=this._appendArray(i,this._intToByteArray(0)),i=this._appendArray(i,e);const s=this.checksum(e);await this.checkCommand("write to target RAM",this.ESP_MEM_DATA,i,s)}async memFinish(e){const t=0===e?1:0,i=this._appendArray(this._intToByteArray(t),this._intToByteArray(e));await this.checkCommand("leave RAM download mode",this.ESP_MEM_END,i,void 0,void 0,200)}async flashSpiAttach(e){const t=this._intToByteArray(e);await this.checkCommand("configure SPI flash pins",this.ESP_SPI_ATTACH,t)}timeoutPerMb(e,t){const i=e*(t/1e6);return i<3e3?3e3:i}async flashBegin(e,t){const i=Math.floor((e+this.FLASH_WRITE_SIZE-1)/this.FLASH_WRITE_SIZE),s=this.chip.getEraseSize(t,e),o=new Date,r=o.getTime();let a=3e3;0==this.IS_STUB&&(a=this.timeoutPerMb(this.ERASE_REGION_TIMEOUT_PER_MB,e)),this.debug("flash begin "+s+" "+i+" "+this.FLASH_WRITE_SIZE+" "+t+" "+e);let n=this._appendArray(this._intToByteArray(s),this._intToByteArray(i));n=this._appendArray(n,this._intToByteArray(this.FLASH_WRITE_SIZE)),n=this._appendArray(n,this._intToByteArray(t)),0==this.IS_STUB&&(n=this._appendArray(n,this._intToByteArray(0))),await this.checkCommand("enter Flash download mode",this.ESP_FLASH_BEGIN,n,void 0,void 0,a);const l=o.getTime();return 0!=e&&0==this.IS_STUB&&this.info("Took "+(l-r)/1e3+"."+(l-r)%1e3+"s to erase flash block"),i}async flashDeflBegin(e,t,i){const s=Math.floor((t+this.FLASH_WRITE_SIZE-1)/this.FLASH_WRITE_SIZE),o=Math.floor((e+this.FLASH_WRITE_SIZE-1)/this.FLASH_WRITE_SIZE),r=new Date,a=r.getTime();let n,l;this.IS_STUB?(n=e,l=this.DEFAULT_TIMEOUT):(n=o*this.FLASH_WRITE_SIZE,l=this.timeoutPerMb(this.ERASE_REGION_TIMEOUT_PER_MB,n)),this.info("Compressed "+e+" bytes to "+t+"...");let c=this._appendArray(this._intToByteArray(n),this._intToByteArray(s));c=this._appendArray(c,this._intToByteArray(this.FLASH_WRITE_SIZE)),c=this._appendArray(c,this._intToByteArray(i)),"ESP32-S2"!==this.chip.CHIP_NAME&&"ESP32-S3"!==this.chip.CHIP_NAME&&"ESP32-C3"!==this.chip.CHIP_NAME&&"ESP32-C2"!==this.chip.CHIP_NAME||!1!==this.IS_STUB||(c=this._appendArray(c,this._intToByteArray(0))),await this.checkCommand("enter compressed flash mode",this.ESP_FLASH_DEFL_BEGIN,c,void 0,void 0,l);const h=r.getTime();return 0!=e&&!1===this.IS_STUB&&this.info("Took "+(h-a)/1e3+"."+(h-a)%1e3+"s to erase flash block"),s}async flashBlock(e,t,i){let s=this._appendArray(this._intToByteArray(e.length),this._intToByteArray(t));s=this._appendArray(s,this._intToByteArray(0)),s=this._appendArray(s,this._intToByteArray(0)),s=this._appendArray(s,e);const o=this.checksum(e);await this.checkCommand("write to target Flash after seq "+t,this.ESP_FLASH_DATA,s,o,void 0,i)}async flashDeflBlock(e,t,i){let s=this._appendArray(this._intToByteArray(e.length),this._intToByteArray(t));s=this._appendArray(s,this._intToByteArray(0)),s=this._appendArray(s,this._intToByteArray(0)),s=this._appendArray(s,e);const o=this.checksum(e);this.debug("flash_defl_block "+e[0].toString(16)+" "+e[1].toString(16)),await this.checkCommand("write compressed data to flash after seq "+t,this.ESP_FLASH_DEFL_DATA,s,o,void 0,i)}async flashFinish(e=!1,t=this.DEFAULT_TIMEOUT){const i=e?0:1,s=this._intToByteArray(i);await this.checkCommand("leave Flash mode",this.ESP_FLASH_END,s,void 0,void 0,t)}async flashDeflFinish(e=!1,t=this.DEFAULT_TIMEOUT){const i=e?0:1,s=this._intToByteArray(i);await this.checkCommand("leave compressed flash mode",this.ESP_FLASH_DEFL_END,s,void 0,void 0,t)}async runSpiflashCommand(e,t,i,s=null,o=0,r=0){const a=1<<30,n=this.chip.SPI_REG_BASE,l=n+0,c=n+4,h=n+this.chip.SPI_USR_OFFS,d=n+this.chip.SPI_USR1_OFFS,A=n+this.chip.SPI_USR2_OFFS,g=n+this.chip.SPI_W0_OFFS;let u;u=null!=this.chip.SPI_MOSI_DLEN_OFFS?async(e,t)=>{const i=n+this.chip.SPI_MOSI_DLEN_OFFS,s=n+this.chip.SPI_MISO_DLEN_OFFS;e>0&&await this.writeReg(i,e-1),t>0&&await this.writeReg(s,t-1);let a=0;r>0&&(a|=r-1),o>0&&(a|=o-1<<_),a&&await this.writeReg(d,a)}:async(e,t)=>{const i=d;let s=(0===t?0:t-1)<<8|(0===e?0:e-1)<<17;r>0&&(s|=r-1),o>0&&(s|=o-1<<_),await this.writeReg(i,s)};const p=1<<18,_=26;if(i>32)throw new hs("Reading more than 32 bits back from a SPI flash operation is unsupported");if(t.length>64)throw new hs("Writing more than 64 bytes of data with one SPI command is unsupported");const f=8*t.length,w=await this.readReg(h),E=await this.readReg(A);let m=1<<31;i>0&&(m|=268435456),f>0&&(m|=134217728),o>0&&(m|=a),r>0&&(m|=536870912),await u(f,i),await this.writeReg(h,m);let b,y=7<<28|e;if(await this.writeReg(A,y),s&&o>0&&(this.SPI_ADDR_REG_MSB&&(s<<=32-o),await this.writeReg(c,s)),0==f)await this.writeReg(g,0);else{t=Ia(t,4,0);const e=[];for(let i=0;i<t.length;i+=4)e.push((t[i]|t[i+1]<<8|t[i+2]<<16|t[i+3]<<24)>>>0);let i=g;for(const t of e)await this.writeReg(i,t),i+=4}for(await this.writeReg(l,p),b=0;b<10&&(y=await this.readReg(l)&p,0!=y);b++);if(10===b)throw new hs("SPI command did not complete in time");const v=await this.readReg(g);return await this.writeReg(h,w),await this.writeReg(A,E),v}async readFlashId(){const e=new Uint8Array(0);return await this.runSpiflashCommand(159,e,24)}async eraseFlash(){this.info("Erasing flash (this may take a while)...");let e=new Date;const t=e.getTime(),i=await this.checkCommand("erase flash",this.ESP_ERASE_FLASH,void 0,void 0,void 0,this.CHIP_ERASE_TIMEOUT);e=new Date;const s=e.getTime();return this.info("Chip erase completed successfully in "+(s-t)/1e3+"s"),i}toHex(e){return Array.prototype.map.call(e,e=>("00"+e.toString(16)).slice(-2)).join("")}async flashMd5sum(e,t){const i=this.timeoutPerMb(this.MD5_TIMEOUT_PER_MB,t);let s=this._appendArray(this._intToByteArray(e),this._intToByteArray(t));s=this._appendArray(s,this._intToByteArray(0)),s=this._appendArray(s,this._intToByteArray(0));const o=this.IS_STUB?16:32,r=await this.checkCommand("calculate md5sum",this.ESP_SPI_FLASH_MD5,s,void 0,o,i);return this.toHex(r)}async readFlash(e,t,i=null){let s=this._appendArray(this._intToByteArray(e),this._intToByteArray(t));s=this._appendArray(s,this._intToByteArray(4096)),s=this._appendArray(s,this._intToByteArray(1024));const o=await this.checkCommand("read flash",this.ESP_READ_FLASH,s);if(0!=o)throw new hs("Failed to read memory: "+o);let r=new Uint8Array(0);for(;r.length<t;){const e=await this.transport.read(this.FLASH_READ_TIMEOUT);if(!(e instanceof Uint8Array))throw new hs("Failed to read memory: "+e);e.length>0&&(r=this._appendArray(r,e),await this.transport.write(this._intToByteArray(r.length)),i&&i(e,r.length,t))}return r}async runStub(){if(this.syncStubDetected)return this.info("Stub is already running. No upload is necessary."),this.chip;this.info("Uploading stub...");const e=this.chip.getChipRevision?await this.chip.getChipRevision(this):void 0,t=await La(this.chip.CHIP_NAME,e);if(void 0===t)throw this.debug("Error loading Stub json"),new Error("Error loading Stub json");const i=[t.decodedText,t.decodedData];for(let e=0;e<i.length;e++)if(i[e]){const s=0===e?t.text_start:t.data_start,o=i[e].length,r=Math.floor((o+this.ESP_RAM_BLOCK-1)/this.ESP_RAM_BLOCK);await this.memBegin(o,r,this.ESP_RAM_BLOCK,s);for(let t=0;t<r;t++){const s=t*this.ESP_RAM_BLOCK,o=s+this.ESP_RAM_BLOCK;await this.memBlock(i[e].slice(s,o),t)}}this.info("Running stub..."),await this.memFinish(t.entry);const s=await this.transport.read(this.DEFAULT_TIMEOUT),o=String.fromCharCode(...s);if("OHAI"!==o)throw new hs(`Failed to start stub. Unexpected response ${o}`);return this.info("Stub running..."),this.IS_STUB=!0,this.chip}async changeBaud(){this.info("Changing baudrate to "+this.baudrate);const e=this.IS_STUB?this.romBaudrate:0,t=this._appendArray(this._intToByteArray(this.baudrate),this._intToByteArray(e));await this.command(this.ESP_CHANGE_BAUDRATE,t),this.info("Changed"),this.info("If the chip does not respond to any further commands, consider using a lower baud rate."),await ka(50),await this.transport.disconnect(),await ka(50),await this.transport.connect(this.baudrate,this.serialOptions),await ka(50),this.transport.readLoop()}async main(e="default_reset"){await this.detectChip(e);const t=await this.chip.getChipDescription(this);if(this.chip.getChipRevision){const e=await this.chip.getChipRevision(this);this.info("Chip Revision: "+e)}this.info("Chip is "+t),this.info("Features: "+await this.chip.getChipFeatures(this)),this.info("Crystal is "+await this.chip.getCrystalFreq(this)+"MHz"),this.info("MAC: "+await this.chip.readMac(this)),await this.chip.readMac(this),void 0!==this.chip.postConnect&&await this.chip.postConnect(this),await this.runStub(),this.romBaudrate!==this.baudrate&&await this.changeBaud();try{const e=await this.readFlashId();this.info("Flash ID: "+e.toString(16)),16777215!==e&&0!==e||this.info("WARNING: Failed to communicate with the flash chip,\nread/write operations will fail.\nTry checking the chip connections or removing\nany other hardware connected to IOs.")}catch(e){throw new hs("Unable to verify flash chip connection "+e)}return t}flashSizeBytes(e){let t=-1;return this.transport.trace(`Flash size string ${e}`),-1!==e.toString().indexOf("KB")?t=1024*parseInt(e.toString().slice(0,e.toString().indexOf("KB"))):-1!==e.toString().indexOf("MB")&&(t=1024*parseInt(e.toString().slice(0,e.toString().indexOf("MB")))*1024),this.transport.trace(`Flash size in bytes ${t}`),t}parseFlashSizeArg(e){if(void 0===this.chip.FLASH_SIZES[e])throw new hs("Flash size "+e+" is not supported by this chip type. Supported sizes: "+this.chip.FLASH_SIZES);return this.chip.FLASH_SIZES[e]}async _updateImageFlashParams(e,t,i="keep",s="keep",o="keep"){if(this.debug(`_update_image_flash_params ${o} ${i} ${s}`),e.length<8)return e;if(t!=this.chip.BOOTLOADER_FLASH_OFFSET)return e;if("keep"===o&&"keep"===i&&"keep"===s)return this.info("Not changing the image"),e;const r=e[0];let a=e[2];const n=e[3];if(r!==this.ESP_IMAGE_MAGIC)return this.info("Warning: Image file at 0x"+t.toString(16)+" doesn't look like an image file, so not changing any flash settings."),e;try{(await An(this.chip,e)).verify()}catch(i){return this.debug(`Warning: Image file at 0x${t.toString(16)} is not a valid ${this.chip.CHIP_NAME} image, so not changing any flash settings.`),e}const l="ESP8266"!==this.chip.CHIP_NAME&&49===e[23];if("keep"!==i){a={qio:0,qout:1,dio:2,dout:3}[i]}let c=15&n;if("keep"!==s){c={"40m":0,"26m":1,"20m":2,"80m":15}[s]}let h=240&n;if("keep"!==o)if("detect"===o){this.info("Configuring flash size...");const e=await this.detectFlashSize();this.info("Detected flash size set to "+e),h=this.parseFlashSizeArg(e)}else h=this.parseFlashSizeArg(o);const d=a<<8|c+h;this.info("Flash params set to "+d.toString(16));const A=new Uint8Array(e);if(e[2]!==a&&(A[2]=a),e[3]!==c+h&&(A[3]=c+h),l){const e=await An(this.chip,A),t=A.slice(0,e.datalength),i=A.slice(e.datalength+e.SHA256_DIGEST_LEN),s=await crypto.subtle.digest("SHA-256",i),o=new Uint8Array(s),r=new Uint8Array(t.length+o.length+i.length);r.set(t,0),r.set(o,t.length),r.set(i,t.length+o.length);const a=r.slice(e.datalength,e.datalength+e.SHA256_DIGEST_LEN);return this.transport.hexify(o)===this.transport.hexify(a)?this.info("SHA digest in image updated"):this.info(`WARNING: SHA recalculation for binary failed!\n\tExpected calculated SHA: ${this.transport.hexify(o)}\n\tSHA stored in binary:    ${this.transport.hexify(a)}`),r}return A}async writeFlash(e){if(this.debug("EspLoader program"),"keep"!==e.flashSize){const t=this.flashSizeBytes(e.flashSize);for(let i=0;i<e.fileArray.length;i++)if(e.fileArray[i].data.length+e.fileArray[i].address>t)throw new hs(`File ${i+1} doesn't fit in the available flash`)}let t,i;!0===this.IS_STUB&&!0===e.eraseAll&&await this.eraseFlash();for(let s=0;s<e.fileArray.length;s++){if(this.debug("Data Length "+e.fileArray[s].data.length),t=e.fileArray[s].data,this.debug("Image Length "+t.length),0===t.length){this.debug("Warning: File is empty");continue}t=Ia(t,4),i=e.fileArray[s].address,t=await this._updateImageFlashParams(t,i,e.flashMode,e.flashFreq,e.flashSize);let o=null;e.calculateMD5Hash&&(o=e.calculateMD5Hash(t),this.debug("Image MD5 "+o));const r=t.length;let a;if(e.compress){t=xa(t,{level:9}),a=await this.flashDeflBegin(r,t.length,i)}else a=await this.flashBegin(r,i);let n=0,l=0;const c=t.length;e.reportProgress&&e.reportProgress(s,0,c);let h=new Date;const d=h.getTime();let A=5e3;const g=new Sa({chunkSize:1});let u=0;g.onData=function(e){u+=e.byteLength};let p=0;for(;p<t.length;){this.debug("Write loop "+i+" "+n+" "+a),this.info("Writing at 0x"+(i+u).toString(16)+"... ("+Math.floor(100*(n+1)/a)+"%)");const o=Math.min(this.FLASH_WRITE_SIZE,t.length-p),r=t.slice(p,p+o),h=p+o>=t.length;if(!e.compress)throw new hs("Yet to handle Non Compressed writes");{const e=u;g.push(r,h);const t=u-e;let i=3e3;this.timeoutPerMb(this.ERASE_WRITE_TIMEOUT_PER_MB,t)>3e3&&(i=this.timeoutPerMb(this.ERASE_WRITE_TIMEOUT_PER_MB,t)),!1===this.IS_STUB&&(A=i),await this.flashDeflBlock(r,n,A),this.IS_STUB&&(A=i)}l+=r.length,p+=o,n++,e.reportProgress&&e.reportProgress(s,l,c)}this.IS_STUB&&(e.compress?await this.flashDeflFinish(!1,A):await this.flashFinish(!1,A)),h=new Date;const _=h.getTime()-d;if(e.compress&&this.info("Wrote "+r+" bytes ("+l+" compressed) at 0x"+i.toString(16)+" in "+_/1e3+" seconds."),o){this.info("File  md5: "+o);const e=await this.flashMd5sum(i,r);if(this.info("Flash md5: "+e),new String(e).valueOf()!=new String(o).valueOf())throw new hs("MD5 of file does not match data in flash!");this.info("Hash of data verified.")}}this.info("Leaving...")}async flashId(){this.debug("flash_id");const e=await this.readFlashId();this.info("Manufacturer: "+(255&e).toString(16));const t=e>>16&255;this.info("Device: "+(e>>8&255).toString(16)+t.toString(16)),this.info("Detected flash size: "+this.DETECTED_FLASH_SIZES[t])}async detectFlashSize(){this.debug("detectFlashSize");const e=await this.readFlashId()>>16&255;let t=this.DETECTED_FLASH_SIZES[e];return t?this.info("Auto-detected Flash size: "+t):(t="4MB",this.info("Could not auto-detect Flash size. defaulting to 4MB")),t}async softReset(e){if(this.IS_STUB){if("ESP8266"!=this.chip.CHIP_NAME)throw new hs("Soft resetting is currently only supported on ESP8266");e?(await this.flashBegin(0,0),await this.flashFinish(!0)):await this.command(this.ESP_RUN_USER_CODE,void 0,void 0,!1)}else{if(e)return;await this.flashBegin(0,0),await this.flashFinish(!1)}}async after(e="hard_reset",t,i){switch(e){case"hard_reset":if(this.resetConstructors.hardReset){this.info("Hard resetting via RTS pin...");const e=this.resetConstructors.hardReset(this.transport,t);await e.reset()}break;case"soft_reset":this.info("Soft resetting..."),await this.softReset(!1);break;case"no_reset_stub":this.info("Staying in flasher stub.");break;case"custom_reset":if(i||this.info("Custom reset sequence not provided, doing nothing."),this.resetConstructors.customReset||this.info("Custom reset constructor not available, doing nothing."),this.resetConstructors.customReset&&i){this.info("Custom resetting using sequence "+i);const e=this.resetConstructors.customReset(this.transport,i);await e.reset()}break;default:this.info("Staying in bootloader."),this.IS_STUB&&this.softReset(!0)}}}const un=/MAC:\s*([0-9A-Fa-f:]{17})/;async function pn(e,t){if(!e.readable)try{await e.open({baudRate:115200})}catch{throw Object.assign(new Error("Could not open serial port. Unplug the device, plug it back in, and try again."),{errorKey:"usb.errors.port_open_failed"})}try{await e.setSignals({dataTerminalReady:!1,requestToSend:!0}),await new Promise(e=>setTimeout(e,200)),await e.setSignals({dataTerminalReady:!1,requestToSend:!1})}catch{}const i=e.readable.getReader();for(;;){const e=await Promise.race([i.read(),new Promise(e=>setTimeout(()=>e({value:void 0,done:!0}),200))]);if(e.done||!e.value)break}i.releaseLock();const s=e.writable.getWriter();let o=!1;for(let t=0;t<5;t++){t>0&&await new Promise(e=>setTimeout(e,2e3));try{await ns(s,rs());const t=e.readable.getReader();try{await ls(t,3e3),o=!0}finally{t.releaseLock()}}catch{}if(o)break}if(!o)throw s.releaseLock(),Object.assign(new Error("No response from device — it may be flashed with ethernet firmware which does not support WiFi configuration."),{errorKey:"usb.errors.no_device_response"});const r=ss(3,[3,0]);await ns(s,r),await new Promise(e=>setTimeout(e,500));for(let t=0;t<3;t++){t>0&&await new Promise(e=>setTimeout(e,3e3));const i=os();await ns(s,i);const o=e.readable.getReader(),r=[],a=Date.now()+5e3;let n=[],l=!1;for(;Date.now()<a&&!l;)try{const e=await ls(o,a-Date.now(),n);n=e.buffer;for(const t of e.packets)if(4===t.type&&4===t.data[0]){const e=cs(t.data.slice(2,2+t.data[1]));if(null===e){if(l=!0,r.length>0)return{writer:s,reader:o,networks:r};break}r.push(e)}}catch{break}if(r.length>0)return{writer:s,reader:o,networks:r};o.releaseLock()}return{writer:s,reader:e.readable.getReader(),networks:[]}}async function _n(e,t,i){await ns(e,function(e,t){const i=new TextEncoder,s=i.encode(e),o=i.encode(t);return ss(3,[1,1+s.length+1+o.length,s.length,...s,o.length,...o])}(t,i))}async function fn(e,t){const i=new TextDecoder,s=/(\d+\.\d+\.\d+\.\d+)/;let o=[],r=!1,a=!1;const n=Date.now()+t;for(;Date.now()<n;)try{const t=await ls(e,n-Date.now(),o);o=t.buffer;for(const e of t.packets)if(1===e.type&&3===e.data[0]&&(r=!0),r){if(2===e.type){const t=e.data[0],i={1:"Invalid command — device may need to be power-cycled",2:"Unknown command",3:"WiFi connection failed — check SSID/password and try again",4:"Not authorized"},s={1:"wifi.errors.invalid_command",2:"wifi.errors.unknown_command",3:"wifi.errors.connection_failed",4:"wifi.errors.not_authorized"}[t]??"wifi.errors.error_code";throw Object.assign(new Error(i[t]??`WiFi error (code ${t})`),{errorKey:s,errorParams:"wifi.errors.error_code"===s?{code:t}:void 0})}if(1===e.type&&4===e.data[0]&&(a=!0),4===e.type&&a){if(e.data.length>=3&&e.data[1]>0){const t=e.data.slice(2,2+e.data[1]),o=t[0],r=i.decode(t.slice(1,1+o)),a=s.exec(r);if(a&&"0.0.0.0"!==a[1])return a[1]}return null}}}catch(e){if(e instanceof Error&&!e.message.includes("timeout"))throw e;break}throw Object.assign(new Error("WiFi connection failed — check SSID/password and try again"),{errorKey:"wifi.errors.connection_failed"})}class wn extends ce{constructor(){super(...arguments),this._deviceCtrl=new ji(this),this._gridCtrl=new Zi(this),this._targetCtrl=new qi(this),this._flasherCtrl=new Vi(this),this._localize=Object.assign(e=>e,{formatNumber:(e,t=1)=>e.toFixed(t),lang:"en"}),this._currentLang="",this._grid=new Uint8Array(ii),this._zoneConfigs=new Array(7).fill(null),this._activeZone=null,this._roomType="normal",this._roomTrigger=$i.normal.trigger,this._roomRenew=$i.normal.renew,this._roomTimeout=$i.normal.timeout,this._roomHandoffTimeout=$i.normal.handoff_timeout,this._targetAutoDistance=!0,this._targetMaxDistance=6,this._staticAutoDistance=!0,this._staticMinDistance=.3,this._staticMaxDistance=16,this._temperatureOffset=0,this._humidityOffset=0,this._illuminanceOffset=0,this._motionTimeout=5,this._staticTimeout=30,this._staticTriggerThreshold=3,this._staticRenewThreshold=3,this._staticOnDelay=0,this._logLevels={},this._bluetoothEnabled=!1,this._co2Enabled=!1,this._ledMode="Manual Control",this._ledBrightness=1,this._ledPresenceColor="#CC33FF",this._relayTriggerMode="disabled",this._relayContactMode="no",this._targetUpdateRateMs=1e3,this._zoneUpdateRateMs=1e3,this._entitiesConfig={},this._sidebarTab="zones",this._panelTab="config",this._showDeleteCalibrationDialog=!1,this._showLiveMenu=!1,this._showCustomIconPicker=!1,this._customIconValue="",this._furniture=[],this._selectedFurnitureId=null,this._furnitureClipboard=null,this._dragState=null,this._targets=[],this._rawTargets=[],this._sensorState={occupancy:!1,static_presence:!1,motion_presence:!1,target_presence:!1,illuminance:null,temperature:null,humidity:null,co2:null},this._zoneState={occupancy:{},target_counts:{},frame_count:0},this._showHitCounts=!1,this._showDebugLog=!1,this._debugLogLines=[],this._debugLogPrev=null,this._showBackendDebugLog=!1,this._backendDebugLogLines=[],this._backendDebugLogPrev=null,this._overlayMode=null,this._targetMenu=null,this._dismissedTargets=new Map,this._isPainting=!1,this._justPainted=!1,this._paintAction="set",this._frozenBounds=null,this._saving=!1,this._dirty=!1,this._showUnsavedDialog=!1,this._pendingNavigation=null,this._showTemplateSave=!1,this._showTemplateLoad=!1,this._templateName="",this._devices=[],this._selectedMac="",this._loading=!0,this._haConnected=!0,this._listeningConnection=null,this._onHaReady=()=>{const e=!this._haConnected;this._haConnected=!0,e&&this._initialize().catch(()=>{})},this._onHaDisconnected=()=>{this._haConnected=!1},this._setupStep=null,this._view="live",this._openAccordions=new Set,this._perspective=null,this._roomWidth=0,this._roomDepth=0,this._beforeUnloadHandler=e=>{this._dirty&&(e.preventDefault(),e.returnValue="")},this._originalPushState=null,this._originalReplaceState=null,this._interceptNavigation=()=>!!this._dirty&&(this._showUnsavedDialog=!0,this._pendingNavigation=null,!0),this._dismissTooltips=()=>{this.shadowRoot.querySelectorAll(".setting-info-tooltip").forEach(e=>{e.style.display="none"})},this._onKeyDown=e=>{if("editor"!==this._view||"furniture"!==this._sidebarTab)return;if(!this._selectedFurnitureId)return;if(!e.composedPath().some(e=>{if(!(e instanceof HTMLElement))return!1;const t=e.tagName;return"INPUT"===t||"TEXTAREA"===t||"SELECT"===t||e.isContentEditable}))if("Backspace"===e.key||"Delete"===e.key)e.preventDefault(),this._removeFurniture(this._selectedFurnitureId);else if("Escape"===e.key)e.preventDefault(),this._selectedFurnitureId=null;else if("c"===e.key&&(e.ctrlKey||e.metaKey)){const e=this._furniture.find(e=>e.id===this._selectedFurnitureId);e&&(this._furnitureClipboard={...e})}else if("x"===e.key&&(e.ctrlKey||e.metaKey)){const e=this._furniture.find(e=>e.id===this._selectedFurnitureId);e&&(this._furnitureClipboard={...e},this._removeFurniture(e.id))}else if("v"===e.key&&(e.ctrlKey||e.metaKey)){if(!this._furnitureClipboard)return;e.preventDefault();const t=`f_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,i=this._furnitureClipboard,s=this._getRoomBounds(),o=Math.ceil(this._roomWidth/si),r=Math.floor((ei-o)/2),a=(s.minCol-r)*si,n=(s.maxCol+1-r)*si,l=s.minRow*si,c=(s.maxRow+1)*si,h=300,d={...i,id:t,x:Math.max(a,Math.min(n-i.width,i.x+h)),y:Math.max(l,Math.min(c-i.height,i.y+h))};this._furniture=[...this._furniture,d],this._selectedFurnitureId=d.id,this._dirty=!0}},this._fovCache=null,this._fovPerspective=null}get _zoneEngineState(){return this._targetCtrl.zoneEngineState}set _zoneEngineState(e){this._targetCtrl.zoneEngineState=e}connectedCallback(){super.connectedCallback(),this._initialize().catch(()=>{}),window.addEventListener("beforeunload",this._beforeUnloadHandler),window.addEventListener("click",this._dismissTooltips),window.addEventListener("keydown",this._onKeyDown),this._originalPushState=history.pushState.bind(history),this._originalReplaceState=history.replaceState.bind(history),history.pushState=(...e)=>{this._interceptNavigation()?this._pendingNavigation=()=>{this._originalPushState(...e),window.dispatchEvent(new PopStateEvent("popstate"))}:this._originalPushState(...e)},history.replaceState=(...e)=>{this._interceptNavigation()?this._pendingNavigation=()=>{this._originalReplaceState(...e),window.dispatchEvent(new PopStateEvent("popstate"))}:this._originalReplaceState(...e)}}disconnectedCallback(){super.disconnectedCallback(),this._initRetryTimer&&(clearTimeout(this._initRetryTimer),this._initRetryTimer=void 0),this._closeDeviceSession(),this._detachConnectionListeners(),window.removeEventListener("beforeunload",this._beforeUnloadHandler),window.removeEventListener("click",this._dismissTooltips),window.removeEventListener("keydown",this._onKeyDown),this._originalPushState&&(history.pushState=this._originalPushState),this._originalReplaceState&&(history.replaceState=this._originalReplaceState)}_attachConnectionListeners(e){e&&this._listeningConnection!==e&&(this._detachConnectionListeners(),"function"==typeof e.addEventListener&&(e.addEventListener("ready",this._onHaReady),e.addEventListener("disconnected",this._onHaDisconnected),this._listeningConnection=e))}_detachConnectionListeners(){const e=this._listeningConnection;e&&"function"==typeof e.removeEventListener&&(e.removeEventListener("ready",this._onHaReady),e.removeEventListener("disconnected",this._onHaDisconnected)),this._listeningConnection=null}willUpdate(e){if(e.has("hass")){const e=this.hass?.locale?.language??this.hass?.language;e!==this._currentLang&&(this._currentLang=e,this._localize=function(e){const t=e?.locale?.language??e?.language??"en",i=t.split("-")[0],s=St[t]?t:St[i]?i:"en",o=St[s],r=St.en,a=new Map,n=new Map,l=(e,t)=>{const i=Dt(o,e)??Dt(r,e)??e;if(!t)return i;let n=a.get(i);return n||(n=new xt(i,s),a.set(i,n)),n.format(t)};return l.formatNumber=(e,t=1)=>{let i=n.get(t);return i||(i=new Intl.NumberFormat(s,{minimumFractionDigits:t,maximumFractionDigits:t}),n.set(t,i)),i.format(e)},l.lang=s,l}(this.hass))}}updated(e){if(e.has("hass")&&this.hass){this._deviceCtrl.hass=this.hass,this._flasherCtrl.hass=this.hass;const e=this.hass.connection;if(e&&(this._attachConnectionListeners(e),"boolean"==typeof e.connected&&(this._haConnected=e.connected)),!this._haConnected)return;this._loading&&!this._devices.length?this._initialize():!this._selectedMac||this._deviceCtrl.hasDeviceSession||this._deviceCtrl.reconnecting||this._loadDeviceConfig(this._selectedMac)}}async _initialize(){if(this.hass){if(this._initRetryTimer&&(clearTimeout(this._initRetryTimer),this._initRetryTimer=void 0),this._loading=!0,this._deviceCtrl.hass=this.hass,await this._subscribeDevices(),!this._selectedMac&&0===this._devices.length)return this._loading=!1,void(this._initRetryTimer=setTimeout(()=>this._initialize(),2e3));this._selectedMac&&await this._loadDeviceConfig(this._selectedMac),this._loading=!1}}async _subscribeDevices(){this._deviceCtrl.hass=this.hass,this._deviceCtrl.onDeviceListChanged=()=>{this._devices=this._deviceCtrl.devices,this._selectedMac=this._deviceCtrl.selectedMac},await this._deviceCtrl.subscribeDeviceList(),this._devices=this._deviceCtrl.devices,this._selectedMac=this._deviceCtrl.selectedMac}async _loadDevices(){this._deviceCtrl.hass=this.hass,await this._deviceCtrl.loadDevices(),this._devices=this._deviceCtrl.devices,this._selectedMac=this._deviceCtrl.selectedMac}async _loadDeviceConfig(e){this._deviceCtrl.hass=this.hass,this._deviceCtrl.onTargetData=e=>{this._targetCtrl.handleTargetData(e)},this._deviceCtrl.onRawTargetData=e=>{this._targetCtrl.handleRawTargetData(e)};const t=await this._deviceCtrl.loadDeviceConfig(e);t&&this._applyConfig(t);const i=this._devices.find(t=>t.mac===e);i&&(this._bluetoothEnabled=i.bluetooth_enabled??!1,this._co2Enabled=i.co2_enabled??!1)}_applyConfig(e){const t=ts(e);this._perspective=t.calibration.perspective,this._roomWidth=t.calibration.roomWidth,this._roomDepth=t.calibration.roomDepth,this._setupStep=null,this._furniture=t.furniture,this._grid=t.grid,this._zoneConfigs=t.zoneConfigs,this._roomType=t.roomThresholds.roomType,this._roomTrigger=t.roomThresholds.roomTrigger,this._roomRenew=t.roomThresholds.roomRenew,this._roomTimeout=t.roomThresholds.roomTimeout,this._roomHandoffTimeout=t.roomThresholds.roomHandoffTimeout;const i=t.settings;this._temperatureOffset=i.temperatureOffset,this._humidityOffset=i.humidityOffset,this._illuminanceOffset=i.illuminanceOffset,this._motionTimeout=i.motionTimeout,this._targetAutoDistance=i.targetAutoDistance,this._targetMaxDistance=i.targetMaxDistance,this._staticAutoDistance=i.staticAutoDistance,this._staticMinDistance=i.staticMinDistance,this._staticMaxDistance=i.staticMaxDistance,this._staticTriggerThreshold=i.staticTriggerThreshold,this._staticRenewThreshold=i.staticRenewThreshold,this._staticTimeout=i.staticTimeout,this._staticOnDelay=i.staticOnDelay,this._relayTriggerMode=i.relayTriggerMode,this._relayContactMode=i.relayContactMode,this._targetUpdateRateMs=i.targetUpdateRateMs,this._zoneUpdateRateMs=i.zoneUpdateRateMs,this._entitiesConfig=i.entities,this._logLevels=t.settings.logLevels,this._ledMode=t.settings.ledMode,this._ledBrightness=t.settings.ledBrightness,this._ledPresenceColor=t.settings.ledPresenceColor}_closeDeviceSession(){this._deviceCtrl.closeDeviceSession(),this._targets=[],this._rawTargets=[]}_onCellMouseDown(e){this._gridCtrl.onCellMouseDown(e)}_onCellMouseEnter(e){this._gridCtrl.onCellMouseEnter(e)}_onCellMouseUp(){this._gridCtrl.onCellMouseUp()}_applyPaintToCell(e){this._gridCtrl.applyPaintToCell(e)}_addZone(){this._gridCtrl.addZone()}_removeZone(e){this._gridCtrl.removeZone(e)}_addFurniture(e){this._gridCtrl.addFurniture(e)}_addCustomFurniture(e){this._gridCtrl.addCustomFurniture(e)}_removeFurniture(e){this._gridCtrl.removeFurniture(e)}_updateFurniture(e,t){this._gridCtrl.updateFurniture(e,t)}_mmToPx(e,t){return yi(e,t)}_pxToMm(e,t){return vi(e,t)}_onFurniturePointerDown(e,t,i,s){this._gridCtrl.onFurniturePointerDown(e,t,i,s)}_onFurnitureDrag(e){this._gridCtrl.onFurnitureDrag(e)}_getCellColor(e){return Mi(this._grid[e],this._zoneConfigs)}_getRoomBounds(){return di(this._grid)}async _applyLayout(){return this._gridCtrl.applyLayout()}async _saveSettings(e){return this._gridCtrl.saveSettings(e||{})}async _cancelSettings(){this._dirty=!1,this._view="live",await this._loadDeviceConfig(this._selectedMac)}async _cancelEditor(){const e=this._targetAutoDistance||this._staticAutoDistance;this._dirty=!1,this._selectedFurnitureId=null,this._overlayMode=null,await this._loadDeviceConfig(this._selectedMac),this._view="live",e&&await(this.hass?.callWS({type:"eppgrid/set_distance_override",mac:this._selectedMac,target_max_distance:this._targetMaxDistance,static_min_distance:this._staticMinDistance,static_max_distance:this._staticMaxDistance})?.catch(()=>{}))}_pushWidenedDistanceOverride(){(this._targetAutoDistance||this._staticAutoDistance)&&this.hass?.callWS({type:"eppgrid/set_distance_override",mac:this._selectedMac,target_max_distance:this._targetAutoDistance?6:this._targetMaxDistance,static_min_distance:this._staticAutoDistance?.3:this._staticMinDistance,static_max_distance:this._staticAutoDistance?16:this._staticMaxDistance})?.catch(()=>{})}_enterEditor(e){this._view="editor",this._sidebarTab=e,"overlays"!==e&&(this._overlayMode=null),this._pushWidenedDistanceOverride()}_getTemplates(){return this._gridCtrl.getTemplates()}_saveTemplate(){this._gridCtrl.saveTemplate()}_loadTemplate(e){this._gridCtrl.loadTemplate(e)}_deleteTemplate(e){this._gridCtrl.deleteTemplate(e)}_initGridFromRoom(){this._grid=gi(this._roomWidth,this._roomDepth)}_mapTargetToPercent(e){return function(e,t,i,s){if(i>0&&s>0)return{x:Math.max(0,Math.min(e,i))/i*100,y:Math.max(0,Math.min(t,s))/s*100};return{x:e/oi*100,y:t/oi*100}}(e.x,e.y,this._roomWidth,this._roomDepth)}_getInversePerspective(){return function(e){if(!e||e.length<8)return null;const t=[e[0],e[1],e[2],e[3],e[4],e[5],e[6],e[7],1],i=t[0]*(t[4]*t[8]-t[5]*t[7])-t[1]*(t[3]*t[8]-t[5]*t[6])+t[2]*(t[3]*t[7]-t[4]*t[6]);if(Math.abs(i)<1e-10)return null;const s=[(t[4]*t[8]-t[5]*t[7])/i,(t[2]*t[7]-t[1]*t[8])/i,(t[1]*t[5]-t[2]*t[4])/i,(t[5]*t[6]-t[3]*t[8])/i,(t[0]*t[8]-t[2]*t[6])/i,(t[2]*t[3]-t[0]*t[5])/i,(t[3]*t[7]-t[4]*t[6])/i,(t[1]*t[6]-t[0]*t[7])/i,(t[0]*t[4]-t[1]*t[3])/i],o=s[8];return Math.abs(o)<1e-10?null:[s[0]/o,s[1]/o,s[2]/o,s[3]/o,s[4]/o,s[5]/o,s[6]/o,s[7]/o]}(this._perspective)}_applyPerspective(e,t,i){return Ri(e,t,i)}_getSensorFov(){return this._perspective?(this._fovCache&&this._fovPerspective===this._perspective||(this._fovCache=Ti(this._perspective),this._fovPerspective=this._perspective),this._fovCache):null}_computeMaxRangeMm(){return Ui(this._targetAutoDistance,this._targetAutoDistance?this._autoDetectionRange():0,this._targetMaxDistance)}_getGridRoomMetrics(){return Oi(this._grid,this._roomWidth,this._perspective)}_getRawRoomBounds(){return Ai(this._grid)}_mapTargetToGridCell(e){return Si(e.x,e.y,this._roomWidth,this._roomDepth)}_guardNavigation(e){this._dirty?(this._pendingNavigation=e,this._showUnsavedDialog=!0):e()}_discardAndNavigate(){this._dirty=!1,this._showUnsavedDialog=!1,this._pendingNavigation&&(this._pendingNavigation(),this._pendingNavigation=null)}_renderGlobalDialogs(){return Y`
      ${this._showTemplateSave?this._renderTemplateSaveDialog():J}
      ${this._showTemplateLoad?this._renderTemplateLoadDialog():J}
      ${this._showUnsavedDialog?Y`
          <div class="template-dialog">
            <div class="template-dialog-card">
              <h3>${this._localize("dialogs.unsaved_changes")}</h3>
              <p class="overlay-help">${this._localize("dialogs.unsaved_changes_body")}</p>
              <div class="template-dialog-actions">
                <button class="wizard-btn wizard-btn-back"
                  @click=${()=>{this._showUnsavedDialog=!1,this._pendingNavigation=null}}
                >${this._localize("common.cancel")}</button>
                <button class="wizard-btn wizard-btn-primary" style="background: var(--error-color, #f44336);"
                  @click=${this._discardAndNavigate}
                >${this._localize("common.discard")}</button>
              </div>
            </div>
          </div>
        `:J}
      ${this._showDeleteCalibrationDialog?Y`
          <div class="template-dialog">
            <div class="template-dialog-card">
              <h3>${this._localize("dialogs.delete_calibration_title")}</h3>
              <p class="overlay-help">${this._localize("dialogs.delete_calibration_body")}</p>
              <div class="template-dialog-actions">
                <button class="wizard-btn wizard-btn-back"
                  @click=${()=>{this._showDeleteCalibrationDialog=!1}}
                >${this._localize("common.cancel")}</button>
                <button class="wizard-btn wizard-btn-primary" style="background: var(--error-color, #f44336);"
                  @click=${this._deleteCalibration}
                >${this._localize("common.delete")}</button>
              </div>
            </div>
          </div>
        `:J}
    `}_renderTabBar(){return Y`
			<div class="tab-bar">
				<button class="tab ${"config"===this._panelTab?"active":""}"
					@click=${()=>{this._flasherCtrl.resetUsbState(),this._panelTab="config",this._loadDevices()}}>${this._localize("tabs.device_configuration")}</button>
				<button class="tab ${"flasher"===this._panelTab?"active":""}"
					@click=${()=>{this._flasherCtrl.resetUsbState(),this._panelTab="flasher",this._flasherCtrl.loading&&(this._flasherCtrl.hass=this.hass,this._flasherCtrl.subscribeDeviceList())}}>${this._localize("tabs.flash_firmware")}</button>
			</div>
		`}render(){if("flasher"===this._panelTab)return Y`<div class="tab-layout">
				${this._renderTabBar()}
				<epp-flasher-view
					.hass=${this.hass}
					.flashableDevices=${this._flasherCtrl.flashableDevices}
					.loading=${this._flasherCtrl.loading}
					.localize=${this._localize}
					.usbFlashState=${this._flasherCtrl.usbFlashState}
					.wifiNetworks=${this._flasherCtrl.wifiNetworks}
					.firmwareBaseUrl=${this._flasherCtrl.firmwareBaseUrl}
					.firmwareVersion=${this._flasherCtrl.firmwareVersion}
					.integrationVersion=${this._flasherCtrl.integrationVersion}
					.otaStates=${this._flasherCtrl.otaStates}
					@flash-complete=${()=>{this._flasherCtrl.resetUsbState(),this._loadDevices(),this._panelTab="config"}}
					@usb-flash=${e=>{this._handleUsbFlash(e.detail.variant)}}
					@usb-wifi-config=${()=>{this._handleUsbWifiConfig()}}
					@usb-retry=${()=>{const e=this._flasherCtrl;try{e._serialReader?.releaseLock()}catch{}try{e._serialWriter?.releaseLock()}catch{}e._serialReader=null,e._serialWriter=null,this._handleUsbWifiConfig()}}
					@wifi-scan=${()=>{this._handleWifiScan()}}
					@wifi-provision=${e=>{this._handleWifiProvision(e.detail.ssid,e.detail.password)}}
					@update-firmware=${e=>{this._flasherCtrl.startOta(e.detail.mac)}}
					@retry-ota=${e=>{this._flasherCtrl.dismissOtaError(e.detail.mac)}}
					@wifi-complete=${()=>{this._flasherCtrl.resetUsbState(),this._loadDevices(),this._panelTab="config"}}
				></epp-flasher-view>
			</div>`;if(!1===this.hass?.connection?.connected||!this._haConnected)return Y`<div class="tab-layout">
				${this._renderTabBar()}
				<div class="panel">
					<div class="protocol-fullpage protocol-fullpage-info">
						<ha-icon icon="mdi:connection"></ha-icon>
						<p>${this._localize("connection.ha_reconnecting")}</p>
					</div>
				</div>
			</div>`;if(this._loading)return Y`<div class="tab-layout">
				${this._renderTabBar()}
				<div class="loading-container">${this._localize("common.loading")}</div>
			</div>`;if(!this._devices.length)return Y`<div class="tab-layout">
				${this._renderTabBar()}
				<div class="empty-state">
					<p>${this._localize("flasher.no_eppgrid_devices")}</p>
					<button class="primary-btn" @click=${()=>{this._panelTab="flasher",this._flasherCtrl.hass=this.hass,this._flasherCtrl.subscribeDeviceList()}}>
							${this._localize("flasher.flash_from_tab")}
					</button>
				</div>
			</div>`;if(null!==this._setupStep)return Y`
        <epp-wizard
          .hass=${this.hass}
          .selectedMac=${this._selectedMac}
          .rawTargets=${this._rawTargets}
          .sensorState=${{occupancy:this._sensorState.occupancy}}
          .devices=${this._devices}
          .localize=${this._localize}
          .initialRoomWidth=${this._roomWidth}
          .initialRoomDepth=${this._roomDepth}
          @calibration-complete=${async e=>{const{perspective:t,roomWidth:i,roomDepth:s}=e.detail;this._perspective=t,this._roomWidth=i,this._roomDepth=s,this._initGridFromRoom(),this._setupStep=null,this._view="live",this._entitiesConfig={...this._entitiesConfig,zone_presence:!0},await this._gridCtrl.applyLayout().catch(e=>{console.error("Failed to apply layout after calibration",e)})}}
          @wizard-cancel=${()=>{this._setupStep=null}}
        ></epp-wizard>
      `;if(this._deviceCtrl.reconnecting)return Y`<div class="tab-layout">
				${this._renderTabBar()}
				<div class="panel">
					${this._renderHeader()}
					<div class="protocol-fullpage protocol-fullpage-info">
						<ha-icon icon="mdi:connection"></ha-icon>
						<p>${this._localize("connection.connecting")}</p>
					</div>
				</div>
				${this._renderGlobalDialogs()}
			</div>`;if(this._deviceCtrl.connectionFailed)return Y`<div class="tab-layout">
				${this._renderTabBar()}
				<div class="panel">
					${this._renderHeader()}
					${this._renderConnectionBanner()}
				</div>
				${this._renderGlobalDialogs()}
			</div>`;const e=this._devices.find(e=>e.mac===this._selectedMac);if(!(!e||"compatible"===e.firmware_status||"unavailable"===e.firmware_status))return Y`<div class="tab-layout">
				${this._renderTabBar()}
				<div class="panel">
					${this._renderHeader()}
					${this._renderProtocolBanner()}
				</div>
				${this._renderGlobalDialogs()}
			</div>`;const t="settings"===this._view?this._renderSettings():"editor"===this._view&&this._perspective?this._renderEditor():this._renderLiveOverview();return Y`<div class="tab-layout">${this._renderTabBar()}${t}${this._renderGlobalDialogs()}</div>`}async _deleteCalibration(){this._showDeleteCalibrationDialog=!1,this._perspective=null,this._roomWidth=0,this._roomDepth=0,this._grid=new Uint8Array(400),this._zoneConfigs=new Array(7).fill(null),this._roomType="normal",this._roomTrigger=$i.normal.trigger,this._roomRenew=$i.normal.renew,this._roomTimeout=$i.normal.timeout,this._roomHandoffTimeout=$i.normal.handoff_timeout,this._furniture=[],this._entitiesConfig={...this._entitiesConfig,zone_presence:!1,target_xy:!1},this._targetAutoDistance&&(this._targetMaxDistance=6),this._staticAutoDistance&&(this._staticMinDistance=.3,this._staticMaxDistance=16);try{(this._targetAutoDistance||this._staticAutoDistance)&&await this.hass.callWS({type:"eppgrid/set_settings",mac:this._selectedMac,temperature_offset:this._temperatureOffset,humidity_offset:this._humidityOffset,illuminance_offset:this._illuminanceOffset,motion_timeout:this._motionTimeout,target_auto_distance:this._targetAutoDistance,target_max_distance:this._targetMaxDistance,static_auto_distance:this._staticAutoDistance,static_min_distance:this._staticMinDistance,static_max_distance:this._staticMaxDistance,static_trigger_threshold:this._staticTriggerThreshold,static_renew_threshold:this._staticRenewThreshold,static_timeout:this._staticTimeout,static_on_delay:this._staticOnDelay,led_mode:this._ledMode,led_brightness:this._ledBrightness,led_presence_color:this._ledPresenceColor,relay_trigger_mode:this._relayTriggerMode,relay_contact_mode:this._relayContactMode,entities:this._entitiesConfig||{}}),await this.hass.callWS({type:"eppgrid/set_setup",mac:this._selectedMac,perspective:[0,0,0,0,0,0,0,0],room_width:0,room_depth:0}),await this.hass.callWS({type:"eppgrid/set_room_layout",mac:this._selectedMac,grid_bytes:Array.from(this._grid),zone_slots:this._zoneConfigs.map(()=>null),room_type:"normal",furniture:[]})}catch(e){console.error("Failed to delete calibration",e)}this._dirty=!1,this._view="live"}_changePlacement(){this._guardNavigation(()=>{this._setupStep="guide",this._pushWidenedDistanceOverride()})}_renderHeader(){return Y`
      <div class="panel-header">
        <ha-select
          .value=${this._selectedMac}
          .options=${this._devices.map(e=>({value:e.mac,label:e.area?`${e.name} (${e.area})`:e.name}))}
          @selected=${e=>{const t=e.detail.value;t&&t!==this._selectedMac&&this._guardNavigation(async()=>{this._closeDeviceSession(),this._selectedMac=t,localStorage.setItem("epp_selected_mac",t),await this._loadDeviceConfig(t)})}}
          @closed=${e=>e.stopPropagation()}
        ></ha-select>
      </div>
    `}_renderProtocolBanner(){const e=this._devices.find(e=>e.mac===this._selectedMac);if(!e||"compatible"===e.firmware_status)return J;const t=e.firmware_status,i="firmware_behind"===t,s="unavailable"===t?this._localize("protocol.unavailable"):i?this._localize("protocol.firmware_behind"):this._localize("protocol.firmware_ahead"),o="firmware_ahead"===t;return Y`
			<div class="protocol-fullpage protocol-fullpage-${i?"warning":"info"}">
				<ha-icon icon=${i?"mdi:alert-circle-outline":"mdi:information-outline"}></ha-icon>
				<p>${s}</p>
				${i?Y`<button class="wizard-btn wizard-btn-primary"
						@click=${()=>{this._panelTab="flasher",this._flasherCtrl.loading&&(this._flasherCtrl.hass=this.hass,this._flasherCtrl.subscribeDeviceList())}}
					>${this._localize("protocol.update_firmware")}</button>`:J}
				${o?Y`<a href="/hacs/repository/1172848595" class="protocol-link"
					>${this._localize("protocol.open_hacs")}</a>`:J}
			</div>
		`}_renderConnectionBanner(){if(!this._deviceCtrl.connectionFailed)return J;const e=this._devices.find(e=>e.mac===this._selectedMac);if("unavailable"===e?.firmware_status)return Y`
				<div class="protocol-fullpage protocol-fullpage-info">
					<ha-icon icon="mdi:access-point-off"></ha-icon>
					<p>${this._localize("connection.offline")}</p>
					<button class="wizard-btn wizard-btn-primary"
						@click=${()=>this._retryConnection()}
					>${this._localize("connection.retry")}</button>
				</div>
			`;const t=e?.current_connection_count;return Y`
			<div class="protocol-fullpage protocol-fullpage-warning">
				<ha-icon icon="mdi:connection"></ha-icon>
				<p>${this._localize("connection.failed")}</p>
				${null!=t?Y`<p>${this._localize("connection.client_count",{count:t})}</p>`:J}
				<p style="opacity: 0.7; font-size: 0.9em">${this._localize("connection.check_connections")}</p>
				<button class="wizard-btn wizard-btn-primary"
					@click=${()=>this._retryConnection()}
				>${this._localize("connection.retry")}</button>
			</div>
		`}_retryConnection(){this._selectedMac&&this._loadDeviceConfig(this._selectedMac)}_renderLiveGrid(){for(let e=0;e<this._targets.length;e++){const t=this._targets[e];null!=t.x&&null!=t.y&&"active"===t.status&&(this._zoneEngineState.targetPrevXY[e]={x:t.x,y:t.y})}const e={};for(const[t,i]of Object.entries(this._zoneState.occupancy))e[Number(t)]=i;return Y`
			<epp-grid
				.grid=${this._grid}
				.zoneConfigs=${this._zoneConfigs}
				.targets=${this._targets}
				.roomWidth=${this._roomWidth}
				.roomDepth=${this._roomDepth}
				.perspective=${this._perspective}
				.furniture=${this._furniture}
				.selectedFurnitureId=${this._selectedFurnitureId}
				.sidebarTab=${this._sidebarTab}
				.showHitCounts=${this._showHitCounts}
				.occupancy=${e}
				.targetPrevXY=${this._zoneEngineState.targetPrevXY}
				.heatmapColors=${this._showHitCounts?this._computeHeatmapColors():null}
				.localize=${this._localize}
				.maxGridPx=${480}
				.maxRangeMm=${Ui(this._targetAutoDistance,this._autoDetectionRange(),this._targetMaxDistance)}
				@furniture-select=${e=>{this._selectedFurnitureId=e.detail}}
				@furniture-pointer-down=${e=>{const{e:t,id:i,type:s,handle:o}=e.detail;this._onFurniturePointerDown(t,i,s,o)}}
				@furniture-delete=${e=>{this._removeFurniture(e.detail)}}
				.dismissedTargets=${this._dismissedTargets}
				@target-click=${e=>{this._showTargetMenu(e.detail)}}
			></epp-grid>
		`}_showTargetMenu(e){this._targetMenu=e}_closeTargetMenu(){this._targetMenu=null}_targetCellIndex(e,t){const i=Si(e,t,this._roomWidth,this._roomDepth);if(!i)return-1;const s=Math.floor(i.col),o=Math.floor(i.row);return s<0||s>=ei||o<0||o>=ti?-1:o*ei+s}async _dismissTarget(){if(!this._targetMenu)return;const{targetIndex:e,x:t,y:i}=this._targetMenu,s=this._targetCellIndex(t,i);if(s>=0){this._dismissedTargets=new Map(this._dismissedTargets),this._dismissedTargets.set(e,s);try{await this.hass.callWS({type:"eppgrid/dismiss_target",mac:this._selectedMac,target_index:e,cell_index:s})}catch(e){console.error("Failed to dismiss target:",e)}}this._closeTargetMenu(),this.requestUpdate()}async _setInterference(e){if(!this._targetMenu)return;const t=this._targetCellIndex(this._targetMenu.x,this._targetMenu.y);t<0||!ri(this._grid[t])?this._closeTargetMenu():(this._grid=new Uint8Array(this._grid),this._grid[t]=hi(this._grid[t],e),this._dirty=!0,this._closeTargetMenu(),await this._gridCtrl.applyLayout())}_renderTargetMenu(){if(!this._targetMenu)return J;const{pctX:e,pctY:t}=this._targetMenu;return Y`
			<div class="target-menu-backdrop" @click=${()=>this._closeTargetMenu()}></div>
			<div class="target-menu" style="left: ${e}%; top: ${t}%;">
				<button class="target-menu-item" @click=${()=>this._dismissTarget()}>
					${this._localize("live.delete_target")}
				</button>
				<button class="target-menu-item" @click=${()=>this._setInterference(1)}>
					${this._localize("live.mark_interference")}
				</button>
				<button class="target-menu-item" @click=${()=>this._setInterference(2)}>
					${this._localize("live.suppress_detection")}
				</button>
			</div>
		`}_renderSaveCancelButtons(){const e="settings"===this._view?this._saveSettings:this._applyLayout;return Y`
      <div class="save-cancel-bar">
        <button class="wizard-btn wizard-btn-back"
          @click=${()=>{"editor"===this._view?this._cancelEditor():this._cancelSettings()}}
        >${this._localize("common.cancel")}</button>
        <button class="wizard-btn wizard-btn-primary"
          ?disabled=${this._saving||!this._dirty}
          @click=${e}
        >${this._saving?this._localize("common.saving"):this._localize("common.save")}</button>
      </div>
    `}_renderLiveOverview(){const e=this._perspective?this._renderLiveGrid():Y`<epp-wizard
            mode="uncalibrated-fov"
            .rawTargets=${this._rawTargets}
            .sensorState=${{occupancy:this._sensorState.occupancy}}
            .localize=${this._localize}
            @start-calibration=${()=>this._changePlacement()}
          ></epp-wizard>`;return Y`
      <div class="panel" @click=${e=>{e.target instanceof Element&&(this._showLiveMenu&&!e.target.closest(".sidebar-menu-wrapper")&&(this._showLiveMenu=!1),this._targetMenu&&!e.target.closest(".target-menu")&&this._closeTargetMenu())}}>
        ${this._renderHeader()}
        <div class="editor-layout">
          <div class="grid-column">
            <div class="grid-container" style="position: relative;">
              ${e}
              ${this._targetMenu?this._renderTargetMenu():J}
            </div>
            ${this._perspective?this._renderBackendDebugLog():J}
          </div>
          <div class="zone-sidebar">
            <div class="sidebar-header">
              <span class="sidebar-title" style="margin-right: auto;">${this._localize("sidebar.live_overview")}</span>
              <div class="sidebar-menu-wrapper">
                <button class="sidebar-menu-btn" @click=${()=>{this._showLiveMenu=!this._showLiveMenu}}>
                  <ha-icon icon="mdi:dots-vertical" style="--mdc-icon-size: 20px;"></ha-icon>
                </button>
                ${this._showLiveMenu?Y`
                  <div class="sidebar-menu" @click=${()=>{this._showLiveMenu=!1}}>
                    ${this._perspective?Y`
                      <button class="sidebar-menu-item" @click=${()=>{this._enterEditor("zones")}}>
                        <ha-icon icon="mdi:vector-square" style="--mdc-icon-size: 18px;"></ha-icon> ${this._localize("menu.detection_zones")}
                      </button>
                      <button class="sidebar-menu-item" @click=${()=>{this._enterEditor("overlays")}}>
                        <ha-icon icon="mdi:blur" style="--mdc-icon-size: 18px;"></ha-icon> ${this._localize("menu.overlays")}
                      </button>
                      <button class="sidebar-menu-item" @click=${()=>{this._enterEditor("furniture")}}>
                        <ha-icon icon="mdi:sofa" style="--mdc-icon-size: 18px;"></ha-icon> ${this._localize("menu.furniture")}
                      </button>
                    `:J}
                    <button class="sidebar-menu-item" @click=${()=>{this._view="settings"}}>
                      <ha-icon icon="mdi:cog" style="--mdc-icon-size: 18px;"></ha-icon> ${this._localize("menu.settings")}
                    </button>
                    <hr style="border: none; border-top: 1px solid var(--divider-color, #eee); margin: 4px 0;"/>
                    <button class="sidebar-menu-item" @click=${()=>this._changePlacement()}>
                      <ha-icon icon="mdi:target" style="--mdc-icon-size: 18px;"></ha-icon> ${this._localize("menu.room_calibration")}
                    </button>
                    ${this._perspective?Y`
                      <button class="sidebar-menu-item" style="color: var(--error-color, #f44336);" @click=${()=>{this._showDeleteCalibrationDialog=!0}}>
                        <ha-icon icon="mdi:delete" style="--mdc-icon-size: 18px;"></ha-icon> ${this._localize("menu.delete_calibration")}
                      </button>
                    `:J}
                    <hr style="border: none; border-top: 1px solid var(--divider-color, #eee); margin: 4px 0;"/>
                    <button class="sidebar-menu-item" @click=${()=>{this._showTemplateSave=!0}}>
                      <ha-icon icon="mdi:content-save" style="--mdc-icon-size: 18px;"></ha-icon> ${this._localize("dialogs.save_template")}
                    </button>
                    <button class="sidebar-menu-item" @click=${()=>{this._showTemplateLoad=!0}}>
                      <ha-icon icon="mdi:folder-open" style="--mdc-icon-size: 18px;"></ha-icon> ${this._localize("dialogs.load_template")}
                    </button>
                  </div>
                `:J}
              </div>
            </div>
            <div class="sidebar-scroll">
              <epp-live-sidebar
                .sensorState=${this._sensorState}
                .zoneState=${this._zoneState}
                .zoneConfigs=${this._zoneConfigs}
                .perspective=${this._perspective}
                .localize=${this._localize}
                @view-change=${e=>{this._view=e.detail.view,e.detail.sidebarTab&&(this._sidebarTab=e.detail.sidebarTab)}}
              ></epp-live-sidebar>
            </div>
          </div>
        </div>
      </div>
    `}_toggleAccordion(e){this._openAccordions=this._openAccordions.has(e)?new Set:new Set([e])}_getSensorRoomPosition(){return Fi(this._perspective)}_autoDetectionRange(){return Qi(this._roomWidth,this._roomDepth,this._perspective,this._grid)}_renderSettings(){return Y`
      <div class="panel">
        ${this._renderHeader()}
        <epp-settings-view
          .sensorState=${this._sensorState}
          .targetAutoDistance=${this._targetAutoDistance}
          .targetMaxDistance=${this._targetMaxDistance}
          .staticAutoDistance=${this._staticAutoDistance}
          .staticMinDistance=${this._staticMinDistance}
          .staticMaxDistance=${this._staticMaxDistance}
          .openAccordions=${this._openAccordions}
          .perspective=${this._perspective}
          .roomWidth=${this._roomWidth}
          .roomDepth=${this._roomDepth}
          .grid=${this._grid}
          .saving=${this._saving}
          .dirty=${this._dirty}
          .entitiesConfig=${this._entitiesConfig||{}}
          .temperatureOffset=${this._temperatureOffset}
          .humidityOffset=${this._humidityOffset}
          .illuminanceOffset=${this._illuminanceOffset}
          .motionTimeout=${this._motionTimeout}
          .staticTimeout=${this._staticTimeout}
          .staticTriggerThreshold=${this._staticTriggerThreshold}
          .staticRenewThreshold=${this._staticRenewThreshold}
          .staticOnDelay=${this._staticOnDelay}
          .logLevels=${this._logLevels}
          .bluetoothEnabled=${this._bluetoothEnabled}
          .co2Enabled=${this._co2Enabled}
          .ledMode=${this._ledMode}
          .ledBrightness=${this._ledBrightness}
          .ledPresenceColor=${this._ledPresenceColor}
          .relayTriggerMode=${this._relayTriggerMode}
          .relayContactMode=${this._relayContactMode}
          .targetUpdateRateMs=${this._targetUpdateRateMs}
          .zoneUpdateRateMs=${this._zoneUpdateRateMs}
          .localize=${this._localize}
          @accordion-toggle=${e=>{this._openAccordions=e.detail}}
          @setting-change=${e=>{const{key:t,value:i}=e.detail;this[`_${t}`]=i}}
          @dirty=${()=>{this._dirty=!0}}
          @save=${e=>this._saveSettings(e.detail)}
          @cancel=${()=>this._cancelSettings()}
        ></epp-settings-view>
      </div>
    `}_renderEditor(){const e=this._runLocalZoneEngine(),t=e.occupancy;for(let t=0;t<e.targets.length&&t<this._targets.length;t++)this._targets[t].status=e.targets[t].status;const i=Object.values(t).some(e=>e);return this._sensorState.occupancy=this._sensorState.static_presence||this._sensorState.motion_presence||i,Y`
      <div class="panel" @click=${e=>{const t=e.target;t.closest(".grid")||t.closest(".zone-sidebar")||this._justPainted||(this._activeZone=null)}}>
        ${this._renderHeader()}
        <div class="editor-layout">
          <div class="grid-column">
            <div class="grid-container" @click=${e=>{e.composedPath().some(e=>e instanceof HTMLElement&&e.classList.contains("furniture-item"))||(this._selectedFurnitureId=null)}}>
              <epp-grid
                .grid=${this._grid}
                .zoneConfigs=${this._zoneConfigs}
                .targets=${this._targets}
                .roomWidth=${this._roomWidth}
                .roomDepth=${this._roomDepth}
                .perspective=${this._perspective}
                .furniture=${this._furniture}
                .selectedFurnitureId=${this._selectedFurnitureId}
                .sidebarTab=${this._sidebarTab}
                .editable=${!0}
                .activeZone=${this._activeZone}
                .showHitCounts=${this._showHitCounts}
                .occupancy=${t}
                .targetPrevXY=${this._zoneEngineState.targetPrevXY}
                .heatmapColors=${this._showHitCounts?this._computeHeatmapColors():null}
                .localize=${this._localize}
                .maxGridPx=${480}
                .maxRangeMm=${Ui(this._targetAutoDistance,this._autoDetectionRange(),this._targetMaxDistance)}
                .frozenBounds=${this._frozenBounds}
                @cell-paint=${e=>{const{index:t,action:i}=e.detail;"down"===i?this._onCellMouseDown(t):"enter"===i?this._onCellMouseEnter(t):"up"===i&&this._onCellMouseUp()}}
                @furniture-select=${e=>{this._selectedFurnitureId=e.detail}}
                @furniture-pointer-down=${e=>{const{e:t,id:i,type:s,handle:o}=e.detail;this._onFurniturePointerDown(t,i,s,o)}}
                @furniture-delete=${e=>{this._removeFurniture(e.detail)}}
              ></epp-grid>
            </div>
            ${"zones"===this._sidebarTab||"overlays"===this._sidebarTab?this._renderDebugLog():J}
          </div>
          <div class="zone-sidebar scrollable">
            <div class="sidebar-title">${"furniture"===this._sidebarTab?this._localize("sidebar.furniture"):"overlays"===this._sidebarTab?this._localize("sidebar.overlays"):this._localize("sidebar.detection_zones")}</div>
            <div class="sidebar-scroll">
            ${"zones"===this._sidebarTab?Y`<epp-zone-sidebar
                    .zoneConfigs=${this._zoneConfigs}
                    .activeZone=${this._activeZone}
                    .roomType=${this._roomType}
                    .roomTrigger=${this._roomTrigger}
                    .roomRenew=${this._roomRenew}
                    .roomTimeout=${this._roomTimeout}
                    .roomHandoffTimeout=${this._roomHandoffTimeout}
                    .localZoneState=${this._zoneEngineState.localZoneState}
                    .localize=${this._localize}
                    @zone-select=${e=>{this._activeZone=e.detail.zone,this._overlayMode=null}}
                    @zone-add=${()=>{this._addZone()}}
                    @zone-remove=${e=>{this._removeZone(e.detail.slot)}}
                    @zone-config-change=${e=>{const{index:t,updates:i}=e.detail,s=[...this._zoneConfigs];s[t]={...s[t],...i},this._zoneConfigs=s}}
                    @room-config-change=${e=>{const{updates:t}=e.detail;void 0!==t.roomType&&(this._roomType=t.roomType),void 0!==t.roomTrigger&&(this._roomTrigger=t.roomTrigger),void 0!==t.roomRenew&&(this._roomRenew=t.roomRenew),void 0!==t.roomTimeout&&(this._roomTimeout=t.roomTimeout),void 0!==t.roomHandoffTimeout&&(this._roomHandoffTimeout=t.roomHandoffTimeout)}}
                    @dirty=${()=>{this._dirty=!0}}
                  ></epp-zone-sidebar>`:"overlays"===this._sidebarTab?Y`<epp-overlay-sidebar
                    .overlayMode=${this._overlayMode}
                    .localize=${this._localize}
                    @overlay-select=${e=>{this._overlayMode=e.detail.mode}}
                  ></epp-overlay-sidebar>`:Y`<epp-furniture-sidebar
                    .furniture=${this._furniture}
                    .selectedFurnitureId=${this._selectedFurnitureId}
                    .hass=${this.hass}
                    .localize=${this._localize}
                    .showCustomIconPicker=${this._showCustomIconPicker}
                    .customIconValue=${this._customIconValue}
                    @furniture-add=${e=>{this._addFurniture(e.detail)}}
                    @furniture-add-custom=${e=>{this._addCustomFurniture(e.detail)}}
                    @furniture-remove=${e=>{this._removeFurniture(e.detail)}}
                    @furniture-update=${e=>{this._updateFurniture(e.detail.id,e.detail.updates)}}
                    @furniture-select=${e=>{this._selectedFurnitureId=e.detail}}
                    @custom-icon-toggle=${()=>{this._showCustomIconPicker=!this._showCustomIconPicker}}
                    @custom-icon-change=${e=>{this._customIconValue=e.detail}}
                    @dirty=${()=>{this._dirty=!0}}
                  ></epp-furniture-sidebar>`}
            </div>
            ${this._renderSaveCancelButtons()}
          </div>
        </div>
      </div>
    `}_renderTemplateSaveDialog(){return Y`
      <div class="template-dialog">
        <div class="template-dialog-card">
          <h3>${this._localize("dialogs.save_template")}</h3>
          <input
            type="text"
            class="template-name-input"
            placeholder="${this._localize("dialogs.template_name")}"
            .value=${this._templateName}
            @input=${e=>{this._templateName=e.target.value}}
          />
          <div class="template-dialog-actions">
            <button
              class="wizard-btn wizard-btn-back"
              @click=${()=>{this._showTemplateSave=!1}}
            >${this._localize("common.cancel")}</button>
            <button
              class="wizard-btn wizard-btn-primary"
              ?disabled=${!this._templateName.trim()}
              @click=${()=>this._saveTemplate()}
            >${this._localize("common.save")}</button>
          </div>
        </div>
      </div>
    `}_renderTemplateLoadDialog(){const e=this._getTemplates();return Y`
      <div class="template-dialog">
        <div class="template-dialog-card">
          <h3>${this._localize("dialogs.load_template")}</h3>
          ${0===e.length?Y`<p class="overlay-help">${this._localize("dialogs.no_templates")}</p>`:Y`<div class="template-card-grid">
                  ${e.map(e=>Y`
                    <div class="template-card"
                      role="button"
                      tabindex="0"
                      @click=${()=>this._loadTemplate(e.name)}
                      @keydown=${t=>{"Enter"!==t.key&&" "!==t.key||(t.preventDefault(),this._loadTemplate(e.name))}}
                    >
                      <button class="template-card-delete"
                        type="button"
                        aria-label="${this._localize("common.delete")}"
                        @click=${t=>{t.stopPropagation(),this._deleteTemplate(e.name)}}
                        @keydown=${e=>{e.stopPropagation()}}
                      >
                        <ha-icon icon="mdi:close"></ha-icon>
                      </button>
                      <div class="template-card-thumbnail">
                        ${function(e,t,i,s,o){const r=e instanceof Uint8Array?e:new Uint8Array(e),a=di(r);if(a.minCol>a.maxCol||a.minRow>a.maxRow)return $`<svg viewBox="0 0 1 1" preserveAspectRatio="xMidYMid meet"></svg>`;const{minCol:n,maxCol:l,minRow:c,maxRow:h}=a,d=l-n+1,A=h-c+1,g=[];for(let e=c;e<=h;e++)for(let i=n;i<=l;i++){const s=r[e*ei+i];if(!ri(s))continue;const o=Mi(s,t);g.push($`<rect x="${i-n}" y="${e-c}" width="1" height="1" fill="${o}" />`)}const u=Math.ceil(i/si),p=Math.floor((ei-u)/2),_=[];for(const e of o){const t=e.x/si+p-n,i=e.y/si-c,s=e.width/si,o=e.height/si,r=t+s/2,a=i+o/2,l=e.rotation?`rotate(${e.rotation}, ${r}, ${a})`:void 0;_.push($`<rect x="${t}" y="${i}" width="${s}" height="${o}"
        fill="none" stroke="rgba(0,0,0,0.4)" stroke-width="0.15"
        rx="0.1" transform="${l??""}" />`)}return $`<svg viewBox="0 0 ${d} ${A}" preserveAspectRatio="xMidYMid meet">
    ${g}
    ${_}
  </svg>`}(e.grid,e.zones?.map(e=>e??null)??new Array(7).fill(null),e.roomWidth,e.roomDepth,e.furniture??[])}
                      </div>
                      <div class="template-card-info">
                        <div class="template-card-name">${e.name}</div>
                        <div class="template-card-size">${this._localize.formatNumber(e.roomWidth/1e3,1)}m × ${this._localize.formatNumber(e.roomDepth/1e3,1)}m</div>
                      </div>
                    </div>
                  `)}
                </div>`}
          <div class="template-dialog-actions">
            <button
              class="wizard-btn wizard-btn-back"
              @click=${()=>{this._showTemplateLoad=!1}}
            >${this._localize("common.close")}</button>
          </div>
        </div>
      </div>
    `}_renderVisibleCells(e,t,i,s,o,r=!1){const a=this._showHitCounts?this._computeHeatmapColors():null;let n;if(r){n={};for(const[e,t]of Object.entries(this._zoneState.occupancy))n[Number(e)]=t}else{const e=this._runLocalZoneEngine();n=e.occupancy;for(let t=0;t<e.targets.length&&t<this._targets.length;t++)this._targets[t].status=e.targets[t].status;const t=Object.values(n).some(e=>e);this._sensorState.occupancy=this._sensorState.static_presence||this._sensorState.motion_presence||t}const l=this._getSensorFov(),c=this._computeMaxRangeMm(),h=[];for(let r=i;r<=s;r++)for(let i=e;i<=t;i++){const e=r*ei+i,t=this._grid[e],s=Pi(i,r,l,this._roomWidth,c);let d=s?this._getCellColor(e):Di,A="";if(s&&ri(t)){const e=ai(t);if(a){const t=a.get(e);t&&(d=`linear-gradient(${t}, ${t}), linear-gradient(${d}, ${d})`)}n[e]&&(A="box-shadow: inset 0 0 0 1px rgba(0,0,0,0.4);")}h.push(Y`
          <div
            class="cell"
            style="background: ${d}; width: ${o}px; height: ${o}px; ${A}"
            @mousedown=${()=>{s&&this._onCellMouseDown(e)}}
            @mouseenter=${()=>{s&&this._onCellMouseEnter(e)}}
          ></div>
        `)}return h}_runLocalZoneEngine(){return this._targetCtrl.runLocalZoneEngine()}_enrichDebugLog(e){return this._targetCtrl.enrichDebugLog(e)}_computeHeatmapColors(){return this._targetCtrl.computeHeatmapColors()}_getZoneThresholds(e){return Ji(e,this._zoneConfigs,this._roomType,this._roomTrigger,this._roomRenew,this._roomTimeout,this._roomHandoffTimeout)}_renderBackendDebugLog(){return Y`
      <div style="margin-top: 8px; min-width: 0;">
        <button
          class="live-section-header live-section-link"
          style="font-size: 12px; gap: 4px;"
          @click=${()=>{this._showBackendDebugLog=!this._showBackendDebugLog,this._showBackendDebugLog||(this._backendDebugLogLines=[],this._backendDebugLogPrev=null)}}
        >
          <ha-icon icon=${this._showBackendDebugLog?"mdi:chevron-down":"mdi:chevron-right"} style="--mdc-icon-size: 14px;"></ha-icon>
          ${this._localize("live.debug.detection_events")}
        </button>
        ${this._showBackendDebugLog?Y`
          <div style="display: flex; justify-content: flex-end; margin-bottom: 4px; gap: 4px;">
            <button
              class="debug-log-btn"
              @click=${()=>{navigator.clipboard.writeText(this._backendDebugLogLines.join("\n"))}}
            >${this._localize("live.debug.copy_all")}</button>
            <button
              class="debug-log-btn"
              @click=${()=>{this._backendDebugLogLines=[],this._backendDebugLogPrev=null;const e=this.shadowRoot?.getElementById("backend-debug-log-scroll");if(e){e.innerHTML="";const t=document.createElement("div");t.style.cssText="color: var(--secondary-text-color, #999); font-style: italic;",t.textContent=this._localize("live.debug.waiting_for_events"),e.appendChild(t)}}}
            >${this._localize("live.debug.clear")}</button>
          </div>
          <div class="debug-log-container" id="backend-debug-log-scroll">
            <div style="color: var(--secondary-text-color, #999); font-style: italic;">${this._localize("live.debug.waiting_for_events")}</div>
          </div>
        `:J}
      </div>
    `}_renderDebugLog(){return Y`
      <div style="margin-top: 8px; min-width: 0;">
        <button
          class="live-section-header live-section-link"
          style="font-size: 12px; gap: 4px;"
          @click=${()=>{this._showDebugLog=!this._showDebugLog,this._showDebugLog||(this._debugLogLines=[],this._debugLogPrev=null)}}
        >
          <ha-icon icon=${this._showDebugLog?"mdi:chevron-down":"mdi:chevron-right"} style="--mdc-icon-size: 14px;"></ha-icon>
          ${this._localize("live.debug.detection_events")}
        </button>
        ${this._showDebugLog?Y`
          <div style="display: flex; justify-content: flex-end; margin-bottom: 4px; gap: 4px;">
            <button
              class="debug-log-btn"
              @click=${()=>{navigator.clipboard.writeText(this._debugLogLines.join("\n"))}}
            >${this._localize("live.debug.copy_all")}</button>
            <button
              class="debug-log-btn"
              @click=${()=>{this._debugLogLines=[],this._debugLogPrev=null;const e=this.shadowRoot?.getElementById("debug-log-scroll");if(e){e.innerHTML="";const t=document.createElement("div");t.style.cssText="color: var(--secondary-text-color, #999); font-style: italic;",t.textContent=this._localize("live.debug.waiting_for_events"),e.appendChild(t)}}}
            >${this._localize("live.debug.clear")}</button>
          </div>
          <div class="debug-log-container" id="debug-log-scroll">
            <div style="color: var(--secondary-text-color, #999); font-style: italic;">${this._localize("live.debug.waiting_for_events")}</div>
          </div>
        `:J}
      </div>
    `}_renderFurnitureOverlay(e,t,i,s,o){return this._furniture.length?Y`
			<epp-furniture-overlay
				.furniture=${this._furniture}
				.selectedFurnitureId=${this._selectedFurnitureId}
				.roomWidth=${this._roomWidth}
				.cellPx=${e}
				.minCol=${t}
				.minRow=${i}
				.visCols=${s}
				.visRows=${o}
				.sidebarTab=${this._sidebarTab}
				.localize=${this._localize}
				@furniture-select=${e=>{this._selectedFurnitureId=e.detail}}
				@furniture-pointer-down=${e=>{const{e:t,id:i,type:s,handle:o}=e.detail;this._onFurniturePointerDown(t,i,s,o)}}
				@furniture-delete=${e=>{this._removeFurniture(e.detail)}}
			></epp-furniture-overlay>
		`:J}async _handleUsbWifiConfig(){const e=this._flasherCtrl;if(e.opRunning)return void e.updateUsbState({step:"error",errorKey:"usb.errors.serial_port_busy",fatal:!0});const t=e.opId;e.opRunning=!0;try{if(e.serialPort||(e.updateUsbState({step:"connecting"}),e.serialPort=await navigator.serial.requestPort()),e.opId!==t)return void(e.opRunning=!1);e.updateUsbState({step:"wifi_scan"});const{writer:i,reader:s,networks:o}=await pn(e.serialPort);if(e.opId!==t)return void(e.opRunning=!1);e.wifiNetworks=o,e.updateUsbState({step:"wifi_provision"}),e._serialWriter=i,e._serialReader=s,e.opRunning=!1}catch(i){if(e.opRunning=!1,e.opId!==t)return;if("NotFoundError"===i?.name)return void e.resetUsbState();const s=i;e.updateUsbState({step:"error",errorKey:s.errorKey??"wifi.errors.scan_failed",errorParams:s.errorParams})}}async _handleUsbFlash(e){const t=this._flasherCtrl;if(t.opRunning)return void t.updateUsbState({step:"error",errorKey:"usb.errors.serial_port_busy",fatal:!0});const i=t.opId;t.opRunning=!0;try{t.updateUsbState({step:"connecting"});const s=await navigator.serial.requestPort();if(t.opId!==i)return void(t.opRunning=!1);if(t.serialPort=s,t.updateUsbState({step:"flashing",progress:0}),await async function(e,t,i,s){const o=e.close.bind(e);e.close=async()=>{};const r=new Ra(e);try{let e;const o={clean:()=>{},writeLine:t=>{const i=un.exec(t);i&&(e=i[1].toUpperCase(),s?.onMac?.(e))},write:e=>{}},a=new gn({transport:r,baudrate:115200,terminal:o});if(await a.main("default_reset"),s?.beforeFlash&&await s.beforeFlash(e),!s?.baseUrl)throw Object.assign(new Error("baseUrl is required for firmware download"),{errorKey:"usb.errors.base_url_required"});const n=`${s.baseUrl}/everything-presence-pro-${t}-manifest.json`,l=await fetch(n);if(!l.ok)throw Object.assign(new Error("Failed to download firmware manifest"),{errorKey:"usb.errors.manifest_download_failed"});const c=await l.json(),h=n.substring(0,n.lastIndexOf("/")+1),d=c.builds[0].parts,A=[];for(const e of d){const t=await fetch(`${h}${e.path}`);if(!t.ok)throw Object.assign(new Error(`Failed to download firmware file: ${e.path}`),{errorKey:"usb.errors.file_download_failed",errorParams:{file:e.path}});const i=new Uint8Array(await t.arrayBuffer());A.push({data:i,address:e.offset})}await a.writeFlash({fileArray:A,flashSize:"keep",flashMode:"keep",flashFreq:"keep",eraseAll:!1,compress:!0,reportProgress:(e,t,s)=>{i(Math.round(t/s*100))}}),await a.after("hard_reset")}finally{await r.disconnect(),e.close=o}}(s,e,e=>{t.updateUsbState({step:"flashing",progress:e})},{baseUrl:t.firmwareBaseUrl,beforeFlash:async e=>{if(!e)return;const i=t.flashableDevices.find(t=>t.mac.toUpperCase()===e);if("original"===i?.firmware_type&&i?.esphome_config_entry_id){if(!window.confirm(this._localize("flasher.confirm_delete_message")))throw Object.assign(new Error("Flash cancelled"),{errorKey:"flasher.errors.flash_cancelled"});await t.deleteEsphomeDevice(i.esphome_config_entry_id)}}}),t.opId!==i)return void(t.opRunning=!1);if(e.startsWith("ethernet"))return await s.close().catch(()=>{}),t.serialPort=null,t.opRunning=!1,void t.updateUsbState({step:"complete",variant:e});t.updateUsbState({step:"wifi_scan"});const{writer:o,reader:r,networks:a}=await pn(s);if(t.opId!==i)return void(t.opRunning=!1);t.wifiNetworks=a,t.updateUsbState({step:"wifi_provision"}),t._serialWriter=o,t._serialReader=r,t.opRunning=!1}catch(e){if(t.opId!==i)return void(t.opRunning=!1);if("NotFoundError"===e?.name)return void t.resetUsbState();if(t.serialPort){try{t.serialPort.close().catch(()=>{})}catch{}t.serialPort=null}const s=e,o=s.message??"Unknown error",r=/already open|already closed/i.test(o),a=/stream stopped|NetworkError|disconnected|break|lost|No response from device/i.test(o),n=r?"usb.errors.serial_port_busy":a?"usb.errors.device_disconnected":"usb.errors.flash_failed";t.opRunning=!1,t.updateUsbState({step:"error",errorKey:s.errorKey??n,errorParams:s.errorParams,fatal:r||"usb.errors.serial_port_busy"===s.errorKey})}}async _handleWifiProvision(e,t){const i=this._flasherCtrl,s=i.opId,o=i.serialPort;if(!o?.writable||!o?.readable)return void i.updateUsbState({step:"error",errorKey:"usb.errors.serial_port_unavailable"});try{i._serialReader?.releaseLock()}catch{}try{i._serialWriter?.releaseLock()}catch{}const r=o.writable.getWriter(),a=o.readable.getReader();i._serialWriter=r,i._serialReader=a;try{if(i.updateUsbState({step:"wifi_connecting"}),await _n(r,e,t),i.opId!==s)return;i.updateUsbState({step:"reading_ip"});let n=await fn(a,35e3);if(i.opId!==s)return;if(n)a.releaseLock(),r.releaseLock();else{a.releaseLock(),r.releaseLock(),i._serialReader=null,i._serialWriter=null;try{await o.setSignals({dataTerminalReady:!1,requestToSend:!0}),await new Promise(e=>setTimeout(e,200)),await o.setSignals({dataTerminalReady:!1,requestToSend:!1})}catch{}const e=o.readable.getReader();for(;;){const t=await Promise.race([e.read(),new Promise(e=>setTimeout(()=>e({value:void 0,done:!0}),200))]);if(t.done||!t.value)break}e.releaseLock();const t=o.writable.getWriter();let s=!1;for(let e=0;e<5;e++){e>0&&await new Promise(e=>setTimeout(e,2e3));try{await ns(t,rs());const e=o.readable.getReader();try{await ls(e,3e3),s=!0}finally{e.releaseLock()}}catch{}if(s)break}if(s){const e=o.readable.getReader();i._serialWriter=t,i._serialReader=e,n=await fn(e,15e3),e.releaseLock()}t.releaseLock()}i._serialReader=null,i._serialWriter=null,await o.close().catch(()=>{}),i.serialPort=null,n&&(i.updateUsbState({step:"adding_device"}),await i.addEsphomeDevice(n)),i.updateUsbState({step:"complete",ip:n??void 0})}catch(e){try{i._serialReader?.releaseLock()}catch{}try{i._serialWriter?.releaseLock()}catch{}if(i._serialReader=null,i._serialWriter=null,i.opId!==s)return;const t=e;i.updateUsbState({step:"error",errorKey:t.errorKey??"wifi.errors.provisioning_failed",errorParams:t.errorParams})}}async _handleWifiScan(){const e=this._flasherCtrl;if(e.serialPort)try{e.updateUsbState({step:"wifi_scan"});const t=e._serialWriter,i=e._serialReader;try{i?.releaseLock()}catch{}try{t?.releaseLock()}catch{}const s=await pn(e.serialPort);e._serialWriter=s.writer,e._serialReader=s.reader,e.wifiNetworks=s.networks,e.updateUsbState({step:"wifi_provision"})}catch(t){console.error("WiFi scan failed:",t);const i=t;e.updateUsbState({step:"error",errorKey:i.errorKey??"wifi.errors.scan_failed",errorParams:i.errorParams})}}}wn.styles=[Mt,kt,Rt,Tt,zt,Qt,Ht,Lt,a`
    .cell {
      cursor: pointer;
      transition: opacity 0.1s;
    }

    .cell:hover {
      opacity: 0.75;
    }

    .overlay-help {
      font-size: 13px;
      color: var(--secondary-text-color, #757575);
      margin: 0;
    }

    .loading-container {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      width: 100%;
      font-size: 16px;
      color: var(--secondary-text-color, #757575);
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 48px 16px;
      font-size: 16px;
      color: var(--secondary-text-color, #757575);
    }

    .save-cancel-bar {
      display: flex;
      justify-content: space-between;
      padding: 12px;
      border-top: 1px solid var(--divider-color, #eee);
      margin-top: auto;
    }

    .live-section-link {
      cursor: pointer;
      background: none;
      border: none;
      color: var(--primary-color, #03a9f4);
    }

    .live-section-link:hover {
      text-decoration: underline;
    }

    .live-section-header {
      font-size: 11px;
      font-weight: 600;
      color: var(--secondary-text-color, #888);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 4px 12px 6px;
    }

    .debug-log-container {
      max-height: 200px;
      overflow-y: auto;
      overflow-x: hidden;
      background: var(--card-background-color, #1e1e1e);
      border: 1px solid var(--divider-color, #333);
      border-radius: 6px;
      padding: 6px 8px;
      font-family: monospace;
      font-size: 11px;
      line-height: 1.5;
    }

    .debug-log-line {
      white-space: pre-wrap;
      word-break: break-all;
      color: var(--primary-text-color, #e0e0e0);
    }

    .debug-log-btn {
      background: none;
      border: 1px solid var(--divider-color, #444);
      border-radius: 4px;
      color: var(--secondary-text-color, #999);
      font-size: 10px;
      padding: 2px 8px;
      cursor: pointer;
    }

    .debug-log-btn:hover {
      color: var(--primary-text-color);
      border-color: var(--primary-text-color, #ccc);
    }

    .target-menu-backdrop {
      position: absolute;
      inset: 0;
      z-index: 30;
    }

    .target-menu {
      position: absolute;
      transform: translate(-50%, 8px);
      z-index: 31;
      background: var(--card-background-color, #1e1e1e);
      border: 1px solid var(--divider-color, #444);
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      padding: 4px 0;
      min-width: 180px;
    }

    .target-menu-item {
      display: block;
      width: 100%;
      padding: 8px 16px;
      background: none;
      border: none;
      color: var(--primary-text-color, #e0e0e0);
      font-size: 13px;
      text-align: left;
      cursor: pointer;
    }

    .target-menu-item:hover {
      background: var(--secondary-background-color, #333);
    }

    .tab-layout {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
    }

    .tab-layout > :not(.tab-bar) {
      flex: 1;
      overflow: auto;
    }

    .tab-bar {
      display: flex;
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
      background: var(--app-header-background-color, var(--primary-color));
      padding: 0 16px;
      flex-shrink: 0;
    }

    .tab {
      padding: 12px 20px;
      border: none;
      background: none;
      color: var(--app-header-text-color, white);
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      opacity: 0.7;
      border-bottom: 3px solid transparent;
    }

    .tab.active {
      opacity: 1;
      border-bottom-color: var(--app-header-text-color, white);
    }

    .primary-btn {
      padding: 10px 24px;
      border-radius: 10px;
      border: none;
      cursor: pointer;
      font-size: 15px;
      font-weight: 500;
      background: var(--primary-color, #03a9f4);
      color: #fff;
    }

  `],e([ge({attribute:!1})],wn.prototype,"hass",void 0),e([ue()],wn.prototype,"_grid",void 0),e([ue()],wn.prototype,"_zoneConfigs",void 0),e([ue()],wn.prototype,"_activeZone",void 0),e([ue()],wn.prototype,"_roomType",void 0),e([ue()],wn.prototype,"_roomTrigger",void 0),e([ue()],wn.prototype,"_roomRenew",void 0),e([ue()],wn.prototype,"_roomTimeout",void 0),e([ue()],wn.prototype,"_roomHandoffTimeout",void 0),e([ue()],wn.prototype,"_targetAutoDistance",void 0),e([ue()],wn.prototype,"_targetMaxDistance",void 0),e([ue()],wn.prototype,"_staticAutoDistance",void 0),e([ue()],wn.prototype,"_staticMinDistance",void 0),e([ue()],wn.prototype,"_staticMaxDistance",void 0),e([ue()],wn.prototype,"_temperatureOffset",void 0),e([ue()],wn.prototype,"_humidityOffset",void 0),e([ue()],wn.prototype,"_illuminanceOffset",void 0),e([ue()],wn.prototype,"_motionTimeout",void 0),e([ue()],wn.prototype,"_staticTimeout",void 0),e([ue()],wn.prototype,"_staticTriggerThreshold",void 0),e([ue()],wn.prototype,"_staticRenewThreshold",void 0),e([ue()],wn.prototype,"_staticOnDelay",void 0),e([ue()],wn.prototype,"_logLevels",void 0),e([ue()],wn.prototype,"_bluetoothEnabled",void 0),e([ue()],wn.prototype,"_co2Enabled",void 0),e([ue()],wn.prototype,"_ledMode",void 0),e([ue()],wn.prototype,"_ledBrightness",void 0),e([ue()],wn.prototype,"_ledPresenceColor",void 0),e([ue()],wn.prototype,"_relayTriggerMode",void 0),e([ue()],wn.prototype,"_relayContactMode",void 0),e([ue()],wn.prototype,"_targetUpdateRateMs",void 0),e([ue()],wn.prototype,"_zoneUpdateRateMs",void 0),e([ue()],wn.prototype,"_entitiesConfig",void 0),e([ue()],wn.prototype,"_sidebarTab",void 0),e([ue()],wn.prototype,"_panelTab",void 0),e([ue()],wn.prototype,"_showDeleteCalibrationDialog",void 0),e([ue()],wn.prototype,"_showLiveMenu",void 0),e([ue()],wn.prototype,"_showCustomIconPicker",void 0),e([ue()],wn.prototype,"_customIconValue",void 0),e([ue()],wn.prototype,"_furniture",void 0),e([ue()],wn.prototype,"_selectedFurnitureId",void 0),e([ue()],wn.prototype,"_targets",void 0),e([ue()],wn.prototype,"_rawTargets",void 0),e([ue()],wn.prototype,"_sensorState",void 0),e([ue()],wn.prototype,"_zoneState",void 0),e([ue()],wn.prototype,"_showHitCounts",void 0),e([ue()],wn.prototype,"_showDebugLog",void 0),e([ue()],wn.prototype,"_showBackendDebugLog",void 0),e([ue()],wn.prototype,"_overlayMode",void 0),e([ue()],wn.prototype,"_targetMenu",void 0),e([ue()],wn.prototype,"_isPainting",void 0),e([ue()],wn.prototype,"_paintAction",void 0),e([ue()],wn.prototype,"_saving",void 0),e([ue()],wn.prototype,"_dirty",void 0),e([ue()],wn.prototype,"_showUnsavedDialog",void 0),e([ue()],wn.prototype,"_showTemplateSave",void 0),e([ue()],wn.prototype,"_showTemplateLoad",void 0),e([ue()],wn.prototype,"_templateName",void 0),e([ue()],wn.prototype,"_devices",void 0),e([ue()],wn.prototype,"_selectedMac",void 0),e([ue()],wn.prototype,"_loading",void 0),e([ue()],wn.prototype,"_haConnected",void 0),e([ue()],wn.prototype,"_setupStep",void 0),e([ue()],wn.prototype,"_view",void 0),e([ue()],wn.prototype,"_openAccordions",void 0),e([ue()],wn.prototype,"_perspective",void 0),e([ue()],wn.prototype,"_roomWidth",void 0),e([ue()],wn.prototype,"_roomDepth",void 0),customElements.get("eppgrid-panel")||customElements.define("eppgrid-panel",wn);class En extends ce{setConfig(e){}render(){return Y`<eppgrid-panel .hass=${this.hass}></eppgrid-panel>`}}En.styles=a`:host { display: block; height: 100%; }`,e([ge({attribute:!1})],En.prototype,"hass",void 0),customElements.get("epp-device-card")||customElements.define("epp-device-card",En);class mn{static async generate(){return{views:[{title:"Everything Presence Pro Grid",cards:[{type:"custom:epp-device-card"}]}]}}}window.customCards=window.customCards||[],window.customCards.push({type:"epp-device-card",name:"Everything Presence Pro Grid",description:"Device configuration, calibration, zone editor, and firmware flasher"}),window.customStrategies=window.customStrategies||{},window.customStrategies.eppgrid={generateDashboard:()=>mn.generate()};var bn=1074521580,yn="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",vn=1074520064,Cn="DMD8P+znC0B/6AtAZ+0LQAbpC0Cf6AtABukLQGXpC0CC6gtA9OoLQJ3qC0CV5wtAGuoLQHTqC0CI6QtAGOsLQLDpC0AY6wtAbegLQMroC0AG6QtAZekLQIXoC0DI6wtAKe0LQLjmC0BL7QtAuOYLQLjmC0C45gtAuOYLQLjmC0C45gtAuOYLQLjmC0Bv6wtAuOYLQEnsC0Ap7QtA",Bn=1073605544,xn=1073528832,Sn={entry:bn,text:yn,text_start:vn,data:Cn,data_start:Bn,bss_start:xn},In=Object.freeze({__proto__:null,bss_start:xn,data:Cn,data_start:Bn,default:Sn,entry:bn,text:yn,text_start:vn}),Dn=1077413304,Mn="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",kn=1077411840,Rn="DEDKP+AIOEAsCThAhAk4QFIKOEC+CjhAbAo4QKgHOEAOCjhATgo4QJgJOEBYBzhAzAk4QFgHOEC6CDhA/gg4QCwJOECECThAzAg4QBIIOEBCCDhAyAg4QBYNOEAsCThA1gs4QMoMOECkBjhA9Aw4QKQGOECkBjhApAY4QKQGOECkBjhApAY4QKQGOECkBjhAcgs4QKQGOEDyCzhAygw4QA==",Tn=1070295976,Fn=1070219264,Pn={entry:Dn,text:Mn,text_start:kn,data:Rn,data_start:Tn,bss_start:Fn},Un=Object.freeze({__proto__:null,bss_start:Fn,data:Rn,data_start:Tn,default:Pn,entry:Dn,text:Mn,text_start:kn}),Qn=1077413584,zn="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",On=1077411840,Hn="GEDIP8AKOEAQCzhAaAs4QDYMOECiDDhAUAw4QHIJOEDyCzhAMgw4QHwLOEAiCThAsAs4QCIJOECaCjhA4Ao4QBALOEBoCzhArAo4QNYJOEAgCjhAqAo4QPoOOEAQCzhAug04QLIOOEBiCDhA2g44QGIIOEBiCDhAYgg4QGIIOEBiCDhAYgg4QGIIOEBiCDhAVg04QGIIOEDYDThAsg44QA==",Gn=1070164916,Ln=1070088192,Nn={entry:Qn,text:zn,text_start:On,data:Hn,data_start:Gn,bss_start:Ln},Yn=Object.freeze({__proto__:null,bss_start:Ln,data:Hn,data_start:Gn,default:Nn,entry:Qn,text:zn,text_start:On}),$n=1082133128,Kn="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",Jn=1082130432,Wn="GACEQOYOgEBQD4BA5A+AQLgQgEAgEYBAzhCAQEINgEB0EIBAtBCAQAAQgEDyDIBAKBCAQPIMgEDEDoBADg+AQFAPgEDkD4BA1g6AQGoNgECYDYBA0g6AQBoTgEBQD4BA3BGAQNYSgEAwDIBA/BKAQDAMgEAwDIBAMAyAQDAMgEAwDIBAMAyAQDAMgEAwDIBAghGAQDAMgED0EYBA1hKAQA==",jn=1082469304,Vn=1082392576,Zn={entry:$n,text:Kn,text_start:Jn,data:Wn,data_start:jn,bss_start:Vn},Xn=Object.freeze({__proto__:null,bss_start:Vn,data:Wn,data_start:jn,default:Zn,entry:$n,text:Kn,text_start:Jn}),qn=1082132164,el="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",tl=1082130432,il="FACEQHIKgEDCCoBAGguAQOgLgEBUDIBAAgyAQD4JgECkC4BA5AuAQC4LgEDuCIBAYguAQO4IgEBMCoBAkgqAQMIKgEAaC4BAXgqAQKIJgEDSCYBAWgqAQKwOgEDCCoBAbA2AQGQOgEAuCIBAjA6AQC4IgEAuCIBALgiAQC4IgEAuCIBALgiAQC4IgEAuCIBACA2AQC4IgECKDYBAZA6AQA==",sl=1082469296,ol=1082392576,rl={entry:qn,text:el,text_start:tl,data:il,data_start:sl,bss_start:ol},al=Object.freeze({__proto__:null,bss_start:ol,data:il,data_start:sl,default:rl,entry:qn,text:el,text_start:tl}),nl=1082132164,ll="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",cl=1082130432,hl="FECAQHQKgEDECoBAHAuAQOoLgEBWDIBABAyAQEAJgECmC4BA5guAQDALgEDwCIBAZAuAQPAIgEBOCoBAlAqAQMQKgEAcC4BAYAqAQKQJgEDUCYBAXAqAQK4OgEDECoBAbg2AQGYOgEAwCIBAjg6AQDAIgEAwCIBAMAiAQDAIgEAwCIBAMAiAQDAIgEAwCIBACg2AQDAIgECMDYBAZg6AQA==",dl=1082223536,Al=1082146816,gl={entry:nl,text:ll,text_start:cl,data:hl,data_start:dl,bss_start:Al},ul=Object.freeze({__proto__:null,bss_start:Al,data:hl,data_start:dl,default:gl,entry:nl,text:ll,text_start:cl}),pl=1082132164,_l="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",fl=1082130432,wl="FACDQHIKgEDCCoBAGguAQOgLgEBUDIBAAgyAQD4JgECkC4BA5AuAQC4LgEDuCIBAYguAQO4IgEBMCoBAkgqAQMIKgEAaC4BAXgqAQKIJgEDSCYBAWgqAQKwOgEDCCoBAbA2AQGQOgEAuCIBAjA6AQC4IgEAuCIBALgiAQC4IgEAuCIBALgiAQC4IgEAuCIBACA2AQC4IgECKDYBAZA6AQA==",El=1082403760,ml=1082327040,bl={entry:pl,text:_l,text_start:fl,data:wl,data_start:El,bss_start:ml},yl=Object.freeze({__proto__:null,bss_start:ml,data:wl,data_start:El,default:bl,entry:pl,text:_l,text_start:fl}),vl=1341196642,Cl="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",Bl=1341194240,xl="YAD1T3gO8U/GDvFPZA/xT0oQ8U+kEPFPXBDxT8oM8U/+D/FPRhDxT4IP8U96DPFPqg/xT3oM8U9UDvFPkg7xT8YO8U9kD/FPZg7xT/QM8U8oDfFPYg7xT3YU8U/GDvFPGBLxTzYU8U8eC/FPWhTxTx4L8U8eC/FPHgvxTx4L8U8eC/FPHgvxTx4L8U8eC/FPthHxTx4L8U9SE/FPNhTxTw==",Sl=1341533180,Il=1341456384,Dl={entry:vl,text:Cl,text_start:Bl,data:xl,data_start:Sl,bss_start:Il},Ml=Object.freeze({__proto__:null,bss_start:Il,data:xl,data_start:Sl,default:Dl,entry:vl,text:Cl,text_start:Bl}),kl=1341459344,Rl="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",Tl=1341456384,Fl="YAD2T8oQ9U80EfVP0BH1T6wS9U8UE/VPwhL1TwQP9U9oEvVPqBL1T+wR9U+0DvVPFBL1T7QO9U+mEPVP8hD1TzQR9U/QEfVPuBD1TywP9U9gD/VPtBD1TxIV9U80EfVP2BP1T9IU9U9YDfVP9hT1T1gN9U9YDfVPWA31T1gN9U9YDfVPWA31T1gN9U9YDfVPdhP1T1gN9U/wE/VP0hT1Tw==",Pl=1341598720,Ul=1341521920,Ql={entry:kl,text:Rl,text_start:Tl,data:Fl,data_start:Pl,bss_start:Ul},zl=Object.freeze({__proto__:null,bss_start:Ul,data:Fl,data_start:Pl,default:Ql,entry:kl,text:Rl,text_start:Tl}),Ol=1073907716,Hl="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",Gl=1073905664,Ll="WAD9P0uLAkDdiwJA8pACQGaMAkD+iwJAZowCQMWMAkDejQJAUY4CQPmNAkDVigJAd40CQNCNAkDojAJAdI4CQBCNAkB0jgJAy4sCQCqMAkBmjAJAxYwCQOOLAkAXiwJAN48CQKqQAkDqiQJA0ZACQOqJAkDqiQJA6okCQOqJAkDqiQJA6okCQOqJAkDqiQJA1I4CQOqJAkDJjwJAqpACQA==",Nl=1073622012,Yl=1073545216,$l={entry:Ol,text:Hl,text_start:Gl,data:Ll,data_start:Nl,bss_start:Yl},Kl=Object.freeze({__proto__:null,bss_start:Yl,data:Ll,data_start:Nl,default:$l,entry:Ol,text:Hl,text_start:Gl}),Jl=1077381760,Wl="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",jl=1077379072,Vl="XADKP16ON0AzjzdAR5Q3QL2PN0BTjzdAvY83QB2QN0A6kTdArJE3QFWRN0DpjTdA0JA3QCyRN0BAkDdA0JE3QGiQN0DQkTdAIY83QH6PN0C9jzdAHZA3QDmPN0AqjjdAkJI3QA2UN0AAjTdALZQ3QACNN0AAjTdAAI03QACNN0AAjTdAAI03QACNN0AAjTdAKpI3QACNN0AlkzdADZQ3QAQInwAAAAAAAAAYAQQIBQAAAAAAAAAIAQQIBgAAAAAAAAAAAQQIIQAAAAAAIAAAEQQI3AAAAAAAIAAAEQQIDAAAAAAAIAAAAQQIEgAAAAAAIAAAESAoDAAQAQAA",Zl=1070279676,Xl=1070202880,ql={entry:Jl,text:Wl,text_start:jl,data:Vl,data_start:Zl,bss_start:Xl},ec=Object.freeze({__proto__:null,bss_start:Xl,data:Vl,data_start:Zl,default:ql,entry:Jl,text:Wl,text_start:jl}),tc=1074843652,ic="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",sc=1074843648,oc="CIH+PwUFBAACAwcAAwMLANTXEEAL2BBAOdgQQNbYEECF5xBAOtkQQJDZEEDc2RBAhecQQKLaEEAf2xBA4NsQQIXnEECF5xBAeNwQQIXnEEBV3xBAHOAQQFfgEECF5xBAhecQQPPgEECF5xBA2+EQQIHiEEDA4xBAf+QQQFDlEECF5xBAhecQQIXnEECF5xBAfuYQQIXnEEB05xBAsN0QQKnYEEDC5RBAydoQQBvaEECF5xBACOcQQE/nEECF5xBAhecQQIXnEECF5xBAhecQQIXnEECF5xBAhecQQELaEEB/2hBA2uUQQAEAAAACAAAAAwAAAAQAAAAFAAAABwAAAAkAAAANAAAAEQAAABkAAAAhAAAAMQAAAEEAAABhAAAAgQAAAMEAAAABAQAAgQEAAAECAAABAwAAAQQAAAEGAAABCAAAAQwAAAEQAAABGAAAASAAAAEwAAABQAAAAWAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAABAAAAAgAAAAIAAAADAAAAAwAAAAQAAAAEAAAABQAAAAUAAAAGAAAABgAAAAcAAAAHAAAACAAAAAgAAAAJAAAACQAAAAoAAAAKAAAACwAAAAsAAAAMAAAADAAAAA0AAAANAAAAAAAAAAAAAAADAAAABAAAAAUAAAAGAAAABwAAAAgAAAAJAAAACgAAAAsAAAANAAAADwAAABEAAAATAAAAFwAAABsAAAAfAAAAIwAAACsAAAAzAAAAOwAAAEMAAABTAAAAYwAAAHMAAACDAAAAowAAAMMAAADjAAAAAgEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAQAAAAEAAAABAAAAAgAAAAIAAAACAAAAAgAAAAMAAAADAAAAAwAAAAMAAAAEAAAABAAAAAQAAAAEAAAABQAAAAUAAAAFAAAABQAAAAAAAAAAAAAAAAAAABAREgAIBwkGCgULBAwDDQIOAQ8AAQEAAAEAAAAEAAAA",rc=1073720488,ac=1073643776,nc={entry:tc,text:ic,text_start:sc,data:oc,data_start:rc,bss_start:ac},lc=Object.freeze({__proto__:null,bss_start:ac,data:oc,data_start:rc,default:nc,entry:tc,text:ic,text_start:sc});class cc extends Ya{constructor(){super(...arguments),this.CHIP_NAME="ESP32",this.IMAGE_CHIP_ID=0,this.EFUSE_RD_REG_BASE=1073061888,this.DR_REG_SYSCON_BASE=1073111040,this.UART_CLKDIV_REG=1072955412,this.UART_CLKDIV_MASK=1048575,this.UART_DATE_REG_ADDR=1610612856,this.XTAL_CLK_DIVIDER=1,this.IROM_MAP_START=1074593792,this.IROM_MAP_END=1077936128,this.DROM_MAP_START=1061158912,this.DROM_MAP_END=1065353216,this.MEMORY_MAP=[[0,65536,"PADDING"],[1061158912,1065353216,"DROM"],[1065353216,1069547520,"EXTRAM_DATA"],[1073217536,1073225728,"RTC_DRAM"],[1073283072,1073741824,"BYTE_ACCESSIBLE"],[1073405952,1073741824,"DRAM"],[1073610752,1073741820,"DIRAM_DRAM"],[1073741824,1074200576,"IROM"],[1074200576,1074233344,"CACHE_PRO"],[1074233344,1074266112,"CACHE_APP"],[1074266112,1074397184,"IRAM"],[1074397184,1074528252,"DIRAM_IRAM"],[1074528256,1074536448,"RTC_IRAM"],[1074593792,1077936128,"IROM"],[1342177280,1342185472,"RTC_DATA"]],this.FLASH_SIZES={"1MB":0,"2MB":16,"4MB":32,"8MB":48,"16MB":64,"32MB":80,"64MB":96,"128MB":112},this.FLASH_FREQUENCY={"80m":15,"40m":0,"26m":1,"20m":2},this.FLASH_WRITE_SIZE=1024,this.BOOTLOADER_FLASH_OFFSET=4096,this.SPI_REG_BASE=1072963584,this.SPI_USR_OFFS=28,this.SPI_USR1_OFFS=32,this.SPI_USR2_OFFS=36,this.SPI_W0_OFFS=128,this.SPI_MOSI_DLEN_OFFS=40,this.SPI_MISO_DLEN_OFFS=44}async readEfuse(e,t){const i=this.EFUSE_RD_REG_BASE+4*t;return e.debug("Read efuse "+i),await e.readReg(i)}async getPkgVersion(e){const t=await this.readEfuse(e,3);let i=t>>9&7;return i+=(t>>2&1)<<3,i}async getChipRevision(e){const t=await this.readEfuse(e,3),i=await this.readEfuse(e,5),s=await e.readReg(this.DR_REG_SYSCON_BASE+124);return 0!=(t>>15&1)?0!=(i>>20&1)?0!=(s>>31&1)?3:2:1:0}async getChipDescription(e){const t=["ESP32-D0WDQ6","ESP32-D0WD","ESP32-D2WD","","ESP32-U4WDH","ESP32-PICO-D4","ESP32-PICO-V3-02"];let i="";const s=await this.getPkgVersion(e),o=await this.getChipRevision(e),r=3==o;return 0!=(1&await this.readEfuse(e,3))&&(t[0]="ESP32-S0WDQ6",t[1]="ESP32-S0WD"),r&&(t[5]="ESP32-PICO-V3"),i=s>=0&&s<=6?t[s]:"Unknown ESP32",!r||0!==s&&1!==s||(i+="-V3"),i+" (revision "+o+")"}async getChipFeatures(e){const t=["Wi-Fi"],i=await this.readEfuse(e,3);0===(2&i)&&t.push(" BT");0!==(1&i)?t.push(" Single Core"):t.push(" Dual Core");if(0!==(8192&i)){0!==(4096&i)?t.push(" 160MHz"):t.push(" 240MHz")}const s=await this.getPkgVersion(e);-1!==[2,4,5,6].indexOf(s)&&t.push(" Embedded Flash"),6===s&&t.push(" Embedded PSRAM");0!==(await this.readEfuse(e,4)>>8&31)&&t.push(" VRef calibration in efuse");0!==(i>>14&1)&&t.push(" BLK3 partially reserved");const o=3&await this.readEfuse(e,6);return t.push(" Coding Scheme "+["None","3/4","Repeat (UNSUPPORTED)","Invalid"][o]),t}async getCrystalFreq(e){const t=await e.readReg(this.UART_CLKDIV_REG)&this.UART_CLKDIV_MASK,i=e.transport.baudrate*t/1e6/this.XTAL_CLK_DIVIDER;let s;return s=i>33?40:26,Math.abs(s-i)>1&&e.info("WARNING: Unsupported crystal in use"),s}_d2h(e){const t=(+e).toString(16);return 1===t.length?"0"+t:t}async readMac(e){let t=await this.readEfuse(e,1);t>>>=0;let i=await this.readEfuse(e,2);i>>>=0;const s=new Uint8Array(6);return s[0]=i>>8&255,s[1]=255&i,s[2]=t>>24&255,s[3]=t>>16&255,s[4]=t>>8&255,s[5]=255&t,this._d2h(s[0])+":"+this._d2h(s[1])+":"+this._d2h(s[2])+":"+this._d2h(s[3])+":"+this._d2h(s[4])+":"+this._d2h(s[5])}}var hc=Object.freeze({__proto__:null,ESP32ROM:cc});class dc extends cc{constructor(){super(...arguments),this.CHIP_NAME="ESP32-C3",this.IMAGE_CHIP_ID=5,this.EFUSE_BASE=1610647552,this.MAC_EFUSE_REG=this.EFUSE_BASE+68,this.UART_CLKDIV_REG=1072955412,this.UART_CLKDIV_MASK=1048575,this.UART_DATE_REG_ADDR=1610612860,this.FLASH_WRITE_SIZE=1024,this.BOOTLOADER_FLASH_OFFSET=0,this.SPI_REG_BASE=1610620928,this.SPI_USR_OFFS=24,this.SPI_USR1_OFFS=28,this.SPI_USR2_OFFS=32,this.SPI_MOSI_DLEN_OFFS=36,this.SPI_MISO_DLEN_OFFS=40,this.SPI_W0_OFFS=88,this.IROM_MAP_START=1107296256,this.IROM_MAP_END=1115684864,this.MEMORY_MAP=[[0,65536,"PADDING"],[1006632960,1015021568,"DROM"],[1070071808,1070465024,"DRAM"],[1070104576,1070596096,"BYTE_ACCESSIBLE"],[1072693248,1072824320,"DROM_MASK"],[1073741824,1074135040,"IROM_MASK"],[1107296256,1115684864,"IROM"],[1077395456,1077805056,"IRAM"],[1342177280,1342185472,"RTC_IRAM"],[1342177280,1342185472,"RTC_DRAM"],[1611653120,1611661312,"MEM_INTERNAL2"]]}async getPkgVersion(e){const t=this.EFUSE_BASE+68+12;return await e.readReg(t)>>21&7}async getChipRevision(e){const t=this.EFUSE_BASE+68+12;return(await e.readReg(t)&7<<18)>>18}async getMinorChipVersion(e){const t=this.EFUSE_BASE+68+20,i=await e.readReg(t)>>23&1,s=this.EFUSE_BASE+68+12;return(i<<3)+(await e.readReg(s)>>18&7)}async getMajorChipVersion(e){const t=this.EFUSE_BASE+68+20;return await e.readReg(t)>>24&3}async getChipDescription(e){const t=await this.getPkgVersion(e),i=await this.getMajorChipVersion(e),s=await this.getMinorChipVersion(e);return`${{0:"ESP32-C3 (QFN32)",1:"ESP8685 (QFN28)",2:"ESP32-C3 AZ (QFN32)",3:"ESP8686 (QFN24)"}[t]||"Unknown ESP32-C3"} (revision v${i}.${s})`}async getFlashCap(e){const t=this.EFUSE_BASE+68+12;return await e.readReg(t)>>27&7}async getFlashVendor(e){const t=this.EFUSE_BASE+68+16;return{1:"XMC",2:"GD",3:"FM",4:"TT",5:"ZBIT"}[7&await e.readReg(t)]||""}async getChipFeatures(e){const t=["Wi-Fi","BLE"],i=await this.getFlashCap(e),s=await this.getFlashVendor(e),o={0:null,1:"Embedded Flash 4MB",2:"Embedded Flash 2MB",3:"Embedded Flash 1MB",4:"Embedded Flash 8MB"}[i],r=void 0!==o?o:"Unknown Embedded Flash";return null!==o&&t.push(`${r} (${s})`),t}async getCrystalFreq(e){return 40}_d2h(e){const t=(+e).toString(16);return 1===t.length?"0"+t:t}async readMac(e){let t=await e.readReg(this.MAC_EFUSE_REG);t>>>=0;let i=await e.readReg(this.MAC_EFUSE_REG+4);i=i>>>0&65535;const s=new Uint8Array(6);return s[0]=i>>8&255,s[1]=255&i,s[2]=t>>24&255,s[3]=t>>16&255,s[4]=t>>8&255,s[5]=255&t,this._d2h(s[0])+":"+this._d2h(s[1])+":"+this._d2h(s[2])+":"+this._d2h(s[3])+":"+this._d2h(s[4])+":"+this._d2h(s[5])}getEraseSize(e,t){return t}}var Ac=Object.freeze({__proto__:null,ESP32C3ROM:dc});var gc=Object.freeze({__proto__:null,ESP32C2ROM:class extends dc{constructor(){super(...arguments),this.CHIP_NAME="ESP32-C2",this.IMAGE_CHIP_ID=12,this.EFUSE_BASE=1610647552,this.MAC_EFUSE_REG=this.EFUSE_BASE+64,this.UART_CLKDIV_REG=1610612756,this.UART_CLKDIV_MASK=1048575,this.UART_DATE_REG_ADDR=1610612860,this.XTAL_CLK_DIVIDER=1,this.FLASH_WRITE_SIZE=1024,this.BOOTLOADER_FLASH_OFFSET=0,this.SPI_REG_BASE=1610620928,this.SPI_USR_OFFS=24,this.SPI_USR1_OFFS=28,this.SPI_USR2_OFFS=32,this.SPI_MOSI_DLEN_OFFS=36,this.SPI_MISO_DLEN_OFFS=40,this.SPI_W0_OFFS=88,this.IROM_MAP_START=1107296256,this.IROM_MAP_END=1111490560,this.MEMORY_MAP=[[0,65536,"PADDING"],[1006632960,1010827264,"DROM"],[1070202880,1070465024,"DRAM"],[1070104576,1070596096,"BYTE_ACCESSIBLE"],[1072693248,1073020928,"DROM_MASK"],[1073741824,1074331648,"IROM_MASK"],[1107296256,1111490560,"IROM"],[1077395456,1077673984,"IRAM"]]}async getPkgVersion(e){const t=this.EFUSE_BASE+64+4;return await e.readReg(t)>>22&7}async getChipRevision(e){const t=this.EFUSE_BASE+64+4;return(await e.readReg(t)&3<<20)>>20}async getChipDescription(e){let t;const i=await this.getPkgVersion(e);t=0===i||1===i?"ESP32-C2":"unknown ESP32-C2";return t+=" (revision "+await this.getChipRevision(e)+")",t}async getChipFeatures(e){return["Wi-Fi","BLE"]}async getCrystalFreq(e){const t=await e.readReg(this.UART_CLKDIV_REG)&this.UART_CLKDIV_MASK,i=e.transport.baudrate*t/1e6/this.XTAL_CLK_DIVIDER;let s;return s=i>33?40:26,Math.abs(s-i)>1&&e.info("WARNING: Unsupported crystal in use"),s}async changeBaudRate(e){26===await this.getCrystalFreq(e)&&e.changeBaud()}_d2h(e){const t=(+e).toString(16);return 1===t.length?"0"+t:t}async readMac(e){let t=await e.readReg(this.MAC_EFUSE_REG);t>>>=0;let i=await e.readReg(this.MAC_EFUSE_REG+4);i=i>>>0&65535;const s=new Uint8Array(6);return s[0]=i>>8&255,s[1]=255&i,s[2]=t>>24&255,s[3]=t>>16&255,s[4]=t>>8&255,s[5]=255&t,this._d2h(s[0])+":"+this._d2h(s[1])+":"+this._d2h(s[2])+":"+this._d2h(s[3])+":"+this._d2h(s[4])+":"+this._d2h(s[5])}getEraseSize(e,t){return t}}});class uc extends dc{constructor(){super(...arguments),this.CHIP_NAME="ESP32-C6",this.IMAGE_CHIP_ID=13,this.EFUSE_BASE=1611335680,this.EFUSE_BLOCK1_ADDR=this.EFUSE_BASE+68,this.MAC_EFUSE_REG=this.EFUSE_BASE+68,this.UART_CLKDIV_REG=1072955412,this.UART_CLKDIV_MASK=1048575,this.UART_DATE_REG_ADDR=1610612860,this.FLASH_WRITE_SIZE=1024,this.BOOTLOADER_FLASH_OFFSET=0,this.SPI_REG_BASE=1610620928,this.SPI_USR_OFFS=24,this.SPI_USR1_OFFS=28,this.SPI_USR2_OFFS=32,this.SPI_MOSI_DLEN_OFFS=36,this.SPI_MISO_DLEN_OFFS=40,this.SPI_W0_OFFS=88,this.IROM_MAP_START=1107296256,this.IROM_MAP_END=1115684864,this.MEMORY_MAP=[[0,65536,"PADDING"],[1107296256,1124073472,"DROM"],[1082130432,1082654720,"DRAM"],[1082130432,1082654720,"BYTE_ACCESSIBLE"],[1074048e3,1074069504,"DROM_MASK"],[1073741824,1074048e3,"IROM_MASK"],[1107296256,1124073472,"IROM"],[1082130432,1082654720,"IRAM"],[1342177280,1342193664,"RTC_IRAM"],[1342177280,1342193664,"RTC_DRAM"],[1611653120,1611661312,"MEM_INTERNAL2"]]}async getPkgVersion(e){const t=this.EFUSE_BASE+68+12;return await e.readReg(t)>>21&7}async getChipRevision(e){const t=this.EFUSE_BASE+68+12;return(await e.readReg(t)&7<<18)>>18}async getChipDescription(e){let t;t=0===await this.getPkgVersion(e)?"ESP32-C6":"unknown ESP32-C6";return t+=" (revision "+await this.getChipRevision(e)+")",t}async getChipFeatures(e){return["Wi-Fi 6","BT 5","IEEE802.15.4"]}async getCrystalFreq(e){return 40}_d2h(e){const t=(+e).toString(16);return 1===t.length?"0"+t:t}async readMac(e){let t=await e.readReg(this.MAC_EFUSE_REG);t>>>=0;let i=await e.readReg(this.MAC_EFUSE_REG+4);i=i>>>0&65535;const s=new Uint8Array(6);return s[0]=i>>8&255,s[1]=255&i,s[2]=t>>24&255,s[3]=t>>16&255,s[4]=t>>8&255,s[5]=255&t,this._d2h(s[0])+":"+this._d2h(s[1])+":"+this._d2h(s[2])+":"+this._d2h(s[3])+":"+this._d2h(s[4])+":"+this._d2h(s[5])}getEraseSize(e,t){return t}}var pc=Object.freeze({__proto__:null,ESP32C6ROM:uc});var _c=Object.freeze({__proto__:null,ESP32C61ROM:class extends uc{constructor(){super(...arguments),this.CHIP_NAME="ESP32-C61",this.IMAGE_CHIP_ID=20,this.CHIP_DETECT_MAGIC_VALUE=[871374959,606167151],this.UART_DATE_REG_ADDR=1610612860,this.EFUSE_BASE=1611352064,this.EFUSE_BLOCK1_ADDR=this.EFUSE_BASE+68,this.MAC_EFUSE_REG=this.EFUSE_BASE+68,this.EFUSE_RD_REG_BASE=this.EFUSE_BASE+48,this.EFUSE_PURPOSE_KEY0_REG=this.EFUSE_BASE+52,this.EFUSE_PURPOSE_KEY0_SHIFT=0,this.EFUSE_PURPOSE_KEY1_REG=this.EFUSE_BASE+52,this.EFUSE_PURPOSE_KEY1_SHIFT=4,this.EFUSE_PURPOSE_KEY2_REG=this.EFUSE_BASE+52,this.EFUSE_PURPOSE_KEY2_SHIFT=8,this.EFUSE_PURPOSE_KEY3_REG=this.EFUSE_BASE+52,this.EFUSE_PURPOSE_KEY3_SHIFT=12,this.EFUSE_PURPOSE_KEY4_REG=this.EFUSE_BASE+52,this.EFUSE_PURPOSE_KEY4_SHIFT=16,this.EFUSE_PURPOSE_KEY5_REG=this.EFUSE_BASE+52,this.EFUSE_PURPOSE_KEY5_SHIFT=20,this.EFUSE_DIS_DOWNLOAD_MANUAL_ENCRYPT_REG=this.EFUSE_RD_REG_BASE,this.EFUSE_DIS_DOWNLOAD_MANUAL_ENCRYPT=1<<20,this.EFUSE_SPI_BOOT_CRYPT_CNT_REG=this.EFUSE_BASE+48,this.EFUSE_SPI_BOOT_CRYPT_CNT_MASK=7<<23,this.EFUSE_SECURE_BOOT_EN_REG=this.EFUSE_BASE+52,this.EFUSE_SECURE_BOOT_EN_MASK=1<<26,this.FLASH_FREQUENCY={"80m":15,"40m":0,"20m":2},this.IROM_MAP_START=1107296256,this.IROM_MAP_END=1115684864,this.MEMORY_MAP=[[0,65536,"PADDING"],[1098907648,1107296256,"DROM"],[1082130432,1082523648,"DRAM"],[1082130432,1082523648,"BYTE_ACCESSIBLE"],[1074048e3,1074069504,"DROM_MASK"],[1073741824,1074048e3,"IROM_MASK"],[1090519040,1098907648,"IROM"],[1082130432,1082523648,"IRAM"],[1342177280,1342193664,"RTC_IRAM"],[1342177280,1342193664,"RTC_DRAM"],[1611653120,1611661312,"MEM_INTERNAL2"]],this.UF2_FAMILY_ID=2010665156,this.EFUSE_MAX_KEY=5,this.KEY_PURPOSES={0:"USER/EMPTY",1:"ECDSA_KEY",2:"XTS_AES_256_KEY_1",3:"XTS_AES_256_KEY_2",4:"XTS_AES_128_KEY",5:"HMAC_DOWN_ALL",6:"HMAC_DOWN_JTAG",7:"HMAC_DOWN_DIGITAL_SIGNATURE",8:"HMAC_UP",9:"SECURE_BOOT_DIGEST0",10:"SECURE_BOOT_DIGEST1",11:"SECURE_BOOT_DIGEST2",12:"KM_INIT_KEY",13:"XTS_AES_256_KEY_1_PSRAM",14:"XTS_AES_256_KEY_2_PSRAM",15:"XTS_AES_128_KEY_PSRAM"}}async getPkgVersion(e){return await e.readReg(this.EFUSE_BLOCK1_ADDR+8)>>26&7}async getMinorChipVersion(e){return 15&await e.readReg(this.EFUSE_BLOCK1_ADDR+8)}async getMajorChipVersion(e){return await e.readReg(this.EFUSE_BLOCK1_ADDR+8)>>4&3}async getChipDescription(e){let t;t=0===await this.getPkgVersion(e)?"ESP32-C61":"unknown ESP32-C61";return`${t} (revision v${await this.getMajorChipVersion(e)}.${await this.getMinorChipVersion(e)})`}async getChipFeatures(e){return["WiFi 6","BT 5"]}async readMac(e){let t=await e.readReg(this.MAC_EFUSE_REG);t>>>=0;let i=await e.readReg(this.MAC_EFUSE_REG+4);i=i>>>0&65535;const s=new Uint8Array(6);return s[0]=i>>8&255,s[1]=255&i,s[2]=t>>24&255,s[3]=t>>16&255,s[4]=t>>8&255,s[5]=255&t,this._d2h(s[0])+":"+this._d2h(s[1])+":"+this._d2h(s[2])+":"+this._d2h(s[3])+":"+this._d2h(s[4])+":"+this._d2h(s[5])}}});var fc=Object.freeze({__proto__:null,ESP32C5ROM:class extends uc{constructor(){super(...arguments),this.CHIP_NAME="ESP32-C5",this.IMAGE_CHIP_ID=23,this.BOOTLOADER_FLASH_OFFSET=8192,this.EFUSE_BASE=1611352064,this.EFUSE_BLOCK1_ADDR=this.EFUSE_BASE+68,this.MAC_EFUSE_REG=this.EFUSE_BASE+68,this.UART_CLKDIV_REG=1610612756,this.EFUSE_RD_REG_BASE=this.EFUSE_BASE+48,this.EFUSE_FORCE_USE_KEY_MANAGER_KEY_REG=this.EFUSE_BASE+52,this.EFUSE_FORCE_USE_KEY_MANAGER_KEY_SHIFT=10,this.FORCE_USE_KEY_MANAGER_VAL_XTS_AES_KEY=2,this.EFUSE_PURPOSE_KEY0_REG=this.EFUSE_BASE+52,this.EFUSE_PURPOSE_KEY0_SHIFT=22,this.EFUSE_PURPOSE_KEY1_REG=this.EFUSE_BASE+52,this.EFUSE_PURPOSE_KEY1_SHIFT=27,this.EFUSE_PURPOSE_KEY2_REG=this.EFUSE_BASE+56,this.EFUSE_PURPOSE_KEY2_SHIFT=0,this.EFUSE_PURPOSE_KEY3_REG=this.EFUSE_BASE+56,this.EFUSE_PURPOSE_KEY3_SHIFT=5,this.EFUSE_PURPOSE_KEY4_REG=this.EFUSE_BASE+56,this.EFUSE_PURPOSE_KEY4_SHIFT=10,this.EFUSE_PURPOSE_KEY5_REG=this.EFUSE_BASE+56,this.EFUSE_PURPOSE_KEY5_SHIFT=15,this.EFUSE_DIS_DOWNLOAD_MANUAL_ENCRYPT_REG=this.EFUSE_RD_REG_BASE,this.EFUSE_DIS_DOWNLOAD_MANUAL_ENCRYPT=1<<20,this.EFUSE_SPI_BOOT_CRYPT_CNT_REG=this.EFUSE_BASE+52,this.EFUSE_SPI_BOOT_CRYPT_CNT_MASK=7<<18,this.EFUSE_SECURE_BOOT_EN_REG=this.EFUSE_BASE+56,this.EFUSE_SECURE_BOOT_EN_MASK=1<<20,this.IROM_MAP_START=1107296256,this.IROM_MAP_END=1140850688,this.DROM_MAP_START=1107296256,this.DROM_MAP_END=1140850688,this.PCR_SYSCLK_CONF_REG=1611227408,this.PCR_SYSCLK_XTAL_FREQ_V=127<<24,this.PCR_SYSCLK_XTAL_FREQ_S=24,this.XTAL_CLK_DIVIDER=1,this.UARTDEV_BUF_NO=1082520852,this.CHIP_DETECT_MAGIC_VALUE=[285294703,1675706479,1607549039],this.FLASH_FREQUENCY={"80m":15,"40m":0,"20m":2},this.MEMORY_MAP=[[0,65536,"PADDING"],[1107296256,1140850688,"DROM"],[1082130432,1082523648,"DRAM"],[1082130432,1082523648,"BYTE_ACCESSIBLE"],[1073979392,1074003968,"DROM_MASK"],[1073741824,1073979392,"IROM_MASK"],[1107296256,1140850688,"IROM"],[1082130432,1082523648,"IRAM"],[1342177280,1342193664,"RTC_IRAM"],[1342177280,1342193664,"RTC_DRAM"],[1611653120,1611661312,"MEM_INTERNAL2"]],this.UF2_FAMILY_ID=4145808195,this.EFUSE_MAX_KEY=5,this.PURPOSE_VAL_XTS_AES128_KEY=4,this.KEY_PURPOSES={0:"USER/EMPTY",1:"ECDSA_KEY",4:"XTS_AES_128_KEY",5:"HMAC_DOWN_ALL",6:"HMAC_DOWN_JTAG",7:"HMAC_DOWN_DIGITAL_SIGNATURE",8:"HMAC_UP",9:"SECURE_BOOT_DIGEST0",10:"SECURE_BOOT_DIGEST1",11:"SECURE_BOOT_DIGEST2",12:"KM_INIT_KEY",15:"XTS_AES_128_PSRAM_KEY",16:"ECDSA_KEY_P192",17:"ECDSA_KEY_P384_L",18:"ECDSA_KEY_P384_H"}}async getPkgVersion(e){return await e.readReg(this.EFUSE_BLOCK1_ADDR+8)>>26&7}async getMinorChipVersion(e){return 15&await e.readReg(this.EFUSE_BLOCK1_ADDR+8)}async getMajorChipVersion(e){return await e.readReg(this.EFUSE_BLOCK1_ADDR+8)>>4&3}async getChipDescription(e){let t;t=0===await this.getPkgVersion(e)?"ESP32-C5":"unknown ESP32-C5";return`${t} (revision v${await this.getMajorChipVersion(e)}.${await this.getMinorChipVersion(e)})`}async getChipFeatures(e){return["Wi-Fi 6 (dual-band)","BT 5 (LE)","IEEE802.15.4","Single Core + LP Core","240MHz"]}async getCrystalFreq(e){const t=await e.readReg(this.UART_CLKDIV_REG)&this.UART_CLKDIV_MASK,i=e.transport.baudrate*t/1e6/this.XTAL_CLK_DIVIDER;let s;return s=i>45?48:i>33?40:26,Math.abs(s-i)>1&&e.info("WARNING: Unsupported crystal in use"),s}async getCrystalFreqRomExpect(e){return(await e.readReg(this.PCR_SYSCLK_CONF_REG)&this.PCR_SYSCLK_XTAL_FREQ_V)>>this.PCR_SYSCLK_XTAL_FREQ_S}async getKeyBlockPurpose(e,t){if(t<0||t>this.EFUSE_MAX_KEY)throw new Error(`Valid key block numbers must be in range 0-${this.EFUSE_MAX_KEY}`);const i=[[this.EFUSE_PURPOSE_KEY0_REG,this.EFUSE_PURPOSE_KEY0_SHIFT],[this.EFUSE_PURPOSE_KEY1_REG,this.EFUSE_PURPOSE_KEY1_SHIFT],[this.EFUSE_PURPOSE_KEY2_REG,this.EFUSE_PURPOSE_KEY2_SHIFT],[this.EFUSE_PURPOSE_KEY3_REG,this.EFUSE_PURPOSE_KEY3_SHIFT],[this.EFUSE_PURPOSE_KEY4_REG,this.EFUSE_PURPOSE_KEY4_SHIFT],[this.EFUSE_PURPOSE_KEY5_REG,this.EFUSE_PURPOSE_KEY5_SHIFT]],[s,o]=i[t];return await e.readReg(s)>>o&31}async isFlashEncryptionKeyValid(e){const t=[];for(let i=0;i<=this.EFUSE_MAX_KEY;i++){const s=await this.getKeyBlockPurpose(e,i);t.push(s)}if(t.some(e=>e===this.PURPOSE_VAL_XTS_AES128_KEY))return!0;return 0!==(await e.readReg(this.EFUSE_FORCE_USE_KEY_MANAGER_KEY_REG)>>this.EFUSE_FORCE_USE_KEY_MANAGER_KEY_SHIFT&this.FORCE_USE_KEY_MANAGER_VAL_XTS_AES_KEY)}checkSpiConnection(e,t){if(!t.every(e=>e>=0&&e<=28))throw new Error("SPI Pin numbers must be in the range 0-28.");t.some(e=>13===e||14===e)&&e.info("GPIO pins 13 and 14 are used by USB-Serial/JTAG, consider using other pins for SPI flash connection.")}async usesUsbJtagSerial(e){const t=this.UARTDEV_BUF_NO;return 3===(255&await e.readReg(t))}async watchdogReset(e){throw e.info("Hard resetting with a watchdog..."),new Error("watchdogReset not yet implemented for ESP32-C5")}async changeBaud(e){if(!e.IS_STUB){const t=await this.getCrystalFreqRomExpect(e),i=await this.getCrystalFreq(e);e.info(`ROM expects crystal freq: ${t} MHz, detected ${i} MHz.`),(48===i&&40===t||40===i&&48===t)&&e.info("Crystal frequency mismatch detected. Baud rate adjustment may be needed but is not fully implemented in this version.")}await e.changeBaud()}}});var wc=Object.freeze({__proto__:null,ESP32H2ROM:class extends uc{constructor(){super(...arguments),this.CHIP_NAME="ESP32-H2",this.IMAGE_CHIP_ID=16,this.EFUSE_BASE=1611335680,this.EFUSE_BLOCK1_ADDR=this.EFUSE_BASE+68,this.MAC_EFUSE_REG=this.EFUSE_BASE+68,this.UART_CLKDIV_REG=1072955412,this.UART_CLKDIV_MASK=1048575,this.UART_DATE_REG_ADDR=1610612860,this.FLASH_WRITE_SIZE=1024,this.BOOTLOADER_FLASH_OFFSET=0,this.SPI_REG_BASE=1610620928,this.SPI_USR_OFFS=24,this.SPI_USR1_OFFS=28,this.SPI_USR2_OFFS=32,this.SPI_MOSI_DLEN_OFFS=36,this.SPI_MISO_DLEN_OFFS=40,this.SPI_W0_OFFS=88,this.USB_RAM_BLOCK=2048,this.UARTDEV_BUF_NO_USB=3,this.UARTDEV_BUF_NO=1070526796,this.IROM_MAP_START=1107296256,this.IROM_MAP_END=1115684864,this.MEMORY_MAP=[[0,65536,"PADDING"],[1107296256,1124073472,"DROM"],[1082130432,1082654720,"DRAM"],[1082130432,1082654720,"BYTE_ACCESSIBLE"],[1074048e3,1074069504,"DROM_MASK"],[1073741824,1074048e3,"IROM_MASK"],[1107296256,1124073472,"IROM"],[1082130432,1082654720,"IRAM"],[1342177280,1342193664,"RTC_IRAM"],[1342177280,1342193664,"RTC_DRAM"],[1611653120,1611661312,"MEM_INTERNAL2"]]}async getPkgVersion(e){return 7&await e.readReg(this.EFUSE_BLOCK1_ADDR+16)}async getMinorChipVersion(e){return await e.readReg(this.EFUSE_BLOCK1_ADDR+12)>>18&7}async getMajorChipVersion(e){return await e.readReg(this.EFUSE_BLOCK1_ADDR+12)>>21&3}async getChipDescription(e){let t;t=0===await this.getPkgVersion(e)?"ESP32-H2":"unknown ESP32-H2";return`${t} (revision v${await this.getMajorChipVersion(e)}.${await this.getMinorChipVersion(e)})`}async getChipFeatures(e){return["BT 5 (LE)","IEEE802.15.4","Single Core","96MHz"]}async getCrystalFreq(e){return 32}_d2h(e){const t=(+e).toString(16);return 1===t.length?"0"+t:t}async postConnect(e){const t=255&await e.readReg(this.UARTDEV_BUF_NO);e.debug("In _post_connect "+t),t==this.UARTDEV_BUF_NO_USB&&(e.ESP_RAM_BLOCK=this.USB_RAM_BLOCK)}async readMac(e){let t=await e.readReg(this.MAC_EFUSE_REG);t>>>=0;let i=await e.readReg(this.MAC_EFUSE_REG+4);i=i>>>0&65535;const s=new Uint8Array(6);return s[0]=i>>8&255,s[1]=255&i,s[2]=t>>24&255,s[3]=t>>16&255,s[4]=t>>8&255,s[5]=255&t,this._d2h(s[0])+":"+this._d2h(s[1])+":"+this._d2h(s[2])+":"+this._d2h(s[3])+":"+this._d2h(s[4])+":"+this._d2h(s[5])}getEraseSize(e,t){return t}}});var Ec=Object.freeze({__proto__:null,ESP32S3ROM:class extends cc{constructor(){super(...arguments),this.CHIP_NAME="ESP32-S3",this.IMAGE_CHIP_ID=9,this.EFUSE_BASE=1610641408,this.MAC_EFUSE_REG=this.EFUSE_BASE+68,this.EFUSE_BLOCK1_ADDR=this.EFUSE_BASE+68,this.EFUSE_BLOCK2_ADDR=this.EFUSE_BASE+92,this.UART_CLKDIV_REG=1610612756,this.UART_CLKDIV_MASK=1048575,this.UART_DATE_REG_ADDR=1610612864,this.FLASH_WRITE_SIZE=1024,this.BOOTLOADER_FLASH_OFFSET=0,this.SPI_REG_BASE=1610620928,this.SPI_USR_OFFS=24,this.SPI_USR1_OFFS=28,this.SPI_USR2_OFFS=32,this.SPI_MOSI_DLEN_OFFS=36,this.SPI_MISO_DLEN_OFFS=40,this.SPI_W0_OFFS=88,this.USB_RAM_BLOCK=2048,this.UARTDEV_BUF_NO_USB=3,this.UARTDEV_BUF_NO=1070526796,this.IROM_MAP_START=1107296256,this.IROM_MAP_END=1140850688,this.MEMORY_MAP=[[0,65536,"PADDING"],[1006632960,1023410176,"DROM"],[1023410176,1040187392,"EXTRAM_DATA"],[1611653120,1611661312,"RTC_DRAM"],[1070104576,1070596096,"BYTE_ACCESSIBLE"],[1070104576,1077813248,"MEM_INTERNAL"],[1070104576,1070596096,"DRAM"],[1073741824,1073848576,"IROM_MASK"],[1077346304,1077805056,"IRAM"],[1611653120,1611661312,"RTC_IRAM"],[1107296256,1115684864,"IROM"],[1342177280,1342185472,"RTC_DATA"]]}async getChipDescription(e){const t=await this.getMajorChipVersion(e),i=await this.getMinorChipVersion(e);return`${{0:"ESP32-S3 (QFN56)",1:"ESP32-S3-PICO-1 (LGA56)"}[await this.getPkgVersion(e)]||"unknown ESP32-S3"} (revision v${t}.${i})`}async getPkgVersion(e){return await e.readReg(this.EFUSE_BLOCK1_ADDR+12)>>21&7}async getRawMinorChipVersion(e){return((await e.readReg(this.EFUSE_BLOCK1_ADDR+20)>>23&1)<<3)+(await e.readReg(this.EFUSE_BLOCK1_ADDR+12)>>18&7)}async getMinorChipVersion(e){const t=await this.getRawMinorChipVersion(e);return await this.isEco0(e,t)?0:this.getRawMinorChipVersion(e)}async getRawMajorChipVersion(e){return await e.readReg(this.EFUSE_BLOCK1_ADDR+20)>>24&3}async getMajorChipVersion(e){const t=await this.getRawMinorChipVersion(e);return await this.isEco0(e,t)?0:this.getRawMajorChipVersion(e)}async getBlkVersionMajor(e){return 3&await e.readReg(this.EFUSE_BLOCK2_ADDR+16)}async getBlkVersionMinor(e){return await e.readReg(this.EFUSE_BLOCK1_ADDR+12)>>24&7}async isEco0(e,t){return!(7&t)&&1===await this.getBlkVersionMajor(e)&&1===await this.getBlkVersionMinor(e)}async getFlashCap(e){const t=this.EFUSE_BASE+68+12;return await e.readReg(t)>>27&7}async getFlashVendor(e){const t=this.EFUSE_BASE+68+16;return{1:"XMC",2:"GD",3:"FM",4:"TT",5:"BY"}[7&await e.readReg(t)]||""}async getPsramCap(e){const t=this.EFUSE_BASE+68+16;return await e.readReg(t)>>3&3}async getPsramVendor(e){const t=this.EFUSE_BASE+68+16;return{1:"AP_3v3",2:"AP_1v8"}[await e.readReg(t)>>7&3]||""}async getChipFeatures(e){const t=["Wi-Fi","BLE"],i=await this.getFlashCap(e),s=await this.getFlashVendor(e),o={0:null,1:"Embedded Flash 8MB",2:"Embedded Flash 4MB"}[i],r=void 0!==o?o:"Unknown Embedded Flash";null!==o&&t.push(`${r} (${s})`);const a=await this.getPsramCap(e),n=await this.getPsramVendor(e),l={0:null,1:"Embedded PSRAM 8MB",2:"Embedded PSRAM 2MB"}[a],c=void 0!==l?l:"Unknown Embedded PSRAM";return null!==l&&t.push(`${c} (${n})`),t}async getCrystalFreq(e){return 40}_d2h(e){const t=(+e).toString(16);return 1===t.length?"0"+t:t}async postConnect(e){const t=255&await e.readReg(this.UARTDEV_BUF_NO);e.debug("In _post_connect "+t),t==this.UARTDEV_BUF_NO_USB&&(e.ESP_RAM_BLOCK=this.USB_RAM_BLOCK)}async readMac(e){let t=await e.readReg(this.MAC_EFUSE_REG);t>>>=0;let i=await e.readReg(this.MAC_EFUSE_REG+4);i=i>>>0&65535;const s=new Uint8Array(6);return s[0]=i>>8&255,s[1]=255&i,s[2]=t>>24&255,s[3]=t>>16&255,s[4]=t>>8&255,s[5]=255&t,this._d2h(s[0])+":"+this._d2h(s[1])+":"+this._d2h(s[2])+":"+this._d2h(s[3])+":"+this._d2h(s[4])+":"+this._d2h(s[5])}getEraseSize(e,t){return t}}});var mc=Object.freeze({__proto__:null,ESP32S2ROM:class extends cc{constructor(){super(...arguments),this.CHIP_NAME="ESP32-S2",this.IMAGE_CHIP_ID=2,this.IROM_MAP_START=1074266112,this.IROM_MAP_END=1085800448,this.DROM_MAP_START=1056964608,this.DROM_MAP_END=1061093376,this.CHIP_DETECT_MAGIC_VALUE=[1990],this.SPI_REG_BASE=1061167104,this.SPI_USR_OFFS=24,this.SPI_USR1_OFFS=28,this.SPI_USR2_OFFS=32,this.SPI_MOSI_DLEN_OFFS=36,this.SPI_MISO_DLEN_OFFS=40,this.SPI_W0_OFFS=88,this.SPI_ADDR_REG_MSB=!1,this.MAC_EFUSE_REG=1061265476,this.UART_CLKDIV_REG=1061158932,this.SUPPORTS_ENCRYPTED_FLASH=!0,this.FLASH_ENCRYPTED_WRITE_ALIGN=16,this.EFUSE_BASE=1061265408,this.EFUSE_RD_REG_BASE=this.EFUSE_BASE+48,this.EFUSE_BLOCK1_ADDR=this.EFUSE_BASE+68,this.EFUSE_BLOCK2_ADDR=this.EFUSE_BASE+92,this.EFUSE_PURPOSE_KEY0_REG=this.EFUSE_BASE+52,this.EFUSE_PURPOSE_KEY0_SHIFT=24,this.EFUSE_PURPOSE_KEY1_REG=this.EFUSE_BASE+52,this.EFUSE_PURPOSE_KEY1_SHIFT=28,this.EFUSE_PURPOSE_KEY2_REG=this.EFUSE_BASE+56,this.EFUSE_PURPOSE_KEY2_SHIFT=0,this.EFUSE_PURPOSE_KEY3_REG=this.EFUSE_BASE+56,this.EFUSE_PURPOSE_KEY3_SHIFT=4,this.EFUSE_PURPOSE_KEY4_REG=this.EFUSE_BASE+56,this.EFUSE_PURPOSE_KEY4_SHIFT=8,this.EFUSE_PURPOSE_KEY5_REG=this.EFUSE_BASE+56,this.EFUSE_PURPOSE_KEY5_SHIFT=12,this.EFUSE_DIS_DOWNLOAD_MANUAL_ENCRYPT_REG=this.EFUSE_RD_REG_BASE,this.EFUSE_DIS_DOWNLOAD_MANUAL_ENCRYPT=1<<19,this.EFUSE_SPI_BOOT_CRYPT_CNT_REG=this.EFUSE_BASE+52,this.EFUSE_SPI_BOOT_CRYPT_CNT_MASK=7<<18,this.EFUSE_SECURE_BOOT_EN_REG=this.EFUSE_BASE+56,this.EFUSE_SECURE_BOOT_EN_MASK=1<<20,this.EFUSE_RD_REPEAT_DATA3_REG=this.EFUSE_BASE+60,this.EFUSE_RD_REPEAT_DATA3_REG_FLASH_TYPE_MASK=512,this.PURPOSE_VAL_XTS_AES256_KEY_1=2,this.PURPOSE_VAL_XTS_AES256_KEY_2=3,this.PURPOSE_VAL_XTS_AES128_KEY=4,this.UARTDEV_BUF_NO=1073741076,this.UARTDEV_BUF_NO_USB_OTG=2,this.USB_RAM_BLOCK=2048,this.GPIO_STRAP_REG=1061175352,this.GPIO_STRAP_SPI_BOOT_MASK=8,this.GPIO_STRAP_VDDSPI_MASK=16,this.RTC_CNTL_OPTION1_REG=1061191976,this.RTC_CNTL_FORCE_DOWNLOAD_BOOT_MASK=1,this.RTCCNTL_BASE_REG=1061191680,this.RTC_CNTL_WDTCONFIG0_REG=this.RTCCNTL_BASE_REG+148,this.RTC_CNTL_WDTCONFIG1_REG=this.RTCCNTL_BASE_REG+152,this.RTC_CNTL_WDTWPROTECT_REG=this.RTCCNTL_BASE_REG+172,this.RTC_CNTL_WDT_WKEY=1356348065,this.MEMORY_MAP=[[0,65536,"PADDING"],[1056964608,1073217536,"DROM"],[1062207488,1073217536,"EXTRAM_DATA"],[1073340416,1073348608,"RTC_DRAM"],[1073340416,1073741824,"BYTE_ACCESSIBLE"],[1073340416,1074208768,"MEM_INTERNAL"],[1073414144,1073741824,"DRAM"],[1073741824,1073848576,"IROM_MASK"],[1073872896,1074200576,"IRAM"],[1074200576,1074208768,"RTC_IRAM"],[1074266112,1082130432,"IROM"],[1342177280,1342185472,"RTC_DATA"]],this.EFUSE_VDD_SPI_REG=this.EFUSE_BASE+52,this.VDD_SPI_XPD=16,this.VDD_SPI_TIEH=32,this.VDD_SPI_FORCE=64,this.UF2_FAMILY_ID=3218951918,this.EFUSE_MAX_KEY=5,this.KEY_PURPOSES={0:"USER/EMPTY",1:"RESERVED",2:"XTS_AES_256_KEY_1",3:"XTS_AES_256_KEY_2",4:"XTS_AES_128_KEY",5:"HMAC_DOWN_ALL",6:"HMAC_DOWN_JTAG",7:"HMAC_DOWN_DIGITAL_SIGNATURE",8:"HMAC_UP",9:"SECURE_BOOT_DIGEST0",10:"SECURE_BOOT_DIGEST1",11:"SECURE_BOOT_DIGEST2"},this.UART_CLKDIV_MASK=1048575,this.UART_DATE_REG_ADDR=1610612856,this.FLASH_WRITE_SIZE=1024,this.BOOTLOADER_FLASH_OFFSET=4096}async getPkgVersion(e){const t=this.EFUSE_BLOCK1_ADDR+16;return 15&await e.readReg(t)}async getMinorChipVersion(e){return((await e.readReg(this.EFUSE_BLOCK1_ADDR+12)>>20&1)<<3)+(await e.readReg(this.EFUSE_BLOCK1_ADDR+16)>>4&7)}async getMajorChipVersion(e){return await e.readReg(this.EFUSE_BLOCK1_ADDR+12)>>18&3}async getFlashVersion(e){return await e.readReg(this.EFUSE_BLOCK1_ADDR+12)>>21&15}async getChipDescription(e){const t=await this.getFlashCap(e)+100*await this.getPsramCap(e),i=await this.getMajorChipVersion(e),s=await this.getMinorChipVersion(e);return`${{0:"ESP32-S2",1:"ESP32-S2FH2",2:"ESP32-S2FH4",102:"ESP32-S2FNR2",100:"ESP32-S2R2"}[t]||"unknown ESP32-S2"} (revision v${i}.${s})`}async getFlashCap(e){return await this.getFlashVersion(e)}async getPsramVersion(e){const t=this.EFUSE_BLOCK1_ADDR+12;return await e.readReg(t)>>28&15}async getPsramCap(e){return await this.getPsramVersion(e)}async getBlock2Version(e){const t=this.EFUSE_BLOCK2_ADDR+16;return await e.readReg(t)>>4&7}async getChipFeatures(e){const t=["Wi-Fi"],i={0:"No Embedded Flash",1:"Embedded Flash 2MB",2:"Embedded Flash 4MB"}[await this.getFlashCap(e)]||"Unknown Embedded Flash";t.push(i);const s={0:"No Embedded Flash",1:"Embedded PSRAM 2MB",2:"Embedded PSRAM 4MB"}[await this.getPsramCap(e)]||"Unknown Embedded PSRAM";t.push(s);const o={0:"No calibration in BLK2 of efuse",1:"ADC and temperature sensor calibration in BLK2 of efuse V1",2:"ADC and temperature sensor calibration in BLK2 of efuse V2"}[await this.getBlock2Version(e)]||"Unknown Calibration in BLK2";return t.push(o),t}async getCrystalFreq(e){return 40}_d2h(e){const t=(+e).toString(16);return 1===t.length?"0"+t:t}async readMac(e){let t=await e.readReg(this.MAC_EFUSE_REG);t>>>=0;let i=await e.readReg(this.MAC_EFUSE_REG+4);i=i>>>0&65535;const s=new Uint8Array(6);return s[0]=i>>8&255,s[1]=255&i,s[2]=t>>24&255,s[3]=t>>16&255,s[4]=t>>8&255,s[5]=255&t,this._d2h(s[0])+":"+this._d2h(s[1])+":"+this._d2h(s[2])+":"+this._d2h(s[3])+":"+this._d2h(s[4])+":"+this._d2h(s[5])}getEraseSize(e,t){return t}async usingUsbOtg(e){return(255&await e.readReg(this.UARTDEV_BUF_NO))===this.UARTDEV_BUF_NO_USB_OTG}async postConnect(e){const t=await this.usingUsbOtg(e);e.debug("In _post_connect using USB OTG ?"+t),t&&(e.ESP_RAM_BLOCK=this.USB_RAM_BLOCK)}}});var bc=Object.freeze({__proto__:null,ESP32P4ROM:class extends cc{constructor(){super(...arguments),this.CHIP_NAME="ESP32-P4",this.IMAGE_CHIP_ID=18,this.IROM_MAP_START=1073741824,this.IROM_MAP_END=1275068416,this.DROM_MAP_START=1073741824,this.DROM_MAP_END=1275068416,this.BOOTLOADER_FLASH_OFFSET=8192,this.CHIP_DETECT_MAGIC_VALUE=[0,182303440],this.UART_DATE_REG_ADDR=1343004812,this.EFUSE_BASE=1343410176,this.EFUSE_BLOCK1_ADDR=this.EFUSE_BASE+68,this.MAC_EFUSE_REG=this.EFUSE_BASE+68,this.SPI_REG_BASE=1342754816,this.SPI_USR_OFFS=24,this.SPI_USR1_OFFS=28,this.SPI_USR2_OFFS=32,this.SPI_MOSI_DLEN_OFFS=36,this.SPI_MISO_DLEN_OFFS=40,this.SPI_W0_OFFS=88,this.SPI_ADDR_REG_MSB=!1,this.USES_MAGIC_VALUE=!1,this.EFUSE_RD_REG_BASE=this.EFUSE_BASE+48,this.EFUSE_FORCE_USE_KEY_MANAGER_KEY_REG=this.EFUSE_BASE+52,this.EFUSE_FORCE_USE_KEY_MANAGER_KEY_SHIFT=9,this.FORCE_USE_KEY_MANAGER_VAL_XTS_AES_KEY=2,this.EFUSE_PURPOSE_KEY0_REG=this.EFUSE_BASE+52,this.EFUSE_PURPOSE_KEY0_SHIFT=24,this.EFUSE_PURPOSE_KEY1_REG=this.EFUSE_BASE+52,this.EFUSE_PURPOSE_KEY1_SHIFT=28,this.EFUSE_PURPOSE_KEY2_REG=this.EFUSE_BASE+56,this.EFUSE_PURPOSE_KEY2_SHIFT=0,this.EFUSE_PURPOSE_KEY3_REG=this.EFUSE_BASE+56,this.EFUSE_PURPOSE_KEY3_SHIFT=4,this.EFUSE_PURPOSE_KEY4_REG=this.EFUSE_BASE+56,this.EFUSE_PURPOSE_KEY4_SHIFT=8,this.EFUSE_PURPOSE_KEY5_REG=this.EFUSE_BASE+56,this.EFUSE_PURPOSE_KEY5_SHIFT=12,this.EFUSE_DIS_DOWNLOAD_MANUAL_ENCRYPT_REG=this.EFUSE_RD_REG_BASE,this.EFUSE_DIS_DOWNLOAD_MANUAL_ENCRYPT=1<<20,this.EFUSE_SPI_BOOT_CRYPT_CNT_REG=this.EFUSE_BASE+52,this.EFUSE_SPI_BOOT_CRYPT_CNT_MASK=7<<18,this.EFUSE_SECURE_BOOT_EN_REG=this.EFUSE_BASE+56,this.EFUSE_SECURE_BOOT_EN_MASK=1<<20,this.PURPOSE_VAL_XTS_AES256_KEY_1=2,this.PURPOSE_VAL_XTS_AES256_KEY_2=3,this.PURPOSE_VAL_XTS_AES128_KEY=4,this.SUPPORTS_ENCRYPTED_FLASH=!0,this.FLASH_ENCRYPTED_WRITE_ALIGN=16,this.USB_RAM_BLOCK=2048,this.GPIO_STRAP_REG=1343094840,this.GPIO_STRAP_SPI_BOOT_MASK=8,this.RTC_CNTL_OPTION1_REG=1343291400,this.RTC_CNTL_FORCE_DOWNLOAD_BOOT_MASK=4,this.DR_REG_LPAON_BASE=1343291392,this.DR_REG_PMU_BASE=this.DR_REG_LPAON_BASE+20480,this.DR_REG_LP_SYS_BASE=this.DR_REG_LPAON_BASE+0,this.LP_SYSTEM_REG_ANA_XPD_PAD_GROUP_REG=this.DR_REG_LP_SYS_BASE+268,this.PMU_EXT_LDO_P0_0P1A_ANA_REG=this.DR_REG_PMU_BASE+444,this.PMU_ANA_0P1A_EN_CUR_LIM_0=1<<27,this.PMU_EXT_LDO_P0_0P1A_REG=this.DR_REG_PMU_BASE+440,this.PMU_0P1A_TARGET0_0=255<<23,this.PMU_0P1A_FORCE_TIEH_SEL_0=128,this.PMU_DATE_REG=this.DR_REG_PMU_BASE+1020,this.UARTDEV_BUF_NO_USB_OTG=5,this.UARTDEV_BUF_NO_USB_JTAG_SERIAL=6,this.DR_REG_LP_WDT_BASE=1343315968,this.RTC_CNTL_WDTCONFIG0_REG=this.DR_REG_LP_WDT_BASE+0,this.RTC_CNTL_WDTCONFIG1_REG=this.DR_REG_LP_WDT_BASE+4,this.RTC_CNTL_WDTWPROTECT_REG=this.DR_REG_LP_WDT_BASE+24,this.RTC_CNTL_WDT_WKEY=1356348065,this.RTC_CNTL_SWD_CONF_REG=this.DR_REG_LP_WDT_BASE+28,this.RTC_CNTL_SWD_AUTO_FEED_EN=1<<18,this.RTC_CNTL_SWD_WPROTECT_REG=this.DR_REG_LP_WDT_BASE+32,this.RTC_CNTL_SWD_WKEY=1356348065,this.MEMORY_MAP=[[0,65536,"PADDING"],[1073741824,1275068416,"DROM"],[1341128704,1341784064,"DRAM"],[1341128704,1341784064,"BYTE_ACCESSIBLE"],[1337982976,1338114048,"DROM_MASK"],[1337982976,1338114048,"IROM_MASK"],[1073741824,1275068416,"IROM"],[1341128704,1341784064,"IRAM"],[1343258624,1343291392,"RTC_IRAM"],[1343258624,1343291392,"RTC_DRAM"],[1611653120,1611661312,"MEM_INTERNAL2"]],this.UF2_FAMILY_ID=1026592404,this.EFUSE_MAX_KEY=5,this.KEY_PURPOSES={0:"USER/EMPTY",1:"ECDSA_KEY",2:"XTS_AES_256_KEY_1",3:"XTS_AES_256_KEY_2",4:"XTS_AES_128_KEY",5:"HMAC_DOWN_ALL",6:"HMAC_DOWN_JTAG",7:"HMAC_DOWN_DIGITAL_SIGNATURE",8:"HMAC_UP",9:"SECURE_BOOT_DIGEST0",10:"SECURE_BOOT_DIGEST1",11:"SECURE_BOOT_DIGEST2",12:"KM_INIT_KEY"}}async getPkgVersion(e){const t=this.EFUSE_BLOCK1_ADDR+8;return await e.readReg(t)>>20&7}async getMinorChipVersion(e){const t=this.EFUSE_BLOCK1_ADDR+8;return 15&await e.readReg(t)}async getMajorChipVersion(e){const t=this.EFUSE_BLOCK1_ADDR+8,i=await e.readReg(t);return(i>>23&1)<<2|i>>4&3}async getChipRevision(e){return 100*await this.getMajorChipVersion(e)+await this.getMinorChipVersion(e)}async getStubJsonPath(e){return await this.getChipRevision(e)<300?"./targets/stub_flasher/stub_flasher_32p4rc1.json":"./targets/stub_flasher/stub_flasher_32p4.json"}async getChipDescription(e){return`${{0:"ESP32-P4"}[await this.getPkgVersion(e)]||"Unknown ESP32-P4"} (revision v${await this.getMajorChipVersion(e)}.${await this.getMinorChipVersion(e)})`}async getChipFeatures(e){return["High-Performance MCU"]}async getCrystalFreq(e){return 40}async getFlashVoltage(e){}async overrideVddsdio(e){e.debug("VDD_SDIO overrides are not supported for ESP32-P4")}async readMac(e){let t=await e.readReg(this.MAC_EFUSE_REG);t>>>=0;let i=await e.readReg(this.MAC_EFUSE_REG+4);i=i>>>0&65535;const s=new Uint8Array(6);return s[0]=i>>8&255,s[1]=255&i,s[2]=t>>24&255,s[3]=t>>16&255,s[4]=t>>8&255,s[5]=255&t,this._d2h(s[0])+":"+this._d2h(s[1])+":"+this._d2h(s[2])+":"+this._d2h(s[3])+":"+this._d2h(s[4])+":"+this._d2h(s[5])}async getFlashCryptConfig(e){}async getSecureBootEnabled(e){return 0!==(await e.readReg(this.EFUSE_SECURE_BOOT_EN_REG)&this.EFUSE_SECURE_BOOT_EN_MASK)}async getUartdevBufNo(e){return(await this.getChipRevision(e)<300?1341390512:1341914800)+24}async usesUsbOtg(e){const t=await this.getUartdevBufNo(e);return(255&await e.readReg(t))===this.UARTDEV_BUF_NO_USB_OTG}async usesUsbJtagSerial(e){const t=await this.getUartdevBufNo(e);return(255&await e.readReg(t))===this.UARTDEV_BUF_NO_USB_JTAG_SERIAL}async getKeyBlockPurpose(e,t){if(t<0||t>this.EFUSE_MAX_KEY)return void e.debug(`Valid key block numbers must be in range 0-${this.EFUSE_MAX_KEY}`);const i=[[this.EFUSE_PURPOSE_KEY0_REG,this.EFUSE_PURPOSE_KEY0_SHIFT],[this.EFUSE_PURPOSE_KEY1_REG,this.EFUSE_PURPOSE_KEY1_SHIFT],[this.EFUSE_PURPOSE_KEY2_REG,this.EFUSE_PURPOSE_KEY2_SHIFT],[this.EFUSE_PURPOSE_KEY3_REG,this.EFUSE_PURPOSE_KEY3_SHIFT],[this.EFUSE_PURPOSE_KEY4_REG,this.EFUSE_PURPOSE_KEY4_SHIFT],[this.EFUSE_PURPOSE_KEY5_REG,this.EFUSE_PURPOSE_KEY5_SHIFT]],[s,o]=i[t];return await e.readReg(s)>>o&15}async isFlashEncryptionKeyValid(e){const t=[];for(let i=0;i<=this.EFUSE_MAX_KEY;i++){const s=await this.getKeyBlockPurpose(e,i);t.push(s)}if(t.some(e=>e===this.PURPOSE_VAL_XTS_AES128_KEY))return!0;if(t.some(e=>e===this.PURPOSE_VAL_XTS_AES256_KEY_1)&&t.some(e=>e===this.PURPOSE_VAL_XTS_AES256_KEY_2))return!0;return 0!==(await e.readReg(this.EFUSE_FORCE_USE_KEY_MANAGER_KEY_REG)>>this.EFUSE_FORCE_USE_KEY_MANAGER_KEY_SHIFT&this.FORCE_USE_KEY_MANAGER_VAL_XTS_AES_KEY)}async postConnect(e){await this.usesUsbOtg(e)&&(e.ESP_RAM_BLOCK=this.USB_RAM_BLOCK),e.IS_STUB||await this.disableWatchdogs(e)}async disableWatchdogs(e){if(await this.usesUsbJtagSerial(e)){await e.writeReg(this.RTC_CNTL_WDTWPROTECT_REG,this.RTC_CNTL_WDT_WKEY),await e.writeReg(this.RTC_CNTL_WDTCONFIG0_REG,0),await e.writeReg(this.RTC_CNTL_WDTWPROTECT_REG,0),await e.writeReg(this.RTC_CNTL_SWD_WPROTECT_REG,this.RTC_CNTL_SWD_WKEY);const t=await e.readReg(this.RTC_CNTL_SWD_CONF_REG);await e.writeReg(this.RTC_CNTL_SWD_CONF_REG,t|this.RTC_CNTL_SWD_AUTO_FEED_EN),await e.writeReg(this.RTC_CNTL_SWD_WPROTECT_REG,0)}}checkSpiConnection(e,t){if(!t.every(e=>e>=0&&e<=54))throw new Error("SPI Pin numbers must be in the range 0-54.");t.some(e=>24===e||25===e)&&e.debug("GPIO pins 24 and 25 are used by USB-Serial/JTAG, consider using other pins for SPI flash connection.")}async watchdogReset(e){e.info("Hard resetting with a watchdog..."),await e.writeReg(this.RTC_CNTL_WDTWPROTECT_REG,this.RTC_CNTL_WDT_WKEY),await e.writeReg(this.RTC_CNTL_WDTCONFIG1_REG,2e3),await e.writeReg(this.RTC_CNTL_WDTCONFIG0_REG,-805306110),await e.writeReg(this.RTC_CNTL_WDTWPROTECT_REG,0),await new Promise(e=>setTimeout(e,500))}async powerOnFlash(e){if(await this.getChipRevision(e)<=300)return;await e.writeReg(this.LP_SYSTEM_REG_ANA_XPD_PAD_GROUP_REG,1),await new Promise(e=>setTimeout(e,10));let t=await e.readReg(this.PMU_EXT_LDO_P0_0P1A_ANA_REG);await e.writeReg(this.PMU_EXT_LDO_P0_0P1A_ANA_REG,t|this.PMU_ANA_0P1A_EN_CUR_LIM_0),t=await e.readReg(this.PMU_EXT_LDO_P0_0P1A_REG),await e.writeReg(this.PMU_EXT_LDO_P0_0P1A_REG,t|this.PMU_0P1A_FORCE_TIEH_SEL_0),t=await e.readReg(this.PMU_DATE_REG),await e.writeReg(this.PMU_DATE_REG,3|t),await new Promise(e=>setTimeout(e,50)),t=await e.readReg(this.PMU_EXT_LDO_P0_0P1A_ANA_REG),await e.writeReg(this.PMU_EXT_LDO_P0_0P1A_ANA_REG,t&~this.PMU_ANA_0P1A_EN_CUR_LIM_0),t=await e.readReg(this.PMU_EXT_LDO_P0_0P1A_REG),await e.writeReg(this.PMU_EXT_LDO_P0_0P1A_REG,t&~this.PMU_0P1A_TARGET0_0),t=await e.readReg(this.PMU_EXT_LDO_P0_0P1A_REG),await e.writeReg(this.PMU_EXT_LDO_P0_0P1A_REG,128|t),t=await e.readReg(this.PMU_EXT_LDO_P0_0P1A_REG),await e.writeReg(this.PMU_EXT_LDO_P0_0P1A_REG,t&~this.PMU_0P1A_FORCE_TIEH_SEL_0),await new Promise(e=>setTimeout(e,1800))}}});export{wn as EPPGridPanel,mn as EPPGridStrategy,En as EppDeviceCard};
