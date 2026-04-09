import{aD as E,aF as l}from"./vendor-react-63865343.js";import{c as b,x as f,E as G,T as V}from"./vendor-ethers-9ac6ba21.js";import{r as $,k as W,e as Y}from"./core-48f89753.js";import{_ as r}from"./vendor-web3-aa7d4038.js";const w={getSpacingStyles(i,t){if(Array.isArray(i))return i[t]?`var(--wui-spacing-${i[t]})`:void 0;if(typeof i=="string")return`var(--wui-spacing-${i})`},getFormattedDate(i){return new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric"}).format(i)},getHostName(i){try{return new URL(i).hostname}catch{return""}},getTruncateString({string:i,charsStart:t,charsEnd:e,truncate:o}){return i.length<=t+e?i:o==="end"?`${i.substring(0,t)}...`:o==="start"?`...${i.substring(i.length-e)}`:`${i.substring(0,Math.floor(t))}...${i.substring(i.length-Math.floor(e))}`},generateAvatarColors(i){const e=i.toLowerCase().replace(/^0x/iu,"").replace(/[^a-f0-9]/gu,"").substring(0,6).padEnd(6,"0"),o=this.hexToRgb(e),n=getComputedStyle(document.documentElement).getPropertyValue("--w3m-border-radius-master"),s=100-3*Number(n?.replace("px","")),c=`${s}% ${s}% at 65% 40%`,u=[];for(let p=0;p<5;p+=1){const g=this.tintColor(o,.15*p);u.push(`rgb(${g[0]}, ${g[1]}, ${g[2]})`)}return`
    --local-color-1: ${u[0]};
    --local-color-2: ${u[1]};
    --local-color-3: ${u[2]};
    --local-color-4: ${u[3]};
    --local-color-5: ${u[4]};
    --local-radial-circle: ${c}
   `},hexToRgb(i){const t=parseInt(i,16),e=t>>16&255,o=t>>8&255,n=t&255;return[e,o,n]},tintColor(i,t){const[e,o,n]=i,a=Math.round(e+(255-e)*t),s=Math.round(o+(255-o)*t),c=Math.round(n+(255-n)*t);return[a,s,c]},isNumber(i){return{number:/^[0-9]+$/u}.number.test(i)},getColorTheme(i){return i||(typeof window<"u"&&window.matchMedia?window.matchMedia("(prefers-color-scheme: dark)")?.matches?"dark":"light":"dark")},splitBalance(i){const t=i.split(".");return t.length===2?[t[0],t[1]]:["0","00"]},roundNumber(i,t,e){return i.toString().length>=t?Number(i).toFixed(e):i},formatNumberToLocalString(i,t=2){return i===void 0?"0.00":typeof i=="number"?i.toLocaleString("en-US",{maximumFractionDigits:t,minimumFractionDigits:t}):parseFloat(i).toLocaleString("en-US",{maximumFractionDigits:t,minimumFractionDigits:t})}};function X(i,t){const{kind:e,elements:o}=t;return{kind:e,elements:o,finisher(n){customElements.get(i)||customElements.define(i,n)}}}function q(i,t){return customElements.get(i)||customElements.define(i,t),t}function T(i){return function(e){return typeof e=="function"?q(i,e):X(i,e)}}const K=E`
  :host {
    display: flex;
    width: inherit;
    height: inherit;
  }
`;var d=globalThis&&globalThis.__decorate||function(i,t,e,o){var n=arguments.length,a=n<3?t:o===null?o=Object.getOwnPropertyDescriptor(t,e):o,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")a=Reflect.decorate(i,t,e,o);else for(var c=i.length-1;c>=0;c--)(s=i[c])&&(a=(n<3?s(a):n>3?s(t,e,a):s(t,e))||a);return n>3&&a&&Object.defineProperty(t,e,a),a};let _=class extends b{render(){return this.style.cssText=`
      flex-direction: ${this.flexDirection};
      flex-wrap: ${this.flexWrap};
      flex-basis: ${this.flexBasis};
      flex-grow: ${this.flexGrow};
      flex-shrink: ${this.flexShrink};
      align-items: ${this.alignItems};
      justify-content: ${this.justifyContent};
      column-gap: ${this.columnGap&&`var(--wui-spacing-${this.columnGap})`};
      row-gap: ${this.rowGap&&`var(--wui-spacing-${this.rowGap})`};
      gap: ${this.gap&&`var(--wui-spacing-${this.gap})`};
      padding-top: ${this.padding&&w.getSpacingStyles(this.padding,0)};
      padding-right: ${this.padding&&w.getSpacingStyles(this.padding,1)};
      padding-bottom: ${this.padding&&w.getSpacingStyles(this.padding,2)};
      padding-left: ${this.padding&&w.getSpacingStyles(this.padding,3)};
      margin-top: ${this.margin&&w.getSpacingStyles(this.margin,0)};
      margin-right: ${this.margin&&w.getSpacingStyles(this.margin,1)};
      margin-bottom: ${this.margin&&w.getSpacingStyles(this.margin,2)};
      margin-left: ${this.margin&&w.getSpacingStyles(this.margin,3)};
    `,f`<slot></slot>`}};_.styles=[$,K];d([l()],_.prototype,"flexDirection",void 0);d([l()],_.prototype,"flexWrap",void 0);d([l()],_.prototype,"flexBasis",void 0);d([l()],_.prototype,"flexGrow",void 0);d([l()],_.prototype,"flexShrink",void 0);d([l()],_.prototype,"alignItems",void 0);d([l()],_.prototype,"justifyContent",void 0);d([l()],_.prototype,"columnGap",void 0);d([l()],_.prototype,"rowGap",void 0);d([l()],_.prototype,"gap",void 0);d([l()],_.prototype,"padding",void 0);d([l()],_.prototype,"margin",void 0);_=d([T("wui-flex")],_);/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Et=i=>i??G;/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Z=i=>i===null||typeof i!="object"&&typeof i!="function",Q=i=>i.strings===void 0;/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const H={ATTRIBUTE:1,CHILD:2,PROPERTY:3,BOOLEAN_ATTRIBUTE:4,EVENT:5,ELEMENT:6},N=i=>(...t)=>({_$litDirective$:i,values:t});let U=class{constructor(t){}get _$AU(){return this._$AM._$AU}_$AT(t,e,o){this._$Ct=t,this._$AM=e,this._$Ci=o}_$AS(t,e){return this.update(t,e)}update(t,e){return this.render(...e)}};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const x=(i,t)=>{const e=i._$AN;if(e===void 0)return!1;for(const o of e)o._$AO?.(t,!1),x(o,t);return!0},I=i=>{let t,e;do{if((t=i._$AM)===void 0)break;e=t._$AN,e.delete(i),i=t}while(e?.size===0)},F=i=>{for(let t;t=i._$AM;i=t){let e=t._$AN;if(e===void 0)t._$AN=e=new Set;else if(e.has(i))break;e.add(i),it(t)}};function J(i){this._$AN!==void 0?(I(this),this._$AM=i,F(this)):this._$AM=i}function tt(i,t=!1,e=0){const o=this._$AH,n=this._$AN;if(n!==void 0&&n.size!==0)if(t)if(Array.isArray(o))for(let a=e;a<o.length;a++)x(o[a],!1),I(o[a]);else o!=null&&(x(o,!1),I(o));else x(this,i)}const it=i=>{i.type==H.CHILD&&(i._$AP??(i._$AP=tt),i._$AQ??(i._$AQ=J))};class et extends U{constructor(){super(...arguments),this._$AN=void 0}_$AT(t,e,o){super._$AT(t,e,o),F(this),this.isConnected=t._$AU}_$AO(t,e=!0){t!==this.isConnected&&(this.isConnected=t,t?this.reconnected?.():this.disconnected?.()),e&&(x(this,t),I(this))}setValue(t){if(Q(this._$Ct))this._$Ct._$AI(t,this);else{const e=[...this._$Ct._$AH];e[this._$Ci]=t,this._$Ct._$AI(e,this,0)}}disconnected(){}reconnected(){}}/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class ot{constructor(t){this.G=t}disconnect(){this.G=void 0}reconnect(t){this.G=t}deref(){return this.G}}class rt{constructor(){this.Y=void 0,this.Z=void 0}get(){return this.Y}pause(){this.Y??(this.Y=new Promise(t=>this.Z=t))}resume(){this.Z?.(),this.Y=this.Z=void 0}}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const j=i=>!Z(i)&&typeof i.then=="function",B=1073741823;class at extends et{constructor(){super(...arguments),this._$Cwt=B,this._$Cbt=[],this._$CK=new ot(this),this._$CX=new rt}render(...t){return t.find(e=>!j(e))??V}update(t,e){const o=this._$Cbt;let n=o.length;this._$Cbt=e;const a=this._$CK,s=this._$CX;this.isConnected||this.disconnected();for(let c=0;c<e.length&&!(c>this._$Cwt);c++){const u=e[c];if(!j(u))return this._$Cwt=c,u;c<n&&u===o[c]||(this._$Cwt=B,n=0,Promise.resolve(u).then(async p=>{for(;s.get();)await s.get();const g=a.deref();if(g!==void 0){const D=g._$Cbt.indexOf(u);D>-1&&D<g._$Cwt&&(g._$Cwt=D,g.setValue(p))}}))}return V}disconnected(){this._$CK.disconnect(),this._$CX.pause()}reconnected(){this._$CK.reconnect(this),this._$CX.resume()}}const nt=N(at);class st{constructor(){this.cache=new Map}set(t,e){this.cache.set(t,e)}get(t){return this.cache.get(t)}has(t){return this.cache.has(t)}delete(t){this.cache.delete(t)}clear(){this.cache.clear()}}const C=new st,ct=E`
  :host {
    display: flex;
    aspect-ratio: var(--local-aspect-ratio);
    color: var(--local-color);
    width: var(--local-width);
  }

  svg {
    width: inherit;
    height: inherit;
    object-fit: contain;
    object-position: center;
  }

  .fallback {
    width: var(--local-width);
    height: var(--local-height);
  }
`;var P=globalThis&&globalThis.__decorate||function(i,t,e,o){var n=arguments.length,a=n<3?t:o===null?o=Object.getOwnPropertyDescriptor(t,e):o,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")a=Reflect.decorate(i,t,e,o);else for(var c=i.length-1;c>=0;c--)(s=i[c])&&(a=(n<3?s(a):n>3?s(t,e,a):s(t,e))||a);return n>3&&a&&Object.defineProperty(t,e,a),a};const M={add:async()=>(await r(()=>import("./add-f0df855c.js"),["assets/js/add-f0df855c.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).addSvg,allWallets:async()=>(await r(()=>import("./all-wallets-07e26a65.js"),["assets/js/all-wallets-07e26a65.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).allWalletsSvg,arrowBottomCircle:async()=>(await r(()=>import("./arrow-bottom-circle-8ffea742.js"),["assets/js/arrow-bottom-circle-8ffea742.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).arrowBottomCircleSvg,appStore:async()=>(await r(()=>import("./app-store-41e998a3.js"),["assets/js/app-store-41e998a3.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).appStoreSvg,apple:async()=>(await r(()=>import("./apple-67a2e321.js"),["assets/js/apple-67a2e321.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).appleSvg,arrowBottom:async()=>(await r(()=>import("./arrow-bottom-f8251d27.js"),["assets/js/arrow-bottom-f8251d27.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).arrowBottomSvg,arrowLeft:async()=>(await r(()=>import("./arrow-left-4f374455.js"),["assets/js/arrow-left-4f374455.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).arrowLeftSvg,arrowRight:async()=>(await r(()=>import("./arrow-right-a7518be6.js"),["assets/js/arrow-right-a7518be6.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).arrowRightSvg,arrowTop:async()=>(await r(()=>import("./arrow-top-6022edc0.js"),["assets/js/arrow-top-6022edc0.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).arrowTopSvg,bank:async()=>(await r(()=>import("./bank-14ecd5d1.js"),["assets/js/bank-14ecd5d1.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).bankSvg,browser:async()=>(await r(()=>import("./browser-7d39bb79.js"),["assets/js/browser-7d39bb79.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).browserSvg,card:async()=>(await r(()=>import("./card-f35025b7.js"),["assets/js/card-f35025b7.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).cardSvg,checkmark:async()=>(await r(()=>import("./checkmark-07994d80.js"),["assets/js/checkmark-07994d80.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).checkmarkSvg,checkmarkBold:async()=>(await r(()=>import("./checkmark-bold-2d0dfdc0.js"),["assets/js/checkmark-bold-2d0dfdc0.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).checkmarkBoldSvg,chevronBottom:async()=>(await r(()=>import("./chevron-bottom-abde2bdd.js"),["assets/js/chevron-bottom-abde2bdd.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).chevronBottomSvg,chevronLeft:async()=>(await r(()=>import("./chevron-left-2f72d955.js"),["assets/js/chevron-left-2f72d955.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).chevronLeftSvg,chevronRight:async()=>(await r(()=>import("./chevron-right-367717ad.js"),["assets/js/chevron-right-367717ad.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).chevronRightSvg,chevronTop:async()=>(await r(()=>import("./chevron-top-7efd7c69.js"),["assets/js/chevron-top-7efd7c69.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).chevronTopSvg,chromeStore:async()=>(await r(()=>import("./chrome-store-4ba4d728.js"),["assets/js/chrome-store-4ba4d728.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).chromeStoreSvg,clock:async()=>(await r(()=>import("./clock-e75bde17.js"),["assets/js/clock-e75bde17.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).clockSvg,close:async()=>(await r(()=>import("./close-113c5a6b.js"),["assets/js/close-113c5a6b.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).closeSvg,compass:async()=>(await r(()=>import("./compass-cbacb59f.js"),["assets/js/compass-cbacb59f.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).compassSvg,coinPlaceholder:async()=>(await r(()=>import("./coinPlaceholder-924e1042.js"),["assets/js/coinPlaceholder-924e1042.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).coinPlaceholderSvg,copy:async()=>(await r(()=>import("./copy-94ba039b.js"),["assets/js/copy-94ba039b.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).copySvg,cursor:async()=>(await r(()=>import("./cursor-9b6794d0.js"),["assets/js/cursor-9b6794d0.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).cursorSvg,cursorTransparent:async()=>(await r(()=>import("./cursor-transparent-5be5886f.js"),["assets/js/cursor-transparent-5be5886f.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).cursorTransparentSvg,desktop:async()=>(await r(()=>import("./desktop-2f98c89d.js"),["assets/js/desktop-2f98c89d.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).desktopSvg,disconnect:async()=>(await r(()=>import("./disconnect-a16a8fa0.js"),["assets/js/disconnect-a16a8fa0.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).disconnectSvg,discord:async()=>(await r(()=>import("./discord-34adbafe.js"),["assets/js/discord-34adbafe.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).discordSvg,etherscan:async()=>(await r(()=>import("./vendor-ethers-9ac6ba21.js").then(i=>i.e),["assets/js/vendor-ethers-9ac6ba21.js","assets/js/vendor-react-63865343.js"])).etherscanSvg,extension:async()=>(await r(()=>import("./extension-61675a9d.js"),["assets/js/extension-61675a9d.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).extensionSvg,externalLink:async()=>(await r(()=>import("./external-link-b9fb16d4.js"),["assets/js/external-link-b9fb16d4.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).externalLinkSvg,facebook:async()=>(await r(()=>import("./facebook-6e8b22cb.js"),["assets/js/facebook-6e8b22cb.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).facebookSvg,farcaster:async()=>(await r(()=>import("./farcaster-98e739f3.js"),["assets/js/farcaster-98e739f3.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).farcasterSvg,filters:async()=>(await r(()=>import("./filters-e0a9361e.js"),["assets/js/filters-e0a9361e.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).filtersSvg,github:async()=>(await r(()=>import("./github-58bae396.js"),["assets/js/github-58bae396.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).githubSvg,google:async()=>(await r(()=>import("./google-d50c0574.js"),["assets/js/google-d50c0574.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).googleSvg,helpCircle:async()=>(await r(()=>import("./help-circle-5cf850c6.js"),["assets/js/help-circle-5cf850c6.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).helpCircleSvg,image:async()=>(await r(()=>import("./image-a4d93c92.js"),["assets/js/image-a4d93c92.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).imageSvg,id:async()=>(await r(()=>import("./id-a6aeb680.js"),["assets/js/id-a6aeb680.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).idSvg,infoCircle:async()=>(await r(()=>import("./info-circle-60aab68e.js"),["assets/js/info-circle-60aab68e.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).infoCircleSvg,lightbulb:async()=>(await r(()=>import("./lightbulb-0e749571.js"),["assets/js/lightbulb-0e749571.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).lightbulbSvg,mail:async()=>(await r(()=>import("./mail-96803807.js"),["assets/js/mail-96803807.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).mailSvg,mobile:async()=>(await r(()=>import("./mobile-b67325b5.js"),["assets/js/mobile-b67325b5.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).mobileSvg,more:async()=>(await r(()=>import("./more-58c483e8.js"),["assets/js/more-58c483e8.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).moreSvg,networkPlaceholder:async()=>(await r(()=>import("./network-placeholder-21798bbf.js"),["assets/js/network-placeholder-21798bbf.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).networkPlaceholderSvg,nftPlaceholder:async()=>(await r(()=>import("./nftPlaceholder-e9066e02.js"),["assets/js/nftPlaceholder-e9066e02.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).nftPlaceholderSvg,off:async()=>(await r(()=>import("./off-99cbb1bf.js"),["assets/js/off-99cbb1bf.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).offSvg,playStore:async()=>(await r(()=>import("./play-store-99ddb356.js"),["assets/js/play-store-99ddb356.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).playStoreSvg,plus:async()=>(await r(()=>import("./plus-aa84989e.js"),["assets/js/plus-aa84989e.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).plusSvg,qrCode:async()=>(await r(()=>import("./qr-code-bad42bc1.js"),["assets/js/qr-code-bad42bc1.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).qrCodeIcon,recycleHorizontal:async()=>(await r(()=>import("./recycle-horizontal-c45b0d58.js"),["assets/js/recycle-horizontal-c45b0d58.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).recycleHorizontalSvg,refresh:async()=>(await r(()=>import("./refresh-39ec8999.js"),["assets/js/refresh-39ec8999.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).refreshSvg,search:async()=>(await r(()=>import("./search-266e019d.js"),["assets/js/search-266e019d.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).searchSvg,send:async()=>(await r(()=>import("./send-9cbcbae6.js"),["assets/js/send-9cbcbae6.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).sendSvg,swapHorizontal:async()=>(await r(()=>import("./swapHorizontal-9f019d54.js"),["assets/js/swapHorizontal-9f019d54.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).swapHorizontalSvg,swapHorizontalMedium:async()=>(await r(()=>import("./swapHorizontalMedium-5770c357.js"),["assets/js/swapHorizontalMedium-5770c357.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).swapHorizontalMediumSvg,swapHorizontalBold:async()=>(await r(()=>import("./swapHorizontalBold-cf5b8b87.js"),["assets/js/swapHorizontalBold-cf5b8b87.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).swapHorizontalBoldSvg,swapHorizontalRoundedBold:async()=>(await r(()=>import("./swapHorizontalRoundedBold-289f2eeb.js"),["assets/js/swapHorizontalRoundedBold-289f2eeb.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).swapHorizontalRoundedBoldSvg,swapVertical:async()=>(await r(()=>import("./swapVertical-391a7bd7.js"),["assets/js/swapVertical-391a7bd7.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).swapVerticalSvg,telegram:async()=>(await r(()=>import("./telegram-5ad44476.js"),["assets/js/telegram-5ad44476.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).telegramSvg,threeDots:async()=>(await r(()=>import("./three-dots-a883ab1c.js"),["assets/js/three-dots-a883ab1c.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).threeDotsSvg,twitch:async()=>(await r(()=>import("./twitch-9434e4eb.js"),["assets/js/twitch-9434e4eb.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).twitchSvg,twitter:async()=>(await r(()=>import("./x-72a58b7d.js"),["assets/js/x-72a58b7d.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).xSvg,twitterIcon:async()=>(await r(()=>import("./twitterIcon-284c8789.js"),["assets/js/twitterIcon-284c8789.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).twitterIconSvg,verify:async()=>(await r(()=>import("./verify-64bc1263.js"),["assets/js/verify-64bc1263.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).verifySvg,verifyFilled:async()=>(await r(()=>import("./verify-filled-33eeac1d.js"),["assets/js/verify-filled-33eeac1d.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).verifyFilledSvg,wallet:async()=>(await r(()=>import("./wallet-df4094c0.js"),["assets/js/wallet-df4094c0.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).walletSvg,walletConnect:async()=>(await r(()=>import("./walletconnect-820c88d7.js"),["assets/js/walletconnect-820c88d7.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).walletConnectSvg,walletConnectLightBrown:async()=>(await r(()=>import("./walletconnect-820c88d7.js"),["assets/js/walletconnect-820c88d7.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).walletConnectLightBrownSvg,walletConnectBrown:async()=>(await r(()=>import("./walletconnect-820c88d7.js"),["assets/js/walletconnect-820c88d7.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).walletConnectBrownSvg,walletPlaceholder:async()=>(await r(()=>import("./wallet-placeholder-786560ed.js"),["assets/js/wallet-placeholder-786560ed.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).walletPlaceholderSvg,warningCircle:async()=>(await r(()=>import("./warning-circle-d3371f27.js"),["assets/js/warning-circle-d3371f27.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).warningCircleSvg,x:async()=>(await r(()=>import("./x-72a58b7d.js"),["assets/js/x-72a58b7d.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).xSvg,info:async()=>(await r(()=>import("./info-f9f57d48.js"),["assets/js/info-f9f57d48.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).infoSvg,exclamationTriangle:async()=>(await r(()=>import("./exclamation-triangle-9645132a.js"),["assets/js/exclamation-triangle-9645132a.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).exclamationTriangleSvg,reown:async()=>(await r(()=>import("./reown-logo-5cc74942.js"),["assets/js/reown-logo-5cc74942.js","assets/js/vendor-react-63865343.js","assets/js/vendor-ethers-9ac6ba21.js"])).reownSvg};async function lt(i){if(C.has(i))return C.get(i);const e=(M[i]??M.copy)();return C.set(i,e),e}let m=class extends b{constructor(){super(...arguments),this.size="md",this.name="copy",this.color="fg-300",this.aspectRatio="1 / 1"}render(){return this.style.cssText=`
      --local-color: ${`var(--wui-color-${this.color});`}
      --local-width: ${`var(--wui-icon-size-${this.size});`}
      --local-aspect-ratio: ${this.aspectRatio}
    `,f`${nt(lt(this.name),f`<div class="fallback"></div>`)}`}};m.styles=[$,W,ct];P([l()],m.prototype,"size",void 0);P([l()],m.prototype,"name",void 0);P([l()],m.prototype,"color",void 0);P([l()],m.prototype,"aspectRatio",void 0);m=P([T("wui-icon")],m);/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const ut=N(class extends U{constructor(i){if(super(i),i.type!==H.ATTRIBUTE||i.name!=="class"||i.strings?.length>2)throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.")}render(i){return" "+Object.keys(i).filter(t=>i[t]).join(" ")+" "}update(i,[t]){if(this.st===void 0){this.st=new Set,i.strings!==void 0&&(this.nt=new Set(i.strings.join(" ").split(/\s/).filter(o=>o!=="")));for(const o in t)t[o]&&!this.nt?.has(o)&&this.st.add(o);return this.render(t)}const e=i.element.classList;for(const o of this.st)o in t||(e.remove(o),this.st.delete(o));for(const o in t){const n=!!t[o];n===this.st.has(o)||this.nt?.has(o)||(n?(e.add(o),this.st.add(o)):(e.remove(o),this.st.delete(o)))}return V}}),_t=E`
  :host {
    display: inline-flex !important;
  }

  slot {
    width: 100%;
    display: inline-block;
    font-style: normal;
    font-family: var(--wui-font-family);
    font-feature-settings:
      'tnum' on,
      'lnum' on,
      'case' on;
    line-height: 130%;
    font-weight: var(--wui-font-weight-regular);
    overflow: inherit;
    text-overflow: inherit;
    text-align: var(--local-align);
    color: var(--local-color);
  }

  .wui-line-clamp-1 {
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
  }

  .wui-line-clamp-2 {
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .wui-font-medium-400 {
    font-size: var(--wui-font-size-medium);
    font-weight: var(--wui-font-weight-light);
    letter-spacing: var(--wui-letter-spacing-medium);
  }

  .wui-font-medium-600 {
    font-size: var(--wui-font-size-medium);
    letter-spacing: var(--wui-letter-spacing-medium);
  }

  .wui-font-title-600 {
    font-size: var(--wui-font-size-title);
    letter-spacing: var(--wui-letter-spacing-title);
  }

  .wui-font-title-6-600 {
    font-size: var(--wui-font-size-title-6);
    letter-spacing: var(--wui-letter-spacing-title-6);
  }

  .wui-font-mini-700 {
    font-size: var(--wui-font-size-mini);
    letter-spacing: var(--wui-letter-spacing-mini);
    text-transform: uppercase;
  }

  .wui-font-large-500,
  .wui-font-large-600,
  .wui-font-large-700 {
    font-size: var(--wui-font-size-large);
    letter-spacing: var(--wui-letter-spacing-large);
  }

  .wui-font-2xl-500,
  .wui-font-2xl-600,
  .wui-font-2xl-700 {
    font-size: var(--wui-font-size-2xl);
    letter-spacing: var(--wui-letter-spacing-2xl);
  }

  .wui-font-paragraph-400,
  .wui-font-paragraph-500,
  .wui-font-paragraph-600,
  .wui-font-paragraph-700 {
    font-size: var(--wui-font-size-paragraph);
    letter-spacing: var(--wui-letter-spacing-paragraph);
  }

  .wui-font-small-400,
  .wui-font-small-500,
  .wui-font-small-600 {
    font-size: var(--wui-font-size-small);
    letter-spacing: var(--wui-letter-spacing-small);
  }

  .wui-font-tiny-400,
  .wui-font-tiny-500,
  .wui-font-tiny-600 {
    font-size: var(--wui-font-size-tiny);
    letter-spacing: var(--wui-letter-spacing-tiny);
  }

  .wui-font-micro-700,
  .wui-font-micro-600 {
    font-size: var(--wui-font-size-micro);
    letter-spacing: var(--wui-letter-spacing-micro);
    text-transform: uppercase;
  }

  .wui-font-tiny-400,
  .wui-font-small-400,
  .wui-font-medium-400,
  .wui-font-paragraph-400 {
    font-weight: var(--wui-font-weight-light);
  }

  .wui-font-large-700,
  .wui-font-paragraph-700,
  .wui-font-micro-700,
  .wui-font-mini-700 {
    font-weight: var(--wui-font-weight-bold);
  }

  .wui-font-medium-600,
  .wui-font-medium-title-600,
  .wui-font-title-6-600,
  .wui-font-large-600,
  .wui-font-paragraph-600,
  .wui-font-small-600,
  .wui-font-tiny-600,
  .wui-font-micro-600 {
    font-weight: var(--wui-font-weight-medium);
  }

  :host([disabled]) {
    opacity: 0.4;
  }
`;var O=globalThis&&globalThis.__decorate||function(i,t,e,o){var n=arguments.length,a=n<3?t:o===null?o=Object.getOwnPropertyDescriptor(t,e):o,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")a=Reflect.decorate(i,t,e,o);else for(var c=i.length-1;c>=0;c--)(s=i[c])&&(a=(n<3?s(a):n>3?s(t,e,a):s(t,e))||a);return n>3&&a&&Object.defineProperty(t,e,a),a};let y=class extends b{constructor(){super(...arguments),this.variant="paragraph-500",this.color="fg-300",this.align="left",this.lineClamp=void 0}render(){const t={[`wui-font-${this.variant}`]:!0,[`wui-color-${this.color}`]:!0,[`wui-line-clamp-${this.lineClamp}`]:!!this.lineClamp};return this.style.cssText=`
      --local-align: ${this.align};
      --local-color: var(--wui-color-${this.color});
    `,f`<slot class=${ut(t)}></slot>`}};y.styles=[$,_t];O([l()],y.prototype,"variant",void 0);O([l()],y.prototype,"color",void 0);O([l()],y.prototype,"align",void 0);O([l()],y.prototype,"lineClamp",void 0);y=O([T("wui-text")],y);const dt=E`
  :host {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    position: relative;
    overflow: hidden;
    background-color: var(--wui-color-gray-glass-020);
    border-radius: var(--local-border-radius);
    border: var(--local-border);
    box-sizing: content-box;
    width: var(--local-size);
    height: var(--local-size);
    min-height: var(--local-size);
    min-width: var(--local-size);
  }

  @supports (background: color-mix(in srgb, white 50%, black)) {
    :host {
      background-color: color-mix(in srgb, var(--local-bg-value) var(--local-bg-mix), transparent);
    }
  }
`;var v=globalThis&&globalThis.__decorate||function(i,t,e,o){var n=arguments.length,a=n<3?t:o===null?o=Object.getOwnPropertyDescriptor(t,e):o,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")a=Reflect.decorate(i,t,e,o);else for(var c=i.length-1;c>=0;c--)(s=i[c])&&(a=(n<3?s(a):n>3?s(t,e,a):s(t,e))||a);return n>3&&a&&Object.defineProperty(t,e,a),a};let h=class extends b{constructor(){super(...arguments),this.size="md",this.backgroundColor="accent-100",this.iconColor="accent-100",this.background="transparent",this.border=!1,this.borderColor="wui-color-bg-125",this.icon="copy"}render(){const t=this.iconSize||this.size,e=this.size==="lg",o=this.size==="xl",n=e?"12%":"16%",a=e?"xxs":o?"s":"3xl",s=this.background==="gray",c=this.background==="opaque",u=this.backgroundColor==="accent-100"&&c||this.backgroundColor==="success-100"&&c||this.backgroundColor==="error-100"&&c||this.backgroundColor==="inverse-100"&&c;let p=`var(--wui-color-${this.backgroundColor})`;return u?p=`var(--wui-icon-box-bg-${this.backgroundColor})`:s&&(p=`var(--wui-color-gray-${this.backgroundColor})`),this.style.cssText=`
       --local-bg-value: ${p};
       --local-bg-mix: ${u||s?"100%":n};
       --local-border-radius: var(--wui-border-radius-${a});
       --local-size: var(--wui-icon-box-size-${this.size});
       --local-border: ${this.borderColor==="wui-color-bg-125"?"2px":"1px"} solid ${this.border?`var(--${this.borderColor})`:"transparent"}
   `,f` <wui-icon color=${this.iconColor} size=${t} name=${this.icon}></wui-icon> `}};h.styles=[$,Y,dt];v([l()],h.prototype,"size",void 0);v([l()],h.prototype,"backgroundColor",void 0);v([l()],h.prototype,"iconColor",void 0);v([l()],h.prototype,"iconSize",void 0);v([l()],h.prototype,"background",void 0);v([l({type:Boolean})],h.prototype,"border",void 0);v([l()],h.prototype,"borderColor",void 0);v([l()],h.prototype,"icon",void 0);h=v([T("wui-icon-box")],h);const ht=E`
  :host {
    display: block;
    width: var(--local-width);
    height: var(--local-height);
  }

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center center;
    border-radius: inherit;
  }
`;var L=globalThis&&globalThis.__decorate||function(i,t,e,o){var n=arguments.length,a=n<3?t:o===null?o=Object.getOwnPropertyDescriptor(t,e):o,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")a=Reflect.decorate(i,t,e,o);else for(var c=i.length-1;c>=0;c--)(s=i[c])&&(a=(n<3?s(a):n>3?s(t,e,a):s(t,e))||a);return n>3&&a&&Object.defineProperty(t,e,a),a};let S=class extends b{constructor(){super(...arguments),this.src="./path/to/image.jpg",this.alt="Image",this.size=void 0}render(){return this.style.cssText=`
      --local-width: ${this.size?`var(--wui-icon-size-${this.size});`:"100%"};
      --local-height: ${this.size?`var(--wui-icon-size-${this.size});`:"100%"};
      `,f`<img src=${this.src} alt=${this.alt} @error=${this.handleImageError} />`}handleImageError(){this.dispatchEvent(new CustomEvent("onLoadError",{bubbles:!0,composed:!0}))}};S.styles=[$,W,ht];L([l()],S.prototype,"src",void 0);L([l()],S.prototype,"alt",void 0);L([l()],S.prototype,"size",void 0);S=L([T("wui-image")],S);const pt=E`
  :host {
    display: flex;
    justify-content: center;
    align-items: center;
    height: var(--wui-spacing-m);
    padding: 0 var(--wui-spacing-3xs) !important;
    border-radius: var(--wui-border-radius-5xs);
    transition:
      border-radius var(--wui-duration-lg) var(--wui-ease-out-power-1),
      background-color var(--wui-duration-lg) var(--wui-ease-out-power-1);
    will-change: border-radius, background-color;
  }

  :host > wui-text {
    transform: translateY(5%);
  }

  :host([data-variant='main']) {
    background-color: var(--wui-color-accent-glass-015);
    color: var(--wui-color-accent-100);
  }

  :host([data-variant='shade']) {
    background-color: var(--wui-color-gray-glass-010);
    color: var(--wui-color-fg-200);
  }

  :host([data-variant='success']) {
    background-color: var(--wui-icon-box-bg-success-100);
    color: var(--wui-color-success-100);
  }

  :host([data-variant='error']) {
    background-color: var(--wui-icon-box-bg-error-100);
    color: var(--wui-color-error-100);
  }

  :host([data-size='lg']) {
    padding: 11px 5px !important;
  }

  :host([data-size='lg']) > wui-text {
    transform: translateY(2%);
  }
`;var z=globalThis&&globalThis.__decorate||function(i,t,e,o){var n=arguments.length,a=n<3?t:o===null?o=Object.getOwnPropertyDescriptor(t,e):o,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")a=Reflect.decorate(i,t,e,o);else for(var c=i.length-1;c>=0;c--)(s=i[c])&&(a=(n<3?s(a):n>3?s(t,e,a):s(t,e))||a);return n>3&&a&&Object.defineProperty(t,e,a),a};let R=class extends b{constructor(){super(...arguments),this.variant="main",this.size="lg"}render(){this.dataset.variant=this.variant,this.dataset.size=this.size;const t=this.size==="md"?"mini-700":"micro-700";return f`
      <wui-text data-variant=${this.variant} variant=${t} color="inherit">
        <slot></slot>
      </wui-text>
    `}};R.styles=[$,pt];z([l()],R.prototype,"variant",void 0);z([l()],R.prototype,"size",void 0);R=z([T("wui-tag")],R);const gt=E`
  :host {
    display: flex;
  }

  :host([data-size='sm']) > svg {
    width: 12px;
    height: 12px;
  }

  :host([data-size='md']) > svg {
    width: 16px;
    height: 16px;
  }

  :host([data-size='lg']) > svg {
    width: 24px;
    height: 24px;
  }

  :host([data-size='xl']) > svg {
    width: 32px;
    height: 32px;
  }

  svg {
    animation: rotate 2s linear infinite;
  }

  circle {
    fill: none;
    stroke: var(--local-color);
    stroke-width: 4px;
    stroke-dasharray: 1, 124;
    stroke-dashoffset: 0;
    stroke-linecap: round;
    animation: dash 1.5s ease-in-out infinite;
  }

  :host([data-size='md']) > svg > circle {
    stroke-width: 6px;
  }

  :host([data-size='sm']) > svg > circle {
    stroke-width: 8px;
  }

  @keyframes rotate {
    100% {
      transform: rotate(360deg);
    }
  }

  @keyframes dash {
    0% {
      stroke-dasharray: 1, 124;
      stroke-dashoffset: 0;
    }

    50% {
      stroke-dasharray: 90, 124;
      stroke-dashoffset: -35;
    }

    100% {
      stroke-dashoffset: -125;
    }
  }
`;var k=globalThis&&globalThis.__decorate||function(i,t,e,o){var n=arguments.length,a=n<3?t:o===null?o=Object.getOwnPropertyDescriptor(t,e):o,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")a=Reflect.decorate(i,t,e,o);else for(var c=i.length-1;c>=0;c--)(s=i[c])&&(a=(n<3?s(a):n>3?s(t,e,a):s(t,e))||a);return n>3&&a&&Object.defineProperty(t,e,a),a};let A=class extends b{constructor(){super(...arguments),this.color="accent-100",this.size="lg"}render(){return this.style.cssText=`--local-color: ${this.color==="inherit"?"inherit":`var(--wui-color-${this.color})`}`,this.dataset.size=this.size,f`<svg viewBox="25 25 50 50">
      <circle r="20" cy="50" cx="50"></circle>
    </svg>`}};A.styles=[$,gt];k([l()],A.prototype,"color",void 0);k([l()],A.prototype,"size",void 0);A=k([T("wui-loading-spinner")],A);export{w as U,ut as a,T as c,N as e,et as f,Et as o};
