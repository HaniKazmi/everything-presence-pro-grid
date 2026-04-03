function t(t,e,i,s){var o,r=arguments.length,n=r<3?e:null===s?s=Object.getOwnPropertyDescriptor(e,i):s;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(t,e,i,s);else for(var a=t.length-1;a>=0;a--)(o=t[a])&&(n=(r<3?o(n):r>3?o(e,i,n):o(e,i))||n);return r>3&&n&&Object.defineProperty(e,i,n),n}"function"==typeof SuppressedError&&SuppressedError;
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const e=globalThis,i=e.ShadowRoot&&(void 0===e.ShadyCSS||e.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,s=Symbol(),o=new WeakMap;let r=class{constructor(t,e,i){if(this._$cssResult$=!0,i!==s)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o;const e=this.t;if(i&&void 0===t){const i=void 0!==e&&1===e.length;i&&(t=o.get(e)),void 0===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),i&&o.set(e,t))}return t}toString(){return this.cssText}};const n=(t,...e)=>{const i=1===t.length?t[0]:e.reduce((e,i,s)=>e+(t=>{if(!0===t._$cssResult$)return t.cssText;if("number"==typeof t)return t;throw Error("Value passed to 'css' function must be a 'css' function result: "+t+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+t[s+1],t[0]);return new r(i,t,s)},a=i?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e="";for(const i of t.cssRules)e+=i.cssText;return(t=>new r("string"==typeof t?t:t+"",void 0,s))(e)})(t):t,{is:l,defineProperty:c,getOwnPropertyDescriptor:h,getOwnPropertyNames:d,getOwnPropertySymbols:p,getPrototypeOf:u}=Object,g=globalThis,f=g.trustedTypes,m=f?f.emptyScript:"",_=g.reactiveElementPolyfillSupport,v=(t,e)=>t,b={toAttribute(t,e){switch(e){case Boolean:t=t?m:null;break;case Object:case Array:t=null==t?t:JSON.stringify(t)}return t},fromAttribute(t,e){let i=t;switch(e){case Boolean:i=null!==t;break;case Number:i=null===t?null:Number(t);break;case Object:case Array:try{i=JSON.parse(t)}catch(t){i=null}}return i}},y=(t,e)=>!l(t,e),x={attribute:!0,type:String,converter:b,reflect:!1,useDefault:!1,hasChanged:y};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */Symbol.metadata??=Symbol("metadata"),g.litPropertyMetadata??=new WeakMap;let w=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=x){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){const i=Symbol(),s=this.getPropertyDescriptor(t,i,e);void 0!==s&&c(this.prototype,t,s)}}static getPropertyDescriptor(t,e,i){const{get:s,set:o}=h(this.prototype,t)??{get(){return this[e]},set(t){this[e]=t}};return{get:s,set(e){const r=s?.call(this);o?.call(this,e),this.requestUpdate(t,r,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??x}static _$Ei(){if(this.hasOwnProperty(v("elementProperties")))return;const t=u(this);t.finalize(),void 0!==t.l&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(v("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(v("properties"))){const t=this.properties,e=[...d(t),...p(t)];for(const i of e)this.createProperty(i,t[i])}const t=this[Symbol.metadata];if(null!==t){const e=litPropertyMetadata.get(t);if(void 0!==e)for(const[t,i]of e)this.elementProperties.set(t,i)}this._$Eh=new Map;for(const[t,e]of this.elementProperties){const i=this._$Eu(t,e);void 0!==i&&this._$Eh.set(i,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const e=[];if(Array.isArray(t)){const i=new Set(t.flat(1/0).reverse());for(const t of i)e.unshift(a(t))}else void 0!==t&&e.push(a(t));return e}static _$Eu(t,e){const i=e.attribute;return!1===i?void 0:"string"==typeof i?i:"string"==typeof t?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),void 0!==this.renderRoot&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){const t=new Map,e=this.constructor.elementProperties;for(const i of e.keys())this.hasOwnProperty(i)&&(t.set(i,this[i]),delete this[i]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((t,s)=>{if(i)t.adoptedStyleSheets=s.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const i of s){const s=document.createElement("style"),o=e.litNonce;void 0!==o&&s.setAttribute("nonce",o),s.textContent=i.cssText,t.appendChild(s)}})(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,i){this._$AK(t,i)}_$ET(t,e){const i=this.constructor.elementProperties.get(t),s=this.constructor._$Eu(t,i);if(void 0!==s&&!0===i.reflect){const o=(void 0!==i.converter?.toAttribute?i.converter:b).toAttribute(e,i.type);this._$Em=t,null==o?this.removeAttribute(s):this.setAttribute(s,o),this._$Em=null}}_$AK(t,e){const i=this.constructor,s=i._$Eh.get(t);if(void 0!==s&&this._$Em!==s){const t=i.getPropertyOptions(s),o="function"==typeof t.converter?{fromAttribute:t.converter}:void 0!==t.converter?.fromAttribute?t.converter:b;this._$Em=s;const r=o.fromAttribute(e,t.type);this[s]=r??this._$Ej?.get(s)??r,this._$Em=null}}requestUpdate(t,e,i,s=!1,o){if(void 0!==t){const r=this.constructor;if(!1===s&&(o=this[t]),i??=r.getPropertyOptions(t),!((i.hasChanged??y)(o,e)||i.useDefault&&i.reflect&&o===this._$Ej?.get(t)&&!this.hasAttribute(r._$Eu(t,i))))return;this.C(t,e,i)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(t,e,{useDefault:i,reflect:s,wrapped:o},r){i&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,r??e??this[t]),!0!==o||void 0!==r)||(this._$AL.has(t)||(this.hasUpdated||i||(e=void 0),this._$AL.set(t,e)),!0===s&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}const t=this.scheduleUpdate();return null!=t&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[t,e]of this._$Ep)this[t]=e;this._$Ep=void 0}const t=this.constructor.elementProperties;if(t.size>0)for(const[e,i]of t){const{wrapped:t}=i,s=this[e];!0!==t||this._$AL.has(e)||void 0===s||this.C(e,void 0,i,s)}}let t=!1;const e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(t=>t.hostUpdate?.()),this.update(e)):this._$EM()}catch(e){throw t=!1,this._$EM(),e}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(t){}firstUpdated(t){}};w.elementStyles=[],w.shadowRootOptions={mode:"open"},w[v("elementProperties")]=new Map,w[v("finalized")]=new Map,_?.({ReactiveElement:w}),(g.reactiveElementVersions??=[]).push("2.1.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const $=globalThis,z=t=>t,k=$.trustedTypes,C=k?k.createPolicy("lit-html",{createHTML:t=>t}):void 0,T="$lit$",E=`lit$${Math.random().toFixed(9).slice(2)}$`,M="?"+E,S=`<${M}>`,D=document,A=()=>D.createComment(""),P=t=>null===t||"object"!=typeof t&&"function"!=typeof t,H=Array.isArray,R="[ \t\n\f\r]",B=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,L=/-->/g,I=/>/g,O=RegExp(`>|${R}(?:([^\\s"'>=/]+)(${R}*=${R}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),N=/'/g,F=/"/g,U=/^(?:script|style|textarea|title)$/i,W=t=>(e,...i)=>({_$litType$:t,strings:e,values:i}),G=W(1),Z=W(2),V=Symbol.for("lit-noChange"),j=Symbol.for("lit-nothing"),X=new WeakMap,Y=D.createTreeWalker(D,129);function q(t,e){if(!H(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==C?C.createHTML(e):e}const K=(t,e)=>{const i=t.length-1,s=[];let o,r=2===e?"<svg>":3===e?"<math>":"",n=B;for(let e=0;e<i;e++){const i=t[e];let a,l,c=-1,h=0;for(;h<i.length&&(n.lastIndex=h,l=n.exec(i),null!==l);)h=n.lastIndex,n===B?"!--"===l[1]?n=L:void 0!==l[1]?n=I:void 0!==l[2]?(U.test(l[2])&&(o=RegExp("</"+l[2],"g")),n=O):void 0!==l[3]&&(n=O):n===O?">"===l[0]?(n=o??B,c=-1):void 0===l[1]?c=-2:(c=n.lastIndex-l[2].length,a=l[1],n=void 0===l[3]?O:'"'===l[3]?F:N):n===F||n===N?n=O:n===L||n===I?n=B:(n=O,o=void 0);const d=n===O&&t[e+1].startsWith("/>")?" ":"";r+=n===B?i+S:c>=0?(s.push(a),i.slice(0,c)+T+i.slice(c)+E+d):i+E+(-2===c?e:d)}return[q(t,r+(t[i]||"<?>")+(2===e?"</svg>":3===e?"</math>":"")),s]};class J{constructor({strings:t,_$litType$:e},i){let s;this.parts=[];let o=0,r=0;const n=t.length-1,a=this.parts,[l,c]=K(t,e);if(this.el=J.createElement(l,i),Y.currentNode=this.el.content,2===e||3===e){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes)}for(;null!==(s=Y.nextNode())&&a.length<n;){if(1===s.nodeType){if(s.hasAttributes())for(const t of s.getAttributeNames())if(t.endsWith(T)){const e=c[r++],i=s.getAttribute(t).split(E),n=/([.?@])?(.*)/.exec(e);a.push({type:1,index:o,name:n[2],strings:i,ctor:"."===n[1]?st:"?"===n[1]?ot:"@"===n[1]?rt:it}),s.removeAttribute(t)}else t.startsWith(E)&&(a.push({type:6,index:o}),s.removeAttribute(t));if(U.test(s.tagName)){const t=s.textContent.split(E),e=t.length-1;if(e>0){s.textContent=k?k.emptyScript:"";for(let i=0;i<e;i++)s.append(t[i],A()),Y.nextNode(),a.push({type:2,index:++o});s.append(t[e],A())}}}else if(8===s.nodeType)if(s.data===M)a.push({type:2,index:o});else{let t=-1;for(;-1!==(t=s.data.indexOf(E,t+1));)a.push({type:7,index:o}),t+=E.length-1}o++}}static createElement(t,e){const i=D.createElement("template");return i.innerHTML=t,i}}function Q(t,e,i=t,s){if(e===V)return e;let o=void 0!==s?i._$Co?.[s]:i._$Cl;const r=P(e)?void 0:e._$litDirective$;return o?.constructor!==r&&(o?._$AO?.(!1),void 0===r?o=void 0:(o=new r(t),o._$AT(t,i,s)),void 0!==s?(i._$Co??=[])[s]=o:i._$Cl=o),void 0!==o&&(e=Q(t,o._$AS(t,e.values),o,s)),e}class tt{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:e},parts:i}=this._$AD,s=(t?.creationScope??D).importNode(e,!0);Y.currentNode=s;let o=Y.nextNode(),r=0,n=0,a=i[0];for(;void 0!==a;){if(r===a.index){let e;2===a.type?e=new et(o,o.nextSibling,this,t):1===a.type?e=new a.ctor(o,a.name,a.strings,this,t):6===a.type&&(e=new nt(o,this,t)),this._$AV.push(e),a=i[++n]}r!==a?.index&&(o=Y.nextNode(),r++)}return Y.currentNode=D,s}p(t){let e=0;for(const i of this._$AV)void 0!==i&&(void 0!==i.strings?(i._$AI(t,i,e),e+=i.strings.length-2):i._$AI(t[e])),e++}}class et{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,i,s){this.type=2,this._$AH=j,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=i,this.options=s,this._$Cv=s?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const e=this._$AM;return void 0!==e&&11===t?.nodeType&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=Q(this,t,e),P(t)?t===j||null==t||""===t?(this._$AH!==j&&this._$AR(),this._$AH=j):t!==this._$AH&&t!==V&&this._(t):void 0!==t._$litType$?this.$(t):void 0!==t.nodeType?this.T(t):(t=>H(t)||"function"==typeof t?.[Symbol.iterator])(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==j&&P(this._$AH)?this._$AA.nextSibling.data=t:this.T(D.createTextNode(t)),this._$AH=t}$(t){const{values:e,_$litType$:i}=t,s="number"==typeof i?this._$AC(t):(void 0===i.el&&(i.el=J.createElement(q(i.h,i.h[0]),this.options)),i);if(this._$AH?._$AD===s)this._$AH.p(e);else{const t=new tt(s,this),i=t.u(this.options);t.p(e),this.T(i),this._$AH=t}}_$AC(t){let e=X.get(t.strings);return void 0===e&&X.set(t.strings,e=new J(t)),e}k(t){H(this._$AH)||(this._$AH=[],this._$AR());const e=this._$AH;let i,s=0;for(const o of t)s===e.length?e.push(i=new et(this.O(A()),this.O(A()),this,this.options)):i=e[s],i._$AI(o),s++;s<e.length&&(this._$AR(i&&i._$AB.nextSibling,s),e.length=s)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){const e=z(t).nextSibling;z(t).remove(),t=e}}setConnected(t){void 0===this._$AM&&(this._$Cv=t,this._$AP?.(t))}}class it{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,i,s,o){this.type=1,this._$AH=j,this._$AN=void 0,this.element=t,this.name=e,this._$AM=s,this.options=o,i.length>2||""!==i[0]||""!==i[1]?(this._$AH=Array(i.length-1).fill(new String),this.strings=i):this._$AH=j}_$AI(t,e=this,i,s){const o=this.strings;let r=!1;if(void 0===o)t=Q(this,t,e,0),r=!P(t)||t!==this._$AH&&t!==V,r&&(this._$AH=t);else{const s=t;let n,a;for(t=o[0],n=0;n<o.length-1;n++)a=Q(this,s[i+n],e,n),a===V&&(a=this._$AH[n]),r||=!P(a)||a!==this._$AH[n],a===j?t=j:t!==j&&(t+=(a??"")+o[n+1]),this._$AH[n]=a}r&&!s&&this.j(t)}j(t){t===j?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class st extends it{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===j?void 0:t}}class ot extends it{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==j)}}class rt extends it{constructor(t,e,i,s,o){super(t,e,i,s,o),this.type=5}_$AI(t,e=this){if((t=Q(this,t,e,0)??j)===V)return;const i=this._$AH,s=t===j&&i!==j||t.capture!==i.capture||t.once!==i.once||t.passive!==i.passive,o=t!==j&&(i===j||s);s&&this.element.removeEventListener(this.name,this,i),o&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class nt{constructor(t,e,i){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=i}get _$AU(){return this._$AM._$AU}_$AI(t){Q(this,t)}}const at=$.litHtmlPolyfillSupport;at?.(J,et),($.litHtmlVersions??=[]).push("3.3.2");const lt=globalThis;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let ct=class extends w{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=((t,e,i)=>{const s=i?.renderBefore??e;let o=s._$litPart$;if(void 0===o){const t=i?.renderBefore??null;s._$litPart$=o=new et(e.insertBefore(A(),t),t,void 0,i??{})}return o._$AI(t),o})(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return V}};ct._$litElement$=!0,ct.finalized=!0,lt.litElementHydrateSupport?.({LitElement:ct});const ht=lt.litElementPolyfillSupport;ht?.({LitElement:ct}),(lt.litElementVersions??=[]).push("4.2.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const dt=t=>(e,i)=>{void 0!==i?i.addInitializer(()=>{customElements.define(t,e)}):customElements.define(t,e)},pt={attribute:!0,type:String,converter:b,reflect:!1,hasChanged:y},ut=(t=pt,e,i)=>{const{kind:s,metadata:o}=i;let r=globalThis.litPropertyMetadata.get(o);if(void 0===r&&globalThis.litPropertyMetadata.set(o,r=new Map),"setter"===s&&((t=Object.create(t)).wrapped=!0),r.set(i.name,t),"accessor"===s){const{name:s}=i;return{set(i){const o=e.get.call(this);e.set.call(this,i),this.requestUpdate(s,o,t,!0,i)},init(e){return void 0!==e&&this.C(s,void 0,t,e),e}}}if("setter"===s){const{name:s}=i;return function(i){const o=this[s];e.call(this,i),this.requestUpdate(s,o,t,!0,i)}}throw Error("Unsupported decorator location: "+s)};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function gt(t){return(e,i)=>"object"==typeof i?ut(t,e,i):((t,e,i)=>{const s=e.hasOwnProperty(i);return e.constructor.createProperty(i,t),s?Object.getOwnPropertyDescriptor(e,i):void 0})(t,e,i)}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function ft(t){return gt({...t,state:!0,attribute:!1})}const mt=n`
  :host {
    display: flex;
    height: 100%;
    background: var(--primary-background-color, #fafafa);
    color: var(--primary-text-color, #212121);
    font-family: var(--paper-font-body1_-_font-family, "Roboto", sans-serif);
  }
`,_t=n`
  .panel {
    padding: 24px;
    max-width: 1100px;
    margin: 0 auto;
    font-size: 14px;
  }
`,vt=n`
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
`,bt=n`
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
`,yt=n`
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
`,xt=n`
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
`,wt=n`
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
`,$t=n`
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
`,zt=n`
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
`,kt=n`
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
`,Ct=n`
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
`,Tt=n`
  .flasher-section {
    margin-bottom: 24px;
  }

  .flasher-section h3 {
    margin: 0 0 12px;
    font-size: 16px;
    font-weight: 500;
    color: var(--primary-text-color, #212121);
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
    background: var(--card-background-color, #fff);
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 10px;
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

  .firmware-badge-eppgrid {
    background: #4caf5020;
    color: #2e7d32;
  }

  .flash-btn {
    padding: 6px 16px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    background: var(--primary-color, #03a9f4);
    color: #fff;
    flex-shrink: 0;
  }

  .flash-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .usb-section {
    margin-top: 24px;
    padding: 16px;
    background: var(--card-background-color, #fff);
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 10px;
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .usb-section-text {
    flex: 1;
    font-size: 14px;
    color: var(--primary-text-color, #212121);
  }

  .usb-connect-btn {
    padding: 8px 20px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    background: var(--primary-color, #03a9f4);
    color: #fff;
    flex-shrink: 0;
  }

  .browser-warning {
    margin-top: 8px;
    font-size: 12px;
    color: var(--warning-color, #ff9800);
  }

  .progress-steps {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 16px;
    background: var(--card-background-color, #fff);
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 10px;
  }

  .progress-step {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    color: var(--secondary-text-color, #757575);
  }

  .progress-step.step-done {
    color: var(--success-color, #4caf50);
  }

  .progress-step.step-active {
    color: var(--primary-text-color, #212121);
    font-weight: 500;
  }

  .progress-step.step-error {
    color: var(--error-color, #f44336);
  }

  .step-icon {
    font-size: 16px;
    width: 20px;
    text-align: center;
    flex-shrink: 0;
  }

  .flasher-loading {
    padding: 24px;
    text-align: center;
    color: var(--secondary-text-color, #757575);
    font-size: 14px;
  }

  .flasher-empty {
    padding: 24px;
    text-align: center;
    color: var(--secondary-text-color, #757575);
    font-size: 14px;
  }

  .variant-selector {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
  }

  .variant-option {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    cursor: pointer;
    color: var(--primary-text-color, #212121);
  }

  .confirm-dialog {
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

  .confirm-card {
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

  .confirm-card h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 500;
  }

  .confirm-card p {
    margin: 0;
    font-size: 14px;
    color: var(--secondary-text-color, #757575);
    line-height: 1.5;
  }

  .confirm-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

  .cancel-btn {
    padding: 8px 20px;
    border-radius: 8px;
    border: 1px solid var(--divider-color, #e0e0e0);
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    background: transparent;
    color: var(--secondary-text-color, #757575);
  }

  .go-device-btn {
    padding: 8px 20px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    background: var(--primary-color, #03a9f4);
    color: #fff;
  }
`,Et=n`
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
`,Mt=[{step:"removing_old_device",key:"flasher.step_removing"},{step:"downloading_firmware",key:"flasher.step_downloading"},{step:"flashing",key:"flasher.step_flashing"},{step:"waiting_for_reboot",key:"flasher.step_rebooting"},{step:"adding_to_esphome",key:"flasher.step_adding"},{step:"complete",key:"flasher.step_complete"}],St=Mt.map(t=>t.step);let Dt=!1;let At=class extends ct{constructor(){super(...arguments),this.flashableDevices=[],this.loading=!1,this.otaProgress=null,this.flashingMac=null,this.localize=t=>t,this._selectedVariant="wifi",this._confirmDevice=null,this._hasWebSerial="undefined"!=typeof navigator&&"serial"in navigator,this._showUsbFlash=!1,this._wifiNetworks=[],this._wifiScanning=!1,this._selectedSsid="",this._manualSsid=!1,this._wifiPassword="",this._wifiConnected=!1,this._deviceIp=null,this._showWifiProvisioning=!1}_dispatchFlashOta(){this._confirmDevice&&(this.dispatchEvent(new CustomEvent("flash-ota",{detail:{mac:this._confirmDevice.mac,variant:this._selectedVariant},bubbles:!0,composed:!0})),this._confirmDevice=null)}async _onUsbConnect(){await(Dt?Promise.resolve():new Promise((t,e)=>{const i=document.createElement("script");i.type="module",i.src="https://unpkg.com/esp-web-tools@10/dist/web/install-button.js",i.onload=()=>{Dt=!0,t()},i.onerror=e,document.head.appendChild(i)})),this._showUsbFlash=!0}_dispatchFlashComplete(){this.dispatchEvent(new CustomEvent("flash-complete",{bubbles:!0,composed:!0}))}_dispatchWifiScan(){this.dispatchEvent(new CustomEvent("wifi-scan",{bubbles:!0,composed:!0}))}_dispatchWifiProvision(){this.dispatchEvent(new CustomEvent("wifi-provision",{detail:{ssid:this._selectedSsid,password:this._wifiPassword},bubbles:!0,composed:!0}))}_dispatchWifiComplete(){this.dispatchEvent(new CustomEvent("wifi-complete",{bubbles:!0,composed:!0}))}_renderLoading(){return G`<div class="flasher-loading">${this.localize("flasher.loading")}</div>`}_renderOtaProgress(t){const e=St.indexOf(t.step),i="failed"===t.status||"timeout"===t.status,s="success"===t.status;return G`
      <div class="progress-steps">
        ${Mt.map((o,r)=>{const n=o.step===t.step,a=n&&i;let l="progress-step",c="○";return a?(l+=" step-error",c="✗"):r<e||n&&s?(l+=" step-done",c="✓"):n&&(l+=" step-active",c="⟳"),G`
            <div class="${l}">
              <span class="step-icon">${c}</span>
              <span>${this.localize(o.key)}</span>
              ${n&&null!=t.progress?G`<span>(${t.progress}%)</span>`:j}
              ${a&&t.error?G`<span class="step-error"> — ${t.error}</span>`:j}
            </div>
          `})}
      </div>
      ${s?G`
          <div class="confirm-actions" style="margin-top:16px">
            <button class="go-device-btn" @click=${this._dispatchFlashComplete}>
              ${this.localize("flasher.go_to_config")}
            </button>
          </div>
        `:j}
    `}_renderConfirmDialog(t){return G`
      <div class="confirm-dialog">
        <div class="confirm-card">
          <h3>${this.localize("flasher.flash_device",{name:t.name})}</h3>
          <p>${this.localize("flasher.confirm_flash",{name:t.name,host:t.host??""})}</p>
          <div class="variant-selector">
            <label class="variant-option">
              <input
                type="radio"
                name="variant"
                value="wifi"
                .checked=${"wifi"===this._selectedVariant}
                @change=${()=>{this._selectedVariant="wifi"}}
              />
              ${this.localize("flasher.wifi")}
            </label>
            <label class="variant-option">
              <input
                type="radio"
                name="variant"
                value="ethernet"
                .checked=${"ethernet"===this._selectedVariant}
                @change=${()=>{this._selectedVariant="ethernet"}}
              />
              ${this.localize("flasher.ethernet")}
            </label>
          </div>
          <div class="confirm-actions">
            <button
              class="cancel-btn"
              @click=${()=>{this._confirmDevice=null}}
            >
              ${this.localize("common.cancel")}
            </button>
            <button class="flash-btn" @click=${this._dispatchFlashOta}>
              ${this.localize("flasher.flash")}
            </button>
          </div>
        </div>
      </div>
    `}_renderWifiProvisioning(){if(this._wifiConnected)return G`
        <div class="wifi-provisioning">
          <h3>${this.localize("flasher.configure_wifi")}</h3>
          <p>
            ${this.localize("flasher.connected_to",{ssid:this._selectedSsid})}
            ${this._deviceIp?G` — ${this.localize("flasher.ip_address",{ip:this._deviceIp})}`:j}
          </p>
          <div class="confirm-actions">
            <button
              class="wifi-continue-btn"
              @click=${this._dispatchWifiComplete}
            >
              ${this.localize("flasher.continue")}
            </button>
          </div>
        </div>
      `;const t=[...this._wifiNetworks].sort((t,e)=>e.rssi-t.rssi);return G`
      <div class="wifi-provisioning">
        <h3>${this.localize("flasher.configure_wifi")}</h3>

        <div class="wifi-scan-row">
          <button class="wifi-scan-btn" @click=${this._dispatchWifiScan}>
            ${this.localize("flasher.scan")}
          </button>
          ${this._wifiScanning?G`<span class="wifi-scanning">${this.localize("flasher.scanning")}</span>`:j}
        </div>

        ${t.length>0?G`
              <select
                class="wifi-network-select"
                .value=${this._selectedSsid}
                @change=${t=>{this._selectedSsid=t.target.value}}
              >
                <option value="">${this.localize("flasher.select_a_network")}</option>
                ${t.map(t=>G`
                    <option value="${t.ssid}">
                      ${t.authRequired?"🔒 ":""}${t.ssid} (${t.rssi} dBm)
                    </option>
                  `)}
              </select>
            `:j}

        <label class="wifi-manual-toggle">
          <input
            type="checkbox"
            .checked=${this._manualSsid}
            @change=${t=>{this._manualSsid=t.target.checked,this._manualSsid||(this._selectedSsid="")}}
          />
          ${this.localize("flasher.manual_ssid")}
        </label>

        ${this._manualSsid?G`
              <input
                class="wifi-ssid-input"
                type="text"
                placeholder="${this.localize("flasher.enter_ssid")}"
                .value=${this._selectedSsid}
                @input=${t=>{this._selectedSsid=t.target.value}}
              />
            `:j}

        <input
          class="wifi-password-input"
          type="password"
          placeholder="${this.localize("flasher.wifi_password")}"
          .value=${this._wifiPassword}
          @input=${t=>{this._wifiPassword=t.target.value}}
        />

        <div class="confirm-actions">
          <button
            class="wifi-configure-btn"
            .disabled=${!this._selectedSsid}
            @click=${this._dispatchWifiProvision}
          >
            ${this.localize("flasher.configure_wifi")}
          </button>
        </div>
      </div>
    `}_renderDeviceList(){const{flashableDevices:t}=this;return G`
      <div class="flasher-section">
        <h3>${this.localize("flasher.devices_on_network")}</h3>
        ${0===t.length?G`<div class="flasher-empty">
              ${this.localize("flasher.no_devices")}
            </div>`:G`
              <div class="device-list">
                ${t.map(t=>G`
                    <div class="device-row">
                      <div class="device-info">
                        <div class="device-name">${t.name}</div>
                        <div class="device-host">
                          ${t.host??this.localize("flasher.offline")}
                        </div>
                      </div>
                      <span
                        class="firmware-badge firmware-badge-${t.firmware_type}"
                      >
                        ${"original"===t.firmware_type?this.localize("flasher.original"):this.localize("flasher.eppgrid")}
                      </span>
                      <button
                        class="flash-btn"
                        .disabled=${!t.available}
                        @click=${()=>{this._confirmDevice=t}}
                      >
                        ${this.localize("flasher.flash")}
                      </button>
                    </div>
                  `)}
              </div>
            `}
      </div>
      ${this._renderUsbSection()}
    `}_renderUsbSection(){return G`
      <div class="usb-section">
        <div class="usb-section-text">
          ${this.localize("flasher.usb_description")}
          ${this._hasWebSerial?j:G`<div class="browser-warning">
                ${this.localize("flasher.usb_browser_warning")}
              </div>`}
        </div>
        <button class="usb-connect-btn" @click=${this._onUsbConnect}>
          ${this.localize("flasher.usb_connect")}
        </button>
      </div>
    `}render(){return this.loading?this._renderLoading():this._showWifiProvisioning?this._renderWifiProvisioning():this.otaProgress?this._renderOtaProgress(this.otaProgress):this._showUsbFlash?this._renderUsbFlash():G`
      ${this._confirmDevice?this._renderConfirmDialog(this._confirmDevice):j}
      ${this._renderDeviceList()}
    `}_renderUsbFlash(){const t="wifi"===this._selectedVariant?"https://github.com/clintongormley/everything-presence-pro-grid/releases/latest/download/everything-presence-pro-wifi-manifest.json":"https://github.com/clintongormley/everything-presence-pro-grid/releases/latest/download/everything-presence-pro-ethernet-manifest.json";return G`
			<div class="flasher-container">
				<h2>${this.localize("flasher.title")}</h2>
				<p>${this.localize("flasher.select_variant")}</p>
				<div class="variant-selector">
					<button
						class="variant-option ${"wifi"===this._selectedVariant?"selected":""}"
						@click=${()=>{this._selectedVariant="wifi"}}
					>${this.localize("flasher.wifi")}</button>
					<button
						class="variant-option ${"ethernet"===this._selectedVariant?"selected":""}"
						@click=${()=>{this._selectedVariant="ethernet"}}
					>${this.localize("flasher.ethernet")}</button>
				</div>
				<esp-web-install-button .manifest=${t}>
					<button class="flash-btn" slot="activate">${this.localize("flasher.flash")}</button>
				</esp-web-install-button>
				<div style="margin-top: 16px;">
					<button class="cancel-btn" @click=${()=>{this._showUsbFlash=!1}}>
						${this.localize("common.cancel")}
					</button>
				</div>
			</div>
		`}};At.styles=[Tt],t([gt({attribute:!1})],At.prototype,"hass",void 0),t([gt({attribute:!1})],At.prototype,"flashableDevices",void 0),t([gt({type:Boolean})],At.prototype,"loading",void 0),t([gt({attribute:!1})],At.prototype,"otaProgress",void 0),t([gt({type:String})],At.prototype,"flashingMac",void 0),t([gt({attribute:!1})],At.prototype,"localize",void 0),t([ft()],At.prototype,"_selectedVariant",void 0),t([ft()],At.prototype,"_confirmDevice",void 0),t([ft()],At.prototype,"_hasWebSerial",void 0),t([ft()],At.prototype,"_showUsbFlash",void 0),t([ft()],At.prototype,"_wifiNetworks",void 0),t([ft()],At.prototype,"_wifiScanning",void 0),t([ft()],At.prototype,"_selectedSsid",void 0),t([ft()],At.prototype,"_manualSsid",void 0),t([ft()],At.prototype,"_wifiPassword",void 0),t([ft()],At.prototype,"_wifiConnected",void 0),t([ft()],At.prototype,"_deviceIp",void 0),t([ft()],At.prototype,"_showWifiProvisioning",void 0),At=t([dt("epp-flasher-view")],At);
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Pt=2,Ht=t=>(...e)=>({_$litDirective$:t,values:e});class Rt{constructor(t){}get _$AU(){return this._$AM._$AU}_$AT(t,e,i){this._$Ct=t,this._$AM=e,this._$Ci=i}_$AS(t,e){return this.update(t,e)}update(t,e){return this.render(...e)}}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class Bt extends Rt{constructor(t){if(super(t),this.it=j,t.type!==Pt)throw Error(this.constructor.directiveName+"() can only be used in child bindings")}render(t){if(t===j||null==t)return this._t=void 0,this.it=t;if(t===V)return t;if("string"!=typeof t)throw Error(this.constructor.directiveName+"() called with a non-string value");if(t===this.it)return this._t;this.it=t;const e=[t];return e.raw=e,this._t={_$litType$:this.constructor.resultType,strings:e,values:[]}}}Bt.directiveName="unsafeHTML",Bt.resultType=1;const Lt=Ht(Bt);
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class It extends Bt{}It.directiveName="unsafeSVG",It.resultType=2;const Ot=Ht(It),Nt=20,Ft=20,Ut=400,Wt=300,Gt=6e3,Zt=t=>!!(1&t),Vt=t=>t>>1&7,jt=(t,e)=>-15&t|(7&e)<<1,Xt=t=>!!(16&t),Yt=t=>t>>5&7,qt=(t,e)=>e>0?-17&(-225&t|(7&e)<<5):-225&t;function Kt(t){let e=Nt,i=0,s=Ft,o=0;for(let r=0;r<Ut;r++)if(Zt(t[r])){const t=r%Nt,n=Math.floor(r/Nt);t<e&&(e=t),t>i&&(i=t),n<s&&(s=n),n>o&&(o=n)}return{minCol:Math.max(0,e-1),maxCol:Math.min(19,i+1),minRow:Math.max(0,s-1),maxRow:Math.min(19,o+1)}}function Jt(t){let e=Nt,i=0,s=Ft,o=0;for(let r=0;r<Ut;r++)if(Zt(t[r])){const t=r%Nt,n=Math.floor(r/Nt);t<e&&(e=t),t>i&&(i=t),n<s&&(s=n),n>o&&(o=n)}return{minCol:e,maxCol:i,minRow:s,maxRow:o}}function Qt(t,e){const i=new Uint8Array(Ut),s=Math.ceil(t/Wt),o=Math.ceil(e/Wt),r=Math.floor((Nt-s)/2);for(let t=0;t<Ft;t++)for(let e=0;e<Nt;e++){e>=r&&e<r+s&&t>=0&&t<0+o&&(i[t*Nt+e]=1)}return i}const te={armchair:{viewBox:"0 0 256 256",content:'<rect x="16" y="16" width="224" height="224" rx="16" stroke="black" stroke-width="12" fill="none"/><rect x="16" y="16" width="224" height="48" rx="8" stroke="black" stroke-width="12" fill="none"/><rect x="16" y="64" width="48" height="176" rx="8" stroke="black" stroke-width="12" fill="none"/><rect x="192" y="64" width="48" height="176" rx="8" stroke="black" stroke-width="12" fill="none"/><rect x="64" y="64" width="128" height="176" rx="8" stroke="black" stroke-width="8" fill="none"/>'},bath:{viewBox:"0 0 600 300",content:'<rect x="50" y="50" width="500" height="200" rx="40" stroke="black" stroke-width="8" fill="none"/><path d="M 100 220 C 100 240, 500 240, 500 220" stroke="black" stroke-width="8" fill="none"/><rect x="70" y="70" width="30" height="20" stroke="black" stroke-width="8" fill="none"/><rect x="80" y="90" width="10" height="20" stroke="black" stroke-width="8" fill="none"/><circle cx="510" cy="150" r="10" stroke="black" stroke-width="8" fill="none"/>'},"bed-double":{viewBox:"0 0 512 512",content:'<rect x="0" y="0" width="512" height="512" rx="16" stroke="black" stroke-width="16" fill="none"/><path d="M0 64C0 46.3269 16.3269 32 32 32H480C497.673 32 512 46.3269 512 64V128C512 145.673 497.673 160 480 160H32C16.3269 160 0 145.673 0 128V64Z" stroke="black" stroke-width="16" fill="none"/><rect x="32" y="32" width="208" height="96" rx="8" stroke="black" stroke-width="16" fill="none"/><rect x="272" y="32" width="208" height="96" rx="8" stroke="black" stroke-width="16" fill="none"/><rect x="16" y="144" width="480" height="336" rx="8" stroke="black" stroke-width="16" fill="none"/><line x1="16" y1="256" x2="496" y2="256" stroke="#D0D0D0" stroke-width="8"/><line x1="16" y1="368" x2="496" y2="368" stroke="#D0D0D0" stroke-width="8"/>'},"bed-single":{viewBox:"0 0 256 512",content:'<rect x="0" y="0" width="256" height="512" rx="16" stroke="black" stroke-width="16" fill="none"/><path d="M0 64C0 46.3269 16.3269 32 32 32H224C241.673 32 256 46.3269 256 64V128C256 145.673 241.673 160 224 160H32C16.3269 160 0 145.673 0 128V64Z" stroke="black" stroke-width="16" fill="none"/><rect x="32" y="32" width="192" height="96" rx="8" stroke="black" stroke-width="16" fill="none"/><rect x="16" y="144" width="224" height="336" rx="8" stroke="black" stroke-width="16" fill="none"/><line x1="16" y1="256" x2="240" y2="256" stroke="#D0D0D0" stroke-width="8"/><line x1="16" y1="368" x2="240" y2="368" stroke="#D0D0D0" stroke-width="8"/>'},"door-left":{viewBox:"0 0 256 256",content:'<rect x="0" y="210" width="80" height="20" fill="black"/><rect x="60" y="60" width="20" height="150" fill="black"/><rect x="200" y="210" width="56" height="20" fill="black"/><path d="M 80 60 A 150 150 0 0 1 200 210" stroke="black" stroke-width="3" fill="none"/>'},"door-right":{viewBox:"0 0 256 256",content:'<rect x="176" y="210" width="80" height="20" fill="black"/><rect x="176" y="60" width="20" height="150" fill="black"/><rect x="0" y="210" width="56" height="20" fill="black"/><path d="M 176 60 A 150 150 0 0 0 56 210" stroke="black" stroke-width="3" fill="none"/>'},"floor-lamp":{viewBox:"0 0 256 256",content:'<circle cx="128" cy="128" r="96" stroke="black" stroke-width="16" fill="none"/><circle cx="128" cy="128" r="80" stroke="black" stroke-width="8" fill="none"/><circle cx="128" cy="128" r="16" fill="black"/><line x1="128" y1="112" x2="128" y2="48" stroke="black" stroke-width="8"/><circle cx="128" cy="48" r="8" fill="black"/><path d="M 64 64 A 128 128 0 0 1 192 64" stroke="black" stroke-width="8" stroke-dasharray="8 8"/>'},oven:{viewBox:"0 0 256 256",content:'<rect x="0" y="0" width="256" height="256" rx="16" stroke="black" stroke-width="16" fill="none"/><line x1="0" y1="224" x2="256" y2="224" stroke="black" stroke-width="16"/><circle cx="64" cy="64" r="40" stroke="black" stroke-width="16" fill="none"/><circle cx="64" cy="64" r="16" fill="black"/><circle cx="192" cy="64" r="40" stroke="black" stroke-width="16" fill="none"/><circle cx="192" cy="64" r="16" fill="black"/><circle cx="64" cy="192" r="40" stroke="black" stroke-width="16" fill="none"/><circle cx="64" cy="192" r="16" fill="black"/><circle cx="192" cy="192" r="40" stroke="black" stroke-width="16" fill="none"/><circle cx="192" cy="192" r="16" fill="black"/><rect x="32" y="240" width="192" height="16" rx="4" stroke="black" stroke-width="8" fill="black"/>'},plant:{viewBox:"0 0 256 256",content:'<circle cx="128" cy="128" r="96" stroke="black" stroke-width="16" fill="none"/><circle cx="128" cy="128" r="80" fill="none"/><g transform="translate(128 128)"><path d="M 0 0 C 0 -64, 40 -80, 0 -96 C -40 -80, 0 -64, 0 0 Z" fill="none" stroke="black" stroke-width="12"/><path d="M 0 0 C 0 -64, 40 -80, 0 -96 C -40 -80, 0 -64, 0 0 Z" transform="rotate(72)" fill="none" stroke="black" stroke-width="12"/><path d="M 0 0 C 0 -64, 40 -80, 0 -96 C -40 -80, 0 -64, 0 0 Z" transform="rotate(144)" fill="none" stroke="black" stroke-width="12"/><path d="M 0 0 C 0 -64, 40 -80, 0 -96 C -40 -80, 0 -64, 0 0 Z" transform="rotate(216)" fill="none" stroke="black" stroke-width="12"/><path d="M 0 0 C 0 -64, 40 -80, 0 -96 C -40 -80, 0 -64, 0 0 Z" transform="rotate(288)" fill="none" stroke="black" stroke-width="12"/></g>'},shower:{viewBox:"0 0 256 256",content:'<path d="M 32 32 H 224 V 224 H 32 Z" stroke="black" stroke-width="16" fill="none"/><line x1="32" y1="32" x2="224" y2="224" stroke="black" stroke-width="8" stroke-dasharray="8 8"/><line x1="224" y1="32" x2="32" y2="224" stroke="black" stroke-width="8" stroke-dasharray="8 8"/><circle cx="128" cy="200" r="16" stroke="black" stroke-width="16" fill="none"/>'},"sofa-two-seater":{viewBox:"0 0 400 200",content:'<rect x="8" y="8" width="384" height="184" rx="12" stroke="black" stroke-width="10" fill="none"/><rect x="8" y="8" width="384" height="48" rx="8" stroke="black" stroke-width="10" fill="none"/><rect x="24" y="56" width="172" height="128" rx="8" stroke="black" stroke-width="8" fill="none"/><rect x="204" y="56" width="172" height="128" rx="8" stroke="black" stroke-width="8" fill="none"/>'},"sofa-three-seater":{viewBox:"0 0 560 200",content:'<rect x="8" y="8" width="544" height="184" rx="12" stroke="black" stroke-width="10" fill="none"/><rect x="8" y="8" width="544" height="48" rx="8" stroke="black" stroke-width="10" fill="none"/><rect x="24" y="56" width="160" height="128" rx="8" stroke="black" stroke-width="8" fill="none"/><rect x="200" y="56" width="160" height="128" rx="8" stroke="black" stroke-width="8" fill="none"/><rect x="376" y="56" width="160" height="128" rx="8" stroke="black" stroke-width="8" fill="none"/>'},"table-dining-room":{viewBox:"0 0 600 400",content:'<rect x="150" y="100" width="300" height="200" stroke="black" stroke-width="8" fill="none" rx="10"/><rect x="80" y="150" width="60" height="100" stroke="black" stroke-width="8" fill="none" rx="5"/><rect x="460" y="150" width="60" height="100" stroke="black" stroke-width="8" fill="none" rx="5"/><rect x="175" y="30" width="100" height="60" stroke="black" stroke-width="8" fill="none" rx="5"/><rect x="325" y="30" width="100" height="60" stroke="black" stroke-width="8" fill="none" rx="5"/><rect x="175" y="310" width="100" height="60" stroke="black" stroke-width="8" fill="none" rx="5"/><rect x="325" y="310" width="100" height="60" stroke="black" stroke-width="8" fill="none" rx="5"/>'},"table-dining-room-round":{viewBox:"0 0 400 400",content:'<circle cx="200" cy="200" r="100" stroke="black" stroke-width="8" fill="none"/><rect x="150" y="30" width="100" height="60" stroke="black" stroke-width="8" fill="none" rx="5"/><rect x="150" y="310" width="100" height="60" stroke="black" stroke-width="8" fill="none" rx="5"/><rect x="30" y="150" width="60" height="100" stroke="black" stroke-width="8" fill="none" rx="5"/><rect x="310" y="150" width="60" height="100" stroke="black" stroke-width="8" fill="none" rx="5"/>'},television:{viewBox:"0 0 256 64",content:'<line x1="0" y1="56" x2="256" y2="56" stroke="black" stroke-width="16"/><rect x="32" y="16" width="192" height="40" rx="4" stroke="black" stroke-width="16" fill="none"/><rect x="40" y="24" width="176" height="24" rx="2" stroke="black" stroke-width="8" fill="none"/>'},toilet:{viewBox:"0 0 300 400",content:'<rect x="75" y="30" width="150" height="80" rx="10" stroke="black" stroke-width="8" fill="none"/><path d="M 75 110 C 75 110, 50 160, 50 210 C 50 310, 125 360, 150 360 C 175 360, 250 310, 250 210 C 250 160, 225 110, 225 110 Z" stroke="black" stroke-width="8" fill="none"/><path d="M 100 150 C 100 150, 75 190, 75 220 C 75 300, 125 340, 150 340 C 175 340, 225 300, 225 220 C 225 190, 200 150, 200 150 Z" stroke="black" stroke-width="8" fill="none"/><circle cx="150" cy="70" r="15" stroke="black" stroke-width="8" fill="none"/>'}},ee=[{type:"svg",icon:"armchair",label:"furniture.armchair",defaultWidth:800,defaultHeight:800},{type:"svg",icon:"bath",label:"furniture.bath",defaultWidth:1700,defaultHeight:700},{type:"svg",icon:"bed-double",label:"furniture.double_bed",defaultWidth:1600,defaultHeight:2e3},{type:"svg",icon:"bed-single",label:"furniture.single_bed",defaultWidth:900,defaultHeight:2e3},{type:"svg",icon:"door-left",label:"furniture.door_left_swing",defaultWidth:800,defaultHeight:800},{type:"svg",icon:"door-right",label:"furniture.door_right_swing",defaultWidth:800,defaultHeight:800},{type:"svg",icon:"table-dining-room",label:"furniture.dining_table",defaultWidth:1600,defaultHeight:900},{type:"svg",icon:"table-dining-room-round",label:"furniture.round_table",defaultWidth:1e3,defaultHeight:1e3},{type:"svg",icon:"floor-lamp",label:"furniture.lamp",defaultWidth:400,defaultHeight:400},{type:"svg",icon:"oven",label:"furniture.oven_stove",defaultWidth:600,defaultHeight:600},{type:"svg",icon:"plant",label:"furniture.plant",defaultWidth:400,defaultHeight:400},{type:"svg",icon:"shower",label:"furniture.shower",defaultWidth:900,defaultHeight:900},{type:"svg",icon:"sofa-two-seater",label:"furniture.sofa_2_seat",defaultWidth:1600,defaultHeight:800},{type:"svg",icon:"sofa-three-seater",label:"furniture.sofa_3_seat",defaultWidth:2400,defaultHeight:800},{type:"svg",icon:"television",label:"furniture.tv",defaultWidth:1200,defaultHeight:200},{type:"svg",icon:"toilet",label:"furniture.toilet",defaultWidth:400,defaultHeight:700},{type:"icon",icon:"mdi:countertop",label:"furniture.counter",defaultWidth:2e3,defaultHeight:600,lockAspect:!1},{type:"icon",icon:"mdi:cupboard",label:"furniture.cupboard",defaultWidth:1e3,defaultHeight:500,lockAspect:!1},{type:"icon",icon:"mdi:desk",label:"furniture.desk",defaultWidth:1400,defaultHeight:700,lockAspect:!1},{type:"icon",icon:"mdi:fridge",label:"furniture.fridge",defaultWidth:700,defaultHeight:700,lockAspect:!0},{type:"icon",icon:"mdi:speaker",label:"furniture.speaker",defaultWidth:300,defaultHeight:300,lockAspect:!0},{type:"icon",icon:"mdi:window-open-variant",label:"furniture.window",defaultWidth:1e3,defaultHeight:150,lockAspect:!1}],ie=["corners.front_left","corners.front_right","corners.back_right","corners.back_left"],se=[["corners.left_wall","corners.front_wall"],["corners.right_wall","corners.front_wall"],["corners.right_wall","corners.back_wall"],["corners.left_wall","corners.back_wall"]],oe=["#2196F3","#FF5722","#4CAF50"],re=100,ne=Math.PI/3,ae=Gt*Math.sin(Math.PI/3);function le(t,e){return t/Wt*(e+1)}function ce(t,e){return t/(e+1)*Wt}function he(t,e,i){const s=i-e;return Math.round((t+s+360)%360)}class de extends ct{constructor(){super(...arguments),this.furniture=[],this.selectedFurnitureId=null,this.roomWidth=3e3,this.cellPx=28,this.minCol=0,this.minRow=0,this.visCols=20,this.visRows=20,this.sidebarTab="zones",this.localize=t=>t}_mmToPx(t){return le(t,this.cellPx)}_fireEvent(t,e){this.dispatchEvent(new CustomEvent(t,{bubbles:!0,composed:!0,detail:e}))}_onItemPointerDown(t,e){this._fireEvent("furniture-select",e),this._fireEvent("furniture-pointer-down",{e:t,id:e,type:"move"})}_onResizePointerDown(t,e,i){this._fireEvent("furniture-pointer-down",{e:t,id:e,type:"resize",handle:i})}_onRotatePointerDown(t,e){this._fireEvent("furniture-pointer-down",{e:t,id:e,type:"rotate"})}_onDeletePointerDown(t,e){t.stopPropagation(),this._fireEvent("furniture-delete",e)}render(){if(!this.furniture.length)return j;const t=Math.ceil(this.roomWidth/Wt),e=Math.floor((Nt-t)/2),i=this.cellPx+1,s="furniture"===this.sidebarTab;return G`
			<div class="furniture-overlay ${s?"":"non-interactive"}">
				${this.furniture.map(t=>{const s=(e-this.minCol)*i+this._mmToPx(t.x),o=(0-this.minRow)*i+this._mmToPx(t.y),r=this._mmToPx(t.width),n=this._mmToPx(t.height),a=this.selectedFurnitureId===t.id;return G`
						<div
							class="furniture-item ${a?"selected":""}"
							data-id="${t.id}"
							style="
								left: ${s}px; top: ${o}px;
								width: ${r}px; height: ${n}px;
								transform: rotate(${t.rotation}deg);
							"
							@pointerdown=${e=>this._onItemPointerDown(e,t.id)}
						>
							${"svg"===t.type&&te[t.icon]?Z`<svg viewBox="${te[t.icon].viewBox}" preserveAspectRatio="none" class="furn-svg">
										${Ot(te[t.icon].content)}
									</svg>`:G`<ha-icon icon="${t.icon}" style="--mdc-icon-size: ${.6*Math.min(r,n)}px;"></ha-icon>`}
							${a?G`
										<!-- Resize handles -->
										<div class="furn-handle furn-handle-n" @pointerdown=${e=>this._onResizePointerDown(e,t.id,"n")}></div>
										<div class="furn-handle furn-handle-s" @pointerdown=${e=>this._onResizePointerDown(e,t.id,"s")}></div>
										<div class="furn-handle furn-handle-e" @pointerdown=${e=>this._onResizePointerDown(e,t.id,"e")}></div>
										<div class="furn-handle furn-handle-w" @pointerdown=${e=>this._onResizePointerDown(e,t.id,"w")}></div>
										<div class="furn-handle furn-handle-ne" @pointerdown=${e=>this._onResizePointerDown(e,t.id,"ne")}></div>
										<div class="furn-handle furn-handle-nw" @pointerdown=${e=>this._onResizePointerDown(e,t.id,"nw")}></div>
										<div class="furn-handle furn-handle-se" @pointerdown=${e=>this._onResizePointerDown(e,t.id,"se")}></div>
										<div class="furn-handle furn-handle-sw" @pointerdown=${e=>this._onResizePointerDown(e,t.id,"sw")}></div>
										<!-- Rotate handle with stem -->
										<div class="furn-rotate-stem"></div>
										<div class="furn-rotate-handle" @pointerdown=${e=>this._onRotatePointerDown(e,t.id)}>
											<ha-icon icon="mdi:rotate-right" style="--mdc-icon-size: 14px;"></ha-icon>
										</div>
										<!-- Delete button -->
										<div class="furn-delete-btn" @pointerdown=${e=>this._onDeletePointerDown(e,t.id)}>
											<ha-icon icon="mdi:close" style="--mdc-icon-size: 14px;"></ha-icon>
										</div>
									`:j}
						</div>
					`})}
			</div>
		`}}de.styles=n`
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

		.furn-handle-n { top: -4px; left: 50%; transform: translateX(-50%); cursor: n-resize; }
		.furn-handle-s { bottom: -4px; left: 50%; transform: translateX(-50%); cursor: s-resize; }
		.furn-handle-e { right: -4px; top: 50%; transform: translateY(-50%); cursor: e-resize; }
		.furn-handle-w { left: -4px; top: 50%; transform: translateY(-50%); cursor: w-resize; }
		.furn-handle-ne { top: -4px; right: -4px; cursor: ne-resize; }
		.furn-handle-nw { top: -4px; left: -4px; cursor: nw-resize; }
		.furn-handle-se { bottom: -4px; right: -4px; cursor: se-resize; }
		.furn-handle-sw { bottom: -4px; left: -4px; cursor: sw-resize; }

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
	`,t([gt({attribute:!1})],de.prototype,"furniture",void 0),t([gt({attribute:!1})],de.prototype,"selectedFurnitureId",void 0),t([gt({type:Number})],de.prototype,"roomWidth",void 0),t([gt({type:Number})],de.prototype,"cellPx",void 0),t([gt({type:Number})],de.prototype,"minCol",void 0),t([gt({type:Number})],de.prototype,"minRow",void 0),t([gt({type:Number})],de.prototype,"visCols",void 0),t([gt({type:Number})],de.prototype,"visRows",void 0),t([gt({attribute:!1})],de.prototype,"sidebarTab",void 0),t([gt({attribute:!1})],de.prototype,"localize",void 0),customElements.get("epp-furniture-overlay")||customElements.define("epp-furniture-overlay",de);class pe extends ct{constructor(){super(...arguments),this.furniture=[],this.selectedFurnitureId=null,this.hass=void 0,this.localize=t=>t,this.showCustomIconPicker=!1,this.customIconValue=""}render(){return this._renderFurnitureSidebar()}_renderFurnitureSidebar(){const t=this.furniture.find(t=>t.id===this.selectedFurnitureId);return G`
			${t?G`
						<div class="furn-selected-info">
							<div class="zone-item-row">
								<ha-icon icon="${t.icon}" style="--mdc-icon-size: 20px;"></ha-icon>
								<strong>${this.localize(t.label)}</strong>
								<button class="zone-remove-btn" @click=${()=>this._fireRemove(t.id)}>
									<ha-icon icon="mdi:close"></ha-icon>
								</button>
							</div>
							<div class="furn-dims">
								<label>
									${this.localize("dimensions.width_cm")}
									<input type="number" min="10" step="5" .value=${String(Math.round(t.width/10))}
										@change=${e=>this._fireUpdate(t.id,{width:10*parseInt(e.target.value)})}
									/>
								</label>
								<label>
									${this.localize("dimensions.height_cm")}
									<input type="number" min="10" step="5" .value=${String(Math.round(t.height/10))}
										@change=${e=>this._fireUpdate(t.id,{height:10*parseInt(e.target.value)})}
									/>
								</label>
								<label>
									${this.localize("dimensions.rotation")}
									<input type="number" step="5" .value=${String(Math.round(t.rotation))}
										@change=${e=>this._fireUpdate(t.id,{rotation:parseInt(e.target.value)%360})}
									/>
								</label>
							</div>
						</div>
					`:j}

			<div class="furn-catalog">
				${ee.map(t=>G`
						<button class="furn-sticker" @click=${()=>this._fireAdd(t)}>
							${"svg"===t.type&&te[t.icon]?Z`<svg viewBox="${te[t.icon].viewBox}" class="furn-sticker-svg">
										${Ot(te[t.icon].content)}
									</svg>`:G`<ha-icon icon="${t.icon}" style="--mdc-icon-size: 24px;"></ha-icon>`}
							<span>${this.localize(t.label)}</span>
						</button>
					`)}
				<button class="furn-sticker furn-custom" @click=${()=>{this.dispatchEvent(new CustomEvent("custom-icon-toggle",{bubbles:!0,composed:!0}))}}>
					<ha-icon icon="mdi:plus" style="--mdc-icon-size: 24px;"></ha-icon>
					<span>${this.localize("furniture.custom_icon")}</span>
				</button>
			</div>
			${this.showCustomIconPicker?G`
						<div class="template-dialog">
							<div class="template-dialog-card">
								<h3>${this.localize("furniture.custom_icon")}</h3>
								<ha-icon-picker
									.hass=${this.hass}
									.value=${this.customIconValue}
									@value-changed=${t=>{this.dispatchEvent(new CustomEvent("custom-icon-change",{detail:t.detail.value||"",bubbles:!0,composed:!0}))}}
								></ha-icon-picker>
								${this.customIconValue.trim()?G`
											<div style="text-align: center;">
												<ha-icon icon="${this.customIconValue.trim()}" style="--mdc-icon-size: 48px;"></ha-icon>
											</div>
										`:j}
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
					`:j}
		`}_fireAdd(t){this.dispatchEvent(new CustomEvent("furniture-add",{detail:t,bubbles:!0,composed:!0}))}_fireRemove(t){this.dispatchEvent(new CustomEvent("furniture-remove",{detail:t,bubbles:!0,composed:!0}))}_fireUpdate(t,e){this.dispatchEvent(new CustomEvent("furniture-update",{detail:{id:t,updates:e},bubbles:!0,composed:!0}))}}function ue(t,e,i,s){if(i<=0||s<=0)return null;const o=Math.ceil(i/Wt);return{col:Math.floor((Nt-o)/2)+t/Wt,row:e/Wt}}pe.styles=[vt,bt,n`
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
		`],t([gt({attribute:!1})],pe.prototype,"furniture",void 0),t([gt({attribute:!1})],pe.prototype,"selectedFurnitureId",void 0),t([gt({attribute:!1})],pe.prototype,"hass",void 0),t([gt({attribute:!1})],pe.prototype,"localize",void 0),t([gt({attribute:!1})],pe.prototype,"showCustomIconPicker",void 0),t([gt({attribute:!1})],pe.prototype,"customIconValue",void 0),customElements.get("epp-furniture-sidebar")||customElements.define("epp-furniture-sidebar",pe);const ge=Gt*Math.sin(Math.PI/3);const fe="repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(0,0,0,0.13) 3px, rgba(0,0,0,0.13) 4px), repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(0,0,0,0.13) 3px, rgba(0,0,0,0.13) 4px), #c8c8c8";function me(t,e){if(!Zt(t))return"var(--secondary-background-color, #e0e0e0)";const i=Vt(t);if(i>0&&i<=7){const t=e[i-1];if(t)return t.color}return"var(--card-background-color, #fff)"}function _e(t){return{r:parseInt(t.slice(1,3),16),g:parseInt(t.slice(3,5),16),b:parseInt(t.slice(5,7),16)}}function ve(t,e,i){const s=t[6]*e+t[7]*i+1;return{x:(t[0]*e+t[1]*i+t[2])/s,y:(t[3]*e+t[4]*i+t[5])/s}}function be(t){const e=ve(t,0,0),i=ve(t,0,1e3),s=i.x-e.x,o=i.y-e.y,r=Math.sqrt(s*s+o*o);return{sensorPos:e,dirX:s/r,dirY:o/r}}function ye(t){return t?ve(t,0,0):null}function xe(t,e,i,s,o){if(!i)return!0;const r=Math.ceil(s/Wt),n=Math.floor((Nt-r)/2),a=(e+.5)*Wt,l=(t-n+.5)*Wt-i.sensorPos.x,c=a-i.sensorPos.y,h=Math.sqrt(l*l+c*c);if(h<1)return!0;const d=l/h*i.dirX+c/h*i.dirY;return!(Math.acos(Math.max(-1,Math.min(1,d)))>Math.PI/3)&&!(h>o)}function we(t,e,i){return 1e3*(t?e>0?Math.min(e,6):6:i)}function $e(t,e,i,s){if(t<=0||e<=0)return 0;const o=ye(i);if(o){const e=Math.ceil(t/Wt),i=Math.floor((Nt-e)/2);let r=0;const n=Jt(s);for(let t=n.minRow;t<=n.maxRow;t++)for(let e=n.minCol;e<=n.maxCol;e++){if(!Zt(s[t*Nt+e]))continue;const n=(t+.5)*Wt,a=(e-i+.5)*Wt-o.x,l=n-o.y,c=Math.sqrt(a*a+l*l);c>r&&(r=c)}if(r>0){const t=r/1e3;return Math.ceil(2*t)/2}}const r=Math.max(t,e)/1e3;return Math.ceil(2*r)/2}function ze(t){if(0===t.length)return 0;const e=[...t].sort((t,e)=>t-e),i=Math.floor(e.length/2);return e.length%2?e[i]:(e[i-1]+e[i])/2}function ke(t,e,i){const s=Jt(t);if(s.minCol>s.maxCol)return null;const o=s.maxCol-s.minCol+1,r=s.maxRow-s.minRow+1,n=o*Wt,a=r*Wt,l=ye(i),c=Math.ceil(e/Wt),h=Math.floor((Nt-c)/2),d=l?l.x:n/2,p=l?l.y:0;let u=0;for(let e=0;e<Ut;e++){if(!Zt(t[e]))continue;const i=e%Nt,s=Math.floor(e/Nt),o=(i-h+.5)*Wt-d,r=(s+.5)*Wt-p,n=o*o+r*r;n>u&&(u=n)}return{widthM:(n/1e3).toFixed(1),depthM:(a/1e3).toFixed(1),furthestM:(Math.sqrt(u)/1e3).toFixed(1)}}class Ce extends ct{constructor(){super(...arguments),this.grid=new Uint8Array(0),this.zoneConfigs=[],this.targets=[],this.roomWidth=0,this.roomDepth=0,this.perspective=null,this.furniture=[],this.selectedFurnitureId=null,this.sidebarTab="zones",this.editable=!1,this.activeZone=null,this.showHitCounts=!1,this.occupancy={},this.targetPrevXY=[],this.heatmapColors=null,this.localize=t=>t,this.maxRangeMm=Gt,this.dismissedTargets=new Map,this.maxGridPx=480,this.frozenBounds=null,this._fovCache=null,this._fovPerspective=null}render(){const t=this.frozenBounds??Kt(this.grid),e=t.minCol>t.maxCol,i=e?0:t.minCol,s=e?19:t.maxCol,o=e?0:t.minRow,r=t.maxRow,n=s-i+1,a=r-o+1,l=Math.min(Math.floor(this.maxGridPx/n),Math.floor(this.maxGridPx/a),32);return G`
			<div class="grid-targets-wrapper">
				<div
					class="grid"
					style="grid-template-columns: repeat(${n}, ${l}px); grid-template-rows: repeat(${a}, ${l}px);"
					@mouseup=${this._onCellMouseUp}
				>
					${this._renderVisibleCells(i,s,o,r,l)}
				</div>
				${this._renderFurnitureOverlay(l,i,o,n,a)}
				${this._renderTargetDots(i,o,n,a)}
			</div>
			${this._renderGridDimensions()}
		`}_getSensorFov(){return this.perspective?(this._fovCache&&this._fovPerspective===this.perspective||(this._fovCache=be(this.perspective),this._fovPerspective=this.perspective),this._fovCache):null}_renderVisibleCells(t,e,i,s,o){const r=this.heatmapColors,n=this.occupancy,a=this._getSensorFov(),l=this.maxRangeMm,c=[];for(let h=i;h<=s;h++)for(let i=t;i<=e;i++){const t=h*Nt+i,e=this.grid[t],s=xe(i,h,a,this.roomWidth,l);let d=s?me(e,this.zoneConfigs):fe,p="";if(s&&Zt(e)){const t=Vt(e);if(r){const e=r.get(t);e&&(d=`linear-gradient(${e}, ${e}), linear-gradient(${d}, ${d})`)}n[t]&&(p="box-shadow: inset 0 0 0 1px rgba(0,0,0,0.4);")}let u="";if(s&&Zt(e))if(Xt(e))u="background-image: repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(60,60,60,0.7) 6px, rgba(60,60,60,0.7) 8px);";else{const t=Yt(e);2===t?u="background-image: repeating-linear-gradient(-45deg, transparent, transparent 5px, #cc3333 5px, #cc3333 7px), repeating-linear-gradient(45deg, transparent, transparent 5px, #cc3333 5px, #cc3333 7px);":t>0&&(u="background-image: repeating-linear-gradient(-45deg, transparent, transparent 5px, #cc3333 5px, #cc3333 7px);")}c.push(G`
					<div
						class="cell"
						style="background: ${d}; width: ${o}px; height: ${o}px; ${p} ${u}"
						@mousedown=${()=>{s&&this._onCellMouseDown(t)}}
						@mouseenter=${()=>{s&&this._onCellMouseEnter(t)}}
					></div>
				`)}return c}_onCellMouseDown(t){this.dispatchEvent(new CustomEvent("cell-paint",{detail:{index:t,action:"down"},bubbles:!0,composed:!0}))}_onCellMouseEnter(t){this.dispatchEvent(new CustomEvent("cell-paint",{detail:{index:t,action:"enter"},bubbles:!0,composed:!0}))}_onCellMouseUp(){this.dispatchEvent(new CustomEvent("cell-paint",{detail:{action:"up"},bubbles:!0,composed:!0}))}_renderTargetDots(t,e,i,s){return G`
			<div class="targets-overlay" style="pointer-events: none;">
				${this.targets.map((o,r)=>{if("inactive"===o.status)return j;let n=null!=o.x?ue(o.x,o.y,this.roomWidth,this.roomDepth):null;const a=n&&n.col>=t&&n.col<=t+i&&n.row>=e&&n.row<=e+s;if("pending"===o.status&&!a&&this.targetPrevXY[r]&&(n=ue(this.targetPrevXY[r].x,this.targetPrevXY[r].y,this.roomWidth,this.roomDepth)),!n)return j;const l=Math.max(0,Math.min(100,(n.col-t)/i*100)),c=Math.max(0,Math.min(100,(n.row-e)/s*100));if(this.dismissedTargets.has(r)){const t=Math.floor(n.col),e=Math.floor(n.row)*Nt+t;if(this.dismissedTargets.get(r)===e)return j;this.dismissedTargets.delete(r),this.dispatchEvent(new CustomEvent("target-undismissed",{detail:{targetIndex:r},bubbles:!0,composed:!0}))}if(this.grid.length>0){const t=Math.floor(n.col),e=Math.floor(n.row)*Nt+t;if(e>=0&&e<this.grid.length){if(Yt(this.grid[e])>0){const t=Vt(this.grid[e]);if(!this.occupancy[t])return j}}}const h="pending"===o.status?.3:1;return G`
						<div
							class="target-dot ${this.editable?"":"clickable"}"
							style="left: ${l}%; top: ${c}%; background: ${oe[r]||oe[0]}; opacity: ${h}; transition: opacity 0.5s ease;"
							@click=${t=>{this.editable||(t.stopPropagation(),this.dispatchEvent(new CustomEvent("target-click",{detail:{targetIndex:r,x:o.x,y:o.y,pctX:l,pctY:c},bubbles:!0,composed:!0})))}}
						></div>
						${"active"===o.status&&o.signal>0?G`
									<div style="position: absolute; left: ${l}%; top: ${c}%; transform: translate(-50%, -280%); background: rgba(0,0,0,0.7); color: #fff; font-size: 10px; font-weight: bold; padding: 0 4px; border-radius: 6px; pointer-events: none;">
										${o.signal}
									</div>
								`:j}
					`})}
			</div>
		`}_renderGridDimensions(){const t=ke(this.grid,this.roomWidth,this.perspective);return t?G`
			<div class="grid-dimensions">
				${t.widthM}m × ${t.depthM}m · Furthest point: ${t.furthestM}m
			</div>
		`:j}_renderFurnitureOverlay(t,e,i,s,o){return this.furniture.length?G`
			<epp-furniture-overlay
				.furniture=${this.furniture}
				.selectedFurnitureId=${this.selectedFurnitureId}
				.roomWidth=${this.roomWidth}
				.cellPx=${t}
				.minCol=${e}
				.minRow=${i}
				.visCols=${s}
				.visRows=${o}
				.sidebarTab=${this.sidebarTab}
				.localize=${this.localize}
				@furniture-select=${t=>{t.stopPropagation(),this.dispatchEvent(new CustomEvent("furniture-select",{detail:t.detail,bubbles:!0,composed:!0}))}}
				@furniture-pointer-down=${t=>{t.stopPropagation(),this.dispatchEvent(new CustomEvent("furniture-pointer-down",{detail:t.detail,bubbles:!0,composed:!0}))}}
				@furniture-delete=${t=>{t.stopPropagation(),this.dispatchEvent(new CustomEvent("furniture-delete",{detail:t.detail,bubbles:!0,composed:!0}))}}
			></epp-furniture-overlay>
		`:j}}Ce.styles=n`
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
	`,t([gt({attribute:!1})],Ce.prototype,"grid",void 0),t([gt({attribute:!1})],Ce.prototype,"zoneConfigs",void 0),t([gt({attribute:!1})],Ce.prototype,"targets",void 0),t([gt({type:Number})],Ce.prototype,"roomWidth",void 0),t([gt({type:Number})],Ce.prototype,"roomDepth",void 0),t([gt({attribute:!1})],Ce.prototype,"perspective",void 0),t([gt({attribute:!1})],Ce.prototype,"furniture",void 0),t([gt({attribute:!1})],Ce.prototype,"selectedFurnitureId",void 0),t([gt({attribute:!1})],Ce.prototype,"sidebarTab",void 0),t([gt({type:Boolean})],Ce.prototype,"editable",void 0),t([gt({attribute:!1})],Ce.prototype,"activeZone",void 0),t([gt({type:Boolean})],Ce.prototype,"showHitCounts",void 0),t([gt({attribute:!1})],Ce.prototype,"occupancy",void 0),t([gt({attribute:!1})],Ce.prototype,"targetPrevXY",void 0),t([gt({attribute:!1})],Ce.prototype,"heatmapColors",void 0),t([gt({attribute:!1})],Ce.prototype,"localize",void 0),t([gt({type:Number})],Ce.prototype,"maxRangeMm",void 0),t([gt({attribute:!1})],Ce.prototype,"dismissedTargets",void 0),t([gt({type:Number})],Ce.prototype,"maxGridPx",void 0),t([gt({attribute:!1})],Ce.prototype,"frozenBounds",void 0),customElements.get("epp-grid")||customElements.define("epp-grid",Ce);class Te extends ct{constructor(){super(...arguments),this.sensorState={occupancy:!1,static_presence:!1,motion_presence:!1,target_presence:!1,illuminance:null,temperature:null,humidity:null,co2:null},this.zoneState={occupancy:{},target_counts:{},frame_count:0},this.zoneConfigs=[],this.perspective=null,this.localize=t=>t,this._expandedSensorInfo=null}render(){const t=this.sensorState,e=this.zoneState,i=[{id:"occupancy",label:this.localize("live.occupancy"),on:t.occupancy_state??t.occupancy,info:this.localize("info.occupancy")},{id:"static",label:this.localize("live.static_presence"),on:t.static_state?"I"!==t.static_state:t.static_presence,info:this.localize("info.static_presence")},{id:"motion",label:this.localize("live.motion_presence"),on:t.motion_state?"I"!==t.motion_state:t.motion_presence,info:this.localize("info.motion_presence")},{id:"target",label:this.localize("live.target_presence"),on:t.target_presence,info:this.localize("info.target_presence")}],s=[];for(let t=0;t<7;t++){const i=this.zoneConfigs[t];if(!i)continue;const o=t+1,r=e.occupancy[o]??!1,n=e.target_counts[o]??0;s.push({id:`zone_${o}`,label:i.name,on:r,info:this.localize("info.zone_occupancy",{slot:o,count:n})})}const o=e.occupancy[0]??!1,r=e.target_counts[0]??0;s.push({id:"zone_0",label:this.localize("sidebar.rest_of_room"),on:o,info:this.localize("info.rest_of_room_occupancy",{count:r})});const n=[];return null!==t.illuminance&&n.push({id:"illuminance",label:this.localize("entities.illuminance"),value:`${t.illuminance.toFixed(1)} lux`}),null!==t.temperature&&n.push({id:"temperature",label:this.localize("entities.temperature"),value:`${t.temperature.toFixed(1)} °C`}),null!==t.humidity&&n.push({id:"humidity",label:this.localize("entities.humidity"),value:`${t.humidity.toFixed(1)} %`}),null!==t.co2&&n.push({id:"co2",label:this.localize("entities.co2"),value:`${Math.round(t.co2)} ppm`}),G`
      <div style="padding: 8px 0;">
        <div class="live-section-header">${this.localize("live.presence")}</div>
        ${i.map(t=>G`
          <div class="live-sensor-row">
            <div class="live-sensor-dot ${t.on?"on":"off"}"></div>
            <span class="live-sensor-label">${t.label}</span>
            <span class="live-sensor-state ${t.on?"detected":""}">${t.on?this.localize("live.detected"):this.localize("live.clear")}</span>
            <button class="live-sensor-info-btn"
              @click=${()=>{this._expandedSensorInfo=this._expandedSensorInfo===t.id?null:t.id}}
            >
              <ha-icon icon="mdi:information-outline" style="--mdc-icon-size: 16px;"></ha-icon>
            </button>
          </div>
          ${this._expandedSensorInfo===t.id?G`
            <div class="live-sensor-info-text">${t.info}</div>
          `:j}
        `)}

        ${this.perspective?G`
        <hr style="border: none; border-top: 1px solid var(--divider-color, #eee); margin: 10px 12px;"/>

        <button class="live-section-header live-section-link" @click=${()=>{this.dispatchEvent(new CustomEvent("view-change",{detail:{view:"editor",sidebarTab:"zones"},bubbles:!0,composed:!0}))}}>${this.localize("sidebar.detection_zones")}</button>
        ${s.map(t=>G`
          <div class="live-sensor-row">
            <div class="live-sensor-dot ${t.on?"on":"off"}"></div>
            <span class="live-sensor-label">${t.label}</span>
            <span class="live-sensor-state ${t.on?"detected":""}">${t.on?this.localize("live.detected"):this.localize("live.clear")}</span>
            <button class="live-sensor-info-btn"
              @click=${()=>{this._expandedSensorInfo=this._expandedSensorInfo===t.id?null:t.id}}
            >
              <ha-icon icon="mdi:information-outline" style="--mdc-icon-size: 16px;"></ha-icon>
            </button>
          </div>
          ${this._expandedSensorInfo===t.id?G`
            <div class="live-sensor-info-text">${t.info}</div>
          `:j}
        `)}
        `:j}

        <hr style="border: none; border-top: 1px solid var(--divider-color, #eee); margin: 10px 12px;"/>

        ${n.length?G`
          <div class="live-section-header">${this.localize("live.environment")}</div>
          ${n.map(t=>G`
            <div class="live-sensor-row">
              <span class="live-sensor-label">${t.label}</span>
              <span class="live-sensor-value">${t.value}</span>
            </div>
          `)}
        `:j}

      </div>
    `}}Te.styles=n`
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
  `,t([gt({attribute:!1})],Te.prototype,"sensorState",void 0),t([gt({attribute:!1})],Te.prototype,"zoneState",void 0),t([gt({attribute:!1})],Te.prototype,"zoneConfigs",void 0),t([gt({attribute:!1})],Te.prototype,"perspective",void 0),t([gt({attribute:!1})],Te.prototype,"localize",void 0),t([ft()],Te.prototype,"_expandedSensorInfo",void 0),customElements.get("epp-live-sidebar")||customElements.define("epp-live-sidebar",Te);class Ee extends ct{constructor(){super(...arguments),this.sensorState={occupancy:!1,static_presence:!1,motion_presence:!1,target_presence:!1,illuminance:null,temperature:null,humidity:null,co2:null},this.targetAutoDistance=!0,this.targetMaxDistance=6,this.staticAutoDistance=!0,this.staticMinDistance=.3,this.staticMaxDistance=16,this.openAccordions=new Set,this.perspective=null,this.roomWidth=0,this.roomDepth=0,this.grid=new Uint8Array(0),this.saving=!1,this.dirty=!1,this.temperatureOffset=0,this.humidityOffset=0,this.illuminanceOffset=0,this.motionTimeout=5,this.staticTimeout=30,this.staticTriggerThreshold=3,this.staticRenewThreshold=3,this.staticOnDelay=0,this.entitiesConfig={},this.logLevels={},this.bluetoothEnabled=!1,this.co2Enabled=!1,this.ledMode="Manual Control",this.ledBrightness=1,this.ledPresenceColor="#CC33FF",this.relayTriggerMode="disabled",this.relayContactMode="no",this.targetUpdateRateMs=1e3,this.zoneUpdateRateMs=1e3,this._overrides={},this.localize=t=>t}render(){return G`
      <div class="settings-container">
        <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 500;">${this.localize("settings.title")}</h2>
        ${[{id:"reporting",label:"settings.entities",icon:"mdi:format-list-checks"},{id:"detection",label:"settings.detection_ranges",icon:"mdi:signal-distance-variant"},{id:"sensitivity",label:"settings.sensor_calibration",icon:"mdi:tune-vertical"},{id:"led_relay",label:"settings.led_and_relay",icon:"mdi:led-variant-on"},{id:"logging",label:"settings.logging",icon:"mdi:math-log"}].map(t=>{const e=this.openAccordions.has(t.id);return G`
            <div class="accordion">
              <button class="accordion-header" ?data-open=${e} @click=${()=>this.toggleAccordion(t.id)}>
                <ha-icon icon=${t.icon}></ha-icon>
                <span class="accordion-title">${this.localize(t.label)}</span>
                <ha-icon class="accordion-chevron" icon="mdi:chevron-down" ?data-open=${e}></ha-icon>
              </button>
              ${e?G`
                <div class="accordion-body">
                  ${this.renderSettingsSection(t.id)}
                </div>
              `:j}
            </div>
          `})}
        ${this.renderSaveCancelButtons()}
      </div>
    `}toggleAccordion(t){const e=this.openAccordions.has(t)?new Set:new Set([t]);this.openAccordions=e,this.dispatchEvent(new CustomEvent("accordion-toggle",{detail:e,bubbles:!0,composed:!0}))}renderSettingsSection(t){switch(t){case"detection":return this.renderDetectionRanges();case"sensitivity":return this.renderSensitivities();case"reporting":return this.renderEntities();case"led_relay":return G`${this.renderLed()}${this.renderRelay()}`;case"logging":return this.renderLogging();default:return j}}renderEnvOffset(t,e,i,s,o,r,n,a,l,c=-1/0,h=1/0){const d=this[`${i}Offset`]??0,p=null!=e?e-d:null,u=t=>Math.max(c,Math.min(h,t)),g=null!=p?u(p+d).toFixed(a):"—";return G`
      <div class="setting-row">
        <label>${t}</label>
        <span class="setting-input-unit"><input type="range" class="setting-range" data-offset-key=${i} data-precision=${a} data-display-min=${c} data-display-max=${h} min=${s} max=${o} step=${r} .value=${String(d)} @input=${t=>{const e=t.target,s=parseFloat(e.value),o=null!=p?u(p+s).toFixed(a):"—";this._setText(e.nextElementSibling,o),this._overrides[`${i}Offset`]=s,this._fireDirty()}} /><span class="setting-value">${g}</span> ${n}</span>
        ${this.resetBtn(0)}${this.infoTip(l)}
      </div>
    `}_setText(t,e){const i=document.createTreeWalker(t,NodeFilter.SHOW_TEXT).nextNode();i?i.data=e:t.textContent=e}_resetSlider(t,e,i){const s=t.querySelector(".setting-range");if(!s)return;const o=parseFloat(s.value);s.value=String(e);const r=s.nextElementSibling;if(r){const t=parseFloat(r.textContent||"");if(s.dataset.offsetKey&&!Number.isNaN(t)){const i=parseInt(s.dataset.precision??"0",10),n=parseFloat(s.dataset.displayMin??"-Infinity"),a=parseFloat(s.dataset.displayMax??"Infinity"),l=Math.max(n,Math.min(a,t-o+e));this._setText(r,l.toFixed(i)),this._overrides[`${s.dataset.offsetKey}Offset`]=e}else this._setText(r,String(e))}i&&(this._overrides[i]=e);const n=this.shadowRoot?.querySelector(".save-btn");n&&(n.disabled=!1)}resetBtn(t,e){return G`<button type="button" class="setting-info" aria-label="Reset to default" title="Reset to default" @click=${i=>{i.stopPropagation();const s=i.currentTarget.closest(".setting-row");s&&this._resetSlider(s,t,e),e?this._fireChange(e,t):this._fireDirty()}}><ha-icon icon="mdi:restart"></ha-icon></button>`}infoTip(t){return G`<button type="button" class="setting-info" aria-label="Show info" title="Show info"
      @click=${t=>{t.stopPropagation();const e=t.currentTarget,i=e.querySelector(".setting-info-tooltip");if(!i)return;const s="block"===i.style.display;if(this.shadowRoot.querySelectorAll(".setting-info-tooltip").forEach(t=>{t.style.display="none"}),s)return;const o=e.getBoundingClientRect();i.style.display="block",i.style.left=`${Math.max(8,Math.min(o.right-240,window.innerWidth-256))}px`,i.style.top=`${o.bottom+6}px`}}
    ><ha-icon icon="mdi:help-circle-outline"></ha-icon><span class="setting-info-tooltip">${t}</span></button>`}renderDetectionRanges(){const t=$e(this.roomWidth,this.roomDepth,this.perspective,this.grid),e=ke(this.grid,this.roomWidth,this.perspective),i=t>0?Math.min(t,6):6,s=t>0?Math.min(t,16):16,o=this.targetAutoDistance?i:this.targetMaxDistance,r=this.staticAutoDistance?s:this.staticMaxDistance,n="opacity: 0.5; pointer-events: none;";return G`
      <div class="settings-section">
        ${e?G`<p style="font-size: 13px; color: var(--secondary-text-color, #757575); margin: 0 0 12px;">${this.localize("settings.furthest_point")} <span style="font-weight: 700; color: var(--error-color, #db4437);">${e.furthestM}m</span></p>`:j}
        <div class="setting-group">
          <h4>${this.localize("settings.target_sensor")}</h4>
          <div class="setting-row">
            <label>${this.localize("settings.auto")}</label>
            <label class="toggle-switch">
              <input type="checkbox" .checked=${this.targetAutoDistance}
                @change=${t=>{const e=t.target.checked;e||(this._overrides.targetMaxDistance=o,this._fireChange("targetMaxDistance",o)),this._overrides.targetAutoDistance=e,this._fireChange("targetAutoDistance",e)}} />
              <span class="toggle-slider"></span>
            </label>
            ${this.infoTip(this.localize("info.target_auto_range"))}
          </div>
          <div class="setting-row" style="${this.targetAutoDistance?n:""}">
            <label>${this.localize("settings.max_distance")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" .value=${String(o)} min="0.5" max="6" step="0.1"
              @input=${t=>{const e=t.target,i=Number(e.value);this._overrides.targetMaxDistance=i,this._fireChange("targetMaxDistance",i),this._setText(e.nextElementSibling,i.toFixed(1))}} /><span class="setting-value">${o}</span><span class="setting-unit">m</span></span>
            ${this.resetBtn(i,"targetMaxDistance")}${this.infoTip(this.localize("info.target_max_distance"))}
          </div>
        </div>
        <div class="setting-group">
          <h4>${this.localize("settings.static_sensor")}</h4>
          <div class="setting-row">
            <label>${this.localize("settings.auto")}</label>
            <label class="toggle-switch">
              <input type="checkbox" .checked=${this.staticAutoDistance}
                @change=${t=>{const e=t.target.checked;e||(this._overrides.staticMinDistance=.3,this._fireChange("staticMinDistance",.3),this._overrides.staticMaxDistance=r,this._fireChange("staticMaxDistance",r)),this._overrides.staticAutoDistance=e,this._fireChange("staticAutoDistance",e)}} />
              <span class="toggle-slider"></span>
            </label>
            ${this.infoTip(this.localize("info.target_auto_range"))}
          </div>
          <div class="setting-row" style="${this.staticAutoDistance?n:""}">
            <label>${this.localize("settings.min_distance")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" .value=${String(this.staticAutoDistance?.3:this.staticMinDistance)} min="0.3" max="16" step="0.1"
              @input=${t=>{const e=t.target;let i=Number(e.value);const s=this._overrides.staticMaxDistance??this.staticMaxDistance;i>=s&&(i=Math.round(10*(s-.1))/10,e.value=String(i)),this._overrides.staticMinDistance=i,this._fireChange("staticMinDistance",i),this._setText(e.nextElementSibling,i.toFixed(1))}} /><span class="setting-value">${this.staticAutoDistance?.3:this.staticMinDistance}</span><span class="setting-unit">m</span></span>
            ${this.resetBtn(.3,"staticMinDistance")}${this.infoTip(this.localize("info.static_min_distance"))}
          </div>
          <div class="setting-row" style="${this.staticAutoDistance?n:""}">
            <label>${this.localize("settings.max_distance")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" .value=${String(r)} min="2.4" max="16" step="0.1"
              @input=${t=>{const e=t.target;let i=Number(e.value);const s=this._overrides.staticMinDistance??this.staticMinDistance;i<=s&&(i=Math.round(10*(s+.1))/10,e.value=String(i)),this._overrides.staticMaxDistance=i,this._fireChange("staticMaxDistance",i),this._setText(e.nextElementSibling,i.toFixed(1))}} /><span class="setting-value">${r}</span><span class="setting-unit">m</span></span>
            ${this.resetBtn(s,"staticMaxDistance")}${this.infoTip(this.localize("info.static_max_distance"))}
          </div>
        </div>
      </div>
    `}renderSensitivities(){return G`
      <div class="settings-section">
        <div class="setting-group">
          <h4>${this.localize("settings.motion_sensor")}</h4>
          <div class="setting-row">
            <label>${this.localize("settings.presence_timeout")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" .value=${String(this.motionTimeout)} min="0" max="120" step="1" @input=${t=>{const e=t.target;this._overrides.motionTimeout=Number(e.value),this._setText(e.nextElementSibling,e.value),this._fireDirty()}} /><span class="setting-value">${this.motionTimeout}</span><span class="setting-unit">s</span></span>
            ${this.resetBtn(5,"motionTimeout")}${this.infoTip(this.localize("info.motion_timeout"))}
          </div>
        </div>
        <div class="setting-group">
          <h4>${this.localize("settings.static_sensor")}</h4>
          <div class="setting-row">
            <label>${this.localize("settings.presence_delay")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" .value=${String(this.staticOnDelay)} min="0" max="30" step="0.5" @input=${t=>{const e=t.target;this._overrides.staticOnDelay=Number(e.value),this._setText(e.nextElementSibling,e.value),this._fireDirty()}} /><span class="setting-value">${this.staticOnDelay}</span><span class="setting-unit">s</span></span>
            ${this.resetBtn(0,"staticOnDelay")}${this.infoTip(this.localize("info.presence_delay"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("settings.presence_timeout")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" .value=${String(this.staticTimeout)} min="0" max="120" step="1" @input=${t=>{const e=t.target;this._overrides.staticTimeout=Number(e.value),this._setText(e.nextElementSibling,e.value),this._fireDirty()}} /><span class="setting-value">${this.staticTimeout}</span><span class="setting-unit">s</span></span>
            ${this.resetBtn(30,"staticTimeout")}${this.infoTip(this.localize("info.static_timeout"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("settings.trigger_threshold")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" min="0" max="9" .value=${String(this.staticTriggerThreshold)} @input=${t=>{const e=t.target;this._overrides.staticTriggerThreshold=Number(e.value),this._setText(e.nextElementSibling,e.value),this._fireDirty()}} /><span class="setting-value">${this.staticTriggerThreshold}</span><span class="setting-unit"></span></span>
            ${this.resetBtn(3,"staticTriggerThreshold")}${this.infoTip(this.localize("info.trigger_threshold"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("settings.renew_threshold")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" min="0" max="9" .value=${String(this.staticRenewThreshold)} @input=${t=>{const e=t.target;this._overrides.staticRenewThreshold=Number(e.value),this._setText(e.nextElementSibling,e.value),this._fireDirty()}} /><span class="setting-value">${this.staticRenewThreshold}</span><span class="setting-unit"></span></span>
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
    `}renderEntities(){const t=this.entitiesConfig||{},e=this._overrides.entities||{},i=(i,s)=>e[i]??t[i]??s,s=t=>{const e=t.target,i=e.dataset.entityKey;this._overrides.entities||(this._overrides.entities={}),this._overrides.entities[i]=e.checked,this._fireDirty()},o=this._overrides,r=i("zone_presence",!0)||i("zone_target_count",!1),n=i("target_xy",!1)||i("target_active",!1)||i("target_signal",!1)||i("target_zone",!1)||i("target_count",!1),a=[{value:"200",label:"5 Hz"},{value:"500",label:"2 Hz"},{value:"1000",label:"1 Hz"},{value:"2000",label:"0.5 Hz"}];return G`
      <div class="settings-section">
        <div class="setting-group">
          <h4>${this.localize("entities.room_level")}</h4>
          <div class="setting-row">
            <label>${this.localize("entities.occupancy")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${t=>{const e=t.target,i=e.dataset.entityKey;this._overrides.entities||(this._overrides.entities={}),this._overrides.entities[i]=e.checked,this._fireDirty()}} data-entity-key="room_occupancy" .checked=${i("room_occupancy",!0)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.room_occupancy"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.static_presence")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${t=>{const e=t.target,i=e.dataset.entityKey;this._overrides.entities||(this._overrides.entities={}),this._overrides.entities[i]=e.checked,this._fireDirty()}} data-entity-key="room_static_presence" .checked=${i("room_static_presence",!1)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.room_static"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.motion_presence")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${t=>{const e=t.target,i=e.dataset.entityKey;this._overrides.entities||(this._overrides.entities={}),this._overrides.entities[i]=e.checked,this._fireDirty()}} data-entity-key="room_motion_presence" .checked=${i("room_motion_presence",!1)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.room_motion"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.target_presence")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${t=>{const e=t.target,i=e.dataset.entityKey;this._overrides.entities||(this._overrides.entities={}),this._overrides.entities[i]=e.checked,this._fireDirty()}} data-entity-key="room_target_presence" .checked=${i("room_target_presence",!1)} /><span class="toggle-slider"></span></label>
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
              .options=${a}
              .disabled=${!r}
              @selected=${t=>{const e=t.detail.value;e&&(this._overrides.zoneUpdateRateMs=Number(e),this._fireDirty(),this.requestUpdate())}}
              @closed=${t=>t.stopPropagation()}>
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
              .options=${a}
              .disabled=${!n}
              @selected=${t=>{const e=t.detail.value;e&&(this._overrides.targetUpdateRateMs=Number(e),this._fireDirty(),this.requestUpdate())}}
              @closed=${t=>t.stopPropagation()}>
            </ha-select>
          </div>
        </div>
        <div class="setting-group">
          <h4>${this.localize("settings.environmental")}</h4>
          <div class="setting-row">
            <label>${this.localize("entities.illuminance")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${t=>{const e=t.target,i=e.dataset.entityKey;this._overrides.entities||(this._overrides.entities={}),this._overrides.entities[i]=e.checked,this._fireDirty()}} data-entity-key="env_illuminance" .checked=${i("env_illuminance",!1)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.illuminance"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.humidity")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${t=>{const e=t.target,i=e.dataset.entityKey;this._overrides.entities||(this._overrides.entities={}),this._overrides.entities[i]=e.checked,this._fireDirty()}} data-entity-key="env_humidity" .checked=${i("env_humidity",!1)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.humidity"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.temperature")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${t=>{const e=t.target,i=e.dataset.entityKey;this._overrides.entities||(this._overrides.entities={}),this._overrides.entities[i]=e.checked,this._fireDirty()}} data-entity-key="env_temperature" .checked=${i("env_temperature",!1)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.temperature"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.co2")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${t=>{const e=t.target,i=e.dataset.entityKey;this._overrides.entities||(this._overrides.entities={}),this._overrides.entities[i]=e.checked,this._fireDirty()}} data-entity-key="env_co2" .checked=${i("env_co2",!1)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.co2"))}
          </div>
        </div>
      </div>
    `}renderLogging(){const t=["None","Error","Warning","Info","Debug"],e=[{key:"system",label:"settings.log_system",tip:"info.log_system",show:!0},{key:"epp",label:"settings.log_epp",tip:"info.log_epp",show:!0},{key:"led",label:"settings.log_led",tip:"info.log_led",show:!0},{key:"networking",label:"settings.log_networking",tip:"info.log_networking",show:!0},{key:"ble",label:"settings.log_ble",tip:"info.log_ble",show:this.bluetoothEnabled},{key:"co2",label:"settings.log_co2",tip:"info.log_co2",show:this.co2Enabled}];return G`
      <div class="settings-section">
        <div class="setting-group">
          ${e.filter(t=>t.show).map(e=>{const i=(this._overrides.logLevels||{})[e.key]??this.logLevels[e.key]??"None";return G`
              <div class="setting-row">
                <label>${this.localize(e.label)}</label>
                <ha-select
                  .value=${i}
                  .options=${t.map(t=>({value:t,label:t}))}
                  @selected=${t=>{const s=t.detail.value;s&&s!==i&&(this._overrides.logLevels||(this._overrides.logLevels={}),this._overrides.logLevels[e.key]=s,this._fireDirty(),this.requestUpdate())}}
                  @closed=${t=>t.stopPropagation()}
                ></ha-select>
                <button type="button" class="setting-info" aria-label="Reset to default" title="Reset to default" @click=${t=>{t.stopPropagation(),this._overrides.logLevels||(this._overrides.logLevels={}),this._overrides.logLevels[e.key]="None",this._fireDirty(),this.requestUpdate()}}><ha-icon icon="mdi:restart"></ha-icon></button>
                ${this.infoTip(this.localize(e.tip))}
              </div>
            `})}
        </div>
      </div>
    `}renderLed(){const t=this._overrides.ledMode??this.ledMode,e="Manual Control"!==t,i="Presence"===t||"Environmental + Presence"===t,s=[{value:"Manual Control",label:this.localize("settings.manual_control")},{value:"Presence",label:this.localize("settings.presence")}];this.co2Enabled&&s.push({value:"Environmental",label:this.localize("settings.environmental")},{value:"Environmental + Presence",label:this.localize("settings.environmental_presence")});const o=this._overrides.ledBrightness??this.ledBrightness,r=this._overrides.ledPresenceColor??this.ledPresenceColor;return G`
      <div class="settings-section">
        <div class="setting-group">
          <h4>${this.localize("settings.led")}</h4>
          <div class="setting-row">
            <label>${this.localize("settings.led_mode")}</label>
            <ha-select class="wide-select" .value=${t} .options=${s} @selected=${t=>{const e=t.detail.value;e&&(this._overrides.ledMode=e,this._fireDirty(),this.requestUpdate())}} @closed=${t=>t.stopPropagation()}>
            </ha-select>
            ${this.infoTip(this.localize("info.led_mode"))}
          </div>
          ${e?G`
          <div class="setting-row">
            <label>${this.localize("settings.led_brightness")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" data-led-brightness min="0.1" max="1" step="0.05" .value=${String(o)} @input=${t=>{const e=t.target;this._overrides.ledBrightness=parseFloat(e.value),this._setText(e.nextElementSibling,Math.round(100*parseFloat(e.value))+"%"),this._fireDirty()}} /><span class="setting-value">${Math.round(100*o)}%</span></span>
            ${this.resetBtn(1,"ledBrightness")}${this.infoTip(this.localize("info.led_brightness"))}
          </div>`:j}
          ${i?G`
          <div class="setting-row">
            <label>${this.localize("settings.led_presence_color")}</label>
            <input type="color" .value=${r} @input=${t=>{this._overrides.ledPresenceColor=t.target.value,this._fireDirty()}} />
            ${this.infoTip(this.localize("info.led_presence_color"))}
          </div>`:j}
        </div>
      </div>
    `}renderRelay(){const t=[{value:"disabled",label:this.localize("settings.relay_disabled")},{value:"motion",label:this.localize("settings.relay_motion")},{value:"presence",label:this.localize("settings.relay_presence")},{value:"occupancy",label:this.localize("settings.relay_occupancy")}],e=[{value:"no",label:this.localize("settings.relay_normally_open")},{value:"nc",label:this.localize("settings.relay_normally_closed")}],i=this._overrides.relayTriggerMode??this.relayTriggerMode,s=this._overrides.relayContactMode??this.relayContactMode,o="disabled"!==i;return G`
      <div class="settings-section">
        <div class="setting-group">
          <h4>${this.localize("settings.relay")}</h4>
          <div class="setting-row">
            <label>${this.localize("settings.relay_trigger_mode")}</label>
            <ha-select class="wide-select"
              .value=${i}
              .options=${t}
              @selected=${t=>{const e=t.detail.value;e&&e!==i&&(this._overrides.relayTriggerMode=e,this._fireChange("relayTriggerMode",e),this.requestUpdate())}}
              @closed=${t=>t.stopPropagation()}
            ></ha-select>
          </div>
          ${o?G`
            <div class="setting-row">
              <label>${this.localize("settings.relay_contact_mode")}</label>
              <ha-select class="wide-select"
                .value=${s}
                .options=${e}
                @selected=${t=>{const e=t.detail.value;e&&e!==s&&(this._overrides.relayContactMode=e,this._fireChange("relayContactMode",e),this.requestUpdate())}}
                @closed=${t=>t.stopPropagation()}
              ></ha-select>
            </div>
          `:j}
        </div>
      </div>
    `}renderSaveCancelButtons(){return G`
      <div class="save-cancel-bar">
        <button class="wizard-btn wizard-btn-back"
          @click=${()=>{this.dispatchEvent(new CustomEvent("cancel",{bubbles:!0,composed:!0}))}}
        >${this.localize("common.cancel")}</button>
        <button class="wizard-btn wizard-btn-primary save-btn"
          ?disabled=${this.saving||!this.dirty}
          @click=${()=>{this._emitSave()}}
        >${this.saving?this.localize("common.saving"):this.localize("common.save")}</button>
      </div>
    `}_emitSave(){const t=this._overrides,e={...this.entitiesConfig,...t.entities||{}},i=t.targetAutoDistance??this.targetAutoDistance,s=t.staticAutoDistance??this.staticAutoDistance;let o=t.targetMaxDistance??this.targetMaxDistance,r=t.staticMinDistance??this.staticMinDistance,n=t.staticMaxDistance??this.staticMaxDistance;if(i||s){const t=$e(this.roomWidth,this.roomDepth,this.perspective,this.grid);i&&(o=t>0?Math.min(t,6):6),s&&(r=.3,n=t>0?Math.min(t,16):16)}this.dispatchEvent(new CustomEvent("save",{detail:{target_auto_distance:i,target_max_distance:o,static_auto_distance:s,static_min_distance:r,static_max_distance:n,motion_timeout:t.motionTimeout??this.motionTimeout,static_timeout:t.staticTimeout??this.staticTimeout,static_trigger_threshold:t.staticTriggerThreshold??this.staticTriggerThreshold,static_renew_threshold:t.staticRenewThreshold??this.staticRenewThreshold,static_on_delay:t.staticOnDelay??this.staticOnDelay,temperature_offset:t.temperatureOffset??this.temperatureOffset,humidity_offset:t.humidityOffset??this.humidityOffset,illuminance_offset:t.illuminanceOffset??this.illuminanceOffset,entities:e,log_levels:{...this.logLevels,...t.logLevels||{}},led_mode:t.ledMode??this.ledMode,led_brightness:t.ledBrightness??this.ledBrightness,led_presence_color:t.ledPresenceColor??this.ledPresenceColor,relay_trigger_mode:t.relayTriggerMode??this.relayTriggerMode,relay_contact_mode:t.relayContactMode??this.relayContactMode,target_update_rate_ms:t.targetUpdateRateMs??this.targetUpdateRateMs,zone_update_rate_ms:t.zoneUpdateRateMs??this.zoneUpdateRateMs},bubbles:!0,composed:!0}))}_fireChange(t,e){this.dispatchEvent(new CustomEvent("setting-change",{detail:{key:t,value:e},bubbles:!0,composed:!0})),this._fireDirty()}_fireDirty(){const t=this.shadowRoot?.querySelector(".save-btn");t&&(t.disabled=!1),this.dispatchEvent(new CustomEvent("dirty",{bubbles:!0,composed:!0}))}}Ee.styles=[yt,bt,xt,wt,kt,n`
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
    `],t([gt({attribute:!1})],Ee.prototype,"sensorState",void 0),t([gt({type:Boolean})],Ee.prototype,"targetAutoDistance",void 0),t([gt({type:Number})],Ee.prototype,"targetMaxDistance",void 0),t([gt({type:Boolean})],Ee.prototype,"staticAutoDistance",void 0),t([gt({type:Number})],Ee.prototype,"staticMinDistance",void 0),t([gt({type:Number})],Ee.prototype,"staticMaxDistance",void 0),t([gt({attribute:!1})],Ee.prototype,"openAccordions",void 0),t([gt({attribute:!1})],Ee.prototype,"perspective",void 0),t([gt({type:Number})],Ee.prototype,"roomWidth",void 0),t([gt({type:Number})],Ee.prototype,"roomDepth",void 0),t([gt({attribute:!1})],Ee.prototype,"grid",void 0),t([gt({type:Boolean})],Ee.prototype,"saving",void 0),t([gt({type:Boolean})],Ee.prototype,"dirty",void 0),t([gt({type:Number})],Ee.prototype,"temperatureOffset",void 0),t([gt({type:Number})],Ee.prototype,"humidityOffset",void 0),t([gt({type:Number})],Ee.prototype,"illuminanceOffset",void 0),t([gt({type:Number})],Ee.prototype,"motionTimeout",void 0),t([gt({type:Number})],Ee.prototype,"staticTimeout",void 0),t([gt({type:Number})],Ee.prototype,"staticTriggerThreshold",void 0),t([gt({type:Number})],Ee.prototype,"staticRenewThreshold",void 0),t([gt({type:Number})],Ee.prototype,"staticOnDelay",void 0),t([gt({attribute:!1})],Ee.prototype,"entitiesConfig",void 0),t([gt({attribute:!1})],Ee.prototype,"logLevels",void 0),t([gt({type:Boolean})],Ee.prototype,"bluetoothEnabled",void 0),t([gt({type:Boolean})],Ee.prototype,"co2Enabled",void 0),t([gt({type:String})],Ee.prototype,"ledMode",void 0),t([gt({type:Number})],Ee.prototype,"ledBrightness",void 0),t([gt({type:String})],Ee.prototype,"ledPresenceColor",void 0),t([gt({type:String})],Ee.prototype,"relayTriggerMode",void 0),t([gt({type:String})],Ee.prototype,"relayContactMode",void 0),t([gt({type:Number})],Ee.prototype,"targetUpdateRateMs",void 0),t([gt({type:Number})],Ee.prototype,"zoneUpdateRateMs",void 0),t([gt({attribute:!1})],Ee.prototype,"localize",void 0),customElements.get("epp-settings-view")||customElements.define("epp-settings-view",Ee);class Me extends ct{constructor(){super(...arguments),this.selectedMac="",this.rawTargets=[],this.sensorState={occupancy:!1},this.devices=[],this.localize=t=>t,this.initialRoomWidth=0,this.initialRoomDepth=0,this.mode="wizard",this._setupStep="guide",this._wizardSaving=!1,this._wizardCornerIndex=0,this._wizardCorners=[null,null,null,null],this._wizardRoomWidth=0,this._wizardRoomDepth=0,this._wizardCapturing=!1,this._wizardCaptureProgress=0,this._wizardCapturePaused=!1,this._wizardOffsetSide="",this._wizardOffsetFb="",this._wizardCaptureCancelled=!1,this._smoothBuffer=[],this._perspective=null}connectedCallback(){super.connectedCallback(),this._wizardRoomWidth=this.initialRoomWidth,this._wizardRoomDepth=this.initialRoomDepth}_syncCornerOffsets(){const t=this._wizardCorners[this._wizardCornerIndex];this._wizardOffsetSide=t?.offset_side?String(t.offset_side/10):"",this._wizardOffsetFb=t?.offset_fb?String(t.offset_fb/10):""}_getSmoothedRaw(){const t=this.rawTargets.find(t=>null!=t.raw_x&&null!=t.raw_y);if(!t)return null;const e=function(t,e,i,s){const o=[...t,{x:e,y:i,t:s}];let r=0;for(;r<o.length&&s-o[r].t>1e3;)r++;const n=o.slice(r);if(0===n.length)return{x:e,y:i,buffer:n};const a=t=>{const e=t.slice().sort((t,e)=>t-e),i=Math.floor(e.length/2);return e.length%2?e[i]:(e[i-1]+e[i])/2};return{x:a(n.map(t=>t.x)),y:a(n.map(t=>t.y)),buffer:n}}(this._smoothBuffer,t.raw_x,t.raw_y,Date.now());return this._smoothBuffer=e.buffer,{x:e.x,y:e.y}}_wizardCancelCapture(){this._wizardCaptureCancelled=!0,this._wizardCapturing=!1,this._wizardCapturePaused=!1}_wizardStartCapture(){const t=this.rawTargets.find(t=>null!=t.raw_x&&null!=t.raw_y);if(!t)return;this._wizardCapturing=!0,this._wizardCaptureProgress=0,this._wizardCapturePaused=!1,this._wizardCaptureCancelled=!1;const e=[];let i=0,s=Date.now();const o=()=>{if(this._wizardCaptureCancelled)return;const t=Date.now(),r=t-s;s=t;const n=this.rawTargets.filter(t=>null!=t.raw_x&&null!=t.raw_y),a=1===n.length;if(this._wizardCapturePaused=!a,a&&(i+=r,e.push({x:n[0].raw_x,y:n[0].raw_y})),this._wizardCaptureProgress=Math.min(i/5e3,1),i<5e3)return void requestAnimationFrame(o);if(this._wizardCapturing=!1,this._wizardCapturePaused=!1,0===e.length)return;const l=function(t){return 0===t.length?null:{x:ze(t.map(t=>t.x)),y:ze(t.map(t=>t.y))}}(e);if(!l)return;const c=this._wizardCornerIndex;this._wizardCorners=[...this._wizardCorners],this._wizardCorners[c]={raw_x:l.x,raw_y:l.y,offset_side:10*(parseFloat(this._wizardOffsetSide)||0),offset_fb:10*(parseFloat(this._wizardOffsetFb)||0)},c<3&&(this._wizardCornerIndex=c+1),this._syncCornerOffsets(),this._wizardCorners.every(t=>null!==t)&&this._autoComputeRoomDimensions()};requestAnimationFrame(o)}_autoComputeRoomDimensions(){const t=function(t){const e=(t,e)=>Math.sqrt((t.raw_x-e.raw_x)**2+(t.raw_y-e.raw_y)**2),i=Math.round(e(t[0],t[1])),s=e(t[0],t[3]),o=e(t[1],t[2]);return{width:i,depth:Math.round((s+o)/2)}}(this._wizardCorners);this._wizardRoomWidth=t.width,this._wizardRoomDepth=t.depth}_solvePerspective(t,e){return function(t,e){const i=[],s=[];for(let o=0;o<4;o++){const r=t[o].x,n=t[o].y,a=e[o].x,l=e[o].y;i.push([r,n,1,0,0,0,-r*a,-n*a]),s.push(a),i.push([0,0,0,r,n,1,-r*l,-n*l]),s.push(l)}const o=i.map((t,e)=>[...t,s[e]]);for(let t=0;t<8;t++){let e=Math.abs(o[t][t]),i=t;for(let s=t+1;s<8;s++)Math.abs(o[s][t])>e&&(e=Math.abs(o[s][t]),i=s);if(e<1e-12)return null;[o[t],o[i]]=[o[i],o[t]];for(let e=t+1;e<8;e++){const i=o[e][t]/o[t][t];for(let s=t;s<=8;s++)o[e][s]-=i*o[t][s]}}const r=new Array(8);for(let t=7;t>=0;t--){r[t]=o[t][8];for(let e=t+1;e<8;e++)r[t]-=o[t][e]*r[e];r[t]/=o[t][t]}return r}(t,e)}_computeWizardPerspective(){const t=this._wizardCorners;if(!t.every(t=>null!==t))return;const e=this._wizardRoomWidth,i=this._wizardRoomDepth,s=t.map(t=>({x:t.raw_x,y:t.raw_y})),o=[{x:t[0].offset_side,y:t[0].offset_fb},{x:e-t[1].offset_side,y:t[1].offset_fb},{x:e-t[2].offset_side,y:i-t[2].offset_fb},{x:t[3].offset_side,y:i-t[3].offset_fb}];this._perspective=this._solvePerspective(s,o)}async _wizardFinish(){if(this._perspective){this._wizardSaving=!0;try{await this.hass.callWS({type:"eppgrid/set_setup",mac:this.selectedMac,perspective:this._perspective,room_width:this._wizardRoomWidth,room_depth:this._wizardRoomDepth}),this.dispatchEvent(new CustomEvent("calibration-complete",{detail:{perspective:this._perspective,roomWidth:this._wizardRoomWidth,roomDepth:this._wizardRoomDepth},bubbles:!0,composed:!0}))}finally{this._wizardSaving=!1}}}_rawToFovPct(t,e){return function(t,e){return{xPct:(t+ge)/(2*ge)*100,yPct:e/Gt*100}}(t,e)}_getWizardTargetStyle(t){const{xPct:e,yPct:i}=this._rawToFovPct(t.raw_x??0,t.raw_y??0);return`left: ${e}%; top: ${i}%;`}render(){switch(this.mode){case"uncalibrated-fov":return this._renderUncalibratedFov();case"needs-calibration":return this._renderNeedsCalibration();default:return null===this._setupStep?j:this._renderWizard()}}_renderHeader(){return G`
      <div class="panel-header">
        <ha-select
          .value=${this.selectedMac}
          .disabled=${!0}
          .options=${this.devices.map(t=>({value:t.mac,label:t.name}))}
        ></ha-select>
      </div>
    `}_renderWizard(){let t;switch(this._setupStep){case"guide":t=this._renderWizardGuide();break;case"corners":t=this._renderWizardCorners()}return G`
      <div class="wizard-container">
        ${this._renderHeader()} ${t}
        ${this._wizardCapturing?G`
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
        `:j}
      </div>
    `}_renderWizardGuide(){const t=(t,e,i=!1,s=0)=>Z`
      <g transform="translate(${t}, ${e}) rotate(${s}) scale(${i?-.7:.7}, 0.7)">
        <circle cx="0" cy="-12" r="4" fill="var(--primary-color, #03a9f4)"/>
        <line x1="0" y1="-8" x2="0" y2="2" stroke="var(--primary-color, #03a9f4)" stroke-width="2" stroke-linecap="round"/>
        <line x1="0" y1="2" x2="-4" y2="10" stroke="var(--primary-color, #03a9f4)" stroke-width="2" stroke-linecap="round"/>
        <line x1="0" y1="2" x2="4" y2="10" stroke="var(--primary-color, #03a9f4)" stroke-width="2" stroke-linecap="round"/>
        <line x1="0" y1="-4" x2="-5" y2="2" stroke="var(--primary-color, #03a9f4)" stroke-width="2" stroke-linecap="round"/>
        <line x1="0" y1="-4" x2="5" y2="-1" stroke="var(--primary-color, #03a9f4)" stroke-width="2" stroke-linecap="round"/>
      </g>
    `,e=(t,e,i,s)=>{const o=i-t,r=s-e,n=Math.sqrt(o*o+r*r),a=o/n,l=r/n,c=i-40*a,h=s-40*l;return Z`
        <line x1="${t+40*a}" y1="${e+40*l}" x2="${c}" y2="${h}" stroke="var(--primary-color, #03a9f4)" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
        <polygon points="${c},${h} ${c-8*a+4*l},${h-8*l-4*a} ${c-8*a-4*l},${h-8*l+4*a}" fill="var(--primary-color, #03a9f4)" opacity="0.5"/>
      `},i=50,s=55,o=290,r=55,n=290,a=225,l=50,c=235,h=98,d=225,p=Z`
      <svg viewBox="0 0 360 290" width="360" height="290" style="display: block; margin: 0 auto;">
        <!-- Room with rounded corners, soft fill -->
        <rect x="30" y="35" width="280" height="210" rx="8"
              fill="var(--secondary-background-color, #f5f5f5)"
              stroke="var(--divider-color, #d0d0d0)" stroke-width="2.5"/>

        <!-- Wall labels -->
        <text x="170" y="28" font-size="9" fill="var(--secondary-text-color, #aaa)" text-anchor="middle">${this.localize("wizard.front_wall_label")}</text>
        <text x="170" y="262" font-size="9" fill="var(--secondary-text-color, #aaa)" text-anchor="middle">${this.localize("wizard.back_wall_label")}</text>

        <!-- Arrows with walking figures: 1->2->3->4 -->
        ${e(i,s,o,r)}
        ${t(170,72)}
        ${e(o,r,n,a)}
        ${t(265,145,!1,90)}
        <!-- 3rd arrow flat from 3 to 4 badge, same gap as arrow 1 has from 2 -->
        ${e(n,a,h-15,a)}
        ${t(190,a-17,!0)}

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
        <circle cx="${n}" cy="${a}" r="14" fill="#4CAF50" opacity="0.15"/>
        <circle cx="${n}" cy="${a}" r="14" fill="none" stroke="#4CAF50" stroke-width="2.5"/>
        <text x="${n}" y="${a+5}" font-size="14" fill="#4CAF50" font-weight="bold" text-anchor="middle">3</text>

        <!-- Sensor icon outside the top-right corner -->
        <g transform="translate(${o+18}, ${r-18}) rotate(-45)">
          <rect x="-5" y="-7" width="10" height="14" rx="3" fill="var(--primary-color, #03a9f4)"/>
          <circle cx="0" cy="-11" r="3.5" fill="var(--primary-color, #03a9f4)" opacity="0.4"/>
        </g>
        <text x="${o+24}" y="${r-24}" font-size="10" fill="var(--primary-color, #03a9f4)" font-weight="500">${this.localize("wizard.sensor")}</text>
      </svg>
    `;return G`
      <div style="max-width: 560px; margin: 0 auto;">
        <div class="setting-group">
          <h4 style="text-align: center; margin-bottom: 16px;">${this.localize("wizard.how_calibration_works")}</h4>

          ${p}

          <div style="display: flex; flex-direction: column; gap: 14px; padding: 16px 4px 0;">
            <div style="display: flex; align-items: flex-start; gap: 10px;">
              <div style="min-width: 22px; height: 22px; border-radius: 50%; background: #4CAF50; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; color: white;">1</div>
              <div style="font-size: 13px;">
                ${Lt(this.localize("wizard.walk_instruction_full"))}
              </div>
            </div>

            <div style="display: flex; align-items: flex-start; gap: 10px;">
              <div style="min-width: 22px; height: 22px; border-radius: 50%; background: #FF9800; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; color: white;">!</div>
              <div style="font-size: 13px;">
                ${Lt(this.localize("wizard.cant_reach"))}
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
    `}_renderWizardCorners(){const t=this._wizardCornerIndex,e=this.rawTargets.filter(t=>null!=t.raw_x&&null!=t.raw_y),i=e.length>0,s=e.length>1,o=this._wizardCorners.every(t=>null!==t),r=ie[t]||"",[n,a]=se[t]||["",""];return G`
      <div class="wizard-card">
        <h2>${this.localize("wizard.calibrate_room_size")}</h2>
        <p>
          ${this.localize("wizard.walk_instruction",{duration:5})}
        </p>

        ${o?j:G`
            <p class="corner-instruction">
              ${this.localize("wizard.corner_step",{index:t+1,corner:this.localize(r)})}
            </p>
        `}

        <div class="corner-progress">
          ${ie.map((e,i)=>{const s=!!this._wizardCorners[i],o=i<3,r=i<t;return G`
                <span
                  class="corner-chip ${s?"done":""} ${i===t?"active":""}"
                  @click=${()=>{const t=this._wizardCorners[i];this._wizardCornerIndex=i,this._wizardCorners=[...this._wizardCorners],this._wizardCorners[i]=null,this._wizardOffsetSide=t?.offset_side?String(t.offset_side/10):"",this._wizardOffsetFb=t?.offset_fb?String(t.offset_fb/10):""}}
                >
                  ${this.localize(e)} ${s?"✓":""}
                </span>
                ${o?G`
                  <span class="corner-arrow ${r?"done":""}">›</span>
                `:j}
              `})}
        </div>

        <div class="corner-offsets" key="${t}">
          <span class="offset-label">${this.localize("wizard.distance_from")}</span>
          <input
            type="number"
            class="offset-input"
            min="0"
            step="1"
            placeholder="${this.localize("wizard.distance_from_side",{wall:this.localize(n)})}"
            .value=${this._wizardOffsetSide}
            @input=${e=>{this._wizardOffsetSide=e.target.value;const i=10*(parseFloat(this._wizardOffsetSide)||0),s=this._wizardCorners[t];s&&(s.offset_side=i)}}
          />
          <input
            type="number"
            class="offset-input"
            min="0"
            step="1"
            placeholder="${this.localize("wizard.distance_from_side",{wall:this.localize(a)})}"
            .value=${this._wizardOffsetFb}
            @input=${e=>{this._wizardOffsetFb=e.target.value;const i=10*(parseFloat(this._wizardOffsetFb)||0),s=this._wizardCorners[t];s&&(s.offset_fb=i)}}
          />
        </div>

        ${this._renderMiniSensorView()}

        ${o?G`
          <p style="font-size: 13px; color: var(--secondary-text-color); margin: 12px 0 4px;">
            ${this.localize("wizard.save_prompt")}
          </p>
        `:G`
          <p class="no-target-warning" style="visibility: ${!i||s?"visible":"hidden"};">
            ${i?this.localize("wizard.multiple_targets"):this.localize("wizard.no_target")}
          </p>
        `}

        <div class="wizard-actions">
          <button
            class="wizard-btn wizard-btn-back"
            @click=${()=>{this._fireCancel()}}
          >${this.localize("common.cancel")}</button>
          ${o?G`
            <button
              class="wizard-btn wizard-btn-primary"
              ?disabled=${this._wizardSaving}
              @click=${()=>{this._computeWizardPerspective(),this._wizardFinish()}}
            >
              ${this._wizardSaving?this.localize("common.saving"):this.localize("common.save")}
            </button>
          `:G`
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
    `}_renderMiniSensorView(){const t=ae,e=Gt,i=200,s=-t,o=e*Math.cos(ne),r=`M 0 0 L ${s} ${o} A 6000 6000 0 0 0 ${t} ${o} Z`,n=[2e3,4e3].map(t=>{const e=t*Math.sin(ne),i=t*Math.cos(ne);return`M ${-e} ${i} A ${t} ${t} 0 0 0 ${e} ${i}`});return G`
      <div class="mini-grid-container">
        <div class="sensor-fov-view">
          <svg
            class="sensor-fov-svg"
            viewBox="${-t-i} ${-200} ${2*t+400} ${6400}"
            preserveAspectRatio="xMidYMid meet"
          >
            <path
              d="${r}"
              fill="rgba(3, 169, 244, 0.10)"
              stroke="rgba(3, 169, 244, 0.3)"
              stroke-width="30"
            />
            ${n.map(t=>Z`
                <path
                  d="${t}"
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
          ${this._wizardCorners.filter(t=>null!==t).map((t,e)=>{const{xPct:i,yPct:s}=this._rawToFovPct(t.raw_x,t.raw_y);return G`
                <div
                  class="mini-grid-captured"
                  style="left: ${i}%; top: ${s}%;"
                  title="${this.localize(ie[e])}"
                ></div>
              `})}
          <!-- Live targets (per-target colors) -->
          ${this.rawTargets.map((t,e)=>null!=t.raw_x&&null!=t.raw_y?G`
              <div
                class="mini-grid-target"
                style="${this._getWizardTargetStyle(t)} background: ${oe[e]||oe[0]};"
              ></div>
            `:j)}
        </div>
      </div>
    `}_renderUncalibratedFov(){const t=this.sensorState.occupancy,e=t?"#4CAF50":"var(--primary-color, #03a9f4)",i=160,s=14,o=180,r=30*Math.PI/180,n=150*Math.PI/180,a=i+o*Math.cos(r),l=s+o*Math.sin(r),c=i+o*Math.cos(n),h=s+o*Math.sin(n);return G`
      <div style="display: flex; flex-direction: column; align-items: center; padding: 24px;">
        <svg viewBox="0 0 320 210" width="320" height="210" style="display: block;">
          <!-- Sensor at top center -->
          <rect x="${154}" y="0" width="12" height="8" rx="3" fill="${e}"/>
          <circle cx="${i}" cy="0" r="4" fill="${e}" opacity="0.4"/>

          <!-- 120 deg FOV wedge with rounded arc end -->
          <path d="M ${i} ${s} L ${a} ${l} A ${o} ${o} 0 0 1 ${c} ${h} Z"
                fill="${e}" fill-opacity="${t?.15:.06}"
                stroke="${e}" stroke-width="1" stroke-opacity="0.2"/>

          <!-- Range arcs -->
          ${[60,120,180].map(t=>{const o=i+t*Math.cos(r),a=s+t*Math.sin(r),l=i+t*Math.cos(n),c=s+t*Math.sin(n);return Z`
              <path d="M ${o} ${a} A ${t} ${t} 0 0 1 ${l} ${c}"
                    fill="none" stroke="${e}" stroke-width="1"
                    stroke-dasharray="4 3" opacity="0.2"/>
            `})}

          <!-- Edge lines -->
          <line x1="${i}" y1="${s}" x2="${a}" y2="${l}" stroke="${e}" stroke-width="0.5" opacity="0.2"/>
          <line x1="${i}" y1="${s}" x2="${c}" y2="${h}" stroke="${e}" stroke-width="0.5" opacity="0.2"/>

          <!-- Target dots -->
          ${this.rawTargets.map((t,e)=>{if(null==t.raw_x||null==t.raw_y)return j;const r=Math.sqrt(t.raw_x*t.raw_x+t.raw_y*t.raw_y),n=Math.atan2(t.raw_x,t.raw_y),a=Math.min(r/6e3,1)*o,l=Math.PI/2-n,c=i+a*Math.cos(l),h=s+a*Math.sin(l);return Z`<circle cx="${c}" cy="${h}" r="5" fill="${oe[e]||oe[0]}"/>`})}

          ${t?Z`
            <text x="${i}" y="120" font-size="13" fill="${e}" text-anchor="middle" font-weight="500">${this.localize("live.detected")}</text>
          `:Z`
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
    `}_renderNeedsCalibration(){const t=Z`
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
    `,e=(()=>{const t=28,e=28,i=180,s=-15*Math.PI/180,o=105*Math.PI/180,r=t+i*Math.cos(s),n=e+i*Math.sin(s),a=t+i*Math.cos(o),l=e+i*Math.sin(o),c=(i,r)=>{const n=t+i*Math.cos(s),a=e+i*Math.sin(s),l=t+i*Math.cos(o),c=e+i*Math.sin(o),h=45*Math.PI/180,d=t+(i-10)*Math.cos(h),p=e+(i-10)*Math.sin(h);return Z`
          <path d="M ${n} ${a} A ${i} ${i} 0 0 1 ${l} ${c}"
                fill="none" stroke="var(--primary-color, #03a9f4)" stroke-width="1"
                stroke-dasharray="4 3" opacity="0.35" clip-path="url(#room-clip)"/>
          <text x="${d}" y="${p}" font-size="8" fill="var(--secondary-text-color, #aaa)"
                text-anchor="middle" clip-path="url(#room-clip)">${r}</text>
        `};return Z`
        <svg viewBox="0 0 200 160" width="200" height="160" style="display: block;">
          <defs>
            <clipPath id="room-clip"><rect x="20" y="20" width="160" height="120"/></clipPath>
          </defs>
          <!-- Room outline -->
          <rect x="20" y="20" width="160" height="120" fill="none" stroke="var(--divider-color, #ccc)" stroke-width="2" rx="2"/>
          <!-- 120 deg FOV wedge clipped to room -->
          <path d="M ${t} ${e} L ${a} ${l} A ${i} ${i} 0 0 0 ${r} ${n} Z"
                fill="var(--primary-color, #03a9f4)" opacity="0.08"
                clip-path="url(#room-clip)"/>
          <!-- Cone edge lines -->
          <line x1="${t}" y1="${e}" x2="${r}" y2="${n}" stroke="var(--primary-color, #03a9f4)" stroke-width="0.5" opacity="0.3" clip-path="url(#room-clip)"/>
          <line x1="${t}" y1="${e}" x2="${a}" y2="${l}" stroke="var(--primary-color, #03a9f4)" stroke-width="0.5" opacity="0.3" clip-path="url(#room-clip)"/>
          <!-- Range arcs -->
          ${c(60,"2m")}
          ${c(120,"4m")}
          ${c(180,"")}
          <!-- Sensor dot -->
          <circle cx="${t}" cy="${e}" r="6" fill="var(--primary-color, #03a9f4)"/>
          <!-- Labels -->
          <text x="30" y="16" font-size="10" fill="var(--primary-color, #03a9f4)">${this.localize("wizard.sensor")}</text>
          <text x="152" y="136" font-size="8" fill="var(--secondary-text-color, #aaa)" text-anchor="end">6m</text>
        </svg>
      `})(),i=Z`
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
    `;return G`
      <div style="max-width: 560px; margin: 0 auto; padding: 0 24px;">
        <div class="setting-group">
          <h4>${this.localize("wizard.how_to_position")}</h4>
          <div style="display: flex; flex-direction: column; gap: 20px; padding: 8px 0;">

            <div style="display: flex; align-items: center; gap: 16px;">
              <div style="flex-shrink: 0;">${t}</div>
              <div>
                <div style="font-weight: 500; margin-bottom: 4px;">${this.localize("wizard.mount_height")}</div>
                <div style="font-size: 13px; color: var(--secondary-text-color, #757575);">
                  ${Lt(this.localize("wizard.mount_height_desc"))}
                </div>
              </div>
            </div>

            <hr style="border: none; border-top: 1px solid var(--divider-color, #eee); margin: 0;"/>

            <div style="display: flex; align-items: center; gap: 16px;">
              <div style="flex-shrink: 0;">${e}</div>
              <div>
                <div style="font-weight: 500; margin-bottom: 4px;">${this.localize("wizard.placement")}</div>
                <div style="font-size: 13px; color: var(--secondary-text-color, #757575);">
                  ${Lt(this.localize("wizard.placement_desc"))}
                </div>
              </div>
            </div>

            <hr style="border: none; border-top: 1px solid var(--divider-color, #eee); margin: 0;"/>

            <div style="display: flex; align-items: center; gap: 16px;">
              <div style="flex-shrink: 0;">${i}</div>
              <div>
                <div style="font-weight: 500; margin-bottom: 4px;">${this.localize("wizard.beam_direction")}</div>
                <div style="font-size: 13px; color: var(--secondary-text-color, #757575);">
                  ${Lt(this.localize("wizard.beam_direction_desc"))}
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
    `}_fireStartCalibration(){this.dispatchEvent(new CustomEvent("start-calibration",{bubbles:!0,composed:!0}))}_fireCancel(){this._setupStep=null,this._wizardCorners=[null,null,null,null],this._wizardCornerIndex=0,this._wizardOffsetSide="",this._wizardOffsetFb="",this.dispatchEvent(new CustomEvent("wizard-cancel",{bubbles:!0,composed:!0}))}}Me.styles=[bt,zt,xt,n`
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
    `],t([gt({attribute:!1})],Me.prototype,"hass",void 0),t([gt({type:String})],Me.prototype,"selectedMac",void 0),t([gt({attribute:!1})],Me.prototype,"rawTargets",void 0),t([gt({attribute:!1})],Me.prototype,"sensorState",void 0),t([gt({attribute:!1})],Me.prototype,"devices",void 0),t([gt({attribute:!1})],Me.prototype,"localize",void 0),t([gt({type:Number})],Me.prototype,"initialRoomWidth",void 0),t([gt({type:Number})],Me.prototype,"initialRoomDepth",void 0),t([gt({type:String})],Me.prototype,"mode",void 0),t([ft()],Me.prototype,"_setupStep",void 0),t([ft()],Me.prototype,"_wizardSaving",void 0),t([ft()],Me.prototype,"_wizardCornerIndex",void 0),t([ft()],Me.prototype,"_wizardCorners",void 0),t([ft()],Me.prototype,"_wizardRoomWidth",void 0),t([ft()],Me.prototype,"_wizardRoomDepth",void 0),t([ft()],Me.prototype,"_wizardCapturing",void 0),t([ft()],Me.prototype,"_wizardCaptureProgress",void 0),t([ft()],Me.prototype,"_wizardCapturePaused",void 0),t([ft()],Me.prototype,"_wizardOffsetSide",void 0),t([ft()],Me.prototype,"_wizardOffsetFb",void 0),customElements.get("epp-wizard")||customElements.define("epp-wizard",Me);class Se extends ct{constructor(){super(...arguments),this.overlayMode=null,this.localize=t=>t}render(){return G`
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
		`}}Se.styles=n`
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

	`,t([gt({attribute:!1})],Se.prototype,"overlayMode",void 0),t([gt({attribute:!1})],Se.prototype,"localize",void 0),customElements.get("epp-overlay-sidebar")||customElements.define("epp-overlay-sidebar",Se);const De={normal:{trigger:5,renew:3,timeout:10,handoff_timeout:3},thoroughfare:{trigger:3,renew:2,timeout:3,handoff_timeout:1},rest:{trigger:7,renew:1,timeout:30,handoff_timeout:10}},Ae=["#E69F00","#56B4E9","#009E73","#F0E442","#0072B2","#D55E00","#CC79A7"];function Pe(t,e,i,s,o,r,n){if(0===t){const t=De[i]||De.normal;return"custom"===i?{trigger:s,renew:o,timeout:r,handoffTimeout:n}:{trigger:t.trigger,renew:t.renew,timeout:t.timeout,handoffTimeout:t.handoff_timeout}}if(t>0&&t<=e.length){const i=e[t-1];if(i){const t=De[i.type]||De.normal;return"custom"===i.type?{trigger:i.trigger??t.trigger,renew:i.renew??t.renew,timeout:i.timeout??t.timeout,handoffTimeout:i.handoff_timeout??t.handoff_timeout}:{trigger:t.trigger,renew:t.renew,timeout:t.timeout,handoffTimeout:t.handoff_timeout}}}return{trigger:5,renew:3,timeout:10,handoffTimeout:3}}class He extends ct{constructor(){super(...arguments),this.zoneConfigs=[],this.activeZone=null,this.roomType="normal",this.roomTrigger=De.normal.trigger,this.roomRenew=De.normal.renew,this.roomTimeout=De.normal.timeout,this.roomHandoffTimeout=De.normal.handoff_timeout,this.localZoneState=new Map,this.localize=t=>t}render(){return this._renderZoneSidebar()}_renderZoneSidebar(){return G`
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
					${0===this.activeZone?G` ${this._renderBoundaryTypeControls()} `:j}
				</div>

				<hr class="zone-separator" />
				<!-- Named zones 1..N -->
				${this.zoneConfigs.map((t,e)=>{if(null===t)return j;const i=e+1;return G`
						<div
							class="zone-item ${this.activeZone===i?"active":""}"
							@click=${()=>{this.dispatchEvent(new CustomEvent("zone-select",{detail:{zone:i},bubbles:!0,composed:!0}))}}
						>
							<div class="zone-item-row">
								${this.activeZone===i?G`
											<input
												type="color"
												class="zone-color-picker"
												style="width: 16px; height: 16px; border-radius: 50%;${this.localZoneState.get(i)?.occupied?` box-shadow: 0 0 6px 2px ${t.color};`:""}"
												.value=${t.color}
												@input=${t=>{const i=t.target.value;this.dispatchEvent(new CustomEvent("zone-config-change",{detail:{index:e,updates:{color:i}},bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("dirty",{bubbles:!0,composed:!0}))}}
												@click=${t=>t.stopPropagation()}
											/>
										`:G`
											<div
												class="zone-color-dot"
												style="background: ${t.color};${this.localZoneState.get(i)?.occupied?` box-shadow: 0 0 6px 2px ${t.color};`:""}"
											></div>
										`}
								<input
									class="zone-name-input"
									type="text"
									.value=${t.name}
									@input=${t=>{const i=t.target.value;this.dispatchEvent(new CustomEvent("zone-config-change",{detail:{index:e,updates:{name:i}},bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("dirty",{bubbles:!0,composed:!0}))}}
									@click=${t=>{t.stopPropagation(),this.dispatchEvent(new CustomEvent("zone-select",{detail:{zone:i},bubbles:!0,composed:!0}))}}
									@focus=${()=>{this.dispatchEvent(new CustomEvent("zone-select",{detail:{zone:i},bubbles:!0,composed:!0}))}}
								/>
								<button
									class="zone-remove-btn"
									@click=${t=>{t.stopPropagation(),this.dispatchEvent(new CustomEvent("zone-remove",{detail:{slot:i},bubbles:!0,composed:!0}))}}
								>
									<ha-icon icon="mdi:close"></ha-icon>
								</button>
							</div>
							${this.activeZone===i?G`
										${this._renderZoneTypeControls(t,e)}
									`:j}
						</div>
					`})}

				${this.zoneConfigs.some(t=>null===t)?G`
							<button
								class="add-zone-btn"
								@click=${()=>{this.dispatchEvent(new CustomEvent("zone-add",{bubbles:!0,composed:!0}))}}
							>
								<ha-icon icon="mdi:plus"></ha-icon>
								${this.localize("sidebar.add_zone")}
							</button>
						`:j}

			</div>
		`}_renderBoundaryTypeControls(){const t="custom"===this.roomType,e=De[this.roomType]||De.normal,i=t?this.roomTrigger:e.trigger,s=t?this.roomRenew:e.renew,o=t?this.roomTimeout:e.timeout,r=t?this.roomHandoffTimeout:e.handoff_timeout,n=`width: 100%; display: flex; align-items: center; gap: 4px; font-size: 12px; opacity: ${t?1:.5};`;return G`
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
						@change=${t=>{const e=t.target.value,i=De[e]||De.normal;this.dispatchEvent(new CustomEvent("room-config-change",{detail:{updates:{roomType:e,roomTrigger:i.trigger,roomRenew:i.renew,roomTimeout:i.timeout,roomHandoffTimeout:i.handoff_timeout}},bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("dirty",{bubbles:!0,composed:!0}))}}
						@click=${t=>t.stopPropagation()}
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
				<div style="${n}">
					<label style="width: 80px; flex-shrink: 0;"
						>${this.localize("zones.trigger")}</label
					>
					<input
						type="range"
						min="1"
						max="9"
						style="flex: 1; min-width: 0;"
						.value=${String(i)}
						?disabled=${!t}
						@input=${t=>{this.dispatchEvent(new CustomEvent("room-config-change",{detail:{updates:{roomTrigger:Number(t.target.value)}},bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("dirty",{bubbles:!0,composed:!0}))}}
						@click=${t=>t.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0;"
						>${i}</span
					>
				</div>
				<div style="${n}">
					<label style="width: 80px; flex-shrink: 0;"
						>${this.localize("zones.renew")}</label
					>
					<input
						type="range"
						min="1"
						max="9"
						style="flex: 1; min-width: 0;"
						.value=${String(s)}
						?disabled=${!t}
						@input=${t=>{this.dispatchEvent(new CustomEvent("room-config-change",{detail:{updates:{roomRenew:Number(t.target.value)}},bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("dirty",{bubbles:!0,composed:!0}))}}
						@click=${t=>t.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0;"
						>${s}</span
					>
				</div>
				<div style="${n}">
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
						?disabled=${!t}
						@input=${t=>{const e=Number(t.target.value);e>0&&(this.dispatchEvent(new CustomEvent("room-config-change",{detail:{updates:{roomTimeout:e}},bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("dirty",{bubbles:!0,composed:!0})))}}
						@click=${t=>t.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0; font-size: 12px;"
						>${this.localize("zones.seconds_suffix")}</span
					>
				</div>
				<div style="${n}">
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
						?disabled=${!t}
						@input=${t=>{const e=Number(t.target.value);e>0&&(this.dispatchEvent(new CustomEvent("room-config-change",{detail:{updates:{roomHandoffTimeout:e}},bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("dirty",{bubbles:!0,composed:!0})))}}
						@click=${t=>t.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0; font-size: 12px;"
						>${this.localize("zones.seconds_suffix")}</span
					>
				</div>
			</div>
		`}_renderZoneTypeControls(t,e){const i="custom"===t.type,s=De[t.type]||De.normal,o=t.trigger??s.trigger,r=t.renew??s.renew,n=t.timeout??s.timeout,a=t.handoff_timeout??s.handoff_timeout,l=`width: 100%; display: flex; align-items: center; gap: 4px; font-size: 12px; opacity: ${i?1:.5};`;return G`
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
						.value=${t.type}
						@change=${t=>{const i=t.target.value,s=De[i]||De.normal;this.dispatchEvent(new CustomEvent("zone-config-change",{detail:{index:e,updates:{type:i,trigger:s.trigger,renew:s.renew,timeout:s.timeout,handoff_timeout:s.handoff_timeout}},bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("dirty",{bubbles:!0,composed:!0}))}}
						@click=${t=>t.stopPropagation()}
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
						@input=${t=>{this.dispatchEvent(new CustomEvent("zone-config-change",{detail:{index:e,updates:{trigger:Number(t.target.value)}},bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("dirty",{bubbles:!0,composed:!0}))}}
						@click=${t=>t.stopPropagation()}
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
						@input=${t=>{this.dispatchEvent(new CustomEvent("zone-config-change",{detail:{index:e,updates:{renew:Number(t.target.value)}},bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("dirty",{bubbles:!0,composed:!0}))}}
						@click=${t=>t.stopPropagation()}
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
						.value=${String(n)}
						?disabled=${!i}
						@input=${t=>{const i=Number(t.target.value);i>0&&(this.dispatchEvent(new CustomEvent("zone-config-change",{detail:{index:e,updates:{timeout:i}},bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("dirty",{bubbles:!0,composed:!0})))}}
						@click=${t=>t.stopPropagation()}
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
						.value=${String(a)}
						?disabled=${!i}
						@input=${t=>{const i=Number(t.target.value);i>0&&(this.dispatchEvent(new CustomEvent("zone-config-change",{detail:{index:e,updates:{handoff_timeout:i}},bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("dirty",{bubbles:!0,composed:!0})))}}
						@click=${t=>t.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0; font-size: 12px;"
						>${this.localize("zones.seconds_suffix")}</span
					>
				</div>
			</div>
		`}}He.styles=[wt,n`
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
		`],t([gt({attribute:!1})],He.prototype,"grid",void 0),t([gt({attribute:!1})],He.prototype,"zoneConfigs",void 0),t([gt({attribute:!1})],He.prototype,"activeZone",void 0),t([gt({attribute:!1})],He.prototype,"roomType",void 0),t([gt({attribute:!1})],He.prototype,"roomTrigger",void 0),t([gt({attribute:!1})],He.prototype,"roomRenew",void 0),t([gt({attribute:!1})],He.prototype,"roomTimeout",void 0),t([gt({attribute:!1})],He.prototype,"roomHandoffTimeout",void 0),t([gt({attribute:!1})],He.prototype,"localZoneState",void 0),t([gt({attribute:!1})],He.prototype,"localize",void 0),customElements.get("epp-zone-sidebar")||customElements.define("epp-zone-sidebar",He);class Re{constructor(t){this.devices=[],this.selectedMac="",this.loading=!0,this._hass=null,this._reconnecting=!1,this._connectionFailed=!1,this._host=t,t.addController(this)}hostConnected(){}hostDisconnected(){this.closeDeviceSession()}get hass(){return this._hass}set hass(t){const e=this._hass?.connection;this._hass=t,t?.connection&&t.connection!==e&&e&&(this._unsubDevice=void 0,this._unsubTargets=void 0,this._unsubDisplay=void 0)}get hasDeviceSession(){return!!this._unsubDevice}get reconnecting(){return this._reconnecting}get connectionFailed(){return this._connectionFailed}async loadDevices(){if(!this._hass)return;try{const t=await this._hass.callWS({type:"eppgrid/list_devices"});this.devices=t.devices.sort((t,e)=>(t.name||"").localeCompare(e.name||""))}catch{return this.devices=[],void this._host.requestUpdate()}const t=localStorage.getItem("epp_selected_mac"),e=t&&this.devices.find(e=>e.mac===t);this.selectedMac=e?t:this.devices[0]?.mac??"",this._host.requestUpdate()}async loadDeviceConfig(t){if(this._reconnecting)return null;this._reconnecting=!0,this._host.requestUpdate();try{let e=null;try{e=(await this._hass.callWS({type:"eppgrid/get_config",mac:t})).config}catch{}return await this.openDeviceSession(t),this._unsubDevice&&this.subscribeTargets(t),e}finally{this._reconnecting=!1,this._host.requestUpdate()}}async openDeviceSession(t){if(this.closeDeviceSession(),this._hass&&t)try{this._unsubDevice=await this._hass.connection.subscribeMessage(()=>{},{type:"eppgrid/subscribe_device",mac:t}),this._connectionFailed=!1,this._host.requestUpdate()}catch(t){console.warn("Failed to open device session:",t);const e=t;this._connectionFailed="connection_failed"===e?.code||"not_found"===e?.code,this._host.requestUpdate()}}closeDeviceSession(){if(this.unsubscribeTargets(),this._unsubDevice){try{this._unsubDevice()}catch{}this._unsubDevice=void 0}}subscribeTargets(t){if(this.unsubscribeDisplay(),this._targetRetryTimer&&(clearTimeout(this._targetRetryTimer),this._targetRetryTimer=void 0),this._unsubTargets&&(this._unsubTargets(),this._unsubTargets=void 0),!this._hass||!t)return;const e=this._hass.connection;this._subscribeGridTargets(e,t),this.subscribeDisplay(t)}unsubscribeTargets(){if(this.unsubscribeDisplay(),this._targetRetryTimer&&(clearTimeout(this._targetRetryTimer),this._targetRetryTimer=void 0),this._unsubTargets){try{this._unsubTargets()}catch{}this._unsubTargets=void 0}}_subscribeGridTargets(t,e){t.subscribeMessage(t=>{const e=(t.targets||[]).map(t=>({x:t.x,y:t.y,speed:0,status:t.status??"inactive",signal:t.signal??0})),i=t.sensors?{occupancy:t.sensors.occupancy??!1,static_presence:t.sensors.static_presence??!1,motion_presence:t.sensors.motion_presence??!1,target_presence:t.sensors.target_presence??!1,static_state:t.sensors.static_state,motion_state:t.sensors.motion_state,occupancy_state:t.sensors.occupancy_state,illuminance:t.sensors.illuminance??null,temperature:t.sensors.temperature??null,humidity:t.sensors.humidity??null,co2:t.sensors.co2??null}:{occupancy:!1,static_presence:!1,motion_presence:!1,target_presence:!1,static_state:void 0,motion_state:void 0,occupancy_state:void 0,illuminance:null,temperature:null,humidity:null,co2:null},s=t.zones?{occupancy:t.zones.occupancy??{},target_counts:t.zones.target_counts??{},frame_count:t.zones.frame_count??0,debug_log:t.zones.debug_log}:null;this.onTargetData?.({targets:e,sensors:i,zones:s})},{type:"eppgrid/subscribe_grid_targets",mac:e}).then(t=>{this._unsubTargets=t}).catch(()=>{this._targetRetryTimer&&clearTimeout(this._targetRetryTimer),this._targetRetryTimer=setTimeout(()=>{this._targetRetryTimer=void 0,this._hass?.connection===t&&this._subscribeGridTargets(t,e)},2e3)})}subscribeDisplay(t){this.unsubscribeDisplay(),this._hass&&t&&this._hass.connection.subscribeMessage(t=>{const e=(t.targets||[]).map(t=>({raw_x:t.raw_x,raw_y:t.raw_y}));this.onRawTargetData?.(e)},{type:"eppgrid/subscribe_raw_targets",mac:t}).then(t=>{this._unsubDisplay=t})}unsubscribeDisplay(){if(this._unsubDisplay){try{this._unsubDisplay()}catch{}this._unsubDisplay=void 0}}selectDevice(t){this.selectedMac=t,this._connectionFailed=!1,localStorage.setItem("epp_selected_mac",t),this._host.requestUpdate()}}class Be{constructor(t){this.flashableDevices=[],this.loading=!0,this.otaProgress=null,this.flashingMac=null,this.usbConnected=!1,this.usbDeviceMac=null,this.usbExistingDevice=null,this._hass=null,this._host=t,t.addController(this)}hostConnected(){}hostDisconnected(){this._unsubOta?.(),this._unsubOta=void 0}get hass(){return this._hass}set hass(t){this._hass=t}async loadDevices(){if(!this._hass)return this.loading=!1,void this._host.requestUpdate();try{const t=await this._hass.callWS({type:"eppgrid/list_flashable_devices"});this.flashableDevices=t.devices}catch{this.flashableDevices=[]}this.loading=!1,this._host.requestUpdate()}async startOtaFlash(t,e){if(this._hass)return this.flashingMac=t,this.otaProgress=null,this._host.requestUpdate(),new Promise(i=>{this._hass.connection.subscribeMessage(t=>{this.otaProgress=t,this._host.requestUpdate(),"success"!==t.status&&"failed"!==t.status&&"timeout"!==t.status||(this._unsubOta?.(),this._unsubOta=void 0,this.flashingMac=null,i())},{type:"eppgrid/flash_ota",mac:t,variant:e}).then(t=>{this._unsubOta=t}).catch(()=>{this.otaProgress={step:"error",status:"failed",error:"Failed to start OTA flash"},this.flashingMac=null,this._host.requestUpdate(),i()})})}async deleteEsphomeDevice(t){this._hass&&await this._hass.callWS({type:"eppgrid/delete_esphome_device",config_entry_id:t})}async addEsphomeDevice(t){this._hass&&await this._hass.callWS({type:"eppgrid/add_esphome_device",host:t})}}class Le{constructor(t){this.host=t,t.addController(this)}hostConnected(){}hostDisconnected(){}onCellMouseDown(t){if("furniture"===this.host._sidebarTab)return void(this.host._selectedFurnitureId=null);if("interference"===this.host._overlayMode||"suppress"===this.host._overlayMode){const e="suppress"===this.host._overlayMode?2:1;this.host._isPainting=!0,this.host._frozenBounds=Kt(this.host._grid),this.host._paintAction=function(t,e){return Yt(t)===e?"clear":"set"}(this.host._grid[t],e),this.applyPaintToCell(t);const i=()=>{this.onCellMouseUp(),window.removeEventListener("mouseup",i)};return void window.addEventListener("mouseup",i)}if("entry"===this.host._overlayMode){this.host._isPainting=!0,this.host._frozenBounds=Kt(this.host._grid),this.host._paintAction=(e=this.host._grid[t],Xt(e)?"clear":"set"),this.applyPaintToCell(t);const i=()=>{this.onCellMouseUp(),window.removeEventListener("mouseup",i)};return void window.addEventListener("mouseup",i)}var e;if("zones"!==this.host._sidebarTab||null===this.host._activeZone)return;this.host._isPainting=!0,this.host._frozenBounds=Kt(this.host._grid),this.host._paintAction=function(t,e){if(0===e)return Zt(t)&&0===Vt(t)?"clear":"set";return Vt(t)===e?"clear":"set"}(this.host._grid[t],this.host._activeZone),this.applyPaintToCell(t);const i=()=>{this.onCellMouseUp(),window.removeEventListener("mouseup",i)};window.addEventListener("mouseup",i)}onCellMouseEnter(t){this.host._isPainting&&this.applyPaintToCell(t)}onCellMouseUp(){this.host._isPainting&&(this.host._justPainted=!0,requestAnimationFrame(()=>{this.host._justPainted=!1})),this.host._isPainting=!1,this.host._frozenBounds=null}applyPaintToCell(t){let e;if("interference"===this.host._overlayMode||"suppress"===this.host._overlayMode){const i="suppress"===this.host._overlayMode?2:1;e=function(t,e,i){return Zt(t)?qt(t,"set"===i?e:0):null}(this.host._grid[t],i,this.host._paintAction)}else if("entry"===this.host._overlayMode)i=this.host._grid[t],s=this.host._paintAction,e=Zt(i)?((t,e)=>e?-225&t|16:-17&t)(i,"set"===s):null;else{if(null===this.host._activeZone)return;e=function(t,e,i){return 0===e?"set"===i?1:0:Zt(t)?"set"===i?jt(1|t,e):jt(t,0):null}(this.host._grid[t],this.host._activeZone,this.host._paintAction)}var i,s;null!==e&&(this.host._grid=new Uint8Array(this.host._grid),this.host._grid[t]=e,this.host._dirty=!0,this.host.requestUpdate())}initGridFromRoom(){this.host._grid=Qt(this.host._roomWidth,this.host._roomDepth)}addZone(){const t=this.host._zoneConfigs.findIndex(t=>null===t);if(-1===t)return;const e=new Set(this.host._zoneConfigs.filter(t=>null!==t).map(t=>t.color)),i=Ae.find(t=>!e.has(t))??Ae[t%Ae.length],s=[...this.host._zoneConfigs];s[t]={name:`Zone ${t+1}`,color:i,type:"normal"},this.host._zoneConfigs=s,this.host._activeZone=t+1,this.host._dirty=!0}removeZone(t){if(t<1||t>7||null===this.host._zoneConfigs[t-1])return;const e=function(t,e){if(e<1||e>7)return null;const i=new Uint8Array(t);let s=!1;for(let t=0;t<Ut;t++)Vt(i[t])===e&&(i[t]=jt(i[t],0),s=!0);return s?i:new Uint8Array(t)}(this.host._grid,t);e&&(this.host._grid=e);const i=[...this.host._zoneConfigs];i[t-1]=null,this.host._zoneConfigs=i,this.host._activeZone===t&&(this.host._activeZone=null),this.host._dirty=!0,this.host.requestUpdate()}addFurniture(t){const e=`f_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,i=function(t,e,i,s){return{id:s,type:t.type,icon:t.icon,label:t.label,x:Math.max(0,(e-t.defaultWidth)/2),y:Math.max(0,(i-t.defaultHeight)/2),width:t.defaultWidth,height:t.defaultHeight,rotation:0,lockAspect:t.lockAspect??"icon"===t.type}}(t,this.host._roomWidth,this.host._roomDepth,e);this.host._furniture=[...this.host._furniture,i],this.host._selectedFurnitureId=i.id,this.host._dirty=!0}addCustomFurniture(t){this.addFurniture({type:"icon",icon:t,label:"furniture.custom",defaultWidth:600,defaultHeight:600,lockAspect:!1})}removeFurniture(t){this.host._furniture=function(t,e){return t.filter(t=>t.id!==e)}(this.host._furniture,t),this.host._selectedFurnitureId===t&&(this.host._selectedFurnitureId=null),this.host._dirty=!0}updateFurniture(t,e){this.host._furniture=function(t,e,i){return t.map(t=>t.id===e?{...t,...i}:t)}(this.host._furniture,t,e),this.host._dirty=!0}onFurniturePointerDown(t,e,i,s){t.preventDefault(),t.stopPropagation(),this.host._selectedFurnitureId=e;const o=this.host._furniture.find(t=>t.id===e);if(!o)return;let r=0,n=0,a=0;if("rotate"===i){const i=this.host.shadowRoot?.querySelector("epp-grid")?.shadowRoot?.querySelector("epp-furniture-overlay")?.shadowRoot?.querySelector(`.furniture-item[data-id="${e}"]`);if(i){const e=i.getBoundingClientRect();r=e.left+e.width/2,n=e.top+e.height/2,a=Math.atan2(t.clientY-n,t.clientX-r)*(180/Math.PI)}}this.host._dragState={type:i,id:e,startX:t.clientX,startY:t.clientY,origX:o.x,origY:o.y,origW:o.width,origH:o.height,origRot:o.rotation,handle:s,centerX:r,centerY:n,startAngle:a};const l=t=>this.onFurnitureDrag(t),c=()=>{this.host._dragState=null,window.removeEventListener("pointermove",l),window.removeEventListener("pointerup",c)};window.addEventListener("pointermove",l),window.addEventListener("pointerup",c)}onFurnitureDrag(t){if(!this.host._dragState)return;const e=this.host._dragState,i=this.host.shadowRoot?.querySelector("epp-grid")?.shadowRoot?.querySelector(".grid");if(!i)return;const s=i.firstElementChild?i.firstElementChild.offsetWidth:28,o=t.clientX-e.startX,r=t.clientY-e.startY;if("move"===e.type){const t=this.host._furniture.find(t=>t.id===e.id),i=Kt(this.host._grid),n=Math.ceil(this.host._roomWidth/Wt),a=Math.floor((Nt-n)/2),l=(i.minCol-a)*Wt,c=(i.maxCol+1-a)*Wt,h=i.minRow*Wt,d=(i.maxRow+1)*Wt,p=function(t,e,i,s,o,r,n,a,l,c,h){const d=ce(i,o),p=ce(s,o);return{x:Math.max(a,Math.min(l-r,t+d)),y:Math.max(c,Math.min(h-n,e+p))}}(e.origX,e.origY,o,r,s,t?.width??0,t?.height??0,l,c,h,d);this.updateFurniture(e.id,p)}else if("resize"===e.type&&e.handle){const t=this.host._furniture.find(t=>t.id===e.id),i=function(t,e,i,s,o,r,n,a,l){const c=ce(e,s),h=ce(i,s);let d=o,p=r,u=n,g=a;if(l){const e=Math.abs(c)>Math.abs(h)?c:h,i=n/a,s=t.includes("w")||t.includes("n")?-1:1;u=Math.max(100,n+s*e),g=Math.max(100,u/i),u=g*i,t.includes("w")&&(d=o+(n-u)),t.includes("n")&&(p=r+(a-g))}else t.includes("e")&&(u=Math.max(100,u+c)),t.includes("w")&&(u=Math.max(100,u-c),d+=c),t.includes("s")&&(g=Math.max(100,g+h)),t.includes("n")&&(g=Math.max(100,g-h),p+=h);return{x:d,y:p,width:u,height:g}}(e.handle,o,r,s,e.origX,e.origY,e.origW,e.origH,t?.lockAspect??!1);this.updateFurniture(e.id,i)}else if("rotate"===e.type){const i=Math.atan2(t.clientY-(e.centerY??0),t.clientX-(e.centerX??0))*(180/Math.PI);this.updateFurniture(e.id,{rotation:he(e.origRot,e.startAngle??0,i)})}}getTemplates(){try{return JSON.parse(localStorage.getItem("epp_layout_templates")||"[]")}catch{return[]}}saveTemplate(){const t=this.host._templateName.trim();if(!t)return;const e=this.getTemplates(),i=e.findIndex(e=>e.name===t),s={name:t,grid:Array.from(this.host._grid),zones:this.host._zoneConfigs.map(t=>null!==t?{...t}:null),roomWidth:this.host._roomWidth,roomDepth:this.host._roomDepth,furniture:this.host._furniture.map(t=>({...t}))};i>=0?e[i]=s:e.push(s),localStorage.setItem("epp_layout_templates",JSON.stringify(e)),this.host._showTemplateSave=!1,this.host._templateName=""}loadTemplate(t){const e=this.getTemplates().find(e=>e.name===t);if(!e)return;this.host._grid=new Uint8Array(e.grid);const i=e.zones||[];this.host._zoneConfigs=Array.from({length:7},(t,e)=>i[e]??null),this.host._roomWidth=e.roomWidth,this.host._roomDepth=e.roomDepth,this.host._furniture=(e.furniture||[]).map(t=>({...t})),this.host._showTemplateLoad=!1}deleteTemplate(t){const e=this.getTemplates().filter(e=>e.name!==t);localStorage.setItem("epp_layout_templates",JSON.stringify(e)),this.host.requestUpdate()}async applyLayout(){const t=new Map;for(let e=0;e<this.host._grid.length;e++)if(Zt(this.host._grid[e])){const i=Vt(this.host._grid[e]);i>0&&t.set(i,(t.get(i)??0)+1)}for(let e=0;e<this.host._zoneConfigs.length;e++)null!==this.host._zoneConfigs[e]&&0===(t.get(e+1)??0)&&(this.host._zoneConfigs[e]=null);const e=Kt(this.host._grid);let i=this.host._furniture;if(e.minCol<=e.maxCol&&e.minRow<=e.maxRow){const t=Math.ceil(this.host._roomWidth/Wt),s=Math.floor((Nt-t)/2),o=(e.minCol-s)*Wt,r=(e.maxCol+1-s)*Wt,n=e.minRow*Wt,a=(e.maxRow+1)*Wt;i=i.filter(t=>{return i=o,s=r,l=n,c=a,!((e=t).x+e.width<=i||e.x>=s||e.y+e.height<=l||e.y>=c);var e,i,s,l,c})}this.host._saving=!0;try{if(await this.host.hass.callWS({type:"eppgrid/set_room_layout",mac:this.host._selectedMac,grid_bytes:Array.from(this.host._grid),room_type:this.host._roomType,room_trigger:this.host._roomTrigger,room_renew:this.host._roomRenew,room_timeout:this.host._roomTimeout,room_handoff_timeout:this.host._roomHandoffTimeout,zone_slots:this.host._zoneConfigs.map(t=>null!==t?{name:t.name,color:t.color,type:t.type,trigger:t.trigger,renew:t.renew,timeout:t.timeout,handoff_timeout:t.handoff_timeout}:null),furniture:i.map(t=>({type:t.type,icon:t.icon,label:t.label,x:t.x,y:t.y,width:t.width,height:t.height,rotation:t.rotation,lockAspect:t.lockAspect}))}),this.host._furniture=i,this.host._targetAutoDistance||this.host._staticAutoDistance){const t=$e(this.host._roomWidth,this.host._roomDepth,this.host._perspective,this.host._grid),e=this.host._targetAutoDistance?t>0?Math.min(t,6):6:this.host._targetMaxDistance,i=this.host._staticAutoDistance?.3:this.host._staticMinDistance,s=this.host._staticAutoDistance?t>0?Math.min(t,16):16:this.host._staticMaxDistance;await this.host.hass.callWS({type:"eppgrid/set_settings",mac:this.host._selectedMac,temperature_offset:this.host._temperatureOffset,humidity_offset:this.host._humidityOffset,illuminance_offset:this.host._illuminanceOffset,motion_timeout:this.host._motionTimeout,target_auto_distance:this.host._targetAutoDistance,target_max_distance:e,static_auto_distance:this.host._staticAutoDistance,static_min_distance:i,static_max_distance:s,static_trigger_threshold:this.host._staticTriggerThreshold,static_renew_threshold:this.host._staticRenewThreshold,static_timeout:this.host._staticTimeout,static_on_delay:this.host._staticOnDelay,led_mode:this.host._ledMode,led_brightness:this.host._ledBrightness,led_presence_color:this.host._ledPresenceColor,relay_trigger_mode:this.host._relayTriggerMode,relay_contact_mode:this.host._relayContactMode,entities:this.host._entitiesConfig||{}})}this.host._dirty=!1,this.host._selectedFurnitureId=null,this.host._overlayMode=null,this.host._view="live"}finally{this.host._saving=!1}}async saveSettings(t){this.host._saving=!0;try{await this.host.hass.callWS({type:"eppgrid/set_settings",mac:this.host._selectedMac,...t}),t.entities&&(this.host._entitiesConfig=t.entities),this.host._temperatureOffset=t.temperature_offset??this.host._temperatureOffset,this.host._humidityOffset=t.humidity_offset??this.host._humidityOffset,this.host._illuminanceOffset=t.illuminance_offset??this.host._illuminanceOffset,this.host._motionTimeout=t.motion_timeout??this.host._motionTimeout,this.host._staticTimeout=t.static_timeout??this.host._staticTimeout,this.host._staticTriggerThreshold=t.static_trigger_threshold??this.host._staticTriggerThreshold,this.host._staticRenewThreshold=t.static_renew_threshold??this.host._staticRenewThreshold,this.host._staticOnDelay=t.static_on_delay??this.host._staticOnDelay,this.host._logLevels=t.log_levels??this.host._logLevels,this.host._targetAutoDistance=t.target_auto_distance??this.host._targetAutoDistance,this.host._targetMaxDistance=t.target_max_distance??this.host._targetMaxDistance,this.host._staticAutoDistance=t.static_auto_distance??this.host._staticAutoDistance,this.host._staticMinDistance=t.static_min_distance??this.host._staticMinDistance,this.host._staticMaxDistance=t.static_max_distance??this.host._staticMaxDistance,this.host._ledMode=t.led_mode??this.host._ledMode,this.host._ledBrightness=t.led_brightness??this.host._ledBrightness,this.host._ledPresenceColor=t.led_presence_color??this.host._ledPresenceColor,this.host._relayTriggerMode=t.relay_trigger_mode??this.host._relayTriggerMode,this.host._relayContactMode=t.relay_contact_mode??this.host._relayContactMode,this.host._targetUpdateRateMs=t.target_update_rate_ms??this.host._targetUpdateRateMs,this.host._zoneUpdateRateMs=t.zone_update_rate_ms??this.host._zoneUpdateRateMs,this.host._dirty=!1,this.host._view="live"}catch(t){console.error("Failed to save settings:",t)}finally{this.host._saving=!1}}}function Ie(){return{localZoneState:new Map,targetPrev:[null,null,null],targetGateCount:[0,0,0],targetPrevXY:[null,null,null],staticState:"inactive",motionState:"inactive",staticPendingSince:null,motionPendingSince:null,sensorsEverActive:!1}}class Oe{constructor(t){this._zoneEngineState=Ie(),this.host=t,t.addController(this)}hostConnected(){}hostDisconnected(){}get zoneEngineState(){return this._zoneEngineState}set zoneEngineState(t){this._zoneEngineState=t}resetZoneEngineState(){this._zoneEngineState=Ie()}handleTargetData(t){"settings"!==this.host._view&&(this.host._targets=t.targets,this.host._sensorState=t.sensors,t.zones&&(this.host._zoneState={occupancy:t.zones.occupancy,target_counts:t.zones.target_counts,frame_count:t.zones.frame_count},this.host._showBackendDebugLog&&t.zones.debug_log&&this.appendBackendDebugLog(t.zones.debug_log)))}handleRawTargetData(t){"settings"!==this.host._view&&(this.host._rawTargets=t)}runLocalZoneEngine(){const t=this.host._sensorState,e=function(t,e){const i=e.now??Date.now()/1e3,s=new Map,o=new Map,r=[null,null,null],n=[null,null,null],a=[!1,!1,!1],l=[!1,!1,!1],c=[null,null,null];for(let i=0;i<3&&i<e.targets.length;i++){const s=t.targetPrev[i];if(null!==s){const t=s.row*Nt+s.col;if(t>=0&&t<Ut&&Zt(e.grid[t])){const o=Vt(e.grid[t]);c[i]=o;for(let t=-1;t<=1&&!l[i];t++)for(let r=-1;r<=1&&!l[i];r++){const n=s.row+t,a=s.col+r;if(n>=0&&n<Ft&&a>=0&&a<Nt){const t=n*Nt+a;Xt(e.grid[t])&&Vt(e.grid[t])===o&&(l[i]=!0)}}}}}for(let i=0;i<3&&i<e.targets.length;i++){const l=e.targets[i];if(null==l.x||null==l.y){t.targetPrev[i]=null,t.targetGateCount[i]=0;continue}const c=l.signal;if(c<=0)continue;o.set(i,c);const h=ue(l.x,l.y,e.roomWidth,e.roomDepth);if(!h){a[i]=!0,t.targetPrev[i]=null,t.targetGateCount[i]=0;continue}const d=Math.floor(h.col),p=Math.floor(h.row);if(d<0||d>=Nt||p<0||p>=Ft){a[i]=!0,t.targetPrev[i]=null,t.targetGateCount[i]=0;continue}const u=p*Nt+d,g=e.grid[u];if(!Zt(g)){a[i]=!0,t.targetPrev[i]=null,t.targetGateCount[i]=0;continue}const f=Yt(g);if(2===f){t.targetPrev[i]=null,t.targetGateCount[i]=0;continue}const m=Vt(g);n[i]=m;const _=t.targetPrev[i];if(null!==_){const t=_.row*Nt+_.col;t>=0&&t<Ut&&Zt(e.grid[t])&&(r[i]=Vt(e.grid[t]))}t.targetPrevXY[i]={x:l.x,y:l.y};let v=!1;null!==_&&(v=Math.max(Math.abs(d-_.col),Math.abs(p-_.row))<=5);const b=Pe(m,e.zoneConfigs,e.roomType,e.roomTrigger,e.roomRenew,e.roomTimeout,e.roomHandoffTimeout),{trigger:y,renew:x}=b,w=t.localZoneState.get(m),$=!w?.occupied;if(f>0&&!v&&$){t.targetPrev[i]=null,t.targetGateCount[i]=0;continue}let z=$?y:f>0?9:x,k=Xt(g);if(!k)for(let t=-1;t<=1&&!k;t++)for(let i=-1;i<=1&&!k;i++){const s=p+t,o=d+i;if(s>=0&&s<Ft&&o>=0&&o<Nt){const t=s*Nt+o;Xt(e.grid[t])&&Vt(e.grid[t])===m&&(k=!0)}}k&&$&&0===f&&(z=1),k||v||!$?c>=z?(s.set(m,!0),w&&w.confirmedTargets.add(i),t.targetPrev[i]={col:d,row:p},t.targetGateCount[i]=0):t.targetPrev[i]={col:d,row:p}:c>=Math.min(z+2,8)?(t.targetGateCount[i]++,t.targetGateCount[i]>=2?(s.set(m,!0),w&&w.confirmedTargets.add(i),t.targetPrev[i]={col:d,row:p},t.targetGateCount[i]=0):t.targetPrev[i]={col:d,row:p}):(t.targetPrev[i]=null,t.targetGateCount[i]=0)}for(let s=0;s<3;s++){const o=r[s],a=n[s];if(null===o||null===a||o===a)continue;const l=t.localZoneState.get(o);if(l&&(l.confirmedTargets.delete(s),0===l.confirmedTargets.size&&l.occupied&&null===l.pendingSince)){const t=Pe(o,e.zoneConfigs,e.roomType,e.roomTrigger,e.roomRenew,e.roomTimeout,e.roomHandoffTimeout),{timeout:s,handoffTimeout:r}=t;l.pendingSince=i-(s-r)}}for(let s=0;s<3&&s<e.targets.length;s++){const o=e.targets[s];if((null==o.x||null==o.y||a[s])&&l[s]&&null!==c[s]){const o=c[s],r=t.localZoneState.get(o);if(r?.occupied){let t=0;for(const e of r.confirmedTargets)e!==s&&t++;if(0===t){const t=Pe(o,e.zoneConfigs,e.roomType,e.roomTrigger,e.roomRenew,e.roomTimeout,e.roomHandoffTimeout),s=i-(t.timeout-t.handoffTimeout);(null===r.pendingSince||r.pendingSince>s)&&(r.pendingSince=s)}}}}const h={},d=new Set;for(let t=0;t<e.grid.length;t++)Zt(e.grid[t])&&d.add(Vt(e.grid[t]));for(const o of d){let r=t.localZoneState.get(o);r||(r={occupied:!1,pendingSince:null,confirmedTargets:new Set},t.localZoneState.set(o,r));const n=Pe(o,e.zoneConfigs,e.roomType,e.roomTrigger,e.roomRenew,e.roomTimeout,e.roomHandoffTimeout),{timeout:a}=n,l=s.get(o)??!1;r.occupied?null===r.pendingSince?l||(r.pendingSince=i):l?r.pendingSince=null:i-r.pendingSince>=a&&(r.occupied=!1,r.pendingSince=null,r.confirmedTargets.clear()):l&&(r.occupied=!0,r.pendingSince=null),h[o]=r.occupied}for(const e of t.localZoneState.keys())d.has(e)||t.localZoneState.delete(e);const p=new Set;for(let t=0;t<3&&t<e.targets.length;t++)null!=e.targets[t].x&&null!=e.targets[t].y&&p.add(t);for(let i=0;i<3&&i<e.targets.length;i++)if(!p.has(i))for(const e of t.localZoneState.values())null===e.pendingSince&&e.confirmedTargets.delete(i);const u=e.staticPresence??!1,g=e.motionPresence??!1,f=e.staticTimeout??10,m=e.motionTimeout??10;if(u?(t.staticState="active",t.staticPendingSince=null,t.sensorsEverActive=!0):"active"===t.staticState?(t.staticState="pending",t.staticPendingSince=i):"pending"===t.staticState&&null!==t.staticPendingSince&&i-t.staticPendingSince>=f&&(t.staticState="inactive",t.staticPendingSince=null),g?(t.motionState="active",t.motionPendingSince=null,t.sensorsEverActive=!0):"active"===t.motionState?(t.motionState="pending",t.motionPendingSince=i):"pending"===t.motionState&&null!==t.motionPendingSince&&i-t.motionPendingSince>=m&&(t.motionState="inactive",t.motionPendingSince=null),t.sensorsEverActive&&"inactive"===t.staticState&&"inactive"===t.motionState){let e=!1;for(const[,i]of t.localZoneState)if(i.occupied&&null===i.pendingSince){e=!0;break}if(!e)for(const[e,i]of t.localZoneState)i.occupied&&null!==i.pendingSince&&(i.occupied=!1,i.pendingSince=null,i.confirmedTargets.clear(),h[e]=!1)}const _="inactive"!==t.staticState||"inactive"!==t.motionState||Object.values(h).some(t=>t),v=[];for(let i=0;i<3&&i<e.targets.length;i++){const e=o.get(i)??0,s=null!==n[i];if(p.has(i)&&e>0&&s)v.push({status:"active"});else{let e=!1;if(!p.has(i)||!s)for(const[,s]of t.localZoneState)if(s.occupied&&null!==s.pendingSince&&s.confirmedTargets.has(i)){e=!0;break}v.push({status:e?"pending":"inactive"})}}return{occupancy:h,targets:v,staticState:t.staticState,motionState:t.motionState,sensorOccupancy:_}}(this._zoneEngineState,{targets:this.host._targets,grid:this.host._grid,roomWidth:this.host._roomWidth,roomDepth:this.host._roomDepth,zoneConfigs:this.host._zoneConfigs,roomType:this.host._roomType,roomTrigger:this.host._roomTrigger,roomRenew:this.host._roomRenew,roomTimeout:this.host._roomTimeout,roomHandoffTimeout:this.host._roomHandoffTimeout,staticPresence:t?.static_presence??!1,motionPresence:t?.motion_presence??!1,staticTimeout:10,motionTimeout:10});return this.host._showDebugLog&&this._buildFrontendDebugLog(e),e}enrichDebugLog(t){const e=t=>{if(0===t)return"Room";const e=this.host._zoneConfigs[t-1];return e?e.name:`Zone ${t}`},i={A:"active",P:"pending",I:"inactive",O:"occupied"},s=t.split("|");let o,r,n;s.length>=3?(o=s[0],r=s[1],n=s[2]):(o="",r=s[0]||"",n=s[1]||"");let a="";if(o.trim()){const t=o.trim().split(/\s+/),e=[];for(const s of t){const[t,o]=s.split(":");"S"===t?e.push(`Static: ${i[o]??o}`):"M"===t?e.push(`Motion: ${i[o]??o}`):"Occ"===t&&e.push("Occ: "+("1"===o?"on":"off"))}a=e.join(", ")}const l=(r||"").trim().split(/\s+/).filter(Boolean).map(t=>{const[s,o,r,n]=t.split(":"),a=parseInt(o?.replace("Z","")??"0",10);return`${s}→${e(a)}(${i[r]??r},${n})`}),c=(n||"").trim().split(/\s+/).filter(Boolean).map(t=>{const[s,o,r]=t.split(":"),n=parseInt(s?.replace("Z","")??"0",10);return`${e(n)}: ${i[o]??o}(${r})`}),h=l.length?l.join(" "):"no targets",d=c.length?c.join(", "):"all clear";return a?`${a} | ${h} | ${d}`:`${h} | ${d}`}computeHeatmapColors(){return function(t,e){const i=new Map;for(const[s,o]of Object.entries(t)){const t=Number(s);if(o<=0)continue;const r=Math.min(o,9)/9*.6;let n=100,a=180,l=255;if(t>0&&t<=7){const i=e[t-1];if(i){const t=_e(i.color);n=t.r,a=t.g,l=t.b}}i.set(t,`rgba(${n}, ${a}, ${l}, ${r})`)}return i}(this.host._zoneState.target_counts,this.host._zoneConfigs)}appendBackendDebugLog(t){let e=t;if(t.split("|").length<3){const i=this.host._sensorState;e=`S:${i?.static_presence?"A":"I"} M:${i?.motion_presence?"A":"I"} Occ:${i?.occupancy?"1":"0"}|${t}`}const i=this.enrichDebugLog(e);if(i===this.host._backendDebugLogPrev)return;this.host._backendDebugLogPrev=i;const s=`${(new Date).toLocaleTimeString("en-GB",{hour12:!1,hour:"2-digit",minute:"2-digit",second:"2-digit",fractionalSecondDigits:1})} ${i}`;this.host._backendDebugLogLines.push(s),this.host._backendDebugLogLines.length>re&&(this.host._backendDebugLogLines=this.host._backendDebugLogLines.slice(-100)),this._appendToLogContainer("backend-debug-log-scroll",s)}_appendFrontendDebugLog(t){if(t===this.host._debugLogPrev)return;this.host._debugLogPrev=t;const e=`${(new Date).toLocaleTimeString("en-GB",{hour12:!1,hour:"2-digit",minute:"2-digit",second:"2-digit",fractionalSecondDigits:1})} ${t}`;this.host._debugLogLines.push(e),this.host._debugLogLines.length>re&&(this.host._debugLogLines=this.host._debugLogLines.slice(-100)),this._appendToLogContainer("debug-log-scroll",e)}_appendToLogContainer(t,e){const i=this.host.shadowRoot?.getElementById(t);if(!i)return;1!==i.children.length||i.children[0].classList.contains("debug-log-line")||(i.innerHTML="");const s=document.createElement("div");for(s.className="debug-log-line",s.textContent=e,i.appendChild(s);i.children.length>re;)i.firstChild?.remove();i.scrollTop=i.scrollHeight}_buildFrontendDebugLog(t){const e=[null,null,null];for(let t=0;t<3&&t<this.host._targets.length;t++){const i=this.host._targets[t];if(null==i.x||null==i.y||i.signal<=0)continue;const s=ue(i.x,i.y,this.host._roomWidth,this.host._roomDepth);if(!s)continue;const o=Math.floor(s.col),r=Math.floor(s.row);if(o<0||o>=Nt||r<0||r>=Ft)continue;const n=r*Nt+o;Zt(this.host._grid[n])&&(e[t]=Vt(this.host._grid[n]))}const i=new Map;for(let t=0;t<3&&t<this.host._targets.length;t++){const s=this.host._targets[t];if(null==s.x||null==s.y||s.signal<=0)continue;const o=e[t];null!==o&&i.set(o,Math.max(i.get(o)??0,s.signal))}const s=[];for(let i=0;i<3&&i<this.host._targets.length;i++){const o=this.host._targets[i];if(null==o.x||null==o.y)continue;const r=o.signal;if(r<=0)continue;const n=e[i],a="pending"===t.targets[i]?.status?"P":"A";s.push(`T${i}:Z${n??0}:${a}:${r}`)}const o=new Set;for(let t=0;t<this.host._grid.length;t++)Zt(this.host._grid[t])&&o.add(Vt(this.host._grid[t]));const r=[];for(const t of o){const e=this._zoneEngineState.localZoneState.get(t);if(e?.occupied){const s=null!==e.pendingSince?"P":"O";r.push(`Z${t}:${s}:${i.get(t)??0}`)}}const n=`${`S:${"active"===t.staticState?"A":"pending"===t.staticState?"P":"I"} M:${"active"===t.motionState?"A":"pending"===t.motionState?"P":"I"} Occ:${t.sensorOccupancy?"1":"0"}`}|${s.join(" ")}|${r.join(" ")}`,a=this.enrichDebugLog(n);this._appendFrontendDebugLog(a)}}function Ne(t,e,i){const s=t||{};return{temperatureOffset:s.temperature_offset??0,humidityOffset:s.humidity_offset??0,illuminanceOffset:s.illuminance_offset??0,motionTimeout:s.motion_timeout??5,targetAutoDistance:s.target_auto_distance??!0,targetMaxDistance:s.target_max_distance??6,staticAutoDistance:s.static_auto_distance??!0,staticMinDistance:s.static_min_distance??.3,staticMaxDistance:s.static_max_distance??16,staticTriggerThreshold:s.static_trigger_threshold??3,staticRenewThreshold:s.static_renew_threshold??3,staticTimeout:s.static_timeout??30,staticOnDelay:s.static_on_delay??0,entities:e||{},logLevels:i??{},ledMode:s.led_mode??"Manual Control",ledBrightness:s.led_brightness??1,ledPresenceColor:s.led_presence_color??"#CC33FF",relayTriggerMode:s.relay_trigger_mode??"disabled",relayContactMode:s.relay_contact_mode??"no",targetUpdateRateMs:s.target_update_rate_ms??1e3,zoneUpdateRateMs:s.zone_update_rate_ms??1e3}}function Fe(t){const e=function(t){const e=t?.calibration;return e?.perspective&&e.room_width>0?{perspective:e.perspective,roomWidth:e.room_width||0,roomDepth:e.room_depth||0}:{perspective:null,roomWidth:0,roomDepth:0}}(t),i=t?.room_layout||{},s=(i.furniture||[]).map((t,e)=>({id:t.id||`f_load_${e}`,type:t.type||"icon",icon:t.icon||"mdi:help",label:t.label||"Item",x:t.x??0,y:t.y??0,width:t.width??600,height:t.height??600,rotation:t.rotation??0,lockAspect:t.lockAspect??"svg"!==t.type}));const o=function(t,e,i){return t?.grid_bytes&&Array.isArray(t.grid_bytes)?new Uint8Array(t.grid_bytes):e>0&&i>0?Qt(e,i):new Uint8Array(Ut)}(i,e.roomWidth,e.roomDepth),r=function(t){const e=t?.zone_slots||t?.zones||[];return Array.from({length:7},(t,i)=>{const s=e[i];return s?{name:s.name||`Zone ${i+1}`,color:s.color||Ae[i%Ae.length],type:s.type??"normal",trigger:s.trigger,renew:s.renew,timeout:s.timeout,handoff_timeout:s.handoff_timeout}:null})}(i),n=function(t){const e=t?.room_type??"normal",i=De[e]??De.normal;return{roomType:e,roomTrigger:t?.room_trigger??i?.trigger??5,roomRenew:t?.room_renew??i?.renew??3,roomTimeout:t?.room_timeout??i?.timeout??10,roomHandoffTimeout:t?.room_handoff_timeout??i?.handoff_timeout??3}}(i);return{calibration:e,furniture:s,grid:o,zoneConfigs:r,roomThresholds:n,settings:Ne(t?.settings,t?.entities,t?.log_levels)}}function Ue(t,e){const i=e&&e.cache?e.cache:Ye,s=e&&e.serializer?e.serializer:je;return(e&&e.strategy?e.strategy:Ve)(t,{cache:i,serializer:s})}function We(t,e,i,s){const o=null==(r=s)||"number"==typeof r||"boolean"==typeof r?s:i(s);var r;let n=e.get(o);return void 0===n&&(n=t.call(this,s),e.set(o,n)),n}function Ge(t,e,i){const s=Array.prototype.slice.call(arguments,3),o=i(s);let r=e.get(o);return void 0===r&&(r=t.apply(this,s),e.set(o,r)),r}function Ze(t,e,i,s,o){return i.bind(e,t,s,o)}function Ve(t,e){return Ze(t,this,1===t.length?We:Ge,e.cache.create(),e.serializer)}const je=function(){return JSON.stringify(arguments)};class Xe{cache;constructor(){this.cache=Object.create(null)}get(t){return this.cache[t]}set(t,e){this.cache[t]=e}}const Ye={create:function(){return new Xe}},qe={variadic:function(t,e){return Ze(t,this,Ge,e.cache.create(),e.serializer)}},Ke=/(?:[Eec]{1,6}|G{1,5}|[Qq]{1,5}|(?:[yYur]+|U{1,5})|[ML]{1,5}|d{1,2}|D{1,3}|F{1}|[abB]{1,5}|[hkHK]{1,2}|w{1,2}|W{1}|m{1,2}|s{1,2}|[zZOvVxX]{1,4})(?=([^']*'[^']*')*[^']*$)/g;function Je(t){const e={};return t.replace(Ke,t=>{const i=t.length;switch(t[0]){case"G":e.era=4===i?"long":5===i?"narrow":"short";break;case"y":e.year=2===i?"2-digit":"numeric";break;case"Y":case"u":case"U":case"r":throw new RangeError("`Y/u/U/r` (year) patterns are not supported, use `y` instead");case"q":case"Q":throw new RangeError("`q/Q` (quarter) patterns are not supported");case"M":case"L":e.month=["numeric","2-digit","short","long","narrow"][i-1];break;case"w":case"W":throw new RangeError("`w/W` (week) patterns are not supported");case"d":e.day=["numeric","2-digit"][i-1];break;case"D":case"F":case"g":throw new RangeError("`D/F/g` (day) patterns are not supported, use `d` instead");case"E":e.weekday=4===i?"long":5===i?"narrow":"short";break;case"e":if(i<4)throw new RangeError("`e..eee` (weekday) patterns are not supported");e.weekday=["short","long","narrow","short"][i-4];break;case"c":if(i<4)throw new RangeError("`c..ccc` (weekday) patterns are not supported");e.weekday=["short","long","narrow","short"][i-4];break;case"a":e.hour12=!0;break;case"b":case"B":throw new RangeError("`b/B` (period) patterns are not supported, use `a` instead");case"h":e.hourCycle="h12",e.hour=["numeric","2-digit"][i-1];break;case"H":e.hourCycle="h23",e.hour=["numeric","2-digit"][i-1];break;case"K":e.hourCycle="h11",e.hour=["numeric","2-digit"][i-1];break;case"k":e.hourCycle="h24",e.hour=["numeric","2-digit"][i-1];break;case"j":case"J":case"C":throw new RangeError("`j/J/C` (hour) patterns are not supported, use `h/H/K/k` instead");case"m":e.minute=["numeric","2-digit"][i-1];break;case"s":e.second=["numeric","2-digit"][i-1];break;case"S":case"A":throw new RangeError("`S/A` (second) patterns are not supported, use `s` instead");case"z":e.timeZoneName=i<4?"short":"long";break;case"Z":case"O":case"v":case"V":case"X":case"x":throw new RangeError("`Z/O/v/V/X/x` (timeZone) patterns are not supported, use `z` instead")}return""}),e}const Qe=/[\t-\r \x85\u200E\u200F\u2028\u2029]/i;function ti(t){return t.replace(/^(.*?)-/,"")}const ei=/^\.(?:(0+)(\*)?|(#+)|(0+)(#+))$/g,ii=/^(@+)?(\+|#+)?[rs]?$/g,si=/(\*)(0+)|(#+)(0+)|(0+)/g,oi=/^(0+)$/;function ri(t){const e={};return"r"===t[t.length-1]?e.roundingPriority="morePrecision":"s"===t[t.length-1]&&(e.roundingPriority="lessPrecision"),t.replace(ii,function(t,i,s){return"string"!=typeof s?(e.minimumSignificantDigits=i.length,e.maximumSignificantDigits=i.length):"+"===s?e.minimumSignificantDigits=i.length:"#"===i[0]?e.maximumSignificantDigits=i.length:(e.minimumSignificantDigits=i.length,e.maximumSignificantDigits=i.length+("string"==typeof s?s.length:0)),""}),e}function ni(t){switch(t){case"sign-auto":return{signDisplay:"auto"};case"sign-accounting":case"()":return{currencySign:"accounting"};case"sign-always":case"+!":return{signDisplay:"always"};case"sign-accounting-always":case"()!":return{signDisplay:"always",currencySign:"accounting"};case"sign-except-zero":case"+?":return{signDisplay:"exceptZero"};case"sign-accounting-except-zero":case"()?":return{signDisplay:"exceptZero",currencySign:"accounting"};case"sign-never":case"+_":return{signDisplay:"never"}}}function ai(t){let e;if("E"===t[0]&&"E"===t[1]?(e={notation:"engineering"},t=t.slice(2)):"E"===t[0]&&(e={notation:"scientific"},t=t.slice(1)),e){const i=t.slice(0,2);if("+!"===i?(e.signDisplay="always",t=t.slice(2)):"+?"===i&&(e.signDisplay="exceptZero",t=t.slice(2)),!oi.test(t))throw new Error("Malformed concise eng/scientific notation");e.minimumIntegerDigits=t.length}return e}function li(t){const e=ni(t);return e||{}}function ci(t){let e={};for(const i of t){switch(i.stem){case"percent":case"%":e.style="percent";continue;case"%x100":e.style="percent",e.scale=100;continue;case"currency":e.style="currency",e.currency=i.options[0];continue;case"group-off":case",_":e.useGrouping=!1;continue;case"precision-integer":case".":e.maximumFractionDigits=0;continue;case"measure-unit":case"unit":e.style="unit",e.unit=ti(i.options[0]);continue;case"compact-short":case"K":e.notation="compact",e.compactDisplay="short";continue;case"compact-long":case"KK":e.notation="compact",e.compactDisplay="long";continue;case"scientific":e={...e,notation:"scientific",...i.options.reduce((t,e)=>({...t,...li(e)}),{})};continue;case"engineering":e={...e,notation:"engineering",...i.options.reduce((t,e)=>({...t,...li(e)}),{})};continue;case"notation-simple":e.notation="standard";continue;case"unit-width-narrow":e.currencyDisplay="narrowSymbol",e.unitDisplay="narrow";continue;case"unit-width-short":e.currencyDisplay="code",e.unitDisplay="short";continue;case"unit-width-full-name":e.currencyDisplay="name",e.unitDisplay="long";continue;case"unit-width-iso-code":e.currencyDisplay="symbol";continue;case"scale":e.scale=parseFloat(i.options[0]);continue;case"rounding-mode-floor":e.roundingMode="floor";continue;case"rounding-mode-ceiling":e.roundingMode="ceil";continue;case"rounding-mode-down":e.roundingMode="trunc";continue;case"rounding-mode-up":e.roundingMode="expand";continue;case"rounding-mode-half-even":e.roundingMode="halfEven";continue;case"rounding-mode-half-down":e.roundingMode="halfTrunc";continue;case"rounding-mode-half-up":e.roundingMode="halfExpand";continue;case"integer-width":if(i.options.length>1)throw new RangeError("integer-width stems only accept a single optional option");i.options[0].replace(si,function(t,i,s,o,r,n){if(i)e.minimumIntegerDigits=s.length;else{if(o&&r)throw new Error("We currently do not support maximum integer digits");if(n)throw new Error("We currently do not support exact integer digits")}return""});continue}if(oi.test(i.stem)){e.minimumIntegerDigits=i.stem.length;continue}if(ei.test(i.stem)){if(i.options.length>1)throw new RangeError("Fraction-precision stems only accept a single optional option");i.stem.replace(ei,function(t,i,s,o,r,n){return"*"===s?e.minimumFractionDigits=i.length:o&&"#"===o[0]?e.maximumFractionDigits=o.length:r&&n?(e.minimumFractionDigits=r.length,e.maximumFractionDigits=r.length+n.length):(e.minimumFractionDigits=i.length,e.maximumFractionDigits=i.length),""});const t=i.options[0];"w"===t?e={...e,trailingZeroDisplay:"stripIfInteger"}:t&&(e={...e,...ri(t)});continue}if(ii.test(i.stem)){e={...e,...ri(i.stem)};continue}const t=ni(i.stem);t&&(e={...e,...t});const s=ai(i.stem);s&&(e={...e,...s})}return e}let hi=function(t){return t[t.literal=0]="literal",t[t.argument=1]="argument",t[t.number=2]="number",t[t.date=3]="date",t[t.time=4]="time",t[t.select=5]="select",t[t.plural=6]="plural",t[t.pound=7]="pound",t[t.tag=8]="tag",t}({}),di=function(t){return t[t.number=0]="number",t[t.dateTime=1]="dateTime",t}({});function pi(t){return t.type===hi.literal}function ui(t){return t.type===hi.argument}function gi(t){return t.type===hi.number}function fi(t){return t.type===hi.date}function mi(t){return t.type===hi.time}function _i(t){return t.type===hi.select}function vi(t){return t.type===hi.plural}function bi(t){return t.type===hi.pound}function yi(t){return t.type===hi.tag}function xi(t){return!(!t||"object"!=typeof t||t.type!==di.number)}function wi(t){return!(!t||"object"!=typeof t||t.type!==di.dateTime)}let $i=function(t){return t[t.EXPECT_ARGUMENT_CLOSING_BRACE=1]="EXPECT_ARGUMENT_CLOSING_BRACE",t[t.EMPTY_ARGUMENT=2]="EMPTY_ARGUMENT",t[t.MALFORMED_ARGUMENT=3]="MALFORMED_ARGUMENT",t[t.EXPECT_ARGUMENT_TYPE=4]="EXPECT_ARGUMENT_TYPE",t[t.INVALID_ARGUMENT_TYPE=5]="INVALID_ARGUMENT_TYPE",t[t.EXPECT_ARGUMENT_STYLE=6]="EXPECT_ARGUMENT_STYLE",t[t.INVALID_NUMBER_SKELETON=7]="INVALID_NUMBER_SKELETON",t[t.INVALID_DATE_TIME_SKELETON=8]="INVALID_DATE_TIME_SKELETON",t[t.EXPECT_NUMBER_SKELETON=9]="EXPECT_NUMBER_SKELETON",t[t.EXPECT_DATE_TIME_SKELETON=10]="EXPECT_DATE_TIME_SKELETON",t[t.UNCLOSED_QUOTE_IN_ARGUMENT_STYLE=11]="UNCLOSED_QUOTE_IN_ARGUMENT_STYLE",t[t.EXPECT_SELECT_ARGUMENT_OPTIONS=12]="EXPECT_SELECT_ARGUMENT_OPTIONS",t[t.EXPECT_PLURAL_ARGUMENT_OFFSET_VALUE=13]="EXPECT_PLURAL_ARGUMENT_OFFSET_VALUE",t[t.INVALID_PLURAL_ARGUMENT_OFFSET_VALUE=14]="INVALID_PLURAL_ARGUMENT_OFFSET_VALUE",t[t.EXPECT_SELECT_ARGUMENT_SELECTOR=15]="EXPECT_SELECT_ARGUMENT_SELECTOR",t[t.EXPECT_PLURAL_ARGUMENT_SELECTOR=16]="EXPECT_PLURAL_ARGUMENT_SELECTOR",t[t.EXPECT_SELECT_ARGUMENT_SELECTOR_FRAGMENT=17]="EXPECT_SELECT_ARGUMENT_SELECTOR_FRAGMENT",t[t.EXPECT_PLURAL_ARGUMENT_SELECTOR_FRAGMENT=18]="EXPECT_PLURAL_ARGUMENT_SELECTOR_FRAGMENT",t[t.INVALID_PLURAL_ARGUMENT_SELECTOR=19]="INVALID_PLURAL_ARGUMENT_SELECTOR",t[t.DUPLICATE_PLURAL_ARGUMENT_SELECTOR=20]="DUPLICATE_PLURAL_ARGUMENT_SELECTOR",t[t.DUPLICATE_SELECT_ARGUMENT_SELECTOR=21]="DUPLICATE_SELECT_ARGUMENT_SELECTOR",t[t.MISSING_OTHER_CLAUSE=22]="MISSING_OTHER_CLAUSE",t[t.INVALID_TAG=23]="INVALID_TAG",t[t.INVALID_TAG_NAME=25]="INVALID_TAG_NAME",t[t.UNMATCHED_CLOSING_TAG=26]="UNMATCHED_CLOSING_TAG",t[t.UNCLOSED_TAG=27]="UNCLOSED_TAG",t}({});const zi=/[ \xA0\u1680\u2000-\u200A\u202F\u205F\u3000]/,ki={"001":["H","h"],419:["h","H","hB","hb"],AC:["H","h","hb","hB"],AD:["H","hB"],AE:["h","hB","hb","H"],AF:["H","hb","hB","h"],AG:["h","hb","H","hB"],AI:["H","h","hb","hB"],AL:["h","H","hB"],AM:["H","hB"],AO:["H","hB"],AR:["h","H","hB","hb"],AS:["h","H"],AT:["H","hB"],AU:["h","hb","H","hB"],AW:["H","hB"],AX:["H"],AZ:["H","hB","h"],BA:["H","hB","h"],BB:["h","hb","H","hB"],BD:["h","hB","H"],BE:["H","hB"],BF:["H","hB"],BG:["H","hB","h"],BH:["h","hB","hb","H"],BI:["H","h"],BJ:["H","hB"],BL:["H","hB"],BM:["h","hb","H","hB"],BN:["hb","hB","h","H"],BO:["h","H","hB","hb"],BQ:["H"],BR:["H","hB"],BS:["h","hb","H","hB"],BT:["h","H"],BW:["H","h","hb","hB"],BY:["H","h"],BZ:["H","h","hb","hB"],CA:["h","hb","H","hB"],CC:["H","h","hb","hB"],CD:["hB","H"],CF:["H","h","hB"],CG:["H","hB"],CH:["H","hB","h"],CI:["H","hB"],CK:["H","h","hb","hB"],CL:["h","H","hB","hb"],CM:["H","h","hB"],CN:["H","hB","hb","h"],CO:["h","H","hB","hb"],CP:["H"],CR:["h","H","hB","hb"],CU:["h","H","hB","hb"],CV:["H","hB"],CW:["H","hB"],CX:["H","h","hb","hB"],CY:["h","H","hb","hB"],CZ:["H"],DE:["H","hB"],DG:["H","h","hb","hB"],DJ:["h","H"],DK:["H"],DM:["h","hb","H","hB"],DO:["h","H","hB","hb"],DZ:["h","hB","hb","H"],EA:["H","h","hB","hb"],EC:["h","H","hB","hb"],EE:["H","hB"],EG:["h","hB","hb","H"],EH:["h","hB","hb","H"],ER:["h","H"],ES:["H","hB","h","hb"],ET:["hB","hb","h","H"],FI:["H"],FJ:["h","hb","H","hB"],FK:["H","h","hb","hB"],FM:["h","hb","H","hB"],FO:["H","h"],FR:["H","hB"],GA:["H","hB"],GB:["H","h","hb","hB"],GD:["h","hb","H","hB"],GE:["H","hB","h"],GF:["H","hB"],GG:["H","h","hb","hB"],GH:["h","H"],GI:["H","h","hb","hB"],GL:["H","h"],GM:["h","hb","H","hB"],GN:["H","hB"],GP:["H","hB"],GQ:["H","hB","h","hb"],GR:["h","H","hb","hB"],GS:["H","h","hb","hB"],GT:["h","H","hB","hb"],GU:["h","hb","H","hB"],GW:["H","hB"],GY:["h","hb","H","hB"],HK:["h","hB","hb","H"],HN:["h","H","hB","hb"],HR:["H","hB"],HU:["H","h"],IC:["H","h","hB","hb"],ID:["H"],IE:["H","h","hb","hB"],IL:["H","hB"],IM:["H","h","hb","hB"],IN:["h","H"],IO:["H","h","hb","hB"],IQ:["h","hB","hb","H"],IR:["hB","H"],IS:["H"],IT:["H","hB"],JE:["H","h","hb","hB"],JM:["h","hb","H","hB"],JO:["h","hB","hb","H"],JP:["H","K","h"],KE:["hB","hb","H","h"],KG:["H","h","hB","hb"],KH:["hB","h","H","hb"],KI:["h","hb","H","hB"],KM:["H","h","hB","hb"],KN:["h","hb","H","hB"],KP:["h","H","hB","hb"],KR:["h","H","hB","hb"],KW:["h","hB","hb","H"],KY:["h","hb","H","hB"],KZ:["H","hB"],LA:["H","hb","hB","h"],LB:["h","hB","hb","H"],LC:["h","hb","H","hB"],LI:["H","hB","h"],LK:["H","h","hB","hb"],LR:["h","hb","H","hB"],LS:["h","H"],LT:["H","h","hb","hB"],LU:["H","h","hB"],LV:["H","hB","hb","h"],LY:["h","hB","hb","H"],MA:["H","h","hB","hb"],MC:["H","hB"],MD:["H","hB"],ME:["H","hB","h"],MF:["H","hB"],MG:["H","h"],MH:["h","hb","H","hB"],MK:["H","h","hb","hB"],ML:["H"],MM:["hB","hb","H","h"],MN:["H","h","hb","hB"],MO:["h","hB","hb","H"],MP:["h","hb","H","hB"],MQ:["H","hB"],MR:["h","hB","hb","H"],MS:["H","h","hb","hB"],MT:["H","h"],MU:["H","h"],MV:["H","h"],MW:["h","hb","H","hB"],MX:["h","H","hB","hb"],MY:["hb","hB","h","H"],MZ:["H","hB"],NA:["h","H","hB","hb"],NC:["H","hB"],NE:["H"],NF:["H","h","hb","hB"],NG:["H","h","hb","hB"],NI:["h","H","hB","hb"],NL:["H","hB"],NO:["H","h"],NP:["H","h","hB"],NR:["H","h","hb","hB"],NU:["H","h","hb","hB"],NZ:["h","hb","H","hB"],OM:["h","hB","hb","H"],PA:["h","H","hB","hb"],PE:["h","H","hB","hb"],PF:["H","h","hB"],PG:["h","H"],PH:["h","hB","hb","H"],PK:["h","hB","H"],PL:["H","h"],PM:["H","hB"],PN:["H","h","hb","hB"],PR:["h","H","hB","hb"],PS:["h","hB","hb","H"],PT:["H","hB"],PW:["h","H"],PY:["h","H","hB","hb"],QA:["h","hB","hb","H"],RE:["H","hB"],RO:["H","hB"],RS:["H","hB","h"],RU:["H"],RW:["H","h"],SA:["h","hB","hb","H"],SB:["h","hb","H","hB"],SC:["H","h","hB"],SD:["h","hB","hb","H"],SE:["H"],SG:["h","hb","H","hB"],SH:["H","h","hb","hB"],SI:["H","hB"],SJ:["H"],SK:["H"],SL:["h","hb","H","hB"],SM:["H","h","hB"],SN:["H","h","hB"],SO:["h","H"],SR:["H","hB"],SS:["h","hb","H","hB"],ST:["H","hB"],SV:["h","H","hB","hb"],SX:["H","h","hb","hB"],SY:["h","hB","hb","H"],SZ:["h","hb","H","hB"],TA:["H","h","hb","hB"],TC:["h","hb","H","hB"],TD:["h","H","hB"],TF:["H","h","hB"],TG:["H","hB"],TH:["H","h"],TJ:["H","h"],TL:["H","hB","hb","h"],TM:["H","h"],TN:["h","hB","hb","H"],TO:["h","H"],TR:["H","hB"],TT:["h","hb","H","hB"],TW:["hB","hb","h","H"],TZ:["hB","hb","H","h"],UA:["H","hB","h"],UG:["hB","hb","H","h"],UM:["h","hb","H","hB"],US:["h","hb","H","hB"],UY:["h","H","hB","hb"],UZ:["H","hB","h"],VA:["H","h","hB"],VC:["h","hb","H","hB"],VE:["h","H","hB","hb"],VG:["h","hb","H","hB"],VI:["h","hb","H","hB"],VN:["H","h"],VU:["h","H"],WF:["H","hB"],WS:["h","H"],XK:["H","hB","h"],YE:["h","hB","hb","H"],YT:["H","hB"],ZA:["H","h","hb","hB"],ZM:["h","hb","H","hB"],ZW:["H","h"],"af-ZA":["H","h","hB","hb"],"ar-001":["h","hB","hb","H"],"ca-ES":["H","h","hB"],"en-001":["h","hb","H","hB"],"en-HK":["h","hb","H","hB"],"en-IL":["H","h","hb","hB"],"en-MY":["h","hb","H","hB"],"es-BR":["H","h","hB","hb"],"es-ES":["H","h","hB","hb"],"es-GQ":["H","h","hB","hb"],"fr-CA":["H","h","hB"],"gl-ES":["H","h","hB"],"gu-IN":["hB","hb","h","H"],"hi-IN":["hB","h","H"],"it-CH":["H","h","hB"],"it-IT":["H","h","hB"],"kn-IN":["hB","h","H"],"ku-SY":["H","hB"],"ml-IN":["hB","h","H"],"mr-IN":["hB","hb","h","H"],"pa-IN":["hB","hb","h","H"],"ta-IN":["hB","h","hb","H"],"te-IN":["hB","h","H"],"zu-ZA":["H","hB","hb","h"]};function Ci(t){let e=t.hourCycle;if(void 0===e&&t.hourCycles&&t.hourCycles.length&&(e=t.hourCycles[0]),e)switch(e){case"h24":return"k";case"h23":return"H";case"h12":return"h";case"h11":return"K";default:throw new Error("Invalid hourCycle")}const i=t.language;let s;"root"!==i&&(s=t.maximize().region);return(ki[s||""]||ki[i||""]||ki[`${i}-001`]||ki["001"])[0]}const Ti=new RegExp(`^${zi.source}*`),Ei=new RegExp(`${zi.source}*$`);function Mi(t,e){return{start:t,end:e}}const Si=!!Object.fromEntries,Di=!!String.prototype.trimStart,Ai=!!String.prototype.trimEnd,Pi=Si?Object.fromEntries:function(t){const e={};for(const[i,s]of t)e[i]=s;return e},Hi=Di?function(t){return t.trimStart()}:function(t){return t.replace(Ti,"")},Ri=Ai?function(t){return t.trimEnd()}:function(t){return t.replace(Ei,"")},Bi=new RegExp("([^\\p{White_Space}\\p{Pattern_Syntax}]*)","yu");class Li{message;position;locale;ignoreTag;requiresOtherClause;shouldParseSkeletons;constructor(t,e={}){this.message=t,this.position={offset:0,line:1,column:1},this.ignoreTag=!!e.ignoreTag,this.locale=e.locale,this.requiresOtherClause=!!e.requiresOtherClause,this.shouldParseSkeletons=!!e.shouldParseSkeletons}parse(){if(0!==this.offset())throw Error("parser can only be used once");return this.parseMessage(0,"",!1)}parseMessage(t,e,i){let s=[];for(;!this.isEOF();){const o=this.char();if(123===o){const e=this.parseArgument(t,i);if(e.err)return e;s.push(e.val)}else{if(125===o&&t>0)break;if(35!==o||"plural"!==e&&"selectordinal"!==e){if(60===o&&!this.ignoreTag&&47===this.peek()){if(i)break;return this.error($i.UNMATCHED_CLOSING_TAG,Mi(this.clonePosition(),this.clonePosition()))}if(60===o&&!this.ignoreTag&&Ii(this.peek()||0)){const i=this.parseTag(t,e);if(i.err)return i;s.push(i.val)}else{const i=this.parseLiteral(t,e);if(i.err)return i;s.push(i.val)}}else{const t=this.clonePosition();this.bump(),s.push({type:hi.pound,location:Mi(t,this.clonePosition())})}}}return{val:s,err:null}}parseTag(t,e){const i=this.clonePosition();this.bump();const s=this.parseTagName();if(this.bumpSpace(),this.bumpIf("/>"))return{val:{type:hi.literal,value:`<${s}/>`,location:Mi(i,this.clonePosition())},err:null};if(this.bumpIf(">")){const o=this.parseMessage(t+1,e,!0);if(o.err)return o;const r=o.val,n=this.clonePosition();if(this.bumpIf("</")){if(this.isEOF()||!Ii(this.char()))return this.error($i.INVALID_TAG,Mi(n,this.clonePosition()));const t=this.clonePosition();return s!==this.parseTagName()?this.error($i.UNMATCHED_CLOSING_TAG,Mi(t,this.clonePosition())):(this.bumpSpace(),this.bumpIf(">")?{val:{type:hi.tag,value:s,children:r,location:Mi(i,this.clonePosition())},err:null}:this.error($i.INVALID_TAG,Mi(n,this.clonePosition())))}return this.error($i.UNCLOSED_TAG,Mi(i,this.clonePosition()))}return this.error($i.INVALID_TAG,Mi(i,this.clonePosition()))}parseTagName(){const t=this.offset();for(this.bump();!this.isEOF()&&Oi(this.char());)this.bump();return this.message.slice(t,this.offset())}parseLiteral(t,e){const i=this.clonePosition();let s="";for(;;){const i=this.tryParseQuote(e);if(i){s+=i;continue}const o=this.tryParseUnquoted(t,e);if(o){s+=o;continue}const r=this.tryParseLeftAngleBracket();if(!r)break;s+=r}const o=Mi(i,this.clonePosition());return{val:{type:hi.literal,value:s,location:o},err:null}}tryParseLeftAngleBracket(){return this.isEOF()||60!==this.char()||!this.ignoreTag&&(Ii(t=this.peek()||0)||47===t)?null:(this.bump(),"<");var t}tryParseQuote(t){if(this.isEOF()||39!==this.char())return null;switch(this.peek()){case 39:return this.bump(),this.bump(),"'";case 123:case 60:case 62:case 125:break;case 35:if("plural"===t||"selectordinal"===t)break;return null;default:return null}this.bump();const e=[this.char()];for(this.bump();!this.isEOF();){const t=this.char();if(39===t){if(39!==this.peek()){this.bump();break}e.push(39),this.bump()}else e.push(t);this.bump()}return String.fromCodePoint(...e)}tryParseUnquoted(t,e){if(this.isEOF())return null;const i=this.char();return 60===i||123===i||35===i&&("plural"===e||"selectordinal"===e)||125===i&&t>0?null:(this.bump(),String.fromCodePoint(i))}parseArgument(t,e){const i=this.clonePosition();if(this.bump(),this.bumpSpace(),this.isEOF())return this.error($i.EXPECT_ARGUMENT_CLOSING_BRACE,Mi(i,this.clonePosition()));if(125===this.char())return this.bump(),this.error($i.EMPTY_ARGUMENT,Mi(i,this.clonePosition()));let s=this.parseIdentifierIfPossible().value;if(!s)return this.error($i.MALFORMED_ARGUMENT,Mi(i,this.clonePosition()));if(this.bumpSpace(),this.isEOF())return this.error($i.EXPECT_ARGUMENT_CLOSING_BRACE,Mi(i,this.clonePosition()));switch(this.char()){case 125:return this.bump(),{val:{type:hi.argument,value:s,location:Mi(i,this.clonePosition())},err:null};case 44:return this.bump(),this.bumpSpace(),this.isEOF()?this.error($i.EXPECT_ARGUMENT_CLOSING_BRACE,Mi(i,this.clonePosition())):this.parseArgumentOptions(t,e,s,i);default:return this.error($i.MALFORMED_ARGUMENT,Mi(i,this.clonePosition()))}}parseIdentifierIfPossible(){const t=this.clonePosition(),e=this.offset(),i=function(t,e){return Bi.lastIndex=e,Bi.exec(t)[1]??""}(this.message,e),s=e+i.length;this.bumpTo(s);return{value:i,location:Mi(t,this.clonePosition())}}parseArgumentOptions(t,e,i,s){let o=this.clonePosition(),r=this.parseIdentifierIfPossible().value,n=this.clonePosition();switch(r){case"":return this.error($i.EXPECT_ARGUMENT_TYPE,Mi(o,n));case"number":case"date":case"time":{this.bumpSpace();let t=null;if(this.bumpIf(",")){this.bumpSpace();const e=this.clonePosition(),i=this.parseSimpleArgStyleIfPossible();if(i.err)return i;const s=Ri(i.val);if(0===s.length)return this.error($i.EXPECT_ARGUMENT_STYLE,Mi(this.clonePosition(),this.clonePosition()));t={style:s,styleLocation:Mi(e,this.clonePosition())}}const e=this.tryParseArgumentClose(s);if(e.err)return e;const o=Mi(s,this.clonePosition());if(t&&t.style.startsWith("::")){let e=Hi(t.style.slice(2));if("number"===r){const s=this.parseNumberSkeletonFromString(e,t.styleLocation);return s.err?s:{val:{type:hi.number,value:i,location:o,style:s.val},err:null}}{if(0===e.length)return this.error($i.EXPECT_DATE_TIME_SKELETON,o);let s=e;this.locale&&(s=function(t,e){let i="";for(let s=0;s<t.length;s++){const o=t.charAt(s);if("j"===o){let r=0;for(;s+1<t.length&&t.charAt(s+1)===o;)r++,s++;let n=1+(1&r),a=r<2?1:3+(r>>1),l="a",c=Ci(e);for("H"!=c&&"k"!=c||(a=0);a-- >0;)i+=l;for(;n-- >0;)i=c+i}else i+="J"===o?"H":o}return i}(e,this.locale));const n={type:di.dateTime,pattern:s,location:t.styleLocation,parsedOptions:this.shouldParseSkeletons?Je(s):{}};return{val:{type:"date"===r?hi.date:hi.time,value:i,location:o,style:n},err:null}}}return{val:{type:"number"===r?hi.number:"date"===r?hi.date:hi.time,value:i,location:o,style:t?.style??null},err:null}}case"plural":case"selectordinal":case"select":{const o=this.clonePosition();if(this.bumpSpace(),!this.bumpIf(","))return this.error($i.EXPECT_SELECT_ARGUMENT_OPTIONS,Mi(o,{...o}));this.bumpSpace();let n=this.parseIdentifierIfPossible(),a=0;if("select"!==r&&"offset"===n.value){if(!this.bumpIf(":"))return this.error($i.EXPECT_PLURAL_ARGUMENT_OFFSET_VALUE,Mi(this.clonePosition(),this.clonePosition()));this.bumpSpace();const t=this.tryParseDecimalInteger($i.EXPECT_PLURAL_ARGUMENT_OFFSET_VALUE,$i.INVALID_PLURAL_ARGUMENT_OFFSET_VALUE);if(t.err)return t;this.bumpSpace(),n=this.parseIdentifierIfPossible(),a=t.val}const l=this.tryParsePluralOrSelectOptions(t,r,e,n);if(l.err)return l;const c=this.tryParseArgumentClose(s);if(c.err)return c;const h=Mi(s,this.clonePosition());return"select"===r?{val:{type:hi.select,value:i,options:Pi(l.val),location:h},err:null}:{val:{type:hi.plural,value:i,options:Pi(l.val),offset:a,pluralType:"plural"===r?"cardinal":"ordinal",location:h},err:null}}default:return this.error($i.INVALID_ARGUMENT_TYPE,Mi(o,n))}}tryParseArgumentClose(t){return this.isEOF()||125!==this.char()?this.error($i.EXPECT_ARGUMENT_CLOSING_BRACE,Mi(t,this.clonePosition())):(this.bump(),{val:!0,err:null})}parseSimpleArgStyleIfPossible(){let t=0;const e=this.clonePosition();for(;!this.isEOF();){switch(this.char()){case 39:{this.bump();let t=this.clonePosition();if(!this.bumpUntil("'"))return this.error($i.UNCLOSED_QUOTE_IN_ARGUMENT_STYLE,Mi(t,this.clonePosition()));this.bump();break}case 123:t+=1,this.bump();break;case 125:if(!(t>0))return{val:this.message.slice(e.offset,this.offset()),err:null};t-=1;break;default:this.bump()}}return{val:this.message.slice(e.offset,this.offset()),err:null}}parseNumberSkeletonFromString(t,e){let i=[];try{i=function(t){if(0===t.length)throw new Error("Number skeleton cannot be empty");const e=t.split(Qe).filter(t=>t.length>0),i=[];for(const t of e){let e=t.split("/");if(0===e.length)throw new Error("Invalid number skeleton");const[s,...o]=e;for(const t of o)if(0===t.length)throw new Error("Invalid number skeleton");i.push({stem:s,options:o})}return i}(t)}catch{return this.error($i.INVALID_NUMBER_SKELETON,e)}return{val:{type:di.number,tokens:i,location:e,parsedOptions:this.shouldParseSkeletons?ci(i):{}},err:null}}tryParsePluralOrSelectOptions(t,e,i,s){let o=!1;const r=[],n=new Set;let{value:a,location:l}=s;for(;;){if(0===a.length){const t=this.clonePosition();if("select"===e||!this.bumpIf("="))break;{const e=this.tryParseDecimalInteger($i.EXPECT_PLURAL_ARGUMENT_SELECTOR,$i.INVALID_PLURAL_ARGUMENT_SELECTOR);if(e.err)return e;l=Mi(t,this.clonePosition()),a=this.message.slice(t.offset,this.offset())}}if(n.has(a))return this.error("select"===e?$i.DUPLICATE_SELECT_ARGUMENT_SELECTOR:$i.DUPLICATE_PLURAL_ARGUMENT_SELECTOR,l);"other"===a&&(o=!0),this.bumpSpace();const s=this.clonePosition();if(!this.bumpIf("{"))return this.error("select"===e?$i.EXPECT_SELECT_ARGUMENT_SELECTOR_FRAGMENT:$i.EXPECT_PLURAL_ARGUMENT_SELECTOR_FRAGMENT,Mi(this.clonePosition(),this.clonePosition()));const c=this.parseMessage(t+1,e,i);if(c.err)return c;const h=this.tryParseArgumentClose(s);if(h.err)return h;r.push([a,{value:c.val,location:Mi(s,this.clonePosition())}]),n.add(a),this.bumpSpace(),({value:a,location:l}=this.parseIdentifierIfPossible())}return 0===r.length?this.error("select"===e?$i.EXPECT_SELECT_ARGUMENT_SELECTOR:$i.EXPECT_PLURAL_ARGUMENT_SELECTOR,Mi(this.clonePosition(),this.clonePosition())):this.requiresOtherClause&&!o?this.error($i.MISSING_OTHER_CLAUSE,Mi(this.clonePosition(),this.clonePosition())):{val:r,err:null}}tryParseDecimalInteger(t,e){let i=1;const s=this.clonePosition();this.bumpIf("+")||this.bumpIf("-")&&(i=-1);let o=!1,r=0;for(;!this.isEOF();){const t=this.char();if(!(t>=48&&t<=57))break;o=!0,r=10*r+(t-48),this.bump()}const n=Mi(s,this.clonePosition());return o?(r*=i,Number.isSafeInteger(r)?{val:r,err:null}:this.error(e,n)):this.error(t,n)}offset(){return this.position.offset}isEOF(){return this.offset()===this.message.length}clonePosition(){return{offset:this.position.offset,line:this.position.line,column:this.position.column}}char(){const t=this.position.offset;if(t>=this.message.length)throw Error("out of bound");const e=this.message.codePointAt(t);if(void 0===e)throw Error(`Offset ${t} is at invalid UTF-16 code unit boundary`);return e}error(t,e){return{val:null,err:{kind:t,message:this.message,location:e}}}bump(){if(this.isEOF())return;const t=this.char();10===t?(this.position.line+=1,this.position.column=1,this.position.offset+=1):(this.position.column+=1,this.position.offset+=t<65536?1:2)}bumpIf(t){if(this.message.startsWith(t,this.offset())){for(let e=0;e<t.length;e++)this.bump();return!0}return!1}bumpUntil(t){const e=this.offset(),i=this.message.indexOf(t,e);return i>=0?(this.bumpTo(i),!0):(this.bumpTo(this.message.length),!1)}bumpTo(t){if(this.offset()>t)throw Error(`targetOffset ${t} must be greater than or equal to the current offset ${this.offset()}`);for(t=Math.min(t,this.message.length);;){const e=this.offset();if(e===t)break;if(e>t)throw Error(`targetOffset ${t} is at invalid UTF-16 code unit boundary`);if(this.bump(),this.isEOF())break}}bumpSpace(){for(;!this.isEOF()&&Ni(this.char());)this.bump()}peek(){if(this.isEOF())return null;const t=this.char(),e=this.offset();return this.message.charCodeAt(e+(t>=65536?2:1))??null}}function Ii(t){return t>=97&&t<=122||t>=65&&t<=90}function Oi(t){return 45===t||46===t||t>=48&&t<=57||95===t||t>=97&&t<=122||t>=65&&t<=90||183==t||t>=192&&t<=214||t>=216&&t<=246||t>=248&&t<=893||t>=895&&t<=8191||t>=8204&&t<=8205||t>=8255&&t<=8256||t>=8304&&t<=8591||t>=11264&&t<=12271||t>=12289&&t<=55295||t>=63744&&t<=64975||t>=65008&&t<=65533||t>=65536&&t<=983039}function Ni(t){return t>=9&&t<=13||32===t||133===t||t>=8206&&t<=8207||8232===t||8233===t}function Fi(t){t.forEach(t=>{if(delete t.location,_i(t)||vi(t))for(const e in t.options)delete t.options[e].location,Fi(t.options[e].value);else gi(t)&&xi(t.style)||(fi(t)||mi(t))&&wi(t.style)?delete t.style.location:yi(t)&&Fi(t.children)})}function Ui(t,e={}){e={shouldParseSkeletons:!0,requiresOtherClause:!0,...e};const i=new Li(t,e).parse();if(i.err){const t=SyntaxError($i[i.err.kind]);throw t.location=i.err.location,t.originalMessage=i.err.message,t}return e?.captureLocation||Fi(i.val),i.val}let Wi=function(t){return t.MISSING_VALUE="MISSING_VALUE",t.INVALID_VALUE="INVALID_VALUE",t.MISSING_INTL_API="MISSING_INTL_API",t}({});class Gi extends Error{code;originalMessage;constructor(t,e,i){super(t),this.code=e,this.originalMessage=i}toString(){return`[formatjs Error: ${this.code}] ${this.message}`}}class Zi extends Gi{constructor(t,e,i,s){super(`Invalid values for "${t}": "${e}". Options are "${Object.keys(i).join('", "')}"`,Wi.INVALID_VALUE,s)}}class Vi extends Gi{constructor(t,e,i){super(`Value for "${t}" must be of type ${e}`,Wi.INVALID_VALUE,i)}}class ji extends Gi{constructor(t,e){super(`The intl string context variable "${t}" was not provided to the string "${e}"`,Wi.MISSING_VALUE,e)}}let Xi=function(t){return t[t.literal=0]="literal",t[t.object=1]="object",t}({});function Yi(t){return"function"==typeof t}function qi(t,e,i,s,o,r,n){if(1===t.length&&pi(t[0]))return[{type:Xi.literal,value:t[0].value}];const a=[];for(const l of t){if(pi(l)){a.push({type:Xi.literal,value:l.value});continue}if(bi(l)){"number"==typeof r&&a.push({type:Xi.literal,value:i.getNumberFormat(e).format(r)});continue}const{value:t}=l;if(!o||!(t in o))throw new ji(t,n);let c=o[t];if(ui(l))c&&"string"!=typeof c&&"number"!=typeof c&&"bigint"!=typeof c||(c="string"==typeof c||"number"==typeof c||"bigint"==typeof c?String(c):""),a.push({type:"string"==typeof c?Xi.literal:Xi.object,value:c});else{if(fi(l)){const t="string"==typeof l.style?s.date[l.style]:wi(l.style)?l.style.parsedOptions:void 0;a.push({type:Xi.literal,value:i.getDateTimeFormat(e,t).format(c)});continue}if(mi(l)){const t="string"==typeof l.style?s.time[l.style]:wi(l.style)?l.style.parsedOptions:s.time.medium;a.push({type:Xi.literal,value:i.getDateTimeFormat(e,t).format(c)});continue}if(gi(l)){const t="string"==typeof l.style?s.number[l.style]:xi(l.style)?l.style.parsedOptions:void 0;if(t&&t.scale){const e=t.scale||1;if("bigint"==typeof c){if(!Number.isInteger(e))throw new TypeError(`Cannot apply fractional scale ${e} to bigint value. Scale must be an integer when formatting bigint.`);c*=BigInt(e)}else c*=e}a.push({type:Xi.literal,value:i.getNumberFormat(e,t).format(c)});continue}if(yi(l)){const{children:t,value:c}=l,h=o[c];if(!Yi(h))throw new Vi(c,"function",n);let d=h(qi(t,e,i,s,o,r).map(t=>t.value));Array.isArray(d)||(d=[d]),a.push(...d.map(t=>({type:"string"==typeof t?Xi.literal:Xi.object,value:t})))}if(_i(l)){const t=c,r=(Object.prototype.hasOwnProperty.call(l.options,t)?l.options[t]:void 0)||l.options.other;if(!r)throw new Zi(l.value,c,Object.keys(l.options),n);a.push(...qi(r.value,e,i,s,o));continue}if(vi(l)){const t=`=${c}`;let r=Object.prototype.hasOwnProperty.call(l.options,t)?l.options[t]:void 0;if(!r){if(!Intl.PluralRules)throw new Gi('Intl.PluralRules is not available in this environment.\nTry polyfilling it using "@formatjs/intl-pluralrules"\n',Wi.MISSING_INTL_API,n);const t="bigint"==typeof c?Number(c):c,s=i.getPluralRules(e,{type:l.pluralType}).select(t-(l.offset||0));r=(Object.prototype.hasOwnProperty.call(l.options,s)?l.options[s]:void 0)||l.options.other}if(!r)throw new Zi(l.value,c,Object.keys(l.options),n);const h="bigint"==typeof c?Number(c):c;a.push(...qi(r.value,e,i,s,o,h-(l.offset||0)));continue}}}return(l=a).length<2?l:l.reduce((t,e)=>{const i=t[t.length-1];return i&&i.type===Xi.literal&&e.type===Xi.literal?i.value+=e.value:t.push(e),t},[]);var l}function Ki(t,e){return e?Object.keys(t).reduce((i,s)=>{var o,r;return i[s]=(o=t[s],(r=e[s])?{...o,...r,...Object.keys(o).reduce((t,e)=>(t[e]={...o[e],...r[e]},t),{})}:o),i},{...t}):t}function Ji(t){return{create:()=>({get:e=>t[e],set(e,i){t[e]=i}})}}class Qi{ast;locales;resolvedLocale;formatters;formats;message;formatterCache={number:{},dateTime:{},pluralRules:{}};constructor(t,e=Qi.defaultLocale,i,s){if(this.locales=e,this.resolvedLocale=Qi.resolveLocale(e),"string"==typeof t){if(this.message=t,!Qi.__parse)throw new TypeError("IntlMessageFormat.__parse must be set to process `message` of type `string`");const{...e}=s||{};this.ast=Qi.__parse(t,{...e,locale:this.resolvedLocale})}else this.ast=t;if(!Array.isArray(this.ast))throw new TypeError("A message must be provided as a String or AST.");this.formats=Ki(Qi.formats,i),this.formatters=s&&s.formatters||function(t={number:{},dateTime:{},pluralRules:{}}){return{getNumberFormat:Ue((...t)=>new Intl.NumberFormat(...t),{cache:Ji(t.number),strategy:qe.variadic}),getDateTimeFormat:Ue((...t)=>new Intl.DateTimeFormat(...t),{cache:Ji(t.dateTime),strategy:qe.variadic}),getPluralRules:Ue((...t)=>new Intl.PluralRules(...t),{cache:Ji(t.pluralRules),strategy:qe.variadic})}}(this.formatterCache)}format=t=>{const e=this.formatToParts(t);if(1===e.length)return e[0].value;const i=e.reduce((t,e)=>(t.length&&e.type===Xi.literal&&"string"==typeof t[t.length-1]?t[t.length-1]+=e.value:t.push(e.value),t),[]);return i.length<=1?i[0]||"":i};formatToParts=t=>qi(this.ast,this.locales,this.formatters,this.formats,t,void 0,this.message);resolvedOptions=()=>({locale:this.resolvedLocale?.toString()||Intl.NumberFormat.supportedLocalesOf(this.locales)[0]});getAst=()=>this.ast;static memoizedDefaultLocale=null;static get defaultLocale(){return Qi.memoizedDefaultLocale||(Qi.memoizedDefaultLocale=(new Intl.NumberFormat).resolvedOptions().locale),Qi.memoizedDefaultLocale}static resolveLocale=t=>{if(void 0===Intl.Locale)return;const e=Intl.NumberFormat.supportedLocalesOf(t);return e.length>0?new Intl.Locale(e[0]):new Intl.Locale("string"==typeof t?t:t[0])};static __parse=Ui;static formats={number:{integer:{maximumFractionDigits:0},currency:{style:"currency"},percent:{style:"percent"}},date:{short:{month:"numeric",day:"numeric",year:"2-digit"},medium:{month:"short",day:"numeric",year:"numeric"},long:{month:"long",day:"numeric",year:"numeric"},full:{weekday:"long",month:"long",day:"numeric",year:"numeric"}},time:{short:{hour:"numeric",minute:"numeric"},medium:{hour:"numeric",minute:"numeric",second:"numeric"},long:{hour:"numeric",minute:"numeric",second:"numeric",timeZoneName:"short"},full:{hour:"numeric",minute:"numeric",second:"numeric",timeZoneName:"short"}}}}const ts={en:{common:{save:"Save",saving:"Saving...",cancel:"Cancel",delete:"Delete",close:"Close",add:"Add",remove:"Remove",skip:"Skip",rename:"Rename",discard:"Discard",apply:"Apply",load:"Load",loading:"Loading..."},furniture:{armchair:"Armchair",bath:"Bath",double_bed:"Double bed",single_bed:"Single bed",door_left_swing:"Door (left swing)",door_right_swing:"Door (right swing)",dining_table:"Dining table",round_table:"Round table",lamp:"Lamp",oven_stove:"Oven / stove",plant:"Plant",shower:"Shower",sofa_2_seat:"Sofa (2 seat)",sofa_3_seat:"Sofa (3 seat)",tv:"TV",toilet:"Toilet",counter:"Counter",cupboard:"Cupboard",desk:"Desk",fridge:"Fridge",speaker:"Speaker",window:"Window",custom_icon:"Custom icon",custom:"Custom"},corners:{front_left:"Front-left",front_right:"Front-right",back_right:"Back-right",back_left:"Back-left",left_wall:"left wall",right_wall:"right wall",front_wall:"front wall",back_wall:"back wall"},wizard:{how_calibration_works:"How room calibration works",calibrate_room_size:"Calibrate room size",start_calibration:"Start room size calibration",begin_marking:"Begin marking corners",mark_corner:"Mark {corner}",recording:"Recording... {current}s / {total}s",paused:"Paused — need exactly one target visible",stand_still:"Stand still",no_target:"No target detected. Make sure you are visible to the sensor.",multiple_targets:"Multiple targets detected. Only one person should be in the room during calibration.",save_prompt:"Click Save to store this room's calibration, or click a corner above to re-mark it.",walk_instruction_full:"<strong>Walk to each corner</strong> in order (1 → 2 → 3 → 4) and click Mark. Stand still for a few seconds so the sensor can lock on.",cant_reach:"<strong>Can't reach a corner?</strong> Stand as close as you can and enter the distance from each wall in the offset fields — like corner 4 in the diagram above, where a plant is in the way.",corner_sensor_hint:"In this example, your sensor is mounted in Corner 2, but it can be anywhere. You can stand right in front of it.",walk_instruction:"Walk to each corner of the room and click Mark. The sensor will record your position over {duration} seconds.",corner_step:"Corner {index}/4: Walk to the {corner}",distance_from:"Distance from:",distance_from_side:"Distance from {wall} (cm)",how_to_position:"How to position your sensor",mount_height:"Mount height",mount_height_desc:"Place the sensor <strong>1.5 to 2 meters</strong> from the floor",placement:"Placement",placement_desc:"Place in a <strong>corner or on a wall</strong>, pointing toward the most distant opposite corner",beam_direction:"Beam direction",beam_direction_desc:"Keep the beam <strong>horizontal</strong> — not angled up or down",front_wall_label:"Front wall (sensor side)",back_wall_label:"Back wall",sensor:"Sensor",horizontal_correct:"Horizontal ✓",angled_wrong:"Angled ✗",no_presence:"No presence"},dialogs:{delete_calibration_title:"Delete room calibration?",delete_calibration_body:"This will also delete all detection zones and furniture. This cannot be undone.",unsaved_changes:"You have unsaved changes",unsaved_changes_body:"Your changes will be lost if you navigate away without applying.",update_entity_ids:"Update entity IDs?",update_entity_ids_body:"Zone names changed. Would you like to update the entity IDs to match?",save_template:"Save template",load_template:"Load template",no_templates:"No saved templates.",template_name:"Template name"},menu:{settings:"Settings",room_calibration:"Room size calibration",delete_calibration:"Delete room calibration",detection_zones:"Detection zones",furniture:"Furniture",overlays:"Overlays"},settings:{title:"Settings",detection_ranges:"Detection Ranges",sensor_calibration:"Sensor Calibration",entities:"Entities",target_sensor:"Target Sensor",static_sensor:"Static Sensor",motion_sensor:"Motion Sensor",environmental:"Environmental",auto:"Auto",max_distance:"Max distance",min_distance:"Min distance",presence_timeout:"Presence timeout",trigger_threshold:"Trigger threshold",renew_threshold:"Renew threshold",illuminance_offset:"Illuminance offset",humidity_offset:"Humidity offset",temperature_offset:"Temperature offset",presence_delay:"Presence delay",furthest_point:"Current furthest point from sensor:",logging:"Logging",log_system:"System",log_epp:"Zone Engine",log_led:"LED",log_networking:"Network",log_ble:"Bluetooth",log_co2:"CO2",led_and_relay:"LED and Relay",led:"LED",led_mode:"Mode",led_brightness:"Brightness",led_presence_color:"Occupancy color",manual_control:"Manual Control",presence:"Occupancy",environmental_presence:"Environmental + Occupancy",relay:"Relay",relay_trigger_mode:"Trigger Mode",relay_contact_mode:"Contact Mode",relay_disabled:"Disabled",relay_motion:"Motion Only",relay_presence:"Presence Only",relay_occupancy:"Occupancy",relay_normally_open:"Normally Open (NO)",relay_normally_closed:"Normally Closed (NC)",update_rate:"Update rate"},sidebar:{detection_zones:"Detection zones",furniture:"Furniture",overlays:"Overlays",live_overview:"Live overview",add_zone:"Add zone",rest_of_room:"Rest of room",room:"Room"},zones:{zone_name:"Zone name",type:"Type",normal:"Normal",thoroughfare:"Thoroughfare",rest_area:"Rest area",custom:"Custom",trigger:"Trigger",renew:"Renew",presence_timeout:"Presence timeout",handoff_timeout:"Handoff timeout",seconds_suffix:"s"},overlays:{entry_exit:"Entry / Exit",interference:"Interference",suppress:"Suppress",click_to_paint:"Click to paint"},live:{presence:"Presence",detected:"Detected",clear:"Clear",environment:"Environment",occupancy:"Occupancy",static_presence:"Static presence",motion_presence:"Motion presence",target_presence:"Target presence",target_count:"Target count",delete_target:"Delete target",mark_interference:"Mark as interference source",suppress_detection:"Suppress detection"},entities:{room_level:"Room level",zone_level:"Zone level",target_level:"Target level",occupancy:"Occupancy",static_presence:"Static presence",motion_presence:"Motion presence",target_presence:"Target presence",target_count:"Target count",zone_presence:"Presence",zone_target_count:"Target count",xy_sensor:"XY position, relative to sensor",xy:"XY position",active:"Active",target_signal:"Signal",target_zone:"Zone",distance:"Distance",angle:"Angle",speed:"Speed",resolution:"Resolution",illuminance:"Illuminance",humidity:"Humidity",temperature:"Temperature",co2:"CO₂"},info:{occupancy:"Combined occupancy from all sources — PIR motion, static mmWave presence, and zone tracking. Shows detected if any source detects presence.",static_presence:"mmWave radar detects stationary people by measuring micro-movements like breathing. Works through furniture and blankets.",motion_presence:"Passive infrared sensor detects movement by sensing body heat. Fast response but only triggers on motion, not stationary presence.",target_presence:"Whether any target is actively tracked by the mmWave radar. Detected when at least one target point is being reported.",zone_occupancy:"Zone {slot} occupancy. Currently {count} {count, plural, one {target} other {targets}} detected. Sensitivity determines how many consecutive frames are needed to confirm presence.",rest_of_room_occupancy:"Covers the entire room outside of any defined zones. Currently {count} {count, plural, one {target} other {targets}} detected.",target_auto_range:"Automatically set max distance from room dimensions.",target_max_distance:"Maximum detection distance for the target sensor (LD2450). Hardware limit: 6m.",static_min_distance:"Minimum detection distance for the static sensor.",static_max_distance:"Maximum detection distance for the static sensor. Hardware limit: 16m.",motion_timeout:"Time after last motion before the motion sensor clears.",static_timeout:"Time after last static detection before the sensor clears.",trigger_threshold:"Minimum signal strength needed to initially detect static presence. Higher = harder to trigger.",renew_threshold:"Minimum signal strength needed to maintain static presence detection. Higher = harder to renew.",illuminance_offset:"Adjust the illuminance reading by a fixed amount.",humidity_offset:"Adjust the humidity reading by a fixed amount.",temperature_offset:"Adjust the temperature reading by a fixed amount.",presence_delay:"Delay before reporting presence after initial detection. Helps filter brief false positives.",room_occupancy:"Combined room occupancy from all sensors.",room_static:"mmWave static presence detection.",room_motion:"PIR motion detection.",room_target_presence:"Whether any target is actively tracked.",room_target_count:"Number of targets detected in the room.",zone_presence:"Per-zone occupancy based on target tracking.",zone_target_count:"Number of targets in each zone.",xy_sensor:"Raw XY coordinates from the sensor.",xy:"XY coordinates mapped to the room grid.",active:"Whether each target slot is actively tracking.",target_signal:"Signal strength for each target (higher = stronger detection).",target_zone:"Which zone each target is currently in.",distance:"Distance from sensor to each target.",angle:"Angle from sensor to each target.",speed:"Movement speed of each target.",resolution:"Detection resolution for each target.",illuminance:"BH1750 illuminance sensor.",humidity:"SHTC3 humidity sensor.",temperature:"SHTC3 temperature sensor.",co2:"SCD40 CO₂ sensor (optional module).",log_system:"Framework logs including OTA, API, mDNS, I2C, and sensor drivers.",log_epp:"Zone engine logs — zone detection, target tracking, and configuration.",log_led:"LED control script logs — mode transitions and decision tree.",log_networking:"WiFi or Ethernet connection and DHCP logs.",log_ble:"Bluetooth Low Energy scanner and proxy logs.",log_co2:"CO2 sensor (SCD4x) logs.",led_mode:"Controls the RGB LED behavior. Manual Control disables automatic LED and lets you control it as a standard HA light entity.",led_brightness:"Brightness multiplier for the RGB LED in automatic modes.",led_presence_color:"Color used for occupancy indication when LED is in Occupancy or Environmental + Occupancy mode."},dimensions:{width_cm:"W (cm)",height_cm:"H (cm)",rotation:"Rot"},protocol:{firmware_behind:"This sensor's firmware needs to be updated to work with this version of the integration.",firmware_ahead:"This sensor's firmware is newer than the integration. Update the EPP Grid integration to the latest version.",unavailable:"Device is offline — firmware version cannot be determined.",update_firmware:"Update Firmware"},tabs:{device_configuration:"Device Configuration",flash_firmware:"Flash Firmware"},flasher:{title:"Flash Firmware",devices_on_network:"Devices on Network",no_devices:"No EPP devices found on the network.",no_eppgrid_devices:"No devices with EPP Grid firmware found.",flash_from_tab:"Flash your devices from the Flash Firmware tab",flash:"Flash",offline:"Offline",usb_title:"New Device (USB)",usb_description:"Connect a device via USB to flash firmware and configure WiFi.",usb_connect:"Connect via USB",usb_browser_warning:"USB flashing requires Chrome or Edge browser.",flash_device:"Flash {name}",select_variant:"Select firmware variant:",wifi:"WiFi",ethernet:"Ethernet",confirm_flash:"This will replace the firmware on {name} ({host}). The device will be temporarily unavailable.",cancel:"Cancel",flashing_title:"Flashing Firmware",go_to_config:"Go to Device Configuration",flash_failed:"Flash failed. Device may need USB recovery.",step_removing:"Removing old device...",step_downloading:"Downloading firmware...",step_flashing:"Flashing firmware...",step_rebooting:"Waiting for reboot...",step_adding:"Adding to Home Assistant...",step_complete:"Complete!",original:"Original",eppgrid:"EPP Grid",loading:"Loading devices...",configure_wifi:"Configure WiFi",scan:"Scan",scanning:"Scanning...",select_network:"Click Scan to find networks",select_a_network:"Select a network...",manual_ssid:"Enter SSID manually (hidden network)",enter_ssid:"Enter SSID",wifi_password:"WiFi password",connected_to:"Connected to {ssid}",ip_address:"IP Address: {ip}",continue:"Continue"},connection:{failed:"Cannot connect to device. The sensor supports a maximum of 3 simultaneous connections.",client_count:"{count} client(s) are currently connected.",check_connections:"Check for other browser tabs with this panel open, ESPHome log sessions, or additional Home Assistant instances.",retry:"Retry"}}};function es(t,e){const i=e.split(".");let s=t;for(const t of i){if(null==s||"object"!=typeof s)return;s=s[t]}return"string"==typeof s?s:void 0}class is extends ct{constructor(){super(...arguments),this._deviceCtrl=new Re(this),this._gridCtrl=new Le(this),this._targetCtrl=new Oe(this),this._flasherCtrl=new Be(this),this._localize=t=>t,this._currentLang="",this._grid=new Uint8Array(Ut),this._zoneConfigs=new Array(7).fill(null),this._activeZone=null,this._roomType="normal",this._roomTrigger=De.normal.trigger,this._roomRenew=De.normal.renew,this._roomTimeout=De.normal.timeout,this._roomHandoffTimeout=De.normal.handoff_timeout,this._targetAutoDistance=!0,this._targetMaxDistance=6,this._staticAutoDistance=!0,this._staticMinDistance=.3,this._staticMaxDistance=16,this._temperatureOffset=0,this._humidityOffset=0,this._illuminanceOffset=0,this._motionTimeout=5,this._staticTimeout=30,this._staticTriggerThreshold=3,this._staticRenewThreshold=3,this._staticOnDelay=0,this._logLevels={},this._bluetoothEnabled=!1,this._co2Enabled=!1,this._ledMode="Manual Control",this._ledBrightness=1,this._ledPresenceColor="#CC33FF",this._relayTriggerMode="disabled",this._relayContactMode="no",this._targetUpdateRateMs=1e3,this._zoneUpdateRateMs=1e3,this._entitiesConfig={},this._sidebarTab="zones",this._panelTab="config",this._showDeleteCalibrationDialog=!1,this._showLiveMenu=!1,this._showCustomIconPicker=!1,this._customIconValue="",this._furniture=[],this._selectedFurnitureId=null,this._furnitureClipboard=null,this._dragState=null,this._targets=[],this._rawTargets=[],this._sensorState={occupancy:!1,static_presence:!1,motion_presence:!1,target_presence:!1,illuminance:null,temperature:null,humidity:null,co2:null},this._zoneState={occupancy:{},target_counts:{},frame_count:0},this._showHitCounts=!1,this._showDebugLog=!1,this._debugLogLines=[],this._debugLogPrev=null,this._showBackendDebugLog=!1,this._backendDebugLogLines=[],this._backendDebugLogPrev=null,this._overlayMode=null,this._targetMenu=null,this._dismissedTargets=new Map,this._isPainting=!1,this._justPainted=!1,this._paintAction="set",this._frozenBounds=null,this._saving=!1,this._dirty=!1,this._showUnsavedDialog=!1,this._pendingNavigation=null,this._showTemplateSave=!1,this._showTemplateLoad=!1,this._templateName="",this._devices=[],this._selectedMac="",this._loading=!0,this._setupStep=null,this._view="live",this._openAccordions=new Set,this._perspective=null,this._roomWidth=0,this._roomDepth=0,this._beforeUnloadHandler=t=>{this._dirty&&(t.preventDefault(),t.returnValue="")},this._originalPushState=null,this._originalReplaceState=null,this._interceptNavigation=()=>!!this._dirty&&(this._showUnsavedDialog=!0,this._pendingNavigation=null,!0),this._dismissTooltips=()=>{this.shadowRoot.querySelectorAll(".setting-info-tooltip").forEach(t=>{t.style.display="none"})},this._onKeyDown=t=>{if("editor"!==this._view||"furniture"!==this._sidebarTab)return;if(!this._selectedFurnitureId)return;if(!t.composedPath().some(t=>{if(!(t instanceof HTMLElement))return!1;const e=t.tagName;return"INPUT"===e||"TEXTAREA"===e||"SELECT"===e||t.isContentEditable}))if("Backspace"===t.key||"Delete"===t.key)t.preventDefault(),this._removeFurniture(this._selectedFurnitureId);else if("Escape"===t.key)t.preventDefault(),this._selectedFurnitureId=null;else if("c"===t.key&&(t.ctrlKey||t.metaKey)){const t=this._furniture.find(t=>t.id===this._selectedFurnitureId);t&&(this._furnitureClipboard={...t})}else if("x"===t.key&&(t.ctrlKey||t.metaKey)){const t=this._furniture.find(t=>t.id===this._selectedFurnitureId);t&&(this._furnitureClipboard={...t},this._removeFurniture(t.id))}else if("v"===t.key&&(t.ctrlKey||t.metaKey)){if(!this._furnitureClipboard)return;t.preventDefault();const e=`f_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,i=this._furnitureClipboard,s=this._getRoomBounds(),o=Math.ceil(this._roomWidth/Wt),r=Math.floor((Nt-o)/2),n=(s.minCol-r)*Wt,a=(s.maxCol+1-r)*Wt,l=s.minRow*Wt,c=(s.maxRow+1)*Wt,h=300,d={...i,id:e,x:Math.max(n,Math.min(a-i.width,i.x+h)),y:Math.max(l,Math.min(c-i.height,i.y+h))};this._furniture=[...this._furniture,d],this._selectedFurnitureId=d.id,this._dirty=!0}},this._fovCache=null,this._fovPerspective=null}get _zoneEngineState(){return this._targetCtrl.zoneEngineState}set _zoneEngineState(t){this._targetCtrl.zoneEngineState=t}connectedCallback(){super.connectedCallback(),this._initialize(),window.addEventListener("beforeunload",this._beforeUnloadHandler),window.addEventListener("click",this._dismissTooltips),window.addEventListener("keydown",this._onKeyDown),this._originalPushState=history.pushState.bind(history),this._originalReplaceState=history.replaceState.bind(history),history.pushState=(...t)=>{this._interceptNavigation()?this._pendingNavigation=()=>{this._originalPushState(...t),window.dispatchEvent(new PopStateEvent("popstate"))}:this._originalPushState(...t)},history.replaceState=(...t)=>{this._interceptNavigation()?this._pendingNavigation=()=>{this._originalReplaceState(...t),window.dispatchEvent(new PopStateEvent("popstate"))}:this._originalReplaceState(...t)}}disconnectedCallback(){super.disconnectedCallback(),this._initRetryTimer&&(clearTimeout(this._initRetryTimer),this._initRetryTimer=void 0),this._closeDeviceSession(),window.removeEventListener("beforeunload",this._beforeUnloadHandler),window.removeEventListener("click",this._dismissTooltips),window.removeEventListener("keydown",this._onKeyDown),this._originalPushState&&(history.pushState=this._originalPushState),this._originalReplaceState&&(history.replaceState=this._originalReplaceState)}willUpdate(t){if(t.has("hass")){const t=this.hass?.locale?.language??this.hass?.language;t!==this._currentLang&&(this._currentLang=t,this._localize=function(t){const e=t?.locale?.language??t?.language??"en",i=ts[e]??ts.en,s=ts.en,o=new Map;return(t,r)=>{const n=es(i,t)??es(s,t)??t;if(!r)return n;let a=o.get(n);return a||(a=new Qi(n,e),o.set(n,a)),a.format(r)}}(this.hass))}}updated(t){t.has("hass")&&this.hass&&(this._deviceCtrl.hass=this.hass,this._flasherCtrl.hass=this.hass,this._loading&&!this._devices.length?this._initialize():!this._selectedMac||this._deviceCtrl.hasDeviceSession||this._deviceCtrl.reconnecting||this._loadDeviceConfig(this._selectedMac))}async _initialize(){if(this.hass){if(this._initRetryTimer&&(clearTimeout(this._initRetryTimer),this._initRetryTimer=void 0),this._loading=!0,this._deviceCtrl.hass=this.hass,await this._loadDevices(),!this._selectedMac&&0===this._devices.length)return this._loading=!1,void(this._initRetryTimer=setTimeout(()=>this._initialize(),2e3));this._selectedMac&&await this._loadDeviceConfig(this._selectedMac),this._loading=!1}}async _loadDevices(){this._deviceCtrl.hass=this.hass,await this._deviceCtrl.loadDevices(),this._devices=this._deviceCtrl.devices,this._selectedMac=this._deviceCtrl.selectedMac}async _loadDeviceConfig(t){this._deviceCtrl.hass=this.hass,this._deviceCtrl.onTargetData=t=>{this._targetCtrl.handleTargetData(t)},this._deviceCtrl.onRawTargetData=t=>{this._targetCtrl.handleRawTargetData(t)};const e=await this._deviceCtrl.loadDeviceConfig(t);e&&this._applyConfig(e);const i=this._devices.find(e=>e.mac===t);i&&(this._bluetoothEnabled=i.bluetooth_enabled??!1,this._co2Enabled=i.co2_enabled??!1)}_applyConfig(t){const e=Fe(t);this._perspective=e.calibration.perspective,this._roomWidth=e.calibration.roomWidth,this._roomDepth=e.calibration.roomDepth,this._setupStep=null,this._furniture=e.furniture,this._grid=e.grid,this._zoneConfigs=e.zoneConfigs,this._roomType=e.roomThresholds.roomType,this._roomTrigger=e.roomThresholds.roomTrigger,this._roomRenew=e.roomThresholds.roomRenew,this._roomTimeout=e.roomThresholds.roomTimeout,this._roomHandoffTimeout=e.roomThresholds.roomHandoffTimeout;const i=e.settings;this._temperatureOffset=i.temperatureOffset,this._humidityOffset=i.humidityOffset,this._illuminanceOffset=i.illuminanceOffset,this._motionTimeout=i.motionTimeout,this._targetAutoDistance=i.targetAutoDistance,this._targetMaxDistance=i.targetMaxDistance,this._staticAutoDistance=i.staticAutoDistance,this._staticMinDistance=i.staticMinDistance,this._staticMaxDistance=i.staticMaxDistance,this._staticTriggerThreshold=i.staticTriggerThreshold,this._staticRenewThreshold=i.staticRenewThreshold,this._staticTimeout=i.staticTimeout,this._staticOnDelay=i.staticOnDelay,this._relayTriggerMode=i.relayTriggerMode,this._relayContactMode=i.relayContactMode,this._targetUpdateRateMs=i.targetUpdateRateMs,this._zoneUpdateRateMs=i.zoneUpdateRateMs,this._entitiesConfig=i.entities,this._logLevels=e.settings.logLevels,this._ledMode=e.settings.ledMode,this._ledBrightness=e.settings.ledBrightness,this._ledPresenceColor=e.settings.ledPresenceColor}_closeDeviceSession(){this._deviceCtrl.closeDeviceSession(),this._targets=[],this._rawTargets=[]}_onCellMouseDown(t){this._gridCtrl.onCellMouseDown(t)}_onCellMouseEnter(t){this._gridCtrl.onCellMouseEnter(t)}_onCellMouseUp(){this._gridCtrl.onCellMouseUp()}_applyPaintToCell(t){this._gridCtrl.applyPaintToCell(t)}_addZone(){this._gridCtrl.addZone()}_removeZone(t){this._gridCtrl.removeZone(t)}_addFurniture(t){this._gridCtrl.addFurniture(t)}_addCustomFurniture(t){this._gridCtrl.addCustomFurniture(t)}_removeFurniture(t){this._gridCtrl.removeFurniture(t)}_updateFurniture(t,e){this._gridCtrl.updateFurniture(t,e)}_mmToPx(t,e){return le(t,e)}_pxToMm(t,e){return ce(t,e)}_onFurniturePointerDown(t,e,i,s){this._gridCtrl.onFurniturePointerDown(t,e,i,s)}_onFurnitureDrag(t){this._gridCtrl.onFurnitureDrag(t)}_getCellColor(t){return me(this._grid[t],this._zoneConfigs)}_getRoomBounds(){return Kt(this._grid)}async _applyLayout(){return this._gridCtrl.applyLayout()}async _saveSettings(t){return this._gridCtrl.saveSettings(t||{})}async _cancelSettings(){this._dirty=!1,this._view="live",await this._loadDeviceConfig(this._selectedMac)}async _cancelEditor(){const t=this._targetAutoDistance||this._staticAutoDistance;this._dirty=!1,this._selectedFurnitureId=null,this._overlayMode=null,await this._loadDeviceConfig(this._selectedMac),this._view="live",t&&await(this.hass?.callWS({type:"eppgrid/set_distance_override",mac:this._selectedMac,target_max_distance:this._targetMaxDistance,static_min_distance:this._staticMinDistance,static_max_distance:this._staticMaxDistance})?.catch(()=>{}))}_pushWidenedDistanceOverride(){(this._targetAutoDistance||this._staticAutoDistance)&&this.hass?.callWS({type:"eppgrid/set_distance_override",mac:this._selectedMac,target_max_distance:this._targetAutoDistance?6:this._targetMaxDistance,static_min_distance:this._staticAutoDistance?.3:this._staticMinDistance,static_max_distance:this._staticAutoDistance?16:this._staticMaxDistance})?.catch(()=>{})}_enterEditor(t){this._view="editor",this._sidebarTab=t,"overlays"!==t&&(this._overlayMode=null),this._pushWidenedDistanceOverride()}_getTemplates(){return this._gridCtrl.getTemplates()}_saveTemplate(){this._gridCtrl.saveTemplate()}_loadTemplate(t){this._gridCtrl.loadTemplate(t)}_deleteTemplate(t){this._gridCtrl.deleteTemplate(t)}_initGridFromRoom(){this._grid=Qt(this._roomWidth,this._roomDepth)}_mapTargetToPercent(t){return function(t,e,i,s){if(i>0&&s>0)return{x:Math.max(0,Math.min(t,i))/i*100,y:Math.max(0,Math.min(e,s))/s*100};return{x:t/Gt*100,y:e/Gt*100}}(t.x,t.y,this._roomWidth,this._roomDepth)}_getInversePerspective(){return function(t){if(!t||t.length<8)return null;const e=[t[0],t[1],t[2],t[3],t[4],t[5],t[6],t[7],1],i=e[0]*(e[4]*e[8]-e[5]*e[7])-e[1]*(e[3]*e[8]-e[5]*e[6])+e[2]*(e[3]*e[7]-e[4]*e[6]);if(Math.abs(i)<1e-10)return null;const s=[(e[4]*e[8]-e[5]*e[7])/i,(e[2]*e[7]-e[1]*e[8])/i,(e[1]*e[5]-e[2]*e[4])/i,(e[5]*e[6]-e[3]*e[8])/i,(e[0]*e[8]-e[2]*e[6])/i,(e[2]*e[3]-e[0]*e[5])/i,(e[3]*e[7]-e[4]*e[6])/i,(e[1]*e[6]-e[0]*e[7])/i,(e[0]*e[4]-e[1]*e[3])/i],o=s[8];return Math.abs(o)<1e-10?null:[s[0]/o,s[1]/o,s[2]/o,s[3]/o,s[4]/o,s[5]/o,s[6]/o,s[7]/o]}(this._perspective)}_applyPerspective(t,e,i){return ve(t,e,i)}_getSensorFov(){return this._perspective?(this._fovCache&&this._fovPerspective===this._perspective||(this._fovCache=be(this._perspective),this._fovPerspective=this._perspective),this._fovCache):null}_isCellInSensorRange(t,e){const i=this._getSensorFov(),s=this._autoDetectionRange(),o=we(this._targetAutoDistance,s,this._targetMaxDistance);return xe(t,e,i,this._roomWidth,o)}_getGridRoomMetrics(){return ke(this._grid,this._roomWidth,this._perspective)}_getRawRoomBounds(){return Jt(this._grid)}_mapTargetToGridCell(t){return ue(t.x,t.y,this._roomWidth,this._roomDepth)}_guardNavigation(t){this._dirty?(this._pendingNavigation=t,this._showUnsavedDialog=!0):t()}_discardAndNavigate(){this._dirty=!1,this._showUnsavedDialog=!1,this._pendingNavigation&&(this._pendingNavigation(),this._pendingNavigation=null)}_renderGlobalDialogs(){return G`
      ${this._showTemplateSave?this._renderTemplateSaveDialog():j}
      ${this._showTemplateLoad?this._renderTemplateLoadDialog():j}
      ${this._showUnsavedDialog?G`
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
        `:j}
      ${this._showDeleteCalibrationDialog?G`
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
        `:j}
    `}_renderTabBar(){return G`
			<div class="tab-bar">
				<button class="tab ${"config"===this._panelTab?"active":""}"
					@click=${()=>{this._panelTab="config",this._loadDevices()}}>${this._localize("tabs.device_configuration")}</button>
				<button class="tab ${"flasher"===this._panelTab?"active":""}"
					@click=${()=>{this._panelTab="flasher",this._flasherCtrl.loading&&(this._flasherCtrl.hass=this.hass,this._flasherCtrl.loadDevices())}}>${this._localize("tabs.flash_firmware")}</button>
			</div>
		`}render(){if("flasher"===this._panelTab)return G`<div class="tab-layout">
				${this._renderTabBar()}
				<epp-flasher-view
					.hass=${this.hass}
					.flashableDevices=${this._flasherCtrl.flashableDevices}
					.loading=${this._flasherCtrl.loading}
					.otaProgress=${this._flasherCtrl.otaProgress}
					.flashingMac=${this._flasherCtrl.flashingMac}
					.localize=${this._localize}
					@flash-ota=${t=>{this._flasherCtrl.startOtaFlash(t.detail.mac,t.detail.variant)}}
					@flash-complete=${()=>{this._panelTab="config"}}
				></epp-flasher-view>
			</div>`;if(this._loading)return G`<div class="tab-layout">
				${this._renderTabBar()}
				<div class="loading-container">${this._localize("common.loading")}</div>
			</div>`;if(!this._devices.length)return G`<div class="tab-layout">
				${this._renderTabBar()}
				<div class="loading-container">
					<p>${this._localize("flasher.no_eppgrid_devices")}</p>
					<button @click=${()=>{this._panelTab="flasher"}}>
						${this._localize("flasher.flash_from_tab")}
					</button>
				</div>
			</div>`;if(null!==this._setupStep)return G`
        <epp-wizard
          .hass=${this.hass}
          .selectedMac=${this._selectedMac}
          .rawTargets=${this._rawTargets}
          .sensorState=${{occupancy:this._sensorState.occupancy}}
          .devices=${this._devices}
          .localize=${this._localize}
          .initialRoomWidth=${this._roomWidth}
          .initialRoomDepth=${this._roomDepth}
          @calibration-complete=${async t=>{const{perspective:e,roomWidth:i,roomDepth:s}=t.detail;this._perspective=e,this._roomWidth=i,this._roomDepth=s,this._initGridFromRoom(),this._setupStep=null,this._view="live",this._entitiesConfig={...this._entitiesConfig,zone_presence:!0},await this._gridCtrl.applyLayout().catch(t=>{console.error("Failed to apply layout after calibration",t)})}}
          @wizard-cancel=${()=>{this._setupStep=null}}
        ></epp-wizard>
      `;if(this._deviceCtrl.connectionFailed)return G`<div class="tab-layout">
				${this._renderTabBar()}
				<div class="panel">
					${this._renderHeader()}
					${this._renderConnectionBanner()}
				</div>
				${this._renderGlobalDialogs()}
			</div>`;const t=this._devices.find(t=>t.mac===this._selectedMac);if(!(!t||"compatible"===t.config_protocol_status))return G`<div class="tab-layout">
				${this._renderTabBar()}
				<div class="panel">
					${this._renderHeader()}
					${this._renderProtocolBanner()}
				</div>
				${this._renderGlobalDialogs()}
			</div>`;const e="settings"===this._view?this._renderSettings():"editor"===this._view&&this._perspective?this._renderEditor():this._renderLiveOverview();return G`<div class="tab-layout">${this._renderTabBar()}${e}${this._renderGlobalDialogs()}</div>`}async _deleteCalibration(){this._showDeleteCalibrationDialog=!1,this._perspective=null,this._roomWidth=0,this._roomDepth=0,this._grid=new Uint8Array(400),this._zoneConfigs=new Array(7).fill(null),this._roomType="normal",this._roomTrigger=De.normal.trigger,this._roomRenew=De.normal.renew,this._roomTimeout=De.normal.timeout,this._roomHandoffTimeout=De.normal.handoff_timeout,this._furniture=[],this._entitiesConfig={...this._entitiesConfig,zone_presence:!1,target_xy:!1},this._targetAutoDistance&&(this._targetMaxDistance=6),this._staticAutoDistance&&(this._staticMinDistance=.3,this._staticMaxDistance=16);try{(this._targetAutoDistance||this._staticAutoDistance)&&await this.hass.callWS({type:"eppgrid/set_settings",mac:this._selectedMac,temperature_offset:this._temperatureOffset,humidity_offset:this._humidityOffset,illuminance_offset:this._illuminanceOffset,motion_timeout:this._motionTimeout,target_auto_distance:this._targetAutoDistance,target_max_distance:this._targetMaxDistance,static_auto_distance:this._staticAutoDistance,static_min_distance:this._staticMinDistance,static_max_distance:this._staticMaxDistance,static_trigger_threshold:this._staticTriggerThreshold,static_renew_threshold:this._staticRenewThreshold,static_timeout:this._staticTimeout,static_on_delay:this._staticOnDelay,led_mode:this._ledMode,led_brightness:this._ledBrightness,led_presence_color:this._ledPresenceColor,relay_trigger_mode:this._relayTriggerMode,relay_contact_mode:this._relayContactMode,entities:this._entitiesConfig||{}}),await this.hass.callWS({type:"eppgrid/set_setup",mac:this._selectedMac,perspective:[0,0,0,0,0,0,0,0],room_width:0,room_depth:0}),await this.hass.callWS({type:"eppgrid/set_room_layout",mac:this._selectedMac,grid_bytes:Array.from(this._grid),zone_slots:this._zoneConfigs.map(()=>null),room_type:"normal",furniture:[]})}catch(t){console.error("Failed to delete calibration",t)}this._dirty=!1,this._view="live"}_changePlacement(){this._guardNavigation(()=>{this._setupStep="guide",this._pushWidenedDistanceOverride()})}_renderHeader(){return G`
      <div class="panel-header">
        <ha-select
          .value=${this._selectedMac}
          .options=${this._devices.map(t=>({value:t.mac,label:t.name}))}
          @selected=${t=>{const e=t.detail.value;e&&e!==this._selectedMac&&this._guardNavigation(async()=>{this._closeDeviceSession(),this._selectedMac=e,localStorage.setItem("epp_selected_mac",e),await this._loadDeviceConfig(e)})}}
          @closed=${t=>t.stopPropagation()}
        ></ha-select>
      </div>
    `}_renderProtocolBanner(){const t=this._devices.find(t=>t.mac===this._selectedMac);if(!t||"compatible"===t.config_protocol_status)return j;const e=t.config_protocol_status,i="firmware_behind"===e,s="unavailable"===e?this._localize("protocol.unavailable"):i?this._localize("protocol.firmware_behind"):this._localize("protocol.firmware_ahead");return G`
			<div class="protocol-fullpage protocol-fullpage-${i?"warning":"info"}">
				<ha-icon icon=${i?"mdi:alert-circle-outline":"mdi:information-outline"}></ha-icon>
				<p>${s}</p>
				${i?G`<button class="wizard-btn wizard-btn-primary"
						@click=${()=>this._updateFirmware()}
					>${this._localize("protocol.update_firmware")}</button>`:j}
			</div>
		`}async _updateFirmware(){if(this._selectedMac&&this.hass)try{await this.hass.callWS({type:"eppgrid/update_firmware",mac:this._selectedMac})}catch(t){console.error("Firmware update failed:",t)}}_renderConnectionBanner(){if(!this._deviceCtrl.connectionFailed)return j;const t=this._devices.find(t=>t.mac===this._selectedMac),e=t?.current_connection_count,i=null!=e?this._localize("connection.client_count",{count:e}):"";return G`
			<div class="protocol-fullpage protocol-fullpage-warning">
				<ha-icon icon="mdi:connection"></ha-icon>
				<p>${this._localize("connection.failed")}</p>
				${i?G`<p>${i}</p>`:j}
				<p style="opacity: 0.7; font-size: 0.9em">${this._localize("connection.check_connections")}</p>
				<button class="wizard-btn wizard-btn-primary"
					@click=${()=>this._retryConnection()}
				>${this._localize("connection.retry")}</button>
			</div>
		`}_retryConnection(){this._selectedMac&&this._loadDeviceConfig(this._selectedMac)}_renderLiveGrid(){for(let t=0;t<this._targets.length;t++){const e=this._targets[t];null!=e.x&&null!=e.y&&"active"===e.status&&(this._zoneEngineState.targetPrevXY[t]={x:e.x,y:e.y})}const t={};for(const[e,i]of Object.entries(this._zoneState.occupancy))t[Number(e)]=i;return G`
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
				.occupancy=${t}
				.targetPrevXY=${this._zoneEngineState.targetPrevXY}
				.heatmapColors=${this._showHitCounts?this._computeHeatmapColors():null}
				.localize=${this._localize}
				.maxGridPx=${480}
				.maxRangeMm=${we(this._targetAutoDistance,this._autoDetectionRange(),this._targetMaxDistance)}
				@furniture-select=${t=>{this._selectedFurnitureId=t.detail}}
				@furniture-pointer-down=${t=>{const{e:e,id:i,type:s,handle:o}=t.detail;this._onFurniturePointerDown(e,i,s,o)}}
				@furniture-delete=${t=>{this._removeFurniture(t.detail)}}
				.dismissedTargets=${this._dismissedTargets}
				@target-click=${t=>{this._showTargetMenu(t.detail)}}
			></epp-grid>
		`}_showTargetMenu(t){this._targetMenu=t}_closeTargetMenu(){this._targetMenu=null}_targetCellIndex(t,e){const i=ue(t,e,this._roomWidth,this._roomDepth);if(!i)return-1;const s=Math.floor(i.col),o=Math.floor(i.row);return s<0||s>=Nt||o<0||o>=Ft?-1:o*Nt+s}async _dismissTarget(){if(!this._targetMenu)return;const{targetIndex:t,x:e,y:i}=this._targetMenu,s=this._targetCellIndex(e,i);if(s>=0){this._dismissedTargets=new Map(this._dismissedTargets),this._dismissedTargets.set(t,s);try{await this.hass.callWS({type:"eppgrid/dismiss_target",mac:this._selectedMac,target_index:t,cell_index:s})}catch(t){console.error("Failed to dismiss target:",t)}}this._closeTargetMenu(),this.requestUpdate()}async _setInterference(t){if(!this._targetMenu)return;const e=this._targetCellIndex(this._targetMenu.x,this._targetMenu.y);e<0||!Zt(this._grid[e])?this._closeTargetMenu():(this._grid=new Uint8Array(this._grid),this._grid[e]=qt(this._grid[e],t),this._dirty=!0,this._closeTargetMenu(),await this._gridCtrl.applyLayout())}_renderTargetMenu(){if(!this._targetMenu)return j;const{pctX:t,pctY:e}=this._targetMenu;return G`
			<div class="target-menu-backdrop" @click=${()=>this._closeTargetMenu()}></div>
			<div class="target-menu" style="left: ${t}%; top: ${e}%;">
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
		`}_renderSaveCancelButtons(){const t="settings"===this._view?this._saveSettings:this._applyLayout;return G`
      <div class="save-cancel-bar">
        <button class="wizard-btn wizard-btn-back"
          @click=${()=>{"editor"===this._view?this._cancelEditor():this._cancelSettings()}}
        >${this._localize("common.cancel")}</button>
        <button class="wizard-btn wizard-btn-primary"
          ?disabled=${this._saving||!this._dirty}
          @click=${t}
        >${this._saving?this._localize("common.saving"):this._localize("common.save")}</button>
      </div>
    `}_renderLiveOverview(){const t=this._perspective?this._renderLiveGrid():G`<epp-wizard
            mode="uncalibrated-fov"
            .rawTargets=${this._rawTargets}
            .sensorState=${{occupancy:this._sensorState.occupancy}}
            .localize=${this._localize}
            @start-calibration=${()=>this._changePlacement()}
          ></epp-wizard>`;return G`
      <div class="panel" @click=${t=>{t.target instanceof Element&&(this._showLiveMenu&&!t.target.closest(".sidebar-menu-wrapper")&&(this._showLiveMenu=!1),this._targetMenu&&!t.target.closest(".target-menu")&&this._closeTargetMenu())}}>
        ${this._renderHeader()}
        <div class="editor-layout">
          <div class="grid-column">
            <div class="grid-container" style="position: relative;">
              ${t}
              ${this._targetMenu?this._renderTargetMenu():j}
            </div>
            ${this._perspective?this._renderBackendDebugLog():j}
          </div>
          <div class="zone-sidebar">
            <div class="sidebar-header">
              <span class="sidebar-title" style="margin-right: auto;">${this._localize("sidebar.live_overview")}</span>
              <div class="sidebar-menu-wrapper">
                <button class="sidebar-menu-btn" @click=${()=>{this._showLiveMenu=!this._showLiveMenu}}>
                  <ha-icon icon="mdi:dots-vertical" style="--mdc-icon-size: 20px;"></ha-icon>
                </button>
                ${this._showLiveMenu?G`
                  <div class="sidebar-menu" @click=${()=>{this._showLiveMenu=!1}}>
                    ${this._perspective?G`
                      <button class="sidebar-menu-item" @click=${()=>{this._enterEditor("zones")}}>
                        <ha-icon icon="mdi:vector-square" style="--mdc-icon-size: 18px;"></ha-icon> ${this._localize("menu.detection_zones")}
                      </button>
                      <button class="sidebar-menu-item" @click=${()=>{this._enterEditor("overlays")}}>
                        <ha-icon icon="mdi:blur" style="--mdc-icon-size: 18px;"></ha-icon> ${this._localize("menu.overlays")}
                      </button>
                      <button class="sidebar-menu-item" @click=${()=>{this._enterEditor("furniture")}}>
                        <ha-icon icon="mdi:sofa" style="--mdc-icon-size: 18px;"></ha-icon> ${this._localize("menu.furniture")}
                      </button>
                    `:j}
                    <button class="sidebar-menu-item" @click=${()=>{this._view="settings"}}>
                      <ha-icon icon="mdi:cog" style="--mdc-icon-size: 18px;"></ha-icon> ${this._localize("menu.settings")}
                    </button>
                    <hr style="border: none; border-top: 1px solid var(--divider-color, #eee); margin: 4px 0;"/>
                    <button class="sidebar-menu-item" @click=${()=>this._changePlacement()}>
                      <ha-icon icon="mdi:target" style="--mdc-icon-size: 18px;"></ha-icon> ${this._localize("menu.room_calibration")}
                    </button>
                    ${this._perspective?G`
                      <button class="sidebar-menu-item" style="color: var(--error-color, #f44336);" @click=${()=>{this._showDeleteCalibrationDialog=!0}}>
                        <ha-icon icon="mdi:delete" style="--mdc-icon-size: 18px;"></ha-icon> ${this._localize("menu.delete_calibration")}
                      </button>
                    `:j}
                    <hr style="border: none; border-top: 1px solid var(--divider-color, #eee); margin: 4px 0;"/>
                    <button class="sidebar-menu-item" @click=${()=>{this._showTemplateSave=!0}}>
                      <ha-icon icon="mdi:content-save" style="--mdc-icon-size: 18px;"></ha-icon> ${this._localize("dialogs.save_template")}
                    </button>
                    <button class="sidebar-menu-item" @click=${()=>{this._showTemplateLoad=!0}}>
                      <ha-icon icon="mdi:folder-open" style="--mdc-icon-size: 18px;"></ha-icon> ${this._localize("dialogs.load_template")}
                    </button>
                  </div>
                `:j}
              </div>
            </div>
            <div class="sidebar-scroll">
              <epp-live-sidebar
                .sensorState=${this._sensorState}
                .zoneState=${this._zoneState}
                .zoneConfigs=${this._zoneConfigs}
                .perspective=${this._perspective}
                .localize=${this._localize}
                @view-change=${t=>{this._view=t.detail.view,t.detail.sidebarTab&&(this._sidebarTab=t.detail.sidebarTab)}}
              ></epp-live-sidebar>
            </div>
          </div>
        </div>
      </div>
    `}_toggleAccordion(t){this._openAccordions=this._openAccordions.has(t)?new Set:new Set([t])}_getSensorRoomPosition(){return ye(this._perspective)}_autoDetectionRange(){return $e(this._roomWidth,this._roomDepth,this._perspective,this._grid)}_renderSettings(){return G`
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
          @accordion-toggle=${t=>{this._openAccordions=t.detail}}
          @setting-change=${t=>{const{key:e,value:i}=t.detail;this[`_${e}`]=i}}
          @dirty=${()=>{this._dirty=!0}}
          @save=${t=>this._saveSettings(t.detail)}
          @cancel=${()=>this._cancelSettings()}
        ></epp-settings-view>
      </div>
    `}_renderEditor(){const t=this._runLocalZoneEngine(),e=t.occupancy;for(let e=0;e<t.targets.length&&e<this._targets.length;e++)this._targets[e].status=t.targets[e].status;const i=Object.values(e).some(t=>t);return this._sensorState.occupancy=this._sensorState.static_presence||this._sensorState.motion_presence||i,G`
      <div class="panel" @click=${t=>{const e=t.target;e.closest(".grid")||e.closest(".zone-sidebar")||this._justPainted||(this._activeZone=null)}}>
        ${this._renderHeader()}
        <div class="editor-layout">
          <div class="grid-column">
            <div class="grid-container" @click=${t=>{t.composedPath().some(t=>t instanceof HTMLElement&&t.classList.contains("furniture-item"))||(this._selectedFurnitureId=null)}}>
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
                .occupancy=${e}
                .targetPrevXY=${this._zoneEngineState.targetPrevXY}
                .heatmapColors=${this._showHitCounts?this._computeHeatmapColors():null}
                .localize=${this._localize}
                .maxGridPx=${480}
                .maxRangeMm=${we(this._targetAutoDistance,this._autoDetectionRange(),this._targetMaxDistance)}
                .frozenBounds=${this._frozenBounds}
                @cell-paint=${t=>{const{index:e,action:i}=t.detail;"down"===i?this._onCellMouseDown(e):"enter"===i?this._onCellMouseEnter(e):"up"===i&&this._onCellMouseUp()}}
                @furniture-select=${t=>{this._selectedFurnitureId=t.detail}}
                @furniture-pointer-down=${t=>{const{e:e,id:i,type:s,handle:o}=t.detail;this._onFurniturePointerDown(e,i,s,o)}}
                @furniture-delete=${t=>{this._removeFurniture(t.detail)}}
              ></epp-grid>
            </div>
            ${"zones"===this._sidebarTab||"overlays"===this._sidebarTab?this._renderDebugLog():j}
          </div>
          <div class="zone-sidebar scrollable">
            <div class="sidebar-title">${"furniture"===this._sidebarTab?this._localize("sidebar.furniture"):"overlays"===this._sidebarTab?this._localize("sidebar.overlays"):this._localize("sidebar.detection_zones")}</div>
            <div class="sidebar-scroll">
            ${"zones"===this._sidebarTab?G`<epp-zone-sidebar
                    .zoneConfigs=${this._zoneConfigs}
                    .activeZone=${this._activeZone}
                    .roomType=${this._roomType}
                    .roomTrigger=${this._roomTrigger}
                    .roomRenew=${this._roomRenew}
                    .roomTimeout=${this._roomTimeout}
                    .roomHandoffTimeout=${this._roomHandoffTimeout}
                    .localZoneState=${this._zoneEngineState.localZoneState}
                    .localize=${this._localize}
                    @zone-select=${t=>{this._activeZone=t.detail.zone,this._overlayMode=null}}
                    @zone-add=${()=>{this._addZone()}}
                    @zone-remove=${t=>{this._removeZone(t.detail.slot)}}
                    @zone-config-change=${t=>{const{index:e,updates:i}=t.detail,s=[...this._zoneConfigs];s[e]={...s[e],...i},this._zoneConfigs=s}}
                    @room-config-change=${t=>{const{updates:e}=t.detail;void 0!==e.roomType&&(this._roomType=e.roomType),void 0!==e.roomTrigger&&(this._roomTrigger=e.roomTrigger),void 0!==e.roomRenew&&(this._roomRenew=e.roomRenew),void 0!==e.roomTimeout&&(this._roomTimeout=e.roomTimeout),void 0!==e.roomHandoffTimeout&&(this._roomHandoffTimeout=e.roomHandoffTimeout)}}
                    @dirty=${()=>{this._dirty=!0}}
                  ></epp-zone-sidebar>`:"overlays"===this._sidebarTab?G`<epp-overlay-sidebar
                    .overlayMode=${this._overlayMode}
                    .localize=${this._localize}
                    @overlay-select=${t=>{this._overlayMode=t.detail.mode}}
                  ></epp-overlay-sidebar>`:G`<epp-furniture-sidebar
                    .furniture=${this._furniture}
                    .selectedFurnitureId=${this._selectedFurnitureId}
                    .hass=${this.hass}
                    .localize=${this._localize}
                    .showCustomIconPicker=${this._showCustomIconPicker}
                    .customIconValue=${this._customIconValue}
                    @furniture-add=${t=>{this._addFurniture(t.detail)}}
                    @furniture-add-custom=${t=>{this._addCustomFurniture(t.detail)}}
                    @furniture-remove=${t=>{this._removeFurniture(t.detail)}}
                    @furniture-update=${t=>{this._updateFurniture(t.detail.id,t.detail.updates)}}
                    @furniture-select=${t=>{this._selectedFurnitureId=t.detail}}
                    @custom-icon-toggle=${()=>{this._showCustomIconPicker=!this._showCustomIconPicker}}
                    @custom-icon-change=${t=>{this._customIconValue=t.detail}}
                    @dirty=${()=>{this._dirty=!0}}
                  ></epp-furniture-sidebar>`}
            </div>
            ${this._renderSaveCancelButtons()}
          </div>
        </div>
      </div>
    `}_renderTemplateSaveDialog(){return G`
      <div class="template-dialog">
        <div class="template-dialog-card">
          <h3>${this._localize("dialogs.save_template")}</h3>
          <input
            type="text"
            class="template-name-input"
            placeholder="${this._localize("dialogs.template_name")}"
            .value=${this._templateName}
            @input=${t=>{this._templateName=t.target.value}}
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
    `}_renderTemplateLoadDialog(){const t=this._getTemplates();return G`
      <div class="template-dialog">
        <div class="template-dialog-card">
          <h3>${this._localize("dialogs.load_template")}</h3>
          ${0===t.length?G`<p class="overlay-help">${this._localize("dialogs.no_templates")}</p>`:t.map(t=>G`
              <div class="template-item">
                <span class="template-item-name">${t.name}</span>
                <span class="template-item-size">${(t.roomWidth/1e3).toFixed(1)}m x ${(t.roomDepth/1e3).toFixed(1)}m</span>
                <button
                  class="wizard-btn wizard-btn-primary template-item-btn"
                  @click=${()=>this._loadTemplate(t.name)}
                >${this._localize("common.load")}</button>
                <button
                  class="zone-remove-btn"
                  @click=${()=>this._deleteTemplate(t.name)}
                >
                  <ha-icon icon="mdi:close"></ha-icon>
                </button>
              </div>
            `)}
          <div class="template-dialog-actions">
            <button
              class="wizard-btn wizard-btn-back"
              @click=${()=>{this._showTemplateLoad=!1}}
            >${this._localize("common.close")}</button>
          </div>
        </div>
      </div>
    `}_renderVisibleCells(t,e,i,s,o,r=!1){const n=this._showHitCounts?this._computeHeatmapColors():null;let a;if(r){a={};for(const[t,e]of Object.entries(this._zoneState.occupancy))a[Number(t)]=e}else{const t=this._runLocalZoneEngine();a=t.occupancy;for(let e=0;e<t.targets.length&&e<this._targets.length;e++)this._targets[e].status=t.targets[e].status;const e=Object.values(a).some(t=>t);this._sensorState.occupancy=this._sensorState.static_presence||this._sensorState.motion_presence||e}const l=[];for(let r=i;r<=s;r++)for(let i=t;i<=e;i++){const t=r*Nt+i,e=this._grid[t],s=this._isCellInSensorRange(i,r);let c=s?this._getCellColor(t):fe,h="";if(s&&Zt(e)){const t=Vt(e);if(n){const e=n.get(t);e&&(c=`linear-gradient(${e}, ${e}), linear-gradient(${c}, ${c})`)}a[t]&&(h="box-shadow: inset 0 0 0 1px rgba(0,0,0,0.4);")}l.push(G`
          <div
            class="cell"
            style="background: ${c}; width: ${o}px; height: ${o}px; ${h}"
            @mousedown=${()=>{s&&this._onCellMouseDown(t)}}
            @mouseenter=${()=>{s&&this._onCellMouseEnter(t)}}
          ></div>
        `)}return l}_runLocalZoneEngine(){return this._targetCtrl.runLocalZoneEngine()}_enrichDebugLog(t){return this._targetCtrl.enrichDebugLog(t)}_computeHeatmapColors(){return this._targetCtrl.computeHeatmapColors()}_getZoneThresholds(t){return Pe(t,this._zoneConfigs,this._roomType,this._roomTrigger,this._roomRenew,this._roomTimeout,this._roomHandoffTimeout)}_renderBackendDebugLog(){return G`
      <div style="margin-top: 8px; min-width: 0;">
        <button
          class="live-section-header live-section-link"
          style="font-size: 12px; gap: 4px;"
          @click=${()=>{this._showBackendDebugLog=!this._showBackendDebugLog,this._showBackendDebugLog||(this._backendDebugLogLines=[],this._backendDebugLogPrev=null)}}
        >
          <ha-icon icon=${this._showBackendDebugLog?"mdi:chevron-down":"mdi:chevron-right"} style="--mdc-icon-size: 14px;"></ha-icon>
          Detection events
        </button>
        ${this._showBackendDebugLog?G`
          <div style="display: flex; justify-content: flex-end; margin-bottom: 4px; gap: 4px;">
            <button
              class="debug-log-btn"
              @click=${()=>{navigator.clipboard.writeText(this._backendDebugLogLines.join("\n"))}}
            >Copy all</button>
            <button
              class="debug-log-btn"
              @click=${()=>{this._backendDebugLogLines=[],this._backendDebugLogPrev=null;const t=this.shadowRoot?.getElementById("backend-debug-log-scroll");if(t){t.innerHTML="";const e=document.createElement("div");e.style.cssText="color: var(--secondary-text-color, #999); font-style: italic;",e.textContent="Waiting for events...",t.appendChild(e)}}}
            >Clear</button>
          </div>
          <div class="debug-log-container" id="backend-debug-log-scroll">
            <div style="color: var(--secondary-text-color, #999); font-style: italic;">Waiting for events...</div>
          </div>
        `:j}
      </div>
    `}_renderDebugLog(){return G`
      <div style="margin-top: 8px; min-width: 0;">
        <button
          class="live-section-header live-section-link"
          style="font-size: 12px; gap: 4px;"
          @click=${()=>{this._showDebugLog=!this._showDebugLog,this._showDebugLog||(this._debugLogLines=[],this._debugLogPrev=null)}}
        >
          <ha-icon icon=${this._showDebugLog?"mdi:chevron-down":"mdi:chevron-right"} style="--mdc-icon-size: 14px;"></ha-icon>
          Detection events
        </button>
        ${this._showDebugLog?G`
          <div style="display: flex; justify-content: flex-end; margin-bottom: 4px; gap: 4px;">
            <button
              class="debug-log-btn"
              @click=${()=>{navigator.clipboard.writeText(this._debugLogLines.join("\n"))}}
            >Copy all</button>
            <button
              class="debug-log-btn"
              @click=${()=>{this._debugLogLines=[],this._debugLogPrev=null;const t=this.shadowRoot?.getElementById("debug-log-scroll");if(t){t.innerHTML="";const e=document.createElement("div");e.style.cssText="color: var(--secondary-text-color, #999); font-style: italic;",e.textContent="Waiting for events...",t.appendChild(e)}}}
            >Clear</button>
          </div>
          <div class="debug-log-container" id="debug-log-scroll">
            <div style="color: var(--secondary-text-color, #999); font-style: italic;">Waiting for events...</div>
          </div>
        `:j}
      </div>
    `}_renderFurnitureOverlay(t,e,i,s,o){return this._furniture.length?G`
			<epp-furniture-overlay
				.furniture=${this._furniture}
				.selectedFurnitureId=${this._selectedFurnitureId}
				.roomWidth=${this._roomWidth}
				.cellPx=${t}
				.minCol=${e}
				.minRow=${i}
				.visCols=${s}
				.visRows=${o}
				.sidebarTab=${this._sidebarTab}
				.localize=${this._localize}
				@furniture-select=${t=>{this._selectedFurnitureId=t.detail}}
				@furniture-pointer-down=${t=>{const{e:e,id:i,type:s,handle:o}=t.detail;this._onFurniturePointerDown(e,i,s,o)}}
				@furniture-delete=${t=>{this._removeFurniture(t.detail)}}
			></epp-furniture-overlay>
		`:j}}is.styles=[mt,_t,vt,bt,zt,$t,Ct,Et,n`
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

  `],t([gt({attribute:!1})],is.prototype,"hass",void 0),t([ft()],is.prototype,"_grid",void 0),t([ft()],is.prototype,"_zoneConfigs",void 0),t([ft()],is.prototype,"_activeZone",void 0),t([ft()],is.prototype,"_roomType",void 0),t([ft()],is.prototype,"_roomTrigger",void 0),t([ft()],is.prototype,"_roomRenew",void 0),t([ft()],is.prototype,"_roomTimeout",void 0),t([ft()],is.prototype,"_roomHandoffTimeout",void 0),t([ft()],is.prototype,"_targetAutoDistance",void 0),t([ft()],is.prototype,"_targetMaxDistance",void 0),t([ft()],is.prototype,"_staticAutoDistance",void 0),t([ft()],is.prototype,"_staticMinDistance",void 0),t([ft()],is.prototype,"_staticMaxDistance",void 0),t([ft()],is.prototype,"_temperatureOffset",void 0),t([ft()],is.prototype,"_humidityOffset",void 0),t([ft()],is.prototype,"_illuminanceOffset",void 0),t([ft()],is.prototype,"_motionTimeout",void 0),t([ft()],is.prototype,"_staticTimeout",void 0),t([ft()],is.prototype,"_staticTriggerThreshold",void 0),t([ft()],is.prototype,"_staticRenewThreshold",void 0),t([ft()],is.prototype,"_staticOnDelay",void 0),t([ft()],is.prototype,"_logLevels",void 0),t([ft()],is.prototype,"_bluetoothEnabled",void 0),t([ft()],is.prototype,"_co2Enabled",void 0),t([ft()],is.prototype,"_ledMode",void 0),t([ft()],is.prototype,"_ledBrightness",void 0),t([ft()],is.prototype,"_ledPresenceColor",void 0),t([ft()],is.prototype,"_relayTriggerMode",void 0),t([ft()],is.prototype,"_relayContactMode",void 0),t([ft()],is.prototype,"_targetUpdateRateMs",void 0),t([ft()],is.prototype,"_zoneUpdateRateMs",void 0),t([ft()],is.prototype,"_entitiesConfig",void 0),t([ft()],is.prototype,"_sidebarTab",void 0),t([ft()],is.prototype,"_panelTab",void 0),t([ft()],is.prototype,"_showDeleteCalibrationDialog",void 0),t([ft()],is.prototype,"_showLiveMenu",void 0),t([ft()],is.prototype,"_showCustomIconPicker",void 0),t([ft()],is.prototype,"_customIconValue",void 0),t([ft()],is.prototype,"_furniture",void 0),t([ft()],is.prototype,"_selectedFurnitureId",void 0),t([ft()],is.prototype,"_targets",void 0),t([ft()],is.prototype,"_rawTargets",void 0),t([ft()],is.prototype,"_sensorState",void 0),t([ft()],is.prototype,"_zoneState",void 0),t([ft()],is.prototype,"_showHitCounts",void 0),t([ft()],is.prototype,"_showDebugLog",void 0),t([ft()],is.prototype,"_showBackendDebugLog",void 0),t([ft()],is.prototype,"_overlayMode",void 0),t([ft()],is.prototype,"_targetMenu",void 0),t([ft()],is.prototype,"_isPainting",void 0),t([ft()],is.prototype,"_paintAction",void 0),t([ft()],is.prototype,"_saving",void 0),t([ft()],is.prototype,"_dirty",void 0),t([ft()],is.prototype,"_showUnsavedDialog",void 0),t([ft()],is.prototype,"_showTemplateSave",void 0),t([ft()],is.prototype,"_showTemplateLoad",void 0),t([ft()],is.prototype,"_templateName",void 0),t([ft()],is.prototype,"_devices",void 0),t([ft()],is.prototype,"_selectedMac",void 0),t([ft()],is.prototype,"_loading",void 0),t([ft()],is.prototype,"_setupStep",void 0),t([ft()],is.prototype,"_view",void 0),t([ft()],is.prototype,"_openAccordions",void 0),t([ft()],is.prototype,"_perspective",void 0),t([ft()],is.prototype,"_roomWidth",void 0),t([ft()],is.prototype,"_roomDepth",void 0),customElements.get("eppgrid-panel")||customElements.define("eppgrid-panel",is);let ss=class extends ct{setConfig(t){}render(){return G`<eppgrid-panel .hass=${this.hass}></eppgrid-panel>`}};ss.styles=n`:host { display: block; height: 100%; }`,t([gt({attribute:!1})],ss.prototype,"hass",void 0),ss=t([dt("epp-device-card")],ss);let os=class extends ct{constructor(){super(...arguments),this._flasherCtrl=new Be(this)}setConfig(t){}updated(t){t.has("hass")&&this.hass&&(this._flasherCtrl.hass=this.hass,this._flasherCtrl.loading&&this._flasherCtrl.loadDevices())}render(){return G`
            <epp-flasher-view
                .hass=${this.hass}
                .flashableDevices=${this._flasherCtrl.flashableDevices}
                .loading=${this._flasherCtrl.loading}
                .otaProgress=${this._flasherCtrl.otaProgress}
                .flashingMac=${this._flasherCtrl.flashingMac}
                @flash-ota=${t=>{this._flasherCtrl.startOtaFlash(t.detail.mac,t.detail.variant)}}
            ></epp-flasher-view>
        `}};os.styles=n`:host { display: block; }`,t([gt({attribute:!1})],os.prototype,"hass",void 0),os=t([dt("epp-flasher-card")],os);class rs{static async generate(){return{views:[{title:"Device Configuration",cards:[{type:"custom:epp-device-card"}]},{title:"Flash Firmware",cards:[{type:"custom:epp-flasher-card"}]}]}}}window.customCards=window.customCards||[],window.customCards.push({type:"epp-device-card",name:"EPP Grid Device Configuration",description:"EPP Grid device calibration and zone editor"},{type:"epp-flasher-card",name:"EPP Grid Firmware Flasher",description:"Flash EPP Grid firmware to devices"}),window.customStrategies=window.customStrategies||{},window.customStrategies.eppgrid={generateDashboard:()=>rs.generate()};export{is as EPPGridPanel,rs as EPPGridStrategy,ss as EppDeviceCard,os as EppFlasherCard};
